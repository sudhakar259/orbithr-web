import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
})

  // Use a request interceptor to attach the JWT token from localStorage
  api.interceptors.request.use(
    (config) => {
      // Attach tenant and token on every request
      const token = localStorage.getItem('orbithr_token')
      if (token) config.headers.Authorization = `Bearer ${token}`
      // Ensure tenant context only when running on a tenant host (not localhost)
      const host = window.location.hostname
      const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host)
      if (host !== 'localhost' && !isIp && host.includes('.')) {
        config.headers['X-Tenant-Domain'] = host
      } else {
        delete (config.headers as any)['X-Tenant-Domain']
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Avoid auto-logout on transient 401s; let callers/router decide
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        try {
          const evt = new CustomEvent('auth:unauthorized', { detail: { url: error.config?.url } })
          window.dispatchEvent(evt)
        } catch {}
      }
      return Promise.reject(error)
    }
  )


// Employee API functions
export const employeeApi = {
  getAll: (params?: any) => api.get('/employees', { params }),
  create: (data: any) => api.post('/employees', data),
  update: (id: number, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
  getById: (id: number) => api.get(`/employees/${id}`),
  impersonate: (id: number) => api.post(`/employees/${id}/impersonate`),
}

// Document API functions
export const documentApi = {
  upload: (employeeId: number, formData: FormData) => {
    return api.post(`/employees/${employeeId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  getAll: (employeeId: number) => api.get(`/employees/${employeeId}/documents`),
  getById: (employeeId: number, documentId: number) => api.get(`/employees/${employeeId}/documents/${documentId}`),
  update: (employeeId: number, documentId: number, data: any) => api.put(`/employees/${employeeId}/documents/${documentId}`, data),
  delete: (employeeId: number, documentId: number) => api.delete(`/employees/${employeeId}/documents/${documentId}`),
  download: (employeeId: number, documentId: number) => api.get(`/employees/${employeeId}/documents/${documentId}/download`, {
    responseType: 'blob'
  }),
}

export const authApi = {
  requestOtp: (email: string, purpose: 'login' | 'register') => api.post('auth/otp/send', { email, purpose }),
  verifyOtp: (email: string, code: string) => api.post('auth/otp/verify', { email, code }),
  sendOtp: (email: string) => api.post('auth/otp/send', { email }),
  registerWithOtp: (data: { email: string; code: string; password: string; password_confirmation: string; organization: string; plan_id?: string; name?: string; selected_modules?: string[] }) =>
    api.post('auth/register-with-otp', data),
  getAvailablePlans: () => api.get('auth/plans/available'),
}

export const roleApi = {
  list: (params?: any) => api.get('/roles', { params }),
  create: (data: { name: string; description?: string; permissions?: number[]; tenant_id?: string }) => api.post('/roles', data),
  update: (id: number, data: { name?: string; description?: string; permissions?: number[] }) => api.put(`/roles/${id}`, data),
  remove: (id: number) => api.delete(`/roles/${id}`),
  users: (id: number, params?: any) => api.get(`/roles/${id}/users`, { params }),
  assignUsers: (id: number, data: { attach?: number[]; detach?: number[] }) => api.post(`/roles/${id}/assign-users`, data),
}

export const permissionApi = {
  grouped: (params?: any) => api.get('/permissions/grouped', { params }),
}

export const tenantModuleApi = {
  list: (params?: any) => api.get('/tenant/modules', { params }),
  update: (moduleId: number, data: { enabled: boolean; tenant_id?: string }) => api.put(`/tenant/modules/${moduleId}`, data),
}

export const superAdminApi = {
  stats:         ()                                                          => api.get('/super/stats'),
  tenants:       (params?: any)                                              => api.get('/super/tenants', { params }),
  tenant:        (id: string | number)                                       => api.get(`/super/tenants/${id}`),
  updateTenant:  (id: string | number, data: any)                           => api.patch(`/super/tenants/${id}`, data),
  updateModule:  (tenantId: string | number, moduleId: string | number, data: any) => api.patch(`/super/tenants/${tenantId}/modules/${moduleId}`, data),
  invoices:      (params?: any)                                              => api.get('/super/invoices', { params }),
  updateInvoice: (id: string | number, data: any)                           => api.patch(`/super/invoices/${id}`, data),
  modules:       ()                                                          => api.get('/super/modules'),
  plans:         ()                                                          => api.get('/super/plans'),
  subscriptions: (params?: any)                                              => api.get('/super/subscriptions', { params }),
  auditLogs:     (params?: any)                                              => api.get('/super/audit-logs', { params }),
}

export default api
