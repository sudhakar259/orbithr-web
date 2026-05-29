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
  <div class="pcf-page">
    <div class="pcf-header">
      <h2 class="pcf-title">{{ isEdit ? 'Edit Appraisal Cycle' : 'New Appraisal Cycle' }}</h2>
      <button class="pcf-cancel-link" @click="router.back()">Cancel</button>
    </div>

    <div v-if="loading" class="pcf-loading">
      <div v-for="i in 5" :key="i" class="pcf-skeleton"></div>
    </div>

    <form v-else class="pcf-form" @submit.prevent="handleSubmit">
      <div v-if="error" class="pcf-error">{{ error }}</div>

      <!-- Cycle Details -->
      <div class="pcf-section">
        <h3 class="pcf-section-title">Cycle Details</h3>

        <div class="pcf-field">
          <label class="pcf-label">Name <span class="pcf-required">*</span></label>
          <input v-model="form.name" required type="text" class="pcf-input" placeholder="e.g. Annual Review 2026" />
        </div>
        <div class="pcf-field">
          <label class="pcf-label">Description</label>
          <textarea v-model="form.description" rows="2" class="pcf-input pcf-textarea" />
        </div>
        <div class="pcf-grid-3">
          <div class="pcf-field">
            <label class="pcf-label">Cycle Type</label>
            <select v-model="form.cycle_type" class="pcf-input">
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="pcf-field">
            <label class="pcf-label">Start Date</label>
            <input v-model="form.start_date" required type="date" class="pcf-input" />
          </div>
          <div class="pcf-field">
            <label class="pcf-label">End Date</label>
            <input v-model="form.end_date" required type="date" class="pcf-input" />
          </div>
        </div>
        <div class="pcf-field pcf-field-narrow">
          <label class="pcf-label">Rating Scale (max)</label>
          <input v-model.number="form.rating_scale" type="number" min="2" max="10" class="pcf-input" />
        </div>
      </div>

      <!-- Review Components -->
      <div class="pcf-section">
        <h3 class="pcf-section-title">Review Components</h3>
        <div class="pcf-checkboxes">
          <label class="pcf-check-row"><input v-model="form.is_goal_setting_enabled" type="checkbox" class="pcf-checkbox" /><span>Goal Setting</span></label>
          <label class="pcf-check-row"><input v-model="form.is_self_review_enabled" type="checkbox" class="pcf-checkbox" /><span>Self Review</span></label>
          <label class="pcf-check-row"><input v-model="form.is_manager_review_enabled" type="checkbox" class="pcf-checkbox" /><span>Manager Review</span></label>
          <label class="pcf-check-row"><input v-model="form.is_360_feedback_enabled" type="checkbox" class="pcf-checkbox" /><span>360° Feedback</span></label>
        </div>
        <div class="pcf-grid-4">
          <div class="pcf-field">
            <label class="pcf-label-sm">Goal Weight (%)</label>
            <input v-model.number="form.goal_weight" type="number" min="0" max="100" class="pcf-input" />
          </div>
          <div class="pcf-field">
            <label class="pcf-label-sm">Self Review (%)</label>
            <input v-model.number="form.self_review_weight" type="number" min="0" max="100" class="pcf-input" />
          </div>
          <div class="pcf-field">
            <label class="pcf-label-sm">Manager Review (%)</label>
            <input v-model.number="form.manager_review_weight" type="number" min="0" max="100" class="pcf-input" />
          </div>
          <div class="pcf-field">
            <label class="pcf-label-sm">Feedback (%)</label>
            <input v-model.number="form.feedback_weight" type="number" min="0" max="100" class="pcf-input" />
          </div>
        </div>
      </div>

      <!-- Stages -->
      <div class="pcf-section">
        <div class="pcf-section-head">
          <h3 class="pcf-section-title">Stages</h3>
          <button type="button" class="pcf-add-link" @click="addStage">+ Add Stage</button>
        </div>
        <div v-if="stages.length === 0" class="pcf-empty">No stages defined. Stages will be auto-created based on enabled components.</div>
        <div v-for="(stage, index) in stages" :key="index" class="pcf-stage-card">
          <div class="pcf-stage-head">
            <span class="pcf-stage-num">Stage {{ index + 1 }}</span>
            <button type="button" class="pcf-remove-btn" @click="removeStage(index)">Remove</button>
          </div>
          <div class="pcf-grid-2">
            <div class="pcf-field">
              <label class="pcf-label-sm">Name</label>
              <input v-model="stage.name" type="text" class="pcf-input" />
            </div>
            <div class="pcf-field">
              <label class="pcf-label-sm">Stage Type</label>
              <select v-model="stage.stage_type" class="pcf-input">
                <option value="goal_setting">Goal Setting</option>
                <option value="self_review">Self Review</option>
                <option value="manager_review">Manager Review</option>
                <option value="calibration">Calibration</option>
                <option value="final_review">Final Review</option>
                <option value="acknowledgment">Acknowledgment</option>
              </select>
            </div>
            <div class="pcf-field">
              <label class="pcf-label-sm">Start Date</label>
              <input v-model="stage.start_date" type="date" class="pcf-input" />
            </div>
            <div class="pcf-field">
              <label class="pcf-label-sm">End Date</label>
              <input v-model="stage.end_date" type="date" class="pcf-input" />
            </div>
          </div>
        </div>
      </div>

      <div class="pcf-footer">
        <button type="button" class="pcf-btn-ghost" @click="router.back()">Cancel</button>
        <button type="submit" :disabled="saving" class="pcf-btn-primary">
          {{ saving ? 'Saving…' : (isEdit ? 'Update Cycle' : 'Create Cycle') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.pcf-page { display: flex; flex-direction: column; gap: 20px; max-width: 760px; }
.pcf-header { display: flex; align-items: center; justify-content: space-between; }
.pcf-title { font-size: 16px; font-weight: 700; color: #EEF0F4; margin: 0; }
.pcf-cancel-link { font-size: 13px; color: #7A8299; background: none; border: none; cursor: pointer; }
.pcf-cancel-link:hover { color: #EEF0F4; }
.pcf-loading { display: flex; flex-direction: column; gap: 10px; }
.pcf-skeleton { height: 38px; background: #232936; border-radius: 7px; animation: pcf-pulse 1.2s ease-in-out infinite; }
@keyframes pcf-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.pcf-form { display: flex; flex-direction: column; gap: 16px; }
.pcf-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.pcf-section { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.pcf-section-head { display: flex; align-items: center; justify-content: space-between; }
.pcf-section-title { font-size: 11px; font-weight: 600; color: #7A8299; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; }
.pcf-field { display: flex; flex-direction: column; gap: 5px; }
.pcf-field-narrow { max-width: 160px; }
.pcf-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.pcf-label-sm { font-size: 11px; color: #7A8299; }
.pcf-required { color: #F38288; }
.pcf-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.pcf-input:focus { border-color: #6B5BFF; }
.pcf-textarea { resize: vertical; min-height: 64px; }
.pcf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pcf-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.pcf-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
.pcf-checkboxes { display: flex; flex-direction: column; gap: 8px; }
.pcf-check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.pcf-checkbox { accent-color: #6B5BFF; }
.pcf-add-link { font-size: 13px; color: #6B5BFF; background: none; border: none; cursor: pointer; font-weight: 500; }
.pcf-add-link:hover { color: #8A7BFF; }
.pcf-empty { font-size: 13px; color: #7A8299; text-align: center; padding: 12px 0; }
.pcf-stage-card { background: rgba(13,15,23,0.6); border: 1px solid #232936; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.pcf-stage-head { display: flex; align-items: center; justify-content: space-between; }
.pcf-stage-num { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.pcf-remove-btn { font-size: 12px; color: #F38288; background: none; border: none; cursor: pointer; }
.pcf-remove-btn:hover { color: #ff9ea1; }
.pcf-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.pcf-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; }
.pcf-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.pcf-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.pcf-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.pcf-btn-ghost:hover { color: #EEF0F4; }
</style>
