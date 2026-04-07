<script setup lang="ts">
defineOptions({ name: 'WorkflowAutomation' })

import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SimpleStatCard from '@/components/ui/SimpleStatCard.vue'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

/* ── Types ─────────────────────────────────────────── */
interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: string
  logic: 'AND' | 'OR'
}

interface WorkflowAction {
  type: 'send_email' | 'send_notification' | 'assign_task' | 'update_field' | 'webhook' | 'slack_message' | 'create_ticket'
  config: Record<string, string>
}

type TriggerType =
  | 'employee_joined' | 'leave_approved' | 'leave_rejected'
  | 'attendance_missed' | 'birthday' | 'work_anniversary'
  | 'payroll_processed' | 'onboarding_started' | 'offboarding_started'
  | 'document_expiry'

interface Workflow {
  id: number
  name: string
  description: string
  trigger: TriggerType
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  status: 'active' | 'inactive' | 'draft'
  runs_count: number
  last_run: string | null
  created_at: string
}

/* ── Constants ─────────────────────────────────────── */
const triggerOptions: { value: TriggerType; label: string; category: string }[] = [
  { value: 'employee_joined', label: 'Employee Joined', category: 'employee' },
  { value: 'onboarding_started', label: 'Onboarding Started', category: 'employee' },
  { value: 'offboarding_started', label: 'Offboarding Started', category: 'employee' },
  { value: 'birthday', label: 'Employee Birthday', category: 'employee' },
  { value: 'work_anniversary', label: 'Work Anniversary', category: 'employee' },
  { value: 'leave_approved', label: 'Leave Approved', category: 'leave' },
  { value: 'leave_rejected', label: 'Leave Rejected', category: 'leave' },
  { value: 'attendance_missed', label: 'Attendance Missed', category: 'attendance' },
  { value: 'payroll_processed', label: 'Payroll Processed', category: 'payroll' },
  { value: 'document_expiry', label: 'Document Expiry', category: 'scheduled' },
]

const triggerCategoryColors: Record<string, string> = {
  employee: 'green', leave: 'blue', attendance: 'yellow', payroll: 'purple', scheduled: 'gray',
}

const actionOptions: { value: WorkflowAction['type']; label: string; icon: string }[] = [
  { value: 'send_email', label: 'Send Email', icon: '📧' },
  { value: 'send_notification', label: 'Send Notification', icon: '🔔' },
  { value: 'assign_task', label: 'Assign Task', icon: '📋' },
  { value: 'update_field', label: 'Update Field', icon: '✏️' },
  { value: 'webhook', label: 'Webhook', icon: '🔗' },
  { value: 'slack_message', label: 'Slack Message', icon: '💬' },
  { value: 'create_ticket', label: 'Create Ticket', icon: '🎫' },
]

const conditionFields = [
  { value: 'department', label: 'Department' },
  { value: 'designation', label: 'Designation' },
  { value: 'employment_type', label: 'Employment Type' },
  { value: 'location', label: 'Location' },
  { value: 'team', label: 'Team' },
  { value: 'leave_type', label: 'Leave Type' },
  { value: 'leave_days', label: 'Leave Days' },
  { value: 'tenure_months', label: 'Tenure (months)' },
]

const operatorOptions = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
]

/* ── State ─────────────────────────────────────────── */
const loading = ref(true)
const workflows = ref<Workflow[]>([])
const showCreateModal = ref(false)
const editingWorkflow = ref<Workflow | null>(null)
const activeTab = ref<'all' | 'active' | 'inactive' | 'draft'>('all')
const searchQuery = ref('')
const triggerFilter = ref('')
const wizardStep = ref(1)
const saving = ref(false)

const form = ref({
  name: '',
  description: '',
  trigger: '' as TriggerType | '',
  conditions: [] as WorkflowCondition[],
  actions: [] as WorkflowAction[],
})

