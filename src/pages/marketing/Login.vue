<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, requestOtp, login, hasPermission, setAuth } = useAuth()

const step      = ref<'choose' | 'otp'>('choose')
const email     = ref('admin@orbithr.test')
const password  = ref('admin')
const error     = ref('')
const loading   = ref(false)
const showPw    = ref(false)

const otpDigits = ref<string[]>(['', '', '', '', '', ''])
const otpInputs = ref<(HTMLInputElement | null)[]>([])
const otpValue  = computed(() => otpDigits.value.join(''))
const canSubmitOtp = computed(() => otpValue.value.length === 6)

function setOtpRef(el: any, idx: number) { otpInputs.value[idx] = el }
function focusIndex(i: number) { otpInputs.value[i]?.focus() }

function handleOtpInput(e: Event, idx: number) {
  const target = e.target as HTMLInputElement
  const val = (target.value || '').replace(/\D/g, '')
  if (val.length > 1) {
    const digits = val.slice(0, 6 - idx).split('')
    digits.forEach((d, i) => (otpDigits.value[idx + i] = d))
    focusIndex(Math.min(5, idx + digits.length))
  } else {
    otpDigits.value[idx] = val
    if (val && idx < 5) focusIndex(idx + 1)
  }
}
function handleOtpKeydown(e: KeyboardEvent, idx: number) {
  if (e.key === 'Backspace') {
    if (otpDigits.value[idx]) { otpDigits.value[idx] = '' }
    else if (idx > 0) { otpDigits.value[idx - 1] = ''; focusIndex(idx - 1) }
    e.preventDefault()
  } else if (e.key === 'ArrowLeft'  && idx > 0) { focusIndex(idx - 1); e.preventDefault() }
  else if (e.key === 'ArrowRight' && idx < 5) { focusIndex(idx + 1); e.preventDefault() }
}
function handleOtpPaste(e: ClipboardEvent, idx: number) {
  const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '')
  if (!text) return
  e.preventDefault()
  const digits = text.slice(0, 6 - idx).split('')
  digits.forEach((d, i) => (otpDigits.value[idx + i] = d))
  focusIndex(Math.min(5, idx + digits.length))
}

