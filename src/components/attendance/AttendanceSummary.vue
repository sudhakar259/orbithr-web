<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <!-- Present Days -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <div class="text-2xl font-bold text-gray-900">{{ stats.present_days || 0 }}</div>
          <div class="text-sm text-gray-500">Present Days</div>
        </div>
      </div>
    </div>

    <!-- Absent Days -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <div class="text-2xl font-bold text-gray-900">{{ stats.absent_days || 0 }}</div>
          <div class="text-sm text-gray-500">Absent Days</div>
        </div>
      </div>
    </div>

    <!-- Working Hours -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <div class="text-2xl font-bold text-gray-900">{{ Number(stats.total_working_hours || 0).toFixed(1) }}</div>
          <div class="text-sm text-gray-500">Working Hours</div>
        </div>
      </div>
    </div>

    <!-- Overtime Hours -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <div class="text-2xl font-bold text-gray-900">{{ Number(stats.total_overtime_hours || 0).toFixed(1) }}</div>
          <div class="text-sm text-gray-500">Overtime Hours</div>
        </div>
      </div>
    </div>

    <!-- Additional Stats Row -->
    <div class="bg-white rounded-lg shadow p-6 md:col-span-2 lg:col-span-4">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Monthly Overview</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-xl font-bold text-yellow-600">{{ stats.half_days || 0 }}</div>
          <div class="text-sm text-gray-500">Half Days</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-orange-600">{{ stats.late_days || 0 }}</div>
          <div class="text-sm text-gray-500">Late Arrivals</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-indigo-600">{{ stats.early_leave_days || 0 }}</div>
          <div class="text-sm text-gray-500">Early Leaves</div>
        </div>
        <div class="text-center">
          <div class="text-xl font-bold text-teal-600">{{ stats.regularized_count || 0 }}</div>
          <div class="text-sm text-gray-500">Regularized</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface AttendanceStats {
  total_days?: number
  present_days?: number
  absent_days?: number
  half_days?: number
  late_days?: number
  early_leave_days?: number
  total_working_hours?: number
  total_overtime_hours?: number
  regularized_count?: number
}

interface Props {
  stats: AttendanceStats
}

defineProps<Props>()
</script>
