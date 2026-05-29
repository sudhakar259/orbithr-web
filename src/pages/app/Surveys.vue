<script setup lang="ts">
defineOptions({ name: 'EmployeeSurveys' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface SurveyQuestion {
  id?: number
  question_text: string
  question_type: 'text' | 'single_choice' | 'multiple_choice' | 'rating' | 'yes_no'
  options: string[]
}

interface Survey {
  id: number
  title: string
  description: string | null
  type: string
  status: string
  is_anonymous: boolean
  ends_at: string | null
  response_count: number
  has_responded: boolean
  questions: SurveyQuestion[]
  created_at: string
}

interface QuestionAnalytics {
  question_text: string
  question_type: string
  responses: Record<string, number>
  total: number
}

const loading = ref(true)
const surveys = ref<Survey[]>([])
const showCreateForm = ref(false)
const createStep = ref(1)
const submitting = ref(false)
const respondingSurveyId = ref<number | null>(null)
const responses = ref<Record<string, string>>({})
const analyticsId = ref<number | null>(null)
const analytics = ref<QuestionAnalytics[]>([])
const loadingAnalytics = ref(false)

const form = ref({
  title: '',
  description: '',
  type: 'general',
  is_anonymous: false,
  ends_at: '',
  questions: [
    { question_text: '', question_type: 'text' as const, options: [] as string[] },
  ] as SurveyQuestion[],
})

const surveyTypes = ['general', 'pulse', 'engagement', 'onboarding']
const questionTypes = [
  { value: 'text', label: 'Text' },
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'yes_no', label: 'Yes / No' },
]

const statusBadge: Record<string, string> = {
  draft: 'sv-badge-muted',
  active: 'sv-badge-green',
  closed: 'sv-badge-muted',
}

const typeBadge: Record<string, string> = {
  general: 'sv-badge-blue',
  pulse: 'sv-badge-purple',
  engagement: 'sv-badge-green',
  onboarding: 'sv-badge-yellow',
}

async function fetchSurveys() {
  loading.value = true
  try {
    const res = await api.get('/surveys')
    surveys.value = res.data?.data ?? res.data ?? []
  } catch {
    surveys.value = []
  } finally {
    loading.value = false
  }
}

function addQuestion() {
  form.value.questions.push({ question_text: '', question_type: 'text', options: [] })
}

function removeQuestion(idx: number) {
  if (form.value.questions.length <= 1) return
  form.value.questions.splice(idx, 1)
}

function addQuestionOption(qIdx: number) {
  form.value.questions[qIdx].options.push('')
}

function removeQuestionOption(qIdx: number, oIdx: number) {
  form.value.questions[qIdx].options.splice(oIdx, 1)
}

function needsOptions(type: string) {
  return type === 'single_choice' || type === 'multiple_choice'
}

async function createSurvey() {
  submitting.value = true
  try {
    await api.post('/surveys', form.value)
    showCreateForm.value = false
    createStep.value = 1
    form.value = {
      title: '',
      description: '',
      type: 'general',
      is_anonymous: false,
      ends_at: '',
      questions: [{ question_text: '', question_type: 'text', options: [] }],
    }
    await fetchSurveys()
  } catch {
    // error handled silently
  } finally {
    submitting.value = false
  }
}

async function publishSurvey(id: number) {
  try {
    await api.post(`/surveys/${id}/publish`)
    await fetchSurveys()
  } catch {
    // error handled silently
  }
}

function startResponse(survey: Survey) {
  respondingSurveyId.value = survey.id
  responses.value = {}
}

async function submitResponse(surveyId: number) {
  submitting.value = true
  try {
    await api.post(`/surveys/${surveyId}/respond`, { answers: responses.value })
    respondingSurveyId.value = null
    responses.value = {}
    await fetchSurveys()
  } catch {
    // error handled silently
  } finally {
    submitting.value = false
  }
}

async function viewAnalytics(surveyId: number) {
  if (analyticsId.value === surveyId) {
    analyticsId.value = null
    return
  }
  analyticsId.value = surveyId
  loadingAnalytics.value = true
  try {
    const res = await api.get(`/surveys/${surveyId}/analytics`)
    analytics.value = res.data?.data ?? res.data ?? []
  } catch {
    analytics.value = []
  } finally {
    loadingAnalytics.value = false
  }
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function maxResponseCount(resps: Record<string, number>) {
  const values = Object.values(resps)
  return Math.max(...values, 1)
}

onMounted(fetchSurveys)
</script>

<template>
  <div class="sv-page">
    <!-- Header -->
    <div class="sv-header">
      <p class="sv-desc">Create and manage employee surveys</p>
      <button class="sv-btn-primary" @click="showCreateForm = !showCreateForm; createStep = 1">
        {{ showCreateForm ? 'Cancel' : 'Create Survey' }}
      </button>
    </div>

    <!-- Create Form -->
    <div v-if="showCreateForm" class="sv-form-card">
      <!-- Step indicator -->
      <div class="sv-steps">
        <div v-for="s in 3" :key="s" :class="['sv-step', createStep >= s ? 'sv-step-active' : '']">{{ s }}</div>
        <span class="sv-step-label">
          {{ createStep === 1 ? 'Basic Info' : createStep === 2 ? 'Questions' : 'Review & Publish' }}
        </span>
      </div>

      <!-- Step 1: Basic Info -->
      <div v-if="createStep === 1" class="sv-step-content">
        <div class="sv-field">
          <label class="sv-label">Title</label>
          <input v-model="form.title" type="text" class="sv-input" placeholder="Survey title" />
        </div>
        <div class="sv-field">
          <label class="sv-label">Description</label>
          <textarea v-model="form.description" rows="2" class="sv-input sv-textarea" placeholder="Brief description…" />
        </div>
        <div class="sv-form-grid">
          <div class="sv-field">
            <label class="sv-label">Type</label>
            <select v-model="form.type" class="sv-input">
              <option v-for="t in surveyTypes" :key="t" :value="t">{{ t.charAt(0).toUpperCase() + t.slice(1) }}</option>
            </select>
          </div>
          <div class="sv-field">
            <label class="sv-label">Ends At</label>
            <input v-model="form.ends_at" type="date" class="sv-input" />
          </div>
        </div>
        <label class="sv-checkbox-row">
          <input v-model="form.is_anonymous" type="checkbox" class="sv-checkbox" />
          Anonymous responses
        </label>
        <div class="sv-step-actions sv-justify-end">
          <button class="sv-btn-primary" @click="createStep = 2">Next</button>
        </div>
      </div>

      <!-- Step 2: Questions -->
      <div v-else-if="createStep === 2" class="sv-step-content">
        <div v-for="(q, qIdx) in form.questions" :key="qIdx" class="sv-question-block">
          <div class="sv-question-head">
            <span class="sv-question-num">Question {{ qIdx + 1 }}</span>
            <button v-if="form.questions.length > 1" class="sv-btn-rm-q" @click="removeQuestion(qIdx)">Remove</button>
          </div>
          <input v-model="q.question_text" type="text" class="sv-input" placeholder="Enter your question" />
          <select v-model="q.question_type" class="sv-input sv-select-inline">
            <option v-for="qt in questionTypes" :key="qt.value" :value="qt.value">{{ qt.label }}</option>
          </select>
          <div v-if="needsOptions(q.question_type)" class="sv-options">
            <div v-for="(_, oIdx) in q.options" :key="oIdx" class="sv-option-row">
              <input v-model="q.options[oIdx]" type="text" :placeholder="'Option ' + (oIdx + 1)" class="sv-input sv-input-flex" />
              <button class="sv-btn-rm-opt" @click="removeQuestionOption(qIdx, oIdx)">Remove</button>
            </div>
            <button class="sv-btn-link" @click="addQuestionOption(qIdx)">+ Add Option</button>
          </div>
        </div>
        <button class="sv-btn-link" @click="addQuestion">+ Add Question</button>
        <div class="sv-step-actions sv-justify-between">
          <button class="sv-btn-ghost" @click="createStep = 1">Back</button>
          <button class="sv-btn-primary" @click="createStep = 3">Next</button>
        </div>
      </div>

      <!-- Step 3: Review -->
      <div v-else class="sv-step-content">
        <div class="sv-review-card">
          <p class="sv-review-row"><span class="sv-review-key">Title</span><span class="sv-review-val">{{ form.title }}</span></p>
          <p class="sv-review-row"><span class="sv-review-key">Type</span><span class="sv-review-val sv-capitalize">{{ form.type }}</span></p>
          <p class="sv-review-row"><span class="sv-review-key">Questions</span><span class="sv-review-val">{{ form.questions.length }}</span></p>
          <p class="sv-review-row"><span class="sv-review-key">Anonymous</span><span class="sv-review-val">{{ form.is_anonymous ? 'Yes' : 'No' }}</span></p>
          <p v-if="form.ends_at" class="sv-review-row"><span class="sv-review-key">Ends</span><span class="sv-review-val">{{ form.ends_at }}</span></p>
        </div>
        <div class="sv-q-review-list">
          <div v-for="(q, idx) in form.questions" :key="idx" class="sv-q-review-item">
            <p class="sv-q-review-text">{{ idx + 1 }}. {{ q.question_text }} <span class="sv-q-type">({{ q.question_type }})</span></p>
            <ul v-if="q.options.length" class="sv-q-opts">
              <li v-for="(o, oIdx) in q.options" :key="oIdx">{{ o }}</li>
            </ul>
          </div>
        </div>
        <div class="sv-step-actions sv-justify-between">
          <button class="sv-btn-ghost" @click="createStep = 2">Back</button>
          <button :disabled="submitting" class="sv-btn-primary" @click="createSurvey">
            {{ submitting ? 'Creating…' : 'Create Survey' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="sv-card sv-loading">
      <div v-for="i in 3" :key="i" class="sv-skeleton"></div>
    </div>

    <!-- Surveys List -->
    <div v-else-if="surveys.length" class="sv-list">
      <div v-for="survey in surveys" :key="survey.id" class="sv-survey-card">
        <div class="sv-survey-head">
          <div class="sv-survey-info">
            <h3 class="sv-survey-title">{{ survey.title }}</h3>
            <p v-if="survey.description" class="sv-survey-desc">{{ survey.description }}</p>
          </div>
          <div class="sv-survey-badges">
            <span :class="['sv-badge', typeBadge[survey.type] ?? 'sv-badge-blue']">{{ survey.type }}</span>
            <span :class="['sv-badge', statusBadge[survey.status] ?? 'sv-badge-muted']">{{ survey.status }}</span>
          </div>
        </div>

        <div class="sv-survey-meta">
          <span>{{ survey.response_count }} response{{ survey.response_count !== 1 ? 's' : '' }}</span>
          <span>Created {{ formatDate(survey.created_at) }}</span>
          <span v-if="survey.ends_at">Ends {{ formatDate(survey.ends_at) }}</span>
        </div>

        <div class="sv-survey-actions">
          <button v-if="survey.status === 'draft'" class="sv-btn-publish" @click="publishSurvey(survey.id)">Publish</button>
          <button v-if="survey.status === 'active' && !survey.has_responded" class="sv-btn-take" @click="startResponse(survey)">Take Survey</button>
          <span v-if="survey.has_responded" class="sv-responded">Responded</span>
          <button class="sv-btn-analytics" @click="viewAnalytics(survey.id)">
            {{ analyticsId === survey.id ? 'Hide Analytics' : 'Analytics' }}
          </button>
        </div>

        <!-- Response Form -->
        <div v-if="respondingSurveyId === survey.id" class="sv-response-panel">
          <div class="sv-panel-title">Your Responses</div>
          <div v-for="(q, qIdx) in survey.questions" :key="qIdx" class="sv-response-q">
            <p class="sv-response-q-text">{{ qIdx + 1 }}. {{ q.question_text }}</p>
            <input v-if="q.question_type === 'text'" v-model="responses[String(q.id ?? qIdx)]" type="text" placeholder="Your answer" class="sv-input" />
            <div v-else-if="q.question_type === 'single_choice'" class="sv-radio-group">
              <label v-for="(opt, oIdx) in q.options" :key="oIdx" class="sv-radio-row">
                <input v-model="responses[String(q.id ?? qIdx)]" type="radio" :name="'q-' + (q.id ?? qIdx)" :value="opt" />
                {{ opt }}
              </label>
            </div>
            <div v-else-if="q.question_type === 'multiple_choice'" class="sv-radio-group">
              <label v-for="(opt, oIdx) in q.options" :key="oIdx" class="sv-radio-row">
                <input
                  type="checkbox"
                  :value="opt"
                  @change="(e) => {
                    const target = e.target as HTMLInputElement
                    const key = String(q.id ?? qIdx)
                    const current = responses[key] || ''
                    const arr = current ? current.split('|||') : []
                    if (target.checked) { responses[key] = [...arr, opt].join('|||') }
                    else { responses[key] = arr.filter((v: string) => v !== opt).join('|||') }
                  }"
                />
                {{ opt }}
              </label>
            </div>
            <div v-else-if="q.question_type === 'rating'" class="sv-rating-row">
              <button
                v-for="n in 5"
                :key="n"
                :class="['sv-rating-btn', responses[String(q.id ?? qIdx)] === String(n) ? 'sv-rating-active' : '']"
                @click="responses[String(q.id ?? qIdx)] = String(n)"
              >{{ n }}</button>
            </div>
            <div v-else-if="q.question_type === 'yes_no'" class="sv-yn-row">
              <button
                v-for="opt in ['Yes', 'No']"
                :key="opt"
                :class="['sv-yn-btn', responses[String(q.id ?? qIdx)] === opt ? 'sv-yn-active' : '']"
                @click="responses[String(q.id ?? qIdx)] = opt"
              >{{ opt }}</button>
            </div>
          </div>
          <div class="sv-response-actions">
            <button :disabled="submitting" class="sv-btn-primary" @click="submitResponse(survey.id)">{{ submitting ? 'Submitting…' : 'Submit' }}</button>
            <button class="sv-btn-ghost" @click="respondingSurveyId = null">Cancel</button>
          </div>
        </div>

        <!-- Analytics -->
        <div v-if="analyticsId === survey.id" class="sv-analytics-panel">
          <div v-if="loadingAnalytics" class="sv-loading-small">
            <div class="sv-spinner"></div>
          </div>
          <template v-else-if="analytics.length">
            <div v-for="(qa, idx) in analytics" :key="idx" class="sv-analytics-q">
              <p class="sv-analytics-q-text">{{ idx + 1 }}. {{ qa.question_text }} <span class="sv-analytics-total">({{ qa.total }} responses)</span></p>
              <div v-for="(count, answer) in qa.responses" :key="String(answer)" class="sv-analytics-bar-row">
                <div class="sv-analytics-bar-label-row">
                  <span class="sv-analytics-answer">{{ answer }}</span>
                  <span class="sv-analytics-count">{{ count }} ({{ qa.total ? Math.round((count / qa.total) * 100) : 0 }}%)</span>
                </div>
                <div class="sv-analytics-track">
                  <div class="sv-analytics-fill" :style="{ width: (count / maxResponseCount(qa.responses)) * 100 + '%' }"></div>
                </div>
              </div>
            </div>
          </template>
          <p v-else class="sv-analytics-empty">No analytics available</p>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="sv-empty">
      <p class="sv-empty-title">No surveys found</p>
      <p class="sv-empty-sub">Create a survey to get started</p>
    </div>
  </div>
</template>

<style scoped>
.sv-page { display: flex; flex-direction: column; gap: 16px; }
.sv-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sv-desc { font-size: 13px; color: #7A8299; margin: 0; }
.sv-btn-primary { display: inline-flex; align-items: center; gap: 6px; background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.sv-btn-primary:hover { opacity: 0.88; }
.sv-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.sv-btn-ghost { background: transparent; border: 1px solid #232936; color: #7A8299; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.sv-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.sv-form-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.sv-steps { display: flex; align-items: center; gap: 8px; }
.sv-step { width: 28px; height: 28px; border-radius: 50%; background: #232936; color: #7A8299; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.sv-step-active { background: #6B5BFF; color: #fff; }
.sv-step-label { font-size: 13px; color: #B6BED0; margin-left: 4px; }
.sv-step-content { display: flex; flex-direction: column; gap: 12px; }
.sv-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sv-field { display: flex; flex-direction: column; gap: 5px; }
.sv-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.sv-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.sv-input:focus { border-color: #6B5BFF; }
.sv-textarea { resize: vertical; min-height: 70px; }
.sv-select-inline { width: auto; }
.sv-input-flex { flex: 1; }
.sv-checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.sv-checkbox { accent-color: #6B5BFF; }
.sv-step-actions { display: flex; gap: 10px; }
.sv-justify-end { justify-content: flex-end; }
.sv-justify-between { justify-content: space-between; }
.sv-question-block { background: rgba(255,255,255,0.02); border: 1px solid #232936; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.sv-question-head { display: flex; align-items: center; justify-content: space-between; }
.sv-question-num { font-size: 12px; font-weight: 500; color: #B6BED0; }
.sv-btn-rm-q { background: none; border: none; color: #F38288; font-size: 12px; cursor: pointer; }
.sv-btn-rm-q:hover { text-decoration: underline; }
.sv-options { display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
.sv-option-row { display: flex; align-items: center; gap: 8px; }
.sv-btn-rm-opt { background: none; border: none; color: #F38288; font-size: 12px; cursor: pointer; white-space: nowrap; }
.sv-btn-link { background: none; border: none; color: #8A7BFF; font-size: 12px; cursor: pointer; text-align: left; padding: 0; }
.sv-btn-link:hover { text-decoration: underline; }
.sv-review-card { background: rgba(255,255,255,0.02); border: 1px solid #232936; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 6px; }
.sv-review-row { display: flex; gap: 8px; font-size: 13px; margin: 0; }
.sv-review-key { color: #7A8299; min-width: 80px; }
.sv-review-val { color: #EEF0F4; }
.sv-capitalize { text-transform: capitalize; }
.sv-q-review-list { display: flex; flex-direction: column; gap: 6px; }
.sv-q-review-item { background: rgba(255,255,255,0.02); border: 1px solid #232936; border-radius: 6px; padding: 10px; }
.sv-q-review-text { font-size: 13px; color: #EEF0F4; margin: 0; }
.sv-q-type { color: #7A8299; font-size: 11px; }
.sv-q-opts { margin: 6px 0 0 16px; padding: 0; font-size: 12px; color: #7A8299; list-style: disc; }
.sv-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; }
.sv-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.sv-skeleton { height: 60px; background: #232936; border-radius: 6px; animation: sv-pulse 1.2s ease-in-out infinite; }
@keyframes sv-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.sv-list { display: flex; flex-direction: column; gap: 10px; }
.sv-survey-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.sv-survey-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.sv-survey-info { flex: 1; min-width: 0; }
.sv-survey-title { font-size: 14px; font-weight: 600; color: #EEF0F4; margin: 0; }
.sv-survey-desc { font-size: 12px; color: #7A8299; margin: 4px 0 0; }
.sv-survey-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.sv-survey-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: #7A8299; }
.sv-survey-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sv-btn-publish { background: rgba(77,211,154,0.12); border: 1px solid rgba(77,211,154,0.25); color: #4DD39A; border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 500; cursor: pointer; }
.sv-btn-publish:hover { background: rgba(77,211,154,0.22); }
.sv-btn-take { background: rgba(107,91,255,0.12); border: 1px solid rgba(107,91,255,0.25); color: #8A7BFF; border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 500; cursor: pointer; }
.sv-btn-take:hover { background: rgba(107,91,255,0.22); }
.sv-responded { font-size: 12px; color: #4DD39A; }
.sv-btn-analytics { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; }
.sv-btn-analytics:hover { background: #2D3448; }
.sv-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.sv-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.sv-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.sv-badge-purple { background: rgba(178,141,255,0.12); color: #B28DFF; }
.sv-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.sv-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.sv-response-panel { background: rgba(255,255,255,0.02); border: 1px solid #232936; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.sv-panel-title { font-size: 12px; font-weight: 600; color: #EEF0F4; text-transform: uppercase; letter-spacing: 0.06em; }
.sv-response-q { display: flex; flex-direction: column; gap: 8px; }
.sv-response-q-text { font-size: 13px; color: #B6BED0; margin: 0; }
.sv-radio-group { display: flex; flex-direction: column; gap: 4px; }
.sv-radio-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.sv-rating-row { display: flex; gap: 6px; }
.sv-rating-btn { width: 32px; height: 32px; border: 1px solid #232936; background: #0D0F17; color: #7A8299; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; }
.sv-rating-active { border-color: #6B5BFF; background: rgba(107,91,255,0.15); color: #8A7BFF; }
.sv-yn-row { display: flex; gap: 8px; }
.sv-yn-btn { border: 1px solid #232936; background: #0D0F17; color: #7A8299; border-radius: 7px; padding: 6px 18px; font-size: 13px; cursor: pointer; }
.sv-yn-active { border-color: #6B5BFF; background: rgba(107,91,255,0.15); color: #8A7BFF; }
.sv-response-actions { display: flex; gap: 10px; }
.sv-analytics-panel { background: rgba(255,255,255,0.02); border: 1px solid #232936; border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 14px; }
.sv-loading-small { display: flex; justify-content: center; padding: 16px; }
.sv-spinner { width: 20px; height: 20px; border: 2px solid #232936; border-top-color: #6B5BFF; border-radius: 50%; animation: sv-spin 0.8s linear infinite; }
@keyframes sv-spin { to { transform: rotate(360deg); } }
.sv-analytics-q { display: flex; flex-direction: column; gap: 8px; }
.sv-analytics-q-text { font-size: 13px; font-weight: 500; color: #EEF0F4; margin: 0; }
.sv-analytics-total { font-size: 11px; color: #7A8299; font-weight: 400; }
.sv-analytics-bar-row { display: flex; flex-direction: column; gap: 3px; }
.sv-analytics-bar-label-row { display: flex; justify-content: space-between; }
.sv-analytics-answer { font-size: 12px; color: #B6BED0; }
.sv-analytics-count { font-size: 12px; color: #7A8299; }
.sv-analytics-track { height: 6px; background: #232936; border-radius: 4px; overflow: hidden; }
.sv-analytics-fill { height: 100%; background: #6B5BFF; border-radius: 4px; transition: width 0.3s; }
.sv-analytics-empty { font-size: 13px; color: #7A8299; text-align: center; margin: 0; }
.sv-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 64px 24px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.sv-empty-title { font-size: 14px; color: #B6BED0; margin: 0; }
.sv-empty-sub { font-size: 13px; color: #7A8299; margin: 0; }
</style>
