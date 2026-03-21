<script setup lang="ts">
defineOptions({ name: 'PerformanceAppraisalDetail' })
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { performanceService, type EmployeeAppraisal, type Review } from '@/services/performanceService'

const router = useRouter()
const route = useRoute()
const { user, roles } = useAuth()
const loading = ref(true)
const appraisal = ref<EmployeeAppraisal | null>(null)
const error = ref('')
const actionError = ref('')
const showSelfReviewForm = ref(false)
const submitting = ref(false)

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const isAdminOrHR = computed(() => rLower.value.includes('admin') || rLower.value.includes('hr_manager'))
const isManager = computed(() => isAdminOrHR.value || rLower.value.includes('manager'))
const currentUserId = computed(() => (user() as { id?: number } | null)?.id)

const selfReviewForm = ref({
  overall_comments: '',
  strengths: '',
  improvement_areas: '',
  development_plan: '',
  ratings: [
    { category: 'job_knowledge', category_label: 'Job Knowledge', rating: 3, comments: '', weightage: 25 },
    { category: 'quality_of_work', category_label: 'Quality of Work', rating: 3, comments: '', weightage: 25 },
    { category: 'communication', category_label: 'Communication', rating: 3, comments: '', weightage: 25 },
    { category: 'teamwork', category_label: 'Teamwork', rating: 3, comments: '', weightage: 25 },
  ],
})

const selfReview = computed(() => appraisal.value?.reviews?.find((r: Review) => r.review_type === 'self'))
const managerReview = computed(() => appraisal.value?.reviews?.find((r: Review) => r.review_type === 'manager'))
const canSubmitSelfReview = computed(() =>
  appraisal.value &&
  appraisal.value.status === 'in_progress' &&
  !selfReview.value &&
  appraisal.value.employee_id === currentUserId.value
)
const canSubmitManagerReview = computed(() =>
  appraisal.value &&
  ['self_review_done', 'in_progress'].includes(appraisal.value.status) &&
  !managerReview.value &&
  isManager.value
)

const loadAppraisal = async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    appraisal.value = await performanceService.getAppraisal(id)
  } catch {
    error.value = 'Failed to load appraisal'
  } finally {
    loading.value = false
  }
}

const handleSubmitSelfReview = async () => {
  if (!appraisal.value) return
  submitting.value = true
  actionError.value = ''
  try {
    await performanceService.submitSelfReview(appraisal.value.id, selfReviewForm.value)
    showSelfReviewForm.value = false
    await loadAppraisal()
  } catch {
    actionError.value = 'Failed to submit self review'
  } finally {
    submitting.value = false
  }
}

const handleAcknowledge = async () => {
  if (!appraisal.value) return
  actionError.value = ''
  try {
    appraisal.value = await performanceService.acknowledgeAppraisal(appraisal.value.id)
  } catch {
    actionError.value = 'Failed to acknowledge appraisal'
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    not_started: 'bg-gray-700 text-gray-400',
    in_progress: 'bg-blue-900/50 text-blue-400',
    self_review_done: 'bg-indigo-900/50 text-indigo-400',
    manager_review_done: 'bg-purple-900/50 text-purple-400',
    calibration: 'bg-yellow-900/50 text-yellow-400',
    completed: 'bg-green-900/50 text-green-400',
    acknowledged: 'bg-teal-900/50 text-teal-400',
  }
  return colors[status] || 'bg-gray-700 text-gray-300'
}

