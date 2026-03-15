<script setup lang="ts">
import api from '@/services/api'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { sendOtpRequest, verifyOtp, registerWithOtp, register, login, setAuth } = useAuth()

// Social OAuth state (populated from URL when redirected back from backend)
const socialToken    = ref('')
const socialEmail    = ref('')
const socialName     = ref('')
const socialProvider = ref('')
const isSocialFlow   = computed(() => !!socialToken.value)

const step = ref<'choose' | 'otp' | 'confirm' | 'org' | 'plan'>('choose')
const email = ref('')
const name = ref('')
const password = ref('')
const confirmPassword = ref('')
const organization = ref('')
const plan = ref<string>('')
const modules = ref<{ id: number; name: string }[]>([])
const selectedModules = ref<string[]>([])
const plans = ref<any[]>([])
const otpDigits = ref<string[]>(['', '', '', '', '', ''])
const otpInputs = ref<(HTMLInputElement | null)[]>([])
const otpValue = computed(() => otpDigits.value.join(''))
const loading = ref(false)
const error = ref('')
const plansLoading = ref(false)
const showPw = ref(false)
const showCpw = ref(false)
const canSubmitOtp = computed(() => otpValue.value.length === 6)

const stepLabels = ['Email', 'Verify', 'Details', 'Workspace', 'Plan']
const stepIndex = computed(() => {
  if (isSocialFlow.value) {
    // In social flow, first 3 steps are pre-completed by OAuth
    return ({ org: 3, plan: 4 } as Record<string, number>)[step.value] ?? 3
  }
  return ({ choose: 0, otp: 1, confirm: 2, org: 3, plan: 4 } as Record<string, number>)[step.value] ?? 0
})

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
  } else if (e.key === 'ArrowLeft' && idx > 0) { focusIndex(idx - 1); e.preventDefault() }
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

async function sendOtp() {
  error.value = ''
  if (!email.value) { error.value = 'Please enter your email'; return }
  loading.value = true
  try {
    await sendOtpRequest(email.value)
    step.value = 'otp'
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Failed to send code'
  } finally { loading.value = false }
}

async function goNextFromOtp() {
  if (!canSubmitOtp.value) { error.value = 'Enter the 6-digit code'; return }
  loading.value = true
  try {
    const res = await verifyOtp(email.value, otpDigits.value.join(''))
    if (res.data?.success) { step.value = 'confirm' }
    else { error.value = res.data?.message || 'Invalid OTP' }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Verification failed'
  } finally { loading.value = false }
}

function goNextFromConfirm() {
  error.value = ''
  if (!name.value) { error.value = 'Please enter your name'; return }
  if (!password.value || password.value.length < 8) { error.value = 'Password must be at least 8 characters'; return }
  if (password.value !== confirmPassword.value) { error.value = 'Passwords do not match'; return }
  step.value = 'org'
}

function goNextFromOrg() {
  if (!organization.value) { error.value = 'Please enter organization name'; return }
  error.value = ''
  step.value = 'plan'
}

async function complete() {
  error.value = ''
  if (!plan.value) { error.value = 'Please select a plan'; return }
  loading.value = true
  try {
    if (isSocialFlow.value) {
      // Social registration — no OTP or password needed
      const res = await api.post('/auth/social/register', {
        social_token: socialToken.value,
        organization: organization.value,
        plan_id: plan.value,
      })
      const { token: t, user: u } = res.data
      setAuth(u, t)
    } else {
      // Normal OTP registration
      await registerWithOtp({
        email: email.value,
        code: otpValue.value,
        password: password.value,
        password_confirmation: confirmPassword.value,
        organization: organization.value,
        plan_id: plan.value,
        name: name.value,
        selected_modules: selectedModules.value,
      })
      await login({ email: email.value, password: password.value })
    }
    router.push({ name: 'dashboard' })
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Registration failed'
  } finally { loading.value = false }
}

const BACKEND_URL = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:8000'

