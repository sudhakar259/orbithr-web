<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
    api.get('/leaves', { params: { status: 'pending', per_page: 1 } })
      .then(r => {
        pendingLeaves.value = r.data?.meta?.total ?? r.data?.total ?? r.data?.data?.length ?? null
      }),
  ])
}

onMounted(fetchBadges)

// ─────────────────────────────────────────────────────
const initials = computed(() => {
  const name = user.value?.name ?? ''
  return name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() || 'U'
})

const isActive = (routeName: string) => {
  if (Array.isArray(routeName)) return routeName.includes(String(route.name))
  return route.name === routeName
}

const rLower = computed(() => roles().map((x: string) => String(x).toLowerCase()))

// Admin (tenant owner) has all permissions by default — bypass checks
const isAdmin      = computed(() => rLower.value.includes('admin') || rLower.value.includes('tenant admin'))
const isSuperAdmin = computed(() => rLower.value.includes('super admin'))

function canSee(item: NavItem): boolean {
  // superAdminOnly items are never shown to anyone else — even admin
  if (item.superAdminOnly) return isSuperAdmin.value
  // Super admin and tenant admin see everything else
  if (isSuperAdmin.value || isAdmin.value) return true
  const itemRoles = item.roles?.map((x: string) => x.toLowerCase()) ?? []
  const itemPerms = item.permissions ?? []
  const roleDefined = itemRoles.length > 0
  const permDefined = itemPerms.length > 0
  const roleOk = !roleDefined || itemRoles.some((r: string) => rLower.value.includes(r))
  const permOk = !permDefined || itemPerms.some((p: string) => hasPermission(p))
  return roleDefined && permDefined ? (roleOk || permOk) : (roleOk && permOk)
}

function handleLogout() {
  showMenu.value = false
  logout()
  router.push({ name: 'login' })
}

interface NavItem {
  name: string
  to: { name: string }
  icon: string
  badge?: number | null
  roles?: string[]
  permissions?: string[]
  superAdminOnly?: boolean
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections = computed<NavSection[]>(() => [
  {
    label: 'Overview',
    items: [
      {
        name: 'Dashboard', to: { name: 'dashboard' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>',
      },
      {
        name: 'Employees', to: { name: 'employees' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>',
        badge: employeeCount.value,
        permissions: ['view employees'], roles: ['admin'],
      },
      {
        name: 'Attendance', to: { name: 'attendance' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
        permissions: ['view attendance'], roles: ['admin'],
      },
      {
        name: 'Regularization', to: { name: 'regularizations' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>',
        permissions: ['regularize attendance'], roles: ['admin', 'manager', 'team_lead'],
      },
    ],
  },
  {
    label: 'Payroll & Finance',
    items: [
      {
        name: 'Payroll', to: { name: 'payroll' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>',
        permissions: ['view payroll'], roles: ['admin'],
      },
      {
        name: 'Payslips', to: { name: 'payslips' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
        permissions: ['view payroll'], roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Performance', to: { name: 'performance' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clip-rule="evenodd"/></svg>',
        permissions: ['view performance'], roles: ['admin'],
      },
      {
        name: 'Reports', to: { name: 'reports' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>',
        permissions: ['manage-reports'], roles: ['admin'],
      },
      {
        name: 'Billing', to: { name: 'billing' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" clip-rule="evenodd"/></svg>',
        permissions: ['manage-billing'], roles: ['admin'],
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        name: 'Leave', to: { name: 'leave' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/></svg>',
        badge: pendingLeaves.value,
        permissions: ['view leaves'], roles: ['admin'],
      },
      {
        name: 'Recruitment', to: { name: 'recruitment' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>',
        permissions: ['manage-recruitment'], roles: ['admin'],
      },
      {
        name: 'Announcements', to: { name: 'announcements' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clip-rule="evenodd"/></svg>',
      },
      {
        name: 'Holiday Calendar', to: { name: 'holiday-calendar' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
      {
        name: 'Training', to: { name: 'training' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/></svg>',
      },
      {
        name: 'Assets', to: { name: 'assets' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>',
        roles: ['admin', 'hr_manager'],
      },
    ],
  },
  {
    label: 'Workspace',
    items: [
      {
        name: 'Settings', to: { name: 'settings' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'Modules', to: { name: 'tenant-modules' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'Help', to: { name: 'help' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        name: 'Users', to: { name: 'users' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07z"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'Roles & Permissions', to: { name: 'roles-permissions' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'Domain Requests', to: { name: 'domain-requests' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'System Modules', to: { name: 'modules' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'Plans', to: { name: 'plans' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'Transactions', to: { name: 'transactions' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'Admin Settings', to: { name: 'admin-settings' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'Landing Page', to: { name: 'landing-page' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>',
        superAdminOnly: true,
      },
      {
        name: 'Languages', to: { name: 'manage-languages' },
        icon: '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clip-rule="evenodd"/></svg>',
        superAdminOnly: true,
      },
    ],
  },
])

const visibleSections = computed(() =>
  navSections.value.map(sec => ({
    ...sec,
    items: sec.items.filter(canSee),
  })).filter(sec => sec.items.length > 0)
)
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
        <RouterLink
          v-for="item in sec.items"
          :key="item.name"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to.name) }"
        >
          <span class="ni-icon" v-html="item.icon" />
          <span class="ni-label">{{ item.name }}</span>
          <span v-if="item.badge" class="ni-badge">{{ item.badge }}</span>
        </RouterLink>
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
  color: var(--dim); font-size: 13px; font-weight: 400;
  transition: all .14s; position: relative;
  text-decoration: none;
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
