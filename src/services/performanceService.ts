import api from './api'

// ── Interfaces ──────────────────────────────────────────

export interface GoalKeyResult {
  id: number
  goal_id: number
  title: string
  description?: string
  target_value: number
  current_value: number
  unit?: string
  weightage: number
  progress: number
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk'
  due_date?: string
}

export interface EmployeeGoal {
  id: number
  goal_id: number
  employee_id: number
  assigned_by?: number
  assigned_at?: string
  manager_approved: boolean
  manager_approved_by?: number
  manager_approved_at?: string
  employee_notes?: string
  status: 'assigned' | 'in_progress' | 'completed' | 'rejected'
  employee?: { id: number; first_name: string; last_name?: string; email: string }
}

export interface Goal {
  id: number
  title: string
  description?: string
  type: 'okr' | 'kpi' | 'individual' | 'team' | 'company'
  level: 'individual' | 'team' | 'company'
  framework: 'okr' | 'smart' | 'kpi'
  start_date: string
  end_date: string
  weightage: number
  progress: number
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold'
  appraisal_cycle_id?: number
  parent_goal_id?: number
  is_carry_forward: boolean
  metadata?: Record<string, unknown>
  key_results?: GoalKeyResult[]
  employee_goals?: EmployeeGoal[]
  creator?: { id: number; name: string }
  owner?: { id: number; name: string }
  created_at?: string
  updated_at?: string
}

export interface AppraisalCycleStage {
  id: number
  appraisal_cycle_id: number
  name: string
  stage_type:
    | 'goal_setting'
    | 'self_review'
    | 'manager_review'
    | 'calibration'
    | 'final_review'
    | 'acknowledgment'
  order: number
  start_date?: string
  end_date?: string
  is_active: boolean
  is_locked: boolean
  instructions?: string
}

export interface AppraisalCycle {
  id: number
  name: string
  description?: string
  cycle_type: 'quarterly' | 'half_yearly' | 'yearly' | 'custom'
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'locked' | 'completed' | 'archived'
  is_goal_setting_enabled: boolean
  is_self_review_enabled: boolean
  is_manager_review_enabled: boolean
  is_360_feedback_enabled: boolean
  rating_scale: number
  self_review_weight: number
  manager_review_weight: number
  feedback_weight: number
  goal_weight: number
  settings?: Record<string, unknown>
  stages?: AppraisalCycleStage[]
  employee_appraisals_count?: number
  status_counts?: Record<string, number>
  creator?: { id: number; name: string }
  created_at?: string
}

export interface ReviewRating {
  id: number
  review_id: number
  category: string
  category_label: string
  rating: number
  max_rating: number
  weightage: number
  comments?: string
}

export interface Review {
  id: number
  employee_appraisal_id: number
  reviewer_id: number
  reviewee_id: number
  review_type: 'self' | 'manager' | 'hr' | 'peer' | 'subordinate'
  status: 'draft' | 'submitted' | 'locked'
  overall_rating?: number
  overall_comments?: string
  strengths?: string
  improvement_areas?: string
  development_plan?: string
  submitted_at?: string
  ratings?: ReviewRating[]
  reviewer?: { id: number; name: string }
}

export interface PerformanceScore {
  id: number
  employee_appraisal_id: number
  employee_id: number
  goal_score?: number
  self_review_score?: number
  manager_review_score?: number
  feedback_score?: number
  final_score?: number
  rating_label?: string
  percentile?: number
  rank_in_team?: number
  calculated_at?: string
}

export interface EmployeeAppraisal {
  id: number
  appraisal_cycle_id: number
  employee_id: number
  manager_id?: number
  hr_reviewer_id?: number
  status:
    | 'not_started'
    | 'in_progress'
    | 'self_review_done'
    | 'manager_review_done'
    | 'calibration'
    | 'completed'
    | 'acknowledged'
  current_stage?: string
  self_review_submitted_at?: string
  manager_review_submitted_at?: string
  final_score?: number
  final_rating?: string
  employee_acknowledged: boolean
  acknowledged_at?: string
  notes?: string
  appraisal_cycle?: AppraisalCycle
  employee?: { id: number; first_name: string; last_name?: string; email: string; department?: string }
  manager?: { id: number; name: string }
  reviews?: Review[]
  performance_score?: PerformanceScore
  feedback_requests?: FeedbackRequest[]
}

