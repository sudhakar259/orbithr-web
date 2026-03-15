import { computed, ref } from 'vue'
import {
  attendanceService,
  type AttendanceCollectionResult,
  type AttendanceDevice,
  type AttendanceRecord,
  type AttendanceRecordsQuery,
  type AttendanceSummary,
  type LeaveRecord,
  type PunchPayload,
  type RegularizationPayload,
  type Shift,
  type WorkStatusOption,
} from '@/services/attendance'

const createEmptySummary = (): AttendanceSummary => ({
  total_days: 0,
  present_days: 0,
  absent_days: 0,
  half_days: 0,
  late_days: 0,
  early_leave_days: 0,
  total_working_hours: 0,
  total_overtime_hours: 0,
  regularized_count: 0,
  leave_days: 0,
})

const isSameDate = (left: string | null | undefined, right: string | null | undefined) => {
  if (!left || !right) return false
  const normalizeDate = (date: string) => date.split('T')[0]
  return normalizeDate(left) === normalizeDate(right)
}

const normalizeDate = (date: string) => date

import { isCompanyHoliday, isEmployeeWeekOff } from '@/utils/attendanceData'

const computeSummary = (records: AttendanceRecord[]): AttendanceSummary => {
  if (!records.length) {
    return createEmptySummary()
  }

  // Determine employee id if available from local auth (fall back to 1)
  let employeeId = 1
  try {
    // dynamic import useAuth to avoid circular deps at module load
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useAuth } = require('@/composables/useAuth')
    const auth = useAuth()
    employeeId = auth.user?.value?.employee_id || 1
  } catch (e) {
    // ignore and use default
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return records.reduce<AttendanceSummary>((stats, record) => {
    const workingHours = Number(record.working_hours ?? 0)
    const overtimeHours = Number(record.overtime_hours ?? 0)

    stats.total_days += 1
    stats.total_working_hours += Number.isFinite(workingHours) ? workingHours : 0
    stats.total_overtime_hours += Number.isFinite(overtimeHours) ? overtimeHours : 0

    // Parse attendance date into local midnight to avoid timezone shifts
    const datePart = String(record.attendance_date || '').split('T')[0]
    const [ry, rm, rd] = datePart.split('-').map(n => parseInt(n, 10))
    const attendanceDate = new Date(ry, (rm || 1) - 1, rd || 1)
    attendanceDate.setHours(0, 0, 0, 0)

    const isHoliday = isCompanyHoliday(attendanceDate) && isCompanyHoliday(attendanceDate).length > 0
    const isWeekOff = isEmployeeWeekOff(attendanceDate, employeeId)

    // If record is for a non-working day (holiday/week off), skip counting it as absent
    const isFuture = attendanceDate >= today

    switch (record.status) {
      case 'present':
        stats.present_days += 1
        break
      case 'absent':
        if (!isHoliday && !isWeekOff && !isFuture) {
          stats.absent_days += 1
        }
        break
      case 'half_day':
        stats.half_days += 1
        break
      case 'late':
        stats.late_days += 1
        break
      case 'early_leave':
        stats.early_leave_days += 1
        break
      default:
        break
    }

    if (record.is_late) stats.late_days += record.status === 'late' ? 0 : 1
    if (record.is_early_leave) stats.early_leave_days += record.status === 'early_leave' ? 0 : 1
    if (record.is_regularized === true || String(record.is_regularized) === '1') stats.regularized_count += 1

    return stats
  }, { ...createEmptySummary() })
}

