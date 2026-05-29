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

// ── Permission Matrix ─────────────────────────────────────────────────
const activeView      = ref<'roles' | 'matrix'>('roles')
const matrixLoading   = ref(false)
const matrixRoles     = ref<{ id: number; name: string; permIds: Set<number> }[]>([])
const matrixFilter    = ref('')
const savingRoleIds   = ref<Set<number>>(new Set())
const saveTimers      = new Map<number, ReturnType<typeof setTimeout>>()

const filteredGroups = computed(() => {
  const q = matrixFilter.value.toLowerCase().trim()
  if (!q) return groupedPermissions.value
  return groupedPermissions.value
    .map(g => ({
      ...g,
      permissions: g.permissions.filter(
        (p: any) => g.module.toLowerCase().includes(q) || p.action.toLowerCase().includes(q)
      ),
    }))
    .filter(g => g.module.toLowerCase().includes(q) || g.permissions.length > 0)
})

async function loadMatrixData() {
  if (matrixRoles.value.length) return
  matrixLoading.value = true
  try {
    const { data } = await roleApi.list({ per_page: 100 })
    const roleList: any[] = Array.isArray(data) ? data : data.data || []
    const details = await Promise.all(roleList.map((r: any) => api.get(`/roles/${r.id}`).then(res => res.data)))
    matrixRoles.value = details.map((d: any) => ({
      id: d.id,
      name: d.name,
      permIds: new Set<number>((d.permissions || []).map((p: any) => Number(p.id))),
    }))
  } finally {
    matrixLoading.value = false
  }
}

function switchView(v: 'roles' | 'matrix') {
  activeView.value = v
  if (v === 'matrix') Promise.all([loadPermissionsOnce(), loadMatrixData()])
}

function hasPerm(roleIdx: number, permId: number) {
  return matrixRoles.value[roleIdx]?.permIds.has(permId) ?? false
}

function toggleMatrixPerm(roleIdx: number, permId: number) {
  const role = matrixRoles.value[roleIdx]
  if (!role) return
  const next = new Set(role.permIds)
  if (next.has(permId)) next.delete(permId)
  else next.add(permId)
  matrixRoles.value = matrixRoles.value.map((r, i) => i === roleIdx ? { ...r, permIds: next } : r)
  scheduleSave(role.id, roleIdx)
}

function scheduleSave(roleId: number, roleIdx: number) {
  if (saveTimers.has(roleId)) clearTimeout(saveTimers.get(roleId)!)
  saveTimers.set(roleId, setTimeout(async () => {
    saveTimers.delete(roleId)
    const role = matrixRoles.value[roleIdx]
    if (!role) return
    savingRoleIds.value = new Set([...savingRoleIds.value, roleId])
    try {
      const perms = sanitizePermissionsForSave(Array.from(role.permIds))
      await roleApi.update(roleId, { permissions: perms })
      toast.success(`${formatRoleName(role.name)} saved`)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save')
    } finally {
      const s = new Set(savingRoleIds.value)
      s.delete(roleId)
      savingRoleIds.value = s
    }
  }, 800))
}

onMounted(() => Promise.all([load(), loadPermissionsOnce()]))
</script>

