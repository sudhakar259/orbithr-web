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
  draft: 'badge badge--muted',
  submitted: 'badge badge--info',
  under_review: 'badge badge--warn',
  approved: 'badge badge--ok',
  rejected: 'badge badge--err',
  paid: 'badge badge--paid',
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
  <div class="exp-dash">
    <header class="exp-dash__head">
      <span class="eyebrow">Expenses · overview</span>
      <h1 class="page-title">Expense dashboard</h1>
      <p class="page-sub">Track claim volume, approvals and reimbursements at a glance.</p>
    </header>

    <div v-if="loading" class="kpi-grid">
      <div v-for="i in 4" :key="i" class="kpi skeleton" />
    </div>

    <div v-else-if="error" class="alert alert--err">{{ error }}</div>

    <template v-else-if="stats">
      <div class="kpi-grid">
        <div class="kpi">
          <span class="eyebrow">Total claims</span>
          <div class="kpi__value">{{ stats.total_claims }}</div>
          <div class="kpi__sub">All-time submissions</div>
        </div>
        <div class="kpi">
          <span class="eyebrow">Pending approval</span>
          <div class="kpi__value kpi__value--warn">{{ stats.pending_approval }}</div>
          <div class="kpi__sub">Awaiting reviewer action</div>
        </div>
        <div class="kpi">
          <span class="eyebrow">Approved this month</span>
          <div class="kpi__value kpi__value--ok">{{ stats.approved_this_month ?? stats.approved ?? 0 }}</div>
          <div class="kpi__sub">Cleared for reimbursement</div>
        </div>
        <div class="kpi">
          <span class="eyebrow">Reimbursed this month</span>
          <div class="kpi__value kpi__value--accent">{{ fmtCurrency(stats.total_reimbursed_this_month ?? stats.reimbursed_this_month ?? 0) }}</div>
          <div class="kpi__sub">Disbursed to employees</div>
        </div>
      </div>

      <section class="card">
        <header class="card__head">
          <div>
            <h2 class="card__title">Recent claims</h2>
            <p class="card__sub">Latest submissions across the team</p>
          </div>
          <RouterLink :to="{ name: 'expenses.my-claims' }" class="link">View all</RouterLink>
        </header>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th class="num">Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="claim in (stats.recent_claims || []).slice(0, 5)"
                :key="claim.id"
              >
                <td>
                  <RouterLink :to="{ name: 'expenses.claims.show', params: { id: claim.id } }" class="row-link">
                    {{ claim.title }}
                  </RouterLink>
                </td>
                <td class="num mono">{{ fmtCurrency(claim.total_amount) }}</td>
                <td>
                  <span :class="statusClass[claim.status] || 'badge badge--muted'">
                    {{ claim.status.replace('_', ' ') }}
                  </span>
                </td>
                <td class="muted">{{ fmtDate(claim.submitted_at || claim.created_at || null) }}</td>
              </tr>
              <tr v-if="!stats.recent_claims?.length">
                <td colspan="4" class="empty">No claims yet</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.exp-dash {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.exp-dash__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}

.page-title {
  margin: 0;
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  font-weight: 400;
}

.page-sub {
  margin: 0;
  font-size: 13px;
  color: #7A8299;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 1024px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .kpi-grid { grid-template-columns: 1fr; }
}

.kpi {
  position: relative;
  padding: 16px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}

.kpi.skeleton {
  height: 96px;
  background: linear-gradient(90deg, #161A23 0%, #1B1F2A 50%, #161A23 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.kpi__value {
  margin-top: 6px;
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  font-variant-numeric: tabular-nums;
}

.kpi__value--warn { color: #F5A623; }
.kpi__value--ok { color: #4DD39A; }
.kpi__value--accent { color: #6B5BFF; }

.kpi__sub {
  margin-top: 2px;
  font-size: 11.5px;
  color: #7A8299;
}

.alert {
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
}

.alert--err {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #F38288;
}

.card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #232936;
}

.card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #EEF0F4;
}

.card__sub {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: #7A8299;
}

.link {
  font-size: 12px;
  color: #6B5BFF;
  text-decoration: none;
}

.link:hover { color: #8A7BFF; }

.table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table thead th {
  padding: 10px 18px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
  text-align: left;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid #232936;
}

.data-table thead th.num { text-align: right; }

.data-table tbody td {
  padding: 12px 18px;
  border-bottom: 1px solid #1F2430;
  color: #C9CDD9;
  vertical-align: middle;
}

.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover td { background: rgba(107, 91, 255, 0.04); }

.data-table td.num { text-align: right; }
.data-table td.muted { color: #7A8299; font-size: 12px; }

.mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }

.row-link {
  color: #EEF0F4;
  text-decoration: none;
  font-weight: 500;
}

.row-link:hover { color: #6B5BFF; }

.empty {
  padding: 32px 0 !important;
  text-align: center;
  color: #7A8299;
  font-size: 12.5px;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: capitalize;
  border: 1px solid transparent;
}

.badge--muted { color: #C9CDD9; background: rgba(255, 255, 255, 0.04); border-color: #2A3142; }
.badge--info { color: #6B5BFF; background: rgba(107, 91, 255, 0.12); border-color: rgba(107, 91, 255, 0.32); }
.badge--warn { color: #F5A623; background: rgba(245, 166, 35, 0.1); border-color: rgba(245, 166, 35, 0.3); }
.badge--ok { color: #4DD39A; background: rgba(77, 211, 154, 0.1); border-color: rgba(77, 211, 154, 0.3); }
.badge--err { color: #F38288; background: rgba(243, 130, 136, 0.1); border-color: rgba(243, 130, 136, 0.3); }
.badge--paid { color: #4DD39A; background: rgba(77, 211, 154, 0.14); border-color: rgba(77, 211, 154, 0.34); }
</style>
