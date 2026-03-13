import api from './api';

export interface Employee {
  id: number;
  first_name: string;
  last_name?: string;
  email: string;
  employee_id?: string;
  department?: string;
  designation?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  description?: string;
  leave_type: 'paid' | 'unpaid' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'other';
  is_active: boolean;
  requires_documentation: boolean;
  max_days_per_year?: number;
  max_consecutive_days?: number;
  notice_period_days: number;
  can_carry_forward: boolean;
  carry_forward_limit?: number;
  eligibility_criteria?: Record<string, unknown>;
  accrual_frequency: 'monthly' | 'quarterly' | 'annually';
  is_encashable: boolean;
  applicable_to: 'all' | 'departments' | 'roles';
  applicable_departments?: string[];
  applicable_roles?: string[];
  sort_order: number;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  approved_by?: number;
  start_date: string;
  end_date: string;
  days_requested: number;
  leave_period: 'full_day' | 'half_day_morning' | 'half_day_afternoon';
  reason: string;
  contact_details?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'taken' | 'partially_taken';
  approval_notes?: string;
  rejection_reason?: string;
  emergency_leave: boolean;
  document_path?: string;
  approved_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  employee?: Employee;
  leaveType?: LeaveType;
  approvedBy?: User;
}

export interface LeaveBalance {
  leave_type: string;
  code: string;
  balance: number;
  used: number;
  pending: number;
  available: number;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: 'national' | 'regional' | 'religious' | 'company' | 'optional';
  description?: string;
  is_recurring: boolean;
  is_active: boolean;
  applicable_locations?: string[];
  applicable_departments?: string[];
}

export interface LeaveDashboard {
  pending_requests: number;
  approved_this_month: number;
  upcoming_leaves: LeaveRequest[];
  department_leaves: Array<{
    department: string;
    total_days: number;
  }>;
}

export interface LeavePolicyItem {
  id: number;
  leave_type_id: number;
  allocation_per_year: number;
  accrual_frequency?: 'monthly' | 'quarterly' | 'annually';
  can_carry_forward: boolean;
  carry_forward_limit?: number;
  is_encashable: boolean;
}

export interface LeavePolicyAssignment {
  id: number;
  scope: 'organization' | 'department' | 'team' | 'employee';
  target_id?: number;
  target_key?: string;
}

export interface LeavePolicy {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  auto_accrual: boolean;
  accrual_frequency: string;
  accrual_rate: number;
  accrual_start_month: number;
  accrual_max_carry_forward?: number;
  items?: LeavePolicyItem[];
  assignments?: LeavePolicyAssignment[];
}

class LeaveService {
  // Leave Types
  async getLeaveTypes(params?: { active_only?: boolean }): Promise<LeaveType[]> {
    const response = await api.get('/leave-types', { params });
    return response.data;
  }

  async createLeaveType(data: Partial<LeaveType>): Promise<LeaveType> {
    const response = await api.post('/leave-types', data);
    return response.data;
  }

  async updateLeaveType(id: number, data: Partial<LeaveType>): Promise<LeaveType> {
    const response = await api.put(`/leave-types/${id}`, data);
    return response.data;
  }

  async deleteLeaveType(id: number): Promise<void> {
    await api.delete(`/leave-types/${id}`);
  }

  async reorderLeaveTypes(orders: Array<{ id: number; sort_order: number }>): Promise<void> {
    await api.post('/leave-types/reorder', { orders });
  }

  // Leave Requests
  async getLeaveRequests(params?: {
    status?: string;
    employee_id?: number;
    leave_type_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
  }): Promise<{ data: LeaveRequest[]; current_page: number; last_page: number; total: number }> {
    const response = await api.get('/leave-requests', { params });
    return response.data;
  }

