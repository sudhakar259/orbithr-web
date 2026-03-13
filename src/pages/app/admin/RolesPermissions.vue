<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api, { roleApi, permissionApi } from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import DataTable from '@/components/table/DataTable.vue'
import PaginationBar from '@/components/table/PaginationBar.vue'
import SearchInput from '@/components/table/SearchInput.vue'
import MoreBtn from '@/components/MoreBtn.vue'

interface RoleItem {
  id: number
  name: string
  users_count: number
  permissions_count: number
  created_at?: string
}

const loading = ref(false)
const items = ref<RoleItem[]>([])

const page = ref(1)
const perPage = ref(10)
const total = ref(0)
const searchQuery = ref('')
let searchTimer: number | undefined
function onSearchChange() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => { page.value = 1; load() }, 250)
}

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(it => [it.name, String(it.users_count), String(it.permissions_count)].some(v => String(v || '').toLowerCase().includes(q)))
})

function getMenuItems(role: RoleItem) {
  return [
    { label: 'Assign Users', value: 'assign', icon: '👥' },
    { label: 'Edit', value: 'edit', icon: '✏️' },
    { label: 'Delete', value: 'delete', icon: '🗑️', color: 'red' },
  ]
}

async function handleAction(action: string, role: RoleItem) {
  switch (action) {
    case 'assign':
      openAssignModal(role)
      break
    case 'edit':
      openEdit(role)
      break
    case 'delete':
      if (confirm(`Delete role "${role.name}"?`)) await deleteRoleRecord(role.id)
      break
  }
}

