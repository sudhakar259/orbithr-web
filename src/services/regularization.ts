import api from './api'

export interface RegularizationRequest {
  id: number
  attendance_id: number
  employee_id: number
  manager_id?: number | null
  team_lead_id?: number | null
  regularization_type: string
  reason: string
  notes?: string | null
  check_in?: string | null
  check_out?: string | null
  working_hours?: number | null
  overtime_hours?: number | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_at?: string | null
  approval_notes?: string | null
  auto_approved: boolean
  employee?: {
    id: number
    full_name: string
    employee_id: string
    designation?: string
  }
  attendance?: {
    id: number
    attendance_date: string
    check_in?: string | null
    check_out?: string | null
    working_hours: number
  }
  manager?: {
    id: number
    full_name: string
  }
  team_lead?: {
    id: number
    full_name: string
  }
  approved_by_user?: {
    id: number
    name: string
  }
}

export interface CreateRegularizationPayload {
  attendance_id: number
  regularization_type: string
  reason: string
  notes?: string | null
  check_in?: string | null
  check_out?: string | null
  working_hours?: number | null
  overtime_hours?: number | null
}

export interface ApprovalPayload {
  approval_notes?: string | null
}

class RegularizationService {
  private readonly basePath = '/attendance/regularizations'

  /**
   * Create a new regularization request
   */
  async createRequest(payload: CreateRegularizationPayload): Promise<RegularizationRequest> {
    const response = await api.post(this.basePath, payload)
    return response.data?.data || response.data
  }

  /**
   * Get pending regularization requests for manager/team lead
   */
  async getPendingRequests(params?: Record<string, any>) {
    const response = await api.get(`${this.basePath}/pending`, { params })
    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination,
    }
  }

  /**
   * Get regularization requests for current employee
   */
  async getMyRequests(params?: Record<string, any>) {
    const response = await api.get(`${this.basePath}/my`, { params })
    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination,
    }
  }

  /**
   * Approve a regularization request
   */
  async approveRequest(
    regularizationId: number,
    payload: ApprovalPayload
  ): Promise<RegularizationRequest> {
    const response = await api.post(
      `${this.basePath}/${regularizationId}/approve`,
      payload
    )
    return response.data?.data || response.data
  }

  /**
   * Reject a regularization request
   */
  async rejectRequest(
    regularizationId: number,
    payload: ApprovalPayload
  ): Promise<RegularizationRequest> {
    const response = await api.post(
      `${this.basePath}/${regularizationId}/reject`,
      payload
    )
    return response.data?.data || response.data
  }
}

export const regularizationService = new RegularizationService()
