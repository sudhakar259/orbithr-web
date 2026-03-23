import { ref, watchEffect } from 'vue'

export type Theme = 'dark' | 'light' | 'auto'

const STORAGE_KEY = 'orbithr_theme'
const theme = ref<Theme>((localStorage.getItem(STORAGE_KEY) as Theme) || 'dark')

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
}

// Apply immediately on import
applyTheme(theme.value)

watchEffect(() => {
  applyTheme(theme.value)
  localStorage.setItem(STORAGE_KEY, theme.value)
})

export function useTheme() {
  function setTheme(t: Theme) {
    theme.value = t
  }
  return { theme, setTheme }
}
