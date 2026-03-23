<script setup lang="ts">
defineOptions({ name: 'AttendancePage' })
import { ref, onMounted, computed } from 'vue'
import { formatDateTime } from '@/utils/formatDateTime'
import { useAttendance } from '@/composables/useAttendance'
import { useAuth } from '@/composables/useAuth'
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar.vue'
import AttendanceSummary from '@/components/attendance/AttendanceSummary.vue'
import PunchModal from '@/components/attendance/PunchModal.vue'
import WorkStatusModal from '@/components/attendance/WorkStatusModal.vue'
import PunchLogModal from '@/components/attendance/PunchLogModal.vue'
import RegularizationModal from '@/components/attendance/RegularizationModal.vue'
import TimesheetExportModal from '@/components/attendance/TimesheetExportModal.vue'
import type { PunchPayload, AttendanceRecord } from '@/services/attendance'
import { regularizationService } from '@/services/regularization'

const { fetchCalendarData, fetchTodayAttendance, fetchWorkStatuses, recordPunch, records, leaves, summary, loading, error, todaysRecord } = useAttendance()
const { user } = useAuth()

const currentDate = ref(new Date())
const showPunchModal = ref(false)
const showWorkStatusModal = ref(false)
const showPunchLogModal = ref(false)
const showRegularizationModal = ref(false)
const showTimesheetModal = ref(false)
const selectedAttendance = ref<AttendanceRecord | null>(null)
const selectedAttendanceForRegularization = ref<AttendanceRecord | null>(null)
const punchLoading = ref(false)
const regularizationLoading = ref(false)

const isCurrentlyLoggedIn = computed(() => {
  if (!todaysRecord.value?.punch_logs || todaysRecord.value.punch_logs.length === 0) {
    return false
  }
  // Check the most recent punch log entry
  const lastPunch = todaysRecord.value.punch_logs[todaysRecord.value.punch_logs.length - 1]
  return lastPunch.type === 'check_in'
})

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
  loadAttendance()
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
  loadAttendance()
}

const loadAttendance = async () => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  await fetchCalendarData(year, month, user.value?.employee_id)
}

const loadTodayAttendance = async () => {
  await fetchTodayAttendance(user.value?.employee_id)
}

const handlePunch = async (punchData: PunchPayload) => {
  punchLoading.value = true
  try {
    const payload: PunchPayload = {
      ...punchData,
      punch_type: punchData.punch_type,
      method: punchData.method || 'api',
      employee_id: user.value?.employee_id
    }
    console.log('Recording punch:', payload)
    const result = await recordPunch(payload)
    console.log('Punch recorded:', result)

    showPunchModal.value = false

    // Fetch fresh data to ensure UI is updated
    await loadTodayAttendance()
    console.log('Updated today attendance:', todaysRecord.value)
  } catch (err) {
    console.error('Error recording punch:', err)
    error.value = 'Failed to record punch. Please try again.'
  } finally {
    punchLoading.value = false
  }
}

const handleWorkStatus = async (punchData: PunchPayload) => {
  punchLoading.value = true
  try {
    const payload: PunchPayload = {
      attendance_date: punchData.attendance_date,
      timestamp: punchData.timestamp,
      punch_type: 'check_in',
      method: 'web',
      location: punchData.location,
      work_status: punchData.work_status,
      project: punchData.project,
      notes: punchData.notes,
      gps_coordinates: punchData.gps_coordinates,
      employee_id: user.value?.employee_id
    }
    await recordPunch(payload)
    showWorkStatusModal.value = false
    await loadTodayAttendance()
  } catch (err) {
    console.error('Error recording punch:', err)
  } finally {
    punchLoading.value = false
  }
}

const punchType = ref<'check_in' | 'check_out'>('check_in')

const openCheckInModal = () => {
  if (isCurrentlyLoggedIn.value) {
    punchType.value = 'check_out'
    showPunchModal.value = true
  } else {
    showWorkStatusModal.value = true
  }
}

const handleDayClick = (attendance: AttendanceRecord | undefined) => {
  if (attendance && attendance.punch_logs && attendance.punch_logs.length > 0) {
    selectedAttendance.value = attendance
    showPunchLogModal.value = true
  }
}

const openRegularizationModal = (attendance: AttendanceRecord) => {
  selectedAttendanceForRegularization.value = attendance
  showRegularizationModal.value = true
}

const handleRegularizationSubmit = async (data: {
  attendance_id: number
  regularization_type: string
  reason: string
  notes?: string | null
  check_in?: string | null
  check_out?: string | null
  working_hours?: number | null
  overtime_hours?: number | null
}) => {
  regularizationLoading.value = true

  try {
    await regularizationService.createRequest({
      attendance_id: data.attendance_id,
      regularization_type: data.regularization_type,
      reason: data.reason,
      notes: data.notes,
      check_in: data.check_in,
      check_out: data.check_out,
      working_hours: data.working_hours,
      overtime_hours: data.overtime_hours,
    })

    showRegularizationModal.value = false
    selectedAttendanceForRegularization.value = null

    // Show success message
    alert('Regularization request submitted successfully! Your manager and team lead will review it.')
  } catch (err: unknown) {
    console.error('Regularization submission error:', err)
    const axiosErr = err as { response?: { data?: { error?: string } } }
    alert(axiosErr.response?.data?.error || 'Failed to submit regularization request')
  } finally {
    regularizationLoading.value = false
  }
}

