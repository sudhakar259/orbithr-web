<script setup lang="ts">
defineOptions({ name: 'RecruitmentCandidateForm' })
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { recruitmentService, type Candidate } from '@/services/recruitmentService'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  location: '',
  linkedin_url: '',
  portfolio_url: '',
  current_company: '',
  current_title: '',
  total_experience_years: undefined as number | undefined,
  expected_salary: undefined as number | undefined,
  notice_period_days: undefined as number | undefined,
  source: 'direct',
  status: 'active',
  notes: '',
  skills: [] as Array<{ skill: string; proficiency_level: string }>,
})

const newSkill = ref({ skill: '', proficiency_level: 'intermediate' })

const load = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await recruitmentService.getCandidate(Number(route.params.id))
    const c: Candidate = res.data?.data ?? res.data
    form.value = {
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone ?? '',
      location: c.location ?? '',
      linkedin_url: c.linkedin_url ?? '',
      portfolio_url: c.portfolio_url ?? '',
      current_company: c.current_company ?? '',
      current_title: c.current_title ?? '',
      total_experience_years: c.total_experience_years,
      expected_salary: c.expected_salary,
      notice_period_days: c.notice_period_days,
      source: c.source ?? 'direct',
      status: c.status,
      notes: c.notes ?? '',
      skills: c.skills?.map(s => ({ skill: s.skill, proficiency_level: s.proficiency_level })) ?? [],
    }
  } catch {
    error.value = 'Failed to load candidate'
  } finally {
    loading.value = false
  }
}

const addSkill = () => {
  if (!newSkill.value.skill.trim()) return
  form.value.skills.push({ ...newSkill.value })
  newSkill.value = { skill: '', proficiency_level: 'intermediate' }
}

const removeSkill = (idx: number) => {
  form.value.skills.splice(idx, 1)
}

const save = async () => {
  saving.value = true
  error.value = ''
  try {
    if (isEdit.value) {
      await recruitmentService.updateCandidate(Number(route.params.id), form.value)
    } else {
      await recruitmentService.createCandidate(form.value)
    }
    router.push({ name: 'recruitment.candidates' })
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message ?? 'Failed to save candidate'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <button
      @click="router.push({ name: 'recruitment.candidates' })"
      class="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center"
    >
      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
      </svg>
      Back to Candidates
    </button>

    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
      <div class="space-y-3">
        <div v-for="i in 6" :key="i" class="h-10 bg-gray-700 rounded"></div>
      </div>
    </div>

    <template v-else>
      <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <p class="text-sm text-red-400">{{ error }}</p>
      </div>

      <!-- Personal Info -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Personal Information</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">First Name *</label>
            <input v-model="form.first_name" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Last Name *</label>
            <input v-model="form.last_name" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Email *</label>
            <input v-model="form.email" type="email" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Phone</label>
            <input v-model="form.phone" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Location</label>
            <input v-model="form.location" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
            <select v-model="form.status" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none">
              <option value="active">Active</option>
              <option value="passive">Passive</option>
              <option value="hired">Hired</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">LinkedIn URL</label>
            <input v-model="form.linkedin_url" type="url" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Portfolio URL</label>
            <input v-model="form.portfolio_url" type="url" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
      </div>

      <!-- Professional Info -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Professional Details</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Current Company</label>
            <input v-model="form.current_company" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Current Title</label>
            <input v-model="form.current_title" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Experience (years)</label>
            <input v-model.number="form.total_experience_years" type="number" min="0" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Expected Salary</label>
            <input v-model.number="form.expected_salary" type="number" min="0" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Notice Period (days)</label>
            <input v-model.number="form.notice_period_days" type="number" min="0" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Source</label>
            <select v-model="form.source" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none">
              <option value="direct">Direct</option>
              <option value="referral">Referral</option>
              <option value="linkedin">LinkedIn</option>
              <option value="indeed">Indeed</option>
              <option value="naukri">Naukri</option>
              <option value="glassdoor">Glassdoor</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Skills -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Skills</h2>
        <div class="flex gap-2">
          <input
            v-model="newSkill.skill"
            @keyup.enter="addSkill"
            type="text"
            placeholder="Skill name (e.g. React)"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 flex-1 focus:border-blue-500 focus:outline-none"
          />
          <select v-model="newSkill.proficiency_level" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
          <button @click="addSkill" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Add</button>
        </div>
        <div v-if="form.skills.length" class="flex flex-wrap gap-2">
          <span
            v-for="(s, idx) in form.skills"
            :key="idx"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300"
          >
            {{ s.skill }} <span class="text-blue-400/70">({{ s.proficiency_level }})</span>
            <button @click="removeSkill(idx)" class="text-blue-400 hover:text-white ml-0.5">×</button>
          </span>
        </div>
      </div>

      <!-- Notes -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-3">
        <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Notes</h2>
        <textarea
          v-model="form.notes"
          rows="3"
          placeholder="Internal notes about this candidate..."
          class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
        />
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          @click="router.push({ name: 'recruitment.candidates' })"
          class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >Cancel</button>
        <button
          @click="save"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >{{ saving ? 'Saving...' : isEdit ? 'Update Candidate' : 'Create Candidate' }}</button>
      </div>
    </template>
  </div>
</template>
