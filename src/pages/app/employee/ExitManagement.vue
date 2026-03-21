<script setup lang="ts">
defineOptions({ name: 'ExitManagement' })

import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface ExitRecord {
  id: number
  employee_name: string
  employee_id: number
  exit_type: string
  reason: string
  last_working_date: string
  notice_period_days: number
  status: string
  interview_date: string | null
  interview_notes: string | null
  fnf_amount: number | null
  clearances: ClearanceItem[]
}

interface ClearanceItem {
  id: number
  name: string
  is_cleared: boolean
}

interface Employee { id: number; first_name: string; last_name: string }

const exits = ref<ExitRecord[]>([])
const loading = ref(false)
const employees = ref<Employee[]>([])

// ── List ──
async function fetchExits() {
  loading.value = true
  try {
    const { data } = await api.get('/exits')
    exits.value = data.data ?? data
  } catch { /* silently ignore */ }
  finally { loading.value = false }
}

async function fetchEmployees() {
  try {
    const { data } = await api.get('/employees', { params: { per_page: 200 } })
    employees.value = data.data ?? data
  } catch { /* silently ignore */ }
}

// ── Initiate Exit ──
const showInitiateForm = ref(false)
const initiateForm = ref({ employee_id: '', exit_type: 'resignation', reason: '', last_working_date: '', notice_period_days: 30 })
const initiating = ref(false)
const exitTypes = ['resignation', 'termination', 'retirement', 'contract_end']

async function initiateExit() {
  initiating.value = true
  try {
    await api.post('/exits', initiateForm.value)
    showInitiateForm.value = false
    initiateForm.value = { employee_id: '', exit_type: 'resignation', reason: '', last_working_date: '', notice_period_days: 30 }
    await fetchExits()
  } catch { /* silently ignore */ }
  finally { initiating.value = false }
}

// ── Detail Panel ──
const selectedExit = ref<ExitRecord | null>(null)
const interviewDate = ref('')
const interviewNotes = ref('')
const fnfAmount = ref('')
const actionLoading = ref(false)

function selectExit(exit: ExitRecord) {
  selectedExit.value = exit
  interviewDate.value = exit.interview_date ?? ''
  interviewNotes.value = exit.interview_notes ?? ''
  fnfAmount.value = exit.fnf_amount?.toString() ?? ''
}

async function scheduleInterview() {
  if (!selectedExit.value || !interviewDate.value) return
  actionLoading.value = true
  try {
    await api.post(`/exits/${selectedExit.value.id}/schedule-interview`, { interview_date: interviewDate.value })
    selectedExit.value.interview_date = interviewDate.value
    await fetchExits()
  } catch { /* silently ignore */ }
  finally { actionLoading.value = false }
}

async function completeInterview() {
  if (!selectedExit.value) return
  actionLoading.value = true
  try {
    await api.post(`/exits/${selectedExit.value.id}/complete-interview`, { notes: interviewNotes.value })
    selectedExit.value.interview_notes = interviewNotes.value
    await fetchExits()
  } catch { /* silently ignore */ }
  finally { actionLoading.value = false }
}

async function toggleClearance(clearance: ClearanceItem) {
  if (!selectedExit.value) return
  try {
    await api.put(`/exits/${selectedExit.value.id}/clearances/${clearance.id}`, { is_cleared: !clearance.is_cleared })
    clearance.is_cleared = !clearance.is_cleared
  } catch { /* silently ignore */ }
}

async function processFnf() {
  if (!selectedExit.value || !fnfAmount.value) return
  actionLoading.value = true
  try {
    await api.post(`/exits/${selectedExit.value.id}/process-fnf`, { fnf_amount: parseFloat(fnfAmount.value) })
    selectedExit.value.fnf_amount = parseFloat(fnfAmount.value)
    await fetchExits()
  } catch { /* silently ignore */ }
  finally { actionLoading.value = false }
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    initiated: 'bg-blue-900/50 text-blue-400',
    notice_period: 'bg-yellow-900/50 text-yellow-400',
    clearance: 'bg-orange-900/50 text-orange-400',
    fnf_pending: 'bg-purple-900/50 text-purple-400',
    completed: 'bg-green-900/50 text-green-400',
    cancelled: 'bg-gray-700 text-gray-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
}

function exitTypeBadgeClass(type: string) {
  const map: Record<string, string> = {
    resignation: 'bg-blue-900/50 text-blue-400',
    termination: 'bg-red-900/50 text-red-400',
    retirement: 'bg-green-900/50 text-green-400',
    contract_end: 'bg-yellow-900/50 text-yellow-400',
  }
  return map[type] ?? 'bg-gray-700 text-gray-300'
}

const defaultClearanceItems = ['IT Access', 'Assets Return', 'Knowledge Transfer', 'Finance Clearance', 'HR Clearance']

