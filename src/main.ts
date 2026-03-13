import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initIdleLogout } from '@/utils/idle'
import { useAuth } from '@/composables/useAuth'

const app = createApp(App)
app.use(router)

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
