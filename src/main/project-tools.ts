import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

export interface ProjectInfo {
  name: string
  path: string
  language: string
  type: string
  description?: string
  hasGit?: boolean
  lastModified?: number
  lastUsedTool?: string
  selectedTools?: string[]
}

const PROJECT_TOOLS_FILE = 'project-tools.json'

export interface ProjectToolSelection {
  projectPath: string
  selectedTools: string[]
  lastUsedTool?: string
  lastUsedAt?: number
}

interface ProjectToolsData {
  projects: Record<string, ProjectToolSelection>
}

function getProjectToolsFilePath(): string {
  const userDataPath = app.getPath('userData')
  const storageDir = join(userDataPath, 'storage')
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true })
  }
  return join(storageDir, PROJECT_TOOLS_FILE)
}

async function loadProjectToolsData(): Promise<ProjectToolsData> {
  try {
    const filePath = getProjectToolsFilePath()
    if (!existsSync(filePath)) {
      return { projects: {} }
    }
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content) as ProjectToolsData
  } catch {
    return { projects: {} }
  }
}

async function saveProjectToolsData(data: ProjectToolsData): Promise<void> {
  const filePath = getProjectToolsFilePath()
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * 获取项目的工具选择
 */
export async function getProjectToolSelection(projectPath: string): Promise<ProjectToolSelection | null> {
  const data = await loadProjectToolsData()
  return data.projects[projectPath] || null
}

/**
 * 保存项目的工具选择
 */
export async function saveProjectToolSelection(
  projectPath: string,
  selectedTools: string[]
): Promise<void> {
  const data = await loadProjectToolsData()
  const existing = data.projects[projectPath]
  data.projects[projectPath] = {
    projectPath,
    selectedTools,
    lastUsedTool: existing?.lastUsedTool,
    lastUsedAt: existing?.lastUsedAt
  }
  await saveProjectToolsData(data)
}

/**
 * 记录项目使用的工具
 */
export async function recordProjectToolUsage(projectPath: string, toolName: string): Promise<void> {
  const data = await loadProjectToolsData()
  const existing = data.projects[projectPath]
  data.projects[projectPath] = {
    projectPath,
    selectedTools: existing?.selectedTools || [toolName],
    lastUsedTool: toolName,
    lastUsedAt: Date.now()
  }
  await saveProjectToolsData(data)
}

/**
 * 获取所有项目的工具选择
 */
export async function getAllProjectToolSelections(): Promise<Record<string, ProjectToolSelection>> {
  const data = await loadProjectToolsData()
  return data.projects
}

/**
 * 为项目列表附加工具选择信息
 */
export async function attachProjectToolInfo(projects: ProjectInfo[]): Promise<void> {
  const selections = await getAllProjectToolSelections()

  for (const project of projects) {
    const selection = selections[project.path]
    if (selection) {
      project.selectedTools = selection.selectedTools
      project.lastUsedTool = selection.lastUsedTool
    }
  }
}
