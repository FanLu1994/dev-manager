import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { scanProjects, categorizeByLanguage, categorizeByType } from './scanner'
import { saveProjectsCache, loadProjectsCache, checkProjectExists } from './projects-cache'
import { loadToolsCache, saveToolsCache } from './tools-cache'
import {
  scanDevelopmentTools,
  categorizeTools,
  confirmUnknownTools,
  getToolsStats,
  openDevelopmentTool,
  openProjectWithDevelopmentTool,
  type UnknownToolCandidate
} from './tools-scanner'
import {
  createTray,
  destroyTray,
  getRecentProjects,
  addRecentProject,
  clearRecentProjects,
  openProject,
  openWithVSCode
} from './tray'

let isAppQuitting = false

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Don't quit when window is closed, hide to tray instead
  mainWindow.on('close', (event) => {
    if (!isAppQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))

  // Window controls
  ipcMain.on('window-minimize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.minimize()
  })

  ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.on('window-close', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) win.close()
  })

  // 选择文件夹
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择开发项目根目录'
    })

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // 扫描项目
  ipcMain.handle('scan-projects', async (_, folderPath: string) => {
    const projects = await scanProjects(folderPath)
    await saveProjectsCache(folderPath, projects)
    return {
      projects,
      byLanguage: categorizeByLanguage(projects),
      byType: categorizeByType(projects)
    }
  })

  // 读取缓存项目
  ipcMain.handle('get-cached-projects', async () => {
    const cache = await loadProjectsCache()
    if (!cache) return null

    return {
      folderPath: cache.folderPath,
      projects: cache.projects,
      byLanguage: categorizeByLanguage(cache.projects),
      byType: categorizeByType(cache.projects),
      cachedAt: cache.cachedAt
    }
  })

  // 检查项目是否存在
  ipcMain.handle('check-project-exists', async (_, projectPath: string) => {
    return checkProjectExists(projectPath)
  })

  // 扫描开发工具
  ipcMain.handle('scan-tools', async () => {
    const scanResult = await scanDevelopmentTools()
    const tools = scanResult.tools
    await saveToolsCache(tools, scanResult.unknownCandidates)
    return {
      tools,
      byCategory: categorizeTools(tools),
      stats: getToolsStats(tools),
      unknownCandidates: scanResult.unknownCandidates
    }
  })

  // 读取缓存工具
  ipcMain.handle('get-cached-tools', async () => {
    const cache = await loadToolsCache()
    if (!cache) return null
    return {
      tools: cache.tools,
      byCategory: categorizeTools(cache.tools),
      stats: getToolsStats(cache.tools),
      unknownCandidates: cache.unknownCandidates,
      cachedAt: cache.cachedAt
    }
  })

  // 确认新增开发工具（由前端自定义弹窗触发）
  ipcMain.handle('confirm-unknown-tools', async (_, candidates: UnknownToolCandidate[]) => {
    const added = await confirmUnknownTools(candidates)
    const refreshed = await scanDevelopmentTools()
    await saveToolsCache(refreshed.tools, refreshed.unknownCandidates)
    return added
  })

  // 打开项目
  ipcMain.handle('open-project', async (_, projectPath: string) => {
    if (!(await checkProjectExists(projectPath))) {
      throw new Error('PROJECT_NOT_FOUND')
    }
    await openProject(projectPath)
  })

  // 用 VS Code 打开项目
  ipcMain.handle('open-with-vscode', async (_, projectPath: string) => {
    if (!(await checkProjectExists(projectPath))) {
      throw new Error('PROJECT_NOT_FOUND')
    }
    await openWithVSCode(projectPath)
  })

  // 打开开发工具
  ipcMain.handle('open-tool', async (_, toolName: string) => {
    await openDevelopmentTool(toolName)
  })

  // 用指定开发工具打开项目
  ipcMain.handle('open-project-with-tool', async (_, toolName: string, projectPath: string) => {
    if (!(await checkProjectExists(projectPath))) {
      throw new Error('PROJECT_NOT_FOUND')
    }
    await openProjectWithDevelopmentTool(toolName, projectPath)
  })

  // 添加到最近项目
  ipcMain.handle('add-recent-project', async (_, { name, path }) => {
    addRecentProject(name, path)
  })

  // 获取最近项目
  ipcMain.handle('get-recent-projects', async () => {
    return getRecentProjects()
  })

  // 清空最近项目
  ipcMain.handle('clear-recent-projects', async () => {
    clearRecentProjects()
  })

  const mainWindow = createWindow()

  // 创建系统托盘
  createTray(mainWindow, async (projectPath: string) => {
    await openProject(projectPath)
    // 添加到最近项目
    addRecentProject(
      projectPath.split('/').pop() || projectPath.split('\\').pop() || 'Unknown',
      projectPath
    )
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // 处理应用退出
  app.on('before-quit', () => {
    isAppQuitting = true
    destroyTray()
  })
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
