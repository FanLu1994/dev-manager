import { app } from 'electron'
import { exec, spawn } from 'child_process'
import { existsSync, mkdirSync, promises as fs } from 'fs'
import { delimiter, join } from 'path'
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

export interface UnknownToolCandidate {
  command: string
  sourcePath: string
}

export interface ToolsScanOutput {
  tools: ToolInfo[]
  unknownCandidates: UnknownToolCandidate[]
}

type ToolCategory = 'IDE' | 'CLI'

interface ToolDefinition {
  name: string
  displayName: string
  icon: string
  category: ToolCategory
  commandAliases?: string[]
}

interface WindowsRoots {
  programFiles: string
  programFilesX86: string
  localAppData: string
  userProfile: string
}

interface ToolsStats {
  installed: number
  total: number
  categories: number
  percentage: number
}

const CUSTOM_TOOLS_FILE = 'custom-tools.json'

const BUILTIN_TOOLS: ToolDefinition[] = [
  {
    name: 'code',
    displayName: 'VS Code',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['code', 'code-insiders']
  },
  {
    name: 'cursor',
    displayName: 'Cursor',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['cursor']
  },
  {
    name: 'idea',
    displayName: 'IntelliJ IDEA',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['idea', 'idea64']
  },
  {
    name: 'pycharm',
    displayName: 'PyCharm',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['pycharm', 'pycharm64']
  },
  {
    name: 'webstorm',
    displayName: 'WebStorm',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['webstorm', 'webstorm64']
  },
  {
    name: 'goland',
    displayName: 'GoLand',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['goland', 'goland64']
  },
  {
    name: 'clion',
    displayName: 'CLion',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['clion', 'clion64']
  },
  {
    name: 'rider',
    displayName: 'Rider',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['rider', 'rider64']
  },
  {
    name: 'rubymine',
    displayName: 'RubyMine',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['rubymine', 'rubymine64']
  },
  {
    name: 'datagrip',
    displayName: 'DataGrip',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['datagrip', 'datagrip64']
  },
  {
    name: 'vim',
    displayName: 'Vim',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['vim']
  },
  {
    name: 'nvim',
    displayName: 'Neovim',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['nvim']
  },
  {
    name: 'git',
    displayName: 'Git',
    category: 'CLI',
    icon: '📂',
    commandAliases: ['git']
  },
  {
    name: 'svn',
    displayName: 'SVN',
    category: 'CLI',
    icon: '📂',
    commandAliases: ['svn']
  },
  {
    name: 'hg',
    displayName: 'Mercurial',
    category: 'CLI',
    icon: '📂',
    commandAliases: ['hg']
  },
  {
    name: 'gemini',
    displayName: 'Gemini CLI',
    category: 'CLI',
    icon: '🤖',
    commandAliases: ['gemini']
  },
  {
    name: 'claude',
    displayName: 'Claude Code',
    category: 'CLI',
    icon: '🤖',
    commandAliases: ['claude', 'claude-code']
  },
  {
    name: 'opencode',
    displayName: 'OpenCode',
    category: 'CLI',
    icon: '🤖',
    commandAliases: ['opencode', 'open-code']
  },
  {
    name: 'codex',
    displayName: 'OpenAI Codex',
    category: 'CLI',
    icon: '🤖',
    commandAliases: ['codex']
  },
  {
    name: 'antigravity',
    displayName: 'Antigravity',
    category: 'IDE',
    icon: '💻',
    commandAliases: ['antigravity']
  }
]

const VERSION_COMMANDS: Record<string, string> = {
  code: 'code --version',
  'code-insiders': 'code-insiders --version',
  cursor: 'cursor --version',
  idea: 'idea --version',
  pycharm: 'pycharm --version',
  webstorm: 'webstorm --version',
  goland: 'goland --version',
  clion: 'clion --version',
  rider: 'rider --version',
  rubymine: 'rubymine --version',
  datagrip: 'datagrip --version',
  vim: 'vim --version',
  nvim: 'nvim --version',
  git: 'git --version',
  svn: 'svn --version',
  hg: 'hg --version',
  gemini: 'gemini --version',
  claude: 'claude --version',
  'claude-code': 'claude-code --version',
  opencode: 'opencode --version',
  codex: 'codex -V',
  antigravity: 'antigravity --version'
}

