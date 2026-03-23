<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-white">Leave Policies</h1>
      <button class="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" @click="openCreate()">
        New Policy
      </button>
    </div>

    <div class="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700/50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Name</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Description</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Auto Accrual</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Accrual Freq</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Active</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="p in policies" :key="p.id" class="hover:bg-gray-700/50">
            <td class="px-4 py-3 font-medium text-white">{{ p.name }}</td>
            <td class="px-4 py-3 text-gray-400">{{ p.description || '—' }}</td>
            <td class="px-4 py-3 text-gray-400">{{ p.auto_accrual ? 'Yes' : 'No' }}</td>
            <td class="px-4 py-3 text-gray-400 capitalize">{{ p.accrual_frequency }}</td>
            <td class="px-4 py-3">
              <span :class="p.is_active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'" class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
                {{ p.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2">
                <button class="rounded border px-3 py-1 text-sm" @click="openEdit(p)">Edit</button>
                <button class="rounded border border-red-300 bg-red-900/30 px-3 py-1 text-sm text-red-400 hover:bg-red-900/50" @click="remove(p)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-gray-800 p-6">
        <h2 class="mb-4 text-lg font-semibold text-white">{{ editing ? 'Edit' : 'New' }} Policy</h2>

        <div v-if="formError" class="mb-4 rounded-md bg-red-900/30 p-3 text-sm text-red-400">{{ formError }}</div>
        <div v-if="formSuccess" class="mb-4 rounded-md bg-green-900/30 p-3 text-sm text-green-400">{{ formSuccess }}</div>

        <form @submit.prevent="save">
          <div class="grid grid-cols-1 gap-4">
            <!-- Basic Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300">Name</label>
                <input v-model="form.name" type="text" class="mt-1 w-full rounded-md border-gray-600" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300">Description</label>
                <input v-model="form.description" type="text" class="mt-1 w-full rounded-md border-gray-600" placeholder="Optional description" />
              </div>
            </div>

            <div class="flex items-center gap-4">
              <label class="inline-flex items-center">
                <input type="checkbox" v-model="form.is_active" class="mr-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                <span class="text-sm text-gray-300">Active</span>
              </label>
            </div>

            <!-- Accrual Settings -->
            <h3 class="text-sm font-semibold text-white border-b pb-1">Accrual Settings</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300">Accrual Frequency</label>
                <select v-model="form.accrual_frequency" class="mt-1 w-full rounded-md border-gray-600">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300">Accrual Start Month</label>
                <select v-model.number="form.accrual_start_month" class="mt-1 w-full rounded-md border-gray-600">
                  <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="inline-flex items-center">
                  <input type="checkbox" v-model="form.auto_accrual" class="mr-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                  <span class="text-sm text-gray-300">Auto-accrual</span>
                </label>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300">Accrual Rate (days/month)</label>
                <input v-model.number="form.accrual_rate" type="number" step="0.01" min="0" class="mt-1 w-full rounded-md border-gray-600" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300">Max Carry Forward</label>
                <input v-model.number="form.accrual_max_carry_forward" type="number" min="0" placeholder="Unlimited" class="mt-1 w-full rounded-md border-gray-600" />
              </div>
            </div>

            <!-- Approval Workflow -->
            <h3 class="text-sm font-semibold text-white border-b pb-1">Approval Workflow</h3>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="inline-flex items-center">
                  <input type="checkbox" v-model="form.requires_approval" class="mr-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                  <span class="text-sm text-gray-300">Requires Approval</span>
                </label>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300">Max Approvers</label>
                <input v-model.number="form.max_approvers" type="number" min="1" class="mt-1 w-full rounded-md border-gray-600" />
              </div>
              <div>
                <label class="inline-flex items-center mt-6">
                  <input type="checkbox" v-model="form.allow_self_approval" class="mr-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                  <span class="text-sm text-gray-300">Allow Self-Approval</span>
                </label>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Minimum Notice Days</label>
              <input v-model.number="form.min_notice_days" type="number" min="0" class="mt-1 w-32 rounded-md border-gray-600" />
            </div>

            <!-- Leave Restrictions -->
            <h3 class="text-sm font-semibold text-white border-b pb-1">Leave Restrictions</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="inline-flex items-center">
                  <input type="checkbox" v-model="form.restrict_weekends_holidays" class="mr-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                  <span class="text-sm text-gray-300">Exclude Weekends & Holidays</span>
                </label>
                <label class="inline-flex items-center">
                  <input type="checkbox" v-model="form.allow_negative_balance" class="mr-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                  <span class="text-sm text-gray-300">Allow Negative Balance</span>
                </label>
              </div>
              <div>
                <label class="inline-flex items-center">
                  <input type="checkbox" v-model="form.restrict_consecutive_days" class="mr-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                  <span class="text-sm text-gray-300">Restrict Consecutive Days</span>
                </label>
                <input v-if="form.restrict_consecutive_days" v-model.number="form.max_consecutive_days" type="number" min="1" placeholder="Max days" class="mt-1 w-32 rounded-md border-gray-600" />
              </div>
            </div>

            <!-- Probation Settings -->
            <h3 class="text-sm font-semibold text-white border-b pb-1">Probation Settings</h3>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="inline-flex items-center">
                  <input type="checkbox" v-model="form.probation_restrictions" class="mr-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                  <span class="text-sm text-gray-300">Probation Restrictions</span>
                </label>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300">Probation Period (months)</label>
                <input v-model.number="form.probation_period_months" type="number" min="1" max="12" class="mt-1 w-full rounded-md border-gray-600" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300">Probation Leave Rate</label>
                <input v-model.number="form.probation_leave_rate" type="number" step="0.01" min="0" max="5" class="mt-1 w-full rounded-md border-gray-600" />
              </div>
            </div>

            <!-- Policy Items -->
            <h3 class="text-sm font-semibold text-white border-b pb-1">Policy Items (per leave type allocation)</h3>
            <div class="space-y-2">
              <div v-for="item in items" :key="item.leave_type_id" class="flex items-center gap-3 rounded border border-gray-700 p-2">
                <div class="w-40 text-sm font-medium text-gray-300">{{ leaveTypeName(item.leave_type_id) }}</div>
                <div class="w-28">
                  <label class="text-xs text-gray-400">Days/Year</label>
                  <input type="number" step="0.01" v-model.number="item.allocation_per_year" class="w-full rounded-md border-gray-600 text-sm" />
                </div>
                <div class="flex items-center gap-1">
                  <input type="checkbox" v-model="item.can_carry_forward" class="rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                  <span class="text-xs text-gray-400">Carry Fwd</span>
                </div>
                <div v-if="item.can_carry_forward" class="w-20">
                  <input type="number" min="0" v-model.number="item.carry_forward_limit" placeholder="Limit" class="w-full rounded-md border-gray-600 text-sm" />
                </div>
                <div class="flex items-center gap-1">
                  <input type="checkbox" v-model="item.is_encashable" class="rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                  <span class="text-xs text-gray-400">Encashable</span>
                </div>
                <button type="button" class="text-sm text-red-600" @click="removeItem(item.leave_type_id)">Remove</button>
              </div>

              <div class="flex items-center gap-2">
                <select v-model.number="newItemLeaveType" class="rounded-md border-gray-600">
                  <option :value="0">Select leave type</option>
                  <option v-for="lt in availableLeaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }} ({{ lt.code }})</option>
                </select>
                <input v-model.number="newItemAllocation" type="number" step="0.01" placeholder="Days/year" class="w-32 rounded-md border-gray-600" />
                <button type="button" class="rounded bg-brand-600 px-3 py-1 text-white text-sm" @click="addItem">Add</button>
              </div>
            </div>

            <!-- Assignments -->
            <h3 class="text-sm font-semibold text-white border-b pb-1">Assignments</h3>
            <div class="space-y-2">
              <div v-for="(a, idx) in assignments" :key="idx" class="flex items-center gap-3">
                <div class="w-40">
                  <select v-model="a.scope" class="w-full rounded-md border-gray-600">
                    <option value="organization">Organization</option>
                    <option value="department">Department</option>
                    <option value="team">Team</option>
                    <option value="employee">Employee</option>
                  </select>
                </div>
                <input v-if="a.scope === 'department'" v-model="a.target_key" placeholder="Department name" class="flex-1 rounded-md border-gray-600" />
                <input v-if="a.scope === 'team' || a.scope === 'employee'" v-model.number="a.target_id" placeholder="ID" class="flex-1 rounded-md border-gray-600" />
                <button type="button" class="text-sm text-red-600" @click="assignments.splice(idx,1)">Remove</button>
              </div>

              <div class="flex items-center gap-2">
                <select v-model="newAssignment.scope" class="rounded-md border-gray-600">
                  <option value="organization">Organization</option>
                  <option value="department">Department</option>
                  <option value="team">Team</option>
                  <option value="employee">Employee</option>
                </select>
                <input v-if="newAssignment.scope === 'department'" v-model="newAssignment.target_key" placeholder="Department name" class="rounded-md border-gray-600" />
                <input v-if="newAssignment.scope === 'team' || newAssignment.scope === 'employee'" v-model.number="newAssignment.target_id" placeholder="ID" class="rounded-md border-gray-600" />
                <button type="button" class="rounded bg-brand-600 px-3 py-1 text-white text-sm" @click="addAssignment">Add</button>
              </div>
            </div>

          </div>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button type="button" class="rounded-md border px-4 py-2" @click="close()">Cancel</button>
            <button type="submit" class="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import { leaveService, type LeaveType, type LeavePolicy } from '@/services/leave'
import { useLeave } from '@/composables/useLeave'

const { leaveTypes, fetchLeaveTypes } = useLeave()

const policies = ref<LeavePolicy[]>([])
const leaveTypesLocal = ref<LeaveType[]>([])

const showModal = ref(false)
const editing = ref(false)
const saving = ref(false)
const formError = ref('')
const formSuccess = ref('')

const form = reactive<any>({
  id: undefined,
  name: '',
  description: '',
  is_active: true,
  auto_accrual: true,
  accrual_frequency: 'monthly',
  accrual_rate: 1.25,
  accrual_start_month: 1,
  accrual_max_carry_forward: null,
  requires_approval: true,
  max_approvers: 1,
  allow_self_approval: false,
  min_notice_days: 0,
  restrict_consecutive_days: false,
  max_consecutive_days: null,
  restrict_weekends_holidays: true,
  allow_negative_balance: false,
  probation_restrictions: true,
  probation_period_months: 3,
  probation_leave_rate: 0.5,
})

const items = ref<Array<any>>([])
const assignments = ref<Array<any>>([])

const newItemLeaveType = ref<number>(0)
const newItemAllocation = ref<number | null>(null)

const newAssignment = reactive({ scope: 'organization', target_id: null as number | null, target_key: '' })

const availableLeaveTypes = computed(() =>
  leaveTypesLocal.value.filter(lt => !items.value.some(i => i.leave_type_id === lt.id))
)

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
function monthName(m: number) { return monthNames[m - 1] }

onMounted(async () => {
  await fetchLeaveTypes(false)
  leaveTypesLocal.value = leaveTypes.value
  await loadPolicies()
})

async function loadPolicies() {
  try {
    policies.value = await leaveService.getLeavePolicies()
  } catch (e: any) {
    console.error('Failed to load policies', e)
  }
}

const defaultForm = {
  id: undefined, name: '', description: '', is_active: true, auto_accrual: true,
  accrual_frequency: 'monthly', accrual_rate: 1.25, accrual_start_month: 1,
  accrual_max_carry_forward: null, requires_approval: true, max_approvers: 1,
  allow_self_approval: false, min_notice_days: 0, restrict_consecutive_days: false,
  max_consecutive_days: null, restrict_weekends_holidays: true, allow_negative_balance: false,
  probation_restrictions: true, probation_period_months: 3, probation_leave_rate: 0.5,
}

function openCreate() {
  editing.value = false
  formError.value = ''
  formSuccess.value = ''
  Object.assign(form, defaultForm)
  items.value = []
  assignments.value = [{ scope: 'organization', target_id: null, target_key: '' }]
  showModal.value = true
}

function openEdit(p: LeavePolicy) {
  editing.value = true
  formError.value = ''
  formSuccess.value = ''
  Object.assign(form, p)
  items.value = (p.items || []).map((i: any) => ({
    leave_type_id: i.leave_type_id,
    allocation_per_year: i.allocation_per_year,
    can_carry_forward: i.can_carry_forward ?? false,
    carry_forward_limit: i.carry_forward_limit ?? null,
    is_encashable: i.is_encashable ?? false,
  }))
  assignments.value = (p.assignments || []).map((a: any) => ({ ...a }))
  showModal.value = true
}

function close() { showModal.value = false }

function leaveTypeName(id: number) {
  const lt = leaveTypesLocal.value.find(l => l.id === id)
  return lt ? `${lt.name} (${lt.code})` : 'Unknown'
}

function addItem() {
  if (!newItemLeaveType.value || !newItemAllocation.value) return
  items.value.push({
    leave_type_id: newItemLeaveType.value,
    allocation_per_year: newItemAllocation.value,
    can_carry_forward: false,
    carry_forward_limit: null,
    is_encashable: false,
  })
  newItemLeaveType.value = 0
  newItemAllocation.value = null
}

function removeItem(id: number) {
  items.value = items.value.filter(i => i.leave_type_id !== id)
}

function addAssignment() {
  assignments.value.push({ scope: newAssignment.scope, target_id: newAssignment.target_id, target_key: newAssignment.target_key })
  newAssignment.scope = 'organization'
  newAssignment.target_id = null
  newAssignment.target_key = ''
}

async function save() {
  formError.value = ''
  formSuccess.value = ''
  saving.value = true

  const payload: any = {
    name: form.name,
    description: form.description,
    is_active: form.is_active,
    auto_accrual: form.auto_accrual,
    accrual_frequency: form.accrual_frequency,
    accrual_rate: form.accrual_rate,
    accrual_start_month: form.accrual_start_month,
    accrual_max_carry_forward: form.accrual_max_carry_forward,
    requires_approval: form.requires_approval,
    max_approvers: form.max_approvers,
    allow_self_approval: form.allow_self_approval,
    min_notice_days: form.min_notice_days,
    restrict_consecutive_days: form.restrict_consecutive_days,
    max_consecutive_days: form.restrict_consecutive_days ? form.max_consecutive_days : null,
    restrict_weekends_holidays: form.restrict_weekends_holidays,
    allow_negative_balance: form.allow_negative_balance,
    probation_restrictions: form.probation_restrictions,
    probation_period_months: form.probation_period_months,
    probation_leave_rate: form.probation_leave_rate,
    items: items.value,
    assignments: assignments.value,
  }

  try {
    if (editing.value && form.id) {
      await leaveService.updateLeavePolicy(form.id, payload)
    } else {
      await leaveService.createLeavePolicy(payload)
    }
    await loadPolicies()
    showModal.value = false
  } catch (e: any) {
    const data = e?.response?.data
    if (data?.errors) {
      formError.value = Object.values(data.errors).flat().join(', ')
    } else {
      formError.value = data?.message || e.message || 'Failed to save policy'
    }
  } finally {
    saving.value = false
  }
}

async function remove(p: LeavePolicy) {
  if (!confirm('Delete this policy?')) return
  try {
    await leaveService.deleteLeavePolicy(p.id)
    await loadPolicies()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Failed to delete policy')
  }
}
</script>
