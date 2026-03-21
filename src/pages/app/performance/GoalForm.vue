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
      <h2 class="text-lg font-medium text-white">{{ isEdit ? 'Edit Goal' : 'New Goal' }}</h2>
      <button @click="router.back()" class="text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ error }}</div>

      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Goal Details</h3>

        <div>
          <label class="block text-sm font-medium text-gray-300">Title <span class="text-red-500">*</span></label>
          <input v-model="form.title" required type="text" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" placeholder="Goal title" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300">Description</label>
          <textarea v-model="form.description" rows="3" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" placeholder="Describe the goal..." />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300">Type</label>
            <select v-model="form.type" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2">
              <option value="okr">OKR</option>
              <option value="kpi">KPI</option>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300">Level</label>
            <select v-model="form.level" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2">
              <option value="individual">Individual</option>
              <option value="team">Team</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300">Framework</label>
            <select v-model="form.framework" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2">
              <option value="smart">SMART</option>
              <option value="okr">OKR</option>
              <option value="kpi">KPI</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300">Start Date <span class="text-red-500">*</span></label>
            <input v-model="form.start_date" required type="date" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300">End Date <span class="text-red-500">*</span></label>
            <input v-model="form.end_date" required type="date" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300">Weightage (%)</label>
            <input v-model.number="form.weightage" type="number" min="1" max="100" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" />
          </div>
        </div>
      </div>

      <!-- Key Results -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Key Results</h3>
          <button type="button" @click="addKeyResult" class="text-sm text-blue-400 hover:text-blue-300 font-medium">+ Add Key Result</button>
        </div>

        <div v-if="keyResults.length === 0" class="text-sm text-gray-500 text-center py-4">No key results yet. Click "+ Add Key Result" to add one.</div>

        <div v-for="(kr, index) in keyResults" :key="index" class="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-400 uppercase">Key Result {{ index + 1 }}</span>
            <button type="button" @click="removeKeyResult(index)" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
          </div>
          <div>
            <input v-model="kr.title" type="text" placeholder="Key result title" class="block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-gray-400">Target Value</label>
              <input v-model.number="kr.target_value" type="number" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
            </div>
            <div>
              <label class="block text-xs text-gray-400">Unit</label>
              <input v-model="kr.unit" type="text" placeholder="e.g. %, $, units" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
            </div>
            <div>
              <label class="block text-xs text-gray-400">Due Date</label>
              <input v-model="kr.due_date" type="date" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button type="button" @click="router.back()" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
        <button type="submit" :disabled="saving" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {{ saving ? 'Saving...' : (isEdit ? 'Update Goal' : 'Create Goal') }}
        </button>
      </div>
    </form>
  </div>
</template>
