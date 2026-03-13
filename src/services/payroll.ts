import api from './api'
import type { AxiosResponse } from 'axios'

// Types
export interface PayrollSettings {
  id: number
  tenant_id: number
  default_payment_frequency: 'monthly' | 'weekly' | 'daily'
  payment_day: number
  allow_advances: boolean
  max_advance_percentage: number
  max_advance_installments: number
  require_advance_approval: boolean
  default_tax_percentage: number
  default_pf_percentage: number
  default_esi_percentage: number
  integrate_attendance: boolean
  deduct_absent_days: boolean
  calculate_overtime: boolean
  overtime_multiplier: number
  deduct_unpaid_leaves: boolean
  currency: string
  currency_symbol: string
  auto_generate_payslips: boolean
  payslip_header: string | null
  payslip_footer: string | null
  created_at: string
  updated_at: string
}

export interface SalaryStructure {
  id: number
  tenant_id: number
  employee_id: number
  basic_salary: number
  hra: number
  da: number
  transport_allowance: number
  medical_allowance: number
  special_allowance: number
  other_allowances: number
  performance_bonus: number
  commission: number
  incentive: number
  tax_deduction: number
  pf_deduction: number
  esi_deduction: number
  insurance_deduction: number
  loan_deduction: number
  other_deductions: number
  gross_salary: number
  total_deductions: number
  net_salary: number
  payment_frequency: 'monthly' | 'weekly' | 'daily'
  payment_method: 'bank_transfer' | 'cash' | 'cheque'
  effective_from: string
  effective_to: string | null
  status: 'active' | 'inactive' | 'draft'
  notes: string | null
  created_at: string
  updated_at: string
  employee?: {
    id: number
    first_name: string
    last_name: string
    employee_id: string
    department: string
  }
}

export interface PayrollCycle {
  id: number
  tenant_id: number
  frequency: 'monthly' | 'weekly' | 'daily'
  period_start: string
  period_end: string
  payment_date: string
  status: 'draft' | 'processing' | 'completed' | 'paid'
  total_employees: number
  total_gross_amount: number
  total_deductions: number
  total_net_amount: number
  processed_by: number | null
  processed_at: string | null
  approved_by: number | null
  approved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  processed_by_user?: {
    id: number
    name: string
  }
  approved_by_user?: {
    id: number
    name: string
  }
  payroll_items?: PayrollItem[]
}

export interface PayrollItem {
  id: number
  tenant_id: number
  payroll_cycle_id: number
  employee_id: number
  employee_name: string
  employee_code: string
  department: string | null
  designation: string | null
  salary_structure_id: number
  working_days: number
  present_days: number
  absent_days: number
  paid_leaves: number
  unpaid_leaves: number
  overtime_hours: number
  basic_salary: number
  hra: number
  da: number
  transport_allowance: number
  medical_allowance: number
  special_allowance: number
  other_allowances: number
  performance_bonus: number
  overtime_amount: number
  additional_earnings: number
  gross_salary: number
  total_earnings: number
  tax_deduction: number
  pf_deduction: number
  esi_deduction: number
  insurance_deduction: number
  loan_deduction: number
  advance_deduction: number
  absent_deduction: number
  leave_deduction: number
  other_deductions: number
  additional_deductions: number
  total_deductions: number
  net_salary: number
  payment_method: string
  status: 'pending' | 'processed' | 'paid'
  notes: string | null
  created_at: string
  updated_at: string
  employee?: {
    id: number
    first_name: string
    last_name: string
    employee_id: string
    department: string
    designation: string
  }
}

export interface DashboardStats {
  total_cycles: number
  pending_cycles: number
  completed_cycles: number
  paid_cycles: number
  total_employees_with_salary: number
  current_month_payout: number
}

