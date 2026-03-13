import api from './api'

export interface TimesheetExportRequest {
  year: number
  month: number
  format: 'pdf' | 'excel'
  employeeId?: number
}

export interface TimesheetShareRequest {
  year: number
  month: number
  email: string
  format: 'pdf' | 'excel'
  employeeId?: number
}

export interface TimesheetData {
  employeeId: number
  employeeName: string
  year: number
  month: number
  startDate: string
  endDate: string
  attendanceRecords: Array<{
    date: string
    dayOfWeek: string
    checkIn: string | null
    checkOut: string | null
    workingHours: number
    status: string
    remarks?: string
  }>
  summary: {
    totalDays: number
    presentDays: number
    absentDays: number
    halfDays: number
    weekOffs: number
    holidays: number
    totalWorkingHours: number
  }
}

class TimesheetService {
  private readonly basePath = '/attendance/timesheets'

  /**
   * Get timesheet data for a specific month
   */
  async getTimesheetData(year: number, month: number, employeeId?: number): Promise<TimesheetData> {
    const response = await api.get(`${this.basePath}`, {
      params: {
        year,
        month,
        employee_id: employeeId,
      }
    })
    return response.data?.data || response.data
  }

  /**
   * Export timesheet as PDF or Excel
   */
  async exportTimesheet(request: TimesheetExportRequest): Promise<Blob> {
    const response = await api.get(`${this.basePath}/export`, {
      params: {
        year: request.year,
        month: request.month,
        format: request.format,
        employee_id: request.employeeId,
      },
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * Export timesheet and send via email
   */
  async shareTimesheetEmail(request: TimesheetShareRequest): Promise<{ message: string }> {
    const response = await api.post(`${this.basePath}/share-email`, {
      year: request.year,
      month: request.month,
      email: request.email,
      format: request.format,
      employee_id: request.employeeId,
    })
    return response.data?.data || response.data
  }

  /**
   * Generate PDF for timesheet
   */
  async generatePDF(year: number, month: number, employeeId?: number): Promise<Blob> {
    return this.exportTimesheet({
      year,
      month,
      format: 'pdf',
      employeeId
    })
  }

  /**
   * Generate Excel for timesheet
   */
  async generateExcel(year: number, month: number, employeeId?: number): Promise<Blob> {
    return this.exportTimesheet({
      year,
      month,
      format: 'excel',
      employeeId
    })
  }
}

export const timesheetService = new TimesheetService()
