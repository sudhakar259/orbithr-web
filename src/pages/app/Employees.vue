<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { listEmployees, deleteEmployee } from '@/services/employee'
import SearchInput from '@/components/table/SearchInput.vue'
import MoreBtn from '@/components/MoreBtn.vue'
import BulkActionsBar from '@/components/table/BulkActionsBar.vue'

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

// Selection for bulk actions
const selected = ref<Record<number, boolean>>({})
const selectAll = ref(false)
const selectedCount = computed(() => Object.values(selected.value).filter(Boolean).length)
const selectedIds = computed(() => Object.keys(selected.value).filter(id => selected.value[Number(id)]).map(id => Number(id)))

let searchTimer: number | undefined

function onSearchChange() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    page.value = 1
  }, 250)
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

  if (statusFilter.value) {
    list = list.filter(emp => (emp.status || '') === statusFilter.value)
  }

  if (departmentFilter.value) {
    list = list.filter(emp => (emp.department || emp.team || '') === departmentFilter.value)
  }

  return list
})

const paginatedEmployees = computed(() => {
  const start = (page.value - 1) * perPage.value
  const end = start + perPage.value
  return filteredEmployees.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredEmployees.value.length / perPage.value))

function getMenuItems(emp: Employee) {
  return [
    { label: 'View Profile', value: 'view', icon: '👁️' },
    { label: 'Edit', value: 'edit', icon: '✏️' },
    { label: 'Delete', value: 'delete', icon: '🗑️', color: 'red' },
  ]
}

async function handleAction(action: string, emp: Employee) {
  switch (action) {
    case 'view':
      router.push({ name: 'employee-profile', params: { id: emp.id } })
      break
    case 'edit':
      router.push({ name: 'employee-edit', params: { id: emp.id } })
      break
    case 'delete':
      if (confirm(`Are you sure you want to delete ${emp.first_name} ${emp.last_name}?`)) {
        await deleteEmployeeRecord(emp.id)
      }
      break
  }
}

function toggleRowSelection(emp: Employee) {
  selected.value[emp.id] = !selected.value[emp.id]
  // If any unselected, uncheck selectAll
  if (!selected.value[emp.id]) selectAll.value = false
  // If all visible rows selected, set selectAll
  const allSelected = paginatedEmployees.value.length > 0 && paginatedEmployees.value.every(e => selected.value[e.id])
  if (allSelected) selectAll.value = true
}

function toggleSelectAllVisible() {
  selectAll.value = !selectAll.value
  for (const emp of paginatedEmployees.value) {
    selected.value[emp.id] = selectAll.value
  }
}

async function bulkDelete() {
  if (!selectedCount.value) return
  if (!confirm(`Delete ${selectedCount.value} selected employees? This cannot be undone.`)) return
  loading.value = true
  try {
    for (const id of selectedIds.value) {
      await deleteEmployee(id)
    }
    // reload and clear selection
    await load()
    selected.value = {}
    selectAll.value = false
  } catch (e) {
    console.error('Bulk delete failed', e)
    alert('Failed to delete selected employees')
  } finally {
    loading.value = false
  }
}

function clearSelection() {
  selected.value = {}
  selectAll.value = false
}

async function deleteEmployeeRecord(employeeId: number) {
  try {
    await deleteEmployee(employeeId)
    await load()
  } catch (e: any) {
    alert('Failed to delete employee')
  }
}

function normalizeEmployee(data: any): Employee {
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
    avatar: `https://i.pravatar.cc/120?u=${data.email}`,
  }
}

