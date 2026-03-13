<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useLeave } from '@/composables/useLeave';
import { useAuth } from '@/composables/useAuth';
import { leaveService, type LeaveRequest, type LeaveBalance } from '@/services/leave';

const authStore = useAuth();
const router = useRouter();

const openPolicies = () => {
  router.push({ name: 'leave-policies' });
};
const {
  leaveRequests,
  leaveBalances,
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
} = useLeave();

// UI state
const activeTab = ref('overview');
const showRequestModal = ref(false);
const showApprovalModal = ref(false);
const selectedRequest = ref<LeaveRequest | null>(null);
const approvalNotes = ref('');
const rejectionReason = ref('');

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
  return authStore.user?.roles?.some(role =>
    ['admin', 'hr_manager', 'manager'].includes(role.name)
  ) || false;
});

const isEmployee = computed(() => {
  return authStore.user?.roles?.some(role => role.name === 'employee') || false;
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
    } else {
      await fetchLeaveRequests();
    }
  } catch (err) {
    console.error('Failed to load leave data:', err);
  }
};

const submitLeaveRequest = async () => {
  try {
    const formData = {
      ...requestForm.value,
      employee_id: authStore.user?.employee_id || 0,
    };

    await leaveService.createLeaveRequest(formData);
    showRequestModal.value = false;
    resetRequestForm();
    await loadData();
  } catch (err) {
    console.error('Failed to submit leave request:', err);
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
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    taken: 'bg-blue-100 text-blue-800',
    partially_taken: 'bg-purple-100 text-purple-800',
  };
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Leave Management</h1>
        <p class="text-slate-600">Manage leave requests, balances, and approvals.</p>
      </div>
      <div class="flex items-center gap-3">
        <button v-if="isAdminOrHR" @click="openPolicies" class="inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50">Manage Policies</button>

        <button
          v-if="isEmployee"
          @click="showRequestModal = true"
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
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
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
      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Total Balance</dt>
                <dd class="text-lg font-medium text-gray-900">{{ Number(totalLeaveBalance).toFixed(1) }} days</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Pending Requests</dt>
                <dd class="text-lg font-medium text-gray-900">{{ pendingRequests.length }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Upcoming Leaves</dt>
                <dd class="text-lg font-medium text-gray-900">{{ upcomingLeaves.length }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white overflow-hidden shadow rounded-lg">
        <div class="p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 truncate">Approved This Month</dt>
                <dd class="text-lg font-medium text-gray-900">{{ dashboard?.approved_this_month || 0 }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white shadow rounded-lg">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            @click="activeTab = 'overview'"
            :class="[
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
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
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
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
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
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
            <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Leave Requests</h3>
            <div v-if="loading" class="text-center py-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <div v-else-if="leaveRequests.length === 0" class="text-center py-8 text-gray-500">
              No leave requests found.
            </div>
            <div v-else class="space-y-4">
              <div
                v-for="request in leaveRequests.slice(0, 5)"
                :key="request.id"
                class="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div v-if="request.employee" class="flex-shrink-0">
                      <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span class="text-sm font-medium text-gray-700">
                          {{ request.employee.first_name?.[0] }}{{ request.employee.last_name?.[0] }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900">
                        {{ request.employee?.first_name }} {{ request.employee?.last_name }}
                      </p>
                      <p class="text-sm text-gray-500">
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
          <div v-else-if="leaveRequests.length === 0" class="text-center py-8 text-gray-500">
            No leave requests found.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="request in leaveRequests" :key="request.id">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span class="text-sm font-medium text-gray-700">
                            {{ request.employee?.first_name?.[0] }}{{ request.employee?.last_name?.[0] }}
                          </span>
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                          {{ request.employee?.first_name }} {{ request.employee?.last_name }}
                        </div>
                        <div class="text-sm text-gray-500">
                          {{ request.employee?.email }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ getLeaveTypeName(request.leave_type_id) }}</div>
                    <div class="text-sm text-gray-500">{{ request.leave_period.replace('_', ' ') }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(request.start_date) }} - {{ formatDate(request.end_date) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ request.days_requested }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="['inline-flex px-2 py-1 text-xs font-semibold rounded-full', getStatusColor(request.status)]"
                    >
                      {{ request.status }}
                    </span>
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
          <div v-else-if="leaveBalances.length === 0" class="text-center py-8 text-gray-500">
            No leave balances found.
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="balance in leaveBalances"
              :key="balance.code"
              class="bg-white border rounded-lg p-6"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-medium text-gray-900">{{ balance.leave_type }}</h3>
                  <p class="text-sm text-gray-500">{{ balance.code }}</p>
                </div>
                <div class="text-right">
                  <p class="text-2xl font-bold text-blue-600">{{ balance.available }}</p>
                  <p class="text-sm text-gray-500">Available</p>
                </div>
              </div>
              <div class="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p class="text-gray-500">Balance</p>
                  <p class="font-medium">{{ balance.balance }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Used</p>
                  <p class="font-medium">{{ balance.used }}</p>
                </div>
                <div>
                  <p class="text-gray-500">Pending</p>
                  <p class="font-medium">{{ balance.pending }}</p>
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
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Request Leave</h3>
          <form @submit.prevent="submitLeaveRequest" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Leave Type</label>
              <select
                v-model="requestForm.leave_type_id"
                required
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select leave type</option>
                <option
                  v-for="type in leaveTypes"
                  :key="type.id"
                  :value="type.id"
                >
                  {{ type.name }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  v-model="requestForm.start_date"
                  type="date"
                  required
                  :min="new Date().toISOString().split('T')[0]"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  v-model="requestForm.end_date"
                  type="date"
                  required
                  :min="requestForm.start_date"
                  class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Leave Period</label>
              <select
                v-model="requestForm.leave_period"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="full_day">Full Day</option>
                <option value="half_day_morning">Half Day (Morning)</option>
                <option value="half_day_afternoon">Half Day (Afternoon)</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                v-model="requestForm.reason"
                required
                rows="3"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please provide a reason for your leave request"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Contact Details</label>
              <input
                v-model="requestForm.contact_details"
                type="text"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Phone number or address during leave"
              />
            </div>

            <div class="flex items-center">
              <input
                v-model="requestForm.emergency_leave"
                type="checkbox"
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label class="ml-2 block text-sm text-gray-900">
                Emergency Leave
              </label>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="showRequestModal = false"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {{ loading ? 'Submitting...' : 'Submit Request' }}
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
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Review Leave Request</h3>
          <div v-if="selectedRequest" class="mb-4 p-4 bg-gray-50 rounded-md">
            <p class="text-sm text-gray-600">
              <strong>{{ selectedRequest.employee?.first_name }} {{ selectedRequest.employee?.last_name }}</strong>
              is requesting {{ getLeaveTypeName(selectedRequest.leave_type_id) }}
              from {{ formatDate(selectedRequest.start_date) }} to {{ formatDate(selectedRequest.end_date) }}
              ({{ selectedRequest.days_requested }} days)
            </p>
            <p class="text-sm text-gray-600 mt-2">
              <strong>Reason:</strong> {{ selectedRequest.reason }}
            </p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Approval Notes (Optional)</label>
              <textarea
                v-model="approvalNotes"
                rows="3"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes for approval"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">Rejection Reason (if rejecting)</label>
              <textarea
                v-model="rejectionReason"
                rows="3"
                class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
