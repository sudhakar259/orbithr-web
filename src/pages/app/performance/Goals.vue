<script setup lang="ts">
defineOptions({ name: 'PerformanceGoals' })
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { performanceService, type Goal } from '@/services/performanceService'

const router = useRouter()
const { roles } = useAuth()
const loading = ref(true)
const goals = ref<Goal[]>([])
const error = ref('')

const filterStatus = ref('')
const filterType = ref('')

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const canCreate = computed(
  () =>
    rLower.value.includes('admin') ||
    rLower.value.includes('hr_manager') ||
    rLower.value.includes('manager'),
)

const loadGoals = async () => {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filterStatus.value) params.status = filterStatus.value
    if (filterType.value) params.type = filterType.value
    const result = await performanceService.getGoals(params)
    goals.value = result.data
  } catch {
    error.value = 'Failed to load goals'
  } finally {
    loading.value = false
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

const getTypeBadge = (type: string) => {
  const colors: Record<string, string> = {
    okr: 'bg-purple-100 text-purple-800',
    kpi: 'bg-indigo-100 text-indigo-800',
    individual: 'bg-blue-100 text-blue-800',
    team: 'bg-teal-100 text-teal-800',
    company: 'bg-orange-100 text-orange-800',
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadGoals())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <select v-model="filterStatus" @change="loadGoals()" class="border-gray-300 rounded-md text-sm">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select v-model="filterType" @change="loadGoals()" class="border-gray-300 rounded-md text-sm">
          <option value="">All Types</option>
          <option value="okr">OKR</option>
          <option value="kpi">KPI</option>
          <option value="individual">Individual</option>
          <option value="team">Team</option>
          <option value="company">Company</option>
        </select>
      </div>
      <button
        v-if="canCreate"
        @click="router.push({ name: 'performance.goals.create' })"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
      >
        <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Goal
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">{{ error }}</div>

    <!-- Empty -->
    <div v-else-if="goals.length === 0" class="text-center py-12 text-gray-500">No goals found.</div>

    <!-- Table -->
    <div v-else class="bg-white shadow rounded-lg overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weightage</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="goal in goals" :key="goal.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <p class="text-sm font-medium text-gray-900">{{ goal.title }}</p>
              <p v-if="goal.description" class="text-xs text-gray-500 mt-1 truncate max-w-xs">{{ goal.description }}</p>
            </td>
            <td class="px-6 py-4">
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getTypeBadge(goal.type)]">
                {{ goal.type.toUpperCase() }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <div class="w-20 bg-gray-200 rounded-full h-2">
                  <div class="bg-blue-600 h-2 rounded-full" :style="{ width: goal.progress + '%' }"></div>
                </div>
                <span class="text-xs text-gray-500">{{ goal.progress }}%</span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ goal.weightage }}%</td>
            <td class="px-6 py-4">
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(goal.status)]">
                {{ goal.status.replace('_', ' ') }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(goal.end_date) }}</td>
            <td class="px-6 py-4">
              <button
                @click="router.push({ name: 'performance.goals.show', params: { id: goal.id } })"
                class="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                View
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
