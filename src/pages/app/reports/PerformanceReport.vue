<script setup lang="ts">
defineOptions({ name: 'ReportsPerformance' })
import { ref, computed, onMounted } from 'vue'
import {
  reportService,
  type PerformanceReportRow,
  type ReportFilter,
} from '@/services/reportService'

const loading = ref(false)
const error = ref('')
const rows = ref<PerformanceReportRow[]>([])
const filters = ref<ReportFilter>({ start_date: '', end_date: '' })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await reportService.getPerformanceReport(filters.value)
    rows.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const avgScore = computed(() =>
  rows.value.length
    ? (rows.value.reduce((s, r) => s + r.appraisal_score, 0) / rows.value.length).toFixed(1)
    : '0',
)

const getRatingClass = (rating: string) => {
  const map: Record<string, string> = {
    excellent: 'bg-green-900/50 text-green-400',
    good: 'bg-blue-900/50 text-blue-400',
    satisfactory: 'bg-yellow-900/50 text-yellow-400',
    needs_improvement: 'bg-red-900/50 text-red-400',
  }
  return map[rating?.toLowerCase()] ?? 'bg-gray-700 text-gray-400'
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
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
    </div>

    <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
      <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Average Appraisal Score</p>
      <p class="text-2xl font-bold text-purple-400">{{ avgScore }} / 5</p>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 bg-gray-700 rounded"></div>
      </div>
    </div>

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
              Score
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Rating
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Cycle
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
            <td class="px-4 py-3 text-sm text-right text-purple-400 font-semibold">
              {{ row.appraisal_score }}
            </td>
            <td class="px-4 py-3 text-sm">
              <span
                :class="[
                  'inline-flex px-2 py-0.5 text-xs font-semibold rounded-full',
                  getRatingClass(row.rating),
                ]"
                >{{ row.rating }}</span
              >
            </td>
            <td class="px-4 py-3 text-sm text-gray-400">{{ row.cycle }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No performance data. Apply filters and click Apply.</p>
    </div>
  </div>
</template>
