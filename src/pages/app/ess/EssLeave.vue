<script setup lang="ts">
defineOptions({ name: 'EssLeave' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { leaveService, type LeaveBalanceSummary } from '@/services/leave'

interface LeaveApplication {
  id: string
  leaveType?: { name: string }
  start_date: string
  end_date: string
  days_requested: number
  reason: string
  status: string
  created_at: string
}

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const success = ref('')
const balanceSummary = ref<LeaveBalanceSummary[]>([])
const applications = ref<LeaveApplication[]>([])
const showForm = ref(false)
const employeeId = ref<string>('')

const form = ref({
  leave_type_id: '' as string | number,
  start_date: '',
  end_date: '',
  reason: '',
  leave_period: 'full_day' as 'full_day' | 'half_day_morning' | 'half_day_afternoon',
})

const selectedBalance = computed<LeaveBalanceSummary | null>(() => {
  if (!form.value.leave_type_id) return null
  const id = Number(form.value.leave_type_id)
  return balanceSummary.value.find(b => Number(b.leave_type_id) === id) ?? null
})

const requestedDays = computed<number>(() => {
  if (!form.value.start_date || !form.value.end_date) return 0
  const start = new Date(form.value.start_date)
  const end = new Date(form.value.end_date)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1
})

const balanceWarning = computed<string>(() => {
  if (!selectedBalance.value) return ''
  if (requestedDays.value > 0 && requestedDays.value > selectedBalance.value.available) {
    return `Only ${selectedBalance.value.available} days available`
  }
  return ''
})

const load = async () => {
  loading.value = true
  try {
    const [summaryRes, appRes, profileRes] = await Promise.allSettled([
      leaveService.getMyBalanceSummary(),
      api.get('/leave-requests', { params: { my_applications: true } }),
      api.get('/ess/profile'),
    ])
    if (summaryRes.status === 'fulfilled') balanceSummary.value = summaryRes.value
    if (appRes.status === 'fulfilled') applications.value = appRes.value.data?.data ?? []
    if (profileRes.status === 'fulfilled') employeeId.value = profileRes.value.data?.data?.employee?.id ?? ''
  } catch {
    error.value = 'Failed to load leave data'
  } finally {
    loading.value = false
  }
}

const applyLeave = async () => {
  error.value = ''
  if (!employeeId.value) {
    error.value = 'Employee profile not found. Please contact HR.'
    return
  }
  if (selectedBalance.value && requestedDays.value > selectedBalance.value.available) {
    error.value = `Only ${selectedBalance.value.available} days available for ${selectedBalance.value.leave_type}`
    return
  }
  submitting.value = true
  try {
    await leaveService.createLeaveRequest({
      employee_id: employeeId.value as unknown as number,
      leave_type_id: Number(form.value.leave_type_id),
      start_date: form.value.start_date,
      end_date: form.value.end_date,
      leave_period: form.value.leave_period,
      reason: form.value.reason,
    })
    success.value = 'Leave application submitted successfully!'
    showForm.value = false
    form.value = { leave_type_id: '', start_date: '', end_date: '', reason: '', leave_period: 'full_day' }
    setTimeout(() => (success.value = ''), 4000)
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string; error?: string } } }
    error.value = err.response?.data?.error ?? err.response?.data?.message ?? 'Failed to submit leave application'
  } finally {
    submitting.value = false
  }
}

const getStatusClass = (s: string) => {
  const map: Record<string, string> = {
    approved: 'bg-green-900/50 text-green-400',
    pending: 'bg-yellow-900/50 text-yellow-400',
    rejected: 'bg-red-900/50 text-red-400',
    cancelled: 'bg-gray-700 text-gray-400',
  }
  return map[s] ?? 'bg-gray-700 text-gray-300'
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>
    <div v-if="success" class="bg-green-900/30 border border-green-700 rounded-lg p-4">
      <p class="text-sm text-green-400">{{ success }}</p>
    </div>

    <!-- Leave Balances -->
    <div>
      <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        Leave Balances
      </h3>
      <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
        >
          <div class="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div class="h-8 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
      <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="bal in balanceSummary"
          :key="bal.leave_type_id"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4"
        >
          <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">
            {{ bal.leave_type }}
            <span class="text-gray-500 normal-case">({{ bal.code }})</span>
          </p>
          <p class="text-2xl font-bold text-white">{{ bal.available }}</p>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ bal.used }} used / {{ bal.balance }} total
            <span v-if="Number(bal.pending) > 0"> · {{ bal.pending }} pending</span>
          </p>
        </div>
        <div v-if="!balanceSummary.length" class="col-span-4 text-sm text-gray-500">
          No leave balance data available.
        </div>
      </div>
    </div>

    <!-- Apply button -->
    <div class="flex justify-end">
      <button
        @click="showForm = !showForm"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Apply for Leave
      </button>
    </div>

    <!-- Apply form -->
    <div v-if="showForm" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        New Leave Application
      </h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Leave Type *</label>
          <select
            v-model="form.leave_type_id"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select type</option>
            <option
              v-for="bal in balanceSummary"
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
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">From Date *</label>
          <input
            v-model="form.start_date"
            type="date"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">To Date *</label>
          <input
            v-model="form.end_date"
            type="date"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Leave Period</label>
          <select
            v-model="form.leave_period"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          >
            <option value="full_day">Full Day</option>
            <option value="half_day_morning">Half Day (Morning)</option>
            <option value="half_day_afternoon">Half Day (Afternoon)</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">Reason *</label>
        <textarea
          v-model="form.reason"
          rows="3"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
        ></textarea>
      </div>
      <div v-if="balanceWarning" class="text-xs text-yellow-400">
        ⚠ {{ balanceWarning }} (requesting {{ requestedDays }} days)
      </div>
      <div class="flex gap-3">
        <button
          @click="applyLeave"
          :disabled="submitting || !!balanceWarning"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >{{ submitting ? 'Submitting...' : 'Submit Application' }}</button>
        <button
          @click="showForm = false"
          class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >Cancel</button>
      </div>
    </div>

    <!-- Leave History -->
    <div>
      <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
        Leave History
      </h3>
      <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
        <div class="space-y-3">
          <div v-for="i in 4" :key="i" class="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
      <div v-else-if="applications.length" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-700">
          <thead class="bg-gray-700/50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Type</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">From</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">To</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Days</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="app in applications" :key="app.id" class="hover:bg-gray-700/30 transition-colors">
              <td class="px-4 py-3 text-sm font-medium text-white">{{ app.leaveType?.name ?? '—' }}</td>
              <td class="px-4 py-3 text-sm text-gray-300">{{ formatDate(app.start_date) }}</td>
              <td class="px-4 py-3 text-sm text-gray-300">{{ formatDate(app.end_date) }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-300">{{ app.days_requested }}</td>
              <td class="px-4 py-3">
                <span
                  :class="[
                    'inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize',
                    getStatusClass(app.status),
                  ]"
                >{{ app.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
        <p class="text-gray-500">No leave applications found.</p>
      </div>
    </div>
  </div>
</template>
