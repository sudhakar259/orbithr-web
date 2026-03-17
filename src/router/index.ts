import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const MarketingHome = () => import('@/pages/marketing/Home.vue')
const Pricing = () => import('@/pages/marketing/Pricing.vue')

const Dashboard = () => import('@/pages/app/Dashboard.vue')
const Employees = () => import('@/pages/app/Employees.vue')
import { employeeRoutes } from '@/router/employee'
const Attendance = () => import('@/pages/app/Attendance.vue')
const Leave = () => import('@/pages/app/Leave.vue')
const Payroll = () => import('@/pages/app/Payroll.vue')
const Performance = () => import('@/pages/app/Performance.vue')
const Recruitment = () => import('@/pages/app/Recruitment.vue')
const Reports = () => import('@/pages/app/Reports.vue')
const Settings = () => import('@/pages/app/Settings.vue')
const Billing = () => import('@/pages/app/Billing.vue')
const Help = () => import('@/pages/app/Help.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: MarketingHome,
    meta: { layout: 'marketing', title: 'Home' },
  },
  {
    path: '/pricing',
    name: 'pricing',
    component: Pricing,
    meta: { layout: 'marketing', title: 'Pricing' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/marketing/Register.vue'),
    meta: { layout: 'marketing', title: 'Create workspace' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/marketing/Login.vue'),
    meta: { layout: 'marketing', title: 'Sign in' },
  },
  {
    path: '/accept-invite',
    name: 'accept-invite',
    component: () => import('@/pages/marketing/AcceptInvite.vue'),
    meta: { layout: 'marketing', title: 'Accept invite' },
  },
  {
    // Receives ?token=&u= from backend OAuth callback redirect
    path: '/auth/callback',
    name: 'oauth-callback',
    component: () => import('@/pages/marketing/OAuthCallback.vue'),
    meta: { layout: 'marketing', title: 'Signing in…' },
  },
  {
    path: '/app',
    component: () => import('@/components/layout/AppShell.vue'),
    meta: { layout: 'app', requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: Dashboard, meta: { title: 'Dashboard'} },
      {
        path: 'employees',
        name: 'employees',
        component: Employees,
        meta: { title: 'Employees', permissions: ['view employees'], roles: ['admin'] },
      },
      // Admin area (Super Admin only)
      {
        path: 'admin/users',
        name: 'users',
        component: () => import('@/pages/app/admin/Users.vue'),
        meta: { title: 'Users', superAdminOnly: true },
      },
      {
        path: 'admin/roles-permissions',
        name: 'roles-permissions',
        component: () => import('@/pages/app/admin/RolesPermissions.vue'),
        meta: { title: 'Roles & Permissions', roles: ['Super Admin', 'Tenant Admin'] },
      },
      {
        path: 'marketplace',
        name: 'marketplace',
        component: () => import('@/pages/app/Marketplace.vue'),
        meta: { title: 'Module Marketplace', requiresAuth: true },
      },
      {
        path: 'admin/modules',
        name: 'modules',
        redirect: '/super/modules',
      },
      {
        path: 'admin/tenant-modules',
        name: 'tenant-modules',
        component: () => import('@/pages/app/admin/TenantModules.vue'),
        meta: { title: 'Tenant Modules', roles: ['admin'] },
      },
      {
        path: 'admin/domain-requests',
        name: 'domain-requests',
        component: () => import('@/pages/app/admin/DomainRequests.vue'),
        meta: { title: 'Domain Requests', superAdminOnly: true },
      },
      {
        path: 'admin/plans',
        name: 'plans',
        redirect: '/super/plans',
      },
      {
        path: 'admin/transactions',
        name: 'transactions',
        redirect: '/super/transactions',
      },
      {
        path: 'admin/settings',
        name: 'admin-settings',
        component: () => import('@/pages/app/admin/AdminSettings.vue'),
        meta: { title: 'Admin Settings', superAdminOnly: true },
      },
      {
        path: 'admin/landing-page',
        name: 'landing-page',
        component: () => import('@/pages/app/admin/LandingPage.vue'),
        meta: { title: 'Landing Page', superAdminOnly: true },
      },
      {
        path: 'admin/manage-languages',
        name: 'manage-languages',
        component: () => import('@/pages/app/admin/ManageLanguages.vue'),
        meta: { title: 'Manage Languages', superAdminOnly: true },
      },
      {
        path: 'admin/leave-types',
        name: 'leave-types',
        component: () => import('@/pages/app/admin/LeaveTypes.vue'),
        meta: { title: 'Leave Types', roles: ['admin', 'hr_manager'], permissions: ['view leave'] },
      },
      {
        path: 'admin/leave-policies',
        name: 'leave-policies',
        component: () => import('@/pages/app/admin/LeavePolicies.vue'),
        meta: { title: 'Leave Policies', roles: ['admin', 'hr_manager'], permissions: ['view leave'] },
      },
      {
        path: 'admin/leave-adjustments',
        name: 'leave-adjustments',
        component: () => import('@/pages/app/admin/LeaveAdjustments.vue'),
        meta: { title: 'Leave Adjustments', roles: ['admin', 'hr_manager'], permissions: ['view leave'] },
      },
      {
        path: 'admin/leave-reports',
        name: 'leave-reports',
        component: () => import('@/pages/app/admin/LeaveReports.vue'),
        meta: { title: 'Leave Reports', roles: ['admin', 'hr_manager', 'manager'], permissions: ['view leave'] },
      },
      {
        path: 'admin/leave-audit-log',
        name: 'leave-audit-log',
        component: () => import('@/pages/app/admin/LeaveAuditLog.vue'),
        meta: { title: 'Leave Audit Log', roles: ['admin', 'hr_manager'], permissions: ['view leave'] },
      },
      ...employeeRoutes,
      {
        path: 'attendance',
        name: 'attendance',
        component: Attendance,
        meta: { title: 'Attendance', permissions: ['view attendance'], roles: ['admin']},
      },
      {
        path: 'regularizations',
        name: 'regularizations',
        component: () => import('@/pages/app/RegularizationRequests.vue'),
        meta: { title: 'Regularization Requests', permissions: ['regularize attendance'], roles: ['admin', 'manager', 'team_lead']},
      },
      {
        path: 'my-regularizations',
        name: 'my-regularizations',
        component: () => import('@/pages/app/MyRegularizations.vue'),
        meta: { title: 'My Regularization Requests' },
      },
      {
        path: 'leave',
        name: 'leave',
        component: Leave,
        meta: { title: 'Leave', permissions: ['view leaves'], roles: ['admin']},
      },
      {
        path: 'payroll',
        name: 'payroll',
        component: Payroll,
        meta: { title: 'Payroll', permissions: ['view payroll'], roles: ['admin'] },
      },
      {
        path: 'performance',
        name: 'performance',
        component: Performance,
        meta: { title: 'Performance', permissions: ['view performance'], roles: ['admin'] },
      },
      {
        path: 'recruitment',
        name: 'recruitment',
        component: Recruitment,
        meta: { title: 'Recruitment',  permissions: ['manage-recruitment'], roles: ['admin'] },
      },
      {
        path: 'reports',
        name: 'reports',
        component: Reports,
        meta: { title: 'Reports', permissions: ['manage-reports'], roles: ['admin'] },
      },
      {
        path: 'settings',
        name: 'settings',
        component: Settings,
        meta: { title: 'Settings', permissions: ['view settings'], roles: ['admin'] },
      },
      {
        path: 'billing',
        name: 'billing',
        component: Billing,
        meta: { title: 'Billing', permissions: ['manage-billing'], roles: ['admin'] },
      },
      { path: 'help', name: 'help', component: Help, meta: { title: 'Help & Support' } },
      {
        path: 'onboarding',
        name: 'onboarding',
        component: () => import('@/pages/app/Onboarding.vue'),
        meta: { title: 'Onboarding', permissions: ['manage-onboarding'], roles: ['admin'] },
      },
      {
        path: 'announcements',
        name: 'announcements',
        component: () => import('@/pages/app/Announcements.vue'),
        meta: { title: 'Announcements' },
      },
      {
        path: 'payslips',
        name: 'payslips',
        component: () => import('@/pages/app/Payslips.vue'),
        meta: { title: 'Payslips', permissions: ['view payroll'], roles: ['admin', 'hr_manager'] },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/pages/app/Profile.vue'),
        meta: { title: 'My Profile' },
      },
      {
        path: 'training',
        name: 'training',
        component: () => import('@/pages/app/Training.vue'),
        meta: { title: 'Training & Development' },
      },
      {
        path: 'holiday-calendar',
        name: 'holiday-calendar',
        component: () => import('@/pages/app/HolidayCalendar.vue'),
        meta: { title: 'Holiday Calendar', roles: ['admin', 'hr_manager'] },
      },
      {
        path: 'leave-calendar',
        name: 'leave-calendar',
        component: () => import('@/pages/app/LeaveCalendar.vue'),
        meta: { title: 'Leave Calendar' },
      },
      {
        path: 'assets',
        name: 'assets',
        component: () => import('@/pages/app/AssetManagement.vue'),
        meta: { title: 'Asset Management', roles: ['admin', 'hr_manager'] },
      },
    ],
  },
  // API docs — full-screen dark layout, outside AppShell
  {
    path: '/api-docs',
    name: 'api-docs',
    component: () => import('@/pages/app/ApiDocs.vue'),
    meta: { layout: 'docs', title: 'API Documentation', requiresAuth: true },
  },

  // Super admin login (public marketing layout)
  {
    path: '/super/login',
    name: 'super-login',
    component: () => import('@/pages/marketing/SuperAdminLogin.vue'),
    meta: { layout: 'marketing', title: 'Super Admin Login' },
  },

  // Super admin area — dedicated shell
  {
    path: '/super',
    component: () => import('@/components/layout/SuperAdminShell.vue'),
    meta: { requiresAuth: true, superAdminOnly: true },
    children: [
      {
        path: 'dashboard',
        name: 'super-dashboard',
        component: () => import('@/pages/super/SuperDashboard.vue'),
        meta: { title: 'Platform Dashboard' },
      },
      {
        path: 'tenants',
        name: 'super-tenants',
        component: () => import('@/pages/super/TenantsView.vue'),
        meta: { title: 'Tenants' },
      },
      {
        path: 'tenants/:id',
        name: 'super-tenant-detail',
        component: () => import('@/pages/super/TenantDetail.vue'),
        meta: { title: 'Tenant Detail' },
      },
      {
        path: 'billing',
        name: 'super-billing',
        component: () => import('@/pages/super/BillingView.vue'),
        meta: { title: 'Billing & Revenue' },
      },
      {
        path: 'modules',
        name: 'super-modules',
        component: () => import('@/pages/super/ModulesView.vue'),
        meta: { title: 'Modules' },
      },
      {
        path: 'subscriptions',
        name: 'super-subscriptions',
        component: () => import('@/pages/super/SubscriptionsView.vue'),
        meta: { title: 'Subscriptions' },
      },
      {
        path: 'audit',
        name: 'super-audit',
        component: () => import('@/pages/super/AuditLogView.vue'),
        meta: { title: 'Audit Log' },
      },
      {
        path: 'domain-requests',
        name: 'super-domain-requests',
        component: () => import('@/pages/app/admin/DomainRequests.vue'),
        meta: { title: 'Domain Requests' },
      },
      {
        path: 'transactions',
        name: 'super-transactions',
        component: () => import('@/pages/super/TransactionsView.vue'),
        meta: { title: 'Transactions' },
      },
      {
        path: 'plans',
        name: 'super-plans',
        component: () => import('@/pages/super/PlansView.vue'),
        meta: { title: 'Plans & Pricing' },
      },
    ],
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// route guard
import { useAuth } from '@/composables/useAuth'

const MAIN_HOST = (import.meta as any).env?.VITE_MAIN_HOST || 'orbithr.test'
const MAIN_PORT = (import.meta as any).env?.VITE_MAIN_PORT || '5173'

function getBaseHost(host: string) {
  return host.split(':')[0]
}
function getSubdomain(host: string) {
  const base = getBaseHost(host)
  const parts = base.split('.')
  if (parts.length < 3) return ''
  return parts.slice(0, parts.length - 2).join('.')
}
function isTenantHost(host: string) {

  const base = getBaseHost(host)
  return base.endsWith('.' + MAIN_HOST) && getSubdomain(base) !== ''
}
let hostValidated = false
interface TenantHostInfo {
  registered: boolean
  subdomain?: string
  domain?: string
  tenant_status?: string | null
  pending_request?: { status: string; email: string } | null
}
async function validateTenantHost(subdomain: string): Promise<TenantHostInfo | null> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 1500)
    const response = await fetch(`http://backend.test/api/v1/auth/check-domain/${subdomain}`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(id)
    if (!response.ok) return null
    const data = await response.json()
    return {
      registered: !!data.registered,
      subdomain: data.subdomain,
      domain: data.domain,
      tenant_status: data.tenant_status,
      pending_request: data.pending_request,
    }
  } catch {
    return null
  }
}

