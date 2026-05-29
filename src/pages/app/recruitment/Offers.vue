<script setup lang="ts">
defineOptions({ name: 'RecruitmentOffers' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { recruitmentService, type Offer } from '@/services/recruitmentService'

const router = useRouter()
const loading = ref(true)
const offers = ref<Offer[]>([])
const error = ref('')
const filterStatus = ref('')
const showForm = ref(false)
const saving = ref(false)
const actionError = ref('')

const form = ref({
  application_id: undefined as number | undefined,
  candidate_name: '',
  position: '',
  salary: undefined as number | undefined,
  joining_date: '',
  expires_at: '',
  notes: '',
  template_id: undefined as number | undefined,
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string> = {}
    if (filterStatus.value) params.status = filterStatus.value
    const res = await recruitmentService.getOffers(params)
    offers.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load offers'
  } finally {
    loading.value = false
  }
}

const submitOffer = async () => {
  saving.value = true
  actionError.value = ''
  try {
    await recruitmentService.createOffer(form.value)
    showForm.value = false
    form.value = {
      application_id: undefined,
      candidate_name: '',
      position: '',
      salary: undefined,
      joining_date: '',
      expires_at: '',
      notes: '',
      template_id: undefined,
    }
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    actionError.value = err.response?.data?.message ?? 'Failed to create offer'
  } finally {
    saving.value = false
  }
}

const sendOffer = async (id: number) => {
  try {
    await recruitmentService.sendOffer(id)
    await load()
  } catch {
    error.value = 'Failed to send offer'
  }
}

const acceptOffer = async (id: number) => {
  try {
    await recruitmentService.acceptOffer(id)
    await load()
  } catch {
    error.value = 'Failed to accept offer'
  }
}

const rejectOffer = async (id: number) => {
  const reason = prompt('Rejection reason:')
  if (reason === null) return
  try {
    await recruitmentService.rejectOffer(id, reason)
    await load()
  } catch {
    error.value = 'Failed to reject offer'
  }
}

const downloadOffer = (id: number) => {
  window.open(`/api/v1/recruitment/offers/${id}/download`, '_blank')
}

const getStatusTone = (status: string) => {
  const map: Record<string, string> = {
    draft: 'neutral',
    sent: 'accent',
    accepted: 'ok',
    rejected: 'danger',
    expired: 'warn',
    withdrawn: 'neutral',
  }
  return map[status] ?? 'neutral'
}

const formatDate = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

onMounted(load)
</script>

<template>
  <div class="off-page">
    <!-- Page header -->
    <div class="page-header">
      <div class="ph-text">
        <div class="ph-eyebrow">Offer letters</div>
        <h1 class="ph-title">Offers</h1>
        <p class="ph-sub">
          Draft, send and track offers across candidates. Manage templates and watch the
          accept/reject status.
        </p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filters">
        <select v-model="filterStatus" class="input select" @change="load">
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      <div class="action-group">
        <button
          class="btn btn-secondary btn-sm"
          @click="router.push({ name: 'recruitment.offer-templates' })"
        >
          Templates
        </button>
        <button class="btn btn-primary btn-sm" @click="showForm = !showForm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v12m6-6H6"
            />
          </svg>
          Create offer
        </button>
      </div>
    </div>

    <!-- Create Form -->
    <div v-if="showForm" class="card form-card">
      <div class="form-head">New offer letter</div>
      <div v-if="actionError" class="alert-error">{{ actionError }}</div>
      <div class="form-grid">
        <div class="field">
          <label>Candidate name *</label>
          <input v-model="form.candidate_name" type="text" class="input" />
        </div>
        <div class="field">
          <label>Position *</label>
          <input v-model="form.position" type="text" class="input" />
        </div>
        <div class="field">
          <label>Salary</label>
          <input v-model.number="form.salary" type="number" min="0" class="input" />
        </div>
        <div class="field">
          <label>Joining date</label>
          <input v-model="form.joining_date" type="date" class="input" />
        </div>
        <div class="field">
          <label>Expires at</label>
          <input v-model="form.expires_at" type="date" class="input" />
        </div>
        <div class="field">
          <label>Application ID</label>
          <input
            v-model.number="form.application_id"
            type="number"
            class="input"
            placeholder="Optional"
          />
        </div>
      </div>
      <div class="field">
        <label>Notes</label>
        <textarea v-model="form.notes" rows="2" class="input textarea"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary btn-sm" :disabled="saving" @click="submitOffer">
          {{ saving ? 'Creating...' : 'Create offer' }}
        </button>
        <button class="btn btn-secondary btn-sm" @click="showForm = false">Cancel</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card skeleton-card">
      <div v-for="i in 4" :key="i" class="sk-line"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert-error">{{ error }}</div>

    <!-- Empty -->
    <div v-else-if="offers.length === 0" class="card empty-state">
      <div class="empty-title">No offers found.</div>
    </div>

    <!-- Offers Table -->
    <div v-else class="card table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Position</th>
            <th>Salary</th>
            <th>Joining</th>
            <th>Status</th>
            <th>Expires</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="offer in offers" :key="offer.id" class="row">
            <td class="t-strong">{{ offer.candidate_name }}</td>
            <td>{{ offer.position }}</td>
            <td class="t-mono">
              {{ offer.salary ? offer.salary.toLocaleString() : '—' }}
            </td>
            <td class="t-muted">{{ formatDate(offer.joining_date) }}</td>
            <td>
              <span :class="['badge', `badge-${getStatusTone(offer.status)}`]">
                {{ offer.status }}
              </span>
            </td>
            <td class="t-muted">{{ formatDate(offer.expires_at) }}</td>
            <td>
              <div class="row-actions">
                <button
                  v-if="offer.status === 'draft'"
                  class="link-btn link-accent"
                  @click="sendOffer(offer.id)"
                >
                  Send
                </button>
                <button
                  v-if="offer.status === 'sent'"
                  class="link-btn link-ok"
                  @click="acceptOffer(offer.id)"
                >
                  Accept
                </button>
                <button
                  v-if="offer.status === 'sent'"
                  class="link-btn link-danger"
                  @click="rejectOffer(offer.id)"
                >
                  Reject
                </button>
                <button class="link-btn link-muted" @click="downloadOffer(offer.id)">
                  PDF
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.off-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #eef0f4;
}

/* Page header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}
.ph-eyebrow {
  font-size: 11px;
  font-weight: 500;
  color: #7a8299;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.ph-title {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: #eef0f4;
  margin: 0 0 6px;
  line-height: 1.1;
}
.ph-sub {
  font-size: 13px;
  color: #7a8299;
  margin: 0;
  max-width: 640px;
  line-height: 1.55;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  align-items: center;
  gap: 8px;
}
.action-group {
  display: flex;
  gap: 8px;
}

/* Inputs */
.input {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 6px;
  color: #eef0f4;
  font-size: 12.5px;
  padding: 7px 10px;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
  width: 100%;
}
.input:focus {
  border-color: #6b5bff;
}
.input::placeholder {
  color: #7a8299;
}
.select {
  cursor: pointer;
  padding-right: 28px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A8299' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.textarea {
  resize: vertical;
  min-height: 64px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  padding: 7px 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  font-family: inherit;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-sm {
  padding: 7px 11px;
  font-size: 12px;
}
.btn-primary {
  background: #6b5bff;
  color: #fff;
  border-color: #6b5bff;
}
.btn-primary:hover {
  background: #7d6fff;
}
.btn-secondary {
  background: #161a23;
  color: #eef0f4;
  border-color: #232936;
}
.btn-secondary:hover {
  border-color: #2c3242;
  background: #1a1f2a;
}

/* Card */
.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
}

.skeleton-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-line {
  height: 56px;
  background: #1a1f2a;
  border-radius: 6px;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

.alert-error {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #f38288;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
}

.empty-state {
  padding: 56px 20px;
  text-align: center;
}
.empty-title {
  color: #7a8299;
  font-size: 13px;
}

/* Form card */
.form-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-head {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field label {
  font-size: 11.5px;
  font-weight: 500;
  color: #c8ccd6;
}
.form-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

/* Table */
.table-card {
  overflow: hidden;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table thead th {
  background: #1a1f2a;
  border-bottom: 1px solid #232936;
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
  padding: 10px 18px;
}
.data-table tbody td {
  padding: 14px 18px;
  border-bottom: 1px solid #232936;
  font-size: 13px;
  color: #c8ccd6;
  vertical-align: middle;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.row {
  transition: background 0.12s ease;
}
.row:hover {
  background: rgba(107, 91, 255, 0.04);
}

.t-strong {
  color: #eef0f4;
  font-weight: 500;
}
.t-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #c8ccd6;
}
.t-muted {
  color: #7a8299;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.link-btn {
  background: transparent;
  border: none;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.link-accent {
  color: #6b5bff;
}
.link-accent:hover {
  color: #8a7dff;
}
.link-ok {
  color: #4dd39a;
}
.link-ok:hover {
  color: #6fdfac;
}
.link-danger {
  color: #f38288;
}
.link-danger:hover {
  color: #f59ba0;
}
.link-muted {
  color: #7a8299;
}
.link-muted:hover {
  color: #c8ccd6;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  border: 1px solid transparent;
  text-transform: capitalize;
}
.badge-ok {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}
.badge-warn {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.25);
}
.badge-danger {
  background: rgba(243, 130, 136, 0.12);
  color: #f38288;
  border-color: rgba(243, 130, 136, 0.25);
}
.badge-accent {
  background: rgba(107, 91, 255, 0.12);
  color: #9b8eff;
  border-color: rgba(107, 91, 255, 0.25);
}
.badge-neutral {
  background: #1a1f2a;
  color: #c8ccd6;
  border-color: #232936;
}
</style>
