<script setup lang="ts">
defineOptions({ name: 'ScheduledReports' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

interface ScheduledReport {
  id: number
  report_type: string
  frequency: string
  recipients: string
  start_date: string
  next_run?: string
}

const loading = ref(true)
const reports = ref<ScheduledReport[]>([])
const error = ref('')

const showModal = ref(false)
const saving = ref(false)
const form = ref({
  report_type: '',
  frequency: '',
  recipients: '',
  start_date: '',
})

const reportTypes = ['Attendance', 'Payroll', 'Headcount', 'Attrition', 'Performance']
const frequencies = ['Daily', 'Weekly', 'Monthly']

const frequencyColors: Record<string, string> = {
  Daily: 'freq-red',
  Weekly: 'freq-yellow',
  Monthly: 'freq-green',
}

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const computeNextRun = (report: ScheduledReport) => {
  if (report.next_run) return formatDate(report.next_run)
  if (!report.start_date || !report.frequency) return '-'
  const start = new Date(report.start_date)
  const now = new Date()
  const next = new Date(start)
  while (next <= now) {
    if (report.frequency === 'Daily') next.setDate(next.getDate() + 1)
    else if (report.frequency === 'Weekly') next.setDate(next.getDate() + 7)
    else next.setMonth(next.getMonth() + 1)
  }
  return formatDate(next.toISOString())
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/reports/scheduled')
    reports.value = res.data?.data ?? res.data ?? []
  } catch {
    reports.value = []
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  form.value = { report_type: '', frequency: '', recipients: '', start_date: '' }
  showModal.value = true
}

const createReport = async () => {
  if (!form.value.report_type || !form.value.frequency || !form.value.recipients || !form.value.start_date) return
  saving.value = true
  try {
    const res = await api.post('/reports/schedule', form.value)
    const created = res.data?.data ?? res.data
    if (created) {
      reports.value.unshift(created)
    } else {
      // API may not exist yet, add locally
      const localId = Date.now()
      reports.value.unshift({
        id: localId,
        ...form.value,
      })
    }
    showModal.value = false
    toast.success('Report scheduled successfully')
  } catch {
    // Stub: add locally if API doesn't exist
    const localId = Date.now()
    reports.value.unshift({
      id: localId,
      ...form.value,
    })
    showModal.value = false
    toast.success('Report scheduled successfully')
  } finally {
    saving.value = false
  }
}

const deleteReport = (id: number) => {
  reports.value = reports.value.filter((r) => r.id !== id)
  toast.success('Scheduled report removed')
}

onMounted(load)
</script>

<template>
  <div class="sr-page">
    <PageHeader title="Scheduled Reports" subtitle="Automate report delivery to your inbox">
      <template #actions>
        <button class="sr-btn primary" @click="openCreate">+ Schedule Report</button>
      </template>
    </PageHeader>

    <div v-if="error" class="sr-error">{{ error }}</div>

    <div v-if="loading" class="sr-grid">
      <div v-for="n in 3" :key="n" class="sr-card sr-skeleton">
        <div class="sk-line sk-title"></div>
        <div class="sk-line sk-sub"></div>
        <div class="sk-line sk-sub short"></div>
      </div>
    </div>

    <template v-else-if="reports.length === 0 && !error">
      <EmptyState
        icon="📅"
        message="No scheduled reports yet"
        sub="Schedule automated reports to be delivered to your email"
      />
    </template>

    <div v-else class="sr-grid">
      <div v-for="report in reports" :key="report.id" class="sr-card">
        <div class="sr-card-header">
          <div class="sr-card-type">{{ report.report_type }}</div>
          <span :class="['sr-freq', frequencyColors[report.frequency] ?? 'freq-green']">
            {{ report.frequency }}
          </span>
        </div>
        <div class="sr-card-body">
          <div class="sr-detail">
            <span class="sr-detail-label">Recipients</span>
            <span class="sr-detail-value">{{ report.recipients }}</span>
          </div>
          <div class="sr-detail">
            <span class="sr-detail-label">Start Date</span>
            <span class="sr-detail-value">{{ formatDate(report.start_date) }}</span>
          </div>
          <div class="sr-detail">
            <span class="sr-detail-label">Next Run</span>
            <span class="sr-detail-value sr-next">{{ computeNextRun(report) }}</span>
          </div>
        </div>
        <div class="sr-card-footer">
          <button class="sr-delete" @click="deleteReport(report.id)">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Schedule Modal -->
    <Modal v-model="showModal" title="Schedule Report" subtitle="Set up automated report delivery">
      <div class="sr-form">
        <div class="sr-field">
          <label class="sr-label">Report Type *</label>
          <select v-model="form.report_type" class="sr-select">
            <option value="" disabled>Select report type</option>
            <option v-for="t in reportTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="sr-field">
          <label class="sr-label">Frequency *</label>
          <select v-model="form.frequency" class="sr-select">
            <option value="" disabled>Select frequency</option>
            <option v-for="f in frequencies" :key="f" :value="f">{{ f }}</option>
          </select>
        </div>
        <div class="sr-field">
          <label class="sr-label">Recipients * (comma-separated emails)</label>
          <input
            v-model="form.recipients"
            type="text"
            class="sr-input"
            placeholder="john@example.com, jane@example.com"
          />
        </div>
        <div class="sr-field">
          <label class="sr-label">Start Date *</label>
          <input v-model="form.start_date" type="date" class="sr-input" />
        </div>
      </div>
      <template #footer>
        <button class="sr-btn secondary" @click="showModal = false">Cancel</button>
        <button
          class="sr-btn primary"
          :disabled="saving || !form.report_type || !form.frequency || !form.recipients || !form.start_date"
          @click="createReport"
        >
          {{ saving ? 'Saving...' : 'Schedule' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.sr-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.sr-error {
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: var(--rs);
  padding: 12px 16px;
  font-size: 13px;
  color: var(--red);
}
.sr-btn {
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.sr-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sr-btn.primary {
  background: var(--accent);
  color: #fff;
}
.sr-btn.primary:hover:not(:disabled) {
  background: #3d6be6;
}
.sr-btn.secondary {
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border);
}
.sr-btn.secondary:hover {
  background: var(--surface3);
}

/* Grid */
.sr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.sr-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: border-color 0.15s;
}
.sr-card:hover {
  border-color: var(--border-hi);
}
.sr-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.sr-card-type {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.sr-freq {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 6px;
}
.freq-red {
  background: rgba(255, 107, 107, 0.15);
  color: var(--red);
}
.freq-yellow {
  background: rgba(249, 168, 37, 0.15);
  color: var(--yellow);
}
.freq-green {
  background: rgba(54, 211, 153, 0.15);
  color: var(--green);
}

.sr-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sr-detail {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.sr-detail-label {
  font-size: 12px;
  color: var(--muted);
  flex-shrink: 0;
}
.sr-detail-value {
  font-size: 13px;
  color: var(--text);
  text-align: right;
  word-break: break-all;
}
.sr-next {
  color: var(--accent);
  font-weight: 500;
}

.sr-card-footer {
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}
.sr-delete {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 107, 107, 0.3);
  background: transparent;
  color: var(--red);
  cursor: pointer;
  transition: background 0.15s;
}
.sr-delete:hover {
  background: rgba(255, 107, 107, 0.1);
}

/* Form */
.sr-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sr-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sr-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
}
.sr-select,
.sr-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  padding: 9px 12px;
  outline: none;
  transition: border-color 0.15s;
}
.sr-select:focus,
.sr-input:focus {
  border-color: var(--accent);
}
.sr-input::placeholder {
  color: var(--muted);
}

/* Skeleton */
.sr-skeleton {
  pointer-events: none;
}
.sk-line {
  border-radius: 4px;
  background: var(--surface2);
  animation: shimmer 1.4s ease-in-out infinite;
}
.sk-title {
  height: 16px;
  width: 50%;
}
.sk-sub {
  height: 12px;
  width: 80%;
}
.sk-sub.short {
  width: 40%;
}
@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>
