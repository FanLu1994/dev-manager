const DEFAULT_ACCENT = '#6b7280'

const LANGUAGE_ACCENTS: Record<string, string> = {
  'JavaScript/TypeScript': '#f7df1e',
  Python: '#3776ab',
  Go: '#00add8',
  Rust: '#dea584',
  Ruby: '#cc342d',
  Java: '#007396',
  'C#': '#512bd4',
  PHP: '#777bb3',
  Dart: '#0175c2',
  Swift: '#f05138',
  'C/C++': '#00599c',
  Unknown: DEFAULT_ACCENT
}

const TOOL_CATEGORY_ACCENTS: Record<string, string> = {
  IDE: '#ef4444',
  CLI: '#3b82f6'
}

export function getLanguageAccent(language: string): string {
  return LANGUAGE_ACCENTS[language] ?? DEFAULT_ACCENT
}

export function getCategoryAccent(category: string): string {
  return TOOL_CATEGORY_ACCENTS[category] ?? DEFAULT_ACCENT
}
