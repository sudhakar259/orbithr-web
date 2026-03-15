<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Regularization Requests</h1>
        <p class="page-sub">Review and approve pending attendance regularization requests</p>
      </div>
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
        <span v-if="tabCounts[tab.value] > 0" class="tab-count">
          {{ tabCounts[tab.value] }}
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
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" stroke="currentColor"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
      </svg>
      <p class="state-empty__msg">
        {{ activeTab === 'pending' ? 'No pending regularization requests' : 'No requests found' }}
      </p>
    </div>

    <!-- Requests List -->
    <div v-else class="list">
      <div v-for="request in filteredRequests" :key="request.id" class="card">

        <!-- Card header -->
        <div class="card-head">
          <div class="emp-info">
            <div class="emp-name">{{ request.employee?.full_name }}</div>
            <div class="emp-sub">
              {{ request.employee?.employee_id }}
              <span v-if="request.employee?.designation"> · {{ request.employee?.designation }}</span>
            </div>
          </div>
          <div class="card-head-right">
            <div class="date-label">{{ formatDate(request.attendance?.attendance_date) }}</div>
            <span :class="['badge', `badge--${request.status}`]">
              {{ formatStatus(request.status) }}
              <span v-if="request.auto_approved" class="badge-note">(Auto)</span>
            </span>
          </div>
        </div>

        <!-- Details -->
        <div class="card-body">
          <!-- Meta row -->
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Type</div>
              <div class="meta-value">{{ formatRegularizationType(request.regularization_type) }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Requested On</div>
              <div class="meta-value">{{ formatDate(request.created_at) }}</div>
            </div>
            <div v-if="request.auto_approved" class="meta-item">
              <div class="meta-label">Auto-Approved On</div>
              <div class="meta-value">{{ formatDate(request.approved_at) }}</div>
            </div>
          </div>

          <!-- Proposed changes -->
          <div class="proposed">
            <h4 class="section-label">Proposed Changes</h4>
            <div class="proposed-grid">
              <div class="proposed-item">
                <div class="prop-key">Check In</div>
                <div class="prop-val">{{ request.check_in ? formatTime(request.check_in) : '—' }}</div>
              </div>
              <div class="proposed-item">
                <div class="prop-key">Check Out</div>
                <div class="prop-val">{{ request.check_out ? formatTime(request.check_out) : '—' }}</div>
              </div>
              <div class="proposed-item">
                <div class="prop-key">Working Hrs</div>
                <div class="prop-val">{{ request.working_hours ? `${request.working_hours}h` : '—' }}</div>
              </div>
              <div class="proposed-item">
                <div class="prop-key">Overtime Hrs</div>
                <div class="prop-val">{{ request.overtime_hours ? `${request.overtime_hours}h` : '—' }}</div>
              </div>
            </div>
          </div>

          <!-- Reason -->
          <div class="reason-block">
            <h4 class="section-label">Reason</h4>
            <p class="reason-text">{{ request.reason }}</p>
            <div v-if="request.notes" class="mt-2">
              <p class="notes-label">Additional Notes:</p>
              <p class="reason-text">{{ request.notes }}</p>
            </div>
          </div>

          <!-- Approval info -->
          <div v-if="request.status !== 'pending'" :class="['approval-info', `approval-info--${request.status}`]">
            <h4 class="section-label">
              {{ request.status === 'approved' ? 'Approval Details' : 'Rejection Details' }}
            </h4>
            <div class="approval-rows">
              <p>
                <span class="approval-key">{{ request.status === 'approved' ? 'Approved' : 'Rejected' }} By:</span>
                {{ request.approved_by_user?.name || '—' }}
              </p>
              <p>
                <span class="approval-key">On:</span>
                {{ formatDate(request.approved_at) }}
              </p>
              <p v-if="request.approval_notes">
                <span class="approval-key">Notes:</span>
                {{ request.approval_notes }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="request.status === 'pending'" class="card-actions">
          <button
            @click="openApprovalModal(request)"
            :disabled="!!submitting"
            class="btn btn--approve"
          >
            <span v-if="submitting === request.id">Approving…</span>
            <span v-else>✓ Approve</span>
          </button>
          <button
            @click="openRejectionModal(request)"
            :disabled="!!submitting"
            class="btn btn--reject"
          >
            <span v-if="submitting === request.id">Rejecting…</span>
            <span v-else>✗ Reject</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Approve modal -->
    <div v-if="showApprovalModal && selectedRequest" class="overlay" @click.self="showApprovalModal = false">
      <div class="modal">
        <div class="modal-head">
          <h2 class="modal-title">Approve Request</h2>
          <p class="modal-sub">
            {{ selectedRequest.employee?.full_name }} — {{ formatDate(selectedRequest.attendance?.attendance_date) }}
          </p>
        </div>
        <div class="modal-body">
          <label class="field-label">Approval Notes (Optional)</label>
          <textarea
            v-model="approvalNotes"
            rows="3"
            placeholder="Add notes about this approval…"
            class="field-input"
          ></textarea>
        </div>
        <div class="modal-foot">
          <button @click="showApprovalModal = false" class="btn btn--ghost">Cancel</button>
          <button @click="approveRequest" :disabled="!!submitting" class="btn btn--approve">
            {{ submitting ? 'Approving…' : 'Approve' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reject modal -->
    <div v-if="showRejectionModal && selectedRequest" class="overlay" @click.self="showRejectionModal = false">
      <div class="modal">
        <div class="modal-head">
          <h2 class="modal-title">Reject Request</h2>
          <p class="modal-sub">
            {{ selectedRequest.employee?.full_name }} — {{ formatDate(selectedRequest.attendance?.attendance_date) }}
          </p>
        </div>
        <div class="modal-body">
          <label class="field-label">Reason for Rejection *</label>
          <textarea
            v-model="rejectionNotes"
            rows="3"
            placeholder="Please provide the reason for rejection…"
            class="field-input"
          ></textarea>
          <p v-if="rejectionNotes.length > 0 && rejectionNotes.length < 10" class="field-hint field-hint--error">
            Minimum 10 characters required
          </p>
        </div>
        <div class="modal-foot">
          <button @click="showRejectionModal = false" class="btn btn--ghost">Cancel</button>
          <button
            @click="rejectRequest"
            :disabled="!!submitting || rejectionNotes.length < 10"
            class="btn btn--reject"
          >
            {{ submitting ? 'Rejecting…' : 'Reject' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { regularizationService } from '@/services/regularization'

interface AttendanceRegularization {
  id: number
  employee_id: number
  attendance_id: number
  employee?: { id: number; full_name: string; employee_id: string; designation: string }
  attendance?: { attendance_date: string }
  regularization_type: string
  reason: string
  notes?: string
  check_in?: string
  check_out?: string
  working_hours?: number
  overtime_hours?: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_at?: string
  approval_notes?: string
  auto_approved: boolean
  approved_by_user?: { id: number; name: string }
}

const loading = ref(false)
const error = ref('')
const submitting = ref<number | null>(null)
const requests = ref<AttendanceRegularization[]>([])
const activeTab = ref('pending')
const selectedRequest = ref<AttendanceRegularization | null>(null)
const showApprovalModal = ref(false)
const showRejectionModal = ref(false)
const approvalNotes = ref('')
const rejectionNotes = ref('')

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

const fetchRequests = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await regularizationService.getPendingRequests()
    requests.value = result.data || []
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load regularization requests'
  } finally {
    loading.value = false
  }
}

const openApprovalModal = (request: AttendanceRegularization) => {
  selectedRequest.value = request
  approvalNotes.value = ''
  showApprovalModal.value = true
}

const openRejectionModal = (request: AttendanceRegularization) => {
  selectedRequest.value = request
  rejectionNotes.value = ''
  showRejectionModal.value = true
}

const approveRequest = async () => {
  if (!selectedRequest.value) return
  submitting.value = selectedRequest.value.id
  error.value = ''
  try {
    await regularizationService.approveRequest(selectedRequest.value.id, { approval_notes: approvalNotes.value || null })
    const idx = requests.value.findIndex(r => r.id === selectedRequest.value!.id)
    if (idx !== -1) {
      requests.value[idx].status = 'approved'
      requests.value[idx].approved_at = new Date().toISOString()
      requests.value[idx].approval_notes = approvalNotes.value
    }
    showApprovalModal.value = false
    selectedRequest.value = null
    approvalNotes.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to approve request'
  } finally {
    submitting.value = null
  }
}

const rejectRequest = async () => {
  if (!selectedRequest.value || rejectionNotes.value.length < 10) return
  submitting.value = selectedRequest.value.id
  error.value = ''
  try {
    await regularizationService.rejectRequest(selectedRequest.value.id, { approval_notes: rejectionNotes.value })
    const idx = requests.value.findIndex(r => r.id === selectedRequest.value!.id)
    if (idx !== -1) {
      requests.value[idx].status = 'rejected'
      requests.value[idx].approved_at = new Date().toISOString()
      requests.value[idx].approval_notes = rejectionNotes.value
    }
    showRejectionModal.value = false
    selectedRequest.value = null
    rejectionNotes.value = ''
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to reject request'
  } finally {
    submitting.value = null
  }
}

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''
const formatTime = (t?: string) => t ? new Date(`1970-01-01T${t}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
const formatStatus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const formatRegularizationType = (type: string) => ({
  forgot_punch: 'Forgot to Punch', system_error: 'System Error', late_arrival: 'Late Arrival',
  early_departure: 'Early Departure', work_from_home: 'Work from Home', official_work: 'Official Work', other: 'Other',
}[type] ?? type)

onMounted(fetchRequests)
</script>

<style scoped>
/* ── layout ─────────────────────────────────────────────────────────────── */
.page        { display: flex; flex-direction: column; gap: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title  { font-size: 22px; font-weight: 700; color: var(--text); margin: 0; }
.page-sub    { font-size: 13px; color: var(--muted); margin: 4px 0 0; }

/* ── tabs ─────────────────────────────────────────────────────────────────*/
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--surface3); }
.tab {
  padding: 8px 16px; font-size: 13px; font-weight: 500; color: var(--muted);
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: color .15s, border-color .15s; display: flex; align-items: center; gap: 6px;
}
.tab:hover        { color: var(--text); }
.tab--active      { color: var(--accent); border-bottom-color: var(--accent); }
.tab-count        {
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

.alert-error { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.3); color: var(--red); padding: 12px 16px; border-radius: 8px; font-size: 13px; }

.state-empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 48px; color: var(--muted); background: var(--surface); border: 1px solid var(--surface3); border-radius: 12px;
}
.state-empty__msg { font-size: 14px; }

/* ── list / card ──────────────────────────────────────────────────────────*/
.list { display: flex; flex-direction: column; gap: 16px; }
.card {
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 12px; overflow: hidden; transition: border-color .15s;
}
.card:hover { border-color: var(--surface2); }

/* card header */
.card-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid var(--surface2);
}
.emp-name  { font-size: 15px; font-weight: 600; color: var(--text); }
.emp-sub   { font-size: 12px; color: var(--muted); margin-top: 3px; }
.card-head-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.date-label { font-size: 13px; font-weight: 500; color: var(--text); }

/* badges */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; letter-spacing: .3px;
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

.proposed        { background: var(--surface2); border-radius: 8px; padding: 14px 16px; }
.proposed-grid   { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 10px; }
.prop-key        { font-size: 11px; color: var(--muted); }
.prop-val        { font-size: 13px; font-weight: 500; color: var(--text); margin-top: 3px; }

.section-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin: 0; }

.reason-text  { font-size: 13px; color: var(--text); background: var(--surface2); padding: 10px 12px; border-radius: 6px; margin-top: 8px; line-height: 1.5; }
.notes-label  { font-size: 11px; color: var(--muted); margin-top: 8px; }

.approval-info {
  border-radius: 8px; padding: 14px 16px;
}
.approval-info--approved { background: rgba(54,211,153,.08);  border: 1px solid rgba(54,211,153,.2); }
.approval-info--rejected { background: rgba(255,107,107,.08); border: 1px solid rgba(255,107,107,.2); }
.approval-rows { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--text); }
.approval-key  { font-weight: 600; margin-right: 4px; }

/* card actions */
.card-actions {
  display: flex; gap: 12px; padding: 16px 24px;
  border-top: 1px solid var(--surface2); background: var(--surface2);
}

/* ── buttons ──────────────────────────────────────────────────────────────*/
.btn {
  flex: 1; padding: 8px 16px; font-size: 13px; font-weight: 600;
  border: none; border-radius: 8px; cursor: pointer; transition: opacity .15s, filter .15s;
}
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn--approve { background: var(--green);  color: #0a1a12; }
.btn--reject  { background: var(--red);    color: #1a0a0a; }
.btn--ghost   {
  background: transparent; color: var(--muted);
  border: 1px solid var(--surface3); flex: none;
}
.btn--approve:hover:not(:disabled), .btn--reject:hover:not(:disabled) { filter: brightness(1.1); }
.btn--ghost:hover { color: var(--text); border-color: var(--muted); }

/* ── modals ───────────────────────────────────────────────────────────────*/
.overlay {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,.6); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 14px; width: 100%; max-width: 480px;
  box-shadow: 0 24px 64px rgba(0,0,0,.5); overflow: hidden;
}
.modal-head { padding: 20px 24px; border-bottom: 1px solid var(--surface2); }
.modal-title { font-size: 16px; font-weight: 700; color: var(--text); margin: 0; }
.modal-sub   { font-size: 13px; color: var(--muted); margin: 6px 0 0; }
.modal-body  { padding: 20px 24px; }
.modal-foot  {
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 16px 24px; border-top: 1px solid var(--surface2); background: var(--surface2);
}
.modal-foot .btn { flex: none; }

.field-label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
.field-input {
  width: 100%; box-sizing: border-box;
  background: var(--surface2); border: 1px solid var(--surface3);
  border-radius: 8px; padding: 10px 12px; font-size: 13px; color: var(--text);
  resize: vertical; outline: none; font-family: inherit;
  transition: border-color .15s;
}
.field-input::placeholder { color: var(--muted); }
.field-input:focus { border-color: var(--accent); }
.field-hint { font-size: 11px; margin-top: 6px; }
.field-hint--error { color: var(--red); }

@media (max-width: 640px) {
  .meta-grid    { grid-template-columns: 1fr 1fr; }
  .proposed-grid { grid-template-columns: 1fr 1fr; }
}
</style>
