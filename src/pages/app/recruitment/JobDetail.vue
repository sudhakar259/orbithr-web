<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  recruitmentService,
  type JobPosting,
  type JobApplication,
  type BoardPosting,
} from '@/services/recruitmentService'
import ApplicationDetailModal from '@/pages/app/recruitment/ApplicationDetailModal.vue'
import PublishToBoardsModal from '@/pages/app/recruitment/PublishToBoardsModal.vue'

const router = useRouter()
const route = useRoute()
const jobId = computed(() => Number(route.params.id))

const job = ref<JobPosting | null>(null)
const applications = ref<JobApplication[]>([])
const boardPostings = ref<BoardPosting[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const activeStatusTab = ref('all')
const showApplicationModal = ref(false)
const selectedApplication = ref<JobApplication | null>(null)
const showPublishModal = ref(false)

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview_scheduled', label: 'Interview' },
  { key: 'offered', label: 'Offered' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
]

const filteredApplications = computed(() => {
  if (activeStatusTab.value === 'all') return applications.value
  return applications.value.filter((a) => a.status === activeStatusTab.value)
})

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    draft: 'jd-badge-muted',
    published: 'jd-badge-green',
    closed: 'jd-badge-red',
    cancelled: 'jd-badge-yellow',
  }
  return map[status] ?? 'jd-badge-muted'
}

const getAppStatusClass = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'jd-badge-blue',
    under_review: 'jd-badge-yellow',
    shortlisted: 'jd-badge-purple',
    interview_scheduled: 'jd-badge-indigo',
    interviewed: 'jd-badge-teal',
    offered: 'jd-badge-green',
    hired: 'jd-badge-green',
    rejected: 'jd-badge-red',
    withdrawn: 'jd-badge-muted',
  }
  return map[status] ?? 'jd-badge-muted'
}

const getBoardStatusClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'jd-badge-yellow',
    published: 'jd-badge-green',
    failed: 'jd-badge-red',
    removed: 'jd-badge-muted',
  }
  return map[status] ?? 'jd-badge-muted'
}

const formatEmploymentType = (type: string) => {
  const map: Record<string, string> = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', internship: 'Internship', freelance: 'Freelance' }
  return map[type] ?? type
}

const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const renderStars = (rating?: number) => {
  const r = rating ?? 0
  return Array.from({ length: 5 }, (_, i) => i < r)
}

const initials = (name: string) => name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

const openApplication = (app: JobApplication) => {
  selectedApplication.value = app
  showApplicationModal.value = true
}

const onApplicationUpdated = async () => {
  showApplicationModal.value = false
  selectedApplication.value = null
  await loadApplications()
}

const loadApplications = async () => {
  try {
    const res = await recruitmentService.getJobApplications(jobId.value)
    applications.value = res.data?.data ?? []
  } catch { /* silent */ }
}

const loadBoardPostings = async () => {
  try {
    const res = await recruitmentService.getBoardPostings(jobId.value)
    boardPostings.value = res.data?.data ?? []
  } catch { /* silent */ }
}

const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await recruitmentService.getJob(jobId.value)
    job.value = res.data?.data ?? res.data
    await Promise.all([loadApplications(), loadBoardPostings()])
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to load job'
  } finally {
    loading.value = false
  }
}

const onBoardsPublished = async () => {
  showPublishModal.value = false
  await loadBoardPostings()
}

onMounted(loadData)
</script>

