<script setup lang="ts">
defineOptions({ name: 'LeaveManagement' })
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLeave } from '@/composables/useLeave';
import { useAuth } from '@/composables/useAuth';
import { leaveService, type LeaveRequest, type LeaveBalanceSummary } from '@/services/leave';

const authStore = useAuth();
const router = useRouter();

const openPolicies = () => {
  router.push({ name: 'leave-policies' });
};
const {
  leaveRequests,
  leaveTypes,
  dashboard,
  loading,
  error,
  pendingRequests,
  upcomingLeaves,
  totalLeaveBalance,
  fetchLeaveRequests,
  fetchLeaveBalances,
  fetchLeaveTypes,
  fetchDashboard,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
} = useLeave();

// UI state
const activeTab = ref('overview');
const showRequestModal = ref(false);
const showApprovalModal = ref(false);
const selectedRequest = ref<LeaveRequest | null>(null);
const approvalNotes = ref('');
const rejectionReason = ref('');
const submitError = ref('');
const submitting = ref(false);
const myBalanceSummary = ref<LeaveBalanceSummary[]>([]);

// Form state for new request
const requestForm = ref({
  leave_type_id: null as number | null,
  start_date: '',
  end_date: '',
  leave_period: 'full_day' as 'full_day' | 'half_day_morning' | 'half_day_afternoon',
  reason: '',
  contact_details: '',
  emergency_leave: false,
  document: null as File | null,
});

// Computed properties
const isAdminOrHR = computed(() => {
  return ['admin', 'hr_manager', 'manager'].some(role => authStore.hasRole(role));
});

const isEmployee = computed(() => {
  return authStore.hasRole('employee');
});

const selectedBalance = computed<LeaveBalanceSummary | null>(() => {
  if (!requestForm.value.leave_type_id) return null;
  const id = Number(requestForm.value.leave_type_id);
  return myBalanceSummary.value.find(b => Number(b.leave_type_id) === id) ?? null;
});

const requestedDays = computed<number>(() => {
  if (!requestForm.value.start_date || !requestForm.value.end_date) return 0;
  const start = new Date(requestForm.value.start_date);
  const end = new Date(requestForm.value.end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
});

const balanceWarning = computed<string>(() => {
  if (!selectedBalance.value) return '';
  if (requestedDays.value > 0 && requestedDays.value > Number(selectedBalance.value.available)) {
    return `Only ${selectedBalance.value.available} days available`;
  }
  return '';
});

// Methods
const loadData = async () => {
  try {
    // Fetch types and dashboard first
    await Promise.all([
      fetchLeaveTypes(),
      fetchDashboard(),
    ]);

    // If current user is an employee, fetch their balances explicitly using employee_id
    if (isEmployee.value) {
      const empId = authStore.user?.employee_id;
      if (empId) {
        await fetchLeaveBalances(empId);
      } else {
        await fetchLeaveBalances();
      }
      await fetchLeaveRequests({ employee_id: authStore.user?.employee_id });

      // Load merged leave type + balance summary for the request form & balances tab
      try {
        myBalanceSummary.value = await leaveService.getMyBalanceSummary();
      } catch (e) {
        console.error('Failed to load balance summary:', e);
      }
    } else {
      await fetchLeaveRequests();
    }
  } catch (err) {
    console.error('Failed to load leave data:', err);
  }
};

const submitLeaveRequest = async () => {
  submitError.value = '';
  if (selectedBalance.value && requestedDays.value > Number(selectedBalance.value.available)) {
    submitError.value = `Only ${selectedBalance.value.available} days available for ${selectedBalance.value.leave_type}`;
    return;
  }
  submitting.value = true;
  try {
    const formData = {
      ...requestForm.value,
      employee_id: authStore.user?.employee_id || 0,
    };

    await leaveService.createLeaveRequest(formData);
    showRequestModal.value = false;
    resetRequestForm();
    await loadData();
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]>; error?: string; message?: string } } };
    const data = axiosErr?.response?.data;
    if (data?.errors) {
      submitError.value = Object.values(data.errors).flat().join(', ');
    } else {
      submitError.value = data?.error || data?.message || 'Failed to submit leave request';
    }
  } finally {
    submitting.value = false;
  }
};

