<script setup lang="ts">
defineOptions({ name: 'PerformanceCycleDetail' })
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { performanceService, type AppraisalCycle, type EmployeeAppraisal } from '@/services/performanceService'

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const cycle = ref<AppraisalCycle | null>(null)
const appraisals = ref<EmployeeAppraisal[]>([])
const error = ref('')
const actionError = ref('')

const loadCycle = async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    cycle.value = await performanceService.getCycle(id)
    const result = await performanceService.getCycleAppraisals(id)
    appraisals.value = result.data
  } catch {
    error.value = 'Failed to load cycle'
  } finally {
    loading.value = false
  }
}

const handleActivate = async () => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    cycle.value = await performanceService.activateCycle(cycle.value.id)
  } catch {
    actionError.value = 'Failed to activate cycle'
  }
}

const handleInitialize = async () => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    await performanceService.initializeCycle(cycle.value.id)
    await loadCycle()
  } catch {
    actionError.value = 'Failed to initialize appraisals'
  }
}

const handleLock = async () => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    cycle.value = await performanceService.lockCycle(cycle.value.id)
  } catch {
    actionError.value = 'Failed to lock cycle'
  }
}

const handleComplete = async () => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    cycle.value = await performanceService.completeCycle(cycle.value.id)
  } catch {
    actionError.value = 'Failed to complete cycle'
  }
}

const activateStage = async (stageId: number) => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    await performanceService.activateStage(cycle.value.id, stageId)
    await loadCycle()
  } catch {
    actionError.value = 'Failed to activate stage'
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

const getAppraisalStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    not_started: 'bg-gray-700 text-gray-400',
    in_progress: 'bg-blue-900/50 text-blue-400',
    self_review_done: 'bg-indigo-900/50 text-indigo-400',
    manager_review_done: 'bg-purple-900/50 text-purple-400',
    calibration: 'bg-yellow-900/50 text-yellow-400',
    completed: 'bg-green-900/50 text-green-400',
    acknowledged: 'bg-teal-900/50 text-teal-400',
  }
  return colors[status] || 'bg-gray-700 text-gray-300'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadCycle())
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ error }}</div>

    <template v-else-if="cycle">
      <div v-if="actionError" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ actionError }}</div>

      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3">
            <button @click="router.push({ name: 'performance.cycles' })" class="text-gray-400 hover:text-white transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 class="text-xl font-semibold text-white">{{ cycle.name }}</h2>
            <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(cycle.status)]">{{ cycle.status }}</span>
          </div>
          <p class="mt-1 text-sm text-gray-400 ml-8">{{ formatDate(cycle.start_date) }} – {{ formatDate(cycle.end_date) }}</p>
        </div>
        <div class="flex gap-2">
          <button v-if="cycle.status === 'draft'" @click="handleActivate" class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">Activate</button>
          <button v-if="cycle.status === 'active' && appraisals.length === 0" @click="handleInitialize" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Initialize Appraisals</button>
          <button v-if="cycle.status === 'active'" @click="handleLock" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Lock</button>
          <button v-if="cycle.status === 'locked'" @click="handleComplete" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Complete</button>
          <button @click="router.push({ name: 'performance.cycles.create', query: { edit: cycle.id } })" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Edit</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Type</p>
          <p class="mt-1 text-sm font-medium text-white">{{ cycle.cycle_type.replace('_', ' ') }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Rating Scale</p>
          <p class="mt-1 text-sm font-medium text-white">1 – {{ cycle.rating_scale }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Total Appraisals</p>
          <p class="mt-1 text-sm font-medium text-white">{{ appraisals.length }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <p class="text-xs text-gray-400">Completed</p>
          <p class="mt-1 text-sm font-medium text-white">{{ appraisals.filter(a => a.status === 'completed' || a.status === 'acknowledged').length }}</p>
        </div>
      </div>

      <!-- Stages -->
      <div v-if="cycle.stages && cycle.stages.length > 0" class="bg-gray-800 border border-gray-700 rounded-lg">
        <div class="p-5 border-b border-gray-700">
          <h3 class="text-base font-medium text-white">Stages</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-700">
            <thead class="bg-gray-800/50">
              <tr>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Stage</th>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Period</th>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              <tr v-for="stage in cycle.stages" :key="stage.id">
                <td class="px-5 py-3 text-sm text-white">{{ stage.name }}</td>
                <td class="px-5 py-3 text-sm text-gray-400">{{ stage.stage_type.replace(/_/g, ' ') }}</td>
                <td class="px-5 py-3 text-sm text-gray-400">{{ stage.start_date ? formatDate(stage.start_date) : '—' }} – {{ stage.end_date ? formatDate(stage.end_date) : '—' }}</td>
                <td class="px-5 py-3">
                  <span v-if="stage.is_active" class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-900/50 text-green-400">Active</span>
                  <span v-else-if="stage.is_locked" class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-700 text-gray-400">Locked</span>
                  <span v-else class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-700 text-gray-400">Inactive</span>
                </td>
                <td class="px-5 py-3">
                  <button v-if="!stage.is_active && cycle.status === 'active'" @click="activateStage(stage.id)" class="text-blue-400 hover:text-blue-300 text-xs font-medium">Activate</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Appraisals -->
      <div v-if="appraisals.length > 0" class="bg-gray-800 border border-gray-700 rounded-lg">
        <div class="p-5 border-b border-gray-700">
          <h3 class="text-base font-medium text-white">Appraisals</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-700">
            <thead class="bg-gray-800/50">
              <tr>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Employee</th>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Final Score</th>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rating</th>
                <th class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              <tr v-for="appraisal in appraisals" :key="appraisal.id" class="hover:bg-gray-700/30">
                <td class="px-5 py-3">
                  <p class="text-sm font-medium text-white">{{ appraisal.employee?.first_name }} {{ appraisal.employee?.last_name }}</p>
                  <p class="text-xs text-gray-400">{{ appraisal.employee?.department }}</p>
                </td>
                <td class="px-5 py-3">
                  <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getAppraisalStatusColor(appraisal.status)]">{{ appraisal.status.replace(/_/g, ' ') }}</span>
                </td>
                <td class="px-5 py-3 text-sm text-white">{{ appraisal.final_score ?? '—' }}</td>
                <td class="px-5 py-3 text-sm text-gray-400">{{ appraisal.final_rating ?? '—' }}</td>
                <td class="px-5 py-3">
                  <button @click="router.push({ name: 'performance.appraisals.show', params: { id: appraisal.id } })" class="text-blue-400 hover:text-blue-300 text-xs font-medium">View</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
