import { computed, reactive } from 'vue'
import { payrollService, type PayrollSettings, type PayrollCycle, type SalaryStructure, type DashboardStats } from '@/services/payroll'
import { advanceService, type SalaryAdvance, type AdvanceStatistics } from '@/services/advance'
import { useAuth } from '@/composables/useAuth'

// Types
interface PayrollState {
  settings: PayrollSettings | null
  cycles: PayrollCycle[]
  salaryStructures: SalaryStructure[]
  dashboardStats: DashboardStats | null
  advances: SalaryAdvance[]
  advanceStats: AdvanceStatistics | null
  loading: {
    settings: boolean
    cycles: boolean
    salaryStructures: boolean
    dashboard: boolean
    advances: boolean
    advanceStats: boolean
  }
  pagination: {
    cycles: {
      current_page: number
      per_page: number
      total: number
    }
    advances: {
      current_page: number
      per_page: number
      total: number
    }
  }
}

export function usePayroll() {
  const { user, hasRole, hasPermission } = useAuth()

  // Reactive state
  const state = reactive<PayrollState>({
    settings: null,
    cycles: [],
    salaryStructures: [],
    dashboardStats: null,
    advances: [],
    advanceStats: null,
    loading: {
      settings: false,
      cycles: false,
      salaryStructures: false,
      dashboard: false,
      advances: false,
      advanceStats: false,
    },
    pagination: {
      cycles: {
        current_page: 1,
        per_page: 15,
        total: 0,
      },
      advances: {
        current_page: 1,
        per_page: 15,
        total: 0,
      },
    },
  })

  // Computed properties
  const hasAdminAccess = computed(() => {
    return hasRole('admin') || hasRole('hr_manager')
  })

  const hasManagerAccess = computed(() => {
    return hasRole('admin') || hasRole('hr_manager') || hasRole('manager')
  })

  const isEmployee = computed(() => {
    return hasRole('employee')
  })

  // Settings methods
  const fetchSettings = async () => {
    if (!hasAdminAccess.value) return

    state.loading.settings = true
    try {
      state.settings = await payrollService.getSettings()
    } catch (error) {
      console.error('Failed to fetch payroll settings:', error)
      throw error
    } finally {
      state.loading.settings = false
    }
  }

  const updateSettings = async (data: Partial<PayrollSettings>) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      state.settings = await payrollService.updateSettings(data)
      return state.settings
    } catch (error) {
      console.error('Failed to update payroll settings:', error)
      throw error
    }
  }

  // Payroll cycles methods
  const fetchCycles = async (params?: any) => {
    state.loading.cycles = true
    try {
      const response = await payrollService.getCycles({
        ...params,
        page: state.pagination.cycles.current_page,
        per_page: state.pagination.cycles.per_page,
      })

      state.cycles = response.data
      state.pagination.cycles.total = response.total
      state.pagination.cycles.per_page = response.per_page
      state.pagination.cycles.current_page = response.current_page || 1

      return response
    } catch (error) {
      console.error('Failed to fetch payroll cycles:', error)
      throw error
    } finally {
      state.loading.cycles = false
    }
  }

  const fetchCycle = async (id: number) => {
    try {
      return await payrollService.getCycle(id)
    } catch (error) {
      console.error('Failed to fetch payroll cycle:', error)
      throw error
    }
  }

  const createCycle = async (data: any) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      const cycle = await payrollService.createCycle(data)
      state.cycles.unshift(cycle)
      return cycle
    } catch (error) {
      console.error('Failed to create payroll cycle:', error)
      throw error
    }
  }

  const processCycle = async (id: number, data?: any) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      const result = await payrollService.processCycle(id, data)
      // Update the cycle in the list
      const index = state.cycles.findIndex(c => c.id === id)
      if (index !== -1) {
        state.cycles[index] = result.cycle
      }
      return result
    } catch (error) {
      console.error('Failed to process payroll cycle:', error)
      throw error
    }
  }

  const approveCycle = async (id: number) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      const cycle = await payrollService.approveCycle(id)
      const index = state.cycles.findIndex(c => c.id === id)
      if (index !== -1) {
        state.cycles[index] = cycle
      }
      return cycle
    } catch (error) {
      console.error('Failed to approve payroll cycle:', error)
      throw error
    }
  }

  const markCycleAsPaid = async (id: number, data?: any) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      return await payrollService.markAsPaid(id, data)
    } catch (error) {
      console.error('Failed to mark cycle as paid:', error)
      throw error
    }
  }

  const deleteCycle = async (id: number) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      await payrollService.deleteCycle(id)
      state.cycles = state.cycles.filter(c => c.id !== id)
    } catch (error) {
      console.error('Failed to delete payroll cycle:', error)
      throw error
    }
  }

  const suggestNextCycle = async (frequency: string) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      return await payrollService.suggestNextCycle(frequency)
    } catch (error) {
      console.error('Failed to get next cycle suggestion:', error)
      throw error
    }
  }

  // Salary structures methods
  const fetchSalaryStructures = async (params?: any) => {
    state.loading.salaryStructures = true
    try {
      state.salaryStructures = await payrollService.getSalaryStructures(params)
      return state.salaryStructures
    } catch (error) {
      console.error('Failed to fetch salary structures:', error)
      throw error
    } finally {
      state.loading.salaryStructures = false
    }
  }

  const createSalaryStructure = async (data: any) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      const structure = await payrollService.createSalaryStructure(data)
      state.salaryStructures.unshift(structure)
      return structure
    } catch (error) {
      console.error('Failed to create salary structure:', error)
      throw error
    }
  }

  const updateSalaryStructure = async (id: number, data: any) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      const structure = await payrollService.updateSalaryStructure(id, data)
      const index = state.salaryStructures.findIndex(s => s.id === id)
      if (index !== -1) {
        state.salaryStructures[index] = structure
      }
      return structure
    } catch (error) {
      console.error('Failed to update salary structure:', error)
      throw error
    }
  }

  const deleteSalaryStructure = async (id: number) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      await payrollService.deleteSalaryStructure(id)
      state.salaryStructures = state.salaryStructures.filter(s => s.id !== id)
    } catch (error) {
      console.error('Failed to delete salary structure:', error)
      throw error
    }
  }

  // Dashboard methods
  const fetchDashboardStats = async () => {
    state.loading.dashboard = true
    try {
      state.dashboardStats = await payrollService.getDashboardStats()
      return state.dashboardStats
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      throw error
    } finally {
      state.loading.dashboard = false
    }
  }

  // Advances methods
  const fetchAdvances = async (params?: any) => {
    state.loading.advances = true
    try {
      const response = await advanceService.getAdvances({
        ...params,
        page: state.pagination.advances.current_page,
        per_page: state.pagination.advances.per_page,
      })

      state.advances = response.data
      state.pagination.advances.total = response.total
      state.pagination.advances.per_page = response.per_page
      state.pagination.advances.current_page = response.current_page || 1

      return response
    } catch (error) {
      console.error('Failed to fetch advances:', error)
      throw error
    } finally {
      state.loading.advances = false
    }
  }

  const fetchAdvance = async (id: number) => {
    try {
      return await advanceService.getAdvance(id)
    } catch (error) {
      console.error('Failed to fetch advance:', error)
      throw error
    }
  }

  const requestAdvance = async (data: any) => {
    try {
      const advance = await advanceService.requestAdvance(data)
      state.advances.unshift(advance)
      return advance
    } catch (error) {
      console.error('Failed to request advance:', error)
      throw error
    }
  }

  const updateAdvance = async (id: number, data: any) => {
    try {
      const advance = await advanceService.updateAdvance(id, data)
      const index = state.advances.findIndex(a => a.id === id)
      if (index !== -1) {
        state.advances[index] = advance
      }
      return advance
    } catch (error) {
      console.error('Failed to update advance:', error)
      throw error
    }
  }

  const approveAdvance = async (id: number, notes?: string) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      const advance = await advanceService.approveAdvance(id, notes)
      const index = state.advances.findIndex(a => a.id === id)
      if (index !== -1) {
        state.advances[index] = advance
      }
      return advance
    } catch (error) {
      console.error('Failed to approve advance:', error)
      throw error
    }
  }

  const rejectAdvance = async (id: number, reason: string) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      const advance = await advanceService.rejectAdvance(id, reason)
      const index = state.advances.findIndex(a => a.id === id)
      if (index !== -1) {
        state.advances[index] = advance
      }
      return advance
    } catch (error) {
      console.error('Failed to reject advance:', error)
      throw error
    }
  }

  const disburseAdvance = async (id: number, data?: any) => {
    if (!hasAdminAccess.value) throw new Error('Unauthorized')

    try {
      const advance = await advanceService.disburseAdvance(id, data)
      const index = state.advances.findIndex(a => a.id === id)
      if (index !== -1) {
        state.advances[index] = advance
      }
      return advance
    } catch (error) {
      console.error('Failed to disburse advance:', error)
      throw error
    }
  }

  const cancelAdvance = async (id: number, reason: string) => {
    try {
      const advance = await advanceService.cancelAdvance(id, reason)
      const index = state.advances.findIndex(a => a.id === id)
      if (index !== -1) {
        state.advances[index] = advance
      }
      return advance
    } catch (error) {
      console.error('Failed to cancel advance:', error)
      throw error
    }
  }

  const fetchAdvanceStats = async () => {
    state.loading.advanceStats = true
    try {
      state.advanceStats = await advanceService.getStatistics()
      return state.advanceStats
    } catch (error) {
      console.error('Failed to fetch advance stats:', error)
      throw error
    } finally {
      state.loading.advanceStats = false
    }
  }

  // Utility methods
  const resetState = () => {
    state.settings = null
    state.cycles = []
    state.salaryStructures = []
    state.dashboardStats = null
    state.advances = []
    state.advanceStats = null
    state.pagination.cycles = { current_page: 1, per_page: 15, total: 0 }
    state.pagination.advances = { current_page: 1, per_page: 15, total: 0 }
  }

  const setCyclesPage = (page: number) => {
    state.pagination.cycles.current_page = page
  }

  const setAdvancesPage = (page: number) => {
    state.pagination.advances.current_page = page
  }

  return {
    // State
    state,

    // Computed
    hasAdminAccess,
    hasManagerAccess,
    isEmployee,

    // Settings methods
    fetchSettings,
    updateSettings,

    // Payroll cycles methods
    fetchCycles,
    fetchCycle,
    createCycle,
    processCycle,
    approveCycle,
    markCycleAsPaid,
    deleteCycle,
    suggestNextCycle,

    // Salary structures methods
    fetchSalaryStructures,
    createSalaryStructure,
    updateSalaryStructure,
    deleteSalaryStructure,

    // Dashboard methods
    fetchDashboardStats,

    // Advances methods
    fetchAdvances,
    fetchAdvance,
    requestAdvance,
    updateAdvance,
    approveAdvance,
    rejectAdvance,
    disburseAdvance,
    cancelAdvance,
    fetchAdvanceStats,

    // Utility methods
    resetState,
    setCyclesPage,
    setAdvancesPage,
  }
}
