<script setup lang="ts">
defineOptions({ name: 'ReportsAttendance' })
import { ref, computed, onMounted } from 'vue'
import {
  reportService,
  type AttendanceReportRow,
  type ReportFilter,
} from '@/services/reportService'

const loading = ref(false)
const error = ref('')
const rows = ref<AttendanceReportRow[]>([])
const filters = ref<ReportFilter>({ start_date: '', end_date: '' })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await reportService.getAttendanceReport(filters.value)
    rows.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const totalEmployees = computed(() => rows.value.length)
const avgRate = computed(() =>
  rows.value.length
    ? (rows.value.reduce((s, r) => s + r.attendance_rate, 0) / rows.value.length).toFixed(1)
    : '0',
)

const exportCsv = () => {
  if (!rows.value.length) return
  const headers = ['Employee', 'Department', 'Total Days', 'Present', 'Absent', 'Late', 'On Leave', 'Rate %']
  const csvRows = rows.value.map((r) => [r.name, r.department, r.total_days, r.present, r.absent, r.late, r.on_leave, r.attendance_rate])
  const csv = [headers, ...csvRows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'attendance-report.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<template>
  <div class="ar-page">
    <!-- Filters -->
    <div class="ar-filter-bar">
      <div class="ar-filter-field">
        <label class="ar-filter-label">Start Date</label>
        <input v-model="filters.start_date" type="date" class="ar-input" />
      </div>
      <div class="ar-filter-field">
        <label class="ar-filter-label">End Date</label>
        <input v-model="filters.end_date" type="date" class="ar-input" />
      </div>
      <button class="ar-btn-primary" @click="load">Apply</button>
      <button class="ar-btn-ghost ar-ml-auto" @click="exportCsv">Export CSV</button>
    </div>

    <!-- Stats -->
    <div class="ar-stats">
      <div class="ar-stat-card">
        <div class="ar-stat-label">Total Employees</div>
        <div class="ar-stat-value">{{ totalEmployees }}</div>
      </div>
      <div class="ar-stat-card">
        <div class="ar-stat-label">Avg Attendance Rate</div>
        <div class="ar-stat-value ar-green">{{ avgRate }}%</div>
      </div>
    </div>

    <div v-if="error" class="ar-error">{{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="ar-card ar-loading">
      <div v-for="i in 5" :key="i" class="ar-skeleton"></div>
    </div>

    <!-- Table -->
    <div v-else-if="rows.length" class="ar-card">
      <table class="ar-table">
        <thead>
          <tr>
            <th class="ar-th">Employee</th>
            <th class="ar-th">Department</th>
            <th class="ar-th ar-th-right">Present</th>
            <th class="ar-th ar-th-right">Absent</th>
            <th class="ar-th ar-th-right">Late</th>
            <th class="ar-th ar-th-right">On Leave</th>
            <th class="ar-th ar-th-right">Rate %</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.employee_id" class="ar-row">
            <td class="ar-td ar-td-name">{{ row.name }}</td>
            <td class="ar-td">{{ row.department }}</td>
            <td class="ar-td ar-td-right ar-green">{{ row.present }}</td>
            <td class="ar-td ar-td-right ar-red">{{ row.absent }}</td>
            <td class="ar-td ar-td-right ar-yellow">{{ row.late }}</td>
            <td class="ar-td ar-td-right ar-blue">{{ row.on_leave }}</td>
            <td class="ar-td ar-td-right">
              <span :class="['ar-rate', row.attendance_rate >= 90 ? 'ar-green' : row.attendance_rate >= 75 ? 'ar-yellow' : 'ar-red']">
                {{ row.attendance_rate }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="ar-empty">No data. Apply filters and click Apply.</div>
  </div>
</template>

<style scoped>
.ar-page { display: flex; flex-direction: column; gap: 16px; }
.ar-filter-bar { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.ar-filter-field { display: flex; flex-direction: column; gap: 4px; }
.ar-filter-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.ar-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; }
.ar-input:focus { border-color: #6B5BFF; }
.ar-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 18px; font-size: 13px; font-weight: 500; cursor: pointer; }
.ar-btn-primary:hover { opacity: 0.88; }
.ar-btn-ghost { background: transparent; border: 1px solid #232936; color: #7A8299; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.ar-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.ar-ml-auto { margin-left: auto; }
.ar-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.ar-stat-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; }
.ar-stat-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; }
.ar-stat-value { font-family: 'Instrument Serif', serif; font-size: 28px; color: #EEF0F4; letter-spacing: -0.02em; margin-top: 4px; }
.ar-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.ar-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.ar-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.ar-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: ar-pulse 1.2s ease-in-out infinite; }
@keyframes ar-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ar-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ar-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.ar-th-right { text-align: right; }
.ar-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.ar-row:last-child { border-bottom: none; }
.ar-row:hover { background: rgba(255,255,255,0.02); }
.ar-td { padding: 11px 16px; color: #B6BED0; vertical-align: middle; }
.ar-td-name { color: #EEF0F4; font-weight: 500; }
.ar-td-right { text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.ar-rate { font-weight: 600; }
.ar-green { color: #4DD39A; }
.ar-red { color: #F38288; }
.ar-yellow { color: #F5A623; }
.ar-blue { color: #7ED7FF; }
.ar-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }
</style>