export interface FeedbackQuestion {
  id: number
  question: string
  question_type: 'rating' | 'text' | 'multiple_choice' | 'yes_no'
  options?: string[]
  is_required: boolean
  order: number
  category?: string
  is_active: boolean
  appraisal_cycle_id?: number
}

export interface FeedbackResponse {
  id: number
  feedback_request_id: number
  question_id: number
  answer?: string
  rating?: number
}

export interface FeedbackRequest {
  id: number
  employee_appraisal_id: number
  requestee_id: number
  reviewer_id: number
  relationship: 'peer' | 'subordinate' | 'cross_functional' | 'manager'
  is_anonymous: boolean
  status: 'pending' | 'submitted' | 'declined' | 'expired'
  requested_at?: string
  due_date?: string
  submitted_at?: string
  responses?: FeedbackResponse[]
  requestee?: { id: number; first_name: string; last_name?: string }
  reviewer?: { id: number; name: string }
  employee_appraisal?: EmployeeAppraisal
}

export interface PerformanceDashboard {
  active_goals: number
  pending_appraisals: number
  feedback_requests: number
  avg_team_score: number | null
  active_cycle: { id: number; name: string; end_date: string } | null
  recent_goals: Goal[]
  upcoming_deadlines: AppraisalCycleStage[]
}

export interface TeamSummary {
  total_employees: number
  completed: number
  in_progress: number
  not_started: number
  average_score: number | null
  highest_score: number | null
  lowest_score: number | null
  rating_distribution: Record<string, number>
}

// ── Service ─────────────────────────────────────────────

class PerformanceService {
  // Dashboard
  async getDashboard(): Promise<PerformanceDashboard> {
    const response = await api.get('/performance/dashboard')
    return response.data
  }

  // Goals
  async getGoals(params?: {
    status?: string
    type?: string
    appraisal_cycle_id?: number
    level?: string
    page?: number
  }): Promise<{ data: Goal[]; current_page: number; last_page: number; total: number }> {
    const response = await api.get('/performance/goals', { params })
    return response.data
  }

  async getGoal(id: number): Promise<Goal> {
    const response = await api.get(`/performance/goals/${id}`)
    return response.data
  }

  async createGoal(
    data: Partial<Goal> & { key_results?: Partial<GoalKeyResult>[] },
  ): Promise<Goal> {
    const response = await api.post('/performance/goals', data)
    return response.data
  }

  async updateGoal(id: number, data: Partial<Goal>): Promise<Goal> {
    const response = await api.put(`/performance/goals/${id}`, data)
    return response.data
  }

  async deleteGoal(id: number): Promise<void> {
    await api.delete(`/performance/goals/${id}`)
  }

  async publishGoal(id: number): Promise<Goal> {
    const response = await api.post(`/performance/goals/${id}/publish`)
    return response.data
  }

  async completeGoal(id: number): Promise<Goal> {
    const response = await api.post(`/performance/goals/${id}/complete`)
    return response.data
  }

  async assignGoal(id: number, employeeIds: number[]): Promise<{ message: string; goal: Goal }> {
    const response = await api.post(`/performance/goals/${id}/assign`, {
      employee_ids: employeeIds,
    })
    return response.data
  }

  async approveGoal(id: number, employeeId: number): Promise<EmployeeGoal> {
    const response = await api.post(`/performance/goals/${id}/approve`, {
      employee_id: employeeId,
    })
    return response.data
  }

  async addKeyResult(goalId: number, data: Partial<GoalKeyResult>): Promise<GoalKeyResult> {
    const response = await api.post(`/performance/goals/${goalId}/key-results`, data)
    return response.data
  }

  async updateKeyResult(
    goalId: number,
    krId: number,
    data: Partial<GoalKeyResult>,
  ): Promise<GoalKeyResult> {
    const response = await api.put(`/performance/goals/${goalId}/key-results/${krId}`, data)
    return response.data
  }

  async logProgress(
    goalId: number,
    data: { key_result_id?: number; new_value: number; notes?: string },
  ): Promise<void> {
    await api.post(`/performance/goals/${goalId}/progress`, data)
  }

