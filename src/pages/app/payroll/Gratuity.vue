<script setup lang="ts">
defineOptions({ name: 'GratuityCalculator' })

import { ref, onMounted } from 'vue'
import api from '@/services/api'

type View = 'individual' | 'bulk'
const activeView = ref<View>('individual')

// ── Individual ──
interface Employee { id: number; first_name: string; last_name: string }
const employees = ref<Employee[]>([])
const selectedEmployeeId = ref('')
const individualResult = ref<any>(null)
const individualLoading = ref(false)

async function fetchEmployees() {
  try {
    const { data } = await api.get('/employees', { params: { per_page: 200 } })
    employees.value = data.data ?? data
  } catch { /* silently ignore */ }
}

async function calculateIndividual() {
  if (!selectedEmployeeId.value) return
  individualLoading.value = true
  individualResult.value = null
  try {
    const { data } = await api.get('/gratuity/calculate', { params: { employee_id: selectedEmployeeId.value } })
    individualResult.value = data.data ?? data
  } catch { /* silently ignore */ }
  finally { individualLoading.value = false }
}

// ── Bulk ──
interface GratuityRecord {
  employee_id: number
  employee_name: string
  department: string
  years_of_service: number
  basic_salary: number
  gratuity_amount: number
  is_eligible: boolean
}

const bulkData = ref<GratuityRecord[]>([])
const bulkLoading = ref(false)
const sortField = ref<'employee_name' | 'years_of_service' | 'gratuity_amount'>('gratuity_amount')
const sortDir = ref<'asc' | 'desc'>('desc')

async function fetchBulk() {
  bulkLoading.value = true
  try {
    const { data } = await api.get('/gratuity/bulk')
    bulkData.value = data.data ?? data
  } catch { /* silently ignore */ }
  finally { bulkLoading.value = false }
}

function sortedBulk() {
  return [...bulkData.value].sort((a, b) => {
    const av = a[sortField.value]
    const bv = b[sortField.value]
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir.value === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir.value === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })
}

function toggleSort(field: typeof sortField.value) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
}

function sortIcon(field: string) {
  if (sortField.value !== field) return ''
  return sortDir.value === 'asc' ? ' \u2191' : ' \u2193'
}

onMounted(() => {
  fetchEmployees()
  fetchBulk()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="mt-1 text-sm text-gray-400">Calculate and view employee gratuity amounts</p>
      </div>
    </div>

    <!-- View Toggle -->
    <div class="border-b border-gray-700">
      <nav class="flex gap-4">
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeView === 'individual' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
          @click="activeView = 'individual'"
        >Calculate Individual</button>
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeView === 'bulk' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
          @click="activeView = 'bulk'"
        >Bulk View</button>
      </nav>
    </div>

    <!-- Individual Calculation -->
    <div v-if="activeView === 'individual'" class="space-y-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div class="flex items-end gap-4">
          <div class="flex-1">
            <label class="block text-sm text-gray-400 mb-1">Select Employee</label>
            <select v-model="selectedEmployeeId" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
              <option value="">Choose an employee</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name }}</option>
            </select>
          </div>
          <button
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg"
            :disabled="!selectedEmployeeId || individualLoading"
            @click="calculateIndividual"
          >{{ individualLoading ? 'Calculating...' : 'Calculate' }}</button>
        </div>
      </div>

      <div v-if="individualLoading" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

      <div v-else-if="individualResult" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Employee Details</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-400">Name</span>
              <span class="text-white">{{ individualResult.employee_name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Department</span>
              <span class="text-white">{{ individualResult.department ?? '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Date of Joining</span>
              <span class="text-white">{{ individualResult.date_of_joining ?? '-' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Years of Service</span>
              <span class="text-white font-semibold">{{ individualResult.years_of_service }} years</span>
            </div>
          </div>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Gratuity Calculation</h3>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-400">Basic Salary</span>
              <span class="text-white">${{ individualResult.basic_salary?.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">DA (if applicable)</span>
              <span class="text-white">${{ individualResult.da?.toLocaleString() ?? '0' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Eligible</span>
              <span :class="individualResult.is_eligible ? 'text-green-400' : 'text-red-400'">{{ individualResult.is_eligible ? 'Yes (5+ years)' : 'No (less than 5 years)' }}</span>
            </div>
            <div class="border-t border-gray-700 pt-3 flex justify-between">
              <span class="text-white font-semibold">Gratuity Amount</span>
              <span class="text-2xl font-bold text-green-400">${{ individualResult.gratuity_amount?.toLocaleString() }}</span>
            </div>
          </div>
          <p class="text-xs text-gray-500">Formula: (15 x Last drawn salary x Years of service) / 26</p>
        </div>
      </div>
    </div>

    <!-- Bulk View -->
    <div v-if="activeView === 'bulk'">
      <div v-if="bulkLoading" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
            <tr>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('employee_name')">Employee{{ sortIcon('employee_name') }}</th>
              <th class="px-4 py-3">Department</th>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('years_of_service')">Years of Service{{ sortIcon('years_of_service') }}</th>
              <th class="px-4 py-3">Basic Salary</th>
              <th class="px-4 py-3 cursor-pointer select-none" @click="toggleSort('gratuity_amount')">Gratuity{{ sortIcon('gratuity_amount') }}</th>
              <th class="px-4 py-3">Eligible</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="row in sortedBulk()" :key="row.employee_id" class="text-gray-300">
              <td class="px-4 py-3 text-white font-medium">{{ row.employee_name }}</td>
              <td class="px-4 py-3">{{ row.department ?? '-' }}</td>
              <td class="px-4 py-3">{{ row.years_of_service }}</td>
              <td class="px-4 py-3">${{ row.basic_salary?.toLocaleString() }}</td>
              <td class="px-4 py-3 text-green-400 font-medium">${{ row.gratuity_amount?.toLocaleString() }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs rounded-full" :class="row.is_eligible ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'">{{ row.is_eligible ? 'Yes' : 'No' }}</span>
              </td>
            </tr>
            <tr v-if="bulkData.length === 0"><td colspan="6" class="px-4 py-8 text-center text-gray-500">No gratuity data available</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
