import { ref } from 'vue'

export type ThemeMode = 'dark' | 'light'

const THEME_STORAGE_KEY = 'dev-manager-theme'

export function useTheme() {
  const theme = ref<ThemeMode>('dark')

  function applyTheme(nextTheme: ThemeMode): void {
    theme.value = nextTheme
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  }

  function initTheme(): void {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedTheme === 'dark' || savedTheme === 'light') {
      applyTheme(savedTheme)
      return
    }

    const preferredTheme: ThemeMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    applyTheme(preferredTheme)
  }

  function toggleTheme(): void {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    initTheme,
    toggleTheme
  }
}