const resetRequestForm = () => {
  requestForm.value = {
    leave_type_id: null,
    start_date: '',
    end_date: '',
    leave_period: 'full_day',
    reason: '',
    contact_details: '',
    emergency_leave: false,
    document: null,
  };
};

const openApprovalModal = (request: LeaveRequest) => {
  selectedRequest.value = request;
  showApprovalModal.value = true;
  approvalNotes.value = '';
  rejectionReason.value = '';
};

const handleApproval = async (approved: boolean) => {
  if (!selectedRequest.value) return;

  try {
    if (approved) {
      await approveLeaveRequest(selectedRequest.value.id, approvalNotes.value);
    } else {
      await rejectLeaveRequest(selectedRequest.value.id, rejectionReason.value);
    }
    showApprovalModal.value = false;
    selectedRequest.value = null;
    await loadData();
  } catch (err) {
    console.error('Failed to process leave request:', err);
  }
};

const getStatusColor = (status: string) => {
  const map: Record<string, string> = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
    cancelled: 'status-cancelled',
    taken: 'status-taken',
    partially_taken: 'status-partial',
  };
  return map[status] || 'status-cancelled';
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getLeaveTypeName = (typeId: number) => {
  const type = leaveTypes.value.find(t => t.id === typeId);
  return type?.name || 'Unknown';
};

// Color palette for balance cards (cycled by index)
const balanceColors = ['#6B5BFF', '#F5A623', '#4DD39A', '#7ED7FF', '#B28DFF', '#F38288'];
const colorForIndex = (i: number) => balanceColors[i % balanceColors.length];

const progressPercent = (used: number | string, total: number | string) => {
  const u = Number(used) || 0;
  const t = Number(total) || 0;
  if (t <= 0) return 0;
  return Math.min(100, Math.max(0, (u / t) * 100));
};

