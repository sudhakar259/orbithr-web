import type { RouteRecordRaw } from 'vue-router'

const EmployeeNew = () => import('@/pages/app/EmployeeNew.vue')
const EmployeeEdit = () => import('@/pages/app/EmployeeEdit.vue')
const EmployeeProfile = () => import('@/pages/app/EmployeeProfile.vue')

export const employeeRoutes: RouteRecordRaw[] = [
  {
    path: 'employees/new',
    name: 'employee-new',
    component: EmployeeNew,
    meta: { title: 'Add Employee', permissions: ['view employees'], roles: ['admin','hr_manager'] },
  },
  {
    path: 'employees/:id/edit',
    name: 'employee-edit',
    component: EmployeeEdit,
    meta: { title: 'Edit Employee', permissions: ['view employees'], roles: ['admin','hr_manager'] },
  },
  {
    path: 'employees/:id',
    name: 'employee-profile',
    component: EmployeeProfile,
    meta: { title: 'Employee Profile', permissions: [], roles: ['admin','hr_manager','manager','employee'] },
  },
]
