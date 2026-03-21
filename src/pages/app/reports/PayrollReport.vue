<script setup lang="ts">
defineOptions({ name: 'ReportsPayroll' })
import { ref, computed, onMounted } from 'vue'
import { reportService, type PayrollReportRow, type ReportFilter } from '@/services/reportService'

const loading = ref(false)
const error = ref('')
const rows = ref<PayrollReportRow[]>([])
const filters = ref<ReportFilter>({ start_date: '', end_date: '' })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await reportService.getPayrollReport(filters.value)
    rows.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const totalCost = computed(() => rows.value.reduce((s, r) => s + r.total_net, 0))
const avgSalary = computed(() =>
  rows.value.length
    ? (rows.value.reduce((s, r) => s + r.average_salary, 0) / rows.value.length).toFixed(0)
    : '0',
)

const formatCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const exportCsv = () => {
  if (!rows.value.length) return
  const headers = ['Month', 'Employees', 'Gross Pay', 'Deductions', 'Net Pay', 'Avg Salary']
  const csvRows = rows.value.map((r) => [
    r.month,
    r.total_employees,
    r.total_gross,
    r.total_deductions,
    r.total_net,
    r.average_salary,
  ])
  const csv = [headers, ...csvRows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'payroll-report.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-wrap gap-4 items-end">
      <div>
        <label class="block text-xs text-gray-400 mb-1">Start Date</label>
        <input
          v-model="filters.start_date"
          type="date"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label class="block text-xs text-gray-400 mb-1">End Date</label>
        <input
          v-model="filters.end_date"
          type="date"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        @click="load"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Apply
      </button>
      <button
        @click="exportCsv"
        class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors ml-auto"
      >
        Export CSV
      </button>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Payroll Cost</p>
        <p class="text-2xl font-bold text-white">{{ formatCurrency(totalCost) }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Monthly Salary</p>
        <p class="text-2xl font-bold text-blue-400">{{ formatCurrency(Number(avgSalary)) }}</p>
      </div>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 bg-gray-700 rounded"></div>
      </div>
    </div>

    <div
      v-else-if="rows.length"
      class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
    >
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700/50">
          <tr>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Month
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Employees
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Gross Pay
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Deductions
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Net Pay
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Avg Salary
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr
            v-for="row in rows"
            :key="row.month"
            class="hover:bg-gray-700/30 transition-colors"
          >
            <td class="px-4 py-3 text-sm font-medium text-white">{{ row.month }}</td>
            <td class="px-4 py-3 text-sm text-right text-gray-300">{{ row.total_employees }}</td>
            <td class="px-4 py-3 text-sm text-right text-gray-300">
              {{ formatCurrency(row.total_gross) }}
            </td>
            <td class="px-4 py-3 text-sm text-right text-red-400">
              {{ formatCurrency(row.total_deductions) }}
            </td>
            <td class="px-4 py-3 text-sm text-right text-green-400 font-semibold">
              {{ formatCurrency(row.total_net) }}
            </td>
            <td class="px-4 py-3 text-sm text-right text-blue-400">
              {{ formatCurrency(row.average_salary) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No data. Apply filters and click Apply.</p>
    </div>
  </div>
</template>
