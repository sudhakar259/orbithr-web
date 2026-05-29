<script setup lang="ts">
defineOptions({ name: 'EssTickets' })
import { ref, onMounted } from 'vue'
import { essService, type HrTicket } from '@/services/essService'

const loading = ref(true)
const saving = ref(false)
const commenting = ref(false)
const error = ref('')
const tickets = ref<HrTicket[]>([])
const selected = ref<HrTicket | null>(null)
const showForm = ref(false)
const newComment = ref('')
const filterStatus = ref('')

const form = ref({ category: 'general', subject: '', description: '', priority: 'medium' })

const categories = ['leave', 'payroll', 'attendance', 'policy', 'general', 'other']
const priorities = ['low', 'medium', 'high', 'urgent']

const load = async () => {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filterStatus.value) params.status = filterStatus.value
    const res = await essService.getTickets(params)
    tickets.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load tickets'
  } finally {
    loading.value = false
  }
}

const createTicket = async () => {
  saving.value = true
  error.value = ''
  try {
    await essService.createTicket(form.value)
    showForm.value = false
    form.value = { category: 'general', subject: '', description: '', priority: 'medium' }
    await load()
  } catch {
    error.value = 'Failed to create ticket'
  } finally {
    saving.value = false
  }
}

const viewTicket = async (ticket: HrTicket) => {
  try {
    const res = await essService.getTicket(ticket.id)
    selected.value = res.data?.data ?? ticket
  } catch {
    selected.value = ticket
  }
}

const addComment = async () => {
  if (!selected.value || !newComment.value.trim()) return
  commenting.value = true
  try {
    await essService.addComment(selected.value.id, newComment.value)
    newComment.value = ''
    const res = await essService.getTicket(selected.value.id)
    selected.value = res.data?.data ?? selected.value
  } catch {
    error.value = 'Failed to add comment'
  } finally {
    commenting.value = false
  }
}

const closeTicket = async () => {
  if (!selected.value) return
  try {
    await essService.closeTicket(selected.value.id)
    selected.value = null
    await load()
  } catch {
    error.value = 'Failed to close ticket'
  }
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    open: 'et-badge-blue',
    in_progress: 'et-badge-yellow',
    resolved: 'et-badge-green',
    closed: 'et-badge-muted',
  }
  return map[s] ?? 'et-badge-muted'
}

