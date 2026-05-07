<script setup lang="ts">
defineOptions({ name: 'OnboardingPage' })

import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useConfirm } from '@/composables/useConfirm'
import EmpAvatar from '@/components/EmpAvatar.vue'

const { confirm: dialog } = useConfirm()

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

const CAT_LABELS: Record<string, string> = {
  document:    'Document',
  it_setup:    'IT Setup',
  training:    'Training',
  orientation: 'Orientation',
  policy:      'Policy',
  other:       'Other',
}

const CAT_COLORS: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  document:    { bg: 'rgba(79,126,255,.12)',  color: '#6B9FFF', border: 'rgba(79,126,255,.25)',  dot: '#6B9FFF' },
  it_setup:    { bg: 'rgba(155,110,255,.12)', color: '#9B6EFF', border: 'rgba(155,110,255,.25)', dot: '#9B6EFF' },
  training:    { bg: 'rgba(77,211,154,.12)',  color: '#4DD39A', border: 'rgba(77,211,154,.25)',  dot: '#4DD39A' },
  orientation: { bg: 'rgba(249,168,37,.12)',  color: '#F9A825', border: 'rgba(249,168,37,.25)',  dot: '#F9A825' },
  policy:      { bg: 'rgba(243,130,136,.12)', color: '#F38288', border: 'rgba(243,130,136,.25)', dot: '#F38288' },
  other:       { bg: 'rgba(107,114,128,.12)', color: '#9CA3AF', border: 'rgba(107,114,128,.25)', dot: '#9CA3AF' },
}

function catLabel(cat: string) { return CAT_LABELS[cat] ?? cat.replace(/_/g, ' ') }
function catStyle(cat: string) {
  const c = CAT_COLORS[cat] ?? CAT_COLORS.other
  return { background: c.bg, color: c.color, border: `1px solid ${c.border}` }
}
function catDot(cat: string) { return (CAT_COLORS[cat] ?? CAT_COLORS.other).dot }

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
  if (!await dialog('Delete', 'Delete this task?')) return
  try {
    await api.delete(`/onboarding/tasks/${id}`)
    await fetchTasks()
  } catch { /* silently ignore */ }
}

// ── Group tasks by category for the checklist view ──
const tasksByCategory = computed(() => {
  const groups: Record<string, OnboardingTask[]> = {}
  for (const t of tasks.value) {
    if (!groups[t.category]) groups[t.category] = []
    groups[t.category].push(t)
  }
  return Object.entries(groups).sort(([a], [b]) => categories.indexOf(a) - categories.indexOf(b))
})

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
  status: string
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
    const { data } = await api.get('/onboarding/employees')
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
    const raw = data.tasks ?? data.data ?? data
    employeeTasks.value = (Array.isArray(raw) ? raw : []).map((t: Record<string, unknown> & { task?: Record<string, unknown> }) => ({
      id: t.id,
      title: t.task?.title ?? t.title ?? '—',
      category: t.task?.category ?? t.category ?? '',
      status: t.status ?? 'pending',
      is_completed: t.status === 'completed' || t.status === 'skipped',
    }))
  } catch { /* silently ignore */ }
  finally { employeeTasksLoading.value = false }
}

async function toggleTask(empId: number, task: EmployeeTaskItem) {
  const newCompleted = !task.is_completed
  try {
    await api.put(`/onboarding/employee/${empId}/tasks/${task.id}`, {
      status: newCompleted ? 'completed' : 'pending',
    })
    task.is_completed = newCompleted
    task.status = newCompleted ? 'completed' : 'pending'
    if (selectedEmployee.value) {
      selectedEmployee.value.completed_tasks += newCompleted ? 1 : -1
    }
  } catch { /* silently ignore */ }
}

// ── Stage progress (derived from employee task categories) ──
const stageProgress = computed(() => {
  if (!employeeTasks.value.length) return []
  return categories.map(cat => {
    const catTasks = employeeTasks.value.filter(t => t.category === cat)
    if (!catTasks.length) return null
    const done = catTasks.filter(t => t.is_completed).length
    return { key: cat, label: catLabel(cat), done, total: catTasks.length }
  }).filter(Boolean) as { key: string; label: string; done: number; total: number }[]
})