onMounted(() => {
  loadAttendance()
  loadTodayAttendance()
  fetchWorkStatuses()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white">Attendance</h1>
        <p class="text-gray-400">Track daily presence, shifts and approvals.</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="showTimesheetModal = true"
          :disabled="loading"
          class="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download Timesheet
        </button>
        <button
          @click="openCheckInModal"
          :disabled="loading || punchLoading"
          :class="[
            'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isCurrentlyLoggedIn
                ? 'bg-brand-600 hover:bg-brand-700'
                : 'bg-red-600 hover:bg-red-700'
          ]"
        >
          {{ isCurrentlyLoggedIn ? 'Check Out' : 'Check In' }}
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
      {{ error }}
    </div>

    <!-- Today's Status Card -->
    <div class="rounded-xl border border-gray-700 bg-gray-800 p-6">
      <h3 class="mb-4 text-lg font-semibold text-white">Today's Status</h3>
      <div v-if="todaysRecord" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Check In Time -->
        <div class="rounded-lg bg-gray-700/50 p-4">
          <div class="text-xs font-medium uppercase tracking-wide text-gray-400">Check In</div>
          <div class="mt-2 text-2xl font-bold text-white">
            {{ todaysRecord.check_in ? formatDateTime(todaysRecord.attendance_date, todaysRecord.check_in) : '—' }}
          </div>
          <div class="mt-1 text-xs text-gray-400">
            {{ todaysRecord.check_in ? formatDateTime(todaysRecord.attendance_date) : 'Not checked in' }}
          </div>
        </div>

        <!-- Check Out Time -->
        <div class="rounded-lg bg-gray-700/50 p-4">
          <div class="text-xs font-medium uppercase tracking-wide text-gray-400">Check Out</div>
          <div class="mt-2 text-2xl font-bold text-white">
            {{ todaysRecord.check_out ? formatDateTime(todaysRecord.attendance_date, todaysRecord.check_out) : '—' }}
          </div>
          <div class="mt-1 text-xs text-gray-400">
            {{ todaysRecord.check_out ? formatDateTime(todaysRecord.attendance_date) : 'Not checked out' }}
          </div>
        </div>

        <!-- Working Hours -->
        <div class="rounded-lg bg-blue-50 p-4">
          <div class="text-xs font-medium uppercase tracking-wide text-blue-600">Working Hours</div>
          <div class="mt-2 text-2xl font-bold text-blue-900">
            {{ todaysRecord.working_hours ? Number(todaysRecord.working_hours).toFixed(1) : '0' }}h
          </div>
          <div class="mt-1 text-xs text-blue-600">
            {{ todaysRecord.status || 'Pending' }}
          </div>
        </div>

        <!-- Work Status -->
        <div class="rounded-lg bg-purple-50 p-4">
          <div class="text-xs font-medium uppercase tracking-wide text-purple-600">Work Status</div>
          <div class="mt-2 text-sm font-bold text-purple-900">
            {{ todaysRecord.work_status || todaysRecord.daily_status || 'Not Set' }}
          </div>
          <div class="mt-1 text-xs text-purple-600">
            {{ todaysRecord.project ? `Project: ${todaysRecord.project}` : 'No project assigned' }}
          </div>
        </div>
      </div>
      <div v-else class="text-center py-8 text-gray-400">
        <p>No attendance record for today. Click "Check In" to get started.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !todaysRecord" class="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-blue-600"></div>
      <p class="mt-2 text-gray-400">Loading attendance data...</p>
    </div>

    <!-- Attendance Summary -->
    <AttendanceSummary :stats="summary" />

    <!-- Calendar Section -->
    <div class="rounded-xl border border-gray-700 bg-gray-800 p-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">
          {{ currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }) }}
        </h2>
        <div class="flex gap-2">
          <button
            @click="previousMonth"
            :disabled="loading"
            class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            @click="nextMonth"
            :disabled="loading"
            class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
      <AttendanceCalendar
        :current-date="currentDate"
        :attendance-data="records"
        :leaves="leaves"
        @day-clicked="handleDayClick"
        @regularize="openRegularizationModal"
      />
    </div>

    <!-- Punch Modals -->
    <PunchModal
      :show="showPunchModal"
      :punch-type="punchType"
      @close="showPunchModal = false"
      @punch="handlePunch"
    />

    <WorkStatusModal
      :show="showWorkStatusModal"
      @close="showWorkStatusModal = false"
      @punch="handleWorkStatus"
    />

    <PunchLogModal
      :show="showPunchLogModal"
      :attendance="selectedAttendance"
      @close="showPunchLogModal = false"
    />

    <RegularizationModal
      :show="showRegularizationModal"
      :attendance="selectedAttendanceForRegularization"
      @close="showRegularizationModal = false"
      @submit="handleRegularizationSubmit"
    />

    <TimesheetExportModal
      :show="showTimesheetModal"
      :current-month="currentDate.getMonth() + 1"
      :current-year="currentDate.getFullYear()"
      @close="showTimesheetModal = false"
    />
  </div>
</template>
