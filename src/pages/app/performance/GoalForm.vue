<script setup lang="ts">
defineOptions({ name: 'PerformanceGoalForm' })
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { performanceService, type Goal, type GoalKeyResult } from '@/services/performanceService'

const router = useRouter()
const route = useRoute()
const saving = ref(false)
const loading = ref(false)
const error = ref('')

const isEdit = ref(false)
const goalId = ref<number | null>(null)

const form = ref({
  title: '',
  description: '',
  type: 'individual' as Goal['type'],
  level: 'individual' as Goal['level'],
  framework: 'smart' as Goal['framework'],
  start_date: '',
  end_date: '',
  weightage: 100,
  status: 'draft' as Goal['status'],
})

interface KeyResultDraft {
  title: string
  description: string
  target_value: number
  unit: string
  weightage: number
  due_date: string
}

const keyResults = ref<KeyResultDraft[]>([])

const addKeyResult = () => {
  keyResults.value.push({ title: '', description: '', target_value: 100, unit: '', weightage: 100, due_date: '' })
}

const removeKeyResult = (index: number) => {
  keyResults.value.splice(index, 1)
}

const loadGoal = async (id: number) => {
  loading.value = true
  try {
    const goal = await performanceService.getGoal(id)
    form.value = {
      title: goal.title,
      description: goal.description ?? '',
      type: goal.type,
      level: goal.level,
      framework: goal.framework,
      start_date: goal.start_date,
      end_date: goal.end_date,
      weightage: goal.weightage,
      status: goal.status,
    }
    if (goal.key_results) {
      keyResults.value = goal.key_results.map((kr: GoalKeyResult) => ({
        title: kr.title,
        description: kr.description ?? '',
        target_value: kr.target_value,
        unit: kr.unit ?? '',
        weightage: kr.weightage,
        due_date: kr.due_date ?? '',
      }))
    }
  } catch {
    error.value = 'Failed to load goal'
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      ...form.value,
      key_results: keyResults.value.filter(kr => kr.title.trim()),
    }
    if (isEdit.value && goalId.value) {
      await performanceService.updateGoal(goalId.value, payload)
    } else {
      await performanceService.createGoal(payload)
    }
    router.push({ name: 'performance.goals' })
  } catch {
    error.value = 'Failed to save goal. Please check your input.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const id = route.params.id
  if (id) {
    isEdit.value = true
    goalId.value = Number(id)
    loadGoal(goalId.value)
  }
})
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-medium text-gray-900">{{ isEdit ? 'Edit Goal' : 'New Goal' }}</h2>
      <button @click="router.back()" class="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">{{ error }}</div>

      <div class="bg-white shadow rounded-lg p-6 space-y-4">
        <h3 class="text-sm font-medium text-gray-700 uppercase tracking-wide">Goal Details</h3>

        <div>
          <label class="block text-sm font-medium text-gray-700">Title <span class="text-red-500">*</span></label>
          <input v-model="form.title" required type="text" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Goal title" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Description</label>
          <textarea v-model="form.description" rows="3" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Describe the goal..." />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Type</label>
            <select v-model="form.type" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
              <option value="okr">OKR</option>
              <option value="kpi">KPI</option>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Level</label>
            <select v-model="form.level" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
              <option value="individual">Individual</option>
              <option value="team">Team</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Framework</label>
            <select v-model="form.framework" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
              <option value="smart">SMART</option>
              <option value="okr">OKR</option>
              <option value="kpi">KPI</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Start Date <span class="text-red-500">*</span></label>
            <input v-model="form.start_date" required type="date" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">End Date <span class="text-red-500">*</span></label>
            <input v-model="form.end_date" required type="date" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Weightage (%)</label>
            <input v-model.number="form.weightage" type="number" min="1" max="100" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
          </div>
        </div>
      </div>

      <!-- Key Results -->
      <div class="bg-white shadow rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-700 uppercase tracking-wide">Key Results</h3>
          <button type="button" @click="addKeyResult" class="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add Key Result</button>
        </div>

        <div v-if="keyResults.length === 0" class="text-sm text-gray-500 text-center py-4">No key results yet. Click "+ Add Key Result" to add one.</div>

        <div v-for="(kr, index) in keyResults" :key="index" class="border border-gray-200 rounded-md p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-500 uppercase">Key Result {{ index + 1 }}</span>
            <button type="button" @click="removeKeyResult(index)" class="text-red-500 hover:text-red-700 text-sm">Remove</button>
          </div>
          <div>
            <input v-model="kr.title" type="text" placeholder="Key result title" class="block w-full border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-gray-500">Target Value</label>
              <input v-model.number="kr.target_value" type="number" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
            </div>
            <div>
              <label class="block text-xs text-gray-500">Unit</label>
              <input v-model="kr.unit" type="text" placeholder="e.g. %, $, units" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
            </div>
            <div>
              <label class="block text-xs text-gray-500">Due Date</label>
              <input v-model="kr.due_date" type="date" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button type="button" @click="router.back()" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" :disabled="saving" class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
          {{ saving ? 'Saving...' : (isEdit ? 'Update Goal' : 'Create Goal') }}
        </button>
      </div>
    </form>
  </div>
</template>
