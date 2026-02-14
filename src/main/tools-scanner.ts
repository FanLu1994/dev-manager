import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ToolInfo {
  name: string
  displayName: string
  version?: string
  installed: boolean
  icon?: string
  category: 'IDE' | 'CLI'
}

// 开发工具定义 - 仅 IDE 和 CLI 工具
const TOOLS: Omit<ToolInfo, 'installed' | 'version'>[] = [
  // IDE/Editor
  {
    name: 'code',
    displayName: 'VS Code',
    category: 'IDE',
    icon: '💻'
  },
  {
    name: 'idea',
    displayName: 'IntelliJ IDEA',
    category: 'IDE',
    icon: '💻'
  },
  {
    name: 'vim',
    displayName: 'Vim',
    category: 'IDE',
    icon: '💻'
  },
  {
    name: 'nvim',
    displayName: 'Neovim',
    category: 'IDE',
    icon: '💻'
  },

  // CLI 工具
  {
    name: 'git',
    displayName: 'Git',
    category: 'CLI',
    icon: '📂'
  },
  {
    name: 'svn',
    displayName: 'SVN',
    category: 'CLI',
    icon: '📂'
  },
  {
    name: 'hg',
    displayName: 'Mercurial',
    category: 'CLI',
    icon: '📂'
  }
]

// 获取版本命令映射
const VERSION_COMMANDS: Record<string, string> = {
  code: 'code --version',
  idea: 'idea --version',
  vim: 'vim --version',
  nvim: 'nvim --version',
  git: 'git --version',
  svn: 'svn --version',
  hg: 'hg --version'
}

async function getToolVersion(toolName: string): Promise<string | undefined> {
  const command = VERSION_COMMANDS[toolName]
  if (!command) return undefined

  try {
    const { stdout } = await execAsync(command, {
      timeout: 5000,
      env: {
        ...process.env,
        PATH: process.env.PATH
      }
    })
    return stdout.trim().split('\n')[0]
  } catch {
    return undefined
  }
}

async function isToolInstalled(toolName: string): Promise<boolean> {
  try {
    const checkCommand = process.platform === 'win32' ? 'where' : 'which'
    await execAsync(`${checkCommand} ${toolName}`, {
      timeout: 2000
    })
    return true
  } catch {
    return false
  }
}

