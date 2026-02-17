import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'

const execAsync = promisify(exec)
const ICONS_DIR = 'tool-icons'

function getIconsDir(): string {
  const userDataPath = app.getPath('userData')
  const iconsDir = join(userDataPath, ICONS_DIR)
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true })
  }
  return iconsDir
}

/**
 * 使用 Windows PowerShell 从 .exe 文件中提取图标并保存为 PNG
 * @param exePath exe 文件的完整路径
 * @param toolName 工具名称，用作文件名
 * @returns 保存的图标文件路径，如果提取失败返回 null
 */
export async function extractAndSaveIcon(
  exePath: string,
  toolName: string
): Promise<string | null> {
  if (process.platform !== 'win32') {
    return null
  }

  if (!existsSync(exePath)) {
    return null
  }

  const iconsDir = getIconsDir()
  const iconFileName = `${toolName}.png`
  const iconFilePath = join(iconsDir, iconFileName)

  // 如果图标已存在，直接返回
  if (existsSync(iconFilePath)) {
    return iconFilePath
  }

  // 创建临时 PowerShell 脚本文件
  const tempScriptPath = join(
    app.getPath('temp'),
    `extract-icon-${randomBytes(8).toString('hex')}.ps1`
  )

  try {
    // PowerShell 脚本内容
    const psScript = `Add-Type -AssemblyName System.Drawing
$exePath = '${exePath.replace(/'/g, "''")}'
$iconPath = '${iconFilePath.replace(/'/g, "''")}'
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
$bmp = $icon.ToBitmap()
$bmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$icon.Dispose()
`

    // 写入临时脚本文件
    await writeFile(tempScriptPath, psScript, 'utf-8')

    // 执行 PowerShell 脚本
    await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`, {
      timeout: 15000,
      windowsHide: true
    })

    // 检查文件是否创建成功
    if (existsSync(iconFilePath)) {
      return iconFilePath
    }
  } catch (error) {
    console.error(`Failed to extract icon from ${exePath}:`, error)
  } finally {
    // 删除临时脚本文件
    try {
      await unlink(tempScriptPath)
    } catch {
      // 忽略删除失败
    }
  }

  return null
}

/**
 * 获取工具图标文件路径
 * @param toolName 工具名称
 * @returns 图标文件路径，如果不存在返回 null
 */
export function getToolIconPath(toolName: string): string | null {
  const iconsDir = getIconsDir()
  const iconFilePath = join(iconsDir, `${toolName}.png`)
  if (existsSync(iconFilePath)) {
    return iconFilePath
  }
  return null
}

/**
 * 将图标文件读取为 base64 数据 URI
 * @param toolName 工具名称
 * @returns base64 数据 URI，如果读取失败返回 null
 */
export async function getToolIconAsBase64(toolName: string): Promise<string | null> {
  const iconPath = getToolIconPath(toolName)
  if (!iconPath) {
    return null
  }

  try {
    const buffer = await readFile(iconPath)
    const base64 = buffer.toString('base64')
    return `data:image/png;base64,${base64}`
  } catch (error) {
    console.error(`Failed to read icon for ${toolName}:`, error)
    return null
  }
}
