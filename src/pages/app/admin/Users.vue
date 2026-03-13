<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { employeeApi } from '@/services/api'
import DataTable from '@/components/table/DataTable.vue'
import PaginationBar from '@/components/table/PaginationBar.vue'
import SearchInput from '@/components/table/SearchInput.vue'
import MoreBtn from '@/components/MoreBtn.vue'

interface EmpItem {
  id: number
  name: string
  email: string
  role?: string
  department?: string
  status?: string
  created_at?: string
}

const loading = ref(false)
const items = ref<EmpItem[]>([])

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
  return items.value.filter(it => [it.name, it.email, it.role, it.department, it.status].some(v => String(v || '').toLowerCase().includes(q)))
})

function menuFor(row: EmpItem) {
  return [
    { title: 'View', value: 'view' },
    { title: 'Edit', value: 'edit' },
    { title: 'Delete', value: 'delete' },
  ]
}

async function load() {
  loading.value = true
  try {
    const { data } = await employeeApi.getAll({ page: page.value, per_page: perPage.value, search: searchQuery.value || undefined })
    const normalize = (r: any): EmpItem => ({
      id: r.id,
      name: r.full_name ?? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
      email: r.email,
      role: r.role ?? r.designation ?? '',
      department: r.department ?? r.team ?? '',
      status: r.status ?? '',
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
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created At' },
  { key: 'actions', label: '', width: '80px', align: 'center' },
] as const satisfies { key: string; label: string; width?: string; align?: 'left'|'right'|'center'; headerClass?: string; cellClass?: string }[]
</script>

<template>
  <section class="space-y-6 p-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Employees</h1>
        <p class="mt-1 text-slate-600">Company users directory.</p>
      </div>
      <div class="flex items-center gap-3">
        <SearchInput v-model="searchQuery" placeholder="Search Employees" class="w-64" @update:modelValue="onSearchChange" />
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredItems"
      row-key="id"
      :loading="loading"
      empty-text="No employees found."
    >
      <template #cell-created_at="{ row }">{{ row.created_at ? new Date(row.created_at).toLocaleString() : '-' }}</template>
      <template #cell-status="{ row }">
        <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', (row.status||'').toLowerCase() === 'active' && 'bg-emerald-50 text-emerald-700', (row.status||'').toLowerCase() !== 'active' && 'bg-slate-100 text-slate-700']">{{ row.status || '-' }}</span>
      </template>
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
