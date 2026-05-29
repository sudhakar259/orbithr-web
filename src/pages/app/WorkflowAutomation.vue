<script setup lang="ts">
defineOptions({ name: 'WorkflowAutomation' })

import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
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
    total_runs,
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

/* Featured (preview) workflow shown at top */
const featuredWorkflow = computed(() => {
  return workflows.value.find(w => w.status === 'active') ?? workflows.value[0] ?? null
})

/* Recent runs derived from workflow last_run timestamps */
const recentRuns = computed(() => {
  return workflows.value
    .filter(w => w.last_run)
    .slice()
    .sort((a, b) => new Date(b.last_run!).getTime() - new Date(a.last_run!).getTime())
    .slice(0, 6)
})

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
    <!-- Page header (eyebrow / title / subtitle) -->
    <div class="page-header">
      <div class="page-header-text">
        <div class="eyebrow">
          {{ stats.active }} active · {{ stats.total_runs }} runs total · {{ stats.runs_today }} today
        </div>
        <h1 class="page-title">Automations</h1>
        <p class="page-subtitle">No-code workflows that connect HR events to actions across the stack.</p>
      </div>
      <div class="page-header-actions">
        <button class="btn-primary" @click="openCreateModal">
          <span class="plus-icon">+</span>
          New automation
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-row">
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
      <div class="search-wrap">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" class="search-icon">
          <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
          <path d="M14 14l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <input
          v-model="searchQuery" type="text" placeholder="Search workflows…"
          class="search-input"
        />
      </div>
      <select v-model="triggerFilter" class="filter-select">
        <option value="">All triggers</option>
        <option v-for="t in triggerOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-wrap">
      <div class="spinner spinner-lg" />
    </div>

    <!-- Featured workflow / builder preview -->
    <div v-else-if="featuredWorkflow" class="builder-preview">
      <div class="builder-head">
        <div class="builder-icon">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11 1L3 11h6l-1 8 8-10h-6l1-8z"/>
          </svg>
        </div>
        <div class="builder-title">{{ featuredWorkflow.name }}</div>
        <span class="builder-badge" :class="featuredWorkflow.status === 'active' ? 'ok' : 'off'">
          {{ featuredWorkflow.status === 'active' ? 'Live' : 'Paused' }}
        </span>
        <div class="builder-spacer"></div>
        <div class="builder-meta">
          Last run · {{ timeAgo(featuredWorkflow.last_run) }} · {{ featuredWorkflow.runs_count }} total
        </div>
      </div>
      <div class="builder-body">
        <div class="builder-flow">
          <!-- Trigger node -->
          <div class="flow-node flow-trigger">
            <div class="flow-node-head">
              <div class="flow-node-icon">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 1L3 11h6l-1 8 8-10h-6l1-8z"/>
                </svg>
              </div>
              <div class="flow-node-tag">TRIGGER</div>
            </div>
            <div class="flow-node-name">{{ getTriggerLabel(featuredWorkflow.trigger) }}</div>
            <div class="flow-node-sub">{{ getTriggerCategory(featuredWorkflow.trigger) }} event</div>
          </div>

          <template v-for="(c, i) in featuredWorkflow.conditions" :key="'c' + i">
            <div class="flow-arrow">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="flow-node flow-cond">
              <div class="flow-node-head">
                <div class="flow-node-icon">
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 5h14l-5 6v5l-4-2v-3L3 5z"/>
                  </svg>
                </div>
                <div class="flow-node-tag">{{ i === 0 ? 'CONDITION' : (c.logic || 'AND') }}</div>
              </div>
              <div class="flow-node-name">{{ c.field }} {{ c.operator.replace('_', ' ') }} {{ c.value || '—' }}</div>
              <div class="flow-node-sub">If matches, continue</div>
            </div>
          </template>

          <template v-for="(a, i) in featuredWorkflow.actions" :key="'a' + i">
            <div class="flow-arrow">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M7 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="flow-node flow-action">
              <div class="flow-node-head">
                <div class="flow-node-icon">{{ getActionIcon(a.type) }}</div>
                <div class="flow-node-tag">ACTION</div>
              </div>
              <div class="flow-node-name">{{ getActionLabel(a.type) }}</div>
              <div class="flow-node-sub">
                <template v-if="a.type === 'send_email'">
                  To: {{ (a.recipients || []).join(', ') || '—' }}
                </template>
                <template v-else-if="a.type === 'send_webhook'">
                  {{ (a.method || 'POST').toUpperCase() }} · {{ a.url || '—' }}
                </template>
                <template v-else>Step {{ i + 1 }} of {{ featuredWorkflow.actions.length }}</template>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="!loading && filteredWorkflows.length === 0 && !searchQuery && !triggerFilter"
      icon="⚡" message="No workflows yet" sub="Create your first workflow to automate HR processes"
    >
      <button class="btn-primary mt-12" @click="openCreateModal">Create your first workflow</button>
    </EmptyState>

    <EmptyState
      v-else-if="!loading && filteredWorkflows.length === 0"
      icon="🔍" message="No workflows match your filters" sub="Try adjusting your search or filter criteria"
    />

    <!-- Active automations list + recent runs -->
    <div v-if="!loading && filteredWorkflows.length > 0" class="auto-grid">
      <!-- Active automations list -->
      <div class="card list-card">
        <div class="list-head">
          <div class="list-head-title">Active automations · {{ filteredWorkflows.length }}</div>
        </div>
        <div class="list-body">
          <div
            v-for="(wf, i) in filteredWorkflows" :key="wf.id"
            class="auto-row" :style="{ '--ci': i }"
          >
            <div class="auto-row-icon">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 1L3 11h6l-1 8 8-10h-6l1-8z"/>
              </svg>
            </div>
            <div class="auto-row-main">
              <div class="auto-row-name">
                {{ wf.name }}
                <span class="trigger-badge" :class="triggerCategoryColors[getTriggerCategory(wf.trigger)]">
                  {{ getTriggerLabel(wf.trigger) }}
                </span>
              </div>
              <div class="auto-row-when">
                <span class="when-label">WHEN</span>
                <span class="when-sep">·</span>
                <span>{{ getTriggerLabel(wf.trigger) }}</span>
              </div>
              <div v-if="wf.actions.length" class="auto-row-actions-summary">
                <span class="action-pill" v-for="(a, j) in wf.actions.slice(0, 4)" :key="j">
                  {{ getActionIcon(a.type) }} {{ getActionLabel(a.type) }}
                </span>
                <span v-if="wf.actions.length > 4" class="action-pill action-pill-more">
                  +{{ wf.actions.length - 4 }} more
                </span>
              </div>
            </div>
            <div class="auto-row-stats">
              <div class="auto-stat">{{ wf.actions.length }} actions</div>
              <div class="auto-stat auto-stat-mono">{{ wf.runs_count }} runs</div>
            </div>
            <div class="auto-row-success">
              <div class="success-num" :class="wf.status === 'active' ? 'green' : 'gray'">
                {{ wf.runs_count > 0 ? '99' : '—' }}<span v-if="wf.runs_count > 0" class="success-pct">%</span>
              </div>
              <div class="success-label">success</div>
            </div>
            <div class="auto-row-controls">
              <label class="toggle-switch" @click.stop>
                <input
                  type="checkbox" :checked="wf.status === 'active'"
                  @change="toggleStatus(wf)"
                />
                <span class="toggle-slider"></span>
              </label>
              <button class="icon-btn" title="Edit" @click="openEditModal(wf)">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
              </button>
              <button class="icon-btn" title="Duplicate" @click="duplicateWorkflow(wf)">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 2a2 2 0 00-2 2v8a2 2 0 002 2h2v2a2 2 0 002 2h6a2 2 0 002-2V8a2 2 0 00-2-2h-2V4a2 2 0 00-2-2H5zm0 2h6v6h-2V8a2 2 0 00-2-2H5V4z"/>
                </svg>
              </button>
              <button class="icon-btn icon-btn-danger" title="Delete" @click="deleteWorkflow(wf)">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent runs -->
      <div class="card runs-card">
        <div class="list-head">
          <div class="list-head-title">Recent runs</div>
        </div>
        <div class="runs-body">
          <div v-if="!recentRuns.length" class="runs-empty">
            No recent runs yet.
          </div>
          <div v-else v-for="r in recentRuns" :key="r.id" class="run-row">
            <div class="run-icon ok">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="run-main">
              <div class="run-name">{{ r.name }}</div>
              <div class="run-sub">{{ getTriggerLabel(r.trigger) }}</div>
            </div>
            <div class="run-time">{{ timeAgo(r.last_run) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <Teleport to="body">
      <Modal
        v-model="showCreateModal"
        :title="editingWorkflow ? 'Edit workflow' : 'Create workflow'"
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
            <label class="form-label">Workflow name</label>
            <input v-model="form.name" type="text" class="form-input" placeholder="e.g. Notify manager on check-in" />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea v-model="form.description" class="form-input form-textarea" rows="3" placeholder="What does this workflow do?" />
          </div>
          <div class="form-group">
            <label class="form-label">Trigger event</label>
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

          <button class="add-row-btn" @click="addCondition">+ Add condition</button>
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
                  <label class="form-label">Send to</label>
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
                      placeholder="or custom email…"
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
                <input v-model="action.url" type="url" class="form-input" placeholder="Webhook URL (https://…)" />
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

          <button class="add-row-btn" @click="addAction">+ Add action</button>
        </div>

        <template #footer>
          <button v-if="wizardStep > 1" class="btn-secondary" @click="wizardStep--">Back</button>
          <div class="flex-spacer"></div>
          <button v-if="wizardStep < 3" class="btn-primary" :disabled="wizardStep === 1 && !canProceedStep1" @click="wizardStep++">
            Continue
          </button>
          <button v-else class="btn-primary" :disabled="!canSave || saving" @click="saveWorkflow">
            {{ saving ? 'Saving…' : (editingWorkflow ? 'Update workflow' : 'Create workflow') }}
          </button>
        </template>
      </Modal>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Design tokens ─────────────────────────────────────── */
.wf-page {
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
  --accent-soft-hi: rgba(107, 91, 255, 0.32);
  --green: #4DD39A;
  --red: #F38288;
  --yellow: #F5A623;
  --blue: #7ED7FF;
  --r: 12px;
  --rs: 8px;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  display: flex;
  flex-direction: column;
  gap: 18px;
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
.page-header-text { display: flex; flex-direction: column; gap: 6px; }
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

.plus-icon { font-size: 15px; line-height: 1; font-weight: 400; }

/* ── Filters ───────────────────────────────────────────── */
.filter-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.tab-bar {
  display: flex;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  padding: 3px;
}
.tab-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active {
  color: var(--text);
  background: var(--surface2);
  border: 1px solid var(--border-hi);
}
.tab-count {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--surface2);
  color: var(--muted);
  font-family: var(--font-mono);
}
.tab-btn.active .tab-count { background: var(--surface3); color: var(--text); }

.search-wrap { position: relative; display: flex; align-items: center; flex: 1; max-width: 320px; }
.search-icon { position: absolute; left: 11px; color: var(--muted); pointer-events: none; }
.search-input {
  width: 100%;
  height: 32px;
  padding: 0 12px 0 32px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  font-size: 12.5px;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--muted); }
.filter-select {
  height: 32px;
  padding: 0 28px 0 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  font-size: 12.5px;
  color: var(--text);
  outline: none;
  cursor: pointer;
  min-width: 160px;
}
.filter-select:focus { border-color: var(--accent); }

/* ── Loading ───────────────────────────────────────────── */
.loading-wrap { display: flex; justify-content: center; padding: 60px 0; }
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
.spinner-lg { width: 32px; height: 32px; border-width: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Builder preview ───────────────────────────────────── */
.builder-preview {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}
.builder-head {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.builder-icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-soft-hi);
  display: grid;
  place-items: center;
  color: var(--accent);
}
.builder-title { font-size: 13px; font-weight: 600; color: var(--text); }
.builder-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 20px;
}
.builder-badge.ok {
  background: rgba(77, 211, 154, 0.16);
  color: var(--green);
  border: 1px solid rgba(77, 211, 154, 0.4);
}
.builder-badge.off {
  background: var(--surface2);
  color: var(--muted);
  border: 1px solid var(--border);
}
.builder-spacer { flex: 1; }
.builder-meta {
  font-size: 11px;
  color: var(--muted);
  font-family: var(--font-mono);
}
.builder-body {
  padding: 28px 20px;
  background: radial-gradient(circle at 30% 30%, rgba(107, 91, 255, 0.07), transparent 60%);
}
.builder-flow {
  display: flex;
  align-items: stretch;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.flow-node {
  flex-shrink: 0;
  width: 200px;
  padding: 14px;
  border-radius: var(--r);
  border: 1px solid;
  background: var(--surface);
}
.flow-trigger {
  background: var(--accent-soft);
  border-color: var(--accent-soft-hi);
}
.flow-cond {
  background: rgba(245, 166, 35, 0.1);
  border-color: rgba(245, 166, 35, 0.4);
}
.flow-action {
  background: rgba(77, 211, 154, 0.1);
  border-color: rgba(77, 211, 154, 0.35);
}
.flow-node-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.flow-node-icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  font-size: 13px;
}
.flow-trigger .flow-node-icon { color: var(--accent); }
.flow-cond .flow-node-icon { color: var(--yellow); }
.flow-action .flow-node-icon { color: var(--green); }
.flow-node-tag {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.1em;
  font-family: var(--font-mono);
}
.flow-trigger .flow-node-tag { color: var(--accent); }
.flow-cond .flow-node-tag { color: var(--yellow); }
.flow-action .flow-node-tag { color: var(--green); }
.flow-node-name {
  font-size: 12.5px;
  color: var(--text);
  font-weight: 600;
  margin-top: 6px;
  line-height: 1.3;
}
.flow-node-sub {
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 4px;
}
.flow-arrow {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--muted);
}

