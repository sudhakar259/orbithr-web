import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { modulesService } from '@/services/modules'
import type { Module, TenantModule } from '@/services/modules'

export type { Module, TenantModule }

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
      modules.value = await modulesService.getMarketplaceModules()
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
      tenantModules.value = await modulesService.getTenantModules()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading.value = false
    }
  }

  const activateModule = async (slug: string) => {
    try {
      await modulesService.enableModule(slug)
      await loadTenantModules()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    }
  }

  const deactivateModule = async (slug: string) => {
    try {
      await modulesService.disableModule(slug)
      await loadTenantModules()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    }
  }

  const getModuleStatus = async (slug: string) => {
    try {
      return await modulesService.getModuleStatus(slug)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An error occurred'
      throw err
    }
  }

  const updateModuleSettings = async (slug: string, settings: Record<string, unknown>) => {
    try {
      return await modulesService.updateModuleSettings(slug, settings)
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
      return await modulesService.initiateCheckout(slug, priceId, successUrl, cancelUrl)
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