  async createLeaveRequest(data: {
    employee_id: number;
    leave_type_id: number;
    start_date: string;
    end_date: string;
    leave_period: 'full_day' | 'half_day_morning' | 'half_day_afternoon';
    reason: string;
    contact_details?: string;
    emergency_leave?: boolean;
    document?: File;
  }): Promise<LeaveRequest> {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'document' && value instanceof File) {
          formData.append('document', value);
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const response = await api.post('/leave-requests', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async updateLeaveRequest(id: number, data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const response = await api.put(`/leave-requests/${id}`, data);
    return response.data;
  }

  async cancelLeaveRequest(id: number, reason: string): Promise<void> {
    await api.delete(`/leave-requests/${id}`, { data: { reason } });
  }

  async approveLeaveRequest(id: number, notes?: string): Promise<LeaveRequest> {
    const response = await api.post(`/leave-requests/${id}/approve`, { notes });
    return response.data;
  }

  async rejectLeaveRequest(id: number, reason: string): Promise<LeaveRequest> {
    const response = await api.post(`/leave-requests/${id}/reject`, { reason });
    return response.data;
  }

  // Leave Balances
  async getEmployeeLeaveBalances(employeeId: number, year?: number): Promise<LeaveBalance[]> {
    const response = await api.get(`/employees/${employeeId}/leave-balances`, {
      params: { year }
    });
    return response.data;
  }

  async getMyLeaveBalances(): Promise<LeaveBalance[]> {
    const response = await api.get('/my-leave-balances');
    return response.data;
  }

  // Leave Policies
  async getLeavePolicies(): Promise<LeavePolicy[]> {
    const response = await api.get('/leave-policies');
    return response.data;
  }

  async createLeavePolicy(data: Partial<LeavePolicy & { items?: Partial<LeavePolicyItem>[]; assignments?: Partial<LeavePolicyAssignment>[] }>): Promise<LeavePolicy> {
    const response = await api.post('/leave-policies', data);
    return response.data;
  }

  async updateLeavePolicy(id: number, data: Partial<LeavePolicy & { items?: Partial<LeavePolicyItem>[]; assignments?: Partial<LeavePolicyAssignment>[] }>): Promise<LeavePolicy> {
    const response = await api.put(`/leave-policies/${id}`, data);
    return response.data;
  }

  async deleteLeavePolicy(id: number): Promise<void> {
    await api.delete(`/leave-policies/${id}`);
  }

  // Holidays
  async getHolidays(params?: {
    year?: number;
    type?: string;
    active_only?: boolean;
  }): Promise<Holiday[]> {
    const response = await api.get('/holidays', { params });
    return response.data;
  }

  async createHoliday(data: Partial<Holiday>): Promise<Holiday> {
    const response = await api.post('/holidays', data);
    return response.data;
  }

  async updateHoliday(id: number, data: Partial<Holiday>): Promise<Holiday> {
    const response = await api.put(`/holidays/${id}`, data);
    return response.data;
  }

  async deleteHoliday(id: number): Promise<void> {
    await api.delete(`/holidays/${id}`);
  }

  // Dashboard
  async getDashboard(): Promise<LeaveDashboard> {
    const response = await api.get('/leave-dashboard');
    return response.data;
  }

  // Utility methods
  calculateWorkingDays(startDate: string, endDate: string, leavePeriod: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    const currentDate = new Date(start);

    while (currentDate <= end) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        if (leavePeriod === 'half_day_morning' || leavePeriod === 'half_day_afternoon') {
          workingDays += 0.5;
        } else {
          workingDays += 1;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
  }

  isLeaveOverlapping(request: Partial<LeaveRequest>, existingRequests: LeaveRequest[]): boolean {
    const start = new Date(request.start_date!);
    const end = new Date(request.end_date!);

    return existingRequests.some(existing => {
      if (existing.status === 'cancelled' || existing.status === 'rejected') return false;

      const existingStart = new Date(existing.start_date);
      const existingEnd = new Date(existing.end_date);

      return (start <= existingEnd && end >= existingStart);
    });
  }
}

export const leaveService = new LeaveService();
