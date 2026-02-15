import { app, shell, BrowserWindow, ipcMain, dialog, type MessageBoxOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { scanProjects, categorizeByLanguage, categorizeByType } from './scanner'
import {
  scanDevelopmentTools,
  categorizeTools,
  confirmUnknownTools,
  getToolsStats,
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

async function showMessageBoxSafe(
  window: BrowserWindow | undefined,
  options: MessageBoxOptions
) {
  if (window) return dialog.showMessageBox(window, options)
  return dialog.showMessageBox(options)
}

async function selectUnknownToolsInteractively(
  window: BrowserWindow | undefined,
  candidates: UnknownToolCandidate[]
): Promise<UnknownToolCandidate[]> {
  const selected: UnknownToolCandidate[] = []

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const remaining = candidates.length - index - 1

    const result = await showMessageBoxSafe(window, {
      type: 'question',
      title: `Confirm Tool (${index + 1}/${candidates.length})`,
      message: `Add "${candidate.command}" as a development tool?`,
      detail:
        `Path: ${candidate.sourcePath}\n\n` +
        'Choose Add This to save this one, Skip to ignore this one, Add Remaining to accept all rest, or Stop to end.',
      buttons: ['Add This', 'Skip', 'Add Remaining', 'Stop'],
      defaultId: 0,
      cancelId: 3,
      noLink: true
    })

    if (result.response === 0) {
      selected.push(candidate)
      continue
    }

    if (result.response === 1) {
      continue
    }

    if (result.response === 2) {
      selected.push(...candidates.slice(index))
      break
    }

    if (remaining > 0) {
      break
    }
  }

  return selected
}

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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
    return {
      projects,
      byLanguage: categorizeByLanguage(projects),
      byType: categorizeByType(projects)
    }
  })

  // 扫描开发工具
  ipcMain.handle('scan-tools', async () => {
    let scanResult = await scanDevelopmentTools()

    if (scanResult.unknownCandidates.length > 0) {
      const currentWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      const startConfirmation = await showMessageBoxSafe(currentWindow, {
        type: 'question',
        title: 'Confirm New Development Tools',
        message: `Detected ${scanResult.unknownCandidates.length} unrecognized tool command(s).`,
        detail:
          'You can review them one-by-one and choose which to save.\n\n' +
          'Choose "Review" to start selection, or "Ignore" to skip.',
        buttons: ['Review', 'Ignore'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      })

      if (startConfirmation.response === 0) {
        const selectedCandidates = await selectUnknownToolsInteractively(
          currentWindow,
          scanResult.unknownCandidates
        )
        if (selectedCandidates.length > 0) {
          await confirmUnknownTools(selectedCandidates)
        }
        scanResult = await scanDevelopmentTools()
      }
    }

    const tools = scanResult.tools
    return {
      tools,
      byCategory: categorizeTools(tools),
      stats: getToolsStats(tools)
    }
  })

  // 打开项目
  ipcMain.handle('open-project', async (_, projectPath: string) => {
    await openProject(projectPath)
  })

  // 用 VS Code 打开项目
  ipcMain.handle('open-with-vscode', async (_, projectPath: string) => {
    await openWithVSCode(projectPath)
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
