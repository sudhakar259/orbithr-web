import { ref, computed } from 'vue';
import { leaveService, type LeaveRequest, type LeaveBalance, type LeaveType, type Holiday, type LeaveDashboard } from '@/services/leave';

export function useLeave() {
  const leaveRequests = ref<LeaveRequest[]>([]);
  const leaveBalances = ref<LeaveBalance[]>([]);
  const leaveTypes = ref<LeaveType[]>([]);
  const holidays = ref<Holiday[]>([]);
  const dashboard = ref<LeaveDashboard | null>(null);

  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed properties
  const pendingRequests = computed(() =>
    leaveRequests.value.filter(req => req.status === 'pending')
  );

  const upcomingLeaves = computed(() =>
    leaveRequests.value.filter(req =>
      req.status === 'approved' &&
      new Date(req.start_date) > new Date()
    ).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  );

  const totalLeaveBalance = computed(() =>
    leaveBalances.value.reduce((total, balance) => total + balance.available, 0)
  );

  // Leave Requests
  const fetchLeaveRequests = async (params?: {
    status?: string;
    employee_id?: number;
    leave_type_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await leaveService.getLeaveRequests(params);
      leaveRequests.value = response.data;
      return response;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch leave requests';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createLeaveRequest = async (data: {
    employee_id: number;
    leave_type_id: number;
    start_date: string;
    end_date: string;
    leave_period: 'full_day' | 'half_day_morning' | 'half_day_afternoon';
    reason: string;
    contact_details?: string;
    emergency_leave?: boolean;
    document?: File;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const newRequest = await leaveService.createLeaveRequest(data);
      leaveRequests.value.unshift(newRequest);
      return newRequest;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to create leave request';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateLeaveRequest = async (id: number, data: Partial<LeaveRequest>) => {
    loading.value = true;
    error.value = null;

    try {
      const updatedRequest = await leaveService.updateLeaveRequest(id, data);
      const index = leaveRequests.value.findIndex(req => req.id === id);
      if (index !== -1) {
        leaveRequests.value[index] = updatedRequest;
      }
      return updatedRequest;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update leave request';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const cancelLeaveRequest = async (id: number, reason: string) => {
    loading.value = true;
    error.value = null;

    try {
      await leaveService.cancelLeaveRequest(id, reason);
      const index = leaveRequests.value.findIndex(req => req.id === id);
      if (index !== -1) {
        leaveRequests.value[index].status = 'cancelled';
        leaveRequests.value[index].rejection_reason = reason;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to cancel leave request';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const approveLeaveRequest = async (id: number, notes?: string) => {
    loading.value = true;
    error.value = null;

    try {
      const updatedRequest = await leaveService.approveLeaveRequest(id, notes);
      const index = leaveRequests.value.findIndex(req => req.id === id);
      if (index !== -1) {
        leaveRequests.value[index] = updatedRequest;
      }
      return updatedRequest;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to approve leave request';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const rejectLeaveRequest = async (id: number, reason: string) => {
    loading.value = true;
    error.value = null;

    try {
      const updatedRequest = await leaveService.rejectLeaveRequest(id, reason);
      const index = leaveRequests.value.findIndex(req => req.id === id);
      if (index !== -1) {
        leaveRequests.value[index] = updatedRequest;
      }
      return updatedRequest;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to reject leave request';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Leave Balances
  const fetchLeaveBalances = async (employeeId?: number) => {
    loading.value = true;
    error.value = null;

    try {
      if (employeeId) {
        leaveBalances.value = await leaveService.getEmployeeLeaveBalances(employeeId);
      } else {
        leaveBalances.value = await leaveService.getMyLeaveBalances();
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch leave balances';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Leave Types
  const fetchLeaveTypes = async (activeOnly = true) => {
    loading.value = true;
    error.value = null;

    try {
      leaveTypes.value = await leaveService.getLeaveTypes({ active_only: activeOnly });
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch leave types';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Holidays
  const fetchHolidays = async (params?: {
    year?: number;
    type?: string;
    active_only?: boolean;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      holidays.value = await leaveService.getHolidays(params);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch holidays';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Dashboard
  const fetchDashboard = async () => {
    loading.value = true;
    error.value = null;

    try {
      dashboard.value = await leaveService.getDashboard();
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch dashboard data';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Utility functions
  const calculateWorkingDays = (startDate: string, endDate: string, leavePeriod: string): number => {
    return leaveService.calculateWorkingDays(startDate, endDate, leavePeriod);
  };

  const isLeaveOverlapping = (request: Partial<LeaveRequest>, existingRequests: LeaveRequest[]): boolean => {
    return leaveService.isLeaveOverlapping(request, existingRequests);
  };

  const getLeaveTypeById = (id: number): LeaveType | undefined => {
    return leaveTypes.value.find(type => type.id === id);
  };

  const getLeaveBalanceByType = (leaveTypeId: number): LeaveBalance | undefined => {
    const leaveType = getLeaveTypeById(leaveTypeId);
    if (!leaveType) return undefined;

    return leaveBalances.value.find(balance => balance.code === leaveType.code);
  };

  return {
    // State
    leaveRequests,
    leaveBalances,
    leaveTypes,
    holidays,
    dashboard,
    loading,
    error,

    // Computed
    pendingRequests,
    upcomingLeaves,
    totalLeaveBalance,

    // Actions
    fetchLeaveRequests,
    createLeaveRequest,
    updateLeaveRequest,
    cancelLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    fetchLeaveBalances,
    fetchLeaveTypes,
    fetchHolidays,
    fetchDashboard,

    // Utilities
    calculateWorkingDays,
    isLeaveOverlapping,
    getLeaveTypeById,
    getLeaveBalanceByType,
  };
}
