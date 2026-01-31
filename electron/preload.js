const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Add your API methods here
  getVersions: () => process.versions,
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  scanDirectory: (path) => ipcRenderer.invoke('scanner:scan', path),
  loadCache: () => ipcRenderer.invoke('scanner:load')
})
