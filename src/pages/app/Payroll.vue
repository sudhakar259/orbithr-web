<script setup lang="ts">
defineOptions({ name: 'PayrollManagement' })
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/services/api'
import { usePayroll } from '@/composables/usePayroll'
import type { SalaryStructure } from '@/services/payroll'
import { useAuth } from '@/composables/useAuth'
import { formatCurrency } from '@/utils/currency'
import StatCard from '@/components/dashboard/StatCard.vue'
import ActivityTimeline from '@/components/dashboard/ActivityTimeline.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'

const { hasRole } = useAuth()
const {
  state,
  hasAdminAccess,
  hasManagerAccess,
  fetchDashboardStats,
  fetchCycles,
  createCycle,
  processCycle,
  approveCycle,
  markCycleAsPaid,
  deleteCycle,
  fetchAdvances,
  fetchAdvanceStats,
  requestAdvance,
  approveAdvance,
  rejectAdvance,
  disburseAdvance,
  fetchSalaryStructures,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure
} = usePayroll()

const activeTab = ref('overview')
const showCreateCycleModal = ref(false)
const showAdvanceModal = ref(false)

// ---- Cycles tab state ----
const cycleForm = ref({
  frequency: 'monthly',
  period_start: '',
  period_end: '',
  payment_date: '',
  notes: ''
})
const cycleSubmitting = ref(false)
const cycleError = ref('')
const cycleActionId = ref<number | null>(null)

// ---- Advances tab state ----
const advanceForm = ref({
  employee_id: '',
  amount: '',
  installments: '1',
  reason: '',
  request_date: ''
})
const advanceSubmitting = ref(false)
const advanceError = ref('')
const advanceActionId = ref<number | null>(null)

// ---- Advance employee search ----
interface EmployeeOption {
  id: number
  name: string
  employee_code?: string
}
const employeeSearch = ref('')
const employeeResults = ref<EmployeeOption[]>([])

async function searchEmployees() {
  const query = employeeSearch.value.trim()
  if (!query) {
    employeeResults.value = []
    return
  }
  try {
    const res = await api.get('/employees', { params: { search: query, limit: 20 } })
    const list = res.data?.data ?? res.data ?? []
    employeeResults.value = (Array.isArray(list) ? list : []).map((e: Record<string, unknown>) => ({
      id: Number(e.id),
      name: `${(e.first_name as string) ?? ''} ${(e.last_name as string) ?? ''}`.trim() || (e.name as string) || `Employee #${e.id}`,
      employee_code: (e.employee_id as string) ?? (e.employee_code as string) ?? '',
    }))
  } catch {
    employeeResults.value = []
  }
}

// ---- Structures tab state ----
const showStructureModal = ref(false)
const structureForm = ref({
  id: null as number | null,
  employee_id: '',
  basic_salary: '',
  hra: '',
  da: '',
  notes: ''
})
const structureSubmitting = ref(false)
const structureError = ref('')
const structureActionId = ref<number | null>(null)
const tabError = ref('')

// Computed properties
const recentCycles = computed(() => state.cycles.slice(0, 5))
const recentAdvances = computed(() => state.advances.slice(0, 5))

const quickActions = computed(() => {
  const actions = []

  if (hasAdminAccess.value) {
    actions.push(
      {
        title: 'Create Payroll Cycle',
        description: 'Start a new payroll run',
        icon: 'PlusIcon',
        action: () => showCreateCycleModal.value = true,
        variant: 'primary' as const
      },
      {
        title: 'Process Payroll',
        description: 'Run payroll calculations',
        icon: 'CalculatorIcon',
        action: () => activeTab.value = 'cycles',
        variant: 'secondary' as const
      }
    )
  }

  if (hasRole('employee') || hasRole('manager')) {
    actions.push({
      title: 'Request Advance',
      description: 'Request salary advance',
      icon: 'CurrencyDollarIcon',
      action: () => showAdvanceModal.value = true,
      variant: 'outline' as const
    })
  }

  return actions
})

const stats = computed(() => {
  if (!state.dashboardStats) return []

  return [
    {
      title: 'Total Cycles',
      value: state.dashboardStats.total_cycles.toString(),
      change: '+12%',
      changeType: 'increase' as const,
      icon: 'DocumentIcon'
    },
    {
      title: 'Pending Cycles',
      value: state.dashboardStats.pending_cycles.toString(),
      change: state.dashboardStats.pending_cycles > 0 ? 'Action needed' : 'All clear',
      changeType: state.dashboardStats.pending_cycles > 0 ? 'warning' as const : 'positive' as const,
      icon: 'ClockIcon'
    },
    {
      title: 'Current Month Payout',
      value: `$${state.dashboardStats.current_month_payout.toLocaleString()}`,
      change: '+8.2%',
      changeType: 'increase' as const,
      icon: 'CurrencyDollarIcon'
    },
    {
      title: 'Active Employees',
      value: state.dashboardStats.total_employees_with_salary.toString(),
      change: '+2',
      changeType: 'increase' as const,
      icon: 'UserGroupIcon'
    }
  ]
})

