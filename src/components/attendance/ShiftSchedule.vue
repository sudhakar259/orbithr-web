<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">My Shift Schedule</h3>
      <span class="text-sm text-gray-500">Current shift details</span>
    </div>

    <div v-if="!currentShift" class="text-center py-8">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No active shift assigned</h3>
      <p class="mt-1 text-sm text-gray-500">Contact HR to assign a shift schedule.</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Current Shift Info -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-sm font-medium text-blue-900">{{ currentShift.shift_name }}</h4>
            <p class="text-xs text-blue-700 mt-1">{{ currentShift.description || 'No description' }}</p>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium text-blue-900">
              {{ formatTime(currentShift.start_time) }} - {{ formatTime(currentShift.end_time) }}
            </div>
            <div class="text-xs text-blue-700">{{ currentShift.working_hours }} hours</div>
          </div>
        </div>
      </div>

      <!-- Shift Details -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="text-xs text-gray-500 uppercase tracking-wide">Working Days</div>
          <div class="text-sm font-medium text-gray-900 mt-1">
            {{ currentShift.working_days?.join(', ') || 'Mon-Fri' }}
          </div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="text-xs text-gray-500 uppercase tracking-wide">Break Time</div>
          <div class="text-sm font-medium text-gray-900 mt-1">
            {{ currentShift.break_hours || 0 }} hours
          </div>
        </div>
      </div>

      <!-- Overtime Settings -->
      <div v-if="currentShift.overtime_settings" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h5 class="text-sm font-medium text-yellow-900 mb-2">Overtime Settings</h5>
        <div class="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span class="text-yellow-700">Rate:</span>
            <span class="font-medium ml-1">{{ currentShift.overtime_settings.rate_multiplier }}x</span>
          </div>
          <div>
            <span class="text-yellow-700">Max Hours:</span>
            <span class="font-medium ml-1">{{ currentShift.overtime_settings.max_daily_hours || 'No limit' }}</span>
          </div>
        </div>
      </div>

      <!-- Weekly Schedule -->
      <div class="border-t pt-4">
        <h5 class="text-sm font-medium text-gray-900 mb-3">Weekly Schedule</h5>
        <div class="space-y-2">
          <div v-for="day in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']"
               :key="day"
               class="flex items-center justify-between py-2 px-3 rounded-md"
               :class="isWorkingDay(day) ? 'bg-green-50 text-green-900' : 'bg-gray-50 text-gray-600'">
            <span class="text-sm">{{ day }}</span>
            <span class="text-xs">
              {{ isWorkingDay(day) ? `${formatTime(currentShift.start_time)} - ${formatTime(currentShift.end_time)}` : 'Off' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Shift Assignment Info -->
      <div v-if="shiftAssignment" class="border-t pt-4">
        <div class="text-xs text-gray-500">
          Assigned from: {{ formatDate(shiftAssignment.effective_from) }}
          <span v-if="shiftAssignment.effective_to">
            to {{ formatDate(shiftAssignment.effective_to) }}
          </span>
          <span v-else>(Ongoing)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Shift {
  id: number
  shift_name: string
  description?: string
  start_time: string
  end_time: string
  working_hours: number
  break_hours?: number
  working_days?: string[]
  overtime_settings?: {
    rate_multiplier: number
    max_daily_hours?: number
  }
}

interface ShiftAssignment {
  id: number
  effective_from: string
  effective_to?: string
}

interface Props {
  shifts: Shift[]
  currentShiftAssignment?: ShiftAssignment
}

const props = defineProps<Props>()

const currentShift = computed(() => {
  // In a real app, this would be determined by the current user's active shift
  // For now, return the first shift or null
  return props.shifts.length > 0 ? props.shifts[0] : null
})

const shiftAssignment = computed(() => {
  return props.currentShiftAssignment
})

const isWorkingDay = (day: string): boolean => {
  if (!currentShift.value?.working_days) {
    // Default working days: Monday to Friday
    return !['Saturday', 'Sunday'].includes(day)
  }

  return currentShift.value.working_days.includes(day.toLowerCase())
}

const formatTime = (timeString: string): string => {
  if (!timeString) return ''
  const time = new Date(`1970-01-01T${timeString}`)
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>
