import api from './api'

// ── Types ────────────────────────────────────────────────

export interface JobPosting {
  id: number
  title: string
  job_code: string
  description: string
  requirements?: string
  responsibilities?: string
  department?: string
  location?: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance'
  experience_level: 'entry' | 'mid' | 'senior' | 'executive' | 'intern'
  min_salary?: number
  max_salary?: number
  salary_currency: string
  application_deadline?: string
  vacancies: number
  status: 'draft' | 'published' | 'closed' | 'cancelled'
  is_remote: boolean
  required_skills?: string[]
  preferred_skills?: string[]
  benefits?: string[]
  views_count: number
  applications_count: number
  published_at?: string
  closed_at?: string
  created_at: string
  updated_at: string
}

export interface JobApplication {
  id: number
  job_posting_id: number
  applicant_name: string
  applicant_email: string
  applicant_phone?: string
  cover_letter?: string
  resume_path?: string
  portfolio_url?: string
  additional_documents?: Record<string, unknown>[]
  status:
    | 'submitted'
    | 'under_review'
    | 'shortlisted'
    | 'interview_scheduled'
    | 'interviewed'
    | 'offered'
    | 'hired'
    | 'rejected'
    | 'withdrawn'
  interview_stages?: InterviewStage[]
  rating?: number
  feedback?: string
  rejection_reason?: string
  submitted_at: string
  last_updated_at?: string
  reviewed_by?: number
  reviewed_at?: string
  source: string
  custom_fields?: Record<string, unknown>
  referrer_name?: string
  referrer_email?: string
  created_at: string
  updated_at: string
  job_posting?: JobPosting
}

export interface InterviewStage {
  stage: string
  date?: string
  interviewer?: string
  status: 'pending' | 'completed' | 'cancelled'
  notes?: string
}

export interface RecruitmentStats {
  total_jobs: number
  open_jobs: number
  applications_this_month: number
  hired_this_month: number
}

export interface JobBoardIntegration {
  id: number
  platform: string
  display_name: string
  credentials?: Record<string, string>
  webhook_secret?: string
  is_active: boolean
  last_synced_at?: string
  created_at: string
  updated_at: string
}

export interface BoardPosting {
  id: number
  platform: string
  external_id?: string
  status: 'pending' | 'published' | 'failed' | 'removed'
  published_at?: string
  error_message?: string
}

export interface PublishResult {
  success: { platform: string; external_id: string }[]
  failed: { platform: string; error: string }[]
}

// ── Service ──────────────────────────────────────────────

export const recruitmentService = {
  // Job Postings
  getJobs: (params?: Record<string, unknown>) =>
    api.get<{ data: JobPosting[]; meta?: { total: number } }>('/recruitment/jobs', { params }),

  createJob: (data: Partial<JobPosting>) =>
    api.post<{ data: JobPosting }>('/recruitment/jobs', data),

  getJob: (id: number) =>
    api.get<{ data: JobPosting }>(`/recruitment/jobs/${id}`),

  updateJob: (id: number, data: Partial<JobPosting>) =>
    api.put<{ data: JobPosting }>(`/recruitment/jobs/${id}`, data),

  deleteJob: (id: number) =>
    api.delete(`/recruitment/jobs/${id}`),

  publishJob: (id: number) =>
    api.post<{ data: JobPosting }>(`/recruitment/jobs/${id}/publish`),

  closeJob: (id: number) =>
    api.post<{ data: JobPosting }>(`/recruitment/jobs/${id}/close`),

  getJobApplications: (id: number, params?: Record<string, unknown>) =>
    api.get<{ data: JobApplication[] }>(`/recruitment/jobs/${id}/applications`, { params }),

  getStats: () =>
    api.get<{ data: RecruitmentStats }>('/recruitment/stats'),

  publishToBoards: (id: number, integrationIds: number[]) =>
    api.post<{ data: PublishResult }>(`/recruitment/jobs/${id}/publish-to-boards`, {
      integration_ids: integrationIds,
    }),

  getBoardPostings: (id: number) =>
    api.get<{ data: BoardPosting[] }>(`/recruitment/jobs/${id}/board-postings`),

  // Applications
  getApplications: (params?: Record<string, unknown>) =>
    api.get<{ data: JobApplication[]; meta?: { total: number } }>('/recruitment/applications', { params }),

  getApplication: (id: number) =>
    api.get<{ data: JobApplication }>(`/recruitment/applications/${id}`),

  updateStatus: (id: number, status: string) =>
    api.put<{ data: JobApplication }>(`/recruitment/applications/${id}/status`, { status }),

  rateApplication: (id: number, data: { rating: number; feedback?: string }) =>
    api.post<{ data: JobApplication }>(`/recruitment/applications/${id}/rate`, data),

  rejectApplication: (id: number, reason: string) =>
    api.post<{ data: JobApplication }>(`/recruitment/applications/${id}/reject`, {
      rejection_reason: reason,
    }),

  shortlistApplication: (id: number) =>
    api.post<{ data: JobApplication }>(`/recruitment/applications/${id}/shortlist`),

  scheduleInterview: (id: number, data: { date: string; interviewer?: string; notes?: string }) =>
    api.post<{ data: JobApplication }>(`/recruitment/applications/${id}/schedule-interview`, data),

  makeOffer: (id: number) =>
    api.post<{ data: JobApplication }>(`/recruitment/applications/${id}/make-offer`),

  hireApplicant: (id: number) =>
    api.post<{ data: JobApplication }>(`/recruitment/applications/${id}/hire`),

  // Job Board Integrations
  getIntegrations: () =>
    api.get<{ data: JobBoardIntegration[] }>('/recruitment/job-board/integrations'),

  createIntegration: (data: Partial<JobBoardIntegration>) =>
    api.post<{ data: JobBoardIntegration }>('/recruitment/job-board/integrations', data),

  updateIntegration: (id: number, data: Partial<JobBoardIntegration>) =>
    api.put<{ data: JobBoardIntegration }>(`/recruitment/job-board/integrations/${id}`, data),

  deleteIntegration: (id: number) =>
    api.delete(`/recruitment/job-board/integrations/${id}`),

  testIntegration: (id: number) =>
    api.post<{ data: { success: boolean; message: string } }>(
      `/recruitment/job-board/integrations/${id}/test`,
    ),

  toggleIntegration: (id: number) =>
    api.post<{ data: JobBoardIntegration }>(
      `/recruitment/job-board/integrations/${id}/toggle`,
    ),
}
