<script setup lang="ts">
defineOptions({ name: 'EssAttendance' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface AttendanceRecord {
  id: number
  date: string
  check_in?: string
  check_out?: string
  status: string
  work_hours?: number
  late_minutes?: number
}

const loading = ref(true)
const error = ref('')
const records = ref<AttendanceRecord[]>([])
const filterMonth = ref(new Date().toISOString().slice(0, 7))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/attendance/records', {
      params: { month: filterMonth.value, my_records: true },
    })
    records.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load attendance records'
  } finally {
    loading.value = false
  }
}

const totalDays = computed(() => records.value.length)
const presentDays = computed(() => records.value.filter((r) => r.status === 'present').length)
const absentDays = computed(() => records.value.filter((r) => r.status === 'absent').length)
const lateDays = computed(
  () => records.value.filter((r) => r.status === 'late' || (r.late_minutes ?? 0) > 0).length,
)

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    present: 'bg-green-900/50 text-green-400',
    absent: 'bg-red-900/50 text-red-400',
    late: 'bg-yellow-900/50 text-yellow-400',
    leave: 'bg-blue-900/50 text-blue-400',
    holiday: 'bg-purple-900/50 text-purple-400',
    half_day: 'bg-orange-900/50 text-orange-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-400'
}

const formatTime = (t?: string) =>
  t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex gap-4 items-end">
      <div>
        <label class="block text-xs text-gray-400 mb-1">Month</label>
        <input
          v-model="filterMonth"
          type="month"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
          @change="load"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Days</p>
        <p class="text-2xl font-bold text-white">{{ totalDays }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Present</p>
        <p class="text-2xl font-bold text-green-400">{{ presentDays }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Absent</p>
        <p class="text-2xl font-bold text-red-400">{{ absentDays }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Late</p>
        <p class="text-2xl font-bold text-yellow-400">{{ lateDays }}</p>
      </div>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 6" :key="i" class="h-10 bg-gray-700 rounded"></div>
      </div>
    </div>

    <div v-else-if="records.length" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700/50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Check In</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Check Out</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Hours</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr
            v-for="rec in records"
            :key="rec.id"
            class="hover:bg-gray-700/30 transition-colors"
          >
            <td class="px-4 py-3 text-sm text-white">{{ formatDate(rec.date) }}</td>
            <td class="px-4 py-3">
              <span
                :class="[
                  'inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize',
                  getStatusClass(rec.status),
                ]"
              >{{ rec.status }}</span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-300">{{ formatTime(rec.check_in) }}</td>
            <td class="px-4 py-3 text-sm text-gray-300">{{ formatTime(rec.check_out) }}</td>
            <td class="px-4 py-3 text-sm text-right text-gray-300">
              {{ rec.work_hours ? rec.work_hours.toFixed(1) + 'h' : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No attendance records found for this month.</p>
    </div>
  </div>
</template>
