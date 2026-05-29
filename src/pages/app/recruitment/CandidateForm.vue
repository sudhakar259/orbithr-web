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
  <div class="rcf-page">
    <button class="rcf-back" @click="router.push({ name: 'recruitment.candidates' })">&#8592; Back to Candidates</button>

    <div v-if="loading" class="rcf-loading">
      <div v-for="i in 6" :key="i" class="rcf-skeleton"></div>
    </div>

    <template v-else>
      <div v-if="error" class="rcf-error">{{ error }}</div>

      <!-- Personal Info -->
      <div class="rcf-section">
        <h2 class="rcf-section-title">Personal Information</h2>
        <div class="rcf-grid-2">
          <div class="rcf-field">
            <label class="rcf-label">First Name <span class="rcf-req">*</span></label>
            <input v-model="form.first_name" type="text" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Last Name <span class="rcf-req">*</span></label>
            <input v-model="form.last_name" type="text" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Email <span class="rcf-req">*</span></label>
            <input v-model="form.email" type="email" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Phone</label>
            <input v-model="form.phone" type="text" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Location</label>
            <input v-model="form.location" type="text" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Status</label>
            <select v-model="form.status" class="rcf-input">
              <option value="active">Active</option>
              <option value="passive">Passive</option>
              <option value="hired">Hired</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
          <div class="rcf-field">
            <label class="rcf-label">LinkedIn URL</label>
            <input v-model="form.linkedin_url" type="url" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Portfolio URL</label>
            <input v-model="form.portfolio_url" type="url" class="rcf-input" />
          </div>
        </div>
      </div>

      <!-- Professional Info -->
      <div class="rcf-section">
        <h2 class="rcf-section-title">Professional Details</h2>
        <div class="rcf-grid-2">
          <div class="rcf-field">
            <label class="rcf-label">Current Company</label>
            <input v-model="form.current_company" type="text" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Current Title</label>
            <input v-model="form.current_title" type="text" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Experience (years)</label>
            <input v-model.number="form.total_experience_years" type="number" min="0" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Expected Salary</label>
            <input v-model.number="form.expected_salary" type="number" min="0" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Notice Period (days)</label>
            <input v-model.number="form.notice_period_days" type="number" min="0" class="rcf-input" />
          </div>
          <div class="rcf-field">
            <label class="rcf-label">Source</label>
            <select v-model="form.source" class="rcf-input">
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
      <div class="rcf-section">
        <h2 class="rcf-section-title">Skills</h2>
        <div class="rcf-skill-add">
          <input v-model="newSkill.skill" type="text" placeholder="Skill name (e.g. React)" class="rcf-input rcf-skill-name" @keyup.enter="addSkill" />
          <select v-model="newSkill.proficiency_level" class="rcf-input rcf-skill-level">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
          <button class="rcf-btn-primary" @click="addSkill">Add</button>
        </div>
        <div v-if="form.skills.length" class="rcf-skill-chips">
          <span v-for="(s, idx) in form.skills" :key="idx" class="rcf-skill-chip">
            {{ s.skill }}
            <span class="rcf-skill-level-label">({{ s.proficiency_level }})</span>
            <button class="rcf-skill-rm" @click="removeSkill(idx)">&#10005;</button>
          </span>
        </div>
      </div>

      <!-- Notes -->
      <div class="rcf-section">
        <h2 class="rcf-section-title">Notes</h2>
        <textarea v-model="form.notes" rows="3" placeholder="Internal notes about this candidate…" class="rcf-input rcf-textarea" />
      </div>

      <!-- Actions -->
      <div class="rcf-footer">
        <button class="rcf-btn-ghost" @click="router.push({ name: 'recruitment.candidates' })">Cancel</button>
        <button class="rcf-btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : isEdit ? 'Update Candidate' : 'Create Candidate' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rcf-page { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
.rcf-back { font-size: 13px; color: #7A8299; background: none; border: none; cursor: pointer; text-align: left; padding: 0; }
.rcf-back:hover { color: #EEF0F4; }
.rcf-loading { display: flex; flex-direction: column; gap: 10px; }
.rcf-skeleton { height: 44px; background: #232936; border-radius: 7px; animation: rcf-pulse 1.2s ease-in-out infinite; }
@keyframes rcf-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.rcf-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.rcf-section { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.rcf-section-title { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.08em; margin: 0; }
.rcf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rcf-field { display: flex; flex-direction: column; gap: 5px; }
.rcf-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.rcf-req { color: #F38288; }
.rcf-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.rcf-input:focus { border-color: #6B5BFF; }
.rcf-textarea { resize: vertical; min-height: 72px; }
.rcf-skill-add { display: flex; gap: 8px; }
.rcf-skill-name { flex: 1; }
.rcf-skill-level { width: 140px; flex-shrink: 0; }
.rcf-skill-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.rcf-skill-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(107,91,255,0.12); border: 1px solid rgba(107,91,255,0.2); color: #B28DFF; border-radius: 20px; padding: 3px 10px; font-size: 12px; }
.rcf-skill-level-label { color: #8A7BFF; opacity: 0.7; }
.rcf-skill-rm { background: none; border: none; color: #8A7BFF; cursor: pointer; font-size: 12px; padding: 0; line-height: 1; }
.rcf-skill-rm:hover { color: #EEF0F4; }
.rcf-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.rcf-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; }
.rcf-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.rcf-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.rcf-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.rcf-btn-ghost:hover { color: #EEF0F4; }
</style>
