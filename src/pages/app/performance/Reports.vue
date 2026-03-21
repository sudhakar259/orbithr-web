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
    not_started: 'bg-gray-700 text-gray-400',
    in_progress: 'bg-blue-900/50 text-blue-400',
    completed: 'bg-green-900/50 text-green-400',
    acknowledged: 'bg-teal-900/50 text-teal-400',
  }
  return colors[status] || 'bg-gray-700 text-gray-300'
}

onMounted(() => loadCycles())
</script>

<template>
  <div class="space-y-6">
    <!-- Controls -->
    <div class="flex items-center gap-4">
      <div>
        <label class="block text-xs font-medium text-gray-300 mb-1">Appraisal Cycle</label>
        <select v-model="selectedCycleId" @change="loadReport()" class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none">
          <option v-for="cycle in cycles" :key="cycle.id" :value="cycle.id">{{ cycle.name }}</option>
        </select>
      </div>
      <div class="pt-5">
        <button @click="handleCalculate" :disabled="calculating || !selectedCycleId" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
          {{ calculating ? 'Calculating...' : 'Recalculate Scores' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ error }}</div>

    <div v-else-if="cycles.length === 0" class="text-center py-12 text-gray-500">No active or completed appraisal cycles found.</div>

    <template v-else-if="teamReport">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Total Employees</p>
          <p class="mt-1 text-2xl font-semibold text-white">{{ teamReport.summary.total_employees }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Completed</p>
          <p class="mt-1 text-2xl font-semibold text-green-400">{{ teamReport.summary.completed }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">In Progress</p>
          <p class="mt-1 text-2xl font-semibold text-blue-400">{{ teamReport.summary.in_progress }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Not Started</p>
          <p class="mt-1 text-2xl font-semibold text-gray-400">{{ teamReport.summary.not_started }}</p>
        </div>
      </div>

      <!-- Score Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Average Score</p>
          <p class="mt-1 text-2xl font-semibold text-white">{{ teamReport.summary.average_score?.toFixed(2) ?? 'N/A' }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Highest Score</p>
          <p class="mt-1 text-2xl font-semibold text-green-400">{{ teamReport.summary.highest_score?.toFixed(2) ?? 'N/A' }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Lowest Score</p>
          <p class="mt-1 text-2xl font-semibold text-red-400">{{ teamReport.summary.lowest_score?.toFixed(2) ?? 'N/A' }}</p>
        </div>
      </div>

      <!-- Rating Distribution -->
      <div v-if="Object.keys(teamReport.summary.rating_distribution).length > 0" class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <h3 class="text-base font-medium text-white mb-4">Rating Distribution</h3>
        <div class="space-y-3">
          <div v-for="(count, label) in teamReport.summary.rating_distribution" :key="label" class="flex items-center gap-3">
            <span class="w-28 text-sm text-gray-300 truncate">{{ label }}</span>
            <div class="flex-1 bg-gray-700 rounded-full h-4 relative">
              <div class="bg-blue-500 h-4 rounded-full" :style="{ width: teamReport.summary.total_employees > 0 ? (Number(count) / teamReport.summary.total_employees * 100) + '%' : '0%' }"></div>
            </div>
            <span class="w-8 text-sm text-gray-400 text-right">{{ count }}</span>
          </div>
        </div>
      </div>

      <!-- Appraisals Table -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-x-auto">
        <div class="p-5 border-b border-gray-700">
          <h3 class="text-base font-medium text-white">Individual Results</h3>
        </div>
        <table class="min-w-full divide-y divide-gray-700">
          <thead class="bg-gray-800/50">
            <tr>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Employee</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Final Score</th>
              <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rating</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="appraisal in teamReport.appraisals" :key="appraisal.id" class="hover:bg-gray-700/30">
              <td class="px-5 py-3">
                <p class="text-sm font-medium text-white">{{ appraisal.employee?.first_name }} {{ appraisal.employee?.last_name }}</p>
                <p class="text-xs text-gray-400">{{ appraisal.employee?.department }}</p>
              </td>
              <td class="px-5 py-3">
                <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(appraisal.status)]">{{ appraisal.status.replace(/_/g, ' ') }}</span>
              </td>
              <td class="px-5 py-3 text-sm text-white">{{ appraisal.final_score?.toFixed(2) ?? '—' }}</td>
              <td class="px-5 py-3 text-sm text-gray-400">{{ appraisal.final_rating ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
