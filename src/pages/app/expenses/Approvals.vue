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

// Comment modal
const commentModal = ref(false)
const commentAction = ref<'approve' | 'reject' | 'request_changes'>('approve')
const commentTarget = ref<number | null>(null)
const commentText = ref('')
const actionLoading = ref(false)

const statusClass: Record<string, string> = {
  pending: 'bg-yellow-900/50 text-yellow-400',
  approved: 'bg-green-900/50 text-green-400',
  rejected: 'bg-red-900/50 text-red-400',
  changes_requested: 'bg-yellow-900/50 text-yellow-400',
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
  if (commentAction.value === 'approve') return 'bg-green-600 hover:bg-green-700'
  if (commentAction.value === 'reject') return 'bg-red-600 hover:bg-red-700'
  return 'bg-yellow-600 hover:bg-yellow-700'
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
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-white">Approvals</h1>

    <!-- Sub-tabs -->
    <div class="flex gap-4 border-b border-gray-700">
      <button
        :class="[activeTab === 'pending' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200', 'pb-3 px-1 border-b-2 font-medium text-sm transition-colors']"
        @click="activeTab = 'pending'"
      >
        Pending ({{ pending.length }})
      </button>
      <button
        :class="[activeTab === 'history' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200', 'pb-3 px-1 border-b-2 font-medium text-sm transition-colors']"
        @click="activeTab = 'history'"
      >
        History
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div v-for="i in 4" :key="i" class="h-4 bg-gray-700 rounded mb-4" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

    <template v-else>
      <!-- Pending tab -->
      <div v-if="activeTab === 'pending'" class="space-y-4">
        <div v-if="!pending.length" class="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center text-gray-500">
          No pending approvals
        </div>
        <div v-for="approval in pending" :key="approval.id" class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <RouterLink
                v-if="approval.claim"
                :to="{ name: 'expenses.claims.show', params: { id: approval.expense_claim_id } }"
                class="text-white font-medium hover:text-blue-400"
              >
                {{ approval.claim.title }}
              </RouterLink>
              <p class="text-gray-400 text-sm mt-1">
                <span v-if="approval.claim?.employee_name">{{ approval.claim.employee_name }} &middot; </span>
                {{ approval.level_label || 'Level ' + approval.level }}
              </p>
              <p v-if="approval.claim" class="text-lg font-semibold text-white mt-1">
                {{ fmtCurrency(approval.claim.total_amount) }}
              </p>
              <p class="text-gray-500 text-xs mt-1">Submitted {{ fmtDate(approval.claim?.submitted_at ?? null) }}</p>
            </div>
            <div class="flex gap-2">
              <button class="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors" @click="openActionModal(approval.id, 'approve')">
                Approve
              </button>
              <button class="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors" @click="openActionModal(approval.id, 'reject')">
                Reject
              </button>
              <button class="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors" @click="openActionModal(approval.id, 'request_changes')">
                Request Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- History tab -->
      <div v-if="activeTab === 'history'" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-700/50">
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Claim</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Level</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Status</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Comments</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="a in history" :key="a.id" class="hover:bg-gray-700/30">
              <td class="px-5 py-3">
                <RouterLink v-if="a.claim" :to="{ name: 'expenses.claims.show', params: { id: a.expense_claim_id } }" class="text-white hover:text-blue-400 text-sm">
                  {{ a.claim.title }}
                </RouterLink>
                <span v-else class="text-gray-400 text-sm">#{{ a.expense_claim_id }}</span>
              </td>
              <td class="px-5 py-3 text-gray-300 text-sm">{{ a.level_label || 'Level ' + a.level }}</td>
              <td class="px-5 py-3">
                <span :class="[statusClass[a.status] || 'bg-gray-700 text-gray-300', 'text-xs px-2 py-0.5 rounded-full font-medium']">
                  {{ a.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="px-5 py-3 text-gray-400 text-sm max-w-xs truncate">{{ a.comments || '-' }}</td>
              <td class="px-5 py-3 text-gray-400 text-sm">{{ fmtDate(a.acted_at) }}</td>
            </tr>
            <tr v-if="!history.length">
              <td colspan="5" class="px-5 py-8 text-center text-gray-500">No approval history</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Comment modal -->
    <Teleport to="body">
      <div v-if="commentModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="commentModal = false">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md space-y-4">
          <h3 class="text-lg font-semibold text-white">{{ actionLabel }}</h3>
          <textarea
            v-model="commentText"
            rows="3"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            :placeholder="commentAction === 'approve' ? 'Optional comments...' : 'Provide a reason...'"
          />
          <div class="flex justify-end gap-3">
            <button class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors" @click="commentModal = false">
              Cancel
            </button>
            <button
              :disabled="actionLoading || (commentAction !== 'approve' && !commentText.trim())"
              :class="[actionBtnClass, 'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-40']"
              @click="doAction"
            >
              {{ actionLoading ? 'Processing...' : actionLabel }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
