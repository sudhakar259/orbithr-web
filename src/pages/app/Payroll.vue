<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePayroll } from '@/composables/usePayroll'
import { useAuth } from '@/composables/useAuth'
import StatCard from '@/components/dashboard/StatCard.vue'
import ActivityTimeline from '@/components/dashboard/ActivityTimeline.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'

const { user, hasRole } = useAuth()
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
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
    draft: 'bg-gray-100 text-gray-800',
    processing: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    disbursed: 'bg-blue-100 text-blue-800',
    repaying: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Payroll Management</h1>
        <p class="text-slate-600">Run payroll, manage advances, and generate payslips.</p>
      </div>

      <div class="flex space-x-3" v-if="hasAdminAccess">
        <button
          @click="showCreateCycleModal = true"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Cycle
        </button>
      </div>
    </div>

    <!-- Quick Actions -->
    <QuickActions :actions="quickActions" />

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        v-for="stat in stats"
        :key="stat.title"
        :title="stat.title"
        :value="stat.value"
        :change="stat.change"
        :change-type="stat.changeType"
        :icon="stat.icon"
      />
    </div>

    <!-- Advance Stats (for managers/admins) -->
    <div v-if="hasManagerAccess && advanceStats.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white rounded-lg border border-slate-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-medium text-slate-900">{{ advanceStats[0].title }}</h3>
            <p class="text-2xl font-bold text-slate-900">{{ advanceStats[0].value }}</p>
            <p class="text-sm text-slate-600">{{ advanceStats[0].change }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-medium text-slate-900">{{ advanceStats[1].title }}</h3>
            <p class="text-2xl font-bold text-slate-900">{{ advanceStats[1].value }}</p>
            <p class="text-sm text-slate-600">{{ advanceStats[1].change }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-medium text-slate-900">{{ advanceStats[2].title }}</h3>
            <p class="text-2xl font-bold text-slate-900">{{ advanceStats[2].value }}</p>
            <p class="text-sm text-slate-600">{{ advanceStats[2].change }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-lg border border-slate-200">
      <div class="border-b border-slate-200">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            v-for="tab in [
              { id: 'overview', name: 'Overview', icon: 'HomeIcon' },
              { id: 'cycles', name: 'Payroll Cycles', icon: 'DocumentIcon' },
              { id: 'advances', name: 'Advances', icon: 'CurrencyDollarIcon' },
              { id: 'structures', name: 'Salary Structures', icon: 'UserGroupIcon' }
            ]"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center'
            ]"
          >
            <component :is="tab.icon" class="w-4 h-4 mr-2" />
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <div class="p-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <!-- Recent Payroll Cycles -->
          <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200">
              <h3 class="text-lg font-medium text-slate-900">Recent Payroll Cycles</h3>
            </div>
            <div v-if="state.loading.cycles" class="p-6">
              <div class="animate-pulse space-y-4">
                <div v-for="n in 3" :key="n" class="h-16 bg-slate-200 rounded"></div>
              </div>
            </div>
            <div v-else-if="recentCycles.length === 0" class="p-6 text-center text-slate-500">
              No payroll cycles found. Create your first payroll cycle to get started.
            </div>
            <ul v-else class="divide-y divide-slate-200">
              <li v-for="cycle in recentCycles" :key="cycle.id" class="px-6 py-4 hover:bg-slate-50">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <div>
                      <p class="text-sm font-medium text-slate-900">
                        {{ cycle.frequency.charAt(0).toUpperCase() + cycle.frequency.slice(1) }} Payroll
                      </p>
                      <p class="text-sm text-slate-500">
                        {{ formatDate(cycle.period_start) }} - {{ formatDate(cycle.period_end) }}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getStatusColor(cycle.status)">
                      {{ getCycleStatusText(cycle.status) }}
                    </span>
                    <div class="text-right">
                      <p class="text-sm font-medium text-slate-900">
                        {{ formatCurrency(cycle.total_net_amount) }}
                      </p>
                      <p class="text-xs text-slate-500">
                        {{ cycle.total_employees }} employees
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <!-- Recent Advances -->
          <div v-if="hasManagerAccess" class="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200">
              <h3 class="text-lg font-medium text-slate-900">Recent Advance Requests</h3>
            </div>
            <div v-if="state.loading.advances" class="p-6">
              <div class="animate-pulse space-y-4">
                <div v-for="n in 3" :key="n" class="h-16 bg-slate-200 rounded"></div>
              </div>
            </div>
            <div v-else-if="recentAdvances.length === 0" class="p-6 text-center text-slate-500">
              No advance requests found.
            </div>
            <ul v-else class="divide-y divide-slate-200">
              <li v-for="advance in recentAdvances" :key="advance.id" class="px-6 py-4 hover:bg-slate-50">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <div>
                      <p class="text-sm font-medium text-slate-900">{{ advance.employee_name }}</p>
                      <p class="text-sm text-slate-500">{{ advance.employee_code }}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getStatusColor(advance.status)">
                      {{ getAdvanceStatusText(advance.status) }}
                    </span>
                    <div class="text-right">
                      <p class="text-sm font-medium text-slate-900">
                        {{ formatCurrency(advance.amount) }}
                      </p>
                      <p class="text-xs text-slate-500">
                        {{ formatDate(advance.request_date) }}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Cycles Tab -->
        <div v-else-if="activeTab === 'cycles'">
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-slate-900">Payroll Cycles</h3>
            <p class="mt-1 text-sm text-slate-500">Detailed payroll cycle management coming soon.</p>
          </div>
        </div>

        <!-- Advances Tab -->
        <div v-else-if="activeTab === 'advances'">
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-slate-900">Salary Advances</h3>
            <p class="mt-1 text-sm text-slate-500">Advance request management coming soon.</p>
          </div>
        </div>

        <!-- Structures Tab -->
        <div v-else-if="activeTab === 'structures'">
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-slate-900">Salary Structures</h3>
            <p class="mt-1 text-sm text-slate-500">Employee salary structure management coming soon.</p>
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
  </div>
</template>
