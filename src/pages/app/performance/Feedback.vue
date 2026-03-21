<script setup lang="ts">
defineOptions({ name: 'PerformanceFeedback' })
import { ref, onMounted } from 'vue'
import { performanceService, type FeedbackRequest, type FeedbackQuestion } from '@/services/performanceService'

const loading = ref(true)
const pendingRequests = ref<FeedbackRequest[]>([])
const receivedRequests = ref<FeedbackRequest[]>([])
const error = ref('')
const activeTab = ref<'pending' | 'received'>('pending')

const selectedRequest = ref<FeedbackRequest | null>(null)
const questions = ref<FeedbackQuestion[]>([])
const responses = ref<Array<{ question_id: number; answer: string; rating: number | undefined }>>([])
const submitting = ref(false)
const submitError = ref('')
const submitSuccess = ref('')

const loadFeedback = async () => {
  loading.value = true
  try {
    pendingRequests.value = await performanceService.getPendingFeedbackRequests()
    const received = await performanceService.getReceivedFeedbackRequests()
    receivedRequests.value = received.data
  } catch {
    error.value = 'Failed to load feedback'
  } finally {
    loading.value = false
  }
}

const openFeedbackForm = async (request: FeedbackRequest) => {
  selectedRequest.value = request
  submitError.value = ''
  submitSuccess.value = ''
  try {
    const qs = await performanceService.getFeedbackQuestions({
      appraisal_cycle_id: request.employee_appraisal?.appraisal_cycle_id,
    })
    questions.value = qs
    responses.value = qs.map(q => ({ question_id: q.id, answer: '', rating: q.question_type === 'rating' ? 3 : undefined }))
  } catch {
    submitError.value = 'Failed to load questions'
  }
}

const handleSubmit = async () => {
  if (!selectedRequest.value) return
  submitting.value = true
  submitError.value = ''
  try {
    await performanceService.submitFeedback(selectedRequest.value.id, { responses: responses.value })
    submitSuccess.value = 'Feedback submitted successfully!'
    selectedRequest.value = null
    await loadFeedback()
  } catch {
    submitError.value = 'Failed to submit feedback'
  } finally {
    submitting.value = false
  }
}

const handleDecline = async (requestId: number) => {
  try {
    await performanceService.declineFeedbackRequest(requestId)
    await loadFeedback()
  } catch {
    error.value = 'Failed to decline request'
  }
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-900/50 text-yellow-400',
    submitted: 'bg-green-900/50 text-green-400',
    declined: 'bg-red-900/50 text-red-400',
    expired: 'bg-gray-700 text-gray-400',
  }
  return colors[status] || 'bg-gray-700 text-gray-300'
}

onMounted(() => loadFeedback())
</script>