const maxRating = computed(() => appraisal.value?.appraisal_cycle?.rating_scale ?? 5)

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadAppraisal())
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ error }}</div>

    <template v-else-if="appraisal">
      <div v-if="actionError" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-sm text-red-400">{{ actionError }}</div>

      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-3">
            <button @click="router.push({ name: 'performance.appraisals' })" class="text-gray-400 hover:text-white transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <div class="flex items-center gap-3">
                <h2 class="text-xl font-semibold text-white">{{ appraisal.appraisal_cycle?.name ?? 'Appraisal' }}</h2>
                <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusColor(appraisal.status)]">{{ appraisal.status.replace(/_/g, ' ') }}</span>
              </div>
              <p class="text-sm text-gray-400 mt-1">
                Employee: {{ appraisal.employee?.first_name }} {{ appraisal.employee?.last_name }}
                <span v-if="appraisal.final_score" class="ml-4 font-medium text-gray-300">Score: {{ appraisal.final_score }}</span>
                <span v-if="appraisal.final_rating" class="ml-2 text-gray-400">({{ appraisal.final_rating }})</span>
              </p>
            </div>
          </div>
        </div>
        <div class="flex gap-2">
          <button v-if="canSubmitSelfReview" @click="showSelfReviewForm = !showSelfReviewForm" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Submit Self Review</button>
          <button v-if="canSubmitManagerReview" @click="router.push({ name: 'performance.appraisals.show', params: { id: appraisal.id }, query: { review: 'manager' } })" class="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">Manager Review</button>
          <button v-if="appraisal.status === 'completed' && !appraisal.employee_acknowledged" @click="handleAcknowledge" class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">Acknowledge</button>
        </div>
      </div>

      <!-- Self Review Form -->
      <div v-if="showSelfReviewForm" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h3 class="text-base font-medium text-white">Self Review</h3>
        <div class="space-y-4">
          <div v-for="(rating, idx) in selfReviewForm.ratings" :key="idx" class="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-white">{{ rating.category_label }}</p>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400">Rating (1–{{ maxRating }})</span>
                <input v-model.number="rating.rating" type="number" :min="1" :max="maxRating" class="w-16 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm text-center focus:border-blue-500 focus:outline-none px-2 py-1" />
              </div>
            </div>
            <input v-model="rating.comments" type="text" placeholder="Comments (optional)" class="block w-full bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none px-3 py-2" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300">Strengths</label>
          <textarea v-model="selfReviewForm.strengths" rows="2" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300">Areas for Improvement</label>
          <textarea v-model="selfReviewForm.improvement_areas" rows="2" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300">Overall Comments</label>
          <textarea v-model="selfReviewForm.overall_comments" rows="2" class="mt-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:border-blue-500 focus:outline-none block w-full px-3 py-2" />
        </div>
        <div class="flex justify-end gap-3">
          <button @click="showSelfReviewForm = false" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
          <button @click="handleSubmitSelfReview" :disabled="submitting" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">{{ submitting ? 'Submitting...' : 'Submit Self Review' }}</button>
        </div>
      </div>

      <!-- Review Cards -->
      <div v-if="appraisal.reviews && appraisal.reviews.length > 0" class="space-y-4">
        <div v-for="review in appraisal.reviews" :key="review.id" class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-base font-medium text-white capitalize">{{ review.review_type.replace('_', ' ') }} Review</h3>
              <p class="text-sm text-gray-400">by {{ review.reviewer?.name ?? 'Unknown' }}</p>
            </div>
            <div class="text-right">
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', review.status === 'submitted' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400']">{{ review.status }}</span>
              <p v-if="review.overall_rating" class="mt-1 text-sm font-medium text-white">Overall: {{ review.overall_rating }}</p>
            </div>
          </div>
          <div v-if="review.ratings && review.ratings.length > 0" class="space-y-2">
            <div v-for="r in review.ratings" :key="r.id" class="flex items-center justify-between text-sm">
              <span class="text-gray-300">{{ r.category_label }}</span>
              <div class="flex items-center gap-3">
                <div class="w-24 bg-gray-700 rounded-full h-1.5">
                  <div class="bg-blue-500 h-1.5 rounded-full" :style="{ width: (r.rating / r.max_rating * 100) + '%' }"></div>
                </div>
                <span class="text-gray-400 w-8 text-right">{{ r.rating }}/{{ r.max_rating }}</span>
              </div>
            </div>
          </div>
          <div v-if="review.strengths || review.improvement_areas || review.overall_comments" class="mt-4 space-y-2 pt-3 border-t border-gray-700">
            <p v-if="review.strengths" class="text-sm"><span class="font-medium text-gray-300">Strengths: </span><span class="text-gray-400">{{ review.strengths }}</span></p>
            <p v-if="review.improvement_areas" class="text-sm"><span class="font-medium text-gray-300">Improvements: </span><span class="text-gray-400">{{ review.improvement_areas }}</span></p>
            <p v-if="review.overall_comments" class="text-sm"><span class="font-medium text-gray-300">Comments: </span><span class="text-gray-400">{{ review.overall_comments }}</span></p>
          </div>
        </div>
      </div>

      <!-- Acknowledgment -->
      <div v-if="appraisal.employee_acknowledged" class="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-center gap-3">
        <svg class="h-5 w-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
        <p class="text-sm text-green-400">Acknowledged on {{ appraisal.acknowledged_at ? formatDate(appraisal.acknowledged_at) : 'N/A' }}</p>
      </div>
    </template>
  </div>
</template>
