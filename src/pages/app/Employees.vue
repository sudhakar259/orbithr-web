<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listEmployees, deleteEmployee } from '@/services/employee'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import EmpAvatar from '@/components/employee/EmpAvatar.vue'

defineOptions({ name: 'EmployeesPage' })

const router = useRouter()
const { confirm: dialog } = useConfirm()
const toast = useToast()
const { setBreadcrumbs } = useBreadcrumbs()

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  employee_id: string
  designation: string
  department: string
  manager_name: string
  location: string
  joined: string
  status: string
  avatar?: string
}

// ── State ─────────────────────────────────────────────────────────────────────
const loading    = ref(true)
const employees  = ref<Employee[]>([])
const viewMode   = ref<'table' | 'card'>('table')
const page       = ref(1)
const perPage    = ref(12)
const search     = ref('')
const deptFilter = ref('')
const locFilter  = ref('')
const statusFilter = ref('')

const selected   = ref<Record<number, boolean>>({})
const selectAll  = ref(false)

// ── Dept colour map ───────────────────────────────────────────────────────────
const DEPT: Record<string, { bg: string; fg: string }> = {
  engineering: { bg: 'rgba(79,126,255,.12)',  fg: '#6B9BFF' },
  design:      { bg: 'rgba(249,168,37,.12)',   fg: '#F5C16E' },
  people:      { bg: 'rgba(77,211,154,.12)',   fg: '#4DD39A' },
  hr:          { bg: 'rgba(77,211,154,.12)',   fg: '#4DD39A' },
  finance:     { bg: 'rgba(79,198,255,.12)',   fg: '#4BC6FF' },
  sales:       { bg: 'rgba(255,107,107,.12)',  fg: '#F38288' },
  management:  { bg: 'rgba(155,110,255,.12)',  fg: '#9B6EFF' },
  operations:  { bg: 'rgba(156,163,175,.12)', fg: '#9CA3AF' },
  marketing:   { bg: 'rgba(249,168,37,.12)',   fg: '#F5C16E' },
}

function deptStyle(dept: string) {
  return DEPT[dept.toLowerCase()] ?? { bg: 'rgba(107,114,128,.12)', fg: '#9CA3AF' }
}

const STATUS: Record<string, { bg: string; fg: string }> = {
  active:    { bg: 'rgba(77,211,154,.12)',  fg: '#4DD39A' },
  notice:    { bg: 'rgba(249,168,37,.12)',  fg: '#F5C16E' },
  probation: { bg: 'rgba(79,126,255,.12)',  fg: '#6B9BFF' },
  inactive:  { bg: 'rgba(107,114,128,.12)', fg: '#9CA3AF' },
  terminated:{ bg: 'rgba(255,107,107,.12)', fg: '#F38288' },
}

function statusStyle(s: string) {
  return STATUS[s.toLowerCase()] ?? { bg: 'rgba(107,114,128,.12)', fg: '#9CA3AF' }
}

// ── Derived filter lists ──────────────────────────────────────────────────────
const departments = computed(() => [...new Set(employees.value.map(e => e.department).filter(Boolean))].sort())
const locations   = computed(() => [...new Set(employees.value.map(e => e.location).filter(Boolean))].sort())

// ── Filtered + paginated ──────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return employees.value.filter(e => {
    if (q && !`${e.full_name} ${e.email} ${e.employee_id} ${e.designation}`.toLowerCase().includes(q)) return false
    if (deptFilter.value   && e.department !== deptFilter.value)   return false
    if (locFilter.value    && e.location   !== locFilter.value)    return false
    if (statusFilter.value && e.status.toLowerCase() !== statusFilter.value.toLowerCase()) return false
    return true
  })
})

const totalPages  = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage.value)))
const paginated   = computed(() => filtered.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))

const selectedCount = computed(() => Object.values(selected.value).filter(Boolean).length)
const selectedIds   = computed(() => Object.keys(selected.value).filter(id => selected.value[Number(id)]).map(Number))

// ── Selection helpers ─────────────────────────────────────────────────────────
function toggleRow(emp: Employee) {
  selected.value[emp.id] = !selected.value[emp.id]
  selectAll.value = paginated.value.every(e => selected.value[e.id])
}

function toggleAll() {
  selectAll.value = !selectAll.value
  for (const e of paginated.value) selected.value[e.id] = selectAll.value
}

function clearSel() { selected.value = {}; selectAll.value = false }

