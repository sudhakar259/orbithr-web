<script setup lang="ts">
defineOptions({ name: 'RecruitmentAssessments' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

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

const statusClass: Record<string, string> = {
  pending: 'ass-badge-yellow',
  sent: 'ass-badge-blue',
  in_progress: 'ass-badge-purple',
  completed: 'ass-badge-green',
  expired: 'ass-badge-muted',
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
  const [cRes, jRes] = await Promise.allSettled([api.get('/candidates'), api.get('/jobs')])
  if (cRes.status === 'fulfilled') candidates.value = cRes.value.data?.data ?? cRes.value.data ?? []
  if (jRes.status === 'fulfilled') jobs.value = jRes.value.data?.data ?? jRes.value.data ?? []
}

async function submit() {
  submitting.value = true
  try {
    await api.post('/assessments', form.value)
    showForm.value = false
    form.value = { candidate_id: '', job_posting_id: '', platform: 'hackerrank', assessment_title: '', assessment_url: '', expires_at: '' }
    await fetchAssessments()
  } catch {
    // silent
  } finally {
    submitting.value = false
  }
}

async function deleteAssessment(id: number) {
  if (!await dialog('Delete', 'Delete this assessment?')) return
  try {
    await api.delete(`/assessments/${id}`)
    await fetchAssessments()
  } catch {
    // silent
  }
}

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(() => {
  fetchAssessments()
  fetchDropdowns()
})
</script>

<template>
  <div class="ass-page">
    <!-- Header -->
    <div class="ass-header">
      <div>
        <h1 class="ass-title">Assessments</h1>
        <p class="ass-subtitle">Manage candidate assessments and evaluations</p>
      </div>
      <button class="ass-btn-primary" @click="showForm = !showForm; if (showForm) fetchDropdowns()">
        {{ showForm ? 'Cancel' : 'Assign Assessment' }}
      </button>
    </div>

    <!-- Assign Form -->
    <div v-if="showForm" class="ass-form-card">
      <h3 class="ass-form-title">Assign New Assessment</h3>
      <form class="ass-form-grid" @submit.prevent="submit">
        <div class="ass-field">
          <label class="ass-label">Candidate</label>
          <select v-model="form.candidate_id" required class="ass-input">
            <option value="" disabled>Select candidate</option>
            <option v-for="c in candidates" :key="c.id" :value="c.id">{{ c.applicant_name }}</option>
          </select>
        </div>
        <div class="ass-field">
          <label class="ass-label">Job Posting</label>
          <select v-model="form.job_posting_id" required class="ass-input">
            <option value="" disabled>Select job</option>
            <option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.title }}</option>
          </select>
        </div>
        <div class="ass-field">
          <label class="ass-label">Platform</label>
          <select v-model="form.platform" required class="ass-input">
            <option v-for="p in platforms" :key="p" :value="p">{{ p.charAt(0).toUpperCase() + p.slice(1) }}</option>
          </select>
        </div>
        <div class="ass-field">
          <label class="ass-label">Assessment Title</label>
          <input v-model="form.assessment_title" type="text" required placeholder="e.g. React Developer Test" class="ass-input" />
        </div>
        <div class="ass-field">
          <label class="ass-label">Assessment URL</label>
          <input v-model="form.assessment_url" type="url" required placeholder="https://…" class="ass-input" />
        </div>
        <div class="ass-field">
          <label class="ass-label">Expires At</label>
          <input v-model="form.expires_at" type="date" class="ass-input" />
        </div>
        <div class="ass-form-submit">
          <button type="submit" :disabled="submitting" class="ass-btn-primary">
            {{ submitting ? 'Assigning…' : 'Assign Assessment' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Filters -->
    <div class="ass-filters">
      <select v-model="statusFilter" class="ass-input ass-filter-select">
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="sent">Sent</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
        <option value="expired">Expired</option>
      </select>
      <span class="ass-count">{{ filteredAssessments.length }} assessments</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="ass-loading">
      <div v-for="i in 4" :key="i" class="ass-skeleton"></div>
    </div>

    <!-- Table -->
    <div v-else-if="filteredAssessments.length" class="ass-table-wrap">
      <table class="ass-table">
        <thead>
          <tr>
            <th class="ass-th">Candidate</th>
            <th class="ass-th">Job</th>
            <th class="ass-th">Platform</th>
            <th class="ass-th">Status</th>
            <th class="ass-th">Score</th>
            <th class="ass-th">Assigned</th>
            <th class="ass-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="a in filteredAssessments" :key="a.id">
            <tr class="ass-tr ass-tr-clickable" @click="toggleExpand(a.id)">
              <td class="ass-td ass-td-name">{{ a.candidate_name }}</td>
              <td class="ass-td">{{ a.job_title }}</td>
              <td class="ass-td">
                <span class="ass-platform-chip">{{ a.platform }}</span>
              </td>
              <td class="ass-td">
                <span :class="['ass-badge', statusClass[a.status] || 'ass-badge-muted']">{{ a.status.replace('_', ' ') }}</span>
              </td>
              <td class="ass-td">{{ a.score !== null ? a.score + '%' : '-' }}</td>
              <td class="ass-td ass-td-muted">{{ formatDate(a.assigned_date) }}</td>
              <td class="ass-td">
                <button class="ass-delete-btn" @click.stop="deleteAssessment(a.id)">Delete</button>
              </td>
            </tr>
            <!-- Expanded row -->
            <tr v-if="expandedId === a.id" class="ass-tr-expanded">
              <td colspan="7" class="ass-td-expanded">
                <div class="ass-expanded-grid">
                  <div><span class="ass-exp-label">Title:</span> <span class="ass-exp-val">{{ a.assessment_title }}</span></div>
                  <div>
                    <span class="ass-exp-label">URL:</span>
                    <a :href="a.assessment_url" target="_blank" class="ass-exp-link" @click.stop>{{ a.assessment_url }}</a>
                  </div>
                  <div><span class="ass-exp-label">Expires:</span> <span class="ass-exp-val">{{ formatDate(a.expires_at || '') }}</span></div>
                </div>
                <div v-if="a.result_data" class="ass-result-data">
                  <p class="ass-result-title">Result Data</p>
                  <pre class="ass-result-pre">{{ JSON.stringify(a.result_data, null, 2) }}</pre>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Empty -->
    <div v-else class="ass-empty">
      <p class="ass-empty-msg">No assessments found</p>
      <p class="ass-empty-sub">Assign an assessment to get started</p>
    </div>
  </div>
</template>

<style scoped>
.ass-page { display: flex; flex-direction: column; gap: 20px; }
.ass-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ass-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0 0 4px; }
.ass-subtitle { font-size: 13px; color: #7A8299; margin: 0; }
.ass-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.ass-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.ass-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.ass-form-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.ass-form-title { font-size: 14px; font-weight: 600; color: #EEF0F4; margin: 0; }
.ass-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.ass-form-submit { grid-column: 1 / -1; display: flex; justify-content: flex-end; }
.ass-field { display: flex; flex-direction: column; gap: 5px; }
.ass-label { font-size: 12px; color: #B6BED0; }
.ass-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.ass-input:focus { border-color: #6B5BFF; }
.ass-filters { display: flex; align-items: center; gap: 14px; }
.ass-filter-select { width: auto; }
.ass-count { font-size: 13px; color: #7A8299; }
.ass-loading { display: flex; flex-direction: column; gap: 8px; }
.ass-skeleton { height: 44px; background: #232936; border-radius: 7px; animation: ass-pulse 1.2s ease-in-out infinite; }
@keyframes ass-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ass-table-wrap { border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.ass-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ass-th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; white-space: nowrap; }
.ass-tr { border-bottom: 1px solid #1C2030; }
.ass-tr:last-child { border-bottom: none; }
.ass-tr-clickable { cursor: pointer; }
.ass-tr-clickable:hover { background: rgba(255,255,255,0.02); }
.ass-tr-expanded { background: rgba(13,15,23,0.4); }
.ass-td { padding: 11px 14px; color: #EEF0F4; vertical-align: middle; }
.ass-td-name { font-weight: 500; }
.ass-td-muted { color: #7A8299; }
.ass-td-expanded { padding: 14px 20px; }
.ass-platform-chip { background: #232936; color: #B6BED0; border-radius: 4px; padding: 2px 8px; font-size: 11px; text-transform: capitalize; }
.ass-delete-btn { font-size: 12px; color: #F38288; background: none; border: none; cursor: pointer; }
.ass-delete-btn:hover { color: #ff9ea1; }
.ass-expanded-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 13px; }
.ass-exp-label { color: #7A8299; }
.ass-exp-val { color: #EEF0F4; margin-left: 6px; }
.ass-exp-link { color: #6B5BFF; margin-left: 6px; }
.ass-exp-link:hover { text-decoration: underline; }
.ass-result-title { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; margin: 0 0 6px; }
.ass-result-pre { background: #0D0F17; border: 1px solid #232936; border-radius: 6px; padding: 10px; font-size: 11px; color: #B6BED0; max-height: 140px; overflow: auto; }
.ass-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 60px 20px; text-align: center; }
.ass-empty-msg { font-size: 14px; color: #B6BED0; margin: 0 0 6px; }
.ass-empty-sub { font-size: 13px; color: #7A8299; margin: 0; }
.ass-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.ass-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.ass-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.ass-badge-purple { background: rgba(178,141,255,0.12); color: #B28DFF; }
.ass-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.ass-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
</style>
