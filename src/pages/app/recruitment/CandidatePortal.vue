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

const statusColors: Record<string, string> = {
  pending: 'badge-yellow',
  accepted: 'badge-green',
  rejected: 'badge-red',
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
        <button class="cp-btn primary" @click="openCreateModal">+ Generate Portal Link</button>
      </template>
    </PageHeader>

    <div v-if="error" class="cp-error">{{ error }}</div>

    <div v-if="loading" class="cp-table-wrap">
      <table class="cp-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Job</th>
            <th>Status</th>
            <th>Docs</th>
            <th>Expires</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in 5" :key="n">
            <td><div class="sk sk-text"></div></td>
            <td><div class="sk sk-text"></div></td>
            <td><div class="sk sk-badge"></div></td>
            <td><div class="sk sk-badge"></div></td>
            <td><div class="sk sk-text short"></div></td>
            <td><div class="sk sk-btn"></div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-else-if="portals.length === 0 && !error">
      <EmptyState
        icon="🔗"
        message="No candidate portals yet"
        sub="Generate a portal link to allow candidates to submit documents"
      />
    </template>

    <div v-else class="cp-table-wrap">
      <table class="cp-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Job</th>
            <th>Status</th>
            <th>Docs</th>
            <th>Expires</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="portal in portals" :key="portal.id">
            <td class="cp-name">{{ portal.candidate_name }}</td>
            <td>{{ portal.job_title }}</td>
            <td>
              <span :class="['cp-badge', statusColors[portal.status] ?? 'badge-yellow']">
                {{ portal.status }}
              </span>
            </td>
            <td>
              <span :class="['cp-badge', portal.docs_submitted ? 'badge-green' : 'badge-muted']">
                {{ portal.docs_submitted ? 'Submitted' : 'Pending' }}
              </span>
            </td>
            <td class="cp-date">{{ formatDate(portal.expires_at) }}</td>
            <td>
              <button class="cp-copy-btn" @click="copyLink(portal.token)" title="Copy portal link">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
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
          <select v-model="form.candidate_id" class="cp-select">
            <option value="" disabled>Select candidate</option>
            <option v-for="c in candidates" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="cp-field">
          <label class="cp-label">Job Posting *</label>
          <select v-model="form.job_posting_id" class="cp-select">
            <option value="" disabled>Select job posting</option>
            <option v-for="j in jobPostings" :key="j.id" :value="j.id">{{ j.title }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="cp-btn secondary" @click="showModal = false">Cancel</button>
        <button
          class="cp-btn primary"
          :disabled="saving || !form.candidate_id || !form.job_posting_id"
          @click="createPortal"
        >
          {{ saving ? 'Generating...' : 'Generate Link' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.cp-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.cp-error {
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: var(--rs);
  padding: 12px 16px;
  font-size: 13px;
  color: var(--red);
}
.cp-btn {
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}
.cp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cp-btn.primary {
  background: var(--accent);
  color: #fff;
}
.cp-btn.primary:hover:not(:disabled) {
  background: #3d6be6;
}
.cp-btn.secondary {
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border);
}
.cp-btn.secondary:hover {
  background: var(--surface3);
}

/* Table */
.cp-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--rs);
  background: var(--surface);
}
.cp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.cp-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  background: var(--surface2);
}
.cp-table td {
  padding: 12px 16px;
  color: var(--text);
  border-bottom: 1px solid var(--border);
}
.cp-table tr:last-child td {
  border-bottom: none;
}
.cp-name {
  font-weight: 500;
}
.cp-date {
  color: var(--muted);
  font-size: 12px;
}

/* Badges */
.cp-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 6px;
  text-transform: capitalize;
}
.badge-yellow {
  background: rgba(249, 168, 37, 0.15);
  color: var(--yellow);
}
.badge-green {
  background: rgba(54, 211, 153, 0.15);
  color: var(--green);
}
.badge-red {
  background: rgba(255, 107, 107, 0.15);
  color: var(--red);
}
.badge-muted {
  background: rgba(107, 114, 128, 0.15);
  color: var(--muted);
}

.cp-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--accent);
  cursor: pointer;
  transition: background 0.15s;
}
.cp-copy-btn:hover {
  background: var(--surface3);
}

/* Form */
.cp-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cp-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
}
.cp-select {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  padding: 9px 12px;
  outline: none;
  transition: border-color 0.15s;
}
.cp-select:focus {
  border-color: var(--accent);
}

/* Skeleton */
.sk {
  border-radius: 4px;
  background: var(--surface2);
  animation: shimmer 1.4s ease-in-out infinite;
}
.sk-text {
  height: 14px;
  width: 120px;
}
.sk-text.short {
  width: 80px;
}
.sk-badge {
  height: 22px;
  width: 60px;
  border-radius: 6px;
}
.sk-btn {
  height: 28px;
  width: 90px;
  border-radius: 6px;
}
@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>
