<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import api from '@/services/api'

const props = defineProps<{ employeeId: number }>()

const shifts       = ref<any[]>([])
const shiftHistory = ref<any[]>([])
const activeShift  = ref<any>(null)
const assignLoading = ref(false)
const assignError   = ref('')

const form = reactive({ shift_id: '', effective_from: '', effective_to: '', notes: '' })

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
}

async function loadShifts() {
  try { const { data } = await api.get('/employee-shifts/list'); shifts.value = Array.isArray(data) ? data : data?.data || [] } catch {}
}
async function loadHistory() {
  try {
    const { data } = await api.get(`/employees/${props.employeeId}/shifts`)
    shiftHistory.value = Array.isArray(data) ? data : data?.data || []
    activeShift.value = shiftHistory.value.find(s => s.is_active) || null
  } catch {}
}
async function assignShift() {
  assignError.value = ''; assignLoading.value = true
  try {
    await api.post(`/employees/${props.employeeId}/assign-shift`, form)
    await loadHistory()
    Object.assign(form, { shift_id: '', effective_from: '', effective_to: '', notes: '' })
  } catch (e: any) {
    assignError.value = e?.response?.data?.message || 'Failed to assign shift'
  } finally { assignLoading.value = false }
}

onMounted(() => { loadShifts(); loadHistory() })
</script>

<template>
  <div class="sa-wrap">
    <!-- Active shift banner -->
    <div v-if="activeShift" class="sa-active">
      <div class="sa-active-label">Active Shift</div>
      <div class="sa-active-name">{{ activeShift.shift?.shift_name }}</div>
      <div class="sa-active-time">{{ activeShift.shift?.start_time }} – {{ activeShift.shift?.end_time }} · {{ activeShift.shift?.working_hours }}h</div>
      <div class="sa-active-since">Effective: {{ fmtDate(activeShift.effective_from) }}</div>
    </div>

    <!-- Assign form -->
    <div class="sa-card">
      <h3 class="sa-title">Assign Shift</h3>
      <form @submit.prevent="assignShift" class="sa-form">
        <div class="sa-grid">
          <div class="sa-field">
            <label class="sa-label">Shift <span class="req">*</span></label>
            <select v-model="form.shift_id" required class="sa-input">
              <option value="">Select shift</option>
              <option v-for="s in shifts" :key="s.id" :value="s.id">{{ s.shift_name }} ({{ s.start_time }} – {{ s.end_time }})</option>
            </select>
          </div>
          <div class="sa-field">
            <label class="sa-label">Effective From <span class="req">*</span></label>
            <input v-model="form.effective_from" type="date" required class="sa-input" />
          </div>
          <div class="sa-field">
            <label class="sa-label">Effective To <span class="sa-opt">(optional)</span></label>
            <input v-model="form.effective_to" type="date" class="sa-input" />
          </div>
          <div class="sa-field">
            <label class="sa-label">Notes</label>
            <input v-model="form.notes" type="text" class="sa-input" placeholder="e.g. Temporary change" />
          </div>
        </div>
        <div v-if="assignError" class="sa-error">{{ assignError }}</div>
        <div class="sa-actions">
          <button type="submit" class="sa-btn sa-btn--primary" :disabled="assignLoading">{{ assignLoading ? 'Assigning…' : 'Assign Shift' }}</button>
        </div>
      </form>
    </div>

    <!-- History -->
    <div class="sa-card">
      <h3 class="sa-title">Shift History</h3>
      <div v-if="shiftHistory.length" class="sa-table-wrap">
        <table class="sa-table">
          <thead><tr>
            <th class="sa-th">Shift</th>
            <th class="sa-th">Time</th>
            <th class="sa-th">From</th>
            <th class="sa-th">To</th>
            <th class="sa-th">Status</th>
          </tr></thead>
          <tbody>
            <tr v-for="sh in shiftHistory" :key="sh.id" class="sa-tr">
              <td class="sa-td sa-td--bold">{{ sh.shift?.shift_name }}</td>
              <td class="sa-td sa-td--muted">{{ sh.shift?.start_time }} – {{ sh.shift?.end_time }}</td>
              <td class="sa-td sa-td--muted">{{ fmtDate(sh.effective_from) }}</td>
              <td class="sa-td sa-td--muted">{{ sh.effective_to ? fmtDate(sh.effective_to) : '—' }}</td>
              <td class="sa-td">
                <span :class="['sa-badge', sh.is_active ? 'sa-badge--on' : 'sa-badge--off']">{{ sh.is_active ? 'Active' : 'Inactive' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="sa-empty">No shift history</div>
    </div>
  </div>
</template>

<style scoped>
.sa-wrap { display: flex; flex-direction: column; gap: 16px; }
.sa-active { background: rgba(54,211,153,.08); border: 1px solid rgba(54,211,153,.25); border-radius: 10px; padding: 14px 16px; }
.sa-active-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--green); margin-bottom: 4px; }
.sa-active-name  { font-size: 1rem; font-weight: 600; color: var(--text); }
.sa-active-time  { font-size: 0.85rem; color: var(--muted); margin-top: 2px; }
.sa-active-since { font-size: 0.75rem; color: var(--muted); margin-top: 2px; }
.sa-card  { background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 16px; }
.sa-title { font-size: 0.9rem; font-weight: 600; color: var(--text); margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,.05); }
.sa-form  { display: flex; flex-direction: column; gap: 12px; }
.sa-grid  { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (max-width: 640px) { .sa-grid { grid-template-columns: 1fr; } }
.sa-field { display: flex; flex-direction: column; gap: 5px; }
.sa-label { font-size: 0.78rem; font-weight: 500; color: var(--muted); }
.sa-opt   { font-weight: 400; }
.req { color: var(--red); }
.sa-input { background: var(--surface2); border: 1px solid rgba(255,255,255,.08); border-radius: 7px; padding: 7px 10px; font-size: 0.875rem; color: var(--text); outline: none; width: 100%; box-sizing: border-box; }
.sa-input:focus { border-color: var(--accent); }
.sa-error   { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.25); border-radius: 7px; padding: 8px 12px; font-size: 0.8rem; color: var(--red); }
.sa-actions { display: flex; justify-content: flex-end; }
.sa-btn { padding: 7px 18px; border-radius: 7px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; }
.sa-btn:disabled { opacity: .45; cursor: not-allowed; }
.sa-btn--primary { background: var(--accent); color: #fff; }
.sa-btn--primary:not(:disabled):hover { opacity: .88; }
.sa-table-wrap { border: 1px solid rgba(255,255,255,.06); border-radius: 8px; overflow: hidden; }
.sa-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.sa-th { padding: 8px 12px; text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); background: var(--surface2); border-bottom: 1px solid rgba(255,255,255,.06); }
.sa-tr:not(:last-child) td { border-bottom: 1px solid rgba(255,255,255,.04); }
.sa-td { padding: 9px 12px; vertical-align: middle; color: var(--text); }
.sa-td--muted { color: var(--muted); }
.sa-td--bold  { font-weight: 500; }
.sa-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
.sa-badge--on  { background: rgba(54,211,153,.15); color: var(--green); }
.sa-badge--off { background: rgba(107,114,128,.15); color: var(--muted); }
.sa-empty { padding: 24px; text-align: center; font-size: 0.875rem; color: var(--muted); }
</style>
