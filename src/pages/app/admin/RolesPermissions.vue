<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, computed, onMounted } from 'vue'

// ── Role name helpers ─────────────────────────────────────────────────────
// Known abbreviations that should stay fully uppercase
const ACRONYMS = new Set(['hr', 'it', 'ceo', 'cfo', 'cto', 'coo', 'vp', 'gm', 'qa', 'pr', 'ui', 'ux', 'id'])

/** "hr_manager" | "hr manager" → "HR Manager" */
function formatRoleName(name: string): string {
  if (!name) return ''
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** "HR Manager" | "New Role" → "hr_manager" | "new_role" */
function toSnakeCase(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_').replace(/^_|_$/g, '')
}
import api, { roleApi, permissionApi } from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const toast = useToast()
const { confirm: dialog } = useConfirm()

interface RoleItem {
  id: number
  name: string
  users_count: number
  permissions_count: number
  created_at?: string
}

const loading     = ref(false)
const items       = ref<RoleItem[]>([])
const page        = ref(1)
const perPage     = ref(10)
const total       = ref(0)
const searchQuery = ref('')
let   searchTimer: number | undefined

const lastPage = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(it =>
    [it.name, String(it.users_count), String(it.permissions_count)]
      .some(v => v.toLowerCase().includes(q))
  )
})

function onSearch() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => { page.value = 1; load() }, 250)
}

