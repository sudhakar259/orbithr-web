<script setup lang="ts">
defineOptions({ name: 'PerformanceAppraisals' })
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { performanceService, type EmployeeAppraisal } from '@/services/performanceService'

const router = useRouter()
const { roles } = useAuth()
const loading = ref(true)
const appraisals = ref<EmployeeAppraisal[]>([])
const teamAppraisals = ref<EmployeeAppraisal[]>([])
const error = ref('')
const activeTab = ref<'my' | 'team'>('my')
const filterStatus = ref('')

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const canViewTeam = computed(() => rLower.value.includes('admin') || rLower.value.includes('hr_manager') || rLower.value.includes('manager'))

const loadAppraisals = async () => {
  loading.value = true
  try {
    const params: { status?: string } = {}
    if (filterStatus.value) params.status = filterStatus.value
    const result = await performanceService.getAppraisals(params)
    appraisals.value = result.data
    if (canViewTeam.value) {
      const teamResult = await performanceService.getTeamAppraisals(params)
      teamAppraisals.value = teamResult.data
    }
  } catch {
    error.value = 'Failed to load appraisals'
  } finally {
    loading.value = false
  }
}

const displayedAppraisals = computed(() => activeTab.value === 'team' ? teamAppraisals.value : appraisals.value)

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-800',
    self_review_done: 'bg-indigo-100 text-indigo-800',
    manager_review_done: 'bg-purple-100 text-purple-800',
    calibration: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    acknowledged: 'bg-teal-100 text-teal-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadAppraisals())
</script>

<template>
  <div class="space-y-6">
    <!-- Tabs -->
    <div v-if="canViewTeam" class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-6">
        <button @click="activeTab = 'my'" :class="['py-3 px-1 border-b-2 text-sm font-medium', activeTab === 'my' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']">My Appraisals</button>
        <button @click="activeTab = 'team'" :class="['py-3 px-1 border-b-2 text-sm font-medium', activeTab === 'team' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']">Team Appraisals</button>
      </nav>
    </div>

    <div class="flex items-center gap-3">
      <select v-model="filterStatus" @change="loadAppraisals()" class="border-gray-300 rounded-md text-sm">
        <option value="">All Status</option>
        <option value="not_started">Not Started</option>
        <option value="in_progress">In Progress</option>
        <option value="self_review_done">Self Review Done</option>
        <option value="manager_review_done">Manager Review Done</option>
        <option value="completed">Completed</option>
        <option value="acknowledged">Acknowledged</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">{{ error }}</div>

    <div v-else-if="displayedAppraisals.length === 0" class="text-center py-12 text-gray-500">No appraisals found.</div>

    <div v-else class="bg-white shadow rounded-lg overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th v-if="activeTab === 'team'" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cycle</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Score</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Self Review</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="appraisal in displayedAppraisals" :key="appraisal.id" class="hover:bg-gray-50">
            <td v-if="activeTab === 'team'" class="px-6 py-4">
              <p class="text-sm font-medium text-gray-900">{{ appraisal.employee?.first_name }} {{ appraisal.employee?.last_name }}</p>
              <p class="text-xs text-gray-500">{{ appraisal.employee?.email }}</p>
            </td>
            <td class="px-6 py-4">
              <p class="text-sm font-medium text-gray-900">{{ appraisal.appraisal_cycle?.name ?? '—' }}</p>
              <p v-if="appraisal.appraisal_cycle" class="text-xs text-gray-500">{{ formatDate(appraisal.appraisal_cycle.end_date) }}</p>
            </td>
            <td class="px-6 py-4">
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(appraisal.status)]">{{ appraisal.status.replace(/_/g, ' ') }}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-900">{{ appraisal.final_score ?? '—' }}</td>
            <td class="px-6 py-4 text-sm text-gray-500">{{ appraisal.self_review_submitted_at ? formatDate(appraisal.self_review_submitted_at) : '—' }}</td>
            <td class="px-6 py-4">
              <button @click="router.push({ name: 'performance.appraisals.show', params: { id: appraisal.id } })" class="text-blue-600 hover:text-blue-900 text-sm font-medium">View</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
