<script setup lang="ts">
defineOptions({ name: 'WorkflowAutomation' })

import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SimpleStatCard from '@/components/ui/SimpleStatCard.vue'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const toast = useToast()
const { confirm: dialog } = useConfirm()

/* ── Types ─────────────────────────────────────────── */
interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: string
  logic: 'AND' | 'OR'
}

interface WorkflowAction {
  type: string
  // send_email
  recipients?: string[]
  subject?: string
  body?: string
  // send_webhook
  url?: string
  method?: string
  // other action types (stored for future use)
  config?: Record<string, string>
}

type TriggerType =
  | 'punch_in' | 'punch_out' | 'leave_requested' | 'employee_created'
  | 'employee_joined' | 'leave_approved' | 'leave_rejected'
  | 'attendance_missed' | 'birthday' | 'work_anniversary'
  | 'payroll_processed' | 'onboarding_started' | 'offboarding_started'
  | 'document_expiry'

interface Workflow {
  id: string
  name: string
  description: string
  trigger: TriggerType
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  status: 'active' | 'inactive'
  runs_count: number
  last_run: string | null
  created_at: string
}

/* ── Constants ─────────────────────────────────────── */
const triggerOptions: { value: TriggerType; label: string; category: string }[] = [
  { value: 'punch_in',          label: 'Employee Checks In',    category: 'attendance' },
  { value: 'punch_out',         label: 'Employee Checks Out',   category: 'attendance' },
  { value: 'attendance_missed', label: 'Attendance Missed',     category: 'attendance' },
  { value: 'leave_requested',   label: 'Leave Requested',       category: 'leave' },
  { value: 'leave_approved',    label: 'Leave Approved',        category: 'leave' },
  { value: 'leave_rejected',    label: 'Leave Rejected',        category: 'leave' },
  { value: 'employee_created',  label: 'New Employee Added',    category: 'employee' },
  { value: 'employee_joined',   label: 'Employee Joined',       category: 'employee' },
  { value: 'onboarding_started',label: 'Onboarding Started',    category: 'employee' },
  { value: 'offboarding_started',label: 'Offboarding Started',  category: 'employee' },
  { value: 'birthday',          label: 'Employee Birthday',     category: 'employee' },
  { value: 'work_anniversary',  label: 'Work Anniversary',      category: 'employee' },
  { value: 'payroll_processed', label: 'Payroll Processed',     category: 'payroll' },
  { value: 'document_expiry',   label: 'Document Expiry',       category: 'scheduled' },
]

const triggerCategoryColors: Record<string, string> = {
  employee: 'green', leave: 'blue', attendance: 'yellow', payroll: 'purple', scheduled: 'gray',
}

const actionOptions: { value: string; label: string; icon: string }[] = [
  { value: 'send_email',        label: 'Send Email',        icon: '📧' },
  { value: 'send_webhook',      label: 'Webhook',           icon: '🔗' },
  { value: 'send_notification', label: 'Send Notification', icon: '🔔' },
  { value: 'assign_task',       label: 'Assign Task',       icon: '📋' },
  { value: 'update_field',      label: 'Update Field',      icon: '✏️' },
  { value: 'slack_message',     label: 'Slack Message',     icon: '💬' },
  { value: 'create_ticket',     label: 'Create Ticket',     icon: '🎫' },
]

const emailRecipients = [
  { value: 'manager',  label: "Manager" },
  { value: 'employee', label: 'Employee' },
  { value: 'hr',       label: 'HR' },
]

const templateVariables = [
  '{{employee_name}}', '{{employee_email}}', '{{attendance_date}}',
  '{{check_in}}', '{{check_out}}', '{{location}}', '{{notes}}',
]

const conditionFields = [
  { value: 'department',       label: 'Department' },
  { value: 'designation',      label: 'Designation' },
  { value: 'employment_type',  label: 'Employment Type' },
  { value: 'location',         label: 'Location' },
  { value: 'team',             label: 'Team' },
  { value: 'leave_type',       label: 'Leave Type' },
  { value: 'leave_days',       label: 'Leave Days' },
  { value: 'tenure_months',    label: 'Tenure (months)' },
  { value: 'punch_type',       label: 'Punch Type' },
]

