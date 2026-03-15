<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">My Regularization Requests</h1>
        <p class="page-sub">Track the status of your attendance regularization requests</p>
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
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      <p class="state-empty__msg">
        {{ activeTab === 'pending' ? 'No pending regularization requests' : 'No requests found' }}
      </p>
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
            <div v-if="req.status === 'approved' && req.attendance?.metadata?.el_deducted" class="el-notice">
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

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { regularizationService, type RegularizationRequest } from '@/services/regularization'

const loading = ref(false)
const error = ref('')
const requests = ref<RegularizationRequest[]>([])
const activeTab = ref('pending')

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
    const result = await regularizationService.getMyRequests()
    requests.value = result.data || []
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load your regularization requests'
  } finally {
    loading.value = false
  }
}

const formatDate = (d?: string) => d
  ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  : ''

const formatTime = (t?: string) => t
  ? new Date(`1970-01-01T${t}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  : '—'

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
.page-title  { font-size: 22px; font-weight: 700; color: var(--text); margin: 0; }
.page-sub    { font-size: 13px; color: var(--muted); margin: 4px 0 0; }

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

@media (max-width: 640px) {
  .meta-grid     { grid-template-columns: 1fr 1fr; }
  .proposed-grid { grid-template-columns: 1fr 1fr; }
}
</style>