const initials = (first?: string, last?: string) => {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="leave-page">
    <!-- Page header -->
    <div class="page-header">
      <div class="page-eyebrow">FY 2026</div>
      <h1 class="page-title">Leave</h1>
      <p class="page-subtitle">Manage leave requests, balances, and approvals across your organisation.</p>
    </div>

    <!-- Action bar -->
    <div class="action-bar">
      <div class="tab-strip" role="tablist">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'overview' }"
          @click="activeTab = 'overview'"
        >Overview</button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'requests' }"
          @click="activeTab = 'requests'"
        >Leave requests</button>
        <button
          v-if="isEmployee"
          class="tab-btn"
          :class="{ active: activeTab === 'balances' }"
          @click="activeTab = 'balances'"
        >My balances</button>
      </div>
      <div class="action-buttons">
        <button v-if="isAdminOrHR" class="btn btn-secondary" @click="openPolicies">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          Manage policies
        </button>
        <button
          v-if="isEmployee"
          class="btn btn-primary"
          @click="submitError = ''; showRequestModal = true"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          Apply leave
        </button>
      </div>
    </div>

    <!-- Error alert -->
    <div v-if="error" class="alert alert-error">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
      <span>{{ error }}</span>
    </div>

    <!-- KPI strip -->
    <div class="kpi-strip">
      <div class="kpi-card">
        <div class="kpi-label">Total balance</div>
        <div class="kpi-value">{{ Number(totalLeaveBalance).toFixed(1) }}<span class="kpi-suffix">days</span></div>
        <div class="kpi-meta">across all leave types</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Pending requests</div>
        <div class="kpi-value">{{ pendingRequests.length }}<span class="kpi-suffix">awaiting</span></div>
        <div class="kpi-meta accent-yellow">action needed</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Upcoming leaves</div>
        <div class="kpi-value">{{ upcomingLeaves.length }}<span class="kpi-suffix">scheduled</span></div>
        <div class="kpi-meta">in the next 30 days</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Approved this month</div>
        <div class="kpi-value">{{ dashboard?.approved_this_month || 0 }}<span class="kpi-suffix">approved</span></div>
        <div class="kpi-meta accent-green">on track</div>
      </div>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <!-- Balance cards (only for employees) -->
      <div v-if="isEmployee && myBalanceSummary.length" class="balance-grid">
        <div
          v-for="(bal, i) in myBalanceSummary"
          :key="bal.leave_type_id"
          class="balance-card"
        >
          <div class="balance-head">
            <span class="balance-eyebrow">{{ bal.leave_type }}</span>
            <span class="balance-frac">{{ bal.used }}/{{ bal.balance }}</span>
          </div>
          <div class="balance-value">
            {{ bal.available }}<span class="balance-suffix"> days</span>
          </div>
          <div class="progress-track">
            <div
              class="progress-fill"
              :style="{ width: progressPercent(bal.used, bal.balance) + '%', background: colorForIndex(i) }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Recent requests panel -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Recent leave requests</div>
          <div class="panel-meta">{{ leaveRequests.length }} total</div>
        </div>
        <div v-if="loading" class="panel-empty">
          <div class="spinner"></div>
        </div>
        <div v-else-if="leaveRequests.length === 0" class="panel-empty">
          No leave requests found.
        </div>
        <ul v-else class="request-list">
          <li
            v-for="request in leaveRequests.slice(0, 6)"
            :key="request.id"
            class="request-row"
          >
            <div class="request-left">
              <div class="avatar" :data-name="initials(request.employee?.first_name, request.employee?.last_name)">
                {{ initials(request.employee?.first_name, request.employee?.last_name) }}
              </div>
              <div class="request-meta">
                <div class="request-name">
                  {{ request.employee?.first_name }} {{ request.employee?.last_name }}
                </div>
                <div class="request-sub">
                  {{ getLeaveTypeName(request.leave_type_id) }}
                  <span class="dot">•</span>
                  {{ formatDate(request.start_date) }} &mdash; {{ formatDate(request.end_date) }}
                </div>
              </div>
            </div>
            <div class="request-right">
              <span :class="['status-pill', getStatusColor(request.status)]">{{ request.status }}</span>
              <button
                v-if="isAdminOrHR && request.status === 'pending'"
                class="btn-link"
                @click="openApprovalModal(request)"
              >Review</button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Requests Tab -->
    <div v-if="activeTab === 'requests'" class="tab-content">
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">All leave requests</div>
          <div class="panel-meta">{{ leaveRequests.length }} entries</div>
        </div>
        <div v-if="loading" class="panel-empty">
          <div class="spinner"></div>
        </div>
        <div v-else-if="leaveRequests.length === 0" class="panel-empty">
          No leave requests found.
        </div>
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Dates</th>
                <th class="num">Days</th>
                <th>Status</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="request in leaveRequests" :key="request.id">
                <td>
                  <div class="cell-employee">
                    <div class="avatar avatar-sm">
                      {{ initials(request.employee?.first_name, request.employee?.last_name) }}
                    </div>
                    <div>
                      <div class="cell-name">{{ request.employee?.first_name }} {{ request.employee?.last_name }}</div>
                      <div class="cell-sub">{{ request.employee?.email }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="cell-name">{{ getLeaveTypeName(request.leave_type_id) }}</div>
                  <div class="cell-sub">{{ request.leave_period.replace('_', ' ') }}</div>
                </td>
                <td class="cell-mono">
                  {{ formatDate(request.start_date) }} &mdash; {{ formatDate(request.end_date) }}
                </td>
                <td class="num cell-mono">{{ request.days_requested }}</td>
                <td>
                  <span :class="['status-pill', getStatusColor(request.status)]">{{ request.status }}</span>
                  <p v-if="request.status === 'approved' && request.approval_notes" class="cell-note">
                    Note: {{ request.approval_notes }}
                  </p>
                  <p v-if="request.status === 'rejected' && request.rejection_reason" class="cell-note cell-note-red">
                    Reason: {{ request.rejection_reason }}
                  </p>
                  <p v-if="request.status === 'cancelled' && request.cancellation_reason" class="cell-note">
                    Reason: {{ request.cancellation_reason }}
                  </p>
                </td>
                <td class="actions-col">
                  <button
                    v-if="isAdminOrHR && request.status === 'pending'"
                    class="btn-link"
                    @click="openApprovalModal(request)"
                  >Review</button>
                  <button
                    v-if="request.status === 'pending' && request.employee_id === authStore.user?.employee_id"
                    class="btn-link btn-link-red"
                    @click="cancelLeaveRequest(request.id, 'Cancelled by employee')"
                  >Cancel</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Balances Tab -->
    <div v-if="activeTab === 'balances'" class="tab-content">
      <div v-if="loading" class="panel">
        <div class="panel-empty"><div class="spinner"></div></div>
      </div>
      <div v-else-if="myBalanceSummary.length === 0" class="panel">
        <div class="panel-empty">No leave balances found.</div>
      </div>
      <div v-else class="balance-grid balance-grid-detail">
        <div
          v-for="(balance, i) in myBalanceSummary"
          :key="balance.leave_type_id"
          class="balance-card balance-card-detail"
        >
          <div class="balance-head">
            <div>
              <div class="balance-name">{{ balance.leave_type }}</div>
              <div class="balance-code">{{ balance.code }}</div>
            </div>
            <div class="balance-available">
              <div class="balance-value-lg" :class="{ 'low-balance': Number(balance.available) <= 2 }">
                {{ balance.available }}
              </div>
              <div class="balance-eyebrow">Available</div>
            </div>
          </div>
          <div class="progress-track">
            <div
              class="progress-fill"
              :style="{ width: progressPercent(balance.used, balance.balance) + '%', background: colorForIndex(i) }"
            ></div>
          </div>
          <div class="balance-stats">
            <div>
              <div class="stat-label">Total</div>
              <div class="stat-value">{{ balance.balance }}</div>
            </div>
            <div>
              <div class="stat-label">Used</div>
              <div class="stat-value">{{ balance.used }}</div>
            </div>
            <div>
              <div class="stat-label">Pending</div>
              <div class="stat-value">{{ balance.pending }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Leave Request Modal -->
    <Teleport to="body">
      <div
        v-if="showRequestModal"
        class="modal-backdrop"
        @click.self="showRequestModal = false"
      >
        <div class="modal-card">
          <div class="modal-head">
            <h3 class="modal-title">Apply for leave</h3>
            <button class="modal-close" @click="showRequestModal = false">×</button>
          </div>
          <div v-if="submitError" class="alert alert-error mb-12">{{ submitError }}</div>
          <form class="modal-body" @submit.prevent="submitLeaveRequest">
            <div class="form-row">
              <label class="form-label">Leave type</label>
              <select v-model="requestForm.leave_type_id" required class="form-input">
                <option :value="null">Select leave type</option>
                <option
                  v-for="bal in myBalanceSummary"
                  :key="bal.leave_type_id"
                  :value="bal.leave_type_id"
                  :disabled="Number(bal.available) === 0"
                >
                  {{ bal.leave_type }} ({{ bal.code }}) — {{ bal.available }} available
                </option>
              </select>
              <p
                v-if="selectedBalance"
                class="form-hint"
                :class="{ warn: Number(selectedBalance.available) <= 2 }"
              >
                {{ selectedBalance.available }} available · {{ selectedBalance.used }} used / {{ selectedBalance.balance }} total
              </p>
            </div>

            <div class="form-grid-2">
              <div class="form-row">
                <label class="form-label">Start date</label>
                <input
                  v-model="requestForm.start_date"
                  type="date"
                  required
                  :min="new Date().toISOString().split('T')[0]"
                  class="form-input"
                />
              </div>
              <div class="form-row">
                <label class="form-label">End date</label>
                <input
                  v-model="requestForm.end_date"
                  type="date"
                  required
                  :min="requestForm.start_date"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-row">
              <label class="form-label">Leave period</label>
              <select v-model="requestForm.leave_period" class="form-input">
                <option value="full_day">Full Day</option>
                <option value="half_day_morning">Half Day (Morning)</option>
                <option value="half_day_afternoon">Half Day (Afternoon)</option>
              </select>
            </div>

            <div class="form-row">
              <label class="form-label">Reason</label>
              <textarea
                v-model="requestForm.reason"
                required
                rows="3"
                class="form-input"
                placeholder="Please provide a reason for your leave request"
              ></textarea>
            </div>

            <div class="form-row">
              <label class="form-label">Contact details</label>
              <input
                v-model="requestForm.contact_details"
                type="text"
                class="form-input"
                placeholder="Phone number or address during leave"
              />
            </div>

            <div class="form-row">
              <label class="form-label">Document (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                class="form-input form-file"
                @change="(e: Event) => requestForm.document = (e.target as HTMLInputElement).files?.[0] ?? null"
              />
            </div>

            <label class="form-check">
              <input
                v-model="requestForm.emergency_leave"
                type="checkbox"
              />
              <span>Emergency leave</span>
            </label>

            <div v-if="balanceWarning" class="form-warning">
              ⚠ {{ balanceWarning }} (requesting {{ requestedDays }} days)
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" @click="showRequestModal = false">Cancel</button>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="submitting || !!balanceWarning"
              >{{ submitting ? 'Submitting...' : 'Submit request' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Approval Modal -->
    <Teleport to="body">
      <div
        v-if="showApprovalModal"
        class="modal-backdrop"
        @click.self="showApprovalModal = false"
      >
        <div class="modal-card">
          <div class="modal-head">
            <h3 class="modal-title">Review leave request</h3>
            <button class="modal-close" @click="showApprovalModal = false">×</button>
          </div>
          <div v-if="selectedRequest" class="review-summary">
            <p>
              <strong>{{ selectedRequest.employee?.first_name }} {{ selectedRequest.employee?.last_name }}</strong>
              is requesting {{ getLeaveTypeName(selectedRequest.leave_type_id) }}
              from {{ formatDate(selectedRequest.start_date) }} to {{ formatDate(selectedRequest.end_date) }}
              ({{ selectedRequest.days_requested }} days)
            </p>
            <p class="review-reason"><strong>Reason:</strong> {{ selectedRequest.reason }}</p>
          </div>

          <div class="modal-body">
            <div class="form-row">
              <label class="form-label">Approval notes (optional)</label>
              <textarea
                v-model="approvalNotes"
                rows="3"
                class="form-input"
                placeholder="Add any notes for approval"
              ></textarea>
            </div>

            <div class="form-row">
              <label class="form-label">Rejection reason (if rejecting)</label>
              <textarea
                v-model="rejectionReason"
                rows="3"
                class="form-input"
                placeholder="Reason for rejection"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button class="btn btn-danger" @click="handleApproval(false)">Reject</button>
              <button class="btn btn-success" @click="handleApproval(true)">Approve</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.leave-page {
  --bg: #0D0F17;
  --surface: #161A23;
  --surface-2: #1C2030;
  --border: #232936;
  --text: #EEF0F4;
  --text-muted: #7A8299;
  --accent: #6B5BFF;
  --green: #4DD39A;
  --red: #F38288;
  --yellow: #F5A623;
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: var(--text);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.page-title {
  font-family: 'Instrument Serif', serif;
  font-size: 40px;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--text);
  margin: 2px 0 0;
}

.page-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 4px 0 0;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.tab-strip {
  display: flex;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 4px;
}

.tab-btn {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  padding: 7px 14px;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tab-btn:hover {
  color: var(--text);
}

.tab-btn.active {
  background: var(--surface-2);
  color: var(--text);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #5B4DEB;
}

.btn-secondary {
  background: var(--surface-2);
  border-color: var(--border);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: #242a3b;
}

.btn-ghost {
  background: transparent;
  color: var(--text-muted);
}

.btn-ghost:hover:not(:disabled) {
  color: var(--text);
}

.btn-danger {
  background: rgba(243, 130, 136, 0.15);
  border-color: rgba(243, 130, 136, 0.4);
  color: var(--red);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(243, 130, 136, 0.25);
}

.btn-success {
  background: rgba(77, 211, 154, 0.15);
  border-color: rgba(77, 211, 154, 0.4);
  color: var(--green);
}

.btn-success:hover:not(:disabled) {
  background: rgba(77, 211, 154, 0.25);
}

.alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12.5px;
}

.alert-error {
  background: rgba(243, 130, 136, 0.1);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: var(--red);
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.kpi-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kpi-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.kpi-value {
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--text);
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.kpi-suffix {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0;
}

.kpi-meta {
  font-size: 11px;
  color: var(--text-muted);
}

.accent-yellow { color: var(--yellow); }
.accent-green { color: var(--green); }

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.balance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.balance-grid-detail {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.balance-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.balance-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.balance-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.balance-frac {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
}

.balance-value {
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--text);
}

.balance-suffix {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: var(--text-muted);
}

.balance-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.balance-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 2px;
}

.balance-available {
  text-align: right;
}

.balance-value-lg {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--accent);
}

.balance-value-lg.low-balance {
  color: var(--yellow);
}

.balance-card-detail .balance-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 4px;
}

.stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.stat-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.progress-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.panel-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
}

.panel-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
}

.panel-empty {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.request-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.request-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.request-row:last-child {
  border-bottom: none;
}

.request-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(107, 91, 255, 0.3), rgba(77, 211, 154, 0.3));
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-sm {
  width: 28px;
  height: 28px;
  font-size: 10.5px;
}

.request-meta {
  min-width: 0;
}

.request-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}

