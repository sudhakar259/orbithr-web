<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <p class="page-sub">Track the status of your attendance regularization requests</p>
      </div>
      <button class="btn-new" @click="openNewForm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/>
        </svg>
        New Request
      </button>
    </div>

    <!-- Filter Tabs -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        :class="['tab', activeTab === tab.value && 'tab--active']"
      >
        {{ tab.label }}
        <span v-if="tabCounts[tab.value as keyof typeof tabCounts] > 0" class="tab-count">
          {{ tabCounts[tab.value as keyof typeof tabCounts] }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-center">
      <div class="spinner"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert-error">{{ error }}</div>

    <!-- Empty -->
    <div v-else-if="filteredRequests.length === 0" class="state-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <p class="state-empty__msg">
        {{ activeTab === 'pending' ? 'No pending regularization requests' : 'No requests found' }}
      </p>
      <button class="btn-new" @click="openNewForm">Submit your first request</button>
    </div>

    <!-- Requests list -->
    <div v-else class="list">
      <div v-for="req in filteredRequests" :key="req.id" class="card">

        <!-- Card header -->
        <div class="card-head">
          <div class="date-block">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M8 2v4M16 2v4M3 10h18"/>
            </svg>
            {{ formatDate(req.attendance?.attendance_date) }}
          </div>
          <div class="head-right">
            <span :class="['badge', `badge--${req.status}`]">
              {{ formatStatus(req.status) }}
              <span v-if="req.auto_approved" class="badge-note">(Auto)</span>
            </span>
            <span v-if="req.status === 'approved'" class="att-updated">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              Attendance Updated
            </span>
          </div>
        </div>

        <!-- Details -->
        <div class="card-body">

          <!-- Meta row -->
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Type</div>
              <div class="meta-value">{{ formatRegType(req.regularization_type) }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Submitted</div>
              <div class="meta-value">{{ formatDate(req.created_at) }}</div>
            </div>
            <div class="meta-item" v-if="req.manager?.full_name">
              <div class="meta-label">Assigned To</div>
              <div class="meta-value">{{ req.manager.full_name }}</div>
            </div>
          </div>

          <!-- Proposed changes -->
          <div class="proposed">
            <h4 class="section-label">Proposed Changes</h4>
            <div class="proposed-grid">
              <div class="proposed-item">
                <div class="prop-key">Check In</div>
                <div class="prop-val">{{ req.check_in ? formatTime(req.check_in) : '—' }}</div>
              </div>
              <div class="proposed-item">
                <div class="prop-key">Check Out</div>
                <div class="prop-val">{{ req.check_out ? formatTime(req.check_out) : '—' }}</div>
              </div>
              <div class="proposed-item">
                <div class="prop-key">Working Hrs</div>
                <div class="prop-val">{{ req.working_hours ? `${req.working_hours}h` : '—' }}</div>
              </div>
              <div class="proposed-item">
                <div class="prop-key">Overtime Hrs</div>
                <div class="prop-val">{{ req.overtime_hours ? `${req.overtime_hours}h` : '—' }}</div>
              </div>
            </div>
          </div>

          <!-- Reason -->
          <div class="reason-block">
            <h4 class="section-label">Your Reason</h4>
            <p class="reason-text">{{ req.reason }}</p>
            <div v-if="req.notes" class="mt-2">
              <p class="notes-label">Additional Notes:</p>
              <p class="reason-text">{{ req.notes }}</p>
            </div>
          </div>

          <!-- Decision details (approved / rejected) -->
          <div v-if="req.status !== 'pending'" :class="['decision-block', `decision-block--${req.status}`]">
            <div class="decision-head">
              <span class="decision-icon">{{ req.status === 'approved' ? '✅' : '❌' }}</span>
              <strong>{{ req.status === 'approved' ? 'Approved' : 'Rejected' }}</strong>
              <span class="decision-by">
                by {{ req.approved_by_user?.name || 'System' }}
                <span v-if="req.auto_approved">(Auto)</span>
              </span>
              <span class="decision-date">{{ formatDate(req.approved_at) }}</span>
            </div>
            <div v-if="req.approval_notes" class="decision-notes">
              {{ req.approval_notes }}
            </div>
            <!-- EL deduction warning (shown only if metadata indicates it) -->
            <div v-if="req.status === 'approved' && (req.attendance as Record<string, Record<string, unknown>> | undefined)?.['metadata']?.['el_deducted']" class="el-notice">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 8v4M12 16h.01"/>
              </svg>
              1 Earned Leave deducted (attendance was beyond 3-day window)
            </div>
          </div>

          <!-- Pending info banner -->
          <div v-else class="pending-banner">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
              <path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 8v4M12 16h.01"/>
            </svg>
            Awaiting review from your manager. You cannot edit this request while it is pending.
          </div>

        </div>
      </div>
    </div>

    <!-- ── New Request Modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
        <div class="modal">

          <div class="modal-head">
            <h2 class="modal-title">New Regularization Request</h2>
            <button class="modal-close" @click="closeForm" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">

            <!-- Step 1: Pick a date -->
            <div class="field">
              <label class="label">Attendance Date <span class="req">*</span></label>
              <input
                type="date"
                v-model="form.date"
                :max="todayStr"
                class="input"
                @change="onDateChange"
              />
            </div>

            <!-- Attendance lookup state -->
            <div v-if="lookupLoading" class="lookup-state lookup-state--loading">
              <div class="mini-spinner"></div>
              Looking up attendance record…
            </div>

            <div v-else-if="form.date && lookupDone && !attendanceRecord" class="lookup-state lookup-state--error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 8v4M12 16h.01"/>
              </svg>
              No attendance record found for this date. Please contact HR to create one first.
            </div>

            <template v-else-if="attendanceRecord">

              <!-- Existing punch summary -->
              <div class="existing-punch">
                <div class="punch-label">Existing punch record</div>
                <div class="punch-row">
                  <div class="punch-item">
                    <span class="punch-key">Check In</span>
                    <span class="punch-val">{{ attendanceRecord.check_in ? formatTime(attendanceRecord.check_in) : 'Not recorded' }}</span>
                  </div>
                  <div class="punch-item">
                    <span class="punch-key">Check Out</span>
                    <span class="punch-val">{{ attendanceRecord.check_out ? formatTime(attendanceRecord.check_out) : 'Not recorded' }}</span>
                  </div>
                  <div class="punch-item">
                    <span class="punch-key">Hours</span>
                    <span class="punch-val">{{ attendanceRecord.working_hours ? `${attendanceRecord.working_hours}h` : '—' }}</span>
                  </div>
                  <div class="punch-item">
                    <span class="punch-key">Status</span>
                    <span class="punch-val">{{ attendanceRecord.status }}</span>
                  </div>
                </div>
              </div>

              <!-- Regularization type -->
              <div class="field">
                <label class="label">Regularization Type <span class="req">*</span></label>
                <select v-model="form.regularization_type" class="input">
                  <option value="">Select a type…</option>
                  <option value="forgot_punch">Forgot to Punch</option>
                  <option value="system_error">System Error</option>
                  <option value="late_arrival">Late Arrival</option>
                  <option value="early_departure">Early Departure</option>
                  <option value="work_from_home">Work from Home</option>
                  <option value="official_work">Official Work</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <!-- Proposed times -->
              <div class="field-row">
                <div class="field">
                  <label class="label">Proposed Check In</label>
                  <input type="time" v-model="form.check_in" class="input" />
                  <p class="hint">Leave blank to keep unchanged</p>
                </div>
                <div class="field">
                  <label class="label">Proposed Check Out</label>
                  <input type="time" v-model="form.check_out" class="input" />
                  <p class="hint">Leave blank to keep unchanged</p>
                </div>
              </div>

              <!-- Reason -->
              <div class="field">
                <label class="label">Reason <span class="req">*</span></label>
                <textarea
                  v-model="form.reason"
                  class="input textarea"
                  placeholder="Describe why this regularization is needed (min 10 characters)…"
                  rows="3"
                ></textarea>
                <p class="hint">{{ form.reason.length }} / 500 characters</p>
              </div>

              <!-- Notes -->
              <div class="field">
                <label class="label">Additional Notes</label>
                <textarea
                  v-model="form.notes"
                  class="input textarea"
                  placeholder="Any additional context (optional)…"
                  rows="2"
                ></textarea>
              </div>

              <!-- Submit error -->
              <div v-if="submitError" class="alert-error">{{ submitError }}</div>

              <!-- Actions -->
              <div class="modal-actions">
                <button class="btn-cancel" @click="closeForm" :disabled="submitting">Cancel</button>
                <button class="btn-submit" @click="submitForm" :disabled="submitting || !canSubmit">
                  <div v-if="submitting" class="mini-spinner"></div>
                  {{ submitting ? 'Submitting…' : 'Submit Request' }}
                </button>
              </div>

            </template>

          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { regularizationService, type RegularizationRequest } from '@/services/regularization'
import { attendanceService, type AttendanceRecord } from '@/services/attendance'

const loading = ref(false)
const error = ref('')
const requests = ref<RegularizationRequest[]>([])
const activeTab = ref('pending')

// ── Modal state ──────────────────────────────────────────────────────────────
const showForm = ref(false)
const lookupLoading = ref(false)
const lookupDone = ref(false)
const attendanceRecord = ref<AttendanceRecord | null>(null)
const submitting = ref(false)
const submitError = ref('')

const todayStr = new Date().toISOString().split('T')[0]

const form = ref({
  date: '',
  regularization_type: '',
  check_in: '',
  check_out: '',
  reason: '',
  notes: '',
})

const canSubmit = computed(() =>
  !!attendanceRecord.value &&
  !!form.value.regularization_type &&
  form.value.reason.length >= 10
)

// ── Tabs / filter ────────────────────────────────────────────────────────────
const tabs = [
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all',      label: 'All' },
]

const filteredRequests = computed(() =>
  activeTab.value === 'all' ? requests.value : requests.value.filter(r => r.status === activeTab.value)
)

const tabCounts = computed(() => ({
  pending:  requests.value.filter(r => r.status === 'pending').length,
  approved: requests.value.filter(r => r.status === 'approved').length,
  rejected: requests.value.filter(r => r.status === 'rejected').length,
  all:      requests.value.length,
}))

// ── Data fetch ───────────────────────────────────────────────────────────────
const fetchRequests = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await regularizationService.getMyRequests()
    requests.value = result.data || []
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Failed to load your regularization requests'
  } finally {
    loading.value = false
  }
}

