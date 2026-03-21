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

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  active: 'bg-green-500/20 text-green-400',
  closed: 'bg-gray-500/20 text-gray-500',
}

const typeColors: Record<string, string> = {
  general: 'bg-blue-500/20 text-blue-400',
  pulse: 'bg-purple-500/20 text-purple-400',
  engagement: 'bg-green-500/20 text-green-400',
  onboarding: 'bg-yellow-500/20 text-yellow-400',
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

function maxResponseCount(responses: Record<string, number>) {
  const values = Object.values(responses)
  return Math.max(...values, 1)
}

onMounted(fetchSurveys)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Surveys</h1>
        <p class="mt-1 text-sm text-gray-400">Create and manage employee surveys</p>
      </div>
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        @click="
          showCreateForm = !showCreateForm;
          createStep = 1
        "
      >
        {{ showCreateForm ? 'Cancel' : 'Create Survey' }}
      </button>
    </div>

    <!-- Create Survey Multi-Step Form -->
    <div
      v-if="showCreateForm"
      class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4"
    >
      <!-- Step indicator -->
      <div class="flex items-center gap-2">
        <div
          v-for="s in 3"
          :key="s"
          :class="[
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
            createStep >= s ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400',
          ]"
        >
          {{ s }}
        </div>
        <span class="ml-2 text-sm text-gray-400">
          {{ createStep === 1 ? 'Basic Info' : createStep === 2 ? 'Questions' : 'Review & Publish' }}
        </span>
      </div>

      <!-- Step 1: Basic Info -->
      <div v-if="createStep === 1" class="space-y-4">
        <div>
          <label class="mb-1 block text-sm text-gray-400">Title</label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="Survey title"
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-400">Description</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="Brief description..."
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm text-gray-400">Type</label>
            <select
              v-model="form.type"
              class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white capitalize"
            >
              <option v-for="t in surveyTypes" :key="t" :value="t">
                {{ t.charAt(0).toUpperCase() + t.slice(1) }}
              </option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-400">Ends At</label>
            <input
              v-model="form.ends_at"
              type="date"
              class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-300">
          <input
            v-model="form.is_anonymous"
            type="checkbox"
            class="rounded border-gray-600 bg-gray-700"
          />
          Anonymous responses
        </label>
        <div class="flex justify-end">
          <button
            class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            @click="createStep = 2"
          >
            Next
          </button>
        </div>
      </div>

      <!-- Step 2: Questions -->
      <div v-else-if="createStep === 2" class="space-y-4">
        <div
          v-for="(q, qIdx) in form.questions"
          :key="qIdx"
          class="rounded-lg border border-gray-600 bg-gray-700/50 p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-300">Question {{ qIdx + 1 }}</span>
            <button
              v-if="form.questions.length > 1"
              class="text-xs text-red-400 hover:text-red-300"
              @click="removeQuestion(qIdx)"
            >
              Remove
            </button>
          </div>
          <input
            v-model="q.question_text"
            type="text"
            placeholder="Enter your question"
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
          />
          <select
            v-model="q.question_type"
            class="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
          >
            <option v-for="qt in questionTypes" :key="qt.value" :value="qt.value">
              {{ qt.label }}
            </option>
          </select>
          <!-- Options for choice types -->
          <div v-if="needsOptions(q.question_type)" class="space-y-2">
            <div v-for="(_, oIdx) in q.options" :key="oIdx" class="flex items-center gap-2">
              <input
                v-model="q.options[oIdx]"
                type="text"
                :placeholder="'Option ' + (oIdx + 1)"
                class="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500"
              />
              <button class="text-xs text-red-400" @click="removeQuestionOption(qIdx, oIdx)">
                Remove
              </button>
            </div>
            <button
              class="text-sm text-blue-400 hover:text-blue-300"
              @click="addQuestionOption(qIdx)"
            >
              + Add Option
            </button>
          </div>
        </div>
        <button class="text-sm text-blue-400 hover:text-blue-300" @click="addQuestion">
          + Add Question
        </button>
        <div class="flex justify-between">
          <button
            class="rounded-lg border border-gray-600 bg-gray-700 px-6 py-2 text-sm text-gray-300 hover:bg-gray-600"
            @click="createStep = 1"
          >
            Back
          </button>
          <button
            class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            @click="createStep = 3"
          >
            Next
          </button>
        </div>
      </div>

      <!-- Step 3: Review -->
      <div v-else class="space-y-4">
        <h3 class="text-lg font-semibold text-white">Review Your Survey</h3>
        <div class="rounded-lg border border-gray-600 bg-gray-700/50 p-4 space-y-2">
          <p class="text-sm text-gray-400">
            Title: <span class="text-white">{{ form.title }}</span>
          </p>
          <p class="text-sm text-gray-400">
            Type: <span class="capitalize text-white">{{ form.type }}</span>
          </p>
          <p class="text-sm text-gray-400">
            Questions: <span class="text-white">{{ form.questions.length }}</span>
          </p>
          <p class="text-sm text-gray-400">
            Anonymous: <span class="text-white">{{ form.is_anonymous ? 'Yes' : 'No' }}</span>
          </p>
          <p v-if="form.ends_at" class="text-sm text-gray-400">
            Ends: <span class="text-white">{{ form.ends_at }}</span>
          </p>
        </div>
        <div class="space-y-2">
          <div
            v-for="(q, idx) in form.questions"
            :key="idx"
            class="rounded border border-gray-600 bg-gray-700/30 p-3"
          >
            <p class="text-sm text-white">
              {{ idx + 1 }}. {{ q.question_text }}
              <span class="ml-1 text-xs text-gray-500">({{ q.question_type }})</span>
            </p>
            <ul v-if="q.options.length" class="mt-1 ml-4 list-disc text-xs text-gray-400">
              <li v-for="(o, oIdx) in q.options" :key="oIdx">{{ o }}</li>
            </ul>
          </div>
        </div>
        <div class="flex justify-between">
          <button
            class="rounded-lg border border-gray-600 bg-gray-700 px-6 py-2 text-sm text-gray-300 hover:bg-gray-600"
            @click="createStep = 2"
          >
            Back
          </button>
          <button
            :disabled="submitting"
            class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            @click="createSurvey"
          >
            {{ submitting ? 'Creating...' : 'Create Survey' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>

    <!-- Surveys List -->
    <div v-else-if="surveys.length" class="space-y-4">
      <div
        v-for="survey in surveys"
        :key="survey.id"
        class="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-3"
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-semibold text-white">{{ survey.title }}</h3>
            <p v-if="survey.description" class="mt-1 text-sm text-gray-400">
              {{ survey.description }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span
              :class="typeColors[survey.type] || 'bg-blue-500/20 text-blue-400'"
              class="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
            >
              {{ survey.type }}
            </span>
            <span
              :class="statusColors[survey.status] || 'bg-gray-500/20 text-gray-400'"
              class="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
            >
              {{ survey.status }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span>{{ survey.response_count }} response{{ survey.response_count !== 1 ? 's' : '' }}</span>
          <span>Created {{ formatDate(survey.created_at) }}</span>
          <span v-if="survey.ends_at">Ends {{ formatDate(survey.ends_at) }}</span>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="survey.status === 'draft'"
            class="rounded bg-green-600/20 px-3 py-1 text-xs font-medium text-green-400 hover:bg-green-600/30"
            @click="publishSurvey(survey.id)"
          >
            Publish
          </button>
          <button
            v-if="survey.status === 'active' && !survey.has_responded"
            class="rounded bg-blue-600/20 px-3 py-1 text-xs font-medium text-blue-400 hover:bg-blue-600/30"
            @click="startResponse(survey)"
          >
            Take Survey
          </button>
          <span
            v-if="survey.has_responded"
            class="text-xs text-green-400"
          >
            Responded
          </span>
          <button
            class="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600"
            @click="viewAnalytics(survey.id)"
          >
            {{ analyticsId === survey.id ? 'Hide Analytics' : 'Analytics' }}
          </button>
        </div>

        <!-- Response Form -->
        <div
          v-if="respondingSurveyId === survey.id"
          class="mt-3 rounded-lg border border-gray-600 bg-gray-700/50 p-4 space-y-4"
        >
          <h4 class="text-sm font-semibold text-white">Your Responses</h4>
          <div v-for="(q, qIdx) in survey.questions" :key="qIdx" class="space-y-2">
            <p class="text-sm text-gray-300">{{ qIdx + 1 }}. {{ q.question_text }}</p>

            <input
              v-if="q.question_type === 'text'"
              v-model="responses[String(q.id ?? qIdx)]"
              type="text"
              placeholder="Your answer"
              class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500"
            />

            <div v-else-if="q.question_type === 'single_choice'" class="space-y-1">
              <label
                v-for="(opt, oIdx) in q.options"
                :key="oIdx"
                class="flex items-center gap-2 text-sm text-gray-300"
              >
                <input
                  v-model="responses[String(q.id ?? qIdx)]"
                  type="radio"
                  :name="'q-' + (q.id ?? qIdx)"
                  :value="opt"
                  class="border-gray-600 bg-gray-700"
                />
                {{ opt }}
              </label>
            </div>

            <div v-else-if="q.question_type === 'multiple_choice'" class="space-y-1">
              <label
                v-for="(opt, oIdx) in q.options"
                :key="oIdx"
                class="flex items-center gap-2 text-sm text-gray-300"
              >
                <input
                  type="checkbox"
                  :value="opt"
                  class="rounded border-gray-600 bg-gray-700"
                  @change="
                    (e) => {
                      const target = e.target as HTMLInputElement
                      const key = String(q.id ?? qIdx)
                      const current = responses[key] || ''
                      const arr = current ? current.split('|||') : []
                      if (target.checked) {
                        responses[key] = [...arr, opt].join('|||')
                      } else {
                        responses[key] = arr.filter((v: string) => v !== opt).join('|||')
                      }
                    }
                  "
                />
                {{ opt }}
              </label>
            </div>

            <div v-else-if="q.question_type === 'rating'" class="flex gap-2">
              <button
                v-for="n in 5"
                :key="n"
                :class="[
                  'h-8 w-8 rounded border text-sm font-medium transition-colors',
                  responses[String(q.id ?? qIdx)] === String(n)
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                    : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500',
                ]"
                @click="responses[String(q.id ?? qIdx)] = String(n)"
              >
                {{ n }}
              </button>
            </div>

            <div v-else-if="q.question_type === 'yes_no'" class="flex gap-2">
              <button
                v-for="opt in ['Yes', 'No']"
                :key="opt"
                :class="[
                  'rounded border px-4 py-1.5 text-sm transition-colors',
                  responses[String(q.id ?? qIdx)] === opt
                    ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                    : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500',
                ]"
                @click="responses[String(q.id ?? qIdx)] = opt"
              >
                {{ opt }}
              </button>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              :disabled="submitting"
              class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              @click="submitResponse(survey.id)"
            >
              {{ submitting ? 'Submitting...' : 'Submit' }}
            </button>
            <button
              class="rounded-lg border border-gray-600 bg-gray-700 px-5 py-2 text-sm text-gray-300 hover:bg-gray-600"
              @click="respondingSurveyId = null"
            >
              Cancel
            </button>
          </div>
        </div>

        <!-- Analytics -->
        <div
          v-if="analyticsId === survey.id"
          class="mt-3 rounded-lg border border-gray-600 bg-gray-700/50 p-4 space-y-4"
        >
          <div v-if="loadingAnalytics" class="flex justify-center py-4">
            <div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
          <template v-else-if="analytics.length">
            <div v-for="(qa, idx) in analytics" :key="idx" class="space-y-2">
              <p class="text-sm font-medium text-white">
                {{ idx + 1 }}. {{ qa.question_text }}
                <span class="ml-1 text-xs text-gray-500">({{ qa.total }} responses)</span>
              </p>
              <div v-for="(count, answer) in qa.responses" :key="String(answer)" class="space-y-0.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-gray-300">{{ answer }}</span>
                  <span class="text-gray-500">{{ count }} ({{ qa.total ? Math.round((count / qa.total) * 100) : 0 }}%)</span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-600">
                  <div
                    class="h-full rounded-full bg-blue-500 transition-all"
                    :style="{ width: (count / maxResponseCount(qa.responses)) * 100 + '%' }"
                  />
                </div>
              </div>
            </div>
          </template>
          <p v-else class="text-center text-sm text-gray-500">No analytics available</p>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800 py-16"
    >
      <p class="text-gray-400">No surveys found</p>
      <p class="mt-1 text-sm text-gray-500">Create a survey to get started</p>
    </div>
  </div>
</template>
