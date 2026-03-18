<script setup lang="ts">
import { ref, computed, onMounted, defineOptions } from 'vue'
import { useRouter } from 'vue-router'
import { listEmployees, deleteEmployee } from '@/services/employee'

defineOptions({ name: 'EmployeesPage' })

interface Employee {
  id: number
  first_name: string
  last_name: string
  full_name?: string
  email: string
  phone?: string
  designation?: string
  department?: string
  role?: string
  team?: string
  status?: string
  location?: string
  employee_id?: string
  avatar?: string
}

const router = useRouter()
const loading = ref(false)
const employees = ref<Employee[]>([])
const viewMode = ref<'table' | 'card'>('table')
const page = ref(1)
const perPage = ref(10)
const searchQuery = ref('')
const statusFilter = ref('')
const departmentFilter = ref('')

const selected = ref<Record<number, boolean>>({})
const selectAll = ref(false)
const selectedCount = computed(() => Object.values(selected.value).filter(Boolean).length)
const selectedIds = computed(() => Object.keys(selected.value).filter(id => selected.value[Number(id)]).map(id => Number(id)))

let searchTimer: number | undefined
function onSearchChange() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => { page.value = 1 }, 250)
}

const departments = computed(() => {
  const set = new Set<string>()
  for (const emp of employees.value) {
    const d = (emp.department || emp.team || '').trim()
    if (d) set.add(d)
  }
  return Array.from(set).sort()
})

const filteredEmployees = computed(() => {
  let list = employees.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(emp =>
      [emp.first_name, emp.last_name, emp.email, emp.employee_id, emp.designation, emp.department]
        .some(v => String(v || '').toLowerCase().includes(q))
    )
  }
  if (statusFilter.value) list = list.filter(emp => (emp.status || '') === statusFilter.value)
  if (departmentFilter.value) list = list.filter(emp => (emp.department || emp.team || '') === departmentFilter.value)
  return list
})

const paginatedEmployees = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filteredEmployees.value.slice(start, start + perPage.value)
})
const totalPages = computed(() => Math.ceil(filteredEmployees.value.length / perPage.value))

function statusClass(status?: string) {
  if (status === 'Active') return 'badge--active'
  if (status === 'On Leave') return 'badge--leave'
  return 'badge--inactive'
}

function toggleRowSelection(emp: Employee) {
  selected.value[emp.id] = !selected.value[emp.id]
  if (!selected.value[emp.id]) selectAll.value = false
  const allSelected = paginatedEmployees.value.length > 0 && paginatedEmployees.value.every(e => selected.value[e.id])
  if (allSelected) selectAll.value = true
}
function toggleSelectAllVisible() {
  selectAll.value = !selectAll.value
  for (const emp of paginatedEmployees.value) selected.value[emp.id] = selectAll.value
}
function clearSelection() { selected.value = {}; selectAll.value = false }

async function bulkDelete() {
  if (!selectedCount.value) return
  if (!confirm(`Delete ${selectedCount.value} selected employees? This cannot be undone.`)) return
  loading.value = true
  try {
    for (const id of selectedIds.value) await deleteEmployee(id)
    await load(); clearSelection()
  } catch { alert('Failed to delete selected employees') }
  finally { loading.value = false }
}

async function handleDelete(emp: Employee) {
  if (!confirm(`Delete ${emp.first_name} ${emp.last_name}?`)) return
  try { await deleteEmployee(emp.id); await load() }
  catch { alert('Failed to delete employee') }
}

function normalizeEmployee(data: Record<string, unknown>): Employee {
  return {
    id: data.id,
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    full_name: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
    email: data.email,
    phone: data.phone,
    designation: data.designation,
    department: data.department,
    role: data.role,
    team: data.team,
    status: data.status || 'Active',
    location: data.location,
    employee_id: data.employee_id,
    avatar: `https://i.pravatar.cc/80?u=${data.email}`,
  }
}