const WINDOWS_IDE_EXECUTABLE_NAMES: Record<string, string[]> = {
  code: ['code.exe', 'code - insiders.exe'],
  cursor: ['cursor.exe'],
  idea: ['idea64.exe', 'idea.exe'],
  pycharm: ['pycharm64.exe', 'pycharm.exe'],
  webstorm: ['webstorm64.exe', 'webstorm.exe'],
  goland: ['goland64.exe', 'goland.exe'],
  clion: ['clion64.exe', 'clion.exe'],
  rider: ['rider64.exe', 'rider.exe'],
  rubymine: ['rubymine64.exe', 'rubymine.exe'],
  datagrip: ['datagrip64.exe', 'datagrip.exe'],
  antigravity: ['antigravity.exe', 'antigravity.cmd', 'antigravity'],
  vim: ['vim.exe'],
  nvim: ['nvim.exe']
}

const DISCOVERY_KEYWORDS = [
  'code',
  'codex',
  'claude',
  'gemini',
  'cursor',
  'open',
  'agent',
  'dev',
  'studio',
  'ide',
  'vim',
  'nvim',
  'jetbrains',
  'pycharm',
  'webstorm',
  'goland',
  'clion',
  'rider',
  'rubymine',
  'datagrip',
  'antigravity',
  'docker',
  'kubectl',
  'terraform',
  'ansible',
  'node',
  'npm',
  'pnpm',
  'yarn',
  'bun',
  'python',
  'pip',
  'go',
  'cargo',
  'rust',
  'gradle',
  'mvn',
  'dotnet',
  'gh'
]

function getWindowsRoots(): WindowsRoots {
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const localAppData = process.env.LOCALAPPDATA || ''
  const userProfile = process.env.USERPROFILE || ''
  return { programFiles, programFilesX86, localAppData, userProfile }
}

function getStorageFilePath(): string {
  const userDataPath = app.getPath('userData')
  const storageDir = join(userDataPath, 'storage')
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true })
  }
  return join(storageDir, CUSTOM_TOOLS_FILE)
}

async function loadCustomTools(): Promise<ToolDefinition[]> {
  const storagePath = getStorageFilePath()
  if (!existsSync(storagePath)) return []

  try {
    const data = await fs.readFile(storagePath, 'utf-8')
    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item) => item && typeof item.name === 'string') as ToolDefinition[]
  } catch {
    return []
  }
}

async function saveCustomTools(tools: ToolDefinition[]): Promise<void> {
  const storagePath = getStorageFilePath()
  await fs.writeFile(storagePath, JSON.stringify(tools, null, 2), 'utf-8')
}

function mergeToolDefinitions(customTools: ToolDefinition[]): ToolDefinition[] {
  const merged = [...BUILTIN_TOOLS]
  const existingNames = new Set(merged.map((item) => item.name))

  for (const tool of customTools) {
    if (!existingNames.has(tool.name)) {
      merged.push(tool)
      existingNames.add(tool.name)
    }
  }

  return merged
}

function getAliases(tool: ToolDefinition): string[] {
  return tool.commandAliases?.length ? tool.commandAliases : [tool.name]
}

function normalizeExecutableName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/\.(exe|cmd|bat|com|ps1)$/i, '')
    .trim()
}

function isPotentialDevToolCommand(command: string): boolean {
  if (!command || command.length < 2) return false
  if (command.startsWith('_')) return false
  return DISCOVERY_KEYWORDS.some((keyword) => command.includes(keyword))
}

function uniquePathEntries(rawPath: string): string[] {
  const paths = rawPath
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  return Array.from(new Set(paths))
}

