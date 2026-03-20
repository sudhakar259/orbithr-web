<script setup lang="ts">
defineOptions({ name: 'MyClaims' })

import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import expenseService, { type ExpenseClaim } from '@/services/expenseService'

const loading = ref(true)
const error = ref('')
const claims = ref<ExpenseClaim[]>([])
const statusFilter = ref('')
const pagination = ref({ current_page: 1, last_page: 1, total: 0 })

const statusOptions = ['', 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid']

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

async function fetchClaims(page = 1) {
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, unknown> = { page }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await expenseService.getClaims(params)
    const d = res.data
    claims.value = d.data ?? d
    pagination.value = {
      current_page: d.meta?.current_page ?? d.current_page ?? 1,
      last_page: d.meta?.last_page ?? d.last_page ?? 1,
      total: d.meta?.total ?? d.total ?? 0,
    }
  } catch {
    error.value = 'Failed to load claims.'
  } finally {
    loading.value = false
  }
}

async function handleDelete(id: number) {
  if (!confirm('Delete this draft claim?')) return
  try {
    await expenseService.deleteClaim(id)
    claims.value = claims.value.filter(c => c.id !== id)
  } catch {
    alert('Failed to delete claim.')
  }
}

watch(statusFilter, () => fetchClaims(1))
onMounted(() => fetchClaims())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">My Claims</h1>
      <RouterLink :to="{ name: 'expenses.claims.create' }" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
        New Claim
      </RouterLink>
    </div>

    <!-- Filter -->
    <div class="flex items-center gap-3">
      <label class="text-sm text-gray-400">Status:</label>
      <select v-model="statusFilter" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
        <option v-for="s in statusOptions" :key="s" :value="s">{{ s ? s.replace('_', ' ') : 'All' }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div v-for="i in 5" :key="i" class="h-4 bg-gray-700 rounded mb-4" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

    <!-- Table -->
    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-700/50">
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Title</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Total</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Status</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Submitted At</th>
            <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="claim in claims" :key="claim.id" class="hover:bg-gray-700/30">
            <td class="px-5 py-3 text-white">{{ claim.title }}</td>
            <td class="px-5 py-3 text-gray-300">{{ fmtCurrency(claim.total_amount) }}</td>
            <td class="px-5 py-3">
              <span :class="[statusClass[claim.status] || 'bg-gray-700 text-gray-300', 'text-xs px-2 py-1 rounded-full font-medium']">
                {{ claim.status.replace('_', ' ') }}
              </span>
            </td>
            <td class="px-5 py-3 text-gray-400 text-sm">{{ fmtDate(claim.submitted_at) }}</td>
            <td class="px-5 py-3">
              <div class="flex items-center gap-2">
                <RouterLink :to="{ name: 'expenses.claims.show', params: { id: claim.id } }" class="text-sm text-blue-400 hover:text-blue-300">View</RouterLink>
                <RouterLink v-if="claim.status === 'draft'" :to="{ name: 'expenses.claims.edit', params: { id: claim.id } }" class="text-sm text-yellow-400 hover:text-yellow-300">Edit</RouterLink>
                <button v-if="claim.status === 'draft'" class="text-sm text-red-400 hover:text-red-300" @click="handleDelete(claim.id)">Delete</button>
              </div>
            </td>
          </tr>
          <tr v-if="!claims.length">
            <td colspan="5" class="px-5 py-8 text-center text-gray-500">No claims found</td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="pagination.last_page > 1" class="px-5 py-3 border-t border-gray-700 flex items-center justify-between">
        <p class="text-sm text-gray-400">{{ pagination.total }} total</p>
        <div class="flex gap-2">
          <button
            :disabled="pagination.current_page <= 1"
            class="px-3 py-1 text-sm rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
            @click="fetchClaims(pagination.current_page - 1)"
          >Prev</button>
          <button
            :disabled="pagination.current_page >= pagination.last_page"
            class="px-3 py-1 text-sm rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-40"
            @click="fetchClaims(pagination.current_page + 1)"
          >Next</button>
        </div>
      </div>
    </div>
  </div>
</template>
