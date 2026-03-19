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
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    locked: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-500',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadCycles())
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <select v-model="filterStatus" @change="loadCycles()" class="border-gray-300 rounded-md text-sm">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <button @click="router.push({ name: 'performance.cycles.create' })" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
        <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        New Cycle
      </button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">{{ error }}</div>

    <div v-else-if="cycles.length === 0" class="text-center py-12 text-gray-500">No appraisal cycles found.</div>

    <div v-else class="space-y-4">
      <div v-for="cycle in cycles" :key="cycle.id" class="bg-white shadow rounded-lg p-5 hover:shadow-md transition-shadow cursor-pointer" @click="router.push({ name: 'performance.cycles.show', params: { id: cycle.id } })">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-3">
              <h3 class="text-base font-semibold text-gray-900">{{ cycle.name }}</h3>
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(cycle.status)]">{{ cycle.status }}</span>
              <span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800">{{ cycle.cycle_type.replace('_', ' ') }}</span>
            </div>
            <p v-if="cycle.description" class="mt-1 text-sm text-gray-500">{{ cycle.description }}</p>
            <p class="mt-1 text-sm text-gray-500">{{ formatDate(cycle.start_date) }} – {{ formatDate(cycle.end_date) }}</p>
          </div>
          <div class="text-right text-sm text-gray-500">
            <p v-if="cycle.employee_appraisals_count !== undefined">{{ cycle.employee_appraisals_count }} appraisals</p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2 text-xs">
          <span v-if="cycle.is_goal_setting_enabled" class="px-2 py-0.5 bg-green-50 text-green-700 rounded-full">Goals</span>
          <span v-if="cycle.is_self_review_enabled" class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">Self Review</span>
          <span v-if="cycle.is_manager_review_enabled" class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full">Manager Review</span>
          <span v-if="cycle.is_360_feedback_enabled" class="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full">360 Feedback</span>
        </div>
      </div>
    </div>
  </div>
</template>