// ── Tasks grouped by category for detail view ──
const tasksByStage = computed(() => {
  const groups: Record<string, EmployeeTaskItem[]> = {}
  for (const t of employeeTasks.value) {
    if (!groups[t.category]) groups[t.category] = []
    groups[t.category].push(t)
  }
  return Object.entries(groups).sort(([a], [b]) => categories.indexOf(a) - categories.indexOf(b))
})

function progressPercent(emp: EmployeeOnboarding) {
  if (!emp.total_tasks) return 0
  return Math.round((emp.completed_tasks / emp.total_tasks) * 100)
}

function stagePct(s: { done: number; total: number }) {
  return s.total === 0 ? 0 : Math.round((s.done / s.total) * 100)
}

onMounted(() => {
  fetchTasks()
  fetchEmployeeOnboardings()
  fetchEmployeesList()
})
</script>

<template>
  <div class="ob-page">

    <!-- ── Tab bar ──────────────────────────────────────────────────────── -->
    <div class="ob-tabs">
      <button :class="['ob-tab', activeTab === 'checklist' && 'ob-tab--active']" @click="activeTab = 'checklist'">
        Onboarding Checklist
      </button>
      <button :class="['ob-tab', activeTab === 'employees' && 'ob-tab--active']" @click="activeTab = 'employees'">
        Employee Progress
        <span v-if="employeeOnboardings.length" class="ob-tab-count">{{ employeeOnboardings.length }}</span>
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- CHECKLIST TAB — default task management                              -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'checklist'">
      <div class="section-bar">
        <div>
          <div class="section-title">Default Tasks</div>
          <div class="section-sub">These tasks are copied to every employee when onboarding is initiated</div>
        </div>
        <button class="btn-primary" @click="openNewTask">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
          Add Task
        </button>
      </div>

      <div v-if="tasksLoading" class="state-center"><div class="spinner"></div></div>

      <template v-else>
        <!-- Grouped by category -->
        <div v-if="tasks.length === 0" class="state-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="opacity:.3"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <p>No onboarding tasks configured yet</p>
          <button class="btn-primary" @click="openNewTask">Add first task</button>
        </div>

        <div v-else class="task-groups">
          <div v-for="[cat, catTasks] in tasksByCategory" :key="cat" class="task-group">
            <div class="tg-header">
              <div class="tg-dot" :style="{ background: catDot(cat) }"></div>
              <span class="tg-label">{{ catLabel(cat) }}</span>
              <span class="tg-count">{{ catTasks.length }}</span>
            </div>
            <div class="tg-body">
              <div v-for="t in catTasks" :key="t.id" class="tg-row">
                <div class="tg-order">{{ t.order_index }}</div>
                <div class="tg-info">
                  <div class="tg-title">{{ t.title }}</div>
                  <div class="tg-desc" v-if="t.description">{{ t.description }}</div>
                </div>
                <div class="tg-role">
                  <span class="cat-chip" :style="catStyle(t.assigned_to_role.replace('hr_', 'hr').replace('_', ' '))">{{ (t.assigned_to_role ?? '').replace(/_/g, ' ') }}</span>
                </div>
                <div class="tg-actions">
                  <button class="act-btn act-btn--edit" @click="openEditTask(t)">Edit</button>
                  <button class="act-btn act-btn--del" @click="deleteTask(t.id)">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Task Form Modal -->
      <Teleport to="body">
        <div v-if="showTaskForm" class="modal-overlay" @click.self="showTaskForm = false">
          <div class="modal">
            <div class="modal-head">
              <div>
                <h2 class="modal-title">{{ editingTask ? 'Edit Task' : 'New Task' }}</h2>
                <p class="modal-sub">{{ editingTask ? 'Update the default task details' : 'Add a new task to the default checklist' }}</p>
              </div>
              <button class="modal-close" @click="showTaskForm = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="field">
                <label class="label">Title <span class="req">*</span></label>
                <input v-model="taskForm.title" class="input" placeholder="e.g. Complete ID verification" />
              </div>
              <div class="field">
                <label class="label">Description</label>
                <textarea v-model="taskForm.description" rows="3" class="input textarea" placeholder="Optional additional context…" />
              </div>
              <div class="field-row">
                <div class="field">
                  <label class="label">Category</label>
                  <select v-model="taskForm.category" class="input">
                    <option v-for="c in categories" :key="c" :value="c">{{ catLabel(c) }}</option>
                  </select>
                </div>
                <div class="field">
                  <label class="label">Assigned To</label>
                  <select v-model="taskForm.assigned_to_role" class="input">
                    <option v-for="r in roleOptions" :key="r" :value="r">{{ r.replace(/_/g, ' ') }}</option>
                  </select>
                </div>
              </div>
              <div class="field">
                <label class="label">Order</label>
                <input v-model.number="taskForm.order_index" type="number" min="1" class="input" style="max-width: 120px;" />
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn-cancel" @click="showTaskForm = false" :disabled="taskSaving">Cancel</button>
              <button class="btn-primary" @click="saveTask" :disabled="taskSaving || !taskForm.title.trim()">
                <div v-if="taskSaving" class="mini-spin btn-spin"></div>
                {{ taskSaving ? 'Saving…' : editingTask ? 'Save Changes' : 'Add Task' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- EMPLOYEES TAB                                                         -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'employees'">

      <!-- ── Employee Detail View ──────────────────────────────────────── -->
      <template v-if="selectedEmployee">
        <!-- Back + actions bar -->
        <div class="section-bar">
          <button class="btn-back" @click="selectedEmployee = null">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
            All Employees
          </button>
          <button class="btn-primary" @click="showInitiateForm = true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
            Initiate Onboarding
          </button>
        </div>

        <!-- Employee header -->
        <div class="emp-detail-header">
          <div class="emp-detail-left">
            <EmpAvatar :name="selectedEmployee.employee_name" :size="64" />
            <div class="emp-detail-info">
              <div class="emp-detail-eyebrow">Onboarding in progress</div>
              <div class="emp-detail-name">{{ selectedEmployee.employee_name }}</div>
              <div class="emp-detail-sub">
                <span :class="['status-chip', `status-chip--${selectedEmployee.status}`]">{{ selectedEmployee.status.replace(/_/g, ' ') }}</span>
                <span>{{ selectedEmployee.completed_tasks }} of {{ selectedEmployee.total_tasks }} tasks done</span>
              </div>
            </div>
          </div>
          <div class="emp-detail-progress">
            <div class="edp-eyebrow">Overall progress</div>
            <div class="edp-pct">{{ progressPercent(selectedEmployee) }}<span class="edp-pct-small">%</span></div>
            <div class="edp-sub">{{ selectedEmployee.completed_tasks }} / {{ selectedEmployee.total_tasks }} tasks</div>
          </div>
        </div>

        <!-- Stage tracker -->
        <div v-if="!employeeTasksLoading && stageProgress.length" class="stage-tracker">
          <div
            v-for="s in stageProgress"
            :key="s.key"
            :class="['stage-card', stagePct(s) === 100 ? 'stage-card--done' : stagePct(s) > 0 ? 'stage-card--active' : '']"
          >
            <div class="stage-card-top">
              <div class="stage-card-label">{{ s.label }}</div>
              <span v-if="stagePct(s) === 100" class="stage-badge stage-badge--done">Done</span>
              <span v-else-if="stagePct(s) > 0" class="stage-badge stage-badge--active">Active</span>
            </div>
            <div class="stage-bar-wrap">
              <div class="stage-bar-track">
                <div
                  class="stage-bar-fill"
                  :class="stagePct(s) === 100 ? 'stage-bar-fill--done' : stagePct(s) > 0 ? 'stage-bar-fill--active' : 'stage-bar-fill--empty'"
                  :style="{ width: stagePct(s) + '%' }"
                ></div>
              </div>
            </div>
            <div class="stage-count">{{ s.done }} / {{ s.total }}</div>
          </div>
        </div>

        <!-- Loading state for tasks -->
        <div v-if="employeeTasksLoading" class="state-center"><div class="spinner"></div></div>

        <!-- Tasks + right rail -->
        <div v-else class="detail-layout">

          <!-- Left: task groups -->
          <div class="detail-left">
            <div v-if="employeeTasks.length === 0" class="state-empty">
              <p>No tasks found for this employee.</p>
            </div>
            <div v-for="[cat, catTasks] in tasksByStage" :key="cat" class="task-board-card">
              <div class="tbc-header">
                <div class="tbc-header-left">
                  <div class="tbc-title">{{ catLabel(cat) }}</div>
                  <span class="tbc-badge">
                    {{ catTasks.filter(t => t.is_completed).length }} / {{ catTasks.length }}
                  </span>
                </div>
                <div class="tbc-bar-mini">
                  <div
                    class="tbc-bar-fill"
                    :style="{ width: (catTasks.length ? catTasks.filter(t => t.is_completed).length / catTasks.length * 100 : 0) + '%', background: catDot(cat) }"
                  ></div>
                </div>
              </div>
              <div>
                <div
                  v-for="(task, i) in catTasks"
                  :key="task.id"
                  :class="['task-row', task.is_completed && 'task-row--done', i === catTasks.length - 1 && 'task-row--last']"
                  @click="toggleTask(selectedEmployee!.employee_id, task)"
                >
                  <!-- Checkbox -->
                  <div class="task-check" :class="task.is_completed && 'task-check--done'">
                    <svg v-if="task.is_completed" width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2 6l3 3 5-5"/>
                    </svg>
                  </div>
                  <!-- Title -->
                  <div class="task-title" :class="task.is_completed && 'task-title--done'">{{ task.title }}</div>
                  <!-- Category chip -->
                  <div class="task-cat">
                    <span class="cat-chip" :style="catStyle(task.category)">{{ catLabel(task.category) }}</span>
                  </div>
                  <!-- Status -->
                  <div class="task-status-col">
                    <span v-if="task.is_completed" class="task-done-label">Completed</span>
                    <span v-else class="task-pending-label">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right rail -->
          <div class="detail-right">
            <!-- Summary stats -->
            <div class="detail-card">
              <div class="dc-title">Progress Summary</div>
              <div class="dc-stats">
                <div class="dc-stat">
                  <div class="dc-stat-val" style="color: #4DD39A;">{{ selectedEmployee.completed_tasks }}</div>
                  <div class="dc-stat-label">Completed</div>
                </div>
                <div class="dc-stat">
                  <div class="dc-stat-val" style="color: #F9A825;">{{ selectedEmployee.total_tasks - selectedEmployee.completed_tasks }}</div>
                  <div class="dc-stat-label">Remaining</div>
                </div>
                <div class="dc-stat">
                  <div class="dc-stat-val" style="color: #6B5BFF;">{{ progressPercent(selectedEmployee) }}%</div>
                  <div class="dc-stat-label">Overall</div>
                </div>
              </div>
              <!-- Full progress bar -->
              <div class="dc-progress-track">
                <div
                  class="dc-progress-fill"
                  :class="progressPercent(selectedEmployee) === 100 && 'dc-progress-fill--done'"
                  :style="{ width: progressPercent(selectedEmployee) + '%' }"
                ></div>
              </div>
            </div>

            <!-- Category breakdown -->
            <div class="detail-card" v-if="stageProgress.length">
              <div class="dc-title">By Category</div>
              <div class="dc-breakdown">
                <div v-for="s in stageProgress" :key="s.key" class="dcb-row">
                  <div class="dcb-dot" :style="{ background: catDot(s.key) }"></div>
                  <div class="dcb-label">{{ s.label }}</div>
                  <div class="dcb-track">
                    <div class="dcb-fill" :style="{ width: stagePct(s) + '%', background: catDot(s.key) }"></div>
                  </div>
                  <div class="dcb-count">{{ s.done }}/{{ s.total }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Employee List View ─────────────────────────────────────────── -->
      <template v-else>
        <div class="section-bar">
          <div>
            <div class="section-title">Employee Progress</div>
            <div class="section-sub">Click an employee to view and manage their tasks</div>
          </div>
          <button class="btn-primary" @click="showInitiateForm = true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
            Initiate Onboarding
          </button>
        </div>

        <div v-if="employeesLoading" class="state-center"><div class="spinner"></div></div>

        <div v-else-if="employeeOnboardings.length === 0" class="state-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style="opacity:.3"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <p>No employee onboarding records. Start by initiating onboarding for an employee.</p>
          <button class="btn-primary" @click="showInitiateForm = true">Initiate Onboarding</button>
        </div>

        <div v-else class="emp-list">
          <div
            v-for="emp in employeeOnboardings"
            :key="emp.id"
            class="emp-card"
            @click="viewEmployeeTasks(emp)"
          >
            <div class="emp-card-left">
              <EmpAvatar :name="emp.employee_name" :size="40" />
              <div class="emp-card-info">
                <div class="emp-card-name">{{ emp.employee_name }}</div>
                <div class="emp-card-meta">{{ emp.completed_tasks }} of {{ emp.total_tasks }} tasks done</div>
              </div>
            </div>
            <div class="emp-card-right">
              <div class="emp-prog-row">
                <div class="emp-prog-track">
                  <div
                    class="emp-prog-fill"
                    :class="progressPercent(emp) === 100 && 'emp-prog-fill--done'"
                    :style="{ width: progressPercent(emp) + '%' }"
                  ></div>
                </div>
                <span class="emp-prog-pct">{{ progressPercent(emp) }}%</span>
              </div>
              <span
                :class="['status-chip', `status-chip--${emp.status}`]"
              >{{ emp.status.replace(/_/g, ' ') }}</span>
            </div>
            <svg class="emp-card-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      </template>

      <!-- Initiate Form Modal -->
      <Teleport to="body">
        <div v-if="showInitiateForm" class="modal-overlay" @click.self="showInitiateForm = false">
          <div class="modal">
            <div class="modal-head">
              <div>
                <h2 class="modal-title">Initiate Onboarding</h2>
                <p class="modal-sub">Assign the default checklist to an employee</p>
              </div>
              <button class="modal-close" @click="showInitiateForm = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="field">
                <label class="label">Employee <span class="req">*</span></label>
                <select v-model="initiateForm.employee_id" class="input">
                  <option value="">Select employee…</option>
                  <option v-for="e in employeesList" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name }}</option>
                </select>
              </div>
              <div class="field">
                <label class="label">Due Date</label>
                <input v-model="initiateForm.due_date" type="date" class="input" />
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn-cancel" @click="showInitiateForm = false" :disabled="initiating">Cancel</button>
              <button class="btn-primary" @click="initiateOnboarding" :disabled="initiating || !initiateForm.employee_id">
                <div v-if="initiating" class="mini-spin btn-spin"></div>
                {{ initiating ? 'Initiating…' : 'Initiate' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

    </template>

  </div>
</template>

<style scoped>
.ob-page { display: flex; flex-direction: column; gap: 20px; }

/* ── tabs ────────────────────────────────────────────────────────────────── */
.ob-tabs { display: flex; gap: 4px; border-bottom: 1px solid #232936; }
.ob-tab {
  padding: 9px 20px; font-size: 13px; font-weight: 500; color: #7A8299;
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: color .15s, border-color .15s;
  display: flex; align-items: center; gap: 7px;
}
.ob-tab:hover { color: #EEF0F4; }
.ob-tab--active { color: #6B5BFF; border-bottom-color: #6B5BFF; }
.ob-tab-count {
  font-size: 10px; font-weight: 700; background: #1C212C;
  color: #7A8299; padding: 1px 6px; border-radius: 10px; border: 1px solid #232936;
}

/* ── section bar ─────────────────────────────────────────────────────────── */
.section-bar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.section-title { font-size: 15px; font-weight: 600; color: #EEF0F4; }
.section-sub   { font-size: 12px; color: #7A8299; margin-top: 3px; }

/* ── buttons ─────────────────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 16px; font-size: 13px; font-weight: 600;
  background: #6B5BFF; color: #fff; border: none; border-radius: 8px;
  cursor: pointer; transition: opacity .15s; flex-shrink: 0;
}
.btn-primary:hover:not(:disabled) { opacity: .88; }
.btn-primary:disabled { opacity: .45; cursor: not-allowed; }
.btn-cancel {
  padding: 8px 16px; font-size: 13px; font-weight: 500;
  background: #1C212C; color: #7A8299; border: 1px solid #232936;
  border-radius: 8px; cursor: pointer; transition: color .15s;
}
.btn-cancel:hover:not(:disabled) { color: #EEF0F4; }
.btn-cancel:disabled { opacity: .5; cursor: not-allowed; }
.btn-back {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; font-size: 13px; font-weight: 500;
  background: #1C212C; color: #7A8299; border: 1px solid #232936;
  border-radius: 8px; cursor: pointer; transition: color .15s, border-color .15s;
}
.btn-back:hover { color: #EEF0F4; border-color: #6B5BFF; }

/* ── task groups (checklist tab) ─────────────────────────────────────────── */
.task-groups { display: flex; flex-direction: column; gap: 12px; }
.task-group  { background: #161A23; border: 1px solid #232936; border-radius: 12px; overflow: hidden; }
.tg-header {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-bottom: 1px solid #232936;
  background: #161A23;
}
.tg-dot   { width: 8px; height: 8px; border-radius: 4px; flex-shrink: 0; }
.tg-label { font-size: 13px; font-weight: 600; color: #EEF0F4; flex: 1; }
.tg-count { font-size: 11px; color: #7A8299; background: #1C212C; padding: 2px 8px; border-radius: 10px; border: 1px solid #232936; }
.tg-body  { display: flex; flex-direction: column; }
.tg-row {
  display: grid; grid-template-columns: 32px 1fr auto auto; gap: 12px;
  align-items: center; padding: 10px 16px;
  border-bottom: 1px solid #1C212C; transition: background .12s;
}
.tg-row:last-child  { border-bottom: none; }
.tg-row:hover       { background: rgba(255,255,255,.02); }
.tg-order  { font-size: 11px; font-family: 'JetBrains Mono', ui-monospace, monospace; color: #7A8299; text-align: center; }
.tg-info   { min-width: 0; }
.tg-title  { font-size: 13px; color: #EEF0F4; font-weight: 500; }
.tg-desc   { font-size: 11px; color: #7A8299; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tg-role   { white-space: nowrap; }
.tg-actions { display: flex; gap: 8px; }
.act-btn { font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; transition: background .12s; }
.act-btn--edit { color: #6B5BFF; background: rgba(107,91,255,.1); border-color: rgba(107,91,255,.2); }
.act-btn--edit:hover { background: rgba(107,91,255,.2); }
.act-btn--del  { color: #F38288; background: rgba(243,130,136,.1); border-color: rgba(243,130,136,.2); }
.act-btn--del:hover  { background: rgba(243,130,136,.2); }

/* ── category chip ───────────────────────────────────────────────────────── */
.cat-chip {
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 500; padding: 2px 8px;
  border-radius: 20px; white-space: nowrap;
}

/* ── employee detail header ──────────────────────────────────────────────── */
.emp-detail-header {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 20px; background: #161A23; border: 1px solid #232936;
  border-radius: 12px; padding: 20px 24px;
}
.emp-detail-left { display: flex; align-items: center; gap: 16px; }
.emp-detail-info { min-width: 0; }
.emp-detail-eyebrow { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #7A8299; }
.emp-detail-name {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 32px; color: #FAFBFC; letter-spacing: -0.02em; margin-top: 2px; line-height: 1;
}
.emp-detail-sub { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: 12px; color: #7A8299; }
.emp-detail-progress { text-align: right; flex-shrink: 0; }
.edp-eyebrow { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #7A8299; }
.edp-pct {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 34px; color: #FAFBFC; letter-spacing: -0.02em; line-height: 1; margin-top: 2px;
}
.edp-pct-small { font-size: 20px; color: #7A8299; }
.edp-sub { font-size: 11px; color: #7A8299; margin-top: 3px; }

/* ── stage tracker ───────────────────────────────────────────────────────── */
.stage-tracker { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.stage-card {
  padding: 14px; background: #161A23; border: 1px solid #232936;
  border-radius: 10px; display: flex; flex-direction: column; gap: 6px;
}
.stage-card--done   { background: rgba(77,211,154,.05);  border-color: rgba(77,211,154,.25); }
.stage-card--active { background: rgba(107,91,255,.06); border-color: #6B5BFF; }
.stage-card-top  { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.stage-card-label { font-size: 13px; font-weight: 600; color: #EEF0F4; }
.stage-badge {
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px;
}
.stage-badge--done   { background: rgba(77,211,154,.15); color: #4DD39A; border: 1px solid rgba(77,211,154,.3); }
.stage-badge--active { background: rgba(107,91,255,.15); color: #8979FF; border: 1px solid rgba(107,91,255,.3); }
.stage-bar-track { height: 4px; background: #232936; border-radius: 2px; overflow: hidden; }
.stage-bar-fill  { height: 100%; border-radius: 2px; transition: width .3s; }
.stage-bar-fill--done   { background: #4DD39A; }
.stage-bar-fill--active { background: #6B5BFF; }
.stage-bar-fill--empty  { background: #2A3040; }
.stage-count { font-size: 10.5px; color: #7A8299; font-family: 'JetBrains Mono', ui-monospace, monospace; }

/* ── detail two-column layout ────────────────────────────────────────────── */
.detail-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
.detail-left  { display: flex; flex-direction: column; gap: 14px; }
.detail-right { display: flex; flex-direction: column; gap: 14px; }

/* ── task board card (detail view) ──────────────────────────────────────── */
.task-board-card { background: #161A23; border: 1px solid #232936; border-radius: 12px; overflow: hidden; }
.tbc-header {
  padding: 12px 16px; border-bottom: 1px solid #232936;
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.tbc-header-left { display: flex; align-items: center; gap: 10px; }
.tbc-title { font-size: 13px; font-weight: 600; color: #EEF0F4; }
.tbc-badge {
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 10px;
  background: #1C212C; color: #7A8299; border: 1px solid #232936;
}
.tbc-bar-mini { width: 60px; height: 3px; background: #232936; border-radius: 2px; overflow: hidden; }
.tbc-bar-fill { height: 100%; border-radius: 2px; transition: width .3s; }

.task-row {
  display: grid; grid-template-columns: 20px 1fr auto auto; gap: 12px;
  padding: 10px 16px; align-items: center; cursor: pointer;
  border-bottom: 1px solid #1C212C; transition: background .12s;
}
.task-row:last-child, .task-row--last { border-bottom: none; }
.task-row:hover { background: rgba(255,255,255,.02); }
.task-row--done { opacity: .7; }

.task-check {
  width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0;
  border: 1.5px solid #3A4152; background: transparent;
  display: flex; align-items: center; justify-content: center;
  transition: background .12s, border-color .12s;
}
.task-check--done { background: #6B5BFF; border-color: #6B5BFF; }

.task-title { font-size: 13px; color: #EEF0F4; font-weight: 400; min-width: 0; }
.task-title--done { color: #7A8299; text-decoration: line-through; }
.task-cat  { flex-shrink: 0; }
.task-status-col { font-size: 11px; font-family: 'JetBrains Mono', ui-monospace, monospace; text-align: right; min-width: 72px; }
.task-done-label    { color: #4DD39A; font-weight: 500; }
.task-pending-label { color: #7A8299; }

/* ── detail right cards ──────────────────────────────────────────────────── */
.detail-card { background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.dc-title { font-size: 13px; font-weight: 600; color: #EEF0F4; }
.dc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.dc-stat  { background: #1C212C; border: 1px solid #232936; border-radius: 8px; padding: 10px; text-align: center; }
.dc-stat-val   { font-family: 'Instrument Serif', Georgia, serif; font-size: 22px; letter-spacing: -0.02em; line-height: 1; }
.dc-stat-label { font-size: 10.5px; color: #7A8299; margin-top: 3px; }
.dc-progress-track { height: 6px; background: #232936; border-radius: 3px; overflow: hidden; }
.dc-progress-fill  { height: 100%; background: #6B5BFF; border-radius: 3px; transition: width .3s; }
.dc-progress-fill--done { background: #4DD39A; }

.dc-breakdown { display: flex; flex-direction: column; gap: 8px; }
.dcb-row { display: grid; grid-template-columns: 8px 1fr 60px 32px; gap: 8px; align-items: center; }
.dcb-dot   { width: 8px; height: 8px; border-radius: 4px; flex-shrink: 0; }
.dcb-label { font-size: 11.5px; color: #EEF0F4; }
.dcb-track { height: 4px; background: #232936; border-radius: 2px; overflow: hidden; }
.dcb-fill  { height: 100%; border-radius: 2px; transition: width .3s; }
.dcb-count { font-size: 10.5px; color: #7A8299; font-family: 'JetBrains Mono', ui-monospace, monospace; text-align: right; }

/* ── employee list ───────────────────────────────────────────────────────── */
.emp-list { display: flex; flex-direction: column; gap: 8px; }
.emp-card {
  display: flex; align-items: center; gap: 16px;
  background: #161A23; border: 1px solid #232936; border-radius: 12px;
  padding: 14px 16px; cursor: pointer; transition: border-color .15s, background .15s;
}
.emp-card:hover { border-color: #6B5BFF; background: rgba(107,91,255,.03); }
.emp-card-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.emp-card-info { min-width: 0; }
.emp-card-name { font-size: 14px; font-weight: 600; color: #EEF0F4; }
.emp-card-meta { font-size: 12px; color: #7A8299; margin-top: 2px; }
.emp-card-right { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; min-width: 180px; }
.emp-prog-row { display: flex; align-items: center; gap: 10px; width: 100%; }
.emp-prog-track { flex: 1; height: 4px; background: #232936; border-radius: 2px; overflow: hidden; }
.emp-prog-fill  { height: 100%; background: #6B5BFF; border-radius: 2px; transition: width .3s; }
.emp-prog-fill--done { background: #4DD39A; }
.emp-prog-pct { font-size: 11px; color: #7A8299; font-family: 'JetBrains Mono', ui-monospace, monospace; width: 32px; text-align: right; flex-shrink: 0; }
.emp-card-chevron { color: #7A8299; flex-shrink: 0; }

/* ── status chips ────────────────────────────────────────────────────────── */
.status-chip { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; text-transform: capitalize; letter-spacing: .3px; }
.status-chip--completed  { background: rgba(77,211,154,.12);  color: #4DD39A; border: 1px solid rgba(77,211,154,.25); }
.status-chip--in_progress { background: rgba(107,91,255,.12); color: #8979FF; border: 1px solid rgba(107,91,255,.25); }
.status-chip--pending    { background: rgba(249,168,37,.12);  color: #F9A825; border: 1px solid rgba(249,168,37,.25); }
.status-chip--not_started { background: rgba(107,114,128,.12); color: #9CA3AF; border: 1px solid rgba(107,114,128,.25); }

/* ── modal ───────────────────────────────────────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal { background: #161A23; border: 1px solid #232936; border-radius: 16px; width: 100%; max-width: 520px; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,.5); }
.modal-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px 14px; border-bottom: 1px solid #232936; flex-shrink: 0; }
.modal-title { font-size: 16px; font-weight: 600; color: #EEF0F4; margin: 0; }
.modal-sub   { font-size: 12px; color: #7A8299; margin: 3px 0 0; }
.modal-close { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 7px; background: none; border: none; color: #7A8299; cursor: pointer; transition: background .15s, color .15s; flex-shrink: 0; }
.modal-close:hover { background: #1C212C; color: #EEF0F4; }
.modal-body { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px 20px; border-top: 1px solid #232936; flex-shrink: 0; }

/* ── form ────────────────────────────────────────────────────────────────── */
.field     { display: flex; flex-direction: column; gap: 5px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.label     { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #7A8299; }
.req       { color: #F38288; }
.input     { background: #1C212C; border: 1px solid #232936; color: #EEF0F4; border-radius: 8px; padding: 9px 12px; font-size: 13px; outline: none; transition: border-color .15s; width: 100%; box-sizing: border-box; }
.input:focus { border-color: #6B5BFF; }
.textarea  { resize: vertical; min-height: 68px; font-family: inherit; line-height: 1.5; }
.input[type="date"], select.input option { color-scheme: dark; }

/* ── shared ──────────────────────────────────────────────────────────────── */
.state-center { display: flex; justify-content: center; padding: 48px; }
.state-empty  { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; color: #7A8299; background: #161A23; border: 1px solid #232936; border-radius: 12px; font-size: 13px; text-align: center; }
.spinner      { width: 28px; height: 28px; border: 2.5px solid rgba(107,91,255,.2); border-top-color: #6B5BFF; border-radius: 50%; animation: spin .8s linear infinite; }
.mini-spin    { width: 13px; height: 13px; flex-shrink: 0; border: 2px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
.btn-spin { border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .detail-layout { grid-template-columns: 1fr; }
  .emp-card-right { min-width: 120px; }
}
@media (max-width: 640px) {
  .stage-tracker { grid-template-columns: repeat(2, 1fr); }
  .emp-detail-header { flex-direction: column; align-items: flex-start; }
  .emp-detail-progress { text-align: left; }
  .tg-row { grid-template-columns: 28px 1fr auto; }
  .tg-role { display: none; }
  .task-row { grid-template-columns: 20px 1fr auto; }
  .task-status-col { display: none; }
}
</style>
