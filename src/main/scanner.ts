import { readdir, readFile, access, constants, stat } from 'fs/promises'
import { join, basename } from 'path'

export interface ProjectInfo {
  name: string
  path: string
  language: string
  type: string
  description?: string
  hasGit?: boolean
  lastModified?: number
}

export type LanguageCategory = {
  [key: string]: ProjectInfo[]
}

export type ProjectCategory = {
  [key: string]: ProjectInfo[]
}

// 项目类型识别规则
const PROJECT_DETECTORS = [
  // JavaScript/TypeScript
  {
    file: 'package.json',
    type: 'Node.js',
    language: 'JavaScript/TypeScript',
    description: 'Node.js 项目'
  },
  // Python
  {
    file: 'requirements.txt',
    type: 'Python',
    language: 'Python',
    description: 'Python 项目'
  },
  {
    file: 'setup.py',
    type: 'Python',
    language: 'Python',
    description: 'Python 项目'
  },
  {
    file: 'pyproject.toml',
    type: 'Python',
    language: 'Python',
    description: 'Python 项目'
  },
  // Go
  {
    file: 'go.mod',
    type: 'Go',
    language: 'Go',
    description: 'Go 项目'
  },
  // Rust
  {
    file: 'Cargo.toml',
    type: 'Rust',
    language: 'Rust',
    description: 'Rust 项目'
  },
  // Ruby
  {
    file: 'Gemfile',
    type: 'Ruby',
    language: 'Ruby',
    description: 'Ruby 项目'
  },
  // Java
  {
    file: 'pom.xml',
    type: 'Java/Maven',
    language: 'Java',
    description: 'Maven 项目'
  },
  {
    file: 'build.gradle',
    type: 'Java/Gradle',
    language: 'Java',
    description: 'Gradle 项目'
  },
  // .NET
  {
    file: '.csproj',
    type: '.NET',
    language: 'C#',
    description: '.NET 项目'
  },
  {
    file: 'project.json',
    type: '.NET',
    language: 'C#',
    description: '.NET 项目'
  },
  // PHP
  {
    file: 'composer.json',
    type: 'PHP',
    language: 'PHP',
    description: 'PHP 项目'
  },
  // Dart/Flutter
  {
    file: 'pubspec.yaml',
    type: 'Dart/Flutter',
    language: 'Dart',
    description: 'Dart/Flutter 项目'
  },
  // Swift
  {
    file: 'Package.swift',
    type: 'Swift',
    language: 'Swift',
    description: 'Swift Package'
  },
  // C/C++
  {
    file: 'CMakeLists.txt',
    type: 'C/C++',
    language: 'C/C++',
    description: 'CMake 项目'
  },
  {
    file: 'Makefile',
    type: 'C/C++',
    language: 'C/C++',
    description: 'C/C++ 项目'
  }
]

// 忽略的文件夹
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  'bin',
  'obj',
  'out',
  '.vscode',
  '.idea',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  'env',
  '.next',
  '.nuxt',
  'vendor',
  'tmp',
  'temp'
])

async function hasGitRepo(folderPath: string): Promise<boolean> {
  try {
    await access(join(folderPath, '.git'), constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function detectProjectType(
  folderPath: string
): Promise<{ type: string; language: string; description: string } | null> {
  for (const detector of PROJECT_DETECTORS) {
    try {
      await access(join(folderPath, detector.file), constants.F_OK)
      return {
        type: detector.type,
        language: detector.language,
        description: detector.description
      }
    } catch {
      continue
    }
  }

  // 检查是否有源代码文件
  try {
    const files = await readdir(folderPath)
    const hasSourceFiles = files.some(
      (file) =>
        file.endsWith('.js') ||
        file.endsWith('.ts') ||
        file.endsWith('.py') ||
        file.endsWith('.go') ||
        file.endsWith('.rs') ||
        file.endsWith('.java') ||
        file.endsWith('.cs') ||
        file.endsWith('.cpp') ||
        file.endsWith('.c') ||
        file.endsWith('.vue') ||
        file.endsWith('.jsx') ||
        file.endsWith('.tsx')
    )

    if (hasSourceFiles) {
      return {
        type: 'Unknown',
        language: 'Unknown',
        description: '未识别的项目类型'
      }
    }
  } catch {
    // 忽略错误
  }

  return null
}

export async function scanProjects(rootPath: string, maxDepth = 2): Promise<ProjectInfo[]> {
  const projects: ProjectInfo[] = []
  const visited = new Set<string>()

  async function scanDir(dirPath: string, currentDepth: number): Promise<void> {
    if (currentDepth > maxDepth || visited.has(dirPath)) {
      return
    }

    visited.add(dirPath)

    try {
      const entries = await readdir(dirPath, { withFileTypes: true })

      // 首先检测当前目录是否是项目
      const projectType = await detectProjectType(dirPath)
      if (projectType) {
        const hasGit = await hasGitRepo(dirPath)
        let lastModified = 0
        let description = projectType.description

        try {
          const stats = await stat(dirPath)
          lastModified = stats.mtimeMs
        } catch {
          // 使用默认值 0，保证排序逻辑可用
        }

        // 尝试从 package.json 读取更多信息
        if (projectType.type === 'Node.js') {
          try {
            const packageJson = await readFile(join(dirPath, 'package.json'), 'utf-8')
            const pkg = JSON.parse(packageJson)
            description = pkg.description || description
          } catch {
            // 使用默认描述
          }
        }

        projects.push({
          name: basename(dirPath),
          path: dirPath,
          language: projectType.language,
          type: projectType.type,
          description,
          hasGit,
          lastModified
        })

        // 找到项目后，不再深入扫描子目录
        return
      }

      // 如果不是项目，继续扫描子目录
      for (const entry of entries) {
        if (!entry.isDirectory() || IGNORE_DIRS.has(entry.name)) {
          continue
        }

        const fullPath = join(dirPath, entry.name)
        await scanDir(fullPath, currentDepth + 1)
      }
    } catch {
      // 忽略无法访问的目录
    }
  }

  await scanDir(rootPath, 0)
  return sortProjectsByLastModified(projects)
}

function sortProjectsByLastModified(projects: ProjectInfo[]): ProjectInfo[] {
  return [...projects].sort((a, b) => {
    const timeDiff = (b.lastModified ?? 0) - (a.lastModified ?? 0)
    if (timeDiff !== 0) return timeDiff
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}

export function categorizeByLanguage(projects: ProjectInfo[]): LanguageCategory {
  const categorized: LanguageCategory = {}

  for (const project of sortProjectsByLastModified(projects)) {
    const lang = project.language
    if (!categorized[lang]) {
      categorized[lang] = []
    }
    categorized[lang].push(project)
  }

  return categorized
}

export function categorizeByType(projects: ProjectInfo[]): ProjectCategory {
  const categorized: ProjectCategory = {}

  for (const project of sortProjectsByLastModified(projects)) {
    const type = project.type
    if (!categorized[type]) {
      categorized[type] = []
    }
    categorized[type].push(project)
  }

  return categorized
}
