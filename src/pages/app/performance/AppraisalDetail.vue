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

const getStatusTone = (status: string) => {
  const map: Record<string, string> = {
    not_started: 'muted',
    in_progress: 'accent',
    self_review_done: 'accent',
    manager_review_done: 'accent',
    calibration: 'warn',
    completed: 'ok',
    acknowledged: 'ok',
  }
  return map[status] ?? 'muted'
}

const maxRating = computed(() => appraisal.value?.appraisal_cycle?.rating_scale ?? 5)

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadAppraisal())
</script>

<template>
  <div class="ad">
    <div v-if="loading" class="state-block"><div class="spinner" /></div>

    <div v-else-if="error" class="state-error">{{ error }}</div>

    <template v-else-if="appraisal">
      <div v-if="actionError" class="state-error">{{ actionError }}</div>

      <!-- Header -->
      <div class="ad-head">
        <div class="ad-head-left">
          <button class="back-btn" @click="router.push({ name: 'performance.appraisals' })" aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div class="ad-title-row">
              <span class="eyebrow">Appraisal cycle</span>
              <span :class="['badge', `badge-${getStatusTone(appraisal.status)}`]">{{ appraisal.status.replace(/_/g, ' ') }}</span>
            </div>
            <h2 class="ad-title">{{ appraisal.appraisal_cycle?.name ?? 'Appraisal' }}</h2>
            <p class="ad-sub">
              {{ appraisal.employee?.first_name }} {{ appraisal.employee?.last_name }}
              <span v-if="appraisal.final_score" class="ad-score">· Score {{ appraisal.final_score }}</span>
              <span v-if="appraisal.final_rating" class="ad-rating">({{ appraisal.final_rating }})</span>
            </p>
          </div>
        </div>
        <div class="ad-actions">
          <button v-if="canSubmitSelfReview" class="btn-primary" @click="showSelfReviewForm = !showSelfReviewForm">Submit self review</button>
          <button v-if="canSubmitManagerReview" class="btn-secondary" @click="router.push({ name: 'performance.appraisals.show', params: { id: appraisal.id }, query: { review: 'manager' } })">Manager review</button>
          <button v-if="appraisal.status === 'completed' && !appraisal.employee_acknowledged" class="btn-success" @click="handleAcknowledge">Acknowledge</button>
        </div>
      </div>

      <!-- Self Review Form -->
      <div v-if="showSelfReviewForm" class="card">
        <div class="card-head">
          <h3 class="card-title">Self review</h3>
        </div>
        <div class="form">
          <div v-for="(rating, idx) in selfReviewForm.ratings" :key="idx" class="rating-block">
            <div class="rating-row">
              <p class="rating-label">{{ rating.category_label }}</p>
              <div class="rating-input">
                <span class="rating-hint">Rating (1–{{ maxRating }})</span>
                <input v-model.number="rating.rating" type="number" :min="1" :max="maxRating" class="input input-num" />
              </div>
            </div>
            <input v-model="rating.comments" type="text" placeholder="Comments (optional)" class="input" />
          </div>
          <div class="field">
            <label>Strengths</label>
            <textarea v-model="selfReviewForm.strengths" rows="2" class="input textarea" />
          </div>
          <div class="field">
            <label>Areas for improvement</label>
            <textarea v-model="selfReviewForm.improvement_areas" rows="2" class="input textarea" />
          </div>
          <div class="field">
            <label>Overall comments</label>
            <textarea v-model="selfReviewForm.overall_comments" rows="2" class="input textarea" />
          </div>
          <div class="form-actions">
            <button class="btn-secondary" @click="showSelfReviewForm = false">Cancel</button>
            <button class="btn-primary" :disabled="submitting" @click="handleSubmitSelfReview">{{ submitting ? 'Submitting…' : 'Submit self review' }}</button>
          </div>
        </div>
      </div>

      <!-- Review Cards -->
      <div v-if="appraisal.reviews && appraisal.reviews.length > 0" class="reviews">
        <div v-for="review in appraisal.reviews" :key="review.id" class="card review-card">
          <div class="review-head">
            <div>
              <h3 class="card-title cap">{{ review.review_type.replace('_', ' ') }} review</h3>
              <p class="card-sub">by {{ review.reviewer?.name ?? 'Unknown' }}</p>
            </div>
            <div class="review-status">
              <span :class="['badge', review.status === 'submitted' ? 'badge-ok' : 'badge-muted']">{{ review.status }}</span>
              <p v-if="review.overall_rating" class="review-overall">Overall: <strong>{{ review.overall_rating }}</strong></p>
            </div>
          </div>
          <div v-if="review.ratings && review.ratings.length > 0" class="ratings-list">
            <div v-for="r in review.ratings" :key="r.id" class="rating-line">
              <span class="rating-line-label">{{ r.category_label }}</span>
              <div class="rating-line-bar">
                <div class="track"><div class="fill" :style="{ width: (r.rating / r.max_rating * 100) + '%' }" /></div>
                <span class="rating-line-val">{{ r.rating }}/{{ r.max_rating }}</span>
              </div>
            </div>
          </div>
          <div v-if="review.strengths || review.improvement_areas || review.overall_comments" class="review-text">
            <p v-if="review.strengths"><span class="rt-label">Strengths:</span> {{ review.strengths }}</p>
            <p v-if="review.improvement_areas"><span class="rt-label">Improvements:</span> {{ review.improvement_areas }}</p>
            <p v-if="review.overall_comments"><span class="rt-label">Comments:</span> {{ review.overall_comments }}</p>
          </div>
        </div>
      </div>

      <!-- Acknowledgment -->
      <div v-if="appraisal.employee_acknowledged" class="ack-banner">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
        <p>Acknowledged on {{ appraisal.acknowledged_at ? formatDate(appraisal.acknowledged_at) : 'N/A' }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ad { display: flex; flex-direction: column; gap: 20px; color: #EEF0F4; }

.state-block { display: flex; justify-content: center; padding: 56px 0; }
.spinner { width: 28px; height: 28px; border: 2px solid #232936; border-top-color: #6B5BFF; border-radius: 50%; animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.state-error { background: rgba(243,130,136,.08); border: 1px solid rgba(243,130,136,.3); color: #F38288; padding: 14px 16px; border-radius: 10px; font-size: 13px; }

.ad-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ad-head-left { display: flex; align-items: flex-start; gap: 12px; }
.back-btn { width: 32px; height: 32px; padding: 0; background: #161A23; border: 1px solid #232936; border-radius: 8px; color: #7A8299; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: color .15s, border-color .15s; }
.back-btn:hover { color: #EEF0F4; border-color: #6B5BFF; }
.back-btn svg { width: 16px; height: 16px; }
.eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #7A8299; }
.ad-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.ad-title { font-family: 'Instrument Serif', serif; font-size: 30px; letter-spacing: -0.02em; color: #EEF0F4; margin: 0; line-height: 1.1; }
.ad-sub { font-size: 13px; color: #7A8299; margin: 4px 0 0; }
.ad-score { color: #EEF0F4; font-weight: 600; margin-left: 8px; }
.ad-rating { color: #7A8299; margin-left: 6px; }

.ad-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.btn-primary, .btn-secondary, .btn-success { padding: 8px 16px; font-size: 12.5px; font-weight: 600; border-radius: 8px; cursor: pointer; font-family: inherit; transition: opacity .15s, background .15s, border-color .15s; border: 1px solid transparent; }
.btn-primary { background: #6B5BFF; color: #fff; }
.btn-primary:hover { opacity: .9; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary { background: #161A23; border-color: #232936; color: #EEF0F4; }
.btn-secondary:hover { border-color: #6B5BFF; }
.btn-success { background: #4DD39A; color: #0D0F17; }
.btn-success:hover { opacity: .9; }

.card { background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 20px; }
.card-head { margin-bottom: 14px; }
.card-title { font-family: 'Instrument Serif', serif; font-size: 18px; color: #EEF0F4; letter-spacing: -0.01em; margin: 0; }
.card-title.cap { text-transform: capitalize; }
.card-sub { font-size: 12px; color: #7A8299; margin: 2px 0 0; }

.form { display: flex; flex-direction: column; gap: 14px; }
.rating-block { background: #0D0F17; border: 1px solid #232936; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.rating-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rating-label { font-size: 13px; font-weight: 500; color: #EEF0F4; margin: 0; }
.rating-input { display: flex; align-items: center; gap: 8px; }
.rating-hint { font-size: 11px; color: #7A8299; }
.input { padding: 8px 12px; font-size: 13px; color: #EEF0F4; background: #0D0F17; border: 1px solid #232936; border-radius: 8px; outline: none; transition: border-color .15s; font-family: inherit; width: 100%; }
.input:focus { border-color: #6B5BFF; }
.input-num { width: 64px; text-align: center; }
.textarea { resize: vertical; min-height: 60px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #7A8299; }

.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }

.reviews { display: flex; flex-direction: column; gap: 12px; }
.review-card { display: flex; flex-direction: column; gap: 14px; }
.review-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.review-status { text-align: right; }
.review-overall { font-size: 13px; color: #EEF0F4; margin: 6px 0 0; }
.review-overall strong { font-family: 'JetBrains Mono', monospace; }

.ratings-list { display: flex; flex-direction: column; gap: 8px; }
.rating-line { display: grid; grid-template-columns: 1fr 220px; gap: 12px; align-items: center; }
.rating-line-label { font-size: 12.5px; color: #EEF0F4; }
.rating-line-bar { display: flex; align-items: center; gap: 10px; }
.track { flex: 1; height: 5px; background: #232936; border-radius: 3px; overflow: hidden; }
.fill { height: 100%; background: #6B5BFF; border-radius: 3px; transition: width .3s; }
.rating-line-val { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #7A8299; min-width: 48px; text-align: right; }

.review-text { display: flex; flex-direction: column; gap: 6px; padding-top: 12px; border-top: 1px solid #232936; }
.review-text p { margin: 0; font-size: 12.5px; color: #EEF0F4; line-height: 1.5; }
.rt-label { color: #7A8299; font-weight: 600; margin-right: 4px; }

.ack-banner { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: rgba(77,211,154,.08); border: 1px solid rgba(77,211,154,.3); border-radius: 10px; color: #4DD39A; font-size: 13px; }
.ack-banner svg { width: 18px; height: 18px; flex-shrink: 0; }
.ack-banner p { margin: 0; }

.badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap; }
.badge-muted { background: rgba(122,130,153,.12); color: #7A8299; border-color: rgba(122,130,153,.25); }
.badge-accent { background: rgba(107,91,255,.12); color: #6B5BFF; border-color: rgba(107,91,255,.3); }
.badge-warn { background: rgba(245,166,35,.12); color: #F5A623; border-color: rgba(245,166,35,.3); }
.badge-ok { background: rgba(77,211,154,.12); color: #4DD39A; border-color: rgba(77,211,154,.25); }
</style>