const advanceStats = computed(() => {
  if (!state.advanceStats) return []

  return [
    {
      title: 'Pending Approvals',
      value: state.advanceStats.pending_approvals.toString(),
      change: state.advanceStats.pending_approvals > 0 ? 'Review needed' : 'All approved',
      changeType: state.advanceStats.pending_approvals > 0 ? 'warning' as const : 'positive' as const,
      icon: 'ExclamationTriangleIcon'
    },
    {
      title: 'Total Disbursed',
      value: `$${state.advanceStats.total_amount_disbursed.toLocaleString()}`,
      change: '+15%',
      changeType: 'increase' as const,
      icon: 'CurrencyDollarIcon'
    },
    {
      title: 'Repaying',
      value: state.advanceStats.repaying_advances.toString(),
      change: 'Active',
      changeType: 'neutral' as const,
      icon: 'ArrowPathIcon'
    }
  ]
})

// Methods
const loadData = async () => {
  try {
    await Promise.all([
      fetchDashboardStats(),
      fetchCycles({ per_page: 5 }),
      fetchAdvances({ per_page: 5 }),
      fetchAdvanceStats()
    ])
  } catch (error) {
    console.error('Failed to load payroll data:', error)
  }
}


const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getStatusColor = (status: string) => {
  const colors = {
    draft: 'bg-gray-900/40 text-gray-400',
    processing: 'bg-yellow-900/40 text-yellow-400',
    completed: 'bg-green-900/40 text-green-400',
    paid: 'bg-green-900/40 text-green-400',
    pending: 'bg-yellow-900/40 text-yellow-400',
    approved: 'bg-green-900/40 text-green-400',
    rejected: 'bg-red-900/40 text-red-400',
    disbursed: 'bg-blue-900/40 text-blue-400',
    repaying: 'bg-purple-900/40 text-purple-400'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-900/40 text-gray-400'
}

const getCycleStatusText = (status: string) => {
  const texts = {
    draft: 'Draft',
    processing: 'Processing',
    completed: 'Completed',
    paid: 'Paid'
  }
  return texts[status as keyof typeof texts] || status
}

const getAdvanceStatusText = (status: string) => {
  const texts = {
    pending: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    disbursed: 'Disbursed',
    repaying: 'Repaying',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return texts[status as keyof typeof texts] || status
}

const errorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } }; message?: string }
  return err?.response?.data?.message || err?.message || fallback
}

// ---- Cycles tab ----
const loadCycles = async () => {
  tabError.value = ''
  try {
    await fetchCycles({ per_page: 50 })
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to load payroll cycles.')
  }
}

const submitCycle = async () => {
  cycleError.value = ''
  if (!cycleForm.value.period_start || !cycleForm.value.period_end || !cycleForm.value.payment_date) {
    cycleError.value = 'Period start, period end, and payment date are required.'
    return
  }
  cycleSubmitting.value = true
  try {
    await createCycle({
      frequency: cycleForm.value.frequency,
      period_start: cycleForm.value.period_start,
      period_end: cycleForm.value.period_end,
      payment_date: cycleForm.value.payment_date,
      notes: cycleForm.value.notes || undefined
    })
    showCreateCycleModal.value = false
    cycleForm.value = { frequency: 'monthly', period_start: '', period_end: '', payment_date: '', notes: '' }
    await loadCycles()
  } catch (error) {
    cycleError.value = errorMessage(error, 'Failed to create payroll cycle.')
  } finally {
    cycleSubmitting.value = false
  }
}

const handleProcessCycle = async (id: number) => {
  cycleActionId.value = id
  tabError.value = ''
  try {
    await processCycle(id)
    await loadCycles()
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to process cycle.')
  } finally {
    cycleActionId.value = null
  }
}

const handleApproveCycle = async (id: number) => {
  cycleActionId.value = id
  tabError.value = ''
  try {
    await approveCycle(id)
    await loadCycles()
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to approve cycle.')
  } finally {
    cycleActionId.value = null
  }
}

const handleMarkCyclePaid = async (id: number) => {
  cycleActionId.value = id
  tabError.value = ''
  try {
    await markCycleAsPaid(id)
    await loadCycles()
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to mark cycle as paid.')
  } finally {
    cycleActionId.value = null
  }
}

const handleDeleteCycle = async (id: number) => {
  if (!confirm('Delete this draft payroll cycle? This cannot be undone.')) return
  cycleActionId.value = id
  tabError.value = ''
  try {
    await deleteCycle(id)
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to delete cycle.')
  } finally {
    cycleActionId.value = null
  }
}

const cycleFrequencyLabel = (frequency: string) => {
  return frequency.charAt(0).toUpperCase() + frequency.slice(1)
}

// ---- Advances tab ----
const loadAdvances = async () => {
  tabError.value = ''
  try {
    await fetchAdvances({ per_page: 50 })
    await fetchAdvanceStats()
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to load salary advances.')
  }
}

const submitAdvance = async () => {
  advanceError.value = ''
  if (!advanceForm.value.employee_id || !advanceForm.value.amount || !advanceForm.value.reason) {
    advanceError.value = 'Employee, amount, and reason are required.'
    return
  }
  advanceSubmitting.value = true
  try {
    await requestAdvance({
      employee_id: Number(advanceForm.value.employee_id),
      amount: Number(advanceForm.value.amount),
      installments: Number(advanceForm.value.installments) || 1,
      reason: advanceForm.value.reason,
      request_date: advanceForm.value.request_date || undefined
    })
    showAdvanceModal.value = false
    advanceForm.value = { employee_id: '', amount: '', installments: '1', reason: '', request_date: '' }
    await loadAdvances()
  } catch (error) {
    advanceError.value = errorMessage(error, 'Failed to submit advance request.')
  } finally {
    advanceSubmitting.value = false
  }
}

