import { ElectronAPI } from '@electron-toolkit/preload'

export interface ProjectInfo {
  name: string
  path: string
  language: string
  type: string
  description?: string
  hasGit?: boolean
  lastModified?: number
  lastUsedTool?: string
  selectedTools?: string[]
}

export interface ScanResult {
  projects: ProjectInfo[]
  byLanguage: Record<string, ProjectInfo[]>
  byType: Record<string, ProjectInfo[]>
}

export interface CachedProjectsResult extends ScanResult {
  folderPath: string
  cachedAt: number
}

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

export interface ToolsScanResult {
  tools: ToolInfo[]
  byCategory: Record<string, ToolInfo[]>
  unknownCandidates: UnknownToolCandidate[]
  stats: {
    installed: number
    total: number
    categories: number
    percentage: number
  }
}

export interface CachedToolsResult extends ToolsScanResult {
  cachedAt: number
}

export interface RecentProject {
  name: string
  path: string
  lastOpened: number
}

export interface ProjectToolSelection {
  projectPath: string
  selectedTools: string[]
  lastUsedTool?: string
  lastUsedAt?: number
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFolder: () => Promise<string | null>
      scanProjects: (folderPath: string) => Promise<ScanResult>
      scanTools: () => Promise<ToolsScanResult>
      openProject: (projectPath: string) => Promise<void>
      openWithVSCode: (projectPath: string) => Promise<void>
      openProjectWithTool: (toolName: string, projectPath: string) => Promise<void>
      openTool: (toolName: string) => Promise<void>
      confirmUnknownTools: (candidates: UnknownToolCandidate[]) => Promise<number>
      getCachedTools: () => Promise<CachedToolsResult | null>
      getCachedProjects: () => Promise<CachedProjectsResult | null>
      checkProjectExists: (projectPath: string) => Promise<boolean>
      addRecentProject: (name: string, path: string) => Promise<void>
      getRecentProjects: () => Promise<RecentProject[]>
      clearRecentProjects: () => Promise<void>
      getProjectToolSelection: (projectPath: string) => Promise<ProjectToolSelection | null>
      saveProjectToolSelection: (projectPath: string, selectedTools: string[]) => Promise<void>
      getAllProjectToolSelections: () => Promise<Record<string, ProjectToolSelection>>
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose: () => void
    }
  }
}
