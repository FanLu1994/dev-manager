import { Tray, Menu, app, nativeImage, BrowserWindow } from 'electron'
import path from 'path'

let tray: Tray | null = null

export interface RecentProject {
  name: string
  path: string
  lastOpened: number
}

const MAX_RECENT_PROJECTS = 10
const RECENT_STORAGE_KEY = 'recent-projects'

export function createTray(
  mainWindow: BrowserWindow,
  onOpenProject: (path: string) => void
): void {
  // 销毁现有托盘
  destroyTray()

  // 创建托盘图标
  const iconPath = path.join(__dirname, '../../resources/tray-icon.png')
  const image = nativeImage.createFromPath(iconPath)

  tray = new Tray(image)
  tray.setToolTip('Dev Manager - Recent Projects')

  // 初始化菜单
  updateTrayMenu(mainWindow, onOpenProject)
}

export function updateTrayMenu(
  mainWindow: BrowserWindow,
  onOpenProject: (path: string) => void
): void {
  if (!tray) return

  const recentProjects = getRecentProjects()

  const template = [
    {
      label: 'Dev Manager',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
          mainWindow.show()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Recent Projects',
      submenu: recentProjects.length > 0
        ? recentProjects.map((project, index) => ({
            label: `${index + 1}. ${project.name}`,
            click: () => {
              onOpenProject(project.path)
              updateRecentProject(project)
            }
          }))
        : [{ label: 'No recent projects', enabled: false }]
    },
    { type: 'separator' },
    {
      label: 'Scan Projects',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ]

  const contextMenu = Menu.buildFromTemplate(template)
  tray.setContextMenu(contextMenu)
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function getRecentProjects(): RecentProject[] {
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY)
    if (stored) {
      const projects: RecentProject[] = JSON.parse(stored)
      return projects
        .sort((a, b) => b.lastOpened - a.lastOpened)
        .slice(0, MAX_RECENT_PROJECTS)
    }
  } catch (error) {
    console.error('Failed to load recent projects:', error)
  }
  return []
}

export function updateRecentProject(project: RecentProject): void {
  const recent = getRecentProjects()

  // 移除已存在的同名项目
  const filtered = recent.filter((p) => p.path !== project.path)

  // 添加到开头
  filtered.unshift({
    ...project,
    lastOpened: Date.now()
  })

  // 只保留最近 N 个
  const updated = filtered.slice(0, MAX_RECENT_PROJECTS)

  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save recent projects:', error)
  }
}

export function addRecentProject(name: string, path: string): void {
  updateRecentProject({
    name,
    path,
    lastOpened: Date.now()
  })
}

export function clearRecentProjects(): void {
  try {
    localStorage.removeItem(RECENT_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear recent projects:', error)
  }
}

// 打开项目的默认方式
export async function openProject(path: string): Promise<void> {
  const { shell } = require('electron')
  await shell.openPath(path)
}

// 使用 VS Code 打开项目
export async function openWithVSCode(path: string): Promise<void> {
  const { exec } = require('child_process')
  const command = process.platform === 'win32'
    ? `code "${path}"`
    : process.platform === 'darwin'
    ? `open -a "Visual Studio Code" "${path}"`
    : `code "${path}"`

  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}