async function discoverUnknownTools(knownAliases: Set<string>): Promise<UnknownToolCandidate[]> {
  const found = new Map<string, UnknownToolCandidate>()

  const pathValue = process.env.PATH || ''
  for (const dirPath of uniquePathEntries(pathValue)) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) continue

        const command = normalizeExecutableName(entry.name)
        if (!command || knownAliases.has(command)) continue
        if (!isPotentialDevToolCommand(command)) continue

        if (!found.has(command)) {
          found.set(command, {
            command,
            sourcePath: join(dirPath, entry.name)
          })
        }
      }
    } catch {
      // ignore invalid/unreadable PATH entries
    }
  }

  if (process.platform === 'win32') {
    const programsRoot = join(process.env.LOCALAPPDATA || '', 'Programs')
    try {
      const dirs = await fs.readdir(programsRoot, { withFileTypes: true })
      for (const dir of dirs) {
        if (!dir.isDirectory()) continue

        const candidateFiles = [
          join(programsRoot, dir.name, `${dir.name}.exe`),
          join(programsRoot, dir.name, 'bin', `${dir.name}.cmd`),
          join(programsRoot, dir.name, 'bin', `${dir.name}.exe`)
        ]

        for (const candidateFile of candidateFiles) {
          if (!existsSync(candidateFile)) continue
          const command = normalizeExecutableName(candidateFile.split('\\').pop() || '')
          if (!command || knownAliases.has(command)) continue
          if (!isPotentialDevToolCommand(command)) continue

          if (!found.has(command)) {
            found.set(command, { command, sourcePath: candidateFile })
          }
        }
      }
    } catch {
      // ignore missing local programs dir
    }
  }

  return Array.from(found.values())
    .sort((a, b) => a.command.localeCompare(b.command))
    .slice(0, 20)
}

function toTitleCase(name: string): string {
  return name
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function inferCategory(command: string): ToolCategory {
  const ideHints = [
    'code',
    'cursor',
    'studio',
    'idea',
    'pycharm',
    'webstorm',
    'goland',
    'clion',
    'rider',
    'rubymine',
    'datagrip',
    'antigravity'
  ]

  return ideHints.some((hint) => command.includes(hint)) ? 'IDE' : 'CLI'
}

export async function confirmUnknownTools(candidates: UnknownToolCandidate[]): Promise<number> {
  if (candidates.length === 0) return 0

  const customTools = await loadCustomTools()
  const existingAliases = new Set(
    [...BUILTIN_TOOLS, ...customTools].flatMap((tool) =>
      getAliases(tool).map((alias) => alias.toLowerCase())
    )
  )
  const existingNames = new Set(
    [...BUILTIN_TOOLS, ...customTools].map((tool) => tool.name.toLowerCase())
  )

  let added = 0

  for (const candidate of candidates) {
    const command = candidate.command.toLowerCase()
    if (existingAliases.has(command) || existingNames.has(command)) continue

    const category = inferCategory(command)
    customTools.push({
      name: command,
      displayName: toTitleCase(command),
      category,
      icon: category === 'IDE' ? '💻' : '🤖',
      commandAliases: [command]
    })

    existingAliases.add(command)
    existingNames.add(command)
    added += 1
  }

  if (added > 0) {
    await saveCustomTools(customTools)
  }

  return added
}

async function runVersionCommand(command: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync(command, {
      timeout: 5000,
      env: {
        ...process.env,
        PATH: process.env.PATH
      }
    })

    const firstLine = stdout
      .trim()
      .split('\n')
      .find((line) => line.trim().length > 0)
    return firstLine?.trim()
  } catch {
    return undefined
  }
}

async function getToolVersion(tool: ToolDefinition): Promise<string | undefined> {
  const aliases = getAliases(tool)
  for (const alias of aliases) {
    const command = VERSION_COMMANDS[alias] || `${alias} --version`
    const version = await runVersionCommand(command)
    if (version) return version
  }

  return undefined
}

