import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useAttendanceStore = defineStore('attendance', () => {
  // State
  const monthlyAttendance = ref([])
  const todaysAttendance = ref(null)
  const devices = ref([])
  const shifts = ref([])
  const loading = ref(false)
  const error = ref(null)

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

      stats.total_working_hours += parseFloat(attendance.working_hours || 0)
      stats.total_overtime_hours += parseFloat(attendance.overtime_hours || 0)
    })

    return stats
  })

  // Actions
  const loadMonthlyAttendance = async (year: number, month: number) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.get(`/api/attendance/records`, {
        params: { year, month }
      })
      monthlyAttendance.value = response.data.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to load attendance data'
      console.error('Load monthly attendance error:', err)
    } finally {
      loading.value = false
    }
  }

  const loadTodaysAttendance = async () => {
    try {
      const response = await axios.get('/api/attendance/today')
      todaysAttendance.value = response.data.data
    } catch (err) {
      console.error('Load today\'s attendance error:', err)
    }
  }

  const loadDevices = async () => {
    try {
      const response = await axios.get('/api/attendance/devices')
      devices.value = response.data.data
    } catch (err) {
      console.error('Load devices error:', err)
    }
  }

  const loadShifts = async () => {
    try {
      const response = await axios.get('/api/attendance/shifts')
      shifts.value = response.data.data
    } catch (err) {
      console.error('Load shifts error:', err)
    }
  }

  const recordPunch = async (punchData: any) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/attendance/punch', punchData)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to record punch'
      throw err
    } finally {
      loading.value = false
    }
  }

  const requestRegularization = async (regularizationData: any) => {
    loading.value = true
    error.value = null

    try {
      const response = await axios.post('/api/attendance/regularize', regularizationData)
      return response.data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to request regularization'
      throw err
    } finally {
      loading.value = false
    }
  }

  const syncDevice = async (deviceId: string) => {
    try {
      const response = await axios.post(`/api/attendance/devices/${deviceId}/sync`)
      return response.data
    } catch (err) {
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
