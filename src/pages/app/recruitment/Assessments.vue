<script setup lang="ts">
defineOptions({ name: 'RecruitmentAssessments' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface Assessment {
  id: number
  candidate_name: string
  job_title: string
  platform: string
  assessment_title: string
  assessment_url: string
  status: string
  score: number | null
  assigned_date: string
  expires_at: string | null
  result_data: Record<string, unknown> | null
}

interface Candidate {
  id: number
  applicant_name: string
}

interface Job {
  id: number
  title: string
}

const loading = ref(true)
const assessments = ref<Assessment[]>([])
const candidates = ref<Candidate[]>([])
const jobs = ref<Job[]>([])
const statusFilter = ref('')
const showForm = ref(false)
const expandedId = ref<number | null>(null)
const submitting = ref(false)

const form = ref({
  candidate_id: '',
  job_posting_id: '',
  platform: 'hackerrank',
  assessment_title: '',
  assessment_url: '',
  expires_at: '',
})

const platforms = ['hackerrank', 'testgorilla', 'codility', 'mettl', 'custom']

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  sent: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-green-500/20 text-green-400',
  expired: 'bg-gray-500/20 text-gray-400',
}

const filteredAssessments = computed(() => {
  if (!statusFilter.value) return assessments.value
  return assessments.value.filter((a) => a.status === statusFilter.value)
})

async function fetchAssessments() {
  loading.value = true
  try {
    const res = await api.get('/assessments')
    assessments.value = res.data?.data ?? res.data ?? []
  } catch {
    assessments.value = []
  } finally {
    loading.value = false
  }
}

async function fetchDropdowns() {
  const [cRes, jRes] = await Promise.allSettled([
    api.get('/candidates'),
    api.get('/jobs'),
  ])
  if (cRes.status === 'fulfilled') {
    candidates.value = cRes.value.data?.data ?? cRes.value.data ?? []
  }
  if (jRes.status === 'fulfilled') {
    jobs.value = jRes.value.data?.data ?? jRes.value.data ?? []
  }
}

async function submit() {
  submitting.value = true
  try {
    await api.post('/assessments', form.value)
    showForm.value = false
    form.value = {
      candidate_id: '',
      job_posting_id: '',
      platform: 'hackerrank',
      assessment_title: '',
      assessment_url: '',
      expires_at: '',
    }
    await fetchAssessments()
  } catch {
    // error handled silently
  } finally {
    submitting.value = false
  }
}

async function deleteAssessment(id: number) {
  if (!confirm('Delete this assessment?')) return
  try {
    await api.delete(`/assessments/${id}`)
    await fetchAssessments()
  } catch {
    // error handled silently
  }
}

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onMounted(() => {
  fetchAssessments()
  fetchDropdowns()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Assessments</h1>
        <p class="mt-1 text-sm text-gray-400">Manage candidate assessments and evaluations</p>
      </div>
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        @click="
          showForm = !showForm;
          if (showForm) fetchDropdowns()
        "
      >
        {{ showForm ? 'Cancel' : 'Assign Assessment' }}
      </button>
    </div>

    <!-- Assign Form -->
    <div
      v-if="showForm"
      class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4"
    >
      <h3 class="text-lg font-semibold text-white">Assign New Assessment</h3>
      <form class="grid grid-cols-1 gap-4 md:grid-cols-2" @submit.prevent="submit">
        <div>
          <label class="mb-1 block text-sm text-gray-400">Candidate</label>
          <select
            v-model="form.candidate_id"
            required
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
          >
            <option value="" disabled>Select candidate</option>
            <option v-for="c in candidates" :key="c.id" :value="c.id">
              {{ c.applicant_name }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-400">Job Posting</label>
          <select
            v-model="form.job_posting_id"
            required
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
          >
            <option value="" disabled>Select job</option>
            <option v-for="j in jobs" :key="j.id" :value="j.id">
              {{ j.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-400">Platform</label>
          <select
            v-model="form.platform"
            required
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
          >
            <option v-for="p in platforms" :key="p" :value="p">
              {{ p.charAt(0).toUpperCase() + p.slice(1) }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-400">Assessment Title</label>
          <input
            v-model="form.assessment_title"
            type="text"
            required
            placeholder="e.g. React Developer Test"
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-400">Assessment URL</label>
          <input
            v-model="form.assessment_url"
            type="url"
            required
            placeholder="https://..."
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-400">Expires At</label>
          <input
            v-model="form.expires_at"
            type="date"
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
          />
        </div>
        <div class="md:col-span-2 flex justify-end">
          <button
            type="submit"
            :disabled="submitting"
            class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ submitting ? 'Assigning...' : 'Assign Assessment' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-4">
      <select
        v-model="statusFilter"
        class="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
      >
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="sent">Sent</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="expired">Expired</option>
      </select>
      <span class="text-sm text-gray-500">{{ filteredAssessments.length }} assessments</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>

    <!-- Table -->
    <div v-else-if="filteredAssessments.length" class="overflow-x-auto rounded-lg border border-gray-700">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-gray-700 bg-gray-800 text-xs uppercase text-gray-400">
          <tr>
            <th class="px-4 py-3">Candidate</th>
            <th class="px-4 py-3">Job</th>
            <th class="px-4 py-3">Platform</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Score</th>
            <th class="px-4 py-3">Assigned</th>
            <th class="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <template v-for="a in filteredAssessments" :key="a.id">
            <tr
              class="cursor-pointer bg-gray-800 hover:bg-gray-750 transition-colors"
              @click="toggleExpand(a.id)"
            >
              <td class="px-4 py-3 font-medium text-white">{{ a.candidate_name }}</td>
              <td class="px-4 py-3 text-gray-300">{{ a.job_title }}</td>
              <td class="px-4 py-3">
                <span class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300 capitalize">
                  {{ a.platform }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="statusColors[a.status] || 'bg-gray-500/20 text-gray-400'"
                  class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                >
                  {{ a.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-300">
                {{ a.score !== null ? a.score + '%' : '-' }}
              </td>
              <td class="px-4 py-3 text-gray-400">{{ formatDate(a.assigned_date) }}</td>
              <td class="px-4 py-3">
                <button
                  class="text-red-400 hover:text-red-300 text-xs"
                  @click.stop="deleteAssessment(a.id)"
                >
                  Delete
                </button>
              </td>
            </tr>
            <!-- Expanded row -->
            <tr v-if="expandedId === a.id" class="bg-gray-800/50">
              <td colspan="7" class="px-6 py-4">
                <div class="space-y-3">
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span class="text-gray-500">Title:</span>
                      <span class="ml-2 text-white">{{ a.assessment_title }}</span>
                    </div>
                    <div>
                      <span class="text-gray-500">URL:</span>
                      <a
                        :href="a.assessment_url"
                        target="_blank"
                        class="ml-2 text-blue-400 hover:underline"
                        @click.stop
                      >
                        {{ a.assessment_url }}
                      </a>
                    </div>
                    <div>
                      <span class="text-gray-500">Expires:</span>
                      <span class="ml-2 text-gray-300">{{ formatDate(a.expires_at || '') }}</span>
                    </div>
                  </div>
                  <div v-if="a.result_data">
                    <p class="mb-1 text-xs font-semibold uppercase text-gray-500">Result Data</p>
                    <pre class="max-h-40 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-300">{{
                      JSON.stringify(a.result_data, null, 2)
                    }}</pre>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800 py-16"
    >
      <p class="text-gray-400">No assessments found</p>
      <p class="mt-1 text-sm text-gray-500">Assign an assessment to get started</p>
    </div>
  </div>
</template>
