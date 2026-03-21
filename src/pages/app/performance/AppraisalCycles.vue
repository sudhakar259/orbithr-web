<script setup lang="ts">
defineOptions({ name: 'PerformanceAppraisalCycles' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { performanceService, type AppraisalCycle } from '@/services/performanceService'

const router = useRouter()
const loading = ref(true)
const cycles = ref<AppraisalCycle[]>([])
const error = ref('')
const filterStatus = ref('')

const loadCycles = async () => {
  loading.value = true
  try {
    const params: { status?: string } = {}
    if (filterStatus.value) params.status = filterStatus.value
    const result = await performanceService.getCycles(params)
    cycles.value = result.data
  } catch {
    error.value = 'Failed to load appraisal cycles'
  } finally {
    loading.value = false
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-700 text-gray-300',
    active: 'bg-green-900/50 text-green-400',
    locked: 'bg-yellow-900/50 text-yellow-400',
    completed: 'bg-blue-900/50 text-blue-400',
    archived: 'bg-gray-700 text-gray-400',
  }
  return colors[status] || 'bg-gray-700 text-gray-300'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadCycles())
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <select v-model="filterStatus" @change="loadCycles()" class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <button @click="router.push({ name: 'performance.cycles.create' })" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
        <svg class="-ml-1 mr-2 h-5 w-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        New Cycle
      </button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ error }}</div>

    <div v-else-if="cycles.length === 0" class="text-center py-12 text-gray-500">No appraisal cycles found.</div>

    <div v-else class="space-y-4">
      <div v-for="cycle in cycles" :key="cycle.id" class="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-colors cursor-pointer" @click="router.push({ name: 'performance.cycles.show', params: { id: cycle.id } })">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-3">
              <h3 class="text-base font-semibold text-white">{{ cycle.name }}</h3>
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(cycle.status)]">{{ cycle.status }}</span>
              <span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-indigo-900/50 text-indigo-400">{{ cycle.cycle_type.replace('_', ' ') }}</span>
            </div>
            <p v-if="cycle.description" class="mt-1 text-sm text-gray-400">{{ cycle.description }}</p>
            <p class="mt-1 text-sm text-gray-400">{{ formatDate(cycle.start_date) }} – {{ formatDate(cycle.end_date) }}</p>
          </div>
          <div class="text-right text-sm text-gray-400">
            <p v-if="cycle.employee_appraisals_count !== undefined">{{ cycle.employee_appraisals_count }} appraisals</p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2 text-xs">
          <span v-if="cycle.is_goal_setting_enabled" class="px-2 py-0.5 bg-green-900/30 text-green-400 rounded-full">Goals</span>
          <span v-if="cycle.is_self_review_enabled" class="px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-full">Self Review</span>
          <span v-if="cycle.is_manager_review_enabled" class="px-2 py-0.5 bg-purple-900/30 text-purple-400 rounded-full">Manager Review</span>
          <span v-if="cycle.is_360_feedback_enabled" class="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded-full">360 Feedback</span>
        </div>
      </div>
    </div>
  </div>
</template>
