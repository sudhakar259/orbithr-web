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
  <div class="rep">

    <!-- ── Page header ───────────────────────────────────────────── -->
    <div class="rep-head">
      <div>
        <div class="eyebrow">People analytics · refreshed live</div>
        <h1 class="rep-title">Reports</h1>
        <p class="rep-sub">Slice headcount, attrition, comp and DEI across teams, geographies and time.</p>
      </div>
      <div class="rep-actions">
        <button class="btn">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/></svg>
          Last 12 mo
        </button>
        <button class="btn" :disabled="exporting" @click="exportReport">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          {{ exporting ? 'Exporting…' : 'Export' }}
        </button>
        <button class="btn btn--accent">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          New report
        </button>
      </div>
    </div>

    <!-- ── Tabs ──────────────────────────────────────────────────── -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ 'tab--active': activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ── Filter Bar ────────────────────────────────────────────── -->
    <div class="filter-bar">
      <div class="filter-cell">
        <label class="filter-label">Month</label>
        <select v-model.number="filters.month" class="filter-input">
          <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>
      <div class="filter-cell">
        <label class="filter-label">Year</label>
        <select v-model.number="filters.year" class="filter-input">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div class="filter-cell">
        <label class="filter-label">Department</label>
        <input
          v-model="filters.department"
          type="text"
          placeholder="All departments"
          class="filter-input"
        />
      </div>
    </div>

    <!-- ── Error ─────────────────────────────────────────────────── -->
    <div v-if="error" class="alert alert--err">{{ error }}</div>

    <!-- ── Loading ───────────────────────────────────────────────── -->
    <div v-if="loading" class="state">Loading report…</div>

    <!-- ── Report Content ───────────────────────────────────────── -->
    <template v-else-if="reportData">

      <!-- ── ATTENDANCE ─────────────────────────────────────────── -->
      <div v-if="activeTab === 'attendance'" class="content">
        <div class="kpi-strip">
          <div class="kpi">
            <div class="eyebrow">Total Employees</div>
            <div class="kpi-val">{{ reportData.total_employees ?? '—' }}</div>
            <div class="kpi-sub">Workforce</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Avg Attendance</div>
            <div class="kpi-val kpi-val--green">{{ reportData.avg_attendance_percentage ?? '—' }}%</div>
            <div class="kpi-sub">Period average</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Absent Days</div>
            <div class="kpi-val kpi-val--red">{{ reportData.total_absent_days ?? '—' }}</div>
            <div class="kpi-sub">Total in period</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Late Arrivals</div>
            <div class="kpi-val kpi-val--yellow">{{ reportData.total_late_arrivals ?? '—' }}</div>
            <div class="kpi-sub">Across all staff</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="eyebrow">Attendance breakdown</div>
              <div class="card-title">Per-employee detail</div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in (reportData.records ?? [])" :key="row.employee_id">
                  <td class="td-strong">{{ row.employee_name }}</td>
                  <td>{{ row.department ?? '-' }}</td>
                  <td class="td-green">{{ row.present_days }}</td>
                  <td class="td-red">{{ row.absent_days }}</td>
                  <td class="td-yellow">{{ row.late_arrivals }}</td>
                  <td>
                    <div class="bar-row">
                      <div class="bar-track">
                        <div class="bar-fill bar-fill--green" :style="{ width: (row.attendance_percentage ?? 0) + '%' }" />
                      </div>
                      <span class="bar-val">{{ row.attendance_percentage ?? 0 }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── PAYROLL ────────────────────────────────────────────── -->
      <div v-if="activeTab === 'payroll'" class="content">
        <div class="kpi-strip">
          <div class="kpi">
            <div class="eyebrow">Total Gross</div>
            <div class="kpi-val">${{ reportData.total_gross?.toLocaleString() ?? '—' }}</div>
            <div class="kpi-sub">Pre-deductions</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Total Deductions</div>
            <div class="kpi-val kpi-val--red">${{ reportData.total_deductions?.toLocaleString() ?? '—' }}</div>
            <div class="kpi-sub">Tax · PF · ESI</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Total Net Pay</div>
            <div class="kpi-val kpi-val--green">${{ reportData.total_net?.toLocaleString() ?? '—' }}</div>
            <div class="kpi-sub">Disbursed</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Employees Paid</div>
            <div class="kpi-val kpi-val--purple">{{ reportData.employees_paid ?? '—' }}</div>
            <div class="kpi-sub">In this cycle</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="eyebrow">Payroll detail</div>
              <div class="card-title">Per-employee disbursement</div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in (reportData.records ?? [])" :key="row.employee_id">
                  <td class="td-strong">{{ row.employee_name }}</td>
                  <td>{{ row.department ?? '-' }}</td>
                  <td class="td-mono">${{ row.gross?.toLocaleString() }}</td>
                  <td class="td-red td-mono">${{ row.deductions?.toLocaleString() }}</td>
                  <td class="td-green td-mono">${{ row.net_pay?.toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── HEADCOUNT ──────────────────────────────────────────── -->
      <div v-if="activeTab === 'headcount'" class="content">
        <div class="kpi-strip">
          <div class="kpi">
            <div class="eyebrow">Total Headcount</div>
            <div class="kpi-val">{{ reportData.total_headcount ?? '—' }}</div>
            <div class="kpi-sub">Active employees</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">New Hires</div>
            <div class="kpi-val kpi-val--green">{{ reportData.new_hires ?? '—' }}</div>
            <div class="kpi-sub">In period</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Exits</div>
            <div class="kpi-val kpi-val--red">{{ reportData.exits ?? '—' }}</div>
            <div class="kpi-sub">In period</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Net Change</div>
            <div
              class="kpi-val"
              :class="(reportData.net_change ?? 0) >= 0 ? 'kpi-val--green' : 'kpi-val--red'"
            >
              {{ (reportData.net_change ?? 0) >= 0 ? '+' : '' }}{{ reportData.net_change ?? '—' }}
            </div>
            <div class="kpi-sub">YoY trend</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="eyebrow">Headcount by department</div>
              <div class="card-title">Net movement</div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Current</th>
                  <th>New Hires</th>
                  <th>Exits</th>
                  <th>Net Change</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in (reportData.records ?? [])" :key="row.department">
                  <td class="td-strong">{{ row.department }}</td>
                  <td class="td-mono">{{ row.current_count }}</td>
                  <td class="td-green td-mono">+{{ row.new_hires }}</td>
                  <td class="td-red td-mono">-{{ row.exits }}</td>
                  <td class="td-mono" :class="row.net_change >= 0 ? 'td-green' : 'td-red'">
                    {{ row.net_change >= 0 ? '+' : '' }}{{ row.net_change }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── ATTRITION ──────────────────────────────────────────── -->
      <div v-if="activeTab === 'attrition'" class="content">
        <div class="kpi-strip">
          <div class="kpi">
            <div class="eyebrow">Attrition Rate</div>
            <div class="kpi-val kpi-val--red">{{ reportData.attrition_rate ?? '—' }}%</div>
            <div class="kpi-sub">Trailing period</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Voluntary Exits</div>
            <div class="kpi-val kpi-val--yellow">{{ reportData.voluntary_exits ?? '—' }}</div>
            <div class="kpi-sub">Resignations</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Involuntary Exits</div>
            <div class="kpi-val kpi-val--red">{{ reportData.involuntary_exits ?? '—' }}</div>
            <div class="kpi-sub">Terminations</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Avg Tenure (mo)</div>
            <div class="kpi-val kpi-val--purple">{{ reportData.avg_tenure_months ?? '—' }}</div>
            <div class="kpi-sub">Across staff</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="eyebrow">Attrition by department</div>
              <div class="card-title">Top reasons</div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Exits</th>
                  <th>Attrition Rate</th>
                  <th>Top Reason</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in (reportData.records ?? [])" :key="row.department">
                  <td class="td-strong">{{ row.department }}</td>
                  <td class="td-mono">{{ row.exit_count }}</td>
                  <td>
                    <div class="bar-row">
                      <div class="bar-track">
                        <div class="bar-fill bar-fill--red" :style="{ width: Math.min(row.attrition_rate ?? 0, 100) + '%' }" />
                      </div>
                      <span class="bar-val">{{ row.attrition_rate }}%</span>
                    </div>
                  </td>
                  <td>{{ row.top_reason ?? '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── PERFORMANCE ────────────────────────────────────────── -->
      <div v-if="activeTab === 'performance'" class="content">
        <div class="kpi-strip">
          <div class="kpi">
            <div class="eyebrow">Avg Rating</div>
            <div class="kpi-val">{{ reportData.avg_rating ?? '—' }} / 5</div>
            <div class="kpi-sub">Across reviews</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Reviews Completed</div>
            <div class="kpi-val kpi-val--green">{{ reportData.reviews_completed ?? '—' }}</div>
            <div class="kpi-sub">Cycle to date</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Reviews Pending</div>
            <div class="kpi-val kpi-val--yellow">{{ reportData.reviews_pending ?? '—' }}</div>
            <div class="kpi-sub">Awaiting input</div>
          </div>
          <div class="kpi">
            <div class="eyebrow">Top Performers</div>
            <div class="kpi-val kpi-val--purple">{{ reportData.top_performers_count ?? '—' }}</div>
            <div class="kpi-sub">≥ 4.5 rating</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="eyebrow">Performance review</div>
              <div class="card-title">Per-employee status</div>
            </div>
          </div>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Rating</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in (reportData.records ?? [])" :key="row.employee_id">
                  <td class="td-strong">{{ row.employee_name }}</td>
                  <td>{{ row.department ?? '-' }}</td>
                  <td>
                    <div class="bar-row">
                      <div class="bar-track">
                        <div class="bar-fill bar-fill--purple" :style="{ width: ((row.rating ?? 0) / 5) * 100 + '%' }" />
                      </div>
                      <span class="bar-val">{{ row.rating ?? '-' }}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      class="pill"
                      :class="row.status === 'completed' ? 'pill--green' : 'pill--yellow'"
                    >{{ row.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </template>

    <!-- ── Empty State ──────────────────────────────────────────── -->
    <div v-else-if="!loading && !error" class="state">
      No report data available for the selected filters.
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ───────────────────────────────────────────── */
.rep {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #EEF0F4;
  background: #0D0F17;
}

/* ── Page header ──────────────────────────────────────── */
.rep-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.rep-title {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: #EEF0F4;
  margin: 4px 0 6px;
}
.rep-sub {
  font-size: 13px;
  color: #7A8299;
  max-width: 640px;
  line-height: 1.5;
}
.rep-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Buttons ──────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  background: #161A23;
  border: 1px solid #232936;
  color: #A8AEC0;
  transition: all 0.13s;
}
.btn:hover { border-color: #3A4254; color: #EEF0F4; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn--accent {
  background: rgba(107, 91, 255, 0.15);
  border-color: rgba(107, 91, 255, 0.35);
  color: #8979FF;
}
.btn--accent:hover { background: rgba(107, 91, 255, 0.25); }

/* ── Tabs ─────────────────────────────────────────────── */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #232936;
  padding-bottom: 0;
}
.tab {
  padding: 10px 14px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #7A8299;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.13s, border-color 0.13s;
}
.tab:hover { color: #EEF0F4; }
.tab--active {
  color: #6B5BFF;
  border-bottom-color: #6B5BFF;
}

/* ── Filter Bar ───────────────────────────────────────── */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 14px 16px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
}
.filter-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.filter-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
}
.filter-input {
  background: #0D0F17;
  border: 1px solid #232936;
  color: #EEF0F4;
  font-size: 12.5px;
  padding: 7px 10px;
  border-radius: 6px;
  min-width: 140px;
  outline: none;
  transition: border-color 0.13s;
}
.filter-input:focus { border-color: #6B5BFF; }

/* ── Alerts / states ──────────────────────────────────── */
.alert {
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 12.5px;
}
.alert--err {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.35);
  color: #F38288;
}
.state {
  padding: 48px 16px;
  text-align: center;
  font-size: 13px;
  color: #7A8299;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
}

/* ── Content layout ───────────────────────────────────── */
.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── KPI strip ────────────────────────────────────────── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 900px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
}
.kpi {
  padding: 16px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}
.kpi-val {
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin-top: 6px;
  line-height: 1.05;
}
.kpi-val--green  { color: #4DD39A; }
.kpi-val--red    { color: #F38288; }
.kpi-val--yellow { color: #F5A623; }
.kpi-val--purple { color: #6B5BFF; }
.kpi-sub {
  font-size: 11px;
  color: #7A8299;
  margin-top: 4px;
}

/* ── Cards ────────────────────────────────────────────── */
.card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 18px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.card-title {
  font-family: 'Instrument Serif', serif;
  font-size: 18px;
  color: #EEF0F4;
  margin-top: 2px;
  letter-spacing: -0.01em;
}

/* ── Tables ───────────────────────────────────────────── */
.table-wrap {
  overflow-x: auto;
  margin: 0 -18px -18px;
  border-top: 1px solid #232936;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.tbl thead th {
  text-align: left;
  padding: 10px 14px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
  background: #11141B;
  border-bottom: 1px solid #232936;
}
.tbl tbody tr {
  border-bottom: 1px solid #1B202B;
  transition: background 0.1s;
}
.tbl tbody tr:hover { background: rgba(107, 91, 255, 0.04); }
.tbl tbody tr:last-child { border-bottom: none; }
.tbl tbody td {
  padding: 12px 14px;
  color: #A8AEC0;
}
.td-strong { color: #EEF0F4; font-weight: 500; }
.td-green  { color: #4DD39A; }
.td-red    { color: #F38288; }
.td-yellow { color: #F5A623; }
.td-mono   { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

/* ── Bar (inline) ─────────────────────────────────────── */
.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar-track {
  width: 80px;
  height: 6px;
  background: #232936;
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}
.bar-fill { height: 100%; border-radius: 3px; }
.bar-fill--green  { background: #4DD39A; }
.bar-fill--red    { background: #F38288; }
.bar-fill--purple { background: #6B5BFF; }
.bar-val {
  font-size: 11px;
  color: #A8AEC0;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Pills / badges ───────────────────────────────────── */
.pill {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
}
.pill--green {
  background: rgba(77, 211, 154, 0.12);
  color: #4DD39A;
  border: 1px solid rgba(77, 211, 154, 0.28);
}
.pill--yellow {
  background: rgba(245, 166, 35, 0.12);
  color: #F5A623;
  border: 1px solid rgba(245, 166, 35, 0.28);
}
</style>