.request-sub {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 2px;
}

.dot {
  margin: 0 4px;
  color: var(--border);
}

.request-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  text-transform: capitalize;
  letter-spacing: 0.02em;
}

.status-pending {
  background: rgba(245, 166, 35, 0.15);
  color: var(--yellow);
  border: 1px solid rgba(245, 166, 35, 0.3);
}

.status-approved {
  background: rgba(77, 211, 154, 0.15);
  color: var(--green);
  border: 1px solid rgba(77, 211, 154, 0.3);
}

.status-rejected {
  background: rgba(243, 130, 136, 0.15);
  color: var(--red);
  border: 1px solid rgba(243, 130, 136, 0.3);
}

.status-cancelled {
  background: rgba(122, 130, 153, 0.15);
  color: var(--text-muted);
  border: 1px solid rgba(122, 130, 153, 0.3);
}

.status-taken {
  background: rgba(107, 91, 255, 0.15);
  color: var(--accent);
  border: 1px solid rgba(107, 91, 255, 0.3);
}

.status-partial {
  background: rgba(178, 141, 255, 0.15);
  color: #B28DFF;
  border: 1px solid rgba(178, 141, 255, 0.3);
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 6px;
  font-family: inherit;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-link-red {
  color: var(--red);
}

.table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead th {
  background: rgba(255, 255, 255, 0.02);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  text-align: left;
  padding: 10px 16px;
  font-weight: 500;
  border-bottom: 1px solid var(--border);
}

.data-table thead th.num { text-align: right; }
.data-table thead th.actions-col { text-align: right; }

.data-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text);
  vertical-align: top;
}