<template>
  <div class="jd-page">
    <button class="jd-back" @click="router.push({ name: 'recruitment' })">&#8592; Back to Jobs</button>

    <div v-if="loading" class="jd-loading">
      <div v-for="i in 3" :key="i" class="jd-skeleton"></div>
    </div>

    <div v-else-if="error" class="jd-error">{{ error }}</div>

    <template v-else-if="job">
      <div class="jd-content-grid">
        <!-- Left column -->
        <div class="jd-main">
          <!-- Job header -->
          <div class="jd-card">
            <div class="jd-job-top">
              <div>
                <h1 class="jd-job-title">{{ job.title }}</h1>
                <div class="jd-job-meta">
                  <span v-if="job.department">{{ job.department }}</span>
                  <span v-if="job.department && job.location" class="jd-sep">|</span>
                  <span v-if="job.location">{{ job.location }}</span>
                  <span v-if="job.is_remote" class="jd-remote">Remote</span>
                </div>
              </div>
              <span :class="['jd-badge', getStatusClass(job.status)]">{{ job.status }}</span>
            </div>
            <div class="jd-job-type-row">
              <span>{{ formatEmploymentType(job.employment_type) }}</span>
              <span class="jd-sep">|</span>
              <span>{{ job.experience_level }} level</span>
              <template v-if="job.min_salary || job.max_salary">
                <span class="jd-sep">|</span>
                <span>{{ job.salary_currency }} {{ job.min_salary?.toLocaleString() }}<template v-if="job.max_salary"> – {{ job.max_salary.toLocaleString() }}</template></span>
              </template>
            </div>
          </div>

          <!-- Description -->
          <div class="jd-card jd-desc-card">
            <div v-if="job.description" class="jd-section">
              <h3 class="jd-section-title">Description</h3>
              <p class="jd-section-text">{{ job.description }}</p>
            </div>
            <div v-if="job.requirements" class="jd-section">
              <h3 class="jd-section-title">Requirements</h3>
              <p class="jd-section-text">{{ job.requirements }}</p>
            </div>
            <div v-if="job.responsibilities" class="jd-section">
              <h3 class="jd-section-title">Responsibilities</h3>
              <p class="jd-section-text">{{ job.responsibilities }}</p>
            </div>
            <div v-if="job.required_skills?.length" class="jd-section">
              <h3 class="jd-section-title">Required Skills</h3>
              <div class="jd-chips">
                <span v-for="skill in job.required_skills" :key="skill" class="jd-chip jd-chip-blue">{{ skill }}</span>
              </div>
            </div>
            <div v-if="job.preferred_skills?.length" class="jd-section">
              <h3 class="jd-section-title">Preferred Skills</h3>
              <div class="jd-chips">
                <span v-for="skill in job.preferred_skills" :key="skill" class="jd-chip jd-chip-purple">{{ skill }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="jd-sidebar">
          <div class="jd-card">
            <h3 class="jd-sidebar-title">Quick Stats</h3>
            <div class="jd-stats">
              <div class="jd-stat-row"><span class="jd-stat-label">Applications</span><span class="jd-stat-val">{{ job.applications_count }}</span></div>
              <div class="jd-stat-row"><span class="jd-stat-label">Vacancies</span><span class="jd-stat-val">{{ job.vacancies }}</span></div>
              <div class="jd-stat-row"><span class="jd-stat-label">Deadline</span><span class="jd-stat-val">{{ formatDate(job.application_deadline) }}</span></div>
              <div class="jd-stat-row"><span class="jd-stat-label">Views</span><span class="jd-stat-val">{{ job.views_count }}</span></div>
            </div>
          </div>

          <div class="jd-card">
            <h3 class="jd-sidebar-title">Job Boards</h3>
            <button v-if="job.status === 'published'" class="jd-btn-primary jd-full" @click="showPublishModal = true">
              Publish to Job Boards
            </button>
            <p v-else class="jd-text-muted">Publish the job first to post to job boards.</p>
            <div v-if="boardPostings.length" class="jd-board-list">
              <div v-for="posting in boardPostings" :key="posting.id" class="jd-board-row">
                <span class="jd-board-platform">{{ posting.platform }}</span>
                <span :class="['jd-badge', getBoardStatusClass(posting.status)]">{{ posting.status }}</span>
              </div>
            </div>
          </div>

          <div class="jd-card">
            <button class="jd-btn-ghost jd-full" @click="router.push({ name: 'recruitment.jobs.edit', params: { id: job.id } })">Edit Job</button>
          </div>
        </div>
      </div>

      <!-- Applications -->
      <div class="jd-apps-card">
        <div class="jd-apps-head">
          <h2 class="jd-apps-title">Applications</h2>
        </div>

        <!-- Tab nav -->
        <div class="jd-tab-bar">
          <button
            v-for="tab in statusTabs"
            :key="tab.key"
            :class="['jd-tab', activeStatusTab === tab.key ? 'jd-tab-active' : '']"
            @click="activeStatusTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.key === 'all'" class="jd-tab-count">({{ applications.length }})</span>
          </button>
        </div>

        <div class="jd-apps-body">
          <div v-if="filteredApplications.length === 0" class="jd-apps-empty">No applications in this category.</div>
          <div v-else class="jd-apps-list">
            <div
              v-for="app in filteredApplications"
              :key="app.id"
              class="jd-app-card"
              @click="openApplication(app)"
            >
              <div class="jd-app-left">
                <div class="jd-app-avatar">{{ initials(app.applicant_name) }}</div>
                <div>
                  <p class="jd-app-name">{{ app.applicant_name }}</p>
                  <p class="jd-app-email">{{ app.applicant_email }}</p>
                </div>
              </div>
              <div class="jd-app-right">
                <span class="jd-chip jd-chip-muted">{{ app.source }}</span>
                <div class="jd-stars">
                  <span
                    v-for="(filled, i) in renderStars(app.rating)"
                    :key="i"
                    class="jd-star"
                    :class="{ 'jd-star-filled': filled }"
                  >&#9733;</span>
                </div>
                <span class="jd-app-date">{{ formatDate(app.submitted_at) }}</span>
                <span :class="['jd-badge', getAppStatusClass(app.status)]">{{ app.status.replace(/_/g, ' ') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <ApplicationDetailModal
      v-if="showApplicationModal && selectedApplication"
      :application="selectedApplication"
      @close="showApplicationModal = false"
      @updated="onApplicationUpdated"
    />

    <PublishToBoardsModal
      v-if="showPublishModal && job"
      :job-id="job.id"
      @close="showPublishModal = false"
      @published="onBoardsPublished"
    />
  </div>
</template>

<style scoped>
.jd-page { display: flex; flex-direction: column; gap: 16px; }
.jd-back { font-size: 13px; color: #7A8299; background: none; border: none; cursor: pointer; text-align: left; padding: 0; }
.jd-back:hover { color: #EEF0F4; }
.jd-loading { display: flex; flex-direction: column; gap: 10px; }
.jd-skeleton { height: 80px; background: #232936; border-radius: 10px; animation: jd-pulse 1.2s ease-in-out infinite; }
@keyframes jd-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.jd-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.jd-content-grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; align-items: start; }
.jd-main { display: flex; flex-direction: column; gap: 12px; }
.jd-sidebar { display: flex; flex-direction: column; gap: 12px; }
.jd-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 18px; }
.jd-job-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.jd-job-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0 0 6px; }
.jd-job-meta { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #7A8299; flex-wrap: wrap; }
.jd-remote { color: #7ED7FF; }
.jd-job-type-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #7A8299; flex-wrap: wrap; }
.jd-sep { color: #2D3448; }
.jd-desc-card { display: flex; flex-direction: column; gap: 14px; }
.jd-section { display: flex; flex-direction: column; gap: 6px; }
.jd-section-title { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
.jd-section-text { font-size: 13px; color: #B6BED0; margin: 0; white-space: pre-wrap; }
.jd-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.jd-chip { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.jd-chip-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.jd-chip-purple { background: rgba(178,141,255,0.12); color: #B28DFF; }
.jd-chip-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.jd-sidebar-title { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px; }
.jd-stats { display: flex; flex-direction: column; gap: 8px; }
.jd-stat-row { display: flex; justify-content: space-between; font-size: 13px; }
.jd-stat-label { color: #7A8299; }
.jd-stat-val { font-weight: 500; color: #EEF0F4; }
.jd-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
.jd-btn-primary:hover { opacity: 0.88; }
.jd-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 14px; font-size: 13px; cursor: pointer; }
.jd-btn-ghost:hover { color: #EEF0F4; }
.jd-full { width: 100%; box-sizing: border-box; }
.jd-text-muted { font-size: 13px; color: #7A8299; margin: 0; }
.jd-board-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.jd-board-row { display: flex; align-items: center; justify-content: space-between; }
.jd-board-platform { font-size: 12px; color: #B6BED0; text-transform: capitalize; }
.jd-apps-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.jd-apps-head { padding: 14px 16px; border-bottom: 1px solid #232936; }
.jd-apps-title { font-size: 15px; font-weight: 700; color: #EEF0F4; margin: 0; }
.jd-tab-bar { display: flex; border-bottom: 1px solid #232936; overflow-x: auto; padding: 0 16px; }
.jd-tab { padding: 10px 12px; font-size: 13px; font-weight: 500; color: #7A8299; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; }
.jd-tab:hover { color: #B6BED0; }
.jd-tab-active { color: #6B5BFF; border-bottom-color: #6B5BFF; }
.jd-tab-count { color: #7A8299; font-weight: 400; margin-left: 4px; }
.jd-apps-body { padding: 16px; }
.jd-apps-empty { text-align: center; font-size: 13px; color: #7A8299; padding: 24px 0; }
.jd-apps-list { display: flex; flex-direction: column; gap: 8px; }
.jd-app-card { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(13,15,23,0.5); border: 1px solid #232936; border-radius: 8px; cursor: pointer; gap: 12px; }
.jd-app-card:hover { border-color: #2D3448; }
.jd-app-left { display: flex; align-items: center; gap: 12px; }
.jd-app-avatar { width: 36px; height: 36px; border-radius: 50%; background: #232936; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #B6BED0; flex-shrink: 0; }
.jd-app-name { font-size: 13px; font-weight: 500; color: #EEF0F4; margin: 0 0 2px; }
.jd-app-email { font-size: 11px; color: #7A8299; margin: 0; }
.jd-app-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
.jd-stars { display: flex; gap: 1px; }
.jd-star { font-size: 12px; color: #2D3448; }
.jd-star-filled { color: #F5A623; }
.jd-app-date { font-size: 11px; color: #7A8299; }
.jd-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.jd-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.jd-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.jd-badge-purple { background: rgba(178,141,255,0.12); color: #B28DFF; }
.jd-badge-indigo { background: rgba(107,91,255,0.12); color: #8A7BFF; }
.jd-badge-teal   { background: rgba(77,211,154,0.10); color: #4DD39A; }
.jd-badge-red    { background: rgba(243,130,136,0.12); color: #F38288; }
.jd-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.jd-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
</style>
