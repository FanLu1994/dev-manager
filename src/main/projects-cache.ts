import { app } from 'electron'
import { constants, existsSync, mkdirSync } from 'fs'
import { access, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ProjectInfo } from './scanner'

const PROJECTS_CACHE_FILE = 'projects-cache.json'

interface ProjectsCachePayload {
  folderPath: string
  projects: ProjectInfo[]
  cachedAt: number
}

function getProjectsCacheFilePath(): string {
  const userDataPath = app.getPath('userData')
  const storageDir = join(userDataPath, 'storage')
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true })
  }
  return join(storageDir, PROJECTS_CACHE_FILE)
}

export async function saveProjectsCache(
  folderPath: string,
  projects: ProjectInfo[]
): Promise<void> {
  const payload: ProjectsCachePayload = {
    folderPath,
    projects,
    cachedAt: Date.now()
  }
  await writeFile(getProjectsCacheFilePath(), JSON.stringify(payload, null, 2), 'utf-8')
}

export async function loadProjectsCache(): Promise<ProjectsCachePayload | null> {
  try {
    const raw = await readFile(getProjectsCacheFilePath(), 'utf-8')
    const parsed = JSON.parse(raw) as ProjectsCachePayload
    if (!parsed || !Array.isArray(parsed.projects) || typeof parsed.folderPath !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export async function checkProjectExists(projectPath: string): Promise<boolean> {
  try {
    await access(projectPath, constants.F_OK)
    return true
  } catch {
    return false
  }
}
