<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

function extractError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

const route = useRoute()
const router = useRouter()

const token = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const error = ref('')
const loading = ref(false)
const showPw = ref(false)

onMounted(() => {
  token.value = String(route.query.token || '')
  email.value = String(route.query.email || '')
})

async function submit() {
  error.value = ''
  if (!password.value || !passwordConfirmation.value) {
    error.value = 'Please enter and confirm your new password'
    return
  }
  if (password.value !== passwordConfirmation.value) {
    error.value = 'Passwords do not match'
    return
  }
  loading.value = true
  try {
    await api.post('/reset-password', {
      token: token.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })
    router.push({ name: 'login', query: { reset: 'success' } })
  } catch (e: unknown) {
    error.value = extractError(e, 'Could not reset password')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="rp-page">
    <div class="rp-card">
      <div class="rp-brand">
        <div class="rp-logo-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="rp-logo-name">Orbit<span>HR</span></div>
          <div class="rp-logo-sub">HRMS Portal</div>
        </div>
      </div>

      <h1 class="rp-title">Reset Password</h1>
      <p class="rp-sub">Choose a new password for your account.</p>

      <form class="rp-form" @submit.prevent="submit">
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" readonly autocomplete="email" />
        </div>

        <div class="field">
          <label>New Password</label>
          <div class="pw-wrap">
            <input
              v-model="password"
              :type="showPw ? 'text' : 'password'"
              placeholder="••••••••"
              :class="{ error }"
              autocomplete="new-password"
            />
            <button type="button" class="pw-eye" @click="showPw = !showPw">{{ showPw ? '🙈' : '👁️' }}</button>
          </div>
        </div>

        <div class="field">
          <label>Confirm Password</label>
          <input
            v-model="passwordConfirmation"
            :type="showPw ? 'text' : 'password'"
            placeholder="••••••••"
            :class="{ error }"
            autocomplete="new-password"
          />
        </div>

        <div v-if="error" class="err-box">⚠️ {{ error }}</div>

        <button type="submit" class="btn-submit" :disabled="loading">
          <span v-if="!loading">Reset Password</span>
          <span v-else class="spin-wrap"><span class="spinner" /> Resetting…</span>
        </button>
      </form>

      <RouterLink class="back-link" :to="{ name: 'login' }">← Back to Login</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.rp-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 24px;
}
.rp-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px;
}
.rp-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
.rp-logo-mark {
  width: 38px; height: 38px;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  border-radius: 10px;
  display: grid; place-items: center;
  box-shadow: 0 0 20px rgba(79,126,255,.4);
}
.rp-logo-name { font-weight: 700; font-size: 18px; color: var(--text); }
.rp-logo-name span { color: var(--accent); }
.rp-logo-sub { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }

.rp-title { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.rp-sub { font-size: 13px; color: var(--muted); margin-bottom: 24px; }

.rp-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: var(--dim); font-weight: 500; }
.field input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color .15s;
}
.field input:focus { border-color: var(--accent); }
.field input.error { border-color: var(--red); }
.field input[readonly] { opacity: .7; cursor: not-allowed; }
.field input::placeholder { color: var(--muted); }

.pw-wrap { position: relative; }
.pw-wrap input { width: 100%; padding-right: 42px; }
.pw-eye {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; font-size: 14px; padding: 0;
}

.err-box {
  background: rgba(255,107,107,.1);
  border: 1px solid rgba(255,107,107,.2);
  border-radius: 8px;
  padding: 9px 13px;
  font-size: 12px;
  color: var(--red);
}

.btn-submit {
  width: 100%;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
  box-shadow: 0 0 20px rgba(79,126,255,.35);
}
.btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 0 28px rgba(79,126,255,.5); }
.btn-submit:disabled { opacity: .4; cursor: not-allowed; transform: none; }

.back-link {
  display: block;
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
  text-decoration: none;
  transition: color .15s;
}
.back-link:hover { color: var(--text); }

.spin-wrap { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
