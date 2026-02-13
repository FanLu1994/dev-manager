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

export interface ToolInfo {
  name: string
  displayName: string
  version?: string
  installed: boolean
  icon?: string
  category: 'Runtime' | 'Package Manager' | 'Version Control' | 'Build Tool' | 'Container' | 'IDE' | 'Other'
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
      addRecentProject: (name: string, path: string) => Promise<void>
      getRecentProjects: () => Promise<RecentProject[]>
      clearRecentProjects: () => Promise<void>
    }
  }
}
