<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  recruitmentService,
  type JobApplication,
  type InterviewStage,
} from '@/services/recruitmentService'

const props = defineProps<{
  application: JobApplication
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const rejectionReason = ref('')
const showRejectInput = ref(false)
const ratingValue = ref(props.application.rating ?? 0)
const interviewDate = ref('')
const interviewNotes = ref('')
const showScheduleForm = ref(false)

const stages = computed<InterviewStage[]>(() => props.application.interview_stages ?? [])

const canShortlist = computed(() => props.application.status === 'submitted' || props.application.status === 'under_review')
const canScheduleInterview = computed(() => props.application.status === 'shortlisted')
const canMarkInterviewed = computed(() => props.application.status === 'interview_scheduled')
const canMakeOffer = computed(() => props.application.status === 'interviewed')
const canHire = computed(() => props.application.status === 'offered')
const canReject = computed(() =>
  ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interviewed', 'offered'].includes(
    props.application.status,
  ),
)

const getStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'bg-blue-900/50 text-blue-400',
    under_review: 'bg-yellow-900/50 text-yellow-400',
    shortlisted: 'bg-purple-900/50 text-purple-400',
    interview_scheduled: 'bg-indigo-900/50 text-indigo-400',
    interviewed: 'bg-cyan-900/50 text-cyan-400',
    offered: 'bg-green-900/50 text-green-400',
    hired: 'bg-emerald-900/50 text-emerald-400',
    rejected: 'bg-red-900/50 text-red-400',
    withdrawn: 'bg-gray-700 text-gray-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
}

const getStageStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    pending: 'border-yellow-500 bg-yellow-900/20',
    completed: 'border-green-500 bg-green-900/20',
    cancelled: 'border-gray-600 bg-gray-800',
  }
  return map[status] ?? 'border-gray-600 bg-gray-800'
}

const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const handleAction = async (action: () => Promise<unknown>) => {
  loading.value = true
  error.value = null
  try {
    await action()
    emit('updated')
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Action failed'
  } finally {
    loading.value = false
  }
}

const shortlist = () => handleAction(() => recruitmentService.shortlistApplication(props.application.id))

const reject = () => {
  if (!rejectionReason.value.trim()) {
    error.value = 'Please provide a rejection reason'
    return
  }
  handleAction(() => recruitmentService.rejectApplication(props.application.id, rejectionReason.value))
}

const scheduleInterview = () => {
  if (!interviewDate.value) {
    error.value = 'Please select a date'
    return
  }
  handleAction(() =>
    recruitmentService.scheduleInterview(props.application.id, {
      date: interviewDate.value,
      notes: interviewNotes.value || undefined,
    }),
  )
}

const markInterviewed = () =>
  handleAction(() => recruitmentService.updateStatus(props.application.id, 'interviewed'))

const makeOffer = () => handleAction(() => recruitmentService.makeOffer(props.application.id))
const hire = () => handleAction(() => recruitmentService.hireApplicant(props.application.id))

const submitRating = () =>
  handleAction(() =>
    recruitmentService.rateApplication(props.application.id, { rating: ratingValue.value }),
  )
</script>

