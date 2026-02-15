import { ElectronAPI } from '@electron-toolkit/preload'

export interface ProjectInfo {
  name: string
  path: string
  language: string
  type: string
  description?: string
  hasGit?: boolean
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

export interface ToolsScanResult {
  tools: ToolInfo[]
  byCategory: Record<string, ToolInfo[]>
  stats: {
    installed: number
    total: number
    categories: number
    percentage: number
  }
}

export interface RecentProject {
  name: string
  path: string
  lastOpened: number
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
      getCachedProjects: () => Promise<CachedProjectsResult | null>
      checkProjectExists: (projectPath: string) => Promise<boolean>
      addRecentProject: (name: string, path: string) => Promise<void>
      getRecentProjects: () => Promise<RecentProject[]>
      clearRecentProjects: () => Promise<void>
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose: () => void
    }
  }
}