const handleApproveAdvance = async (id: number) => {
  advanceActionId.value = id
  tabError.value = ''
  try {
    await approveAdvance(id)
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to approve advance.')
  } finally {
    advanceActionId.value = null
  }
}

const handleRejectAdvance = async (id: number) => {
  const reason = prompt('Enter a reason for rejecting this advance:')
  if (!reason) return
  advanceActionId.value = id
  tabError.value = ''
  try {
    await rejectAdvance(id, reason)
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to reject advance.')
  } finally {
    advanceActionId.value = null
  }
}

const handleDisburseAdvance = async (id: number) => {
  advanceActionId.value = id
  tabError.value = ''
  try {
    await disburseAdvance(id)
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to disburse advance.')
  } finally {
    advanceActionId.value = null
  }
}

// ---- Structures tab ----
const loadStructures = async () => {
  tabError.value = ''
  try {
    await fetchSalaryStructures()
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to load salary structures.')
  }
}

const openNewStructure = () => {
  structureForm.value = { id: null, employee_id: '', basic_salary: '', hra: '', da: '', notes: '' }
  structureError.value = ''
  showStructureModal.value = true
}

const openEditStructure = (structure: SalaryStructure) => {
  structureForm.value = {
    id: structure.id,
    employee_id: String(structure.employee_id ?? ''),
    basic_salary: String(structure.basic_salary ?? ''),
    hra: String(structure.hra ?? ''),
    da: String(structure.da ?? ''),
    notes: structure.notes ?? ''
  }
  structureError.value = ''
  showStructureModal.value = true
}

const submitStructure = async () => {
  structureError.value = ''
  if (!structureForm.value.employee_id || !structureForm.value.basic_salary) {
    structureError.value = 'Employee and basic salary are required.'
    return
  }
  structureSubmitting.value = true
  const payload = {
    employee_id: Number(structureForm.value.employee_id),
    basic_salary: Number(structureForm.value.basic_salary),
    hra: Number(structureForm.value.hra) || 0,
    da: Number(structureForm.value.da) || 0,
    notes: structureForm.value.notes || undefined
  }
  try {
    if (structureForm.value.id) {
      await updateSalaryStructure(structureForm.value.id, payload)
    } else {
      await createSalaryStructure(payload)
    }
    showStructureModal.value = false
    await loadStructures()
  } catch (error) {
    structureError.value = errorMessage(error, 'Failed to save salary structure.')
  } finally {
    structureSubmitting.value = false
  }
}

const handleDeleteStructure = async (id: number) => {
  if (!confirm('Delete this salary structure? This cannot be undone.')) return
  structureActionId.value = id
  tabError.value = ''
  try {
    await deleteSalaryStructure(id)
  } catch (error) {
    tabError.value = errorMessage(error, 'Failed to delete salary structure.')
  } finally {
    structureActionId.value = null
  }
}

const structureName = (structure: SalaryStructure) => {
  const emp = structure.employee
  if (emp) {
    return `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || `Employee #${structure.employee_id}`
  }
  return `Employee #${structure.employee_id}`
}

const structureComponentCount = (structure: SalaryStructure) => {
  const fields: (keyof SalaryStructure)[] = [
    'basic_salary', 'hra', 'da', 'transport_allowance', 'medical_allowance',
    'special_allowance', 'other_allowances', 'performance_bonus', 'commission', 'incentive'
  ]
  return fields.filter((f) => Number(structure[f]) > 0).length
}

