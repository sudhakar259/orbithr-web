<template>
  <section class="lr-page">
    <div class="lr-header">
      <div>
        <h1 class="lr-title">Leave Reports</h1>
        <p class="lr-sub">Utilization, department breakdowns, trends and employee summaries.</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="lr-tabs">
      <button v-for="tab in tabs" :key="tab.key"
        :class="['lr-tab', activeTab === tab.key && 'lr-tab-active']"
        @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>

    <!-- Filters -->
    <div class="lr-filters">
      <div class="lr-filter-field">
        <label class="lr-filter-label">Year</label>
        <select v-model.number="filters.year" class="lr-select">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div v-if="activeTab === 'department'" class="lr-filter-field">
        <label class="lr-filter-label">Month</label>
        <select v-model="filters.month" class="lr-select">
          <option value="">All Months</option>
          <option v-for="(m, i) in monthNames" :key="i" :value="i + 1">{{ m }}</option>
        </select>
      </div>
      <div v-if="activeTab === 'utilization'" class="lr-filter-field">
        <label class="lr-filter-label">Department</label>
        <input v-model="filters.department" placeholder="Filter by department" class="lr-select" />
      </div>
      <button class="lr-btn-primary" @click="loadReport">Generate</button>
    </div>

    <div v-if="loading" class="lr-loading">Generating report…</div>

    <!-- Utilization Report -->
    <template v-if="activeTab === 'utilization' && !loading && utilizationData">
      <div class="lr-stat-grid">
        <div v-for="s in [
          { label: 'Total Employees', value: utilizationData.summary.total_employees },
          { label: 'Total Days Taken', value: utilizationData.summary.total_days_taken },
          { label: 'Avg Utilization', value: (utilizationData.summary.average_utilization ?? 0).toFixed(1) + '%' },
          { label: 'Total Requests', value: utilizationData.summary.total_requests },
        ]" :key="s.label" class="lr-stat-card">
          <div class="lr-stat-value">{{ s.value }}</div>
          <div class="lr-stat-label">{{ s.label }}</div>
        </div>
      </div>

      <div class="lr-card">
        <table class="lr-table">
          <thead>
            <tr>
              <th class="lr-th">Employee</th>
              <th class="lr-th">Department</th>
              <th class="lr-th">Leave Type</th>
              <th class="lr-th">Allocated</th>
              <th class="lr-th">Used</th>
              <th class="lr-th">Available</th>
              <th class="lr-th">Utilization</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in utilizationData.data" :key="i" class="lr-row">
              <td class="lr-td lr-td-name">{{ row.employee_name }}</td>
              <td class="lr-td">{{ row.department || '—' }}</td>
              <td class="lr-td">{{ row.leave_type }}</td>
              <td class="lr-td lr-td-num">{{ row.balance_allocated }}</td>
              <td class="lr-td lr-td-num">{{ row.balance_used }}</td>
              <td class="lr-td lr-td-num">{{ row.balance_available }}</td>
              <td class="lr-td">
                <div class="lr-util-wrap">
                  <div class="lr-util-bar">
                    <div class="lr-util-fill" :style="{ width: Math.min(row.utilization_percentage, 100) + '%' }"></div>
                  </div>
                  <span class="lr-util-pct">{{ row.utilization_percentage }}%</span>
                </div>
              </td>
            </tr>
            <tr v-if="!utilizationData.data.length">
              <td colspan="7" class="lr-empty">No data for the selected filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Department Report -->
    <template v-if="activeTab === 'department' && !loading && departmentData">
      <div class="lr-stat-grid">
        <div v-for="s in [
          { label: 'Departments', value: departmentData.summary.total_departments },
          { label: 'Total Requests', value: departmentData.summary.total_requests },
          { label: 'Approved Days', value: departmentData.summary.total_approved_days },
          { label: 'Pending Days', value: departmentData.summary.total_pending_days },
        ]" :key="s.label" class="lr-stat-card">
          <div class="lr-stat-value">{{ s.value }}</div>
          <div class="lr-stat-label">{{ s.label }}</div>
        </div>
      </div>

      <div v-for="dept in departmentData.departments" :key="dept.department" class="lr-dept-card">
        <div class="lr-dept-head">
          <h3 class="lr-dept-name">{{ dept.department }}</h3>
          <div class="lr-dept-meta">
            <span>{{ dept.total_requests }} requests</span>
            <span>{{ dept.total_approved_days }} approved days</span>
          </div>
        </div>
        <table class="lr-table">
          <thead>
            <tr>
              <th class="lr-th">Leave Type</th>
              <th class="lr-th">Requests</th>
              <th class="lr-th">Approved Days</th>
              <th class="lr-th">Pending Days</th>
              <th class="lr-th">Avg / Request</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lt in dept.leave_types" :key="lt.leave_code" class="lr-row">
              <td class="lr-td lr-td-name">{{ lt.leave_type }}</td>
              <td class="lr-td lr-td-num">{{ lt.requests }}</td>
              <td class="lr-td lr-td-num">{{ lt.approved_days }}</td>
              <td class="lr-td lr-td-num">{{ lt.pending_days }}</td>
              <td class="lr-td lr-td-num">{{ lt.avg_days_per_request }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!departmentData.departments.length" class="lr-empty-block">No department data for the selected period.</div>
    </template>

    <!-- Trends Report -->
    <template v-if="activeTab === 'trends' && !loading && trendsData">
      <div v-for="yearData in trendsData.trends" :key="yearData.year" class="lr-dept-card">
        <div class="lr-dept-head">
          <h3 class="lr-dept-name">{{ yearData.year }}</h3>
          <div class="lr-dept-meta">
            <span>{{ yearData.yearly_totals.total_requests }} requests</span>
            <span>{{ yearData.yearly_totals.total_approved_days }} approved days</span>
          </div>
        </div>
        <table class="lr-table">
          <thead>
            <tr>
              <th class="lr-th">Month</th>
              <th class="lr-th">Requests</th>
              <th class="lr-th">Approved Days</th>
              <th class="lr-th">Trend</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in yearData.monthly_data" :key="m.month" class="lr-row">
              <td class="lr-td lr-td-name">{{ m.month_name }}</td>
              <td class="lr-td lr-td-num">{{ m.total_requests }}</td>
              <td class="lr-td lr-td-num">{{ m.total_approved_days }}</td>
              <td class="lr-td">
                <div class="lr-util-bar">
                  <div class="lr-util-fill" :style="{ width: maxDays(yearData) > 0 ? (m.total_approved_days / maxDays(yearData) * 100) + '%' : '0%' }"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Employee Summary -->
    <template v-if="activeTab === 'employee' && !loading && employeeData">
      <div v-for="emp in employeeData.employee_summaries" :key="emp.employee.id" class="lr-dept-card">
        <div class="lr-dept-head">
          <div>
            <h3 class="lr-dept-name">{{ emp.employee.name }}</h3>
            <div class="lr-emp-sub">{{ emp.employee.department }} — {{ emp.employee.designation }}</div>
          </div>
          <div class="lr-dept-meta">
            <span>{{ emp.leave_requests_summary.total_requests }} requests</span>
            <span>{{ emp.leave_requests_summary.total_days_approved }} days approved</span>
          </div>
        </div>
        <div class="lr-balance-grid">
          <div v-for="b in emp.leave_balances" :key="b.leave_code" class="lr-balance-card">
            <div class="lr-balance-type">{{ b.leave_type }}</div>
            <div class="lr-balance-value">{{ b.available }}<span class="lr-balance-total"> / {{ b.allocated }}</span></div>
            <div class="lr-util-bar lr-util-bar-sm">
              <div class="lr-util-fill" :style="{ width: Math.min(b.utilization_percentage, 100) + '%' }"></div>
            </div>
            <div class="lr-balance-pct">{{ b.utilization_percentage }}% used</div>
          </div>
        </div>
      </div>
      <div v-if="!employeeData.employee_summaries.length" class="lr-empty-block">No employee data found.</div>
    </template>
  </section>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const utilizationData = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const departmentData = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const trendsData = ref<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const employeeData = ref<any>(null)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function maxDays(yearData: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Math.max(...yearData.monthly_data.map((m: any) => m.total_approved_days || 0), 1)
}

async function loadReport() {
  loading.value = true
  try {
    switch (activeTab.value) {
      case 'utilization': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params: any = { year: filters.year }
        if (filters.department) params.department = filters.department
        utilizationData.value = await leaveService.getUtilizationReport(params)
        break
      }
      case 'department': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

<style scoped>
.lr-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.lr-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.lr-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.lr-sub { margin: 4px 0 0; font-size: 13px; color: #7A8299; }

.lr-tabs { display: flex; gap: 2px; background: #11141C; border: 1px solid #232936; border-radius: 8px; padding: 4px; width: fit-content; }
.lr-tab { padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; border: none; background: transparent; color: #7A8299; cursor: pointer; transition: background 0.12s, color 0.12s; }
.lr-tab:hover { color: #B6BED0; }
.lr-tab-active { background: #161A23; color: #EEF0F4; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }

.lr-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.lr-filter-field { display: flex; flex-direction: column; gap: 4px; }
.lr-filter-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.lr-select {
  background: #161A23; border: 1px solid #232936; color: #EEF0F4;
  border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; cursor: pointer;
}
.lr-select:focus { border-color: #6B5BFF; }
.lr-btn-primary {
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
}
.lr-btn-primary:hover { opacity: 0.88; }

.lr-loading { padding: 48px; text-align: center; color: #7A8299; font-size: 14px; }

.lr-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.lr-stat-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; }
.lr-stat-value { font-family: 'Instrument Serif', serif; font-size: 28px; color: #EEF0F4; letter-spacing: -0.02em; }
.lr-stat-label { font-size: 12px; color: #7A8299; margin-top: 2px; }

.lr-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.lr-dept-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.lr-dept-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #232936; flex-wrap: wrap; gap: 8px; }
.lr-dept-name { margin: 0; font-size: 14px; font-weight: 600; color: #EEF0F4; }
.lr-dept-meta { display: flex; gap: 16px; font-size: 12px; color: #7A8299; }
.lr-emp-sub { font-size: 12px; color: #7A8299; margin-top: 2px; }

.lr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lr-th { padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.lr-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.lr-row:last-child { border-bottom: none; }
.lr-row:hover { background: rgba(255,255,255,0.02); }
.lr-td { padding: 11px 16px; color: #B6BED0; vertical-align: middle; }
.lr-td-name { color: #EEF0F4; font-weight: 500; }
.lr-td-num { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.lr-empty { padding: 28px; text-align: center; color: #7A8299; }
.lr-empty-block { padding: 32px; text-align: center; color: #7A8299; background: #161A23; border: 1px solid #232936; border-radius: 10px; }

.lr-util-wrap { display: flex; align-items: center; gap: 8px; }
.lr-util-bar { height: 6px; background: #232936; border-radius: 3px; overflow: hidden; width: 80px; }
.lr-util-bar-sm { width: 100%; margin-top: 6px; }
.lr-util-fill { height: 100%; background: #6B5BFF; border-radius: 3px; }
.lr-util-pct { font-size: 11px; color: #7A8299; font-family: 'JetBrains Mono', monospace; }

.lr-balance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; }
.lr-balance-card { background: #0D0F17; border: 1px solid #232936; border-radius: 8px; padding: 12px; }
.lr-balance-type { font-size: 11px; color: #7A8299; font-weight: 500; }
.lr-balance-value { font-family: 'Instrument Serif', serif; font-size: 22px; color: #EEF0F4; margin-top: 4px; }
.lr-balance-total { font-family: inherit; font-size: 13px; color: #7A8299; }
.lr-balance-pct { font-size: 11px; color: #7A8299; margin-top: 4px; }
</style>
