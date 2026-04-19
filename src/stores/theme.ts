import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'orbithr_theme_mode'

type ThemeMode = 'light' | 'dark'

function resolveInitial(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (saved === 'light' || saved === 'dark') return saved

  // Fallback to legacy key used by useTheme composable
  const legacy = localStorage.getItem('orbithr_theme')
  if (legacy === 'light') return 'light'
  if (legacy === 'dark') return 'dark'

  // Fallback to system preference
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function applyThemeToDOM(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  // Keep legacy `data-theme` attribute in sync for existing pages
  root.setAttribute('data-theme', mode)
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(resolveInitial())
  const isDark = ref(mode.value === 'dark')

  // Apply immediately on store creation
  applyThemeToDOM(mode.value)

  watch(mode, (next) => {
    isDark.value = next === 'dark'
    applyThemeToDOM(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
      localStorage.setItem('orbithr_theme', next)
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  })

  function setTheme(next: ThemeMode) {
    mode.value = next
  }

  function toggleTheme() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  /** Call once on app mount to ensure DOM is in sync (safe to call multiple times). */
  function init() {
    applyThemeToDOM(mode.value)
  }

  return { mode, isDark, setTheme, toggleTheme, init }
})