// Load tab data on switch
watch(activeTab, (tab) => {
  tabError.value = ''
  if (tab === 'cycles') loadCycles()
  else if (tab === 'advances') loadAdvances()
  else if (tab === 'structures') loadStructures()
})

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="payroll-page">
    <!-- Page header -->
    <div class="page-head">
      <div class="ph-text">
        <div class="ph-eyebrow">Performance &amp; Pay · Payroll</div>
        <h1 class="ph-title">Payroll run</h1>
        <p class="ph-sub">Run payroll, manage advances, and generate payslips for the current cycle.</p>
      </div>
      <div class="ph-actions" v-if="hasAdminAccess">
        <button class="btn-ghost" @click="activeTab = 'structures'">Salary structure</button>
        <button class="btn-primary" @click="showCreateCycleModal = true">
          <span class="plus">+</span> Create cycle
        </button>
      </div>
    </div>

    <!-- Status banner -->
    <div class="banner">
      <div class="banner-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div class="banner-text">
        <div class="banner-title">Run is in review · {{ state.dashboardStats?.pending_cycles ?? 0 }} cycle(s) pending</div>
        <div class="banner-sub">Approver: HR Manager · Cut-off in <span class="banner-mono">2d 18h 42m</span></div>
      </div>
      <div class="stepper">
        <template v-for="(step, i) in ['Inputs','Preview','Review','Approve','Disburse']" :key="step">
          <div v-if="i > 0" class="step-conn" :class="{ active: i <= 2 }"></div>
          <div class="step" :class="{ done: i < 2, current: i === 2 }">
            <div class="step-dot"></div>
            <div class="step-label">{{ step }}</div>
          </div>
        </template>
      </div>
    </div>

    <!-- Quick Actions -->
    <QuickActions :actions="quickActions" />

    <!-- KPI strip -->
    <div class="kpi-strip">
      <div v-for="(stat, i) in stats" :key="stat.title" class="kpi" :class="`kpi-${i}`">
        <div class="kpi-label">{{ stat.title }}</div>
        <div class="kpi-value">{{ stat.value }}</div>
        <div class="kpi-sub">{{ stat.change }}</div>
      </div>
      <!-- Fallback when no live stats -->
      <template v-if="!stats.length">
        <StatCard
          v-for="i in 4"
          :key="i"
          title="—"
          value="—"
          change=""
          change-type="neutral"
          icon="DocumentIcon"
        />
      </template>
    </div>

    <!-- Advance Stats (for managers/admins) -->
    <div v-if="hasManagerAccess && advanceStats.length > 0" class="adv-strip">
      <div class="adv-card adv-warn">
        <div class="adv-label">{{ advanceStats[0].title }}</div>
        <div class="adv-value">{{ advanceStats[0].value }}</div>
        <div class="adv-sub">{{ advanceStats[0].change }}</div>
      </div>
      <div class="adv-card adv-good">
        <div class="adv-label">{{ advanceStats[1].title }}</div>
        <div class="adv-value">{{ advanceStats[1].value }}</div>
        <div class="adv-sub">{{ advanceStats[1].change }}</div>
      </div>
      <div class="adv-card adv-accent">
        <div class="adv-label">{{ advanceStats[2].title }}</div>
        <div class="adv-value">{{ advanceStats[2].value }}</div>
        <div class="adv-sub">{{ advanceStats[2].change }}</div>
      </div>
    </div>

    <!-- Tabs card -->
    <div class="tabs-card">
      <div class="tabs-bar">
        <button
          v-for="tab in [
            { id: 'overview', name: 'Overview' },
            { id: 'cycles', name: 'Payroll Cycles' },
            { id: 'advances', name: 'Advances' },
            { id: 'structures', name: 'Salary Structures' }
          ]"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['tab', { 'tab-active': activeTab === tab.id }]"
        >
          {{ tab.name }}
        </button>
      </div>

      <div class="tabs-body">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="ov-grid">
          <!-- Recent Payroll Cycles -->
          <div class="panel">
            <div class="panel-head">
              <div>
                <div class="panel-title">Recent Payroll Cycles</div>
                <div class="panel-sub">{{ recentCycles.length }} cycles</div>
              </div>
              <button class="btn-ghost" @click="activeTab = 'cycles'">View all</button>
            </div>

            <div v-if="state.loading.cycles" class="panel-state">
              <div class="skel" v-for="n in 3" :key="n"></div>
            </div>
            <div v-else-if="recentCycles.length === 0" class="panel-empty">
              No payroll cycles found. Create your first payroll cycle to get started.
            </div>
            <ul v-else class="cycle-list">
              <li v-for="cycle in recentCycles" :key="cycle.id" class="cycle-row">
                <div class="cycle-left">
                  <div class="cycle-name">
                    {{ cycle.frequency.charAt(0).toUpperCase() + cycle.frequency.slice(1) }} Payroll
                  </div>
                  <div class="cycle-period">
                    {{ formatDate(cycle.period_start) }} — {{ formatDate(cycle.period_end) }}
                  </div>
                </div>
                <div class="cycle-right">
                  <span class="pill" :class="getStatusColor(cycle.status)">
                    {{ getCycleStatusText(cycle.status) }}
                  </span>
                  <div class="cycle-amt">
                    <div class="amt-val">{{ formatCurrency(cycle.total_net_amount) }}</div>
                    <div class="amt-sub">{{ cycle.total_employees }} employees</div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <!-- Recent Advances -->
          <div v-if="hasManagerAccess" class="panel">
            <div class="panel-head">
              <div>
                <div class="panel-title">Recent Advance Requests</div>
                <div class="panel-sub">{{ recentAdvances.length }} requests</div>
              </div>
              <button class="btn-ghost" @click="activeTab = 'advances'">View all</button>
            </div>

            <div v-if="state.loading.advances" class="panel-state">
              <div class="skel" v-for="n in 3" :key="n"></div>
            </div>
            <div v-else-if="recentAdvances.length === 0" class="panel-empty">
              No advance requests found.
            </div>
            <ul v-else class="cycle-list">
              <li v-for="advance in recentAdvances" :key="advance.id" class="cycle-row">
                <div class="cycle-left">
                  <div class="cycle-name">{{ advance.employee_name }}</div>
                  <div class="cycle-period">{{ advance.employee_code }}</div>
                </div>
                <div class="cycle-right">
                  <span class="pill" :class="getStatusColor(advance.status)">
                    {{ getAdvanceStatusText(advance.status) }}
                  </span>
                  <div class="cycle-amt">
                    <div class="amt-val">{{ formatCurrency(advance.amount) }}</div>
                    <div class="amt-sub">{{ formatDate(advance.request_date) }}</div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Cycles Tab -->
        <div v-else-if="activeTab === 'cycles'" class="tab-pane">
          <div class="tab-head">
            <div>
              <div class="tab-title">Payroll Cycles</div>
              <div class="tab-sub">{{ state.cycles.length }} cycle(s)</div>
            </div>
            <button v-if="hasAdminAccess" class="btn-primary" @click="showCreateCycleModal = true">
              <span class="plus">+</span> New Cycle
            </button>
          </div>

          <div v-if="tabError" class="tab-alert">{{ tabError }}</div>

          <div v-if="state.loading.cycles" class="panel-state">
            <div class="skel" v-for="n in 3" :key="n"></div>
          </div>
          <div v-else-if="state.cycles.length === 0" class="panel-empty">
            No payroll cycles yet. Create your first cycle to get started.
          </div>
          <div v-else class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th class="ta-right">Employees</th>
                  <th class="ta-right">Total Amount</th>
                  <th class="ta-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cycle in state.cycles" :key="cycle.id">
                  <td class="td-strong">{{ cycleFrequencyLabel(cycle.frequency) }} Payroll</td>
                  <td>{{ formatDate(cycle.period_start) }} — {{ formatDate(cycle.period_end) }}</td>
                  <td>
                    <span class="pill" :class="getStatusColor(cycle.status)">
                      {{ getCycleStatusText(cycle.status) }}
                    </span>
                  </td>
                  <td class="ta-right">{{ cycle.total_employees }}</td>
                  <td class="ta-right amt-val">{{ formatCurrency(cycle.total_net_amount) }}</td>
                  <td class="ta-right">
                    <div class="row-actions" v-if="hasAdminAccess">
                      <button
                        v-if="['draft', 'processing'].includes(cycle.status)"
                        class="btn-mini"
                        :disabled="cycleActionId === cycle.id"
                        @click="handleProcessCycle(cycle.id)"
                      >Process</button>
                      <button
                        v-if="cycle.status === 'completed'"
                        class="btn-mini btn-mini-good"
                        :disabled="cycleActionId === cycle.id"
                        @click="handleApproveCycle(cycle.id)"
                      >Approve</button>
                      <button
                        v-if="cycle.status === 'completed'"
                        class="btn-mini btn-mini-accent"
                        :disabled="cycleActionId === cycle.id"
                        @click="handleMarkCyclePaid(cycle.id)"
                      >Mark Paid</button>
                      <button
                        v-if="cycle.status === 'draft'"
                        class="btn-mini btn-mini-danger"
                        :disabled="cycleActionId === cycle.id"
                        @click="handleDeleteCycle(cycle.id)"
                      >Delete</button>
                    </div>
                    <span v-else class="muted-dash">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Advances Tab -->
        <div v-else-if="activeTab === 'advances'" class="tab-pane">
          <div class="tab-head">
            <div>
              <div class="tab-title">Salary Advances</div>
              <div class="tab-sub">{{ state.advances.length }} request(s)</div>
            </div>
            <button class="btn-primary" @click="showAdvanceModal = true">
              <span class="plus">+</span> Request Advance
            </button>
          </div>

          <div v-if="tabError" class="tab-alert">{{ tabError }}</div>

          <div v-if="state.loading.advances" class="panel-state">
            <div class="skel" v-for="n in 3" :key="n"></div>
          </div>
          <div v-else-if="state.advances.length === 0" class="panel-empty">
            No salary advance requests yet.
          </div>
          <div v-else class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th class="ta-right">Amount</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th class="ta-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="advance in state.advances" :key="advance.id">
                  <td class="td-strong">
                    {{ advance.employee_name || ('Employee #' + advance.employee_id) }}
                    <div v-if="advance.employee_code" class="td-sub">{{ advance.employee_code }}</div>
                  </td>
                  <td class="ta-right amt-val">{{ formatCurrency(advance.amount) }}</td>
                  <td>{{ formatDate(advance.request_date) }}</td>
                  <td>
                    <span class="pill" :class="getStatusColor(advance.status)">
                      {{ getAdvanceStatusText(advance.status) }}
                    </span>
                  </td>
                  <td class="td-reason">{{ advance.reason || '—' }}</td>
                  <td class="ta-right">
                    <div class="row-actions" v-if="hasAdminAccess">
                      <template v-if="advance.status === 'pending'">
                        <button
                          class="btn-mini btn-mini-good"
                          :disabled="advanceActionId === advance.id"
                          @click="handleApproveAdvance(advance.id)"
                        >Approve</button>
                        <button
                          class="btn-mini btn-mini-danger"
                          :disabled="advanceActionId === advance.id"
                          @click="handleRejectAdvance(advance.id)"
                        >Reject</button>
                      </template>
                      <button
                        v-else-if="advance.status === 'approved'"
                        class="btn-mini btn-mini-accent"
                        :disabled="advanceActionId === advance.id"
                        @click="handleDisburseAdvance(advance.id)"
                      >Disburse</button>
                      <span v-else class="muted-dash">—</span>
                    </div>
                    <span v-else class="muted-dash">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Structures Tab -->
        <div v-else-if="activeTab === 'structures'" class="tab-pane">
          <div class="tab-head">
            <div>
              <div class="tab-title">Salary Structures</div>
              <div class="tab-sub">{{ state.salaryStructures.length }} structure(s)</div>
            </div>
            <button v-if="hasAdminAccess" class="btn-primary" @click="openNewStructure">
              <span class="plus">+</span> New Structure
            </button>
          </div>

          <div v-if="tabError" class="tab-alert">{{ tabError }}</div>

          <div v-if="state.loading.salaryStructures" class="panel-state">
            <div class="skel" v-for="n in 3" :key="n"></div>
          </div>
          <div v-else-if="state.salaryStructures.length === 0" class="panel-empty">
            No salary structures defined yet.
          </div>
          <div v-else class="struct-grid">
            <div v-for="structure in state.salaryStructures" :key="structure.id" class="struct-card">
              <div class="struct-card-head">
                <div class="struct-name">{{ structureName(structure) }}</div>
                <span class="pill" :class="getStatusColor(structure.status)">{{ structure.status }}</span>
              </div>
              <div class="struct-meta">
                <div class="struct-net">{{ formatCurrency(structure.net_salary) }} <span>net</span></div>
                <div class="struct-count">{{ structureComponentCount(structure) }} component(s)</div>
              </div>
              <div v-if="hasAdminAccess" class="struct-actions">
                <button class="btn-mini" @click="openEditStructure(structure)">Edit</button>
                <button
                  class="btn-mini btn-mini-danger"
                  :disabled="structureActionId === structure.id"
                  @click="handleDeleteStructure(structure.id)"
                >Delete</button>
              </div>
            </div>
          </div>

          <!-- Employee Salary Assignments -->
          <div class="assign-section">
            <div class="tab-title">Employee Salary Assignments</div>
            <div v-if="state.salaryStructures.length === 0" class="panel-empty">
              No employee salary assignments found.
            </div>
            <div v-else class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Frequency</th>
                    <th class="ta-right">Gross</th>
                    <th class="ta-right">Deductions</th>
                    <th class="ta-right">Net</th>
                    <th>Effective From</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="structure in state.salaryStructures" :key="'assign-' + structure.id">
                    <td class="td-strong">{{ structureName(structure) }}</td>
                    <td>{{ cycleFrequencyLabel(structure.payment_frequency) }}</td>
                    <td class="ta-right amt-val">{{ formatCurrency(structure.gross_salary) }}</td>
                    <td class="ta-right amt-val">{{ formatCurrency(structure.total_deductions) }}</td>
                    <td class="ta-right amt-val">{{ formatCurrency(structure.net_salary) }}</td>
                    <td>{{ structure.effective_from ? formatDate(structure.effective_from) : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity Timeline -->
    <ActivityTimeline
      title="Payroll Activity"
      :activities="[
        {
          id: 1,
          type: 'payroll_processed',
          title: 'Payroll processed for August 2025',
          description: 'Monthly payroll completed for 45 employees',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user: 'HR Manager'
        },
        {
          id: 2,
          type: 'advance_approved',
          title: 'Advance request approved',
          description: 'John Doe\'s advance request for $2,000 was approved',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          user: 'Admin'
        },
        {
          id: 3,
          type: 'payslip_generated',
          title: 'Payslips generated',
          description: 'Payslips generated for July 2025 payroll cycle',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          user: 'System'
        }
      ]"
    />

    <!-- New Cycle Modal -->
    <div v-if="showCreateCycleModal" class="modal-overlay" @click.self="showCreateCycleModal = false">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">New Payroll Cycle</div>
          <button class="modal-close" @click="showCreateCycleModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="cycleError" class="tab-alert">{{ cycleError }}</div>
          <label class="field">
            <span class="field-label">Frequency</span>
            <select v-model="cycleForm.frequency" class="field-input">
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Period Start</span>
            <input v-model="cycleForm.period_start" type="date" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">Period End</span>
            <input v-model="cycleForm.period_end" type="date" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">Payment Date</span>
            <input v-model="cycleForm.payment_date" type="date" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">Notes (optional)</span>
            <input v-model="cycleForm.notes" type="text" class="field-input" placeholder="Notes" />
          </label>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" @click="showCreateCycleModal = false">Cancel</button>
          <button class="btn-primary" :disabled="cycleSubmitting" @click="submitCycle">
            {{ cycleSubmitting ? 'Creating…' : 'Create Cycle' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Request Advance Modal -->
    <div v-if="showAdvanceModal" class="modal-overlay" @click.self="showAdvanceModal = false">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">Request Salary Advance</div>
          <button class="modal-close" @click="showAdvanceModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="advanceError" class="tab-alert">{{ advanceError }}</div>
          <label class="field">
            <span class="field-label">Employee</span>
            <input v-model="employeeSearch" @input="searchEmployees" placeholder="Search employee name..." class="field-input" />
            <select v-if="employeeResults.length" v-model="advanceForm.employee_id" class="field-input">
              <option value="">Select employee</option>
              <option v-for="emp in employeeResults" :key="emp.id" :value="emp.id">{{ emp.name }} ({{ emp.employee_code }})</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Amount</span>
            <input v-model="advanceForm.amount" type="number" class="field-input" placeholder="0.00" />
          </label>
          <label class="field">
            <span class="field-label">Installments</span>
            <input v-model="advanceForm.installments" type="number" min="1" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">Requested Date</span>
            <input v-model="advanceForm.request_date" type="date" class="field-input" />
          </label>
          <label class="field">
            <span class="field-label">Reason</span>
            <textarea v-model="advanceForm.reason" class="field-input" rows="3" placeholder="Reason for advance"></textarea>
          </label>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" @click="showAdvanceModal = false">Cancel</button>
          <button class="btn-primary" :disabled="advanceSubmitting" @click="submitAdvance">
            {{ advanceSubmitting ? 'Submitting…' : 'Request Advance' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Structure Modal -->
    <div v-if="showStructureModal" class="modal-overlay" @click.self="showStructureModal = false">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">{{ structureForm.id ? 'Edit' : 'New' }} Salary Structure</div>
          <button class="modal-close" @click="showStructureModal = false">×</button>
        </div>
        <div class="modal-body">
          <div v-if="structureError" class="tab-alert">{{ structureError }}</div>
          <label class="field">
            <span class="field-label">Employee ID</span>
            <input v-model="structureForm.employee_id" type="number" class="field-input" placeholder="e.g. 12" />
          </label>
          <label class="field">
            <span class="field-label">Basic Salary</span>
            <input v-model="structureForm.basic_salary" type="number" class="field-input" placeholder="0.00" />
          </label>
          <label class="field">
            <span class="field-label">HRA</span>
            <input v-model="structureForm.hra" type="number" class="field-input" placeholder="0.00" />
          </label>
          <label class="field">
            <span class="field-label">DA</span>
            <input v-model="structureForm.da" type="number" class="field-input" placeholder="0.00" />
          </label>
          <label class="field">
            <span class="field-label">Notes (optional)</span>
            <input v-model="structureForm.notes" type="text" class="field-input" placeholder="Notes" />
          </label>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" @click="showStructureModal = false">Cancel</button>
          <button class="btn-primary" :disabled="structureSubmitting" @click="submitStructure">
            {{ structureSubmitting ? 'Saving…' : 'Save Structure' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payroll-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: #EEF0F4;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Page header */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.ph-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
  margin-bottom: 6px;
}
.ph-title {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin: 0;
  font-weight: 400;
}
.ph-sub {
  font-size: 13px;
  color: #7A8299;
  margin: 4px 0 0;
  max-width: 620px;
}
.ph-actions {
  display: flex;
  gap: 8px;
}

/* Buttons */
.btn-ghost {
  background: #161A23;
  color: #EEF0F4;
  border: 1px solid #232936;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.14s;
  font-family: inherit;
}
.btn-ghost:hover {
  border-color: #6B5BFF;
  color: #fff;
}
.btn-primary {
  background: #6B5BFF;
  color: #fff;
  border: 1px solid #6B5BFF;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-primary:hover {
  background: #5b4ce6;
  border-color: #5b4ce6;
}
.plus {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

/* Banner */
.banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(107, 91, 255, 0.12), rgba(107, 91, 255, 0.03));
  border: 1px solid rgba(107, 91, 255, 0.25);
}
.banner-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(107, 91, 255, 0.18);
  color: #6B5BFF;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.banner-text {
  flex: 1;
  min-width: 0;
}
.banner-title {
  font-size: 13px;
  color: #EEF0F4;
  font-weight: 600;
}
.banner-sub {
  font-size: 11.5px;
  color: #7A8299;
  margin-top: 2px;
}
.banner-mono {
  color: #6B5BFF;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

/* Stepper */
.stepper {
  display: flex;
  align-items: center;
  gap: 4px;
}
.step-conn {
  width: 16px;
  height: 1px;
  background: #2C3344;
}
.step-conn.active {
  background: #6B5BFF;
}
.step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 12px;
  border: 1px solid #2C3344;
}
.step.done,
.step.current {
  border-color: #6B5BFF;
}
.step.current {
  background: rgba(107, 91, 255, 0.18);
}
.step-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6B7284;
}
.step.done .step-dot {
  background: #6B5BFF;
}
.step.current .step-dot {
  background: #8B7BFF;
}
.step-label {
  font-size: 11px;
  color: #7A8299;
  font-weight: 400;
}
.step.done .step-label,
.step.current .step-label {
  color: #EEF0F4;
}
.step.current .step-label {
  font-weight: 600;
}

/* KPI strip */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.kpi {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 14px;
}
.kpi-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.kpi-value {
  font-family: 'Instrument Serif', serif;
  font-size: 28px;
  letter-spacing: -0.02em;
  margin-top: 4px;
  color: #EEF0F4;
  font-variant-numeric: tabular-nums;
}
.kpi-1 .kpi-value {
  color: #6B5BFF;
}
.kpi-2 .kpi-value {
  color: #F5A623;
}
.kpi-3 .kpi-value {
  color: #4DD39A;
}
.kpi-sub {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}

/* Advance strip */
.adv-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.adv-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 14px;
  position: relative;
}
.adv-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  border-radius: 12px 0 0 12px;
}
.adv-warn::before { background: #F5A623; }
.adv-good::before { background: #4DD39A; }
.adv-accent::before { background: #6B5BFF; }
.adv-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.adv-value {
  font-family: 'Instrument Serif', serif;
  font-size: 26px;
  letter-spacing: -0.02em;
  margin-top: 4px;
  color: #EEF0F4;
  font-variant-numeric: tabular-nums;
}
.adv-sub {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}

/* Tabs card */
.tabs-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}
.tabs-bar {
  display: flex;
  gap: 4px;
  padding: 4px 12px;
  border-bottom: 1px solid #232936;
  overflow-x: auto;
}
.tab {
  background: transparent;
  border: none;
  color: #7A8299;
  font-size: 12px;
  font-weight: 500;
  padding: 12px 14px;
  cursor: pointer;
  font-family: inherit;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 0.14s, border-color 0.14s;
}
.tab:hover {
  color: #EEF0F4;
}
.tab-active {
  color: #6B5BFF;
  border-bottom-color: #6B5BFF;
}

.tabs-body {
  padding: 16px;
}

/* Overview grid */
.ov-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 1100px) {
  .ov-grid {
    grid-template-columns: 1.3fr 1fr;
  }
}

.panel {
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 10px;
  overflow: hidden;
}
.panel-head {
  padding: 12px 16px;
  border-bottom: 1px solid #232936;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #EEF0F4;
}
.panel-sub {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}
.panel-state {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skel {
  height: 50px;
  border-radius: 8px;
  background: linear-gradient(90deg, #1B1F2A, #232936, #1B1F2A);
  background-size: 200% 100%;
  animation: skel 1.4s linear infinite;
}
@keyframes skel {
  0% { background-position: 0% 0%; }
  100% { background-position: -200% 0%; }
}
.panel-empty {
  padding: 28px 16px;
  text-align: center;
  font-size: 13px;
  color: #7A8299;
}

.cycle-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.cycle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #232936;
  transition: background 0.12s;
}
.cycle-row:last-child {
  border-bottom: none;
}
.cycle-row:hover {
  background: rgba(255, 255, 255, 0.02);
}
.cycle-left {
  min-width: 0;
}
.cycle-name {
  font-size: 13px;
  font-weight: 500;
  color: #EEF0F4;
}
.cycle-period {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}
.cycle-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.cycle-amt {
  text-align: right;
}
.amt-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #EEF0F4;
}
.amt-sub {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}
.pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Placeholder tab content */
.placeholder {
  padding: 56px 24px;
  text-align: center;
  color: #7A8299;
}
.ph-icon {
  display: inline-grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(107, 91, 255, 0.08);
  color: #6B5BFF;
  margin-bottom: 12px;
}
.ph-h {
  font-size: 14px;
  font-weight: 600;
  color: #EEF0F4;
}
.ph-p {
  font-size: 12px;
  margin-top: 4px;
}

/* Tab panes */
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.tab-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.tab-title {
  font-size: 14px;
  font-weight: 600;
  color: #EEF0F4;
}
.tab-sub {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}
.tab-alert {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #FF8E8E;
  font-size: 12px;
}

/* Data table */
.data-table-wrap {
  border: 1px solid #232936;
  border-radius: 10px;
  overflow-x: auto;
  background: #0D0F17;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.data-table thead th {
  text-align: left;
  padding: 10px 14px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7A8299;
  border-bottom: 1px solid #232936;
  white-space: nowrap;
}
.data-table tbody td {
  padding: 11px 14px;
  border-bottom: 1px solid #1B1F2A;
  color: #C9CEDB;
  vertical-align: middle;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}
.td-strong {
  color: #EEF0F4;
  font-weight: 500;
}
.td-sub {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}
.td-reason {
  max-width: 220px;
  color: #7A8299;
}
.ta-right {
  text-align: right;
}
.muted-dash {
  color: #4A5163;
}

/* Row actions */
.row-actions {
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.btn-mini {
  background: #161A23;
  color: #EEF0F4;
  border: 1px solid #232936;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.14s;
  font-family: inherit;
}
.btn-mini:hover:not(:disabled) {
  border-color: #6B5BFF;
  color: #fff;
}
.btn-mini:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-mini-good:hover:not(:disabled) {
  border-color: #4DD39A;
  color: #4DD39A;
}
.btn-mini-accent:hover:not(:disabled) {
  border-color: #6B5BFF;
  color: #8B7BFF;
}
.btn-mini-danger:hover:not(:disabled) {
  border-color: #FF6B6B;
  color: #FF8E8E;
}

/* Structure cards */
.struct-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.struct-card {
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.struct-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.struct-name {
  font-size: 13px;
  font-weight: 600;
  color: #EEF0F4;
}
.struct-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.struct-net {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 600;
  color: #4DD39A;
}
.struct-net span {
  font-size: 10px;
  color: #7A8299;
  font-family: inherit;
}
.struct-count {
  font-size: 11px;
  color: #7A8299;
}
.struct-actions {
  display: flex;
  gap: 6px;
  border-top: 1px solid #1B1F2A;
  padding-top: 10px;
}

/* Assignments section */
.assign-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #232936;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 12, 0.7);
  backdrop-filter: blur(2px);
  display: grid;
  place-items: center;
  z-index: 80;
  padding: 16px;
}
.modal {
  width: 100%;
  max-width: 440px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 14px;
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #232936;
}
.modal-title {
  font-size: 14px;
  font-weight: 600;
  color: #EEF0F4;
}
.modal-close {
  background: transparent;
  border: none;
  color: #7A8299;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}
.modal-close:hover {
  color: #EEF0F4;
}
.modal-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 16px;
  border-top: 1px solid #232936;
}

/* Form fields */
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field-label {
  font-size: 11px;
  font-weight: 500;
  color: #7A8299;
}
.field-input {
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 8px;
  padding: 9px 11px;
  font-size: 13px;
  color: #EEF0F4;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus {
  outline: none;
  border-color: #6B5BFF;
}
.btn-primary:disabled,
.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
