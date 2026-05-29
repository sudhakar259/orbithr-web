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

const requiredSkills = computed(() => form.value.required_skills_input.split(',').map(s => s.trim()).filter(Boolean))
const preferredSkills = computed(() => form.value.preferred_skills_input.split(',').map(s => s.trim()).filter(Boolean))
const benefits = computed(() => form.value.benefits_input.split(',').map(s => s.trim()).filter(Boolean))

const removeSkill = (type: 'required' | 'preferred' | 'benefits', index: number) => {
  const field = type === 'required' ? 'required_skills_input' : type === 'preferred' ? 'preferred_skills_input' : 'benefits_input'
  const items = form.value[field].split(',').map(s => s.trim()).filter(Boolean)
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
      if (publish) await recruitmentService.publishJob(jobId.value)
    } else {
      const res = await recruitmentService.createJob(payload)
      const created = res.data?.data ?? res.data
      if (publish && created?.id) await recruitmentService.publishJob(created.id)
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

onMounted(() => { if (isEditMode.value) loadJob() })
</script>

<template>
  <div class="jf-page">
    <div class="jf-page-head">
      <button class="jf-back" @click="router.push({ name: 'recruitment' })">&#8592; Back to Jobs</button>
      <h1 class="jf-title">{{ isEditMode ? 'Edit Job Posting' : 'New Job Posting' }}</h1>
    </div>

    <div v-if="error" class="jf-error">{{ error }}</div>

    <div v-if="loading" class="jf-loading">
      <div v-for="n in 6" :key="n" class="jf-skeleton"></div>
    </div>

    <form v-else class="jf-form" @submit.prevent="saveJob(false)">
      <!-- Basic Info -->
      <div class="jf-section">
        <h2 class="jf-section-title">Basic Information</h2>
        <div class="jf-grid-2">
          <div class="jf-field">
            <label class="jf-label">Title <span class="jf-req">*</span></label>
            <input v-model="form.title" type="text" required class="jf-input" placeholder="e.g. Senior Software Engineer" />
          </div>
          <div class="jf-field">
            <label class="jf-label">Job Code</label>
            <input v-model="form.job_code" type="text" class="jf-input" placeholder="Auto-generated if empty" />
          </div>
          <div class="jf-field">
            <label class="jf-label">Department</label>
            <input v-model="form.department" type="text" class="jf-input" placeholder="e.g. Engineering" />
          </div>
          <div class="jf-field">
            <label class="jf-label">Location</label>
            <input v-model="form.location" type="text" class="jf-input" placeholder="e.g. San Francisco, CA" />
          </div>
          <div class="jf-field">
            <label class="jf-label">Employment Type</label>
            <select v-model="form.employment_type" class="jf-input">
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>
          <div class="jf-field">
            <label class="jf-label">Experience Level</label>
            <select v-model="form.experience_level" class="jf-input">
              <option value="intern">Intern</option>
              <option value="entry">Entry Level</option>
              <option value="mid">Mid Level</option>
              <option value="senior">Senior</option>
              <option value="executive">Executive</option>
            </select>
          </div>
        </div>
        <label class="jf-check-row">
          <input v-model="form.is_remote" type="checkbox" class="jf-checkbox" />
          <span>Remote position</span>
        </label>
      </div>

      <!-- Description -->
      <div class="jf-section">
        <h2 class="jf-section-title">Description</h2>
        <div class="jf-field">
          <label class="jf-label">Job Description <span class="jf-req">*</span></label>
          <textarea v-model="form.description" required rows="5" class="jf-input jf-textarea" placeholder="Describe the role…"></textarea>
        </div>
        <div class="jf-field">
          <label class="jf-label">Requirements</label>
          <textarea v-model="form.requirements" rows="4" class="jf-input jf-textarea" placeholder="List the qualifications…"></textarea>
        </div>
        <div class="jf-field">
          <label class="jf-label">Responsibilities</label>
          <textarea v-model="form.responsibilities" rows="4" class="jf-input jf-textarea" placeholder="List the key responsibilities…"></textarea>
        </div>
      </div>

      <!-- Compensation -->
      <div class="jf-section">
        <h2 class="jf-section-title">Compensation &amp; Details</h2>
        <div class="jf-grid-3">
          <div class="jf-field">
            <label class="jf-label">Min Salary</label>
            <input v-model.number="form.min_salary" type="number" min="0" class="jf-input" placeholder="0" />
          </div>
          <div class="jf-field">
            <label class="jf-label">Max Salary</label>
            <input v-model.number="form.max_salary" type="number" min="0" class="jf-input" placeholder="0" />
          </div>
          <div class="jf-field">
            <label class="jf-label">Currency</label>
            <select v-model="form.salary_currency" class="jf-input">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
            </select>
          </div>
        </div>
        <div class="jf-grid-2">
          <div class="jf-field">
            <label class="jf-label">Application Deadline</label>
            <input v-model="form.application_deadline" type="date" class="jf-input" />
          </div>
          <div class="jf-field">
            <label class="jf-label">Vacancies</label>
            <input v-model.number="form.vacancies" type="number" min="1" class="jf-input" />
          </div>
        </div>
      </div>

      <!-- Skills & Benefits -->
      <div class="jf-section">
        <h2 class="jf-section-title">Skills &amp; Benefits</h2>
        <div class="jf-field">
          <label class="jf-label">Required Skills</label>
          <input v-model="form.required_skills_input" type="text" class="jf-input" placeholder="Comma-separated: React, TypeScript, Node.js" />
          <div v-if="requiredSkills.length" class="jf-chips">
            <span v-for="(skill, i) in requiredSkills" :key="i" class="jf-chip jf-chip-blue">
              {{ skill }}
              <button type="button" class="jf-chip-rm" @click="removeSkill('required', i)">&#10005;</button>
            </span>
          </div>
        </div>
        <div class="jf-field">
          <label class="jf-label">Preferred Skills</label>
          <input v-model="form.preferred_skills_input" type="text" class="jf-input" placeholder="Comma-separated: Docker, AWS, GraphQL" />
          <div v-if="preferredSkills.length" class="jf-chips">
            <span v-for="(skill, i) in preferredSkills" :key="i" class="jf-chip jf-chip-purple">
              {{ skill }}
              <button type="button" class="jf-chip-rm" @click="removeSkill('preferred', i)">&#10005;</button>
            </span>
          </div>
        </div>
        <div class="jf-field">
          <label class="jf-label">Benefits</label>
          <input v-model="form.benefits_input" type="text" class="jf-input" placeholder="Comma-separated: Health Insurance, 401k, Remote Work" />
          <div v-if="benefits.length" class="jf-chips">
            <span v-for="(b, i) in benefits" :key="i" class="jf-chip jf-chip-green">
              {{ b }}
              <button type="button" class="jf-chip-rm" @click="removeSkill('benefits', i)">&#10005;</button>
            </span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="jf-footer">
        <button type="button" class="jf-btn-ghost" @click="router.push({ name: 'recruitment' })">Cancel</button>
        <button type="submit" :disabled="saving" class="jf-btn-draft">
          {{ saving ? 'Saving…' : 'Save as Draft' }}
        </button>
        <button type="button" :disabled="saving" class="jf-btn-primary" @click="saveJob(true)">
          {{ saving ? 'Saving…' : 'Save & Publish' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.jf-page { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
.jf-page-head { display: flex; flex-direction: column; gap: 6px; }
.jf-back { font-size: 13px; color: #7A8299; background: none; border: none; cursor: pointer; text-align: left; padding: 0; }
.jf-back:hover { color: #EEF0F4; }
.jf-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0; }
.jf-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.jf-loading { display: flex; flex-direction: column; gap: 10px; }
.jf-skeleton { height: 80px; background: #232936; border-radius: 10px; animation: jf-pulse 1.2s ease-in-out infinite; }
@keyframes jf-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.jf-form { display: flex; flex-direction: column; gap: 14px; }
.jf-section { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.jf-section-title { font-size: 14px; font-weight: 600; color: #EEF0F4; margin: 0; }
.jf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.jf-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.jf-field { display: flex; flex-direction: column; gap: 5px; }
.jf-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.jf-req { color: #F38288; }
.jf-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.jf-input:focus { border-color: #6B5BFF; }
.jf-textarea { resize: vertical; min-height: 90px; }
.jf-check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.jf-checkbox { accent-color: #6B5BFF; }
.jf-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.jf-chip { display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.jf-chip-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.jf-chip-purple { background: rgba(178,141,255,0.12); color: #B28DFF; }
.jf-chip-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.jf-chip-rm { background: none; border: none; cursor: pointer; font-size: 12px; color: inherit; opacity: 0.6; padding: 0; line-height: 1; }
.jf-chip-rm:hover { opacity: 1; }
.jf-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.jf-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; }
.jf-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.jf-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.jf-btn-draft { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.jf-btn-draft:hover:not(:disabled) { color: #EEF0F4; }
.jf-btn-draft:disabled { opacity: 0.45; cursor: not-allowed; }
.jf-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.jf-btn-ghost:hover { color: #EEF0F4; }
</style>
