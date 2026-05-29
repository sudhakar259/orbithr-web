<script setup lang="ts">
defineOptions({ name: 'StatutoryCompliance' })

import { ref, watch } from 'vue'
import api from '@/services/api'

type TabKey = 'pf' | 'esi' | 'pt' | 'tds'

interface ReportRecord {
  employee_id: number
  employee_name: string
  uan?: string
  esic_no?: string
  pan?: string
  state?: string
  basic_wages?: number
  gross_wages?: number
  gross_salary?: number
  taxable_income?: number
  employee_pf?: number
  employer_pf?: number
  total_pf?: number
  employee_esi?: number
  employer_esi?: number
  total_esi?: number
  pt_amount?: number
  tds_deducted?: number
  surcharge?: number
  total_tax?: number
}

interface ReportResponse {
  records?: ReportRecord[]
  totals?: Record<string, number>
}

interface StatutorySummary {
  total_pf?: number
  total_esi?: number
  total_pt?: number
  total_tds?: number
}

const activeTab = ref<TabKey>('pf')
const loading = ref(false)
const reportData = ref<ReportResponse | ReportRecord[] | null>(null)
const summary = ref<StatutorySummary | null>(null)

const filters = ref({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
})

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

const tabs = [
  { key: 'pf' as const, label: 'PF Challan', endpoint: '/statutory/pf-challan' },
  { key: 'esi' as const, label: 'ESI Challan', endpoint: '/statutory/esi-challan' },
  { key: 'pt' as const, label: 'PT Report', endpoint: '/statutory/pt-report' },
  { key: 'tds' as const, label: 'TDS Report', endpoint: '/statutory/tds-report' },
]

async function fetchData() {
  loading.value = true
  try {
    const tab = tabs.find(t => t.key === activeTab.value)!
    const [reportRes, summaryRes] = await Promise.all([
      api.get(tab.endpoint, { params: filters.value }),
      api.get('/statutory/summary', { params: filters.value }),
    ])
    reportData.value = reportRes.data.data ?? reportRes.data
    summary.value = summaryRes.data.data ?? summaryRes.data
  } catch { /* silently ignore */ }
  finally { loading.value = false }
}

async function download() {
  const tab = tabs.find(t => t.key === activeTab.value)!
  try {
    const { data } = await api.get(`${tab.endpoint}/download`, { params: filters.value, responseType: 'blob' })
    const url = window.URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tab.key}-challan-${filters.value.year}-${filters.value.month}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch { /* silently ignore */ }
}

function getRecords(): ReportRecord[] {
  if (!reportData.value) return []
  if (Array.isArray(reportData.value)) return reportData.value
  return reportData.value.records ?? []
}

function getTotals(): Record<string, number> {
  if (!reportData.value || Array.isArray(reportData.value)) return {}
  return reportData.value.totals ?? {}
}

watch([activeTab, filters], fetchData, { deep: true, immediate: true })
</script>