onMounted(() => {
  fetchExits()
  fetchEmployees()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Exit Management</h1>
        <p class="mt-1 text-sm text-gray-400">Manage employee exits, clearances, and final settlements</p>
      </div>
      <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" @click="showInitiateForm = true">Initiate Exit</button>
    </div>

    <!-- Initiate Exit Modal -->
    <div v-if="showInitiateForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-lg p-6 space-y-4">
        <h3 class="text-lg font-semibold text-white">Initiate Exit</h3>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Employee</label>
          <select v-model="initiateForm.employee_id" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
            <option value="">Select employee</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Exit Type</label>
          <select v-model="initiateForm.exit_type" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
            <option v-for="t in exitTypes" :key="t" :value="t">{{ t.replace(/_/g, ' ') }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Reason</label>
          <textarea v-model="initiateForm.reason" rows="3" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Last Working Date</label>
            <input v-model="initiateForm.last_working_date" type="date" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Notice Period (days)</label>
            <input v-model.number="initiateForm.notice_period_days" type="number" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          </div>
        </div>
        <div class="flex justify-end gap-3">
          <button class="bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 px-4 py-2 text-sm font-medium rounded-lg" @click="showInitiateForm = false">Cancel</button>
          <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" :disabled="initiating" @click="initiateExit">{{ initiating ? 'Initiating...' : 'Initiate' }}</button>
        </div>
      </div>
    </div>

    <!-- Detail Panel -->
    <div v-if="selectedExit" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-5">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-white">{{ selectedExit.employee_name }}</h3>
        <button class="text-gray-400 hover:text-gray-300 text-sm" @click="selectedExit = null">Close</button>
      </div>

      <!-- Exit Info -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p class="text-xs text-gray-400">Exit Type</p>
          <span class="px-2 py-0.5 text-xs rounded-full mt-1 inline-block" :class="exitTypeBadgeClass(selectedExit.exit_type)">{{ selectedExit.exit_type.replace(/_/g, ' ') }}</span>
        </div>
        <div>
          <p class="text-xs text-gray-400">Last Working Date</p>
          <p class="text-sm text-white mt-1">{{ selectedExit.last_working_date }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-400">Notice Period</p>
          <p class="text-sm text-white mt-1">{{ selectedExit.notice_period_days }} days</p>
        </div>
        <div>
          <p class="text-xs text-gray-400">Status</p>
          <span class="px-2 py-0.5 text-xs rounded-full mt-1 inline-block" :class="statusBadgeClass(selectedExit.status)">{{ selectedExit.status.replace(/_/g, ' ') }}</span>
        </div>
      </div>

      <!-- Exit Interview -->
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <h4 class="text-sm font-semibold text-white">Exit Interview</h4>
        <div v-if="!selectedExit.interview_date" class="flex items-end gap-3">
          <div class="flex-1">
            <label class="block text-xs text-gray-400 mb-1">Interview Date</label>
            <input v-model="interviewDate" type="date" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          </div>
          <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" :disabled="actionLoading" @click="scheduleInterview">Schedule</button>
        </div>
        <div v-else-if="!selectedExit.interview_notes" class="space-y-2">
          <p class="text-sm text-gray-400">Scheduled: {{ selectedExit.interview_date }}</p>
          <textarea v-model="interviewNotes" rows="3" placeholder="Interview notes..." class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" :disabled="actionLoading" @click="completeInterview">Complete Interview</button>
        </div>
        <div v-else>
          <p class="text-sm text-gray-400">Completed on {{ selectedExit.interview_date }}</p>
          <p class="text-sm text-gray-300 mt-1">{{ selectedExit.interview_notes }}</p>
        </div>
      </div>

      <!-- Clearance Checklist -->
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <h4 class="text-sm font-semibold text-white">Clearance Checklist</h4>
        <div class="space-y-2">
          <label
            v-for="item in (selectedExit.clearances ?? defaultClearanceItems.map((n, i) => ({ id: i+1, name: n, is_cleared: false })))"
            :key="item.id"
            class="flex items-center gap-3 p-2 rounded hover:bg-gray-700/50 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="item.is_cleared"
              class="rounded border-gray-600 bg-gray-700 text-blue-600"
              @change="toggleClearance(item)"
            />
            <span class="text-sm" :class="item.is_cleared ? 'text-gray-500 line-through' : 'text-gray-300'">{{ item.name }}</span>
          </label>
        </div>
      </div>

      <!-- FnF Settlement -->
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <h4 class="text-sm font-semibold text-white">Final Settlement (FnF)</h4>
        <div v-if="selectedExit.fnf_amount">
          <p class="text-sm text-green-400">Processed: ${{ selectedExit.fnf_amount.toLocaleString() }}</p>
        </div>
        <div v-else class="flex items-end gap-3">
          <div class="flex-1">
            <label class="block text-xs text-gray-400 mb-1">FnF Amount</label>
            <input v-model="fnfAmount" type="number" step="0.01" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" placeholder="0.00" />
          </div>
          <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" :disabled="actionLoading" @click="processFnf">Process FnF</button>
        </div>
      </div>
    </div>

    <!-- Exit List Table -->
    <div v-if="loading" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
          <tr>
            <th class="px-4 py-3">Employee</th>
            <th class="px-4 py-3">Exit Type</th>
            <th class="px-4 py-3">Last Working Date</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="exit in exits" :key="exit.id" class="text-gray-300 hover:bg-gray-700/30 cursor-pointer" @click="selectExit(exit)">
            <td class="px-4 py-3 text-white font-medium">{{ exit.employee_name }}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 text-xs rounded-full" :class="exitTypeBadgeClass(exit.exit_type)">{{ exit.exit_type.replace(/_/g, ' ') }}</span></td>
            <td class="px-4 py-3">{{ exit.last_working_date }}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 text-xs rounded-full" :class="statusBadgeClass(exit.status)">{{ exit.status.replace(/_/g, ' ') }}</span></td>
            <td class="px-4 py-3">
              <button class="text-blue-400 hover:text-blue-300 text-xs" @click.stop="selectExit(exit)">View</button>
            </td>
          </tr>
          <tr v-if="exits.length === 0"><td colspan="5" class="px-4 py-8 text-center text-gray-500">No exit records</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
