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

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'adm-badge-blue',
    under_review: 'adm-badge-yellow',
    shortlisted: 'adm-badge-purple',
    interview_scheduled: 'adm-badge-indigo',
    interviewed: 'adm-badge-teal',
    offered: 'adm-badge-green',
    hired: 'adm-badge-green',
    rejected: 'adm-badge-red',
    withdrawn: 'adm-badge-muted',
  }
  return map[status] ?? 'adm-badge-muted'
}

const getStageClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'adm-stage-yellow',
    completed: 'adm-stage-green',
    cancelled: 'adm-stage-muted',
  }
  return map[status] ?? 'adm-stage-muted'
}

const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const initials = computed(() =>
  props.application.applicant_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
)

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
  if (!rejectionReason.value.trim()) { error.value = 'Please provide a rejection reason'; return }
  handleAction(() => recruitmentService.rejectApplication(props.application.id, rejectionReason.value))
}

const scheduleInterview = () => {
  if (!interviewDate.value) { error.value = 'Please select a date'; return }
  handleAction(() => recruitmentService.scheduleInterview(props.application.id, { date: interviewDate.value, notes: interviewNotes.value || undefined }))
}

const markInterviewed = () => handleAction(() => recruitmentService.updateStatus(props.application.id, 'interviewed'))
const makeOffer = () => handleAction(() => recruitmentService.makeOffer(props.application.id))
const hire = () => handleAction(() => recruitmentService.hireApplicant(props.application.id))
const submitRating = () => handleAction(() => recruitmentService.rateApplication(props.application.id, { rating: ratingValue.value }))
</script>

