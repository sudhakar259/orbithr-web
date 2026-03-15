<template>
  <div class="calendar">

    <!-- Day-of-week headers -->
    <div class="dow-row">
      <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day" class="dow-cell">
        {{ day }}
      </div>
    </div>

    <!-- Calendar Body -->
    <div class="cal-grid">
      <div
        v-for="day in calendarDays"
        :key="day.date"
        :class="[
          'cal-cell',
          day.bgColorClass,
          !day.isCurrentMonth && 'cal-cell--other',
          day.isToday && 'cal-cell--today',
          day.isLocked && 'cal-cell--locked',
        ]"
        @click="selectDate(day)"
      >
        <div class="cell-inner">

          <!-- Date number + lock/regularized icons -->
          <div class="cell-header">
            <span class="cell-day" :class="!day.isCurrentMonth && 'cell-day--other'">{{ day.day }}</span>
            <span v-if="day.isLocked" class="cell-badge cell-badge--lock" title="Attendance locked">🔒</span>
            <span v-else-if="day.attendance?.is_regularized" class="cell-badge cell-badge--reg" title="Regularized">⏰</span>
          </div>

          <!-- On Leave (overrides absent) -->
          <div v-if="day.isOnLeave" class="cell-body cell-body--center">
            <div class="status-label status-label--leave">On Leave</div>
            <div class="leave-type">{{ day.leaveTypeName }}</div>
          </div>

          <!-- Attendance record -->
          <div v-else-if="day.attendance" class="cell-body">
            <div :class="['status-badge', getStatusClass(day.attendance.status)]">
              {{ getStatusText(day.attendance.status) }}
            </div>

            <div class="punch-times">
              <div v-if="day.attendance.check_in" class="punch-row">
                <span>In</span><span>{{ formatTime(day.attendance.check_in) }}</span>
              </div>
              <div v-if="day.attendance.check_out" class="punch-row">
                <span>Out</span><span>{{ formatTime(day.attendance.check_out) }}</span>
              </div>
              <div v-if="day.attendance.working_hours > 0" class="punch-row punch-row--hrs">
                <span>Hrs</span><span>{{ day.attendance.working_hours }}</span>
              </div>
            </div>

            <template v-if="canRegularizeDay(day)">
              <button @click.stop="$emit('regularize', day.attendance)" class="reg-btn">
                Regularize
              </button>
              <div v-if="day.daysRemainingToRegularize > 0" class="days-left">
                {{ day.daysRemainingToRegularize }}d left
              </div>
            </template>
            <div v-else-if="day.attendance.status === 'absent' && day.isLocked" class="locked-note">
              Locked · EL deducted
            </div>
          </div>

          <!-- Other-month placeholder -->
          <div v-else-if="!day.isCurrentMonth" class="cell-body cell-body--center">
            <div class="cell-dot"></div>
          </div>

          <!-- Holiday -->
          <div v-else-if="day.holiday && day.holiday.length" class="cell-body cell-body--center">
            <div class="status-label status-label--holiday">Holiday</div>
            <div v-for="(h, idx) in day.holiday" :key="idx" class="holiday-name">{{ h.name }}</div>
          </div>

          <!-- Week Off -->
          <div v-else-if="day.isWeekOff" class="cell-body cell-body--center">
            <div class="status-label status-label--weekend">Week Off</div>
          </div>

          <!-- Empty working day -->
          <div v-else class="cell-body cell-body--center">
            <div class="cell-dot"></div>
          </div>

        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <h4 class="legend-title">Calendar Legend</h4>
      <div class="legend-items">
        <div class="legend-item"><div class="legend-swatch swatch--present"></div><span>Present</span></div>
        <div class="legend-item"><div class="legend-swatch swatch--absent"></div><span>Absent</span></div>
        <div class="legend-item"><div class="legend-swatch swatch--halfday"></div><span>Half Day</span></div>
        <div class="legend-item"><div class="legend-swatch swatch--weekend"></div><span>Weekend</span></div>
        <div class="legend-item"><div class="legend-swatch swatch--holiday"></div><span>Holiday</span></div>
        <div class="legend-item"><div class="legend-swatch swatch--late"></div><span>Late</span></div>
        <div class="legend-item"><div class="legend-swatch swatch--reg"></div><span>Regularized</span></div>
        <div class="legend-item"><div class="legend-swatch swatch--leave"></div><span>On Leave</span></div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import {
  isCompanyHoliday,
  isEmployeeWeekOff,
  isAttendanceLocked,
  getNextWorkingDay,
  countWorkingDays,
  EL_DEDUCTION_CONFIG,
  type Holiday
} from '@/utils/attendanceData'