// ── Modal helpers ────────────────────────────────────────────────────────────
function openNewForm() {
  form.value = { date: '', regularization_type: '', check_in: '', check_out: '', reason: '', notes: '' }
  attendanceRecord.value = null
  lookupDone.value = false
  submitError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

async function onDateChange() {
  if (!form.value.date) {
    attendanceRecord.value = null
    lookupDone.value = false
    return
  }
  lookupLoading.value = true
  lookupDone.value = false
  attendanceRecord.value = null
  try {
    const result = await attendanceService.getAttendanceRecords({
      start_date: form.value.date,
      end_date: form.value.date,
    })
    attendanceRecord.value = result.records?.[0] ?? null
  } catch {
    attendanceRecord.value = null
  } finally {
    lookupLoading.value = false
    lookupDone.value = true
  }
}

async function submitForm() {
  if (!canSubmit.value || !attendanceRecord.value) return
  submitting.value = true
  submitError.value = ''
  try {
    await regularizationService.createRequest({
      attendance_id: Number(attendanceRecord.value.id),
      regularization_type: form.value.regularization_type,
      reason: form.value.reason,
      notes: form.value.notes || null,
      check_in: form.value.check_in || null,
      check_out: form.value.check_out || null,
    })
    closeForm()
    await fetchRequests()
    activeTab.value = 'pending'
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string; message?: string } } }
    submitError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to submit request. Please try again.'
  } finally {
    submitting.value = false
  }
}

