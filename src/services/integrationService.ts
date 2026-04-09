import api from './api'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface IntegrationProvider {
  id: string
  name: string
  slug: string
  type: 'payment' | 'sms' | 'whatsapp'
  config_schema: Record<string, ConfigField> | null
  is_active: boolean
  is_global_default: boolean
  description: string | null
  icon: string | null
  created_at: string
  updated_at: string
}

export interface ConfigField {
  type: string
  label: string
  required: boolean
}

export interface GlobalIntegrationConfig {
  id: string
  provider_id: string
  is_default: boolean
  is_active: boolean
  label: string | null
  masked_credentials: Record<string, string> | null
  provider?: IntegrationProvider
  created_at: string
  updated_at: string
}

export interface TenantIntegrationItem {
  provider: IntegrationProvider
  configured: boolean
  is_active: boolean
  integration_id: string | null
  has_credentials: boolean
}

export interface TenantIntegrationGrouped {
  payment?: TenantIntegrationItem[]
  sms?: TenantIntegrationItem[]
  whatsapp?: TenantIntegrationItem[]
}

export interface IntegrationLogEntry {
  id: string
  tenant_id: string
  provider_id: string | null
  type: string
  direction: string
  status: string
  request_payload: Record<string, unknown> | null
  response_payload: Record<string, unknown> | null
  error_message: string | null
  duration_ms: number | null
  provider?: { id: string; name: string; slug: string; type: string }
  created_at: string
}

export interface UsageReport {
  period: string
  tenant_id: string
  totals: {
    sms_count: number
    payment_count: number
    whatsapp_count: number
    total_amount: number
  }
  by_provider: Array<{
    provider: string
    provider_slug: string
    type: string
    sms_count: number
    payment_count: number
    whatsapp_count: number
    total_amount: number
  }>
}

// ─── Super Admin APIs ───────────────────────────────────────────────────────

export const adminIntegrationApi = {
  // Providers
  getProviders: (params?: Record<string, unknown>) =>
    api.get<{ data: IntegrationProvider[] }>('/admin/integrations/providers', { params }),
  createProvider: (data: Partial<IntegrationProvider>) =>
    api.post<{ message: string; data: IntegrationProvider }>('/admin/integrations/providers', data),
  updateProvider: (id: string, data: Partial<IntegrationProvider>) =>
    api.put<{ message: string; data: IntegrationProvider }>(`/admin/integrations/providers/${id}`, data),
  deleteProvider: (id: string) =>
    api.delete(`/admin/integrations/providers/${id}`),
  toggleProvider: (id: string) =>
    api.post<{ message: string; data: IntegrationProvider }>(`/admin/integrations/providers/${id}/toggle`),

  // Global Configs
  getGlobalConfigs: (params?: Record<string, unknown>) =>
    api.get<{ data: GlobalIntegrationConfig[] }>('/admin/integrations/global', { params }),
  createGlobalConfig: (data: { provider_id: string; credentials: Record<string, string>; is_default?: boolean; is_active?: boolean; label?: string }) =>
    api.post<{ message: string; data: GlobalIntegrationConfig }>('/admin/integrations/global', data),
  updateGlobalConfig: (id: string, data: Partial<{ credentials: Record<string, string>; is_default: boolean; is_active: boolean; label: string }>) =>
    api.put<{ message: string; data: GlobalIntegrationConfig }>(`/admin/integrations/global/${id}`, data),
  deleteGlobalConfig: (id: string) =>
    api.delete(`/admin/integrations/global/${id}`),

  // Usage (all tenants)
  getAllUsage: (month?: string) =>
    api.get<{ data: unknown[] }>('/admin/integrations/usage', { params: { month } }),
}

// ─── Tenant APIs ────────────────────────────────────────────────────────────

export const tenantIntegrationApi = {
  list: () =>
    api.get<{ data: TenantIntegrationGrouped }>('/integrations'),
  configure: (data: { provider_id: string; credentials: Record<string, string>; is_active?: boolean }) =>
    api.post<{ message: string; data: unknown }>('/integrations', data),
  update: (id: string, data: { credentials?: Record<string, string>; is_active?: boolean }) =>
    api.put<{ message: string; data: unknown }>(`/integrations/${id}`, data),
  remove: (id: string) =>
    api.delete(`/integrations/${id}`),
  toggle: (id: string) =>
    api.post<{ message: string; data: unknown }>(`/integrations/${id}/toggle`),
  test: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/integrations/${id}/test`),

  // Logs
  getLogs: (params?: Record<string, unknown>) =>
    api.get<{ data: IntegrationLogEntry[]; current_page: number; last_page: number; total: number }>('/integrations/logs', { params }),
  retryLog: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/integrations/logs/${id}/retry`),

  // Usage
  getUsage: (month?: string) =>
    api.get<{ data: UsageReport }>('/integrations/usage', { params: { month } }),

  // SMS
  sendSms: (to: string, message: string) =>
    api.post('/sms/send', { to, message }),

  // WhatsApp
  sendWhatsApp: (data: { to: string; message?: string; template?: string; params?: Record<string, string> }) =>
    api.post('/whatsapp/send', data),
}
