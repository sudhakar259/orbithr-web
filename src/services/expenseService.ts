import api from './api'

// ── Types ────────────────────────────────────────────────

export interface ExpenseCategory {
  id: number
  name: string
  slug: string
  description?: string
  color?: string
  icon?: string
  is_active: boolean
}

export interface ExpensePolicy {
  id: number
  category_id?: number | null
  name: string
  daily_limit?: number | null
  per_claim_limit?: number | null
  monthly_cap?: number | null
  requires_attachment: boolean
  role?: string | null
  is_active: boolean
  category?: ExpenseCategory
}

export interface ExpenseItem {
  id: number
  expense_claim_id: number
  category_id?: number | null
  date: string
  description: string
  amount: number
  receipt_path?: string | null
  merchant_name?: string | null
  policy_violation?: string | null
  category?: ExpenseCategory
}

export interface ExpenseApproval {
  id: number
  expense_claim_id: number
  approver_id: number
  level: number
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested'
  comments?: string | null
  actioned_at?: string | null
  approver?: { id: number; name: string }
}

export interface Reimbursement {
  id: number
  expense_claim_id: number
  processed_by?: number | null
  payment_mode?: string | null
  payment_date?: string | null
  reference_id?: string | null
  amount: number
  status: 'pending' | 'processed' | 'paid'
  notes?: string | null
  processed_by_user?: { id: number; name: string }
  claim?: ExpenseClaim
}

export interface ExpenseClaim {
  id: number
  employee_id: number
  title: string
  description?: string | null
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid'
  total_amount: number
  currency: string
  submitted_at?: string | null
  policy_violations?: string[] | null
  notes?: string | null
  items?: ExpenseItem[]
  approvals?: ExpenseApproval[]
  reimbursement?: Reimbursement | null
  employee?: { id: number; name: string; email: string }
  created_at?: string
  updated_at?: string
}

export interface ExpenseStats {
  total_claims: number
  pending_approval: number
  approved: number
  rejected: number
  paid: number
  pending_amount: number
  monthly_spend: number
  reimbursed_this_month: number
}

export interface ExpenseItemInput {
  category_id?: number | null
  date: string
  description: string
  amount: number | string
  merchant_name?: string
  receipt_path?: string
}

export interface ClaimCreatePayload {
  title: string
  description?: string
  currency?: string
  items: ExpenseItemInput[]
}

// ── API Service ─────────────────────────────────────────

const expenseService = {
  // Stats
  getStats: () => api.get<ExpenseStats>('/expenses/stats'),

  // Categories
  getCategories: (activeOnly = false) =>
    api.get<ExpenseCategory[]>('/expenses/categories', { params: { active_only: activeOnly } }),
  createCategory: (data: Partial<ExpenseCategory>) => api.post<ExpenseCategory>('/expenses/categories', data),
  updateCategory: (id: number, data: Partial<ExpenseCategory>) =>
    api.put<ExpenseCategory>(`/expenses/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/expenses/categories/${id}`),

  // Policies
  getPolicies: () => api.get<ExpensePolicy[]>('/expenses/policies'),
  createPolicy: (data: Partial<ExpensePolicy>) => api.post<ExpensePolicy>('/expenses/policies', data),
  getPolicy: (id: number) => api.get<ExpensePolicy>(`/expenses/policies/${id}`),
  updatePolicy: (id: number, data: Partial<ExpensePolicy>) =>
    api.put<ExpensePolicy>(`/expenses/policies/${id}`, data),
  deletePolicy: (id: number) => api.delete(`/expenses/policies/${id}`),

  // Claims
  getClaims: (params?: Record<string, unknown>) =>
    api.get('/expenses/claims', { params }),
  createClaim: (data: ClaimCreatePayload) => api.post<ExpenseClaim>('/expenses/claims', data),
  getClaim: (id: number) => api.get<ExpenseClaim>(`/expenses/claims/${id}`),
  updateClaim: (id: number, data: Partial<ExpenseClaim>) =>
    api.put<ExpenseClaim>(`/expenses/claims/${id}`, data),
  deleteClaim: (id: number) => api.delete(`/expenses/claims/${id}`),
  submitClaim: (id: number) => api.post<ExpenseClaim>(`/expenses/claims/${id}/submit`),

  // Claim items
  addItem: (claimId: number, data: ExpenseItemInput) =>
    api.post<ExpenseItem>(`/expenses/claims/${claimId}/items`, data),
  updateItem: (claimId: number, itemId: number, data: Partial<ExpenseItemInput>) =>
    api.put<ExpenseItem>(`/expenses/claims/${claimId}/items/${itemId}`, data),
  removeItem: (claimId: number, itemId: number) =>
    api.delete(`/expenses/claims/${claimId}/items/${itemId}`),

  // Approvals
  getPendingApprovals: (params?: Record<string, unknown>) =>
    api.get('/expenses/approvals/pending', { params }),
  getAllApprovals: (params?: Record<string, unknown>) =>
    api.get('/expenses/approvals', { params }),
  approveClaim: (id: number, comments?: string) =>
    api.post(`/expenses/approvals/${id}/approve`, { comments }),
  rejectClaim: (id: number, comments: string) =>
    api.post(`/expenses/approvals/${id}/reject`, { comments }),
  requestChanges: (id: number, comments: string) =>
    api.post(`/expenses/approvals/${id}/request-changes`, { comments }),

  // Reimbursements
  getReimbursements: (params?: Record<string, unknown>) =>
    api.get('/expenses/reimbursements', { params }),
  getReimbursement: (id: number) => api.get<Reimbursement>(`/expenses/reimbursements/${id}`),
  processReimbursement: (id: number, data: { payment_mode: string; payment_date?: string; reference_id?: string; notes?: string }) =>
    api.post(`/expenses/reimbursements/${id}/process`, data),
  markPaid: (id: number) => api.post(`/expenses/reimbursements/${id}/mark-paid`),
  exportReimbursements: () =>
    api.get('/expenses/reimbursements/export', { responseType: 'blob' }),
}

export default expenseService
