<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { leaveService, type CalendarEvent, type CalendarFilters, type MonthlySummary } from '@/services/leave'

const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear = ref(now.getFullYear())
const activeView = ref<'calendar' | 'summary'>('calendar')
const loading = ref(false)

const events = ref<CalendarEvent[]>([])
const filters = ref<CalendarFilters>({ departments: [], leave_types: [], employees: [] })
const summary = ref<MonthlySummary | null>(null)

const filterDepartment = ref('')
const filterLeaveType = ref(0)
const filterEmployee = ref(0)

const yearOptions = computed(() => {
  const y = now.getFullYear()
  return [y - 1, y, y + 1]
})

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
function monthName(m: number) { return monthNames[m - 1] }

const totalLeaveRequests = computed(() =>
  summary.value?.leave_statistics.reduce((sum, s) => sum + s.total_requests, 0) ?? 0
)
const totalLeaveDays = computed(() =>
  summary.value?.leave_statistics.reduce((sum, s) => sum + Number(s.total_days), 0) ?? 0
)

const calendarCells = computed(() => {
  const year = selectedYear.value
  const month = selectedMonth.value - 1
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const cells: Array<{
    day: number;
    currentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    dateStr: string;
    events: CalendarEvent[];
  }> = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, currentMonth: false, isToday: false, isWeekend: false, dateStr, events: [] })
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayOfWeek = new Date(year, month, d).getDay()
    const dayEvents = events.value.filter(e => {
      const eStart = e.start
      const eEnd = e.end
      return dateStr >= eStart && dateStr < eEnd
    })
    cells.push({
      day: d,
      currentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      dateStr,
      events: dayEvents,
    })
  }

  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, currentMonth: false, isToday: false, isWeekend: false, dateStr: '', events: [] })
    }
  }

  return cells
})

function eventTooltip(event: CalendarEvent): string {
  const props = event.extendedProps
  if (props.type === 'holiday') {
    return `${event.title} (${props.holiday_type || 'Holiday'})`
  }
  return `${props.employee || event.title} - ${props.leave_type || ''} (${props.days || ''} days)\n${props.reason || ''}`
}

