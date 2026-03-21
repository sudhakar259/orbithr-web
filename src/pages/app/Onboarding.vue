<script setup lang="ts">
defineOptions({ name: 'Onboarding' })

import { ref, onMounted } from 'vue'
import api from '@/services/api'

type Tab = 'checklist' | 'employees'
const activeTab = ref<Tab>('checklist')

// ── Checklist Tasks ──
interface OnboardingTask {
  id: number
  title: string
  description: string
  category: string
  assigned_to_role: string
  order_index: number
}

const tasks = ref<OnboardingTask[]>([])
const tasksLoading = ref(false)
const showTaskForm = ref(false)
const editingTask = ref<OnboardingTask | null>(null)
const taskForm = ref({ title: '', description: '', category: 'orientation', assigned_to_role: 'hr_manager', order_index: 0 })
const taskSaving = ref(false)

const categories = ['document', 'it_setup', 'training', 'orientation', 'policy', 'other']
const roleOptions = ['employee', 'hr_manager', 'manager', 'it', 'admin']

async function fetchTasks() {
  tasksLoading.value = true
  try {
    const { data } = await api.get('/onboarding/tasks')
    tasks.value = data.data ?? data
  } catch { /* silently ignore */ }
  finally { tasksLoading.value = false }
}

function openNewTask() {
  editingTask.value = null
  taskForm.value = { title: '', description: '', category: 'orientation', assigned_to_role: 'hr_manager', order_index: tasks.value.length + 1 }
  showTaskForm.value = true
}

function openEditTask(t: OnboardingTask) {
  editingTask.value = t
  taskForm.value = { title: t.title, description: t.description, category: t.category, assigned_to_role: t.assigned_to_role, order_index: t.order_index }
  showTaskForm.value = true
}

async function saveTask() {
  taskSaving.value = true
  try {
    if (editingTask.value) {
      await api.put(`/onboarding/tasks/${editingTask.value.id}`, taskForm.value)
    } else {
      await api.post('/onboarding/tasks', taskForm.value)
    }
    showTaskForm.value = false
    await fetchTasks()
  } catch { /* silently ignore */ }
  finally { taskSaving.value = false }
}

async function deleteTask(id: number) {
  if (!confirm('Delete this task?')) return
  try {
    await api.delete(`/onboarding/tasks/${id}`)
    await fetchTasks()
  } catch { /* silently ignore */ }
}

// ── Employee Onboarding ──
interface EmployeeOnboarding {
  id: number
  employee_id: number
  employee_name: string
  completed_tasks: number
  total_tasks: number
  status: string
}

interface EmployeeTaskItem {
  id: number
  title: string
  category: string
  is_completed: boolean
}

const employeeOnboardings = ref<EmployeeOnboarding[]>([])
const employeesLoading = ref(false)
const showInitiateForm = ref(false)
const initiateForm = ref({ employee_id: '', due_date: '' })
const initiating = ref(false)
const selectedEmployee = ref<EmployeeOnboarding | null>(null)
const employeeTasks = ref<EmployeeTaskItem[]>([])
const employeeTasksLoading = ref(false)

interface Employee { id: number; first_name: string; last_name: string }
const employeesList = ref<Employee[]>([])

async function fetchEmployeeOnboardings() {
  employeesLoading.value = true
  try {
    const { data } = await api.get('/onboarding/summary')
    employeeOnboardings.value = data.data ?? data
  } catch { /* silently ignore */ }
  finally { employeesLoading.value = false }
}

async function fetchEmployeesList() {
  try {
    const { data } = await api.get('/employees', { params: { per_page: 200 } })
    employeesList.value = data.data ?? data
  } catch { /* silently ignore */ }
}

async function initiateOnboarding() {
  initiating.value = true
  try {
    await api.post('/onboarding/initiate', initiateForm.value)
    showInitiateForm.value = false
    initiateForm.value = { employee_id: '', due_date: '' }
    await fetchEmployeeOnboardings()
  } catch { /* silently ignore */ }
  finally { initiating.value = false }
}

