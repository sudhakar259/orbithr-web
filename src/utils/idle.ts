let idleTimer: number | null = null
let started = false

const ACTIVITY_EVENTS = ['mousemove','mousedown','keydown','scroll','touchstart','click'] as const

function resetTimer(timeoutMs: number) {
  if (idleTimer) window.clearTimeout(idleTimer)
  idleTimer = window.setTimeout(() => {
    try {
      window.dispatchEvent(new CustomEvent('auth:idle-logout'))
    } catch {}
  }, timeoutMs)
}

export function initIdleLogout(timeoutMinutes = 5) {
  if (started) return
  started = true
  const timeoutMs = timeoutMinutes * 60 * 1000
  const handler = () => resetTimer(timeoutMs)
  ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, handler, { passive: true }))
  resetTimer(timeoutMs)
  return () => {
    ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, handler))
    if (idleTimer) window.clearTimeout(idleTimer)
    started = false
  }
}
