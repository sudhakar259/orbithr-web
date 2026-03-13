<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Regularization Requests</h1>
      <p class="text-slate-600">Review and approve pending attendance regularization requests</p>
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-2 border-b border-slate-200">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        :class="[
          'px-4 py-2 border-b-2 font-medium text-sm transition-colors',
          activeTab === tab.value
            ? 'border-brand-600 text-brand-600'
            : 'border-transparent text-slate-600 hover:text-slate-900'
        ]"
      >
        {{ tab.label }}
        <span
          v-if="tab.count > 0"
          class="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-brand-600"></div>
    </div>

    <!-- Error Message -->
    <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
      {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredRequests.length === 0" class="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
      <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-slate-900">No requests</h3>
      <p class="mt-1 text-sm text-slate-500">
        {{ activeTab === 'pending' ? 'No pending regularization requests' : 'No regularization requests found' }}
      </p>
    </div>

    <!-- Requests List -->
    <div v-else class="space-y-4">
      <div
        v-for="request in filteredRequests"
        :key="request.id"
        class="rounded-lg border border-slate-200 bg-white shadow-soft transition-shadow hover:shadow-md"
      >
        <!-- Request Header -->
        <div class="flex items-start justify-between border-b border-slate-100 p-6">
          <div class="flex-1">
            <div class="flex items-center gap-3">
              <div>
                <h3 class="text-lg font-semibold text-slate-900">
                  {{ request.employee?.full_name }}
                </h3>
                <p class="text-sm text-slate-600">
                  {{ request.employee?.employee_id }} • {{ request.employee?.designation }}
                </p>
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium text-slate-900">
              {{ formatDate(request.attendance?.attendance_date) }}
            </div>
            <span
              :class="[
                'mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                request.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                request.status === 'approved' && 'bg-green-100 text-green-800',
                request.status === 'rejected' && 'bg-red-100 text-red-800'
              ]"
            >
              {{ formatStatus(request.status) }}
              <span v-if="request.auto_approved" class="ml-1 text-xs">(Auto-approved)</span>
            </span>
          </div>
        </div>

        <!-- Request Details -->
        <div class="space-y-4 p-6">
          <!-- Regularization Type -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Type</div>
              <div class="mt-1 text-sm font-medium text-slate-900">
                {{ formatRegularizationType(request.regularization_type) }}
              </div>
            </div>
            <div>
              <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Requested Date</div>
              <div class="mt-1 text-sm font-medium text-slate-900">
                {{ formatDate(request.created_at) }}
              </div>
            </div>
            <div v-if="request.auto_approved">
              <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Auto-Approved On</div>
              <div class="mt-1 text-sm font-medium text-slate-900">
                {{ formatDate(request.approved_at) }}
              </div>
            </div>
          </div>

          <!-- Proposed Changes -->
          <div class="rounded-lg bg-slate-50 p-4">
            <h4 class="text-sm font-semibold text-slate-900 mb-3">Proposed Changes</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div class="text-xs text-slate-600">Check In</div>
                <div class="font-medium text-slate-900">
                  {{ request.check_in ? formatTime(request.check_in) : '—' }}
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-600">Check Out</div>
                <div class="font-medium text-slate-900">
                  {{ request.check_out ? formatTime(request.check_out) : '—' }}
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-600">Working Hours</div>
                <div class="font-medium text-slate-900">
                  {{ request.working_hours ? `${request.working_hours}h` : '—' }}
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-600">Overtime Hours</div>
                <div class="font-medium text-slate-900">
                  {{ request.overtime_hours ? `${request.overtime_hours}h` : '—' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Reason -->
          <div>
            <h4 class="text-sm font-semibold text-slate-900 mb-2">Reason for Regularization</h4>
            <p class="text-sm text-slate-600 bg-slate-50 p-3 rounded">{{ request.reason }}</p>
            <div v-if="request.notes" class="mt-2">
              <p class="text-xs text-slate-600 font-medium">Additional Notes:</p>
              <p class="text-sm text-slate-600 bg-slate-50 p-3 rounded">{{ request.notes }}</p>
            </div>
          </div>

          <!-- Approval Info -->
          <div v-if="request.status !== 'pending'" class="rounded-lg bg-blue-50 p-4 border border-blue-100">
            <h4 class="text-sm font-semibold text-blue-900 mb-2">
              {{ request.status === 'approved' ? 'Approval Details' : 'Rejection Details' }}
            </h4>
            <div class="space-y-1 text-sm text-blue-800">
              <p>
                <span class="font-medium">{{ request.status === 'approved' ? 'Approved' : 'Rejected' }} By:</span>
                {{ request.approved_by_user?.name }}
              </p>
              <p>
                <span class="font-medium">{{ request.status === 'approved' ? 'Approved' : 'Rejected' }} On:</span>
                {{ formatDate(request.approved_at) }}
              </p>
              <p v-if="request.approval_notes">
                <span class="font-medium">Notes:</span>
                {{ request.approval_notes }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div
          v-if="request.status === 'pending'"
          class="flex gap-3 border-t border-slate-100 bg-slate-50 p-6"
        >
          <button
            @click="openApprovalModal(request)"
            :disabled="submitting"
            class="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <span v-if="submitting === request.id">Approving...</span>
            <span v-else>✓ Approve</span>
          </button>
          <button
            @click="openRejectionModal(request)"
            :disabled="submitting"
            class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <span v-if="submitting === request.id">Rejecting...</span>
            <span v-else>✗ Reject</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Approval Modal -->
    <div
      v-if="showApprovalModal && selectedRequest"
      class="fixed inset-0 z-50 overflow-y-auto"
    >
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="showApprovalModal = false"></div>
      <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative bg-white rounded-lg shadow-lg max-w-md w-full" @click.stop>
          <div class="border-b border-slate-200 px-6 py-4">
            <h2 class="text-lg font-semibold text-slate-900">Approve Request</h2>
            <p class="mt-1 text-sm text-slate-600">
              {{ selectedRequest.employee?.full_name }} - {{ formatDate(selectedRequest.attendance?.attendance_date) }}
            </p>
          </div>

          <div class="space-y-4 px-6 py-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Approval Notes (Optional)</label>
              <textarea
                v-model="approvalNotes"
                rows="3"
                placeholder="Add notes about this approval..."
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-brand-500 focus:ring-brand-500"
              ></textarea>
            </div>
          </div>

          <div class="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              @click="showApprovalModal = false"
              class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              @click="approveRequest"
              :disabled="submitting"
              class="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {{ submitting ? 'Approving...' : 'Approve' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rejection Modal -->
    <div
      v-if="showRejectionModal && selectedRequest"
      class="fixed inset-0 z-50 overflow-y-auto"
    >
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="showRejectionModal = false"></div>
      <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative bg-white rounded-lg shadow-lg max-w-md w-full" @click.stop>
          <div class="border-b border-slate-200 px-6 py-4">
            <h2 class="text-lg font-semibold text-slate-900">Reject Request</h2>
            <p class="mt-1 text-sm text-slate-600">
              {{ selectedRequest.employee?.full_name }} - {{ formatDate(selectedRequest.attendance?.attendance_date) }}
            </p>
          </div>

          <div class="space-y-4 px-6 py-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Reason for Rejection *</label>
              <textarea
                v-model="rejectionNotes"
                rows="3"
                placeholder="Please provide the reason for rejection..."
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-brand-500 focus:ring-brand-500"
              ></textarea>
              <p v-if="rejectionNotes.length < 10" class="mt-1 text-xs text-red-600">
                Minimum 10 characters required
              </p>
            </div>
          </div>

          <div class="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              @click="showRejectionModal = false"
              class="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              @click="rejectRequest"
              :disabled="submitting || rejectionNotes.length < 10"
              class="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {{ submitting ? 'Rejecting...' : 'Reject' }}
            </button>
          </div>
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
  employee?: {
    id: number
    full_name: string
    employee_id: string
    designation: string
  }
  attendance?: {
    attendance_date: string
  }
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
  approved_by_user?: {
    id: number
    name: string
  }
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
  { value: 'pending', label: 'Pending', count: 0 },
  { value: 'approved', label: 'Approved', count: 0 },
  { value: 'rejected', label: 'Rejected', count: 0 },
  { value: 'all', label: 'All', count: 0 },
]

const filteredRequests = computed(() => {
  if (activeTab.value === 'all') return requests.value
  return requests.value.filter(r => r.status === activeTab.value)
})

const tabCounts = computed(() => {
  return {
    pending: requests.value.filter(r => r.status === 'pending').length,
    approved: requests.value.filter(r => r.status === 'approved').length,
    rejected: requests.value.filter(r => r.status === 'rejected').length,
    all: requests.value.length,
  }
})

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
    const result = await regularizationService.approveRequest(
      selectedRequest.value.id,
      {
        approval_notes: approvalNotes.value || null,
      }
    )

    // Update local data
    const index = requests.value.findIndex(r => r.id === selectedRequest.value!.id)
    if (index !== -1) {
      requests.value[index].status = 'approved'
      requests.value[index].approved_at = new Date().toISOString()
      requests.value[index].approval_notes = approvalNotes.value
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
    const result = await regularizationService.rejectRequest(
      selectedRequest.value.id,
      {
        approval_notes: rejectionNotes.value,
      }
    )

    // Update local data
    const index = requests.value.findIndex(r => r.id === selectedRequest.value!.id)
    if (index !== -1) {
      requests.value[index].status = 'rejected'
      requests.value[index].approved_at = new Date().toISOString()
      requests.value[index].approval_notes = rejectionNotes.value
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

const formatDate = (dateString?: string): string => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatTime = (timeString?: string): string => {
  if (!timeString) return '—'
  const time = new Date(`1970-01-01T${timeString}`)
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatRegularizationType = (type: string): string => {
  const typeMap: Record<string, string> = {
    forgot_punch: 'Forgot to Punch',
    system_error: 'System Error',
    late_arrival: 'Late Arrival',
    early_departure: 'Early Departure',
    work_from_home: 'Work from Home',
    official_work: 'Official Work',
    other: 'Other',
  }
  return typeMap[type] || type
}

onMounted(() => {
  fetchRequests()
})
</script>

<style scoped>
</style>