async function viewEmployeeTasks(emp: EmployeeOnboarding) {
  selectedEmployee.value = emp
  employeeTasksLoading.value = true
  try {
    const { data } = await api.get(`/onboarding/employee/${emp.employee_id}`)
    employeeTasks.value = data.data ?? data
  } catch { /* silently ignore */ }
  finally { employeeTasksLoading.value = false }
}

async function toggleTask(empId: number, task: EmployeeTaskItem) {
  try {
    await api.put(`/onboarding/employee/${empId}/tasks/${task.id}`, { is_completed: !task.is_completed })
    task.is_completed = !task.is_completed
    if (selectedEmployee.value) {
      selectedEmployee.value.completed_tasks += task.is_completed ? 1 : -1
    }
  } catch { /* silently ignore */ }
}

function categoryBadgeClass(cat: string) {
  const map: Record<string, string> = {
    document: 'bg-blue-900/50 text-blue-400',
    it_setup: 'bg-purple-900/50 text-purple-400',
    training: 'bg-green-900/50 text-green-400',
    orientation: 'bg-yellow-900/50 text-yellow-400',
    policy: 'bg-orange-900/50 text-orange-400',
    other: 'bg-gray-700 text-gray-300',
  }
  return map[cat] ?? 'bg-gray-700 text-gray-300'
}

function progressPercent(emp: EmployeeOnboarding) {
  if (!emp.total_tasks) return 0
  return Math.round((emp.completed_tasks / emp.total_tasks) * 100)
}

