<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { performanceService, type PerformanceDashboard } from '@/services/performanceService'

const router = useRouter()
const loading = ref(true)
const dashboard = ref<PerformanceDashboard | null>(null)
const error = ref('')

const loadDashboard = async () => {
  loading.value = true
  try {
    dashboard.value = await performanceService.getDashboard()
  } catch (err: unknown) {
    error.value = 'Failed to load dashboard data'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadDashboard())
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ error }}</div>

    <template v-else-if="dashboard">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0 rounded-md bg-blue-900/50 p-3">
              <svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div class="ml-5">
              <p class="text-sm font-medium text-gray-400">Active Goals</p>
              <p class="text-2xl font-semibold text-white">{{ dashboard.active_goals }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0 rounded-md bg-yellow-900/50 p-3">
              <svg class="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div class="ml-5">
              <p class="text-sm font-medium text-gray-400">Pending Appraisals</p>
              <p class="text-2xl font-semibold text-white">{{ dashboard.pending_appraisals }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0 rounded-md bg-purple-900/50 p-3">
              <svg class="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div class="ml-5">
              <p class="text-sm font-medium text-gray-400">Feedback Requests</p>
              <p class="text-2xl font-semibold text-white">{{ dashboard.feedback_requests }}</p>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div class="flex items-center">
            <div class="flex-shrink-0 rounded-md bg-green-900/50 p-3">
              <svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div class="ml-5">
              <p class="text-sm font-medium text-gray-400">Avg Team Score</p>
              <p class="text-2xl font-semibold text-white">{{ dashboard.avg_team_score ?? 'N/A' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex flex-wrap gap-3">
        <button @click="router.push({ name: 'performance.goals.create' })" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          New Goal
        </button>
        <button @click="router.push({ name: 'performance.appraisals' })" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">
          View Appraisals
        </button>
        <button @click="router.push({ name: 'performance.feedback' })" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">
          Give Feedback
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Goals -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg">
          <div class="p-5 border-b border-gray-700">
            <h3 class="text-lg font-medium text-white">Recent Goals</h3>
          </div>
          <ul v-if="dashboard.recent_goals.length" class="divide-y divide-gray-700">
            <li v-for="goal in dashboard.recent_goals" :key="goal.id" class="p-4 hover:bg-gray-700/30 cursor-pointer" @click="router.push({ name: 'performance.goals.show', params: { id: goal.id } })">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-white truncate">{{ goal.title }}</p>
                  <p class="text-xs text-gray-400 mt-1">Due: {{ formatDate(goal.end_date) }}</p>
                </div>
                <div class="ml-4 flex items-center gap-3">
                  <div class="w-24 bg-gray-700 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full" :style="{ width: goal.progress + '%' }"></div>
                  </div>
                  <span class="text-xs text-gray-400 w-10 text-right">{{ goal.progress }}%</span>
                </div>
              </div>
            </li>
          </ul>
          <div v-else class="p-8 text-center text-gray-500 text-sm">No active goals</div>
        </div>

        <!-- Upcoming Deadlines -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg">
          <div class="p-5 border-b border-gray-700">
            <h3 class="text-lg font-medium text-white">Upcoming Deadlines</h3>
            <p v-if="dashboard.active_cycle" class="text-sm text-gray-400 mt-1">{{ dashboard.active_cycle.name }}</p>
          </div>
          <ul v-if="dashboard.upcoming_deadlines.length" class="divide-y divide-gray-700">
            <li v-for="stage in dashboard.upcoming_deadlines" :key="stage.id" class="p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-white">{{ stage.name }}</p>
                  <p class="text-xs text-gray-400 mt-1">{{ stage.stage_type.replace(/_/g, ' ') }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-300">{{ stage.end_date ? formatDate(stage.end_date) : 'No deadline' }}</p>
                  <span v-if="stage.is_active" class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-900/50 text-green-400">Active</span>
                </div>
              </div>
            </li>
          </ul>
          <div v-else class="p-8 text-center text-gray-500 text-sm">No upcoming deadlines</div>
        </div>
      </div>
    </template>
  </div>
</template>
