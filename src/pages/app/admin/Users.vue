<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { employeeApi } from '@/services/api'

interface EmpItem {
  id: number
  name: string
  email: string
  role?: string
  department?: string
  status?: string
  created_at?: string
}

const loading    = ref(false)
const items      = ref<EmpItem[]>([])
const page       = ref(1)
const perPage    = ref(10)
const total      = ref(0)
const searchQuery = ref('')
let   searchTimer: number | undefined

const lastPage = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(it =>
    [it.name, it.email, it.role, it.department, it.status]
      .some(v => String(v || '').toLowerCase().includes(q))
  )
})

function onSearch() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => { page.value = 1; load() }, 250)
}

async function load() {
  loading.value = true
  try {
    const { data } = await employeeApi.getAll({
      page: page.value,
      per_page: perPage.value,
      search: searchQuery.value || undefined,
    })
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

function fmtDate(s?: string) {
  return s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'
}

onMounted(load)
</script>

<template>
  <div class="ul-page">
    <!-- Header -->
    <div class="ul-header">
      <div>
        <h1 class="ul-title">Users</h1>
        <p class="ul-sub">All registered users across the platform.</p>
      </div>
      <div class="ul-search-wrap">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" class="ul-search-icon">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
          <path d="M14 14l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search users…"
          class="ul-search"
          @input="onSearch"
        />
      </div>
    </div>

    <!-- Table card -->
    <div class="ul-card">
      <div class="ul-table-wrap">
        <table class="ul-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="td-state">
                <span class="spinner" /> Loading…
              </td>
            </tr>
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="5" class="td-state">No users found.</td>
            </tr>
            <tr v-else v-for="row in filteredItems" :key="row.id" class="ul-row">
              <td>
                <div class="user-cell">
                  <div class="user-avatar">{{ initials(row.name) }}</div>
                  <div>
                    <div class="user-name">{{ row.name }}</div>
                    <div class="user-email">{{ row.email }}</div>
                  </div>
                </div>
              </td>
              <td class="td-dim">{{ row.role || '—' }}</td>
              <td class="td-dim">{{ row.department || '—' }}</td>
              <td>
                <span :class="['status-badge', (row.status || '').toLowerCase() === 'active' ? 'status-active' : 'status-inactive']">
                  {{ row.status || '—' }}
                </span>
              </td>
              <td class="td-dim">{{ fmtDate(row.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="ul-pagination">
        <span class="pg-info">
          Showing {{ total === 0 ? 0 : (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} of {{ total }}
        </span>
        <div class="pg-controls">
          <select class="pg-select" :value="perPage" @change="perPage = +($event.target as HTMLSelectElement).value; page = 1; load()">
            <option :value="10">10 / page</option>
            <option :value="25">25 / page</option>
            <option :value="50">50 / page</option>
          </select>
          <button class="pg-btn" :disabled="page <= 1" @click="page--; load()">‹</button>
          <span class="pg-current">{{ page }} / {{ lastPage }}</span>
          <button class="pg-btn" :disabled="page >= lastPage" @click="page++; load()">›</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ul-page { display: flex; flex-direction: column; gap: 24px; }

/* Header */
.ul-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.ul-title { font-size: 22px; font-weight: 700; color: var(--text); }
.ul-sub   { margin-top: 4px; font-size: 13px; color: var(--muted); }

/* Search */
.ul-search-wrap { position: relative; display: flex; align-items: center; }
.ul-search-icon { position: absolute; left: 10px; color: var(--muted); pointer-events: none; }
.ul-search {
  height: 36px; padding: 0 12px 0 32px; font-size: 13px; width: 240px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  border-radius: 8px; color: var(--text); outline: none; transition: border-color .15s;
}
.ul-search::placeholder { color: var(--muted); }
.ul-search:focus { border-color: var(--accent); }

/* Card */
.ul-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); overflow: hidden;
}
.ul-table-wrap { overflow-x: auto; }

/* Table */
.ul-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ul-table thead tr {
  background: var(--surface2); border-bottom: 1px solid var(--border-hi);
}
.ul-table th {
  padding: 11px 16px; text-align: left;
  font-size: 11px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap;
}
.ul-row { border-bottom: 1px solid var(--border); transition: background .12s; }
.ul-row:last-child { border-bottom: none; }
.ul-row:hover { background: var(--surface2); }
.ul-table td { padding: 12px 16px; color: var(--text); vertical-align: middle; }

.td-state { padding: 40px 16px; text-align: center; color: var(--muted); }
.td-dim   { color: var(--dim); font-size: 13px; }

/* User cell */
.user-cell  { display: flex; align-items: center; gap: 10px; }
.user-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  display: grid; place-items: center;
  font-size: 12px; font-weight: 700; color: #fff;
}
.user-name  { font-size: 13px; font-weight: 500; color: var(--text); }
.user-email { font-size: 11px; color: var(--muted); margin-top: 1px; }

/* Status badge */
.status-badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; text-transform: capitalize; letter-spacing: 0.3px;
}
.status-active   { background: rgba(54,211,153,.12); color: var(--green); border: 1px solid rgba(54,211,153,.3); }
.status-inactive { background: rgba(107,114,128,.12); color: var(--dim);   border: 1px solid rgba(107,114,128,.25); }

/* Spinner */
.spinner {
  display: inline-block; width: 14px; height: 14px; vertical-align: middle; margin-right: 6px;
  border: 2px solid rgba(255,255,255,.12); border-top-color: var(--accent);
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Pagination */
.ul-pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 8px;
}
.pg-info     { font-size: 12px; color: var(--muted); }
.pg-controls { display: flex; align-items: center; gap: 8px; }
.pg-select {
  height: 30px; padding: 0 8px; font-size: 12px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  border-radius: 6px; color: var(--dim); cursor: pointer; outline: none;
}
.pg-btn {
  width: 28px; height: 28px; border-radius: 6px; font-size: 15px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  color: var(--dim); cursor: pointer; transition: all .15s;
}
.pg-btn:not(:disabled):hover { background: var(--surface3); color: var(--text); border-color: var(--accent); }
.pg-btn:disabled { opacity: .35; cursor: not-allowed; }
.pg-current { font-size: 12px; color: var(--dim); min-width: 50px; text-align: center; }
</style>