<template>
  <Teleport to="body">
    <div class="adm-overlay">
      <div class="adm-backdrop" @click="emit('close')"></div>
      <div class="adm-panel">
        <!-- Header -->
        <div class="adm-head">
          <h2 class="adm-head-title">Application Details</h2>
          <button class="adm-close" @click="emit('close')">&#10005;</button>
        </div>

        <!-- Body -->
        <div class="adm-body">
          <div v-if="error" class="adm-error">{{ error }}</div>

          <!-- Applicant -->
          <div class="adm-applicant">
            <div class="adm-avatar">{{ initials }}</div>
            <div>
              <h3 class="adm-name">{{ application.applicant_name }}</h3>
              <p class="adm-email">{{ application.applicant_email }}</p>
              <p v-if="application.applicant_phone" class="adm-email">{{ application.applicant_phone }}</p>
            </div>
          </div>

          <div class="adm-badges-row">
            <span :class="['adm-badge', getStatusClass(application.status)]">{{ application.status.replace(/_/g, ' ') }}</span>
            <span class="adm-badge adm-badge-muted">{{ application.source }}</span>
            <span class="adm-submitted">Submitted {{ formatDate(application.submitted_at) }}</span>
          </div>

          <!-- Cover Letter -->
          <div v-if="application.cover_letter" class="adm-section">
            <h4 class="adm-section-title">Cover Letter</h4>
            <p class="adm-cover">{{ application.cover_letter }}</p>
          </div>

          <!-- Links -->
          <div class="adm-section">
            <a v-if="application.resume_path" :href="application.resume_path" target="_blank" class="adm-link">&#8595; Download Resume</a>
            <a v-if="application.portfolio_url" :href="application.portfolio_url" target="_blank" class="adm-link">&#8599; Portfolio</a>
          </div>

          <!-- Rating -->
          <div class="adm-section">
            <h4 class="adm-section-title">Rating</h4>
            <div class="adm-stars">
              <button
                v-for="(_, i) in 5"
                :key="i"
                class="adm-star"
                :class="{ 'adm-star-filled': i < ratingValue }"
                @click="ratingValue = i + 1"
              >&#9733;</button>
              <button
                v-if="ratingValue !== (application.rating ?? 0)"
                class="adm-save-rating"
                :disabled="loading"
                @click="submitRating"
              >Save</button>
            </div>
          </div>

          <!-- Interview Stages -->
          <div v-if="stages.length" class="adm-section">
            <h4 class="adm-section-title">Interview Stages</h4>
            <div v-for="(stage, i) in stages" :key="i" :class="['adm-stage', getStageClass(stage.status)]">
              <div class="adm-stage-row">
                <span class="adm-stage-name">{{ stage.stage }}</span>
                <span class="adm-stage-date">{{ formatDate(stage.date) }}</span>
              </div>
              <p v-if="stage.interviewer" class="adm-stage-meta">Interviewer: {{ stage.interviewer }}</p>
              <p v-if="stage.notes" class="adm-stage-note">{{ stage.notes }}</p>
            </div>
          </div>

          <!-- Feedback -->
          <div v-if="application.feedback" class="adm-section">
            <h4 class="adm-section-title">Feedback</h4>
            <p class="adm-text-muted">{{ application.feedback }}</p>
          </div>

          <!-- Rejection reason -->
          <div v-if="application.rejection_reason" class="adm-section">
            <h4 class="adm-section-title">Rejection Reason</h4>
            <p class="adm-text-red">{{ application.rejection_reason }}</p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="adm-footer">
          <!-- Schedule form -->
          <div v-if="showScheduleForm" class="adm-sub-form">
            <div class="adm-field">
              <label class="adm-label">Interview Date</label>
              <input v-model="interviewDate" type="date" class="adm-input" />
            </div>
            <div class="adm-field">
              <label class="adm-label">Notes (optional)</label>
              <textarea v-model="interviewNotes" rows="2" class="adm-input adm-textarea" placeholder="Interview details…"></textarea>
            </div>
            <div class="adm-sub-actions">
              <button class="adm-btn-indigo" :disabled="loading" @click="scheduleInterview">Confirm Schedule</button>
              <button class="adm-btn-ghost" @click="showScheduleForm = false">Cancel</button>
            </div>
          </div>

          <!-- Reject form -->
          <div v-if="showRejectInput" class="adm-sub-form">
            <div class="adm-field">
              <label class="adm-label">Rejection Reason</label>
              <textarea v-model="rejectionReason" rows="3" class="adm-input adm-textarea" placeholder="Reason for rejection…"></textarea>
            </div>
            <div class="adm-sub-actions">
              <button class="adm-btn-red" :disabled="loading" @click="reject">Confirm Rejection</button>
              <button class="adm-btn-ghost" @click="showRejectInput = false">Cancel</button>
            </div>
          </div>

          <!-- Action buttons -->
          <div v-if="!showRejectInput && !showScheduleForm" class="adm-action-btns">
            <button v-if="canShortlist" class="adm-btn-purple" :disabled="loading" @click="shortlist">Shortlist</button>
            <button v-if="canScheduleInterview" class="adm-btn-indigo" @click="showScheduleForm = true">Schedule Interview</button>
            <button v-if="canMarkInterviewed" class="adm-btn-teal" :disabled="loading" @click="markInterviewed">Mark Interviewed</button>
            <button v-if="canMakeOffer" class="adm-btn-green" :disabled="loading" @click="makeOffer">Make Offer</button>
            <button v-if="canHire" class="adm-btn-green" :disabled="loading" @click="hire">Mark Hired</button>
            <button v-if="canReject" class="adm-btn-reject" @click="showRejectInput = true">Reject</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.adm-overlay { position: fixed; inset: 0; z-index: 50; overflow: hidden; }