  async getProgressLogs(
    goalId: number,
  ): Promise<{
    data: Array<{
      id: number
      previous_value: number
      new_value: number
      progress_percent: number
      notes?: string
      created_at: string
      logged_by_user?: { id: number; name: string }
      key_result?: GoalKeyResult
    }>
  }> {
    const response = await api.get(`/performance/goals/${goalId}/progress-logs`)
    return response.data
  }

  async cloneGoal(id: number): Promise<Goal> {
    const response = await api.post(`/performance/goals/${id}/clone`)
    return response.data
  }

  async getMyGoals(params?: { page?: number }): Promise<{ data: Goal[] }> {
    const response = await api.get('/performance/my-goals', { params })
    return response.data
  }

  // Appraisal Cycles
  async getCycles(params?: {
    status?: string
    page?: number
  }): Promise<{ data: AppraisalCycle[]; current_page: number; last_page: number; total: number }> {
    const response = await api.get('/performance/cycles', { params })
    return response.data
  }

  async getCycle(id: number): Promise<AppraisalCycle> {
    const response = await api.get(`/performance/cycles/${id}`)
    return response.data
  }

  async createCycle(
    data: Partial<AppraisalCycle> & { stages?: Partial<AppraisalCycleStage>[] },
  ): Promise<AppraisalCycle> {
    const response = await api.post('/performance/cycles', data)
    return response.data
  }

  async updateCycle(id: number, data: Partial<AppraisalCycle>): Promise<AppraisalCycle> {
    const response = await api.put(`/performance/cycles/${id}`, data)
    return response.data
  }

  async deleteCycle(id: number): Promise<void> {
    await api.delete(`/performance/cycles/${id}`)
  }

  async activateCycle(id: number): Promise<AppraisalCycle> {
    const response = await api.post(`/performance/cycles/${id}/activate`)
    return response.data
  }

  async lockCycle(id: number): Promise<AppraisalCycle> {
    const response = await api.post(`/performance/cycles/${id}/lock`)
    return response.data
  }

  async completeCycle(id: number): Promise<AppraisalCycle> {
    const response = await api.post(`/performance/cycles/${id}/complete`)
    return response.data
  }

  async initializeCycle(
    id: number,
    employeeIds?: number[],
  ): Promise<{ message: string; total_appraisals: number }> {
    const response = await api.post(`/performance/cycles/${id}/initialize`, {
      employee_ids: employeeIds,
    })
    return response.data
  }

  async getCycleAppraisals(
    cycleId: number,
    params?: { page?: number },
  ): Promise<{ data: EmployeeAppraisal[] }> {
    const response = await api.get(`/performance/cycles/${cycleId}/appraisals`, { params })
    return response.data
  }

  async activateStage(cycleId: number, stageId: number): Promise<AppraisalCycleStage> {
    const response = await api.post(
      `/performance/cycles/${cycleId}/stages/${stageId}/activate`,
    )
    return response.data
  }

  // Appraisals & Reviews
  async getAppraisals(params?: {
    status?: string
    appraisal_cycle_id?: number
    page?: number
  }): Promise<{ data: EmployeeAppraisal[]; current_page: number; last_page: number }> {
    const response = await api.get('/performance/appraisals', { params })
    return response.data
  }

  async getAppraisal(id: number): Promise<EmployeeAppraisal> {
    const response = await api.get(`/performance/appraisals/${id}`)
    return response.data
  }

  async submitSelfReview(
    appraisalId: number,
    data: {
      ratings: Array<{
        category: string
        category_label: string
        rating: number
        comments?: string
        weightage?: number
      }>
      overall_comments?: string
      strengths?: string
      improvement_areas?: string
      development_plan?: string
    },
  ): Promise<Review> {
    const response = await api.post(
      `/performance/appraisals/${appraisalId}/self-review`,
      data,
    )
    return response.data
  }

  async submitManagerReview(
    appraisalId: number,
    data: {
      ratings: Array<{
        category: string
        category_label: string
        rating: number
        comments?: string
        weightage?: number
      }>
      overall_comments?: string
      strengths?: string
      improvement_areas?: string
      development_plan?: string
    },
  ): Promise<Review> {
    const response = await api.post(
      `/performance/appraisals/${appraisalId}/manager-review`,
      data,
    )
    return response.data
  }