// ── Formatters ───────────────────────────────────────────────────────────────
const formatDate = (d?: string | null) => d
  ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : ''

const formatTime = (t?: string | null) => {
  if (!t) return '—'
  // Handle both "HH:MM:SS" and full ISO datetime
  const timeStr = t.includes('T') ? t : `1970-01-01T${t}`
  return new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const formatStatus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const formatRegType = (type: string) => ({
  forgot_punch:     'Forgot to Punch',
  system_error:     'System Error',
  late_arrival:     'Late Arrival',
  early_departure:  'Early Departure',
  work_from_home:   'Work from Home',
  official_work:    'Official Work',
  other:            'Other',
}[type] ?? type)

onMounted(fetchRequests)
</script>

<style scoped>
/* ── layout ──────────────────────────────────────────────────────────────── */
.page        { display: flex; flex-direction: column; gap: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-sub    { font-size: 13px; color: var(--muted); margin: 4px 0 0; }

/* ── new request button ───────────────────────────────────────────────────*/
.btn-new {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 16px; font-size: 13px; font-weight: 500;
  background: var(--accent); color: #fff;
  border: none; border-radius: 8px; cursor: pointer;
  transition: opacity .15s;
  flex-shrink: 0;
}
.btn-new:hover { opacity: .88; }

/* ── tabs ─────────────────────────────────────────────────────────────────*/
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--surface3); }
.tab {
  padding: 8px 16px; font-size: 13px; font-weight: 500; color: var(--muted);
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: color .15s, border-color .15s;
  display: flex; align-items: center; gap: 6px;
}
.tab:hover   { color: var(--text); }
.tab--active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-count {
  font-size: 11px; font-weight: 600; padding: 1px 6px;
  background: var(--surface3); color: var(--muted); border-radius: 10px;
}