// ── Bulk delete ───────────────────────────────────────────────────────────────
async function bulkDelete() {
  if (!selectedCount.value) return
  if (!await dialog('Delete', `Delete ${selectedCount.value} selected employees? This cannot be undone.`)) return
  loading.value = true
  try {
    for (const id of selectedIds.value) await deleteEmployee(id)
    await load(); clearSel()
  } catch { toast.error('Failed to delete employees') }
  finally { loading.value = false }
}

async function handleDelete(emp: Employee) {
  if (!await dialog('Delete', `Delete ${emp.full_name}?`)) return
  try { await deleteEmployee(emp.id); await load() }
  catch { toast.error('Failed to delete employee') }
}

// ── Normalise API shape ───────────────────────────────────────────────────────
function norm(d: Record<string, unknown>): Employee {
  const firstName = String(d.first_name ?? '')
  const lastName  = String(d.last_name  ?? '')
  const dept = String(
    (d.department as Record<string, unknown>)?.name ?? d.department ?? ''
  )
  const mgr = d.manager as Record<string, unknown> | null | undefined
  return {
    id:           d.id as number,
    first_name:   firstName,
    last_name:    lastName,
    full_name:    String(d.full_name ?? `${firstName} ${lastName}`.trim()),
    email:        String(d.email ?? ''),
    employee_id:  String(d.employee_id ?? '—'),
    designation:  String(d.designation ?? d.job_title ?? '—'),
    department:   dept || '—',
    manager_name: String(mgr?.full_name ?? mgr?.name ?? d.manager_name ?? '—'),
    location:     String(d.location ?? '—'),
    joined:       d.hire_date
      ? new Date(d.hire_date as string).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      : '—',
    status:       String(d.status ?? 'Active'),
    avatar:       d.avatar as string | undefined,
  }
}

async function load() {
  loading.value = true
  try {
    const { data } = await listEmployees({ per_page: 1000 })
    employees.value = (Array.isArray(data) ? data : data?.data ?? []).map(norm)
  } catch { employees.value = [] }
  finally { loading.value = false }
}

onMounted(() => {
  setBreadcrumbs([
    { label: 'People' },
    { label: 'Employees' },
  ])
  load()
})

// ── Search debounce ───────────────────────────────────────────────────────────
let timer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1 }, 220)
}

