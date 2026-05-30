<template>
  <SectionCard title="Security Settings" description="Manage password, 2FA, and notifications">
    <div class="sec-wrap">
      <!-- Change Password -->
      <form class="sec-section" @submit.prevent="$emit('change-password', { current, next: nextPassword })">
        <h3 class="sec-subtitle">Change Password</h3>
        <div class="sec-pw-grid">
          <input v-model="current" type="password" placeholder="Current password" class="sec-input" />
          <input v-model="nextPassword" type="password" placeholder="New password" class="sec-input" />
          <input v-model="confirm" type="password" placeholder="Confirm new password" class="sec-input" />
        </div>
        <div class="sec-actions">
          <button class="sec-btn-primary" type="submit" :disabled="!canSubmit">Update Password</button>
        </div>
      </form>

      <!-- 2FA -->
      <div class="sec-section">
        <h3 class="sec-subtitle">Two-Factor Authentication</h3>

        <div v-if="twofaError" class="sec-error">{{ twofaError }}</div>

        <!-- Enabled state -->
        <template v-if="twofaEnabled">
          <span class="sec-badge-green">Two-Factor Authentication is enabled</span>
          <p class="sec-hint">Your account is protected with an authenticator app.</p>

          <template v-if="!disabling">
            <div class="sec-actions">
              <button class="sec-btn-ghost" @click="startDisable">Disable 2FA</button>
            </div>
          </template>

          <template v-else>
            <input
              v-model="disablePassword"
              type="password"
              placeholder="Enter your password to confirm"
              class="sec-input"
            />
            <div class="sec-actions sec-actions-gap">
              <button class="sec-btn-ghost" @click="cancelDisable">Cancel</button>
              <button class="sec-btn-primary" :disabled="!disablePassword || twofaBusy" @click="confirmDisable">
                {{ twofaBusy ? 'Disabling…' : 'Confirm Disable' }}
              </button>
            </div>
          </template>
        </template>

        <!-- Disabled state -->
        <template v-else>
          <template v-if="!setupData">
            <span class="sec-badge-muted">Two-Factor Authentication is disabled</span>
            <p class="sec-hint">Use an authenticator app to secure your account.</p>
            <div class="sec-actions">
              <button class="sec-btn-primary" :disabled="twofaBusy" @click="startSetup">
                {{ twofaBusy ? 'Loading…' : 'Enable 2FA' }}
              </button>
            </div>
          </template>

          <template v-else>
            <p class="sec-hint">Scan this QR code with your authenticator app, then enter the 6-digit code to verify.</p>
            <img :src="setupData.qr_url" alt="2FA QR code" class="sec-qr" />
            <div class="sec-secret">
              <span class="sec-secret-label">Manual entry key</span>
              <code class="sec-secret-code">{{ setupData.secret }}</code>
            </div>
            <input
              v-model="verifyCode"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="Enter 6-digit code"
              class="sec-input"
            />
            <div class="sec-actions sec-actions-gap">
              <button class="sec-btn-ghost" @click="cancelSetup">Cancel</button>
              <button class="sec-btn-primary" :disabled="verifyCode.length !== 6 || twofaBusy" @click="verifyEnable">
                {{ twofaBusy ? 'Verifying…' : 'Verify & Enable' }}
              </button>
            </div>
          </template>
        </template>
      </div>

      <!-- Notifications -->
      <div class="sec-section">
        <h3 class="sec-subtitle">Notifications</h3>
        <div class="sec-notif-grid">
          <label class="sec-check-label"><input type="checkbox" v-model="notif.email" class="sec-checkbox" /> Email updates</label>
          <label class="sec-check-label"><input type="checkbox" v-model="notif.sms" class="sec-checkbox" /> SMS alerts</label>
          <label class="sec-check-label"><input type="checkbox" v-model="notif.push" class="sec-checkbox" /> Push notifications</label>
          <label class="sec-check-label"><input type="checkbox" v-model="notif.news" class="sec-checkbox" /> Product news</label>
        </div>
        <div class="sec-actions">
          <button class="sec-btn-ghost" @click="$emit('save-notifications', notif)">Save Preferences</button>
        </div>
      </div>
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import SectionCard from './SectionCard.vue'
import api from '@/services/api'

const current = ref('')
const nextPassword = ref('')
const confirm = ref('')
const canSubmit = computed(() => !!current.value && nextPassword.value.length >= 6 && nextPassword.value === confirm.value)
const notif = reactive({ email: true, sms: false, push: true, news: false })