function loginWithGoogle() {
  window.location.href = `${BACKEND_URL}/auth/redirect/google?action=register`
}
function loginWithMicrosoft() {
  window.location.href = `${BACKEND_URL}/auth/redirect/microsoft?action=register`
}

onMounted(async () => {
  // Handle social OAuth redirect: ?social_token=...&social_email=...&social_name=...
  const params = new URLSearchParams(window.location.search)
  const st = params.get('social_token')
  if (st) {
    socialToken.value    = st
    socialEmail.value    = params.get('social_email') || ''
    socialName.value     = params.get('social_name') || ''
    socialProvider.value = params.get('social_provider') || ''
    email.value          = socialEmail.value
    name.value           = socialName.value
    step.value           = 'org'
    // Clean URL params
    window.history.replaceState({}, '', window.location.pathname)
  }

  // Fetch modules independently — don't let it block plan loading
  fetch('http://backend.test/api/v1/modules')
    .then(r => r.json())
    .then(data => { modules.value = Array.isArray(data) ? data : [] })
    .catch(() => {})

  // Fetch plans
  plansLoading.value = true
  try {
    const plansRes = await api.get('/auth/plans/available')
    plans.value = plansRes.data.plans || plansRes.data || []
    if (plans.value.length > 0) {
      const popular = plans.value.find((p: any) => p.is_popular)
      plan.value = (popular?.id || plans.value[0].id).toString()
    }
  } catch (e) {
    console.error('Failed to fetch plans', e)
  } finally { plansLoading.value = false }
})
</script>

