<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { setAuth } = useAuth()
const errorMsg = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const encodedUser = params.get('u')
  const error = params.get('error')

  if (error) {
    errorMsg.value = decodeURIComponent(error)
    setTimeout(() => router.replace({ name: 'login' }), 3000)
    return
  }

  if (!token || !encodedUser) {
    router.replace({ name: 'login' })
    return
  }

  try {
    const user = JSON.parse(atob(decodeURIComponent(encodedUser)))
    setAuth(user, decodeURIComponent(token))
    router.replace({ name: 'dashboard' })
  } catch {
    router.replace({ name: 'login' })
  }
})
</script>

<template>
  <div class="oauth-page">
    <div v-if="errorMsg" class="oauth-error">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#FF6B6B" stroke-width="1.5"/>
        <path d="M12 8v4M12 16h.01" stroke="#FF6B6B" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <p>{{ errorMsg }}</p>
      <span class="redirect-hint">Redirecting to login…</span>
    </div>
    <div v-else class="oauth-loading">
      <div class="logo-mark">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="spinner"></div>
      <p>Signing you in…</p>
    </div>
  </div>
</template>

<style scoped>
.oauth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0C0E14;
}

.oauth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.logo-mark {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  border-radius: 14px;
  display: grid; place-items: center;
  box-shadow: 0 0 24px rgba(79,126,255,.4);
}

.spinner {
  width: 28px; height: 28px;
  border: 2.5px solid rgba(79,126,255,.2);
  border-top-color: #4F7EFF;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.oauth-loading p {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
}

.oauth-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  max-width: 320px;
}

.oauth-error p {
  font-size: 14px;
  color: #FF6B6B;
  margin: 0;
}

.redirect-hint {
  font-size: 12px;
  color: #6B7280;
}
</style>
