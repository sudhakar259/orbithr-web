<script setup lang="ts">
defineOptions({ name: 'ClaimDetail' })

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import expenseService, { type ExpenseClaim } from '@/services/expenseService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

const route = useRoute()
const router = useRouter()
const claimId = computed(() => Number(route.params.id))

const loading = ref(true)
const error = ref('')
const claim = ref<ExpenseClaim | null>(null)
const actionComment = ref('')
const actionLoading = ref(false)
const showActionPanel = ref(false)

const statusBadge: Record<string, string> = {
  draft: 'cd-badge-muted',
  submitted: 'cd-badge-blue',
  under_review: 'cd-badge-yellow',
  approved: 'cd-badge-green',
  rejected: 'cd-badge-red',
  paid: 'cd-badge-teal',
  pending: 'cd-badge-yellow',
  changes_requested: 'cd-badge-yellow',
}

const approvalBadge: Record<string, string> = {
  pending: 'cd-badge-yellow',
  approved: 'cd-badge-green',
  rejected: 'cd-badge-red',
  changes_requested: 'cd-badge-yellow',
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: claim.value?.currency || 'USD' }).format(amount)
}

function fmtDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const hasPendingApproval = computed(() =>
  claim.value?.approvals?.some(a => a.status === 'pending') ?? false,
)

const pendingApprovalId = computed(() =>
  claim.value?.approvals?.find(a => a.status === 'pending')?.id ?? null,
)

async function loadClaim() {
  loading.value = true
  error.value = ''
  try {
    const res = await expenseService.getClaim(claimId.value)
    claim.value = res.data?.data ?? res.data
  } catch {
    error.value = 'Failed to load claim details.'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!await dialog('Confirm', 'Submit this claim for approval?')) return
  actionLoading.value = true
  try {
    await expenseService.submitClaim(claimId.value)
    await loadClaim()
  } catch {
    error.value = 'Failed to submit claim.'
  } finally {
    actionLoading.value = false
  }
}

async function handleAction(action: 'approve' | 'reject' | 'request_changes') {
  if (!pendingApprovalId.value) return
  actionLoading.value = true
  try {
    if (action === 'approve') {
      await expenseService.approveClaim(pendingApprovalId.value, actionComment.value || undefined)
    } else if (action === 'reject') {
      await expenseService.rejectClaim(pendingApprovalId.value, actionComment.value)
    } else {
      await expenseService.requestChanges(pendingApprovalId.value, actionComment.value)
    }
    actionComment.value = ''
    showActionPanel.value = false
    await loadClaim()
  } catch {
    error.value = 'Action failed.'
  } finally {
    actionLoading.value = false
  }
}

onMounted(loadClaim)
</script>