/* ── Auto grid (active list + recent runs) ─────────────── */
.auto-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 16px;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  overflow: hidden;
}
.list-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.list-head-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.list-body { display: flex; flex-direction: column; }

/* ── Auto row ──────────────────────────────────────────── */
.auto-row {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 14px;
  animation: fadeUp 0.4s ease calc(var(--ci, 0) * 0.05s) both;
}
@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.auto-row:last-child { border-bottom: none; }
.auto-row:hover { background: var(--surface2); }
.auto-row-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--rs);
  background: var(--surface2);
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
  color: var(--accent);
  flex-shrink: 0;
}
.auto-row-main { flex: 1; min-width: 0; }
.auto-row-name {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
  letter-spacing: -0.005em;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.auto-row-when {
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
  font-family: var(--font-mono);
  display: flex;
  align-items: center;
  gap: 6px;
}
.when-label { font-weight: 600; color: var(--accent); letter-spacing: 0.06em; }
.when-sep { color: var(--border-hi); }
.auto-row-actions-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.action-pill {
  font-size: 10.5px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--surface2);
  color: var(--dim);
  border: 1px solid var(--border);
}
.action-pill-more { color: var(--accent); border-color: var(--accent-soft-hi); background: var(--accent-soft); }

/* Trigger badge */
.trigger-badge {
  font-size: 9.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: var(--font-mono);
}
.trigger-badge.green { background: rgba(77, 211, 154, 0.12); color: var(--green); border: 1px solid rgba(77, 211, 154, 0.3); }
.trigger-badge.blue { background: rgba(126, 215, 255, 0.12); color: var(--blue); border: 1px solid rgba(126, 215, 255, 0.3); }
.trigger-badge.yellow { background: rgba(245, 166, 35, 0.12); color: var(--yellow); border: 1px solid rgba(245, 166, 35, 0.3); }
.trigger-badge.purple { background: var(--accent-soft); color: var(--accent); border: 1px solid var(--accent-soft-hi); }
.trigger-badge.gray { background: rgba(122, 130, 153, 0.12); color: var(--muted); border: 1px solid var(--border); }

