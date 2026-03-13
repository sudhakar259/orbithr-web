<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div class="flex min-h-screen items-center justify-center p-4">
      <div
        class="relative bg-white rounded-lg shadow-lg max-w-2xl w-full"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Punch Logs</h2>
            <p class="mt-1 text-sm text-slate-600">
              {{ formatDate(attendance?.attendance_date) }}
            </p>
          </div>
          <button
            @click="closeModal"
            class="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-4">
          <div v-if="attendance && attendance.punch_logs && attendance.punch_logs.length > 0" class="space-y-4">
            <!-- Summary -->
            <div class="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
              <div>
                <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Check In</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">
                  {{ attendance.check_in ? formatTime(attendance.check_in) : '—' }}
                </div>
              </div>
              <div>
                <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Check Out</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">
                  {{ attendance.check_out ? formatTime(attendance.check_out) : '—' }}
                </div>
              </div>
              <div>
                <div class="text-xs font-medium uppercase tracking-wide text-slate-600">Worked Hours</div>
                <div class="mt-1 text-lg font-semibold text-slate-900">
                  {{ formatWorkingHours(attendance.working_hours) }}
                </div>
              </div>
            </div>

            <!-- Logs Table -->
            <div class="overflow-x-auto">
              <table class="min-w-full">
                <thead>
                  <tr class="border-b border-slate-200 bg-slate-50">
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700">Time</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700">Type</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700">Location</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700">Device</th>
                    <th class="px-4 py-3 text-left text-xs font-semibold text-slate-700">Method</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(log, index) in attendance.punch_logs"
                    :key="index"
                    class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td class="px-4 py-3 text-sm font-medium text-slate-900">
                      {{ formatTime(log.timestamp) }}
                    </td>
                    <td class="px-4 py-3 text-sm">
                      <span
                        :class="[
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          log.type === 'check_in'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        ]"
                      >
                        {{ formatPunchType(log.type) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-slate-600">
                      {{ log.location || '—' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-slate-600">
                      {{ log.device_id || '—' }}
                    </td>
                    <td class="px-4 py-3 text-sm text-slate-600">
                      <span class="capitalize">{{ log.method || '—' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- No Logs -->
          <div v-else class="py-8 text-center text-slate-500">
            <p class="text-sm">No punch logs available for this date.</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            @click="closeModal"
            class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AttendanceRecord } from '@/services/attendance'

interface Props {
  show: boolean
  attendance?: AttendanceRecord | null
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const closeModal = () => {
  emit('close')
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const formatTime = (timeString: string): string => {
  if (!timeString) return ''
  const time = new Date(`1970-01-01T${timeString}`)
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

const formatPunchType = (type: string): string => {
  return type === 'check_in' ? 'Check In' : 'Check Out'
}

const formatWorkingHours = (hours: number | string): string => {
  const h = Number(hours) || 0
  return `${h.toFixed(1)}h`
}
</script>

<style scoped>
</style>
