<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/services/api'

function extractError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

const email = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  success.value = ''
  if (!email.value) {
    error.value = 'Please enter your email address'
    return
  }
  loading.value = true
  try {
    await api.post('/forgot-password', { email: email.value })
    success.value = 'Check your email for a reset link.'
  } catch (e: unknown) {
    error.value = extractError(e, 'Could not send reset link')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fp-page">
    <div class="fp-card">
      <div class="fp-brand">
        <div class="fp-logo-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="fp-logo-name">Orbit<span>HR</span></div>
          <div class="fp-logo-sub">HRMS Portal</div>
        </div>
      </div>

      <h1 class="fp-title">Forgot Password</h1>
      <p class="fp-sub">Enter your email and we'll send you a reset link.</p>

      <form class="fp-form" @submit.prevent="submit">
        <div class="field">
          <label>Email</label>
          <input
            v-model="email"
            type="email"
            placeholder="you@company.com"
            :class="{ error }"
            autocomplete="email"
          />
        </div>

        <div v-if="error" class="err-box">⚠️ {{ error }}</div>
        <div v-if="success" class="ok-box">✅ {{ success }}</div>

        <button type="submit" class="btn-submit" :disabled="loading">
          <span v-if="!loading">Send Reset Link</span>
          <span v-else class="spin-wrap"><span class="spinner" /> Sending…</span>
        </button>
      </form>

      <RouterLink class="back-link" :to="{ name: 'login' }">← Back to Login</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.fp-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 24px;
}
.fp-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px;
}
.fp-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
.fp-logo-mark {
  width: 38px; height: 38px;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  border-radius: 10px;
  display: grid; place-items: center;
  box-shadow: 0 0 20px rgba(79,126,255,.4);
}
.fp-logo-name { font-weight: 700; font-size: 18px; color: var(--text); }
.fp-logo-name span { color: var(--accent); }
.fp-logo-sub { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }

.fp-title { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.fp-sub { font-size: 13px; color: var(--muted); margin-bottom: 24px; }

.fp-form { display: flex; flex-direction: column; gap: 14px; }
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
.field input::placeholder { color: var(--muted); }

.err-box {
  background: rgba(255,107,107,.1);
  border: 1px solid rgba(255,107,107,.2);
  border-radius: 8px;
  padding: 9px 13px;
  font-size: 12px;
  color: var(--red);
}
.ok-box {
  background: rgba(54,211,153,.1);
  border: 1px solid rgba(54,211,153,.2);
  border-radius: 8px;
  padding: 9px 13px;
  font-size: 12px;
  color: var(--green);
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
