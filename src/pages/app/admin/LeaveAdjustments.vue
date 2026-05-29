<template>
  <section class="la-page">
    <div class="la-header">
      <div>
        <h1 class="la-title">Leave Adjustments</h1>
        <p class="la-sub">Manually credit, debit or override employee leave balances.</p>
      </div>
      <button class="la-btn-primary" @click="openCreate()">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        New Adjustment
      </button>
    </div>

    <!-- Filters -->
    <div class="la-filters">
      <select v-model="filters.balance_year" class="la-select" @change="loadAdjustments">
        <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
      </select>
      <select v-model="filters.adjustment_type" class="la-select" @change="loadAdjustments">
        <option value="">All Types</option>
        <option value="credit">Credit</option>
        <option value="debit">Debit</option>
        <option value="override">Override</option>
      </select>
      <select v-model="filters.reason_type" class="la-select" @change="loadAdjustments">
        <option value="">All Reasons</option>
        <option value="encashment">Encashment</option>
        <option value="carry_forward_correction">Carry Forward Correction</option>
        <option value="unpaid_leave_conversion">Unpaid Leave Conversion</option>
        <option value="manual_correction">Manual Correction</option>
        <option value="other">Other</option>
      </select>
    </div>

    <!-- Table -->
    <div class="la-card">
      <table class="la-table">
        <thead>
          <tr>
            <th class="la-th">Employee</th>
            <th class="la-th">Leave Type</th>
            <th class="la-th">Type</th>
            <th class="la-th">Amount</th>
            <th class="la-th">Reason</th>
            <th class="la-th">Year</th>
            <th class="la-th">Created By</th>
            <th class="la-th">Date</th>
            <th class="la-th"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="adj in adjustments" :key="adj.id" class="la-row">
            <td class="la-td la-td-name">
              {{ adj.employee ? `${adj.employee.first_name} ${adj.employee.last_name || ''}`.trim() : `#${adj.employee_id}` }}
            </td>
            <td class="la-td">{{ adj.leaveType?.name || adj.leave_type?.name || `#${adj.leave_type_id}` }}</td>
            <td class="la-td">
              <span :class="['la-badge', adj.adjustment_type === 'credit' ? 'la-badge-green' : adj.adjustment_type === 'debit' ? 'la-badge-red' : 'la-badge-blue']">
                {{ adj.adjustment_type }}
              </span>
            </td>
            <td class="la-td la-td-amount">
              <span :class="adj.adjustment_type === 'debit' ? 'la-neg' : 'la-pos'">
                {{ adj.adjustment_type === 'debit' ? '−' : '+' }}{{ adj.adjustment_amount }}
              </span>
            </td>
            <td class="la-td la-td-reason">
              <div class="la-reason-type">{{ adj.reason_type?.replace(/_/g, ' ') }}</div>
              <div class="la-reason-note">{{ adj.reason }}</div>
            </td>
            <td class="la-td la-td-year">{{ adj.balance_year }}</td>
            <td class="la-td">{{ adj.created_by_user?.name || adj.createdBy?.name || '—' }}</td>
            <td class="la-td la-td-date">{{ adj.created_at ? new Date(adj.created_at).toLocaleDateString() : '—' }}</td>
            <td class="la-td la-td-right">
              <button v-if="adj.adjustment_type !== 'override'" class="la-btn-danger" @click="removeAdjustment(adj)">
                Reverse
              </button>
            </td>
          </tr>
          <tr v-if="!adjustments.length && !loading">
            <td colspan="9" class="la-empty">No adjustments found.</td>
          </tr>
          <tr v-if="loading">
            <td colspan="9" class="la-empty">Loading…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="la-pagination">
      <button v-for="p in totalPages" :key="p"
        :class="['la-page-btn', p === currentPage && 'la-page-btn-active']"
        @click="goToPage(p)">
        {{ p }}
      </button>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreate" class="la-overlay" @click.self="showCreate = false">
        <div class="la-modal">
          <div class="la-modal-head">
            <h2 class="la-modal-title">New Leave Adjustment</h2>
            <button class="la-modal-close" @click="showCreate = false">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div v-if="formError" class="la-form-error">{{ formError }}</div>

          <div class="la-form-body">
            <div class="la-field">
              <label class="la-label">Employee *</label>
              <select v-model="form.employee_id" class="la-input">
                <option value="">Select employee</option>
                <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                  {{ emp.first_name }} {{ emp.last_name || '' }} {{ emp.employee_id ? `(${emp.employee_id})` : '' }}
                </option>
              </select>
            </div>

            <div class="la-field">
              <label class="la-label">Leave Type *</label>
              <select v-model="form.leave_type_id" class="la-input">
                <option value="">Select leave type</option>
                <option v-for="lt in leaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }} ({{ lt.code }})</option>
              </select>
            </div>

            <div class="la-grid-2">
              <div class="la-field">
                <label class="la-label">Adjustment Type *</label>
                <select v-model="form.adjustment_type" class="la-input">
                  <option value="credit">Credit (Add)</option>
                  <option value="debit">Debit (Subtract)</option>
                  <option value="override">Override (Set)</option>
                </select>
              </div>
              <div class="la-field">
                <label class="la-label">Amount (days) *</label>
                <input v-model.number="form.adjustment_amount" type="number" step="0.5" min="0.5" class="la-input" />
              </div>
            </div>

            <div class="la-grid-2">
              <div class="la-field">
                <label class="la-label">Reason Type *</label>
                <select v-model="form.reason_type" class="la-input">
                  <option value="encashment">Encashment</option>
                  <option value="carry_forward_correction">Carry Forward Correction</option>
                  <option value="unpaid_leave_conversion">Unpaid Leave Conversion</option>
                  <option value="manual_correction">Manual Correction</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="la-field">
                <label class="la-label">Balance Year *</label>
                <select v-model.number="form.balance_year" class="la-input">
                  <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
                </select>
              </div>
            </div>

            <div class="la-field">
              <label class="la-label">Reason / Notes *</label>
              <textarea v-model="form.reason" rows="3" class="la-input la-textarea" placeholder="Explain the reason for this adjustment…"></textarea>
            </div>
          </div>

          <div class="la-modal-foot">
            <button class="la-btn-ghost" @click="showCreate = false">Cancel</button>
            <button class="la-btn-primary" :disabled="saving" @click="submitAdjustment">
              {{ saving ? 'Saving…' : 'Create Adjustment' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { leaveService } from '@/services/leave'
import type { LeaveAdjustment, LeaveType, Employee } from '@/services/leave'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const toast = useToast()
const { confirm: dialog } = useConfirm()

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    formError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to create adjustment.'
  } finally {
    saving.value = false
  }
}

