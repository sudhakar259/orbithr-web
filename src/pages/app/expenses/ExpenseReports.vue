<script setup lang="ts">
defineOptions({ name: 'ExpenseReports' })

import { ref, computed, onMounted } from 'vue'
import expenseService, { type ExpenseClaim, type ExpenseCategory } from '@/services/expenseService'

const loading = ref(true)
const error = ref('')

// Stats data
const totalClaims = ref(0)
const pendingCount = ref(0)
const approvedCount = ref(0)
const rejectedCount = ref(0)
const paidCount = ref(0)
const draftCount = ref(0)

// Monthly data (last 6 months)
interface MonthData {
  label: string
  amount: number
}
const monthlyData = ref<MonthData[]>([])

// Category data
interface CatBreakdown {
  name: string
  color: string
  total: number
  count: number
}
const categoryData = ref<CatBreakdown[]>([])

const maxMonthly = computed(() => Math.max(...monthlyData.value.map(m => m.amount), 1))

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [statsRes, claimsRes, catsRes] = await Promise.all([
      expenseService.getStats(),
      expenseService.getClaims({ per_page: 200 }),
      expenseService.getCategories(),
    ])

    const s = statsRes.data?.data ?? statsRes.data
    totalClaims.value = s?.total_claims ?? 0

    const allClaims: ExpenseClaim[] = claimsRes.data?.data ?? claimsRes.data ?? []
    const cats: ExpenseCategory[] = catsRes.data?.data ?? catsRes.data ?? []

    // Status counts
    draftCount.value = allClaims.filter(c => c.status === 'draft').length
    pendingCount.value = allClaims.filter(c => c.status === 'submitted' || c.status === 'under_review').length
    approvedCount.value = allClaims.filter(c => c.status === 'approved').length
    rejectedCount.value = allClaims.filter(c => c.status === 'rejected').length
    paidCount.value = allClaims.filter(c => c.status === 'paid').length

    // Monthly spend (last 6 months)
    const months: MonthData[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
      const y = d.getFullYear()
      const m = d.getMonth()
      const total = allClaims
        .filter(c => {
          if (c.status === 'draft' || c.status === 'rejected') return false
          const cd = new Date(c.created_at ?? '')
          return cd.getFullYear() === y && cd.getMonth() === m
        })
        .reduce((s, c) => s + (c.total_amount || 0), 0)
      months.push({ label, amount: total })
    }
    monthlyData.value = months

    // Category breakdown
    const catMap: Record<number, CatBreakdown> = {}
    for (const cat of cats) {
      catMap[cat.id] = { name: cat.name, color: cat.color ?? '#4F7EFF', total: 0, count: 0 }
    }
    for (const claim of allClaims) {
      if (claim.items) {
        for (const item of claim.items) {
          if (item.category_id && catMap[item.category_id]) {
            catMap[item.category_id].total += item.amount || 0
            catMap[item.category_id].count += 1
          }
        }
      }
    }
    categoryData.value = Object.values(catMap).filter(c => c.count > 0).sort((a, b) => b.total - a.total)
  } catch {
    error.value = 'Failed to load report data.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-bold text-white">Expense Reports</h1>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div v-for="i in 4" :key="i" class="h-4 bg-gray-700 rounded mb-4" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

    <template v-else>
      <!-- Status distribution -->
      <div>
        <h2 class="text-lg font-semibold text-white mb-4">Status Distribution</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p class="text-3xl font-bold text-gray-300">{{ draftCount }}</p>
            <p class="text-sm text-gray-400 mt-1">Draft</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p class="text-3xl font-bold text-yellow-400">{{ pendingCount }}</p>
            <p class="text-sm text-gray-400 mt-1">Pending</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p class="text-3xl font-bold text-green-400">{{ approvedCount }}</p>
            <p class="text-sm text-gray-400 mt-1">Approved</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p class="text-3xl font-bold text-red-400">{{ rejectedCount }}</p>
            <p class="text-sm text-gray-400 mt-1">Rejected</p>
          </div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <p class="text-3xl font-bold text-teal-400">{{ paidCount }}</p>
            <p class="text-sm text-gray-400 mt-1">Paid</p>
          </div>
        </div>
      </div>

      <!-- Monthly spend chart (CSS bars) -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Monthly Spend (Last 6 Months)</h2>
        <div class="flex items-end gap-4 h-48">
          <div
            v-for="m in monthlyData"
            :key="m.label"
            class="flex-1 flex flex-col items-center justify-end"
          >
            <span class="text-xs text-gray-400 mb-1">{{ fmtCurrency(m.amount) }}</span>
            <div
              class="w-full bg-blue-600 rounded-t-md transition-all duration-300"
              :style="{ height: m.amount > 0 ? Math.max((m.amount / maxMonthly) * 160, 4) + 'px' : '4px' }"
            />
            <span class="text-xs text-gray-400 mt-2">{{ m.label }}</span>
          </div>
        </div>
      </div>

      <!-- Category breakdown -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-700">
          <h2 class="text-lg font-semibold text-white">Category Breakdown</h2>
        </div>
        <table class="w-full">
          <thead>
            <tr class="bg-gray-700/50">
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Category</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Items</th>
              <th class="text-right px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="cat in categoryData" :key="cat.name" class="hover:bg-gray-700/30">
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full inline-block" :style="{ backgroundColor: cat.color }" />
                  <span class="text-white text-sm">{{ cat.name }}</span>
                </div>
              </td>
              <td class="px-5 py-3 text-gray-300 text-sm">{{ cat.count }}</td>
              <td class="px-5 py-3 text-white text-sm text-right">{{ fmtCurrency(cat.total) }}</td>
            </tr>
            <tr v-if="!categoryData.length">
              <td colspan="3" class="px-5 py-8 text-center text-gray-500">No data available</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
