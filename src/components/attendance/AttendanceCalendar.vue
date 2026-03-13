<template>
  <div class="calendar space-y-4">
    <!-- Calendar Header -->
    <div class="grid grid-cols-7 gap-px bg-gray-200 border-b">
      <div
        v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']"
        :key="day"
        class="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar Body -->
    <div class="grid grid-cols-7 gap-px bg-gray-200">
      <div
        v-for="day in calendarDays"
        :key="day.date"
        :class="[
          'p-2 min-h-[120px] cursor-pointer transition-colors relative',
          day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400 bg-gray-50',
          day.isToday ? 'ring-2 ring-blue-500' : '',
          day.bgColorClass,
          day.isLocked ? 'opacity-75' : ''
        ]"
        @click="selectDate(day)"
      >
        <div class="flex flex-col h-full">
          <div class="flex items-start justify-between mb-1">
            <span class="text-sm font-medium">{{ day.day }}</span>
            <span v-if="day.isLocked" class="text-xs bg-red-100 text-red-700 px-1 rounded" title="Attendance locked for regularization">🔒</span>
            <span v-else-if="day.attendance?.is_regularized" class="text-xs bg-red-100 text-orange-700 px-1 rounded" title="Attendance locked for regularization">⏰</span>
          </div>

          <!-- Attendance Status -->
          <div v-if="day.attendance" class="flex-1">
            <div
              :class="getStatusClasses(day.attendance.status)"
              class="text-xs px-1 py-0.5 rounded text-center mb-1"
            >
              {{ getStatusText(day.attendance.status) }}
            </div>

            <!-- Punch Times -->
            <div class="text-xs text-gray-600 space-y-0.5">
              <div v-if="day.attendance.check_in" class="flex justify-between">
                <span>In:</span>
                <span>{{ formatTime(day.attendance.check_in) }}</span>
              </div>
              <div v-if="day.attendance.check_out" class="flex justify-between">
                <span>Out:</span>
                <span>{{ formatTime(day.attendance.check_out) }}</span>
              </div>
              <div v-if="day.attendance.working_hours > 0" class="flex justify-between font-medium">
                <span>Hrs:</span>
                <span>{{ day.attendance.working_hours }}</span>
              </div>
            </div>

            <!-- Regularization Button -->
            <button
              v-if="canRegularizeDay(day)"
              @click.stop="$emit('regularize', day.attendance)"
              class="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Regularize
            </button>
            <div v-else-if="day.attendance.status === 'absent' && day.isLocked" class="mt-1 text-xs text-gray-500">
              Locked for regularization
            </div>
          </div>

          <!-- Holiday/Weekend/Weekoff Badge -->
          <div v-else-if="!day.isCurrentMonth" class="flex-1 flex items-center justify-center">
            <div class="w-2 h-2 bg-gray-300 rounded-full"></div>
          </div>
          <div v-else-if="day.holiday && day.holiday.length" class="flex-1 flex items-center justify-center text-center">
            <div>
              <div class="text-xs font-medium text-blue-700">Holiday</div>
              <div class="text-xs text-blue-600 space-y-0.5">
                <div v-for="(h, idx) in day.holiday" :key="idx">{{ h.name }}</div>
              </div>
            </div>
          </div>
          <div v-else-if="day.isWeekOff" class="flex-1 flex items-center justify-center">
            <div class="text-xs font-medium text-gray-500">Week Off</div>
          </div>
          <div v-else class="flex-1 flex items-center justify-center">
            <div class="w-2 h-2 bg-gray-300 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend Section -->
    <div class="rounded-lg border border-slate-200 bg-white p-4 mt-4">
      <h4 class="mb-3 text-sm font-semibold text-slate-900">Calendar Legend</h4>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
          <span class="text-xs text-slate-600">Present</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
          <span class="text-xs text-slate-600">Absent</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
          <span class="text-xs text-slate-600">Half Day</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
          <span class="text-xs text-slate-600">Weekend</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
          <span class="text-xs text-slate-600">Holiday</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
          <span class="text-xs text-slate-600">Late</span>
        </div>
         <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded bg-purple-100 border border-purple-300"></div>
          <span class="text-xs text-slate-600">Regularized</span>
        </div>
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

interface CalendarDay {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  attendance?: Attendance
  isWeekOff: boolean
  holiday: Holiday[] | null
  isLocked: boolean
  bgColorClass: string
}

interface Props {
  currentDate: Date
  attendanceData: Attendance[]
  employeeId?: number
}

const props = withDefaults(defineProps<Props>(), {
  employeeId: 1
})

const emit = defineEmits<{
  dateSelected: [date: Date]
  regularize: [attendance: Attendance | undefined]
  dayClicked: [attendance: Attendance | undefined]
}>()

const { hasPermission, roles, user } = useAuth()
const employeeId = computed(() => props.employeeId || user.value?.employee_id || 1)

const canRegularize = computed(() => {
  if (hasPermission('regularize attendance')) {
    return true
  }

  const roleNames = roles()
    .map(role => (typeof role === 'string' ? role : String(role?.name ?? role)))
    .map(role => role.toLowerCase())

  return roleNames.some(role => ['admin', 'hr_manager', 'manager'].includes(role))
})

