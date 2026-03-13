import api from './api'
import type { AxiosResponse } from 'axios'

// Types
export interface SalaryAdvance {
  id: number
  tenant_id: number
  employee_id: number
  employee_name: string
  employee_code: string
  amount: number
  remaining_amount: number
  installments: number
  installment_amount: number
  installments_paid: number
  reason: string
  request_date: string
  approved_by: number | null
  approved_at: string | null
  disbursement_date: string | null
  transaction_reference: string | null
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'repaying' | 'completed' | 'cancelled'
  rejection_reason: string | null
  cancellation_reason: string | null
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
  approved_by_user?: {
    id: number
    name: string
  }
  deductions?: AdvanceDeduction[]
}

export interface AdvanceDeduction {
  id: number
  salary_advance_id: number
  payroll_item_id: number
  amount: number
  deduction_date: string
  created_at: string
  updated_at: string
  payroll_item?: {
    id: number
    payroll_cycle_id: number
    employee_name: string
    period_start: string
    period_end: string
  }
}

export interface AdvanceStatistics {
  total_advances: number
  pending_approvals: number
  approved_advances: number
  disbursed_advances: number
  repaying_advances: number
  total_amount_disbursed: number
  total_amount_pending: number
}

// API Functions
export const advanceService = {
  // List advances
  async getAdvances(params?: {
    status?: string
    employee_id?: number
    from_date?: string
    to_date?: string
    search?: string
    sort_by?: string
    sort_order?: string
    per_page?: number
    page?: number
  }): Promise<{ data: SalaryAdvance[]; total: number; per_page: number; current_page: number }> {
    const response = await api.get('/advances', { params })
    return response.data
  },

  // Get single advance
  async getAdvance(id: number): Promise<SalaryAdvance> {
    const response: AxiosResponse<SalaryAdvance> = await api.get(`/advances/${id}`)
    return response.data
  },

  // Request advance
  async requestAdvance(data: {
    employee_id: number
    amount: number
    reason: string
    installments: number
    request_date?: string
  }): Promise<SalaryAdvance> {
    const response: AxiosResponse<{ advance: SalaryAdvance }> = await api.post('/advances', data)
    return response.data.advance
  },

  // Update advance
  async updateAdvance(
    id: number,
    data: {
      amount?: number
      reason?: string
      installments?: number
    }
  ): Promise<SalaryAdvance> {
    const response: AxiosResponse<{ advance: SalaryAdvance }> = await api.put(
      `/advances/${id}`,
      data
    )
    return response.data.advance
  },

  // Delete advance
  async deleteAdvance(id: number): Promise<void> {
    await api.delete(`/advances/${id}`)
  },

  // Approve advance
  async approveAdvance(id: number, notes?: string): Promise<SalaryAdvance> {
    const response: AxiosResponse<{ advance: SalaryAdvance }> = await api.post(
      `/advances/${id}/approve`,
      { notes }
    )
    return response.data.advance
  },

  // Reject advance
  async rejectAdvance(id: number, rejectionReason: string): Promise<SalaryAdvance> {
    const response: AxiosResponse<{ advance: SalaryAdvance }> = await api.post(
      `/advances/${id}/reject`,
      { rejection_reason: rejectionReason }
    )
    return response.data.advance
  },

  // Disburse advance
  async disburseAdvance(
    id: number,
    data?: {
      disbursement_date?: string
      transaction_reference?: string
      notes?: string
    }
  ): Promise<SalaryAdvance> {
    const response: AxiosResponse<{ advance: SalaryAdvance }> = await api.post(
      `/advances/${id}/disburse`,
      data
    )
    return response.data.advance
  },

  // Cancel advance
  async cancelAdvance(id: number, cancellationReason: string): Promise<SalaryAdvance> {
    const response: AxiosResponse<{ advance: SalaryAdvance }> = await api.post(
      `/advances/${id}/cancel`,
      { cancellation_reason: cancellationReason }
    )
    return response.data.advance
  },

  // Get deduction history
  async getDeductionHistory(id: number): Promise<AdvanceDeduction[]> {
    const response: AxiosResponse<AdvanceDeduction[]> = await api.get(`/advances/${id}/deductions`)
    return response.data
  },

  // Get statistics
  async getStatistics(): Promise<AdvanceStatistics> {
    const response: AxiosResponse<AdvanceStatistics> = await api.get('/advances/statistics/summary')
    return response.data
  }
}

export default advanceService