const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: any }).response
    const data = response?.data
    if (data) {
      if (typeof data === 'string') return data
      if (typeof data.message === 'string') return data.message
      if (typeof data.error === 'string') return data.error
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export function useAttendance() {
  const records = ref<AttendanceRecord[]>([])
  const leaves = ref<LeaveRecord[]>([])
  const todaysRecord = ref<AttendanceRecord | null>(null)
  const devices = ref<AttendanceDevice[]>([])
  const shifts = ref<Shift[]>([])
  const workStatuses = ref<WorkStatusOption[]>([])
  const summary = ref<AttendanceSummary>(createEmptySummary())
  const error = ref<string | null>(null)
  const pendingRequests = ref(0)
  const lastRecordsQuery = ref<AttendanceRecordsQuery | null>(null)

  const loading = computed(() => pendingRequests.value > 0)
  const hasCheckedInToday = computed(() => Boolean(todaysRecord.value?.check_in))
  const hasCheckedOutToday = computed(() => Boolean(todaysRecord.value?.check_out))

  const startRequest = () => {
    pendingRequests.value += 1
    if (pendingRequests.value === 1) {
      error.value = null
    }
  }

  const endRequest = () => {
    pendingRequests.value = Math.max(0, pendingRequests.value - 1)
  }

  const runRequest = async <T>(callback: () => Promise<T>): Promise<T> => {
    startRequest()
    try {
      return await callback()
    } catch (err) {
      error.value = extractErrorMessage(err)
      throw err
    } finally {
      endRequest()
    }
  }

  const updateSummary = (incoming?: AttendanceSummary) => {
    if (incoming) {
      summary.value = incoming
    } else {
      summary.value = computeSummary(records.value)
    }
  }

  const sortRecords = (list: AttendanceRecord[]) => {
    return [...list].sort((a, b) => normalizeDate(a.attendance_date).localeCompare(normalizeDate(b.attendance_date)))
  }

  const upsertRecord = (record: AttendanceRecord) => {
    if (!record) return

    const list = records.value.slice()
    const index = list.findIndex(item => item.id === record.id)

    if (index >= 0) {
      list[index] = { ...list[index], ...record }
    } else {
      const dateIndex = list.findIndex(item => isSameDate(item.attendance_date, record.attendance_date))
      if (dateIndex >= 0) {
        list[dateIndex] = { ...list[dateIndex], ...record }
      } else {
        list.push(record)
      }
    }

    records.value = sortRecords(list)

    if (isSameDate(record.attendance_date, new Date().toISOString().split('T')[0])) {
      todaysRecord.value = record
    }

    updateSummary()
  }

  const fetchAttendanceRecords = async (query: AttendanceRecordsQuery = {}): Promise<AttendanceCollectionResult> => {
    lastRecordsQuery.value = { ...query }
    const result = await runRequest(() => attendanceService.getAttendanceRecords(query))
    records.value = sortRecords(result.records)
    updateSummary(result.summary)
    return result
  }

  const fetchMonthlyAttendance = async (year: number, month: number, employeeId?: number, options: Omit<AttendanceRecordsQuery, 'year' | 'month' | 'employee_id'> = {}) => {
    return fetchAttendanceRecords({
      year,
      month,
      employee_id: employeeId,
      include_summary: true,
      ...options,
    })
  }

  const fetchCalendarData = async (year: number, month: number, employeeId?: number) => {
    const result = await runRequest(() => attendanceService.getCalendarData(year, month, employeeId))
    records.value = sortRecords(result.records)
    leaves.value = result.leaves
    summary.value = result.summary
    return result
  }

  const refreshAttendanceRecords = async () => {
    if (!lastRecordsQuery.value) return null
    return fetchAttendanceRecords(lastRecordsQuery.value)
  }

  const fetchTodayAttendance = async (employeeId?: number) => {
    if (!employeeId) return;
    const record = await runRequest(() => attendanceService.getTodayAttendance(employeeId))
    todaysRecord.value = record
    return record
  }

  const fetchAttendanceSummary = async (query: AttendanceRecordsQuery = {}) => {
    const stats = await runRequest(() => attendanceService.getAttendanceSummary(query))
    summary.value = stats
    return stats
  }

  const fetchDevices = async () => {
    const result = await runRequest(() => attendanceService.getDevices())
    devices.value = result
    return result
  }

  const fetchShifts = async (params?: { active_only?: boolean }) => {
    const result = await runRequest(() => attendanceService.getShifts(params))
    shifts.value = result
    return result
  }

  const fetchWorkStatuses = async () => {
    const result = await runRequest(() => attendanceService.getWorkStatuses())
    workStatuses.value = result
    return result
  }

  const recordPunch = async (payload: PunchPayload) => {
    const record = await runRequest(() => attendanceService.recordPunch(payload))
    upsertRecord(record)
    return record
  }

  const requestRegularization = async (payload: RegularizationPayload) => {
    const record = await runRequest(() => attendanceService.requestRegularization(payload))
    upsertRecord(record)
    return record
  }

  const updateAttendance = async (attendanceId: number, updates: RegularizationPayload['updates']) => {
    const record = await runRequest(() => attendanceService.updateAttendance(attendanceId, updates))
    upsertRecord(record)
    return record
  }

  const syncDevice = async (deviceId: string | number) => {
    return runRequest(() => attendanceService.syncDevice(deviceId))
  }

  const resetError = () => {
    error.value = null
  }

  return {
    // state
    records,
    leaves,
    todaysRecord,
    devices,
    shifts,
    workStatuses,
    summary,
    error,
    loading,
    hasCheckedInToday,
    hasCheckedOutToday,

    // fetchers
    fetchAttendanceRecords,
    fetchMonthlyAttendance,
    fetchCalendarData,
    refreshAttendanceRecords,
    fetchTodayAttendance,
    fetchAttendanceSummary,
    fetchDevices,
    fetchShifts,
    fetchWorkStatuses,

    // actions
    recordPunch,
    requestRegularization,
    updateAttendance,
    syncDevice,
    resetError,
  }
}