// 专门检查 IDE 是否安装（通过常见路径和可执行文件）
async function isIDEInstalled(toolName: string): Promise<boolean> {
  const { existsSync, promises: fs } = await import('fs')
  const { join } = await import('path')
  const isWindows = process.platform === 'win32'
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const localAppData = process.env.LOCALAPPDATA || ''
  const userProfile = process.env.USERPROFILE || ''

  // 定义常见 IDE 路径
  const idePaths: Record<string, string[]> = {
    code: [
      // Windows
      join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe'),
      join(programFiles, 'Microsoft VS Code', 'Code.exe'),
      join(programFilesX86, 'Microsoft VS Code', 'Code.exe'),
      join(localAppData, 'Programs', 'Microsoft VS Code Insiders', 'Code - Insiders.exe'),
      join(programFiles, 'Microsoft VS Code Insiders', 'Code - Insiders.exe'),
      join(programFilesX86, 'Microsoft VS Code Insiders', 'Code - Insiders.exe'),
      // macOS
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
      '/usr/local/bin/code',
      // Linux
      '/usr/bin/code',
      '/usr/local/bin/code'
    ],
    idea: [
      // Windows
      join(programFiles, 'JetBrains', 'IntelliJ IDEA', 'bin', 'idea64.exe'),
      join(programFilesX86, 'JetBrains', 'IntelliJ IDEA', 'bin', 'idea64.exe'),
      // macOS
      '/Applications/IntelliJ IDEA.app/Contents/MacOS/idea',
      // Linux
      '/usr/bin/idea',
      '/usr/local/bin/idea'
    ],
    vim: [
      '/usr/bin/vim',
      '/usr/local/bin/vim',
      join(programFiles, 'Vim', 'vim90', 'vim.exe'),
      join(programFilesX86, 'Vim', 'vim90', 'vim.exe')
    ],
    nvim: [
      '/usr/local/bin/nvim',
      '/usr/bin/nvim',
      join(localAppData, 'nvim', 'nvim.exe'),
      join(programFiles, 'Neovim', 'bin', 'nvim.exe'),
      join(programFilesX86, 'Neovim', 'bin', 'nvim.exe'),
      join(userProfile, 'scoop', 'apps', 'neovim', 'current', 'bin', 'nvim.exe')
    ]
  }

  async function findExecutableInDir(
    dirPath: string,
    exeNames: string[],
    maxDepth: number
  ): Promise<boolean> {
    if (!dirPath || maxDepth < 0) return false
    let entries: Array<{ name: string; isDirectory(): boolean }> = []
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return false
    }

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      if (!entry.isDirectory()) {
        if (exeNames.includes(entry.name.toLowerCase())) return true
        continue
      }

      if (await findExecutableInDir(fullPath, exeNames, maxDepth - 1)) return true
    }

    return false
  }

  // 先用命令检查
  const commandCheck = await isToolInstalled(toolName)
  if (commandCheck) return true

  // 检查特定路径
  const paths = idePaths[toolName]
  if (paths) {
    for (const path of paths) {
      try {
        if (existsSync(path)) return true
      } catch {}
    }
  }

  if (isWindows) {
    if (toolName === 'idea') {
      const exeNames = ['idea64.exe', 'idea.exe']
      const roots = [
        join(programFiles, 'JetBrains'),
        join(programFilesX86, 'JetBrains'),
        join(localAppData, 'JetBrains', 'Toolbox', 'apps')
      ]
      for (const root of roots) {
        if (await findExecutableInDir(root, exeNames, 4)) return true
      }
    }

    if (toolName === 'vim') {
      const exeNames = ['vim.exe']
      const roots = [join(programFiles, 'Vim'), join(programFilesX86, 'Vim')]
      for (const root of roots) {
        if (await findExecutableInDir(root, exeNames, 3)) return true
      }
    }

    if (toolName === 'nvim') {
      const exeNames = ['nvim.exe']
      const roots = [
        join(programFiles, 'Neovim'),
        join(programFilesX86, 'Neovim'),
        join(userProfile, 'scoop', 'apps', 'neovim'),
        join(localAppData, 'nvim')
      ]
      for (const root of roots) {
        if (await findExecutableInDir(root, exeNames, 3)) return true
      }
    }

    if (toolName === 'code') {
      const exeNames = ['code.exe', 'code - insiders.exe']
      const roots = [
        join(localAppData, 'Programs'),
        join(programFiles),
        join(programFilesX86)
      ]
      for (const root of roots) {
        if (await findExecutableInDir(root, exeNames, 3)) return true
      }
    }
  }

  return false
}

export async function scanDevelopmentTools(): Promise<ToolInfo[]> {
  const installedTools: ToolInfo[] = []

  for (const tool of TOOLS) {
    // IDE 使用专门的检查方法
    const installed =
      tool.category === 'IDE' ? await isIDEInstalled(tool.name) : await isToolInstalled(tool.name)

    if (installed) {
      const version = await getToolVersion(tool.name)
      installedTools.push({ ...tool, installed: true, version })
    }
  }

  return installedTools
}

export function categorizeTools(tools: ToolInfo[]): Record<string, ToolInfo[]> {
  const categorized: Record<string, ToolInfo[]> = {
    IDE: [],
    CLI: []
  }

  for (const tool of tools) {
    categorized[tool.category].push(tool)
  }

  return categorized
}

export function getToolsStats(tools: ToolInfo[]) {
  const count = tools.length
  const categories = new Set(tools.map((t) => t.category)).size

  return {
    installed: count,
    total: count,
    categories,
    percentage: 100
  }
}