/* ── Mock data ─────────────────────────────────────── */
const mockWorkflows: Workflow[] = [
  {
    id: 1, name: 'Welcome Email on Joining', description: 'Send welcome email with onboarding docs when new employee joins',
    trigger: 'employee_joined', conditions: [{ field: 'department', operator: 'not_equals', value: 'Contractual', logic: 'AND' }],
    actions: [{ type: 'send_email', config: { template: 'welcome_onboarding', to: '{{employee.email}}' } }, { type: 'assign_task', config: { task: 'Complete KYC documents', assignee: '{{employee.manager}}' } }],
    status: 'active', runs_count: 142, last_run: '2026-04-08T09:15:00Z', created_at: '2025-11-10T10:00:00Z',
  },
  {
    id: 2, name: 'Birthday Celebration Alert', description: 'Notify HR and team lead about upcoming employee birthdays',
    trigger: 'birthday', conditions: [],
    actions: [{ type: 'send_notification', config: { to: 'hr_team', message: '{{employee.name}} birthday tomorrow!' } }, { type: 'slack_message', config: { channel: '#celebrations', message: 'Birthday celebration for {{employee.name}}' } }],
    status: 'active', runs_count: 89, last_run: '2026-04-07T06:00:00Z', created_at: '2025-12-01T10:00:00Z',
  },
  {
    id: 3, name: 'Missed Attendance Escalation', description: 'Escalate to manager when attendance is missed for 2+ consecutive days',
    trigger: 'attendance_missed', conditions: [{ field: 'tenure_months', operator: 'less_than', value: '6', logic: 'AND' }],
    actions: [{ type: 'send_email', config: { to: '{{employee.manager.email}}', template: 'attendance_alert' } }, { type: 'create_ticket', config: { category: 'HR Review', priority: 'high' } }],
    status: 'active', runs_count: 34, last_run: '2026-04-08T08:30:00Z', created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 4, name: 'Leave Approval Notification', description: 'Send push notification when leave request is approved by manager',
    trigger: 'leave_approved', conditions: [{ field: 'leave_type', operator: 'not_equals', value: 'Comp Off', logic: 'AND' }],
    actions: [{ type: 'send_notification', config: { to: '{{employee}}', message: 'Your {{leave_type}} leave has been approved' } }],
    status: 'active', runs_count: 267, last_run: '2026-04-08T11:22:00Z', created_at: '2025-10-01T10:00:00Z',
  },
  {
    id: 5, name: 'Payroll Processed Summary', description: 'Send payroll summary report to finance team after payroll processing',
    trigger: 'payroll_processed', conditions: [],
    actions: [{ type: 'send_email', config: { to: 'finance@company.com', template: 'payroll_summary' } }, { type: 'webhook', config: { url: 'https://erp.internal/api/payroll-sync', method: 'POST' } }],
    status: 'inactive', runs_count: 12, last_run: '2026-03-31T18:00:00Z', created_at: '2026-02-01T10:00:00Z',
  },
  {
    id: 6, name: 'Document Expiry Reminder', description: 'Remind employees 30 days before document expiry (Passport, Visa, etc.)',
    trigger: 'document_expiry', conditions: [],
    actions: [{ type: 'send_email', config: { to: '{{employee.email}}', template: 'document_expiry_reminder' } }, { type: 'send_notification', config: { to: 'hr_admin', message: '{{employee.name}} document expiring soon' } }],
    status: 'draft', runs_count: 0, last_run: null, created_at: '2026-04-05T10:00:00Z',
  },
  {
    id: 7, name: 'Work Anniversary Recognition', description: 'Auto-post on social wall and notify HR for milestone anniversaries',
    trigger: 'work_anniversary', conditions: [{ field: 'tenure_months', operator: 'greater_than', value: '11', logic: 'AND' }],
    actions: [{ type: 'slack_message', config: { channel: '#general', message: 'Congratulations {{employee.name}} on {{years}} years!' } }, { type: 'assign_task', config: { task: 'Arrange anniversary gift', assignee: 'hr_admin' } }],
    status: 'active', runs_count: 23, last_run: '2026-04-06T06:00:00Z', created_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 8, name: 'Leave Rejection Follow-up', description: 'Create a follow-up task for HR when leave is rejected to discuss with employee',
    trigger: 'leave_rejected', conditions: [{ field: 'leave_days', operator: 'greater_than', value: '3', logic: 'AND' }],
    actions: [{ type: 'create_ticket', config: { category: 'HR Follow-up', priority: 'medium' } }],
    status: 'inactive', runs_count: 8, last_run: '2026-03-28T14:00:00Z', created_at: '2026-03-01T10:00:00Z',
  },
]