<template>
  <div class="space-y-6">
    <div v-if="submitSuccess" class="bg-green-900/30 border border-green-700 rounded-lg p-4 text-sm text-green-400">{{ submitSuccess }}</div>

    <!-- Feedback Form Modal -->
    <div v-if="selectedRequest" class="fixed inset-0 z-50 overflow-y-auto bg-gray-900/75 flex items-center justify-center p-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-white">Give Feedback</h3>
            <button @click="selectedRequest = null" class="text-gray-400 hover:text-white transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <p class="text-sm text-gray-400">
            For: <strong class="text-gray-200">{{ selectedRequest.requestee?.first_name }} {{ selectedRequest.requestee?.last_name }}</strong>
            &nbsp;|&nbsp; Relationship: <strong class="text-gray-200">{{ selectedRequest.relationship }}</strong>
            <span v-if="selectedRequest.is_anonymous" class="ml-2 px-1.5 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">Anonymous</span>
          </p>

          <div v-if="submitError" class="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-400">{{ submitError }}</div>

          <div v-if="questions.length === 0" class="text-center py-8 text-gray-500 text-sm">No questions configured for this cycle.</div>

          <div v-else class="space-y-4">
            <div v-for="(q, idx) in questions" :key="q.id" class="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
              <p class="text-sm font-medium text-white mb-2">{{ idx + 1 }}. {{ q.question }}</p>
              <div v-if="q.question_type === 'rating'">
                <input v-model.number="responses[idx].rating" type="range" min="1" max="5" class="w-full" />
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 (Poor)</span><span>3 (Average)</span><span>5 (Excellent)</span>
                </div>
                <p class="text-sm font-medium text-center mt-1 text-white">{{ responses[idx].rating }}</p>
              </div>
              <div v-else-if="q.question_type === 'yes_no'">
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 text-sm text-gray-300"><input v-model="responses[idx].answer" type="radio" value="yes" /> Yes</label>
                  <label class="flex items-center gap-2 text-sm text-gray-300"><input v-model="responses[idx].answer" type="radio" value="no" /> No</label>
                </div>
              </div>
              <div v-else>
                <textarea v-model="responses[idx].answer" rows="3" class="block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" :placeholder="q.is_required ? 'Required' : 'Optional'" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button @click="selectedRequest = null" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
            <button @click="handleSubmit" :disabled="submitting" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{{ submitting ? 'Submitting...' : 'Submit Feedback' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <nav class="-mb-px flex space-x-6">
        <button @click="activeTab = 'pending'" :class="['py-3 px-1 border-b-2 text-sm font-medium', activeTab === 'pending' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500']">
          Pending Requests <span v-if="pendingRequests.filter(r => r.status === 'pending').length" class="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-full bg-blue-900/50 text-blue-400">{{ pendingRequests.filter(r => r.status === 'pending').length }}</span>
        </button>
        <button @click="activeTab = 'received'" :class="['py-3 px-1 border-b-2 text-sm font-medium', activeTab === 'received' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500']">Received Feedback</button>
      </nav>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ error }}</div>

    <!-- Pending -->
    <template v-else-if="activeTab === 'pending'">
      <div v-if="pendingRequests.length === 0" class="text-center py-12 text-gray-500">No pending feedback requests.</div>
      <div v-else class="space-y-3">
        <div v-for="request in pendingRequests" :key="request.id" class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-white">Feedback for <strong>{{ request.requestee?.first_name }} {{ request.requestee?.last_name }}</strong></p>
              <p class="text-sm text-gray-400 mt-0.5">Relationship: {{ request.relationship }} <span v-if="request.is_anonymous" class="ml-1 text-xs text-gray-500">(Anonymous)</span></p>
              <p v-if="request.due_date" class="text-xs text-gray-500 mt-0.5">Due: {{ formatDate(request.due_date) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(request.status)]">{{ request.status }}</span>
              <button v-if="request.status === 'pending'" @click="openFeedbackForm(request)" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Give Feedback</button>
              <button v-if="request.status === 'pending'" @click="handleDecline(request.id)" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Decline</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Received -->
    <template v-else>
      <div v-if="receivedRequests.length === 0" class="text-center py-12 text-gray-500">No feedback received yet.</div>
      <div v-else class="space-y-3">
        <div v-for="request in receivedRequests" :key="request.id" class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-white">From: <span v-if="!request.is_anonymous" class="text-gray-200">{{ request.reviewer?.name }}</span><span v-else class="text-gray-500 italic">Anonymous</span></p>
              <p class="text-sm text-gray-400 mt-0.5">Relationship: {{ request.relationship }}</p>
              <p v-if="request.submitted_at" class="text-xs text-gray-500 mt-0.5">Submitted: {{ formatDate(request.submitted_at) }}</p>
            </div>
            <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(request.status)]">{{ request.status }}</span>
          </div>
          <div v-if="request.responses && request.responses.length > 0" class="mt-3 pt-3 border-t border-gray-700 space-y-1">
            <p v-for="resp in request.responses" :key="resp.id" class="text-sm text-gray-400">
              <span v-if="resp.rating" class="font-medium text-gray-300">Rating: {{ resp.rating }}/5</span>
              <span v-if="resp.answer" class="ml-2">{{ resp.answer }}</span>
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
