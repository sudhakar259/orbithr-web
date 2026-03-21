import api from './api'

// ── Types ────────────────────────────────────────────────

export interface CourseCategory {
  id: number
  name: string
  slug: string
  description?: string
  color: string
  parent_id?: number | null
  children?: CourseCategory[]
  created_at: string
  updated_at: string
}

export interface Course {
  id: number
  category_id?: number | null
  created_by: number
  title: string
  slug: string
  description?: string
  short_description?: string
  thumbnail_path?: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  duration_minutes: number
  content_type: 'video' | 'pdf' | 'link' | 'mixed' | 'scorm'
  course_type: 'internal' | 'external'
  status: 'draft' | 'published' | 'archived'
  is_mandatory: boolean
  passing_score: number
  tags?: string[]
  external_url?: string
  enrolled_count: number
  completion_count: number
  published_at?: string
  created_at: string
  updated_at: string
  category?: CourseCategory
  creator?: { id: number; name: string }
  contents?: CourseContent[]
  instructors?: CourseInstructor[]
}

export interface CourseContent {
  id: number
  course_id: number
  title: string
  content_type: 'video' | 'pdf' | 'link' | 'text' | 'quiz'
  content_url?: string
  content_text?: string
  file_path?: string
  duration_minutes: number
  order: number
  is_required: boolean
  created_at: string
  updated_at: string
}

export interface CourseInstructor {
  id: number
  course_id: number
  user_id?: number | null
  external_name?: string
  external_email?: string
  bio?: string
  user?: { id: number; name: string; email: string }
  created_at: string
  updated_at: string
}

export interface TrainingProgram {
  id: number
  created_by: number
  title: string
  description?: string
  program_type: 'onboarding' | 'role_based' | 'compliance' | 'custom'
  status: 'draft' | 'active' | 'completed' | 'archived'
  is_mandatory: boolean
  start_date?: string
  end_date?: string
  max_enrollments?: number | null
  enrolled_count: number
  created_at: string
  updated_at: string
  creator?: { id: number; name: string }
  courses?: Course[]
  enrollments?: ProgramEnrollment[]
}

export interface ProgramEnrollment {
  id: number
  program_id: number
  employee_id: number
  enrolled_by: number
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped'
  enrolled_at?: string
  completed_at?: string
  progress_percent: number
  employee?: { id: number; name: string; email: string }
}

export interface SkillCategory {
  id: number
  name: string
  description?: string
  skills_count?: number
  created_at: string
  updated_at: string
}

export interface Skill {
  id: number
  category_id?: number | null
  name: string
  description?: string
  category?: SkillCategory
  created_at: string
  updated_at: string
}

export interface EmployeeSkill {
  id: number
  employee_id: number
  skill_id: number
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  verified_by?: number | null
  verified_at?: string | null
  source: 'manual' | 'course_completion' | 'manager'
  notes?: string
  skill?: Skill
  employee?: { id: number; name: string; email: string }
  verifier?: { id: number; name: string }
  created_at: string
  updated_at: string
}

export interface Certification {
  id: number
  name: string
  issuing_authority: string
  description?: string
  validity_months?: number | null
  skill_id?: number | null
  skill?: Skill
  created_at: string
  updated_at: string
}

export interface EmployeeCertification {
  id: number
  certification_id?: number | null
  employee_id: number
  name?: string
  issuing_authority?: string
  issue_date: string
  expiry_date?: string | null
  certificate_file_path?: string
  status: 'active' | 'expired' | 'pending_renewal'
  is_external: boolean
  course_id?: number | null
  notes?: string
  certification?: Certification
  employee?: { id: number; name: string; email: string }
  course?: { id: number; title: string }
  created_at: string
  updated_at: string
}

export interface CourseProgress {
  id: number
  course_id: number
  employee_id: number
  enrollment_id?: number | null
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percent: number
  last_accessed_at?: string
  completed_at?: string
  score?: number | null
  course?: Course
  created_at: string
  updated_at: string
}

