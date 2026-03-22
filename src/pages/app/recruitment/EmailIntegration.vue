<script setup lang="ts">
defineOptions({ name: 'RecruitmentEmailIntegration' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

// ── Types ──────────────────────────────────────────────
interface EmailAccount {
  id: number
  provider: 'gmail' | 'outlook' | 'smtp'
  display_name: string
  email_address: string
  is_active: boolean
  last_synced_at?: string
  created_at: string
}

// ── State ──────────────────────────────────────────────
const accounts = ref<EmailAccount[]>([])
const loadingAccounts = ref(true)
const syncingId = ref<number | null>(null)
const disconnectingId = ref<number | null>(null)
const togglingId = ref<number | null>(null)

// right panel
const activeTab = ref<'oauth' | 'smtp'>('oauth')
const saving = ref(false)
const connectError = ref('')

// OAuth form
const oauthForm = ref({
  provider: 'gmail' as 'gmail' | 'outlook',
  display_name: '',
  email_address: '',
  access_token: '',
  refresh_token: '',
})

// SMTP form
const smtpForm = ref({
  display_name: '',
  email_address: '',
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
})

// ── Helpers ────────────────────────────────────────────
function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function providerIcon(p: string) {
  if (p === 'gmail') return { label: 'G', cls: 'prov-gmail' }
  if (p === 'outlook') return { label: '\u2709', cls: 'prov-outlook' }
  return { label: '\u2699', cls: 'prov-smtp' }
}

// ── API ────────────────────────────────────────────────
async function loadAccounts() {
  loadingAccounts.value = true
  try {
    const res = await api.get('/email-integration/accounts')
    accounts.value = res.data?.data ?? res.data ?? []
  } catch {
    accounts.value = []
  } finally {
    loadingAccounts.value = false
  }
}

async function syncAccount(id: number) {
  syncingId.value = id
  try {
    await api.post(`/email-integration/accounts/${id}/sync`)
    toast.success('Sync started')
    await loadAccounts()
  } catch {
    toast.error('Sync failed')
  } finally {
    syncingId.value = null
  }
}

async function disconnectAccount(id: number) {
  if (!confirm('Disconnect this email account? This will remove stored credentials.')) return
  disconnectingId.value = id
  try {
    await api.delete(`/email-integration/accounts/${id}`)
    toast.success('Account disconnected')
    await loadAccounts()
  } catch {
    toast.error('Failed to disconnect')
  } finally {
    disconnectingId.value = null
  }
}

async function toggleActive(acct: EmailAccount) {
  togglingId.value = acct.id
  try {
    await api.put(`/email-integration/accounts/${acct.id}`, { is_active: !acct.is_active })
    toast.success(acct.is_active ? 'Account deactivated' : 'Account activated')
    await loadAccounts()
  } catch {
    toast.error('Failed to update status')
  } finally {
    togglingId.value = null
  }
}

async function connectOAuth() {
  saving.value = true
  connectError.value = ''
  try {
    await api.post('/email-integration/accounts/oauth', {
      provider: oauthForm.value.provider,
      email_address: oauthForm.value.email_address,
      display_name: oauthForm.value.display_name,
      access_token: oauthForm.value.access_token,
      refresh_token: oauthForm.value.refresh_token,
    })
    toast.success('Account connected')
    oauthForm.value = { provider: 'gmail', display_name: '', email_address: '', access_token: '', refresh_token: '' }
    await loadAccounts()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    connectError.value = err.response?.data?.message ?? 'Connection failed'
  } finally {
    saving.value = false
  }
}

async function connectSmtp() {
  saving.value = true
  connectError.value = ''
  try {
    await api.post('/email-integration/accounts/smtp', { ...smtpForm.value })
    toast.success('SMTP account connected')
    smtpForm.value = { display_name: '', email_address: '', smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '' }
    await loadAccounts()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    connectError.value = err.response?.data?.message ?? 'Connection failed'
  } finally {
    saving.value = false
  }
}

onMounted(loadAccounts)
</script>

<template>
  <div class="ei-page">
    <PageHeader title="Email Integration" subtitle="Connect email accounts to send and receive candidate emails within ATS" />

    <div class="ei-grid">
      <!-- Left: Connected Accounts -->
      <div class="ei-panel">
        <h2 class="panel-title">Connected Accounts</h2>

        <div v-if="loadingAccounts" class="loading-placeholder">
          <div class="skel" /><div class="skel" />
        </div>

        <div v-else-if="!accounts.length" class="empty-wrap">
          <EmptyState icon="\u2709\uFE0F" message="No email accounts connected" sub="Add one to start sending and receiving candidate emails." />
        </div>

        <div v-else class="acct-list">
          <div v-for="acct in accounts" :key="acct.id" class="acct-card">
            <div class="acct-top">
              <span :class="['prov-icon', providerIcon(acct.provider).cls]">{{ providerIcon(acct.provider).label }}</span>
              <div class="acct-info">
                <p class="acct-name">{{ acct.display_name || acct.email_address }}</p>
                <p class="acct-email">{{ acct.email_address }}</p>
              </div>
              <span :class="['status-badge', acct.is_active ? 'active' : 'inactive']">
                <span class="status-dot" />
                {{ acct.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <p class="acct-sync">Last synced: {{ timeAgo(acct.last_synced_at) }}</p>
            <div class="acct-actions">
              <button class="btn-sm btn-outline" :disabled="syncingId === acct.id" @click="syncAccount(acct.id)">
                <span v-if="syncingId === acct.id" class="spinner" /> Sync
              </button>
              <button class="btn-sm btn-outline" :disabled="togglingId === acct.id" @click="toggleActive(acct)">
                {{ acct.is_active ? 'Deactivate' : 'Activate' }}
              </button>
              <button class="btn-sm btn-danger" :disabled="disconnectingId === acct.id" @click="disconnectAccount(acct.id)">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Connect Form -->
      <div class="ei-panel">
        <h2 class="panel-title">Connect Email Account</h2>

        <div class="tab-bar">
          <button :class="['tab-btn', activeTab === 'oauth' && 'tab-active']" @click="activeTab = 'oauth'; connectError = ''">
            Gmail / Outlook
          </button>
          <button :class="['tab-btn', activeTab === 'smtp' && 'tab-active']" @click="activeTab = 'smtp'; connectError = ''">
            Custom SMTP
          </button>
        </div>

        <div v-if="connectError" class="error-banner">{{ connectError }}</div>

        <!-- OAuth Tab -->
        <form v-if="activeTab === 'oauth'" class="form-fields" @submit.prevent="connectOAuth">
          <div class="info-banner">
            OAuth flow -- your browser will open Google/Microsoft sign-in. After authorizing, paste the token below.
          </div>

          <div class="field">
            <label class="field-label">Provider</label>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" value="gmail" v-model="oauthForm.provider" /> Gmail
              </label>
              <label class="radio-item">
                <input type="radio" value="outlook" v-model="oauthForm.provider" /> Outlook
              </label>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Display Name</label>
            <input v-model="oauthForm.display_name" class="input" placeholder="e.g. HR Recruitment" required />
          </div>
          <div class="field">
            <label class="field-label">Email Address</label>
            <input v-model="oauthForm.email_address" type="email" class="input" placeholder="hr@company.com" required />
          </div>
          <div class="field">
            <label class="field-label">Access Token</label>
            <input v-model="oauthForm.access_token" type="password" class="input" placeholder="Paste access token" required />
          </div>
          <div class="field">
            <label class="field-label">Refresh Token</label>
            <input v-model="oauthForm.refresh_token" type="password" class="input" placeholder="Paste refresh token" required />
          </div>
          <p class="hint-text">In production, OAuth tokens are obtained via the OAuth 2.0 PKCE flow.</p>
          <button type="submit" class="btn-primary" :disabled="saving">
            <span v-if="saving" class="spinner" /> Connect Account
          </button>
        </form>

        <!-- SMTP Tab -->
        <form v-if="activeTab === 'smtp'" class="form-fields" @submit.prevent="connectSmtp">
          <div class="field">
            <label class="field-label">Display Name</label>
            <input v-model="smtpForm.display_name" class="input" placeholder="e.g. SMTP Mailer" required />
          </div>
          <div class="field">
            <label class="field-label">Email Address (From)</label>
            <input v-model="smtpForm.email_address" type="email" class="input" placeholder="noreply@company.com" required />
          </div>
          <div class="field">
            <label class="field-label">SMTP Host</label>
            <input v-model="smtpForm.smtp_host" class="input" placeholder="smtp.company.com" required />
          </div>
          <div class="field">
            <label class="field-label">SMTP Port</label>
            <input v-model.number="smtpForm.smtp_port" type="number" class="input" required />
          </div>
          <div class="field">
            <label class="field-label">SMTP Username</label>
            <input v-model="smtpForm.smtp_username" class="input" placeholder="username" required />
          </div>
          <div class="field">
            <label class="field-label">SMTP Password</label>
            <input v-model="smtpForm.smtp_password" type="password" class="input" placeholder="password" required />
          </div>
          <button type="submit" class="btn-primary" :disabled="saving">
            <span v-if="saving" class="spinner" /> Test &amp; Connect
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ei-page { --bg:#0C0E14; --surface:#141720; --surface2:#1C2030; --surface3:#222840; --accent:#4F7EFF; --green:#36D399; --yellow:#F9A825; --red:#FF6B6B; --purple:#9B6EFF; --text:#E8EAF0; --muted:#6B7280; --border:rgba(255,255,255,.08); --border-hi:rgba(255,255,255,.14); --r:10px; }

.ei-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px; }
@media (max-width: 900px) { .ei-grid { grid-template-columns: 1fr; } }

.ei-panel { background: var(--surface); border: 1px solid var(--border-hi); border-radius: var(--r); padding: 24px; }
.panel-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 20px; }

/* Loading */
.loading-placeholder { display: flex; flex-direction: column; gap: 12px; }
.skel { height: 80px; background: var(--surface2); border-radius: 8px; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

.empty-wrap { padding: 20px 0; }

/* Account cards */
.acct-list { display: flex; flex-direction: column; gap: 14px; }
.acct-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.acct-top { display: flex; align-items: center; gap: 12px; }
.prov-icon { width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center; font-size: 16px; font-weight: 700; flex-shrink: 0; }
.prov-gmail { background: rgba(219,68,55,.15); color: #DB4437; }
.prov-outlook { background: rgba(0,120,212,.15); color: #0078D4; }
.prov-smtp { background: rgba(107,114,128,.15); color: var(--muted); }
.acct-info { flex: 1; min-width: 0; }
.acct-name { font-size: 14px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acct-email { font-size: 12px; color: var(--muted); margin-top: 2px; }
.status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 99px; flex-shrink: 0; }
.status-badge.active { background: rgba(54,211,153,.12); color: var(--green); }
.status-badge.inactive { background: rgba(255,107,107,.12); color: var(--red); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.acct-sync { font-size: 11px; color: var(--muted); margin-top: 10px; }
.acct-actions { display: flex; gap: 8px; margin-top: 12px; }

/* Buttons */
.btn-sm { padding: 5px 12px; font-size: 12px; font-weight: 500; border-radius: 6px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all .14s; }
.btn-outline { background: transparent; border: 1px solid var(--border-hi); color: var(--text); }
.btn-outline:hover:not(:disabled) { background: var(--surface3); }
.btn-danger { background: rgba(255,107,107,.12); color: var(--red); }
.btn-danger:hover:not(:disabled) { background: rgba(255,107,107,.22); }
.btn-sm:disabled { opacity: .5; cursor: not-allowed; }

.btn-primary { width: 100%; padding: 10px 16px; font-size: 14px; font-weight: 600; background: var(--accent); color: #fff; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: opacity .14s; margin-top: 8px; }
.btn-primary:hover:not(:disabled) { opacity: .85; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

/* Tabs */
.tab-bar { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.tab-btn { padding: 8px 18px; font-size: 13px; font-weight: 500; color: var(--muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all .14s; }
.tab-btn:hover { color: var(--text); }
.tab-active { color: var(--accent); border-bottom-color: var(--accent); }

/* Form */
.form-fields { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.input { padding: 9px 12px; font-size: 13px; color: var(--text); background: var(--surface2); border: 1px solid var(--border-hi); border-radius: 8px; outline: none; transition: border-color .14s; }
.input:focus { border-color: var(--accent); }
.input::placeholder { color: var(--muted); }

.radio-group { display: flex; gap: 20px; }
.radio-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text); cursor: pointer; }
.radio-item input { accent-color: var(--accent); }

.info-banner { background: rgba(79,126,255,.08); border: 1px solid rgba(79,126,255,.2); border-radius: 8px; padding: 12px 14px; font-size: 12px; color: var(--accent); line-height: 1.5; }
.error-banner { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.25); border-radius: 8px; padding: 12px 14px; font-size: 13px; color: var(--red); margin-bottom: 12px; }
.hint-text { font-size: 11px; color: var(--muted); line-height: 1.4; }

/* Spinner */
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.2); border-top-color: currentColor; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