const priorityColor = (p: string) => {
  const map: Record<string, string> = {
    low: 'et-prio-muted', medium: 'et-prio-blue',
    high: 'et-prio-orange', urgent: 'et-prio-red',
  }
  return map[p] ?? 'et-prio-muted'
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

onMounted(load)
</script>

<template>
  <div class="et-page">
    <div class="et-toolbar">
      <select v-model="filterStatus" class="et-select" @change="load">
        <option value="">All Status</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
      <button class="et-btn-primary" @click="showForm = !showForm">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
        New Ticket
      </button>
    </div>

    <div v-if="error" class="et-error">{{ error }}</div>

    <!-- Create form -->
    <div v-if="showForm" class="et-form-card">
      <h3 class="et-form-title">New HR Ticket</h3>
      <div class="et-form-grid">
        <div class="et-field">
          <label class="et-label">Category</label>
          <select v-model="form.category" class="et-input">
            <option v-for="c in categories" :key="c" :value="c" class="capitalize">{{ c }}</option>
          </select>
        </div>
        <div class="et-field">
          <label class="et-label">Priority</label>
          <select v-model="form.priority" class="et-input">
            <option v-for="p in priorities" :key="p" :value="p" class="capitalize">{{ p }}</option>
          </select>
        </div>
        <div class="et-field et-full">
          <label class="et-label">Subject *</label>
          <input v-model="form.subject" type="text" class="et-input" />
        </div>
        <div class="et-field et-full">
          <label class="et-label">Description *</label>
          <textarea v-model="form.description" rows="4" class="et-input et-textarea"></textarea>
        </div>
      </div>
      <div class="et-form-actions">
        <button class="et-btn-primary" :disabled="saving" @click="createTicket">{{ saving ? 'Creating…' : 'Submit Ticket' }}</button>
        <button class="et-btn-ghost" @click="showForm = false">Cancel</button>
      </div>
    </div>

    <!-- Ticket detail panel -->
    <div v-if="selected" class="et-detail-panel">
      <div class="et-detail-head">
        <div>
          <div class="et-detail-meta">
            <span class="et-ticket-num">{{ selected.ticket_number }}</span>
            <span :class="['et-badge', statusBadge(selected.status)]">{{ selected.status.replace('_', ' ') }}</span>
          </div>
          <h3 class="et-detail-subject">{{ selected.subject }}</h3>
          <p class="et-detail-desc">{{ selected.description }}</p>
        </div>
        <button class="et-close-btn" @click="selected = null">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="et-comments">
        <div class="et-comments-head">Comments</div>
        <div v-if="selected.comments?.length" class="et-comment-list">
          <div v-for="c in selected.comments" :key="c.id" class="et-comment">
            <div class="et-comment-meta">
              <span class="et-comment-author">{{ c.user?.name ?? 'User' }}</span>
              <span class="et-comment-date">{{ formatDate(c.created_at) }}</span>
            </div>
            <p class="et-comment-text">{{ c.comment }}</p>
          </div>
        </div>
        <p v-else class="et-no-comments">No comments yet.</p>
        <div v-if="selected.status !== 'closed'" class="et-comment-input-row">
          <input v-model="newComment" type="text" placeholder="Add a comment…" class="et-input et-flex-1" @keyup.enter="addComment" />
          <button class="et-btn-primary" :disabled="commenting" @click="addComment">Send</button>
          <button class="et-btn-ghost" @click="closeTicket">Close Ticket</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="et-card et-loading">
      <div v-for="i in 4" :key="i" class="et-skeleton"></div>
    </div>

    <!-- Tickets list -->
    <div v-else-if="tickets.length" class="et-list">
      <div v-for="ticket in tickets" :key="ticket.id" class="et-ticket-row" @click="viewTicket(ticket)">
        <div class="et-ticket-body">
          <div class="et-ticket-meta">
            <span class="et-ticket-num">{{ ticket.ticket_number }}</span>
            <span class="et-ticket-cat">{{ ticket.category }}</span>
            <span :class="['et-prio', priorityColor(ticket.priority)]">{{ ticket.priority }}</span>
          </div>
          <p class="et-ticket-subject">{{ ticket.subject }}</p>
          <p class="et-ticket-date">{{ formatDate(ticket.created_at) }}</p>
        </div>
        <span :class="['et-badge', statusBadge(ticket.status)]">{{ ticket.status.replace('_', ' ') }}</span>
      </div>
    </div>

    <div v-else-if="!loading" class="et-empty">No tickets found. Create one to get started.</div>
  </div>
</template>

<style scoped>
.et-page { display: flex; flex-direction: column; gap: 16px; }
.et-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.et-select { background: #161A23; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; cursor: pointer; }
.et-select:focus { border-color: #6B5BFF; }
.et-btn-primary { display: inline-flex; align-items: center; gap: 6px; background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.et-btn-primary:hover { opacity: 0.88; }
.et-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.et-btn-ghost { background: transparent; border: 1px solid #232936; color: #7A8299; border-radius: 7px; padding: 8px 14px; font-size: 13px; cursor: pointer; }
.et-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.et-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }

.et-form-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.et-form-title { margin: 0; font-size: 13px; font-weight: 600; color: #EEF0F4; text-transform: uppercase; letter-spacing: 0.08em; }
.et-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.et-field { display: flex; flex-direction: column; gap: 5px; }
.et-full { grid-column: 1 / -1; }
.et-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.et-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.et-input:focus { border-color: #6B5BFF; }
.et-textarea { resize: vertical; min-height: 90px; }
.et-flex-1 { flex: 1; }
.et-form-actions { display: flex; gap: 10px; }

.et-detail-panel { background: #161A23; border: 1px solid rgba(107,91,255,0.35); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.et-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.et-detail-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.et-detail-subject { margin: 0; font-size: 15px; font-weight: 600; color: #EEF0F4; }
.et-detail-desc { margin: 6px 0 0; font-size: 13px; color: #7A8299; }
.et-ticket-num { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #7A8299; }
.et-close-btn { background: none; border: none; color: #7A8299; cursor: pointer; padding: 4px; flex-shrink: 0; }
.et-close-btn:hover { color: #EEF0F4; }

.et-comments { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #232936; padding-top: 14px; }
.et-comments-head { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; }
.et-comment-list { display: flex; flex-direction: column; gap: 8px; }
.et-comment { background: rgba(255,255,255,0.03); border: 1px solid #232936; border-radius: 8px; padding: 10px 12px; }
.et-comment-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.et-comment-author { font-size: 12px; font-weight: 500; color: #B6BED0; }
.et-comment-date { font-size: 11px; color: #7A8299; }
.et-comment-text { font-size: 13px; color: #B6BED0; margin: 0; }
.et-no-comments { font-size: 12px; color: #7A8299; }
.et-comment-input-row { display: flex; gap: 8px; align-items: center; }

.et-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; }
.et-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.et-skeleton { height: 52px; background: #232936; border-radius: 6px; animation: et-pulse 1.2s ease-in-out infinite; }
@keyframes et-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

.et-list { display: flex; flex-direction: column; gap: 8px; }
.et-ticket-row { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 12px; transition: border-color 0.12s; }
.et-ticket-row:hover { border-color: #3A4055; }
.et-ticket-body { flex: 1; min-width: 0; }
.et-ticket-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.et-ticket-cat { font-size: 11px; color: #7A8299; background: #232936; padding: 2px 7px; border-radius: 4px; text-transform: capitalize; }
.et-ticket-subject { margin: 0; font-size: 13px; font-weight: 500; color: #EEF0F4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.et-ticket-date { margin: 4px 0 0; font-size: 11px; color: #7A8299; }

.et-prio { font-size: 11px; font-weight: 500; text-transform: capitalize; }
.et-prio-muted { color: #7A8299; }
.et-prio-blue { color: #7ED7FF; }
.et-prio-orange { color: #F5A623; }
.et-prio-red { color: #F38288; }

.et-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.et-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.et-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.et-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.et-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }

.et-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }
</style>
