<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const status = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('')

onMounted(async () => {
  const code = route.query.code as string
  const error = route.query.error as string

  if (error) {
    status.value = 'error'
    message.value = `Microsoft denied access: ${error}`
    window.opener?.postMessage({ type: 'microsoft-oauth-error', message: message.value }, '*')
    setTimeout(() => window.close(), 2000)
    return
  }

  if (!code) {
    status.value = 'error'
    message.value = 'No authorization code received.'
    window.opener?.postMessage({ type: 'microsoft-oauth-error', message: message.value }, '*')
    setTimeout(() => window.close(), 2000)
    return
  }

  try {
    const res = await api.post('/calendar/microsoft/exchange-code', { code })
    status.value = 'success'
    message.value = 'Outlook Calendar connected!'
    window.opener?.postMessage({ type: 'microsoft-oauth-success', integration: res.data?.data }, '*')
    setTimeout(() => window.close(), 1500)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    status.value = 'error'
    message.value = err.response?.data?.message ?? 'Failed to connect Outlook Calendar.'
    window.opener?.postMessage({ type: 'microsoft-oauth-error', message: message.value }, '*')
    setTimeout(() => window.close(), 2000)
  }
})
</script>

<template>
  <div style="min-height:100vh;background:#0C0E14;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;">
    <div style="background:#141720;border:1px solid #2A3050;border-radius:12px;padding:32px 40px;text-align:center;max-width:320px;width:100%;">
      <div v-if="status === 'loading'" style="color:#E8EAF0;">
        <div style="font-size:32px;margin-bottom:12px;">⏳</div>
        <p style="margin:0;font-size:14px;">Connecting Outlook Calendar…</p>
      </div>
      <div v-else-if="status === 'success'" style="color:#36D399;">
        <div style="font-size:32px;margin-bottom:12px;">✓</div>
        <p style="margin:0;font-size:14px;font-weight:600;">{{ message }}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6B7280;">This window will close automatically.</p>
      </div>
      <div v-else style="color:#FF6B6B;">
        <div style="font-size:32px;margin-bottom:12px;">✗</div>
        <p style="margin:0;font-size:14px;font-weight:600;">{{ message }}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6B7280;">This window will close automatically.</p>
      </div>
    </div>
  </div>
</template>