async function loadFilters() {
  try {
    filters.value = await leaveService.getCalendarFilters()
  } catch (e) {
    console.error('Failed to load filters', e)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadEvents() {
  const year = selectedYear.value
  const month = selectedMonth.value
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = { start_date: startDate, end_date: endDate }
  if (filterDepartment.value) params.department = filterDepartment.value
  if (filterLeaveType.value) params.leave_type_id = filterLeaveType.value
  if (filterEmployee.value) params.employee_id = filterEmployee.value

  try {
    events.value = await leaveService.getCalendarEvents(params)
  } catch (e) {
    console.error('Failed to load calendar events', e)
  }
}

async function loadSummary() {
  try {
    summary.value = await leaveService.getMonthlySummary(selectedYear.value, selectedMonth.value)
  } catch (e) {
    console.error('Failed to load summary', e)
  }
}

async function loadData() {
  loading.value = true
  try {
    await Promise.all([loadEvents(), loadSummary()])
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await loadFilters()
    await Promise.all([loadEvents(), loadSummary()])
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="lc-page">
    <!-- Header -->
    <div class="lc-header">
      <div>
        <h1 class="lc-title">Leave Calendar</h1>
        <p class="lc-subtitle">View team leaves, holidays, and monthly summary.</p>
      </div>
      <div class="lc-view-toggle">
        <button :class="['lc-toggle-btn', activeView === 'calendar' ? 'lc-toggle-active' : '']" @click="activeView = 'calendar'">Calendar</button>
        <button :class="['lc-toggle-btn', activeView === 'summary' ? 'lc-toggle-active' : '']" @click="activeView = 'summary'">Summary</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="lc-filter-bar">
      <div class="lc-filter-field">
        <label class="lc-filter-label">Month</label>
        <select v-model.number="selectedMonth" class="lc-select" @change="loadData">
          <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
        </select>
      </div>
      <div class="lc-filter-field">
        <label class="lc-filter-label">Year</label>
        <select v-model.number="selectedYear" class="lc-select" @change="loadData">
          <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div v-if="filters.departments.length > 0" class="lc-filter-field">
        <label class="lc-filter-label">Department</label>
        <select v-model="filterDepartment" class="lc-select" @change="loadEvents">
          <option value="">All Departments</option>
          <option v-for="d in filters.departments" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>
      <div v-if="filters.leave_types.length > 0" class="lc-filter-field">
        <label class="lc-filter-label">Leave Type</label>
        <select v-model="filterLeaveType" class="lc-select" @change="loadEvents">
          <option :value="0">All Types</option>
          <option v-for="lt in filters.leave_types" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
        </select>
      </div>
      <div v-if="filters.employees.length > 0" class="lc-filter-field">
        <label class="lc-filter-label">Employee</label>
        <select v-model="filterEmployee" class="lc-select" @change="loadEvents">
          <option :value="0">All Employees</option>
          <option v-for="e in filters.employees" :key="e.id" :value="e.id">{{ e.name }}</option>
        </select>
      </div>
    </div>

    <!-- Calendar View -->
    <div v-if="activeView === 'calendar'" class="lc-card">
      <div v-if="loading" class="lc-loading">
        <div v-for="i in 5" :key="i" class="lc-skeleton"></div>
      </div>
      <div v-else class="lc-cal-wrap">
        <div class="lc-cal-grid">
          <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="lc-cal-dayname">{{ day }}</div>
          <div
            v-for="(cell, idx) in calendarCells"
            :key="idx"
            :class="['lc-cal-cell', !cell.currentMonth ? 'lc-dim' : '', cell.isToday ? 'lc-today' : '', cell.isWeekend ? 'lc-weekend' : '']"
          >
            <div class="lc-cell-day">{{ cell.day }}</div>
            <div class="lc-cell-events">
              <div
                v-for="event in cell.events"
                :key="event.id"
                class="lc-event-pill"
                :style="{ backgroundColor: event.backgroundColor }"
                :title="eventTooltip(event)"
              >
                {{ event.title }}
              </div>
            </div>
          </div>
        </div>
        <!-- Legend -->
        <div class="lc-legend">
          <div class="lc-legend-item"><span class="lc-legend-dot" style="background:#F38288"></span>Holiday</div>
          <div class="lc-legend-item"><span class="lc-legend-dot" style="background:#7ED7FF"></span>Annual Leave</div>
          <div class="lc-legend-item"><span class="lc-legend-dot" style="background:#F5A623"></span>Casual Leave</div>
          <div class="lc-legend-item"><span class="lc-legend-dot" style="background:#4DD39A"></span>Other</div>
          <div class="lc-legend-item"><span class="lc-legend-dot lc-legend-today"></span>Today</div>
        </div>
      </div>
    </div>

    <!-- Summary View -->
    <div v-if="activeView === 'summary'" class="lc-summary">
      <div v-if="loading" class="lc-card lc-loading">
        <div v-for="i in 4" :key="i" class="lc-skeleton"></div>
      </div>
      <template v-else-if="summary">
        <div class="lc-stat-grid">
          <div class="lc-stat-card">
            <div class="lc-stat-label">Working Days</div>
            <div class="lc-stat-value">{{ summary.working_days }}</div>
            <div class="lc-stat-sub">{{ monthName(summary.month) }} {{ summary.year }}</div>
          </div>
          <div class="lc-stat-card">
            <div class="lc-stat-label">Total Leave Requests</div>
            <div class="lc-stat-value lc-blue">{{ totalLeaveRequests }}</div>
          </div>
          <div class="lc-stat-card">
            <div class="lc-stat-label">Total Leave Days</div>
            <div class="lc-stat-value lc-orange">{{ totalLeaveDays }}</div>
          </div>
        </div>

        <div class="lc-section-card">
          <div class="lc-section-head">Leave by Type</div>
          <table class="lc-table">
            <thead>
              <tr>
                <th class="lc-th">Leave Type</th>
                <th class="lc-th">Code</th>
                <th class="lc-th lc-th-right">Requests</th>
                <th class="lc-th lc-th-right">Total Days</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in summary.leave_statistics" :key="stat.leave_code" class="lc-row">
                <td class="lc-td lc-td-name">{{ stat.leave_type }}</td>
                <td class="lc-td lc-mono">{{ stat.leave_code }}</td>
                <td class="lc-td lc-td-right">{{ stat.total_requests }}</td>
                <td class="lc-td lc-td-right">{{ stat.total_days }}</td>
              </tr>
              <tr v-if="summary.leave_statistics.length === 0">
                <td colspan="4" class="lc-td-empty">No leave data for this month.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="lc-section-card">
          <div class="lc-section-head">Leave by Department</div>
          <table class="lc-table">
            <thead>
              <tr>
                <th class="lc-th">Department</th>
                <th class="lc-th lc-th-right">Requests</th>
                <th class="lc-th lc-th-right">Total Days</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in summary.department_statistics" :key="stat.department" class="lc-row">
                <td class="lc-td lc-td-name">{{ stat.department }}</td>
                <td class="lc-td lc-td-right">{{ stat.total_requests }}</td>
                <td class="lc-td lc-td-right">{{ stat.total_days }}</td>
              </tr>
              <tr v-if="summary.department_statistics.length === 0">
                <td colspan="3" class="lc-td-empty">No department data for this month.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.lc-page { display: flex; flex-direction: column; gap: 16px; }
.lc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.lc-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0; }
.lc-subtitle { font-size: 13px; color: #7A8299; margin: 4px 0 0; }
.lc-view-toggle { display: flex; gap: 4px; background: #161A23; border: 1px solid #232936; border-radius: 8px; padding: 4px; }
.lc-toggle-btn { background: none; border: none; color: #7A8299; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
.lc-toggle-active { background: #6B5BFF; color: #fff; }
.lc-filter-bar { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.lc-filter-field { display: flex; flex-direction: column; gap: 4px; }
.lc-filter-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.lc-select { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; cursor: pointer; }
.lc-select:focus { border-color: #6B5BFF; }
.lc-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.lc-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.lc-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: lc-pulse 1.2s ease-in-out infinite; }
@keyframes lc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.lc-cal-wrap { padding: 16px; }
.lc-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #232936; border-radius: 8px; overflow: hidden; }
.lc-cal-dayname { background: #11141C; padding: 8px 4px; text-align: center; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; }
.lc-cal-cell { background: #161A23; min-height: 90px; padding: 6px; display: flex; flex-direction: column; gap: 2px; }
.lc-dim { opacity: 0.35; }
.lc-today { outline: 2px solid #6B5BFF; outline-offset: -2px; }
.lc-weekend { background: #13161F; }
.lc-cell-day { font-size: 11px; font-weight: 500; color: #7A8299; margin-bottom: 2px; }
.lc-cell-events { display: flex; flex-direction: column; gap: 2px; }
.lc-event-pill { border-radius: 3px; padding: 1px 5px; font-size: 10px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.lc-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 12px; }
.lc-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #7A8299; }
.lc-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.lc-legend-today { background: transparent; outline: 2px solid #6B5BFF; }
.lc-summary { display: flex; flex-direction: column; gap: 14px; }
.lc-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.lc-stat-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; }
.lc-stat-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; }
.lc-stat-value { font-family: 'Instrument Serif', serif; font-size: 28px; color: #EEF0F4; letter-spacing: -0.02em; margin-top: 4px; }
.lc-stat-sub { font-size: 11px; color: #7A8299; margin-top: 2px; }
.lc-blue { color: #7ED7FF; }
.lc-orange { color: #F5A623; }
.lc-section-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.lc-section-head { padding: 12px 16px; border-bottom: 1px solid #232936; font-size: 12px; font-weight: 600; color: #EEF0F4; text-transform: uppercase; letter-spacing: 0.06em; }
.lc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lc-th { padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.lc-th-right { text-align: right; }
.lc-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.lc-row:last-child { border-bottom: none; }
.lc-row:hover { background: rgba(255,255,255,0.02); }
.lc-td { padding: 10px 14px; color: #B6BED0; vertical-align: middle; }
.lc-td-name { color: #EEF0F4; font-weight: 500; }
.lc-td-right { text-align: right; }
.lc-td-empty { padding: 24px 14px; text-align: center; color: #7A8299; font-size: 13px; }
.lc-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #8A7BFF; }
</style>