// ── Page window for pagination ────────────────────────────────────────────────
const PAGE_WIN = 5
const pageNums = computed(() => {
  const t = totalPages.value
  const c = page.value
  const half = Math.floor(PAGE_WIN / 2)
  let start = Math.max(1, c - half)
  const end   = Math.min(t, start + PAGE_WIN - 1)
  if (end - start + 1 < PAGE_WIN) start = Math.max(1, end - PAGE_WIN + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
</script>

<template>
  <div class="pg">

    <!-- Page header -->
    <div class="ph">
      <div class="ph-l">
        <div class="eyebrow">People · Directory</div>
        <h1 class="ph-title">
          {{ loading ? '…' : filtered.length }}
          teammate{{ (filtered.length === 1 ? '' : 's') }}
        </h1>
        <p class="ph-sub">
          Full employee directory — search, filter, and bulk-edit.
          {{ employees.filter(e => e.status.toLowerCase() === 'active').length }} active members.
        </p>
      </div>
      <div class="ph-r">
        <RouterLink to="/app/employees/org-chart" class="btn-sec">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM3 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10-3a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" clip-rule="evenodd"/></svg>
          Org chart
        </RouterLink>
        <button class="btn-sec">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          Import
        </button>
        <button class="btn-sec">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/></svg>
          Export CSV
        </button>
        <RouterLink to="/app/employees/new" class="btn-pri">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Add employee
        </RouterLink>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="search-box" :class="{ focus: false }">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" class="s-icon">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
        </svg>
        <input
          v-model="search"
          class="s-input"
          placeholder="name, email, employee code…"
          @input="onSearch"
        />
        <kbd>⌘F</kbd>
      </div>

      <select v-model="deptFilter" class="flt-sel" @change="page = 1">
        <option value="">Department · All</option>
        <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
      </select>

      <select v-model="locFilter" class="flt-sel" @change="page = 1">
        <option value="">Location · All</option>
        <option v-for="l in locations" :key="l" :value="l">{{ l }}</option>
      </select>

      <select v-model="statusFilter" class="flt-sel" @change="page = 1">
        <option value="">Status · All</option>
        <option value="active">Active</option>
        <option value="notice">Notice</option>
        <option value="probation">Probation</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    <!-- Results meta + view toggle -->
    <div class="meta-bar">
      <span class="meta-txt">
        Showing <strong>{{ paginated.length }} of {{ filtered.length }}</strong>
        · {{ selectedCount > 0 ? `${selectedCount} selected` : 'Grouped by department' }}
      </span>
      <div class="vm-toggle">
        <button
          v-for="vm in [{ k: 'table', label: 'Table' }, { k: 'card', label: 'Cards' }]"
          :key="vm.k"
          class="vm-btn"
          :class="{ active: viewMode === vm.k }"
          @click="viewMode = (vm.k as 'table' | 'card')"
        >{{ vm.label }}</button>
        <RouterLink to="/app/employees/org-chart" class="vm-btn">Org</RouterLink>
      </div>
    </div>

    <!-- Bulk actions -->
    <div v-if="selectedCount" class="bulk-bar">
      <span class="bulk-cnt">{{ selectedCount }} selected</span>
      <button class="bulk-btn bulk-btn--del" @click="bulkDelete">Delete</button>
      <button class="bulk-btn" @click="clearSel">Clear</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state">Loading employees…</div>

    <!-- Table view -->
    <div v-else-if="viewMode === 'table'" class="tbl-card">

      <!-- Header row -->
      <div class="tbl-row tbl-head">
        <div class="tc tc-chk">
          <input type="checkbox" class="chk" :checked="selectAll" @change="toggleAll" />
        </div>
        <div class="tc">Employee</div>
        <div class="tc">Code</div>
        <div class="tc">Role</div>
        <div class="tc tc-hide">Manager</div>
        <div class="tc tc-hide">Location</div>
        <div class="tc tc-hide">Joined</div>
        <div class="tc">Status</div>
        <div class="tc tc-act"></div>
      </div>

      <!-- Data rows -->
      <template v-if="paginated.length">
        <div
          v-for="emp in paginated"
          :key="emp.id"
          class="tbl-row tbl-data"
          @click="router.push({ name: 'employee-profile', params: { id: emp.id } })"
        >
          <div class="tc tc-chk" @click.stop>
            <input type="checkbox" class="chk" :checked="!!selected[emp.id]" @change="() => toggleRow(emp)" />
          </div>

          <div class="tc">
            <div class="emp-cell">
              <EmpAvatar :name="emp.full_name" :size="28" :src="emp.avatar" />
              <div>
                <div class="emp-name">{{ emp.full_name }}</div>
                <div class="emp-email">{{ emp.email }}</div>
              </div>
            </div>
          </div>

          <div class="tc tc-mono tc-dim">{{ emp.employee_id }}</div>

          <div class="tc">
            <div class="emp-role">{{ emp.designation }}</div>
            <span
              class="dept-badge"
              :style="{ background: deptStyle(emp.department).bg, color: deptStyle(emp.department).fg }"
            >{{ emp.department }}</span>
          </div>

          <div class="tc tc-dim tc-hide">{{ emp.manager_name }}</div>

          <div class="tc tc-dim tc-hide">
            <div class="loc-cell">
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" class="loc-icon">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
              </svg>
              {{ emp.location }}
            </div>
          </div>

          <div class="tc tc-dim tc-mono-sm tc-hide">{{ emp.joined }}</div>

          <div class="tc">
            <span
              class="st-badge"
              :style="{ background: statusStyle(emp.status).bg, color: statusStyle(emp.status).fg }"
            >{{ emp.status }}</span>
          </div>

          <div class="tc tc-act" @click.stop>
            <button class="act-btn" title="View" @click="router.push({ name: 'employee-profile', params: { id: emp.id } })">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10z" clip-rule="evenodd"/></svg>
            </button>
            <button class="act-btn" title="Edit" @click="router.push({ name: 'employee-edit', params: { id: emp.id } })">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
            </button>
            <button class="act-btn act-btn--del" title="Delete" @click="handleDelete(emp)">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>
      </template>
      <div v-else class="state">No employees match your filters.</div>
    </div>

    <!-- Card view -->
    <div v-else class="card-grid">
      <div
        v-for="emp in paginated"
        :key="emp.id"
        class="emp-card"
        @click="router.push({ name: 'employee-profile', params: { id: emp.id } })"
      >
        <div class="ec-top">
          <EmpAvatar :name="emp.full_name" :size="40" :src="emp.avatar" />
          <div class="ec-info">
            <div class="ec-name">{{ emp.full_name }}</div>
            <div class="ec-code">{{ emp.employee_id }}</div>
          </div>
          <span
            class="st-badge"
            :style="{ background: statusStyle(emp.status).bg, color: statusStyle(emp.status).fg }"
          >{{ emp.status }}</span>
        </div>
        <div class="ec-body">
          <div class="ec-row">{{ emp.designation }}</div>
          <div class="ec-row">
            <span
              class="dept-badge"
              :style="{ background: deptStyle(emp.department).bg, color: deptStyle(emp.department).fg }"
            >{{ emp.department }}</span>
          </div>
          <div class="ec-row ec-dim">{{ emp.email }}</div>
          <div v-if="emp.location !== '—'" class="ec-row ec-dim">
            <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink:0">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
            </svg>
            {{ emp.location }}
          </div>
        </div>
        <div class="ec-foot" @click.stop>
          <button class="ec-action" @click="router.push({ name: 'employee-edit', params: { id: emp.id } })">Edit</button>
          <button class="ec-action ec-action--del" @click="handleDelete(emp)">Delete</button>
        </div>
      </div>
      <div v-if="!paginated.length" class="state" style="grid-column:1/-1">No employees match your filters.</div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pag">
      <span class="pag-info">Page {{ page }} of {{ totalPages }} · {{ perPage }} per page</span>
      <div class="pag-btns">
        <button class="pag-btn" :disabled="page === 1" @click="page--">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
        </button>
        <button
          v-for="n in pageNums"
          :key="n"
          class="pag-btn"
          :class="{ 'pag-btn--active': n === page }"
          @click="page = n"
        >{{ n }}</button>
        <button class="pag-btn" :disabled="page === totalPages" @click="page++">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────── */
.pg { padding: 24px; display: flex; flex-direction: column; gap: 14px; }

/* ── Page header ────────────────────────────────────── */
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding-bottom: 4px; }
.ph-l { display: flex; flex-direction: column; gap: 4px; }
.eyebrow { font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
.ph-title { margin: 0; font-family: 'Instrument Serif', Georgia, serif; font-size: 32px; font-weight: 400; color: var(--text); letter-spacing: -0.02em; line-height: 1.1; }
.ph-sub { margin: 0; font-size: 12.5px; color: var(--muted); }
.ph-r { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }

.btn-sec {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px;
  border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap;
  background: var(--surface); border: 1px solid var(--border); color: var(--dim); text-decoration: none;
  transition: all .13s;
}
.btn-sec:hover { border-color: var(--border-hi); color: var(--text); }
.btn-pri {
  display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px;
  border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap;
  background: var(--accent); border: 1px solid transparent; color: #fff; text-decoration: none;
  box-shadow: 0 0 14px rgba(79,126,255,.28); transition: all .13s;
}
.btn-pri:hover { background: #3d6ee8; }

/* ── Filter bar ─────────────────────────────────────── */
.filter-bar {
  display: flex; align-items: center; gap: 8px;
}
.search-box {
  flex: 1; display: flex; align-items: center; gap: 8px;
  height: 34px; padding: 0 12px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
  cursor: text; transition: border-color .14s;
}
.search-box:focus-within { border-color: var(--accent); }
.s-icon { color: var(--muted); flex-shrink: 0; }
.s-input {
  flex: 1; background: none; border: none; outline: none;
  font-size: 12.5px; color: var(--text); font-family: inherit;
}
.s-input::placeholder { color: var(--muted); }
kbd {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 4px; padding: 1px 5px; font-size: 10px; color: var(--muted);
  flex-shrink: 0; font-family: inherit;
}
.flt-sel {
  height: 34px; padding: 0 10px; border-radius: 6px;
  background: var(--surface); border: 1px solid var(--border);
  font-size: 12px; color: var(--dim); cursor: pointer; outline: none;
  transition: border-color .14s; white-space: nowrap;
}
.flt-sel:focus { border-color: var(--accent); }
.flt-sel option { background: var(--surface2); }

/* ── Meta bar ───────────────────────────────────────── */
.meta-bar { display: flex; align-items: center; justify-content: space-between; }
.meta-txt { font-size: 12px; color: var(--muted); }
.meta-txt strong { color: var(--text); font-weight: 500; }
.vm-toggle { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 2px; }
.vm-btn {
  padding: 4px 12px; font-size: 11px; font-weight: 500; color: var(--muted);
  border-radius: 4px; cursor: pointer; border: none; background: transparent;
  transition: all .13s; text-decoration: none;
}
.vm-btn.active, .vm-btn:hover { background: var(--surface2); color: var(--text); }

/* ── Bulk bar ───────────────────────────────────────── */
.bulk-bar { display: flex; align-items: center; gap: 10px; background: rgba(79,126,255,.08); border: 1px solid rgba(79,126,255,.2); border-radius: 8px; padding: 9px 16px; }
.bulk-cnt { font-size: 13px; font-weight: 600; color: var(--accent); flex: 1; }
.bulk-btn { height: 28px; padding: 0 12px; border-radius: 5px; font-size: 12px; font-weight: 500; cursor: pointer; background: var(--surface2); border: 1px solid var(--border); color: var(--text); }
.bulk-btn--del { background: rgba(255,107,107,.12); border-color: rgba(255,107,107,.25); color: var(--red); }

/* ── Table card ─────────────────────────────────────── */
.tbl-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }

.tbl-row {
  display: grid;
  grid-template-columns: 32px 1.6fr 0.85fr 1.25fr 1fr 0.85fr 0.7fr 0.7fr 76px;
  align-items: center;
  padding: 0 16px;
}
.tbl-head {
  height: 38px;
  background: rgba(255,255,255,.02);
  border-bottom: 1px solid var(--border);
}
.tbl-data {
  height: 52px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background .1s;
}
.tbl-data:last-child { border-bottom: none; }
.tbl-data:hover { background: rgba(255,255,255,.025); }

.tc { display: flex; align-items: center; }
.tc-chk { justify-content: center; }
.tc-act { justify-content: flex-end; gap: 2px; }
.tc-dim { color: var(--muted); font-size: 12px; }
.tc-mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.tc-mono-sm { font-family: 'JetBrains Mono', monospace; font-size: 11px; }

.tbl-head .tc {
  font-size: 10.5px; font-weight: 600;
  letter-spacing: .08em; text-transform: uppercase; color: var(--muted);
}

@media (max-width: 1024px) { .tc-hide { display: none !important; }
  .tbl-row { grid-template-columns: 32px 1.6fr 0.85fr 1.3fr 0.75fr 76px; }
}

.chk { width: 14px; height: 14px; accent-color: var(--accent); cursor: pointer; }

/* ── Employee cell ──────────────────────────────────── */
.emp-cell { display: flex; align-items: center; gap: 9px; }
.emp-name { font-size: 12.5px; font-weight: 500; color: var(--text); }
.emp-email { font-size: 11px; color: var(--muted); }
.emp-role { font-size: 12px; color: var(--text); }

/* ── Badges ─────────────────────────────────────────── */
.dept-badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 500; }
.st-badge   { display: inline-block; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; }

/* ── Location ───────────────────────────────────────── */
.loc-cell { display: flex; align-items: center; gap: 4px; }
.loc-icon { color: var(--muted); flex-shrink: 0; }

/* ── Action buttons ─────────────────────────────────── */
.act-btn {
  width: 26px; height: 26px; border-radius: 5px; border: 1px solid var(--border);
  background: transparent; color: var(--muted); cursor: pointer;
  display: grid; place-items: center; transition: all .13s;
}
.act-btn:hover { border-color: var(--border-hi); color: var(--text); background: var(--surface2); }
.act-btn--del:hover { background: rgba(255,107,107,.1); color: var(--red); border-color: rgba(255,107,107,.3); }

/* ── Card grid ──────────────────────────────────────── */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px; }

.emp-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; cursor: pointer; transition: border-color .15s; }
.emp-card:hover { border-color: var(--border-hi); }

