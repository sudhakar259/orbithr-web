<script setup lang="ts">
defineOptions({ name: 'CandidatePortal' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

interface Portal {
  id: number
  candidate_name: string
  job_title: string
  status: 'pending' | 'accepted' | 'rejected'
  docs_submitted: boolean
  expires_at: string | null
  token: string
}

interface Candidate {
  id: number
  name: string
}

interface JobPosting {
  id: number
  title: string
}

const loading = ref(true)
const portals = ref<Portal[]>([])
const error = ref('')

const showModal = ref(false)
const saving = ref(false)
const candidates = ref<Candidate[]>([])
const jobPostings = ref<JobPosting[]>([])
const form = ref({ candidate_id: '', job_posting_id: '' })

const statusClass: Record<string, string> = {
  pending: 'cp-badge-yellow',
  accepted: 'cp-badge-green',
  rejected: 'cp-badge-red',
}

const formatDate = (d: string | null) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/candidate-portals')
    portals.value = res.data?.data ?? res.data ?? []
  } catch {
    error.value = 'Failed to load candidate portals'
  } finally {
    loading.value = false
  }
}

const openCreateModal = async () => {
  form.value = { candidate_id: '', job_posting_id: '' }
  showModal.value = true
  try {
    const [cRes, jRes] = await Promise.all([
      api.get('/candidates', { params: { per_page: 100 } }),
      api.get('/job-postings', { params: { per_page: 50 } }),
    ])
    candidates.value = cRes.data?.data ?? cRes.data ?? []
    jobPostings.value = jRes.data?.data ?? jRes.data ?? []
  } catch {
    toast.error('Failed to load candidates or job postings')
  }
}

const createPortal = async () => {
  if (!form.value.candidate_id || !form.value.job_posting_id) return
  saving.value = true
  try {
    const res = await api.post('/candidate-portals', {
      candidate_id: Number(form.value.candidate_id),
      job_posting_id: Number(form.value.job_posting_id),
    })
    const created = res.data?.data ?? res.data
    if (created) portals.value.unshift(created)
    showModal.value = false
    toast.success('Portal link generated')
  } catch {
    toast.error('Failed to create portal link')
  } finally {
    saving.value = false
  }
}

const copyLink = async (token: string) => {
  const url = `${window.location.origin}/candidate-portal/${token}`
  try {
    await navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  } catch {
    toast.error('Failed to copy link')
  }
}

onMounted(load)
</script>

