<script setup lang="ts">
defineOptions({ name: 'ExpenseReimbursements' })

import { ref, onMounted } from 'vue'
import expenseService, { type Reimbursement } from '@/services/expenseService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

interface ReimbursementRow extends Reimbursement {
  employee_name?: string
}

const loading = ref(true)
const error = ref('')
const reimbursements = ref<ReimbursementRow[]>([])

// Process modal
const showModal = ref(false)
const modalTarget = ref<number | null>(null)
const modalLoading = ref(false)
const modalForm = ref({
  payment_mode: 'bank_transfer',
  payment_date: '',
  reference_id: '',
  notes: '',
})

const paymentModes = ['bank_transfer', 'cash', 'cheque', 'upi', 'wire']

const statusClass: Record<string, string> = {
  pending: 'bg-yellow-900/50 text-yellow-400',
  processed: 'bg-blue-900/50 text-blue-400',
  paid: 'bg-teal-900/50 text-teal-400',
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function fmtDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function openProcess(id: number) {
  modalTarget.value = id
  modalForm.value = { payment_mode: 'bank_transfer', payment_date: '', reference_id: '', notes: '' }
  showModal.value = true
}

async function handleProcess() {
  if (!modalTarget.value) return
  modalLoading.value = true
  try {
    await expenseService.processReimbursement(modalTarget.value, { ...modalForm.value })
    showModal.value = false
    await fetchData()
  } catch {
    error.value = 'Failed to process reimbursement.'
  } finally {
    modalLoading.value = false
  }
}

async function handleMarkPaid(id: number) {
  if (!await dialog('Confirm', 'Mark this reimbursement as paid?')) return
  try {
    await expenseService.markPaid(id)
    await fetchData()
  } catch {
    error.value = 'Failed to mark as paid.'
  }
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const res = await expenseService.getReimbursements()
    reimbursements.value = res.data?.data ?? res.data ?? []
  } catch {
    error.value = 'Failed to load reimbursements.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-white">Reimbursements</h1>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div v-for="i in 5" :key="i" class="h-4 bg-gray-700 rounded mb-4" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

    <!-- Table -->
    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-700/50">
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Employee</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Claim Title</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Amount</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Status</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Payment Mode</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Payment Date</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Reference</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="r in reimbursements" :key="r.id" class="hover:bg-gray-700/30">
            <td class="px-5 py-3 text-white text-sm">{{ r.employee_name || r.claim?.employee_name || '-' }}</td>
            <td class="px-5 py-3 text-gray-300 text-sm">{{ r.claim?.title || '-' }}</td>
            <td class="px-5 py-3 text-white text-sm">{{ fmtCurrency(r.amount) }}</td>
            <td class="px-5 py-3">
              <span :class="[statusClass[r.status] || 'bg-gray-700 text-gray-300', 'text-xs px-2 py-0.5 rounded-full font-medium']">
                {{ r.status }}
              </span>
            </td>
            <td class="px-5 py-3 text-gray-400 text-sm">{{ r.payment_mode?.replace('_', ' ') || '-' }}</td>
            <td class="px-5 py-3 text-gray-400 text-sm">{{ fmtDate(r.payment_date) }}</td>
            <td class="px-5 py-3 text-gray-400 text-sm">{{ r.reference_id || '-' }}</td>
            <td class="px-5 py-3">
              <div class="flex gap-2">
                <button
                  v-if="r.status === 'pending'"
                  class="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  @click="openProcess(r.id)"
                >
                  Process
                </button>
                <button
                  v-if="r.status === 'processed'"
                  class="px-3 py-1 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                  @click="handleMarkPaid(r.id)"
                >
                  Mark Paid
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!reimbursements.length">
            <td colspan="8" class="px-5 py-8 text-center text-gray-500">No reimbursements found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Process modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="showModal = false">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md space-y-4">
          <h3 class="text-lg font-semibold text-white">Process Reimbursement</h3>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Payment Mode</label>
            <select v-model="modalForm.payment_mode" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none">
              <option v-for="m in paymentModes" :key="m" :value="m">{{ m.replace('_', ' ') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Payment Date</label>
            <input v-model="modalForm.payment_date" type="date" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Reference ID</label>
            <input v-model="modalForm.reference_id" type="text" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none" placeholder="Transaction reference..." />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea v-model="modalForm.notes" rows="2" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none" placeholder="Optional notes..." />
          </div>
          <div class="flex justify-end gap-3">
            <button class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors" @click="showModal = false">
              Cancel
            </button>
            <button
              :disabled="modalLoading"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
              @click="handleProcess"
            >
              {{ modalLoading ? 'Processing...' : 'Process' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
