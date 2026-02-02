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

// Custom APIs for renderer
const api = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanProjects: (folderPath: string) => ipcRenderer.invoke('scan-projects', folderPath)
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
