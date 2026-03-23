<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      <button v-for="tab in tabs" :key="tab.key"
        class="rounded-md px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label class="mb-1 block text-xs font-medium text-slate-500">Year</label>
        <select v-model.number="filters.year" class="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div v-if="activeTab === 'department'">
        <label class="mb-1 block text-xs font-medium text-slate-500">Month</label>
        <select v-model="filters.month" class="rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">All Months</option>
          <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">{{ m }}</option>
        </select>
      </div>
      <div v-if="activeTab === 'utilization'">
        <label class="mb-1 block text-xs font-medium text-slate-500">Department</label>
        <input v-model="filters.department" placeholder="Filter by department" class="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <button class="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700" @click="loadReport">
        Generate
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-12 text-center text-slate-400">Loading report…</div>

    <!-- Utilization Report -->
    <div v-if="activeTab === 'utilization' && !loading && utilizationData" class="space-y-4">
      <!-- Summary cards -->
      <div class="grid grid-cols-4 gap-4">
        <div v-for="s in [
          { label: 'Total Employees', value: utilizationData.summary.total_employees },
          { label: 'Total Days Taken', value: utilizationData.summary.total_days_taken },
          { label: 'Avg Utilization', value: (utilizationData.summary.average_utilization ?? 0).toFixed(1) + '%' },
          { label: 'Total Requests', value: utilizationData.summary.total_requests },
        ]" :key="s.label" class="rounded-lg border border-slate-200 bg-white p-4">
          <div class="text-2xl font-bold text-slate-800">{{ s.value }}</div>
          <div class="text-xs text-slate-500">{{ s.label }}</div>
        </div>
      </div>

      <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Employee</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Department</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Leave Type</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Allocated</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Used</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Available</th>
              <th class="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Utilization</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="(row, i) in utilizationData.data" :key="i" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-800">{{ row.employee_name }}</td>
              <td class="px-4 py-3 text-slate-600">{{ row.department || '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ row.leave_type }}</td>
              <td class="px-4 py-3 text-slate-600">{{ row.balance_allocated }}</td>
              <td class="px-4 py-3 text-slate-600">{{ row.balance_used }}</td>
              <td class="px-4 py-3 text-slate-600">{{ row.balance_available }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="h-2 w-20 rounded-full bg-slate-200">
                    <div class="h-2 rounded-full bg-brand-600" :style="{ width: Math.min(row.utilization_percentage, 100) + '%' }"></div>
                  </div>
                  <span class="text-xs text-slate-500">{{ row.utilization_percentage }}%</span>
                </div>
              </td>
            </tr>
            <tr v-if="!utilizationData.data.length">
              <td colspan="7" class="px-4 py-8 text-center text-slate-400">No data for the selected filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Department Report -->
    <div v-if="activeTab === 'department' && !loading && departmentData" class="space-y-4">
      <div class="grid grid-cols-4 gap-4">
        <div v-for="s in [
          { label: 'Departments', value: departmentData.summary.total_departments },
          { label: 'Total Requests', value: departmentData.summary.total_requests },
          { label: 'Approved Days', value: departmentData.summary.total_approved_days },
          { label: 'Pending Days', value: departmentData.summary.total_pending_days },
        ]" :key="s.label" class="rounded-lg border border-slate-200 bg-white p-4">
          <div class="text-2xl font-bold text-slate-800">{{ s.value }}</div>
          <div class="text-xs text-slate-500">{{ s.label }}</div>
        </div>
      </div>

      <div v-for="dept in departmentData.departments" :key="dept.department" class="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 class="font-semibold text-slate-800">{{ dept.department }}</h3>
          <div class="flex gap-4 text-xs text-slate-500">
            <span>{{ dept.total_requests }} requests</span>
            <span>{{ dept.total_approved_days }} approved days</span>
          </div>
        </div>
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Leave Type</th>
              <th class="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Requests</th>
              <th class="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Approved Days</th>
              <th class="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Pending Days</th>
              <th class="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Avg/Request</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="lt in dept.leave_types" :key="lt.leave_code" class="hover:bg-slate-50">
              <td class="px-4 py-2 text-slate-800">{{ lt.leave_type }}</td>
              <td class="px-4 py-2 text-slate-600">{{ lt.requests }}</td>
              <td class="px-4 py-2 text-slate-600">{{ lt.approved_days }}</td>
              <td class="px-4 py-2 text-slate-600">{{ lt.pending_days }}</td>
              <td class="px-4 py-2 text-slate-600">{{ lt.avg_days_per_request }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!departmentData.departments.length" class="py-8 text-center text-slate-400">No department data for the selected period.</div>
    </div>

    <!-- Trends Report -->
    <div v-if="activeTab === 'trends' && !loading && trendsData" class="space-y-4">
      <div v-for="yearData in trendsData.trends" :key="yearData.year" class="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="border-b border-slate-200 px-4 py-3">
          <h3 class="font-semibold text-slate-800">{{ yearData.year }} — {{ yearData.yearly_totals.total_requests }} requests, {{ yearData.yearly_totals.total_approved_days }} days</h3>
        </div>
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Month</th>
              <th class="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Requests</th>
              <th class="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Approved Days</th>
              <th class="px-4 py-2 text-left text-xs font-medium uppercase text-slate-600">Trend</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="m in yearData.monthly_data" :key="m.month" class="hover:bg-slate-50">
              <td class="px-4 py-2 font-medium text-slate-800">{{ m.month_name }}</td>
              <td class="px-4 py-2 text-slate-600">{{ m.total_requests }}</td>
              <td class="px-4 py-2 text-slate-600">{{ m.total_approved_days }}</td>
              <td class="px-4 py-2">
                <div class="h-2 w-24 rounded-full bg-slate-200">
                  <div class="h-2 rounded-full bg-brand-600" :style="{ width: maxDays(yearData) > 0 ? (m.total_approved_days / maxDays(yearData) * 100) + '%' : '0%' }"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Employee Summary -->
    <div v-if="activeTab === 'employee' && !loading && employeeData" class="space-y-4">
      <div v-for="emp in employeeData.employee_summaries" :key="emp.employee.id" class="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 class="font-semibold text-slate-800">{{ emp.employee.name }}</h3>
            <div class="text-xs text-slate-500">{{ emp.employee.department }} — {{ emp.employee.designation }}</div>
          </div>
          <div class="flex gap-4 text-xs text-slate-500">
            <span>{{ emp.leave_requests_summary.total_requests }} total requests</span>
            <span>{{ emp.leave_requests_summary.total_days_approved }} days approved</span>
          </div>
        </div>
        <div class="p-4">
          <h4 class="mb-2 text-sm font-medium text-slate-700">Leave Balances</h4>
          <div class="grid grid-cols-3 gap-3 lg:grid-cols-4">
            <div v-for="b in emp.leave_balances" :key="b.leave_code" class="rounded border border-slate-200 p-3">
              <div class="text-xs font-medium text-slate-500">{{ b.leave_type }}</div>
              <div class="mt-1 text-lg font-bold text-slate-800">{{ b.available }} <span class="text-xs font-normal text-slate-400">/ {{ b.allocated }}</span></div>
              <div class="mt-1 h-1.5 rounded-full bg-slate-200">
                <div class="h-1.5 rounded-full bg-brand-600" :style="{ width: Math.min(b.utilization_percentage, 100) + '%' }"></div>
              </div>
              <div class="mt-1 text-xs text-slate-400">{{ b.utilization_percentage }}% used</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!employeeData.employee_summaries.length" class="py-8 text-center text-slate-400">No employee data found.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { leaveService } from '@/services/leave'

const tabs = [
  { key: 'utilization', label: 'Utilization' },
  { key: 'department', label: 'By Department' },
  { key: 'trends', label: 'Trends' },
  { key: 'employee', label: 'Employee Summary' },
]

const activeTab = ref('utilization')
const loading = ref(false)
const currentYear = new Date().getFullYear()
const yearOptions = [currentYear - 1, currentYear, currentYear + 1]
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const filters = reactive({
  year: currentYear,
  month: '' as number | '',
  department: '',
})

const utilizationData = ref<any>(null)
const departmentData = ref<any>(null)
const trendsData = ref<any>(null)
const employeeData = ref<any>(null)

function maxDays(yearData: any) {
  return Math.max(...yearData.monthly_data.map((m: any) => m.total_approved_days || 0), 1)
}

async function loadReport() {
  loading.value = true
  try {
    switch (activeTab.value) {
      case 'utilization': {
        const params: any = { year: filters.year }
        if (filters.department) params.department = filters.department
        utilizationData.value = await leaveService.getUtilizationReport(params)
        break
      }
      case 'department': {
        const params: any = { year: filters.year }
        if (filters.month) params.month = filters.month
        departmentData.value = await leaveService.getDepartmentReport(params)
        break
      }
      case 'trends':
        trendsData.value = await leaveService.getTrendsReport({ start_year: filters.year, end_year: filters.year })
        break
      case 'employee':
        employeeData.value = await leaveService.getEmployeeSummaryReport({ year: filters.year })
        break
    }
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

onMounted(loadReport)
</script>
