const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs').promises

// Helper to scan directories
async function scanForProjects(startPath, maxDepth = 3) {
  const projects = []

  async function scan(currentPath, currentDepth) {
    if (currentDepth > maxDepth) return

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true })

      const isProject = entries.some(entry =>
        ['package.json', 'pom.xml', 'build.gradle', 'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'composer.json', '.git'].includes(entry.name)
      )

      if (isProject) {
        // Determine project type based on file
        let type = 'unknown'
        if (entries.some(e => e.name === 'package.json')) type = 'node'
        else if (entries.some(e => e.name === 'pom.xml')) type = 'maven'
        else if (entries.some(e => e.name === 'build.gradle')) type = 'gradle'
        else if (entries.some(e => e.name === 'Cargo.toml')) type = 'rust'
        else if (entries.some(e => e.name === 'go.mod')) type = 'go'
        else if (entries.some(e => e.name === 'composer.json')) type = 'php'
        else if (entries.some(e => matchesPython(e.name))) type = 'python'
        else if (entries.some(e => e.name === '.git')) type = 'git'

        projects.push({
          name: path.basename(currentPath),
          path: currentPath,
          type: type
        })
        // Usually we stop here if it's a project, but for monorepos we might want to continue.
        // For now, let's treat nested projects as separate if found, but skip node_modules etc.
      }

      // Recurse into subdirectories
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Skip common non-project directories to improve performance and avoid noise
          if (['node_modules', 'dist', 'build', 'target', '.git', '.idea', '.vscode', 'vendor'].includes(entry.name)) continue

          // Also skip hidden directories generally
          if (entry.name.startsWith('.')) continue

          await scan(path.join(currentPath, entry.name), currentDepth + 1)
        }
      }

    } catch (err) {
      console.error(`Error scanning ${currentPath}:`, err)
    }
  }

  function matchesPython(name) {
    return ['requirements.txt', 'pyproject.toml', 'Pipfile'].includes(name)
  }

  await scan(startPath, 0)
  try {
    const cacheDir = app.getPath('userData')
    const cacheFile = path.join(cacheDir, 'projects-cache.json')
    await fs.writeFile(cacheFile, JSON.stringify(projects, null, 2))
    console.log('Saved projects to:', cacheFile)
  } catch (err) {
    console.error('Failed to save cache:', err)
  }
  return projects
}

async function loadCachedProjects() {
  try {
    const cacheDir = app.getPath('userData')
    const cacheFile = path.join(cacheDir, 'projects-cache.json')
    const data = await fs.readFile(cacheFile, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to load cache:', err)
    return []
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Development mode loads from Vite dev server
  // Development mode loads from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    const checkServer = async () => {
      try {
        await win.loadURL('http://127.0.0.1:5173')
      } catch (e) {
        console.log('Waiting for Vite server...')
        setTimeout(checkServer, 1000)
      }
    }
    checkServer()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Always open DevTools
  win.webContents.openDevTools()
}

app.whenReady().then(() => {
  ipcMain.handle('dialog:selectDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  ipcMain.handle('scanner:scan', async (event, path) => {
    return await scanForProjects(path)
  })

  ipcMain.handle('scanner:load', async () => {
    return await loadCachedProjects()
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
