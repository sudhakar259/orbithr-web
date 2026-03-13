<script setup lang="ts">
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

function menuFor(row: TxnItem) {
  return [
    { title: 'View', value: 'view' },
    { title: 'Refund', value: 'refund' },
    { title: 'Delete', value: 'delete' },
  ]
}

async function load() {
  loading.value = true
  try {
    // Try common endpoints; prefer orders
    const { data } = await api.get('orders', { params: { page: page.value, per_page: perPage.value, search: searchQuery.value || undefined } })
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
  { key: 'created_at', label: 'Created At' },
  { key: 'actions', label: '', width: '80px', align: 'center' },
] as const satisfies { key: string; label: string; width?: string; align?: 'left'|'right'|'center'; headerClass?: string; cellClass?: string }[]
</script>

<template>
  <section class="space-y-6 p-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Transactions</h1>
        <p class="mt-1 text-slate-600">View platform transactions.</p>
      </div>
      <div class="flex items-center gap-3">
        <SearchInput v-model="searchQuery" placeholder="Search Transactions" class="w-64" @update:modelValue="onSearchChange" />
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredItems"
      row-key="id"
      :loading="loading"
      empty-text="No transactions found."
    >
      <template #cell-amount="{ row }">₹ {{ row.amount.toLocaleString() }}</template>
      <template #cell-status="{ row }">
        <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', row.status?.toLowerCase() === 'paid' && 'bg-green-50 text-green-700', row.status?.toLowerCase() !== 'paid' && 'bg-amber-50 text-amber-700']">{{ row.status || '-' }}</span>
      </template>
      <template #cell-created_at="{ row }">{{ new Date(row.created_at).toLocaleString() }}</template>
      <template #cell-actions="{ row }">
        <MoreBtn :menu-list="menuFor(row)" />
      </template>
    </DataTable>

    <PaginationBar
      :page="page"
      :per-page="perPage"
      :total="total"
      @update:page="(p:number)=>{ page = p; load() }"
      @update:perPage="(pp:number)=>{ perPage = pp; page = 1; load() }"
    />
  </section>
</template>
