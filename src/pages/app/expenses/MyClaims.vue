<script setup lang="ts">
defineOptions({ name: 'MyClaims' })

import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import expenseService, { type ExpenseClaim } from '@/services/expenseService'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'

const { confirm: dialog } = useConfirm()
const toast = useToast()

const loading = ref(true)
const error = ref('')
const claims = ref<ExpenseClaim[]>([])
const statusFilter = ref('')
const pagination = ref({ current_page: 1, last_page: 1, total: 0 })

const statusOptions = ['', 'draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid']

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
  if (!await dialog('Delete', 'Delete this draft claim?')) return
  try {
    await expenseService.deleteClaim(id)
    claims.value = claims.value.filter(c => c.id !== id)
  } catch {
    toast.error('Failed to delete claim.')
  }
}

watch(statusFilter, () => fetchClaims(1))
onMounted(() => fetchClaims())
</script>

<template>
  <div class="claims-page">
    <header class="page-head">
      <div>
        <span class="eyebrow">My expenses · claims</span>
        <h1 class="page-title">My claims</h1>
        <p class="page-sub">Drafts, submissions and reimbursement status.</p>
      </div>
      <RouterLink :to="{ name: 'expenses.claims.create' }" class="btn btn--primary">
        + New claim
      </RouterLink>
    </header>

    <div class="filter-bar">
      <span class="filter-bar__label">Status</span>
      <select v-model="statusFilter" class="select">
        <option v-for="s in statusOptions" :key="s" :value="s">{{ s ? s.replace('_', ' ') : 'All' }}</option>
      </select>
    </div>

    <div v-if="loading" class="card skeleton-card">
      <div v-for="i in 5" :key="i" class="skeleton-row" />
    </div>

    <div v-else-if="error" class="alert alert--err">{{ error }}</div>

    <section v-else class="card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th class="num">Total</th>
              <th>Status</th>
              <th>Submitted</th>
              <th class="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="claim in claims" :key="claim.id">
              <td>
                <span class="row-title">{{ claim.title }}</span>
              </td>
              <td class="num mono">{{ fmtCurrency(claim.total_amount) }}</td>
              <td>
                <span :class="statusClass[claim.status] || 'badge badge--muted'">
                  {{ claim.status.replace('_', ' ') }}
                </span>
              </td>
              <td class="muted">{{ fmtDate(claim.submitted_at) }}</td>
              <td>
                <div class="actions">
                  <RouterLink :to="{ name: 'expenses.claims.show', params: { id: claim.id } }" class="action-link">View</RouterLink>
                  <RouterLink v-if="claim.status === 'draft'" :to="{ name: 'expenses.claims.edit', params: { id: claim.id } }" class="action-link action-link--warn">Edit</RouterLink>
                  <button v-if="claim.status === 'draft'" class="action-link action-link--err" @click="handleDelete(claim.id)">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="!claims.length">
              <td colspan="5" class="empty">No claims found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination.last_page > 1" class="pagination">
        <span class="pagination__info">{{ pagination.total }} total</span>
        <div class="pagination__nav">
          <button
            :disabled="pagination.current_page <= 1"
            class="btn btn--ghost btn--sm"
            @click="fetchClaims(pagination.current_page - 1)"
          >Prev</button>
          <span class="pagination__page mono">{{ pagination.current_page }} / {{ pagination.last_page }}</span>
          <button
            :disabled="pagination.current_page >= pagination.last_page"
            class="btn btn--ghost btn--sm"
            @click="fetchClaims(pagination.current_page + 1)"
          >Next</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.claims-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
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
  margin: 4px 0 2px;
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

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn--primary {
  background: #6B5BFF;
  color: #fff;
}
.btn--primary:hover { background: #7C6CFF; }

.btn--ghost {
  background: transparent;
  color: #C9CDD9;
  border-color: #232936;
}
.btn--ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.03);
  color: #EEF0F4;
}

.btn--sm { padding: 6px 12px; font-size: 12px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-bar__label {
  font-size: 11.5px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.select {
  padding: 7px 10px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 8px;
  color: #EEF0F4;
  font-size: 12.5px;
  outline: none;
  text-transform: capitalize;
}

.select:focus { border-color: #6B5BFF; }

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

.skeleton-card { padding: 18px; }
.skeleton-row {
  height: 14px;
  margin-bottom: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #1B1F2A 0%, #232936 50%, #1B1F2A 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.table-wrap { overflow-x: auto; }

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
.data-table thead th.actions-col { width: 180px; }

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

.row-title {
  color: #EEF0F4;
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #6B5BFF;
  text-decoration: none;
  padding: 0;
}

.action-link:hover { color: #8A7BFF; }
.action-link--warn { color: #F5A623; }
.action-link--warn:hover { color: #FFB94D; }
.action-link--err { color: #F38288; }
.action-link--err:hover { color: #FF9DA3; }

.empty {
  padding: 36px 0 !important;
  text-align: center;
  color: #7A8299;
  font-size: 12.5px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid #232936;
}

.pagination__info {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: #7A8299;
}

.pagination__nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination__page { color: #C9CDD9; font-size: 12px; }

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
