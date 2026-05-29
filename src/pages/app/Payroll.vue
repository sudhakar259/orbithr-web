<script setup lang="ts">
defineOptions({ name: 'PayrollManagement' })
import { ref, onMounted, computed } from 'vue'
import { usePayroll } from '@/composables/usePayroll'
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
  fetchAdvances,
  fetchAdvanceStats
} = usePayroll()

const activeTab = ref('overview')
const showCreateCycleModal = ref(false)
const showAdvanceModal = ref(false)

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
        <div v-else-if="activeTab === 'cycles'" class="placeholder">
          <div class="ph-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div class="ph-h">Payroll Cycles</div>
          <div class="ph-p">Detailed payroll cycle management coming soon.</div>
        </div>

        <!-- Advances Tab -->
        <div v-else-if="activeTab === 'advances'" class="placeholder">
          <div class="ph-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div class="ph-h">Salary Advances</div>
          <div class="ph-p">Advance request management coming soon.</div>
        </div>

        <!-- Structures Tab -->
        <div v-else-if="activeTab === 'structures'" class="placeholder">
          <div class="ph-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div class="ph-h">Salary Structures</div>
          <div class="ph-p">Employee salary structure management coming soon.</div>
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
</style>