router.beforeEach(async (to, from, next) => {
  const { isAuthenticated, roles, hasPermission } = useAuth()
  const userRoles = roles().map((r: string) => r.toLowerCase())
  const requiresAuth = to.matched.some(r => r.meta?.requiresAuth)

  // 1. Tenant domain validation
  if (!hostValidated && isTenantHost(location.hostname)) {
    const subdomain = getSubdomain(location.hostname)
    const info = await validateTenantHost(subdomain)
    hostValidated = true
    if (!info?.registered) {
      // Check if there's a pending request for this domain
      if (info?.pending_request) {
        // Domain exists as pending/rejected request — show appropriate page
        if (info.pending_request.status === 'pending') {
          return window.location.href = `http://${MAIN_HOST}:${MAIN_PORT}/register?status=pending&email=${encodeURIComponent(info.pending_request.email)}`
        }
      }
      return window.location.href = `http://${MAIN_HOST}:${MAIN_PORT}/register`
    }
    // Tenant exists but is not active (suspended/expired)
    if (info.tenant_status && info.tenant_status !== 'active') {
      return window.location.href = `http://${MAIN_HOST}:${MAIN_PORT}/login?tenant_status=${info.tenant_status}`
    }
  }

  // 2. Require login
  if (requiresAuth && !isAuthenticated()) return next({ name: 'login' })

  // 3. Always allowed routes
  const alwaysAllowed = new Set(['dashboard', 'help'])
  // if (alwaysAllowed.has(String(to.name))) return next()


  // 4a. Super admin guard: redirect super admin away from tenant /app to /super
  if (userRoles.includes('super admin') && to.path.startsWith('/app')) {
    return next({ name: 'super-dashboard' })
  }

  // 4b. Super admin routes (only allow routes explicitly flagged)
  if (to.matched.some(r => r.meta?.superAdminOnly)) {
    if (!userRoles.includes('super admin')) {
      return next({ name: 'dashboard' })
    }
    return next() // super admin explicitly allowed
  }

  // 5. Tenant routes (roles & permissions)
  // 🟢 Apply checks for EVERYONE, including super admin
  let allowed = true

  // Normalize roles for both sides
  const routeRoles = (to.matched
    .flatMap(r => (r.meta?.roles || [])) as string[])
    .map((r: string) => r.toLowerCase())
  const roleDefined = routeRoles.length > 0
  const roleMatch = !roleDefined || routeRoles.some(r => userRoles.includes(r))

  // Permissions check
  const routePermissions = (to.matched.flatMap(r => (r.meta?.permissions || [])) as string[])
  const permDefined = routePermissions.length > 0
  const permMatch = !permDefined || routePermissions.some((p: string) => hasPermission(p))

  // If both defined, allow if either matches; otherwise require whichever is defined
  allowed = roleDefined && permDefined ? (roleMatch || permMatch) : (roleMatch && permMatch)

  if (!allowed) return next({ name: 'dashboard' })


  // 6. Marketing pages redirect
  if (['login', 'register'].includes(String(to.name)) && isAuthenticated()) {
    return next({ name: 'dashboard' })
  }

  next()
})

export default router
