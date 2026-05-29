<script setup lang="ts">
defineOptions({ name: 'ExitManagement' })

import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface ExitRecord {
  id: string; employee_name: string; employee_id: string; exit_type: string; reason: string
  last_working_date: string; notice_period_days: number; status: string
  interview_date: string | null; interview_notes: string | null; fnf_amount: number | null
  clearances: ClearanceItem[]
}
interface ClearanceItem { id: string; name: string; is_cleared: boolean }
interface ExitRaw {
  id: string; exit_type?: string; reason?: string; last_working_date?: string; notice_period_days?: number
  status?: string; exit_interview_scheduled_at?: string | null; exit_interview_notes?: string | null
  exit_interview_conducted?: boolean; fnf_amount?: number | null
  employee?: { id?: string; first_name?: string; last_name?: string }
  clearances?: { id: string; clearance_item?: string; status?: string }[]
}

function mapExit(raw: ExitRaw): ExitRecord {
  return {
    id: raw.id,
    employee_name: [raw.employee?.first_name, raw.employee?.last_name].filter(Boolean).join(' ') || '—',
    employee_id: raw.employee?.id ?? '',
    exit_type: raw.exit_type ?? '', reason: raw.reason ?? '',
    last_working_date: raw.last_working_date ?? '', notice_period_days: raw.notice_period_days ?? 0,
    status: raw.status ?? '', interview_date: raw.exit_interview_scheduled_at ?? null,
    interview_notes: raw.exit_interview_notes ?? null, fnf_amount: raw.fnf_amount ?? null,
    clearances: (raw.clearances ?? []).map(c => ({ id: c.id, name: c.clearance_item ?? '', is_cleared: c.status === 'cleared' })),
  }
}

interface Employee { id: number; first_name: string; last_name: string }
const exits = ref<ExitRecord[]>([])
const loading = ref(false)
const employees = ref<Employee[]>([])

async function fetchExits() {
  loading.value = true
  try { const { data } = await api.get('/exits'); const rows: ExitRaw[] = data.data ?? data; exits.value = rows.map(mapExit) }
  catch { /* silently ignore */ }
  finally { loading.value = false }
}

async function fetchEmployees() {
  try { const { data } = await api.get('/employees', { params: { per_page: 200 } }); employees.value = data.data ?? data }
  catch { /* silently ignore */ }
}

const showInitiateForm = ref(false)
const initiateForm = ref({ employee_id: '', exit_type: 'resignation', reason: '', last_working_date: '', notice_period_days: 30 })
const initiating = ref(false)
const exitTypes = ['resignation', 'termination', 'retirement', 'contract_end']

async function initiateExit() {
  initiating.value = true
  try {
    await api.post('/exits', initiateForm.value)
    showInitiateForm.value = false
    initiateForm.value = { employee_id: '', exit_type: 'resignation', reason: '', last_working_date: '', notice_period_days: 30 }
    await fetchExits()
  } catch { /* silently ignore */ }
  finally { initiating.value = false }
}

const selectedExit = ref<ExitRecord | null>(null)
const detailLoading = ref(false)
const interviewDate = ref('')
const interviewNotes = ref('')
const fnfAmount = ref('')
const actionLoading = ref(false)

async function selectExit(exit: ExitRecord) {
  detailLoading.value = true; selectedExit.value = exit
  interviewDate.value = exit.interview_date ?? ''; interviewNotes.value = exit.interview_notes ?? ''; fnfAmount.value = exit.fnf_amount?.toString() ?? ''
  try {
    const { data } = await api.get(`/exits/${exit.id}`)
    selectedExit.value = mapExit(data)
    interviewDate.value = selectedExit.value.interview_date ?? ''; interviewNotes.value = selectedExit.value.interview_notes ?? ''; fnfAmount.value = selectedExit.value.fnf_amount?.toString() ?? ''
  } catch { /* silently ignore */ }
  finally { detailLoading.value = false }
}

async function scheduleInterview() {
  if (!selectedExit.value || !interviewDate.value) return
  actionLoading.value = true
  try { await api.post(`/exits/${selectedExit.value.id}/schedule-interview`, { scheduled_at: interviewDate.value }); selectedExit.value.interview_date = interviewDate.value; await fetchExits() }
  catch { /* silently ignore */ }
  finally { actionLoading.value = false }
}

