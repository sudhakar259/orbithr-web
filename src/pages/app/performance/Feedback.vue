<script setup lang="ts">
defineOptions({ name: 'PerformanceFeedback' })
import { ref, onMounted, computed } from 'vue'
import {
  performanceService,
  type FeedbackRequest,
  type FeedbackQuestion,
} from '@/services/performanceService'

const loading = ref(true)
const pendingRequests = ref<FeedbackRequest[]>([])
const receivedRequests = ref<FeedbackRequest[]>([])
const error = ref('')
const activeTab = ref<'pending' | 'received'>('pending')

const selectedRequest = ref<FeedbackRequest | null>(null)
const questions = ref<FeedbackQuestion[]>([])
const responses = ref<Array<{ question_id: number; answer: string; rating: number | undefined }>>(
  [],
)
const submitting = ref(false)
const submitError = ref('')
const submitSuccess = ref('')

const pendingCount = computed(
  () => pendingRequests.value.filter(r => r.status === 'pending').length,
)

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
    responses.value = qs.map(q => ({
      question_id: q.id,
      answer: '',
      rating: q.question_type === 'rating' ? 3 : undefined,
    }))
  } catch {
    submitError.value = 'Failed to load questions'
  }
}

const handleSubmit = async () => {
  if (!selectedRequest.value) return
  submitting.value = true
  submitError.value = ''
  try {
    await performanceService.submitFeedback(selectedRequest.value.id, {
      responses: responses.value,
    })
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

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'badge-warn',
    submitted: 'badge-ok',
    declined: 'badge-danger',
    expired: 'badge-muted',
  }
  return map[status] || 'badge-muted'
}

onMounted(() => loadFeedback())
</script>

<template>
  <div class="feedback">
    <div v-if="submitSuccess" class="state-success">{{ submitSuccess }}</div>

    <!-- Sub tabs -->
    <div class="sub-tabs">
      <button
        :class="['sub-tab', activeTab === 'pending' && 'is-active']"
        @click="activeTab = 'pending'"
      >
        Pending requests
        <span v-if="pendingCount" class="tab-count">{{ pendingCount }}</span>
      </button>
      <button
        :class="['sub-tab', activeTab === 'received' && 'is-active']"
        @click="activeTab = 'received'"
      >
        Received feedback
      </button>
    </div>

    <div v-if="loading" class="state-block">
      <div class="spinner"></div>
    </div>

    <div v-else-if="error" class="state-error">{{ error }}</div>

    <!-- Pending -->
    <template v-else-if="activeTab === 'pending'">
      <div v-if="pendingRequests.length === 0" class="empty-pad">
        No pending feedback requests.
      </div>
      <div v-else class="fb-list">
        <div v-for="request in pendingRequests" :key="request.id" class="fb-card">
          <div class="fb-row">
            <div class="fb-info">
              <div class="fb-line">
                Feedback for
                <strong>
                  {{ request.requestee?.first_name }} {{ request.requestee?.last_name }}
                </strong>
              </div>
              <div class="fb-meta">
                Relationship: {{ request.relationship }}
                <span v-if="request.is_anonymous" class="fb-anon">(Anonymous)</span>
              </div>
              <div v-if="request.due_date" class="fb-due">
                Due {{ formatDate(request.due_date) }}
              </div>
            </div>
            <div class="fb-actions">
              <span :class="['badge', getStatusClass(request.status)]">{{ request.status }}</span>
              <button
                v-if="request.status === 'pending'"
                class="btn btn-primary"
                @click="openFeedbackForm(request)"
              >
                Give feedback
              </button>
              <button
                v-if="request.status === 'pending'"
                class="btn btn-secondary"
                @click="handleDecline(request.id)"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Received -->
    <template v-else>
      <div v-if="receivedRequests.length === 0" class="empty-pad">No feedback received yet.</div>
      <div v-else class="fb-list">
        <div v-for="request in receivedRequests" :key="request.id" class="fb-card">
          <div class="fb-row">
            <div class="fb-info">
              <div class="fb-line">
                From:
                <strong v-if="!request.is_anonymous">{{ request.reviewer?.name }}</strong>
                <em v-else class="fb-anon">Anonymous</em>
              </div>
              <div class="fb-meta">Relationship: {{ request.relationship }}</div>
              <div v-if="request.submitted_at" class="fb-due">
                Submitted {{ formatDate(request.submitted_at) }}
              </div>
            </div>
            <span :class="['badge', getStatusClass(request.status)]">{{ request.status }}</span>
          </div>
          <div v-if="request.responses && request.responses.length > 0" class="fb-responses">
            <p v-for="resp in request.responses" :key="resp.id" class="fb-resp">
              <span v-if="resp.rating" class="fb-rating">{{ resp.rating }}/5</span>
              <span v-if="resp.answer">{{ resp.answer }}</span>
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="selectedRequest" class="modal-overlay" @click.self="selectedRequest = null">
        <div class="modal">
          <div class="modal-head">
            <h3 class="modal-title">Give feedback</h3>
            <button class="modal-close" @click="selectedRequest = null">&times;</button>
          </div>

          <div class="modal-body">
            <p class="modal-target">
              For
              <strong>
                {{ selectedRequest.requestee?.first_name }}
                {{ selectedRequest.requestee?.last_name }}
              </strong>
              &middot; relationship
              <strong>{{ selectedRequest.relationship }}</strong>
              <span v-if="selectedRequest.is_anonymous" class="badge badge-muted">Anonymous</span>
            </p>

            <div v-if="submitError" class="state-error">{{ submitError }}</div>

            <div v-if="questions.length === 0" class="empty-pad small">
              No questions configured for this cycle.
            </div>

            <div v-else class="q-list">
              <div v-for="(q, idx) in questions" :key="q.id" class="q-card">
                <p class="q-title">{{ idx + 1 }}. {{ q.question }}</p>
                <div v-if="q.question_type === 'rating'" class="q-rating">
                  <input
                    v-model.number="responses[idx].rating"
                    type="range"
                    min="1"
                    max="5"
                    class="q-range"
                  />
                  <div class="q-range-labels">
                    <span>1 Poor</span>
                    <span>3 Average</span>
                    <span>5 Excellent</span>
                  </div>
                  <p class="q-rating-value">{{ responses[idx].rating }}</p>
                </div>
                <div v-else-if="q.question_type === 'yes_no'" class="q-radio">
                  <label class="radio-item">
                    <input v-model="responses[idx].answer" type="radio" value="yes" />
                    Yes
                  </label>
                  <label class="radio-item">
                    <input v-model="responses[idx].answer" type="radio" value="no" />
                    No
                  </label>
                </div>
                <textarea
                  v-else
                  v-model="responses[idx].answer"
                  rows="3"
                  class="input textarea"
                  :placeholder="q.is_required ? 'Required' : 'Optional'"
                />
              </div>
            </div>
          </div>

          <div class="modal-foot">
            <button class="btn btn-secondary" @click="selectedRequest = null">Cancel</button>
            <button class="btn btn-primary" :disabled="submitting" @click="handleSubmit">
              {{ submitting ? 'Submitting...' : 'Submit feedback' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.feedback {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sub-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #232936;
}

.sub-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: #7a8299;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  font-family: inherit;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.sub-tab:hover {
  color: #eef0f4;
}

.sub-tab.is-active {
  color: #eef0f4;
  border-bottom-color: #6b5bff;
}

.tab-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  background: rgba(107, 91, 255, 0.18);
  color: #6b5bff;
  border-radius: 999px;
  padding: 1px 7px;
  font-variant-numeric: tabular-nums;
}