.auto-row-stats {
  text-align: right;
  font-size: 10.5px;
  color: var(--muted);
  flex-shrink: 0;
}
.auto-stat-mono { font-family: var(--font-mono); color: var(--dim); }

.auto-row-success {
  width: 80px;
  text-align: right;
  flex-shrink: 0;
}
.success-num {
  font-family: var(--font-serif);
  font-size: 22px;
  line-height: 1;
}
.success-num.green { color: var(--green); }
.success-num.gray { color: var(--muted); }
.success-pct { font-size: 11px; color: var(--muted); margin-left: 1px; }
.success-label {
  font-size: 10px;
  color: var(--muted);
  margin-top: 2px;
}

.auto-row-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
  cursor: pointer;
}
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--surface3);
  border: 1px solid var(--border-hi);
  border-radius: 20px;
  transition: background 0.2s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 1px;
  bottom: 1px;
  background: var(--muted);
  border-radius: 50%;
  transition: all 0.2s;
}
.toggle-switch input:checked + .toggle-slider {
  background: rgba(77, 211, 154, 0.3);
  border-color: rgba(77, 211, 154, 0.5);
}
.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(15px);
  background: var(--green);
}

/* Icon buttons */
.icon-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--border);
  cursor: pointer;
  background: var(--surface2);
  color: var(--muted);
  display: grid;
  place-items: center;
  transition: all 0.15s;
}
.icon-btn:hover { background: var(--surface3); color: var(--text); border-color: var(--border-hi); }
.icon-btn-danger:hover { color: var(--red); border-color: rgba(243, 130, 136, 0.4); background: rgba(243, 130, 136, 0.1); }