<template>
  <div class="rp-page">

    <!-- Page header (eyebrow + title + subtitle, JSX style) -->
    <div class="page-header">
      <div class="page-header-text">
        <div class="eyebrow">
          {{ items.length }} role{{ items.length === 1 ? '' : 's' }} ·
          {{ items.reduce((s, r) => s + r.users_count, 0) }} users ·
          {{ groupedPermissions.length }} modules
        </div>
        <h1 class="page-title">Roles &amp; access</h1>
        <p class="page-subtitle">Define what each persona can see and do across the platform.</p>
      </div>
      <div class="page-header-actions">
        <div class="rp-view-tabs">
          <button :class="['rp-view-tab', activeView === 'roles' ? 'rp-view-tab-active' : '']" @click="switchView('roles')">Roles</button>
          <button :class="['rp-view-tab', activeView === 'matrix' ? 'rp-view-tab-active' : '']" @click="switchView('matrix')">Matrix</button>
        </div>
        <div class="rp-search-wrap">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" class="rp-search-icon">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
            <path d="M14 14l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <input v-model="searchQuery" type="text" placeholder="Search roles…" class="rp-search" @input="onSearch" />
        </div>
        <button class="btn-primary" @click="openCreate">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
          </svg>
          New role
        </button>
      </div>
    </div>

    <!-- Permission Matrix View -->
    <div v-if="activeView === 'matrix'" class="mx-card">
      <div class="mx-toolbar">
        <div class="mx-toolbar-title">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L3 5v5c0 4 3 7 7 8 4-1 7-4 7-8V5l-7-3z" stroke="#F38288" stroke-width="1.6" stroke-linejoin="round"/>
          </svg>
          <span>Permission matrix</span>
        </div>
        <input v-model="matrixFilter" type="text" placeholder="Filter by module or permission…" class="mx-filter" />
        <span class="mx-hint">Click a cell to toggle. Auto-saves after 0.8s.</span>
      </div>
      <div v-if="matrixLoading" class="mx-state">
        <span class="spinner spinner-lg" /> Loading matrix…
      </div>
      <div v-else-if="!matrixRoles.length" class="mx-state">No roles found.</div>
      <div v-else class="mx-scroll">
        <table class="mx-table">
          <thead>
            <tr>
              <th class="mx-th-perm">Module · op</th>
              <th v-for="r in matrixRoles" :key="r.id" class="mx-th-role">
                <div class="mx-role-head">
                  <div class="role-icon role-icon-sm">{{ initials(formatRoleName(r.name)) }}</div>
                  <span>{{ formatRoleName(r.name) }}</span>
                  <span v-if="savingRoleIds.has(r.id)" class="mx-saving">saving…</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in filteredGroups" :key="group.module">
              <tr class="mx-group-row">
                <td :colspan="matrixRoles.length + 1" class="mx-group-label">{{ group.module.replace(/-/g, ' ') }}</td>
              </tr>
              <tr v-for="perm in group.permissions" :key="perm.id" class="mx-perm-row">
                <td class="mx-perm-name">
                  <span class="mx-perm-label">{{ perm.action }}</span>
                  <code class="mx-perm-code">{{ perm.name }}</code>
                </td>
                <td v-for="(r, rIdx) in matrixRoles" :key="r.id" class="mx-cell" @click="toggleMatrixPerm(rIdx, perm.id)">
                  <span :class="['mx-pill', hasPerm(rIdx, perm.id) ? 'mx-pill-on' : 'mx-pill-off']">
                    <svg v-if="hasPerm(rIdx, perm.id)" width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg v-else width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                    {{ hasPerm(rIdx, perm.id) ? 'Full' : 'None' }}
                  </span>
                </td>
              </tr>
            </template>
            <tr v-if="!filteredGroups.length || filteredGroups.every(g => !g.permissions.length)">
              <td :colspan="matrixRoles.length + 1" class="mx-state">No permissions match your filter.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Audit footer -->
      <div class="mx-audit">
        <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L3 5v5c0 4 3 7 7 8 4-1 7-4 7-8V5l-7-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
        <span>Click cells to toggle role permissions</span>
        <span class="mx-audit-sep">·</span>
        <span>Changes auto-save</span>
        <div class="mx-audit-spacer"></div>
        <span>SOC 2 audit trail · 24-month retention</span>
      </div>
    </div>

    <!-- Master-detail layout (Roles list view) -->
    <div v-if="activeView === 'roles'" class="rp-layout" :class="{ 'panel-open': panelMode !== 'none' }">

      <!-- Left: roles list (sidebar style from JSX) -->
      <div class="rp-list-col">
        <div class="rp-card">
          <div class="rp-card-head">
            <div class="rp-card-eyebrow">Roles</div>
          </div>

          <div class="rp-table-wrap">
            <table class="rp-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Users</th>
                  <th>Perms</th>
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
                      <span class="role-dot"></span>
                      <div class="role-info">
                        <span class="role-name">{{ formatRoleName(row.name) }}</span>
                      </div>
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
              <h3 class="panel-title">{{ panelMode === 'create' ? 'New role' : `Edit — ${form.name}` }}</h3>
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
              <div class="panel-section-title">Role details</div>
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
                {{ saving ? 'Saving…' : panelMode === 'create' ? 'Create role' : 'Save changes' }}
              </button>
            </div>
          </template>
        </div>
      </Transition>
    </div>

    <!-- ── Assign Users Modal ─────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
          <div class="modal-card">
            <div class="modal-head">
              <h3 class="modal-title">Assign users — <span class="modal-title-role">{{ selectedRole ? formatRoleName(selectedRole.name) : '' }}</span></h3>
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

              <div class="assign-list-head">Assigned users ({{ assignedUsers.length }})</div>
              <div class="assign-list">
                <div v-if="assignLoading" class="assign-state"><span class="spinner" /> Loading…</div>
                <div v-else-if="!assignedUsers.length" class="assign-state">No users assigned yet.</div>
                <div v-else v-for="u in assignedUsers" :key="u.id" class="assign-row">
                  <div class="assign-avatar">{{ initials(u.name) }}</div>
                  <div class="assign-info">
                    <div class="assign-name">{{ u.name }}</div>
                    <div class="assign-email">{{ u.email }}</div>
                  </div>
                  <button class="act-btn act-delete assign-remove" @click="detachUser(u.id)">Remove</button>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-ghost" @click="showAssignModal = false">Close</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Design tokens ─────────────────────────────────────── */