/* ── states ───────────────────────────────────────────────────────────────*/
.state-center { display: flex; justify-content: center; padding: 48px; }
.spinner {
  width: 28px; height: 28px;
  border: 2.5px solid rgba(79,126,255,.2); border-top-color: var(--accent);
  border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.alert-error {
  background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.3);
  color: var(--red); padding: 12px 16px; border-radius: 8px; font-size: 13px;
}

.state-empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 48px; color: var(--muted);
  background: var(--surface); border: 1px solid var(--surface3); border-radius: 12px;
}
.state-empty__msg { font-size: 14px; }

/* ── list / card ──────────────────────────────────────────────────────────*/
.list { display: flex; flex-direction: column; gap: 16px; }
.card {
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 12px; overflow: hidden;
}

/* card header */
.card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid var(--surface2);
  flex-wrap: wrap; gap: 10px;
}
.date-block {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600; color: var(--text);
}
.date-block svg { color: var(--muted); }

.head-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.att-updated {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 500; color: var(--green);
  background: rgba(54,211,153,.1); padding: 3px 8px; border-radius: 20px;
}

/* badges */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; padding: 3px 10px;
  border-radius: 20px; letter-spacing: .3px;
}
.badge--pending  { background: rgba(249,168,37,.12); color: var(--yellow); border: 1px solid rgba(249,168,37,.25); }
.badge--approved { background: rgba(54,211,153,.12);  color: var(--green);  border: 1px solid rgba(54,211,153,.25); }
.badge--rejected { background: rgba(255,107,107,.12); color: var(--red);    border: 1px solid rgba(255,107,107,.25); }
.badge-note      { font-weight: 400; opacity: .8; }

/* card body */
.card-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }

.meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); }
.meta-value { font-size: 13px; font-weight: 500; color: var(--text); margin-top: 4px; }

.proposed      { background: var(--surface2); border-radius: 8px; padding: 14px 16px; }
.proposed-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 10px; }
.prop-key      { font-size: 11px; color: var(--muted); }
.prop-val      { font-size: 13px; font-weight: 500; color: var(--text); margin-top: 3px; }

.section-label {
  font-size: 12px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: .5px; margin: 0;
}

.reason-text { font-size: 13px; color: var(--text); background: var(--surface2); padding: 10px 12px; border-radius: 6px; margin-top: 8px; line-height: 1.5; }
.notes-label { font-size: 11px; color: var(--muted); margin-top: 8px; }

/* decision block */
.decision-block {
  border-radius: 8px; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 8px;
}
.decision-block--approved { background: rgba(54,211,153,.08);  border: 1px solid rgba(54,211,153,.2); }
.decision-block--rejected { background: rgba(255,107,107,.08); border: 1px solid rgba(255,107,107,.2); }

.decision-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 13px; color: var(--text);
}
.decision-icon { font-size: 14px; }
.decision-by   { color: var(--muted); font-size: 12px; }
.decision-date { color: var(--muted); font-size: 12px; margin-left: auto; }