.data-table tbody td.num,
.data-table tbody td.actions-col {
  text-align: right;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.015);
}

.cell-employee {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cell-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text);
}

.cell-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
  text-transform: capitalize;
}

.cell-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: var(--text-muted);
}

.cell-note {
  font-size: 10.5px;
  color: var(--text-muted);
  margin: 4px 0 0;
}

.cell-note-red {
  color: var(--red);
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 10, 16, 0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
}

.modal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  overflow: hidden;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.modal-close {
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--surface-2);
  color: var(--text);
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.mb-12 { margin: 12px 20px 0; }

.form-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.form-input {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}

.form-input:focus {
  border-color: var(--accent);
}

.form-input::placeholder {
  color: #545b6e;
}

.form-file {
  padding: 7px 12px;
}

.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin: 4px 0 0;
}

.form-hint.warn {
  color: var(--yellow);
}

.form-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text);
  cursor: pointer;
}

.form-check input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent);
}

.form-warning {
  font-size: 11.5px;
  color: var(--yellow);
  background: rgba(245, 166, 35, 0.08);
  border: 1px solid rgba(245, 166, 35, 0.25);
  padding: 8px 10px;
  border-radius: 6px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 6px;
}

.review-summary {
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-muted);
}

.review-summary p {
  margin: 0;
}

.review-summary strong {
  color: var(--text);
  font-weight: 600;
}

.review-reason {
  margin-top: 8px !important;
}

@media (max-width: 1024px) {
  .kpi-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .kpi-strip {
    grid-template-columns: 1fr;
  }
  .form-grid-2 {
    grid-template-columns: 1fr;
  }
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
