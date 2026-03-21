<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface Tenant {
  id: number | string
  name: string
  email: string
  plan?: string
  status?: string
  employee_count?: number
  created_at?: string
  domain?: string
}

const loading  = ref(false)
const tenants  = ref<Tenant[]>([])
const search   = ref('')
const statusF  = ref('')
const page     = ref(1)
const perPage  = ref(25)
const total    = ref(0)
const lastPage = ref(1)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/super/tenants', { params: { page: page.value, per_page: perPage.value } })
    tenants.value  = Array.isArray(data) ? data : (data.data ?? [])
    total.value    = data.total ?? tenants.value.length
    lastPage.value = data.last_page ?? 1
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filtered = computed(() => {
  let list = tenants.value
  if (statusF.value) list = list.filter(t => t.status?.toLowerCase() === statusF.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(t => t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q))
  }
  return list
})

const statusColor = (s?: string) => ({
  active: '#36D399', trial: '#F9A825', suspended: '#FF6B6B', inactive: '#6B7280',
}[s?.toLowerCase() ?? ''] ?? '#9CA3AF')

const planColor = (p?: string) => ({
  starter: '#36D399', growth: '#4F7EFF', enterprise: '#9B6EFF',
}[p?.toLowerCase() ?? ''] ?? '#9CA3AF')

async function toggleStatus(t: Tenant) {
  const newStatus = t.status === 'active' ? 'suspended' : 'active'
  try {
    await api.patch(`/super/tenants/${t.id}`, { status: newStatus })
    t.status = newStatus
  } catch {}
}
</script>

<template>
  <div class="tenants-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="color:#6B7280;flex-shrink:0">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
        </svg>
        <input v-model="search" placeholder="Search tenants…" />
      </div>
      <select v-model="statusF" class="sel">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="trial">Trial</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>

    <!-- Table -->
    <div class="sa-card">
      <div class="sa-card-head">
        <div class="sa-card-title">All Tenants <span class="ct-count">{{ total }}</span></div>
      </div>
      <div v-if="loading" class="sa-empty">Loading tenants…</div>
      <div v-else-if="!filtered.length" class="sa-empty">No tenants found.</div>
      <table v-else class="sa-table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Employees</th>
            <th>Domain</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in filtered" :key="t.id">
            <td>
              <div class="t-cell">
                <div class="t-av" :style="{ background: '#4F7EFF' }">{{ (t.name ?? '?')[0].toUpperCase() }}</div>
                <div>
                  <div class="t-name">{{ t.name }}</div>
                  <div class="t-email">{{ t.email }}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="pill" :style="{ color: planColor(t.plan), background: planColor(t.plan) + '22' }">
                {{ t.plan ?? '—' }}
              </span>
            </td>
            <td>
              <span class="pill" :style="{ color: statusColor(t.status), background: statusColor(t.status) + '22' }">
                {{ t.status ?? '—' }}
              </span>
            </td>
            <td class="dim">{{ t.employee_count ?? '—' }}</td>
            <td class="dim sm mono">{{ t.domain ?? '—' }}</td>
            <td class="dim sm">{{ t.created_at ? new Date(t.created_at).toLocaleDateString() : '—' }}</td>
            <td>
              <div class="row-actions">
                <RouterLink :to="`/super/tenants/${t.id}`" class="act-btn">View</RouterLink>
                <button class="act-btn danger" @click="toggleStatus(t)">
                  {{ t.status === 'active' ? 'Suspend' : 'Activate' }}
                </button>
              </div>
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
.tenants-page { display: flex; flex-direction: column; gap: 16px; }

.toolbar { display: flex; align-items: center; gap: 10px; }
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 8px 12px; flex: 1; max-width: 320px;
  transition: border-color .15s;
}
.search-box:focus-within { border-color: #4F7EFF; }
.search-box input { background: none; border: none; outline: none; color: #E8EAF0; font-size: 13px; font-family: inherit; width: 100%; }
.search-box input::placeholder { color: #6B7280; }

.sel {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; color: #9CA3AF; font-size: 12px; font-family: inherit;
  padding: 8px 12px; cursor: pointer; outline: none;
}

.sa-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
.sa-card-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
.sa-card-title { font-weight: 600; font-size: 15px; color: #E8EAF0; display: flex; align-items: center; gap: 8px; }
.ct-count { background: rgba(79,126,255,.2); color: #4F7EFF; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
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
.dim { color: #9CA3AF; } .sm { font-size: 12px; } .mono { font-family: monospace; }

.t-cell { display: flex; align-items: center; gap: 10px; }
.t-av { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
.t-name { font-weight: 500; }
.t-email { font-size: 11px; color: #6B7280; }

.pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: capitalize; }

.row-actions { display: flex; align-items: center; gap: 6px; }
.act-btn {
  padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  background: rgba(79,126,255,.12); color: #4F7EFF;
  border: 1px solid rgba(79,126,255,.2); cursor: pointer; font-family: inherit;
  text-decoration: none; transition: all .14s;
}
.act-btn:hover { background: rgba(79,126,255,.25); }
.act-btn.danger { background: rgba(255,107,107,.12); color: #FF6B6B; border-color: rgba(255,107,107,.2); }
.act-btn.danger:hover { background: rgba(255,107,107,.25); }

.pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid rgba(255,255,255,.06); }
.pg-info { font-size: 12px; color: #6B7280; }
.pg-nav { display: flex; align-items: center; gap: 8px; }
.pg-btn { width: 28px; height: 28px; border-radius: 6px; font-size: 15px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); color: #9CA3AF; cursor: pointer; transition: all .15s; }
.pg-btn:not(:disabled):hover { background: rgba(79,126,255,.2); color: #4F7EFF; border-color: rgba(79,126,255,.3); }
.pg-btn:disabled { opacity: .3; cursor: not-allowed; }
.pg-pages { font-size: 12px; color: #6B7280; }
.pg-sel { background: #0D0F1A; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; color: #9CA3AF; font-size: 12px; font-family: inherit; padding: 5px 8px; cursor: pointer; outline: none; }
</style>
