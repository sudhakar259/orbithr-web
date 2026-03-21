<script setup lang="ts">
defineOptions({ name: 'EssLeave' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface LeaveBalance {
  leave_type: string
  balance: number
  used: number
  total: number
}

interface LeaveApplication {
  id: number
  leave_type: string
  from_date: string
  to_date: string
  days: number
  reason: string
  status: string
  created_at: string
}

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const success = ref('')
const balances = ref<LeaveBalance[]>([])
const applications = ref<LeaveApplication[]>([])
const showForm = ref(false)
const leaveTypes = ref<{ id: number; name: string }[]>([])

const form = ref({
  leave_type_id: '',
  from_date: '',
  to_date: '',
  reason: '',
  is_half_day: false,
})

const load = async () => {
  loading.value = true
  try {
    const [balRes, appRes, typesRes] = await Promise.allSettled([
      api.get('/leave/my-leave-balances'),
      api.get('/leave/applications', { params: { my_applications: true } }),
      api.get('/leave/types'),
    ])
    if (balRes.status === 'fulfilled') balances.value = balRes.value.data?.data ?? []
    if (appRes.status === 'fulfilled') applications.value = appRes.value.data?.data ?? []
    if (typesRes.status === 'fulfilled') leaveTypes.value = typesRes.value.data?.data ?? []
  } catch {
    error.value = 'Failed to load leave data'
  } finally {
    loading.value = false
  }
}

const applyLeave = async () => {
  submitting.value = true
  error.value = ''
  try {
    await api.post('/leave/applications', form.value)
    success.value = 'Leave application submitted successfully!'
    showForm.value = false
    form.value = { leave_type_id: '', from_date: '', to_date: '', reason: '', is_half_day: false }
    setTimeout(() => (success.value = ''), 4000)
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message ?? 'Failed to submit leave application'
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
          v-for="bal in balances"
          :key="bal.leave_type"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4"
        >
          <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">{{ bal.leave_type }}</p>
          <p class="text-2xl font-bold text-white">{{ bal.balance }}</p>
          <p class="text-xs text-gray-500 mt-0.5">{{ bal.used }} used of {{ bal.total }}</p>
        </div>
        <div v-if="!balances.length" class="col-span-4 text-sm text-gray-500">
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
            <option v-for="t in leaveTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">From Date *</label>
          <input
            v-model="form.from_date"
            type="date"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">To Date *</label>
          <input
            v-model="form.to_date"
            type="date"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mb-2">
            <input v-model="form.is_half_day" type="checkbox" class="rounded" />
            Half Day
          </label>
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
      <div class="flex gap-3">
        <button
          @click="applyLeave"
          :disabled="submitting"
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
              <td class="px-4 py-3 text-sm font-medium text-white">{{ app.leave_type }}</td>
              <td class="px-4 py-3 text-sm text-gray-300">{{ formatDate(app.from_date) }}</td>
              <td class="px-4 py-3 text-sm text-gray-300">{{ formatDate(app.to_date) }}</td>
              <td class="px-4 py-3 text-sm text-right text-gray-300">{{ app.days }}</td>
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
