<script setup lang="ts">
defineOptions({ name: 'RecruitmentCandidates' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { recruitmentService, type Candidate } from '@/services/recruitmentService'

const router = useRouter()
const loading = ref(true)
const candidates = ref<Candidate[]>([])
const error = ref('')
const search = ref('')
const filterStatus = ref('')
const filterSkill = ref('')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string> = {}
    if (search.value) params.q = search.value
    if (filterStatus.value) params.status = filterStatus.value
    if (filterSkill.value) params.skill = filterSkill.value
    const res = await recruitmentService.getCandidates(params)
    candidates.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load candidates'
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

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <input
          v-model="search"
          @keyup.enter="load"
          type="text"
          placeholder="Search by name, email..."
          class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none w-56"
        />
        <select
          v-model="filterStatus"
          @change="load"
          class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="passive">Passive</option>
          <option value="hired">Hired</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
        <input
          v-model="filterSkill"
          @keyup.enter="load"
          type="text"
          placeholder="Filter by skill..."
          class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none w-40"
        />
        <button
          @click="load"
          class="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >Search</button>
      </div>
      <button
        @click="router.push({ name: 'recruitment.candidates.create' })"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
        Add Candidate
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 bg-gray-700 rounded"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="candidates.length === 0" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No candidates found.</p>
      <button
        @click="router.push({ name: 'recruitment.candidates.create' })"
        class="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >Add your first candidate</button>
    </div>

    <!-- Table -->
    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700/50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Candidate</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Current Role</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Experience</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Source</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr
            v-for="c in candidates"
            :key="c.id"
            class="hover:bg-gray-700/30 transition-colors"
          >
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-300 flex-shrink-0">
                  {{ (c.first_name[0] + c.last_name[0]).toUpperCase() }}
                </div>
                <div>
                  <p class="text-sm font-medium text-white">{{ c.first_name }} {{ c.last_name }}</p>
                  <p class="text-xs text-gray-400">{{ c.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <p class="text-sm text-white">{{ c.current_title ?? '—' }}</p>
              <p v-if="c.current_company" class="text-xs text-gray-400">{{ c.current_company }}</p>
            </td>
            <td class="px-6 py-4 text-sm text-gray-300">
              {{ c.total_experience_years ? `${c.total_experience_years} yrs` : '—' }}
            </td>
            <td class="px-6 py-4">
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusClasses(c.status)]">
                {{ c.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-400 capitalize">{{ c.source ?? '—' }}</td>
            <td class="px-6 py-4 text-right">
              <button
                @click="router.push({ name: 'recruitment.candidates.show', params: { id: c.id } })"
                class="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >View</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