async function load() {
  loading.value = true
  try {
    const { data } = await listEmployees({ per_page: 1000 })
    const list = Array.isArray(data) ? data : data?.data || []
    employees.value = list.map(normalizeEmployee)
  } catch { employees.value = [] }
  finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <div class="emp-page">
    <!-- Header -->
    <div class="emp-header">
      <div>
        <h1 class="emp-title">Employees</h1>
        <p class="emp-subtitle">{{ filteredEmployees.length }} total &nbsp;·&nbsp; {{ employees.filter(e => e.status === 'Active').length }} active</p>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center;">
        <router-link to="/app/employees/org-chart" class="btn-secondary">
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM3 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10-3a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          Org Chart
        </router-link>
        <router-link to="/app/employees/new" class="btn-accent">
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Employee
        </router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filters-row">
        <div class="search-wrap">
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/></svg>
          <input v-model="searchQuery" type="text" class="search-input" placeholder="Search name, email, code…" @input="onSearchChange" />
        </div>
        <select v-model="statusFilter" class="filter-select">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select v-model="departmentFilter" class="filter-select">
          <option value="">All Departments</option>
          <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
        </select>
      </div>
      <div class="filters-meta">
        <span class="meta-text">Showing {{ paginatedEmployees.length }} of {{ filteredEmployees.length }}</span>
        <div class="view-toggle">
          <button :class="['toggle-btn', viewMode === 'table' && 'toggle-btn--active']" @click="viewMode = 'table'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 6h18M3 14h18M3 18h18"/></svg>
            Table
          </button>
          <button :class="['toggle-btn', viewMode === 'card' && 'toggle-btn--active']" @click="viewMode = 'card'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm10 0a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V6zM4 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2zm10 0a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z"/></svg>
            Cards
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Actions -->
    <div v-if="selectedCount" class="bulk-bar">
      <span class="bulk-count">{{ selectedCount }} selected</span>
      <button class="bulk-btn bulk-btn--danger" @click="bulkDelete">Delete Selected</button>
      <button class="bulk-btn" @click="clearSelection">Clear</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-box">Loading employees…</div>

    <!-- Table View -->
    <div v-else-if="viewMode === 'table'" class="table-wrap">
      <table class="emp-table">
        <thead>
          <tr>
            <th class="th th-check">
              <input type="checkbox" class="chk" :checked="selectAll" @change="toggleSelectAllVisible" />
            </th>
            <th class="th">Employee</th>
            <th class="th">Code</th>
            <th class="th">Email</th>
            <th class="th">Designation</th>
            <th class="th">Department</th>
            <th class="th">Status</th>
            <th class="th th-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="emp in paginatedEmployees" :key="emp.id" class="tr" @click="router.push({ name: 'employee-profile', params: { id: emp.id } })">
            <td class="td td-check" @click.stop>
              <input type="checkbox" class="chk" :checked="!!selected[emp.id]" @change="() => toggleRowSelection(emp)" />
            </td>
            <td class="td">
              <div class="emp-cell">
                <img :src="emp.avatar" :alt="emp.full_name" class="emp-avatar" />
                <span class="emp-name">{{ emp.full_name }}</span>
              </div>
            </td>
            <td class="td td-muted">{{ emp.employee_id || '—' }}</td>
            <td class="td td-muted">{{ emp.email }}</td>
            <td class="td td-muted">{{ emp.designation || '—' }}</td>
            <td class="td td-muted">{{ emp.department || '—' }}</td>
            <td class="td">
              <span :class="['badge', statusClass(emp.status)]">{{ emp.status }}</span>
            </td>
            <td class="td td-actions" @click.stop>
              <button class="action-btn" title="View" @click="router.push({ name: 'employee-profile', params: { id: emp.id } })">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
              <button class="action-btn" title="Edit" @click="router.push({ name: 'employee-edit', params: { id: emp.id } })">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button class="action-btn action-btn--danger" title="Delete" @click="handleDelete(emp)">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/></svg>
              </button>
            </td>
          </tr>
          <tr v-if="paginatedEmployees.length === 0">
            <td colspan="8" class="td state-empty">No employees found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Card View -->
    <div v-else class="card-grid">
      <div
        v-for="emp in paginatedEmployees"
        :key="emp.id"
        class="emp-card"
        @click="router.push({ name: 'employee-profile', params: { id: emp.id } })"
      >
        <div class="card-top">
          <img :src="emp.avatar" :alt="emp.full_name" class="card-avatar" />
          <div class="card-info">
            <h3 class="card-name">{{ emp.full_name }}</h3>
            <p class="card-code">{{ emp.employee_id }}</p>
          </div>
          <span :class="['badge', statusClass(emp.status)]">{{ emp.status }}</span>
        </div>
        <div class="card-body">
          <div class="card-row">
            <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/></svg>
            <span>{{ emp.email }}</span>
          </div>
          <div v-if="emp.designation" class="card-row">
            <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m4 6h.01M5 20h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/></svg>
            <span>{{ emp.designation }}</span>
          </div>
          <div v-if="emp.department" class="card-row">
            <svg class="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"/></svg>
            <span>{{ emp.department }}</span>
          </div>
        </div>
        <div class="card-foot" @click.stop>
          <button class="card-action" @click="router.push({ name: 'employee-edit', params: { id: emp.id } })">Edit</button>
          <button class="card-action card-action--danger" @click="handleDelete(emp)">Delete</button>
        </div>
      </div>
      <div v-if="paginatedEmployees.length === 0" class="col-span-full state-empty">No employees found</div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page === 1" @click="page--">← Prev</button>
      <button
        v-for="p in totalPages" :key="p"
        :class="['page-btn', p === page && 'page-btn--active']"
        @click="page = p"
      >{{ p }}</button>
      <button class="page-btn" :disabled="page === totalPages" @click="page++">Next →</button>
    </div>
  </div>
</template>

<style scoped>
.emp-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

/* Header */
.emp-header { display: flex; align-items: center; justify-content: space-between; }
.emp-title  { font-size: 1.5rem; font-weight: 700; color: var(--text); }
.emp-subtitle { font-size: 0.813rem; color: var(--muted); margin-top: 2px; }

.btn-accent {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent); color: #fff;
  border: none; border-radius: 8px; padding: 8px 16px;
  font-size: 0.875rem; font-weight: 500; cursor: pointer;
  text-decoration: none;
}
.btn-accent:hover { opacity: 0.88; }
.btn-icon { width: 16px; height: 16px; }

