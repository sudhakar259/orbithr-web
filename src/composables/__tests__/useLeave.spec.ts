import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock leaveService ───────────────────────────────────────────────────────

vi.mock('@/services/leave', () => ({
  leaveService: {
    getLeaveRequests: vi.fn(),
    createLeaveRequest: vi.fn(),
    updateLeaveRequest: vi.fn(),
    cancelLeaveRequest: vi.fn(),
    approveLeaveRequest: vi.fn(),
    rejectLeaveRequest: vi.fn(),
    getMyLeaveBalances: vi.fn(),
    getEmployeeLeaveBalances: vi.fn(),
    getLeaveTypes: vi.fn(),
    getHolidays: vi.fn(),
    getDashboard: vi.fn(),
    calculateWorkingDays: vi.fn(),
    isLeaveOverlapping: vi.fn(),
  },
}))

import { leaveService } from '@/services/leave'
import { useLeave } from '../useLeave'

const mockService = vi.mocked(leaveService)

beforeEach(() => vi.resetAllMocks())

// ─── helpers ────────────────────────────────────────────────────────────────

function makeLeaveRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    employee_id: 10,
    leave_type_id: 2,
    start_date: '2026-05-01',
    end_date: '2026-05-03',
    leave_period: 'full_day' as const,
    days_requested: 3,
    status: 'pending',
    reason: 'Vacation',
    ...overrides,
  }
}

function makeLeaveBalance(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    leave_type_id: 2,
    code: 'CL',
    available: 10,
    used: 2,
    pending: 1,
    ...overrides,
  }
}

// ─── Bug #17: createLeaveRequest — no date validation before API call ─────────
// useLeave.createLeaveRequest() sends the request to the API without checking
// that start_date <= end_date.  These tests document the missing guard.

describe('useLeave – createLeaveRequest date validation (Bug #17)', () => {
  it('calls service and succeeds when start_date is before end_date', async () => {
    const req = makeLeaveRequest()
    mockService.createLeaveRequest.mockResolvedValueOnce(req)

    const { createLeaveRequest } = useLeave()
    const result = await createLeaveRequest({
      employee_id: 10,
      leave_type_id: 2,
      start_date: '2026-05-01',
      end_date: '2026-05-03',
      leave_period: 'full_day',
      reason: 'Vacation',
    })

    expect(mockService.createLeaveRequest).toHaveBeenCalledTimes(1)
    expect(result.id).toBe(1)
  })

  it('calls service even when start_date equals end_date (single-day leave)', async () => {
    const req = makeLeaveRequest({ end_date: '2026-05-01', days_requested: 1 })
    mockService.createLeaveRequest.mockResolvedValueOnce(req)

    const { createLeaveRequest } = useLeave()
    await createLeaveRequest({
      employee_id: 10,
      leave_type_id: 2,
      start_date: '2026-05-01',
      end_date: '2026-05-01',
      leave_period: 'full_day',
      reason: 'Medical',
    })

    expect(mockService.createLeaveRequest).toHaveBeenCalledTimes(1)
  })

  it('throws and sets error when start_date is after end_date (HRMS-261 fix)', async () => {
    const { createLeaveRequest, error } = useLeave()

    await expect(
      createLeaveRequest({
        employee_id: 10,
        leave_type_id: 2,
        start_date: '2026-05-05', // AFTER end_date — invalid
        end_date: '2026-05-01',
        leave_period: 'full_day',
        reason: 'Test',
      })
    ).rejects.toThrow('Start date must be on or before end date')

    // Service must NOT have been called
    expect(mockService.createLeaveRequest).not.toHaveBeenCalled()
    // error ref is populated
    expect(error.value).toBe('Start date must be on or before end date')
  })

  it('adds new request to the top of leaveRequests list on success', async () => {
    const existing = makeLeaveRequest({ id: 1 })
    const newReq = makeLeaveRequest({ id: 2, start_date: '2026-06-01', end_date: '2026-06-02' })

    mockService.getLeaveRequests.mockResolvedValueOnce({ data: [existing] })
    mockService.createLeaveRequest.mockResolvedValueOnce(newReq)

    const { fetchLeaveRequests, createLeaveRequest, leaveRequests } = useLeave()
    await fetchLeaveRequests()
    await createLeaveRequest({
      employee_id: 10,
      leave_type_id: 2,
      start_date: '2026-06-01',
      end_date: '2026-06-02',
      leave_period: 'full_day',
      reason: 'New leave',
    })

    // New request should be at index 0 (unshift)
    expect(leaveRequests.value[0].id).toBe(2)
    expect(leaveRequests.value).toHaveLength(2)
  })
})

// ─── Bug #13 (frontend): role check uses hasRole() not roles array objects ────
// Leave.vue uses authStore.hasRole(role) for isAdminOrHR — this is already the
// correct pattern.  These tests verify the composable exposes all the actions
// that the role-gated UI depends on.

describe('useLeave – role-gated actions are exposed', () => {
  it('exposes approveLeaveRequest', () => {
    const { approveLeaveRequest } = useLeave()
    expect(typeof approveLeaveRequest).toBe('function')
  })

  it('exposes rejectLeaveRequest', () => {
    const { rejectLeaveRequest } = useLeave()
    expect(typeof rejectLeaveRequest).toBe('function')
  })

  it('exposes cancelLeaveRequest', () => {
    const { cancelLeaveRequest } = useLeave()
    expect(typeof cancelLeaveRequest).toBe('function')
  })
})

