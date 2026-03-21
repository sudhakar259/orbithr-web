<script setup lang="ts">
defineOptions({ name: 'ReportsAttendance' })
import { ref, computed, onMounted } from 'vue'
import {
  reportService,
  type AttendanceReportRow,
  type ReportFilter,
} from '@/services/reportService'

const loading = ref(false)
const error = ref('')
const rows = ref<AttendanceReportRow[]>([])
const filters = ref<ReportFilter>({ start_date: '', end_date: '' })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await reportService.getAttendanceReport(filters.value)
    rows.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const totalEmployees = computed(() => rows.value.length)
const avgRate = computed(() =>
  rows.value.length
    ? (rows.value.reduce((s, r) => s + r.attendance_rate, 0) / rows.value.length).toFixed(1)
    : '0',
)

const exportCsv = () => {
  if (!rows.value.length) return
  const headers = [
    'Employee',
    'Department',
    'Total Days',
    'Present',
    'Absent',
    'Late',
    'On Leave',
    'Rate %',
  ]
  const csvRows = rows.value.map((r) => [
    r.name,
    r.department,
    r.total_days,
    r.present,
    r.absent,
    r.late,
    r.on_leave,
    r.attendance_rate,
  ])
  const csv = [headers, ...csvRows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'attendance-report.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Filters -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-wrap gap-4 items-end">
      <div>
        <label class="block text-xs text-gray-400 mb-1">Start Date</label>
        <input
          v-model="filters.start_date"
          type="date"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div>
        <label class="block text-xs text-gray-400 mb-1">End Date</label>
        <input
          v-model="filters.end_date"
          type="date"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <button
        @click="load"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Apply
      </button>
      <button
        @click="exportCsv"
        class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors ml-auto"
      >
        Export CSV
      </button>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Employees</p>
        <p class="text-2xl font-bold text-white">{{ totalEmployees }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Attendance Rate</p>
        <p class="text-2xl font-bold text-green-400">{{ avgRate }}%</p>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 bg-gray-700 rounded"></div>
      </div>
    </div>

    <!-- Table -->
    <div
      v-else-if="rows.length"
      class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
    >
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700/50">
          <tr>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Employee
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Department
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Present
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Absent
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Late
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              On Leave
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Rate %
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr
            v-for="row in rows"
            :key="row.employee_id"
            class="hover:bg-gray-700/30 transition-colors"
          >
            <td class="px-4 py-3 text-sm font-medium text-white">{{ row.name }}</td>
            <td class="px-4 py-3 text-sm text-gray-400">{{ row.department }}</td>
            <td class="px-4 py-3 text-sm text-right text-green-400">{{ row.present }}</td>
            <td class="px-4 py-3 text-sm text-right text-red-400">{{ row.absent }}</td>
            <td class="px-4 py-3 text-sm text-right text-yellow-400">{{ row.late }}</td>
            <td class="px-4 py-3 text-sm text-right text-blue-400">{{ row.on_leave }}</td>
            <td class="px-4 py-3 text-sm text-right">
              <span
                :class="[
                  'font-semibold',
                  row.attendance_rate >= 90
                    ? 'text-green-400'
                    : row.attendance_rate >= 75
                      ? 'text-yellow-400'
                      : 'text-red-400',
                ]"
                >{{ row.attendance_rate }}%</span
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No data. Apply filters and click Apply.</p>
    </div>
  </div>
</template>