/* Filters */
.filters-bar { background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.filters-row { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; }
.search-wrap { position: relative; }
.search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--muted); pointer-events: none; }
.search-input { width: 100%; background: var(--surface2); border: 1px solid rgba(255,255,255,.08); border-radius: 7px; padding: 8px 12px 8px 34px; font-size: 0.875rem; color: var(--text); outline: none; }
.search-input:focus { border-color: var(--accent); }
.filter-select { background: var(--surface2); border: 1px solid rgba(255,255,255,.08); border-radius: 7px; padding: 8px 12px; font-size: 0.875rem; color: var(--text); outline: none; }
.filter-select:focus { border-color: var(--accent); }
.filters-meta { display: flex; align-items: center; justify-content: space-between; }
.meta-text { font-size: 0.813rem; color: var(--muted); }
.view-toggle { display: flex; gap: 4px; background: var(--surface2); border-radius: 7px; padding: 3px; }
.toggle-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 5px; font-size: 0.8rem; font-weight: 500; color: var(--muted); background: transparent; border: none; cursor: pointer; }
.toggle-btn--active { background: var(--surface3); color: var(--text); }

/* Bulk */
.bulk-bar { display: flex; align-items: center; gap: 10px; background: rgba(79,126,255,.12); border: 1px solid rgba(79,126,255,.25); border-radius: 8px; padding: 10px 16px; }
.bulk-count { font-size: 0.875rem; font-weight: 600; color: var(--accent); flex: 1; }
.bulk-btn { padding: 5px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; background: var(--surface2); border: 1px solid rgba(255,255,255,.1); color: var(--text); }
.bulk-btn--danger { background: rgba(255,107,107,.15); border-color: rgba(255,107,107,.3); color: var(--red); }

/* State */
.state-box  { background: var(--surface); border-radius: 10px; padding: 40px; text-align: center; color: var(--muted); font-size: 0.875rem; }
.state-empty { padding: 40px; text-align: center; color: var(--muted); font-size: 0.875rem; }

/* Table */
.table-wrap { background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; overflow: hidden; }
.emp-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.th { padding: 11px 14px; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; background: var(--surface2); border-bottom: 1px solid rgba(255,255,255,.06); }
.th-check  { width: 40px; }
.th-actions { width: 100px; }
.tr { cursor: pointer; }
.tr:hover td { background: var(--surface2); }
.td { padding: 12px 14px; color: var(--text); border-bottom: 1px solid rgba(255,255,255,.04); vertical-align: middle; }
.td-muted  { color: var(--muted); }
.td-check  { width: 40px; }
.td-actions { text-align: right; }
.emp-cell  { display: flex; align-items: center; gap: 10px; }
.emp-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.emp-name  { font-weight: 500; }
.chk { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
.action-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(255,255,255,.08); background: transparent; color: var(--muted); cursor: pointer; margin-left: 4px; }
.action-btn:hover { background: var(--surface3); color: var(--text); }
.action-btn--danger:hover { background: rgba(255,107,107,.15); color: var(--red); border-color: rgba(255,107,107,.3); }

/* Badges */
.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
.badge--active   { background: rgba(54,211,153,.15); color: var(--green); }
.badge--leave    { background: rgba(249,168,37,.15); color: var(--yellow); }
.badge--inactive { background: rgba(107,114,128,.15); color: var(--muted); }

/* Cards */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.emp-card { background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 12px; overflow: hidden; cursor: pointer; transition: border-color .15s; }
.emp-card:hover { border-color: rgba(79,126,255,.35); }
.card-top  { display: flex; align-items: center; gap: 12px; padding: 16px 16px 12px; }
.card-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.card-info { flex: 1; min-width: 0; }
.card-name { font-weight: 600; font-size: 0.9rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-code { font-size: 0.75rem; color: var(--muted); margin-top: 1px; }
.card-body { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 6px; }
.card-row  { display: flex; align-items: center; gap: 7px; font-size: 0.8rem; color: var(--muted); }
.card-icon { width: 14px; height: 14px; flex-shrink: 0; color: var(--muted); }
.card-foot { display: flex; gap: 8px; padding: 10px 16px; border-top: 1px solid rgba(255,255,255,.05); }
.card-action { flex: 1; padding: 6px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; background: var(--surface2); border: 1px solid rgba(255,255,255,.08); color: var(--text); text-align: center; }
.card-action:hover { background: var(--surface3); }
.card-action--danger { color: var(--red); background: rgba(255,107,107,.08); border-color: rgba(255,107,107,.2); }

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 6px; }
.page-btn { padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; cursor: pointer; background: var(--surface); border: 1px solid rgba(255,255,255,.08); color: var(--muted); }
.page-btn:disabled { opacity: .4; cursor: default; }
.page-btn--active { background: var(--accent); color: #fff; border-color: var(--accent); }
</style>
