/*
 * Static attendance data utilities
 * This file contains static data for holidays, week-offs, and other attendance-related configurations
 */

export interface Holiday {
  date: string
  name: string
  type: 'national' | 'optional' | 'regional'
}

export interface WeekOff {
  employeeId: number
  dayOfWeek: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  name: string
}

// Company-wide holidays (static data)
export const COMPANY_HOLIDAYS: Holiday[] = [
  { date: '2025-01-26', name: 'Republic Day', type: 'national' },
  { date: '2025-03-08', name: 'Maha Shivaratri', type: 'national' },
  { date: '2025-03-25', name: 'Holi', type: 'national' },
  { date: '2025-04-14', name: 'Ambedkar Jayanti', type: 'national' },
  { date: '2025-04-17', name: 'Ram Navami', type: 'optional' },
  { date: '2025-04-18', name: 'Good Friday', type: 'national' },
  { date: '2025-05-01', name: 'May Day', type: 'national' },
  { date: '2025-06-21', name: 'Eid ul-Adha', type: 'optional' },
  { date: '2025-07-17', name: 'Muharram', type: 'optional' },
  { date: '2025-08-15', name: 'Independence Day', type: 'national' },
  { date: '2025-08-27', name: 'Janmashtami', type: 'optional' },
  { date: '2025-09-16', name: 'Milad un-Nabi', type: 'optional' },
  { date: '2025-10-02', name: 'Gandhi Jayanti', type: 'national' },
  { date: '2025-10-02', name: 'Dussehra', type: 'national' },
  { date: '2025-10-20', name: 'Diwali', type: 'national' },
  { date: '2025-10-21', name: 'Diwali (Day 2)', type: 'national' },
  { date: '2025-11-11', name: 'Guru Nanak Jayanti', type: 'optional' },
  { date: '2025-12-25', name: 'Christmas', type: 'national' },
]

// Employee-specific week-offs (static data)
// In real implementation, this would come from database
export const EMPLOYEE_WEEK_OFFS: Map<number, number[]> = new Map([
  // Employee ID -> array of day numbers (0 = Sunday, 6 = Saturday)
  // Default: Saturday and Sunday
  // Can be customized per employee
  [1, [0, 6]], // Employee 1: Sunday, Saturday
  [2, [0, 6]], // Employee 2: Sunday, Saturday
  [3, [0, 6]], // Employee 3: Sunday, Saturday
])

// Get holidays for a specific date range
export function getHolidaysInRange(startDate: Date, endDate: Date): Holiday[] {
  // Normalize range to local midnight
  const s = new Date(startDate)
  s.setHours(0, 0, 0, 0)
  const e = new Date(endDate)
  e.setHours(0, 0, 0, 0)

  return COMPANY_HOLIDAYS.filter(holiday => {
    const [y, m, d] = holiday.date.split('-').map(n => parseInt(n, 10))
    const holidayDate = new Date(y, (m || 1) - 1, d || 1)
    holidayDate.setHours(0, 0, 0, 0)
    return holidayDate >= s && holidayDate <= e
  })
}

// Check if a date is a company holiday
export function isCompanyHoliday(date: Date): Holiday[] {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const dateStr = `${y}-${m}-${d}`
  return COMPANY_HOLIDAYS.filter(h => h.date === dateStr)
}

// Get week-offs for an employee
export function getEmployeeWeekOffs(employeeId: number): number[] {
  return EMPLOYEE_WEEK_OFFS.get(employeeId) || [0, 6] // Default to Sunday and Saturday
}

// Check if a date is a week-off for an employee
export function isEmployeeWeekOff(date: Date, employeeId: number): boolean {
  const dayOfWeek = date.getDay()
  return getEmployeeWeekOffs(employeeId).includes(dayOfWeek)
}

// Get day name from day number
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || ''
}

// Get all holidays and week-offs for a date
export interface DateStatus {
  isHoliday: boolean
  isWeekOff: boolean
  holiday?: Holiday[]
  type: 'holiday' | 'weekend' | 'weekoff' | 'normal'
}

export function getDateStatus(date: Date, employeeId: number): DateStatus {
  const holidays = isCompanyHoliday(date)
  const isWeekOff = isEmployeeWeekOff(date, employeeId)

  if (holidays && holidays.length) {
    return {
      isHoliday: true,
      isWeekOff: false,
      holiday: holidays,
      type: 'holiday'
    }
  }

  if (isWeekOff) {
    return {
      isHoliday: false,
      isWeekOff: true,
      type: 'weekend'
    }
  }

  return {
    isHoliday: false,
    isWeekOff: false,
    type: 'normal'
  }
}

// EL (Earned Leave) deduction configuration
export const EL_DEDUCTION_CONFIG = {
  daysBeforeLock: 3, // Regularization allowed for 3 working days only
  elPerFullDay: 1, // 1 EL deducted for each full day absent after lock period
  workingHoursPerDay: 8, // Standard working hours per day
}

// Calculate if attendance is locked for regularization (past 3 working days)
export function isAttendanceLocked(attendanceDate: Date, employeeId: number = 1): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  attendanceDate = new Date(attendanceDate)
  attendanceDate.setHours(0, 0, 0, 0)

  let workingDaysDiff = 0
  let currentDate = new Date(attendanceDate)

  while (currentDate < today) {
    const dayOfWeek = currentDate.getDay()
    const holidaysOnDay = isCompanyHoliday(currentDate)
    const isHoliday = holidaysOnDay && holidaysOnDay.length > 0
    const isWeekOffForEmployee = isEmployeeWeekOff(currentDate, employeeId)
    // Count as working day if not weekend, not employee week off and not a company holiday
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday && !isWeekOffForEmployee) {
      workingDaysDiff++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return workingDaysDiff > EL_DEDUCTION_CONFIG.daysBeforeLock
}

// Calculate working days between two dates
export function countWorkingDays(startDate: Date, endDate: Date, employeeId: number = 1): number {
  let count = 0
  let currentDate = new Date(startDate)
  currentDate.setHours(0, 0, 0, 0)
  endDate = new Date(endDate)
  endDate.setHours(0, 0, 0, 0)

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    const isWeekOff = isEmployeeWeekOff(currentDate, employeeId)
    const holidaysOnDay = isCompanyHoliday(currentDate)
    const isHoliday = holidaysOnDay && holidaysOnDay.length > 0

    if (!isWeekOff && !isHoliday && dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return count
}

// Get the next working day after the provided date for the given employee
// This function skips holidays and employee week-offs
export function getNextWorkingDay(date: Date, employeeId: number = 1): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() + 1)

  // Keep advancing until we find a day that is not a company holiday and not a week off
  while (true) {
    const holidays = isCompanyHoliday(next)
    const isWeekOff = isEmployeeWeekOff(next, employeeId)
    const dayOfWeek = next.getDay()

    // Treat as working day if it's not a week off, not a holiday and not a weekend
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    if (!isWeekOff && (!holidays || holidays.length === 0) && !isWeekend) {
      return new Date(next)
    }

    next.setDate(next.getDate() + 1)
  }
}

// EL: end of utilities
