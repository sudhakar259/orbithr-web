<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api, { roleApi, permissionApi } from '@/services/api'
import { useAuth } from '@/composables/useAuth'

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
const isSuper = computed(() => auth.roles().map(r => String(r).toLowerCase()).includes('super admin'))
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

// ── Role modal ────────────────────────────────────────────────────────
const showRoleModal = ref(false)
const editing       = ref(false)
const saving        = ref(false)
const hiddenCount   = ref(0)
const form = ref<{ id?: number; name: string; description?: string; permissions: number[] }>({
  name: '', description: '', permissions: [],
})

function openCreate() {
  editing.value = false
  form.value = { name: '', description: '', permissions: [] }
  hiddenCount.value = 0
  showRoleModal.value = true
}

async function openEdit(role: RoleItem) {
  editing.value = true
  const { data } = await api.get(`/roles/${role.id}`)
  const permIds: number[] = (data.permissions || []).map((p: any) => p.id)
  form.value = { id: role.id, name: data.name, description: data.description || '', permissions: permIds }
  if (!isSuper.value) {
    const allowed = new Set<number>()
    groupedPermissions.value.forEach(g => (g.permissions || []).forEach((p: any) => allowed.add(p.id)))
    hiddenCount.value = permIds.filter(id => !allowed.has(id)).length
  } else {
    hiddenCount.value = 0
  }
  showRoleModal.value = true
}

async function saveRole() {
  saving.value = true
  try {
    const perms = sanitizePermissionsForSave(form.value.permissions || [])
    if (editing.value && form.value.id) {
      await roleApi.update(form.value.id, { name: form.value.name, description: form.value.description, permissions: perms })
    } else {
      await roleApi.create({ name: form.value.name, description: form.value.description, permissions: perms })
    }
    showRoleModal.value = false
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Failed to save role')
  } finally {
    saving.value = false
  }
}

async function deleteRole(id: number) {
  try {
    await roleApi.remove(id)
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Cannot delete this role')
  }
}

// ── Assign users modal ────────────────────────────────────────────────
const showAssignModal = ref(false)
const assignLoading   = ref(false)
const selectedRole    = ref<RoleItem | null>(null)
const assignedUsers   = ref<{ id: number; name: string; email: string }[]>([])
const addUserIdsText  = ref('')

async function openAssignModal(role: RoleItem) {
  selectedRole.value = role
  showAssignModal.value = true
  await loadAssignedUsers()
}

async function loadAssignedUsers() {
  if (!selectedRole.value) return
  assignLoading.value = true
  try {
    const { data } = await roleApi.users(selectedRole.value.id, { per_page: 50 })
    const rows = Array.isArray(data) ? data : data.data || []
    assignedUsers.value = rows.map((u: any) => ({ id: u.id, name: u.name, email: u.email }))
  } finally {
    assignLoading.value = false
  }
}

async function detachUser(uid: number) {
  if (!selectedRole.value) return
  await roleApi.assignUsers(selectedRole.value.id, { detach: [uid] })
  await loadAssignedUsers()
  await load()
}

