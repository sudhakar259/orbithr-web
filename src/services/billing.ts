import api from './api'

export interface PlanFeature {
  name: string
  slug: string
  value: string
}

export interface PlanModule {
  id: number
  name: string
  slug: string
}

export interface Plan {
  id: number
  name: string
  description: string | null
  price: string
  billing_cycle: string
  max_users: number
  trial_days: number
  is_popular: boolean
  stripe_price_id: string | null
  features: PlanFeature[]
  modules: PlanModule[]
}

export interface Subscription {
  id: number
  plan: Plan
  status: string
  started_at: string | null
  expires_at: string | null
  cancelled_at: string | null
  trial_days_used: number
  active_users_count: number | null
  enabled_modules: number[] | null
  billing_cycle: string | null
  price_at_subscription: string | null
  stripe_subscription_id: string | null
  next_billing_date: string | null
  is_on_trial: boolean
  is_active: boolean
  is_cancelled: boolean
  days_remaining: number | null
  trial_days_remaining: number | null
}

export interface BillingTransaction {
  id: number
  transaction_id: string
  type: string
  status: string
  amount: string
  currency: string
  payment_method: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

export interface StripeInvoice {
  id: string
  number: string | null
  amount_paid: number
  amount_due: number
  currency: string
  status: string
  paid: boolean
  created: number
  period_start: number
  period_end: number
  invoice_pdf: string | null
  hosted_invoice_url: string | null
}

export interface CheckoutResult {
  session_id: string
  checkout_url: string
}

export interface PaginatedTransactions {
  data: BillingTransaction[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export const billingService = {
  getCurrentSubscription: () => api.get<Subscription>('/billing/subscription'),

  getAvailablePlans: () => api.get<Plan[]>('/billing/plans'),

  initiateUpgrade: (data: { plan_id: number; success_url: string; cancel_url: string }) =>
    api.post<CheckoutResult>('/billing/upgrade', data),

  cancelSubscription: () => api.post('/billing/cancel'),

  getTransactions: (page = 1) =>
    api.get<PaginatedTransactions>(`/billing/transactions?page=${page}`),

  getInvoices: () => api.get<StripeInvoice[]>('/billing/invoices'),
}