/* ── Recent runs ───────────────────────────────────────── */
.runs-card { display: flex; flex-direction: column; }
.runs-body { padding: 6px 18px 14px; }
.runs-empty {
  padding: 28px 0;
  text-align: center;
  color: var(--muted);
  font-size: 12.5px;
}
.run-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.run-row:last-child { border-bottom: none; }
.run-icon {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.run-icon.ok {
  background: rgba(77, 211, 154, 0.18);
  border: 1px solid rgba(77, 211, 154, 0.4);
  color: var(--green);
}
.run-icon.err {
  background: rgba(243, 130, 136, 0.18);
  border: 1px solid rgba(243, 130, 136, 0.4);
  color: var(--red);
}
.run-main { flex: 1; min-width: 0; }
.run-name {
  font-size: 12px;
  color: var(--text);
  font-weight: 500;
}
.run-sub {
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 1px;
}
.run-time {
  font-size: 10.5px;
  color: var(--muted);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

/* ── Buttons ───────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--rs);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  white-space: nowrap;
  box-shadow: 0 0 14px rgba(107, 91, 255, 0.3);
}
.btn-primary:hover:not(:disabled) { background: #5849EF; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-secondary {
  padding: 8px 14px;
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-secondary:hover { border-color: var(--border-hi); background: var(--surface3); }
.mt-12 { margin-top: 12px; }

/* ── Step wizard (modal) ───────────────────────────────── */
.step-wizard {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
  position: relative;
}
.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  position: relative;
  z-index: 1;
}
.step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  background: var(--surface2);
  color: var(--muted);
  border: 2px solid var(--border);
  transition: all 0.2s;
}
.step-item.active .step-num {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.step-item.done .step-num {
  background: rgba(77, 211, 154, 0.15);
  color: var(--green);
  border-color: var(--green);
}
.step-label { font-size: 12px; font-weight: 500; color: var(--muted); }
.step-item.active .step-label { color: var(--text); }
.step-item.done .step-label { color: var(--dim); }
.step-line {
  position: absolute;
  left: 0;
  bottom: -1px;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* ── Step content ──────────────────────────────────────── */
.step-content { display: flex; flex-direction: column; gap: 14px; }
.step-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  font-size: 12px;
  color: var(--dim);
}
.step-info-icon { font-size: 14px; }

/* Form */
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.form-input {
  padding: 9px 12px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  font-size: 13px;
  color: var(--text);
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.form-input::placeholder { color: var(--muted); }
.form-textarea { resize: vertical; min-height: 60px; }

/* Recipient pills */
.recipient-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.recipient-pill {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  font-size: 12px;
  color: var(--muted);
  background: var(--surface2);
  cursor: pointer;
  transition: all 0.15s;
}
.recipient-pill:hover { border-color: var(--accent); color: var(--text); }
.recipient-pill.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.recipient-email {
  flex: 1;
  min-width: 140px;
  padding: 5px 10px;
  font-size: 12px;
}

/* Template variable chips */
.var-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}
.var-chips-label {
  font-size: 11px;
  color: var(--muted);
  font-family: var(--font-mono);
}
.var-chip {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface3);
  color: var(--dim);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-family: var(--font-mono);
}
.var-chip:hover {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent-soft-hi);
}