<template>
  <div class="rg-page">
    <!-- Left panel -->
    <div class="rg-left">
      <!-- Brand -->
      <div class="rg-brand">
        <div class="rg-logo-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="rg-logo-name">Orbit<span>HR</span></div>
          <div class="rg-logo-sub">Create workspace</div>
        </div>
      </div>

      <!-- Progress steps -->
      <div class="rg-steps">
        <div
          v-for="(label, i) in stepLabels"
          :key="label"
          class="rg-step"
          :class="{ active: i === stepIndex, done: i < stepIndex }"
        >
          <div class="rg-step-dot">
            <svg v-if="i < stepIndex" width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="rg-step-label">{{ label }}</span>
        </div>
      </div>

      <div class="rg-card">
        <!-- Step 1: Email -->
        <template v-if="step === 'choose'">
          <h1 class="rg-title">Get started free</h1>
          <p class="rg-sub">Start with a 14-day free trial. No credit card required.</p>

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

          <div class="separator"><span>or continue with email</span></div>

          <form @submit.prevent="sendOtp" class="rg-form">
            <div class="field">
              <label>Work email</label>
              <input v-model="email" type="email" placeholder="you@company.com" autocomplete="email" />
            </div>
            <div v-if="error" class="err-box">⚠️ {{ error }}</div>
            <button type="submit" class="btn-submit" :disabled="loading">
              <span v-if="!loading">Continue →</span>
              <span v-else class="spin-wrap"><span class="spinner" /> Sending code…</span>
            </button>
          </form>

          <p class="rg-signin">Already have an account? <RouterLink to="/login">Sign in</RouterLink></p>
        </template>

        <!-- Step 2: OTP -->
        <template v-else-if="step === 'otp'">
          <h1 class="rg-title">Check your email</h1>
          <p class="rg-sub">We sent a 6-digit code to <strong>{{ email }}</strong></p>
          <div class="rg-form">
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
            <p class="otp-hint">Didn't get it? Check your spam folder or <button class="link-btn" @click="sendOtp">resend code</button>.</p>
            <div v-if="error" class="err-box">⚠️ {{ error }}</div>
            <button class="btn-submit" :disabled="!canSubmitOtp || loading" @click="goNextFromOtp">
              <span v-if="!loading">Verify code →</span>
              <span v-else class="spin-wrap"><span class="spinner" /> Verifying…</span>
            </button>
            <button class="back-btn" @click="step = 'choose'">← Change email</button>
          </div>
        </template>

        <!-- Step 3: Name + Password -->
        <template v-else-if="step === 'confirm'">
          <h1 class="rg-title">Create your account</h1>
          <p class="rg-sub">Verified as <strong>{{ email }}</strong></p>
          <div class="rg-form">
            <div class="field">
              <label>Full name</label>
              <input v-model="name" type="text" placeholder="Jane Smith" autocomplete="name" />
            </div>
            <div class="field">
              <label>Password</label>
              <div class="pw-wrap">
                <input v-model="password" :type="showPw ? 'text' : 'password'" placeholder="Min. 8 characters" autocomplete="new-password" />
                <button type="button" class="pw-eye" @click="showPw = !showPw">{{ showPw ? '🙈' : '👁️' }}</button>
              </div>
            </div>
            <div class="field">
              <label>Confirm password</label>
              <div class="pw-wrap">
                <input v-model="confirmPassword" :type="showCpw ? 'text' : 'password'" placeholder="Repeat password" autocomplete="new-password" />
                <button type="button" class="pw-eye" @click="showCpw = !showCpw">{{ showCpw ? '🙈' : '👁️' }}</button>
              </div>
            </div>
            <div v-if="error" class="err-box">⚠️ {{ error }}</div>
            <div class="btn-row">
              <button class="btn-submit" @click="goNextFromConfirm">Next →</button>
              <button class="back-btn" @click="step = 'otp'">← Back</button>
            </div>
          </div>
        </template>

        <!-- Step 4: Organization + Modules -->
        <template v-else-if="step === 'org'">
          <h1 class="rg-title">Your workspace</h1>
          <p class="rg-sub">What's the name of your company or team?</p>

          <!-- Social flow: show which account was used -->
          <div v-if="isSocialFlow" class="social-badge">
            <img
              :src="socialProvider === 'google' ? '/src/assets/google.svg' : '/src/assets/microsoft.svg'"
              :alt="socialProvider"
              class="social-badge-icon"
            />
            <span>Signed in as <strong>{{ socialEmail }}</strong> via {{ socialProvider === 'google' ? 'Google' : 'Microsoft' }}</span>
          </div>
          <div class="rg-form">
            <div class="field">
              <label>Organization name</label>
              <input v-model="organization" type="text" placeholder="Acme Corp" />
            </div>

            <div v-if="modules.length > 0" class="field">
              <label>Enable modules</label>
              <div class="modules-grid">
                <label
                  v-for="m in modules"
                  :key="m.id"
                  class="module-item"
                  :class="{ disabled: ['user','role','permission','language','setting'].includes(m.name) }"
                >
                  <input
                    type="checkbox"
                    :value="m.name"
                    v-model="selectedModules"
                    :disabled="['user','role','permission','language','setting'].includes(m.name)"
                    class="mod-check"
                  />
                  <span class="mod-name">{{ m.name.replaceAll('-', ' ') }}</span>
                </label>
              </div>
              <p class="field-hint">Core modules (users, roles, permissions) are always enabled.</p>
            </div>

            <div v-if="error" class="err-box">⚠️ {{ error }}</div>
            <div class="btn-row">
              <button class="btn-submit" @click="goNextFromOrg">Next →</button>
              <button v-if="!isSocialFlow" class="back-btn" @click="step = 'confirm'">← Back</button>
            </div>
          </div>
        </template>

        <!-- Step 5: Plan -->
        <template v-else-if="step === 'plan'">
          <h1 class="rg-title">Choose a plan</h1>
          <p class="rg-sub">Start free for 14 days. Change anytime.</p>

          <div v-if="plansLoading" class="loading-plans">
            <span class="spinner spinner-lg" />
            <span>Loading plans…</span>
          </div>
          <div v-else-if="plans.length === 0" class="empty-plans">No plans available. Try again later.</div>
          <div v-else class="plans-list">
            <label
              v-for="p in plans"
              :key="p.id"
              class="plan-option"
              :class="{ selected: plan === p.id.toString() }"
            >
              <input type="radio" :value="p.id.toString()" v-model="plan" class="plan-radio" />
              <div class="plan-info">
                <div class="plan-top">
                  <span class="plan-name">{{ p.name }}</span>
                  <span v-if="p.is_popular" class="pop-tag">Most popular</span>
                </div>
                <div class="plan-desc">{{ p.description }}</div>
                <div class="plan-price">${{ p.price }}<span class="plan-period">/{{ p.billing_cycle }}</span></div>
                <div class="plan-meta">
                  <span v-if="p.max_users === -1">Unlimited users</span>
                  <span v-else>Up to {{ p.max_users }} users</span>
                  <span v-if="p.trial_days > 0"> · {{ p.trial_days }}-day free trial</span>
                </div>
              </div>
            </label>
          </div>

          <div v-if="error" class="err-box">⚠️ {{ error }}</div>
          <div class="btn-row">
            <button class="btn-submit" :disabled="loading || !plan" @click="complete">
              <span v-if="!loading">Create workspace →</span>
              <span v-else class="spin-wrap"><span class="spinner" /> Creating…</span>
            </button>
            <button class="back-btn" @click="step = 'org'">← Back</button>
          </div>
        </template>
      </div>
    </div>

    <!-- Right panel -->
    <div class="rg-right">
      <div class="rr-content">
        <div class="rr-headline">Launch your<br />HR command center</div>
        <div class="rr-desc">Everything you need to run HR — from hire to retire. Start in minutes, scale to thousands.</div>
        <div class="rr-perks">
          <div v-for="p in [
            { icon: '⚡', t: 'Set up in minutes', d: 'Import employees, configure modules and go live fast.' },
            { icon: '🔒', t: 'Enterprise security', d: 'JWT auth, role-based access, full audit trail.' },
            { icon: '💳', t: 'No credit card needed', d: '14-day free trial on every plan. Cancel anytime.' },
            { icon: '🌍', t: 'Multi-tenant ready', d: 'Custom subdomain, branded portal for your team.' },
          ]" :key="p.t" class="rr-perk">
            <div class="rr-perk-icon">{{ p.icon }}</div>
            <div>
              <div class="rr-perk-title">{{ p.t }}</div>
              <div class="rr-perk-desc">{{ p.d }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rg-page {
  min-height: 100vh;
  display: flex;
  background: #0C0E14;
}

/* ── Left panel ─────────────────────────────── */
.rg-left {
  flex: 0 0 520px;
  background: #0D0F1A;
  border-right: 1px solid rgba(79,126,255,.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 48px 40px;
  gap: 24px;
  overflow-y: auto;
  min-height: 100vh;
}

.rg-brand {
  display: flex; align-items: center; gap: 12px;
  align-self: flex-start;
}
.rg-logo-mark {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  display: grid; place-items: center;
  box-shadow: 0 0 20px rgba(79,126,255,.4);
}
.rg-logo-name { font-weight: 800; font-size: 18px; color: #E8EAF0; }
.rg-logo-name span { color: #4F7EFF; }
.rg-logo-sub { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; }

/* Steps */
.rg-steps {
  display: flex;
  gap: 0;
  align-self: flex-start;
  align-items: center;
}
.rg-step {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}
.rg-step:not(:last-child)::after {
  content: '';
  width: 28px;
  height: 1px;
  background: rgba(255,255,255,.1);
  margin: 0 4px;
}
.rg-step.done:not(:last-child)::after { background: rgba(79,126,255,.4); }
.rg-step-dot {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.12);
  display: grid; place-items: center;
  font-size: 10px; font-weight: 700; color: #6B7280;
  flex-shrink: 0;
  transition: all .2s;
}
.rg-step.active .rg-step-dot {
  background: #4F7EFF;
  border-color: #4F7EFF;
  color: #fff;
  box-shadow: 0 0 12px rgba(79,126,255,.5);
}
.rg-step.done .rg-step-dot {
  background: rgba(54,211,153,.15);
  border-color: #36D399;
  color: #36D399;
}
.rg-step-label {
  font-size: 10px; font-weight: 600; color: #6B7280;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.rg-step.active .rg-step-label { color: #4F7EFF; }
.rg-step.done .rg-step-label { color: #36D399; }

/* Card */
.rg-card { width: 100%; }
.rg-title { font-size: 22px; font-weight: 700; color: #E8EAF0; margin-bottom: 6px; }
.rg-sub { font-size: 13px; color: #6B7280; margin-bottom: 22px; }
.rg-sub strong { color: #9CA3AF; }

/* SSO */
.sso-row { display: flex; gap: 10px; margin-bottom: 4px; }
.sso-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px; background: #131520; border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px; font-size: 13px; font-weight: 500; color: #9CA3AF;
  cursor: pointer; transition: all .14s; font-family: inherit;
}
.sso-btn:hover { background: #1C2030; color: #E8EAF0; border-color: #4F7EFF; }
.sso-icon { width: 18px; height: 18px; object-fit: contain; }

/* Separator */
.separator { display: flex; align-items: center; gap: 12px; margin: 18px 0; }
.separator::before, .separator::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.07); }
.separator span { font-size: 11px; color: #6B7280; white-space: nowrap; }

/* Form */
.rg-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: #9CA3AF; font-weight: 600; }
.field input {
  background: #131520; border: 1px solid rgba(255,255,255,.08);
  border-radius: 10px; padding: 11px 14px;
  color: #E8EAF0; font-size: 14px; font-family: inherit; outline: none; transition: border-color .15s;
}
.field input:focus { border-color: #4F7EFF; }
.field input::placeholder { color: #6B7280; }
.field-hint { font-size: 11px; color: #6B7280; margin-top: 6px; }

.pw-wrap { position: relative; }
.pw-wrap input { width: 100%; padding-right: 42px; }
.pw-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 14px; padding: 0; }

/* OTP */
.otp-row { display: flex; gap: 8px; }
.otp-box {
  width: 44px; height: 44px; flex-shrink: 0;
  background: #131520; border: 1px solid rgba(255,255,255,.1);
  border-radius: 10px; text-align: center;
  font-size: 18px; font-weight: 600; color: #E8EAF0;
  outline: none; transition: border-color .15s;
}
.otp-box:focus { border-color: #4F7EFF; }

/* Error */
.err-box {
  background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.2);
  border-radius: 8px; padding: 9px 13px; font-size: 12px; color: #FF6B6B;
}

/* Buttons */
.btn-submit {
  width: 100%; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600;
  font-family: inherit; cursor: pointer; border: none; transition: all .15s;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  color: #fff; box-shadow: 0 0 20px rgba(79,126,255,.35);
}
.btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 0 28px rgba(79,126,255,.5); }
.btn-submit:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.back-btn {
  background: none; border: none; color: #6B7280; font-size: 13px;
  cursor: pointer; font-family: inherit; padding: 4px 0; transition: color .15s;
}
.back-btn:hover { color: #E8EAF0; }
.btn-row { display: flex; align-items: center; gap: 16px; }

/* Spinner */
.spin-wrap { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spinner {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite; display: inline-block;
}
.spinner-lg { width: 20px; height: 20px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Modules grid */
.modules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
.module-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 8px;
  background: #131520; border: 1px solid rgba(255,255,255,.07);
  cursor: pointer; transition: border-color .15s;
  font-size: 12px; color: #9CA3AF; text-transform: capitalize;
}
.module-item:hover:not(.disabled) { border-color: rgba(79,126,255,.3); color: #E8EAF0; }
.module-item.disabled { opacity: .45; cursor: not-allowed; }
.mod-check { accent-color: #4F7EFF; }
.mod-name { font-size: 12px; }

/* Plans list */
.plans-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 4px; }
.plan-option {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 16px; border-radius: 12px;
  background: #131520; border: 1px solid rgba(255,255,255,.08);
  cursor: pointer; transition: border-color .15s;
}
.plan-option.selected { border-color: #4F7EFF; background: rgba(79,126,255,.06); }
.plan-option:hover:not(.selected) { border-color: rgba(79,126,255,.3); }
.plan-radio { accent-color: #4F7EFF; margin-top: 3px; flex-shrink: 0; }
.plan-info { flex: 1; }
.plan-top { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.plan-name { font-size: 14px; font-weight: 600; color: #E8EAF0; }
.pop-tag {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
  background: rgba(79,126,255,.15); color: #4F7EFF;
}
.plan-desc { font-size: 12px; color: #6B7280; margin-bottom: 6px; }
.plan-price { font-size: 18px; font-weight: 700; color: #E8EAF0; }
.plan-period { font-size: 12px; font-weight: 400; color: #6B7280; }
.plan-meta { font-size: 11px; color: #6B7280; margin-top: 4px; }

.loading-plans { display: flex; align-items: center; gap: 10px; color: #6B7280; font-size: 13px; padding: 20px 0; }
.empty-plans { color: #6B7280; font-size: 13px; padding: 20px 0; }

/* OTP hint */
.otp-hint { font-size: 12px; color: #6B7280; }
.link-btn {
  background: none; border: none; padding: 0;
  color: #4F7EFF; font-size: 12px; font-family: inherit;
  cursor: pointer; text-decoration: underline;
}

/* Sign in link */
.rg-signin { font-size: 13px; color: #6B7280; margin-top: 16px; text-align: center; }
.rg-signin a { color: #4F7EFF; text-decoration: none; font-weight: 500; }
.rg-signin a:hover { text-decoration: underline; }

/* ── Right panel ─────────────────────────────── */
.rg-right {
  flex: 1;
  background: linear-gradient(135deg, #04050C 0%, #080B18 100%);
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.rg-right::before {
  content: ''; position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(79,126,255,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(79,126,255,.05) 1px, transparent 1px);
  background-size: 40px 40px;
}
.rr-content { position: relative; z-index: 1; padding: 60px; max-width: 440px; }
.rr-headline { font-size: 38px; font-weight: 800; line-height: 1.2; color: #E8EAF0; margin-bottom: 16px; letter-spacing: -1px; }
.rr-desc { font-size: 14px; color: #6B7280; line-height: 1.65; margin-bottom: 40px; }
.rr-perks { display: flex; flex-direction: column; gap: 22px; }
.rr-perk { display: flex; align-items: flex-start; gap: 14px; }
.rr-perk-icon {
  width: 40px; height: 40px; border-radius: 10px;
  background: rgba(79,126,255,.1); border: 1px solid rgba(79,126,255,.15);
  display: grid; place-items: center; font-size: 18px; flex-shrink: 0;
}
.rr-perk-title { font-size: 14px; font-weight: 600; color: #E8EAF0; margin-bottom: 3px; }
.rr-perk-desc { font-size: 12px; color: #6B7280; line-height: 1.55; }

/* Social provider badge shown on org step */
.social-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: rgba(79,126,255,.08);
  border: 1px solid rgba(79,126,255,.2);
  border-radius: 10px;
  font-size: 12px;
  color: #9CA3AF;
  margin-bottom: 6px;
}
.social-badge strong { color: #E8EAF0; }
.social-badge-icon { width: 16px; height: 16px; object-fit: contain; flex-shrink: 0; }

@media (max-width: 900px) {
  .rg-right { display: none; }
  .rg-left { flex: 1; padding: 28px 24px; }
  .rg-steps { flex-wrap: wrap; gap: 6px; }
  .rg-step:not(:last-child)::after { display: none; }
}
</style>
