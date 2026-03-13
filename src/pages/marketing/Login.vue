<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, requestOtp, login, hasPermission, setAuth } = useAuth()

const step = ref<'choose' | 'otp'>('choose')
const email = ref('admin@orbithr.test')
const password = ref('admin')
const error = ref('')
const loading = ref(false)
const otpDigits = ref<string[]>(['', '', '', '', '', ''])
const otpInputs = ref<(HTMLInputElement | null)[]>([])
const otpValue = computed(() => otpDigits.value.join(''))
const canSubmitOtp = computed(() => otpValue.value.length === 6)

function setOtpRef(el: any, idx: number) {
  otpInputs.value[idx] = el
}
function focusIndex(i: number) {
  otpInputs.value[i]?.focus()
}
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
    if (otpDigits.value[idx]) {
      otpDigits.value[idx] = ''
    } else if (idx > 0) {
      otpDigits.value[idx - 1] = ''
      focusIndex(idx - 1)
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
  focusIndex(Math.min(5, idx + digits.length))
}

async function authenticateUser() {
  error.value = ''
  if (!email.value || !password.value) {
    error.value = 'Please enter your email and password'
    return
  }

  loading.value = true
  try {
    const res = await login({ email: email.value, password: password.value })
    if (!res) return
    setAuth(res.data.user, res.data.token)
    const target = { name: 'dashboard' }
    await router.replace(target)
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

async function sendOtp(purpose: 'login') {
  error.value = ''
  if (!email.value) {
    error.value = 'Please enter your email'
    return
  }
  loading.value = true
  try {
    await requestOtp(email.value, purpose)
    step.value = 'otp'
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Failed to send code'
  } finally {
    loading.value = false
  }
}

async function verifyOtp() {
  error.value = ''
  if (!canSubmitOtp.value) {
    error.value = 'Enter the 6-digit code'
    return
  }

  loading.value = true
  try {
    await login({ email: email.value, password: password.value })

    if (hasPermission('view_dashboard')) {
      return router.push({ name: 'dashboard' })
    }
    if (hasPermission('view_employees')) {
      return router.push({ name: 'employees' })
    }
    if (hasPermission('view_own_profile')) {
      return router.push({ name: 'employee-profile', params: { id: user.value.id } })
    }

    router.push({ name: 'dashboard' })
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Invalid or expired code'
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

onMounted(() => {
  otpDigits.value = ['', '', '', '', '', '']
})
</script>

<template>
  <section class="container py-16">
    <div class="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-soft">
      <h1 class="text-2xl font-bold">Sign in</h1>
      <p class="mt-2 text-sm text-slate-600">Use your email or continue with Google/Microsoft.</p>

      <div class="mt-6 space-y-6">
        <div v-if="step === 'choose'" class="space-y-3">
          <input v-model="email" type="email" placeholder="Email" class="w-full border p-2 rounded" />
          <input v-model="password" type="password" placeholder="Password" class="w-full border p-2 rounded" />

          <button @click="authenticateUser" class="w-full bg-blue-600 text-white p-2 rounded">
            Sign in
          </button>

          <button
            @click="loginWithGoogle"
            class="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <img src="../../assets/google.svg" alt="Google" class="h-5 w-5" />
            Sign in with Google
          </button>
          <button
            @click="loginWithMicrosoft"
            class="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <img src="../../assets/microsoft.svg" alt="Microsoft" class="h-5 w-5" />
            Sign in with Microsoft
          </button>
        </div>

        <div v-else class="space-y-3">
          <div class="flex gap-2">
            <input
              v-for="(d, i) in otpDigits"
              :key="i"
              type="text"
              maxlength="1"
              class="w-10 h-10 border text-center"
              v-model="otpDigits[i]"
              @input="handleOtpInput($event, i)"
              @keydown="handleOtpKeydown($event, i)"
              @paste="handleOtpPaste($event, i)"
              :ref="(el) => setOtpRef(el, i)"
            />
          </div>
          <button @click="verifyOtp" :disabled="!canSubmitOtp" class="w-full bg-blue-600 text-white p-2 rounded">
            Verify Code
          </button>
        </div>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>
      </div>
    </div>
  </section>
</template>
