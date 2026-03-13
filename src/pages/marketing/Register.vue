<script setup lang="ts">
import api from '@/services/api'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { sendOtpRequest, verifyOtp, registerWithOtp, register, login } = useAuth()

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
const canSubmitOtp = computed(() => otpValue.value.length === 6)

function setOtpRef(el: any, idx: number) {
  otpInputs.value[idx] = el
}
function focusIndex(i: number) {
  const el = otpInputs.value[i]
  if (el) el.focus()
}
function handleOtpInput(e: Event, idx: number) {
  const target = e.target as HTMLInputElement
  const val = (target.value || '').replace(/\D/g, '')
  if (val.length > 1) {
    const digits = val.slice(0, 6 - idx).split('')
    digits.forEach((d, i) => (otpDigits.value[idx + i] = d))
    const next = Math.min(5, idx + digits.length)
    focusIndex(next)
  } else {
    otpDigits.value[idx] = val
    if (val && idx < 5) focusIndex(idx + 1)
  }
}
function handleOtpKeydown(e: KeyboardEvent, idx: number) {
  if (e.key === 'Backspace') {
    if (otpDigits.value[idx]) {
      otpDigits.value[idx] = ''
    } else if (idx > 0) {
      focusIndex(idx - 1)
      otpDigits.value[idx - 1] = ''
    }
    e.preventDefault()
  } else if (e.key === 'ArrowLeft' && idx > 0) {
    focusIndex(idx - 1)
    e.preventDefault()
  } else if (e.key === 'ArrowRight' && idx < 5) {
    focusIndex(idx + 1)
    e.preventDefault()
  }
}
function handleOtpPaste(e: ClipboardEvent, idx: number) {
  const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '')
  if (!text) return
  e.preventDefault()
  const digits = text.slice(0, 6 - idx).split('')
  digits.forEach((d, i) => (otpDigits.value[idx + i] = d))
  const next = Math.min(5, idx + digits.length)
  focusIndex(next)
}

async function sendOtp() {
  error.value = ''
  if (!email.value) {
    error.value = 'Please enter your email'
    return
  }
  loading.value = true
  try {
    await sendOtpRequest(email.value);
    step.value = 'otp'
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Failed to send code'
  } finally {
    loading.value = false
  }
}

