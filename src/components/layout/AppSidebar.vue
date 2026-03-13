<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import {
  HomeIcon,
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ChartBarSquareIcon,
  BriefcaseIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  TagIcon,
  ArrowsRightLeftIcon,
  HomeModernIcon,
  GlobeAltIcon,
} from '@heroicons/vue/24/outline'

const open = ref(true)
const route = useRoute()
const { roles, hasPermission } = useAuth()

const nav = [
  { name: 'Dashboard', to: { name: 'dashboard' }, icon: HomeIcon },
  {
    name: 'Employees',
    to: { name: 'employees' },
    icon: UsersIcon,
    permissions: ['view employees'],
    roles: ['admin'],
  },
  {
    name: 'Attendance',
    to: { name: 'attendance' },
    icon: ClockIcon,
    permissions: ['view attendance'],
    roles: ['admin'],
  },
  {
    name: 'Regularization',
    to: { name: 'regularizations' },
    icon: ClockIcon,
    permissions: ['regularize attendance'],
    roles: ['admin', 'manager', 'team_lead'],
  },
  {
    name: 'Leave',
    to: { name: 'leave' },
    icon: CalendarDaysIcon,
    permissions: ['view leaves'],
    roles: ['admin'],
  },
  {
    name: 'Payroll',
    to: { name: 'payroll' },
    icon: BanknotesIcon,
    permissions: ['view payroll'],
    roles: ['admin'],
  },
  {
    name: 'Performance',
    to: { name: 'performance' },
    icon: ChartBarSquareIcon,
    permissions: ['view performance'],
    roles: ['admin'],
  },
  {
    name: 'Recruitment',
    to: { name: 'recruitment' },
    icon: BriefcaseIcon,
    permissions: ['view recruitment'],
    roles: ['admin'],
  },
  {
    name: 'Reports',
    to: { name: 'reports' },
    icon: DocumentChartBarIcon,
    permissions: ['view reports'],
    roles: ['admin'],
  },
  {
    name: 'Settings',
    to: { name: 'settings' },
    icon: Cog6ToothIcon,
    permissions: ['view settings'],
    roles: ['admin'],
  },
  {
    name: 'Billing',
    to: { name: 'billing' },
    icon: CreditCardIcon,
    permissions: ['view billing'],
    roles: ['admin'],
  },
  {
    name: 'Users',
    to: { name: 'users' },
    icon: UsersIcon,
    roles: ['super admin'],
  },
  {
    name: 'Roles & Permissions',
    to: { name: 'roles-permissions' },
    icon: ShieldCheckIcon,
    permissions: ['view roles','view permissions'],
    roles: ['super admin', 'admin'],
  },
  {
    name: 'Domain Requests',
    to: { name: 'domain-requests' },
    icon: GlobeAltIcon,
    roles: ['super admin'],
  },
  {
    name: 'Modules',
    to: { name: 'modules' },
    icon: Squares2X2Icon,
    roles: ['super admin'],
  },
  {
    name: 'Tenant Modules',
    to: { name: 'tenant-modules' },
    icon: Squares2X2Icon,
    roles: ['admin'],
  },
  {
    name: 'Plans',
    to: { name: 'plans' },
    icon: TagIcon,
    roles: ['super admin'],
  },
   {
    name: 'Transactions',
    to: { name: 'transactions' },
    icon: ArrowsRightLeftIcon,
    roles: ['super admin'],
  },
  {
    name: 'Admin Settings',
    to: { name: 'admin-settings' },
    icon: Cog6ToothIcon,
    roles: ['super admin'],
  },
  {
    name: 'Landing Page',
    to: { name: 'landing-page' },
    icon: HomeModernIcon,
    roles: ['super admin'],
  },
  {
    name: 'Manage Languages',
    to: { name: 'manage-languages' },
    icon: GlobeAltIcon,
    roles: ['super admin'],
  },


  { name: 'Help', to: { name: 'help' }, icon: QuestionMarkCircleIcon },
]

const visibleNav = computed(() => {
  const rLower = roles().map((x: string) => String(x).toLowerCase())
  const isSuperAdmin = rLower.includes('super admin')
  // if (isSuperAdmin) return nav

  return nav.filter((n: any) => {
    const itemRoles = Array.isArray(n.roles)
      ? n.roles.map((x: string) => String(x).toLowerCase())
      : []
    const itemPerms = Array.isArray(n.permissions) ? n.permissions : []

    const roleDefined = itemRoles.length > 0
    const permDefined = itemPerms.length > 0

    const roleOk = !roleDefined || itemRoles.some((role: string) => rLower.includes(role))
    const permOk = !permDefined || itemPerms.some((p: string) => hasPermission(p))

    // If both defined, allow if either matches; otherwise require whichever is defined
    return roleDefined && permDefined ? (roleOk || permOk) : (roleOk && permOk)
  })
})
</script>

<template>
  <aside
    :class="[
      'bg-white border-r border-slate-200 transition-all duration-300',
      open ? 'w-72' : 'w-20',
    ]"
  >
    <div class="flex items-center justify-between h-16 px-4 border-b border-slate-200">
      <RouterLink to="/" class="flex items-center gap-2">
        <span
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-soft"
          >OH</span
        >
        <span v-if="open" class="text-lg font-semibold tracking-tight">OrbitHR</span>
      </RouterLink>
      <button
        class="text-slate-500 hover:text-slate-700"
        @click="open = !open"
        aria-label="Toggle sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
      </button>
    </div>
    <nav class="p-3">
      <ul class="space-y-1">
        <li v-for="item in visibleNav" :key="item.name">
          <RouterLink
            :to="item.to"
            class="group flex items-center gap-3 rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
            :class="{ 'bg-slate-100 text-slate-900': route.name === item.to.name }"
          >
            <component
              :is="item.icon"
              class="h-5 w-5"
              :class="route.name === item.to.name ? 'text-brand-600' : 'text-slate-500 group-hover:text-slate-700'"
            />
            <span v-if="open" class="text-sm font-medium">{{ item.name }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped></style>