// ─── fetchLeaveRequests ───────────────────────────────────────────────────────

describe('useLeave – fetchLeaveRequests', () => {
  it('populates leaveRequests from API response', async () => {
    const requests = [makeLeaveRequest(), makeLeaveRequest({ id: 2 })]
    mockService.getLeaveRequests.mockResolvedValueOnce({ data: requests })

    const { fetchLeaveRequests, leaveRequests } = useLeave()
    await fetchLeaveRequests()

    expect(leaveRequests.value).toHaveLength(2)
    expect(leaveRequests.value[0].id).toBe(1)
  })

  it('sets error on failure', async () => {
    mockService.getLeaveRequests.mockRejectedValueOnce({
      response: { data: { message: 'Unauthorized' } },
    })

    const { fetchLeaveRequests, error } = useLeave()
    await fetchLeaveRequests().catch(() => {})

    expect(error.value).toBe('Unauthorized')
  })

  it('sets loading true during fetch and false after', async () => {
    let resolve!: (v: unknown) => void
    const pending = new Promise(res => {
      resolve = res
    })
    mockService.getLeaveRequests.mockReturnValueOnce(pending as ReturnType<typeof mockService.getLeaveRequests>)

    const { fetchLeaveRequests, loading } = useLeave()
    const fetchPromise = fetchLeaveRequests()

    expect(loading.value).toBe(true)
    resolve({ data: [] })
    await fetchPromise
    expect(loading.value).toBe(false)
  })
})

// ─── cancelLeaveRequest ───────────────────────────────────────────────────────

describe('useLeave – cancelLeaveRequest', () => {
  it('updates request status to cancelled in local state', async () => {
    const req = makeLeaveRequest({ status: 'approved' })
    mockService.getLeaveRequests.mockResolvedValueOnce({ data: [req] })
    mockService.cancelLeaveRequest.mockResolvedValueOnce(undefined)

    const { fetchLeaveRequests, cancelLeaveRequest, leaveRequests } = useLeave()
    await fetchLeaveRequests()
    await cancelLeaveRequest(1, 'Changed plans')

    expect(leaveRequests.value[0].status).toBe('cancelled')
  })

  it('calls cancelLeaveRequest service with id and reason', async () => {
    mockService.cancelLeaveRequest.mockResolvedValueOnce(undefined)

    const { cancelLeaveRequest } = useLeave()
    await cancelLeaveRequest(7, 'Emergency')

    expect(mockService.cancelLeaveRequest).toHaveBeenCalledWith(7, 'Emergency')
  })
})

// ─── fetchLeaveBalances ───────────────────────────────────────────────────────

describe('useLeave – fetchLeaveBalances', () => {
  it('fetches own balances when no employeeId provided', async () => {
    mockService.getMyLeaveBalances.mockResolvedValueOnce([makeLeaveBalance()])

    const { fetchLeaveBalances, leaveBalances } = useLeave()
    await fetchLeaveBalances()

    expect(mockService.getMyLeaveBalances).toHaveBeenCalledTimes(1)
    expect(mockService.getEmployeeLeaveBalances).not.toHaveBeenCalled()
    expect(leaveBalances.value).toHaveLength(1)
  })

  it('fetches specific employee balances when employeeId provided', async () => {
    mockService.getEmployeeLeaveBalances.mockResolvedValueOnce([makeLeaveBalance()])

    const { fetchLeaveBalances, leaveBalances } = useLeave()
    await fetchLeaveBalances(99)

    expect(mockService.getEmployeeLeaveBalances).toHaveBeenCalledWith(99)
    expect(leaveBalances.value).toHaveLength(1)
  })
})

// ─── computed properties ──────────────────────────────────────────────────────

describe('useLeave – computed properties', () => {
  it('pendingRequests returns only pending-status requests', async () => {
    const requests = [
      makeLeaveRequest({ id: 1, status: 'pending' }),
      makeLeaveRequest({ id: 2, status: 'approved' }),
      makeLeaveRequest({ id: 3, status: 'pending' }),
    ]
    mockService.getLeaveRequests.mockResolvedValueOnce({ data: requests })

    const { fetchLeaveRequests, pendingRequests } = useLeave()
    await fetchLeaveRequests()

    expect(pendingRequests.value).toHaveLength(2)
    expect(pendingRequests.value.every(r => r.status === 'pending')).toBe(true)
  })

  it('upcomingLeaves returns approved future leaves sorted by start_date', async () => {
    const future1 = makeLeaveRequest({ id: 1, status: 'approved', start_date: '2099-06-10' })
    const future2 = makeLeaveRequest({ id: 2, status: 'approved', start_date: '2099-05-01' })
    const past = makeLeaveRequest({ id: 3, status: 'approved', start_date: '2020-01-01' })
    mockService.getLeaveRequests.mockResolvedValueOnce({ data: [future1, future2, past] })

    const { fetchLeaveRequests, upcomingLeaves } = useLeave()
    await fetchLeaveRequests()

    expect(upcomingLeaves.value).toHaveLength(2)
    expect(upcomingLeaves.value[0].id).toBe(2) // earlier date comes first
    expect(upcomingLeaves.value[1].id).toBe(1)
  })
})