async function completeInterview() {
  if (!selectedExit.value) return
  actionLoading.value = true
  try { await api.post(`/exits/${selectedExit.value.id}/complete-interview`, { notes: interviewNotes.value }); selectedExit.value.interview_notes = interviewNotes.value; await fetchExits() }
  catch { /* silently ignore */ }
  finally { actionLoading.value = false }
}

async function toggleClearance(clearance: ClearanceItem) {
  if (!selectedExit.value) return
  const newCleared = !clearance.is_cleared
  try { await api.put(`/exits/${selectedExit.value.id}/clearances/${clearance.id}`, { status: newCleared ? 'cleared' : 'pending' }); clearance.is_cleared = newCleared }
  catch { /* silently ignore */ }
}

async function processFnf() {
  if (!selectedExit.value || !fnfAmount.value) return
  actionLoading.value = true
  try { await api.post(`/exits/${selectedExit.value.id}/process-fnf`, { fnf_amount: parseFloat(fnfAmount.value) }); selectedExit.value.fnf_amount = parseFloat(fnfAmount.value); await fetchExits() }
  catch { /* silently ignore */ }
  finally { actionLoading.value = false }
}

const STATUS_TONES: Record<string, string> = {
  initiated: 'tone-blue', notice_period: 'tone-yellow', clearance: 'tone-orange',
  fnf_pending: 'tone-accent', completed: 'tone-green', cancelled: 'tone-muted',
}
const TYPE_TONES: Record<string, string> = {
  resignation: 'tone-blue', termination: 'tone-red', retirement: 'tone-green', contract_end: 'tone-yellow',
}
function statusTone(s: string) { return STATUS_TONES[s] ?? 'tone-muted' }
function typeTone(t: string) { return TYPE_TONES[t] ?? 'tone-muted' }

onMounted(() => { fetchExits(); fetchEmployees() })
</script>

