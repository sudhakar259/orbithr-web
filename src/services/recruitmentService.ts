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
  pipeline_stage_id?: number | null
  candidate_id?: number | null
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

export interface RecruitmentAnalytics {
  funnel: { status: string; count: number }[]
  sources: { source: string; count: number }[]
  time_to_hire_days: number
  monthly_trend: { month: string; count: number }[]
  top_jobs: {
    id: number
    title: string
    department: string
    status: string
    applications_count: number
  }[]
  conversion: {
    total_applications: number
    shortlist_rate: number
    offer_rate: number
    hire_rate: number
  }
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

export interface PipelineStage {
  id: number
  pipeline_id: number
  name: string
  color?: string
  order: number
  type: string
  is_terminal: boolean
  created_at: string
  updated_at: string
}

export interface CandidatePipeline {
  id: number
  name: string
  description?: string
  is_default: boolean
  stages?: PipelineStage[]
  created_at: string
  updated_at: string
}

export interface InterviewInterviewer {
  id: number
  interview_id: number
  user_id: number
  status: string
  feedback_notes?: string
  rating?: number
  recommendation?: string
  user?: { id: number; name: string }
}

export interface Interview {
  id: number
  application_id: number
  job_posting_id?: number
  title: string
  interview_type: string
  scheduled_at: string
  duration_minutes: number
  location?: string
  meeting_link?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  created_by?: number
  created_at: string
  updated_at: string
  interviewers?: InterviewInterviewer[]
}

export interface Offer {
  id: number
  application_id?: number
  job_posting_id?: number
  template_id?: number
  candidate_name: string
  position: string
  salary?: number
  joining_date?: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'withdrawn'
  offer_pdf_path?: string
  sent_at?: string
  responded_at?: string
  expires_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface OfferTemplate {
  id: number
  name: string
  content: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CandidateSkill {
  id: number
  candidate_id: number
  skill: string
  proficiency_level: string
  years_experience?: number
}

export interface Candidate {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  location?: string
  linkedin_url?: string
  portfolio_url?: string
  resume_path?: string
  current_company?: string
  current_title?: string
  total_experience_years?: number
  expected_salary?: number
  notice_period_days?: number
  source?: string
  status: 'active' | 'passive' | 'hired' | 'blacklisted'
  notes?: string
  created_at: string
  updated_at: string
  skills?: CandidateSkill[]
  applications?: JobApplication[]
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

  getAnalytics: () =>
    api.get<{ data: RecruitmentAnalytics }>('/recruitment/analytics'),

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

  // Pipelines
  getPipelines: () =>
    api.get<{ data: CandidatePipeline[] }>('/recruitment/pipelines'),

  createPipeline: (data: { name: string; description?: string; is_default?: boolean }) =>
    api.post<{ data: CandidatePipeline }>('/recruitment/pipelines', data),

  updatePipeline: (id: number, data: { name?: string; description?: string; is_default?: boolean }) =>
    api.put<{ data: CandidatePipeline }>(`/recruitment/pipelines/${id}`, data),

  deletePipeline: (id: number) =>
    api.delete(`/recruitment/pipelines/${id}`),

  addPipelineStage: (pipelineId: number, data: { name: string; color?: string; type?: string }) =>
    api.post<{ data: PipelineStage }>(`/recruitment/pipelines/${pipelineId}/stages`, data),

  deletePipelineStage: (pipelineId: number, stageId: number) =>
    api.delete(`/recruitment/pipelines/${pipelineId}/stages/${stageId}`),

  moveApplicationStage: (appId: number, stageId: number | null) =>
    api.post<{ data: JobApplication }>(`/recruitment/applications/${appId}/move-stage`, { stage_id: stageId }),

  // Interviews
  getInterviews: (params?: Record<string, string>) =>
    api.get<{ data: Interview[] }>('/recruitment/interviews', { params }),

  createInterview: (data: {
    application_id?: number
    title: string
    interview_type: string
    scheduled_at: string
    duration_minutes?: number
    location?: string
    meeting_link?: string
    interviewer_ids?: number[]
  }) => api.post<{ data: Interview }>('/recruitment/interviews', data),

  updateInterview: (id: number, data: Partial<Interview>) =>
    api.put<{ data: Interview }>(`/recruitment/interviews/${id}`, data),

  completeInterview: (id: number) =>
    api.post<{ data: Interview }>(`/recruitment/interviews/${id}/complete`),

  cancelInterview: (id: number, reason?: string) =>
    api.post<{ data: Interview }>(`/recruitment/interviews/${id}/cancel`, { reason }),

  submitInterviewFeedback: (id: number, data: { rating: number; recommendation: string; feedback_notes?: string }) =>
    api.post<{ data: InterviewInterviewer }>(`/recruitment/interviews/${id}/feedback`, data),

  // Offers
  getOffers: (params?: Record<string, string>) =>
    api.get<{ data: Offer[] }>('/recruitment/offers', { params }),

  createOffer: (data: {
    application_id?: number
    candidate_name: string
    position: string
    salary?: number
    joining_date?: string
    expires_at?: string
    notes?: string
    template_id?: number
  }) => api.post<{ data: Offer }>('/recruitment/offers', data),

  updateOffer: (id: number, data: Partial<Offer>) =>
    api.put<{ data: Offer }>(`/recruitment/offers/${id}`, data),

  sendOffer: (id: number) =>
    api.post<{ data: Offer }>(`/recruitment/offers/${id}/send`),

  acceptOffer: (id: number) =>
    api.post<{ data: Offer }>(`/recruitment/offers/${id}/accept`),

  rejectOffer: (id: number, reason?: string) =>
    api.post<{ data: Offer }>(`/recruitment/offers/${id}/reject`, { reason }),

  // Offer Templates
  getOfferTemplates: () =>
    api.get<{ data: OfferTemplate[] }>('/recruitment/offer-templates'),

  createOfferTemplate: (data: { name: string; content: string; is_default?: boolean }) =>
    api.post<{ data: OfferTemplate }>('/recruitment/offer-templates', data),

  updateOfferTemplate: (id: number, data: { name?: string; content?: string; is_default?: boolean }) =>
    api.put<{ data: OfferTemplate }>(`/recruitment/offer-templates/${id}`, data),

  deleteOfferTemplate: (id: number) =>
    api.delete(`/recruitment/offer-templates/${id}`),

  // Candidates
  getCandidates: (params?: Record<string, string>) =>
    api.get<{ data: Candidate[] }>('/recruitment/candidates', { params }),

  createCandidate: (data: Partial<Candidate> & { skills?: Array<{ skill: string; proficiency_level: string }> }) =>
    api.post<{ data: Candidate }>('/recruitment/candidates', data),

  getCandidate: (id: number) =>
    api.get<{ data: Candidate }>(`/recruitment/candidates/${id}`),

  updateCandidate: (id: number, data: Partial<Candidate> & { skills?: Array<{ skill: string; proficiency_level: string }> }) =>
    api.put<{ data: Candidate }>(`/recruitment/candidates/${id}`, data),

  deleteCandidate: (id: number) =>
    api.delete(`/recruitment/candidates/${id}`),

  attachCandidateTags: (id: number, tagIds: number[]) =>
    api.post(`/recruitment/candidates/${id}/tags`, { tag_ids: tagIds }),

  linkCandidateFromApplication: (appId: number, candidateId?: number) =>
    api.post(`/recruitment/applications/${appId}/link-candidate`, { candidate_id: candidateId }),

  parseResume: (appId: number) =>
    api.post<{ data: { name?: string; email?: string; phone?: string; skills?: string[]; raw_text?: string } }>(
      `/recruitment/applications/${appId}/parse-resume`,
    ),
}