<template>
  <div class="cd-page">
    <div class="cd-back-row">
      <button class="cd-back-btn" @click="router.back()">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
      </button>
      <h1 class="cd-title">Claim Detail</h1>
    </div>

    <div v-if="loading" class="cd-card cd-loading">
      <div v-for="i in 5" :key="i" class="cd-skeleton"></div>
    </div>

    <div v-else-if="error && !claim" class="cd-error">{{ error }}</div>

    <template v-else-if="claim">
      <div v-if="error" class="cd-error">{{ error }}</div>

      <!-- Header -->
      <div class="cd-card cd-header-card">
        <div class="cd-header-body">
          <div class="cd-header-info">
            <h2 class="cd-claim-title">{{ claim.title }}</h2>
            <p v-if="claim.description" class="cd-claim-desc">{{ claim.description }}</p>
            <p class="cd-claim-meta">
              <span v-if="claim.employee?.name">By {{ claim.employee?.name }} &middot; </span>
              Submitted {{ fmtDate(claim.submitted_at) }}
            </p>
          </div>
          <div class="cd-header-right">
            <span :class="['cd-badge', statusBadge[claim.status] ?? 'cd-badge-muted']">{{ claim.status.replace('_', ' ') }}</span>
            <div class="cd-total">{{ fmtCurrency(claim.total_amount) }}</div>
          </div>
        </div>
        <div v-if="claim.status === 'draft'" class="cd-draft-actions">
          <button :disabled="actionLoading" class="cd-btn-submit" @click="handleSubmit">Submit</button>
          <RouterLink :to="{ name: 'expenses.claims.edit', params: { id: claim.id } }" class="cd-btn-edit">Edit</RouterLink>
        </div>
      </div>

      <!-- Line Items -->
      <div class="cd-section-card">
        <div class="cd-section-head">Line Items</div>
        <table class="cd-table">
          <thead>
            <tr>
              <th class="cd-th">Date</th>
              <th class="cd-th">Category</th>
              <th class="cd-th">Description</th>
              <th class="cd-th">Merchant</th>
              <th class="cd-th cd-th-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in claim.items" :key="item.id" class="cd-row">
              <td class="cd-td">{{ fmtDate(item.date) }}</td>
              <td class="cd-td">{{ item.category?.name || '-' }}</td>
              <td class="cd-td cd-td-name">{{ item.description }}</td>
              <td class="cd-td cd-td-muted">{{ item.merchant_name || '-' }}</td>
              <td class="cd-td cd-td-right cd-mono cd-bold">{{ fmtCurrency(item.amount) }}</td>
            </tr>
            <tr v-if="!claim.items?.length">
              <td colspan="5" class="cd-td-empty">No items</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="cd-tfoot-row">
              <td colspan="4" class="cd-tfoot-label">Total</td>
              <td class="cd-tfoot-value">{{ fmtCurrency(claim.total_amount) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Approval Timeline -->
      <div v-if="claim.approvals?.length" class="cd-card cd-timeline-card">
        <div class="cd-section-label">Approval Timeline</div>
        <div class="cd-timeline">
          <div v-for="approval in claim.approvals" :key="approval.id" class="cd-timeline-item">
            <div :class="['cd-timeline-dot', approval.status === 'approved' ? 'cd-dot-green' : approval.status === 'rejected' ? 'cd-dot-red' : 'cd-dot-yellow']" />
            <div class="cd-timeline-content">
              <div class="cd-timeline-head">
                <span class="cd-timeline-level">{{ approval.level_label || 'Level ' + approval.level }}</span>
                <span :class="['cd-badge', approvalBadge[approval.status] ?? 'cd-badge-muted']">{{ approval.status.replace('_', ' ') }}</span>
              </div>
              <p v-if="approval.approver_name" class="cd-timeline-meta">{{ approval.approver_name }}</p>
              <p v-if="approval.comments" class="cd-timeline-comment">"{{ approval.comments }}"</p>
              <p v-if="approval.acted_at" class="cd-timeline-date">{{ fmtDateTime(approval.acted_at) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Reimbursement -->
      <div v-if="claim.reimbursement" class="cd-card cd-reimb-card">
        <div class="cd-section-label">Reimbursement</div>
        <div class="cd-reimb-grid">
          <div class="cd-reimb-field">
            <div class="cd-reimb-label">Status</div>
            <span :class="['cd-badge', statusBadge[claim.reimbursement.status] ?? 'cd-badge-muted']">{{ claim.reimbursement.status }}</span>
          </div>
          <div class="cd-reimb-field">
            <div class="cd-reimb-label">Payment Mode</div>
            <div class="cd-reimb-value">{{ claim.reimbursement.payment_mode || '-' }}</div>
          </div>
          <div class="cd-reimb-field">
            <div class="cd-reimb-label">Payment Date</div>
            <div class="cd-reimb-value">{{ fmtDate(claim.reimbursement.payment_date) }}</div>
          </div>
          <div class="cd-reimb-field">
            <div class="cd-reimb-label">Reference</div>
            <div class="cd-reimb-value cd-mono">{{ claim.reimbursement.reference_id || '-' }}</div>
          </div>
        </div>
      </div>

      <!-- Approver action panel -->
      <div v-if="hasPendingApproval" class="cd-card cd-action-card">
        <div class="cd-section-label">Approval Action</div>
        <div v-if="!showActionPanel">
          <button class="cd-btn-review" @click="showActionPanel = true">Review</button>
        </div>
        <div v-else class="cd-action-panel">
          <textarea
            v-model="actionComment"
            rows="3"
            class="cd-textarea"
            placeholder="Comments (required for reject / request changes)…"
          />
          <div class="cd-action-btns">
            <button :disabled="actionLoading" class="cd-btn-approve" @click="handleAction('approve')">Approve</button>
            <button :disabled="actionLoading || !actionComment.trim()" class="cd-btn-reject" @click="handleAction('reject')">Reject</button>
            <button :disabled="actionLoading || !actionComment.trim()" class="cd-btn-changes" @click="handleAction('request_changes')">Request Changes</button>
            <button class="cd-btn-cancel-text" @click="showActionPanel = false">Cancel</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cd-page { display: flex; flex-direction: column; gap: 16px; max-width: 900px; }
.cd-back-row { display: flex; align-items: center; gap: 10px; }
.cd-back-btn { background: none; border: none; color: #7A8299; cursor: pointer; padding: 4px; display: flex; align-items: center; }
.cd-back-btn:hover { color: #EEF0F4; }
.cd-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0; }
.cd-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; }
.cd-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.cd-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: cd-pulse 1.2s ease-in-out infinite; }
@keyframes cd-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.cd-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.cd-header-card { padding: 20px; }
.cd-header-body { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.cd-header-info { flex: 1; min-width: 0; }
.cd-claim-title { font-size: 18px; font-weight: 600; color: #EEF0F4; margin: 0; }
.cd-claim-desc { font-size: 13px; color: #7A8299; margin: 4px 0 0; }
.cd-claim-meta { font-size: 12px; color: #7A8299; margin: 8px 0 0; }
.cd-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.cd-total { font-family: 'Instrument Serif', serif; font-size: 24px; color: #EEF0F4; letter-spacing: -0.02em; }
.cd-draft-actions { display: flex; gap: 10px; margin-top: 16px; border-top: 1px solid #232936; padding-top: 16px; }
.cd-btn-submit { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 18px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cd-btn-submit:hover:not(:disabled) { opacity: 0.88; }
.cd-btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }
.cd-btn-edit { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; text-decoration: none; }
.cd-btn-edit:hover { color: #EEF0F4; }
.cd-section-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.cd-section-head { padding: 14px 16px; border-bottom: 1px solid #232936; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.cd-section-label { font-size: 13px; font-weight: 600; color: #EEF0F4; margin-bottom: 14px; }
.cd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.cd-th { padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.cd-th-right { text-align: right; }
.cd-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.cd-row:last-child { border-bottom: none; }
.cd-row:hover { background: rgba(255,255,255,0.02); }
.cd-td { padding: 10px 14px; color: #B6BED0; vertical-align: middle; }
.cd-td-name { color: #EEF0F4; }
.cd-td-muted { color: #7A8299; }
.cd-td-right { text-align: right; }
.cd-td-empty { padding: 24px 14px; text-align: center; color: #7A8299; font-size: 13px; }
.cd-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.cd-bold { font-weight: 600; }
.cd-tfoot-row { border-top: 1px solid #232936; }
.cd-tfoot-label { padding: 10px 14px; text-align: right; font-size: 12px; font-weight: 600; color: #7A8299; }
.cd-tfoot-value { padding: 10px 14px; text-align: right; font-size: 15px; font-weight: 700; color: #EEF0F4; font-family: 'Instrument Serif', serif; }
.cd-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.cd-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.cd-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.cd-badge-red    { background: rgba(243,130,136,0.12); color: #F38288; }
.cd-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.cd-badge-teal   { background: rgba(77,211,154,0.12); color: #4DD39A; }
.cd-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.cd-timeline-card { padding: 20px; }
.cd-timeline { display: flex; flex-direction: column; gap: 16px; padding-left: 20px; position: relative; }
.cd-timeline::before { content: ''; position: absolute; left: 5px; top: 8px; bottom: 8px; width: 1px; background: #232936; }
.cd-timeline-item { display: flex; gap: 12px; position: relative; }
.cd-timeline-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; position: absolute; left: -17px; border: 2px solid #161A23; }
.cd-dot-green { background: #4DD39A; }
.cd-dot-red { background: #F38288; }
.cd-dot-yellow { background: #F5A623; }
.cd-timeline-content { flex: 1; }
.cd-timeline-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.cd-timeline-level { font-size: 13px; font-weight: 500; color: #EEF0F4; }
.cd-timeline-meta { font-size: 12px; color: #7A8299; margin: 0; }
.cd-timeline-comment { font-size: 12px; color: #B6BED0; font-style: italic; margin: 4px 0 0; }
.cd-timeline-date { font-size: 11px; color: #7A8299; margin: 4px 0 0; }
.cd-reimb-card { padding: 20px; }
.cd-reimb-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.cd-reimb-field { display: flex; flex-direction: column; gap: 4px; }
.cd-reimb-label { font-size: 11px; color: #7A8299; }
.cd-reimb-value { font-size: 13px; color: #EEF0F4; }
.cd-action-card { padding: 20px; }
.cd-action-panel { display: flex; flex-direction: column; gap: 12px; }
.cd-textarea { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 10px 12px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; resize: vertical; min-height: 80px; }
.cd-textarea:focus { border-color: #6B5BFF; }
.cd-action-btns { display: flex; gap: 10px; flex-wrap: wrap; }
.cd-btn-review { background: rgba(77,211,154,0.12); border: 1px solid rgba(77,211,154,0.25); color: #4DD39A; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cd-btn-approve { background: rgba(77,211,154,0.12); border: 1px solid rgba(77,211,154,0.25); color: #4DD39A; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cd-btn-approve:hover:not(:disabled) { background: rgba(77,211,154,0.22); }
.cd-btn-approve:disabled { opacity: 0.45; cursor: not-allowed; }
.cd-btn-reject { background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); color: #F38288; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cd-btn-reject:hover:not(:disabled) { background: rgba(243,130,136,0.2); }
.cd-btn-reject:disabled { opacity: 0.45; cursor: not-allowed; }
.cd-btn-changes { background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.25); color: #F5A623; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cd-btn-changes:hover:not(:disabled) { background: rgba(245,166,35,0.2); }
.cd-btn-changes:disabled { opacity: 0.45; cursor: not-allowed; }
.cd-btn-cancel-text { background: none; border: none; color: #7A8299; font-size: 13px; cursor: pointer; padding: 8px; }
.cd-btn-cancel-text:hover { color: #EEF0F4; }
</style>