interface Attendance {
  id: number
  attendance_date: string
  check_in: string | null
  check_out: string | null
  working_hours: number
  status: string
  is_regularized: boolean
}

interface LeaveRecord {
  start_date: string
  end_date: string
  leave_type_name: string
  days_requested: number
  leave_period?: string | null
}

interface CalendarDay {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  attendance?: Attendance
  isWeekOff: boolean
  holiday: Holiday[] | null
  isLocked: boolean
  isOnLeave: boolean
  leaveTypeName: string
  bgColorClass: string
  daysRemainingToRegularize: number
}

interface Props {
  currentDate: Date
  attendanceData: Attendance[]
  leaves?: LeaveRecord[]
  employeeId?: number
}

const props = withDefaults(defineProps<Props>(), {
  employeeId: 1,
  leaves: () => [],
})

const emit = defineEmits<{
  dateSelected: [date: Date]
  regularize: [attendance: Attendance | undefined]
  dayClicked: [attendance: Attendance | undefined]
}>()

const { hasPermission, roles, user } = useAuth()
const employeeId = computed(() => props.employeeId || user.value?.employee_id || 1)

const canRegularize = computed(() => {
  if (hasPermission('regularize attendance')) return true
  const roleNames = roles()
    .map(role => (typeof role === 'string' ? role : String(role?.name ?? role)))
    .map(role => role.toLowerCase())
  return roleNames.some(role => ['admin', 'hr_manager', 'manager'].includes(role))
})

const isDateOnLeave = (dateStr: string): LeaveRecord | null => {
  for (const leave of props.leaves) {
    if (dateStr >= leave.start_date && dateStr <= leave.end_date) return leave
  }
  return null
}

const normalizeDate = (dateString: string): string => {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return String(dateString).split('T')[0]
}

