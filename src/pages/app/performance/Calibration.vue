<script setup lang="ts">
defineOptions({ name: 'CalibrationSessions' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'
import PageHeader from '@/components/ui/PageHeader.vue'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

interface CalibrationSession {
  id: number
  name: string
  status: string
  scheduled_at?: string
  facilitator?: string
  employees?: CalibrationEmployee[]
}

interface CalibrationEmployee {
  id: number
  employee_name?: string
  employee?: { first_name: string; last_name?: string }
  original_rating: number | null
  calibrated_rating: number | null
}

const toast = useToast()

const loading = ref(true)
const sessions = ref<CalibrationSession[]>([])
const selectedSession = ref<CalibrationSession | null>(null)
const detailLoading = ref(false)
const showCreateModal = ref(false)
const saving = ref(false)

const form = ref({
  name: '',
  scheduled_at: '',
})

const loadSessions = async () => {
  loading.value = true
  try {
    const res = await api.get('/calibrations')
    sessions.value = res.data?.data ?? res.data ?? []
  } catch {
    toast.error('Failed to load calibration sessions')
  } finally {
    loading.value = false
  }
}

const createSession = async () => {
  if (!form.value.name) return
  saving.value = true
  try {
    await api.post('/calibrations', {
      name: form.value.name,
      scheduled_at: form.value.scheduled_at || undefined,
    })
    toast.success('Session created')
    showCreateModal.value = false
    form.value = { name: '', scheduled_at: '' }
    await loadSessions()
  } catch {
    toast.error('Failed to create session')
  } finally {
    saving.value = false
  }
}

const viewSession = async (session: CalibrationSession) => {
  detailLoading.value = true
  selectedSession.value = session
  try {
    const res = await api.get(`/calibrations/${session.id}`)
    const data = res.data?.data ?? res.data
    selectedSession.value = data
  } catch {
    toast.error('Failed to load session details')
  } finally {
    detailLoading.value = false
  }
}

const goBack = () => {
  selectedSession.value = null
}

const completeSession = async () => {
  if (!selectedSession.value) return
  saving.value = true
  try {
    await api.post(`/calibrations/${selectedSession.value.id}/complete`)
    toast.success('Session completed')
    selectedSession.value = null
    await loadSessions()
  } catch {
    toast.error('Failed to complete session')
  } finally {
    saving.value = false
  }
}

const updateRating = async (emp: CalibrationEmployee) => {
  if (!selectedSession.value) return
  try {
    await api.patch(`/calibrations/${selectedSession.value.id}/employees/${emp.id}`, {
      calibrated_rating: emp.calibrated_rating,
    })
  } catch {
    toast.error('Failed to save rating')
  }
}

const getStatusClass = (s: string) => {
  const m: Record<string, string> = {
    draft: 'badge-draft',
    in_progress: 'badge-progress',
    completed: 'badge-completed',
  }
  return m[s] || 'badge-draft'
}

const formatDateTime = (d?: string) => {
  if (!d) return '--'
  const dt = new Date(d)
  return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getEmpName = (e: CalibrationEmployee) => {
  if (e.employee) return `${e.employee.first_name} ${e.employee.last_name || ''}`.trim()
  return e.employee_name ?? 'Employee'
}

onMounted(() => loadSessions())
</script>

<template>
  <div class="page">
    <!-- Session List -->
    <template v-if="!selectedSession">
      <PageHeader title="Calibration Sessions" subtitle="Calibrate performance ratings for consistency">
        <template #actions>
          <button class="btn-primary" @click="showCreateModal = true">+ New Session</button>
        </template>
      </PageHeader>

      <div v-if="loading" class="loader"><div class="spinner" /></div>

      <template v-else>
        <EmptyState v-if="!sessions.length" icon="🎚️" message="No calibration sessions" sub="Create your first session to start calibrating ratings" />
        <div v-else class="session-grid">
          <div v-for="s in sessions" :key="s.id" class="session-card" @click="viewSession(s)">
            <div class="sc-top">
              <span class="sc-name">{{ s.name }}</span>
              <span :class="['badge', getStatusClass(s.status)]">{{ s.status.replace('_', ' ') }}</span>
            </div>
            <div class="sc-meta">
              <span v-if="s.scheduled_at">Scheduled: {{ formatDateTime(s.scheduled_at) }}</span>
              <span v-if="s.facilitator">Facilitator: {{ s.facilitator }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Session Detail -->
    <template v-else>
      <PageHeader :title="selectedSession.name" subtitle="Review and calibrate employee ratings">
        <template #actions>
          <button class="btn-secondary" @click="goBack">Back to Sessions</button>
          <button
            v-if="selectedSession.status !== 'completed'"
            class="btn-primary"
            :disabled="saving"
            @click="completeSession"
          >
            {{ saving ? 'Completing...' : 'Complete Session' }}
          </button>
        </template>
      </PageHeader>

      <div class="session-info">
        <span :class="['badge', getStatusClass(selectedSession.status)]">{{ selectedSession.status.replace('_', ' ') }}</span>
        <span v-if="selectedSession.scheduled_at" class="si-date">{{ formatDateTime(selectedSession.scheduled_at) }}</span>
      </div>

      <div v-if="detailLoading" class="loader"><div class="spinner" /></div>

      <template v-else>
        <EmptyState v-if="!selectedSession.employees?.length" icon="👥" message="No employees in this session" />
        <div v-else class="card">
          <table class="tbl">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Original Rating</th>
                <th>Calibrated Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="emp in selectedSession.employees" :key="emp.id">
                <td class="td-name">{{ getEmpName(emp) }}</td>
                <td class="td-muted">{{ emp.original_rating ?? '--' }}</td>
                <td>
                  <input
                    v-model.number="emp.calibrated_rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    class="rating-input"
                    :disabled="selectedSession.status === 'completed'"
                    @change="updateRating(emp)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- Create Session Modal -->
    <Modal v-model="showCreateModal" title="New Calibration Session">
      <form @submit.prevent="createSession" class="form">
        <div class="field">
          <label>Session Name <span class="req">*</span></label>
          <input v-model="form.name" required class="input" placeholder="e.g. Q1 2026 Calibration" />
        </div>
        <div class="field">
          <label>Scheduled At</label>
          <input v-model="form.scheduled_at" type="datetime-local" class="input" />
        </div>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="showCreateModal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving || !form.name" @click="createSession">
          {{ saving ? 'Creating...' : 'Create' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }

.loader { display: flex; justify-content: center; padding: 48px 0; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Session grid */
.session-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.session-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 18px 20px; cursor: pointer; transition: border-color .15s; display: flex; flex-direction: column; gap: 10px; }
.session-card:hover { border-color: var(--border-hi); }
.sc-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sc-name { font-size: 14px; font-weight: 600; color: var(--text); }
.sc-meta { display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: var(--muted); }

.session-info { display: flex; align-items: center; gap: 14px; }
.si-date { font-size: 13px; color: var(--muted); }

/* Badges */
.badge { display: inline-flex; padding: 2px 10px; font-size: 11px; font-weight: 600; border-radius: 20px; text-transform: capitalize; white-space: nowrap; }
.badge-draft { background: rgba(107,114,128,.2); color: var(--muted); }
.badge-progress { background: rgba(79,126,255,.15); color: var(--accent); }
.badge-completed { background: rgba(54,211,153,.15); color: var(--green); }

/* Table */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); overflow: hidden; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th { padding: 12px 18px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); text-align: left; background: var(--surface2); border-bottom: 1px solid var(--border); }
.tbl td { padding: 14px 18px; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border); }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: rgba(255,255,255,.02); }
.td-name { font-weight: 500; }
.td-muted { color: var(--muted); }

.rating-input { width: 70px; padding: 6px 8px; font-size: 13px; color: var(--text); background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; outline: none; text-align: center; font-family: inherit; }
.rating-input:focus { border-color: var(--accent); }
.rating-input:disabled { opacity: .5; cursor: not-allowed; }

/* Buttons */
.btn-primary { padding: 8px 18px; font-size: 13px; font-weight: 600; color: #fff; background: var(--accent); border: none; border-radius: calc(var(--rs) - 2px); cursor: pointer; transition: opacity .15s; }
.btn-primary:hover { opacity: .85; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary { padding: 8px 18px; font-size: 13px; font-weight: 500; color: var(--muted); background: var(--surface2); border: 1px solid var(--border); border-radius: calc(var(--rs) - 2px); cursor: pointer; transition: color .15s; }
.btn-secondary:hover { color: var(--text); }

/* Form */
.form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.req { color: var(--red); }
.input { padding: 9px 12px; font-size: 13px; color: var(--text); background: var(--surface2); border: 1px solid var(--border); border-radius: calc(var(--rs) - 2px); outline: none; transition: border-color .15s; font-family: inherit; }
.input:focus { border-color: var(--accent); }
</style>