.adm-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
.adm-panel { position: absolute; inset-y: 0; right: 0; width: 100%; max-width: 480px; background: #161A23; border-left: 1px solid #232936; display: flex; flex-direction: column; overflow: hidden; }
.adm-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #232936; flex-shrink: 0; }
.adm-head-title { font-size: 15px; font-weight: 700; color: #EEF0F4; margin: 0; }
.adm-close { background: none; border: none; color: #7A8299; font-size: 16px; cursor: pointer; line-height: 1; }
.adm-close:hover { color: #EEF0F4; }
.adm-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.adm-error { padding: 10px 14px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.adm-applicant { display: flex; align-items: center; gap: 14px; }
.adm-avatar { width: 48px; height: 48px; border-radius: 50%; background: #232936; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; color: #B6BED0; flex-shrink: 0; }
.adm-name { font-size: 15px; font-weight: 700; color: #EEF0F4; margin: 0 0 2px; }
.adm-email { font-size: 12px; color: #7A8299; margin: 0; }
.adm-badges-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.adm-submitted { font-size: 12px; color: #7A8299; }
.adm-section { display: flex; flex-direction: column; gap: 8px; }
.adm-section-title { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
.adm-cover { font-size: 13px; color: #B6BED0; background: rgba(13,15,23,0.5); border: 1px solid #232936; border-radius: 7px; padding: 12px; white-space: pre-wrap; margin: 0; }
.adm-link { font-size: 13px; color: #6B5BFF; text-decoration: none; display: inline-block; margin-right: 12px; }
.adm-link:hover { color: #8A7BFF; }
.adm-stars { display: flex; align-items: center; gap: 4px; }
.adm-star { background: none; border: none; font-size: 20px; color: #2D3448; cursor: pointer; padding: 0; line-height: 1; }
.adm-star-filled { color: #F5A623; }
.adm-save-rating { margin-left: 8px; background: #6B5BFF; border: none; color: #fff; border-radius: 5px; padding: 4px 10px; font-size: 11px; cursor: pointer; }
.adm-save-rating:disabled { opacity: 0.5; }
.adm-stage { border-left: 2px solid; padding-left: 12px; padding-top: 6px; padding-bottom: 6px; border-radius: 0 6px 6px 0; }
.adm-stage-green { border-color: #4DD39A; background: rgba(77,211,154,0.05); }
.adm-stage-yellow { border-color: #F5A623; background: rgba(245,166,35,0.05); }
.adm-stage-muted { border-color: #2D3448; background: rgba(35,41,54,0.3); }
.adm-stage-row { display: flex; align-items: center; justify-content: space-between; }
.adm-stage-name { font-size: 13px; font-weight: 500; color: #EEF0F4; }
.adm-stage-date { font-size: 12px; color: #7A8299; }
.adm-stage-meta { font-size: 12px; color: #7A8299; margin: 2px 0 0; }
.adm-stage-note { font-size: 12px; color: #7A8299; margin: 2px 0 0; }
.adm-text-muted { font-size: 13px; color: #7A8299; margin: 0; }
.adm-text-red { font-size: 13px; color: #F38288; margin: 0; }
.adm-footer { padding: 16px 20px; border-top: 1px solid #232936; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; }
.adm-sub-form { display: flex; flex-direction: column; gap: 10px; }
.adm-field { display: flex; flex-direction: column; gap: 4px; }
.adm-label { font-size: 12px; color: #B6BED0; }
.adm-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 7px 10px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.adm-input:focus { border-color: #6B5BFF; }
.adm-textarea { resize: vertical; min-height: 60px; }
.adm-sub-actions { display: flex; gap: 8px; }
.adm-action-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.adm-btn-purple { background: rgba(178,141,255,0.15); border: 1px solid rgba(178,141,255,0.3); color: #B28DFF; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.adm-btn-indigo { background: rgba(107,91,255,0.15); border: 1px solid rgba(107,91,255,0.3); color: #8A7BFF; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.adm-btn-teal { background: rgba(77,211,154,0.12); border: 1px solid rgba(77,211,154,0.25); color: #4DD39A; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.adm-btn-green { background: rgba(77,211,154,0.15); border: 1px solid rgba(77,211,154,0.3); color: #4DD39A; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.adm-btn-red { background: rgba(243,130,136,0.15); border: 1px solid rgba(243,130,136,0.3); color: #F38288; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.adm-btn-reject { background: rgba(243,130,136,0.08); border: 1px solid rgba(243,130,136,0.2); color: #F38288; border-radius: 7px; padding: 7px 14px; font-size: 12px; cursor: pointer; }
.adm-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 7px 14px; font-size: 12px; cursor: pointer; }
.adm-btn-ghost:hover { color: #EEF0F4; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.adm-badge-blue    { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.adm-badge-yellow  { background: rgba(245,166,35,0.12); color: #F5A623; }
.adm-badge-purple  { background: rgba(178,141,255,0.12); color: #B28DFF; }
.adm-badge-indigo  { background: rgba(107,91,255,0.12); color: #8A7BFF; }
.adm-badge-teal    { background: rgba(77,211,154,0.10); color: #4DD39A; }
.adm-badge-green   { background: rgba(77,211,154,0.12); color: #4DD39A; }
.adm-badge-red     { background: rgba(243,130,136,0.12); color: #F38288; }
.adm-badge-muted   { background: rgba(122,130,153,0.12); color: #7A8299; }
</style>