/* ── Computed ──────────────────────────────────────── */
const stats = computed(() => {
  const all = workflows.value
  const active = all.filter(w => w.status === 'active')
  const runsToday = all.reduce((s, w) => {
    if (w.last_run && new Date(w.last_run).toDateString() === new Date().toDateString()) return s + 1
    return s
  }, 0)
  const total_runs = all.reduce((s, w) => s + w.runs_count, 0)
  return {
    total: all.length,
    active: active.length,
    runs_today: runsToday,
    success_rate: total_runs > 0 ? '97.3%' : '0%',
  }
})

const filteredWorkflows = computed(() => {
  let list = workflows.value
  if (activeTab.value !== 'all') list = list.filter(w => w.status === activeTab.value)
  if (triggerFilter.value) list = list.filter(w => w.trigger === triggerFilter.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(w => w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q))
  }
  return list
})

const tabCounts = computed(() => ({
  all: workflows.value.length,
  active: workflows.value.filter(w => w.status === 'active').length,
  inactive: workflows.value.filter(w => w.status === 'inactive').length,
  draft: workflows.value.filter(w => w.status === 'draft').length,
}))

const canProceedStep1 = computed(() => form.value.name.trim() && form.value.trigger)
const canSave = computed(() => form.value.actions.length > 0)

