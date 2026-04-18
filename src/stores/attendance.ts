import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { attendanceService, type AttendanceRecord, type PunchPayload, type RegularizationPayload } from '@/services/attendance'

export const useAttendanceStore = defineStore('attendance', () => {
  // State
  const monthlyAttendance = ref<AttendanceRecord[]>([])
  const todaysAttendance = ref<AttendanceRecord | null>(null)
  const devices = ref<unknown[]>([])
  const shifts = ref<unknown[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const monthlyStats = computed(() => {
    if (!monthlyAttendance.value.length) return {}

    const stats = {
      total_days: monthlyAttendance.value.length,
      present_days: 0,
      absent_days: 0,
      half_days: 0,
      late_days: 0,
      early_leave_days: 0,
      total_working_hours: 0,
      total_overtime_hours: 0,
      regularized_count: 0
    }

    monthlyAttendance.value.forEach(attendance => {
      switch (attendance.status) {
        case 'present':
          stats.present_days++
          break
        case 'absent':
          stats.absent_days++
          break
        case 'half_day':
          stats.half_days++
          break
      }

      if (attendance.is_late) stats.late_days++
      if (attendance.is_early_leave) stats.early_leave_days++
      if (attendance.is_regularized) stats.regularized_count++

      stats.total_working_hours += parseFloat(String(attendance.working_hours || 0))
      stats.total_overtime_hours += parseFloat(String(attendance.overtime_hours || 0))
    })

    return stats
  })

  // Actions
  const loadMonthlyAttendance = async (year: number, month: number) => {
    loading.value = true
    error.value = null

    try {
      const result = await attendanceService.getMonthlyAttendance(year, month)
      monthlyAttendance.value = result.records
    } catch (err: unknown) {
      error.value = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load attendance data'
      console.error('Load monthly attendance error:', err)
    } finally {
      loading.value = false
    }
  }

  const loadTodaysAttendance = async () => {
    try {
      todaysAttendance.value = await attendanceService.getTodayAttendance()
    } catch (err: unknown) {
      console.error("Load today's attendance error:", err)
    }
  }

  const loadDevices = async () => {
    try {
      devices.value = await attendanceService.getDevices()
    } catch (err: unknown) {
      console.error('Load devices error:', err)
    }
  }

  const loadShifts = async () => {
    try {
      shifts.value = await attendanceService.getShifts()
    } catch (err: unknown) {
      console.error('Load shifts error:', err)
    }
  }

  const recordPunch = async (punchData: PunchPayload) => {
    loading.value = true
    error.value = null

    try {
      return await attendanceService.recordPunch(punchData)
    } catch (err: unknown) {
      error.value = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to record punch'
      throw err
    } finally {
      loading.value = false
    }
  }

  const requestRegularization = async (regularizationData: RegularizationPayload) => {
    loading.value = true
    error.value = null

    try {
      return await attendanceService.requestRegularization(regularizationData)
    } catch (err: unknown) {
      error.value = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to request regularization'
      throw err
    } finally {
      loading.value = false
    }
  }

  const syncDevice = async (deviceId: string) => {
    try {
      return await attendanceService.syncDevice(deviceId)
    } catch (err: unknown) {
      console.error('Device sync error:', err)
      throw err
    }
  }

  return {
    // State
    monthlyAttendance,
    todaysAttendance,
    devices,
    shifts,
    loading,
    error,

    // Getters
    monthlyStats,

    // Actions
    loadMonthlyAttendance,
    loadTodaysAttendance,
    loadDevices,
    loadShifts,
    recordPunch,
    requestRegularization,
    syncDevice
  }
})
