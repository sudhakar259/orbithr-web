<script setup lang="ts">
defineOptions({ name: 'AdminModules' })
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
  return items.value.filter(it => [it.name, it.code, it.status].some(v => String(v || '').toLowerCase().includes(q)))
})

function menuFor() {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  <section class="mod-page">
    <div class="mod-header">
      <div>
        <h1 class="mod-title">Modules</h1>
        <p class="mod-sub">Manage platform modules and their activation status.</p>
      </div>
      <SearchInput v-model="searchQuery" placeholder="Search modules…" class="mod-search" @update:modelValue="onSearchChange" />
    </div>

    <div class="mod-card">
      <div v-if="loading" class="mod-loading">Loading…</div>
      <table v-else class="mod-table">
        <thead>
          <tr>
            <th class="mod-th">Name</th>
            <th class="mod-th">Code / Slug</th>
            <th class="mod-th">Status</th>
            <th class="mod-th">Created</th>
            <th class="mod-th mod-th-right"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredItems" :key="row.id" class="mod-row">
            <td class="mod-td mod-td-name">{{ row.name }}</td>
            <td class="mod-td mod-td-code">{{ row.code }}</td>
            <td class="mod-td">
              <span :class="['mod-badge', row.status === 'active' ? 'mod-badge-green' : 'mod-badge-muted']">
                {{ row.status || '—' }}
              </span>
            </td>
            <td class="mod-td mod-td-date">{{ new Date(row.created_at).toLocaleDateString() }}</td>
            <td class="mod-td mod-td-right">
              <MoreBtn :menu-list="menuFor()" />
            </td>
          </tr>
          <tr v-if="filteredItems.length === 0">
            <td colspan="5" class="mod-empty">No modules found.</td>
          </tr>
        </tbody>
      </table>
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
.mod-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.mod-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.mod-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.mod-sub { margin: 4px 0 0; font-size: 13px; color: #7A8299; }
.mod-search { width: 260px; }

.mod-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.mod-loading { padding: 32px; text-align: center; font-size: 13px; color: #7A8299; }
.mod-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mod-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.mod-th-right { text-align: right; width: 48px; }
.mod-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.mod-row:last-child { border-bottom: none; }
.mod-row:hover { background: rgba(255,255,255,0.02); }
.mod-td { padding: 13px 16px; color: #B6BED0; vertical-align: middle; }
.mod-td-name { color: #EEF0F4; font-weight: 500; }
.mod-td-code { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #8A7BFF; }
.mod-td-date { font-size: 12px; color: #7A8299; }
.mod-td-right { text-align: right; }
.mod-empty { padding: 32px; text-align: center; color: #7A8299; }

.mod-badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.mod-badge-green { background: rgba(77,211,154,0.12); color: #4DD39A; }
.mod-badge-muted { background: rgba(122,130,153,0.12); color: #7A8299; }
</style>