async function goNextFromOtp() {
  if (!canSubmitOtp.value) {
    error.value = 'Enter the 6-digit code'
    return
  }
   loading.value = true
  try {
    const res = await verifyOtp(email.value, otpDigits.value.join(''));
    if (res.data?.success) {
      step.value = 'confirm'
    } else {
      error.value = res.data?.message || 'Invalid OTP'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Failed to send code'
  } finally {
    loading.value = false
  }
}

function goNextFromConfirm() {
  step.value = 'org'
}

function goNextFromOrg() {
  if (!organization.value) {
    error.value = 'Please enter organization name'
    return
  }
  error.value = ''
  step.value = 'plan'
}

async function complete() {
  error.value = ''

  if (!plan.value) {
    error.value = 'Please select a plan'
    return
  }

  loading.value = true
  try {
    if (password.value !== confirmPassword.value) {
      error.value = 'Passwords do not match'
      loading.value = false
      return
    }
    const code = otpValue.value

    await registerWithOtp({
      email: email.value,
      code: code,
      password: password.value,
      password_confirmation: confirmPassword.value,
      organization: organization.value,
      plan_id: plan.value,
      name: name.value,
      selected_modules: selectedModules.value,
    })

    await login({ email: email.value, password: password.value })

    router.push({ name: 'dashboard' })
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}

function loginWithGoogle() {
  window.location.href = 'http://localhost:8000/auth/redirect/google'
}
function loginWithMicrosoft() {
  window.location.href = 'http://localhost:8000/auth/redirect/microsoft'
}

onMounted(async () => {
  try {
    // Fetch modules
    const res = await fetch('http://backend.test/api/v1/modules')
    const data = await res.json()
    modules.value = Array.isArray(data) ? data : []

    // Fetch available plans
    plansLoading.value = true
    const plansRes = await api.get('/auth/plans/available')
    plans.value = plansRes.data.plans || []

    // Set first plan as default if available
    if (plans.value.length > 0) {
      // Find the most popular plan or the first one
      const popular = plans.value.find((p: any) => p.is_popular)
      plan.value = (popular?.id || plans.value[0].id).toString()
    }
  } catch (e) {
    console.error('Failed to fetch data', e);
  } finally {
    plansLoading.value = false
  }
})
</script>

<template>
  <section class="container py-16">
    <div class="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-soft">
      <h1 class="text-2xl font-bold">Create your workspace</h1>
      <p class="mt-2 text-sm text-slate-600">
        Start with a free trial. No password needed — we use a one-time code.
      </p>

      <div class="mt-6 space-y-6">
        <!-- Choose method -->
        <div v-if="step === 'choose'" class="space-y-3">
          <button @click="loginWithGoogle" class="w-full btn-ghost">
            <img src="../../assets/google.svg" alt="Google" class="h-5 w-5 mr-2" /> Continue with
            Google
          </button>
          <button @click="loginWithMicrosoft" class="w-full btn-ghost">
            <img src="../../assets/microsoft.svg" alt="Microsoft" class="h-5 w-5 mr-2" /> Continue
            with Microsoft
          </button>
          <div class="flex items-center my-4">
            <div class="flex-grow border-t border-slate-200"></div>
            <span class="mx-3 text-xs text-slate-400">or</span>
            <div class="flex-grow border-t border-slate-200"></div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Email</label>
            <input
              v-model="email"
              type="email"
              class="mt-1 w-full rounded-lg border-slate-300 px-3 py-2"
            />
          </div>
          <div v-if="error" class="text-sm text-rose-600">{{ error }}</div>
          <button @click="sendOtp" :disabled="loading" class="w-full btn-primary">
            {{ loading ? 'Sending…' : 'Continue with email' }}
          </button>
        </div>

        <!-- Enter OTP -->
        <div v-else-if="step === 'otp'" class="space-y-4">
          <p class="text-sm text-slate-600">
            Enter the 6-digit code sent to <span class="font-medium">{{ email }}</span
            >.
          </p>
          <div class="grid grid-cols-6 gap-2">
            <input
              v-for="(_, i) in 6"
              :key="i"
              :ref="(el) => setOtpRef(el, i)"
              v-model="otpDigits[i]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="h-12 w-full rounded-lg border border-slate-300 text-center text-lg tracking-widest"
              @input="(e) => handleOtpInput(e, i)"
              @keydown="(e) => handleOtpKeydown(e, i)"
              @paste="(e) => handleOtpPaste(e, i)"
            />
          </div>
          <div v-if="error" class="text-sm text-rose-600">{{ error }}</div>
          <div class="flex items-center gap-3">
            <button @click="goNextFromOtp" :disabled="!canSubmitOtp" class="btn-primary">
              Next
            </button>
            <button class="btn-ghost" @click="step = 'choose'">Change email</button>
          </div>
        </div>

        <!-- Confirm email screen -->
        <div v-else-if="step === 'confirm'" class="space-y-4">
          <div class="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <p class="text-sm text-slate-600">Signed in as</p>
              <p class="font-medium">{{ email }}</p>
              <label class="block text-sm font-medium text-slate-700">Full Name</label>
              <input
                v-model="name"
                type="text"
                class="mt-1 w-full rounded-lg border-slate-300 px-3 py-2"
              />
              <label class="block text-sm font-medium text-slate-700">Password</label>
              <input
                v-model="password"
                type="password"
                class="mt-1 w-full rounded-lg border-slate-300 px-3 py-2"
              />
              <label class="block text-sm font-medium text-slate-700">Confirm Password</label>
              <input
                v-model="confirmPassword"
                type="password"
                class="mt-1 w-full rounded-lg border-slate-300 px-3 py-2"
              />
          </div>
          <div class="flex items-center gap-3">
            <button @click="goNextFromConfirm" class="btn-primary">Next</button>
            <button class="btn-ghost" @click="step = 'otp'">Back</button>
          </div>
        </div>

        <!-- Organization name & Module selection -->
        <div v-else-if="step === 'org'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700">Organization name</label>
            <input
              v-model="organization"
              class="mt-1 w-full rounded-lg border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700">Select modules to enable</label>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label v-for="m in modules" :key="m.id" class="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  :value="m.name"
                  v-model="selectedModules"
                  :disabled="['user','role','permission','language','setting'].includes(m.name)"
                />
                <span class="capitalize">{{ m.name.replaceAll('-', ' ') }}</span>
              </label>
            </div>
            <p class="text-xs text-slate-500 mt-1">Core modules (users, roles, permissions, language, setting) are always enabled.</p>
          </div>

          <div v-if="error" class="text-sm text-rose-600">{{ error }}</div>
          <div class="flex items-center gap-3">
            <button @click="goNextFromOrg" class="btn-primary">Next</button>
            <button class="btn-ghost" @click="step = 'confirm'">Back</button>
          </div>
        </div>

        <!-- Plan selection -->
        <div v-else-if="step === 'plan'" class="space-y-4">
          <p class="text-sm text-slate-600">Choose a plan. You can change this later.</p>

          <div v-if="plansLoading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <p class="mt-2 text-sm text-slate-600">Loading plans...</p>
          </div>

          <div v-else-if="plans.length === 0" class="text-center py-8 text-slate-600">
            No plans available. Please try again later.
          </div>

          <div v-else class="grid grid-cols-1 gap-3">
            <label
              v-for="p in plans"
              :key="p.id"
              class="flex items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-slate-50 transition"
              :class="
                plan === p.id.toString() ? 'border-brand-600 ring-2 ring-brand-200 bg-brand-50' : 'border-slate-200'
              "
            >
              <input type="radio" :value="p.id.toString()" v-model="plan" class="mt-1" />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <div class="font-medium">{{ p.name }}</div>
                  <span v-if="p.is_popular" class="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded">Most Popular</span>
                </div>
                <div class="text-sm text-slate-600 mt-1">{{ p.description }}</div>
                <div class="text-sm font-semibold text-brand-600 mt-2">
                  ${{ p.price }}/{{ p.billing_cycle }}
                </div>
                <div class="text-xs text-slate-500 mt-1">
                  <span v-if="p.max_users === -1">Unlimited users</span>
                  <span v-else>Up to {{ p.max_users }} users</span>
                  <span v-if="p.trial_days > 0"> • {{ p.trial_days }} days free trial</span>
                </div>
                <div v-if="p.features_count > 0" class="text-xs text-slate-500 mt-2">
                  {{ p.features_count }} features included
                </div>
              </div>
            </label>
          </div>

          <div v-if="error" class="text-sm text-rose-600">{{ error }}</div>
          <div class="flex items-center gap-3">
            <button @click="complete" :disabled="loading || !plan" class="btn-primary disabled:opacity-50">
              {{ loading ? 'Creating…' : 'Create workspace' }}
            </button>
            <button class="btn-ghost" @click="step = 'org'">Back</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.btn-primary {
  @apply inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50;
}
.btn-ghost {
  @apply inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50;
}
</style>