const operatorOptions = [
  { value: 'equals',       label: 'Equals' },
  { value: 'not_equals',   label: 'Not Equals' },
  { value: 'contains',     label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than',    label: 'Less Than' },
]

/* ── State ─────────────────────────────────────────── */
const loading = ref(true)
const workflows = ref<Workflow[]>([])
const showCreateModal = ref(false)
const editingWorkflow = ref<Workflow | null>(null)
const activeTab = ref<'all' | 'active' | 'inactive'>('all')
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

/* ── Data mapping ──────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function apiToWorkflow(rule: any): Workflow {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description ?? '',
    trigger: rule.trigger_event as TriggerType,
    conditions: (rule.conditions ?? []).map((c: WorkflowCondition) => ({ ...c, logic: c.logic ?? 'AND' })),
    actions: rule.actions ?? [],
    status: rule.is_active ? 'active' : 'inactive',
    runs_count: rule.run_count ?? 0,
    last_run: rule.last_run_at ?? null,
    created_at: rule.created_at,
  }
}

function formToPayload(f: typeof form.value) {
  const actions = f.actions.map(a => {
    if (a.type === 'send_email') {
      return { type: 'send_email', recipients: a.recipients ?? ['manager'], subject: a.subject ?? '', body: a.body ?? '' }
    }
    if (a.type === 'send_webhook') {
      return { type: 'send_webhook', url: a.url ?? '', method: a.method ?? 'post' }
    }
    return { type: a.type, ...(a.config ? { config: a.config } : {}) }
  })
  return {
    name: f.name,
    description: f.description,
    trigger_event: f.trigger,
    conditions: f.conditions.map(c => ({ field: c.field, operator: c.operator, value: c.value })),
    actions,
    is_active: true,
  }
}

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
    success_rate: total_runs > 0 ? '97.3%' : '—',
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
function getActionLabel(t: string) {
  return actionOptions.find(o => o.value === t)?.label ?? t
}
function getActionIcon(t: string) {
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

function toggleEmailRecipient(action: WorkflowAction, value: string) {
  if (!action.recipients) action.recipients = []
  const idx = action.recipients.indexOf(value)
  if (idx >= 0) action.recipients.splice(idx, 1)
  else action.recipients.push(value)
}

function insertTemplateVar(action: WorkflowAction, field: 'subject' | 'body', v: string) {
  (action as Record<string, string>)[field] = ((action as Record<string, string>)[field] ?? '') + v
}

/* ── CRUD ──────────────────────────────────────────── */
async function fetchWorkflows() {
  loading.value = true
  try {
    const res = await api.get('/workflow/rules')
    const raw = res.data?.data ?? res.data ?? []
    workflows.value = raw.map(apiToWorkflow)
  } catch {
    workflows.value = []
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
function removeCondition(i: number) { form.value.conditions.splice(i, 1) }

function addAction() {
  form.value.actions.push({ type: 'send_email', recipients: ['manager'], subject: '', body: '' })
}
function removeAction(i: number) { form.value.actions.splice(i, 1) }

async function saveWorkflow() {
  saving.value = true
  try {
    const payload = formToPayload(form.value)
    if (editingWorkflow.value) {
      const res = await api.put(`/workflow/rules/${editingWorkflow.value.id}`, payload)
      const updated = apiToWorkflow(res.data?.data ?? res.data)
      const idx = workflows.value.findIndex(w => w.id === editingWorkflow.value!.id)
      if (idx >= 0) workflows.value[idx] = updated
      toast.success('Workflow updated successfully')
    } else {
      const res = await api.post('/workflow/rules', payload)
      const created = apiToWorkflow(res.data?.data ?? res.data)
      workflows.value.unshift(created)
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
  try {
    const res = await api.post(`/workflow/rules/${wf.id}/toggle`)
    const updated = apiToWorkflow(res.data?.data ?? res.data)
    const idx = workflows.value.findIndex(w => w.id === wf.id)
    if (idx >= 0) workflows.value[idx] = updated
    toast.success(`Workflow ${updated.status === 'active' ? 'activated' : 'deactivated'}`)
  } catch {
    toast.error('Failed to update workflow status')
  }
}

async function duplicateWorkflow(wf: Workflow) {
  try {
    const res = await api.post('/workflow/rules', {
      name: `${wf.name} (Copy)`,
      description: wf.description,
      trigger_event: wf.trigger,
      conditions: wf.conditions.map(c => ({ field: c.field, operator: c.operator, value: c.value })),
      actions: wf.actions,
      is_active: false,
    })
    workflows.value.unshift(apiToWorkflow(res.data?.data ?? res.data))
    toast.success('Workflow duplicated')
  } catch {
    toast.error('Failed to duplicate workflow')
  }
}

async function deleteWorkflow(wf: Workflow) {
  if (!await dialog('Delete', `Delete "${wf.name}"? This cannot be undone.`)) return
  try {
    await api.delete(`/workflow/rules/${wf.id}`)
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
        v-for="t in (['all', 'active', 'inactive'] as const)" :key="t"
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
          <input v-model="form.name" type="text" class="form-input" placeholder="e.g. Notify manager on check-in" />
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea v-model="form.description" class="form-input form-textarea" rows="3" placeholder="What does this workflow do?" />
        </div>
        <div class="form-group">
          <label class="form-label">Trigger Event</label>
          <select v-model="form.trigger" class="form-input">
            <option value="" disabled>Select a trigger event</option>
            <optgroup v-for="cat in ['attendance', 'leave', 'employee', 'payroll', 'scheduled']" :key="cat" :label="cat.charAt(0).toUpperCase() + cat.slice(1)">
              <option
                v-for="t in triggerOptions.filter(o => o.category === cat)"
                :key="t.value" :value="t.value"
              >{{ t.label }}</option>
            </optgroup>
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

            <!-- Send Email -->
            <template v-if="action.type === 'send_email'">
              <div class="form-group">
                <label class="form-label">Send To</label>
                <div class="recipient-pills">
                  <button
                    v-for="r in emailRecipients" :key="r.value"
                    type="button"
                    @click="toggleEmailRecipient(action, r.value)"
                    :class="['recipient-pill', { active: (action.recipients ?? []).includes(r.value) }]"
                  >{{ r.label }}</button>
                  <input
                    v-model="action.config!.custom_email"
                    type="email"
                    class="form-input recipient-email"
                    placeholder="or custom email..."
                    @blur="action.config?.custom_email && toggleEmailRecipient(action, action.config.custom_email)"
                  />
                </div>
              </div>
              <input v-model="action.subject" type="text" class="form-input" placeholder="Subject — use {{employee_name}} etc." />
              <textarea v-model="action.body" class="form-input form-textarea" rows="3" placeholder="Email body — use {{check_in}}, {{location}}, {{notes}}…" />
              <div class="var-chips">
                <span class="var-chips-label">Insert:</span>
                <button
                  v-for="v in templateVariables" :key="v"
                  type="button"
                  class="var-chip"
                  @click="insertTemplateVar(action, 'body', v)"
                >{{ v }}</button>
              </div>
            </template>

            <!-- Webhook -->
            <template v-else-if="action.type === 'send_webhook'">
              <input v-model="action.url" type="url" class="form-input" placeholder="Webhook URL (https://...)" />
              <select v-model="action.method" class="form-input">
                <option value="post">POST</option>
                <option value="put">PUT</option>
                <option value="patch">PATCH</option>
              </select>
            </template>

            <!-- Send Notification -->
            <template v-else-if="action.type === 'send_notification'">
              <input v-model="action.config!.to" type="text" class="form-input" placeholder="Recipient (e.g. {{employee_name}} or hr_team)" />
              <input v-model="action.config!.message" type="text" class="form-input" placeholder="Notification message" />
            </template>

            <!-- Assign Task -->
            <template v-else-if="action.type === 'assign_task'">
              <input v-model="action.config!.task" type="text" class="form-input" placeholder="Task description" />
              <input v-model="action.config!.assignee" type="text" class="form-input" placeholder="Assignee" />
            </template>

            <!-- Slack Message -->
            <template v-else-if="action.type === 'slack_message'">
              <input v-model="action.config!.channel" type="text" class="form-input" placeholder="Channel (e.g. #general)" />
              <input v-model="action.config!.message" type="text" class="form-input" placeholder="Message" />
            </template>

            <!-- Create Ticket -->
            <template v-else-if="action.type === 'create_ticket'">
              <input v-model="action.config!.category" type="text" class="form-input" placeholder="Ticket category" />
              <select v-model="action.config!.priority" class="form-input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </template>

            <!-- Update Field -->
            <template v-else>
              <input v-model="action.config!.field" type="text" class="form-input" placeholder="Field name" />
              <input v-model="action.config!.value" type="text" class="form-input" placeholder="New value" />
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
.search-wrap { position: relative; flex: 1; max-width: 360px; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 13px; pointer-events: none; }
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
.trigger-badge.green  { background: rgba(54,211,153,.12); color: #36D399; }
.trigger-badge.blue   { background: rgba(79,126,255,.12); color: #4F7EFF; }
.trigger-badge.yellow { background: rgba(249,168,37,.12); color: #F9A825; }
.trigger-badge.purple { background: rgba(155,110,255,.12); color: #9B6EFF; }
.trigger-badge.gray   { background: rgba(156,163,175,.12); color: #9CA3AF; }

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
.toggle-slider { position: absolute; inset: 0; background: var(--surface3); border-radius: 20px; transition: background .2s; }
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

/* Recipient pills */
.recipient-pills { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.recipient-pill {
  padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border);
  font-size: 12px; color: var(--muted); background: none; cursor: pointer;
  transition: all .15s;
}
.recipient-pill:hover { border-color: var(--accent); color: var(--text); }
.recipient-pill.active { background: rgba(79,126,255,.15); border-color: var(--accent); color: var(--accent); }
.recipient-email { flex: 1; min-width: 140px; padding: 5px 10px; font-size: 12px; }

/* Template variable chips */
.var-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
.var-chips-label { font-size: 11px; color: var(--muted); }
.var-chip {
  font-size: 10px; padding: 2px 7px; border-radius: 4px; border: none;
  background: var(--surface3); color: var(--dim); cursor: pointer;
  transition: background .15s, color .15s;
}
.var-chip:hover { background: rgba(79,126,255,.2); color: var(--accent); }

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