async function attachUsers() {
  if (!selectedRole.value) return
  const ids = addUserIdsText.value.split(',').map(s => parseInt(s.trim())).filter(n => Number.isFinite(n))
  if (!ids.length) return
  await roleApi.assignUsers(selectedRole.value.id, { attach: ids })
  addUserIdsText.value = ''
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
      <div>
        <p class="rp-sub">Manage roles and control what each role can access.</p>
      </div>
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

    <!-- Table card -->
    <div class="rp-card">
      <div class="rp-table-wrap">
        <table class="rp-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Users</th>
              <th>Permissions</th>
              <th>Created</th>
              <th class="th-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="td-state"><span class="spinner" /> Loading…</td>
            </tr>
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="5" class="td-state">No roles found.</td>
            </tr>
            <tr v-else v-for="row in filteredItems" :key="row.id" class="rp-row">
              <td>
                <div class="role-cell">
                  <div class="role-icon">{{ initials(row.name) }}</div>
                  <span class="role-name">{{ row.name }}</span>
                </div>
              </td>
              <td>
                <span class="count-pill">{{ row.users_count }}</span>
              </td>
              <td>
                <span class="count-pill accent">{{ row.permissions_count }}</span>
              </td>
              <td class="td-dim">{{ fmtDate(row.created_at) }}</td>
              <td class="td-actions">
                <div class="action-row">
                  <button class="act-btn act-assign" @click="openAssignModal(row)" title="Assign users">
                    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                    Users
                  </button>
                  <button class="act-btn act-edit" @click="openEdit(row)" title="Edit role">
                    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                    </svg>
                    Edit
                  </button>
                  <button class="act-btn act-delete" @click="confirm(`Delete role &quot;${row.name}&quot;?`) && deleteRole(row.id)" title="Delete">
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

    <!-- ── Create / Edit Role Modal ──────────────────────────────── -->
    <Transition name="fade">
      <div v-if="showRoleModal" class="modal-overlay" @click.self="showRoleModal = false">
        <div class="modal-wide">
          <div class="modal-head">
            <h3 class="modal-title">{{ editing ? 'Edit Role' : 'Create Role' }}</h3>
            <button class="modal-close" @click="showRoleModal = false">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>

          <div class="modal-body-grid">
            <!-- Left: name + description -->
            <div class="modal-left">
              <div class="field">
                <label class="field-label">Role name</label>
                <input v-model="form.name" type="text" class="field-input" placeholder="e.g. HR Manager" />
              </div>
              <div class="field">
                <label class="field-label">Description</label>
                <input v-model="form.description" type="text" class="field-input" placeholder="Optional" />
              </div>
              <div v-if="hiddenCount > 0 && !isSuper" class="warn-box">
                {{ hiddenCount }} permission(s) from restricted modules are hidden.
              </div>
            </div>

            <!-- Right: permissions -->
            <div class="modal-right">
              <div class="perm-label">Permissions</div>
              <div class="perm-scroll">
                <div v-for="group in groupedPermissions" :key="group.module" class="perm-group">
                  <div class="perm-group-head">{{ group.module.replaceAll('-', ' ') }}</div>
                  <div class="perm-items">
                    <label v-for="p in group.permissions" :key="p.id" class="perm-item">
                      <input type="checkbox" :value="p.id" v-model="form.permissions" class="perm-check" />
                      <span>{{ p.action }}</span>
                    </label>
                  </div>
                </div>
                <div v-if="!groupedPermissions.length" class="perm-empty">No permissions available.</div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-ghost" @click="showRoleModal = false">Cancel</button>
            <button class="btn-primary" :disabled="saving" @click="saveRole">
              <span v-if="saving" class="spinner" />
              {{ saving ? 'Saving…' : 'Save Role' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

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
            <!-- Add users -->
            <div class="assign-add-row">
              <input v-model="addUserIdsText" type="text" class="field-input" placeholder="User IDs comma-separated, e.g. 12, 34" />
              <button class="btn-primary" style="white-space:nowrap" @click="attachUsers">Add</button>
            </div>

            <!-- User list -->
            <div class="assign-list-head">Linked Users</div>
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
.rp-page { display: flex; flex-direction: column; gap: 24px; }

/* Header */
.rp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.rp-title  { font-size: 22px; font-weight: 700; color: var(--text); }
.rp-sub    { margin-top: 4px; font-size: 13px; color: var(--muted); }
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
.th-actions { width: 180px; }
.rp-row { border-bottom: 1px solid var(--border); transition: background .12s; }
.rp-row:last-child { border-bottom: none; }
.rp-row:hover { background: var(--surface2); }
.rp-table td { padding: 12px 16px; color: var(--text); vertical-align: middle; }
.td-state   { padding: 40px 16px; text-align: center; color: var(--muted); }
.td-dim     { color: var(--dim); font-size: 13px; }
.td-actions { padding-right: 12px; }

/* Role cell */
.role-cell { display: flex; align-items: center; gap: 10px; }
.role-icon {
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
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
.action-row { display: flex; align-items: center; gap: 6px; }
.act-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;
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

/* Modals shared */
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

/* Create/Edit role modal (wide) */
.modal-wide {
  background: var(--surface); border: 1px solid var(--border-hi);
  border-radius: var(--r); width: 100%; max-width: 780px;
  display: flex; flex-direction: column;
  max-height: 90vh; animation: fadeUp .2s ease;
}
.modal-body-grid {
  display: grid; grid-template-columns: 220px 1fr; gap: 0;
  flex: 1; min-height: 0;
}
.modal-left {
  padding: 20px; border-right: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 14px;
}
.modal-right { display: flex; flex-direction: column; min-height: 0; }

/* Fields */
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
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

/* Permissions panel */
.perm-label { padding: 12px 16px 8px; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.perm-scroll { flex: 1; overflow-y: auto; padding: 0 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.perm-group { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.perm-group-head {
  padding: 8px 12px; font-size: 11px; font-weight: 600; color: var(--dim);
  text-transform: capitalize; letter-spacing: 0.4px;
  background: var(--surface3); border-bottom: 1px solid var(--border);
}
.perm-items { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 10px 12px; }
.perm-item {
  display: flex; align-items: center; gap: 6px; font-size: 12px;
  color: var(--dim); cursor: pointer; padding: 3px 4px; border-radius: 4px; text-transform: capitalize;
  transition: color .12s;
}
.perm-item:hover { color: var(--text); }
.perm-check { accent-color: var(--accent); width: 13px; height: 13px; cursor: pointer; flex-shrink: 0; }
.perm-empty { padding: 16px; text-align: center; color: var(--muted); font-size: 13px; }

/* Assign users modal */
.modal-card {
  background: var(--surface); border: 1px solid var(--border-hi);
  border-radius: var(--r); width: 100%; max-width: 500px;
  display: flex; flex-direction: column; max-height: 85vh;
  animation: fadeUp .2s ease;
}
.modal-body { padding: 20px 24px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.assign-add-row { display: flex; gap: 10px; align-items: center; }
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
</style>
