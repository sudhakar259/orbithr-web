<script setup lang="ts">
defineOptions({ name: 'ExpenseReports' })

import { ref, computed, onMounted } from 'vue'
import expenseService, { type ExpenseClaim, type ExpenseCategory } from '@/services/expenseService'

const loading = ref(true)
const error = ref('')

const totalClaims = ref(0)
const pendingCount = ref(0)
const approvedCount = ref(0)
const rejectedCount = ref(0)
const paidCount = ref(0)
const draftCount = ref(0)

interface MonthData {
  label: string
  amount: number
}
const monthlyData = ref<MonthData[]>([])

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

    draftCount.value = allClaims.filter(c => c.status === 'draft').length
    pendingCount.value = allClaims.filter(c => c.status === 'submitted' || c.status === 'under_review').length
    approvedCount.value = allClaims.filter(c => c.status === 'approved').length
    rejectedCount.value = allClaims.filter(c => c.status === 'rejected').length
    paidCount.value = allClaims.filter(c => c.status === 'paid').length

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
  <div class="er-page">
    <h1 class="er-title">Expense Reports</h1>

    <div v-if="loading" class="er-card er-loading">
      <div v-for="i in 4" :key="i" class="er-skeleton"></div>
    </div>

    <div v-else-if="error" class="er-error">{{ error }}</div>

    <template v-else>
      <!-- Status distribution -->
      <div>
        <div class="er-section-label">Status Distribution</div>
        <div class="er-stats-grid">
          <div class="er-stat-card">
            <div class="er-stat-value">{{ draftCount }}</div>
            <div class="er-stat-label">Draft</div>
          </div>
          <div class="er-stat-card">
            <div class="er-stat-value er-yellow">{{ pendingCount }}</div>
            <div class="er-stat-label">Pending</div>
          </div>
          <div class="er-stat-card">
            <div class="er-stat-value er-green">{{ approvedCount }}</div>
            <div class="er-stat-label">Approved</div>
          </div>
          <div class="er-stat-card">
            <div class="er-stat-value er-red">{{ rejectedCount }}</div>
            <div class="er-stat-label">Rejected</div>
          </div>
          <div class="er-stat-card">
            <div class="er-stat-value er-teal">{{ paidCount }}</div>
            <div class="er-stat-label">Paid</div>
          </div>
        </div>
      </div>

      <!-- Monthly spend bar chart -->
      <div class="er-card er-chart-card">
        <div class="er-chart-title">Monthly Spend (Last 6 Months)</div>
        <div class="er-chart-bars">
          <div v-for="m in monthlyData" :key="m.label" class="er-bar-col">
            <span class="er-bar-amount">{{ fmtCurrency(m.amount) }}</span>
            <div
              class="er-bar"
              :style="{ height: m.amount > 0 ? Math.max((m.amount / maxMonthly) * 160, 4) + 'px' : '4px' }"
            />
            <span class="er-bar-label">{{ m.label }}</span>
          </div>
        </div>
      </div>

      <!-- Category breakdown -->
      <div class="er-section-card">
        <div class="er-section-head">Category Breakdown</div>
        <table class="er-table">
          <thead>
            <tr>
              <th class="er-th">Category</th>
              <th class="er-th">Items</th>
              <th class="er-th er-th-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categoryData" :key="cat.name" class="er-row">
              <td class="er-td">
                <div class="er-cat-cell">
                  <span class="er-cat-dot" :style="{ backgroundColor: cat.color }" />
                  <span class="er-td-name">{{ cat.name }}</span>
                </div>
              </td>
              <td class="er-td">{{ cat.count }}</td>
              <td class="er-td er-td-right er-mono er-bold">{{ fmtCurrency(cat.total) }}</td>
            </tr>
            <tr v-if="!categoryData.length">
              <td colspan="3" class="er-td-empty">No data available</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.er-page { display: flex; flex-direction: column; gap: 20px; }
.er-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0; }
.er-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.er-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; }
.er-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.er-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: er-pulse 1.2s ease-in-out infinite; }
@keyframes er-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.er-section-label { font-size: 13px; font-weight: 600; color: #EEF0F4; margin-bottom: 12px; }
.er-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.er-stat-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; text-align: center; }
.er-stat-value { font-family: 'Instrument Serif', serif; font-size: 28px; color: #EEF0F4; letter-spacing: -0.02em; }
.er-stat-label { font-size: 11px; color: #7A8299; margin-top: 4px; }
.er-green { color: #4DD39A; }
.er-red { color: #F38288; }
.er-yellow { color: #F5A623; }
.er-teal { color: #4DD39A; }
.er-chart-card { padding: 20px; }
.er-chart-title { font-size: 13px; font-weight: 600; color: #EEF0F4; margin-bottom: 16px; }
.er-chart-bars { display: flex; align-items: flex-end; gap: 12px; height: 200px; }
.er-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
.er-bar-amount { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #7A8299; text-align: center; }
.er-bar { width: 100%; background: #6B5BFF; border-radius: 4px 4px 0 0; transition: height 0.3s; min-height: 4px; }
.er-bar-label { font-size: 11px; color: #7A8299; }
.er-section-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.er-section-head { padding: 14px 16px; border-bottom: 1px solid #232936; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.er-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.er-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.er-th-right { text-align: right; }
.er-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.er-row:last-child { border-bottom: none; }
.er-row:hover { background: rgba(255,255,255,0.02); }
.er-td { padding: 11px 16px; color: #B6BED0; vertical-align: middle; }
.er-td-name { color: #EEF0F4; font-weight: 500; }
.er-td-right { text-align: right; }
.er-td-empty { padding: 32px 16px; text-align: center; color: #7A8299; font-size: 13px; }
.er-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.er-bold { font-weight: 600; }
.er-cat-cell { display: flex; align-items: center; gap: 8px; }
.er-cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
</style>
