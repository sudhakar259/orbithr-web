<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { recruitmentService, type JobPosting } from '@/services/recruitmentService'

const router = useRouter()
const route = useRoute()

const isEditMode = computed(() => route.name === 'recruitment.jobs.edit')
const jobId = computed(() => (isEditMode.value ? Number(route.params.id) : null))

const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

// Form state
const form = ref({
  title: '',
  job_code: '',
  department: '',
  location: '',
  employment_type: 'full_time' as JobPosting['employment_type'],
  experience_level: 'entry' as JobPosting['experience_level'],
  description: '',
  requirements: '',
  responsibilities: '',
  min_salary: null as number | null,
  max_salary: null as number | null,
  salary_currency: 'USD',
  application_deadline: '',
  vacancies: 1,
  is_remote: false,
  required_skills_input: '',
  preferred_skills_input: '',
  benefits_input: '',
})

const requiredSkills = computed(() =>
  form.value.required_skills_input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)
const preferredSkills = computed(() =>
  form.value.preferred_skills_input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)
const benefits = computed(() =>
  form.value.benefits_input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

const removeSkill = (type: 'required' | 'preferred' | 'benefits', index: number) => {
  const field =
    type === 'required'
      ? 'required_skills_input'
      : type === 'preferred'
        ? 'preferred_skills_input'
        : 'benefits_input'
  const items =
    form.value[field]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  items.splice(index, 1)
  form.value[field] = items.join(', ')
}

const loadJob = async () => {
  if (!jobId.value) return
  loading.value = true
  try {
    const res = await recruitmentService.getJob(jobId.value)
    const job = res.data?.data ?? res.data
    form.value.title = job.title
    form.value.job_code = job.job_code
    form.value.department = job.department ?? ''
    form.value.location = job.location ?? ''
    form.value.employment_type = job.employment_type
    form.value.experience_level = job.experience_level
    form.value.description = job.description
    form.value.requirements = job.requirements ?? ''
    form.value.responsibilities = job.responsibilities ?? ''
    form.value.min_salary = job.min_salary ?? null
    form.value.max_salary = job.max_salary ?? null
    form.value.salary_currency = job.salary_currency
    form.value.application_deadline = job.application_deadline ?? ''
    form.value.vacancies = job.vacancies
    form.value.is_remote = job.is_remote
    form.value.required_skills_input = (job.required_skills ?? []).join(', ')
    form.value.preferred_skills_input = (job.preferred_skills ?? []).join(', ')
    form.value.benefits_input = (job.benefits ?? []).join(', ')
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to load job'
  } finally {
    loading.value = false
  }
}

const buildPayload = () => ({
  title: form.value.title,
  job_code: form.value.job_code || undefined,
  department: form.value.department || undefined,
  location: form.value.location || undefined,
  employment_type: form.value.employment_type,
  experience_level: form.value.experience_level,
  description: form.value.description,
  requirements: form.value.requirements || undefined,
  responsibilities: form.value.responsibilities || undefined,
  min_salary: form.value.min_salary ?? undefined,
  max_salary: form.value.max_salary ?? undefined,
  salary_currency: form.value.salary_currency,
  application_deadline: form.value.application_deadline || undefined,
  vacancies: form.value.vacancies,
  is_remote: form.value.is_remote,
  required_skills: requiredSkills.value.length ? requiredSkills.value : undefined,
  preferred_skills: preferredSkills.value.length ? preferredSkills.value : undefined,
  benefits: benefits.value.length ? benefits.value : undefined,
})

const saveJob = async (publish = false) => {
  saving.value = true
  error.value = null
  try {
    const payload = buildPayload()
    if (isEditMode.value && jobId.value) {
      await recruitmentService.updateJob(jobId.value, payload)
      if (publish) {
        await recruitmentService.publishJob(jobId.value)
      }
    } else {
      const res = await recruitmentService.createJob(payload)
      const created = res.data?.data ?? res.data
      if (publish && created?.id) {
        await recruitmentService.publishJob(created.id)
      }
    }
    router.push({ name: 'recruitment' })
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
    if (e.response?.data?.errors) {
      error.value = Object.values(e.response.data.errors).flat().join(', ')
    } else {
      error.value = e.response?.data?.message ?? 'Failed to save job'
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEditMode.value) loadJob()
})
</script>

<template>
  <div class="max-w-3xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <button
          @click="router.push({ name: 'recruitment' })"
          class="text-sm text-gray-400 hover:text-white transition-colors mb-2 inline-flex items-center"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Jobs
        </button>
        <h1 class="text-2xl font-bold text-white">
          {{ isEditMode ? 'Edit Job Posting' : 'New Job Posting' }}
        </h1>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="n in 6" :key="n" class="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
        <div class="h-4 bg-gray-700 rounded w-1/3 mb-3"></div>
        <div class="h-10 bg-gray-700 rounded"></div>
      </div>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="saveJob(false)" class="space-y-6">
      <!-- Basic Info -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h2 class="text-lg font-semibold text-white mb-2">Basic Information</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Title *</label>
            <input
              v-model="form.title"
              type="text"
              required
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="e.g. Senior Software Engineer"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Job Code</label>
            <input
              v-model="form.job_code"
              type="text"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="Auto-generated if empty"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Department</label>
            <input
              v-model="form.department"
              type="text"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="e.g. Engineering"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Location</label>
            <input
              v-model="form.location"
              type="text"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="e.g. San Francisco, CA"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Employment Type</label>
            <select
              v-model="form.employment_type"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Experience Level</label>
            <select
              v-model="form.experience_level"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="intern">Intern</option>
              <option value="entry">Entry Level</option>
              <option value="mid">Mid Level</option>
              <option value="senior">Senior</option>
              <option value="executive">Executive</option>
            </select>
          </div>
        </div>

        <div class="flex items-center">
          <input
            v-model="form.is_remote"
            type="checkbox"
            class="h-4 w-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500"
          />
          <label class="ml-2 text-sm text-gray-300">Remote position</label>
        </div>
      </div>

      <!-- Description -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h2 class="text-lg font-semibold text-white mb-2">Description</h2>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Job Description *</label>
          <textarea
            v-model="form.description"
            required
            rows="5"
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="Describe the role and what the candidate will be doing..."
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Requirements</label>
          <textarea
            v-model="form.requirements"
            rows="4"
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="List the qualifications and requirements..."
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Responsibilities</label>
          <textarea
            v-model="form.responsibilities"
            rows="4"
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="List the key responsibilities..."
          ></textarea>
        </div>
      </div>

      <!-- Compensation -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h2 class="text-lg font-semibold text-white mb-2">Compensation & Details</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Min Salary</label>
            <input
              v-model.number="form.min_salary"
              type="number"
              min="0"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="0"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Max Salary</label>
            <input
              v-model.number="form.max_salary"
              type="number"
              min="0"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
              placeholder="0"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Currency</label>
            <select
              v-model="form.salary_currency"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Application Deadline</label>
            <input
              v-model="form.application_deadline"
              type="date"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Vacancies</label>
            <input
              v-model.number="form.vacancies"
              type="number"
              min="1"
              class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Skills & Benefits -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <h2 class="text-lg font-semibold text-white mb-2">Skills & Benefits</h2>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Required Skills</label>
          <input
            v-model="form.required_skills_input"
            type="text"
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="Comma-separated: React, TypeScript, Node.js"
          />
          <div v-if="requiredSkills.length" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="(skill, i) in requiredSkills"
              :key="i"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300"
            >
              {{ skill }}
              <button
                type="button"
                @click="removeSkill('required', i)"
                class="ml-1.5 text-blue-400 hover:text-white"
              >
                &times;
              </button>
            </span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Preferred Skills</label>
          <input
            v-model="form.preferred_skills_input"
            type="text"
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="Comma-separated: Docker, AWS, GraphQL"
          />
          <div v-if="preferredSkills.length" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="(skill, i) in preferredSkills"
              :key="i"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/50 text-purple-300"
            >
              {{ skill }}
              <button
                type="button"
                @click="removeSkill('preferred', i)"
                class="ml-1.5 text-purple-400 hover:text-white"
              >
                &times;
              </button>
            </span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Benefits</label>
          <input
            v-model="form.benefits_input"
            type="text"
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="Comma-separated: Health Insurance, 401k, Remote Work"
          />
          <div v-if="benefits.length" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="(b, i) in benefits"
              :key="i"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300"
            >
              {{ b }}
              <button
                type="button"
                @click="removeSkill('benefits', i)"
                class="ml-1.5 text-green-400 hover:text-white"
              >
                &times;
              </button>
            </span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end space-x-3 pb-8">
        <button
          type="button"
          @click="router.push({ name: 'recruitment' })"
          class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-gray-500 rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save as Draft' }}
        </button>
        <button
          type="button"
          :disabled="saving"
          @click="saveJob(true)"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save & Publish' }}
        </button>
      </div>
    </form>
  </div>
</template>