// API Functions
export const payrollService = {
  // Settings
  async getSettings(): Promise<PayrollSettings> {
    const response: AxiosResponse<PayrollSettings> = await api.get('/payroll/settings')
    return response.data
  },

  async updateSettings(data: Partial<PayrollSettings>): Promise<PayrollSettings> {
    const response: AxiosResponse<{ settings: PayrollSettings }> = await api.put(
      '/payroll/settings',
      data
    )
    return response.data.settings
  },

  // Payroll Cycles
  async getCycles(params?: {
    status?: string
    frequency?: string
    from_date?: string
    to_date?: string
    sort_by?: string
    sort_order?: string
    per_page?: number
    page?: number
  }): Promise<{ data: PayrollCycle[]; total: number; per_page: number; current_page: number }> {
    const response = await api.get('/payroll/cycles', { params })
    return response.data
  },

  async getCycle(id: number): Promise<PayrollCycle> {
    const response: AxiosResponse<PayrollCycle> = await api.get(`/payroll/cycles/${id}`)
    return response.data
  },

  async createCycle(data: {
    frequency: string
    period_start: string
    period_end: string
    payment_date: string
    notes?: string
  }): Promise<PayrollCycle> {
    const response: AxiosResponse<{ cycle: PayrollCycle }> = await api.post('/payroll/cycles', data)
    return response.data.cycle
  },

  async processCycle(
    id: number,
    data?: {
      employee_ids?: number[]
      attendance_data?: Record<string, any>
    }
  ): Promise<{ cycle: PayrollCycle; result: any }> {
    const response = await api.post(`/payroll/cycles/${id}/process`, data)
    return response.data
  },

  async approveCycle(id: number): Promise<PayrollCycle> {
    const response: AxiosResponse<{ cycle: PayrollCycle }> = await api.post(
      `/payroll/cycles/${id}/approve`
    )
    return response.data.cycle
  },

  async markAsPaid(
    id: number,
    data?: {
      payroll_item_ids?: number[]
      transaction_reference?: string
    }
  ): Promise<{ count: number }> {
    const response = await api.post(`/payroll/cycles/${id}/mark-paid`, data)
    return response.data
  },

  async deleteCycle(id: number): Promise<void> {
    await api.delete(`/payroll/cycles/${id}`)
  },

  async suggestNextCycle(frequency: string): Promise<any> {
    const response = await api.get('/payroll/cycles/suggest-next', {
      params: { frequency }
    })
    return response.data
  },

  // Payroll Items
  async getCycleItems(
    cycleId: number,
    params?: {
      status?: string
      department?: string
      search?: string
    }
  ): Promise<PayrollItem[]> {
    const response: AxiosResponse<PayrollItem[]> = await api.get(
      `/payroll/cycles/${cycleId}/items`,
      { params }
    )
    return response.data
  },

  async getItem(cycleId: number, itemId: number): Promise<PayrollItem> {
    const response: AxiosResponse<PayrollItem> = await api.get(
      `/payroll/cycles/${cycleId}/items/${itemId}`
    )
    return response.data
  },

  async updateItem(
    cycleId: number,
    itemId: number,
    data: {
      additional_earnings?: number
      additional_earnings_note?: string
      additional_deductions?: number
      additional_deductions_note?: string
      notes?: string
    }
  ): Promise<PayrollItem> {
    const response: AxiosResponse<{ item: PayrollItem }> = await api.put(
      `/payroll/cycles/${cycleId}/items/${itemId}`,
      data
    )
    return response.data.item
  },

  async reprocessItem(
    cycleId: number,
    itemId: number,
    attendanceData?: Record<string, any>
  ): Promise<PayrollItem> {
    const response: AxiosResponse<{ item: PayrollItem }> = await api.post(
      `/payroll/cycles/${cycleId}/items/${itemId}/reprocess`,
      { attendance_data: attendanceData }
    )
    return response.data.item
  },

  // Salary Structures
  async getSalaryStructures(params?: {
    status?: string
    employee_id?: number
  }): Promise<SalaryStructure[]> {
    const response: AxiosResponse<SalaryStructure[]> = await api.get(
      '/payroll/salary-structures',
      { params }
    )
    return response.data
  },

  async createSalaryStructure(data: Partial<SalaryStructure>): Promise<SalaryStructure> {
    const response: AxiosResponse<{ structure: SalaryStructure }> = await api.post(
      '/payroll/salary-structures',
      data
    )
    return response.data.structure
  },

  async updateSalaryStructure(id: number, data: Partial<SalaryStructure>): Promise<SalaryStructure> {
    const response: AxiosResponse<{ structure: SalaryStructure }> = await api.put(
      `/payroll/salary-structures/${id}`,
      data
    )
    return response.data.structure
  },

  async deleteSalaryStructure(id: number): Promise<void> {
    await api.delete(`/payroll/salary-structures/${id}`)
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const response: AxiosResponse<DashboardStats> = await api.get('/payroll/dashboard/stats')
    return response.data
  }
}

export default payrollService
