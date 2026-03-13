<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import PaginationBar from '@/components/table/PaginationBar.vue'
import SearchInput from '@/components/table/SearchInput.vue'
import MoreBtn from '@/components/MoreBtn.vue'

interface ModuleItem {
  id: number
  name: string
  code: string
  status: string
  created_at: string
}

const loading = ref(false)
const items = ref<ModuleItem[]>([])

// pagination + search
const page = ref(1)
const perPage = ref(10)
const total = ref(0)
const searchQuery = ref('')
let searchTimer: number | undefined
function onSearchChange() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    page.value = 1
  }, 250)
}

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(it => [it.name, it.code, it.status].some(v => String(v || '').toLowerCase().includes(q)))
})

function menuFor(row: ModuleItem) {
  return [
    { title: 'View', value: 'view' },
    { title: 'Edit', value: 'edit' },
    { title: 'Delete', value: 'delete' },
  ]
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('modules', { params: { page: page.value, per_page: perPage.value, search: searchQuery.value || undefined } })
    const normalize = (r: any): ModuleItem => ({
      id: r.id,
      name: r.name ?? r.title ?? r.module_name ?? '',
      code: r.key ?? r.code ?? r.slug ?? '',
      status: r.is_active === 1 ? 'active' : r.is_active === 0 ? 'inactive' : (r.status ?? ''),
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
</script>

<template>
  <section class="space-y-6 p-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Modules</h1>
        <p class="mt-1 text-slate-600">Manage enabled modules.</p>
      </div>
      <div class="flex items-center gap-3">
        <SearchInput v-model="searchQuery" placeholder="Search Modules" class="w-64" @update:modelValue="onSearchChange" />
      </div>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div v-if="loading" class="p-6 text-slate-500">Loading...</div>
      <table v-else class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Code</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Created At</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in filteredItems" :key="row.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-900">{{ row.name }}</td>
            <td class="px-4 py-3 text-slate-600">{{ row.code }}</td>
            <td class="px-4 py-3">
              <span :class="['inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800']">{{ row.status || '-' }}</span>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ new Date(row.created_at).toLocaleString() }}</td>
            <td class="px-4 py-3 text-right">
              <MoreBtn :menu-list="menuFor(row)" />
            </td>
          </tr>
          <tr v-if="filteredItems.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-slate-500">No modules found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar
      :page="page"
      :per-page="perPage"
      :total="total"
      @update:page="(p:number)=>{ page = p; load() }"
      @update:perPage="(pp:number)=>{ perPage = pp; page = 1; load() }"
    />
  </section>
</template>
