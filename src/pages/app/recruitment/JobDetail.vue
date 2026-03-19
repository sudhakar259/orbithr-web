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

// State
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

const getStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    draft: 'bg-gray-700 text-gray-300',
    published: 'bg-green-900/50 text-green-400',
    closed: 'bg-red-900/50 text-red-400',
    cancelled: 'bg-yellow-900/50 text-yellow-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
}

const getAppStatusClasses = (status: string) => {
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

const getBoardStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-900/50 text-yellow-400',
    published: 'bg-green-900/50 text-green-400',
    failed: 'bg-red-900/50 text-red-400',
    removed: 'bg-gray-700 text-gray-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
}

const formatEmploymentType = (type: string) => {
  const map: Record<string, string> = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    internship: 'Internship',
    freelance: 'Freelance',
  }
  return map[type] ?? type
}

const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const renderStars = (rating?: number) => {
  const r = rating ?? 0
  return Array.from({ length: 5 }, (_, i) => i < r)
}

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
  } catch {
    // silent
  }
}

const loadBoardPostings = async () => {
  try {
    const res = await recruitmentService.getBoardPostings(jobId.value)
    boardPostings.value = res.data?.data ?? []
  } catch {
    // silent
  }
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
  <div class="space-y-6">
    <!-- Back nav -->
    <button
      @click="router.push({ name: 'recruitment' })"
      class="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center"
    >
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Jobs
    </button>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
        <div class="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div class="h-4 bg-gray-700 rounded w-2/3 mb-2"></div>
        <div class="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else-if="job">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left column (2/3) -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Job header -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h1 class="text-2xl font-bold text-white">{{ job.title }}</h1>
                <div class="flex items-center space-x-3 mt-2 text-sm text-gray-400">
                  <span v-if="job.department">{{ job.department }}</span>
                  <span v-if="job.department && job.location" class="text-gray-600">|</span>
                  <span v-if="job.location">{{ job.location }}</span>
                  <span v-if="job.is_remote" class="text-blue-400">Remote</span>
                </div>
              </div>
              <span
                :class="[getStatusClasses(job.status), 'inline-flex px-3 py-1 text-xs font-semibold rounded-full']"
              >
                {{ job.status }}
              </span>
            </div>
            <div class="flex items-center space-x-4 text-sm text-gray-400">
              <span>{{ formatEmploymentType(job.employment_type) }}</span>
              <span class="text-gray-600">|</span>
              <span>{{ job.experience_level }} level</span>
              <span v-if="job.min_salary || job.max_salary" class="text-gray-600">|</span>
              <span v-if="job.min_salary || job.max_salary">
                {{ job.salary_currency }}
                {{ job.min_salary?.toLocaleString() }}
                <template v-if="job.max_salary"> - {{ job.max_salary.toLocaleString() }}</template>
              </span>
            </div>
          </div>

          <!-- Description -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-5">
            <div v-if="job.description">
              <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Description</h3>
              <p class="text-sm text-gray-400 whitespace-pre-wrap">{{ job.description }}</p>
            </div>
            <div v-if="job.requirements">
              <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Requirements</h3>
              <p class="text-sm text-gray-400 whitespace-pre-wrap">{{ job.requirements }}</p>
            </div>
            <div v-if="job.responsibilities">
              <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Responsibilities</h3>
              <p class="text-sm text-gray-400 whitespace-pre-wrap">{{ job.responsibilities }}</p>
            </div>

            <!-- Skills -->
            <div v-if="job.required_skills?.length" class="pt-2">
              <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Required Skills</h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="skill in job.required_skills"
                  :key="skill"
                  class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300"
                >
                  {{ skill }}
                </span>
              </div>
            </div>
            <div v-if="job.preferred_skills?.length" class="pt-2">
              <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Preferred Skills</h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="skill in job.preferred_skills"
                  :key="skill"
                  class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/50 text-purple-300"
                >
                  {{ skill }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column (1/3) -->
        <div class="space-y-6">
          <!-- Quick stats -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
            <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Quick Stats</h3>
            <div class="space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Applications</span>
                <span class="text-white font-medium">{{ job.applications_count }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Vacancies</span>
                <span class="text-white font-medium">{{ job.vacancies }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Deadline</span>
                <span class="text-white font-medium">{{ formatDate(job.application_deadline) }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Views</span>
                <span class="text-white font-medium">{{ job.views_count }}</span>
              </div>
            </div>
          </div>

          <!-- Publish to boards -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
            <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Job Boards</h3>
            <button
              v-if="job.status === 'published'"
              @click="showPublishModal = true"
              class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Publish to Job Boards
            </button>
            <p v-else class="text-sm text-gray-500">Publish the job first to post to job boards.</p>

            <!-- Existing postings -->
            <div v-if="boardPostings.length" class="space-y-2 pt-2">
              <div
                v-for="posting in boardPostings"
                :key="posting.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-300 capitalize">{{ posting.platform }}</span>
                <span
                  :class="[getBoardStatusClasses(posting.status), 'px-2 py-0.5 text-xs font-medium rounded-full']"
                >
                  {{ posting.status }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-3">
            <button
              @click="router.push({ name: 'recruitment.jobs.edit', params: { id: job.id } })"
              class="w-full px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Edit Job
            </button>
          </div>
        </div>
      </div>

      <!-- Applications pipeline -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div class="border-b border-gray-700 px-6 py-4">
          <h2 class="text-lg font-semibold text-white">Applications</h2>
        </div>

        <!-- Status tabs -->
        <div class="border-b border-gray-700 px-6 overflow-x-auto">
          <nav class="-mb-px flex space-x-6">
            <button
              v-for="tab in statusTabs"
              :key="tab.key"
              @click="activeStatusTab = tab.key"
              :class="[
                activeStatusTab === tab.key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500',
                'whitespace-nowrap pb-3 pt-3 px-1 border-b-2 font-medium text-sm transition-colors',
              ]"
            >
              {{ tab.label }}
              <span
                v-if="tab.key === 'all'"
                class="ml-1.5 text-xs text-gray-500"
              >({{ applications.length }})</span>
            </button>
          </nav>
        </div>

        <!-- Application cards -->
        <div class="p-6">
          <div v-if="filteredApplications.length === 0" class="text-center py-8">
            <p class="text-gray-500 text-sm">No applications in this category.</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="app in filteredApplications"
              :key="app.id"
              @click="openApplication(app)"
              class="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-gray-600 cursor-pointer transition-colors"
            >
              <div class="flex items-center space-x-4">
                <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
                  {{ app.applicant_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() }}
                </div>
                <div>
                  <p class="text-sm font-medium text-white">{{ app.applicant_name }}</p>
                  <p class="text-xs text-gray-400">{{ app.applicant_email }}</p>
                </div>
              </div>
              <div class="flex items-center space-x-4">
                <span
                  class="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-300"
                >{{ app.source }}</span>
                <!-- Stars -->
                <div class="flex items-center space-x-0.5">
                  <svg
                    v-for="(filled, i) in renderStars(app.rating)"
                    :key="i"
                    class="w-3.5 h-3.5"
                    :class="filled ? 'text-yellow-400' : 'text-gray-600'"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span class="text-xs text-gray-500">{{ formatDate(app.submitted_at) }}</span>
                <span
                  :class="[getAppStatusClasses(app.status), 'px-2 py-0.5 text-xs font-medium rounded-full']"
                >
                  {{ app.status.replace(/_/g, ' ') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Modals -->
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