async function removeAdjustment(adj: LeaveAdjustment) {
  if (!await dialog('Confirm', `Reverse this ${adj.adjustment_type} of ${adj.adjustment_amount} days?`)) return
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

<style scoped>
.la-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.la-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.la-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.la-sub { margin: 4px 0 0; font-size: 13px; color: #7A8299; }

.la-btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  background: #6B5BFF; border: none; color: #fff;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: opacity 0.15s;
}
.la-btn-primary:hover { opacity: 0.88; }
.la-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.la-filters { display: flex; flex-wrap: wrap; gap: 10px; }
.la-select {
  background: #161A23; border: 1px solid #232936; color: #EEF0F4;
  border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; cursor: pointer;
}
.la-select:focus { border-color: #6B5BFF; }

.la-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.la-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.la-th { padding: 11px 14px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.la-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.la-row:last-child { border-bottom: none; }
.la-row:hover { background: rgba(255,255,255,0.02); }
.la-td { padding: 12px 14px; color: #B6BED0; vertical-align: middle; }
.la-td-name { color: #EEF0F4; font-weight: 500; }
.la-td-amount { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 600; }
.la-td-year { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #7A8299; }
.la-td-date { font-size: 12px; color: #7A8299; white-space: nowrap; }
.la-td-right { text-align: right; }
.la-td-reason { max-width: 200px; }
.la-reason-type { font-size: 11px; font-weight: 500; text-transform: capitalize; color: #B6BED0; }
.la-reason-note { font-size: 11px; color: #7A8299; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.la-pos { color: #4DD39A; }
.la-neg { color: #F38288; }
.la-empty { padding: 32px; text-align: center; color: #7A8299; }

.la-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; }
.la-badge-green { background: rgba(77,211,154,0.12); color: #4DD39A; }
.la-badge-red { background: rgba(243,130,136,0.12); color: #F38288; }
.la-badge-blue { background: rgba(126,215,255,0.12); color: #7ED7FF; }

.la-pagination { display: flex; justify-content: center; gap: 6px; }
.la-page-btn { background: #161A23; border: 1px solid #232936; color: #7A8299; border-radius: 6px; padding: 5px 11px; font-size: 13px; cursor: pointer; transition: background 0.12s; }
.la-page-btn:hover { background: #232936; color: #EEF0F4; }
.la-page-btn-active { border-color: #6B5BFF; color: #6B5BFF; background: rgba(107,91,255,0.08); }

/* Modal */
.la-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
.la-modal { background: #161A23; border: 1px solid #232936; border-radius: 12px; width: 100%; max-width: 560px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.la-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid #232936; }
.la-modal-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 20px; font-weight: 400; color: #EEF0F4; }
.la-modal-close { background: none; border: none; color: #7A8299; cursor: pointer; padding: 4px; border-radius: 4px; }
.la-modal-close:hover { color: #EEF0F4; background: #232936; }
.la-form-error { margin: 12px 20px 0; padding: 10px 14px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 6px; font-size: 13px; color: #F38288; }
.la-form-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.la-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.la-field { display: flex; flex-direction: column; gap: 5px; }
.la-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.la-input {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 8px 12px; outline: none; width: 100%; box-sizing: border-box;
  transition: border-color 0.15s;
}
.la-input:focus { border-color: #6B5BFF; }
.la-textarea { resize: vertical; min-height: 80px; }
.la-modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #232936; }
.la-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer;
}
.la-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.la-btn-danger {
  background: rgba(243,130,136,0.08); border: 1px solid rgba(243,130,136,0.2); color: #F38288;
  border-radius: 6px; padding: 5px 11px; font-size: 12px; cursor: pointer;
}
.la-btn-danger:hover { background: rgba(243,130,136,0.16); }
</style>
