<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const { user, roles, hasPermission, logout } = useAuth()
const showMenu = ref(false)

// ── Dynamic badge counts ──────────────────────────────
const employeeCount  = ref<number | null>(null)
const pendingLeaves  = ref<number | null>(null)

async function fetchBadges() {
  await Promise.allSettled([
    api.get('/employees', { params: { per_page: 1 } })
      .then(r => {
        employeeCount.value = r.data?.meta?.total ?? r.data?.total ?? r.data?.data?.length ?? null
      }),
    api.get('/leave-requests', { params: { status: 'pending', per_page: 1 } })
      .then(r => {
        pendingLeaves.value = r.data?.meta?.total ?? r.data?.total ?? r.data?.data?.length ?? null
      }),
  ])
}

onMounted(() => {
  fetchBadges()
  syncExpanded()
})

watch(() => route.name, syncExpanded)

// ── Collapsible module groups ─────────────────────────
const expanded = ref<Set<string>>(new Set())

function toggle(key: string) {
  if (expanded.value.has(key)) {
    expanded.value.delete(key)
  } else {
    expanded.value.add(key)
  }
  // trigger reactivity
  expanded.value = new Set(expanded.value)
}

function isExpanded(key: string) {
  return expanded.value.has(key)
}

// ─────────────────────────────────────────────────────
const initials = computed(() => {
  const name = user.value?.name ?? ''
  return name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() || 'U'
})

// Match exact route OR any child routes (e.g. 'recruitment' also matches 'recruitment.jobs.show')
const isActive = (routeName: string) => {
  const current = String(route.name)
  if (Array.isArray(routeName)) return routeName.some(n => current === n || current.startsWith(n + '.'))
  return current === routeName || current.startsWith(routeName + '.')
}

const rLower = computed(() => roles().map((x: string) => String(x).toLowerCase()))

const isAdmin      = computed(() => rLower.value.includes('admin') || rLower.value.includes('tenant admin'))
const isSuperAdmin = computed(() => rLower.value.includes('super admin'))

interface NavChild {
  name: string
  to: { name: string }
  icon: string
  badge?: number | null
  roles?: string[]
  permissions?: string[]
}

interface NavGroup {
  key: string
  label: string
  icon: string
  superAdminOnly?: boolean
  roles?: string[]
  permissions?: string[]
  // If children exists, this is a collapsible parent group
  children?: NavChild[]
  // If to exists, this is a direct link (no expand)
  to?: { name: string }
  badge?: number | null
}

interface NavSection {
  label: string
  items: NavGroup[]
}

function canSeeGroup(item: { superAdminOnly?: boolean; roles?: string[]; permissions?: string[] }): boolean {
  // Super admin has a dedicated shell at /super — they don't use tenant HR items
  if (isSuperAdmin.value) return false
  if (item.superAdminOnly) return false
  if (isAdmin.value) return true
  const itemRoles = item.roles?.map((x: string) => x.toLowerCase()) ?? []
  const itemPerms = item.permissions ?? []
  const roleDefined = itemRoles.length > 0
  const permDefined = itemPerms.length > 0
  const roleOk = !roleDefined || itemRoles.some((r: string) => rLower.value.includes(r))
  const permOk = !permDefined || itemPerms.some((p: string) => hasPermission(p))
  return roleDefined && permDefined ? (roleOk || permOk) : (roleOk && permOk)
}

function canSeeChild(item: NavChild): boolean {
  if (isSuperAdmin.value) return false
  if (isAdmin.value) return true
  const itemRoles = item.roles?.map((x: string) => x.toLowerCase()) ?? []
  const itemPerms = item.permissions ?? []
  const roleDefined = itemRoles.length > 0
  const permDefined = itemPerms.length > 0
  const roleOk = !roleDefined || itemRoles.some((r: string) => rLower.value.includes(r))
  const permOk = !permDefined || itemPerms.some((p: string) => hasPermission(p))
  return roleDefined && permDefined ? (roleOk || permOk) : (roleOk && permOk)
}