async function load() {
  loading.value = true
  try {
    const filters: any = { per_page: 1000 }
    if (searchQuery.value) filters.search = searchQuery.value
    if (statusFilter.value) filters.status = statusFilter.value
    if (departmentFilter.value) filters.department = departmentFilter.value

    const { data } = await listEmployees(filters)
    const list = Array.isArray(data) ? data : data?.data || []
    employees.value = list.map(normalizeEmployee)
  } catch (e) {
    console.error('Failed to load employees', e)
    employees.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Employees</h1>
        <p class="mt-1 text-slate-600">Manage and view employee information</p>
      </div>
      <router-link to="/app/employees/new" class="btn-primary">
        + Add Employee
      </router-link>
    </div>

    <!-- Filters & Search -->
    <div class="rounded-lg border border-slate-200 bg-white p-4">
      <div class="grid gap-4 sm:grid-cols-3 sm:items-end">
        <SearchInput
          v-model="searchQuery"
          placeholder="Search by name, email, code..."
          @input="onSearchChange"
        />
        <select v-model="statusFilter" class="input text-sm">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select v-model="departmentFilter" class="input text-sm">
          <option value="">All Departments</option>
          <option v-for="dept in departments" :key="dept" :value="dept">
            {{ dept }}
          </option>
        </select>
      </div>

      <!-- View Mode Toggle -->
      <div class="mt-4 flex items-center justify-between">
        <p class="text-sm font-medium text-slate-700">
          Showing {{ paginatedEmployees.length }} of {{ filteredEmployees.length }} employees
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            :class="[
              'rounded px-3 py-2 text-sm font-medium transition-colors',
              viewMode === 'table'
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100',
            ]"
            @click="viewMode = 'table'"
          >
            📊 Table
          </button>
          <button
            type="button"
            :class="[
              'rounded px-3 py-2 text-sm font-medium transition-colors',
              viewMode === 'card'
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100',
            ]"
            @click="viewMode = 'card'"
          >
            🎴 Cards
          </button>
        </div>
      </div>
    </div>

    <!-- Table View -->
    <div v-if="viewMode === 'table'" class="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div v-if="selectedCount" class="p-4">
        <BulkActionsBar :count="selectedCount">
          <button class="btn-primary bg-red-500 hover:bg-red-600" @click="bulkDelete">Delete</button>
          <button class="btn-primary bg-slate-500 hover:bg-slate-600" @click="clearSelection">Clear</button>
        </BulkActionsBar>
      </div>
      <div v-if="loading" class="p-8 text-center text-slate-500">Loading...</div>
      <table v-else class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-slate-900 w-12">
              <input type="checkbox" class="form-checkbox" :checked="selectAll" @change="toggleSelectAllVisible" />
            </th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Code</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Email</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Designation</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Department</th>
            <th class="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="emp in paginatedEmployees" :key="emp.id" class="hover:bg-slate-50">
            <td class="px-4 py-3 text-slate-600">
              <input type="checkbox" class="form-checkbox" :checked="!!selected[emp.id]" @change="() => toggleRowSelection(emp)" />
            </td>
            <td class="px-4 py-3 font-medium text-slate-900">
              <div class="flex items-center gap-3 mb-1">
                <img
                  :src="emp.avatar"
                  :alt="emp.name"
                  class="h-8 w-8 rounded-full object-cover"
                />
                {{ emp.full_name }}
              </div>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ emp.employee_id }}</td>
            <td class="px-4 py-3 text-slate-600">{{ emp.email }}</td>
            <td class="px-4 py-3 text-slate-600">{{ emp.designation || '-' }}</td>
            <td class="px-4 py-3 text-slate-600">{{ emp.department || '-' }}</td>
            <td class="px-4 py-3">
              <span
                :class="[
                  'inline-block rounded-full px-3 py-1 text-xs font-medium',
                  emp.status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : emp.status === 'On Leave'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-slate-100 text-slate-800',
                ]"
              >
                {{ emp.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <MoreBtn
                :items="getMenuItems(emp)"
                @select="(action) => handleAction(action, emp)"
              />
            </td>
          </tr>
          <tr v-if="paginatedEmployees.length === 0">
            <td colspan="7" class="px-4 py-8 text-center text-slate-500">
              No employees found
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Card View -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="emp in paginatedEmployees"
        :key="emp.id"
        class="rounded-lg border border-slate-200 bg-white p-4 shadow-soft hover:shadow-md transition-shadow"
      >
        <div class="mb-3 flex items-start justify-between">
          <div>
            <div class="flex items-center gap-3 mb-1">
            <img
                :src="emp.avatar"
                :alt="emp.name"
                class="h-8 w-8 rounded-full object-cover"
              />
            <h3 class="font-semibold text-slate-900">{{ emp.full_name }}</h3>
            </div>
            <p class="text-sm text-slate-600">{{ emp.employee_id }}</p>
          </div>
          <MoreBtn
            :items="getMenuItems(emp)"
            @select="(action) => handleAction(action, emp)"
          />
        </div>

        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-slate-600">📧</span>
            <span class="text-slate-600">{{ emp.email }}</span>
          </div>
          <div v-if="emp.phone" class="flex items-center gap-2">
            <span class="text-slate-600">📱</span>
            <span class="text-slate-600">{{ emp.phone }}</span>
          </div>
          <div v-if="emp.designation" class="flex items-center gap-2">
            <span class="text-slate-600">💼</span>
            <span class="text-slate-600">{{ emp.designation }}</span>
          </div>
          <div v-if="emp.department" class="flex items-center gap-2">
            <span class="text-slate-600">🏢</span>
            <span class="text-slate-600">{{ emp.department }}</span>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div>
            <span
              :class="[
                'inline-block rounded-full px-3 py-1 text-xs font-medium',
                emp.status === 'Active'
                  ? 'bg-green-100 text-green-800'
                  : emp.status === 'On Leave'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-slate-100 text-slate-800',
              ]"
            >
              {{ emp.status }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="text-sm text-brand-600 hover:text-brand-700 font-medium"
              @click="router.push({ name: 'employee-profile', params: { id: emp.id } })"
            >
              View Profile →
            </button>
          </div>
        </div>
      </div>

      <div v-if="paginatedEmployees.length === 0" class="col-span-full py-8 text-center text-slate-500">
        No employees found
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
      <button
        type="button"
        class="rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="page === 1"
        @click="page--"
      >
        ← Previous
      </button>
      <div class="flex gap-1">
        <button
          v-for="p in totalPages"
          :key="p"
          type="button"
          :class="[
            'rounded px-3 py-2 text-sm font-medium transition-colors',
            p === page
              ? 'bg-brand-600 text-white'
              : 'text-slate-700 hover:bg-slate-100',
          ]"
          @click="page = p"
        >
          {{ p }}
        </button>
      </div>
      <button
        type="button"
        class="rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="page === totalPages"
        @click="page++"
      >
        Next →
      </button>
    </div>
  </div>
</template>

<style scoped>
.input {
  @apply w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500;
}

.btn-primary {
  @apply inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700;
}
</style>