async function load() {
  loading.value = true
  try {
    const { data } = await roleApi.list({ page: page.value, per_page: perPage.value, search: searchQuery.value || undefined })
    const normalize = (r: any): RoleItem => ({
      id: r.id,
      name: r.name,
      users_count: r.users_count ?? (Array.isArray(r.users) ? r.users.length : (r.user_count ?? 0)),
      permissions_count: r.permissions_count ?? (Array.isArray(r.permissions) ? r.permissions.length : (r.permission_count ?? 0)),
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

onMounted(async () => { await Promise.all([load(), loadPermissionsOnce()]) })

const columns = [
  { key: 'name', label: 'Role' },
  { key: 'users_count', label: 'Users' },
  { key: 'permissions_count', label: 'Permissions' },
  { key: 'created_at', label: 'Created At' },
  { key: 'actions', label: '', width: '80px', align: 'center' },
] as const satisfies { key: string; label: string; width?: string; align?: 'left'|'right'|'center'; headerClass?: string; cellClass?: string }[]

// Role modal state
const showRoleModal = ref(false)
const editing = ref(false)
const saving = ref(false)
const form = ref<{ id?: number; name: string; description?: string; permissions: number[] }>({ name: '', description: '', permissions: [] })
const groupedPermissions = ref<{ module: string; permissions: { id: number; name: string; action: string }[] }[]>([])
const auth = useAuth()
const isSuper = computed(() => auth.roles().map(r=>String(r).toLowerCase()).includes('super admin'))

async function loadPermissionsOnce() {
  if (groupedPermissions.value.length) return
  const { data } = await permissionApi.grouped()
  const allGroups = Array.isArray(data) ? data : []

  // Modules only super admin can manage
  const superOnly = new Set(['modules', 'plans', 'tenants', 'transactions'])

  // Filter groups for non-super-admins
  groupedPermissions.value = allGroups.filter((g: any) => {
    if (isSuper.value) return true
    const mod = String(g.module || '').toLowerCase()
    return !superOnly.has(mod)
  })
}

// Ensure we don't send forbidden permissions when saving
function sanitizePermissionsForSave(ids: number[]) {
  if (isSuper.value) return ids
  const allowed = new Set<number>()
  groupedPermissions.value.forEach(g => {
    (g.permissions || []).forEach((p: any) => allowed.add(p.id))
  })
  return ids.filter(id => allowed.has(id))
}

function openCreate() {
  editing.value = false
  form.value = { name: '', description: '', permissions: [] }
  showRoleModal.value = true
}

const hiddenPermissionsCount = ref(0)

async function openEdit(role: RoleItem) {
  editing.value = true
  const { data } = await fetchRole(role.id)
  const permIds = (data.permissions || []).map((p: any) => p.id)
  form.value = { id: role.id, name: data.name, description: data.description || '', permissions: permIds }

  // compute hidden permissions if any (non-super admin)
  if (!isSuper.value) {
    const allowed = new Set<number>()
    groupedPermissions.value.forEach(g => (g.permissions || []).forEach((p:any)=> allowed.add(p.id)))
    hiddenPermissionsCount.value = permIds.filter((id: number) => !allowed.has(id)).length
  } else {
    hiddenPermissionsCount.value = 0
  }

  showRoleModal.value = true
}

async function fetchRole(id: number) {
  const { data } = await api.get(`/roles/${id}`)
  return { data }
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

async function deleteRoleRecord(id: number) {
  try {
    await roleApi.remove(id)
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Cannot delete this role')
  }
}

// Assign Users modal
const showAssignModal = ref(false)
const assignLoading = ref(false)
const selectedRole = ref<RoleItem | null>(null)
const assignedUsers = ref<{ id: number; name: string; email: string }[]>([])
const addUserIdsText = ref('')

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
  const ids = addUserIdsText.value
    .split(',')
    .map(s => parseInt(s.trim()))
    .filter(n => Number.isFinite(n))
  if (!ids.length) return
  await roleApi.assignUsers(selectedRole.value.id, { attach: ids })
  addUserIdsText.value = ''
  await loadAssignedUsers()
  await load()
}
</script>

<template>
  <section class="space-y-6 p-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Roles & Permissions</h1>
        <p class="mt-1 text-slate-600">Manage roles and their permissions.</p>
      </div>
      <div class="flex items-center gap-3">
        <SearchInput v-model="searchQuery" placeholder="Search Roles" class="w-64" @update:modelValue="onSearchChange" />
        <button class="btn-primary rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" @click="openCreate">Create Role</button>
      </div>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredItems"
      row-key="id"
      :loading="loading"
      empty-text="No roles found."
    >
      <template #cell-created_at="{ row }">{{ row.created_at ? new Date(row.created_at).toLocaleString() : '-' }}</template>
      <template #cell-actions="{ row }">
        <MoreBtn
            :menu-list="getMenuItems(row)"
            @select="(action) => handleAction(action, row)"
          />
      </template>
    </DataTable>

    <PaginationBar
      :page="page"
      :per-page="perPage"
      :total="total"
      @update:page="(p:number)=>{ page = p; load() }"
      @update:perPage="(pp:number)=>{ perPage = pp; page = 1; load() }"
    />

    <!-- Create/Edit Role Modal -->
    <div v-if="showRoleModal" class="fixed inset-0 z-50 bg-black/50" @click.self="showRoleModal = false">
      <div class="mx-auto mt-16 w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-slate-900">{{ editing ? 'Edit Role' : 'Create Role' }}</h3>
        <div v-if="hiddenPermissionsCount > 0 && !isSuper" class="mt-2 rounded border-l-4 border-yellow-400 bg-yellow-50 p-3 text-sm text-yellow-800">
          Note: {{ hiddenPermissionsCount }} permission(s) are hidden because they belong to modules only manageable by Super Admin.
        </div>
        <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="md:col-span-1 space-y-3">
            <label class="block text-sm font-medium text-slate-700">Name</label>
            <input v-model="form.name" type="text" class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <label class="block text-sm font-medium text-slate-700">Description</label>
            <input v-model="form.description" type="text" class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div class="md:col-span-2">
            <div class="max-h-[420px] overflow-auto rounded border border-slate-200">
              <div v-for="group in groupedPermissions" :key="group.module" class="border-b border-slate-100">
                <div class="bg-slate-50 px-3 py-2 text-sm font-semibold capitalize text-slate-700">{{ group.module.replaceAll('-', ' ') }}</div>
                <div class="grid grid-cols-2 gap-2 p-3 md:grid-cols-3">
                  <label v-for="p in group.permissions" :key="p.id" class="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" :value="p.id" v-model="form.permissions" />
                    <span class="capitalize">{{ p.action }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button class="rounded border border-slate-300 px-4 py-2 text-slate-700" @click="showRoleModal = false">Cancel</button>
          <button :disabled="saving" class="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50" @click="saveRole">Save</button>
        </div>
      </div>
    </div>

    <!-- Assign Users Modal -->
    <div v-if="showAssignModal" class="fixed inset-0 z-50 bg-black/50" @click.self="showAssignModal = false">
      <div class="mx-auto mt-16 w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
        <h3 class="text-lg font-semibold text-slate-900">Assign Users to {{ selectedRole?.name }}</h3>
        <div class="mt-4">
          <div class="flex items-end gap-3">
            <div class="flex-1">
              <label class="block text-sm font-medium text-slate-700">Add User IDs (comma-separated)</label>
              <input v-model="addUserIdsText" type="text" placeholder="e.g. 12, 34" class="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <button class="rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" @click="attachUsers">Add</button>
          </div>
          <div class="mt-4 rounded border border-slate-200">
            <div class="bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">Linked Users</div>
            <div v-if="assignLoading" class="p-3 text-sm text-slate-500">Loading...</div>
            <ul v-else class="divide-y divide-slate-100">
              <li v-for="u in assignedUsers" :key="u.id" class="flex items-center justify-between px-3 py-2">
                <div>
                  <div class="text-sm font-medium text-slate-900">{{ u.name }}</div>
                  <div class="text-xs text-slate-500">{{ u.email }}</div>
                </div>
                <button class="text-sm text-red-600 hover:underline" @click="detachUser(u.id)">Remove</button>
              </li>
              <li v-if="!assignedUsers.length" class="px-3 py-2 text-sm text-slate-500">No users assigned.</li>
            </ul>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button class="rounded border border-slate-300 px-4 py-2 text-slate-700" @click="showAssignModal = false">Close</button>
        </div>
      </div>
    </div>
  </section>
</template>
