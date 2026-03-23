<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-white">Leave Types</h1>
      <button class="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" @click="openCreate()">
        New Leave Type
      </button>
    </div>

    <div class="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700/50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Order</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Name</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Code</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Category</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Accrual</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Max/Year</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Carry Fwd</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Encashable</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Active</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="(t, idx) in sortedTypes" :key="t.id" class="hover:bg-gray-700/50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <button class="rounded border px-2 py-1 text-xs" :disabled="idx === 0" @click="moveUp(idx)">↑</button>
                <button class="rounded border px-2 py-1 text-xs" :disabled="idx === sortedTypes.length - 1" @click="moveDown(idx)">↓</button>
              </div>
            </td>
            <td class="px-4 py-3 font-medium text-white">{{ t.name }}</td>
            <td class="px-4 py-3 text-gray-400">{{ t.code }}</td>
            <td class="px-4 py-3 text-gray-400">{{ categoryLabel(t.leave_type) }}</td>
            <td class="px-4 py-3 text-gray-400 capitalize">{{ t.accrual_frequency }}</td>
            <td class="px-4 py-3 text-gray-400">{{ t.max_days_per_year ?? '—' }}</td>
            <td class="px-4 py-3 text-gray-400">{{ t.can_carry_forward ? (t.carry_forward_limit ?? 'Unlimited') : 'No' }}</td>
            <td class="px-4 py-3 text-gray-400">{{ t.is_encashable ? 'Yes' : 'No' }}</td>
            <td class="px-4 py-3">
              <label class="inline-flex cursor-pointer items-center">
                <input type="checkbox" class="rounded border-gray-600 text-brand-600 focus:ring-brand-500" :checked="t.is_active" @change="toggleActive(t)" />
              </label>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2">
                <button class="rounded border px-3 py-1 text-sm" @click="openEdit(t)">Edit</button>
                <button class="rounded border border-red-700 bg-red-900/30 px-3 py-1 text-sm text-red-400 hover:bg-red-900/50" @click="archive(t)">Archive</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="w-full max-w-2xl rounded-lg bg-gray-800 p-6">
        <h2 class="mb-4 text-lg font-semibold text-white">{{ editing ? 'Edit' : 'New' }} Leave Type</h2>
        <form @submit.prevent="save">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-300">Name</label>
              <input v-model="form.name" type="text" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Short Code</label>
              <input v-model="form.code" type="text" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500" maxlength="10" required />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-300">Description</label>
              <textarea v-model="form.description" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500" rows="2"></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Category</label>
              <select v-model="form.leave_type" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500">
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="other">Special</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Accrual Frequency</label>
              <select v-model="form.accrual_frequency" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Maximum Allowed Per Year</label>
              <input v-model.number="form.max_days_per_year" type="number" min="0" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Max Consecutive Days</label>
              <input v-model.number="form.max_consecutive_days" type="number" min="0" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500" placeholder="No limit" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Notice Period (days)</label>
              <input v-model.number="form.notice_period_days" type="number" min="0" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Carry Forward</label>
              <div class="mt-1 flex items-center gap-3">
                <input id="cf" type="checkbox" v-model="form.can_carry_forward" class="rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
                <label for="cf" class="text-sm text-gray-300">Allow</label>
                <input v-if="form.can_carry_forward" v-model.number="form.carry_forward_limit" type="number" min="0" placeholder="Limit" class="ml-2 w-28 rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Encashable</label>
              <input type="checkbox" v-model="form.is_encashable" class="mt-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Applicable To</label>
              <select v-model="form.applicable_to" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500">
                <option value="all">All</option>
                <option value="departments">Specific Departments</option>
                <option value="roles">Specific Roles</option>
              </select>
            </div>
            <div v-if="form.applicable_to === 'departments'" class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-300">Departments (comma separated)</label>
              <input v-model="applicableDepartmentsText" type="text" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500" />
            </div>
            <div v-if="form.applicable_to === 'roles'" class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-300">Roles (comma separated)</label>
              <input v-model="applicableRolesText" type="text" class="mt-1 w-full rounded-md border-gray-600 focus:border-brand-500 focus:ring-brand-500" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-300">Requires Documentation</label>
              <input type="checkbox" v-model="form.requires_documentation" class="mt-2 rounded border-gray-600 text-brand-600 focus:ring-brand-500" />
            </div>
          </div>

          <p v-if="formError" class="mt-4 rounded-md bg-red-900/30 p-3 text-sm text-red-400">{{ formError }}</p>
          <p v-if="formSuccess" class="mt-4 rounded-md bg-green-900/30 p-3 text-sm text-green-400">{{ formSuccess }}</p>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button type="button" class="rounded-md border px-4 py-2" @click="close()" :disabled="saving">Cancel</button>
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { leaveService, type LeaveType } from '@/services/leave'
import { useLeave } from '@/composables/useLeave'

