import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ToolInfo {
  name: string
  displayName: string
  version?: string
  installed: boolean
  icon?: string
  category: 'Runtime' | 'Package Manager' | 'Version Control' | 'Build Tool' | 'Container' | 'IDE' | 'Other'
}

// 开发工具定义
const TOOLS: Omit<ToolInfo, 'installed' | 'version'>[] = [
  // Runtime
  {
    name: 'node',
    displayName: 'Node.js',
    category: 'Runtime',
    icon: '⬢'
  },
  {
    name: 'python',
    displayName: 'Python',
    category: 'Runtime',
    icon: '🐍'
  },
  {
    name: 'python3',
    displayName: 'Python 3',
    category: 'Runtime',
    icon: '🐍'
  },
  {
    name: 'java',
    displayName: 'Java',
    category: 'Runtime',
    icon: '☕'
  },
  {
    name: 'go',
    displayName: 'Go',
    category: 'Runtime',
    icon: '🔵'
  },
  {
    name: 'ruby',
    displayName: 'Ruby',
    category: 'Runtime',
    icon: '💎'
  },
  {
    name: 'rustc',
    displayName: 'Rust',
    category: 'Runtime',
    icon: '🦀'
  },
  {
    name: 'dart',
    displayName: 'Dart',
    category: 'Runtime',
    icon: '🎯'
  },
  {
    name: 'swift',
    displayName: 'Swift',
    category: 'Runtime',
    icon: '🍎'
  },
  {
    name: 'php',
    displayName: 'PHP',
    category: 'Runtime',
    icon: '🐘'
  },

  // Package Manager
  {
    name: 'npm',
    displayName: 'npm',
    category: 'Package Manager',
    icon: '📦'
  },
  {
    name: 'yarn',
    displayName: 'Yarn',
    category: 'Package Manager',
    icon: '🧶'
  },
  {
    name: 'pnpm',
    displayName: 'pnpm',
    category: 'Package Manager',
    icon: '📦'
  },
  {
    name: 'pip',
    displayName: 'pip',
    category: 'Package Manager',
    icon: '📦'
  },
  {
    name: 'pip3',
    displayName: 'pip3',
    category: 'Package Manager',
    icon: '📦'
  },
  {
    name: 'go',
    displayName: 'go mod',
    category: 'Package Manager',
    icon: '📦'
  },
  {
    name: 'gem',
    displayName: 'RubyGems',
    category: 'Package Manager',
    icon: '💎'
  },
  {
    name: 'cargo',
    displayName: 'Cargo',
    category: 'Package Manager',
    icon: '📦'
  },
  {
    name: 'composer',
    displayName: 'Composer',
    category: 'Package Manager',
    icon: '🎼'
  },

  // Version Control
  {
    name: 'git',
    displayName: 'Git',
    category: 'Version Control',
    icon: '📂'
  },
  {
    name: 'svn',
    displayName: 'SVN',
    category: 'Version Control',
    icon: '📂'
  },
  {
    name: 'hg',
    displayName: 'Mercurial',
    category: 'Version Control',
    icon: '📂'
  },

  // Build Tool
  {
    name: 'make',
    displayName: 'Make',
    category: 'Build Tool',
    icon: '🔨'
  },
  {
    name: 'cmake',
    displayName: 'CMake',
    category: 'Build Tool',
    icon: '🔨'
  },
  {
    name: 'gradle',
    displayName: 'Gradle',
    category: 'Build Tool',
    icon: '🔨'
  },
  {
    name: 'mvn',
    displayName: 'Maven',
    category: 'Build Tool',
    icon: '🔨'
  },
  {
    name: 'dotnet',
    displayName: '.NET CLI',
    category: 'Build Tool',
    icon: '🔨'
  },
  {
    name: 'xcodebuild',
    displayName: 'Xcode Build',
    category: 'Build Tool',
    icon: '🔨'
  },

  // Container
  {
    name: 'docker',
    displayName: 'Docker',
    category: 'Container',
    icon: '🐳'
  },
  {
    name: 'docker-compose',
    displayName: 'Docker Compose',
    category: 'Container',
    icon: '🐳'
  },
  {
    name: 'podman',
    displayName: 'Podman',
    category: 'Container',
    icon: '🐳'
  },

  // IDE/Editor (通过检查常见路径)
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

  // Other
  {
    name: 'nvm',
    displayName: 'NVM',
    category: 'Other',
    icon: '🔧'
  },
  {
    name: 'brew',
    displayName: 'Homebrew',
    category: 'Other',
    icon: '🍺'
  },
  {
    name: 'brew',
    displayName: 'Homebrew',
    category: 'Other',
    icon: '🍺'
  },
  {
    name: 'flutter',
    displayName: 'Flutter',
    category: 'Other',
    icon: '🦋'
  },
  {
    name: 'terraform',
    displayName: 'Terraform',
    category: 'Other',
    icon: '🏗️'
  },
  {
    name: 'kubectl',
    displayName: 'kubectl',
    category: 'Other',
    icon: '☸️'
  },
  {
    name: 'aws',
    displayName: 'AWS CLI',
    category: 'Other',
    icon: '☁️'
  }
]

