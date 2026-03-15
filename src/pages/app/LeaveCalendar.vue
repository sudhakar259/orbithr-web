<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Leave Calendar</h1>
        <p class="text-slate-600">View team leaves, holidays, and monthly summary.</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="activeView = 'calendar'" :class="[activeView === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700', 'px-3 py-2 rounded-md text-sm font-medium border']">Calendar</button>
        <button @click="activeView = 'summary'" :class="[activeView === 'summary' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700', 'px-3 py-2 rounded-md text-sm font-medium border']">Summary</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div class="flex flex-wrap items-end gap-4">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Month</label>
          <select v-model.number="selectedMonth" class="rounded-md border-slate-300 shadow-sm text-sm" @change="loadData">
            <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Year</label>
          <select v-model.number="selectedYear" class="rounded-md border-slate-300 shadow-sm text-sm" @change="loadData">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <div v-if="filters.departments.length > 0">
          <label class="block text-xs font-medium text-slate-600 mb-1">Department</label>
          <select v-model="filterDepartment" class="rounded-md border-slate-300 shadow-sm text-sm" @change="loadEvents">
            <option value="">All Departments</option>
            <option v-for="d in filters.departments" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div v-if="filters.leave_types.length > 0">
          <label class="block text-xs font-medium text-slate-600 mb-1">Leave Type</label>
          <select v-model="filterLeaveType" class="rounded-md border-slate-300 shadow-sm text-sm" @change="loadEvents">
            <option :value="0">All Types</option>
            <option v-for="lt in filters.leave_types" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
          </select>
        </div>
        <div v-if="filters.employees.length > 0">
          <label class="block text-xs font-medium text-slate-600 mb-1">Employee</label>
          <select v-model="filterEmployee" class="rounded-md border-slate-300 shadow-sm text-sm" @change="loadEvents">
            <option :value="0">All Employees</option>
            <option v-for="e in filters.employees" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Calendar View -->
    <div v-if="activeView === 'calendar'" class="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      <div v-else class="p-4">
        <!-- Calendar Grid -->
        <div class="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden">
          <!-- Day Headers -->
          <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="bg-slate-50 px-2 py-2 text-center text-xs font-semibold text-slate-600">
            {{ day }}
          </div>
          <!-- Calendar Days -->
          <div
            v-for="(cell, idx) in calendarCells"
            :key="idx"
            :class="[
              'bg-white min-h-[100px] p-1',
              !cell.currentMonth ? 'opacity-40' : '',
              cell.isToday ? 'ring-2 ring-blue-500 ring-inset' : '',
              cell.isWeekend ? 'bg-slate-50' : '',
            ]"
          >
            <div class="text-xs font-medium text-slate-600 mb-1">{{ cell.day }}</div>
            <div class="space-y-0.5">
              <div
                v-for="event in cell.events"
                :key="event.id"
                :style="{ backgroundColor: event.backgroundColor }"
                class="rounded px-1 py-0.5 text-[10px] text-white truncate cursor-pointer"
                :title="eventTooltip(event)"
              >
                {{ event.title }}
              </div>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 rounded bg-red-500"></div>
            <span>Holiday</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 rounded bg-blue-500"></div>
            <span>Annual Leave</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 rounded bg-orange-400"></div>
            <span>Casual Leave</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 rounded bg-emerald-500"></div>
            <span>Other</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 rounded ring-2 ring-blue-500"></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary View -->
    <div v-if="activeView === 'summary'" class="space-y-6">
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      <template v-else-if="summary">
        <!-- Overview Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <p class="text-sm text-slate-500">Working Days</p>
            <p class="text-2xl font-bold text-slate-900">{{ summary.working_days }}</p>
            <p class="text-xs text-slate-400">{{ monthName(summary.month) }} {{ summary.year }}</p>
          </div>
          <div class="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <p class="text-sm text-slate-500">Total Leave Requests</p>
            <p class="text-2xl font-bold text-slate-900">{{ totalLeaveRequests }}</p>
          </div>
          <div class="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
            <p class="text-sm text-slate-500">Total Leave Days</p>
            <p class="text-2xl font-bold text-slate-900">{{ totalLeaveDays }}</p>
          </div>
        </div>

        <!-- Leave Statistics by Type -->
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div class="px-4 py-3 border-b border-slate-200">
            <h3 class="text-sm font-semibold text-slate-800">Leave by Type</h3>
          </div>
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Leave Type</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Code</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Requests</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Total Days</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="stat in summary.leave_statistics" :key="stat.leave_code" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-sm font-medium text-slate-800">{{ stat.leave_type }}</td>
                <td class="px-4 py-3 text-sm text-slate-600">{{ stat.leave_code }}</td>
                <td class="px-4 py-3 text-sm text-slate-600">{{ stat.total_requests }}</td>
                <td class="px-4 py-3 text-sm text-slate-600">{{ stat.total_days }}</td>
              </tr>
              <tr v-if="summary.leave_statistics.length === 0">
                <td colspan="4" class="px-4 py-6 text-center text-sm text-slate-500">No leave data for this month.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Department Statistics -->
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div class="px-4 py-3 border-b border-slate-200">
            <h3 class="text-sm font-semibold text-slate-800">Leave by Department</h3>
          </div>
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Department</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Requests</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Total Days</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="stat in summary.department_statistics" :key="stat.department" class="hover:bg-slate-50">
                <td class="px-4 py-3 text-sm font-medium text-slate-800">{{ stat.department }}</td>
                <td class="px-4 py-3 text-sm text-slate-600">{{ stat.total_requests }}</td>
                <td class="px-4 py-3 text-sm text-slate-600">{{ stat.total_days }}</td>
              </tr>
              <tr v-if="summary.department_statistics.length === 0">
                <td colspan="3" class="px-4 py-6 text-center text-sm text-slate-500">No department data for this month.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

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

// Calendar grid computation
const calendarCells = computed(() => {
  const year = selectedYear.value
  const month = selectedMonth.value - 1 // JS months are 0-indexed
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

  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, currentMonth: false, isToday: false, isWeekend: false, dateStr, events: [] })
  }

  // Current month days
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

  // Next month padding (fill to complete last row)
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

async function loadEvents() {
  const year = selectedYear.value
  const month = selectedMonth.value
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

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
