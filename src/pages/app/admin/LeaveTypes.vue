<template>
  <div class="lt-wrap">
    <div class="lt-bar">
      <button class="lt-btn-primary" @click="openCreate()">New Leave Type</button>
    </div>

    <div class="lt-table-card">
      <table class="lt-table">
        <thead>
          <tr>
            <th>Order</th><th>Name</th><th>Code</th><th>Category</th>
            <th>Accrual</th><th>Max/Year</th><th>Carry Fwd</th><th>Encashable</th><th>Active</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(t, idx) in sortedTypes" :key="t.id">
            <td>
              <div class="lt-order-btns">
                <button class="lt-order-btn" :disabled="idx === 0" @click="moveUp(idx)">↑</button>
                <button class="lt-order-btn" :disabled="idx === sortedTypes.length - 1" @click="moveDown(idx)">↓</button>
              </div>
            </td>
            <td class="lt-td-primary">{{ t.name }}</td>
            <td class="lt-mono">{{ t.code }}</td>
            <td>{{ categoryLabel(t.leave_type) }}</td>
            <td class="lt-capitalize">{{ t.accrual_frequency }}</td>
            <td class="lt-mono">{{ t.max_days_per_year ?? '—' }}</td>
            <td>{{ t.can_carry_forward ? (t.carry_forward_limit ?? 'Unlimited') : 'No' }}</td>
            <td>{{ t.is_encashable ? 'Yes' : 'No' }}</td>
            <td>
              <label class="lt-toggle">
                <input type="checkbox" :checked="t.is_active" @change="toggleActive(t)" />
                <span class="lt-toggle-slider" />
              </label>
            </td>
            <td>
              <div class="lt-row-actions">
                <button class="lt-link-btn" @click="openEdit(t)">Edit</button>
                <button class="lt-link-btn lt-link-danger" @click="archive(t)">Archive</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="lt-overlay" @click.self="close()">
        <div class="lt-modal">
          <h2 class="lt-modal-title">{{ editing ? 'Edit' : 'New' }} Leave Type</h2>
          <form class="lt-form-grid" @submit.prevent="save">
            <div class="lt-field">
              <label class="lt-label">Name</label>
              <input v-model="form.name" type="text" class="lt-input" required />
            </div>
            <div class="lt-field">
              <label class="lt-label">Short Code</label>
              <input v-model="form.code" type="text" class="lt-input lt-mono-input" maxlength="10" required />
            </div>
            <div class="lt-field lt-full">
              <label class="lt-label">Description</label>
              <textarea v-model="form.description" class="lt-input" rows="2" />
            </div>
            <div class="lt-field">
              <label class="lt-label">Category</label>
              <select v-model="form.leave_type" class="lt-input">
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="other">Special</option>
              </select>
            </div>
            <div class="lt-field">
              <label class="lt-label">Accrual Frequency</label>
              <select v-model="form.accrual_frequency" class="lt-input">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div class="lt-field">
              <label class="lt-label">Max Days / Year</label>
              <input v-model.number="form.max_days_per_year" type="number" min="0" class="lt-input lt-mono-input" />
            </div>
            <div class="lt-field">
              <label class="lt-label">Max Consecutive Days</label>
              <input v-model.number="form.max_consecutive_days" type="number" min="0" class="lt-input lt-mono-input" placeholder="No limit" />
            </div>
            <div class="lt-field">
              <label class="lt-label">Notice Period (days)</label>
              <input v-model.number="form.notice_period_days" type="number" min="0" class="lt-input lt-mono-input" />
            </div>
            <div class="lt-field">
              <label class="lt-label">Carry Forward</label>
              <div class="lt-inline-check">
                <label class="lt-check-label"><input id="cf" type="checkbox" v-model="form.can_carry_forward" class="lt-checkbox" /> Allow</label>
                <input v-if="form.can_carry_forward" v-model.number="form.carry_forward_limit" type="number" min="0" placeholder="Limit" class="lt-input lt-mono-input" style="width:80px" />
              </div>
            </div>
            <div class="lt-field">
              <label class="lt-label">Encashable</label>
              <label class="lt-check-label"><input type="checkbox" v-model="form.is_encashable" class="lt-checkbox" /> Yes</label>
            </div>
            <div class="lt-field">
              <label class="lt-label">Applicable To</label>
              <select v-model="form.applicable_to" class="lt-input">
                <option value="all">All</option>
                <option value="departments">Specific Departments</option>
                <option value="roles">Specific Roles</option>
              </select>
            </div>
            <div v-if="form.applicable_to === 'departments'" class="lt-field lt-full">
              <label class="lt-label">Departments (comma separated)</label>
              <input v-model="applicableDepartmentsText" type="text" class="lt-input" />
            </div>
            <div v-if="form.applicable_to === 'roles'" class="lt-field lt-full">
              <label class="lt-label">Roles (comma separated)</label>
              <input v-model="applicableRolesText" type="text" class="lt-input" />
            </div>
            <div class="lt-field lt-full">
              <label class="lt-check-label"><input type="checkbox" v-model="form.requires_documentation" class="lt-checkbox" /> Requires Documentation</label>
            </div>

            <div v-if="formError" class="lt-full lt-error-msg">{{ formError }}</div>
            <div v-if="formSuccess" class="lt-full lt-success-msg">{{ formSuccess }}</div>

            <div class="lt-full lt-modal-actions">
              <button type="button" class="lt-btn-ghost" :disabled="saving" @click="close()">Cancel</button>
              <button type="submit" class="lt-btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { leaveService, type LeaveType } from '@/services/leave'
