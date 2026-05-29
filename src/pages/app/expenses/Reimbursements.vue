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

const statusBadge: Record<string, string> = {
  pending: 'rb-badge-yellow',
  processed: 'rb-badge-blue',
  paid: 'rb-badge-teal',
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
  <div class="rb-page">
    <h1 class="rb-title">Reimbursements</h1>

    <div v-if="loading" class="rb-card rb-loading">
      <div v-for="i in 5" :key="i" class="rb-skeleton"></div>
    </div>

    <div v-else-if="error" class="rb-error">{{ error }}</div>

    <div v-else class="rb-card">
      <table class="rb-table">
        <thead>
          <tr>
            <th class="rb-th">Employee</th>
            <th class="rb-th">Claim Title</th>
            <th class="rb-th rb-th-right">Amount</th>
            <th class="rb-th">Status</th>
            <th class="rb-th">Payment Mode</th>
            <th class="rb-th">Payment Date</th>
            <th class="rb-th">Reference</th>
            <th class="rb-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in reimbursements" :key="r.id" class="rb-row">
            <td class="rb-td rb-td-name">{{ r.employee_name || r.claim?.employee_name || '-' }}</td>
            <td class="rb-td">{{ r.claim?.title || '-' }}</td>
            <td class="rb-td rb-td-right rb-mono rb-bold">{{ fmtCurrency(r.amount) }}</td>
            <td class="rb-td">
              <span :class="['rb-badge', statusBadge[r.status] ?? 'rb-badge-muted']">{{ r.status }}</span>
            </td>
            <td class="rb-td rb-capitalize">{{ r.payment_mode?.replace('_', ' ') || '-' }}</td>
            <td class="rb-td">{{ fmtDate(r.payment_date) }}</td>
            <td class="rb-td rb-mono-sm">{{ r.reference_id || '-' }}</td>
            <td class="rb-td">
              <div class="rb-actions">
                <button v-if="r.status === 'pending'" class="rb-btn-process" @click="openProcess(r.id)">Process</button>
                <button v-if="r.status === 'processed'" class="rb-btn-paid" @click="handleMarkPaid(r.id)">Mark Paid</button>
              </div>
            </td>
          </tr>
          <tr v-if="!reimbursements.length">
            <td colspan="8" class="rb-td-empty">No reimbursements found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="rb-overlay" @click.self="showModal = false">
        <div class="rb-modal">
          <h3 class="rb-modal-title">Process Reimbursement</h3>
          <div class="rb-modal-field">
            <label class="rb-label">Payment Mode</label>
            <select v-model="modalForm.payment_mode" class="rb-input">
              <option v-for="m in paymentModes" :key="m" :value="m">{{ m.replace('_', ' ') }}</option>
            </select>
          </div>
          <div class="rb-modal-field">
            <label class="rb-label">Payment Date</label>
            <input v-model="modalForm.payment_date" type="date" class="rb-input" />
          </div>
          <div class="rb-modal-field">
            <label class="rb-label">Reference ID</label>
            <input v-model="modalForm.reference_id" type="text" class="rb-input" placeholder="Transaction reference…" />
          </div>
          <div class="rb-modal-field">
            <label class="rb-label">Notes</label>
            <textarea v-model="modalForm.notes" rows="2" class="rb-input rb-textarea" placeholder="Optional notes…" />
          </div>
          <div class="rb-modal-footer">
            <button class="rb-btn-ghost" @click="showModal = false">Cancel</button>
            <button :disabled="modalLoading" class="rb-btn-submit" @click="handleProcess">
              {{ modalLoading ? 'Processing…' : 'Process' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.rb-page { display: flex; flex-direction: column; gap: 16px; }
.rb-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0; }
.rb-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.rb-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.rb-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.rb-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: rb-pulse 1.2s ease-in-out infinite; }
@keyframes rb-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.rb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rb-th { padding: 11px 14px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; white-space: nowrap; }
.rb-th-right { text-align: right; }
.rb-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.rb-row:last-child { border-bottom: none; }
.rb-row:hover { background: rgba(255,255,255,0.02); }
.rb-td { padding: 11px 14px; color: #B6BED0; vertical-align: middle; }
.rb-td-name { color: #EEF0F4; font-weight: 500; }
.rb-td-right { text-align: right; }
.rb-td-empty { padding: 32px 14px; text-align: center; color: #7A8299; font-size: 13px; }
.rb-mono { font-family: 'JetBrains Mono', monospace; }
.rb-mono-sm { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.rb-bold { font-weight: 600; }
.rb-capitalize { text-transform: capitalize; }
.rb-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.rb-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.rb-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.rb-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.rb-badge-teal   { background: rgba(77,211,154,0.12); color: #4DD39A; }
.rb-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.rb-actions { display: flex; gap: 8px; }
.rb-btn-process { background: rgba(107,91,255,0.15); border: 1px solid rgba(107,91,255,0.3); color: #8A7BFF; border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 500; cursor: pointer; }
.rb-btn-process:hover { background: rgba(107,91,255,0.25); }
.rb-btn-paid { background: rgba(77,211,154,0.12); border: 1px solid rgba(77,211,154,0.25); color: #4DD39A; border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 500; cursor: pointer; }
.rb-btn-paid:hover { background: rgba(77,211,154,0.22); }
.rb-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.65); }
.rb-modal { background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 24px; width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 14px; }
.rb-modal-title { font-size: 15px; font-weight: 600; color: #EEF0F4; margin: 0; }
.rb-modal-field { display: flex; flex-direction: column; gap: 5px; }
.rb-label { font-size: 12px; font-weight: 500; color: #7A8299; }
.rb-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.rb-input:focus { border-color: #6B5BFF; }
.rb-textarea { resize: vertical; min-height: 60px; }
.rb-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
.rb-btn-ghost { background: transparent; border: 1px solid #232936; color: #7A8299; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.rb-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.rb-btn-submit { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 18px; font-size: 13px; font-weight: 500; cursor: pointer; }
.rb-btn-submit:hover:not(:disabled) { opacity: 0.88; }
.rb-btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
