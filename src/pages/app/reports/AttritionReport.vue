<script setup lang="ts">
defineOptions({ name: 'ReportsAttrition' })
import { ref, computed, onMounted } from 'vue'
import {
  reportService,
  type AttritionReportRow,
  type ReportFilter,
} from '@/services/reportService'

const loading = ref(false)
const error = ref('')
const rows = ref<AttritionReportRow[]>([])
const filters = ref<ReportFilter>({ start_date: '', end_date: '' })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await reportService.getAttritionReport(filters.value)
    rows.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const totalAttrition = computed(() => rows.value.reduce((s, r) => s + r.count, 0))
const avgRate = computed(() =>
  rows.value.length
    ? (rows.value.reduce((s, r) => s + r.attrition_rate, 0) / rows.value.length).toFixed(2)
    : '0',
)

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

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Attrition</p>
        <p class="text-2xl font-bold text-red-400">{{ totalAttrition }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Attrition Rate</p>
        <p class="text-2xl font-bold text-yellow-400">{{ avgRate }}%</p>
      </div>
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
              Month
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Department
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Count
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Reason
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
            v-for="(row, i) in rows"
            :key="i"
            class="hover:bg-gray-700/30 transition-colors"
          >
            <td class="px-4 py-3 text-sm text-white">{{ row.month }}</td>
            <td class="px-4 py-3 text-sm text-gray-400">{{ row.department }}</td>
            <td class="px-4 py-3 text-sm text-right text-red-400 font-semibold">
              {{ row.count }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-400 capitalize">{{ row.reason }}</td>
            <td class="px-4 py-3 text-sm text-right text-yellow-400">{{ row.attrition_rate }}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No attrition data. Apply filters and click Apply.</p>
    </div>
  </div>
</template>
