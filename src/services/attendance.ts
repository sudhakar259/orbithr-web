import api from './api'

export type PunchType = 'check_in' | 'check_out'

export interface AttendanceRecord {
  id: string
  employee_id: number
  shift_id?: number | null
  attendance_date: string
  check_in?: string | null
  check_out?: string | null
  working_hours: number
  overtime_hours: number
  break_hours?: number | null
  status: string
  punch_type?: string | null
  device_id?: string | number | null
  location?: string | null
  notes?: string | null
  is_regularized?: boolean
  regularized_by?: number | null
  regularized_at?: string | null
  regularization_reason?: string | null
  total_hours?: number | null
  is_late?: boolean
  is_early_leave?: boolean
  punch_logs?: Array<{
    timestamp: string
    type: string
    device_id?: string | number | null
    location?: string | null
    method?: string | null
  }>
  metadata?: Record<string, unknown> | null
  shift_details?: {
    shift_name?: string
    start_time?: string
    end_time?: string
    working_hours?: number
    break_start?: string | null
    break_end?: string | null
    break_hours?: number | null
    is_night_shift?: boolean
    flexible_timing?: Record<string, unknown> | null
    overtime_rules?: Record<string, unknown> | null
  } | null
  work_status?: string | null
  project?: string | null
  daily_status?: string | null
}

export interface AttendanceSummary {
  total_days: number
  present_days: number
  absent_days: number
  half_days: number
  late_days: number
  early_leave_days: number
  total_working_hours: number
  total_overtime_hours: number
  regularized_count: number
  leave_days?: number
}

export interface AttendanceRecordsQuery {
  start_date?: string
  end_date?: string
  year?: number
  month?: number
  employee_id?: number
  include_summary?: boolean
  include_details?: boolean
  include?: string[]
  timezone?: string
  status?: string
}

export interface AttendanceCollectionResult {
  records: AttendanceRecord[]
  summary?: AttendanceSummary
  meta?: Record<string, unknown> | null
}

export interface LeaveRecord {
  start_date: string
  end_date: string
  leave_type_name: string
  days_requested: number
  leave_period?: string | null
}

export interface CalendarDataResult {
  records: AttendanceRecord[]
  leaves: LeaveRecord[]
  summary: AttendanceSummary
}

export interface PunchPayload {
  attendance_date: string
  timestamp: string
  punch_type: PunchType
  employee_id?: number
  method?: string
  location?: string
  notes?: string
  device_id?: string | number
  work_status?: string
  daily_status?: string
  project?: string
  metadata?: Record<string, unknown>
  gps_coordinates?: {
    lat: number
    lng: number
  }
}

export interface RegularizationPayload {
  attendance_id: number
  reason: string
  notes?: string
  updates?: Partial<{
    attendance_date: string
    check_in: string | null
    check_out: string | null
    status: string
    working_hours: number
    overtime_hours: number
    break_hours: number | null
    location: string | null
    work_status: string | null
    daily_status: string | null
    project: string | null
  }>
}

export interface AttendanceDevice {
  id: number
  device_id: string
  device_name: string
  device_type: string
  location?: string | null
  ip_address?: string | null
  status?: string | null
  last_sync_at?: string | null
  device_config?: Record<string, unknown> | null
  sync_status?: Record<string, unknown> | null
  is_online?: boolean
  last_sync_status?: string | null
}

export interface Shift {
  id: number
  shift_name: string
  shift_code: string
  start_time: string
  end_time: string
  working_hours: number
  break_start?: string | null
  break_end?: string | null
  break_hours?: number | null
  is_default: boolean
  is_active: boolean
  flexible_timing?: Record<string, unknown> | null
  overtime_rules?: Record<string, unknown> | null
  duration?: number
  is_night_shift?: boolean
  description?: string | null
}

export interface WorkStatusOption {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  category?: string
}

class AttendanceService {
  private readonly basePath = '/attendance'