  async acknowledgeAppraisal(id: number): Promise<EmployeeAppraisal> {
    const response = await api.post(`/performance/appraisals/${id}/acknowledge`)
    return response.data
  }

  async getAppraisalReviews(appraisalId: number): Promise<Review[]> {
    const response = await api.get(`/performance/appraisals/${appraisalId}/reviews`)
    return response.data
  }

  async getReview(id: number): Promise<Review> {
    const response = await api.get(`/performance/reviews/${id}`)
    return response.data
  }

  async updateReview(id: number, data: Partial<Review>): Promise<Review> {
    const response = await api.put(`/performance/reviews/${id}`, data)
    return response.data
  }

  async submitReview(id: number): Promise<Review> {
    const response = await api.post(`/performance/reviews/${id}/submit`)
    return response.data
  }

  async getTeamAppraisals(params?: {
    appraisal_cycle_id?: number
    status?: string
    page?: number
  }): Promise<{ data: EmployeeAppraisal[] }> {
    const response = await api.get('/performance/team-appraisals', { params })
    return response.data
  }

  // 360 Feedback
  async getFeedbackQuestions(params?: {
    appraisal_cycle_id?: number
  }): Promise<FeedbackQuestion[]> {
    const response = await api.get('/performance/feedback/questions', { params })
    return response.data
  }

  async createFeedbackQuestion(data: Partial<FeedbackQuestion>): Promise<FeedbackQuestion> {
    const response = await api.post('/performance/feedback/questions', data)
    return response.data
  }

  async updateFeedbackQuestion(
    id: number,
    data: Partial<FeedbackQuestion>,
  ): Promise<FeedbackQuestion> {
    const response = await api.put(`/performance/feedback/questions/${id}`, data)
    return response.data
  }

  async deleteFeedbackQuestion(id: number): Promise<void> {
    await api.delete(`/performance/feedback/questions/${id}`)
  }

  async createFeedbackRequest(data: {
    appraisal_id: number
    reviewer_ids: number[]
    relationship: string
    is_anonymous?: boolean
    due_date?: string
  }): Promise<{ message: string }> {
    const response = await api.post('/performance/feedback/requests', data)
    return response.data
  }

  async getReceivedFeedbackRequests(params?: {
    page?: number
  }): Promise<{ data: FeedbackRequest[] }> {
    const response = await api.get('/performance/feedback/requests', { params })
    return response.data
  }

  async getPendingFeedbackRequests(): Promise<FeedbackRequest[]> {
    const response = await api.get('/performance/feedback/my-requests')
    return response.data
  }

  async submitFeedback(
    requestId: number,
    data: { responses: Array<{ question_id: number; answer?: string; rating?: number }> },
  ): Promise<FeedbackRequest> {
    const response = await api.post(
      `/performance/feedback/requests/${requestId}/submit`,
      data,
    )
    return response.data
  }

  async declineFeedbackRequest(requestId: number): Promise<FeedbackRequest> {
    const response = await api.post(
      `/performance/feedback/requests/${requestId}/decline`,
    )
    return response.data
  }

  // Reports
  async getIndividualReport(
    employeeId: number,
  ): Promise<{
    employee: Record<string, unknown>
    appraisals: EmployeeAppraisal[]
    goals: Goal[]
    summary: Record<string, unknown>
  }> {
    const response = await api.get(`/performance/reports/individual/${employeeId}`)
    return response.data
  }

  async getTeamReport(params?: {
    appraisal_cycle_id?: number
  }): Promise<{ cycle: AppraisalCycle; summary: TeamSummary }> {
    const response = await api.get('/performance/reports/team', { params })
    return response.data
  }

  async getCycleSummary(
    cycleId: number,
  ): Promise<{ cycle: AppraisalCycle; summary: TeamSummary; appraisals: EmployeeAppraisal[] }> {
    const response = await api.get(`/performance/reports/cycle/${cycleId}`)
    return response.data
  }

  async calculateCycleScores(
    cycleId: number,
  ): Promise<{ message: string; summary: TeamSummary }> {
    const response = await api.post(`/performance/reports/cycle/${cycleId}/calculate`)
    return response.data
  }
}

export const performanceService = new PerformanceService()