<template>
  <div class="em-wrap">
    <div class="em-bar">
      <span class="em-page-title">Exit Management</span>
      <button class="em-btn-primary" @click="showInitiateForm = true">Initiate Exit</button>
    </div>

    <!-- Detail Panel -->
    <div v-if="selectedExit" class="em-detail-panel">
      <div class="em-detail-header">
        <span class="em-detail-name">{{ selectedExit.employee_name }}</span>
        <button class="em-close-btn" @click="selectedExit = null">Close ×</button>
      </div>
      <div v-if="detailLoading" class="em-loading"><div class="em-spinner" /></div>
      <template v-else>
        <div class="em-meta-grid">
          <div>
            <p class="em-meta-label">Exit Type</p>
            <span class="em-pill" :class="typeTone(selectedExit.exit_type)">{{ selectedExit.exit_type.replace(/_/g, ' ') }}</span>
          </div>
          <div>
            <p class="em-meta-label">Last Working Date</p>
            <p class="em-meta-value">{{ selectedExit.last_working_date }}</p>
          </div>
          <div>
            <p class="em-meta-label">Notice Period</p>
            <p class="em-meta-value em-mono">{{ selectedExit.notice_period_days }}d</p>
          </div>
          <div>
            <p class="em-meta-label">Status</p>
            <span class="em-pill" :class="statusTone(selectedExit.status)">{{ selectedExit.status.replace(/_/g, ' ') }}</span>
          </div>
        </div>

        <!-- Exit Interview -->
        <div class="em-section">
          <h4 class="em-section-title">Exit Interview</h4>
          <div v-if="!selectedExit.interview_date" class="em-row-gap">
            <div class="em-form-field" style="flex:1">
              <label class="em-form-label">Interview Date</label>
              <input v-model="interviewDate" type="date" class="em-input" />
            </div>
            <button class="em-btn-primary" style="align-self:flex-end" :disabled="actionLoading" @click="scheduleInterview">Schedule</button>
          </div>
          <template v-else-if="!selectedExit.interview_notes">
            <p class="em-text-muted">Scheduled: {{ selectedExit.interview_date }}</p>
            <textarea v-model="interviewNotes" rows="3" placeholder="Interview notes…" class="em-input" style="margin-top:8px" />
            <button class="em-btn-primary" style="margin-top:8px" :disabled="actionLoading" @click="completeInterview">Complete Interview</button>
          </template>
          <template v-else>
            <p class="em-text-muted">Completed on {{ selectedExit.interview_date }}</p>
            <p class="em-text" style="margin-top:4px">{{ selectedExit.interview_notes }}</p>
          </template>
        </div>

        <!-- Clearance Checklist -->
        <div class="em-section">
          <h4 class="em-section-title">Clearance Checklist</h4>
          <div class="em-checklist">
            <label v-for="item in selectedExit.clearances" :key="item.id" class="em-check-item">
              <input type="checkbox" :checked="item.is_cleared" class="em-checkbox" @change="toggleClearance(item)" />
              <span :class="item.is_cleared ? 'em-check-done' : 'em-check-pending'">{{ item.name }}</span>
            </label>
            <p v-if="selectedExit.clearances.length === 0" class="em-text-muted">No clearance items</p>
          </div>
        </div>

        <!-- FnF Settlement -->
        <div class="em-section">
          <h4 class="em-section-title">Final Settlement (FnF)</h4>
          <p v-if="selectedExit.fnf_amount" class="em-fnf-done">Processed: ₹{{ selectedExit.fnf_amount.toLocaleString() }}</p>
          <div v-else class="em-row-gap">
            <div class="em-form-field" style="flex:1">
              <label class="em-form-label">FnF Amount</label>
              <input v-model="fnfAmount" type="number" step="0.01" class="em-input em-mono" placeholder="0.00" />
            </div>
            <button class="em-btn-primary" style="align-self:flex-end" :disabled="actionLoading" @click="processFnf">Process FnF</button>
          </div>
        </div>
      </template>
    </div>

    <!-- Exit List -->
    <div v-if="loading" class="em-loading"><div class="em-spinner" /></div>
    <div v-else class="em-table-card">
      <table class="em-table">
        <thead>
          <tr><th>Employee</th><th>Exit Type</th><th>Last Working Date</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="exit in exits" :key="exit.id" class="em-tr-click" @click="selectExit(exit)">
            <td class="em-td-primary">{{ exit.employee_name }}</td>
            <td><span class="em-pill" :class="typeTone(exit.exit_type)">{{ exit.exit_type.replace(/_/g, ' ') }}</span></td>
            <td class="em-mono">{{ exit.last_working_date }}</td>
            <td><span class="em-pill" :class="statusTone(exit.status)">{{ exit.status.replace(/_/g, ' ') }}</span></td>
            <td><button class="em-link-btn" @click.stop="selectExit(exit)">View</button></td>
          </tr>
          <tr v-if="exits.length === 0"><td colspan="5" class="em-empty">No exit records</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Initiate Exit Modal -->
    <Teleport to="body">
      <div v-if="showInitiateForm" class="em-overlay" @click.self="showInitiateForm = false">
        <div class="em-modal">
          <h3 class="em-modal-title">Initiate Exit</h3>
          <div class="em-form-field">
            <label class="em-form-label">Employee</label>
            <select v-model="initiateForm.employee_id" class="em-input">
              <option value="">Select employee</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name }}</option>
            </select>
          </div>
          <div class="em-form-field">
            <label class="em-form-label">Exit Type</label>
            <select v-model="initiateForm.exit_type" class="em-input">
              <option v-for="t in exitTypes" :key="t" :value="t">{{ t.replace(/_/g, ' ') }}</option>
            </select>
          </div>
          <div class="em-form-field">
            <label class="em-form-label">Reason</label>
            <textarea v-model="initiateForm.reason" rows="3" class="em-input" />
          </div>
          <div class="em-two-col">
            <div class="em-form-field">
              <label class="em-form-label">Last Working Date</label>
              <input v-model="initiateForm.last_working_date" type="date" class="em-input" />
            </div>
            <div class="em-form-field">
              <label class="em-form-label">Notice Period (days)</label>
              <input v-model.number="initiateForm.notice_period_days" type="number" class="em-input em-mono" />
            </div>
          </div>
          <div class="em-modal-actions">
            <button class="em-btn-ghost" @click="showInitiateForm = false">Cancel</button>
            <button class="em-btn-primary" :disabled="initiating" @click="initiateExit">
              {{ initiating ? 'Initiating…' : 'Initiate' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.em-wrap { display: flex; flex-direction: column; gap: 16px; }
.em-bar { display: flex; align-items: center; justify-content: space-between; }
.em-page-title { font-size: 14px; font-weight: 600; color: #EEF0F4; }

.em-detail-panel { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.em-detail-header { display: flex; align-items: center; justify-content: space-between; }
.em-detail-name { font-size: 15px; font-weight: 600; color: #EEF0F4; }
.em-close-btn { background: none; border: none; color: #7A8299; font-size: 13px; cursor: pointer; }
.em-close-btn:hover { color: #EEF0F4; }

.em-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.em-meta-label { font-size: 10.5px; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 4px; }
.em-meta-value { font-size: 13px; color: #EEF0F4; margin: 0; }

.em-section { border-top: 1px solid #232936; padding-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.em-section-title { margin: 0; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.em-text-muted { margin: 0; font-size: 12px; color: #7A8299; }
.em-text { margin: 0; font-size: 13px; color: #B6BED0; }
.em-fnf-done { margin: 0; font-size: 13px; color: #4DD39A; font-family: 'JetBrains Mono', monospace; }

.em-row-gap { display: flex; gap: 12px; align-items: flex-start; }
.em-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.em-form-field { display: flex; flex-direction: column; gap: 6px; }
.em-form-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.em-input {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 8px 12px; outline: none;
  transition: border-color 0.15s; width: 100%; box-sizing: border-box; resize: vertical;
}
.em-input:focus { border-color: #6B5BFF; }
.em-input option { background: #161A23; }
.em-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

.em-checklist { display: flex; flex-direction: column; gap: 4px; }
.em-check-item { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.em-check-item:hover { background: rgba(107,91,255,0.06); }
.em-checkbox { accent-color: #6B5BFF; width: 14px; height: 14px; }
.em-check-done { font-size: 13px; color: #7A8299; text-decoration: line-through; }
.em-check-pending { font-size: 13px; color: #EEF0F4; }

.em-table-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.em-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.em-table thead tr { background: rgba(35,41,54,0.5); }
.em-table th { padding: 10px 14px; font-size: 10.5px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.em-table tbody tr { border-top: 1px solid #232936; }
.em-tr-click { cursor: pointer; }
.em-tr-click:hover { background: rgba(107,91,255,0.04); }
.em-table td { padding: 10px 14px; color: #B6BED0; }
.em-td-primary { color: #EEF0F4 !important; font-weight: 500; }
.em-empty { text-align: center; padding: 28px !important; color: #7A8299 !important; }
.em-link-btn { background: none; border: none; font-size: 12px; color: #6B5BFF; cursor: pointer; padding: 0; }
.em-link-btn:hover { opacity: 0.8; }

.em-pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; }
.tone-green { background: rgba(77,211,154,0.12); color: #4DD39A; }
.tone-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.tone-blue { background: rgba(107,91,255,0.15); color: #6B5BFF; }
.tone-accent { background: rgba(155,110,255,0.12); color: #9B6EFF; }
.tone-orange { background: rgba(245,166,35,0.1); color: #F5A623; }
.tone-red { background: rgba(243,130,136,0.12); color: #F38288; }
.tone-muted { background: rgba(122,130,153,0.12); color: #7A8299; }

.em-loading { display: flex; justify-content: center; padding: 40px; }
.em-spinner { width: 28px; height: 28px; border: 2px solid #232936; border-top-color: #6B5BFF; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.em-btn-primary {
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: opacity 0.15s;
}
.em-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.em-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.em-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 14px; font-size: 13px; cursor: pointer; transition: background 0.15s;
}
.em-btn-ghost:hover { background: #232936; }

.em-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
.em-modal {
  background: #161A23; border: 1px solid #232936; border-radius: 12px;
  width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 24px;
  display: flex; flex-direction: column; gap: 14px;
}
.em-modal-title { margin: 0; font-size: 15px; font-weight: 600; color: #EEF0F4; }
.em-modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
</style>
