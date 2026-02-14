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
  const { existsSync } = await import('fs')
  const { join } = await import('path')

  // 定义常见 IDE 路径
  const idePaths: Record<string, string[]> = {
    code: [
      // Windows
      join('C:\\', 'Program Files', 'Microsoft VS Code', 'Code.exe'),
      join('C:\\', 'Program Files (x86)', 'Microsoft VS Code', 'Code.exe'),
      join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code', 'Code.exe'),
      // macOS
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
      '/usr/local/bin/code',
      // Linux
      '/usr/bin/code',
      '/usr/local/bin/code'
    ],
    idea: [
      // Windows
      join('C:\\', 'Program Files', 'JetBrains', 'IntelliJ IDEA 2024.2', 'bin', 'idea64.exe'),
      join('C:\\', 'Program Files', 'JetBrains', 'IntelliJ IDEA', 'bin', 'idea64.exe'),
      // macOS
      '/Applications/IntelliJ IDEA.app/Contents/MacOS/idea',
      // Linux
      '/usr/bin/idea',
      '/usr/local/bin/idea'
    ],
    vim: ['/usr/bin/vim', '/usr/local/bin/vim', 'C:\\Program Files\\Vim\\vim90\\vim.exe'],
    nvim: [
      '/usr/local/bin/nvim',
      '/usr/bin/nvim',
      join(process.env.LOCALAPPDATA || '', 'nvim-bin', 'nvim.exe')
    ]
  }

  // 先用命令检查
  const commandCheck = await isToolInstalled(tool.name)
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