async function isToolInstalledByCommand(tool: ToolDefinition): Promise<boolean> {
  const aliases = getAliases(tool)
  const checkCommand = process.platform === 'win32' ? 'where' : 'which'

  for (const alias of aliases) {
    try {
      await execAsync(`${checkCommand} ${alias}`, {
        timeout: 2000
      })
      return true
    } catch {
      // continue to next alias
    }
  }

  return false
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

function getKnownWindowsIdePaths(): Record<string, string[]> {
  const { programFiles, programFilesX86, localAppData, userProfile } = getWindowsRoots()
  return {
    code: [
      join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe'),
      join(programFiles, 'Microsoft VS Code', 'Code.exe'),
      join(programFilesX86, 'Microsoft VS Code', 'Code.exe'),
      join(localAppData, 'Programs', 'Microsoft VS Code Insiders', 'Code - Insiders.exe')
    ],
    cursor: [
      join(localAppData, 'Programs', 'cursor', 'Cursor.exe'),
      join(localAppData, 'Programs', 'Cursor', 'Cursor.exe'),
      join(programFiles, 'Cursor', 'Cursor.exe'),
      join(programFilesX86, 'Cursor', 'Cursor.exe')
    ],
    idea: [
      join(localAppData, 'Programs', 'IntelliJ IDEA', 'bin', 'idea64.exe'),
      join(programFiles, 'JetBrains', 'IntelliJ IDEA', 'bin', 'idea64.exe'),
      join(programFilesX86, 'JetBrains', 'IntelliJ IDEA', 'bin', 'idea64.exe')
    ],
    pycharm: [
      join(localAppData, 'Programs', 'PyCharm Community', 'bin', 'pycharm64.exe'),
      join(localAppData, 'Programs', 'PyCharm Professional', 'bin', 'pycharm64.exe'),
      join(programFiles, 'JetBrains', 'PyCharm', 'bin', 'pycharm64.exe')
    ],
    webstorm: [join(localAppData, 'Programs', 'WebStorm', 'bin', 'webstorm64.exe')],
    goland: [join(localAppData, 'Programs', 'GoLand', 'bin', 'goland64.exe')],
    clion: [join(localAppData, 'Programs', 'CLion', 'bin', 'clion64.exe')],
    rider: [join(localAppData, 'Programs', 'Rider', 'bin', 'rider64.exe')],
    rubymine: [join(localAppData, 'Programs', 'RubyMine', 'bin', 'rubymine64.exe')],
    datagrip: [join(localAppData, 'Programs', 'DataGrip', 'bin', 'datagrip64.exe')],
    antigravity: [
      join(localAppData, 'Programs', 'Antigravity', 'Antigravity.exe'),
      join(localAppData, 'Programs', 'Antigravity', 'bin', 'antigravity.cmd'),
      join(localAppData, 'Programs', 'Antigravity', 'bin', 'antigravity')
    ],
    vim: [
      join(programFiles, 'Vim', 'vim90', 'vim.exe'),
      join(programFilesX86, 'Vim', 'vim90', 'vim.exe')
    ],
    nvim: [
      join(localAppData, 'nvim', 'nvim.exe'),
      join(programFiles, 'Neovim', 'bin', 'nvim.exe'),
      join(programFilesX86, 'Neovim', 'bin', 'nvim.exe'),
      join(userProfile, 'scoop', 'apps', 'neovim', 'current', 'bin', 'nvim.exe')
    ]
  }
}

function getWindowsSearchRoots(toolName: string): string[] {
  const { programFiles, programFilesX86, localAppData, userProfile } = getWindowsRoots()
  const jetbrainsRoots = [
    join(localAppData, 'Programs'),
    join(programFiles, 'JetBrains'),
    join(programFilesX86, 'JetBrains'),
    join(localAppData, 'JetBrains', 'Toolbox', 'apps')
  ]

  switch (toolName) {
    case 'code':
      return [join(localAppData, 'Programs'), programFiles, programFilesX86]
    case 'cursor':
      return [
        join(localAppData, 'Programs'),
        programFiles,
        programFilesX86,
        join(userProfile, 'AppData', 'Local', 'cursor-updater')
      ]
    case 'idea':
    case 'pycharm':
    case 'webstorm':
    case 'goland':
    case 'clion':
    case 'rider':
    case 'rubymine':
    case 'datagrip':
      return jetbrainsRoots
    case 'antigravity':
      return [join(localAppData, 'Programs'), programFiles, programFilesX86]
    case 'vim':
      return [join(programFiles, 'Vim'), join(programFilesX86, 'Vim')]
    case 'nvim':
      return [
        join(programFiles, 'Neovim'),
        join(programFilesX86, 'Neovim'),
        join(userProfile, 'scoop', 'apps', 'neovim'),
        join(localAppData, 'nvim')
      ]
    default:
      return []
  }
}

async function tryReadJetBrainsBuildVersion(toolName: string): Promise<string | undefined> {
  if (process.platform !== 'win32') return undefined

  const executableNames = WINDOWS_IDE_EXECUTABLE_NAMES[toolName]
  if (!executableNames?.length) return undefined

  for (const root of getWindowsSearchRoots(toolName)) {
    try {
      const products = await fs.readdir(root, { withFileTypes: true })
      for (const product of products) {
        if (!product.isDirectory()) continue

        const candidateBuildFile = join(root, product.name, 'build.txt')
        if (existsSync(candidateBuildFile)) {
          const build = (await fs.readFile(candidateBuildFile, 'utf-8')).trim()
          if (build) return build
        }
      }
    } catch {
      // continue
    }
  }

  return undefined
}

async function isToolInstalled(tool: ToolDefinition): Promise<boolean> {
  if (await isToolInstalledByCommand(tool)) {
    return true
  }

  if (process.platform !== 'win32') {
    return false
  }

  const knownPaths = getKnownWindowsIdePaths()[tool.name] || []
  for (const filePath of knownPaths) {
    if (existsSync(filePath)) return true
  }

  const executableNames = WINDOWS_IDE_EXECUTABLE_NAMES[tool.name] || []
  if (!executableNames.length) {
    return false
  }

  for (const root of getWindowsSearchRoots(tool.name)) {
    if (await findExecutableInDir(root, executableNames, 4)) return true
  }

  return false
}

export async function scanDevelopmentTools(): Promise<ToolsScanOutput> {
  const installedTools: ToolInfo[] = []
  const customTools = await loadCustomTools()
  const tools = mergeToolDefinitions(customTools)

  for (const tool of tools) {
    const installed = await isToolInstalled(tool)

    if (installed) {
      const version =
        (await getToolVersion(tool)) || (await tryReadJetBrainsBuildVersion(tool.name))
      installedTools.push({ ...tool, installed: true, version })
    }
  }

  const knownAliases = new Set(
    tools.flatMap((tool) => getAliases(tool).map((alias) => alias.toLowerCase()))
  )
  const unknownCandidates = await discoverUnknownTools(knownAliases)

  return {
    tools: installedTools,
    unknownCandidates
  }
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

export function getToolsStats(tools: ToolInfo[]): ToolsStats {
  const count = tools.length
  const categories = new Set(tools.map((t) => t.category)).size

  return {
    installed: count,
    total: count,
    categories,
    percentage: 100
  }
}

async function resolveRunnableAlias(aliases: string[]): Promise<string | undefined> {
  const checkCommand = process.platform === 'win32' ? 'where' : 'which'

  for (const alias of aliases) {
    try {
      await execAsync(`${checkCommand} ${alias}`, {
        timeout: 2000
      })
      return alias
    } catch {
      // try next alias
    }
  }

  return undefined
}

function launchToolCommand(command: string): void {
  if (process.platform === 'win32') {
    const child = spawn('cmd', ['/c', 'start', '', command], {
      detached: true,
      stdio: 'ignore'
    })
    child.unref()
    return
  }

  const child = spawn(command, [], {
    detached: true,
    stdio: 'ignore'
  })
  child.unref()
}

export async function openDevelopmentTool(toolName: string): Promise<void> {
  const normalizedName = toolName.trim().toLowerCase()
  if (!normalizedName) {
    throw new Error('Tool name is required')
  }

  const customTools = await loadCustomTools()
  const tools = mergeToolDefinitions(customTools)
  const targetTool = tools.find((tool) => {
    if (tool.name.toLowerCase() === normalizedName) return true
    return getAliases(tool).some((alias) => alias.toLowerCase() === normalizedName)
  })

  if (!targetTool) {
    throw new Error(`Tool not found: ${toolName}`)
  }

  const aliases = getAliases(targetTool)
  const runnableAlias = (await resolveRunnableAlias(aliases)) || aliases[0]
  launchToolCommand(runnableAlias)
}
