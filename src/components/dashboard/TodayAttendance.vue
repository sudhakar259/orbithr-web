<template>
  <div class="rounded-xl border border-slate-200 bg-white shadow-soft overflow-hidden">
    <div class="flex items-center justify-between border-b border-slate-200 p-6">
      <div>
        <h3 class="text-lg font-semibold text-slate-900">Today's Attendance</h3>
        <p class="text-sm text-slate-600">Current punch status and working hours</p>
      </div>
      <button
        @click="openAttendance"
        :disabled="hasCheckedOut"
        :class="[
          'rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          hasCheckedOut
            ? 'bg-slate-400 hover:bg-slate-400 cursor-not-allowed'
            : hasCheckedIn
              ? 'btn-primary'
              : 'btn-danger'
        ]"
      >
        {{ hasCheckedOut ? 'Checked Out' : hasCheckedIn ? 'Check Out' : 'Check In' }}
      </button>
    </div>

    <div class="p-6">
      <div v-if="todaysRecord" class="space-y-4">
        <!-- Status Grid -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Check In -->
          <div class="rounded-lg bg-slate-50 p-4">
            <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Check In Time</div>
            <div class="mt-2">
              <div class="text-lg font-bold text-slate-900">
                {{ todaysRecord.check_in ? formatTime(todaysRecord.check_in) : '—' }}
              </div>
              <div v-if="todaysRecord.check_in" class="mt-1 text-xs text-slate-500">
                {{ formatDate(todaysRecord.check_in) }}
              </div>
            </div>
          </div>

          <!-- Check Out -->
          <div class="rounded-lg bg-slate-50 p-4">
            <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Check Out Time</div>
            <div class="mt-2">
              <div class="text-lg font-bold text-slate-900">
                {{ todaysRecord.check_out ? formatTime(todaysRecord.check_out) : '—' }}
              </div>
              <div v-if="!todaysRecord.check_out && todaysRecord.check_in" class="mt-1 text-xs text-orange-600 font-medium">
                Still working
              </div>
            </div>
          </div>
        </div>

        <!-- Working Hours & Status -->
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-lg bg-blue-50 p-4">
            <div class="text-xs font-medium uppercase tracking-wide text-blue-600">Working Hours</div>
            <div class="mt-2 text-2xl font-bold text-blue-900">
              {{ todaysRecord.working_hours ? Number(todaysRecord.working_hours).toFixed(1) : '0' }}h
            </div>
          </div>

          <div class="rounded-lg p-4" :class="getStatusColor(todaysRecord.status)">
            <div class="text-xs font-medium uppercase tracking-wide" :class="getStatusTextColor(todaysRecord.status)">
              Status
            </div>
            <div class="mt-2 font-bold text-sm" :class="getStatusTextColor(todaysRecord.status)">
              {{ getStatusLabel(todaysRecord.status) }}
            </div>
          </div>
        </div>

        <!-- Work Status Info -->
        <div v-if="todaysRecord.work_status || todaysRecord.daily_status" class="rounded-lg border border-slate-200 p-4">
          <div class="text-xs font-medium uppercase tracking-wide text-slate-600 mb-2">Work Status</div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-600">Current Activity:</span>
              <span class="text-sm font-medium text-slate-900">{{ todaysRecord.work_status || todaysRecord.daily_status || 'Not Set' }}</span>
            </div>
            <div v-if="todaysRecord.project" class="flex items-center justify-between">
              <span class="text-sm text-slate-600">Project:</span>
              <span class="text-sm font-medium text-slate-900">{{ todaysRecord.project }}</span>
            </div>
            <div v-if="todaysRecord.location" class="flex items-center justify-between">
              <span class="text-sm text-slate-600">Location:</span>
              <span class="text-sm font-medium text-slate-900">{{ todaysRecord.location }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200">
          <div class="text-center">
            <div class="text-xs text-slate-600 mb-1">Check-in Status</div>
            <div class="flex justify-center">
              <svg
                v-if="todaysRecord.check_in"
                class="h-5 w-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div class="text-center">
            <div class="text-xs text-slate-600 mb-1">Check-out Status</div>
            <div class="flex justify-center">
              <svg
                v-if="todaysRecord.check_out"
                class="h-5 w-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div class="text-center">
            <div class="text-xs text-slate-600 mb-1">Regularized</div>
            <div class="flex justify-center">
              <svg
                v-if="todaysRecord.is_regularized"
                class="h-5 w-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg v-else class="h-5 w-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="mt-3 text-sm text-slate-600">No attendance record for today</p>
        <button
          @click="openAttendance"
          class="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Check In Now
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAttendance } from '@/composables/useAttendance'
import type { AttendanceRecord } from '@/services/attendance'

const router = useRouter()
const { fetchTodayAttendance, todaysRecord } = useAttendance()

const hasCheckedIn = computed(() => todaysRecord.value?.check_in ? true : false)
const hasCheckedOut = computed(() => todaysRecord.value?.check_out ? true : false)

const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) return '—'
  try {
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return timeString
  }
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'present':
      return 'bg-green-50'
    case 'absent':
      return 'bg-red-50'
    case 'half_day':
      return 'bg-yellow-50'
    case 'late':
      return 'bg-orange-50'
    case 'early_leave':
      return 'bg-purple-50'
    default:
      return 'bg-slate-50'
  }
}

const getStatusTextColor = (status: string): string => {
  switch (status) {
    case 'present':
      return 'text-green-600'
    case 'absent':
      return 'text-red-600'
    case 'half_day':
      return 'text-yellow-600'
    case 'late':
      return 'text-orange-600'
    case 'early_leave':
      return 'text-purple-600'
    default:
      return 'text-slate-600'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'present':
      return 'Present'
    case 'absent':
      return 'Absent'
    case 'half_day':
      return 'Half Day'
    case 'late':
      return 'Late'
    case 'early_leave':
      return 'Early Leave'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

const openAttendance = () => {
  router.push('/app/attendance')
}

onMounted(() => {
  fetchTodayAttendance()
})
</script>
