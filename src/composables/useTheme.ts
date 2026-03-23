import { ref, watchEffect } from 'vue'

export type Theme = 'dark' | 'light' | 'auto'

const STORAGE_KEY = 'orbithr_theme'
const theme = ref<Theme>((localStorage.getItem(STORAGE_KEY) as Theme) || 'dark')

const sysDark = window.matchMedia('(prefers-color-scheme: dark)')

/** Resolves 'auto' to the actual system preference before setting the attribute.
 *  data-theme on <html> will always be 'dark' or 'light' — never 'auto' —
 *  so CSS overrides only need one selector set. */
function applyTheme(t: Theme) {
  const resolved = t === 'auto' ? (sysDark.matches ? 'dark' : 'light') : t
  document.documentElement.setAttribute('data-theme', resolved)
}

applyTheme(theme.value)

// Re-apply when OS preference changes while 'auto' is selected
sysDark.addEventListener('change', () => {
  if (theme.value === 'auto') applyTheme('auto')
})

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