export interface LndDashboard {
  total_courses: number
  total_programs: number
  active_enrollments: number
  completed_courses: number
  total_skills: number
  expiring_certifications: number
  recent_activity: CourseProgress[]
}

export interface CompletionRate {
  id: number
  title: string
  enrolled: number
  completed: number
  in_progress: number
  completion_rate: number
}

export interface SkillGapEntry {
  employee_id: number
  employee_name: string
  employee_email: string
  skills_below_threshold: { skill: string; current_level: string }[]
}

// ── API calls ────────────────────────────────────────────

const lndService = {
  // Dashboard & Reports
  getDashboard: () => api.get<{ data: LndDashboard }>('/lnd/dashboard'),
  getCompletionRates: () => api.get<{ data: CompletionRate[] }>('/lnd/reports/completion-rates'),
  getSkillGap: (threshold?: string) =>
    api.get<{ data: SkillGapEntry[] }>('/lnd/reports/skill-gap', { params: { threshold } }),

  // My Learning
  getMyLearning: () => api.get<{ data: CourseProgress[] }>('/lnd/my-learning'),
  getMySkills: () => api.get<{ data: EmployeeSkill[] }>('/lnd/my-skills'),
  getMyCertifications: () => api.get<{ data: EmployeeCertification[] }>('/lnd/my-certifications'),

  // Course Categories
  getCategories: () => api.get<{ data: CourseCategory[] }>('/lnd/course-categories'),
  createCategory: (data: Partial<CourseCategory>) => api.post('/lnd/course-categories', data),
  updateCategory: (id: number, data: Partial<CourseCategory>) =>
    api.put(`/lnd/course-categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/lnd/course-categories/${id}`),

  // Courses
  getCourses: (params?: Record<string, unknown>) => api.get('/lnd/courses', { params }),
  getCourse: (id: number) => api.get<{ data: Course }>(`/lnd/courses/${id}`),
  createCourse: (data: Partial<Course>) => api.post('/lnd/courses', data),
  updateCourse: (id: number, data: Partial<Course>) => api.put(`/lnd/courses/${id}`, data),
  deleteCourse: (id: number) => api.delete(`/lnd/courses/${id}`),
  publishCourse: (id: number) => api.post(`/lnd/courses/${id}/publish`),
  archiveCourse: (id: number) => api.post(`/lnd/courses/${id}/archive`),

  // Course Content
  addContent: (courseId: number, data: Partial<CourseContent>) =>
    api.post(`/lnd/courses/${courseId}/contents`, data),
  updateContent: (courseId: number, contentId: number, data: Partial<CourseContent>) =>
    api.put(`/lnd/courses/${courseId}/contents/${contentId}`, data),
  removeContent: (courseId: number, contentId: number) =>
    api.delete(`/lnd/courses/${courseId}/contents/${contentId}`),

  // Course Instructors
  addInstructor: (courseId: number, data: Partial<CourseInstructor>) =>
    api.post(`/lnd/courses/${courseId}/instructors`, data),
  removeInstructor: (courseId: number, instructorId: number) =>
    api.delete(`/lnd/courses/${courseId}/instructors/${instructorId}`),

  // Enrollment & Progress
  enrollInCourse: (courseId: number) => api.post(`/lnd/courses/${courseId}/enroll`),
  updateProgress: (
    courseId: number,
    data: { content_id?: number; progress_percent: number; completed?: boolean },
  ) => api.post(`/lnd/courses/${courseId}/progress`, data),
  getCourseProgress: (courseId: number) => api.get(`/lnd/courses/${courseId}/progress`),

  // Training Programs
  getPrograms: (params?: Record<string, unknown>) => api.get('/lnd/programs', { params }),
  getProgram: (id: number) => api.get<{ data: TrainingProgram }>(`/lnd/programs/${id}`),
  createProgram: (data: Partial<TrainingProgram>) => api.post('/lnd/programs', data),
  updateProgram: (id: number, data: Partial<TrainingProgram>) =>
    api.put(`/lnd/programs/${id}`, data),
  deleteProgram: (id: number) => api.delete(`/lnd/programs/${id}`),
  addProgramCourse: (
    programId: number,
    data: { course_id: number; order?: number; is_required?: boolean },
  ) => api.post(`/lnd/programs/${programId}/courses`, data),
  removeProgramCourse: (programId: number, courseId: number) =>
    api.delete(`/lnd/programs/${programId}/courses/${courseId}`),
  enrollInProgram: (programId: number, data: { employee_ids: number[] }) =>
    api.post(`/lnd/programs/${programId}/enroll`, data),
  getProgramEnrollments: (programId: number) => api.get(`/lnd/programs/${programId}/enrollments`),
  activateProgram: (id: number) => api.post(`/lnd/programs/${id}/activate`),
  completeProgram: (id: number) => api.post(`/lnd/programs/${id}/complete`),

  // Skills
  getSkills: (params?: Record<string, unknown>) => api.get<{ data: Skill[] }>('/lnd/skills', { params }),
  getSkill: (id: number) => api.get<{ data: Skill }>(`/lnd/skills/${id}`),
  createSkill: (data: Partial<Skill>) => api.post('/lnd/skills', data),
  updateSkill: (id: number, data: Partial<Skill>) => api.put(`/lnd/skills/${id}`, data),
  deleteSkill: (id: number) => api.delete(`/lnd/skills/${id}`),

  // Skill Categories
  getSkillCategories: () => api.get<{ data: SkillCategory[] }>('/lnd/skill-categories'),
  createSkillCategory: (data: Partial<SkillCategory>) => api.post('/lnd/skill-categories', data),

  // Employee Skills
  getEmployeeSkills: (employeeId: number) =>
    api.get<{ data: EmployeeSkill[] }>(`/lnd/employees/${employeeId}/skills`),
  assignSkill: (
    employeeId: number,
    data: { skill_id: number; proficiency_level?: string; source?: string; notes?: string },
  ) => api.post(`/lnd/employees/${employeeId}/skills`, data),
  updateEmployeeSkill: (employeeId: number, skillId: number, data: Partial<EmployeeSkill>) =>
    api.put(`/lnd/employees/${employeeId}/skills/${skillId}`, data),
  removeEmployeeSkill: (employeeId: number, skillId: number) =>
    api.delete(`/lnd/employees/${employeeId}/skills/${skillId}`),
  verifySkill: (employeeId: number, skillId: number) =>
    api.post(`/lnd/employees/${employeeId}/skills/${skillId}/verify`),

  // Employee Learning Summary
  getEmployeeLearningSummary: (employeeId: number) =>
    api.get(`/lnd/employees/${employeeId}/learning-summary`),

  // Certifications (catalog)
  getCertifications: () => api.get<{ data: Certification[] }>('/lnd/certifications'),
  getCertification: (id: number) => api.get<{ data: Certification }>(`/lnd/certifications/${id}`),
  createCertification: (data: Partial<Certification>) => api.post('/lnd/certifications', data),
  updateCertification: (id: number, data: Partial<Certification>) =>
    api.put(`/lnd/certifications/${id}`, data),
  deleteCertification: (id: number) => api.delete(`/lnd/certifications/${id}`),
  getExpiringSoon: () => api.get<{ data: EmployeeCertification[] }>('/lnd/certifications/expiring-soon'),

  // Employee Certifications
  getEmployeeCertifications: (params?: Record<string, unknown>) =>
    api.get('/lnd/employee-certifications', { params }),
  createEmployeeCertification: (data: Partial<EmployeeCertification>) =>
    api.post('/lnd/employee-certifications', data),
  getEmployeeCertification: (id: number) => api.get(`/lnd/employee-certifications/${id}`),
  updateEmployeeCertification: (id: number, data: Partial<EmployeeCertification>) =>
    api.put(`/lnd/employee-certifications/${id}`, data),
  deleteEmployeeCertification: (id: number) => api.delete(`/lnd/employee-certifications/${id}`),
}

export default lndService
