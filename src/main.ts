import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initIdleLogout } from '@/utils/idle'
import { useAuth } from '@/composables/useAuth'
import { useThemeStore } from '@/stores/theme'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Initialize theme (reads persisted preference, applies `dark` class to <html>)
useThemeStore().init()

// Sync frontend with backend session expiry and inactivity
const { logout } = useAuth()
window.addEventListener('auth:unauthorized', () => {
  logout()
  router.push({ name: 'login', query: { reason: 'session_expired' } })
})
window.addEventListener('auth:idle-logout', () => {
  logout()
  router.push({ name: 'login', query: { reason: 'idle_timeout' } })
})

initIdleLogout(15)

app.mount('#app')