.decision-notes {
  font-size: 13px; color: var(--text);
  background: var(--surface2); padding: 10px 12px; border-radius: 6px; line-height: 1.5;
}

.el-notice {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; color: var(--yellow);
  background: rgba(249,168,37,.08); border: 1px solid rgba(249,168,37,.2);
  padding: 8px 12px; border-radius: 6px;
}

/* pending info banner */
.pending-banner {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 12px; color: var(--muted);
  background: var(--surface2); border: 1px solid var(--surface3);
  padding: 10px 12px; border-radius: 6px; line-height: 1.5;
}
.pending-banner svg { flex-shrink: 0; margin-top: 1px; }

.mt-2 { margin-top: 8px; }

/* ── modal ────────────────────────────────────────────────────────────────*/
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}

.modal {
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 16px; width: 100%; max-width: 560px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,.5);
}

.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px; border-bottom: 1px solid var(--surface3);
  flex-shrink: 0;
}
.modal-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
.modal-close {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: none; border: none; color: var(--muted);
  cursor: pointer; transition: background .15s, color .15s;
}
.modal-close:hover { background: var(--surface2); color: var(--text); }

.modal-body {
  padding: 20px 24px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 18px;
}

/* ── form fields ──────────────────────────────────────────────────────────*/
.field { display: flex; flex-direction: column; gap: 6px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.label {
  font-size: 12px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: .5px;
}
.req { color: var(--red); }

.input {
  background: var(--surface2); border: 1px solid var(--surface3);
  color: var(--text); border-radius: 8px; padding: 9px 12px;
  font-size: 13px; outline: none; transition: border-color .15s;
  width: 100%; box-sizing: border-box;
}
.input:focus { border-color: var(--accent); }
.textarea { resize: vertical; min-height: 72px; font-family: inherit; line-height: 1.5; }
.hint { font-size: 11px; color: var(--muted); margin: 0; }

/* date / time input color fix for dark theme */
.input[type="date"],
.input[type="time"],
select.input option { color-scheme: dark; }

/* ── lookup states ────────────────────────────────────────────────────────*/
.lookup-state {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; padding: 12px 14px; border-radius: 8px;
}
.lookup-state--loading { background: var(--surface2); color: var(--muted); }
.lookup-state--error {
  background: rgba(255,107,107,.08); border: 1px solid rgba(255,107,107,.2);
  color: var(--red);
}

.mini-spinner {
  width: 14px; height: 14px; flex-shrink: 0;
  border: 2px solid rgba(79,126,255,.25); border-top-color: var(--accent);
  border-radius: 50%; animation: spin .7s linear infinite;
}

/* ── existing punch summary ───────────────────────────────────────────────*/
.existing-punch {
  background: var(--surface2); border: 1px solid var(--surface3);
  border-radius: 8px; padding: 12px 14px;
}
.punch-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); margin-bottom: 10px; }
.punch-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.punch-item { display: flex; flex-direction: column; gap: 3px; }
.punch-key { font-size: 11px; color: var(--muted); }
.punch-val { font-size: 13px; font-weight: 500; color: var(--text); }

/* ── modal actions ────────────────────────────────────────────────────────*/
.modal-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  padding-top: 4px;
}
.btn-cancel {
  padding: 9px 18px; font-size: 13px; font-weight: 500;
  background: var(--surface2); color: var(--muted);
  border: 1px solid var(--surface3); border-radius: 8px; cursor: pointer;
  transition: color .15s, border-color .15s;
}
.btn-cancel:hover:not(:disabled) { color: var(--text); border-color: var(--text); }
.btn-cancel:disabled { opacity: .5; cursor: not-allowed; }

.btn-submit {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 20px; font-size: 13px; font-weight: 600;
  background: var(--accent); color: #fff;
  border: none; border-radius: 8px; cursor: pointer;
  transition: opacity .15s;
}
.btn-submit:hover:not(:disabled) { opacity: .88; }
.btn-submit:disabled { opacity: .45; cursor: not-allowed; }

@media (max-width: 640px) {
  .meta-grid     { grid-template-columns: 1fr 1fr; }
  .proposed-grid { grid-template-columns: 1fr 1fr; }
  .field-row     { grid-template-columns: 1fr; }
  .punch-row     { grid-template-columns: 1fr 1fr; }
}
</style>
