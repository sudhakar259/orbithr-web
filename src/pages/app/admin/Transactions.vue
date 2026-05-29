<script setup lang="ts">
defineOptions({ name: 'AdminTransactions' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import DataTable from '@/components/table/DataTable.vue'
import PaginationBar from '@/components/table/PaginationBar.vue'
import SearchInput from '@/components/table/SearchInput.vue'
import MoreBtn from '@/components/MoreBtn.vue'

interface TxnItem {
  id: number
  plan_name: string
  amount: number
  status: string
  customer: string
  created_at: string
}

const loading = ref(false)
const items = ref<TxnItem[]>([])

const page = ref(1)
const perPage = ref(10)
const total = ref(0)
const searchQuery = ref('')
let searchTimer: number | undefined
function onSearchChange() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => { page.value = 1 }, 250)
}

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(it => [it.plan_name, it.status, it.customer, String(it.amount)].some(v => String(v || '').toLowerCase().includes(q)))
})

function menuFor() {
  return [
    { title: 'View', value: 'view' },
    { title: 'Refund', value: 'refund' },
    { title: 'Delete', value: 'delete' },
  ]
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('orders', { params: { page: page.value, per_page: perPage.value, search: searchQuery.value || undefined } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalize = (r: any): TxnItem => ({
      id: r.id,
      plan_name: r.plan?.name ?? r.plan_name ?? r.product_name ?? '',
      amount: Number(r.amount ?? r.total ?? r.price ?? 0),
      status: r.status ?? r.payment_status ?? '',
      customer: r.user?.email ?? r.customer_email ?? r.email ?? r.user?.name ?? '',
      created_at: r.created_at,
    })
    if (Array.isArray(data)) {
      items.value = data.map(normalize)
      total.value = items.value.length
    } else {
      items.value = (data.data || []).map(normalize)
      total.value = data.meta?.total || items.value.length
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)

const columns = [
  { key: 'plan_name', label: 'Plan' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'customer', label: 'Customer' },
  { key: 'created_at', label: 'Date' },
  { key: 'actions', label: '', width: '80px', align: 'center' },
] as const satisfies { key: string; label: string; width?: string; align?: 'left'|'right'|'center'; headerClass?: string; cellClass?: string }[]
</script>

<template>
  <section class="txn-page">
    <div class="txn-header">
      <div>
        <h1 class="txn-title">Transactions</h1>
        <p class="txn-sub">View all platform payment transactions.</p>
      </div>
      <SearchInput v-model="searchQuery" placeholder="Search transactions…" class="txn-search" @update:modelValue="onSearchChange" />
    </div>

    <div class="txn-table-wrap">
      <DataTable
        :columns="columns"
        :rows="filteredItems"
        row-key="id"
        :loading="loading"
        empty-text="No transactions found."
      >
        <template #cell-amount="{ row }">
          <span class="txn-mono">₹ {{ row.amount.toLocaleString() }}</span>
        </template>
        <template #cell-status="{ row }">
          <span :class="['txn-badge', row.status?.toLowerCase() === 'paid' ? 'txn-badge-green' : 'txn-badge-yellow']">
            {{ row.status || '—' }}
          </span>
        </template>
        <template #cell-created_at="{ row }">
          <span class="txn-date">{{ new Date(row.created_at).toLocaleString() }}</span>
        </template>
        <template #cell-actions>
          <MoreBtn :menu-list="menuFor()" />
        </template>
      </DataTable>
    </div>

    <PaginationBar
      :page="page"
      :per-page="perPage"
      :total="total"
      @update:page="(p: number) => { page = p; load() }"
      @update:perPage="(pp: number) => { perPage = pp; page = 1; load() }"
    />
  </section>
</template>

<style scoped>
.txn-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.txn-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.txn-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.txn-sub { margin: 4px 0 0; font-size: 13px; color: #7A8299; }
.txn-search { width: 260px; }
.txn-table-wrap { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.txn-mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #EEF0F4; }
.txn-date { font-size: 12px; color: #7A8299; }
.txn-badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.txn-badge-green { background: rgba(77,211,154,0.12); color: #4DD39A; }
.txn-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
</style>
