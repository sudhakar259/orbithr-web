<script setup lang="ts">
defineOptions({ name: 'ClaimDetail' })

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import expenseService, { type ExpenseClaim } from '@/services/expenseService'

const route = useRoute()
const router = useRouter()
const claimId = computed(() => Number(route.params.id))

const loading = ref(true)
const error = ref('')
const claim = ref<ExpenseClaim | null>(null)
const actionComment = ref('')
const actionLoading = ref(false)
const showActionPanel = ref(false)

const statusClass: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  submitted: 'bg-blue-900/50 text-blue-400',
  under_review: 'bg-yellow-900/50 text-yellow-400',
  approved: 'bg-green-900/50 text-green-400',
  rejected: 'bg-red-900/50 text-red-400',
  paid: 'bg-teal-900/50 text-teal-400',
  pending: 'bg-yellow-900/50 text-yellow-400',
  changes_requested: 'bg-yellow-900/50 text-yellow-400',
}

const approvalStatusClass: Record<string, string> = {
  pending: 'bg-yellow-900/50 text-yellow-400',
  approved: 'bg-green-900/50 text-green-400',
  rejected: 'bg-red-900/50 text-red-400',
  changes_requested: 'bg-yellow-900/50 text-yellow-400',
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
  if (!confirm('Submit this claim for approval?')) return
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
  <div class="max-w-4xl space-y-6">
    <div class="flex items-center gap-3">
      <button class="text-gray-400 hover:text-white" @click="router.back()">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
      </button>
      <h1 class="text-2xl font-bold text-white">Claim Detail</h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div v-for="i in 5" :key="i" class="h-4 bg-gray-700 rounded mb-4" />
    </div>

    <!-- Error -->
    <div v-else-if="error && !claim" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

    <template v-else-if="claim">
      <!-- Inline error -->
      <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

      <!-- Header card -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-white">{{ claim.title }}</h2>
            <p v-if="claim.description" class="text-gray-400 text-sm mt-1">{{ claim.description }}</p>
            <p class="text-gray-400 text-sm mt-2">
              <span v-if="claim.employee?.name">By {{ claim.employee?.name }} &middot; </span>
              Submitted {{ fmtDate(claim.submitted_at) }}
            </p>
          </div>
          <div class="text-right">
            <span :class="[statusClass[claim.status] || 'bg-gray-700 text-gray-300', 'text-xs px-2.5 py-1 rounded-full font-medium']">
              {{ claim.status.replace('_', ' ') }}
            </span>
            <p class="text-2xl font-bold text-white mt-2">{{ fmtCurrency(claim.total_amount) }}</p>
          </div>
        </div>

        <!-- Draft/submitted actions -->
        <div v-if="claim.status === 'draft'" class="mt-4 flex gap-3">
          <button :disabled="actionLoading" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40" @click="handleSubmit">
            Submit
          </button>
          <RouterLink :to="{ name: 'expenses.claims.edit', params: { id: claim.id } }" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">
            Edit
          </RouterLink>
        </div>
      </div>

      <!-- Items table -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-700">
          <h3 class="text-lg font-semibold text-white">Line Items</h3>
        </div>
        <table class="w-full">
          <thead>
            <tr class="bg-gray-700/50">
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Date</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Category</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Description</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Merchant</th>
              <th class="text-right px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="item in claim.items" :key="item.id" class="hover:bg-gray-700/30">
              <td class="px-5 py-3 text-gray-300 text-sm">{{ fmtDate(item.date) }}</td>
              <td class="px-5 py-3 text-gray-300 text-sm">{{ item.category?.name || '-' }}</td>
              <td class="px-5 py-3 text-white text-sm">{{ item.description }}</td>
              <td class="px-5 py-3 text-gray-400 text-sm">{{ item.merchant_name || '-' }}</td>
              <td class="px-5 py-3 text-white text-sm text-right">{{ fmtCurrency(item.amount) }}</td>
            </tr>
            <tr v-if="!claim.items?.length">
              <td colspan="5" class="px-5 py-6 text-center text-gray-500">No items</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-gray-600">
              <td colspan="4" class="px-5 py-3 text-right text-sm font-semibold text-gray-300">Total</td>
              <td class="px-5 py-3 text-right text-lg font-bold text-white">{{ fmtCurrency(claim.total_amount) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Approval timeline -->
      <div v-if="claim.approvals?.length" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Approval Timeline</h3>
        <div class="relative pl-6 space-y-6">
          <!-- Vertical line -->
          <div class="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-600" />

          <div v-for="approval in claim.approvals" :key="approval.id" class="relative">
            <!-- Dot -->
            <div
              :class="[
                approval.status === 'approved' ? 'bg-green-500' : approval.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500',
                'absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 border-gray-800',
              ]"
            />
            <div>
              <div class="flex items-center gap-3 flex-wrap">
                <span class="text-white font-medium text-sm">{{ approval.level_label || 'Level ' + approval.level }}</span>
                <span :class="[approvalStatusClass[approval.status] || 'bg-gray-700 text-gray-300', 'text-xs px-2 py-0.5 rounded-full font-medium']">
                  {{ approval.status.replace('_', ' ') }}
                </span>
              </div>
              <p v-if="approval.approver_name" class="text-gray-400 text-sm mt-1">{{ approval.approver_name }}</p>
              <p v-if="approval.comments" class="text-gray-300 text-sm mt-1 italic">"{{ approval.comments }}"</p>
              <p v-if="approval.acted_at" class="text-gray-500 text-xs mt-1">{{ fmtDateTime(approval.acted_at) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Reimbursement card -->
      <div v-if="claim.reimbursement" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-white mb-3">Reimbursement</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p class="text-gray-400">Status</p>
            <span :class="[statusClass[claim.reimbursement.status] || 'bg-gray-700 text-gray-300', 'text-xs px-2 py-0.5 rounded-full font-medium']">
              {{ claim.reimbursement.status }}
            </span>
          </div>
          <div>
            <p class="text-gray-400">Payment Mode</p>
            <p class="text-white">{{ claim.reimbursement.payment_mode || '-' }}</p>
          </div>
          <div>
            <p class="text-gray-400">Payment Date</p>
            <p class="text-white">{{ fmtDate(claim.reimbursement.payment_date) }}</p>
          </div>
          <div>
            <p class="text-gray-400">Reference</p>
            <p class="text-white">{{ claim.reimbursement.reference_id || '-' }}</p>
          </div>
        </div>
      </div>

      <!-- Approver action panel -->
      <div v-if="hasPendingApproval" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-white mb-3">Approval Action</h3>
        <div v-if="!showActionPanel" class="flex gap-3">
          <button class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors" @click="showActionPanel = true">
            Review
          </button>
        </div>
        <div v-else class="space-y-3">
          <textarea
            v-model="actionComment"
            rows="3"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            placeholder="Comments (required for reject / request changes)..."
          />
          <div class="flex gap-3">
            <button
              :disabled="actionLoading"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40"
              @click="handleAction('approve')"
            >
              Approve
            </button>
            <button
              :disabled="actionLoading || !actionComment.trim()"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
              @click="handleAction('reject')"
            >
              Reject
            </button>
            <button
              :disabled="actionLoading || !actionComment.trim()"
              class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-40"
              @click="handleAction('request_changes')"
            >
              Request Changes
            </button>
            <button class="px-4 py-2 text-sm text-gray-400 hover:text-white" @click="showActionPanel = false">Cancel</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