const moduleGroups = computed<NavGroup[]>(() => [
  // ── Standalone items ──────────────────────────────
  {
    key: 'dashboard',
    label: 'Dashboard',
    to: { name: 'dashboard' },
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>',
  },

  // ── Employee Management (parent) ──────────────────
  {
    key: 'employee',
    label: 'Employees',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>',
    badge: employeeCount.value,
    permissions: ['view employees'],
    roles: ['admin'],
    children: [
      {
        name: 'Employee Directory',
        to: { name: 'employees' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>',
        permissions: ['view employees'], roles: ['admin'],
      },
      {
        name: 'HR Letters',
        to: { name: 'hr-letters' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Onboarding',
        to: { name: 'onboarding' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Exit Management',
        to: { name: 'exit-management' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
    ],
  },

  // ── Attendance (parent) ───────────────────────────
  {
    key: 'attendance',
    label: 'Attendance',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
    permissions: ['view attendance'],
    roles: ['admin'],
    children: [
      {
        name: 'Attendance Records',
        to: { name: 'attendance' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
        permissions: ['view attendance'], roles: ['admin'],
      },
      {
        name: 'Regularization',
        to: { name: 'regularizations' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
        permissions: ['regularize attendance'], roles: ['admin', 'manager', 'team_lead'],
      },
      {
        name: 'My Requests',
        to: { name: 'my-regularizations' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
      },
      {
        name: 'Advanced Attendance',
        to: { name: 'attendance.advanced' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
    ],
  },

  // ── Leave Management (parent) ─────────────────────
  {
    key: 'leave',
    label: 'Leave',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>',
    badge: pendingLeaves.value,
    permissions: ['view leaves'],
    roles: ['admin'],
    children: [
      {
        name: 'Leave Requests',
        to: { name: 'leave' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>',
        badge: pendingLeaves.value,
        permissions: ['view leaves'], roles: ['admin'],
      },
      {
        name: 'Leave Types',
        to: { name: 'leave-types' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>',
        permissions: ['view leaves'], roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Leave Policies',
        to: { name: 'leave-policies' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        permissions: ['view leaves'], roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Holiday Calendar',
        to: { name: 'holiday-calendar' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
    ],
  },

  // ── Payroll (parent) ──────────────────────────────
  {
    key: 'payroll',
    label: 'Payroll',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>',
    permissions: ['view payroll'],
    roles: ['admin'],
    children: [
      {
        name: 'Payroll Processing',
        to: { name: 'payroll' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" clip-rule="evenodd"/></svg>',
        permissions: ['view payroll'], roles: ['admin'],
      },
      {
        name: 'Payslips',
        to: { name: 'payslips' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
        permissions: ['view payroll'], roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Statutory Compliance',
        to: { name: 'payroll.statutory' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        permissions: ['view payroll'], roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Gratuity',
        to: { name: 'payroll.gratuity' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 1a1 1 0 100 2 1 1 0 000-2z"/></svg>',
        permissions: ['view payroll'], roles: ['admin', 'hr_manager'],
      },
    ],
  },

  // ── Asset Management ──────────────────────────────
  {
    key: 'assets',
    label: 'Assets',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>',
    permissions: ['view-assets'],
    roles: ['admin', 'hr_manager'],
    children: [
      {
        name: 'All Assets',
        to: { name: 'assets' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" clip-rule="evenodd"/></svg>',
        permissions: ['view-assets'], roles: ['admin', 'hr_manager'],
      },
    ],
  },

  // ── Standalone items ──────────────────────────────
  {
    key: 'performance',
    label: 'Performance',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clip-rule="evenodd"/></svg>',
    permissions: ['view performance'],
    roles: ['admin', 'hr_manager', 'manager', 'employee'],
    children: [
      {
        name: 'Goals',
        to: { name: 'performance.goals' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'My Appraisals',
        to: { name: 'performance.appraisals' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Appraisal Cycles',
        to: { name: 'performance.cycles' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
      {
        name: '360° Feedback',
        to: { name: 'performance.feedback' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Reports',
        to: { name: 'performance.reports' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager', 'manager'],
      },
      {
        name: 'Org Goals',
        to: { name: 'performance.org-goals' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Continuous Feedback',
        to: { name: 'performance.continuous-feedback' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Skill Matrix',
        to: { name: 'performance.skill-matrix' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Calibration',
        to: { name: 'performance.calibration' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
    ],
  },
  {
    key: 'social-engagement',
    label: 'Social & Engagement',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clip-rule="evenodd"/></svg>',
    roles: ['admin', 'hr_manager', 'manager', 'employee'],
    children: [
      {
        name: 'Announcements',
        to: { name: 'announcements' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Social Wall',
        to: { name: 'social-wall' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Polls',
        to: { name: 'polls' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Peer Recognition',
        to: { name: 'peer-recognition' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Events',
        to: { name: 'events' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Surveys',
        to: { name: 'surveys' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
    ],
  },
  {
    key: 'lnd',
    label: 'Learning & Dev',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>',
    permissions: ['view courses'],
    roles: ['admin', 'hr_manager', 'manager', 'employee'],
    children: [
      {
        name: 'My Learning',
        to: { name: 'lnd.my-learning' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.547l1.607.688a3 3 0 002.346 0l1.607-.688v3.547a9.026 9.026 0 00-2.3 1.638z"/></svg>',
        permissions: ['view courses'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Courses',
        to: { name: 'lnd.courses' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>',
        permissions: ['view courses'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Programs',
        to: { name: 'lnd.programs' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>',
        permissions: ['view training programs'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Skills',
        to: { name: 'lnd.skills' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clip-rule="evenodd"/></svg>',
        permissions: ['view skills'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Certifications',
        to: { name: 'lnd.certifications' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        permissions: ['view certifications'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Reports',
        to: { name: 'lnd.reports' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
        permissions: ['view lnd reports'], roles: ['admin', 'hr_manager'],
      },
    ],
  },
  {
    key: 'expenses',
    label: 'Expenses',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>',
    permissions: ['view expenses'],
    roles: ['admin', 'hr_manager', 'manager', 'employee'],
    children: [
      {
        name: 'My Claims',
        to: { name: 'expenses.my-claims' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
        permissions: ['view expenses'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Approvals',
        to: { name: 'expenses.approvals' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        permissions: ['approve expenses'], roles: ['admin', 'hr_manager', 'manager'],
      },
      {
        name: 'Reimbursements',
        to: { name: 'expenses.reimbursements' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" clip-rule="evenodd"/></svg>',
        permissions: ['process reimbursements'], roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Policies',
        to: { name: 'expenses.policies' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        permissions: ['manage expense policies'], roles: ['admin'],
      },
      {
        name: 'Reports',
        to: { name: 'expenses.reports' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clip-rule="evenodd"/></svg>',
        permissions: ['view expense reports'], roles: ['admin', 'hr_manager'],
      },
    ],
  },
  {
    key: 'recruitment',
    label: 'Recruitment',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>',
    permissions: ['view jobs'],
    roles: ['admin'],
    children: [
      {
        name: 'Job Postings',
        to: { name: 'recruitment' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"/><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/></svg>',
        permissions: ['view jobs'], roles: ['admin'],
      },
      {
        name: 'Analytics',
        to: { name: 'recruitment.analytics' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>',
        permissions: ['view-jobs'], roles: ['admin', 'hr_manager', 'manager'],
      },
      {
        name: 'Pipeline',
        to: { name: 'recruitment.pipeline' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"/></svg>',
        permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager'],
      },
      {
        name: 'Candidates',
        to: { name: 'recruitment.candidates' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>',
        permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager'],
      },
      {
        name: 'Interviews',
        to: { name: 'recruitment.interviews' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
        permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager'],
      },
      {
        name: 'Offers',
        to: { name: 'recruitment.offers' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
        permissions: ['view jobs'], roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Integrations',
        to: { name: 'recruitment.integrations' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd"/></svg>',
        permissions: ['manage job-board-integrations'], roles: ['admin'],
      },
      {
        name: 'Assessments',
        to: { name: 'recruitment.assessments' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>',
        permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager'],
      },
      {
        name: 'Internal Jobs',
        to: { name: 'recruitment.internal-jobs' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"/><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Candidate Portals',
        to: { name: 'recruitment.candidate-portals' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Email Inbox',
        to: { name: 'recruitment.email' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Email Settings',
        to: { name: 'recruitment.email-settings' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Calendar',
        to: { name: 'recruitment.calendar-settings' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
    ],
  },
  {
    key: 'ess',
    label: 'Self Service',
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>',
    permissions: ['view-employees'],
    roles: ['admin', 'hr_manager', 'manager', 'employee'],
    children: [
      {
        name: 'Dashboard',
        to: { name: 'ess.dashboard' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>',
        permissions: ['view-employees'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'My Profile',
        to: { name: 'ess.profile' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>',
        permissions: ['view-employees'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Attendance',
        to: { name: 'ess.attendance' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
        permissions: ['view-attendance'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Leave',
        to: { name: 'ess.leave' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"/></svg>',
        permissions: ['apply-leave'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Payslips',
        to: { name: 'ess.payslips' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" clip-rule="evenodd"/></svg>',
        permissions: ['view-payslips'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'HR Tickets',
        to: { name: 'ess.tickets' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>',
        permissions: ['create-tickets'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Ticket Management',
        to: { name: 'hr.tickets.admin' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Knowledge Base',
        to: { name: 'hr.knowledge-base' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>',
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
      {
        name: 'Notifications',
        to: { name: 'ess.notifications' },
        icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/></svg>',
        permissions: ['view-notifications'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
      },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    to: { name: 'reports' },
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
    permissions: ['manage-reports'],
    roles: ['admin'],
  },
  {
    key: 'billing',
    label: 'Billing',
    to: { name: 'billing' },
    icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" clip-rule="evenodd"/></svg>',
    permissions: ['manage-billing'],
    roles: ['admin'],
  },
])

// Auto-expand parent group when a child route is active
watch(
  () => route.name,
  () => {
    for (const group of moduleGroups.value) {
      if (group.children) {
        const childActive = group.children.some(c => c.to.name === route.name)
        if (childActive && !expanded.value.has(group.key)) {
          expanded.value = new Set([...expanded.value, group.key])
        }
      }
    }
  },
  { immediate: true }
)

const navSections = computed<NavSection[]>(() => [
  {
    label: 'Overview',
    items: moduleGroups.value.filter(g =>
      ['dashboard', 'employee', 'attendance', 'leave', 'payroll', 'performance', 'social-engagement', 'lnd', 'expenses', 'recruitment', 'ess'].includes(g.key)
    ),
  },
  {
    label: 'Workspace',
    items: [
      {
        key: 'workspace-settings',
        label: 'Settings',
        to: { name: 'settings' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
        roles: ['admin'],
      },
      {
        key: 'system-config',
        label: 'System Config',
        to: { name: 'system.config' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
        roles: ['admin'],
      },
      {
        key: 'modules',
        label: 'Modules',
        to: { name: 'tenant-modules' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>',
        roles: ['admin'],
      },
      {
        key: 'reports',
        label: 'Reports',
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
        permissions: ['view-reports'],
        roles: ['admin', 'hr_manager', 'manager', 'employee'],
        children: [
          {
            name: 'Attendance',
            to: { name: 'reports.attendance' },
            icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 011 1v3a1 1 0 11-2 0V8a1 1 0 011-1z" clip-rule="evenodd"/></svg>',
            permissions: ['view-reports'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
          },
          {
            name: 'Payroll',
            to: { name: 'reports.payroll' },
            icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" clip-rule="evenodd"/></svg>',
            permissions: ['view-reports'], roles: ['admin', 'hr_manager'],
          },
          {
            name: 'Headcount',
            to: { name: 'reports.headcount' },
            icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07z"/></svg>',
            permissions: ['view-reports'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
          },
          {
            name: 'Attrition',
            to: { name: 'reports.attrition' },
            icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clip-rule="evenodd"/></svg>',
            permissions: ['view-reports'], roles: ['admin', 'hr_manager'],
          },
          {
            name: 'Performance',
            to: { name: 'reports.performance' },
            icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd"/></svg>',
            permissions: ['view-reports'], roles: ['admin', 'hr_manager', 'manager', 'employee'],
          },
          {
            name: 'Custom Builder',
            to: { name: 'reports.custom' },
            icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
            permissions: ['manage-report-templates'], roles: ['admin', 'hr_manager'],
          },
          {
            name: 'Scheduled Reports',
            to: { name: 'reports.scheduled' },
            icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
            permissions: ['view-reports'], roles: ['admin', 'hr_manager'],
          },
          {
            name: 'People Analytics',
            to: { name: 'people-analytics' },
            icon: '<svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>',
            roles: ['admin', 'hr_manager'],
          },
        ],
      },
      {
        key: 'billing',
        label: 'Billing',
        to: { name: 'billing' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" clip-rule="evenodd"/></svg>',
        permissions: ['manage-billing'], roles: ['admin'],
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        key: 'users',
        label: 'Users',
        to: { name: 'users' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07z"/></svg>',
        superAdminOnly: true,
      },
      {
        key: 'roles-permissions',
        label: 'Roles & Permissions',
        to: { name: 'roles-permissions' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
      {
        key: 'domain-requests',
        label: 'Domain Requests',
        to: { name: 'domain-requests' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
      {
        key: 'system-modules',
        label: 'System Modules',
        to: { name: 'modules' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>',
        superAdminOnly: true,
      },
      {
        key: 'plans',
        label: 'Plans',
        to: { name: 'plans' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/></svg>',
        superAdminOnly: true,
      },
      {
        key: 'transactions',
        label: 'Transactions',
        to: { name: 'transactions' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
      {
        key: 'admin-settings',
        label: 'Admin Settings',
        to: { name: 'admin-settings' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
      {
        key: 'landing-page',
        label: 'Landing Page',
        to: { name: 'landing-page' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>',
        superAdminOnly: true,
      },
      {
        key: 'languages',
        label: 'Languages',
        to: { name: 'manage-languages' },
        icon: '<svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
    ],
  },
])

const visibleSections = computed(() =>
  navSections.value.map(sec => ({
    ...sec,
    items: sec.items.filter(item => {
      if (!canSeeGroup(item)) return false
      // For collapsible groups, only show if at least one child is visible
      if (item.children) {
        return item.children.some(canSeeChild)
      }
      return true
    }),
  })).filter(sec => sec.items.length > 0)
)

function hasActiveChild(group: NavGroup): boolean {
  if (!group.children) return false
  return group.children.some(c => isActive(c.to.name))
}

// Auto-expand groups that have an active child
function syncExpanded() {
  moduleGroups.value.forEach(item => {
    if (item.children && hasActiveChild(item)) {
      expanded.value.add(item.key)
    }
  })
  expanded.value = new Set(expanded.value)
}

function handleLogout() {
  showMenu.value = false
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <aside class="sidebar">
    <!-- Logo -->
    <div class="logo">
      <RouterLink to="/app" class="logo-inner">
        <div class="logo-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="logo-text">Orbit<span>HR</span></div>
      </RouterLink>
    </div>

    <!-- Navigation -->
    <nav class="nav">
      <div v-for="sec in visibleSections" :key="sec.label">
        <div class="sec-label">{{ sec.label }}</div>

        <template v-for="item in sec.items" :key="item.key">
          <!-- Collapsible parent group -->
          <template v-if="item.children">
            <button
              class="nav-item nav-parent"
              :class="{ 'parent-active': hasActiveChild(item) }"
              @click="toggle(item.key)"
            >
              <span class="ni-icon" v-html="item.icon" />
              <span class="ni-label">{{ item.label }}</span>
              <span v-if="item.badge" class="ni-badge">{{ item.badge }}</span>
              <svg
                class="ni-chevron"
                :class="{ open: isExpanded(item.key) }"
                width="11" height="11" viewBox="0 0 20 20" fill="currentColor"
              >
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>

            <!-- Sub-items -->
            <div v-if="isExpanded(item.key)" class="sub-items">
              <RouterLink
                v-for="child in item.children.filter(canSeeChild)"
                :key="child.name"
                :to="child.to"
                class="nav-item nav-child"
                :class="{ active: isActive(child.to.name) }"
              >
                <span class="ni-dot" />
                <span class="ni-icon" v-html="child.icon" />
                <span class="ni-label">{{ child.name }}</span>
                <span v-if="child.badge" class="ni-badge">{{ child.badge }}</span>
              </RouterLink>
            </div>
          </template>

          <!-- Direct nav link -->
          <RouterLink
            v-else
            :to="item.to!"
            class="nav-item"
            :class="{ active: isActive(item.to!.name) }"
          >
            <span class="ni-icon" v-html="item.icon" />
            <span class="ni-label">{{ item.label }}</span>
            <span v-if="item.badge" class="ni-badge">{{ item.badge }}</span>
          </RouterLink>
        </template>
      </div>
    </nav>

    <!-- User footer -->
    <div class="sidebar-footer">
      <div class="user-row" @click="showMenu = !showMenu">
        <div class="uav">{{ initials }}</div>
        <div class="uinfo">
          <div class="uname">{{ user?.name || 'User' }}</div>
          <div class="urole">{{ roles()[0] || 'Member' }}</div>
        </div>
        <svg class="uchev" :class="{ flip: showMenu }" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </div>
      <Transition name="slide">
        <div v-if="showMenu" class="user-menu">
          <RouterLink to="/app/profile" class="um-item" @click="showMenu = false">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
            My Profile
          </RouterLink>
          <RouterLink to="/app/settings" class="um-item" @click="showMenu = false">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
            Settings
          </RouterLink>
          <RouterLink to="/app/help" class="um-item" @click="showMenu = false">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
            Help & Support
          </RouterLink>
          <div class="um-sep" />
          <div class="um-item logout" @click="handleLogout">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd"/></svg>
            Sign Out
          </div>
        </div>
      </Transition>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sw);
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
  overflow: hidden;
}

/* Logo */
.logo {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.logo-inner {
  display: flex; align-items: center; gap: 12px;
  text-decoration: none;
}
.logo-mark {
  width: 34px; height: 34px;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  border-radius: 10px;
  display: grid; place-items: center;
  box-shadow: 0 0 18px rgba(79,126,255,.4);
  flex-shrink: 0;
}
.logo-text {
  font-weight: 700; font-size: 17px; letter-spacing: -.3px;
  color: var(--text);
}
.logo-text span { color: var(--accent); }

/* Nav */
.nav {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sec-label {
  font-size: 9px; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--muted);
  padding: 10px 10px 5px; margin-top: 4px;
}
.nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 9px 10px; border-radius: var(--rs);
  color: var(--dim); font-size: 13.5px; font-weight: 500;
  transition: all .14s; position: relative;
  text-decoration: none; width: 100%;
  background: none; border: none; cursor: pointer; text-align: left;
}
.nav-item:hover { background: var(--surface2); color: var(--text); }
.nav-item.active {
  background: var(--accent-glow);
  color: var(--accent);
  font-weight: 500;
}
.nav-item.active::before {
  content: '';
  position: absolute; left: 0; top: 20%; bottom: 20%;
  width: 3px; background: var(--accent); border-radius: 0 3px 3px 0;
}

/* Parent group item */
.nav-parent {
  font-weight: 500;
}
.nav-parent.parent-active {
  color: var(--text);
}

/* Chevron */
.ni-chevron {
  margin-left: auto;
  color: var(--muted);
  transition: transform .2s;
  flex-shrink: 0;
}
.ni-chevron.open { transform: rotate(180deg); }

/* Sub-items */
.sub-items {
  padding-left: 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.nav-child {
  padding: 7px 10px 7px 8px;
  font-size: 13px;
}
.nav-child::before { display: none; }
.nav-child.active {
  background: var(--accent-glow);
  color: var(--accent);
  font-weight: 500;
}
.nav-child.active .ni-dot {
  background: var(--accent);
}

.ni-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--border-hi);
  flex-shrink: 0;
  margin-right: -4px;
}

.ni-icon { flex-shrink: 0; opacity: .8; display: flex; align-items: center; }
.ni-label { flex: 1; }
.ni-badge {
  background: var(--red); color: #fff;
  font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 20px;
  line-height: 1.4;
}

/* Footer */
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  position: relative;
}
.user-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px; border-radius: var(--rs);
  cursor: pointer; transition: background .14s;
}
.user-row:hover { background: var(--surface2); }
.uav {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  display: grid; place-items: center;
  font-size: 11px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.uinfo { flex: 1; min-width: 0; }
.uname { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.urole { font-size: 10px; color: var(--muted); text-transform: capitalize; }
.uchev { color: var(--muted); transition: transform .2s; flex-shrink: 0; }
.uchev.flip { transform: rotate(180deg); }

.user-menu {
  position: absolute; bottom: calc(100% - 4px); left: 12px; right: 12px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  border-radius: var(--rs); overflow: hidden; z-index: 200;
  box-shadow: 0 12px 32px rgba(0,0,0,.5);
}
.um-item {
  display: flex; align-items: center; gap: 9px;
  padding: 10px 14px; font-size: 13px; cursor: pointer;
  color: var(--dim); transition: background .1s; text-decoration: none;
}
.um-item:hover { background: rgba(255,255,255,.05); color: var(--text); }
.um-item.logout { color: var(--red); }
.um-sep { height: 1px; background: var(--border); margin: 3px 0; }

.slide-enter-active, .slide-leave-active { transition: all .18s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(6px); }
</style>
