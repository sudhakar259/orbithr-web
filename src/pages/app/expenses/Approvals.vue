<script setup lang="ts">
defineOptions({ name: 'ExpenseApprovals' })

import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import expenseService, { type ExpenseApproval, type ExpenseClaim } from '@/services/expenseService'

interface ApprovalWithClaim extends ExpenseApproval {
  claim?: ExpenseClaim & { employee_name?: string }
  level_label?: string
  acted_at?: string | null
}

const activeTab = ref<'pending' | 'history'>('pending')
const loading = ref(true)
const error = ref('')
const pending = ref<ApprovalWithClaim[]>([])
const history = ref<ApprovalWithClaim[]>([])

const commentModal = ref(false)
const commentAction = ref<'approve' | 'reject' | 'request_changes'>('approve')
const commentTarget = ref<number | null>(null)
const commentText = ref('')
const actionLoading = ref(false)

const statusBadge: Record<string, string> = {
  pending: 'ea-badge-yellow',
  approved: 'ea-badge-green',
  rejected: 'ea-badge-red',
  changes_requested: 'ea-badge-yellow',
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function fmtDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function openActionModal(id: number, action: 'approve' | 'reject' | 'request_changes') {
  commentTarget.value = id
  commentAction.value = action
  commentText.value = ''
  commentModal.value = true
}

async function doAction() {
  if (!commentTarget.value) return
  actionLoading.value = true
  try {
    if (commentAction.value === 'approve') {
      await expenseService.approveClaim(commentTarget.value, commentText.value || undefined)
    } else if (commentAction.value === 'reject') {
      await expenseService.rejectClaim(commentTarget.value, commentText.value)
    } else {
      await expenseService.requestChanges(commentTarget.value, commentText.value)
    }
    commentModal.value = false
    await fetchData()
  } catch {
    error.value = 'Action failed.'
  } finally {
    actionLoading.value = false
  }
}

const actionLabel = computed(() => {
  if (commentAction.value === 'approve') return 'Approve'
  if (commentAction.value === 'reject') return 'Reject'
  return 'Request Changes'
})

const actionBtnClass = computed(() => {
  if (commentAction.value === 'approve') return 'ea-modal-btn-green'
  if (commentAction.value === 'reject') return 'ea-modal-btn-red'
  return 'ea-modal-btn-yellow'
})

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [pendingRes, historyRes] = await Promise.all([
      expenseService.getPendingApprovals(),
      expenseService.getAllApprovals(),
    ])
    pending.value = pendingRes.data?.data ?? pendingRes.data ?? []
    history.value = historyRes.data?.data ?? historyRes.data ?? []
  } catch {
    error.value = 'Failed to load approvals.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="ea-page">
    <h1 class="ea-title">Approvals</h1>

    <div class="ea-tabs">
      <button :class="['ea-tab', activeTab === 'pending' ? 'ea-tab-active' : '']" @click="activeTab = 'pending'">
        Pending ({{ pending.length }})
      </button>
      <button :class="['ea-tab', activeTab === 'history' ? 'ea-tab-active' : '']" @click="activeTab = 'history'">
        History
      </button>
    </div>

    <div v-if="loading" class="ea-card ea-loading">
      <div v-for="i in 4" :key="i" class="ea-skeleton"></div>
    </div>

    <div v-else-if="error" class="ea-error">{{ error }}</div>

    <template v-else>
      <div v-if="activeTab === 'pending'" class="ea-list">
        <div v-if="!pending.length" class="ea-empty">No pending approvals</div>
        <div v-for="approval in pending" :key="approval.id" class="ea-approval-card">
          <div class="ea-approval-info">
            <RouterLink
              v-if="approval.claim"
              :to="{ name: 'expenses.claims.show', params: { id: approval.expense_claim_id } }"
              class="ea-claim-title"
            >
              {{ approval.claim.title }}
            </RouterLink>
            <p class="ea-approval-meta">
              <span v-if="approval.claim?.employee_name">{{ approval.claim.employee_name }} &middot; </span>
              {{ approval.level_label || 'Level ' + approval.level }}
            </p>
            <p v-if="approval.claim" class="ea-amount">{{ fmtCurrency(approval.claim.total_amount) }}</p>
            <p class="ea-date">Submitted {{ fmtDate(approval.claim?.submitted_at ?? null) }}</p>
          </div>
          <div class="ea-approval-actions">
            <button class="ea-btn-approve" @click="openActionModal(approval.id, 'approve')">Approve</button>
            <button class="ea-btn-reject" @click="openActionModal(approval.id, 'reject')">Reject</button>
            <button class="ea-btn-changes" @click="openActionModal(approval.id, 'request_changes')">Request Changes</button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'history'" class="ea-card">
        <table class="ea-table">
          <thead>
            <tr>
              <th class="ea-th">Claim</th>
              <th class="ea-th">Level</th>
              <th class="ea-th">Status</th>
              <th class="ea-th">Comments</th>
              <th class="ea-th">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in history" :key="a.id" class="ea-row">
              <td class="ea-td">
                <RouterLink v-if="a.claim" :to="{ name: 'expenses.claims.show', params: { id: a.expense_claim_id } }" class="ea-link">
                  {{ a.claim.title }}
                </RouterLink>
                <span v-else class="ea-td-muted">#{{ a.expense_claim_id }}</span>
              </td>
              <td class="ea-td">{{ a.level_label || 'Level ' + a.level }}</td>
              <td class="ea-td">
                <span :class="['ea-badge', statusBadge[a.status] ?? 'ea-badge-muted']">{{ a.status.replace('_', ' ') }}</span>
              </td>
              <td class="ea-td ea-td-truncate">{{ a.comments || '-' }}</td>
              <td class="ea-td ea-td-muted">{{ fmtDate(a.acted_at) }}</td>
            </tr>
            <tr v-if="!history.length">
              <td colspan="5" class="ea-td-empty">No approval history</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <Teleport to="body">
      <div v-if="commentModal" class="ea-overlay" @click.self="commentModal = false">
        <div class="ea-modal">
          <h3 class="ea-modal-title">{{ actionLabel }}</h3>
          <textarea
            v-model="commentText"
            rows="3"
            class="ea-textarea"
            :placeholder="commentAction === 'approve' ? 'Optional comments…' : 'Provide a reason…'"
          />
          <div class="ea-modal-footer">
            <button class="ea-btn-ghost" @click="commentModal = false">Cancel</button>
            <button
              :disabled="actionLoading || (commentAction !== 'approve' && !commentText.trim())"
              :class="['ea-modal-action-btn', actionBtnClass]"
              @click="doAction"
            >
              {{ actionLoading ? 'Processing…' : actionLabel }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ea-page { display: flex; flex-direction: column; gap: 16px; }
.ea-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0; }
.ea-tabs { display: flex; gap: 0; border-bottom: 1px solid #232936; }
.ea-tab { background: none; border: none; border-bottom: 2px solid transparent; color: #7A8299; padding: 10px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: color 0.12s; margin-bottom: -1px; }
.ea-tab:hover { color: #EEF0F4; }
.ea-tab-active { color: #6B5BFF; border-bottom-color: #6B5BFF; }
.ea-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.ea-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.ea-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: ea-pulse 1.2s ease-in-out infinite; }
@keyframes ea-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ea-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.ea-list { display: flex; flex-direction: column; gap: 8px; }
.ea-approval-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ea-approval-info { flex: 1; min-width: 0; }
.ea-claim-title { font-size: 14px; font-weight: 600; color: #EEF0F4; text-decoration: none; }
.ea-claim-title:hover { color: #8A7BFF; }
.ea-approval-meta { font-size: 12px; color: #7A8299; margin: 3px 0; }
.ea-amount { font-family: 'Instrument Serif', serif; font-size: 20px; color: #EEF0F4; margin: 4px 0; }
.ea-date { font-size: 11px; color: #7A8299; }
.ea-approval-actions { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
.ea-btn-approve { background: rgba(77,211,154,0.15); border: 1px solid rgba(77,211,154,0.3); color: #4DD39A; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.ea-btn-approve:hover { background: rgba(77,211,154,0.25); }
.ea-btn-reject { background: rgba(243,130,136,0.12); border: 1px solid rgba(243,130,136,0.25); color: #F38288; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.ea-btn-reject:hover { background: rgba(243,130,136,0.22); }
.ea-btn-changes { background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.25); color: #F5A623; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.ea-btn-changes:hover { background: rgba(245,166,35,0.2); }
.ea-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }
.ea-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ea-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.ea-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.ea-row:last-child { border-bottom: none; }
.ea-row:hover { background: rgba(255,255,255,0.02); }
.ea-td { padding: 11px 16px; color: #B6BED0; vertical-align: middle; }
.ea-td-muted { color: #7A8299; }
.ea-td-truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ea-td-empty { padding: 32px 16px; text-align: center; color: #7A8299; font-size: 13px; }
.ea-link { color: #EEF0F4; text-decoration: none; font-weight: 500; }
.ea-link:hover { color: #8A7BFF; }
.ea-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.ea-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.ea-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.ea-badge-red    { background: rgba(243,130,136,0.12); color: #F38288; }
.ea-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.ea-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.65); }
.ea-modal { background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 24px; width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 16px; }
.ea-modal-title { font-size: 15px; font-weight: 600; color: #EEF0F4; margin: 0; }
.ea-textarea { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 10px 12px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; resize: vertical; min-height: 80px; }
.ea-textarea:focus { border-color: #6B5BFF; }
.ea-modal-footer { display: flex; justify-content: flex-end; gap: 10px; }
.ea-btn-ghost { background: transparent; border: 1px solid #232936; color: #7A8299; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.ea-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.ea-modal-action-btn { border: none; border-radius: 7px; padding: 8px 18px; font-size: 13px; font-weight: 500; color: #fff; cursor: pointer; }
.ea-modal-action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ea-modal-btn-green { background: #2A9D6A; }
.ea-modal-btn-green:hover:not(:disabled) { background: #248A5C; }
.ea-modal-btn-red { background: #C04B52; }
.ea-modal-btn-red:hover:not(:disabled) { background: #A83D44; }
.ea-modal-btn-yellow { background: #C07C14; }
.ea-modal-btn-yellow:hover:not(:disabled) { background: #A96B10; }
</style>