<template>
  <div class="stat-page">
    <header class="stat-header">
      <div>
        <div class="stat-eyebrow">Payroll · Statutory</div>
        <h1 class="stat-title">Statutory Compliance</h1>
        <p class="stat-sub">PF, ESI, Professional Tax, and TDS reports for the selected period.</p>
      </div>
      <button class="stat-btn stat-btn-primary" @click="download">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
        Download
      </button>
    </header>

    <!-- Filter -->
    <div class="stat-card stat-card-pad">
      <div class="stat-filters">
        <div class="stat-field">
          <label class="stat-label">Month</label>
          <select v-model.number="filters.month" class="stat-input">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div class="stat-field">
          <label class="stat-label">Year</label>
          <select v-model.number="filters.year" class="stat-input">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Summary cards -->
    <div v-if="summary" class="stat-summary-grid">
      <div class="stat-kpi">
        <div class="stat-kpi-label">PF Contribution</div>
        <div class="stat-kpi-value">${{ summary.total_pf?.toLocaleString() ?? '—' }}</div>
      </div>
      <div class="stat-kpi">
        <div class="stat-kpi-label">ESI Contribution</div>
        <div class="stat-kpi-value accent">${{ summary.total_esi?.toLocaleString() ?? '—' }}</div>
      </div>
      <div class="stat-kpi">
        <div class="stat-kpi-label">Professional Tax</div>
        <div class="stat-kpi-value yellow">${{ summary.total_pt?.toLocaleString() ?? '—' }}</div>
      </div>
      <div class="stat-kpi">
        <div class="stat-kpi-label">TDS Deducted</div>
        <div class="stat-kpi-value purple">${{ summary.total_tds?.toLocaleString() ?? '—' }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="stat-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="stat-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="stat-loader">
      <div class="stat-spinner" />
    </div>

    <!-- PF Challan -->
    <div v-else-if="activeTab === 'pf'" class="stat-card stat-card-flush">
      <table class="stat-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>UAN</th>
            <th class="num">Basic Wages</th>
            <th class="num">Employee PF</th>
            <th class="num">Employer PF</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in getRecords()" :key="row.employee_id">
            <td class="strong">{{ row.employee_name }}</td>
            <td class="muted mono">{{ row.uan ?? '—' }}</td>
            <td class="num mono">${{ row.basic_wages?.toLocaleString() }}</td>
            <td class="num mono">${{ row.employee_pf?.toLocaleString() }}</td>
            <td class="num mono">${{ row.employer_pf?.toLocaleString() }}</td>
            <td class="num mono strong">${{ row.total_pf?.toLocaleString() }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">Total</td>
            <td class="num mono">${{ getTotals().basic_wages?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().employee_pf?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().employer_pf?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().total_pf?.toLocaleString() ?? '—' }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ESI Challan -->
    <div v-else-if="activeTab === 'esi'" class="stat-card stat-card-flush">
      <table class="stat-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>ESIC No</th>
            <th class="num">Gross Wages</th>
            <th class="num">Employee ESI</th>
            <th class="num">Employer ESI</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in getRecords()" :key="row.employee_id">
            <td class="strong">{{ row.employee_name }}</td>
            <td class="muted mono">{{ row.esic_no ?? '—' }}</td>
            <td class="num mono">${{ row.gross_wages?.toLocaleString() }}</td>
            <td class="num mono">${{ row.employee_esi?.toLocaleString() }}</td>
            <td class="num mono">${{ row.employer_esi?.toLocaleString() }}</td>
            <td class="num mono strong">${{ row.total_esi?.toLocaleString() }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">Total</td>
            <td class="num mono">${{ getTotals().gross_wages?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().employee_esi?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().employer_esi?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().total_esi?.toLocaleString() ?? '—' }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- PT Report -->
    <div v-else-if="activeTab === 'pt'" class="stat-card stat-card-flush">
      <table class="stat-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>State</th>
            <th class="num">Gross Salary</th>
            <th class="num">PT Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in getRecords()" :key="row.employee_id">
            <td class="strong">{{ row.employee_name }}</td>
            <td class="muted">{{ row.state ?? '—' }}</td>
            <td class="num mono">${{ row.gross_salary?.toLocaleString() }}</td>
            <td class="num mono yellow">${{ row.pt_amount?.toLocaleString() }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">Total</td>
            <td class="num mono">${{ getTotals().gross_salary?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().pt_amount?.toLocaleString() ?? '—' }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- TDS Report -->
    <div v-else-if="activeTab === 'tds'" class="stat-card stat-card-flush">
      <table class="stat-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>PAN</th>
            <th class="num">Taxable Income</th>
            <th class="num">TDS Deducted</th>
            <th class="num">Surcharge</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in getRecords()" :key="row.employee_id">
            <td class="strong">{{ row.employee_name }}</td>
            <td class="muted mono">{{ row.pan ?? '—' }}</td>
            <td class="num mono">${{ row.taxable_income?.toLocaleString() }}</td>
            <td class="num mono">${{ row.tds_deducted?.toLocaleString() }}</td>
            <td class="num mono">${{ row.surcharge?.toLocaleString() }}</td>
            <td class="num mono strong">${{ row.total_tax?.toLocaleString() }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">Total</td>
            <td class="num mono">${{ getTotals().taxable_income?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().tds_deducted?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().surcharge?.toLocaleString() ?? '—' }}</td>
            <td class="num mono">${{ getTotals().total_tax?.toLocaleString() ?? '—' }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-if="!loading && !reportData" class="stat-card stat-empty">
      No statutory data available for the selected period.
    </div>
  </div>
</template>

<style scoped>
.stat-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #EEF0F4;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.stat-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.stat-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.stat-title {
  margin: 4px 0 0;
  font-family: 'Instrument Serif', serif;
  font-weight: 400;
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #EEF0F4;
}
.stat-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #7A8299;
  max-width: 560px;
}

.stat-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 120ms ease;
}
.stat-btn-primary {
  background: #6B5BFF;
  color: #fff;
  border-color: #6B5BFF;
}
.stat-btn-primary:hover {
  background: #7A6CFF;
}

.stat-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
}
.stat-card-pad { padding: 16px; }
.stat-card-flush { overflow: hidden; }

.stat-filters {
  display: flex;
  gap: 16px;
}
.stat-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.stat-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7A8299;
}
.stat-input {
  background: #0D0F17;
  border: 1px solid #232936;
  color: #EEF0F4;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 6px;
  outline: none;
  min-width: 160px;
  transition: border-color 120ms ease;
}
.stat-input:focus {
  border-color: #6B5BFF;
}

.stat-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 768px) {
  .stat-summary-grid { grid-template-columns: repeat(2, 1fr); }
}
.stat-kpi {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 14px;
}
.stat-kpi-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.stat-kpi-value {
  font-family: 'Instrument Serif', serif;
  font-size: 28px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}
.stat-kpi-value.accent { color: #6B5BFF; }
.stat-kpi-value.yellow { color: #F5A623; }
.stat-kpi-value.purple { color: #9B6EFF; }

.stat-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid #232936;
}
.stat-tab {
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 400;
  color: #7A8299;
  background: transparent;
  border: none;
  border-bottom: 1.5px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 120ms ease;
}
.stat-tab:hover { color: #EEF0F4; }
.stat-tab.active {
  color: #EEF0F4;
  font-weight: 500;
  border-bottom-color: #6B5BFF;
}

.stat-loader {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
.stat-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #232936;
  border-top-color: #6B5BFF;
  animation: stat-spin 800ms linear infinite;
}
@keyframes stat-spin {
  to { transform: rotate(360deg); }
}

.stat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.stat-table thead th {
  padding: 10px 14px;
  background: #1B202C;
  color: #7A8299;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
  border-bottom: 1px solid #232936;
}
.stat-table thead th.num {
  text-align: right;
}
.stat-table tbody td {
  padding: 11px 14px;
  border-bottom: 1px solid #232936;
  color: #EEF0F4;
  font-variant-numeric: tabular-nums;
}
.stat-table tbody tr:last-child td { border-bottom: none; }
.stat-table tbody tr:hover { background: rgba(107, 91, 255, 0.04); }
.stat-table tbody td.num { text-align: right; }
.stat-table tbody td.muted { color: #7A8299; }
.stat-table tbody td.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.stat-table tbody td.strong { font-weight: 600; color: #EEF0F4; }
.stat-table tbody td.yellow { color: #F5A623; }

.stat-table tfoot td {
  padding: 11px 14px;
  background: #1B202C;
  color: #EEF0F4;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border-top: 1px solid #232936;
}
.stat-table tfoot td.num { text-align: right; }
.stat-table tfoot td.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.stat-empty {
  padding: 48px;
  text-align: center;
  color: #7A8299;
  font-size: 13px;
}
</style>
