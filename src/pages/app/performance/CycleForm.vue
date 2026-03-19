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
      <h2 class="text-lg font-medium text-gray-900">{{ isEdit ? 'Edit Appraisal Cycle' : 'New Appraisal Cycle' }}</h2>
      <button @click="router.back()" class="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>

    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">{{ error }}</div>

      <div class="bg-white shadow rounded-lg p-6 space-y-4">
        <h3 class="text-sm font-medium text-gray-700 uppercase tracking-wide">Cycle Details</h3>

        <div>
          <label class="block text-sm font-medium text-gray-700">Name <span class="text-red-500">*</span></label>
          <input v-model="form.name" required type="text" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" placeholder="e.g. Annual Review 2026" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Description</label>
          <textarea v-model="form.description" rows="2" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Cycle Type</label>
            <select v-model="form.cycle_type" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm">
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Start Date</label>
            <input v-model="form.start_date" required type="date" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">End Date</label>
            <input v-model="form.end_date" required type="date" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Rating Scale (max)</label>
          <input v-model.number="form.rating_scale" type="number" min="2" max="10" class="mt-1 block w-32 border-gray-300 rounded-md shadow-sm text-sm" />
        </div>
      </div>

      <div class="bg-white shadow rounded-lg p-6 space-y-4">
        <h3 class="text-sm font-medium text-gray-700 uppercase tracking-wide">Review Components</h3>
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-sm text-gray-700"><input v-model="form.is_goal_setting_enabled" type="checkbox" class="rounded border-gray-300" /> Goal Setting</label>
          <label class="flex items-center gap-2 text-sm text-gray-700"><input v-model="form.is_self_review_enabled" type="checkbox" class="rounded border-gray-300" /> Self Review</label>
          <label class="flex items-center gap-2 text-sm text-gray-700"><input v-model="form.is_manager_review_enabled" type="checkbox" class="rounded border-gray-300" /> Manager Review</label>
          <label class="flex items-center gap-2 text-sm text-gray-700"><input v-model="form.is_360_feedback_enabled" type="checkbox" class="rounded border-gray-300" /> 360° Feedback</label>
        </div>
        <div class="grid grid-cols-4 gap-3 pt-2">
          <div>
            <label class="block text-xs text-gray-500">Goal Weight (%)</label>
            <input v-model.number="form.goal_weight" type="number" min="0" max="100" class="mt-1 block w-full border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-500">Self Review (%)</label>
            <input v-model.number="form.self_review_weight" type="number" min="0" max="100" class="mt-1 block w-full border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-500">Manager Review (%)</label>
            <input v-model.number="form.manager_review_weight" type="number" min="0" max="100" class="mt-1 block w-full border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-500">Feedback (%)</label>
            <input v-model.number="form.feedback_weight" type="number" min="0" max="100" class="mt-1 block w-full border-gray-300 rounded-md text-sm" />
          </div>
        </div>
      </div>

      <div class="bg-white shadow rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-700 uppercase tracking-wide">Stages</h3>
          <button type="button" @click="addStage" class="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add Stage</button>
        </div>
        <div v-if="stages.length === 0" class="text-sm text-gray-500 text-center py-4">No stages defined. Stages will be auto-created based on enabled components.</div>
        <div v-for="(stage, index) in stages" :key="index" class="border border-gray-200 rounded-md p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-gray-500 uppercase">Stage {{ index + 1 }}</span>
            <button type="button" @click="removeStage(index)" class="text-red-500 hover:text-red-700 text-sm">Remove</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500">Name</label>
              <input v-model="stage.name" type="text" class="mt-1 block w-full border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label class="block text-xs text-gray-500">Stage Type</label>
              <select v-model="stage.stage_type" class="mt-1 block w-full border-gray-300 rounded-md text-sm">
                <option value="goal_setting">Goal Setting</option>
                <option value="self_review">Self Review</option>
                <option value="manager_review">Manager Review</option>
                <option value="calibration">Calibration</option>
                <option value="final_review">Final Review</option>
                <option value="acknowledgment">Acknowledgment</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500">Start Date</label>
              <input v-model="stage.start_date" type="date" class="mt-1 block w-full border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label class="block text-xs text-gray-500">End Date</label>
              <input v-model="stage.end_date" type="date" class="mt-1 block w-full border-gray-300 rounded-md text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button type="button" @click="router.back()" class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" :disabled="saving" class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
          {{ saving ? 'Saving...' : (isEdit ? 'Update Cycle' : 'Create Cycle') }}
        </button>
      </div>
    </form>
  </div>
</template>
