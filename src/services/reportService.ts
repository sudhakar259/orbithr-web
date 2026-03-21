import api from './api'

export interface ReportFilter {
  start_date?: string
  end_date?: string
  department_id?: number
  employee_id?: number
}

export interface AttendanceReportRow {
  employee_id: number
  name: string
  department: string
  total_days: number
  present: number
  absent: number
  late: number
  on_leave: number
  attendance_rate: number
}

export interface PayrollReportRow {
  month: string
  total_employees: number
  total_gross: number
  total_deductions: number
  total_net: number
  average_salary: number
}

export interface HeadcountReportRow {
  department: string
  total: number
  active: number
  inactive: number
  male: number
  female: number
  full_time: number
  part_time: number
}

export interface AttritionReportRow {
  month: string
  department: string
  count: number
  reason: string
  attrition_rate: number
}

export interface PerformanceReportRow {
  employee_id: number
  name: string
  department: string
  appraisal_score: number
  rating: string
  cycle: string
}

export interface ReportTemplate {
  id: number
  name: string
  description?: string
  report_type: string
  config: Record<string, unknown>
  filters: Record<string, unknown>
  columns: string[]
  is_shared: boolean
  created_at: string
  updated_at: string
}

export interface ReportExport {
  id: number
  report_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_path?: string
  error_message?: string
  created_at: string
}

export const reportService = {
  getAttendanceReport: (filters?: ReportFilter) =>
    api.get<{ data: AttendanceReportRow[] }>('/reports/attendance', { params: filters }),

  getPayrollReport: (filters?: ReportFilter) =>
    api.get<{ data: PayrollReportRow[] }>('/reports/payroll', { params: filters }),

  getHeadcountReport: (filters?: ReportFilter) =>
    api.get<{ data: HeadcountReportRow[] }>('/reports/headcount', { params: filters }),

  getAttritionReport: (filters?: ReportFilter) =>
    api.get<{ data: AttritionReportRow[] }>('/reports/attrition', { params: filters }),

  getPerformanceReport: (filters?: ReportFilter) =>
    api.get<{ data: PerformanceReportRow[] }>('/reports/performance', { params: filters }),

  getTemplates: () => api.get<{ data: ReportTemplate[] }>('/reports/templates'),

  createTemplate: (data: Partial<ReportTemplate>) =>
    api.post<{ data: ReportTemplate }>('/reports/templates', data),

  updateTemplate: (id: number, data: Partial<ReportTemplate>) =>
    api.put<{ data: ReportTemplate }>(`/reports/templates/${id}`, data),

  deleteTemplate: (id: number) => api.delete(`/reports/templates/${id}`),

  runCustomReport: (templateId: number, filters?: ReportFilter) =>
    api.post<{ data: Record<string, unknown>[] }>(`/reports/custom/${templateId}`, filters),

  exportReport: (type: string, filters?: ReportFilter) =>
    api.post<{ data: ReportExport }>('/reports/export', { type, ...filters }),

  getExports: () => api.get<{ data: ReportExport[] }>('/reports/exports'),
}
