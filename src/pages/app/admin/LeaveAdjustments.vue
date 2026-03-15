<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-800">Leave Adjustments</h1>
      <button class="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" @click="openCreate()">
        New Adjustment
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <select v-model="filters.balance_year" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="loadAdjustments">
        <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
      </select>
      <select v-model="filters.adjustment_type" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="loadAdjustments">
        <option value="">All Types</option>
        <option value="credit">Credit</option>
        <option value="debit">Debit</option>
        <option value="override">Override</option>
      </select>
      <select v-model="filters.reason_type" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="loadAdjustments">
        <option value="">All Reasons</option>
        <option value="encashment">Encashment</option>
        <option value="carry_forward_correction">Carry Forward Correction</option>
        <option value="unpaid_leave_conversion">Unpaid Leave Conversion</option>
        <option value="manual_correction">Manual Correction</option>
        <option value="other">Other</option>
      </select>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Employee</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Leave Type</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Type</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Amount</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Reason</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Year</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Created By</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Date</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="adj in adjustments" :key="adj.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">
              {{ adj.employee ? `${adj.employee.first_name} ${adj.employee.last_name || ''}`.trim() : `#${adj.employee_id}` }}
            </td>
            <td class="px-4 py-3 text-slate-600">{{ adj.leaveType?.name || adj.leave_type?.name || `#${adj.leave_type_id}` }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="{
                  'bg-green-100 text-green-800': adj.adjustment_type === 'credit',
                  'bg-red-100 text-red-800': adj.adjustment_type === 'debit',
                  'bg-blue-100 text-blue-800': adj.adjustment_type === 'override',
                }">
                {{ adj.adjustment_type }}
              </span>
            </td>
            <td class="px-4 py-3 font-mono text-slate-800">
              <span :class="adj.adjustment_type === 'debit' ? 'text-red-600' : 'text-green-600'">
                {{ adj.adjustment_type === 'debit' ? '-' : '+' }}{{ adj.adjustment_amount }}
              </span>
            </td>
            <td class="px-4 py-3 text-slate-600">
              <div class="text-xs font-medium capitalize">{{ adj.reason_type?.replace(/_/g, ' ') }}</div>
              <div class="max-w-xs truncate text-xs text-slate-400">{{ adj.reason }}</div>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ adj.balance_year }}</td>
            <td class="px-4 py-3 text-slate-600">{{ adj.created_by_user?.name || adj.createdBy?.name || '—' }}</td>
            <td class="px-4 py-3 text-xs text-slate-400">{{ adj.created_at ? new Date(adj.created_at).toLocaleDateString() : '—' }}</td>
            <td class="px-4 py-3 text-right">
              <button v-if="adj.adjustment_type !== 'override'" class="rounded border border-red-300 bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100" @click="removeAdjustment(adj)">
                Reverse
              </button>
            </td>
          </tr>
          <tr v-if="!adjustments.length && !loading">
            <td colspan="9" class="px-4 py-8 text-center text-slate-400">No adjustments found.</td>
          </tr>
          <tr v-if="loading">
            <td colspan="9" class="px-4 py-8 text-center text-slate-400">Loading…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
      <button v-for="p in totalPages" :key="p"
        class="rounded border px-3 py-1 text-sm"
        :class="p === currentPage ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'"
        @click="goToPage(p)">
        {{ p }}
      </button>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 class="mb-4 text-lg font-semibold text-slate-800">New Leave Adjustment</h2>

        <div v-if="formError" class="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{{ formError }}</div>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Employee *</label>
            <select v-model="form.employee_id" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select employee</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                {{ emp.first_name }} {{ emp.last_name || '' }} {{ emp.employee_id ? `(${emp.employee_id})` : '' }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Leave Type *</label>
            <select v-model="form.leave_type_id" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select leave type</option>
              <option v-for="lt in leaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }} ({{ lt.code }})</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Adjustment Type *</label>
              <select v-model="form.adjustment_type" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="credit">Credit (Add)</option>
                <option value="debit">Debit (Subtract)</option>
                <option value="override">Override (Set)</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Amount (days) *</label>
              <input v-model.number="form.adjustment_amount" type="number" step="0.5" min="0.5" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Reason Type *</label>
              <select v-model="form.reason_type" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="encashment">Encashment</option>
                <option value="carry_forward_correction">Carry Forward Correction</option>
                <option value="unpaid_leave_conversion">Unpaid Leave Conversion</option>
                <option value="manual_correction">Manual Correction</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Balance Year *</label>
              <select v-model.number="form.balance_year" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Reason / Notes *</label>
            <textarea v-model="form.reason" rows="3" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Explain the reason for this adjustment…"></textarea>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="showCreate = false">Cancel</button>
          <button class="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50" :disabled="saving" @click="submitAdjustment">
            {{ saving ? 'Saving…' : 'Create Adjustment' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { leaveService } from '@/services/leave'
import type { LeaveAdjustment, LeaveType, Employee } from '@/services/leave'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const adjustments = ref<LeaveAdjustment[]>([])
const employees = ref<Employee[]>([])
const leaveTypes = ref<LeaveType[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreate = ref(false)
const formError = ref('')
const currentPage = ref(1)
const totalPages = ref(1)

const currentYear = new Date().getFullYear()
const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

const filters = reactive({
  balance_year: currentYear,
  adjustment_type: '',
  reason_type: '',
})

const form = reactive({
  employee_id: '' as number | '',
  leave_type_id: '' as number | '',
  adjustment_type: 'credit' as 'credit' | 'debit' | 'override',
  adjustment_amount: 1,
  reason_type: 'manual_correction',
  reason: '',
  balance_year: currentYear,
})

async function loadAdjustments(page = 1) {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page, balance_year: filters.balance_year }
    if (filters.adjustment_type) params.adjustment_type = filters.adjustment_type
    if (filters.reason_type) params.reason_type = filters.reason_type
    const result = await leaveService.getLeaveAdjustments(params as any)
    adjustments.value = result.data
    currentPage.value = result.current_page
    totalPages.value = result.last_page
  } catch {
    adjustments.value = []
  } finally {
    loading.value = false
  }
}

function goToPage(p: number) {
  loadAdjustments(p)
}

async function loadFormData() {
  try {
    const [empRes, ltRes] = await Promise.all([
      api.get('/employees'),
      leaveService.getLeaveTypes({ active_only: true }),
    ])
    employees.value = Array.isArray(empRes.data) ? empRes.data : (empRes.data.data ?? [])
    leaveTypes.value = ltRes
  } catch {
    // silent
  }
}

function openCreate() {
  formError.value = ''
  Object.assign(form, {
    employee_id: '',
    leave_type_id: '',
    adjustment_type: 'credit',
    adjustment_amount: 1,
    reason_type: 'manual_correction',
    reason: '',
    balance_year: currentYear,
  })
  showCreate.value = true
}

async function submitAdjustment() {
  formError.value = ''
  if (!form.employee_id || !form.leave_type_id || !form.reason) {
    formError.value = 'Please fill in all required fields.'
    return
  }
  saving.value = true
  try {
    await leaveService.createLeaveAdjustment({
      employee_id: Number(form.employee_id),
      leave_type_id: Number(form.leave_type_id),
      adjustment_type: form.adjustment_type,
      adjustment_amount: form.adjustment_amount,
      reason_type: form.reason_type,
      reason: form.reason,
      balance_year: form.balance_year,
    })
    showCreate.value = false
    toast.success('Adjustment created successfully.')
    loadAdjustments()
  } catch (e: any) {
    formError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to create adjustment.'
  } finally {
    saving.value = false
  }
}

async function removeAdjustment(adj: LeaveAdjustment) {
  if (!confirm(`Reverse this ${adj.adjustment_type} of ${adj.adjustment_amount} days?`)) return
  try {
    await leaveService.deleteLeaveAdjustment(adj.id)
    toast.success('Adjustment reversed.')
    loadAdjustments(currentPage.value)
  } catch {
    toast.error('Failed to reverse adjustment.')
  }
}

onMounted(() => {
  loadAdjustments()
  loadFormData()
})
</script>