defineEmits<{
  (e: 'change-password', payload: { current: string; next: string }): void
  (e: 'save-notifications', prefs: { email: boolean; sms: boolean; push: boolean; news: boolean }): void
}>()

// ---- 2FA state ----
interface TwoFaSetup {
  secret: string
  qr_url: string
}

const twofaEnabled = ref(false)
const twofaBusy = ref(false)
const twofaError = ref('')

// setup (enable) flow
const setupData = ref<TwoFaSetup | null>(null)
const verifyCode = ref('')

// disable flow
const disabling = ref(false)
const disablePassword = ref('')

onMounted(loadTwofaStatus)

async function loadTwofaStatus() {
  try {
    const res = await api.get('/2fa/status')
    twofaEnabled.value = !!res.data?.enabled
  } catch {
    // leave default (disabled) if status can't be fetched
  }
}

async function startSetup() {
  twofaError.value = ''
  twofaBusy.value = true
  try {
    const res = await api.post('/2fa/setup')
    setupData.value = { secret: res.data?.secret, qr_url: res.data?.qr_url }
    verifyCode.value = ''
  } catch {
    twofaError.value = 'Failed to start 2FA setup. Please try again.'
  } finally {
    twofaBusy.value = false
  }
}

function cancelSetup() {
  setupData.value = null
  verifyCode.value = ''
  twofaError.value = ''
}

async function verifyEnable() {
  twofaError.value = ''
  twofaBusy.value = true
  try {
    await api.post('/2fa/enable', { code: verifyCode.value })
    twofaEnabled.value = true
    setupData.value = null
    verifyCode.value = ''
  } catch {
    twofaError.value = 'Invalid code. Please try again.'
  } finally {
    twofaBusy.value = false
  }
}

function startDisable() {
  disabling.value = true
  disablePassword.value = ''
  twofaError.value = ''
}

function cancelDisable() {
  disabling.value = false
  disablePassword.value = ''
  twofaError.value = ''
}

async function confirmDisable() {
  twofaError.value = ''
  twofaBusy.value = true
  try {
    await api.post('/2fa/disable', { password: disablePassword.value })
    twofaEnabled.value = false
    disabling.value = false
    disablePassword.value = ''
  } catch {
    twofaError.value = 'Failed to disable 2FA. Check your password and try again.'
  } finally {
    twofaBusy.value = false
  }
}
</script>

<style scoped>
.sec-wrap { display: flex; flex-direction: column; gap: 20px; }
.sec-section { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px solid #232936; }
.sec-section:first-child { border-top: none; padding-top: 0; }
.sec-subtitle { margin: 0; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.sec-pw-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.sec-input {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 8px 12px; outline: none;
  transition: border-color 0.15s; width: 100%; box-sizing: border-box;
}
.sec-input:focus { border-color: #6B5BFF; }
.sec-hint { margin: 0; font-size: 12px; color: #7A8299; }
.sec-check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.sec-checkbox { accent-color: #6B5BFF; width: 14px; height: 14px; }
.sec-notif-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.sec-actions { display: flex; justify-content: flex-end; }
.sec-btn-primary {
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
}
.sec-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.sec-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.sec-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; transition: background 0.15s;
}
.sec-btn-ghost:hover { background: #232936; }

/* 2FA */
.sec-actions-gap { gap: 8px; }
.sec-badge-green {
  display: inline-flex; align-items: center; align-self: flex-start;
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
  background: rgba(54,211,153,0.12); color: #36D399; border: 1px solid rgba(54,211,153,0.25);
}
.sec-badge-muted {
  display: inline-flex; align-items: center; align-self: flex-start;
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
  background: rgba(107,114,128,0.14); color: #7A8299; border: 1px solid rgba(107,114,128,0.25);
}
.sec-error {
  padding: 8px 12px; font-size: 12px; border-radius: 7px;
  background: rgba(255,107,107,0.1); color: #FF6B6B; border: 1px solid rgba(255,107,107,0.25);
}
.sec-qr {
  width: 168px; height: 168px; align-self: flex-start;
  background: #fff; border: 1px solid #232936; border-radius: 8px; padding: 6px;
}
.sec-secret { display: flex; flex-direction: column; gap: 4px; }
.sec-secret-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #7A8299; }
.sec-secret-code {
  font-family: monospace; font-size: 13px; letter-spacing: 0.08em; color: #E8EAF0;
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px; padding: 8px 12px;
  align-self: flex-start; word-break: break-all;
}
</style>