import { useLeave } from '@/composables/useLeave'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const { leaveTypes, fetchLeaveTypes } = useLeave()

const localTypes = ref<LeaveType[]>([])
const sortedTypes = computed(() => localTypes.value.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))

onMounted(async () => { await fetchLeaveTypes(false); localTypes.value = leaveTypes.value })
watch(leaveTypes, (v) => { localTypes.value = v })

function categoryLabel(v: LeaveType['leave_type']) {
  if (v === 'paid') return 'Paid'
  if (v === 'unpaid') return 'Unpaid'
  return 'Special'
}

function moveUp(index: number) {
  if (index === 0) return
  const arr = sortedTypes.value; const above = arr[index - 1]; const current = arr[index]
  const tmp = above.sort_order; above.sort_order = current.sort_order; current.sort_order = tmp
  persistOrder(arr)
}
function moveDown(index: number) {
  const arr = sortedTypes.value; if (index >= arr.length - 1) return
  const below = arr[index + 1]; const current = arr[index]
  const tmp = below.sort_order; below.sort_order = current.sort_order; current.sort_order = tmp
  persistOrder(arr)
}
async function persistOrder(arr: LeaveType[]) {
  const orders = arr.map((t, i) => ({ id: t.id, sort_order: t.sort_order ?? i }))
  await leaveService.reorderLeaveTypes(orders); await fetchLeaveTypes(false)
}
async function toggleActive(t: LeaveType) {
  try { await leaveService.updateLeaveType(t.id, { is_active: !t.is_active }); await fetchLeaveTypes(false) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch (e: any) { toast.error(e.response?.data?.error || 'Failed to update status.') }
}
async function archive(t: LeaveType) {
  try { await leaveService.updateLeaveType(t.id, { is_active: false }); await fetchLeaveTypes(false) }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch (e: any) { toast.error(e.response?.data?.error || 'Failed to archive leave type.') }
}

const showModal = ref(false)
const editing = ref(false)
const form = reactive<Partial<LeaveType>>({
  name: '', code: '', description: '', leave_type: 'paid', accrual_frequency: 'monthly',
  max_days_per_year: undefined, max_consecutive_days: undefined, notice_period_days: 0,
  can_carry_forward: false, carry_forward_limit: undefined, is_encashable: false,
  applicable_to: 'all', applicable_departments: [], applicable_roles: [],
  requires_documentation: false, is_active: true,
})
const applicableDepartmentsText = ref('')
const applicableRolesText = ref('')
const saving = ref(false)
const formError = ref('')
const formSuccess = ref('')

watch(() => form.applicable_to, (v) => {
  if (v !== 'departments') form.applicable_departments = []
  if (v !== 'roles') form.applicable_roles = []
})

function openCreate() {
  editing.value = false
  Object.assign(form, {
    id: undefined, name: '', code: '', description: '', leave_type: 'paid', accrual_frequency: 'monthly',
    max_days_per_year: undefined, max_consecutive_days: undefined, notice_period_days: 0,
    can_carry_forward: false, carry_forward_limit: undefined, is_encashable: false,
    applicable_to: 'all', applicable_departments: [], applicable_roles: [], requires_documentation: false, is_active: true,
  })
  applicableDepartmentsText.value = ''; applicableRolesText.value = ''; showModal.value = true
}
function openEdit(t: LeaveType) {
  editing.value = true; Object.assign(form, t)
  applicableDepartmentsText.value = (t.applicable_departments || []).join(', ')
  applicableRolesText.value = (t.applicable_roles || []).join(', ')
  showModal.value = true
}
function close() { showModal.value = false }

async function save() {
  if (saving.value) return
  formError.value = ''; formSuccess.value = ''; saving.value = true
  if (form.applicable_to === 'departments') form.applicable_departments = applicableDepartmentsText.value.split(',').map(s => s.trim()).filter(Boolean)
  if (form.applicable_to === 'roles') form.applicable_roles = applicableRolesText.value.split(',').map(s => s.trim()).filter(Boolean)
  try {
    if (editing.value && form.id) { await leaveService.updateLeaveType(form.id, form) }
    else { await leaveService.createLeaveType(form) }
    showModal.value = false; await fetchLeaveTypes(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const errors = e.response?.data?.errors
    formError.value = errors ? Object.values(errors).flat().join('. ') : (e.response?.data?.error || 'Failed to save leave type.')
  } finally { saving.value = false }
}
</script>

<style scoped>
.lt-wrap { display: flex; flex-direction: column; gap: 16px; }
.lt-bar { display: flex; justify-content: flex-end; }

.lt-table-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.lt-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.lt-table thead tr { background: rgba(35,41,54,0.6); }
.lt-table th { padding: 10px 12px; font-size: 10.5px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.lt-table tbody tr { border-top: 1px solid #232936; }
.lt-table tbody tr:hover { background: rgba(107,91,255,0.04); }
.lt-table td { padding: 10px 12px; color: #B6BED0; }
.lt-td-primary { color: #EEF0F4 !important; font-weight: 500; }
.lt-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.lt-capitalize { text-transform: capitalize; }

.lt-order-btns { display: flex; gap: 4px; }
.lt-order-btn {
  background: transparent; border: 1px solid #232936; color: #7A8299; border-radius: 4px;
  padding: 2px 6px; font-size: 11px; cursor: pointer; transition: background 0.15s;
}
.lt-order-btn:hover:not(:disabled) { background: #232936; color: #EEF0F4; }
.lt-order-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.lt-toggle { position: relative; display: inline-block; width: 32px; height: 18px; }
.lt-toggle input { opacity: 0; width: 0; height: 0; }
.lt-toggle-slider {
  position: absolute; cursor: pointer; inset: 0; background: #232936; border-radius: 9px; transition: background 0.2s;
}
.lt-toggle-slider::before {
  content: ''; position: absolute; width: 12px; height: 12px; left: 3px; top: 3px;
  background: #7A8299; border-radius: 50%; transition: transform 0.2s, background 0.2s;
}
.lt-toggle input:checked + .lt-toggle-slider { background: rgba(107,91,255,0.25); }
.lt-toggle input:checked + .lt-toggle-slider::before { transform: translateX(14px); background: #6B5BFF; }

.lt-row-actions { display: flex; gap: 10px; }
.lt-link-btn { background: none; border: none; font-size: 12px; color: #6B5BFF; cursor: pointer; padding: 0; }
.lt-link-btn:hover { opacity: 0.8; }
.lt-link-danger { color: #F38288; }

.lt-btn-primary {
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
}
.lt-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.lt-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.lt-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 14px; font-size: 13px; cursor: pointer; transition: background 0.15s;
}
.lt-btn-ghost:hover { background: #232936; }

.lt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
.lt-modal {
  background: #161A23; border: 1px solid #232936; border-radius: 12px;
  width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; padding: 24px;
}
.lt-modal-title { margin: 0 0 20px; font-size: 15px; font-weight: 600; color: #EEF0F4; }
.lt-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.lt-full { grid-column: 1 / -1; }
.lt-field { display: flex; flex-direction: column; gap: 6px; }
.lt-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.lt-input {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 8px 12px; outline: none;
  transition: border-color 0.15s; width: 100%; box-sizing: border-box; resize: vertical;
}
.lt-input:focus { border-color: #6B5BFF; }
.lt-input option { background: #161A23; }
.lt-mono-input { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.lt-inline-check { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.lt-check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.lt-checkbox { accent-color: #6B5BFF; width: 14px; height: 14px; }
.lt-error-msg { background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.3); color: #F38288; border-radius: 7px; padding: 10px 14px; font-size: 13px; }
.lt-success-msg { background: rgba(77,211,154,0.1); border: 1px solid rgba(77,211,154,0.3); color: #4DD39A; border-radius: 7px; padding: 10px 14px; font-size: 13px; }
.lt-modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
</style>
