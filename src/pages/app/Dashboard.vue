<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p class="text-slate-600">All-in-one view of your workforce.</p>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Employees"
        :value="284"
        change="+6 this month"
        :points="[40, 55, 60, 62, 65, 70, 75, 80]"
      />
      <StatCard
        title="Attendance Rate"
        :value="96"
        change="+2% this week"
        :points="[70, 75, 72, 78, 82, 90, 95, 96]"
        color="#00C2A8"
      />
      <StatCard
        title="Open Positions"
        :value="12"
        change="3 interviewing"
        :points="[5, 6, 7, 9, 11, 13, 12, 12]"
        color="#f59e0b"
      />
      <StatCard
        title="Payroll (Aug)"
        :value="14231180"
        change="Paid"
        :points="[60, 62, 65, 67, 68, 70, 72, 75]"
        color="#6D5EF6"
      />
    </div>

    <!-- Today's Attendance + Side -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <TodayAttendance />
      </div>
      <div class="space-y-6">
        <QuickActions />
        <Announcements />
      </div>
    </div>

    <!-- Trends -->
    <div>
      <AttendanceTrends />
    </div>

    <!-- Mid cards -->
    <div class="grid gap-6 lg:grid-cols-3">
      <UpcomingLeaves />
      <TopEmployees />
      <ActivityTimeline />
    </div>

    <!-- Management + Distribution -->
    <div class="grid gap-6 lg:grid-cols-3">
      <RoleDistribution />

      <ExpandableCard
        title="Manage"
        description="Policies, approvals, and org management"
        :menu-items="manageMenu"
      >
        <template #default>
          <div class="grid grid-cols-2 gap-3">
            <button class="btn-ghost justify-start" @click="go('/app/reports')">Reports</button>
            <button class="btn-ghost justify-start" @click="go('/app/settings')">Policies</button>
            <button class="btn-ghost justify-start" @click="go('/app/attendance')">
              Approvals
            </button>
            <button class="btn-ghost justify-start" @click="go('/app/employees')">Org chart</button>
          </div>
        </template>
        <template #expanded>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="text-sm font-semibold text-slate-700 mb-2">Pending approvals</h4>
              <ul class="space-y-2 text-sm text-slate-700">
                <li class="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                  <span>Leave: Priya (2 days)</span><button class="btn-ghost">Review</button>
                </li>
                <li class="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                  <span>Expense: Rahul (₹1,250)</span><button class="btn-ghost">Review</button>
                </li>
                <li class="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                  <span>WFH: Anita (Sep 20)</span><button class="btn-ghost">Review</button>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-sm font-semibold text-slate-700 mb-2">Quick setup</h4>
              <div class="flex flex-wrap gap-2">
                <button class="btn-ghost">Create leave policy</button>
                <button class="btn-ghost">Define shifts</button>
                <button class="btn-primary">Invite managers</button>
              </div>
            </div>
          </div>
        </template>
      </ExpandableCard>

      <ExpandableCard title="Shortcuts" description="Frequently used links">
        <template #default>
          <div class="grid grid-cols-2 gap-3">
            <button class="btn-ghost justify-start" @click="go('/app/performance')">
              Performance
            </button>
            <button class="btn-ghost justify-start" @click="go('/app/payroll')">Payroll</button>
            <button class="btn-ghost justify-start" @click="go('/app/recruitment')">
              Recruitment
            </button>
            <button class="btn-ghost justify-start" @click="go('/app/help')">Help</button>
          </div>
        </template>
      </ExpandableCard>
    </div>

    <AdminFirstLoginModal v-model="showFirstLogin" @completed="onFirstLoginDone" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import StatCard from '@/components/dashboard/StatCard.vue'
import AttendanceTrends from '@/components/dashboard/AttendanceTrends.vue'
import Announcements from '@/components/dashboard/Announcements.vue'
import UpcomingLeaves from '@/components/dashboard/UpcomingLeaves.vue'
import QuickActions from '@/components/dashboard/QuickActions.vue'
import ActivityTimeline from '@/components/dashboard/ActivityTimeline.vue'
import TopEmployees from '@/components/dashboard/TopEmployees.vue'
import RoleDistribution from '@/components/dashboard/RoleDistribution.vue'
import ExpandableCard from '@/components/dashboard/ExpandableCard.vue'
import AdminFirstLoginModal from '@/components/dashboard/AdminFirstLoginModal.vue'
import TodayAttendance from '@/components/dashboard/TodayAttendance.vue'
import type { MenuItemType } from '@/components/dashboard/NestedMenu.vue'

const router = useRouter()
function go(path: string) {
  router.push(path)
}

const { isAuthenticated, hasRole } = useAuth()
const showFirstLogin = ref(false)

onMounted(() => {
  const flagKey = 'first_login_done_v1'
  if (isAuthenticated() && hasRole('admin') && localStorage.getItem(flagKey) !== 'true') {
    showFirstLogin.value = true
  }
})

function onFirstLoginDone() {
  localStorage.setItem('first_login_done_v1', 'true')
  // wait for modal to close animation (500ms), then reload to replay dashboard animations
  setTimeout(() => {
    window.location.reload()
  }, 700)
}

const manageMenu: MenuItemType[] = [
  {
    label: 'Departments',
    children: [
      {
        label: 'Engineering',
        children: [
          { label: 'Backend', action: () => go('/app/employees') },
          { label: 'Frontend', action: () => go('/app/employees') },
        ],
      },
      { label: 'Finance', action: () => go('/app/employees') },
      { label: 'Support', action: () => go('/app/employees') },
    ],
  },
  {
    label: 'Policies',
    children: [
      { label: 'Leave', action: () => go('/app/settings') },
      { label: 'Attendance', action: () => go('/app/settings') },
    ],
  },
]
</script>
