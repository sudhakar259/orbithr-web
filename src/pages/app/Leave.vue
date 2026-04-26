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
  const colors = {
    pending: 'bg-yellow-900/40 text-yellow-400',
    approved: 'bg-green-900/40 text-green-400',
    rejected: 'bg-red-900/40 text-red-400',
    cancelled: 'bg-gray-900/40 text-gray-400',
    taken: 'bg-blue-900/40 text-blue-400',
    partially_taken: 'bg-purple-900/40 text-purple-400',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-900/40 text-gray-400';
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString();
};

const getLeaveTypeName = (typeId: number) => {
  const type = leaveTypes.value.find(t => t.id === typeId);
  return type?.name || 'Unknown';
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-gray-400">Manage leave requests, balances, and approvals.</p>
      </div>
      <div class="flex items-center gap-3">
        <button v-if="isAdminOrHR" @click="openPolicies" class="inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700/50">Manage Policies</button>

        <button
          v-if="isEmployee"
          @click="submitError = ''; showRequestModal = true"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Request Leave
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-md p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Dashboard Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-gray-800 overflow-hidden rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-400 truncate">Total Balance</dt>
                <dd class="text-lg font-medium text-white">{{ Number(totalLeaveBalance).toFixed(1) }} days</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 overflow-hidden rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-400 truncate">Pending Requests</dt>
                <dd class="text-lg font-medium text-white">{{ pendingRequests.length }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 overflow-hidden rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-400 truncate">Upcoming Leaves</dt>
                <dd class="text-lg font-medium text-white">{{ upcomingLeaves.length }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 overflow-hidden rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-400 truncate">Approved This Month</dt>
                <dd class="text-lg font-medium text-white">{{ dashboard?.approved_this_month || 0 }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-gray-800 rounded-lg">
      <div class="border-b border-gray-700">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            @click="activeTab = 'overview'"
            :class="[
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            Overview
          </button>
          <button
            @click="activeTab = 'requests'"
            :class="[
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            Leave Requests
          </button>
          <button
            v-if="isEmployee"
            @click="activeTab = 'balances'"
            :class="[
              activeTab === 'balances'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
            ]"
          >
            My Balances
          </button>
        </nav>
      </div>

      <div class="p-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <!-- Recent Requests -->
          <div>
            <h3 class="text-lg font-medium text-white mb-4">Recent Leave Requests</h3>
            <div v-if="loading" class="text-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <div v-else-if="leaveRequests.length === 0" class="text-center py-8 text-gray-400">
              No leave requests found.
            </div>
            <div v-else class="space-y-4">
              <div
                v-for="request in leaveRequests.slice(0, 5)"
                :key="request.id"
                class="border rounded-lg p-4 hover:bg-gray-700/50"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div v-if="request.employee" class="flex-shrink-0">
                      <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span class="text-sm font-medium text-gray-300">
                          {{ request.employee.first_name?.[0] }}{{ request.employee.last_name?.[0] }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-white">
                        {{ request.employee?.first_name }} {{ request.employee?.last_name }}
                      </p>
                      <p class="text-sm text-gray-400">
                        {{ getLeaveTypeName(request.leave_type_id) }} • {{ formatDate(request.start_date) }} - {{ formatDate(request.end_date) }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <span
                      :class="['inline-flex px-2 py-1 text-xs font-semibold rounded-full', getStatusColor(request.status)]"
                    >
                      {{ request.status }}
                    </span>
                    <button
                      v-if="isAdminOrHR && request.status === 'pending'"
                      @click="openApprovalModal(request)"
                      class="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Requests Tab -->
        <div v-if="activeTab === 'requests'" class="space-y-6">
          <div v-if="loading" class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          <div v-else-if="leaveRequests.length === 0" class="text-center py-8 text-gray-400">
            No leave requests found.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-700">
              <thead class="bg-gray-700/50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Dates
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Days
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-gray-800 divide-y divide-gray-700">
                <tr v-for="request in leaveRequests" :key="request.id">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span class="text-sm font-medium text-gray-300">
                            {{ request.employee?.first_name?.[0] }}{{ request.employee?.last_name?.[0] }}
                          </span>
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-white">
                          {{ request.employee?.first_name }} {{ request.employee?.last_name }}
                        </div>
                        <div class="text-sm text-gray-400">
                          {{ request.employee?.email }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">{{ getLeaveTypeName(request.leave_type_id) }}</div>
                    <div class="text-sm text-gray-400">{{ request.leave_period.replace('_', ' ') }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {{ formatDate(request.start_date) }} - {{ formatDate(request.end_date) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {{ request.days_requested }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="['inline-flex px-2 py-1 text-xs font-semibold rounded-full', getStatusColor(request.status)]"
                    >
                      {{ request.status }}
                    </span>
                    <p v-if="request.status === 'approved' && request.approval_notes" class="mt-1 text-xs text-gray-400">
                      Note: {{ request.approval_notes }}
                    </p>
                    <p v-if="request.status === 'rejected' && request.rejection_reason" class="mt-1 text-xs text-red-500">
                      Reason: {{ request.rejection_reason }}
                    </p>
                    <p v-if="request.status === 'cancelled' && request.cancellation_reason" class="mt-1 text-xs text-gray-400">
                      Reason: {{ request.cancellation_reason }}
                    </p>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      v-if="isAdminOrHR && request.status === 'pending'"
                      @click="openApprovalModal(request)"
                      class="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Review
                    </button>
                    <button
                      v-if="request.status === 'pending' && request.employee_id === authStore.user?.employee_id"
                      @click="cancelLeaveRequest(request.id, 'Cancelled by employee')"
                      class="text-red-600 hover:text-red-900"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Balances Tab -->
        <div v-if="activeTab === 'balances'" class="space-y-6">
          <div v-if="loading" class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          <div v-else-if="myBalanceSummary.length === 0" class="text-center py-8 text-gray-400">
            No leave balances found.
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="balance in myBalanceSummary"
              :key="balance.leave_type_id"
              class="bg-gray-800 border border-gray-700 rounded-lg p-6"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-medium text-white">{{ balance.leave_type }}</h3>
                  <p class="text-xs text-gray-500 uppercase tracking-wider">{{ balance.code }}</p>
                </div>
                <div class="text-right">
                  <p
                    class="text-2xl font-bold"
                    :class="Number(balance.available) <= 2 ? 'text-yellow-400' : 'text-blue-500'"
                  >{{ balance.available }}</p>
                  <p class="text-xs text-gray-400">Available</p>
                </div>
              </div>
              <div class="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p class="text-xs text-gray-400 uppercase tracking-wider">Total</p>
                  <p class="font-medium text-white">{{ balance.balance }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 uppercase tracking-wider">Used</p>
                  <p class="font-medium text-white">{{ balance.used }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 uppercase tracking-wider">Pending</p>
                  <p class="font-medium text-white">{{ balance.pending }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Leave Request Modal -->
    <div
      v-if="showRequestModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click.self="showRequestModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 rounded-md bg-gray-800">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-white mb-4">Request Leave</h3>
          <div v-if="submitError" class="mb-4 rounded-md bg-red-900/30 p-3 text-sm text-red-400">{{ submitError }}</div>
          <form @submit.prevent="submitLeaveRequest" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300">Leave Type</label>
              <select
                v-model="requestForm.leave_type_id"
                required
                class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:border-blue-500 focus:outline-none"
              >
                <option :value="null">Select leave type</option>
                <option
                  v-for="bal in myBalanceSummary"
                  :key="bal.leave_type_id"
                  :value="bal.leave_type_id"
                  :disabled="Number(bal.available) === 0"
                  :class="Number(bal.available) <= 2 ? 'text-yellow-400' : ''"
                >
                  {{ bal.leave_type }} ({{ bal.code }}) — {{ bal.available }} available
                </option>
              </select>
              <p
                v-if="selectedBalance"
                class="mt-1 text-xs"
                :class="Number(selectedBalance.available) <= 2 ? 'text-yellow-400' : 'text-gray-400'"
              >
                {{ selectedBalance.available }} available · {{ selectedBalance.used }} used / {{ selectedBalance.balance }} total
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300">Start Date</label>
                <input
                  v-model="requestForm.start_date"
                  type="date"
                  required
                  :min="new Date().toISOString().split('T')[0]"
                  class="mt-1 block w-full border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300">End Date</label>
                <input
                  v-model="requestForm.end_date"
                  type="date"
                  required
                  :min="requestForm.start_date"
                  class="mt-1 block w-full border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300">Leave Period</label>
              <select
                v-model="requestForm.leave_period"
                class="mt-1 block w-full border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="full_day">Full Day</option>
                <option value="half_day_morning">Half Day (Morning)</option>
                <option value="half_day_afternoon">Half Day (Afternoon)</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300">Reason</label>
              <textarea
                v-model="requestForm.reason"
                required
                rows="3"
                class="mt-1 block w-full border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please provide a reason for your leave request"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300">Contact Details</label>
              <input
                v-model="requestForm.contact_details"
                type="text"
                class="mt-1 block w-full border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Phone number or address during leave"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300">Document (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                class="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                @change="(e: Event) => requestForm.document = (e.target as HTMLInputElement).files?.[0] ?? null"
              />
            </div>

            <div class="flex items-center">
              <input
                v-model="requestForm.emergency_leave"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
              />
              <label class="ml-2 block text-sm text-white">
                Emergency Leave
              </label>
            </div>

            <div v-if="balanceWarning" class="text-xs text-yellow-400">
              ⚠ {{ balanceWarning }} (requesting {{ requestedDays }} days)
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showRequestModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="submitting || !!balanceWarning"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {{ submitting ? 'Submitting...' : 'Submit Request' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Approval Modal -->
    <div
      v-if="showApprovalModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      @click.self="showApprovalModal = false"
    >
      <div class="relative top-20 mx-auto p-5 border w-96 rounded-md bg-gray-800">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-white mb-4">Review Leave Request</h3>
          <div v-if="selectedRequest" class="mb-4 p-4 bg-gray-700/50 rounded-md">
            <p class="text-sm text-gray-400">
              <strong>{{ selectedRequest.employee?.first_name }} {{ selectedRequest.employee?.last_name }}</strong>
              is requesting {{ getLeaveTypeName(selectedRequest.leave_type_id) }}
              from {{ formatDate(selectedRequest.start_date) }} to {{ formatDate(selectedRequest.end_date) }}
              ({{ selectedRequest.days_requested }} days)
            </p>
            <p class="text-sm text-gray-400 mt-2">
              <strong>Reason:</strong> {{ selectedRequest.reason }}
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300">Approval Notes (Optional)</label>
              <textarea
                v-model="approvalNotes"
                rows="3"
                class="mt-1 block w-full border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes for approval"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300">Rejection Reason (if rejecting)</label>
              <textarea
                v-model="rejectionReason"
                rows="3"
                class="mt-1 block w-full border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Reason for rejection"
              ></textarea>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                @click="handleApproval(false)"
                class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                Reject
              </button>
              <button
                @click="handleApproval(true)"
                class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