.rp-page {
  --bg: #0D0F17;
  --surface: #161A23;
  --surface2: #1C2030;
  --surface3: #222840;
  --border: #232936;
  --border-hi: #2D3447;
  --text: #EEF0F4;
  --muted: #7A8299;
  --dim: #B6BCCC;
  --accent: #6B5BFF;
  --accent-soft: rgba(107, 91, 255, 0.16);
  --accent-soft-hi: rgba(107, 91, 255, 0.28);
  --green: #4DD39A;
  --red: #F38288;
  --yellow: #F5A623;
  --r: 12px;
  --rs: 8px;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text);
}

/* ── Page header ───────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.page-header-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.eyebrow {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.page-title {
  font-family: var(--font-serif);
  font-size: 34px;
  line-height: 1.1;
  font-weight: 400;
  color: var(--text);
  letter-spacing: -0.01em;
}
.page-subtitle { font-size: 13px; color: var(--muted); max-width: 540px; }
.page-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* View tabs */
.rp-view-tabs {
  display: flex;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  padding: 3px;
}
.rp-view-tab {
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.rp-view-tab:hover { color: var(--text); }
.rp-view-tab-active {
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border-hi);
}

/* Search */
.rp-search-wrap { position: relative; display: flex; align-items: center; }
.rp-search-icon { position: absolute; left: 10px; color: var(--muted); pointer-events: none; }
.rp-search {
  height: 34px;
  padding: 0 12px 0 32px;
  font-size: 13px;
  width: 220px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}
.rp-search::placeholder { color: var(--muted); }
.rp-search:focus { border-color: var(--accent); }

/* ── Master-detail layout ──────────────────────────────── */
.rp-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}
.rp-layout.panel-open { grid-template-columns: 1fr 420px; }
.rp-list-col { min-width: 0; }

/* ── Card ──────────────────────────────────────────────── */
.rp-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}
.rp-card-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}
.rp-card-eyebrow {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.rp-table-wrap { overflow-x: auto; }

/* ── Table ─────────────────────────────────────────────── */
.rp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rp-table thead tr {
  background: var(--surface2);
  border-bottom: 1px solid var(--border-hi);
}
.rp-table th {
  padding: 11px 16px;
  text-align: left;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}
.th-actions { width: 130px; }
.rp-row { border-bottom: 1px solid var(--border); transition: background 0.12s; }
.rp-row:last-child { border-bottom: none; }
.rp-row:hover { background: var(--surface2); }
.rp-row-active {
  background: var(--accent-soft) !important;
  border-left: 3px solid var(--accent);
}
.rp-table td { padding: 12px 16px; color: var(--text); vertical-align: middle; }
.td-state { padding: 40px 16px; text-align: center; color: var(--muted); }
.td-dim {
  color: var(--muted);
  font-size: 12px;
  font-family: var(--font-mono);
}
.td-actions { padding-right: 12px; }

/* Role cell */
.role-cell { display: flex; align-items: center; gap: 10px; }
.role-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: var(--accent);
  flex-shrink: 0;
}
.role-info { min-width: 0; }
.role-name { font-weight: 500; color: var(--text); font-size: 12.5px; }

.role-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), #8B7BFF);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}
.role-icon-sm {
  width: 22px;
  height: 22px;
  font-size: 9px;
  margin: 0 auto 3px;
}

/* Count pills */
.count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono);
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--dim);
}
.count-pill.accent {
  color: var(--accent);
  border-color: var(--accent-soft-hi);
  background: var(--accent-soft);
}

/* Action buttons */
.action-row { display: flex; align-items: center; gap: 5px; }
.act-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid;
  cursor: pointer;
  background: none;
  transition: opacity 0.15s, transform 0.1s, background 0.15s;
}
.act-btn:hover { opacity: 0.92; transform: translateY(-1px); }
.act-assign { color: var(--accent); border-color: var(--accent-soft-hi); }
.act-assign:hover { background: var(--accent-soft); }
.act-edit { color: var(--dim); border-color: var(--border-hi); }
.act-edit:hover { color: var(--text); background: var(--surface2); }
.act-delete { color: var(--red); border-color: rgba(243, 130, 136, 0.3); }
.act-delete:hover { background: rgba(243, 130, 136, 0.1); }

