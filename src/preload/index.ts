import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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

// Custom APIs for renderer
const api = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanProjects: (folderPath: string) => ipcRenderer.invoke('scan-projects', folderPath),
  scanTools: () => ipcRenderer.invoke('scan-tools'),
  openProject: (projectPath: string) => ipcRenderer.invoke('open-project', projectPath),
  openWithVSCode: (projectPath: string) => ipcRenderer.invoke('open-with-vscode', projectPath),
  openProjectWithTool: (toolName: string, projectPath: string) =>
    ipcRenderer.invoke('open-project-with-tool', toolName, projectPath),
  openTool: (toolName: string) => ipcRenderer.invoke('open-tool', toolName),
  confirmUnknownTools: (candidates: UnknownToolCandidate[]) =>
    ipcRenderer.invoke('confirm-unknown-tools', candidates),
  getCachedTools: () => ipcRenderer.invoke('get-cached-tools'),
  getCachedProjects: () => ipcRenderer.invoke('get-cached-projects'),
  checkProjectExists: (projectPath: string) =>
    ipcRenderer.invoke('check-project-exists', projectPath),
  addRecentProject: (name: string, path: string) =>
    ipcRenderer.invoke('add-recent-project', { name, path }),
  getRecentProjects: () => ipcRenderer.invoke('get-recent-projects'),
  clearRecentProjects: () => ipcRenderer.invoke('clear-recent-projects'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
