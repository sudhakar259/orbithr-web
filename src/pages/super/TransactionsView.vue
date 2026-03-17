<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface Transaction {
  id: string | number
  tenant_id?: string
  type?: string
  module_slug?: string
  transaction_id?: string
  amount: number
  status: string
  plan?: { name: string }
  created_at?: string
}

const loading  = ref(false)
const items    = ref<Transaction[]>([])
const statusF  = ref('')
const search   = ref('')
const page     = ref(1)
const perPage  = ref(25)
const lastPage = ref(1)
const total    = ref(0)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/transactions', {
      params: {
        page: page.value,
        per_page: perPage.value,
        status: statusF.value || undefined,
        search: search.value || undefined,
      },
    })
    items.value    = Array.isArray(data) ? data : (data.data ?? [])
    total.value    = data.total ?? items.value.length
    lastPage.value = data.last_page ?? 1
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filtered = computed(() => items.value)

const totalPaid    = computed(() => items.value.filter(i => i.status === 'paid' || i.status === 'success').reduce((a, i) => a + Number(i.amount ?? 0), 0))
const pendingCount = computed(() => items.value.filter(i => i.status === 'pending').length)
const failedCount  = computed(() => items.value.filter(i => i.status === 'failed').length)

const statusColor = (s: string) => ({
  paid: '#36D399', success: '#36D399', pending: '#F9A825', failed: '#FF6B6B', refunded: '#9B6EFF',
}[s?.toLowerCase()] ?? '#9CA3AF')

function fmtDate(s?: string) {
  return s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}
</script>

<template>
  <div class="txn-page">
    <!-- KPI cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val" style="color:#36D399">₹{{ totalPaid.toLocaleString() }}</div>
        <div class="kpi-label">Total Collected</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#4F7EFF">{{ total }}</div>
        <div class="kpi-label">Total Transactions</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#F9A825">{{ pendingCount }}</div>
        <div class="kpi-label">Pending</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#FF6B6B">{{ failedCount }}</div>
        <div class="kpi-label">Failed</div>
      </div>
    </div>

    <!-- Table card -->
    <div class="sa-card">
      <div class="sa-card-head">
        <div class="sa-card-title">All Transactions</div>
        <div class="head-right">
          <div class="search-box">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" style="color:#6B7280;flex-shrink:0">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
            </svg>
            <input v-model="search" placeholder="Search…" @input="page = 1; load()" />
          </div>
          <select v-model="statusF" class="sel" @change="page = 1; load()">
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="sa-empty">Loading transactions…</div>
      <div v-else-if="!filtered.length" class="sa-empty">No transactions found.</div>
      <table v-else class="sa-table">
        <thead>
          <tr>
            <th>ID</th><th>Tenant</th><th>Module</th><th>Plan</th><th>Amount</th><th>Date</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="txn in filtered" :key="txn.id">
            <td class="mono dim">{{ txn.transaction_id ?? txn.id }}</td>
            <td class="dim sm mono">{{ txn.tenant_id ?? '—' }}</td>
            <td class="dim">{{ txn.module_slug ?? '—' }}</td>
            <td class="dim">{{ txn.plan?.name ?? '—' }}</td>
            <td class="mono">₹{{ Number(txn.amount ?? 0).toLocaleString() }}</td>
            <td class="dim sm">{{ fmtDate(txn.created_at) }}</td>
            <td>
              <span class="pill" :style="{ color: statusColor(txn.status), background: statusColor(txn.status) + '22' }">
                {{ txn.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="total >= 10" class="pagination">
        <span class="pg-info">{{ total === 0 ? 0 : (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} of {{ total }}</span>
        <div class="pg-nav">
          <button class="pg-btn" :disabled="page <= 1" @click="page--; load()">‹</button>
          <span class="pg-pages">{{ page }} / {{ lastPage }}</span>
          <button class="pg-btn" :disabled="page >= lastPage" @click="page++; load()">›</button>
        </div>
        <select class="pg-sel" :value="perPage" @change="perPage = +($event.target as HTMLSelectElement).value; page = 1; load()">
          <option :value="10">10 / page</option>
          <option :value="25">25 / page</option>
          <option :value="50">50 / page</option>
          <option :value="100">100 / page</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.txn-page { display: flex; flex-direction: column; gap: 18px; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.kpi-card {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 20px; text-align: center;
}
.kpi-val { font-size: 26px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
.kpi-label { font-size: 12px; color: #6B7280; }

.sa-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
.sa-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06); flex-wrap: wrap; gap: 8px;
}
.sa-card-title { font-weight: 600; font-size: 15px; color: #E8EAF0; }
.head-right { display: flex; align-items: center; gap: 8px; }

.search-box {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 6px 10px;
}
.search-box input {
  background: none; border: none; outline: none;
  color: #E8EAF0; font-size: 12px; font-family: inherit; width: 160px;
}
.search-box input::placeholder { color: #6B7280; }

.sel {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.1); border-radius: 8px;
  color: #9CA3AF; font-size: 12px; font-family: inherit; padding: 6px 10px; cursor: pointer; outline: none;
}

.sa-empty { padding: 28px; text-align: center; color: #6B7280; font-size: 13px; }

.sa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sa-table thead th {
  text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 600;
  letter-spacing: .7px; text-transform: uppercase; color: #6B7280;
  background: rgba(255,255,255,.02); border-bottom: 1px solid rgba(255,255,255,.06);
}
.sa-table tbody tr { border-bottom: 1px solid rgba(255,255,255,.04); transition: background .1s; }
.sa-table tbody tr:last-child { border-bottom: none; }
.sa-table tbody tr:hover { background: rgba(79,126,255,.04); }
.sa-table td { padding: 10px 14px; vertical-align: middle; color: #E8EAF0; }
.dim { color: #9CA3AF; } .sm { font-size: 12px; } .mono { font-family: monospace; font-size: 12px; }

.pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: capitalize; }

.pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid rgba(255,255,255,.06); }
.pg-info { font-size: 12px; color: #6B7280; }
.pg-nav { display: flex; align-items: center; gap: 8px; }
.pg-btn { width: 28px; height: 28px; border-radius: 6px; font-size: 15px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: #9CA3AF; cursor: pointer; transition: all .15s; }
.pg-btn:not(:disabled):hover { background: rgba(79,126,255,.2); color: #4F7EFF; border-color: rgba(79,126,255,.3); }
.pg-btn:disabled { opacity: .3; cursor: not-allowed; }
.pg-pages { font-size: 12px; color: #6B7280; }
.pg-sel { background: #0D0F1A; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; color: #9CA3AF; font-size: 12px; font-family: inherit; padding: 5px 8px; cursor: pointer; outline: none; }
</style>