  private unwrapPayload<T>(response: unknown): T {
    if (response && typeof response === 'object' && 'data' in response) {
      const payload = (response as { data: unknown }).data
      if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
        return (payload as Record<string, unknown>).data as T
      }
      return payload as T
    }
    return response as T
  }

  private toCollection(payload: unknown): AttendanceCollectionResult {
    if (!payload) {
      return { records: [], meta: null }
    }

    if (Array.isArray(payload)) {
      return { records: payload as AttendanceRecord[], meta: null }
    }

    const p = payload as Record<string, unknown>

    if (p['records'] && Array.isArray(p['records'])) {
      const meta = p['meta'] as Record<string, unknown> | undefined
      return {
        records: p['records'] as AttendanceRecord[],
        summary: (p['summary'] ?? meta?.['summary']) as AttendanceSummary | undefined,
        meta: (p['meta'] as AttendanceMeta) ?? null,
      }
    }

    if (p['data'] && Array.isArray(p['data'])) {
      const meta = p['meta'] as Record<string, unknown> | undefined
      return {
        records: p['data'] as AttendanceRecord[],
        summary: (p['summary'] ?? meta?.['summary']) as AttendanceSummary | undefined,
        meta: (p['meta'] as AttendanceMeta) ?? null,
      }
    }

    const meta = p['meta'] as Record<string, unknown> | undefined
    return {
      records: [],
      summary: (p['summary'] ?? meta?.['summary']) as AttendanceSummary | undefined,
      meta: (p['meta'] as AttendanceMeta) ?? null,
    }
  }

  async getAttendanceRecords(params: AttendanceRecordsQuery = {}): Promise<AttendanceCollectionResult> {
    const response = await api.get(`${this.basePath}/records`, { params })
    const payload = this.unwrapPayload<Record<string, unknown>>(response)
    return this.toCollection(payload)
  }

  async getMonthlyAttendance(year: number, month: number, employeeId?: number, options: Omit<AttendanceRecordsQuery, 'year' | 'month' | 'employee_id'> = {}): Promise<AttendanceCollectionResult> {
    return this.getAttendanceRecords({
      year,
      month,
      employee_id: employeeId,
      include_summary: true,
      ...options,
    })
  }

  async getCalendarData(year: number, month: number, employeeId?: number): Promise<CalendarDataResult> {
    const params: Record<string, unknown> = { year, month }
    if (employeeId) params['employee_id'] = employeeId
    const response = await api.get(`${this.basePath}/calendar`, { params })
    const payload = this.unwrapPayload<Record<string, unknown>>(response)
    return {
      records: (payload?.['records'] ?? []) as AttendanceRecord[],
      leaves: (payload?.['leaves'] ?? []) as AttendanceRecord[],
      summary: (payload?.['summary'] ?? {
        total_days: 0, present_days: 0, absent_days: 0, half_days: 0,
        late_days: 0, early_leave_days: 0, total_working_hours: 0,
        total_overtime_hours: 0, regularized_count: 0,
      }) as AttendanceSummary,
    }
  }

  async getAttendanceSummary(params: AttendanceRecordsQuery = {}): Promise<AttendanceSummary> {
    const response = await api.get(`${this.basePath}/summary`, { params })
    const payload = this.unwrapPayload<Record<string, unknown>>(response)
    if (payload && typeof payload === 'object' && 'total_days' in payload) {
      return payload as unknown as AttendanceSummary
    }
    return {
      total_days: 0,
      present_days: 0,
      absent_days: 0,
      half_days: 0,
      late_days: 0,
      early_leave_days: 0,
      total_working_hours: 0,
      total_overtime_hours: 0,
      regularized_count: 0,
    }
  }

  async getTodayAttendance(employeeId?: number): Promise<AttendanceRecord | null> {
    const response = await api.get(`${this.basePath}/today`, {
      params: employeeId ? { employee_id: employeeId } : undefined,
    })
    const payload = this.unwrapPayload<AttendanceRecord | null>(response)
    return payload ?? null
  }

  async getDevices(): Promise<AttendanceDevice[]> {
    const response = await api.get(`${this.basePath}/devices`)
    return this.unwrapPayload<AttendanceDevice[]>(response)
  }

  async syncDevice(deviceId: string | number): Promise<Record<string, unknown>> {
    const response = await api.post(`${this.basePath}/devices/${deviceId}/sync`)
    return this.unwrapPayload<Record<string, unknown>>(response)
  }

  async getShifts(params?: { active_only?: boolean }): Promise<Shift[]> {
    const response = await api.get(`${this.basePath}/shifts`, { params })
    return this.unwrapPayload<Shift[]>(response)
  }

  async getWorkStatuses(): Promise<WorkStatusOption[]> {
    try {
      const response = await api.get(`${this.basePath}/work-statuses`)
      return this.unwrapPayload<WorkStatusOption[]>(response)
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } })?.response?.status === 404) {
        const fallback = await api.get(`${this.basePath}/statuses`)
        return this.unwrapPayload<WorkStatusOption[]>(fallback)
      }
      throw error
    }
  }

  async recordPunch(payload: PunchPayload): Promise<AttendanceRecord> {
    try {
      const response = await api.post(`${this.basePath}/punches`, payload)
      return this.unwrapPayload<AttendanceRecord>(response)
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        console.warn('AttendanceService: /punches endpoint not found, falling back to /punch. Update API to use /punches.')
        const fallback = await api.post(`${this.basePath}/punch`, payload)
        return this.unwrapPayload<AttendanceRecord>(fallback)
      }
      throw error
    }
  }

  async requestRegularization(payload: RegularizationPayload): Promise<AttendanceRecord> {
    try {
      const response = await api.post(`${this.basePath}/regularizations`, payload)
      return this.unwrapPayload<AttendanceRecord>(response)
    } catch (error: unknown) {
      if ((error as { response?: { status?: number } })?.response?.status === 404) {
        const fallback = await api.post(`${this.basePath}/regularize`, payload)
        return this.unwrapPayload<AttendanceRecord>(fallback)
      }
      throw error
    }
  }

  async updateAttendance(attendanceId: number, updates: RegularizationPayload['updates']): Promise<AttendanceRecord> {
    const response = await api.put(`${this.basePath}/records/${attendanceId}`, updates)
    return this.unwrapPayload<AttendanceRecord>(response)
  }
}

export const attendanceService = new AttendanceService()
