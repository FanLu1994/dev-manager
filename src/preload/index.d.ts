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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectFolder: () => Promise<string | null>
      scanProjects: (folderPath: string) => Promise<ScanResult>
    }
  }
}
