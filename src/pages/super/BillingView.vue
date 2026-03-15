<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface Invoice {
  id: string | number
  tenant_name?: string
  org?: string
  period?: string
  amount: number
  date?: string
  created_at?: string
  status: string
}

const loading  = ref(false)
const invoices = ref<Invoice[]>([])
const statusF  = ref('')

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/super/invoices', { params: { per_page: 100 } })
    invoices.value = Array.isArray(data) ? data : (data.data ?? [])
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filtered = computed(() =>
  invoices.value.filter(i => !statusF.value || i.status === statusF.value),
)

const totalCollected = computed(() =>
  invoices.value.filter(i => i.status === 'paid').reduce((a, i) => a + Number(i.amount ?? 0), 0),
)
const pendingCount  = computed(() => invoices.value.filter(i => i.status === 'pending').length)
const overdueCount  = computed(() => invoices.value.filter(i => i.status === 'overdue').length)

const statusColor = (s: string) => ({
  paid: '#36D399', pending: '#F9A825', overdue: '#FF6B6B',
}[s?.toLowerCase()] ?? '#9CA3AF')

async function markPaid(inv: Invoice) {
  try {
    await api.patch(`/super/invoices/${inv.id}`, { status: 'paid' })
    inv.status = 'paid'
  } catch {}
}
</script>

<template>
  <div class="billing-page">
    <!-- Summary cards -->
    <div class="sum-grid">
      <div class="sum-card">
        <div class="sum-val" style="color:#36D399">₹{{ totalCollected.toLocaleString() }}</div>
        <div class="sum-label">Total Collected</div>
      </div>
      <div class="sum-card">
        <div class="sum-val" style="color:#F9A825">{{ pendingCount }}</div>
        <div class="sum-label">Pending</div>
      </div>
      <div class="sum-card">
        <div class="sum-val" style="color:#FF6B6B">{{ overdueCount }}</div>
        <div class="sum-label">Overdue</div>
      </div>
      <div class="sum-card">
        <div class="sum-val" style="color:#4F7EFF">{{ invoices.length }}</div>
        <div class="sum-label">Total Invoices</div>
      </div>
    </div>

    <!-- Invoices table -->
    <div class="sa-card">
      <div class="sa-card-head">
        <div class="sa-card-title">All Invoices</div>
        <select v-model="statusF" class="sel">
          <option value="">All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
      <div v-if="loading" class="sa-empty">Loading invoices…</div>
      <div v-else-if="!filtered.length" class="sa-empty">No invoices found.</div>
      <table v-else class="sa-table">
        <thead>
          <tr>
            <th>Invoice</th><th>Tenant</th><th>Period</th><th>Amount</th><th>Date</th><th>Status</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in filtered" :key="inv.id">
            <td class="mono dim">{{ inv.id }}</td>
            <td>{{ inv.tenant_name ?? inv.org ?? '—' }}</td>
            <td class="dim">{{ inv.period ?? '—' }}</td>
            <td class="mono">₹{{ Number(inv.amount ?? 0).toLocaleString() }}</td>
            <td class="dim sm">{{ inv.date ?? (inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—') }}</td>
            <td>
              <span class="pill" :style="{ color: statusColor(inv.status), background: statusColor(inv.status) + '22' }">
                {{ inv.status }}
              </span>
            </td>
            <td>
              <button v-if="inv.status !== 'paid'" class="pay-btn" @click="markPaid(inv)">✓ Mark Paid</button>
              <span v-else class="dim sm">Paid</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.billing-page { display: flex; flex-direction: column; gap: 18px; }

.sum-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sum-card {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 20px; text-align: center;
}
.sum-val { font-size: 26px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
.sum-label { font-size: 12px; color: #6B7280; }

.sa-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
.sa-card-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
.sa-card-title { font-weight: 600; font-size: 15px; color: #E8EAF0; }
.sa-empty { padding: 28px; text-align: center; color: #6B7280; font-size: 13px; }

.sel {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.1); border-radius: 8px;
  color: #9CA3AF; font-size: 12px; font-family: inherit; padding: 6px 10px; cursor: pointer; outline: none;
}

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

.pay-btn {
  background: rgba(54,211,153,.12); color: #36D399;
  border: 1px solid rgba(54,211,153,.2); border-radius: 5px;
  padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: inherit; font-weight: 600; transition: all .14s;
}
.pay-btn:hover { background: rgba(54,211,153,.2); }
</style>
