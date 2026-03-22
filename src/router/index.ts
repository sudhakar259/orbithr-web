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
// Performance uses nested routes — see below
// Recruitment uses nested routes — see below
// Reports uses nested routes — see below
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
        path: 'attendance/advanced',
        name: 'attendance.advanced',
        component: () => import('@/pages/app/attendance/AdvancedAttendance.vue'),
        meta: { title: 'Advanced Attendance', permissions: ['view attendance'], roles: ['admin', 'hr_manager'] },
      },
      {
        path: 'people-analytics',
        name: 'people-analytics',
        component: () => import('@/pages/app/PeopleAnalytics.vue'),
        meta: { title: 'People Analytics', roles: ['admin', 'hr_manager'] },
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
        component: () => import('@/pages/app/performance/PerformanceLayout.vue'),
        meta: { requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'] },
        children: [
          {
            path: '',
            name: 'performance',
            component: () => import('@/pages/app/performance/PerformanceDashboard.vue'),
            meta: { title: 'Performance', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'goals',
            name: 'performance.goals',
            component: () => import('@/pages/app/performance/Goals.vue'),
            meta: { title: 'Goals', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'goals/new',
            name: 'performance.goals.create',
            component: () => import('@/pages/app/performance/GoalForm.vue'),
            meta: { title: 'New Goal', roles: ['admin', 'hr_manager', 'manager'] },
          },
          {
            path: 'goals/:id',
            name: 'performance.goals.show',
            component: () => import('@/pages/app/performance/GoalDetail.vue'),
            meta: { title: 'Goal Detail', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'cycles',
            name: 'performance.cycles',
            component: () => import('@/pages/app/performance/AppraisalCycles.vue'),
            meta: { title: 'Appraisal Cycles', roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'cycles/new',
            name: 'performance.cycles.create',
            component: () => import('@/pages/app/performance/CycleForm.vue'),
            meta: { title: 'New Cycle', roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'cycles/:id',
            name: 'performance.cycles.show',
            component: () => import('@/pages/app/performance/CycleDetail.vue'),
            meta: { title: 'Cycle Detail', roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'appraisals',
            name: 'performance.appraisals',
            component: () => import('@/pages/app/performance/Appraisals.vue'),
            meta: { title: 'My Appraisals', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'appraisals/:id',
            name: 'performance.appraisals.show',
            component: () => import('@/pages/app/performance/AppraisalDetail.vue'),
            meta: { title: 'Appraisal Detail', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'feedback',
            name: 'performance.feedback',
            component: () => import('@/pages/app/performance/Feedback.vue'),
            meta: { title: '360° Feedback', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'reports',
            name: 'performance.reports',
            component: () => import('@/pages/app/performance/Reports.vue'),
            meta: { title: 'Performance Reports', roles: ['admin', 'hr_manager', 'manager'] },
          },
          {
            path: 'org-goals',
            name: 'performance.org-goals',
            component: () => import('@/pages/app/performance/OrgGoals.vue'),
            meta: { title: 'Org Goals', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'continuous-feedback',
            name: 'performance.continuous-feedback',
            component: () => import('@/pages/app/performance/ContinuousFeedback.vue'),
            meta: {
              title: 'Continuous Feedback',
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
            },
          },
          {
            path: 'skill-matrix',
            name: 'performance.skill-matrix',
            component: () => import('@/pages/app/performance/SkillMatrix.vue'),
            meta: { title: 'Skill Matrix', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'calibration',
            name: 'performance.calibration',
            component: () => import('@/pages/app/performance/Calibration.vue'),
            meta: { title: 'Calibration', roles: ['admin', 'hr_manager'] },
          },
        ],
      },
      {
        path: 'lnd',
        component: () => import('@/pages/app/lnd/LndLayout.vue'),
        meta: {
          requiresAuth: true,
          module: 'learning-development',
          roles: ['admin', 'hr_manager', 'manager', 'employee'],
        },
        children: [
          {
            path: '',
            name: 'lnd',
            component: () => import('@/pages/app/lnd/LndDashboard.vue'),
            meta: {
              title: 'L&D Dashboard',
              permissions: ['view courses'],
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
            },
          },
          {
            path: 'my-learning',
            name: 'lnd.my-learning',
            component: () => import('@/pages/app/lnd/MyLearning.vue'),
            meta: {
              title: 'My Learning',
              permissions: ['view courses'],
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
            },
          },
          {
            path: 'courses',
            name: 'lnd.courses',
            component: () => import('@/pages/app/lnd/LndCourses.vue'),
            meta: {
              title: 'Courses',
              permissions: ['view courses'],
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
            },
          },
          {
            path: 'courses/new',
            name: 'lnd.courses.create',
            component: () => import('@/pages/app/lnd/CourseForm.vue'),
            meta: {
              title: 'New Course',
              permissions: ['create courses'],
              roles: ['admin', 'hr_manager'],
            },
          },
          {
            path: 'courses/:id/edit',
            name: 'lnd.courses.edit',
            component: () => import('@/pages/app/lnd/CourseForm.vue'),
            meta: {
              title: 'Edit Course',
              permissions: ['edit courses'],
              roles: ['admin', 'hr_manager'],
            },
          },
          {
            path: 'courses/:id',
            name: 'lnd.courses.show',
            component: () => import('@/pages/app/lnd/CourseDetail.vue'),
            meta: {
              title: 'Course Detail',
              permissions: ['view courses'],
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
            },
          },
          {
            path: 'programs',
            name: 'lnd.programs',
            component: () => import('@/pages/app/lnd/LndPrograms.vue'),
            meta: {
              title: 'Training Programs',
              permissions: ['view training programs'],
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
            },
          },
          {
            path: 'programs/new',
            name: 'lnd.programs.create',
            component: () => import('@/pages/app/lnd/ProgramForm.vue'),
            meta: {
              title: 'New Program',
              permissions: ['manage training programs'],
              roles: ['admin', 'hr_manager'],
            },
          },
          {
            path: 'programs/:id',
            name: 'lnd.programs.show',
            component: () => import('@/pages/app/lnd/ProgramDetail.vue'),
            meta: {
              title: 'Program Detail',
              permissions: ['view training programs'],
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
            },
          },
          {
            path: 'skills',
            name: 'lnd.skills',
            component: () => import('@/pages/app/lnd/LndSkills.vue'),
            meta: {
              title: 'Skills',
              permissions: ['view skills'],
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
            },
          },
          {
            path: 'certifications',
            name: 'lnd.certifications',
            component: () => import('@/pages/app/lnd/LndCertifications.vue'),
            meta: {
              title: 'Certifications',
              permissions: ['view certifications'],
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
            },
          },
          {
            path: 'reports',
            name: 'lnd.reports',
            component: () => import('@/pages/app/lnd/LndReports.vue'),
            meta: {
              title: 'L&D Reports',
              permissions: ['view lnd reports'],
              roles: ['admin', 'hr_manager', 'manager'],
            },
          },
        ],
      },
      {
        path: 'expenses',
        component: () => import('@/pages/app/expenses/ExpenseLayout.vue'),
        meta: { requiresAuth: true, module: 'expense-reimbursement', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
        children: [
          { path: '', name: 'expenses', component: () => import('@/pages/app/expenses/ExpenseDashboard.vue'), meta: { title: 'Expenses', permissions: ['view expenses'], roles: ['admin', 'hr_manager', 'manager', 'employee'] } },
          { path: 'my-claims', name: 'expenses.my-claims', component: () => import('@/pages/app/expenses/MyClaims.vue'), meta: { title: 'My Claims', permissions: ['view expenses'], roles: ['admin', 'hr_manager', 'manager', 'employee'] } },
          { path: 'claims/new', name: 'expenses.claims.create', component: () => import('@/pages/app/expenses/ClaimForm.vue'), meta: { title: 'New Claim', permissions: ['create expenses'], roles: ['admin', 'hr_manager', 'manager', 'employee'] } },
          { path: 'claims/:id/edit', name: 'expenses.claims.edit', component: () => import('@/pages/app/expenses/ClaimForm.vue'), meta: { title: 'Edit Claim', permissions: ['edit expenses'], roles: ['admin', 'hr_manager', 'manager', 'employee'] } },
          { path: 'claims/:id', name: 'expenses.claims.show', component: () => import('@/pages/app/expenses/ClaimDetail.vue'), meta: { title: 'Claim Detail', permissions: ['view expenses'], roles: ['admin', 'hr_manager', 'manager', 'employee'] } },
          { path: 'approvals', name: 'expenses.approvals', component: () => import('@/pages/app/expenses/Approvals.vue'), meta: { title: 'Approvals', permissions: ['approve expenses'], roles: ['admin', 'hr_manager', 'manager'] } },
          { path: 'reimbursements', name: 'expenses.reimbursements', component: () => import('@/pages/app/expenses/Reimbursements.vue'), meta: { title: 'Reimbursements', permissions: ['process reimbursements'], roles: ['admin', 'hr_manager'] } },
          { path: 'policies', name: 'expenses.policies', component: () => import('@/pages/app/expenses/ExpensePolicies.vue'), meta: { title: 'Policies', permissions: ['manage expense policies'], roles: ['admin'] } },
          { path: 'reports', name: 'expenses.reports', component: () => import('@/pages/app/expenses/ExpenseReports.vue'), meta: { title: 'Expense Reports', permissions: ['view expense reports'], roles: ['admin', 'hr_manager'] } },
        ],
      },
      {
        path: 'recruitment',
        component: () => import('@/pages/app/recruitment/RecruitmentLayout.vue'),
        meta: { requiresAuth: true, module: 'recruitment', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
        children: [
          {
            path: '',
            name: 'recruitment',
            component: () => import('@/pages/app/recruitment/RecruitmentDashboard.vue'),
            meta: { title: 'Recruitment', permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'analytics',
            name: 'recruitment.analytics',
            component: () => import('@/pages/app/recruitment/RecruitmentAnalytics.vue'),
            meta: { title: 'Recruitment Analytics', permissions: ['view-jobs'], roles: ['admin', 'hr_manager', 'manager'] },
          },
          {
            path: 'jobs/new',
            name: 'recruitment.jobs.create',
            component: () => import('@/pages/app/recruitment/JobForm.vue'),
            meta: { title: 'New Job', permissions: ['create jobs'], roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'jobs/:id/edit',
            name: 'recruitment.jobs.edit',
            component: () => import('@/pages/app/recruitment/JobForm.vue'),
            meta: { title: 'Edit Job', permissions: ['edit jobs'], roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'jobs/:id',
            name: 'recruitment.jobs.show',
            component: () => import('@/pages/app/recruitment/JobDetail.vue'),
            meta: { title: 'Job Detail', permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'integrations',
            name: 'recruitment.integrations',
            component: () => import('@/pages/app/recruitment/JobBoardIntegrations.vue'),
            meta: { title: 'Job Board Integrations', permissions: ['manage job-board-integrations'], roles: ['admin'] },
          },
          {
            path: 'pipeline',
            name: 'recruitment.pipeline',
            component: () => import('@/pages/app/recruitment/Pipeline.vue'),
            meta: { title: 'Pipeline', permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager'] },
          },
          {
            path: 'pipeline/settings',
            name: 'recruitment.pipeline.settings',
            component: () => import('@/pages/app/recruitment/PipelineSettings.vue'),
            meta: { title: 'Pipeline Settings', permissions: ['view jobs'], roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'interviews',
            name: 'recruitment.interviews',
            component: () => import('@/pages/app/recruitment/Interviews.vue'),
            meta: { title: 'Interviews', permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager'] },
          },
          {
            path: 'offers',
            name: 'recruitment.offers',
            component: () => import('@/pages/app/recruitment/Offers.vue'),
            meta: { title: 'Offers', permissions: ['view jobs'], roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'offer-templates',
            name: 'recruitment.offer-templates',
            component: () => import('@/pages/app/recruitment/OfferTemplates.vue'),
            meta: { title: 'Offer Templates', permissions: ['view jobs'], roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'assessments',
            name: 'recruitment.assessments',
            component: () => import('@/pages/app/recruitment/Assessments.vue'),
            meta: { title: 'Assessments', requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'candidates',
            name: 'recruitment.candidates',
            component: () => import('@/pages/app/recruitment/Candidates.vue'),
            meta: { title: 'Candidates', permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager'] },
          },
          {
            path: 'candidates/new',
            name: 'recruitment.candidates.create',
            component: () => import('@/pages/app/recruitment/CandidateForm.vue'),
            meta: { title: 'New Candidate', permissions: ['view jobs'], roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'candidates/:id/edit',
            name: 'recruitment.candidates.edit',
            component: () => import('@/pages/app/recruitment/CandidateForm.vue'),
            meta: { title: 'Edit Candidate', permissions: ['view jobs'], roles: ['admin', 'hr_manager'] },
          },
          {
            path: 'candidates/:id',
            name: 'recruitment.candidates.show',
            component: () => import('@/pages/app/recruitment/CandidateDetail.vue'),
            meta: { title: 'Candidate Detail', permissions: ['view jobs'], roles: ['admin', 'hr_manager', 'manager'] },
          },
          {
            path: 'internal-jobs',
            name: 'recruitment.internal-jobs',
            component: () => import('@/pages/app/recruitment/InternalJobs.vue'),
            meta: { title: 'Internal Job Board', roles: ['admin', 'hr_manager', 'manager', 'employee'] },
          },
          {
            path: 'candidate-portals',
            name: 'recruitment.candidate-portals',
            component: () => import('@/pages/app/recruitment/CandidatePortal.vue'),
            meta: { title: 'Candidate Portals', roles: ['admin', 'hr_manager'], permissions: ['view jobs'] },
          },
        ],
      },
      {
        path: 'ess',
        component: () => import('@/pages/app/ess/EssLayout.vue'),
        meta: { requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'] },
        children: [
          { path: '', redirect: { name: 'ess.dashboard' } },
          {
            path: 'dashboard',
            name: 'ess.dashboard',
            component: () => import('@/pages/app/ess/EssDashboard.vue'),
            meta: { requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'], permissions: ['view-employees'] },
          },
          {
            path: 'profile',
            name: 'ess.profile',
            component: () => import('@/pages/app/ess/EssProfile.vue'),
            meta: { requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'], permissions: ['view-employees'] },
          },
          {
            path: 'attendance',
            name: 'ess.attendance',
            component: () => import('@/pages/app/ess/EssAttendance.vue'),
            meta: { requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'], permissions: ['view-attendance'] },
          },
          {
            path: 'leave',
            name: 'ess.leave',
            component: () => import('@/pages/app/ess/EssLeave.vue'),
            meta: { requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'], permissions: ['apply-leave'] },
          },
          {
            path: 'payslips',
            name: 'ess.payslips',
            component: () => import('@/pages/app/ess/EssPayslips.vue'),
            meta: { requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'], permissions: ['view-payslips'] },
          },
          {
            path: 'tickets',
            name: 'ess.tickets',
            component: () => import('@/pages/app/ess/EssTickets.vue'),
            meta: { requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'], permissions: ['create-tickets'] },
          },
          {
            path: 'notifications',
            name: 'ess.notifications',
            component: () => import('@/pages/app/ess/EssNotifications.vue'),
            meta: { requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'], permissions: ['view-notifications'] },
          },
        ],
      },
      {
        path: 'reports',
        component: () => import('@/pages/app/reports/ReportsLayout.vue'),
        meta: {
          requiresAuth: true,
          roles: ['admin', 'hr_manager', 'manager', 'employee'],
          permissions: ['view-reports'],
        },
        children: [
          { path: '', redirect: { name: 'reports.attendance' } },
          {
            path: 'attendance',
            name: 'reports.attendance',
            component: () => import('@/pages/app/reports/AttendanceReport.vue'),
            meta: {
              title: 'Attendance Report',
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
              permissions: ['view-reports'],
            },
          },
          {
            path: 'payroll',
            name: 'reports.payroll',
            component: () => import('@/pages/app/reports/PayrollReport.vue'),
            meta: {
              title: 'Payroll Report',
              roles: ['admin', 'hr_manager'],
              permissions: ['view-reports'],
            },
          },
          {
            path: 'headcount',
            name: 'reports.headcount',
            component: () => import('@/pages/app/reports/HeadcountReport.vue'),
            meta: {
              title: 'Headcount Report',
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
              permissions: ['view-reports'],
            },
          },
          {
            path: 'attrition',
            name: 'reports.attrition',
            component: () => import('@/pages/app/reports/AttritionReport.vue'),
            meta: {
              title: 'Attrition Report',
              roles: ['admin', 'hr_manager'],
              permissions: ['view-reports'],
            },
          },
          {
            path: 'performance',
            name: 'reports.performance',
            component: () => import('@/pages/app/reports/PerformanceReport.vue'),
            meta: {
              title: 'Performance Report',
              roles: ['admin', 'hr_manager', 'manager', 'employee'],
              permissions: ['view-reports'],
            },
          },
          {
            path: 'custom',
            name: 'reports.custom',
            component: () => import('@/pages/app/reports/CustomReportBuilder.vue'),
            meta: {
              title: 'Custom Report Builder',
              roles: ['admin', 'hr_manager'],
              permissions: ['manage-report-templates'],
            },
          },
          {
            path: 'scheduled',
            name: 'reports.scheduled',
            component: () => import('@/pages/app/reports/ScheduledReports.vue'),
            meta: { title: 'Scheduled Reports', roles: ['admin', 'hr_manager'], permissions: ['view-reports'] },
          },
        ],
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
        meta: { title: 'Onboarding', permissions: ['manage-onboarding'], roles: ['admin', 'hr_manager'] },
      },
      {
        path: 'hr-reports',
        name: 'hr-reports',
        component: () => import('@/pages/app/Reports.vue'),
        meta: { title: 'HR Reports', requiresAuth: true, roles: ['admin', 'hr_manager'] },
      },
      {
        path: 'hr-letters',
        name: 'hr-letters',
        component: () => import('@/pages/app/employee/HrLetters.vue'),
        meta: { title: 'HR Letters', requiresAuth: true, roles: ['admin', 'hr_manager'] },
      },
      {
        path: 'exit-management',
        name: 'exit-management',
        component: () => import('@/pages/app/employee/ExitManagement.vue'),
        meta: { title: 'Exit Management', requiresAuth: true, roles: ['admin', 'hr_manager'] },
      },
      {
        path: 'statutory',
        name: 'payroll.statutory',
        component: () => import('@/pages/app/payroll/StatutoryCompliance.vue'),
        meta: { title: 'Statutory Compliance', requiresAuth: true, permissions: ['view payroll'], roles: ['admin', 'hr_manager'] },
      },
      {
        path: 'gratuity',
        name: 'payroll.gratuity',
        component: () => import('@/pages/app/payroll/Gratuity.vue'),
        meta: { title: 'Gratuity', requiresAuth: true, permissions: ['view payroll'], roles: ['admin', 'hr_manager'] },
      },
      {
        path: 'announcements',
        name: 'announcements',
        component: () => import('@/pages/app/Announcements.vue'),
        meta: { title: 'Announcements' },
      },
      {
        path: 'social-wall',
        name: 'social-wall',
        component: () => import('@/pages/app/SocialWall.vue'),
        meta: { title: 'Social Wall', requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'] },
      },
      {
        path: 'polls',
        name: 'polls',
        component: () => import('@/pages/app/Polls.vue'),
        meta: { title: 'Polls', requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'] },
      },
      {
        path: 'peer-recognition',
        name: 'peer-recognition',
        component: () => import('@/pages/app/PeerRecognition.vue'),
        meta: { title: 'Peer Recognition', requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'] },
      },
      {
        path: 'surveys',
        name: 'surveys',
        component: () => import('@/pages/app/Surveys.vue'),
        meta: { title: 'Surveys', requiresAuth: true, roles: ['admin', 'hr_manager', 'manager', 'employee'] },
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

const MAIN_HOST = (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_MAIN_HOST || 'orbithr.test'
const MAIN_PORT = (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_MAIN_PORT || '5173'

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