async function authenticateUser() {
  error.value = ''
  if (!email.value || !password.value) { error.value = 'Please enter your email and password'; return }
  loading.value = true
  try {
    const res = await login({ email: email.value, password: password.value })
    if (!res) return
    setAuth(res.data.user, res.data.token)
    await router.replace({ name: 'dashboard' })
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

async function verifyOtp() {
  error.value = ''
  if (!canSubmitOtp.value) { error.value = 'Enter the 6-digit code'; return }
  loading.value = true
  try {
    await login({ email: email.value, password: password.value })
    if (hasPermission('view_dashboard'))    return router.push({ name: 'dashboard' })
    if (hasPermission('view_employees'))    return router.push({ name: 'employees' })
    if (hasPermission('view_own_profile'))  return router.push({ name: 'employee-profile', params: { id: user.value.id } })
    router.push({ name: 'dashboard' })
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Invalid or expired code'
  } finally {
    loading.value = false
  }
}

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000'

function loginWithGoogle() {
  const subdomain = window.location.hostname.split('.')[0]
  window.location.href = `${BACKEND_URL}/auth/redirect/google?subdomain=${subdomain}`
}
function loginWithMicrosoft() {
  const subdomain = window.location.hostname.split('.')[0]
  window.location.href = `${BACKEND_URL}/auth/redirect/microsoft?subdomain=${subdomain}`
}

onMounted(() => {
  otpDigits.value = ['', '', '', '', '', '']
  // Show OAuth error passed from backend callback redirect
  const params = new URLSearchParams(window.location.search)
  const oauthError = params.get('error')
  if (oauthError) {
    error.value = decodeURIComponent(oauthError)
    window.history.replaceState({}, '', window.location.pathname)
  }
})

const features = [
  { icon: '👥', t: 'Employee Management',  d: 'Full employee lifecycle management' },
  { icon: '📅', t: 'Attendance Tracking',   d: 'Real-time check-in/out with device sync' },
  { icon: '💰', t: 'Payroll Processing',    d: 'Automated payroll with payslip generation' },
  { icon: '🔍', t: 'Recruitment',           d: 'End-to-end hiring pipeline' },
]
</script>

<template>
  <div class="login-page">
    <!-- Left panel -->
    <div class="lp-left">
      <div class="lp-brand">
        <div class="lp-logo-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="lp-logo-name">Orbit<span>HR</span></div>
          <div class="lp-logo-sub">HRMS Portal</div>
        </div>
      </div>

      <div class="lp-card">
        <h1 class="lp-title">Sign In</h1>
        <p class="lp-sub">Sign in with your organization credentials</p>

        <!-- Credentials step -->
        <form v-if="step === 'choose'" class="lp-form" @submit.prevent="authenticateUser">
          <div class="field">
            <label>Email</label>
            <input v-model="email" type="email" placeholder="you@company.com" :class="{ error }" autocomplete="email" />
          </div>
          <div class="field">
            <label>Password</label>
            <div class="pw-wrap">
              <input
                v-model="password"
                :type="showPw ? 'text' : 'password'"
                placeholder="••••••••"
                :class="{ error }"
                autocomplete="current-password"
              />
              <button type="button" class="pw-eye" @click="showPw = !showPw">{{ showPw ? '🙈' : '👁️' }}</button>
            </div>
          </div>

          <div v-if="error" class="err-box">⚠️ {{ error }}</div>

          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="!loading">Sign In →</span>
            <span v-else class="spin-wrap"><span class="spinner" /> Authenticating…</span>
          </button>
        </form>

        <!-- OTP step -->
        <div v-else class="lp-form">
          <p class="lp-sub">Enter the 6-digit code sent to {{ email }}</p>
          <div class="otp-row">
            <input
              v-for="(d, i) in otpDigits"
              :key="i"
              type="text"
              maxlength="1"
              class="otp-box"
              :value="otpDigits[i]"
              @input="handleOtpInput($event, i)"
              @keydown="handleOtpKeydown($event, i)"
              @paste="handleOtpPaste($event, i)"
              :ref="(el) => setOtpRef(el, i)"
            />
          </div>
          <div v-if="error" class="err-box">⚠️ {{ error }}</div>
          <button class="btn-submit" :disabled="!canSubmitOtp || loading" @click="verifyOtp">
            <span v-if="!loading">Verify Code →</span>
            <span v-else class="spin-wrap"><span class="spinner" /> Verifying…</span>
          </button>
          <button class="back-btn" @click="step = 'choose'">← Back</button>
        </div>

        <div class="separator"><span>or</span></div>

        <div class="sso-row">
          <button class="sso-btn" @click="loginWithGoogle">
            <img src="../../assets/google.svg" alt="Google" class="sso-icon" />
            Google
          </button>
          <button class="sso-btn" @click="loginWithMicrosoft">
            <img src="../../assets/microsoft.svg" alt="Microsoft" class="sso-icon" />
            Microsoft
          </button>
        </div>
      </div>
    </div>

    <!-- Right panel -->
    <div class="lp-right">
      <div class="lr-content">
        <div class="lr-headline">One Platform.<br />Every HR Need.</div>
        <div class="lr-features">
          <div v-for="f in features" :key="f.t" class="lf-item">
            <div class="lf-icon">{{ f.icon }}</div>
            <div>
              <div class="lf-title">{{ f.t }}</div>
              <div class="lf-desc">{{ f.d }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  background: var(--bg);
}

/* ── Left panel ─────────────────────────────── */
.lp-left {
  flex: 0 0 480px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.lp-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 36px;
  align-self: flex-start;
}
.lp-logo-mark {
  width: 38px; height: 38px;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  border-radius: 10px;
  display: grid; place-items: center;
  box-shadow: 0 0 20px rgba(79,126,255,.4);
}
.lp-logo-name { font-weight: 700; font-size: 18px; color: var(--text); }
.lp-logo-name span { color: var(--accent); }
.lp-logo-sub { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }

.lp-card { width: 100%; }
.lp-title { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.lp-sub { font-size: 13px; color: var(--muted); margin-bottom: 24px; }

.lp-form { display: flex; flex-direction: column; gap: 14px; }

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

.back-btn {
  background: none; border: none; color: var(--muted); font-size: 13px;
  cursor: pointer; text-align: center; font-family: inherit; padding: 4px 0;
  transition: color .15s;
}
.back-btn:hover { color: var(--text); }

.otp-row { display: flex; gap: 8px; }
.otp-box {
  flex: 1; height: 48px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  text-align: center;
  font-size: 20px; font-weight: 600; color: var(--text);
  outline: none; transition: border-color .15s;
}
.otp-box:focus { border-color: var(--accent); }

.spin-wrap { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.separator { display: flex; align-items: center; gap: 12px; margin: 20px 0 16px; }
.separator::before, .separator::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.separator span { font-size: 11px; color: var(--muted); }

.sso-row { display: flex; gap: 10px; }
.sso-btn {
  flex: 1;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px;
  background: var(--surface2);
  border: 1px solid var(--border-hi);
  border-radius: 10px;
  font-size: 13px; font-weight: 500; color: var(--dim);
  cursor: pointer; transition: all .14s; font-family: inherit;
}
.sso-btn:hover { background: var(--surface3); color: var(--text); border-color: var(--accent); }
.sso-icon { width: 18px; height: 18px; object-fit: contain; }

/* ── Right panel ────────────────────────────── */
.lp-right {
  flex: 1;
  background: linear-gradient(135deg, #060810 0%, #0C0E1A 100%);
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.lp-right::before {
  content: ''; position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(79,126,255,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79,126,255,.05) 1px, transparent 1px);
  background-size: 40px 40px;
}
.lr-content { position: relative; z-index: 1; padding: 60px; max-width: 440px; }
.lr-headline { font-size: 40px; font-weight: 800; line-height: 1.2; color: var(--text); margin-bottom: 40px; }
.lr-features { display: flex; flex-direction: column; gap: 22px; }
.lf-item { display: flex; align-items: flex-start; gap: 14px; }
.lf-icon {
  width: 40px; height: 40px;
  background: rgba(79,126,255,.12);
  border-radius: 10px;
  display: grid; place-items: center;
  font-size: 18px; flex-shrink: 0;
}
.lf-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
.lf-desc { font-size: 12px; color: var(--muted); }

@media (max-width: 800px) {
  .lp-right { display: none; }
  .lp-left { flex: 1; padding: 24px; }
}
</style>
