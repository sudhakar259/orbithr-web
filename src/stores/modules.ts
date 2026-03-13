import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Module {
  id: number
  name: string
  slug: string
  description: string
  features: string[]
  price: number
  billing_type: string
  is_free: boolean
  is_core: boolean
  status?: string
  icon?: string
  category?: string
  meta?: Record<string, unknown>
}

interface TenantModule {
  id: number
  module_id: number
  module_name: string
  module_slug: string
  status: string
  activated_at: string | null
  expires_at: string | null
  days_until_expiry: number | null
  billing_reference: string | null
  is_core: boolean
}

export const useModuleStore = defineStore('modules', () => {
  const modules = ref<Module[]>([])
  const tenantModules = ref<TenantModule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeModules = computed(() => {
    return tenantModules.value.filter((m) => m.status === 'active')
  })

  const suspendedModules = computed(() => {
    return tenantModules.value.filter((m) => m.status === 'suspended')
  })

  const expiringSoonModules = computed(() => {
    return tenantModules.value.filter((m) => {
      const days = m.days_until_expiry ?? -1
      return days >= 0 && days <= 7
    })
  })

  const loadMarketplaceModules = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch('/api/marketplace', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load marketplace modules')
      }

      modules.value = await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading.value = false
    }
  }

  const loadTenantModules = async () => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch('/api/tenant/modules', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load tenant modules')
      }

      tenantModules.value = await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading.value = false
    }
  }

  const activateModule = async (slug: string) => {
    try {
      const response = await fetch(`/api/tenant/modules/${slug}/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to activate module')
      }

      await loadTenantModules()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    }
  }

  const deactivateModule = async (slug: string) => {
    try {
      const response = await fetch(`/api/tenant/modules/${slug}/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to deactivate module')
      }

      await loadTenantModules()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    }
  }

  const getModuleStatus = async (slug: string) => {
    try {
      const response = await fetch(`/api/tenant/modules/${slug}/status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get module status')
      }

      return await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    }
  }

  const updateModuleSettings = async (slug: string, settings: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/tenant/modules/${slug}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ settings }),
      })

      if (!response.ok) {
        throw new Error('Failed to update module settings')
      }

      return await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    }
  }

  const initiateCheckout = async (
    slug: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ) => {
    try {
      const response = await fetch(`/api/tenant/modules/${slug}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initiate checkout')
      }

      return await response.json()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    }
  }

  const hasModule = (slug: string): boolean => {
    return activeModules.value.some((m) => m.module_slug === slug)
  }

  const getModule = (slug: string): TenantModule | undefined => {
    return tenantModules.value.find((m) => m.module_slug === slug)
  }

  return {
    modules,
    tenantModules,
    loading,
    error,
    activeModules,
    suspendedModules,
    expiringSoonModules,
    loadMarketplaceModules,
    loadTenantModules,
    activateModule,
    deactivateModule,
    getModuleStatus,
    updateModuleSettings,
    initiateCheckout,
    hasModule,
    getModule,
  }
})
