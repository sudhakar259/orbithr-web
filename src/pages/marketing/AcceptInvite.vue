<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/services/api'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { login } = useAuth()

const token = ref((route.query.token as string) || '')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function accept() {
  if (!token.value || !password.value) return (error.value = 'Missing token or password')
  loading.value = true
  try {
    const res = await api.post('/invitations/accept', {
      token: token.value,
      password: password.value,
    })
    // backend returns { token, user }
    const { token: t } = res.data
    // log the user in by setting token and fetching user
    // Use auth login by posting to auth/login? Assume backend returns token and user on accept
    // We'll set token directly by calling login endpoint if user credentials known; otherwise use returned token
    // If response contains user and token
    if (res.data.token && res.data.user) {
      // store via useAuth
      await login({ email: res.data.user.email, password: password.value }).catch(() => {})
    } else if (res.data.token) {
      // directly set token header
      localStorage.setItem('orbithr_token', res.data.token)
      if (res.data.user) localStorage.setItem('orbithr_user', JSON.stringify(res.data.user))
      // navigate to dashboard
      router.push({ name: 'dashboard' })
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Failed to accept invite'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!token.value) token.value = ''
})
</script>

<template>
  <section class="container py-16">
    <div class="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-soft">
      <h1 class="text-2xl font-bold">Accept invite</h1>
      <p class="mt-2 text-sm text-slate-600">Set a password to join the workspace.</p>

      <div class="mt-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700">Invite token</label>
          <input v-model="token" class="mt-1 w-full rounded-lg border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700">Choose password</label>
          <input
            v-model="password"
            type="password"
            class="mt-1 w-full rounded-lg border-slate-300 px-3 py-2"
          />
        </div>

        <div v-if="error" class="text-sm text-rose-600">{{ error }}</div>

        <div class="mt-4 flex items-center gap-3">
          <button
            @click="accept"
            :disabled="loading"
            class="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {{ loading ? 'Accepting...' : 'Accept invite' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
