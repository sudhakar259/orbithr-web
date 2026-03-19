<script setup lang="ts">
defineOptions({ name: 'PerformanceReports' })
import { ref, onMounted } from 'vue'
import { performanceService, type AppraisalCycle, type TeamSummary, type EmployeeAppraisal } from '@/services/performanceService'

const loading = ref(false)
const cycles = ref<AppraisalCycle[]>([])
const selectedCycleId = ref<number | null>(null)
const teamReport = ref<{ cycle: AppraisalCycle; summary: TeamSummary; appraisals: EmployeeAppraisal[] } | null>(null)
const error = ref('')
const calculating = ref(false)

const loadCycles = async () => {
  try {
    const result = await performanceService.getCycles({ status: 'active' })
    cycles.value = result.data
    if (!result.data.length) {
      const all = await performanceService.getCycles()
      cycles.value = all.data.filter(c => ['active', 'locked', 'completed'].includes(c.status))
    }
    if (cycles.value.length > 0) {
      selectedCycleId.value = cycles.value[0].id
      await loadReport()
    }
  } catch {
    error.value = 'Failed to load cycles'
  }
}

const loadReport = async () => {
  if (!selectedCycleId.value) return
  loading.value = true
  error.value = ''
  try {
    teamReport.value = await performanceService.getCycleSummary(selectedCycleId.value)
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const handleCalculate = async () => {
  if (!selectedCycleId.value) return
  calculating.value = true
  error.value = ''
  try {
    await performanceService.calculateCycleScores(selectedCycleId.value)
    await loadReport()
  } catch {
    error.value = 'Failed to calculate scores'
  } finally {
    calculating.value = false
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    acknowledged: 'bg-teal-100 text-teal-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

onMounted(() => loadCycles())
</script>

<template>
  <div class="space-y-6">
    <!-- Controls -->
    <div class="flex items-center gap-4">
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">Appraisal Cycle</label>
        <select v-model="selectedCycleId" @change="loadReport()" class="border-gray-300 rounded-md text-sm">
          <option v-for="cycle in cycles" :key="cycle.id" :value="cycle.id">{{ cycle.name }}</option>
        </select>
      </div>
      <div class="pt-5">
        <button @click="handleCalculate" :disabled="calculating || !selectedCycleId" class="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
          {{ calculating ? 'Calculating...' : 'Recalculate Scores' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">{{ error }}</div>

    <div v-else-if="cycles.length === 0" class="text-center py-12 text-gray-500">No active or completed appraisal cycles found.</div>

    <template v-else-if="teamReport">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Total Employees</p>
          <p class="mt-1 text-2xl font-semibold text-gray-900">{{ teamReport.summary.total_employees }}</p>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Completed</p>
          <p class="mt-1 text-2xl font-semibold text-green-600">{{ teamReport.summary.completed }}</p>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">In Progress</p>
          <p class="mt-1 text-2xl font-semibold text-blue-600">{{ teamReport.summary.in_progress }}</p>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Not Started</p>
          <p class="mt-1 text-2xl font-semibold text-gray-500">{{ teamReport.summary.not_started }}</p>
        </div>
      </div>

      <!-- Score Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Average Score</p>
          <p class="mt-1 text-2xl font-semibold text-gray-900">{{ teamReport.summary.average_score?.toFixed(2) ?? 'N/A' }}</p>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Highest Score</p>
          <p class="mt-1 text-2xl font-semibold text-green-600">{{ teamReport.summary.highest_score?.toFixed(2) ?? 'N/A' }}</p>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Lowest Score</p>
          <p class="mt-1 text-2xl font-semibold text-red-500">{{ teamReport.summary.lowest_score?.toFixed(2) ?? 'N/A' }}</p>
        </div>
      </div>

      <!-- Rating Distribution -->
      <div v-if="Object.keys(teamReport.summary.rating_distribution).length > 0" class="bg-white shadow rounded-lg p-5">
        <h3 class="text-base font-medium text-gray-900 mb-4">Rating Distribution</h3>
        <div class="space-y-3">
          <div v-for="(count, label) in teamReport.summary.rating_distribution" :key="label" class="flex items-center gap-3">
            <span class="w-28 text-sm text-gray-700 truncate">{{ label }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-4 relative">
              <div class="bg-blue-500 h-4 rounded-full" :style="{ width: teamReport.summary.total_employees > 0 ? (Number(count) / teamReport.summary.total_employees * 100) + '%' : '0%' }"></div>
            </div>
            <span class="w-8 text-sm text-gray-600 text-right">{{ count }}</span>
          </div>
        </div>
      </div>

      <!-- Appraisals Table -->
      <div class="bg-white shadow rounded-lg overflow-x-auto">
        <div class="p-5 border-b border-gray-200">
          <h3 class="text-base font-medium text-gray-900">Individual Results</h3>
        </div>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Score</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="appraisal in teamReport.appraisals" :key="appraisal.id">
              <td class="px-5 py-3">
                <p class="text-sm font-medium text-gray-900">{{ appraisal.employee?.first_name }} {{ appraisal.employee?.last_name }}</p>
                <p class="text-xs text-gray-500">{{ appraisal.employee?.department }}</p>
              </td>
              <td class="px-5 py-3">
                <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(appraisal.status)]">{{ appraisal.status.replace(/_/g, ' ') }}</span>
              </td>
              <td class="px-5 py-3 text-sm text-gray-900">{{ appraisal.final_score?.toFixed(2) ?? '—' }}</td>
              <td class="px-5 py-3 text-sm text-gray-600">{{ appraisal.final_rating ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