onMounted(() => {
  fetchTasks()
  fetchEmployeeOnboardings()
  fetchEmployeesList()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Onboarding</h1>
        <p class="mt-1 text-sm text-gray-400">Manage onboarding checklists and track employee progress</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <nav class="flex gap-4">
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'checklist' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
          @click="activeTab = 'checklist'"
        >Onboarding Checklist</button>
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'employees' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
          @click="activeTab = 'employees'"
        >Employee Onboarding</button>
      </nav>
    </div>

    <!-- Checklist Tab -->
    <div v-if="activeTab === 'checklist'">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-white">Default Tasks</h2>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" @click="openNewTask">Add Task</button>
      </div>

      <!-- Task Form Modal -->
      <div v-if="showTaskForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div class="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-lg p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">{{ editingTask ? 'Edit Task' : 'Add Task' }}</h3>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Title</label>
            <input v-model="taskForm.title" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Description</label>
            <textarea v-model="taskForm.description" rows="3" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Category</label>
              <select v-model="taskForm.category" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
                <option v-for="c in categories" :key="c" :value="c">{{ c.replace(/_/g, ' ') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Assigned To</label>
              <select v-model="taskForm.assigned_to_role" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
                <option v-for="r in roleOptions" :key="r" :value="r">{{ r.replace(/_/g, ' ') }}</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Order</label>
            <input v-model.number="taskForm.order_index" type="number" min="1" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          </div>
          <div class="flex justify-end gap-3">
            <button class="bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 px-4 py-2 text-sm font-medium rounded-lg" @click="showTaskForm = false">Cancel</button>
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" :disabled="taskSaving" @click="saveTask">{{ taskSaving ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>

      <div v-if="tasksLoading" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
            <tr>
              <th class="px-4 py-3">#</th>
              <th class="px-4 py-3">Title</th>
              <th class="px-4 py-3">Category</th>
              <th class="px-4 py-3">Assigned To</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="t in tasks" :key="t.id" class="text-gray-300">
              <td class="px-4 py-3 text-gray-500">{{ t.order_index }}</td>
              <td class="px-4 py-3 text-white font-medium">{{ t.title }}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 text-xs rounded-full" :class="categoryBadgeClass(t.category)">{{ t.category.replace(/_/g, ' ') }}</span></td>
              <td class="px-4 py-3">{{ t.assigned_to_role.replace(/_/g, ' ') }}</td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button class="text-blue-400 hover:text-blue-300 text-xs" @click="openEditTask(t)">Edit</button>
                  <button class="text-red-400 hover:text-red-300 text-xs" @click="deleteTask(t.id)">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="tasks.length === 0"><td colspan="5" class="px-4 py-8 text-center text-gray-500">No onboarding tasks configured</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Employee Onboarding Tab -->
    <div v-if="activeTab === 'employees'">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-white">Employee Progress</h2>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" @click="showInitiateForm = true">Initiate Onboarding</button>
      </div>

      <!-- Initiate Form Modal -->
      <div v-if="showInitiateForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div class="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Initiate Onboarding</h3>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Employee</label>
            <select v-model="initiateForm.employee_id" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
              <option value="">Select employee</option>
              <option v-for="e in employeesList" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Due Date</label>
            <input v-model="initiateForm.due_date" type="date" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          </div>
          <div class="flex justify-end gap-3">
            <button class="bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 px-4 py-2 text-sm font-medium rounded-lg" @click="showInitiateForm = false">Cancel</button>
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" :disabled="initiating" @click="initiateOnboarding">{{ initiating ? 'Initiating...' : 'Initiate' }}</button>
          </div>
        </div>
      </div>

      <!-- Employee Detail Panel -->
      <div v-if="selectedEmployee" class="mb-4 bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-white font-semibold">{{ selectedEmployee.employee_name }} - Tasks</h3>
          <button class="text-gray-400 hover:text-gray-300 text-sm" @click="selectedEmployee = null">Close</button>
        </div>
        <div v-if="employeeTasksLoading" class="flex justify-center py-4"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" /></div>
        <div v-else class="space-y-2">
          <label
            v-for="task in employeeTasks"
            :key="task.id"
            class="flex items-center gap-3 p-2 rounded hover:bg-gray-700/50 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="task.is_completed"
              class="rounded border-gray-600 bg-gray-700 text-blue-600"
              @change="toggleTask(selectedEmployee!.employee_id, task)"
            />
            <span class="text-sm" :class="task.is_completed ? 'text-gray-500 line-through' : 'text-gray-300'">{{ task.title }}</span>
            <span class="px-2 py-0.5 text-xs rounded-full ml-auto" :class="categoryBadgeClass(task.category)">{{ task.category.replace(/_/g, ' ') }}</span>
          </label>
          <p v-if="employeeTasks.length === 0" class="text-gray-500 text-sm text-center py-4">No tasks found</p>
        </div>
      </div>

      <div v-if="employeesLoading" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
            <tr>
              <th class="px-4 py-3">Employee</th>
              <th class="px-4 py-3">Progress</th>
              <th class="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr
              v-for="emp in employeeOnboardings"
              :key="emp.id"
              class="text-gray-300 cursor-pointer hover:bg-gray-700/30"
              @click="viewEmployeeTasks(emp)"
            >
              <td class="px-4 py-3 text-white font-medium">{{ emp.employee_name }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="progressPercent(emp) === 100 ? 'bg-green-500' : 'bg-blue-500'"
                      :style="{ width: progressPercent(emp) + '%' }"
                    />
                  </div>
                  <span class="text-xs text-gray-400 w-20 text-right">{{ emp.completed_tasks }}/{{ emp.total_tasks }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs rounded-full"
                  :class="emp.status === 'completed' ? 'bg-green-900/50 text-green-400' : emp.status === 'in_progress' ? 'bg-blue-900/50 text-blue-400' : 'bg-yellow-900/50 text-yellow-400'"
                >{{ emp.status.replace(/_/g, ' ') }}</span>
              </td>
            </tr>
            <tr v-if="employeeOnboardings.length === 0"><td colspan="3" class="px-4 py-8 text-center text-gray-500">No employee onboarding records</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
