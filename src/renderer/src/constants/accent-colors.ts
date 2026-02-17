const DEFAULT_ACCENT = '#8b9bb4'

const LANGUAGE_ACCENTS: Record<string, string> = {
  'JavaScript/TypeScript': '#f59e0b',
  Python: '#3b82f6',
  Go: '#10b981',
  Rust: '#ef4444',
  Ruby: '#ec4899',
  Java: '#8b5cf6',
  'C#': '#06b6d4',
  PHP: '#a855f7',
  Dart: '#f97316',
  Swift: '#6366f1',
  'C/C++': '#84cc16',
  Unknown: DEFAULT_ACCENT
}

const TOOL_CATEGORY_ACCENTS: Record<string, string> = {
  IDE: '#f43f5e',
  CLI: '#64748b'
}

export function getLanguageAccent(language: string): string {
  return LANGUAGE_ACCENTS[language] ?? DEFAULT_ACCENT
}

export function getCategoryAccent(category: string): string {
  return TOOL_CATEGORY_ACCENTS[category] ?? DEFAULT_ACCENT
}

export function getLanguageBadgeStyle(language: string) {
  const accent = getLanguageAccent(language)
  return {
    backgroundColor: `${accent}15`,
    color: accent,
    borderColor: `${accent}40`
  }
}