.state-block {
  text-align: center;
  padding: 48px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid #232936;
  border-top-color: #6b5bff;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.state-error {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #f38288;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12.5px;
}

.state-success {
  background: rgba(77, 211, 154, 0.08);
  border: 1px solid rgba(77, 211, 154, 0.28);
  color: #4dd39a;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12.5px;
}

.empty-pad {
  padding: 56px 16px;
  text-align: center;
  color: #7a8299;
  font-size: 13px;
  background: #161a23;
  border: 1px dashed #232936;
  border-radius: 12px;
}

.empty-pad.small {
  padding: 28px 16px;
}

/* Cards */
.fb-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fb-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 14px 18px;
}

.fb-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.fb-info {
  flex: 1;
  min-width: 0;
}

.fb-line {
  font-size: 13px;
  color: #eef0f4;
}

.fb-line strong {
  font-weight: 600;
}

.fb-meta {
  font-size: 12px;
  color: #7a8299;
  margin-top: 4px;
}

.fb-due {
  font-size: 11.5px;
  color: #7a8299;
  margin-top: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}

.fb-anon {
  color: #7a8299;
  font-style: italic;
}

.fb-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fb-responses {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #232936;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fb-resp {
  margin: 0;
  font-size: 12.5px;
  color: #eef0f4;
  line-height: 1.5;
  font-style: italic;
}

.fb-rating {
  display: inline-block;
  margin-right: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: #6b5bff;
  font-style: normal;
}

/* Buttons */
.btn {
  font-size: 12.5px;
  font-weight: 500;
  padding: 7px 14px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.btn-primary {
  background: #6b5bff;
  color: #fff;
}

.btn-primary:hover {
  background: #5a4ce6;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border-color: #232936;
  color: #eef0f4;
}

.btn-secondary:hover {
  border-color: #6b5bff;
  color: #6b5bff;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge-muted {
  background: rgba(122, 130, 153, 0.12);
  color: #7a8299;
  border-color: rgba(122, 130, 153, 0.25);
}

.badge-warn {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.3);
}

.badge-ok {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}

.badge-danger {
  background: rgba(243, 130, 136, 0.12);
  color: #f38288;
  border-color: rgba(243, 130, 136, 0.3);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 15, 23, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 50;
}

.modal {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 14px;
  width: 100%;
  max-width: 640px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #232936;
}

.modal-title {
  font-family: 'Instrument Serif', serif;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: #eef0f4;
  margin: 0;
  font-weight: 400;
}

.modal-close {
  background: transparent;
  border: none;
  color: #7a8299;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.modal-close:hover {
  color: #eef0f4;
}

.modal-body {
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-target {
  font-size: 12.5px;
  color: #7a8299;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.modal-target strong {
  color: #eef0f4;
  font-weight: 600;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid #232936;
}

.q-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.q-card {
  background: #0d0f17;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 14px;
}

.q-title {
  font-size: 12.5px;
  color: #eef0f4;
  font-weight: 500;
  margin: 0 0 10px 0;
}

.q-rating {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.q-range {
  width: 100%;
  accent-color: #6b5bff;
}

.q-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: #7a8299;
}

.q-rating-value {
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #eef0f4;
  margin: 0;
}

.q-radio {
  display: flex;
  gap: 18px;
}

.radio-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: #eef0f4;
  cursor: pointer;
}

.radio-item input {
  accent-color: #6b5bff;
}

.input {
  width: 100%;
  padding: 9px 12px;
  font-size: 12.5px;
  color: #eef0f4;
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 8px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s ease;
}

.input:focus {
  border-color: #6b5bff;
}

.textarea {
  resize: vertical;
  min-height: 80px;
}
</style>
