import api from './api'

export interface Module {
  id: number
  name: string
  slug: string
  description: string
  features: string[]
  price: number
  billing_type: string
  is_free: boolean
  is_core: boolean
  is_restricted: boolean
  status?: string
  icon?: string
  category?: string
  meta?: Record<string, unknown>
}

export interface TenantModule {
  id: number
  module_id: number
  module_name: string
  module_slug: string
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  activated_at: string | null
  expires_at: string | null
  days_until_expiry: number | null
  billing_reference: string | null
  is_core: boolean
  settings?: Record<string, unknown>
}

export interface ModuleStatus {
  slug: string
  status: string
  activated_at: string | null
  expires_at: string | null
}

export interface CheckoutSession {
  checkout_url: string
  session_id?: string
}

class ModulesService {
  async getMarketplaceModules(): Promise<Module[]> {
    const response = await api.get('/marketplace')
    return response.data
  }

  async getModule(slug: string): Promise<Module> {
    const response = await api.get(`/marketplace/${slug}`)
    return response.data
  }

  async getTenantModules(): Promise<TenantModule[]> {
    const response = await api.get('/tenant/modules')
    return response.data
  }

  async getModuleStatus(slug: string): Promise<ModuleStatus> {
    const response = await api.get(`/tenant/modules/${slug}/status`)
    return response.data
  }

  async enableModule(slug: string): Promise<TenantModule> {
    const response = await api.post(`/tenant/modules/${slug}/enable`)
    return response.data
  }

  async disableModule(slug: string): Promise<TenantModule> {
    const response = await api.post(`/tenant/modules/${slug}/disable`)
    return response.data
  }

  async updateModuleSettings(slug: string, settings: Record<string, unknown>): Promise<TenantModule> {
    const response = await api.put(`/tenant/modules/${slug}/settings`, { settings })
    return response.data
  }

  async initiateCheckout(
    slug: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<CheckoutSession> {
    const response = await api.post(`/tenant/modules/${slug}/purchase`, {
      price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
    return response.data
  }

  // Admin endpoints
  async getAdminModules(): Promise<Module[]> {
    const response = await api.get('/admin/modules')
    return response.data
  }

  async updateAdminModule(moduleId: number, data: Partial<Module>): Promise<Module> {
    const response = await api.put(`/admin/modules/${moduleId}`, data)
    return response.data
  }

  async markAsCore(moduleId: number): Promise<Module> {
    const response = await api.post(`/admin/modules/${moduleId}/mark-core`)
    return response.data
  }

  async unmarkAsCore(moduleId: number): Promise<Module> {
    const response = await api.post(`/admin/modules/${moduleId}/unmark-core`)
    return response.data
  }

  async toggleRestricted(moduleId: number): Promise<Module> {
    const response = await api.post(`/admin/modules/${moduleId}/toggle-restricted`)
    return response.data
  }
}

export const modulesService = new ModulesService()
