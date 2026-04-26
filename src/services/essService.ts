import api from './api'

// ── Types ────────────────────────────────────────────────

export interface HrTicket {
  id: number
  ticket_number: string
  category: 'leave' | 'payroll' | 'attendance' | 'policy' | 'general' | 'other'
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: number
  resolution_notes?: string
  resolved_at?: string
  closed_at?: string
  created_at: string
  updated_at: string
  comments?: HrTicketComment[]
}

export interface HrTicketComment {
  id: number
  ticket_id: number
  user_id: number
  comment: string
  is_internal: boolean
  created_at: string
  user?: { id: number; name: string }
}

export interface AppNotification {
  id: number
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  read_at?: string
  created_at: string
}

export interface EssProfile {
  id: number
  name: string
  email: string
  avatar_url?: string | null
  banner_url?: string | null
  phone?: string | null
  address?: string | null
  nationality?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relationship?: string | null
  employee?: {
    id: number
    employee_id: string
    department?: string | null
    designation?: string | null
    role?: string | null
    team?: string | null
    location?: string | null
    hire_date?: string | null
    employment_type?: string | null
    status?: string | null
    gender?: string | null
    date_of_birth?: string | null
    working_days?: string[] | null
  } | null
}

// ── Service ──────────────────────────────────────────────

export const essService = {
  // Tickets
  getTickets: (params?: Record<string, string>) =>
    api.get<{ data: HrTicket[] }>('/ess/tickets', { params }),

  createTicket: (data: { category: string; subject: string; description: string; priority?: string }) =>
    api.post<{ data: HrTicket }>('/ess/tickets', data),

  getTicket: (id: number) =>
    api.get<{ data: HrTicket }>(`/ess/tickets/${id}`),

  updateTicket: (id: number, data: Partial<HrTicket>) =>
    api.put<{ data: HrTicket }>(`/ess/tickets/${id}`, data),

  addComment: (id: number, comment: string) =>
    api.post<{ data: HrTicketComment }>(`/ess/tickets/${id}/comments`, { comment }),

  closeTicket: (id: number) =>
    api.post<{ data: HrTicket }>(`/ess/tickets/${id}/close`),

  // Notifications
  getNotifications: () =>
    api.get<{ data: AppNotification[] }>('/ess/notifications'),

  getUnreadCount: () =>
    api.get<{ count: number }>('/ess/notifications/unread-count'),

  markRead: (id: number) =>
    api.post(`/ess/notifications/${id}/read`),

  markAllRead: () =>
    api.post('/ess/notifications/read-all'),

  // Profile
  getProfile: () =>
    api.get<{ data: EssProfile }>('/ess/profile'),

  updateProfile: (data: Partial<EssProfile>) =>
    api.put<{ data: EssProfile }>('/ess/profile', data),

  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return api.post<{ avatar_url: string }>('/ess/profile/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },

  uploadBanner: (file: File) => {
    const fd = new FormData()
    fd.append('banner', file)
    return api.post<{ banner_url: string }>('/ess/profile/banner', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}