/* Spinner */
.spinner {
  display: inline-block;
  width: 13px;
  height: 13px;
  vertical-align: middle;
  margin-right: 5px;
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.spinner-lg { width: 18px; height: 18px; margin-right: 8px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Pagination */
.rp-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface2);
  flex-wrap: wrap;
  gap: 8px;
}
.pg-info { font-size: 11px; color: var(--muted); font-family: var(--font-mono); }
.pg-controls { display: flex; align-items: center; gap: 8px; }
.pg-select {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--dim);
  cursor: pointer;
  outline: none;
}
.pg-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  font-size: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--dim);
  cursor: pointer;
  transition: all 0.15s;
}
.pg-btn:not(:disabled):hover {
  background: var(--surface3);
  color: var(--text);
  border-color: var(--accent);
}
.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-current {
  font-size: 12px;
  color: var(--dim);
  min-width: 50px;
  text-align: center;
  font-family: var(--font-mono);
}

/* ── Inline panel ──────────────────────────────────────── */
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.panel-head-info { display: flex; align-items: center; gap: 10px; }
.panel-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  flex-shrink: 0;
  background: var(--accent-soft);
  border: 1px solid var(--accent-soft-hi);
  display: grid;
  place-items: center;
  color: var(--accent);
}
.panel-title { font-size: 14px; font-weight: 600; color: var(--text); }
.panel-close {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--muted);
  cursor: pointer;
  transition: color 0.12s;
}
.panel-close:hover { color: var(--text); }

.panel-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 13px;
  padding: 40px;
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
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: flex;
  align-items: center;
  gap: 8px;
}
.perm-count-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  font-family: var(--font-mono);
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-soft-hi);
  padding: 1px 8px;
  border-radius: 20px;
}

/* Fields */
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.field-optional {
  font-weight: 400;
  text-transform: none;
  font-size: 10px;
  color: var(--dim);
}
.field-hint { font-size: 11px; color: var(--muted); margin-top: 2px; }
.field-hint code {
  font-family: var(--font-mono);
  color: var(--accent);
  font-size: 11px;
}
.field-input {
  height: 36px;
  padding: 0 12px;
  font-size: 13px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field-input::placeholder { color: var(--muted); }
.field-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

/* Warn box */
.warn-box {
  padding: 9px 12px;
  border-radius: var(--rs);
  font-size: 12px;
  background: rgba(245, 166, 35, 0.08);
  border: 1px solid rgba(245, 166, 35, 0.3);
  color: var(--yellow);
}

/* Permissions */
.perm-scroll {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-bottom: 4px;
}
.perm-group + .perm-group { margin-top: 8px; }
.perm-group {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  overflow: hidden;
}
.perm-group-head {
  padding: 8px 12px;
  background: var(--surface3);
  border-bottom: 1px solid var(--border);
}
.perm-group-check-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: var(--dim);
  text-transform: capitalize;
  letter-spacing: 0.04em;
  user-select: none;
}
.perm-group-check-label:hover { color: var(--text); }
.perm-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2px;
  padding: 8px 12px;
}
.perm-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--dim);
  cursor: pointer;
  padding: 4px 5px;
  border-radius: 4px;
  transition: color 0.12s, background 0.12s;
  user-select: none;
}
.perm-item:hover { color: var(--text); background: rgba(255, 255, 255, 0.04); }
.perm-check {
  accent-color: var(--accent);
  width: 13px;
  height: 13px;
  cursor: pointer;
  flex-shrink: 0;
}
.perm-empty {
  padding: 24px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

/* Panel footer */
.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--surface2);
}

