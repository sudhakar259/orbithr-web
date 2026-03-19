<script setup lang="ts">
defineOptions({ name: 'PerformanceGoalDetail' })
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { performanceService, type Goal, type GoalKeyResult } from '@/services/performanceService'

const router = useRouter()
const route = useRoute()
const { roles } = useAuth()
const loading = ref(true)
const goal = ref<Goal | null>(null)
const error = ref('')
const progressLogs = ref<Array<{ id: number; previous_value: number; new_value: number; progress_percent: number; notes?: string; created_at: string; logged_by_user?: { id: number; name: string }; key_result?: GoalKeyResult }>>([])
const showLogForm = ref(false)
const logForm = ref({ key_result_id: undefined as number | undefined, new_value: 0, notes: '' })
const savingLog = ref(false)

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const canManage = computed(() => rLower.value.includes('admin') || rLower.value.includes('hr_manager') || rLower.value.includes('manager'))

const loadGoal = async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    goal.value = await performanceService.getGoal(id)
    const logs = await performanceService.getProgressLogs(id)
    progressLogs.value = logs.data
  } catch {
    error.value = 'Failed to load goal'
  } finally {
    loading.value = false
  }
}

const handlePublish = async () => {
  if (!goal.value) return
  try {
    goal.value = await performanceService.publishGoal(goal.value.id)
  } catch {
    error.value = 'Failed to publish goal'
  }
}

const handleComplete = async () => {
  if (!goal.value) return
  try {
    goal.value = await performanceService.completeGoal(goal.value.id)
  } catch {
    error.value = 'Failed to complete goal'
  }
}

const submitProgressLog = async () => {
  if (!goal.value) return
  savingLog.value = true
  try {
    await performanceService.logProgress(goal.value.id, logForm.value)
    showLogForm.value = false
    logForm.value = { key_result_id: undefined, new_value: 0, notes: '' }
    await loadGoal()
  } catch {
    error.value = 'Failed to log progress'
  } finally {
    savingLog.value = false
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const getKRStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    at_risk: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()
const formatDateTime = (d: string) => new Date(d).toLocaleString()

onMounted(() => loadGoal())
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">{{ error }}</div>

    <template v-else-if="goal">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3">
            <button @click="router.push({ name: 'performance.goals' })" class="text-gray-400 hover:text-gray-600">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 class="text-xl font-semibold text-gray-900">{{ goal.title }}</h2>
            <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(goal.status)]">
              {{ goal.status.replace('_', ' ') }}
            </span>
          </div>
          <p v-if="goal.description" class="mt-2 text-sm text-gray-500 ml-8">{{ goal.description }}</p>
        </div>
        <div v-if="canManage" class="flex gap-2">
          <button v-if="goal.status === 'draft'" @click="handlePublish" class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">Publish</button>
          <button v-if="goal.status === 'active'" @click="handleComplete" class="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">Mark Complete</button>
          <button @click="router.push({ name: 'performance.goals.show', params: { id: goal.id }, query: { edit: '1' } })" class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md">Edit</button>
        </div>
      </div>

      <!-- Meta Info -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Type</p>
          <p class="mt-1 text-sm font-medium text-gray-900 uppercase">{{ goal.type }}</p>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Framework</p>
          <p class="mt-1 text-sm font-medium text-gray-900 uppercase">{{ goal.framework }}</p>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Period</p>
          <p class="mt-1 text-sm font-medium text-gray-900">{{ formatDate(goal.start_date) }} – {{ formatDate(goal.end_date) }}</p>
        </div>
        <div class="bg-white shadow rounded-lg p-4">
          <p class="text-xs text-gray-500">Overall Progress</p>
          <div class="mt-2 flex items-center gap-2">
            <div class="flex-1 bg-gray-200 rounded-full h-2">
              <div class="bg-blue-600 h-2 rounded-full" :style="{ width: goal.progress + '%' }"></div>
            </div>
            <span class="text-sm font-medium text-gray-900">{{ goal.progress }}%</span>
          </div>
        </div>
      </div>

      <!-- Key Results -->
      <div v-if="goal.key_results && goal.key_results.length > 0" class="bg-white shadow rounded-lg">
        <div class="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-base font-medium text-gray-900">Key Results</h3>
          <button v-if="goal.status === 'active'" @click="showLogForm = !showLogForm" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Log Progress</button>
        </div>

        <!-- Log Progress Form -->
        <div v-if="showLogForm" class="p-5 border-b border-gray-200 bg-gray-50 space-y-3">
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700">Key Result (optional)</label>
              <select v-model="logForm.key_result_id" class="mt-1 block w-full border-gray-300 rounded-md text-sm">
                <option :value="undefined">Overall Goal</option>
                <option v-for="kr in goal.key_results" :key="kr.id" :value="kr.id">{{ kr.title }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">New Value</label>
              <input v-model.number="logForm.new_value" type="number" class="mt-1 block w-full border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700">Notes</label>
              <input v-model="logForm.notes" type="text" placeholder="Optional notes" class="mt-1 block w-full border-gray-300 rounded-md text-sm" />
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="submitProgressLog" :disabled="savingLog" class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
              {{ savingLog ? 'Saving...' : 'Log Progress' }}
            </button>
            <button @click="showLogForm = false" class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md">Cancel</button>
          </div>
        </div>

        <ul class="divide-y divide-gray-200">
          <li v-for="kr in goal.key_results" :key="kr.id" class="p-5">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-gray-900">{{ kr.title }}</p>
                  <span :class="['inline-flex px-1.5 py-0.5 text-xs font-medium rounded', getKRStatusColor(kr.status)]">{{ kr.status.replace(/_/g, ' ') }}</span>
                </div>
                <p v-if="kr.description" class="text-xs text-gray-500 mt-0.5">{{ kr.description }}</p>
                <div class="mt-2 flex items-center gap-3">
                  <div class="flex-1 max-w-xs bg-gray-200 rounded-full h-1.5">
                    <div class="bg-blue-600 h-1.5 rounded-full" :style="{ width: kr.progress + '%' }"></div>
                  </div>
                  <span class="text-xs text-gray-500">{{ kr.current_value }} / {{ kr.target_value }} {{ kr.unit }}</span>
                  <span class="text-xs font-medium text-gray-700">{{ kr.progress }}%</span>
                </div>
              </div>
              <div v-if="kr.due_date" class="ml-4 text-xs text-gray-500">Due: {{ formatDate(kr.due_date) }}</div>
            </div>
          </li>
        </ul>
      </div>

      <!-- Progress History -->
      <div v-if="progressLogs.length > 0" class="bg-white shadow rounded-lg">
        <div class="p-5 border-b border-gray-200">
          <h3 class="text-base font-medium text-gray-900">Progress History</h3>
        </div>
        <ul class="divide-y divide-gray-200">
          <li v-for="log in progressLogs" :key="log.id" class="p-4 flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-900">{{ log.previous_value }} → {{ log.new_value }} <span v-if="log.key_result" class="text-gray-500">({{ log.key_result.title }})</span></p>
              <p v-if="log.notes" class="text-xs text-gray-500 mt-0.5">{{ log.notes }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-blue-600">{{ log.progress_percent }}%</p>
              <p class="text-xs text-gray-400">{{ formatDateTime(log.created_at) }}</p>
              <p v-if="log.logged_by_user" class="text-xs text-gray-400">by {{ log.logged_by_user.name }}</p>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