<template>
  <div class="cp-page">
    <PageHeader title="Candidate Portals" subtitle="Manage candidate portal links and document submissions">
      <template #actions>
        <button class="cp-btn-primary" @click="openCreateModal">+ Generate Portal Link</button>
      </template>
    </PageHeader>

    <div v-if="error" class="cp-error">{{ error }}</div>

    <div v-if="loading" class="cp-table-wrap">
      <table class="cp-table">
        <thead>
          <tr>
            <th class="cp-th">Candidate</th>
            <th class="cp-th">Job</th>
            <th class="cp-th">Status</th>
            <th class="cp-th">Docs</th>
            <th class="cp-th">Expires</th>
            <th class="cp-th"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in 5" :key="n">
            <td class="cp-td"><div class="cp-sk cp-sk-text"></div></td>
            <td class="cp-td"><div class="cp-sk cp-sk-text"></div></td>
            <td class="cp-td"><div class="cp-sk cp-sk-badge"></div></td>
            <td class="cp-td"><div class="cp-sk cp-sk-badge"></div></td>
            <td class="cp-td"><div class="cp-sk cp-sk-short"></div></td>
            <td class="cp-td"><div class="cp-sk cp-sk-btn"></div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-else-if="portals.length === 0 && !error">
      <EmptyState icon="🔗" message="No candidate portals yet" sub="Generate a portal link to allow candidates to submit documents" />
    </template>

    <div v-else class="cp-table-wrap">
      <table class="cp-table">
        <thead>
          <tr>
            <th class="cp-th">Candidate</th>
            <th class="cp-th">Job</th>
            <th class="cp-th">Status</th>
            <th class="cp-th">Docs</th>
            <th class="cp-th">Expires</th>
            <th class="cp-th"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="portal in portals" :key="portal.id" class="cp-tr">
            <td class="cp-td cp-td-name">{{ portal.candidate_name }}</td>
            <td class="cp-td">{{ portal.job_title }}</td>
            <td class="cp-td">
              <span :class="['cp-badge', statusClass[portal.status] ?? 'cp-badge-yellow']">{{ portal.status }}</span>
            </td>
            <td class="cp-td">
              <span :class="['cp-badge', portal.docs_submitted ? 'cp-badge-green' : 'cp-badge-muted']">
                {{ portal.docs_submitted ? 'Submitted' : 'Pending' }}
              </span>
            </td>
            <td class="cp-td cp-td-date">{{ formatDate(portal.expires_at) }}</td>
            <td class="cp-td">
              <button class="cp-copy-btn" @click="copyLink(portal.token)">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy Link
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Generate Portal Modal -->
    <Modal v-model="showModal" title="Generate Portal Link" subtitle="Create a candidate portal for document submission">
      <div class="cp-form">
        <div class="cp-field">
          <label class="cp-label">Candidate *</label>
          <select v-model="form.candidate_id" class="cp-input">
            <option value="" disabled>Select candidate</option>
            <option v-for="c in candidates" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="cp-field">
          <label class="cp-label">Job Posting *</label>
          <select v-model="form.job_posting_id" class="cp-input">
            <option value="" disabled>Select job posting</option>
            <option v-for="j in jobPostings" :key="j.id" :value="j.id">{{ j.title }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="cp-btn-ghost" @click="showModal = false">Cancel</button>
        <button class="cp-btn-primary" :disabled="saving || !form.candidate_id || !form.job_posting_id" @click="createPortal">
          {{ saving ? 'Generating…' : 'Generate Link' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.cp-page { display: flex; flex-direction: column; gap: 20px; }
.cp-error { background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #F38288; }
.cp-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cp-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.cp-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.cp-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.cp-btn-ghost:hover { color: #EEF0F4; }
.cp-table-wrap { overflow-x: auto; border: 1px solid #232936; border-radius: 10px; background: #161A23; }
.cp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.cp-th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #7A8299; border-bottom: 1px solid #232936; background: #11141C; }
.cp-tr { border-bottom: 1px solid #1C2030; }
.cp-tr:last-child { border-bottom: none; }
.cp-tr:hover { background: rgba(255,255,255,0.02); }
.cp-td { padding: 11px 14px; color: #EEF0F4; vertical-align: middle; }
.cp-td-name { font-weight: 500; }
.cp-td-date { color: #7A8299; font-size: 12px; }
.cp-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; }
.cp-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.cp-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.cp-badge-red    { background: rgba(243,130,136,0.12); color: #F38288; }
.cp-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.cp-copy-btn { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; padding: 5px 10px; border-radius: 6px; border: 1px solid #232936; background: #232936; color: #6B5BFF; cursor: pointer; }
.cp-copy-btn:hover { background: #2D3448; }
.cp-sk { border-radius: 4px; background: #232936; animation: cp-shimmer 1.4s ease-in-out infinite; }
.cp-sk-text { height: 14px; width: 120px; }
.cp-sk-short { height: 14px; width: 80px; }
.cp-sk-badge { height: 22px; width: 60px; border-radius: 20px; }
.cp-sk-btn { height: 28px; width: 90px; border-radius: 6px; }
@keyframes cp-shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
.cp-form { display: flex; flex-direction: column; gap: 14px; }
.cp-field { display: flex; flex-direction: column; gap: 5px; }
.cp-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.cp-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.cp-input:focus { border-color: #6B5BFF; }
</style>