const calendarDays = computed(() => {
  const year = props.currentDate.getFullYear()
  const month = props.currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const days: CalendarDay[] = []
  const currentDate = new Date(startDate)

  for (let i = 0; i < 42; i++) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`
    let attendance = props.attendanceData.find(att => normalizeDate(att.attendance_date) === dateStr)

    const todayNorm = new Date(); todayNorm.setHours(0, 0, 0, 0)
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    dayDate.setHours(0, 0, 0, 0)

    if (attendance && attendance.status === 'absent' && dayDate >= todayNorm) {
      attendance = undefined as any
    }

    const holiday = isCompanyHoliday(currentDate)
    const isWeekOff = isEmployeeWeekOff(currentDate, employeeId.value)

    if (attendance && attendance.status === 'absent' && (isWeekOff || (holiday && holiday.length))) {
      attendance = undefined as any
    }

    const leaveRecord = isDateOnLeave(dateStr)
    const isOnLeave = !!leaveRecord
    const leaveTypeName = leaveRecord?.leave_type_name ?? ''

    const isLocked = attendance?.status === 'absent' && isAttendanceLocked(currentDate, employeeId.value)

    let daysRemainingToRegularize = 0
    if (attendance?.status === 'absent' && !isOnLeave) {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      start.setDate(start.getDate() + 1)
      start.setHours(0, 0, 0, 0)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const workingDaysPassed = countWorkingDays(start, today, employeeId.value)
      daysRemainingToRegularize = Math.max(0, EL_DEDUCTION_CONFIG.daysBeforeLock - workingDaysPassed)
    }

    // CSS class names (dark theme variants defined in <style scoped>)
    let bgColorClass = 'cell--default'
    if (!currentDate.toDateString().includes(String(new Date().getFullYear()))) {
      bgColorClass = 'cell--other-month'
    } else if (isOnLeave) {
      bgColorClass = 'cell--leave'
    } else if (holiday && holiday.length) {
      bgColorClass = 'cell--holiday'
    } else if (isWeekOff) {
      bgColorClass = 'cell--weekend'
    } else if (attendance && (attendance.is_regularized === true || String(attendance.is_regularized) === '1')) {
      bgColorClass = 'cell--regularized'
    } else if (attendance?.status === 'present') {
      bgColorClass = 'cell--present'
    } else if (attendance?.status === 'absent') {
      bgColorClass = 'cell--absent'
    } else if (attendance?.status === 'half_day') {
      bgColorClass = 'cell--halfday'
    }

    days.push({
      date: dateStr,
      day: currentDate.getDate(),
      isCurrentMonth: currentDate.getMonth() === month,
      isToday: currentDate.toDateString() === new Date().toDateString(),
      attendance,
      isWeekOff,
      holiday,
      isLocked,
      isOnLeave,
      leaveTypeName,
      daysRemainingToRegularize,
      bgColorClass,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
})

const canRegularizeDay = (day: CalendarDay): boolean => {
  if (!day.attendance || day.attendance.status !== 'absent') return false
  const isRegularizedFlag = day.attendance.is_regularized === true || String(day.attendance.is_regularized) === '1'
  if (isRegularizedFlag) return false
  if (day.isOnLeave || day?.holiday?.length || day.isWeekOff) return false

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [y, m, d] = day.date.split('-').map(n => parseInt(n, 10))
  const target = new Date(y, (m || 1) - 1, d || 1); target.setHours(0, 0, 0, 0)

  const nextWorking = getNextWorkingDay(target, employeeId.value); nextWorking.setHours(0, 0, 0, 0)
  if (today < nextWorking) return false

  const start = new Date(target); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0)
  const workingDaysPassed = countWorkingDays(start, today, employeeId.value)
  if (workingDaysPassed > EL_DEDUCTION_CONFIG.daysBeforeLock) return false
  if (day.isLocked && !canRegularize.value) return false

  return true
}

const getStatusClass = (status: string): string => {
  switch (status) {
    case 'present':     return 'status-badge--present'
    case 'absent':      return 'status-badge--absent'
    case 'half_day':    return 'status-badge--halfday'
    case 'late':        return 'status-badge--late'
    case 'early_leave': return 'status-badge--early-leave'
    case 'holiday':     return 'status-badge--holiday'
    case 'regularised':
    case 'regularized': return 'status-badge--regularised'
    default:            return 'status-badge--weekend'
  }
}

const getStatusText = (status: string): string => {
  switch (status) {
    case 'present':     return 'P'
    case 'absent':      return 'A'
    case 'half_day':    return 'HD'
    case 'late':        return 'L'
    case 'early_leave': return 'EL'
    case 'holiday':     return 'H'
    case 'weekend':     return 'W'
    case 'regularised':
    case 'regularized': return 'Reg'
    default:            return status.charAt(0).toUpperCase()
  }
}

const formatTime = (timeString: string): string => {
  if (!timeString) return ''
  const time = new Date(`1970-01-01T${timeString}`)
  return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const selectDate = (day: CalendarDay) => {
  emit('dateSelected', new Date(day.date))
  emit('dayClicked', day.attendance)
}
</script>

<style scoped>
/* ── shell ───────────────────────────────────────────────────────────────── */
.calendar {
  border: 1px solid var(--surface3);
  border-radius: 12px;
  overflow: hidden;
}

/* ── day-of-week header ──────────────────────────────────────────────────── */
.dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--surface2);
  border-bottom: 1px solid var(--surface3);
}
.dow-cell {
  padding: 10px 0;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .5px;
}

/* ── calendar grid ───────────────────────────────────────────────────────── */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--surface3);
}
.cal-cell {
  min-height: 120px;
  cursor: pointer;
  transition: filter .1s;
  position: relative;
}
.cal-cell:hover { filter: brightness(1.08); }
.cal-cell--today { outline: 2px solid var(--accent); outline-offset: -2px; }
.cal-cell--locked { opacity: .75; }
.cal-cell--other  { opacity: .5; }

/* cell background variants (dark) */
.cell--default      { background: var(--surface); }
.cell--other-month  { background: var(--bg); }
.cell--leave        { background: rgba(20,184,166,.10); }
.cell--holiday      { background: rgba(79,126,255,.10); }
.cell--weekend      { background: var(--surface2); }
.cell--regularized  { background: rgba(249,115,22,.10); outline: 1px solid rgba(249,115,22,.3); outline-offset: -1px; }
.cell--present      { background: rgba(54,211,153,.08); }
.cell--absent       { background: rgba(255,107,107,.08); }
.cell--halfday      { background: rgba(249,168,37,.08); }

.cell-inner {
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* date row */
.cell-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cell-day { font-size: 12px; font-weight: 600; color: var(--text); }
.cell-day--other { color: var(--muted); }

.cell-badge {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  line-height: 1.4;
}
.cell-badge--lock { background: rgba(255,107,107,.15); }
.cell-badge--reg  { background: rgba(249,115,22,.15); }

/* body sections */
.cell-body       { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.cell-body--center { align-items: center; justify-content: center; text-align: center; }

.cell-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--surface3);
}

/* status badge (P / A / HD / L / EL / H) */
.status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-align: center;
  align-self: flex-start;
}
.status-badge--present    { background: rgba(54,211,153,.2);  color: var(--green); }
.status-badge--absent     { background: rgba(255,107,107,.2); color: var(--red); }
.status-badge--halfday    { background: rgba(249,168,37,.2);  color: var(--yellow); }
.status-badge--late       { background: rgba(249,115,22,.2);  color: #fb923c; }
.status-badge--early-leave{ background: rgba(155,110,255,.2); color: var(--purple); }
.status-badge--holiday     { background: rgba(79,126,255,.2);  color: var(--accent); }
.status-badge--regularised { background: rgba(249,115,22,.2);  color: #fb923c; }
.status-badge--weekend     { background: var(--surface2);      color: var(--muted); }

/* punch times */
.punch-times { display: flex; flex-direction: column; gap: 2px; }
.punch-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--muted);
}
.punch-row--hrs { font-weight: 600; color: var(--text); }

/* regularize */
.reg-btn {
  background: none; border: none; cursor: pointer;
  font-size: 10px; color: var(--accent);
  text-decoration: underline;
  padding: 0; margin-top: 2px;
  text-align: left;
}
.reg-btn:hover { color: #7da4ff; }

.days-left { font-size: 10px; color: var(--yellow); font-weight: 600; }
.locked-note { font-size: 10px; color: var(--muted); margin-top: 2px; }

/* status labels (On Leave / Holiday / Week Off) */
.status-label { font-size: 11px; font-weight: 600; }
.status-label--leave   { color: #14b8a6; }
.status-label--holiday { color: var(--accent); }
.status-label--weekend { color: var(--muted); }

.leave-type   { font-size: 10px; color: #0d9488; margin-top: 2px; }
.holiday-name { font-size: 10px; color: #6b8fff; margin-top: 1px; }

/* ── legend ──────────────────────────────────────────────────────────────── */
.legend {
  border-top: 1px solid var(--surface3);
  background: var(--surface2);
  padding: 14px 16px;
}
.legend-title { font-size: 12px; font-weight: 600; color: var(--text); margin: 0 0 10px; }
.legend-items {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: var(--muted);
}
.legend-swatch {
  width: 12px; height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}
.swatch--present  { background: rgba(54,211,153,.25);  border: 1px solid rgba(54,211,153,.4); }
.swatch--absent   { background: rgba(255,107,107,.25); border: 1px solid rgba(255,107,107,.4); }
.swatch--halfday  { background: rgba(249,168,37,.25);  border: 1px solid rgba(249,168,37,.4); }
.swatch--weekend  { background: var(--surface2);       border: 1px solid var(--surface3); }
.swatch--holiday  { background: rgba(79,126,255,.25);  border: 1px solid rgba(79,126,255,.4); }
.swatch--late     { background: rgba(249,115,22,.25);  border: 1px solid rgba(249,115,22,.4); }
.swatch--reg      { background: rgba(249,115,22,.20);  border: 1px solid rgba(249,115,22,.4); }
.swatch--leave    { background: rgba(20,184,166,.20);  border: 1px solid rgba(20,184,166,.4); }

@media (max-width: 640px) {
  .legend-items { grid-template-columns: repeat(2, 1fr); }
  .cal-cell { min-height: 80px; }
}
</style>
