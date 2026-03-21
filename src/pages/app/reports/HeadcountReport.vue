<script setup lang="ts">
defineOptions({ name: 'ReportsHeadcount' })
import { ref, computed, onMounted } from 'vue'
import {
  reportService,
  type HeadcountReportRow,
  type ReportFilter,
} from '@/services/reportService'

const loading = ref(false)
const error = ref('')
const rows = ref<HeadcountReportRow[]>([])
const filters = ref<ReportFilter>({})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await reportService.getHeadcountReport(filters.value)
    rows.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const totalHeadcount = computed(() => rows.value.reduce((s, r) => s + r.total, 0))
const totalActive = computed(() => rows.value.reduce((s, r) => s + r.active, 0))

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-wrap gap-4 items-end">
      <button
        @click="load"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Refresh
      </button>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Headcount</p>
        <p class="text-2xl font-bold text-white">{{ totalHeadcount }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Active Employees</p>
        <p class="text-2xl font-bold text-green-400">{{ totalActive }}</p>
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
              Department
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Total
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Active
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Inactive
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Male
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Female
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Full-time
            </th>
            <th
              class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Part-time
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr
            v-for="row in rows"
            :key="row.department"
            class="hover:bg-gray-700/30 transition-colors"
          >
            <td class="px-4 py-3 text-sm font-medium text-white">{{ row.department }}</td>
            <td class="px-4 py-3 text-sm text-right text-gray-300 font-semibold">
              {{ row.total }}
            </td>
            <td class="px-4 py-3 text-sm text-right text-green-400">{{ row.active }}</td>
            <td class="px-4 py-3 text-sm text-right text-red-400">{{ row.inactive }}</td>
            <td class="px-4 py-3 text-sm text-right text-blue-400">{{ row.male }}</td>
            <td class="px-4 py-3 text-sm text-right text-purple-400">{{ row.female }}</td>
            <td class="px-4 py-3 text-sm text-right text-gray-300">{{ row.full_time }}</td>
            <td class="px-4 py-3 text-sm text-right text-gray-300">{{ row.part_time }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No employee data found.</p>
    </div>
  </div>
</template>