.ec-top  { display: flex; align-items: center; gap: 10px; padding: 14px 14px 10px; }
.ec-info { flex: 1; min-width: 0; }
.ec-name { font-size: 13px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ec-code { font-size: 11px; color: var(--muted); margin-top: 1px; }

.ec-body { padding: 0 14px 10px; display: flex; flex-direction: column; gap: 5px; }
.ec-row  { font-size: 12px; color: var(--text); display: flex; align-items: center; gap: 5px; }
.ec-dim  { color: var(--muted); font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ec-foot { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid var(--border); }
.ec-action { flex: 1; height: 28px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; background: var(--surface2); border: 1px solid var(--border); color: var(--text); }
.ec-action:hover { background: var(--surface3); }
.ec-action--del { color: var(--red); background: rgba(255,107,107,.07); border-color: rgba(255,107,107,.2); }
.ec-action--del:hover { background: rgba(255,107,107,.15); }

/* ── Pagination ─────────────────────────────────────── */
.pag { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.pag-info { font-size: 12px; color: var(--muted); }
.pag-btns { display: flex; gap: 3px; }
.pag-btn {
  min-width: 28px; height: 28px; padding: 0 6px;
  border-radius: 5px; font-size: 12px; font-weight: 500; cursor: pointer;
  background: var(--surface); border: 1px solid var(--border); color: var(--muted);
  display: grid; place-items: center; transition: all .13s;
}
.pag-btn:disabled { opacity: .35; cursor: default; }
.pag-btn:not(:disabled):hover { border-color: var(--border-hi); color: var(--text); }
.pag-btn--active { background: rgba(79,126,255,.15); border-color: rgba(79,126,255,.35); color: var(--accent); }

/* ── State ──────────────────────────────────────────── */
.state { padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }
</style>
