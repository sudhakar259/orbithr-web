<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-slate-800">Leave Policies</h1>
      <button class="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" @click="openCreate()">
        New Policy
      </button>
    </div>

    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Name</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Auto Accrual</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Accrual Freq</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="p in policies" :key="p.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{{ p.name }}</td>
            <td class="px-4 py-3 text-slate-600">{{ p.auto_accrual ? 'Yes' : 'No' }}</td>
            <td class="px-4 py-3 text-slate-600">{{ p.accrual_frequency }}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2">
                <button class="rounded border px-3 py-1 text-sm" @click="openEdit(p)">Edit</button>
                <button class="rounded border border-red-300 bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100" @click="remove(p)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
        <h2 class="mb-4 text-lg font-semibold text-slate-800">{{ editing ? 'Edit' : 'New' }} Policy</h2>
        <form @submit.prevent="save">
          <div class="grid grid-cols-1 gap-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700">Name</label>
                <input v-model="form.name" type="text" class="mt-1 w-full rounded-md border-slate-300 shadow-sm" required />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700">Accrual Frequency</label>
                <select v-model="form.accrual_frequency" class="mt-1 w-full rounded-md border-slate-300 shadow-sm">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <label class="inline-flex items-center">
                <input type="checkbox" v-model="form.auto_accrual" class="mr-2" />
                <span class="text-sm text-slate-700">Auto-accrual</span>
              </label>
              <label class="ml-4 block text-sm text-slate-700">Accrual Rate (used as fallback)</label>
              <input v-model.number="form.accrual_rate" type="number" step="0.01" class="ml-2 w-32 rounded-md border-slate-300 shadow-sm" />
            </div>

            <div>
              <h3 class="text-sm font-medium text-slate-800">Policy Items (per leave type allocation per year)</h3>
              <div class="mt-2 space-y-2">
                <div v-for="item in items" :key="item.leave_type_id" class="flex items-center gap-3">
                  <div class="flex-1 text-sm text-slate-700">{{ leaveTypeName(item.leave_type_id) }}</div>
                  <div class="w-32">
                    <input type="number" step="0.01" v-model.number="item.allocation_per_year" class="w-full rounded-md border-slate-300 shadow-sm" />
                  </div>
                  <button type="button" class="text-sm text-red-600" @click="removeItem(item.leave_type_id)">Remove</button>
                </div>

                <div class="flex items-center gap-2">
                  <select v-model.number="newItemLeaveType" class="rounded-md border-slate-300 shadow-sm">
                    <option :value="0">Select leave type</option>
                    <option v-for="lt in leaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }} ({{ lt.code }})</option>
                  </select>
                  <input v-model.number="newItemAllocation" type="number" step="0.01" placeholder="Allocation per year" class="w-40 rounded-md border-slate-300 shadow-sm" />
                  <button type="button" class="rounded bg-brand-600 px-3 py-1 text-white" @click="addItem">Add</button>
                </div>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-medium text-slate-800">Assignments</h3>
              <div class="mt-2 space-y-2">
                <div v-for="(a, idx) in assignments" :key="idx" class="flex items-center gap-3">
                  <div class="w-40">
                    <select v-model="a.scope" class="w-full rounded-md border-slate-300 shadow-sm">
                      <option value="organization">Organization</option>
                      <option value="department">Department</option>
                      <option value="team">Team</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>
                  <input v-if="a.scope === 'department'" v-model="a.target_key" placeholder="Department name" class="flex-1 rounded-md border-slate-300 shadow-sm" />
                  <input v-if="a.scope === 'team' || a.scope === 'employee'" v-model.number="a.target_id" placeholder="ID" class="flex-1 rounded-md border-slate-300 shadow-sm" />
                  <button type="button" class="text-sm text-red-600" @click="assignments.splice(idx,1)">Remove</button>
                </div>

                <div class="flex items-center gap-2">
                  <select v-model="newAssignment.scope" class="rounded-md border-slate-300 shadow-sm">
                    <option value="organization">Organization</option>
                    <option value="department">Department</option>
                    <option value="team">Team</option>
                    <option value="employee">Employee</option>
                  </select>
                  <input v-if="newAssignment.scope === 'department'" v-model="newAssignment.target_key" placeholder="Department name" class="rounded-md border-slate-300 shadow-sm" />
                  <input v-if="newAssignment.scope === 'team' || newAssignment.scope === 'employee'" v-model.number="newAssignment.target_id" placeholder="ID" class="rounded-md border-slate-300 shadow-sm" />
                  <button type="button" class="rounded bg-brand-600 px-3 py-1 text-white" @click="addAssignment">Add</button>
                </div>
              </div>
            </div>

          </div>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button type="button" class="rounded-md border px-4 py-2" @click="close()">Cancel</button>
            <button type="submit" class="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { leaveService, type LeaveType, type LeavePolicy } from '@/services/leave'
import { useLeave } from '@/composables/useLeave'

const { leaveTypes, fetchLeaveTypes } = useLeave()

const policies = ref<LeavePolicy[]>([])
const leaveTypesLocal = ref<LeaveType[]>([])

const showModal = ref(false)
const editing = ref(false)
const form = reactive<any>({
  id: undefined,
  name: '',
  description: '',
  is_active: true,
  auto_accrual: true,
  accrual_frequency: 'monthly',
  accrual_rate: 0,
})

const items = ref<Array<any>>([])
const assignments = ref<Array<any>>([])

const newItemLeaveType = ref<number>(0)
const newItemAllocation = ref<number | null>(null)

const newAssignment = reactive({ scope: 'organization', target_id: null as number | null, target_key: '' })

onMounted(async () => {
  await fetchLeaveTypes(false)
  leaveTypesLocal.value = leaveTypes.value
  await loadPolicies()
})

async function loadPolicies() {
  policies.value = await leaveService.getLeavePolicies()
}

function openCreate() {
  editing.value = false
  Object.assign(form, { id: undefined, name: '', description: '', is_active: true, auto_accrual: true, accrual_frequency: 'monthly', accrual_rate: 0 })
  items.value = []
  assignments.value = [{ scope: 'organization', target_id: null, target_key: '' }]
  showModal.value = true
}

function openEdit(p: LeavePolicy) {
  editing.value = true
  Object.assign(form, p)
  items.value = (p.items || []).map(i => ({ ...i }))
  assignments.value = (p.assignments || []).map(a => ({ ...a }))
  showModal.value = true
}

function close() { showModal.value = false }

function leaveTypeName(id: number) {
  const lt = leaveTypesLocal.value.find(l => l.id === id)
  return lt ? `${lt.name} (${lt.code})` : 'Unknown'
}

function addItem() {
  if (!newItemLeaveType.value || !newItemAllocation.value) return
  if (items.value.some(i => i.leave_type_id === newItemLeaveType.value)) return
  items.value.push({ leave_type_id: newItemLeaveType.value, allocation_per_year: newItemAllocation.value })
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
  const payload: any = {
    name: form.name,
    description: form.description,
    is_active: form.is_active,
    auto_accrual: form.auto_accrual,
    accrual_frequency: form.accrual_frequency,
    accrual_rate: form.accrual_rate,
    items: items.value,
    assignments: assignments.value,
  }

  if (editing.value && form.id) {
    await leaveService.updateLeavePolicy(form.id, payload)
  } else {
    await leaveService.createLeavePolicy(payload)
  }

  await loadPolicies()
  showModal.value = false
}

async function remove(p: LeavePolicy) {
  if (!confirm('Delete this policy?')) return
  await leaveService.deleteLeavePolicy(p.id)
  await loadPolicies()
}
</script>
