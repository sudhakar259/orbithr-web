<script setup lang="ts">
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

const { fetchMonthlyAttendance, fetchTodayAttendance, fetchWorkStatuses, recordPunch, records, summary, loading, error, todaysRecord, workStatuses } = useAttendance()
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

const canCheckIn = computed(() => !isCurrentlyLoggedIn.value)
const canCheckOut = computed(() => isCurrentlyLoggedIn.value)

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
  await fetchMonthlyAttendance(year, month)
}

const loadTodayAttendance = async () => {
  await fetchTodayAttendance()
}

const handlePunch = async (punchData: any) => {
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

const handleWorkStatus = async (punchData: any) => {
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

const handleRegularizationSubmit = async (data: any) => {
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
  } catch (err: any) {
    console.error('Regularization submission error:', err)
    alert(err.response?.data?.error || 'Failed to submit regularization request')
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
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Attendance</h1>
        <p class="text-slate-600">Track daily presence, shifts and approvals.</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="showTimesheetModal = true"
          :disabled="loading"
          class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <h3 class="mb-4 text-lg font-semibold text-slate-900">Today's Status</h3>
      <div v-if="todaysRecord" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Check In Time -->
        <div class="rounded-lg bg-slate-50 p-4">
          <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Check In</div>
          <div class="mt-2 text-2xl font-bold text-slate-900">
            {{ todaysRecord.check_in ? formatDateTime(todaysRecord.attendance_date, todaysRecord.check_in) : '—' }}
          </div>
          <div class="mt-1 text-xs text-slate-500">
            {{ todaysRecord.check_in ? formatDateTime(todaysRecord.attendance_date) : 'Not checked in' }}
          </div>
        </div>

        <!-- Check Out Time -->
        <div class="rounded-lg bg-slate-50 p-4">
          <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Check Out</div>
          <div class="mt-2 text-2xl font-bold text-slate-900">
            {{ todaysRecord.check_out ? formatDateTime(todaysRecord.attendance_date, todaysRecord.check_out) : '—' }}
          </div>
          <div class="mt-1 text-xs text-slate-500">
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
      <div v-else class="text-center py-8 text-slate-500">
        <p>No attendance record for today. Click "Check In" to get started.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !todaysRecord" class="rounded-lg border border-slate-200 bg-white p-6 text-center">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"></div>
      <p class="mt-2 text-slate-600">Loading attendance data...</p>
    </div>

    <!-- Attendance Summary -->
    <AttendanceSummary :stats="summary" />

    <!-- Calendar Section -->
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">
          {{ currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }) }}
        </h2>
        <div class="flex gap-2">
          <button
            @click="previousMonth"
            :disabled="loading"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            @click="nextMonth"
            :disabled="loading"
            class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
      <AttendanceCalendar
        :current-date="currentDate"
        :attendance-data="records"
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
