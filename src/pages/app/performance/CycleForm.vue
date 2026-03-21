<script setup lang="ts">
defineOptions({ name: 'PerformanceCycleForm' })
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { performanceService, type AppraisalCycle, type AppraisalCycleStage } from '@/services/performanceService'

const router = useRouter()
const route = useRoute()
const saving = ref(false)
const loading = ref(false)
const error = ref('')

const isEdit = ref(false)
const cycleId = ref<number | null>(null)

const form = ref({
  name: '',
  description: '',
  cycle_type: 'yearly' as AppraisalCycle['cycle_type'],
  start_date: '',
  end_date: '',
  rating_scale: 5,
  is_goal_setting_enabled: true,
  is_self_review_enabled: true,
  is_manager_review_enabled: true,
  is_360_feedback_enabled: false,
  self_review_weight: 30,
  manager_review_weight: 50,
  feedback_weight: 10,
  goal_weight: 10,
})

interface StageDraft {
  name: string
  stage_type: AppraisalCycleStage['stage_type']
  start_date: string
  end_date: string
  instructions: string
}

const stages = ref<StageDraft[]>([])

const addStage = () => {
  stages.value.push({ name: '', stage_type: 'goal_setting', start_date: '', end_date: '', instructions: '' })
}

const removeStage = (index: number) => {
  stages.value.splice(index, 1)
}

const loadCycle = async (id: number) => {
  loading.value = true
  try {
    const cycle = await performanceService.getCycle(id)
    form.value = {
      name: cycle.name,
      description: cycle.description ?? '',
      cycle_type: cycle.cycle_type,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      rating_scale: cycle.rating_scale,
      is_goal_setting_enabled: cycle.is_goal_setting_enabled,
      is_self_review_enabled: cycle.is_self_review_enabled,
      is_manager_review_enabled: cycle.is_manager_review_enabled,
      is_360_feedback_enabled: cycle.is_360_feedback_enabled,
      self_review_weight: cycle.self_review_weight,
      manager_review_weight: cycle.manager_review_weight,
      feedback_weight: cycle.feedback_weight,
      goal_weight: cycle.goal_weight,
    }
    if (cycle.stages) {
      stages.value = cycle.stages.map((s: AppraisalCycleStage) => ({
        name: s.name,
        stage_type: s.stage_type,
        start_date: s.start_date ?? '',
        end_date: s.end_date ?? '',
        instructions: s.instructions ?? '',
      }))
    }
  } catch {
    error.value = 'Failed to load cycle'
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  saving.value = true
  error.value = ''
  try {
    const payload = { ...form.value, stages: stages.value.filter(s => s.name.trim()) }
    if (isEdit.value && cycleId.value) {
      await performanceService.updateCycle(cycleId.value, payload)
    } else {
      await performanceService.createCycle(payload)
    }
    router.push({ name: 'performance.cycles' })
  } catch {
    error.value = 'Failed to save cycle. Please check your input.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const id = route.params.id
  if (id) {
    isEdit.value = true
    cycleId.value = Number(id)
    loadCycle(cycleId.value)
  }
})
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-medium text-white">{{ isEdit ? 'Edit Appraisal Cycle' : 'New Appraisal Cycle' }}</h2>
      <button @click="router.back()" class="text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ error }}</div>

      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Cycle Details</h3>

        <div>
          <label class="block text-sm font-medium text-gray-300">Name <span class="text-red-500">*</span></label>
          <input v-model="form.name" required type="text" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" placeholder="e.g. Annual Review 2026" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300">Description</label>
          <textarea v-model="form.description" rows="2" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300">Cycle Type</label>
            <select v-model="form.cycle_type" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2">
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300">Start Date</label>
            <input v-model="form.start_date" required type="date" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300">End Date</label>
            <input v-model="form.end_date" required type="date" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300">Rating Scale (max)</label>
          <input v-model.number="form.rating_scale" type="number" min="2" max="10" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-32 px-3 py-2" />
        </div>
      </div>

      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Review Components</h3>
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm text-gray-300"><input v-model="form.is_goal_setting_enabled" type="checkbox" class="rounded border-gray-600 bg-gray-700 text-blue-500" /> Goal Setting</label>
          <label class="flex items-center gap-2 text-sm text-gray-300"><input v-model="form.is_self_review_enabled" type="checkbox" class="rounded border-gray-600 bg-gray-700 text-blue-500" /> Self Review</label>
          <label class="flex items-center gap-2 text-sm text-gray-300"><input v-model="form.is_manager_review_enabled" type="checkbox" class="rounded border-gray-600 bg-gray-700 text-blue-500" /> Manager Review</label>
          <label class="flex items-center gap-2 text-sm text-gray-300"><input v-model="form.is_360_feedback_enabled" type="checkbox" class="rounded border-gray-600 bg-gray-700 text-blue-500" /> 360° Feedback</label>
        </div>
        <div class="grid grid-cols-4 gap-3 pt-2">
          <div>
            <label class="block text-xs text-gray-400">Goal Weight (%)</label>
            <input v-model.number="form.goal_weight" type="number" min="0" max="100" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
          </div>
          <div>
            <label class="block text-xs text-gray-400">Self Review (%)</label>
            <input v-model.number="form.self_review_weight" type="number" min="0" max="100" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
          </div>
          <div>
            <label class="block text-xs text-gray-400">Manager Review (%)</label>
            <input v-model.number="form.manager_review_weight" type="number" min="0" max="100" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
          </div>
          <div>
            <label class="block text-xs text-gray-400">Feedback (%)</label>
            <input v-model.number="form.feedback_weight" type="number" min="0" max="100" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
          </div>
        </div>
      </div>

      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Stages</h3>
          <button type="button" @click="addStage" class="text-sm text-blue-400 hover:text-blue-300 font-medium">+ Add Stage</button>
        </div>
        <div v-if="stages.length === 0" class="text-sm text-gray-500 text-center py-4">No stages defined. Stages will be auto-created based on enabled components.</div>
        <div v-for="(stage, index) in stages" :key="index" class="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-400 uppercase">Stage {{ index + 1 }}</span>
            <button type="button" @click="removeStage(index)" class="text-red-400 hover:text-red-300 text-sm">Remove</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-400">Name</label>
              <input v-model="stage.name" type="text" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
            </div>
            <div>
              <label class="block text-xs text-gray-400">Stage Type</label>
              <select v-model="stage.stage_type" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2">
                <option value="goal_setting">Goal Setting</option>
                <option value="self_review">Self Review</option>
                <option value="manager_review">Manager Review</option>
                <option value="calibration">Calibration</option>
                <option value="final_review">Final Review</option>
                <option value="acknowledgment">Acknowledgment</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-400">Start Date</label>
              <input v-model="stage.start_date" type="date" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
            </div>
            <div>
              <label class="block text-xs text-gray-400">End Date</label>
              <input v-model="stage.end_date" type="date" class="mt-1 block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button type="button" @click="router.back()" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
        <button type="submit" :disabled="saving" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {{ saving ? 'Saving...' : (isEdit ? 'Update Cycle' : 'Create Cycle') }}
        </button>
      </div>
    </form>
  </div>
</template>
