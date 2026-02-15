import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ToolInfo, UnknownToolCandidate } from './tools-scanner'

const TOOLS_CACHE_FILE = 'tools-cache.json'

export interface ToolsCachePayload {
  tools: ToolInfo[]
  unknownCandidates: UnknownToolCandidate[]
  cachedAt: number
}

function getToolsCacheFilePath(): string {
  const userDataPath = app.getPath('userData')
  const storageDir = join(userDataPath, 'storage')
  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true })
  }
  return join(storageDir, TOOLS_CACHE_FILE)
}

export async function saveToolsCache(
  tools: ToolInfo[],
  unknownCandidates: UnknownToolCandidate[]
): Promise<void> {
  const payload: ToolsCachePayload = {
    tools,
    unknownCandidates,
    cachedAt: Date.now()
  }
  await writeFile(getToolsCacheFilePath(), JSON.stringify(payload, null, 2), 'utf-8')
}

export async function loadToolsCache(): Promise<ToolsCachePayload | null> {
  try {
    const raw = await readFile(getToolsCacheFilePath(), 'utf-8')
    const parsed = JSON.parse(raw) as ToolsCachePayload
    if (!parsed || !Array.isArray(parsed.tools) || !Array.isArray(parsed.unknownCandidates)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}
