<script setup lang="ts">
defineOptions({ name: 'HrReports' })

import { ref, computed, watch } from 'vue'
import api from '@/services/api'

const activeTab = ref<'attendance' | 'payroll' | 'headcount' | 'attrition' | 'performance'>('attendance')
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const reportData = ref<any>(null)

const filters = ref({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  department: '',
})

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

const years = computed(() => {
  const current = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => current - i)
})

const tabs = [
  { key: 'attendance' as const, label: 'Attendance' },
  { key: 'payroll' as const, label: 'Payroll' },
  { key: 'headcount' as const, label: 'Headcount' },
  { key: 'attrition' as const, label: 'Attrition' },
  { key: 'performance' as const, label: 'Performance' },
]

async function fetchReport() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/reports/${activeTab.value}`, { params: filters.value })
    reportData.value = data.data ?? data
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Failed to load report'
    reportData.value = null
  } finally {
    loading.value = false
  }
}

async function exportReport() {
  exporting.value = true
  try {
    await api.post('/reports/export', { type: activeTab.value, ...filters.value }, { responseType: 'blob' })
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Failed to export report'
  } finally {
    exporting.value = false
  }
}

watch([activeTab, filters], fetchReport, { deep: true, immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="mt-1 text-sm text-gray-400">View and export reports across departments</p>
      </div>
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg inline-flex items-center gap-2"
        :disabled="exporting"
        @click="exportReport"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        {{ exporting ? 'Exporting...' : 'Export' }}
      </button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <nav class="flex gap-4">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === tab.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Filter Bar -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div class="flex flex-wrap items-center gap-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Month</label>
          <select v-model.number="filters.month" class="bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Year</label>
          <select v-model.number="filters.year" class="bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Department</label>
          <input
            v-model="filters.department"
            type="text"
            placeholder="All departments"
            class="bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2"
          />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400 text-sm">{{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>

    <!-- Report Content -->
    <template v-else-if="reportData">
      <!-- Attendance Tab -->
      <div v-if="activeTab === 'attendance'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Total Employees</p>
            <p class="text-2xl font-bold text-white mt-1">{{ reportData.total_employees ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Avg Attendance %</p>
            <p class="text-2xl font-bold text-green-400 mt-1">{{ reportData.avg_attendance_percentage ?? '--' }}%</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Total Absent Days</p>
            <p class="text-2xl font-bold text-red-400 mt-1">{{ reportData.total_absent_days ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Late Arrivals</p>
            <p class="text-2xl font-bold text-yellow-400 mt-1">{{ reportData.total_late_arrivals ?? '--' }}</p>
          </div>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
              <tr>
                <th class="px-4 py-3">Employee</th>
                <th class="px-4 py-3">Department</th>
                <th class="px-4 py-3">Present</th>
                <th class="px-4 py-3">Absent</th>
                <th class="px-4 py-3">Late</th>
                <th class="px-4 py-3">Attendance %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              <tr v-for="row in (reportData.records ?? [])" :key="row.employee_id" class="text-gray-300">
                <td class="px-4 py-3 text-white font-medium">{{ row.employee_name }}</td>
                <td class="px-4 py-3">{{ row.department ?? '-' }}</td>
                <td class="px-4 py-3 text-green-400">{{ row.present_days }}</td>
                <td class="px-4 py-3 text-red-400">{{ row.absent_days }}</td>
                <td class="px-4 py-3 text-yellow-400">{{ row.late_arrivals }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-green-500 rounded-full" :style="{ width: (row.attendance_percentage ?? 0) + '%' }" />
                    </div>
                    <span class="text-xs">{{ row.attendance_percentage ?? 0 }}%</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Payroll Tab -->
      <div v-if="activeTab === 'payroll'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Total Gross</p>
            <p class="text-2xl font-bold text-white mt-1">${{ reportData.total_gross?.toLocaleString() ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Total Deductions</p>
            <p class="text-2xl font-bold text-red-400 mt-1">${{ reportData.total_deductions?.toLocaleString() ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Total Net Pay</p>
            <p class="text-2xl font-bold text-green-400 mt-1">${{ reportData.total_net?.toLocaleString() ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Employees Paid</p>
            <p class="text-2xl font-bold text-blue-400 mt-1">{{ reportData.employees_paid ?? '--' }}</p>
          </div>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
              <tr>
                <th class="px-4 py-3">Employee</th>
                <th class="px-4 py-3">Department</th>
                <th class="px-4 py-3">Gross</th>
                <th class="px-4 py-3">Deductions</th>
                <th class="px-4 py-3">Net Pay</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              <tr v-for="row in (reportData.records ?? [])" :key="row.employee_id" class="text-gray-300">
                <td class="px-4 py-3 text-white font-medium">{{ row.employee_name }}</td>
                <td class="px-4 py-3">{{ row.department ?? '-' }}</td>
                <td class="px-4 py-3">${{ row.gross?.toLocaleString() }}</td>
                <td class="px-4 py-3 text-red-400">${{ row.deductions?.toLocaleString() }}</td>
                <td class="px-4 py-3 text-green-400">${{ row.net_pay?.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Headcount Tab -->
      <div v-if="activeTab === 'headcount'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Total Headcount</p>
            <p class="text-2xl font-bold text-white mt-1">{{ reportData.total_headcount ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">New Hires</p>
            <p class="text-2xl font-bold text-green-400 mt-1">{{ reportData.new_hires ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Exits</p>
            <p class="text-2xl font-bold text-red-400 mt-1">{{ reportData.exits ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Net Change</p>
            <p class="text-2xl font-bold mt-1" :class="(reportData.net_change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'">{{ (reportData.net_change ?? 0) >= 0 ? '+' : '' }}{{ reportData.net_change ?? '--' }}</p>
          </div>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
              <tr>
                <th class="px-4 py-3">Department</th>
                <th class="px-4 py-3">Current</th>
                <th class="px-4 py-3">New Hires</th>
                <th class="px-4 py-3">Exits</th>
                <th class="px-4 py-3">Net Change</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              <tr v-for="row in (reportData.records ?? [])" :key="row.department" class="text-gray-300">
                <td class="px-4 py-3 text-white font-medium">{{ row.department }}</td>
                <td class="px-4 py-3">{{ row.current_count }}</td>
                <td class="px-4 py-3 text-green-400">+{{ row.new_hires }}</td>
                <td class="px-4 py-3 text-red-400">-{{ row.exits }}</td>
                <td class="px-4 py-3" :class="row.net_change >= 0 ? 'text-green-400' : 'text-red-400'">{{ row.net_change >= 0 ? '+' : '' }}{{ row.net_change }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Attrition Tab -->
      <div v-if="activeTab === 'attrition'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Attrition Rate</p>
            <p class="text-2xl font-bold text-red-400 mt-1">{{ reportData.attrition_rate ?? '--' }}%</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Voluntary Exits</p>
            <p class="text-2xl font-bold text-yellow-400 mt-1">{{ reportData.voluntary_exits ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Involuntary Exits</p>
            <p class="text-2xl font-bold text-orange-400 mt-1">{{ reportData.involuntary_exits ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Avg Tenure (months)</p>
            <p class="text-2xl font-bold text-blue-400 mt-1">{{ reportData.avg_tenure_months ?? '--' }}</p>
          </div>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
              <tr>
                <th class="px-4 py-3">Department</th>
                <th class="px-4 py-3">Exits</th>
                <th class="px-4 py-3">Attrition Rate</th>
                <th class="px-4 py-3">Top Reason</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              <tr v-for="row in (reportData.records ?? [])" :key="row.department" class="text-gray-300">
                <td class="px-4 py-3 text-white font-medium">{{ row.department }}</td>
                <td class="px-4 py-3">{{ row.exit_count }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-red-500 rounded-full" :style="{ width: Math.min(row.attrition_rate ?? 0, 100) + '%' }" />
                    </div>
                    <span class="text-xs">{{ row.attrition_rate }}%</span>
                  </div>
                </td>
                <td class="px-4 py-3">{{ row.top_reason ?? '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Performance Tab -->
      <div v-if="activeTab === 'performance'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Avg Rating</p>
            <p class="text-2xl font-bold text-white mt-1">{{ reportData.avg_rating ?? '--' }} / 5</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Reviews Completed</p>
            <p class="text-2xl font-bold text-green-400 mt-1">{{ reportData.reviews_completed ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Reviews Pending</p>
            <p class="text-2xl font-bold text-yellow-400 mt-1">{{ reportData.reviews_pending ?? '--' }}</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p class="text-xs text-gray-400">Top Performers</p>
            <p class="text-2xl font-bold text-purple-400 mt-1">{{ reportData.top_performers_count ?? '--' }}</p>
          </div>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
              <tr>
                <th class="px-4 py-3">Employee</th>
                <th class="px-4 py-3">Department</th>
                <th class="px-4 py-3">Rating</th>
                <th class="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              <tr v-for="row in (reportData.records ?? [])" :key="row.employee_id" class="text-gray-300">
                <td class="px-4 py-3 text-white font-medium">{{ row.employee_name }}</td>
                <td class="px-4 py-3">{{ row.department ?? '-' }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-purple-500 rounded-full" :style="{ width: ((row.rating ?? 0) / 5) * 100 + '%' }" />
                    </div>
                    <span class="text-xs">{{ row.rating ?? '-' }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 text-xs rounded-full"
                    :class="row.status === 'completed' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'"
                  >{{ row.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else-if="!loading && !error" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-400">No report data available for the selected filters.</p>
    </div>
  </div>
</template>
