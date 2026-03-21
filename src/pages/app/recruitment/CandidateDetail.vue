<script setup lang="ts">
defineOptions({ name: 'RecruitmentCandidateDetail' })
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { recruitmentService, type Candidate } from '@/services/recruitmentService'

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const candidate = ref<Candidate | null>(null)
const error = ref('')

const load = async () => {
  loading.value = true
  try {
    const res = await recruitmentService.getCandidate(Number(route.params.id))
    candidate.value = res.data?.data ?? res.data
  } catch {
    error.value = 'Failed to load candidate'
  } finally {
    loading.value = false
  }
}

const getStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-green-900/50 text-green-400',
    passive: 'bg-gray-700 text-gray-300',
    hired: 'bg-blue-900/50 text-blue-400',
    blacklisted: 'bg-red-900/50 text-red-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
}

const proficiencyColor = (level: string) => {
  const map: Record<string, string> = {
    beginner: 'bg-gray-700 text-gray-300',
    intermediate: 'bg-blue-900/50 text-blue-400',
    advanced: 'bg-purple-900/50 text-purple-400',
    expert: 'bg-yellow-900/50 text-yellow-400',
  }
  return map[level] ?? 'bg-gray-700 text-gray-300'
}

const appStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'bg-blue-900/50 text-blue-400',
    shortlisted: 'bg-purple-900/50 text-purple-400',
    hired: 'bg-green-900/50 text-green-400',
    rejected: 'bg-red-900/50 text-red-400',
    offered: 'bg-yellow-900/50 text-yellow-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <button
      @click="router.push({ name: 'recruitment.candidates' })"
      class="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center"
    >
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
      </svg>
      Back to Candidates
    </button>

    <div v-if="loading" class="space-y-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
        <div class="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div class="h-4 bg-gray-700 rounded w-2/3"></div>
      </div>
    </div>

    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <template v-else-if="candidate">
      <!-- Profile Header -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center text-xl font-bold text-white">
              {{ (candidate.first_name[0] + candidate.last_name[0]).toUpperCase() }}
            </div>
            <div>
              <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold text-white">{{ candidate.first_name }} {{ candidate.last_name }}</h1>
                <span :class="['inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full', getStatusClasses(candidate.status)]">
                  {{ candidate.status }}
                </span>
              </div>
              <p v-if="candidate.current_title" class="text-gray-400 mt-1">
                {{ candidate.current_title }}<span v-if="candidate.current_company"> at {{ candidate.current_company }}</span>
              </p>
              <div class="flex items-center gap-4 mt-2 text-sm text-gray-400">
                <span>{{ candidate.email }}</span>
                <span v-if="candidate.phone">· {{ candidate.phone }}</span>
                <span v-if="candidate.location">· {{ candidate.location }}</span>
              </div>
            </div>
          </div>
          <button
            @click="router.push({ name: 'recruitment.candidates.edit', params: { id: candidate.id } })"
            class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >Edit</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Stats + Skills + Links -->
        <div class="space-y-6">
          <!-- Quick Info -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-3">
            <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Details</h3>
            <div class="space-y-2 text-sm">
              <div v-if="candidate.total_experience_years != null" class="flex justify-between">
                <span class="text-gray-400">Experience</span>
                <span class="text-white">{{ candidate.total_experience_years }} yrs</span>
              </div>
              <div v-if="candidate.expected_salary" class="flex justify-between">
                <span class="text-gray-400">Expected Salary</span>
                <span class="text-white">{{ candidate.expected_salary.toLocaleString() }}</span>
              </div>
              <div v-if="candidate.notice_period_days != null" class="flex justify-between">
                <span class="text-gray-400">Notice Period</span>
                <span class="text-white">{{ candidate.notice_period_days }} days</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Source</span>
                <span class="text-white capitalize">{{ candidate.source ?? '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Added</span>
                <span class="text-white">{{ formatDate(candidate.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Links -->
          <div v-if="candidate.linkedin_url || candidate.portfolio_url" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-3">
            <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Links</h3>
            <div class="space-y-2">
              <a v-if="candidate.linkedin_url" :href="candidate.linkedin_url" target="_blank" rel="noopener" class="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                LinkedIn
              </a>
              <a v-if="candidate.portfolio_url" :href="candidate.portfolio_url" target="_blank" rel="noopener" class="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                Portfolio
              </a>
            </div>
          </div>

          <!-- Skills -->
          <div v-if="candidate.skills?.length" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-3">
            <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Skills</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="s in candidate.skills"
                :key="s.id"
                :class="['inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium', proficiencyColor(s.proficiency_level)]"
              >
                {{ s.skill }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right: Applications + Notes -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Notes -->
          <div v-if="candidate.notes" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Notes</h3>
            <p class="text-sm text-gray-400 whitespace-pre-wrap">{{ candidate.notes }}</p>
          </div>

          <!-- Application History -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-700">
              <h3 class="text-base font-semibold text-white">Application History</h3>
            </div>
            <div v-if="!candidate.applications?.length" class="p-6 text-center text-gray-500 text-sm">
              No applications linked yet.
            </div>
            <div v-else class="divide-y divide-gray-700">
              <div
                v-for="app in candidate.applications"
                :key="app.id"
                class="px-6 py-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
              >
                <div>
                  <p class="text-sm font-medium text-white">{{ app.job_posting?.title ?? 'Unknown Position' }}</p>
                  <p class="text-xs text-gray-400 mt-0.5">Applied {{ formatDate(app.submitted_at) }}</p>
                </div>
                <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', appStatusClasses(app.status)]">
                  {{ app.status.replace(/_/g, ' ') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
