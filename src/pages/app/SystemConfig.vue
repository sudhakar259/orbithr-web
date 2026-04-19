<script setup lang="ts">
defineOptions({ name: 'SystemConfig' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { hasRole } = useAuth()
const { confirm: dialog } = useConfirm()
const toast = useToast()
const activeTab = ref('notifications')
const isAdmin = computed(() => hasRole('admin'))

/* ---------- Tab 1: Notification Preferences ---------- */
interface NotifPref {
  type: string
  email: boolean
  in_app: boolean
  push: boolean
}

const notifTypes = [
  'leave_approved', 'leave_rejected', 'ticket_updated', 'ticket_assigned',
  'announcement_published', 'birthday_reminder', 'work_anniversary',
  'payroll_processed', 'interview_scheduled',
]

const notifPrefs = ref<NotifPref[]>([])
const notifLoading = ref(false)
const notifSaving = ref(false)

function snakeToTitle(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

async function loadNotifPrefs() {
  notifLoading.value = true
  try {
    const { data } = await api.get('/system/notification-preferences')
    const arr = Array.isArray(data) ? data : (data.data ?? [])
    notifPrefs.value = notifTypes.map(type => {
      const existing = arr.find((p: NotifPref) => p.type === type)
      return existing ?? { type, email: true, in_app: true, push: false }
    })
  } catch {
    notifPrefs.value = notifTypes.map(type => ({ type, email: true, in_app: true, push: false }))
  } finally {
    notifLoading.value = false
  }
}

async function saveNotifPrefs() {
  notifSaving.value = true
  try {
    await api.post('/system/notification-preferences', { preferences: notifPrefs.value })
    toast.success('Notification preferences saved')
  } catch {
    toast.error('Failed to save preferences')
  } finally {
    notifSaving.value = false
  }
}

/* ---------- Tab 2: Workflow Rules ---------- */
interface WorkflowRule {
  id: number
  name: string
  description?: string
  trigger_event: string
  actions?: { action_type: string; config?: string }[]
  actions_count?: number
  is_active: boolean
  last_run_at?: string
}

const rules = ref<WorkflowRule[]>([])
const rulesLoading = ref(false)
const showRuleForm = ref(false)
const ruleSaving = ref(false)

const triggerEvents = [
  'leave_approved', 'employee_onboarded', 'ticket_created', 'ticket_resolved',
  'announcement_published', 'interview_scheduled',
]

const ruleForm = ref({
  name: '', description: '', trigger_event: 'leave_approved',
  actions: [{ action_type: 'send_notification', config: '' }] as { action_type: string; config: string }[],
})

async function loadRules() {
  rulesLoading.value = true
  try {
    const { data } = await api.get('/system/workflow-rules')
    rules.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    rules.value = []
  } finally {
    rulesLoading.value = false
  }
}

async function saveRule() {
  if (!ruleForm.value.name) return
  ruleSaving.value = true
  try {
    await api.post('/system/workflow-rules', ruleForm.value)
    toast.success('Rule created')
    showRuleForm.value = false
    ruleForm.value = { name: '', description: '', trigger_event: 'leave_approved', actions: [{ action_type: 'send_notification', config: '' }] }
    await loadRules()
  } catch {
    toast.error('Failed to create rule')
  } finally {
    ruleSaving.value = false
  }
}

async function toggleRule(rule: WorkflowRule) {
  try {
    await api.post(`/system/workflow-rules/${rule.id}/toggle`)
    rule.is_active = !rule.is_active
  } catch {
    toast.error('Failed to toggle rule')
  }
}

async function testRule(rule: WorkflowRule) {
  try {
    const { data } = await api.post(`/system/workflow-rules/${rule.id}/test`)
    toast.success(data.message ?? 'Dry run completed')
  } catch {
    toast.error('Dry run failed')
  }
}

async function deleteRule(rule: WorkflowRule) {
  if (!await dialog('Delete', `Delete rule "${rule.name}"?`)) return
  try {
    await api.delete(`/system/workflow-rules/${rule.id}`)
    rules.value = rules.value.filter(r => r.id !== rule.id)
    toast.success('Rule deleted')
  } catch {
    toast.error('Failed to delete rule')
  }
}

function addAction() {
  ruleForm.value.actions.push({ action_type: 'send_notification', config: '' })
}

function removeAction(i: number) {
  ruleForm.value.actions.splice(i, 1)
}

/* ---------- Tab 3: Integrations ---------- */
interface Integration {
  id: number
  name: string
  type: string
  provider?: string
  is_active: boolean
  test_status?: string
}

const integrations = ref<Integration[]>([])
const intLoading = ref(false)
const showIntForm = ref(false)
const intSaving = ref(false)

const intForm = ref({ type: 'slack', name: '', config: '' })

const providerColors: Record<string, string> = {
  slack: 'prov-green', zoom: 'prov-blue', webhook: 'prov-purple', sms: 'prov-yellow',
  whatsapp: 'prov-green', custom: 'prov-muted',
}

async function loadIntegrations() {
  intLoading.value = true
  try {
    const { data } = await api.get('/system/integrations')
    integrations.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    integrations.value = []
  } finally {
    intLoading.value = false
  }
}

async function saveIntegration() {
  if (!intForm.value.name) return
  intSaving.value = true
  try {
    let config = {}
    if (intForm.value.config) {
      try { config = JSON.parse(intForm.value.config) } catch { config = {} }
    }
    await api.post('/system/integrations', { ...intForm.value, config })
    toast.success('Integration added')
    showIntForm.value = false
    intForm.value = { type: 'slack', name: '', config: '' }
    await loadIntegrations()
  } catch {
    toast.error('Failed to add integration')
  } finally {
    intSaving.value = false
  }
}

async function testIntegration(int: Integration) {
  try {
    const { data } = await api.post(`/system/integrations/${int.id}/test`)
    int.test_status = data.success ? 'success' : 'failed'
    toast.success(data.message ?? 'Test completed')
  } catch {
    int.test_status = 'failed'
    toast.error('Integration test failed')
  }
}

async function toggleIntegration(int: Integration) {
  try {
    await api.patch(`/system/integrations/${int.id}`, { is_active: !int.is_active })
    int.is_active = !int.is_active
  } catch {
    toast.error('Failed to toggle integration')
  }
}

async function deleteIntegration(int: Integration) {
  if (!await dialog('Delete', `Delete "${int.name}"?`)) return
  try {
    await api.delete(`/system/integrations/${int.id}`)
    integrations.value = integrations.value.filter(i => i.id !== int.id)
    toast.success('Integration deleted')
  } catch {
    toast.error('Failed to delete integration')
  }
}

/* ---------- Tab 4: Company Settings ---------- */
interface SettingItem { key: string; value: string }

const settings = ref<SettingItem[]>([])
const settingsLoading = ref(false)
const settingsSaving = ref(false)

interface SettingKeyDef {
  key: string
  label: string
  type: string
  options?: string[]
}

const settingKeys: Record<string, SettingKeyDef[]> = {
  general: [
    { key: 'app_name', label: 'App Name', type: 'text' },
    { key: 'timezone', label: 'Timezone', type: 'select', options: ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'] },
    { key: 'date_format', label: 'Date Format', type: 'select', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
    { key: 'currency', label: 'Currency', type: 'select', options: ['USD', 'EUR', 'GBP', 'INR', 'AED'] },
  ],
  branding: [
    { key: 'logo_url', label: 'Logo URL', type: 'readonly' },
    { key: 'app_color', label: 'App Color', type: 'color' },
  ],
  localization: [
    { key: 'language', label: 'Language', type: 'select', options: ['en', 'es', 'fr', 'ar'] },
    { key: 'rtl_enabled', label: 'RTL Enabled', type: 'toggle' },
  ],
}

function getSettingVal(key: string): string {
  return settings.value.find(s => s.key === key)?.value ?? ''
}

function setSettingVal(key: string, value: string) {
  const item = settings.value.find(s => s.key === key)
  if (item) item.value = value
  else settings.value.push({ key, value })
}

async function loadSettings() {
  settingsLoading.value = true
  try {
    const { data } = await api.get('/system/settings')
    const arr = Array.isArray(data) ? data : (data.data ?? [])
    settings.value = arr.map((s: { key: string; value: string }) => ({ key: s.key, value: s.value ?? '' }))
  } catch {
    settings.value = []
  } finally {
    settingsLoading.value = false
  }
}

async function saveSettings() {
  settingsSaving.value = true
  try {
    await api.post('/system/settings', { settings: settings.value })
    toast.success('Settings saved')
  } catch {
    toast.error('Failed to save settings')
  } finally {
    settingsSaving.value = false
  }
}

/* ---------- Init ---------- */
onMounted(() => {
  loadNotifPrefs()
  loadRules()
  loadIntegrations()
  loadSettings()
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <p class="page-sub">Manage notifications, workflows, integrations and settings</p>
    </div>

    <!-- Tabs -->
    <div class="tab-row">
      <button class="tab" :class="{ active: activeTab === 'notifications' }" @click="activeTab = 'notifications'">Notifications</button>
      <button v-if="isAdmin" class="tab" :class="{ active: activeTab === 'workflows' }" @click="activeTab = 'workflows'">Workflow Rules</button>
      <button v-if="isAdmin" class="tab" :class="{ active: activeTab === 'integrations' }" @click="activeTab = 'integrations'">Integrations</button>
      <button class="tab" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">Settings</button>
    </div>

    <!-- Tab 1: Notifications -->
    <div v-if="activeTab === 'notifications'" class="tab-content">
      <div v-if="notifLoading" class="loading-row">Loading preferences...</div>
      <div v-else>
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Notification Type</th>
                <th>Email</th>
                <th>In-App</th>
                <th>Push</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pref in notifPrefs" :key="pref.type">
                <td>{{ snakeToTitle(pref.type) }}</td>
                <td><label class="switch"><input type="checkbox" v-model="pref.email" /><span class="slider"></span></label></td>
                <td><label class="switch"><input type="checkbox" v-model="pref.in_app" /><span class="slider"></span></label></td>
                <td><label class="switch"><input type="checkbox" v-model="pref.push" /><span class="slider"></span></label></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="save-row">
          <button class="btn-primary" :disabled="notifSaving" @click="saveNotifPrefs">{{ notifSaving ? 'Saving...' : 'Save Preferences' }}</button>
        </div>
      </div>
    </div>

    <!-- Tab 2: Workflow Rules -->
    <div v-if="activeTab === 'workflows'" class="tab-content">
      <div class="tab-actions">
        <button class="btn-primary" @click="showRuleForm = true">+ New Rule</button>
      </div>

      <!-- Rule form modal -->
      <div v-if="showRuleForm" class="modal-overlay" @click.self="showRuleForm = false">
        <div class="modal-box">
          <h3 class="modal-title">New Workflow Rule</h3>
          <div class="form-stack">
            <div class="field"><label>Name *</label><input v-model="ruleForm.name" placeholder="Rule name" /></div>
            <div class="field"><label>Description</label><input v-model="ruleForm.description" placeholder="Optional description" /></div>
            <div class="field">
              <label>Trigger Event</label>
              <select v-model="ruleForm.trigger_event">
                <option v-for="te in triggerEvents" :key="te" :value="te">{{ snakeToTitle(te) }}</option>
              </select>
            </div>
            <div class="field">
              <label>Actions</label>
              <div v-for="(action, i) in ruleForm.actions" :key="i" class="action-row">
                <select v-model="action.action_type">
                  <option value="send_notification">Send Notification</option>
                  <option value="send_email">Send Email</option>
                  <option value="assign_ticket">Assign Ticket</option>
                </select>
                <textarea v-model="action.config" rows="2" placeholder='Config JSON (optional)'></textarea>
                <button v-if="ruleForm.actions.length > 1" class="remove-btn" @click="removeAction(i)">x</button>
              </div>
              <button class="btn-ghost btn-sm" @click="addAction">+ Add Action</button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="showRuleForm = false">Cancel</button>
            <button class="btn-primary" :disabled="ruleSaving" @click="saveRule">{{ ruleSaving ? 'Saving...' : 'Save Rule' }}</button>
          </div>
        </div>
      </div>

      <div v-if="rulesLoading" class="loading-row">Loading rules...</div>
      <div v-else-if="rules.length" class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Trigger Event</th>
              <th>Actions</th>
              <th>Active</th>
              <th>Last Run</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rules" :key="r.id">
              <td>{{ r.name }}</td>
              <td>{{ snakeToTitle(r.trigger_event) }}</td>
              <td>{{ r.actions_count ?? r.actions?.length ?? 0 }}</td>
              <td><label class="switch"><input type="checkbox" :checked="r.is_active" @change="toggleRule(r)" /><span class="slider"></span></label></td>
              <td class="date-cell">{{ r.last_run_at ? new Date(r.last_run_at).toLocaleDateString() : 'Never' }}</td>
              <td>
                <div class="row-actions">
                  <button class="act-btn" @click="testRule(r)">Test</button>
                  <button class="act-btn danger" @click="deleteRule(r)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">No workflow rules configured.</div>
    </div>

    <!-- Tab 3: Integrations -->
    <div v-if="activeTab === 'integrations'" class="tab-content">
      <div class="tab-actions">
        <button class="btn-primary" @click="showIntForm = true">+ Add Integration</button>
      </div>

      <!-- Integration form modal -->
      <div v-if="showIntForm" class="modal-overlay" @click.self="showIntForm = false">
        <div class="modal-box">
          <h3 class="modal-title">Add Integration</h3>
          <div class="form-stack">
            <div class="field">
              <label>Type</label>
              <select v-model="intForm.type">
                <option value="slack">Slack</option>
                <option value="zoom">Zoom</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="webhook">Webhook</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div class="field"><label>Name *</label><input v-model="intForm.name" placeholder="Integration name" /></div>
            <div class="field">
              <label>Configuration (JSON)</label>
              <textarea v-model="intForm.config" rows="4" placeholder='{"key": "value"}'></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="showIntForm = false">Cancel</button>
            <button class="btn-primary" :disabled="intSaving" @click="saveIntegration">{{ intSaving ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>

      <div v-if="intLoading" class="loading-row">Loading integrations...</div>
      <div v-else-if="integrations.length" class="int-grid">
        <div v-for="int in integrations" :key="int.id" class="int-card">
          <div class="int-icon" :class="providerColors[int.type] ?? 'prov-muted'">
            {{ (int.type ?? '?')[0].toUpperCase() }}
          </div>
          <div class="int-info">
            <div class="int-name">{{ int.name }}</div>
            <div class="int-badges">
              <span class="int-type-badge">{{ int.type }}</span>
              <span class="int-status-badge" :class="int.is_active ? 'active' : 'inactive'">{{ int.is_active ? 'Active' : 'Inactive' }}</span>
              <span v-if="int.test_status" class="int-test-badge" :class="int.test_status">{{ int.test_status }}</span>
            </div>
          </div>
          <div class="int-actions">
            <button class="act-btn" @click="testIntegration(int)">Test</button>
            <button class="act-btn" @click="toggleIntegration(int)">{{ int.is_active ? 'Disable' : 'Enable' }}</button>
            <button class="act-btn danger" @click="deleteIntegration(int)">Delete</button>
          </div>
        </div>
      </div>
      <div v-else class="empty">No integrations configured.</div>
    </div>

    <!-- Tab 4: Settings -->
    <div v-if="activeTab === 'settings'" class="tab-content">
      <div v-if="settingsLoading" class="loading-row">Loading settings...</div>
      <div v-else class="settings-groups">
        <div v-for="(items, group) in settingKeys" :key="group" class="settings-group">
          <h3 class="group-title">{{ group }}</h3>
          <div class="group-fields">
            <div v-for="item in items" :key="item.key" class="setting-field">
              <label>{{ item.label }}</label>
              <input v-if="item.type === 'text'" :value="getSettingVal(item.key)" @input="setSettingVal(item.key, ($event.target as HTMLInputElement).value)" />
              <input v-else-if="item.type === 'readonly'" :value="getSettingVal(item.key)" readonly class="readonly" />
              <input v-else-if="item.type === 'color'" type="color" :value="getSettingVal(item.key) || '#4F7EFF'" @input="setSettingVal(item.key, ($event.target as HTMLInputElement).value)" />
              <select v-else-if="item.type === 'select'" :value="getSettingVal(item.key)" @change="setSettingVal(item.key, ($event.target as HTMLSelectElement).value)">
                <option v-for="opt in item.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <label v-else-if="item.type === 'toggle'" class="switch">
                <input type="checkbox" :checked="getSettingVal(item.key) === 'true' || getSettingVal(item.key) === '1'" @change="setSettingVal(item.key, ($event.target as HTMLInputElement).checked ? 'true' : 'false')" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div class="save-row">
          <button class="btn-primary" :disabled="settingsSaving" @click="saveSettings">{{ settingsSaving ? 'Saving...' : 'Save Settings' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-header { margin-bottom: 4px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }
.page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }

.tab-row { display: flex; gap: 4px; flex-wrap: wrap; }
.tab { padding: 7px 14px; border-radius: var(--rs); background: var(--surface); border: 1px solid var(--border); font-size: 12px; font-weight: 500; color: var(--muted); cursor: pointer; font-family: inherit; transition: all .14s; }
.tab:hover { border-color: var(--border-hi); color: var(--text); }
.tab.active { background: rgba(79,126,255,.08); border-color: var(--accent); color: var(--accent); }

.tab-content { display: flex; flex-direction: column; gap: 14px; }
.tab-actions { display: flex; justify-content: flex-end; }
.loading-row { padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }
.empty { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }

.table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); }
.tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.tbl th { text-align: left; padding: 10px 14px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); border-bottom: 1px solid var(--border); background: var(--surface2); white-space: nowrap; }
.tbl td { padding: 10px 14px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.tbl tbody tr:hover { background: var(--surface2); }
.date-cell { font-size: 11px; color: var(--muted); white-space: nowrap; }

.save-row { display: flex; justify-content: flex-end; margin-top: 4px; }

/* Toggle switch */
.switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: var(--surface3); border-radius: 20px; transition: .2s; }
.slider::before { content: ''; position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px; background: var(--muted); border-radius: 50%; transition: .2s; }
.switch input:checked + .slider { background: var(--accent); }
.switch input:checked + .slider::before { transform: translateX(16px); background: #fff; }

.row-actions { display: flex; gap: 6px; }
.act-btn { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; font-size: 11px; color: var(--text); cursor: pointer; font-family: inherit; transition: all .15s; }
.act-btn:hover { border-color: var(--accent); color: var(--accent); }
.act-btn.danger:hover { border-color: var(--red); color: var(--red); }

/* Integration grid */
.int-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.int-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.int-icon { width: 40px; height: 40px; border-radius: var(--rs); display: grid; place-items: center; font-size: 16px; font-weight: 700; color: #fff; }
.prov-green { background: rgba(54,211,153,.2); color: var(--green); }
.prov-blue { background: rgba(79,126,255,.2); color: var(--accent); }
.prov-purple { background: rgba(155,110,255,.2); color: var(--purple); }
.prov-yellow { background: rgba(249,168,37,.2); color: var(--yellow); }
.prov-muted { background: var(--surface2); color: var(--muted); }
.int-name { font-size: 14px; font-weight: 600; color: var(--text); }
.int-badges { display: flex; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.int-type-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: var(--surface2); color: var(--muted); text-transform: capitalize; }
.int-status-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
.int-status-badge.active { background: rgba(54,211,153,.12); color: var(--green); }
.int-status-badge.inactive { background: var(--surface2); color: var(--muted); }
.int-test-badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
.int-test-badge.success { background: rgba(54,211,153,.12); color: var(--green); }
.int-test-badge.failed { background: rgba(255,107,107,.12); color: var(--red); }
.int-test-badge.unknown { background: var(--surface2); color: var(--muted); }
.int-actions { display: flex; gap: 6px; margin-top: 4px; }

/* Settings groups */
.settings-groups { display: flex; flex-direction: column; gap: 20px; }
.settings-group { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 18px; }
.group-title { font-size: 13px; font-weight: 600; color: var(--text); text-transform: capitalize; margin: 0 0 14px; }
.group-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.setting-field { display: flex; flex-direction: column; gap: 5px; }
.setting-field label { font-size: 11px; color: var(--muted); font-weight: 500; }
.setting-field input, .setting-field select {
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit;
  outline: none; transition: border-color .15s;
}
.setting-field input:focus, .setting-field select:focus { border-color: var(--accent); }
.setting-field input.readonly { opacity: .6; cursor: default; }
.setting-field input[type="color"] { padding: 4px; height: 38px; cursor: pointer; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-box { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 24px; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0 0 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

.form-stack { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 11px; color: var(--muted); font-weight: 500; }
.field input, .field select, .field textarea {
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit;
  outline: none; transition: border-color .15s; resize: vertical;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--accent); }

.action-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px; }
.action-row select { flex: 0 0 160px; }
.action-row textarea { flex: 1; }
.remove-btn { background: none; border: 1px solid var(--border); border-radius: 4px; width: 26px; height: 26px; color: var(--red); cursor: pointer; font-family: inherit; font-size: 12px; display: grid; place-items: center; transition: all .1s; }
.remove-btn:hover { border-color: var(--red); }

.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--rs); padding: 9px 18px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
.btn-primary:hover { background: #3d6ee8; transform: translateY(-1px); }
.btn-primary:disabled { opacity: .5; cursor: default; transform: none; }
.btn-ghost { background: var(--surface2); color: var(--muted); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }
.btn-sm { padding: 5px 12px; font-size: 11px; }
</style>