<template>
  <!-- Slide-over backdrop -->
  <div class="fixed inset-0 z-50 overflow-hidden">
    <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>

    <!-- Slide-over panel -->
    <div class="absolute inset-y-0 right-0 max-w-lg w-full">
      <div class="h-full bg-gray-800 border-l border-gray-700 flex flex-col overflow-y-auto">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 class="text-lg font-semibold text-white">Application Details</h2>
          <button @click="emit('close')" class="text-gray-400 hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
          <!-- Error -->
          <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <p class="text-sm text-red-400">{{ error }}</p>
          </div>

          <!-- Applicant info -->
          <div class="space-y-3">
            <div class="flex items-center space-x-4">
              <div class="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-lg font-semibold text-gray-300">
                {{ application.applicant_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() }}
              </div>
              <div>
                <h3 class="text-lg font-semibold text-white">{{ application.applicant_name }}</h3>
                <p class="text-sm text-gray-400">{{ application.applicant_email }}</p>
                <p v-if="application.applicant_phone" class="text-sm text-gray-400">{{ application.applicant_phone }}</p>
              </div>
            </div>

            <div class="flex items-center space-x-3 text-sm">
              <span
                :class="[getStatusClasses(application.status), 'px-2.5 py-0.5 text-xs font-semibold rounded-full']"
              >
                {{ application.status.replace(/_/g, ' ') }}
              </span>
              <span class="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-300">
                {{ application.source }}
              </span>
              <span class="text-gray-500">Submitted {{ formatDate(application.submitted_at) }}</span>
            </div>
          </div>

          <!-- Cover letter -->
          <div v-if="application.cover_letter" class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Cover Letter</h4>
            <p class="text-sm text-gray-400 whitespace-pre-wrap bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              {{ application.cover_letter }}
            </p>
          </div>

          <!-- Links -->
          <div class="space-y-2">
            <div v-if="application.resume_path" class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <a
                :href="application.resume_path"
                target="_blank"
                class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Download Resume
              </a>
            </div>
            <div v-if="application.portfolio_url" class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <a
                :href="application.portfolio_url"
                target="_blank"
                class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Portfolio
              </a>
            </div>
          </div>

          <!-- Rating -->
          <div class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Rating</h4>
            <div class="flex items-center space-x-2">
              <button
                v-for="(_, i) in 5"
                :key="i"
                @click="ratingValue = i + 1"
                class="focus:outline-none"
              >
                <svg
                  class="w-6 h-6 transition-colors"
                  :class="i < ratingValue ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-500'"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
              <button
                v-if="ratingValue !== (application.rating ?? 0)"
                @click="submitRating"
                :disabled="loading"
                class="ml-3 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>

          <!-- Interview stages timeline -->
          <div v-if="stages.length" class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Interview Stages</h4>
            <div class="space-y-3">
              <div
                v-for="(stage, i) in stages"
                :key="i"
                :class="[getStageStatusClasses(stage.status), 'border-l-2 pl-4 py-2 rounded-r-lg']"
              >
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-white">{{ stage.stage }}</span>
                  <span class="text-xs text-gray-400">{{ formatDate(stage.date) }}</span>
                </div>
                <p v-if="stage.interviewer" class="text-xs text-gray-400 mt-1">Interviewer: {{ stage.interviewer }}</p>
                <p v-if="stage.notes" class="text-xs text-gray-500 mt-1">{{ stage.notes }}</p>
              </div>
            </div>
          </div>

          <!-- Feedback -->
          <div v-if="application.feedback" class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Feedback</h4>
            <p class="text-sm text-gray-400">{{ application.feedback }}</p>
          </div>

          <!-- Rejection reason -->
          <div v-if="application.rejection_reason" class="space-y-2">
            <h4 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Rejection Reason</h4>
            <p class="text-sm text-red-400">{{ application.rejection_reason }}</p>
          </div>
        </div>

        <!-- Actions footer -->
        <div class="px-6 py-4 border-t border-gray-700 flex-shrink-0 space-y-3">
          <!-- Schedule interview form -->
          <div v-if="showScheduleForm" class="space-y-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Interview Date</label>
              <input
                v-model="interviewDate"
                type="date"
                class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Notes (optional)</label>
              <textarea
                v-model="interviewNotes"
                rows="2"
                class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                placeholder="Interview details..."
              ></textarea>
            </div>
            <div class="flex space-x-2">
              <button
                @click="scheduleInterview"
                :disabled="loading"
                class="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Confirm Schedule
              </button>
              <button
                @click="showScheduleForm = false"
                class="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Reject input -->
          <div v-if="showRejectInput" class="space-y-3 mb-3">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Rejection Reason</label>
              <textarea
                v-model="rejectionReason"
                rows="3"
                class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                placeholder="Reason for rejection..."
              ></textarea>
            </div>
            <div class="flex space-x-2">
              <button
                @click="reject"
                :disabled="loading"
                class="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Confirm Rejection
              </button>
              <button
                @click="showRejectInput = false"
                class="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Action buttons -->
          <div v-if="!showRejectInput && !showScheduleForm" class="flex flex-wrap gap-2">
            <button
              v-if="canShortlist"
              @click="shortlist"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              Shortlist
            </button>
            <button
              v-if="canScheduleInterview"
              @click="showScheduleForm = true"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Schedule Interview
            </button>
            <button
              v-if="canMarkInterviewed"
              @click="markInterviewed"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
            >
              Mark Interviewed
            </button>
            <button
              v-if="canMakeOffer"
              @click="makeOffer"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Make Offer
            </button>
            <button
              v-if="canHire"
              @click="hire"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              Mark Hired
            </button>
            <button
              v-if="canReject"
              @click="showRejectInput = true"
              class="px-4 py-2 text-sm font-medium text-red-400 bg-red-900/30 border border-red-700 rounded-lg hover:bg-red-900/50 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
