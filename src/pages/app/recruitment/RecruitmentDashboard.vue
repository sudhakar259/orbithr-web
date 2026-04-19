<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  recruitmentService,
  type JobPosting,
  type RecruitmentStats,
} from '@/services/recruitmentService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

const router = useRouter()

// State
const jobs = ref<JobPosting[]>([])
const stats = ref<RecruitmentStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const statusFilter = ref('all')
const searchQuery = ref('')

// Computed
const filteredJobs = computed(() => {
  let list = jobs.value
  if (statusFilter.value !== 'all') {
    list = list.filter((j) => j.status === statusFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.department ?? '').toLowerCase().includes(q) ||
        (j.location ?? '').toLowerCase().includes(q),
    )
  }
  return list
})

// Methods
const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    const [jobsRes, statsRes] = await Promise.all([
      recruitmentService.getJobs(),
      recruitmentService.getStats(),
    ])
    jobs.value = jobsRes.data?.data ?? []
    stats.value = statsRes.data?.data ?? null
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to load recruitment data'
  } finally {
    loading.value = false
  }
}

const publishJob = async (job: JobPosting) => {
  try {
    await recruitmentService.publishJob(job.id)
    await loadData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to publish job'
  }
}

const closeJob = async (job: JobPosting) => {
  try {
    await recruitmentService.closeJob(job.id)
    await loadData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to close job'
  }
}

const deleteJob = async (job: JobPosting) => {
  if (!await dialog('Delete', `Delete "${job.title}"? This cannot be undone.`)) return
  try {
    await recruitmentService.deleteJob(job.id)
    await loadData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to delete job'
  }
}

const getStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    draft: 'bg-gray-700 text-gray-300',
    published: 'bg-green-900/50 text-green-400',
    closed: 'bg-red-900/50 text-red-400',
    cancelled: 'bg-yellow-900/50 text-yellow-400',
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

onMounted(loadData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white">Recruitment</h1>
        <p class="text-gray-400 text-sm mt-1">Manage job postings and track applications.</p>
      </div>
      <button
        @click="router.push({ name: 'recruitment.jobs.create' })"
        class="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Job
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="stat in [
          { label: 'Total Jobs', value: stats?.total_jobs ?? 0, icon: 'briefcase', color: 'blue' },
          { label: 'Open Jobs', value: stats?.open_jobs ?? 0, icon: 'check-circle', color: 'green' },
          { label: 'Applications This Month', value: stats?.applications_this_month ?? 0, icon: 'inbox', color: 'purple' },
          { label: 'Hired This Month', value: stats?.hired_this_month ?? 0, icon: 'user-plus', color: 'teal' },
        ]"
        :key="stat.label"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-colors"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-400">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-white mt-1">{{ stat.value }}</p>
          </div>
          <div
            :class="[
              stat.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : '',
              stat.color === 'green' ? 'bg-green-500/10 text-green-400' : '',
              stat.color === 'purple' ? 'bg-purple-500/10 text-purple-400' : '',
              stat.color === 'teal' ? 'bg-teal-500/10 text-teal-400' : '',
              'w-10 h-10 rounded-lg flex items-center justify-center',
            ]"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                v-if="stat.icon === 'briefcase'"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
              <path
                v-else-if="stat.icon === 'check-circle'"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                v-else-if="stat.icon === 'inbox'"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
              <path
                v-else-if="stat.icon === 'user-plus'"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <select
        v-model="statusFilter"
        class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="all">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="closed">Closed</option>
      </select>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search jobs..."
        class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500 flex-1 max-w-xs"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="n in 4" :key="n" class="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse">
        <div class="flex items-center space-x-4">
          <div class="h-4 bg-gray-700 rounded w-1/4"></div>
          <div class="h-4 bg-gray-700 rounded w-1/6"></div>
          <div class="h-4 bg-gray-700 rounded w-1/6"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredJobs.length === 0"
      class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center"
    >
      <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <h3 class="mt-3 text-sm font-medium text-gray-300">No jobs found</h3>
      <p class="mt-1 text-sm text-gray-500">Get started by creating a new job posting.</p>
      <button
        @click="router.push({ name: 'recruitment.jobs.create' })"
        class="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        Create Job
      </button>
    </div>

    <!-- Jobs table -->
    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-700">
          <thead class="bg-gray-800/50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Job Title</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Department</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vacancies</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Applications</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Deadline</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr
              v-for="job in filteredJobs"
              :key="job.id"
              class="hover:bg-gray-750 transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-white">{{ job.title }}</div>
                <div class="text-xs text-gray-500">{{ job.job_code }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ job.department || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ formatEmploymentType(job.employment_type) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                <span v-if="job.is_remote" class="text-blue-400">Remote</span>
                <span v-else>{{ job.location || '-' }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ job.vacancies }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ job.applications_count }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {{ formatDate(job.application_deadline) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[getStatusClasses(job.status), 'inline-flex px-2 py-0.5 text-xs font-semibold rounded-full']"
                >
                  {{ job.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <div class="flex items-center justify-end space-x-2">
                  <button
                    @click="router.push({ name: 'recruitment.jobs.show', params: { id: job.id } })"
                    class="text-gray-400 hover:text-white transition-colors"
                    title="View"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    @click="router.push({ name: 'recruitment.jobs.edit', params: { id: job.id } })"
                    class="text-gray-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    v-if="job.status === 'draft'"
                    @click="publishJob(job)"
                    class="text-green-400 hover:text-green-300 transition-colors"
                    title="Publish"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    v-if="job.status === 'published'"
                    @click="closeJob(job)"
                    class="text-yellow-400 hover:text-yellow-300 transition-colors"
                    title="Close"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </button>
                  <button
                    v-if="job.status === 'draft'"
                    @click="deleteJob(job)"
                    class="text-red-400 hover:text-red-300 transition-colors"
                    title="Delete"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
