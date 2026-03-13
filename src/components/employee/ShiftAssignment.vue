<template>
  <div class="space-y-6">
    <!-- Current Active Shift -->
    <div v-if="activeShift" class="rounded-lg border border-green-200 bg-green-50 p-4">
      <p class="text-sm font-medium text-green-900">Current Active Shift</p>
      <div class="mt-2 text-lg font-semibold text-slate-900">
        {{ activeShift.shift?.shift_name }}
      </div>
      <div class="mt-1 text-sm text-slate-600">
        {{ activeShift.shift?.start_time }} - {{ activeShift.shift?.end_time }}
        ({{ activeShift.shift?.working_hours }} hours)
      </div>
      <p class="mt-1 text-xs text-slate-500">Effective from: {{ formatDate(activeShift.effective_from) }}</p>
    </div>

    <!-- Assign New Shift -->
    <div class="rounded-lg border border-slate-200 bg-white p-6">
      <h3 class="mb-4 text-lg font-semibold text-slate-900">Assign New Shift</h3>

      <form @submit.prevent="assignShift" class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700">Shift *</label>
            <select v-model="newShiftForm.shift_id" required class="input mt-1">
              <option value="">Select Shift</option>
              <option v-for="shift in shifts" :key="shift.id" :value="shift.id">
                {{ shift.shift_name }} ({{ shift.start_time }} - {{ shift.end_time }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Effective From *</label>
            <input v-model="newShiftForm.effective_from" type="date" required class="input mt-1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Effective To (Optional)</label>
            <input v-model="newShiftForm.effective_to" type="date" class="input mt-1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Notes</label>
            <input v-model="newShiftForm.notes" type="text" class="input mt-1" placeholder="e.g., Temporary shift change" />
          </div>
        </div>

        <p v-if="assignError" class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ assignError }}</p>

        <div class="flex justify-end gap-3">
          <button type="button" class="btn-ghost" @click="showAssignForm = false">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="assignLoading">
            {{ assignLoading ? 'Assigning…' : 'Assign Shift' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Shift History -->
    <div class="rounded-lg border border-slate-200 bg-white p-6">
      <h3 class="mb-4 text-lg font-semibold text-slate-900">Shift History</h3>

      <div v-if="shiftHistory.length > 0" class="overflow-hidden rounded-lg border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Shift Name</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Time</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">From</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">To</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="shift in shiftHistory" :key="shift.id">
              <td class="px-4 py-2 font-medium">{{ shift.shift?.shift_name }}</td>
              <td class="px-4 py-2 text-xs">{{ shift.shift?.start_time }} - {{ shift.shift?.end_time }}</td>
              <td class="px-4 py-2">{{ formatDate(shift.effective_from) }}</td>
              <td class="px-4 py-2">{{ shift.effective_to ? formatDate(shift.effective_to) : '-' }}</td>
              <td class="px-4 py-2">
                <span
                  :class="[
                    'inline-block rounded-full px-2 py-1 text-xs font-medium',
                    shift.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-100 text-slate-800',
                  ]"
                >
                  {{ shift.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-8 text-center text-slate-500">No shift history available</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import api from '@/services/api'

interface Props {
  employeeId: number
}

const props = defineProps<Props>()

const shifts = ref<any[]>([])
const shiftHistory = ref<any[]>([])
const activeShift = ref<any>(null)
const showAssignForm = ref(false)
const assignLoading = ref(false)
const assignError = ref('')

const newShiftForm = reactive({
  shift_id: '',
  effective_from: '',
  effective_to: '',
  notes: '',
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function loadShifts() {
  try {
    const { data } = await api.get('/employee-shifts/list')
    shifts.value = Array.isArray(data) ? data : data?.data || []
  } catch (e) {
    console.error('Failed to load shifts', e)
  }
}

async function loadShiftHistory() {
  try {
    const { data } = await api.get(`/employees/${props.employeeId}/shifts`)
    shiftHistory.value = Array.isArray(data) ? data : data?.data || []

    const active = shiftHistory.value.find(s => s.is_active)
    if (active) {
      activeShift.value = active
    }
  } catch (e) {
    console.error('Failed to load shift history', e)
  }
}

async function assignShift() {
  assignError.value = ''
  assignLoading.value = true

  try {
    await api.post(`/employees/${props.employeeId}/assign-shift`, newShiftForm)
    await loadShiftHistory()

    newShiftForm.shift_id = ''
    newShiftForm.effective_from = ''
    newShiftForm.effective_to = ''
    newShiftForm.notes = ''
    showAssignForm.value = false
  } catch (e: any) {
    assignError.value = e?.response?.data?.message || 'Failed to assign shift'
  } finally {
    assignLoading.value = false
  }
}

onMounted(() => {
  loadShifts()
  loadShiftHistory()
})
</script>

<style scoped>
.input {
  @apply w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500;
}

.btn-primary {
  @apply inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50;
}

.btn-ghost {
  @apply inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50;
}
</style>
