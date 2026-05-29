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
  const csvRows = rows.value.map((r) => [r.month, r.total_employees, r.total_gross, r.total_deductions, r.total_net, r.average_salary])
  const csv = [headers, ...csvRows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'payroll-report.csv'; a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<template>
  <div class="pr-page">
    <div class="pr-filter-bar">
      <div class="pr-filter-field">
        <label class="pr-filter-label">Start Date</label>
        <input v-model="filters.start_date" type="date" class="pr-input" />
      </div>
      <div class="pr-filter-field">
        <label class="pr-filter-label">End Date</label>
        <input v-model="filters.end_date" type="date" class="pr-input" />
      </div>
      <button class="pr-btn-primary" @click="load">Apply</button>
      <button class="pr-btn-ghost pr-ml-auto" @click="exportCsv">Export CSV</button>
    </div>

    <div class="pr-stats">
      <div class="pr-stat-card">
        <div class="pr-stat-label">Total Payroll Cost</div>
        <div class="pr-stat-value">{{ formatCurrency(totalCost) }}</div>
      </div>
      <div class="pr-stat-card">
        <div class="pr-stat-label">Avg Monthly Salary</div>
        <div class="pr-stat-value pr-blue">{{ formatCurrency(Number(avgSalary)) }}</div>
      </div>
    </div>

    <div v-if="error" class="pr-error">{{ error }}</div>

    <div v-if="loading" class="pr-card pr-loading">
      <div v-for="i in 5" :key="i" class="pr-skeleton"></div>
    </div>

    <div v-else-if="rows.length" class="pr-card">
      <table class="pr-table">
        <thead>
          <tr>
            <th class="pr-th">Month</th>
            <th class="pr-th pr-th-right">Employees</th>
            <th class="pr-th pr-th-right">Gross Pay</th>
            <th class="pr-th pr-th-right">Deductions</th>
            <th class="pr-th pr-th-right">Net Pay</th>
            <th class="pr-th pr-th-right">Avg Salary</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.month" class="pr-row">
            <td class="pr-td pr-td-name">{{ row.month }}</td>
            <td class="pr-td pr-td-right pr-mono">{{ row.total_employees }}</td>
            <td class="pr-td pr-td-right pr-mono">{{ formatCurrency(row.total_gross) }}</td>
            <td class="pr-td pr-td-right pr-mono pr-red">{{ formatCurrency(row.total_deductions) }}</td>
            <td class="pr-td pr-td-right pr-mono pr-green pr-bold">{{ formatCurrency(row.total_net) }}</td>
            <td class="pr-td pr-td-right pr-mono pr-blue">{{ formatCurrency(row.average_salary) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="pr-empty">No data. Apply filters and click Apply.</div>
  </div>
</template>

<style scoped>
.pr-page { display: flex; flex-direction: column; gap: 16px; }
.pr-filter-bar { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.pr-filter-field { display: flex; flex-direction: column; gap: 4px; }
.pr-filter-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.pr-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; }
.pr-input:focus { border-color: #6B5BFF; }
.pr-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 18px; font-size: 13px; font-weight: 500; cursor: pointer; }
.pr-btn-primary:hover { opacity: 0.88; }
.pr-btn-ghost { background: transparent; border: 1px solid #232936; color: #7A8299; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.pr-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.pr-ml-auto { margin-left: auto; }
.pr-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pr-stat-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; }
.pr-stat-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; }
.pr-stat-value { font-family: 'Instrument Serif', serif; font-size: 28px; color: #EEF0F4; letter-spacing: -0.02em; margin-top: 4px; }
.pr-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.pr-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.pr-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.pr-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: pr-pulse 1.2s ease-in-out infinite; }
@keyframes pr-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.pr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pr-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.pr-th-right { text-align: right; }
.pr-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.pr-row:last-child { border-bottom: none; }
.pr-row:hover { background: rgba(255,255,255,0.02); }
.pr-td { padding: 11px 16px; color: #B6BED0; vertical-align: middle; }
.pr-td-name { color: #EEF0F4; font-weight: 500; }
.pr-td-right { text-align: right; }
.pr-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.pr-bold { font-weight: 600; }
.pr-green { color: #4DD39A; }
.pr-red { color: #F38288; }
.pr-blue { color: #7ED7FF; }
.pr-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }
</style>
