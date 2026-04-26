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
  cancellation_reason?: string;
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

export interface LeaveBalanceSummary {
  leave_type_id: number;
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
  type: string;
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

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    type: 'leave' | 'holiday';
    leave_type?: string;
    employee?: string;
    department?: string;
    days?: number;
    reason?: string;
    period?: string;
    holiday_type?: string;
    description?: string;
    is_recurring?: boolean;
  };
}

export interface CalendarFilters {
  departments: string[];
  leave_types: Array<{ id: number; name: string; code: string }>;
  employees: Array<{ id: number; name: string; department: string; designation: string }>;
}

export interface MonthlySummary {
  month: number;
  year: number;
  working_days: number;
  leave_statistics: Array<{
    leave_type: string;
    leave_code: string;
    total_requests: number;
    total_days: number;
  }>;
  department_statistics: Array<{
    department: string;
    total_requests: number;
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

export interface LeaveAdjustment {
  id: number;
  employee_id: number;
  leave_type_id: number;
  adjustment_amount: number;
  adjustment_type: 'credit' | 'debit' | 'override';
  reason_type: 'encashment' | 'carry_forward_correction' | 'unpaid_leave_conversion' | 'manual_correction' | 'other';
  reason: string;
  balance_year: number;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  employee?: Employee;
  leaveType?: LeaveType;
  createdBy?: User;
}

export interface LeaveAuditLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  employee_id?: number;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  description?: string;
  ip_address?: string;
  created_at?: string;
  user?: User;
  employee?: Employee;
}

export interface UtilizationReportItem {
  employee_id: number;
  employee_name: string;
  department: string;
  designation: string;
  leave_type: string;
  leave_code: string;
  balance_allocated: number;
  balance_used: number;
  balance_pending: number;
  balance_available: number;
  days_taken: number;
  utilization_percentage: number;
  requests_approved: number;
  requests_rejected: number;
  requests_pending: number;
}

export interface DepartmentReportItem {
  department: string;
  total_requests: number;
  total_approved_days: number;
  total_pending_days: number;
  leave_types: Array<{
    leave_type: string;
    leave_code: string;
    requests: number;
    approved_days: number;
    pending_days: number;
    avg_days_per_request: number;
  }>;
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

  async getMyBalanceSummary(): Promise<LeaveBalanceSummary[]> {
    const response = await api.get('/my-leave-balances');
    return response.data ?? [];
  }

  async getEmployeeBalanceSummary(employeeId: string | number): Promise<LeaveBalanceSummary[]> {
    const response = await api.get(`/employees/${employeeId}/leave-balances`);
    return response.data ?? [];
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

  // Leave Reports
  async getUtilizationReport(params: { year: number; department?: string; leave_type_id?: number }) {
    const response = await api.get('/leave-reports/utilization', { params });
    return response.data as { year: number; data: UtilizationReportItem[]; summary: Record<string, number> };
  }

  async getDepartmentReport(params: { year: number; month?: number }) {
    const response = await api.get('/leave-reports/department', { params });
    return response.data as { year: number; month?: number; departments: DepartmentReportItem[]; summary: Record<string, number> };
  }

  async getTrendsReport(params: { start_year: number; end_year: number; leave_type_id?: number }) {
    const response = await api.get('/leave-reports/trends', { params });
    return response.data;
  }

  async getEmployeeSummaryReport(params: { year: number; employee_id?: number }) {
    const response = await api.get('/leave-reports/employee-summary', { params });
    return response.data;
  }

  // Leave Audit Logs
  async getAuditLogs(params?: {
    action?: string;
    entity_type?: string;
    user_id?: number;
    employee_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
  }): Promise<{ data: LeaveAuditLog[]; current_page: number; last_page: number; total: number }> {
    const response = await api.get('/leave-audit-logs', { params });
    return response.data;
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

  // Leave Adjustments
  async getLeaveAdjustments(params?: {
    employee_id?: number;
    leave_type_id?: number;
    balance_year?: number;
    adjustment_type?: string;
    reason_type?: string;
    page?: number;
  }): Promise<{ data: LeaveAdjustment[]; current_page: number; last_page: number; total: number }> {
    const response = await api.get('/leave-adjustments', { params });
    return response.data;
  }

  async createLeaveAdjustment(data: {
    employee_id: number;
    leave_type_id: number;
    adjustment_amount: number;
    adjustment_type: 'credit' | 'debit' | 'override';
    reason_type: string;
    reason: string;
    balance_year: number;
  }): Promise<LeaveAdjustment> {
    const response = await api.post('/leave-adjustments', data);
    return response.data;
  }

  async deleteLeaveAdjustment(id: number): Promise<void> {
    await api.delete(`/leave-adjustments/${id}`);
  }

  // Leave Calendar
  async getCalendarEvents(params: {
    start_date: string;
    end_date: string;
    employee_id?: number;
    department?: string;
    leave_type_id?: number;
  }): Promise<CalendarEvent[]> {
    const response = await api.get('/leave-calendar/events', { params });
    return response.data;
  }

  async getCalendarFilters(): Promise<CalendarFilters> {
    const response = await api.get('/leave-calendar/filters');
    return response.data;
  }

  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const response = await api.get('/leave-calendar/monthly-summary', { params: { year, month } });
    return response.data;
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