// 获取版本命令映射
const VERSION_COMMANDS: Record<string, string> = {
  node: 'node --version',
  python: 'python --version',
  python3: 'python3 --version',
  java: 'java -version',
  go: 'go version',
  ruby: 'ruby --version',
  rustc: 'rustc --version',
  dart: 'dart --version',
  swift: 'swift --version',
  php: 'php --version',
  npm: 'npm --version',
  yarn: 'yarn --version',
  pnpm: 'pnpm --version',
  pip: 'pip --version',
  pip3: 'pip3 --version',
  gem: 'gem --version',
  cargo: 'cargo --version',
  composer: 'composer --version',
  git: 'git --version',
  svn: 'svn --version',
  hg: 'hg --version',
  make: 'make --version',
  cmake: 'cmake --version',
  gradle: 'gradle --version',
  mvn: 'mvn --version',
  dotnet: 'dotnet --version',
  docker: 'docker --version',
  'docker-compose': 'docker-compose --version',
  podman: 'podman --version',
  code: 'code --version',
  idea: 'idea --version',
  vim: 'vim --version',
  nvim: 'nvim --version',
  nvm: 'nvm --version',
  brew: 'brew --version',
  flutter: 'flutter --version',
  terraform: 'terraform --version',
  kubectl: 'kubectl version --client',
  aws: 'aws --version'
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
    await execAsync(`which ${toolName}`, {
      timeout: 2000
    })
    return true
  } catch {
    return false
  }
}

export async function scanDevelopmentTools(): Promise<ToolInfo[]> {
  const results: ToolInfo[] = []

  // 并发检查所有工具
  const checks = TOOLS.map(async (tool) => {
    const installed = await isToolInstalled(tool.name)
    if (!installed) {
      return { ...tool, installed: false, version: undefined }
    }

    const version = await getToolVersion(tool.name)
    return { ...tool, installed: true, version }
  })

  const scannedTools = await Promise.all(checks)

  // 移除重复的工具（如 python 和 python3）
  const uniqueTools = new Map<string, ToolInfo>()

  for (const tool of scannedTools) {
    const key = tool.displayName
    // 如果已存在且未安装，替换为已安装的版本
    if (!uniqueTools.has(key) || (tool.installed && !uniqueTools.get(key)!.installed)) {
      uniqueTools.set(key, tool)
    }
  }

  return Array.from(uniqueTools.values())
}

export function categorizeTools(tools: ToolInfo[]): Record<string, ToolInfo[]> {
  const categorized: Record<string, ToolInfo[]> = {
    Runtime: [],
    'Package Manager': [],
    'Version Control': [],
    'Build Tool': [],
    Container: [],
    IDE: [],
    Other: []
  }

  for (const tool of tools) {
    if (categorized[tool.category]) {
      categorized[tool.category].push(tool)
    } else {
      categorized.Other.push(tool)
    }
  }

  return categorized
}

export function getToolsStats(tools: ToolInfo[]) {
  const installed = tools.filter(t => t.installed).length
  const total = tools.length
  const categories = new Set(tools.map(t => t.category)).size

  return {
    installed,
    total,
    categories,
    percentage: Math.round((installed / total) * 100)
  }
}
