<script setup lang="ts">
defineOptions({ name: 'ExpenseDashboard' })

import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import expenseService, { type ExpenseStats, type ExpenseClaim } from '@/services/expenseService'

interface DashboardStats extends ExpenseStats {
  approved_this_month?: number
  total_reimbursed_this_month?: number
  recent_claims?: ExpenseClaim[]
}

const loading = ref(true)
const error = ref('')
const stats = ref<DashboardStats | null>(null)

const statusClass: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  submitted: 'bg-blue-900/50 text-blue-400',
  under_review: 'bg-yellow-900/50 text-yellow-400',
  approved: 'bg-green-900/50 text-green-400',
  rejected: 'bg-red-900/50 text-red-400',
  paid: 'bg-teal-900/50 text-teal-400',
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function fmtDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(async () => {
  try {
    const res = await expenseService.getStats()
    stats.value = res.data?.data ?? res.data
  } catch {
    error.value = 'Failed to load expense statistics.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-white">Expense Dashboard</h1>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse">
        <div class="h-3 w-24 bg-gray-700 rounded mb-3" />
        <div class="h-7 w-16 bg-gray-700 rounded" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

    <template v-else-if="stats">
      <!-- Stat cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-sm">Total Claims</p>
          <p class="text-2xl font-bold text-white mt-1">{{ stats.total_claims }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-sm">Pending Approval</p>
          <p class="text-2xl font-bold text-yellow-400 mt-1">{{ stats.pending_approval }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-sm">Approved This Month</p>
          <p class="text-2xl font-bold text-green-400 mt-1">{{ stats.approved_this_month ?? stats.approved ?? 0 }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-sm">Total Reimbursed This Month</p>
          <p class="text-2xl font-bold text-teal-400 mt-1">{{ fmtCurrency(stats.total_reimbursed_this_month ?? stats.reimbursed_this_month ?? 0) }}</p>
        </div>
      </div>

      <!-- Recent claims table -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Recent Claims</h2>
          <RouterLink :to="{ name: 'expenses.my-claims' }" class="text-sm text-blue-400 hover:text-blue-300">
            View all
          </RouterLink>
        </div>
        <table class="w-full">
          <thead>
            <tr class="bg-gray-700/50">
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Title</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Amount</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Status</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr
              v-for="claim in (stats.recent_claims || []).slice(0, 5)"
              :key="claim.id"
              class="hover:bg-gray-700/30"
            >
              <td class="px-5 py-3">
                <RouterLink :to="{ name: 'expenses.claims.show', params: { id: claim.id } }" class="text-white hover:text-blue-400">
                  {{ claim.title }}
                </RouterLink>
              </td>
              <td class="px-5 py-3 text-gray-300">{{ fmtCurrency(claim.total_amount) }}</td>
              <td class="px-5 py-3">
                <span :class="[statusClass[claim.status] || 'bg-gray-700 text-gray-300', 'text-xs px-2 py-1 rounded-full font-medium']">
                  {{ claim.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="px-5 py-3 text-gray-400 text-sm">{{ fmtDate(claim.submitted_at || claim.created_at || null) }}</td>
            </tr>
            <tr v-if="!stats.recent_claims?.length">
              <td colspan="4" class="px-5 py-8 text-center text-gray-500">No claims yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