// Create calendar days
const normalizeDate = (dateString: string): string => {
  if (!dateString) return ''
  // Parse ISO timestamp into a Date and return the local yyyy-mm-dd
  const d = new Date(dateString)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  // Fallback for plain date strings
  return String(dateString).split('T')[0]
}

const calendarDays = computed(() => {
  const year = props.currentDate.getFullYear()
  const month = props.currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const days: CalendarDay[] = []
  const currentDate = new Date(startDate)

  // Create 42 days (6 weeks)
  for (let i = 0; i < 42; i++) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`
    let attendance = props.attendanceData.find(att => normalizeDate(att.attendance_date) === dateStr)

    // For future dates, do not show 'absent' status — treat as no attendance record
    const todayNorm = new Date()
    todayNorm.setHours(0, 0, 0, 0)
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    dayDate.setHours(0, 0, 0, 0)

    if (attendance && attendance.status === 'absent' && dayDate >= todayNorm) {
      attendance = undefined as any
    }

    const holiday = isCompanyHoliday(currentDate)
    const isWeekOff = isEmployeeWeekOff(currentDate, employeeId.value)

    // If the attendance is marked 'absent' but the day is a company holiday or an employee week off,
    // treat it as no attendance so that 'A' is not shown on off days.
    if (attendance && attendance.status === 'absent' && (isWeekOff || (holiday && holiday.length))) {
      attendance = undefined as any
    }

    const isLocked = attendance?.status === 'absent' && isAttendanceLocked(currentDate, employeeId.value)

    let bgColorClass = 'bg-white'
    if (!currentDate.toDateString().includes(String(new Date().getFullYear()))) {
      bgColorClass = 'bg-gray-50'
    } else if (holiday && holiday.length) {
      bgColorClass = 'bg-blue-50'
    } else if (isWeekOff) {
      bgColorClass = 'bg-gray-100'
    } else if (attendance && (attendance.is_regularized === true || String(attendance.is_regularized) === '1')) {
      bgColorClass = 'bg-orange-100 border border-orange-300'
    } else if (attendance?.status === 'present') {
      bgColorClass = 'bg-green-50'
    } else if (attendance?.status === 'absent') {
      bgColorClass = 'bg-red-50'
    } else if (attendance?.status === 'half_day') {
      bgColorClass = 'bg-yellow-50'
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
      bgColorClass
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
})

const canRegularizeDay = (day: CalendarDay): boolean => {
  // Must have an attendance record marked absent
  if (!day.attendance || day.attendance.status !== 'absent') return false

  // Do not show if already regularized (handle string '0'/'1' or boolean)
  const isRegularizedFlag = day.attendance.is_regularized === true || String(day.attendance.is_regularized) === '1'
  if (isRegularizedFlag) return false

  // Do not allow regularization on holidays or week offs
  if (day?.holiday?.length || day.isWeekOff) return false

  // Localize dates to midnight to avoid timezone offsets
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [y, m, d] = day.date.split('-').map(n => parseInt(n, 10))
  const target = new Date(y, (m || 1) - 1, d || 1)
  target.setHours(0, 0, 0, 0)

  // The regularization should be available starting from the next working day
  const nextWorking = getNextWorkingDay(target, employeeId.value)
  nextWorking.setHours(0, 0, 0, 0)
  if (today < nextWorking) return false

  // Calculate number of working days passed since the attendance date (excluding the attendance date itself)
  const start = new Date(target)
  start.setDate(start.getDate() + 1)
  start.setHours(0, 0, 0, 0)
  const workingDaysPassed = countWorkingDays(start, today, employeeId.value)

  // Allow regularization for up to configured working days (EL_DEDUCTION_CONFIG.daysBeforeLock)
  if (workingDaysPassed > EL_DEDUCTION_CONFIG.daysBeforeLock) return false

  // Respect explicit lock unless user has override permissions
  if (day.isLocked && !canRegularize.value) return false

  return true
}

const getStatusClasses = (status: string): string => {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-800'
    case 'absent':
      return 'bg-red-100 text-red-800'
    case 'half_day':
      return 'bg-yellow-100 text-yellow-800'
    case 'late':
      return 'bg-orange-100 text-orange-800'
    case 'early_leave':
      return 'bg-purple-100 text-purple-800'
    case 'holiday':
      return 'bg-blue-100 text-blue-800'
    case 'weekend':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string): string => {
  switch (status) {
    case 'present':
      return 'P'
    case 'absent':
      return 'A'
    case 'half_day':
      return 'HD'
    case 'late':
      return 'L'
    case 'early_leave':
      return 'EL'
    case 'holiday':
      return 'H'
    case 'weekend':
      return 'W'
    default:
      return status.charAt(0).toUpperCase()
  }
}

const formatTime = (timeString: string): string => {
  if (!timeString) return ''
  const time = new Date(`1970-01-01T${timeString}`)
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const selectDate = (day: CalendarDay) => {
  emit('dateSelected', new Date(day.date))
  emit('dayClicked', day.attendance)
}
</script>

<style scoped>
.calendar {
  @apply border border-gray-200 rounded-lg overflow-hidden;
}
</style>
