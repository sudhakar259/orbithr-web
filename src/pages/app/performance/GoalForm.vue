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
  <div class="pgf-page">
    <div class="pgf-header">
      <h2 class="pgf-title">{{ isEdit ? 'Edit Goal' : 'New Goal' }}</h2>
      <button class="pgf-cancel-link" @click="router.back()">Cancel</button>
    </div>

    <div v-if="loading" class="pgf-loading">
      <div v-for="i in 5" :key="i" class="pgf-skeleton"></div>
    </div>

    <form v-else class="pgf-form" @submit.prevent="handleSubmit">
      <div v-if="error" class="pgf-error">{{ error }}</div>

      <!-- Goal Details -->
      <div class="pgf-section">
        <h3 class="pgf-section-title">Goal Details</h3>

        <div class="pgf-field">
          <label class="pgf-label">Title <span class="pgf-required">*</span></label>
          <input v-model="form.title" required type="text" class="pgf-input" placeholder="Goal title" />
        </div>

        <div class="pgf-field">
          <label class="pgf-label">Description</label>
          <textarea v-model="form.description" rows="3" class="pgf-input pgf-textarea" placeholder="Describe the goal…" />
        </div>

        <div class="pgf-grid-3">
          <div class="pgf-field">
            <label class="pgf-label">Type</label>
            <select v-model="form.type" class="pgf-input">
              <option value="okr">OKR</option>
              <option value="kpi">KPI</option>
              <option value="individual">Individual</option>
              <option value="team">Team</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div class="pgf-field">
            <label class="pgf-label">Level</label>
            <select v-model="form.level" class="pgf-input">
              <option value="individual">Individual</option>
              <option value="team">Team</option>
              <option value="company">Company</option>
            </select>
          </div>
          <div class="pgf-field">
            <label class="pgf-label">Framework</label>
            <select v-model="form.framework" class="pgf-input">
              <option value="smart">SMART</option>
              <option value="okr">OKR</option>
              <option value="kpi">KPI</option>
            </select>
          </div>
        </div>

        <div class="pgf-grid-3">
          <div class="pgf-field">
            <label class="pgf-label">Start Date <span class="pgf-required">*</span></label>
            <input v-model="form.start_date" required type="date" class="pgf-input" />
          </div>
          <div class="pgf-field">
            <label class="pgf-label">End Date <span class="pgf-required">*</span></label>
            <input v-model="form.end_date" required type="date" class="pgf-input" />
          </div>
          <div class="pgf-field">
            <label class="pgf-label">Weightage (%)</label>
            <input v-model.number="form.weightage" type="number" min="1" max="100" class="pgf-input" />
          </div>
        </div>
      </div>

      <!-- Key Results -->
      <div class="pgf-section">
        <div class="pgf-section-head">
          <h3 class="pgf-section-title">Key Results</h3>
          <button type="button" class="pgf-add-link" @click="addKeyResult">+ Add Key Result</button>
        </div>

        <div v-if="keyResults.length === 0" class="pgf-empty">No key results yet. Click "+ Add Key Result" to add one.</div>

        <div v-for="(kr, index) in keyResults" :key="index" class="pgf-kr-card">
          <div class="pgf-kr-head">
            <span class="pgf-kr-num">Key Result {{ index + 1 }}</span>
            <button type="button" class="pgf-remove-btn" @click="removeKeyResult(index)">Remove</button>
          </div>
          <div class="pgf-field">
            <input v-model="kr.title" type="text" placeholder="Key result title" class="pgf-input" />
          </div>
          <div class="pgf-grid-3">
            <div class="pgf-field">
              <label class="pgf-label-sm">Target Value</label>
              <input v-model.number="kr.target_value" type="number" class="pgf-input" />
            </div>
            <div class="pgf-field">
              <label class="pgf-label-sm">Unit</label>
              <input v-model="kr.unit" type="text" placeholder="e.g. %, $, units" class="pgf-input" />
            </div>
            <div class="pgf-field">
              <label class="pgf-label-sm">Due Date</label>
              <input v-model="kr.due_date" type="date" class="pgf-input" />
            </div>
          </div>
        </div>
      </div>

      <div class="pgf-footer">
        <button type="button" class="pgf-btn-ghost" @click="router.back()">Cancel</button>
        <button type="submit" :disabled="saving" class="pgf-btn-primary">
          {{ saving ? 'Saving…' : (isEdit ? 'Update Goal' : 'Create Goal') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.pgf-page { display: flex; flex-direction: column; gap: 20px; max-width: 760px; }
.pgf-header { display: flex; align-items: center; justify-content: space-between; }
.pgf-title { font-size: 16px; font-weight: 700; color: #EEF0F4; margin: 0; }
.pgf-cancel-link { font-size: 13px; color: #7A8299; background: none; border: none; cursor: pointer; }
.pgf-cancel-link:hover { color: #EEF0F4; }
.pgf-loading { display: flex; flex-direction: column; gap: 10px; }
.pgf-skeleton { height: 38px; background: #232936; border-radius: 7px; animation: pgf-pulse 1.2s ease-in-out infinite; }
@keyframes pgf-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.pgf-form { display: flex; flex-direction: column; gap: 16px; }
.pgf-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.pgf-section { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.pgf-section-head { display: flex; align-items: center; justify-content: space-between; }
.pgf-section-title { font-size: 11px; font-weight: 600; color: #7A8299; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; }
.pgf-field { display: flex; flex-direction: column; gap: 5px; }
.pgf-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.pgf-label-sm { font-size: 11px; color: #7A8299; }
.pgf-required { color: #F38288; }
.pgf-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.pgf-input:focus { border-color: #6B5BFF; }
.pgf-textarea { resize: vertical; min-height: 72px; }
.pgf-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.pgf-add-link { font-size: 13px; color: #6B5BFF; background: none; border: none; cursor: pointer; font-weight: 500; }
.pgf-add-link:hover { color: #8A7BFF; }
.pgf-empty { font-size: 13px; color: #7A8299; text-align: center; padding: 8px 0; }
.pgf-kr-card { background: rgba(13,15,23,0.6); border: 1px solid #232936; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.pgf-kr-head { display: flex; align-items: center; justify-content: space-between; }
.pgf-kr-num { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.pgf-remove-btn { font-size: 12px; color: #F38288; background: none; border: none; cursor: pointer; }
.pgf-remove-btn:hover { color: #ff9ea1; }
.pgf-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.pgf-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; }
.pgf-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.pgf-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.pgf-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.pgf-btn-ghost:hover { color: #EEF0F4; }
</style>