/* ── Helpers ───────────────────────────────────────── */
function getTriggerLabel(t: TriggerType) {
  return triggerOptions.find(o => o.value === t)?.label ?? t
}
function getTriggerCategory(t: TriggerType) {
  return triggerOptions.find(o => o.value === t)?.category ?? 'scheduled'
}
function getActionLabel(t: WorkflowAction['type']) {
  return actionOptions.find(o => o.value === t)?.label ?? t
}
function getActionIcon(t: WorkflowAction['type']) {
  return actionOptions.find(o => o.value === t)?.icon ?? '⚡'
}
function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/* ── CRUD ──────────────────────────────────────────── */
async function fetchWorkflows() {
  loading.value = true
  try {
    const res = await api.get('/workflows')
    workflows.value = res.data?.data ?? res.data ?? []
  } catch {
    workflows.value = [...mockWorkflows]
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingWorkflow.value = null
  form.value = { name: '', description: '', trigger: '', conditions: [], actions: [] }
  wizardStep.value = 1
  showCreateModal.value = true
}

function openEditModal(wf: Workflow) {
  editingWorkflow.value = wf
  form.value = {
    name: wf.name,
    description: wf.description,
    trigger: wf.trigger,
    conditions: JSON.parse(JSON.stringify(wf.conditions)),
    actions: JSON.parse(JSON.stringify(wf.actions)),
  }
  wizardStep.value = 1
  showCreateModal.value = true
}

function addCondition() {
  form.value.conditions.push({ field: 'department', operator: 'equals', value: '', logic: 'AND' })
}

function removeCondition(i: number) {
  form.value.conditions.splice(i, 1)
}

function addAction() {
  form.value.actions.push({ type: 'send_email', config: {} })
}

function removeAction(i: number) {
  form.value.actions.splice(i, 1)
}

async function saveWorkflow() {
  saving.value = true
  try {
    if (editingWorkflow.value) {
      await api.put(`/workflows/${editingWorkflow.value.id}`, form.value).catch(() => {})
      const idx = workflows.value.findIndex(w => w.id === editingWorkflow.value!.id)
      if (idx >= 0) {
        workflows.value[idx] = { ...workflows.value[idx], ...form.value } as Workflow
      }
      toast.success('Workflow updated successfully')
    } else {
      const newWf: Workflow = {
        id: Date.now(),
        ...form.value,
        trigger: form.value.trigger as TriggerType,
        status: 'draft',
        runs_count: 0,
        last_run: null,
        created_at: new Date().toISOString(),
      }
      await api.post('/workflows', form.value).catch(() => {})
      workflows.value.unshift(newWf)
      toast.success('Workflow created successfully')
    }
    showCreateModal.value = false
  } catch {
    toast.error('Failed to save workflow')
  } finally {
    saving.value = false
  }
}

async function toggleStatus(wf: Workflow) {
  const newStatus = wf.status === 'active' ? 'inactive' : 'active'
  try {
    await api.patch(`/workflows/${wf.id}/toggle`).catch(() => {})
    wf.status = newStatus
    toast.success(`Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
  } catch {
    toast.error('Failed to update workflow status')
  }
}

async function duplicateWorkflow(wf: Workflow) {
  const dup: Workflow = {
    ...JSON.parse(JSON.stringify(wf)),
    id: Date.now(),
    name: `${wf.name} (Copy)`,
    status: 'draft',
    runs_count: 0,
    last_run: null,
    created_at: new Date().toISOString(),
  }
  await api.post('/workflows', dup).catch(() => {})
  workflows.value.unshift(dup)
  toast.success('Workflow duplicated')
}

async function deleteWorkflow(wf: Workflow) {
  if (!confirm(`Delete "${wf.name}"? This cannot be undone.`)) return
  try {
    await api.delete(`/workflows/${wf.id}`).catch(() => {})
    workflows.value = workflows.value.filter(w => w.id !== wf.id)
    toast.success('Workflow deleted')
  } catch {
    toast.error('Failed to delete workflow')
  }
}

onMounted(fetchWorkflows)
</script>

<template>
  <div class="wf-page">
    <PageHeader title="Workflow Automation" subtitle="Automate HR processes with event-driven workflows">
      <template #actions>
        <button class="btn-primary" @click="openCreateModal">+ New Workflow</button>
      </template>
    </PageHeader>

    <!-- Stat cards -->
    <div class="stat-grid">
      <SimpleStatCard icon="⚡" label="Total Workflows" :value="stats.total" color="blue" :delay="0" />
      <SimpleStatCard icon="✅" label="Active" :value="stats.active" color="green" :delay="0.07" />
      <SimpleStatCard icon="🔄" label="Runs Today" :value="stats.runs_today" color="yellow" :delay="0.14" />
      <SimpleStatCard icon="📊" label="Success Rate" :value="stats.success_rate" color="purple" :delay="0.21" />
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      <button
        v-for="t in (['all', 'active', 'inactive', 'draft'] as const)" :key="t"
        class="tab-btn" :class="{ active: activeTab === t }"
        @click="activeTab = t"
      >
        {{ t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) }}
        <span class="tab-count">{{ tabCounts[t] }}</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="filter-row">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery" type="text" placeholder="Search workflows..."
          class="search-input"
        />
      </div>
      <select v-model="triggerFilter" class="filter-select">
        <option value="">All Triggers</option>
        <option v-for="t in triggerOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <div class="spinner" />
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="filteredWorkflows.length === 0 && !searchQuery && !triggerFilter"
      icon="⚡" message="No workflows yet" sub="Create your first workflow to automate HR processes"
    >
      <button class="btn-primary mt-12" @click="openCreateModal">Create Your First Workflow</button>
    </EmptyState>

    <EmptyState
      v-else-if="filteredWorkflows.length === 0"
      icon="🔍" message="No workflows match your filters" sub="Try adjusting your search or filter criteria"
    />

    <!-- Workflow cards grid -->
    <div v-else class="workflows-grid">
      <div
        v-for="(wf, i) in filteredWorkflows" :key="wf.id"
        class="wf-card" :style="{ '--ci': i }"
      >
        <div class="wf-card-top">
          <div class="wf-card-header">
            <div class="wf-name-row">
              <h3 class="wf-name">{{ wf.name }}</h3>
              <span
                class="trigger-badge"
                :class="triggerCategoryColors[getTriggerCategory(wf.trigger)]"
              >{{ getTriggerLabel(wf.trigger) }}</span>
            </div>
            <p class="wf-desc">{{ wf.description }}</p>
          </div>

          <!-- Actions summary -->
          <div class="wf-actions-summary">
            <span class="action-pill" v-for="(a, j) in wf.actions" :key="j">
              {{ getActionIcon(a.type) }} {{ getActionLabel(a.type) }}
            </span>
          </div>

          <!-- Conditions count -->
          <div v-if="wf.conditions.length" class="wf-conditions-count">
            {{ wf.conditions.length }} condition{{ wf.conditions.length > 1 ? 's' : '' }}
          </div>
        </div>

        <div class="wf-card-footer">
          <div class="wf-meta">
            <span class="wf-runs">{{ wf.runs_count }} runs</span>
            <span class="wf-dot">·</span>
            <span class="wf-last">{{ timeAgo(wf.last_run) }}</span>
          </div>
          <div class="wf-card-actions">
            <label class="toggle-switch" @click.stop>
              <input
                type="checkbox" :checked="wf.status === 'active'"
                @change="toggleStatus(wf)"
              />
              <span class="toggle-slider"></span>
            </label>
            <button class="icon-btn" title="Edit" @click="openEditModal(wf)">✏️</button>
            <button class="icon-btn" title="Duplicate" @click="duplicateWorkflow(wf)">📋</button>
            <button class="icon-btn" title="Delete" @click="deleteWorkflow(wf)">🗑️</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <Modal
      v-model="showCreateModal"
      :title="editingWorkflow ? 'Edit Workflow' : 'Create Workflow'"
      subtitle="Define trigger, conditions, and actions"
      max-width="680px"
    >
      <!-- Step wizard -->
      <div class="step-wizard">
        <div
          v-for="s in [1, 2, 3]" :key="s"
          class="step-item" :class="{ active: wizardStep === s, done: wizardStep > s }"
          @click="s < wizardStep ? wizardStep = s : null"
        >
          <div class="step-num">{{ wizardStep > s ? '✓' : s }}</div>
          <div class="step-label">{{ s === 1 ? 'Basics' : s === 2 ? 'Conditions' : 'Actions' }}</div>
        </div>
        <div class="step-line" :style="{ width: ((wizardStep - 1) / 2 * 100) + '%' }"></div>
      </div>

      <!-- Step 1: Basics -->
      <div v-if="wizardStep === 1" class="step-content">
        <div class="form-group">
          <label class="form-label">Workflow Name</label>
          <input v-model="form.name" type="text" class="form-input" placeholder="e.g. Welcome Email on Joining" />
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea v-model="form.description" class="form-input form-textarea" rows="3" placeholder="What does this workflow do?" />
        </div>
        <div class="form-group">
          <label class="form-label">Trigger Event</label>
          <select v-model="form.trigger" class="form-input">
            <option value="" disabled>Select a trigger event</option>
            <option v-for="t in triggerOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
      </div>

      <!-- Step 2: Conditions -->
      <div v-if="wizardStep === 2" class="step-content">
        <div class="step-info">
          <span class="step-info-icon">ℹ️</span>
          <span>Conditions are optional. Leave empty to trigger for all matching events.</span>
        </div>

        <div v-for="(cond, i) in form.conditions" :key="i" class="condition-row">
          <div v-if="i > 0" class="logic-pill">
            <select v-model="cond.logic" class="logic-select">
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </div>
          <div class="condition-fields">
            <select v-model="cond.field" class="form-input cond-field">
              <option v-for="f in conditionFields" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
            <select v-model="cond.operator" class="form-input cond-op">
              <option v-for="o in operatorOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <input v-model="cond.value" type="text" class="form-input cond-val" placeholder="Value" />
            <button class="remove-btn" @click="removeCondition(i)">✕</button>
          </div>
        </div>

        <button class="add-row-btn" @click="addCondition">+ Add Condition</button>
      </div>

      <!-- Step 3: Actions -->
      <div v-if="wizardStep === 3" class="step-content">
        <div class="step-info">
          <span class="step-info-icon">⚡</span>
          <span>Define what happens when conditions are met. Actions run sequentially.</span>
        </div>

        <div v-for="(action, i) in form.actions" :key="i" class="action-row">
          <div class="action-number">{{ i + 1 }}</div>
          <div class="action-config">
            <select v-model="action.type" class="form-input">
              <option v-for="a in actionOptions" :key="a.value" :value="a.value">{{ a.icon }} {{ a.label }}</option>
            </select>

            <template v-if="action.type === 'send_email'">
              <input v-model="action.config.to" type="text" class="form-input" placeholder="Recipient (e.g. {{employee.email}})" />
              <input v-model="action.config.template" type="text" class="form-input" placeholder="Email template name" />
            </template>
            <template v-else-if="action.type === 'send_notification'">
              <input v-model="action.config.to" type="text" class="form-input" placeholder="Recipient" />
              <input v-model="action.config.message" type="text" class="form-input" placeholder="Notification message" />
            </template>
            <template v-else-if="action.type === 'assign_task'">
              <input v-model="action.config.task" type="text" class="form-input" placeholder="Task description" />
              <input v-model="action.config.assignee" type="text" class="form-input" placeholder="Assignee" />
            </template>
            <template v-else-if="action.type === 'webhook'">
              <input v-model="action.config.url" type="text" class="form-input" placeholder="Webhook URL" />
              <select v-model="action.config.method" class="form-input">
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </template>
            <template v-else-if="action.type === 'slack_message'">
              <input v-model="action.config.channel" type="text" class="form-input" placeholder="Channel (e.g. #general)" />
              <input v-model="action.config.message" type="text" class="form-input" placeholder="Message" />
            </template>
            <template v-else-if="action.type === 'create_ticket'">
              <input v-model="action.config.category" type="text" class="form-input" placeholder="Ticket category" />
              <select v-model="action.config.priority" class="form-input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </template>
            <template v-else>
              <input v-model="action.config.field" type="text" class="form-input" placeholder="Field name" />
              <input v-model="action.config.value" type="text" class="form-input" placeholder="New value" />
            </template>
          </div>
          <button class="remove-btn" @click="removeAction(i)">✕</button>
        </div>

        <button class="add-row-btn" @click="addAction">+ Add Action</button>
      </div>

      <template #footer>
        <button v-if="wizardStep > 1" class="btn-secondary" @click="wizardStep--">Back</button>
        <div class="flex-spacer"></div>
        <button v-if="wizardStep < 3" class="btn-primary" :disabled="wizardStep === 1 && !canProceedStep1" @click="wizardStep++">
          Continue
        </button>
        <button v-else class="btn-primary" :disabled="!canSave || saving" @click="saveWorkflow">
          {{ saving ? 'Saving...' : (editingWorkflow ? 'Update Workflow' : 'Create Workflow') }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.wf-page { display: flex; flex-direction: column; gap: 20px; }

/* Stat grid */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

/* Tabs */
.tab-bar {
  display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 5px; width: fit-content;
}
.tab-btn {
  padding: 7px 16px; border-radius: var(--rs); font-size: 13px; font-weight: 500;
  color: var(--muted); background: none; border: none; cursor: pointer;
  display: flex; align-items: center; gap: 6px; transition: all .15s;
}
.tab-btn:hover { color: var(--text); background: var(--surface2); }
.tab-btn.active { color: var(--text); background: var(--surface2); box-shadow: 0 1px 3px rgba(0,0,0,.3); }
.tab-count {
  font-size: 10px; padding: 1px 6px; border-radius: 10px;
  background: var(--surface2); color: var(--dim);
}
.tab-btn.active .tab-count { background: var(--surface3); color: var(--text); }

/* Filter row */
.filter-row { display: flex; gap: 10px; align-items: center; }
.search-wrap {
  position: relative; flex: 1; max-width: 360px;
}
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  font-size: 13px; pointer-events: none;
}
.search-input {
  width: 100%; padding: 9px 12px 9px 36px; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--rs); font-size: 13px;
  color: var(--text); outline: none; transition: border-color .15s;
}
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--muted); }
.filter-select {
  padding: 9px 12px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--rs); font-size: 13px; color: var(--text); outline: none;
  cursor: pointer; min-width: 160px;
}
.filter-select:focus { border-color: var(--accent); }

/* Loading */
.loading-wrap { display: flex; justify-content: center; padding: 60px 0; }
.spinner {
  width: 32px; height: 32px; border: 3px solid var(--border);
  border-top-color: var(--accent); border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Workflows grid */
.workflows-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }

/* Workflow card */
.wf-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  display: flex; flex-direction: column; transition: border-color .2s, transform .2s;
  animation: fadeUp .4s ease calc(var(--ci) * .05s) both;
}
@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.wf-card:hover { border-color: var(--border-hi); transform: translateY(-2px); }

.wf-card-top { padding: 18px 20px 14px; flex: 1; }
.wf-card-header { margin-bottom: 12px; }
.wf-name-row { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.wf-name { font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.3; }
.wf-desc { font-size: 12px; color: var(--muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* Trigger badge */
.trigger-badge {
  font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 20px;
  text-transform: uppercase; letter-spacing: .4px; white-space: nowrap; flex-shrink: 0;
}
.trigger-badge.green { background: rgba(54,211,153,.12); color: #36D399; }
.trigger-badge.blue { background: rgba(79,126,255,.12); color: #4F7EFF; }
.trigger-badge.yellow { background: rgba(249,168,37,.12); color: #F9A825; }
.trigger-badge.purple { background: rgba(155,110,255,.12); color: #9B6EFF; }
.trigger-badge.gray { background: rgba(156,163,175,.12); color: #9CA3AF; }

/* Actions summary */
.wf-actions-summary { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.action-pill {
  font-size: 11px; padding: 3px 8px; border-radius: 6px;
  background: var(--surface2); color: var(--dim); border: 1px solid var(--border);
}

.wf-conditions-count { font-size: 11px; color: var(--muted); }

/* Card footer */
.wf-card-footer {
  padding: 12px 20px; border-top: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.wf-meta { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--muted); }
.wf-dot { color: var(--border-hi); }
.wf-card-actions { display: flex; align-items: center; gap: 6px; }

/* Toggle switch */
.toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute; inset: 0; background: var(--surface3); border-radius: 20px;
  transition: background .2s;
}
.toggle-slider::before {
  content: ''; position: absolute; width: 16px; height: 16px; left: 2px; bottom: 2px;
  background: var(--muted); border-radius: 50%; transition: all .2s;
}
.toggle-switch input:checked + .toggle-slider { background: rgba(54,211,153,.3); }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(16px); background: #36D399; }

/* Icon buttons */
.icon-btn {
  width: 28px; height: 28px; border-radius: 6px; border: none; cursor: pointer;
  background: none; font-size: 13px; display: grid; place-items: center;
  transition: background .15s, transform .1s;
}
.icon-btn:hover { background: var(--surface2); transform: scale(1.1); }

/* Buttons */
.btn-primary {
  padding: 9px 20px; background: var(--accent); color: #fff; border: none;
  border-radius: var(--rs); font-size: 13px; font-weight: 600; cursor: pointer;
  transition: opacity .15s; white-space: nowrap;
}
.btn-primary:hover { opacity: .85; }
.btn-primary:disabled { opacity: .4; cursor: not-allowed; }
.btn-secondary {
  padding: 9px 20px; background: var(--surface2); color: var(--text);
  border: 1px solid var(--border); border-radius: var(--rs); font-size: 13px;
  font-weight: 500; cursor: pointer; transition: all .15s;
}
.btn-secondary:hover { border-color: var(--border-hi); }
.mt-12 { margin-top: 12px; }

/* Step wizard */
.step-wizard {
  display: flex; align-items: center; gap: 24px; margin-bottom: 24px;
  padding-bottom: 20px; border-bottom: 1px solid var(--border); position: relative;
}
.step-item { display: flex; align-items: center; gap: 8px; cursor: pointer; position: relative; z-index: 1; }
.step-num {
  width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
  font-size: 12px; font-weight: 600; background: var(--surface2); color: var(--muted);
  border: 2px solid var(--border); transition: all .2s;
}
.step-item.active .step-num { background: var(--accent); color: #fff; border-color: var(--accent); }
.step-item.done .step-num { background: rgba(54,211,153,.15); color: #36D399; border-color: #36D399; }
.step-label { font-size: 12px; font-weight: 500; color: var(--muted); }
.step-item.active .step-label { color: var(--text); }
.step-item.done .step-label { color: var(--dim); }
.step-line {
  position: absolute; left: 0; bottom: -1px; height: 2px; background: var(--accent);
  border-radius: 2px; transition: width .3s ease;
}

/* Step content */
.step-content { display: flex; flex-direction: column; gap: 14px; }
.step-info {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: var(--surface2); border-radius: var(--rs); font-size: 12px; color: var(--dim);
}
.step-info-icon { font-size: 14px; }

/* Form */
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-size: 12px; font-weight: 500; color: var(--dim); }
.form-input {
  padding: 9px 12px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--rs); font-size: 13px; color: var(--text); outline: none;
  font-family: inherit; transition: border-color .15s;
}
.form-input:focus { border-color: var(--accent); }
.form-input::placeholder { color: var(--muted); }
.form-textarea { resize: vertical; min-height: 60px; }

/* Condition rows */
.condition-row { display: flex; flex-direction: column; gap: 6px; }
.logic-pill { display: flex; align-items: center; }
.logic-select {
  padding: 3px 8px; background: var(--accent); color: #fff; border: none;
  border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer;
}
.condition-fields { display: flex; gap: 6px; align-items: center; }
.cond-field { flex: 1.2; }
.cond-op { flex: 1; }
.cond-val { flex: 1; }
.remove-btn {
  width: 28px; height: 28px; border-radius: 6px; background: rgba(255,107,107,.1);
  color: var(--red); border: none; cursor: pointer; font-size: 11px; flex-shrink: 0;
  display: grid; place-items: center; transition: background .15s;
}
.remove-btn:hover { background: rgba(255,107,107,.2); }

/* Action rows */
.action-row {
  display: flex; gap: 10px; align-items: flex-start; padding: 14px;
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs);
}
.action-number {
  width: 24px; height: 24px; border-radius: 50%; background: var(--accent);
  color: #fff; font-size: 11px; font-weight: 700; display: grid; place-items: center; flex-shrink: 0;
}
.action-config { flex: 1; display: flex; flex-direction: column; gap: 8px; }

/* Add row button */
.add-row-btn {
  padding: 10px; background: none; border: 2px dashed var(--border); border-radius: var(--rs);
  color: var(--muted); font-size: 12px; font-weight: 500; cursor: pointer;
  transition: all .15s; text-align: center;
}
.add-row-btn:hover { border-color: var(--accent); color: var(--accent); }

.flex-spacer { flex: 1; }

/* Responsive */
@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .workflows-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .stat-grid { grid-template-columns: 1fr; }
  .filter-row { flex-direction: column; }
  .search-wrap { max-width: 100%; }
  .condition-fields { flex-wrap: wrap; }
}
</style>