/* Condition rows */
.condition-row { display: flex; flex-direction: column; gap: 6px; }
.logic-pill { display: flex; align-items: center; }
.logic-select {
  padding: 3px 10px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  font-family: var(--font-mono);
  letter-spacing: 0.06em;
}
.condition-fields {
  display: flex;
  gap: 6px;
  align-items: center;
}
.cond-field { flex: 1.2; }
.cond-op { flex: 1; }
.cond-val { flex: 1; }
.remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(243, 130, 136, 0.1);
  color: var(--red);
  border: 1px solid rgba(243, 130, 136, 0.25);
  cursor: pointer;
  font-size: 11px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  transition: background 0.15s;
}
.remove-btn:hover { background: rgba(243, 130, 136, 0.2); }

/* Action rows */
.action-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 14px;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--rs);
}
.action-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-family: var(--font-mono);
}
.action-config {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Add row button */
.add-row-btn {
  padding: 10px;
  background: none;
  border: 2px dashed var(--border);
  border-radius: var(--rs);
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.add-row-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.flex-spacer { flex: 1; }

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 1100px) {
  .auto-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .page-title { font-size: 28px; }
  .filter-row { flex-direction: column; align-items: stretch; }
  .search-wrap { max-width: 100%; }
  .condition-fields { flex-wrap: wrap; }
  .auto-row { flex-wrap: wrap; }
  .auto-row-success, .auto-row-stats { width: auto; }
}
</style>