/* ── Assign users modal ────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 20px;
}
.modal-card {
  background: var(--surface);
  border: 1px solid var(--border-hi);
  border-radius: var(--r);
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  animation: fadeUp 0.2s ease;
  color: var(--text);
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  border-bottom: 1px solid var(--border);
}
.modal-title { font-size: 14px; font-weight: 600; color: var(--text); }
.modal-title-role { color: var(--accent); }
.modal-close {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--muted);
  cursor: pointer;
}
.modal-close:hover { color: var(--text); }
.modal-body {
  padding: 18px 22px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--border);
  background: var(--surface2);
}

.assign-search-wrap { display: flex; flex-direction: column; gap: 6px; }
.assign-results {
  border: 1px solid var(--border);
  border-radius: var(--rs);
  overflow: hidden;
  max-height: 180px;
  overflow-y: auto;
  background: var(--surface2);
}
.assign-result-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  transition: background 0.12s;
}
.assign-result-row:hover { background: var(--surface3); }
.assign-result-row + .assign-result-row { border-top: 1px solid var(--border); }
.assign-add-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-soft-hi);
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}
.assign-list-head {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.assign-list { display: flex; flex-direction: column; gap: 4px; }
.assign-state {
  padding: 16px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}
.assign-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--rs);
  background: var(--surface2);
  border: 1px solid var(--border);
}
.assign-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), #8B7BFF);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}
.assign-name { font-size: 13px; font-weight: 500; color: var(--text); }
.assign-email { font-size: 11px; color: var(--muted); }
.assign-remove { margin-left: auto; }

/* ── Shared buttons ────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--rs);
  font-size: 12.5px;
  font-weight: 600;
  background: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
  box-shadow: 0 0 14px rgba(107, 91, 255, 0.3);
  transition: all 0.15s;
}
.btn-primary:hover:not(:disabled) { background: #5849EF; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--rs);
  font-size: 12.5px;
  font-weight: 500;
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--dim);
  cursor: pointer;
}
.btn-ghost:hover { background: var(--surface3); color: var(--text); }

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Panel slide transition */
.slide-panel-enter-active { transition: opacity 0.2s, transform 0.2s; }
.slide-panel-leave-active { transition: opacity 0.15s, transform 0.15s; }
.slide-panel-enter-from { opacity: 0; transform: translateX(20px); }
.slide-panel-leave-to { opacity: 0; transform: translateX(20px); }

/* ── Permission Matrix ─────────────────────────────────── */
.mx-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}
.mx-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.mx-toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.mx-filter {
  height: 32px;
  padding: 0 12px;
  font-size: 12.5px;
  width: 240px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}
.mx-filter::placeholder { color: var(--muted); }
.mx-filter:focus { border-color: var(--accent); }
.mx-hint { font-size: 11px; color: var(--muted); margin-left: auto; }
.mx-state {
  padding: 40px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.mx-scroll {
  overflow-x: auto;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
}

.mx-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.mx-th-perm {
  position: sticky;
  left: 0;
  z-index: 2;
  top: 0;
  background: var(--surface2);
  padding: 12px 16px;
  text-align: left;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  border-bottom: 1px solid var(--border-hi);
  min-width: 200px;
}
.mx-th-role {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface2);
  padding: 10px 8px;
  text-align: center;
  border-bottom: 1px solid var(--border-hi);
  border-left: 1px solid var(--border);
  min-width: 88px;
}
.mx-role-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
}
.mx-saving { font-size: 9px; color: var(--accent); font-weight: 500; }

.mx-group-row { background: #11141C; }
.mx-group-label {
  position: sticky;
  left: 0;
  padding: 8px 16px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text);
  text-transform: capitalize;
  letter-spacing: -0.005em;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.mx-perm-row {
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}
.mx-perm-row:hover { background: var(--surface2); }
.mx-perm-row:last-child { border-bottom: none; }
.mx-perm-name {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--surface);
  padding: 10px 16px 10px 28px;
  white-space: nowrap;
}
.mx-perm-row:hover .mx-perm-name { background: var(--surface2); }
.mx-perm-label {
  font-size: 12px;
  color: var(--text);
  display: block;
}
.mx-perm-code {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0;
  display: block;
  margin-top: 1px;
}
.mx-cell {
  padding: 6px;
  border-left: 1px solid var(--border);
  text-align: center;
  cursor: pointer;
}
.mx-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 92%;
  min-height: 28px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  transition: all 0.15s;
  border: 1px solid;
}
.mx-pill-on {
  background: rgba(77, 211, 154, 0.16);
  border-color: rgba(77, 211, 154, 0.4);
  color: var(--green);
}
.mx-pill-off {
  background: var(--surface2);
  border-color: var(--border);
  color: var(--muted);
}
.mx-cell:hover .mx-pill-off {
  border-color: var(--border-hi);
  background: var(--surface3);
  color: var(--dim);
}

/* Audit footer */
.mx-audit {
  padding: 12px 18px;
  background: var(--surface2);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--muted);
  font-family: var(--font-mono);
  flex-wrap: wrap;
}
.mx-audit-sep { color: var(--border-hi); }
.mx-audit-spacer { flex: 1; }

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 1100px) {
  .rp-layout.panel-open { grid-template-columns: 1fr; }
  .rp-panel { position: static; max-height: none; }
}
@media (max-width: 640px) {
  .page-title { font-size: 28px; }
  .rp-search { width: 160px; }
}
</style>
