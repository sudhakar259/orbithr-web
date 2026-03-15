<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import api from '@/services/api'

const router = useRouter()
const { setAuth, roles } = useAuth()

const email    = ref('superadmin@orbithr.test')
const password = ref('')
const error    = ref('')
const loading  = ref(false)
const showPw   = ref(false)

async function doLogin() {
  error.value = ''
  if (!email.value || !password.value) { error.value = 'Please enter your credentials.'; return }
  loading.value = true
  try {
    // Call login directly without X-Tenant-Domain header — super admin lives on the main domain,
    // not a tenant subdomain, so the shared login() composable's tenant header would cause a redirect.
    const res = await api.post('auth/login', { email: email.value, password: password.value })
    const { token, user } = res.data
    if (!token || !user) { error.value = 'Unexpected response from server.'; return }
    setAuth(user, token)
    const userRoles = roles().map((r: string) => r.toLowerCase())
    if (userRoles.includes('super admin')) {
      router.push('/super/dashboard')
    } else {
      // Clear the auth we just set — not a super admin
      setAuth(null, '')
      error.value = 'Access denied. Super admin credentials required.'
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Login failed. Check your credentials.'
  } finally {
    loading.value = false
  }
}

const stats = [
  { v: '5+', l: 'Active Tenants' },
  { v: '500+', l: 'Total Employees' },
  { v: '99.9%', l: 'Uptime' },
  { v: '24/7', l: 'Support' },
]
</script>

<template>
  <div class="sa-login">
    <!-- Left panel -->
    <div class="sa-left">
      <div class="sa-brand">
        <div class="sa-logo-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <div class="sa-logo-name">Orbit<span>HR</span></div>
          <div class="sa-logo-sub">Super Admin Portal</div>
        </div>
      </div>

      <div class="sa-card">
        <h1 class="sa-title">Administrator Access</h1>
        <p class="sa-sub">Sign in with your super admin credentials</p>

        <form class="sa-form" @submit.prevent="doLogin">
          <div class="field">
            <label>Email</label>
            <input v-model="email" type="email" placeholder="superadmin@orbithr.test" autocomplete="email" />
          </div>
          <div class="field">
            <label>Password</label>
            <div class="pw-wrap">
              <input
                v-model="password"
                :type="showPw ? 'text' : 'password'"
                placeholder="••••••••"
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

        <div class="separator"><span>or</span></div>
        <RouterLink to="/login" class="back-link">← Back to Tenant Login</RouterLink>
      </div>
    </div>

    <!-- Right panel -->
    <div class="sa-right">
      <div class="sr-content">
        <div class="sr-headline">Platform<br />Command Center</div>
        <div class="sr-desc">Full visibility and control over all tenants, billing, modules, and platform health.</div>
        <div class="sr-stats">
          <div v-for="s in stats" :key="s.l" class="stat-item">
            <div class="stat-v">{{ s.v }}</div>
            <div class="stat-l">{{ s.l }}</div>
          </div>
        </div>
        <div class="sa-env-badge">🔴 Production Environment</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sa-login { min-height: 100vh; display: flex; background: var(--bg); }

/* ── Left panel ─── */
.sa-left {
  flex: 0 0 480px;
  background: #0D0F1A;
  border-right: 1px solid rgba(79,126,255,.12);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px;
}
.sa-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 36px; align-self: flex-start; }
.sa-logo-mark {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  display: grid; place-items: center;
  box-shadow: 0 0 20px rgba(79,126,255,.4);
}
.sa-logo-name { font-weight: 800; font-size: 18px; color: #E8EAF0; }
.sa-logo-name span { color: #4F7EFF; }
.sa-logo-sub { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; }

.sa-card { width: 100%; }
.sa-title { font-size: 24px; font-weight: 700; color: #E8EAF0; margin-bottom: 6px; }
.sa-sub { font-size: 13px; color: #6B7280; margin-bottom: 24px; }

.sa-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; color: #9CA3AF; font-weight: 500; }
.field input {
  background: #131520; border: 1px solid rgba(255,255,255,.08);
  border-radius: 10px; padding: 11px 14px;
  color: #E8EAF0; font-size: 14px; font-family: inherit; outline: none; transition: border-color .15s;
}
.field input:focus { border-color: #4F7EFF; }
.field input::placeholder { color: #6B7280; }

.pw-wrap { position: relative; }
.pw-wrap input { width: 100%; padding-right: 42px; }
.pw-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 14px; padding: 0; }

.err-box {
  background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.2);
  border-radius: 8px; padding: 9px 13px; font-size: 12px; color: #FF6B6B;
}

.btn-submit {
  width: 100%; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600;
  font-family: inherit; cursor: pointer; border: none; transition: all .15s;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  color: #fff; box-shadow: 0 0 20px rgba(79,126,255,.35);
}
.btn-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 0 28px rgba(79,126,255,.5); }
.btn-submit:disabled { opacity: .4; cursor: not-allowed; transform: none; }

.spin-wrap { display: flex; align-items: center; justify-content: center; gap: 8px; }
.spinner {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.separator { display: flex; align-items: center; gap: 12px; margin: 20px 0 16px; }
.separator::before, .separator::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.07); }
.separator span { font-size: 11px; color: #6B7280; }
.back-link { display: block; text-align: center; font-size: 13px; color: #6B7280; text-decoration: none; transition: color .15s; }
.back-link:hover { color: #4F7EFF; }

/* ── Right panel ─── */
.sa-right {
  flex: 1; background: linear-gradient(135deg, #04050C 0%, #080B18 100%);
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.sa-right::before {
  content: ''; position: absolute; inset: 0;
  background-image: linear-gradient(rgba(79,126,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(79,126,255,.06) 1px, transparent 1px);
  background-size: 40px 40px;
}
.sr-content { position: relative; z-index: 1; padding: 60px; max-width: 440px; }
.sr-headline { font-size: 40px; font-weight: 800; line-height: 1.2; color: #E8EAF0; margin-bottom: 16px; }
.sr-desc { font-size: 14px; color: #6B7280; line-height: 1.6; margin-bottom: 40px; }
.sr-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
.stat-item {
  background: rgba(79,126,255,.08); border: 1px solid rgba(79,126,255,.15);
  border-radius: 12px; padding: 16px; text-align: center;
}
.stat-v { font-size: 24px; font-weight: 700; color: #4F7EFF; line-height: 1; margin-bottom: 4px; }
.stat-l { font-size: 12px; color: #6B7280; }

.sa-env-badge {
  display: inline-block; font-size: 11px; font-weight: 600; padding: 6px 14px; border-radius: 20px;
  background: rgba(255,107,107,.1); color: #FF6B6B; border: 1px solid rgba(255,107,107,.2);
}

@media (max-width: 800px) {
  .sa-right { display: none; }
  .sa-left { flex: 1; padding: 24px; }
}
</style>