async function load() {
  loading.value = true
  try {
    const { data } = await roleApi.list({ page: page.value, per_page: perPage.value, search: searchQuery.value || undefined })
    const normalize = (r: any): RoleItem => ({
      id: r.id,
      name: r.name,
      users_count: r.users_count ?? (Array.isArray(r.users) ? r.users.length : 0),
      permissions_count: r.permissions_count ?? (Array.isArray(r.permissions) ? r.permissions.length : 0),
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

// ── Permissions ───────────────────────────────────────────────────────
const auth    = useAuth()
const isSuper = computed(() => auth.roles().map((r: unknown) => String(r).toLowerCase()).includes('super admin'))
const groupedPermissions = ref<{ module: string; permissions: { id: number; name: string; action: string }[] }[]>([])

async function loadPermissionsOnce() {
  if (groupedPermissions.value.length) return
  const { data } = await permissionApi.grouped()
  const superOnly = new Set(['modules', 'plans', 'tenants', 'transactions'])
  groupedPermissions.value = (Array.isArray(data) ? data : []).filter((g: any) => {
    if (isSuper.value) return true
    return !superOnly.has(String(g.module || '').toLowerCase())
  })
}

function sanitizePermissionsForSave(ids: number[]) {
  if (isSuper.value) return ids
  const allowed = new Set<number>()
  groupedPermissions.value.forEach(g => (g.permissions || []).forEach((p: any) => allowed.add(p.id)))
  return ids.filter(id => allowed.has(id))
}

// ── Inline role panel (replaces modal) ───────────────────────────────
const panelMode    = ref<'none' | 'create' | 'edit'>('none')
const activeRoleId = ref<number | null>(null)
const saving       = ref(false)
const panelLoading = ref(false)
const hiddenCount  = ref(0)

const form = ref<{ id?: number; name: string; description: string; permissions: number[] }>({
  name: '', description: '', permissions: [],
})

function openCreate() {
  activeRoleId.value = null
  form.value = { name: '', description: '', permissions: [] }
  hiddenCount.value = 0
  panelMode.value = 'create'
}

async function openEdit(role: RoleItem) {
  activeRoleId.value = role.id
  panelMode.value = 'edit'
  panelLoading.value = true
  try {
    const { data } = await api.get(`/roles/${role.id}`)
    const permIds: number[] = (data.permissions || []).map((p: any) => p.id)
    // Pre-fill with human-readable name so admin sees "HR Manager" not "hr_manager"
    form.value = { id: role.id, name: formatRoleName(data.name), description: data.description || '', permissions: permIds }
    if (!isSuper.value) {
      const allowed = new Set<number>()
      groupedPermissions.value.forEach(g => (g.permissions || []).forEach((p: any) => allowed.add(p.id)))
      hiddenCount.value = permIds.filter(id => !allowed.has(id)).length
    } else {
      hiddenCount.value = 0
    }
  } finally {
    panelLoading.value = false
  }
}

function closePanel() {
  panelMode.value = 'none'
  activeRoleId.value = null
}

async function saveRole() {
  saving.value = true
  try {
    const perms = sanitizePermissionsForSave(form.value.permissions || [])
    const name = toSnakeCase(form.value.name)
    if (panelMode.value === 'edit' && form.value.id) {
      await roleApi.update(form.value.id, { name, description: form.value.description, permissions: perms })
      toast.success('Role updated successfully')
    } else {
      await roleApi.create({ name, description: form.value.description, permissions: perms })
      toast.success('Role created successfully')
    }
    closePanel()
    await load()
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to save role')
  } finally {
    saving.value = false
  }
}

async function confirmDeleteRole(row: RoleItem) {
  if (!await dialog('Delete', `Delete role "${row.name}"?`)) return
  try {
    await roleApi.remove(row.id)
    if (activeRoleId.value === row.id) closePanel()
    await load()
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Cannot delete this role')
  }
}

// ── Toggle all permissions in a group ─────────────────────────────────
function toggleGroup(group: { permissions: { id: number }[] }) {
  const ids = group.permissions.map(p => p.id)
  const allChecked = ids.every(id => form.value.permissions.includes(id))
  if (allChecked) {
    form.value.permissions = form.value.permissions.filter(id => !ids.includes(id))
  } else {
    const existing = new Set(form.value.permissions)
    ids.forEach(id => existing.add(id))
    form.value.permissions = Array.from(existing)
  }
}

function groupAllChecked(group: { permissions: { id: number }[] }) {
  return group.permissions.every(p => form.value.permissions.includes(p.id))
}

function groupPartialChecked(group: { permissions: { id: number }[] }) {
  const ids = group.permissions.map(p => p.id)
  const checked = ids.filter(id => form.value.permissions.includes(id))
  return checked.length > 0 && checked.length < ids.length
}

// ── Assign users modal ────────────────────────────────────────────────
const showAssignModal = ref(false)
const assignLoading   = ref(false)
const selectedRole    = ref<RoleItem | null>(null)
const assignedUsers   = ref<{ id: string; name: string; email: string }[]>([])

const empSearch    = ref('')
const empResults   = ref<{ id: string; name: string; email: string }[]>([])
const empSearching = ref(false)
let   empTimer: number | undefined

async function openAssignModal(role: RoleItem) {
  selectedRole.value = role
  empSearch.value = ''
  empResults.value = []
  showAssignModal.value = true
  await loadAssignedUsers()
}

async function loadAssignedUsers() {
  if (!selectedRole.value) return
  assignLoading.value = true
  try {
    const { data } = await roleApi.users(selectedRole.value.id, { per_page: 100 })
    const rows = Array.isArray(data) ? data : data.data || []
    assignedUsers.value = rows.map((u: any) => ({ id: u.id, name: u.name, email: u.email }))
  } finally {
    assignLoading.value = false
  }
}

function onEmpSearch() {
  if (empTimer) window.clearTimeout(empTimer)
  if (!empSearch.value.trim()) { empResults.value = []; return }
  empTimer = window.setTimeout(searchEmployees, 300)
}

async function searchEmployees() {
  empSearching.value = true
  try {
    const { data } = await api.get('/employees', { params: { search: empSearch.value, per_page: 20 } })
    const rows = Array.isArray(data) ? data : data.data || []
    const assignedIds = new Set(assignedUsers.value.map(u => String(u.id)))
    empResults.value = rows
      .filter((e: any) => !assignedIds.has(String(e.user_id || e.id)))
      .map((e: any) => ({ id: String(e.user_id || e.id), name: `${e.first_name} ${e.last_name}`.trim(), email: e.email }))
  } finally {
    empSearching.value = false
  }
}

async function attachUser(emp: { id: string; name: string; email: string }) {
  if (!selectedRole.value) return
  await roleApi.assignUsers(selectedRole.value.id, { attach: [Number(emp.id)] })
  empSearch.value = ''
  empResults.value = []
  await loadAssignedUsers()
  await load()
}

async function detachUser(uid: string) {
  if (!selectedRole.value) return
  await roleApi.assignUsers(selectedRole.value.id, { detach: [Number(uid)] })
  await loadAssignedUsers()
  await load()
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'
}

onMounted(() => Promise.all([load(), loadPermissionsOnce()]))
</script>

<template>
  <div class="rp-page">

    <!-- Header -->
    <div class="rp-header">
      <p class="rp-sub">Manage roles and control what each role can access.</p>
      <div class="rp-header-right">
        <div class="rp-search-wrap">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" class="rp-search-icon">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
            <path d="M14 14l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Search roles…" class="rp-search" @input="onSearch" />
        </div>
        <button class="btn-primary" @click="openCreate">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
          </svg>
          New Role
        </button>
      </div>
    </div>

    <!-- Master-detail layout -->
    <div class="rp-layout" :class="{ 'panel-open': panelMode !== 'none' }">

      <!-- Left: roles list -->
      <div class="rp-list-col">
        <div class="rp-card">
          <div class="rp-table-wrap">
            <table class="rp-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Users</th>
                  <th>Permissions</th>
                  <th v-if="panelMode === 'none'">Created</th>
                  <th class="th-actions"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td :colspan="panelMode === 'none' ? 5 : 4" class="td-state"><span class="spinner" /> Loading…</td>
                </tr>
                <tr v-else-if="filteredItems.length === 0">
                  <td :colspan="panelMode === 'none' ? 5 : 4" class="td-state">No roles found.</td>
                </tr>
                <tr
                  v-else
                  v-for="row in filteredItems"
                  :key="row.id"
                  class="rp-row"
                  :class="{ 'rp-row-active': activeRoleId === row.id }"
                >
                  <td>
                    <div class="role-cell">
                      <div class="role-icon">{{ initials(formatRoleName(row.name)) }}</div>
                      <span class="role-name">{{ formatRoleName(row.name) }}</span>
                    </div>
                  </td>
                  <td><span class="count-pill">{{ row.users_count }}</span></td>
                  <td><span class="count-pill accent">{{ row.permissions_count }}</span></td>
                  <td v-if="panelMode === 'none'" class="td-dim">{{ fmtDate(row.created_at) }}</td>
                  <td class="td-actions">
                    <div class="action-row">
                      <button class="act-btn act-assign" @click="openAssignModal(row)" title="Assign users">
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                        </svg>
                        <span v-if="panelMode === 'none'">Users</span>
                      </button>
                      <button class="act-btn act-edit" @click="openEdit(row)" title="Edit role">
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                        <span v-if="panelMode === 'none'">Edit</span>
                      </button>
                      <button class="act-btn act-delete" @click="confirmDeleteRole(row)" title="Delete">
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="rp-pagination">
            <span class="pg-info">Showing {{ total === 0 ? 0 : (page-1)*perPage+1 }}–{{ Math.min(page*perPage, total) }} of {{ total }}</span>
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

      <!-- Right: inline edit / create panel -->
      <Transition name="slide-panel">
        <div v-if="panelMode !== 'none'" class="rp-panel">
          <!-- Panel header -->
          <div class="panel-head">
            <div class="panel-head-info">
              <div class="panel-icon">
                <svg v-if="panelMode === 'create'" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
              </div>
              <h3 class="panel-title">{{ panelMode === 'create' ? 'New Role' : `Edit — ${form.name}` }}</h3>
            </div>
            <button class="panel-close" @click="closePanel" title="Close">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <!-- Loading state -->
          <div v-if="panelLoading" class="panel-loading">
            <span class="spinner spinner-lg" /> Loading role…
          </div>

          <template v-else>
            <!-- Role details section -->
            <div class="panel-section">
              <div class="panel-section-title">Role Details</div>
              <div class="field">
                <label class="field-label">Role name</label>
                <input v-model="form.name" type="text" class="field-input" placeholder="e.g. HR Manager" />
                <span v-if="form.name" class="field-hint">Stored as: <code>{{ toSnakeCase(form.name) }}</code></span>
              </div>
              <div class="field">
                <label class="field-label">Description <span class="field-optional">optional</span></label>
                <input v-model="form.description" type="text" class="field-input" placeholder="Describe this role…" />
              </div>
              <div v-if="hiddenCount > 0 && !isSuper" class="warn-box">
                {{ hiddenCount }} permission(s) from restricted modules are hidden.
              </div>
            </div>

            <!-- Permissions section -->
            <div class="panel-section panel-section-perms">
              <div class="panel-section-title">
                Permissions
                <span class="perm-count-badge">{{ form.permissions.length }} selected</span>
              </div>

              <div class="perm-scroll">
                <div v-if="!groupedPermissions.length" class="perm-empty">No permissions available for your active modules.</div>
                <div v-else v-for="group in groupedPermissions" :key="group.module" class="perm-group">
                  <div class="perm-group-head">
                    <label class="perm-group-check-label">
                      <input
                        type="checkbox"
                        class="perm-check"
                        :checked="groupAllChecked(group)"
                        :indeterminate="groupPartialChecked(group)"
                        @change="toggleGroup(group)"
                      />
                      <span>{{ group.module.replace(/-/g, ' ') }}</span>
                    </label>
                  </div>
                  <div class="perm-items">
                    <label v-for="p in group.permissions" :key="p.id" class="perm-item">
                      <input type="checkbox" :value="p.id" v-model="form.permissions" class="perm-check" />
                      <span>{{ p.action }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Panel footer -->
            <div class="panel-footer">
              <button class="btn-ghost" @click="closePanel">Cancel</button>
              <button class="btn-primary" :disabled="saving || !form.name.trim()" @click="saveRole">
                <span v-if="saving" class="spinner" />
                {{ saving ? 'Saving…' : panelMode === 'create' ? 'Create Role' : 'Save Changes' }}
              </button>
            </div>
          </template>
        </div>
      </Transition>
    </div>

    <!-- ── Assign Users Modal ─────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
        <div class="modal-card">
          <div class="modal-head">
            <h3 class="modal-title">Assign Users — <span class="modal-title-role">{{ selectedRole?.name }}</span></h3>
            <button class="modal-close" @click="showAssignModal = false">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="assign-search-wrap">
              <input
                v-model="empSearch"
                type="text"
                class="field-input"
                placeholder="Search employee by name or email…"
                @input="onEmpSearch"
              />
              <div v-if="empSearching" class="assign-state"><span class="spinner" /> Searching…</div>
              <div v-else-if="empSearch && empResults.length === 0 && !empSearching" class="assign-state">No employees found.</div>
              <div v-if="empResults.length" class="assign-results">
                <div v-for="e in empResults" :key="e.id" class="assign-result-row" @click="attachUser(e)">
                  <div class="assign-avatar">{{ initials(e.name) }}</div>
                  <div class="assign-info">
                    <div class="assign-name">{{ e.name }}</div>
                    <div class="assign-email">{{ e.email }}</div>
                  </div>
                  <span class="assign-add-badge">+ Add</span>
                </div>
              </div>
            </div>

            <div class="assign-list-head">Assigned Users ({{ assignedUsers.length }})</div>
            <div class="assign-list">
              <div v-if="assignLoading" class="assign-state"><span class="spinner" /> Loading…</div>
              <div v-else-if="!assignedUsers.length" class="assign-state">No users assigned yet.</div>
              <div v-else v-for="u in assignedUsers" :key="u.id" class="assign-row">
                <div class="assign-avatar">{{ initials(u.name) }}</div>
                <div class="assign-info">
                  <div class="assign-name">{{ u.name }}</div>
                  <div class="assign-email">{{ u.email }}</div>
                </div>
                <button class="act-btn act-delete" style="margin-left:auto" @click="detachUser(u.id)">Remove</button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-ghost" @click="showAssignModal = false">Close</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.rp-page { display: flex; flex-direction: column; gap: 20px; }

/* Header */
.rp-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.rp-sub    { font-size: 13px; color: var(--muted); }
.rp-header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* Search */
.rp-search-wrap { position: relative; display: flex; align-items: center; }
.rp-search-icon { position: absolute; left: 10px; color: var(--muted); pointer-events: none; }
.rp-search {
  height: 36px; padding: 0 12px 0 32px; font-size: 13px; width: 220px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  border-radius: 8px; color: var(--text); outline: none; transition: border-color .15s;
}
.rp-search::placeholder { color: var(--muted); }
.rp-search:focus { border-color: var(--accent); }

/* Master-detail layout */
.rp-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}
.rp-layout.panel-open {
  grid-template-columns: 1fr 400px;
}

/* List column */
.rp-list-col { min-width: 0; }

/* Card */
.rp-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.rp-table-wrap { overflow-x: auto; }

/* Table */
.rp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rp-table thead tr { background: var(--surface2); border-bottom: 1px solid var(--border-hi); }
.rp-table th {
  padding: 11px 16px; text-align: left;
  font-size: 11px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap;
}
.th-actions { width: 130px; }
.rp-row { border-bottom: 1px solid var(--border); transition: background .12s; }
.rp-row:last-child { border-bottom: none; }
.rp-row:hover { background: var(--surface2); }
.rp-row-active { background: rgba(79,126,255,.06) !important; border-left: 2px solid var(--accent); }
.rp-table td { padding: 11px 16px; color: var(--text); vertical-align: middle; }
.td-state   { padding: 40px 16px; text-align: center; color: var(--muted); }
.td-dim     { color: var(--dim); font-size: 13px; }
.td-actions { padding-right: 12px; }

/* Role cell */
.role-cell { display: flex; align-items: center; gap: 10px; }
.role-icon {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  display: grid; place-items: center;
  font-size: 11px; font-weight: 700; color: #fff;
}
.role-name { font-weight: 500; color: var(--text); }

/* Count pills */
.count-pill {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 28px; padding: 2px 8px; border-radius: 20px; font-size: 12px; font-weight: 600;
  background: var(--surface3); border: 1px solid var(--border-hi); color: var(--dim);
}
.count-pill.accent { color: var(--accent); border-color: rgba(79,126,255,.3); background: rgba(79,126,255,.08); }

/* Action buttons */
.action-row { display: flex; align-items: center; gap: 5px; }
.act-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 500;
  border: 1px solid; cursor: pointer; background: none; transition: opacity .15s, transform .1s;
}
.act-btn:hover { opacity: .85; transform: translateY(-1px); }
.act-assign { color: var(--accent);  border-color: rgba(79,126,255,.4); }
.act-assign:hover { background: rgba(79,126,255,.1) !important; }
.act-edit   { color: var(--dim);    border-color: var(--border-hi); }
.act-edit:hover   { color: var(--text); background: var(--surface2) !important; }
.act-delete { color: var(--red);    border-color: rgba(255,107,107,.3); }
.act-delete:hover { background: rgba(255,107,107,.1) !important; }

/* Spinner */
.spinner {
  display: inline-block; width: 13px; height: 13px; vertical-align: middle; margin-right: 5px;
  border: 2px solid rgba(255,255,255,.12); border-top-color: var(--accent);
  border-radius: 50%; animation: spin .7s linear infinite;
}
.spinner-lg { width: 18px; height: 18px; margin-right: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Pagination */
.rp-pagination {
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

/* ── Inline panel ─────────────────────────────────────────────────── */
.rp-panel {
  background: var(--surface);
  border: 1px solid var(--border-hi);
  border-radius: var(--r);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 120px);
}

.panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.panel-head-info { display: flex; align-items: center; gap: 10px; }
.panel-icon {
  width: 28px; height: 28px; border-radius: 7px; flex-shrink: 0;
  background: rgba(79,126,255,.15); border: 1px solid rgba(79,126,255,.3);
  display: grid; place-items: center; color: var(--accent);
}
.panel-title { font-size: 14px; font-weight: 600; color: var(--text); }
.panel-close {
  width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center;
  background: var(--surface2); border: 1px solid var(--border-hi); color: var(--muted); cursor: pointer;
  transition: color .12s;
}
.panel-close:hover { color: var(--text); }

.panel-loading {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: var(--muted); font-size: 13px; padding: 40px;
}

.panel-section {
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}
.panel-section-perms {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-bottom: none;
}
.panel-section-title {
  font-size: 11px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.6px;
  display: flex; align-items: center; gap: 8px;
}
.perm-count-badge {
  font-size: 10px; font-weight: 600; text-transform: none; letter-spacing: 0;
  color: var(--accent); background: rgba(79,126,255,.1); border: 1px solid rgba(79,126,255,.25);
  padding: 1px 7px; border-radius: 20px;
}

/* Fields */
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.field-optional { font-weight: 400; text-transform: none; font-size: 10px; color: var(--dim); }
.field-hint { font-size: 11px; color: var(--muted); margin-top: 2px; }
.field-hint code { font-family: monospace; color: var(--accent); font-size: 11px; }
.field-input {
  height: 36px; padding: 0 10px; font-size: 13px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  border-radius: 8px; color: var(--text); outline: none; transition: border-color .15s;
}
.field-input::placeholder { color: var(--muted); }
.field-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,126,255,.12); }

/* Warn box */
.warn-box {
  padding: 8px 12px; border-radius: 8px; font-size: 12px;
  background: rgba(249,168,37,.08); border: 1px solid rgba(249,168,37,.3); color: var(--yellow);
}

/* Permissions */
.perm-scroll {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-bottom: 4px;
}
.perm-group + .perm-group { margin-top: 8px; }
.perm-group { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.perm-group-head {
  padding: 7px 12px;
  background: var(--surface3); border-bottom: 1px solid var(--border);
}
.perm-group-check-label {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  font-size: 11px; font-weight: 600; color: var(--dim);
  text-transform: capitalize; letter-spacing: 0.4px;
  user-select: none;
}
.perm-group-check-label:hover { color: var(--text); }
.perm-items { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; padding: 8px 12px; }
.perm-item {
  display: flex; align-items: center; gap: 6px; font-size: 12px;
  color: var(--dim); cursor: pointer; padding: 4px 5px; border-radius: 4px;
  transition: color .12s, background .12s; user-select: none;
}
.perm-item:hover { color: var(--text); background: rgba(255,255,255,.04); }
.perm-check { accent-color: var(--accent); width: 13px; height: 13px; cursor: pointer; flex-shrink: 0; }
.perm-empty { padding: 20px; text-align: center; color: var(--muted); font-size: 13px; }

/* Panel footer */
.panel-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 18px; border-top: 1px solid var(--border); flex-shrink: 0;
}

/* Assign users modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,.7); backdrop-filter: blur(3px);
  display: grid; place-items: center; padding: 20px;
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; border-bottom: 1px solid var(--border);
}
.modal-title { font-size: 15px; font-weight: 600; color: var(--text); }
.modal-title-role { color: var(--accent); }
.modal-close {
  width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center;
  background: var(--surface2); border: 1px solid var(--border-hi); color: var(--muted); cursor: pointer;
}
.modal-close:hover { color: var(--text); }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 24px; border-top: 1px solid var(--border);
}
.modal-card {
  background: var(--surface); border: 1px solid var(--border-hi);
  border-radius: var(--r); width: 100%; max-width: 500px;
  display: flex; flex-direction: column; max-height: 85vh;
  animation: fadeUp .2s ease;
}
.modal-body { padding: 20px 24px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.assign-search-wrap { display: flex; flex-direction: column; gap: 6px; }
.assign-results {
  border: 1px solid var(--border-hi); border-radius: 8px; overflow: hidden;
  max-height: 180px; overflow-y: auto;
}
.assign-result-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  cursor: pointer; transition: background .12s;
}
.assign-result-row:hover { background: var(--surface2); }
.assign-result-row + .assign-result-row { border-top: 1px solid var(--border); }
.assign-add-badge {
  margin-left: auto; font-size: 11px; font-weight: 600; color: var(--accent);
  background: rgba(79,126,255,.1); border: 1px solid rgba(79,126,255,.25);
  padding: 2px 8px; border-radius: 20px; white-space: nowrap;
}
.assign-list-head { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.assign-list { display: flex; flex-direction: column; gap: 2px; }
.assign-state { padding: 16px; text-align: center; color: var(--muted); font-size: 13px; }
.assign-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px; background: var(--surface2); border: 1px solid var(--border);
}
.assign-avatar {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  display: grid; place-items: center;
  font-size: 11px; font-weight: 700; color: #fff;
}
.assign-name  { font-size: 13px; font-weight: 500; color: var(--text); }
.assign-email { font-size: 11px; color: var(--muted); }

/* Shared buttons */
.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
  background: var(--accent); color: #fff; border: none; cursor: pointer;
  box-shadow: 0 0 14px rgba(79,126,255,.3); transition: all .15s;
}
.btn-primary:hover:not(:disabled) { background: #3d6ee8; }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }
.btn-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500;
  background: var(--surface2); border: 1px solid var(--border-hi); color: var(--dim); cursor: pointer;
}
.btn-ghost:hover { background: var(--surface3); color: var(--text); }

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Panel slide transition */
.slide-panel-enter-active { transition: opacity .2s, transform .2s; }
.slide-panel-leave-active { transition: opacity .15s, transform .15s; }
.slide-panel-enter-from  { opacity: 0; transform: translateX(20px); }
.slide-panel-leave-to    { opacity: 0; transform: translateX(20px); }
</style>