const { leaveTypes, fetchLeaveTypes, loading } = useLeave()

const localTypes = ref<LeaveType[]>([])
const sortedTypes = computed(() => localTypes.value.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))

onMounted(async () => {
  await fetchLeaveTypes(false)
  localTypes.value = leaveTypes.value
})

watch(leaveTypes, (v) => { localTypes.value = v })

function categoryLabel(v: LeaveType['leave_type']) {
  if (v === 'paid') return 'Paid'
  if (v === 'unpaid') return 'Unpaid'
  return 'Special'
}

function moveUp(index: number) {
  if (index === 0) return
  const arr = sortedTypes.value
  const above = arr[index - 1]
  const current = arr[index]
  const tmp = above.sort_order
  above.sort_order = current.sort_order
  current.sort_order = tmp
  persistOrder(arr)
}

function moveDown(index: number) {
  const arr = sortedTypes.value
  if (index >= arr.length - 1) return
  const below = arr[index + 1]
  const current = arr[index]
  const tmp = below.sort_order
  below.sort_order = current.sort_order
  current.sort_order = tmp
  persistOrder(arr)
}

async function persistOrder(arr: LeaveType[]) {
  const orders = arr.map((t, i) => ({ id: t.id, sort_order: t.sort_order ?? i }))
  await leaveService.reorderLeaveTypes(orders)
  await fetchLeaveTypes(false)
}

async function toggleActive(t: LeaveType) {
  try {
    await leaveService.updateLeaveType(t.id, { is_active: !t.is_active })
    await fetchLeaveTypes(false)
  } catch (e: any) {
    alert(e.response?.data?.error || 'Failed to update status.')
  }
}

async function archive(t: LeaveType) {
  try {
    await leaveService.updateLeaveType(t.id, { is_active: false })
    await fetchLeaveTypes(false)
  } catch (e: any) {
    alert(e.response?.data?.error || 'Failed to archive leave type.')
  }
}

const showModal = ref(false)
const editing = ref(false)
const form = reactive<Partial<LeaveType>>({
  name: '',
  code: '',
  description: '',
  leave_type: 'paid',
  accrual_frequency: 'monthly',
  max_days_per_year: undefined,
  max_consecutive_days: undefined,
  notice_period_days: 0,
  can_carry_forward: false,
  carry_forward_limit: undefined,
  is_encashable: false,
  applicable_to: 'all',
  applicable_departments: [],
  applicable_roles: [],
  requires_documentation: false,
  is_active: true,
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
    id: undefined,
    name: '', code: '', description: '', leave_type: 'paid', accrual_frequency: 'monthly',
    max_days_per_year: undefined, max_consecutive_days: undefined, notice_period_days: 0,
    can_carry_forward: false, carry_forward_limit: undefined,
    is_encashable: false, applicable_to: 'all', applicable_departments: [], applicable_roles: [],
    requires_documentation: false, is_active: true,
  })
  applicableDepartmentsText.value = ''
  applicableRolesText.value = ''
  showModal.value = true
}

function openEdit(t: LeaveType) {
  editing.value = true
  Object.assign(form, t)
  applicableDepartmentsText.value = (t.applicable_departments || []).join(', ')
  applicableRolesText.value = (t.applicable_roles || []).join(', ')
  showModal.value = true
}

function close() { showModal.value = false }

async function save() {
  if (saving.value) return
  formError.value = ''
  formSuccess.value = ''
  saving.value = true

  if (form.applicable_to === 'departments') {
    form.applicable_departments = applicableDepartmentsText.value.split(',').map(s => s.trim()).filter(Boolean)
  }
  if (form.applicable_to === 'roles') {
    form.applicable_roles = applicableRolesText.value.split(',').map(s => s.trim()).filter(Boolean)
  }

  try {
    if (editing.value && form.id) {
      await leaveService.updateLeaveType(form.id, form)
    } else {
      await leaveService.createLeaveType(form)
    }
    showModal.value = false
    await fetchLeaveTypes(false)
  } catch (e: any) {
    const errors = e.response?.data?.errors
    if (errors) {
      formError.value = Object.values(errors).flat().join('. ')
    } else {
      formError.value = e.response?.data?.error || 'Failed to save leave type. Please try again.'
    }
  } finally {
    saving.value = false
  }
}
</script>
