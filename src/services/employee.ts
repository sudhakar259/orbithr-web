import api from './api'

export interface Employee {
  id: number
  first_name?: string
  last_name?: string
  full_name?: string
  email: string
  phone?: string
  role?: string
  designation?: string
  team?: string
  department?: string
  manager_id?: number | null
  status?: string
  location?: string
  employee_id?: string
}

export function listEmployees(params?: any) {
  return api.get('/employees', { params })
}

export async function getEmployee(id: number): Promise<Employee> {
  const res = await api.get(`/employees/${id}`)
  return res.data
}

export async function createEmployee(payload: Partial<Employee>): Promise<Employee> {
  const res = await api.post('/employees', payload)
  return res.data
}

export async function updateEmployee(id: number, payload: Partial<Employee>): Promise<Employee> {
  const res = await api.put(`/employees/${id}`, payload)
  return res.data
}

export function deleteEmployee(id: number) {
  return api.delete(`/employees/${id}`)
}

export function impersonateEmployee(id: number) {
  return api.post(`/employees/${id}/impersonate`)
}
