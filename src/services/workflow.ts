import api from '@/services/api'

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'in'
  value: string | string[]
}

export interface WorkflowAction {
  type: 'send_email' | 'send_webhook'
  // send_email
  recipients?: string[]
  subject?: string
  body?: string
  // send_webhook
  url?: string
  method?: string
  extra_payload?: Record<string, unknown>
}

export interface WorkflowRule {
  id: string
  name: string
  description?: string | null
  trigger_event: string
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  is_active: boolean
  run_count: number
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowLog {
  id: string
  workflow_rule_id: string | null
  trigger_event: string
  trigger_data: Record<string, unknown>
  actions_executed: (WorkflowAction & { result: string })[]
  status: 'success' | 'failed' | 'partial'
  error_message: string | null
  executed_at: string
  rule?: { id: string; name: string } | null
}

export interface WorkflowSchema {
  trigger_events: { value: string; label: string }[]
  condition_fields: { value: string; label: string; type: string }[]
  condition_operators: { value: string; label: string }[]
  action_types: { value: string; label: string }[]
  email_recipients: { value: string; label: string }[]
  template_variables: string[]
}

export const workflowService = {
  async getSchema(): Promise<WorkflowSchema> {
    const { data } = await api.get('/workflow/schema')
    return data
  },

  async getRules(): Promise<WorkflowRule[]> {
    const { data } = await api.get('/workflow/rules')
    return data.data
  },

  async createRule(payload: Omit<WorkflowRule, 'id' | 'run_count' | 'last_run_at' | 'created_at' | 'updated_at'>): Promise<WorkflowRule> {
    const { data } = await api.post('/workflow/rules', payload)
    return data.data
  },

  async updateRule(id: string, payload: Partial<WorkflowRule>): Promise<WorkflowRule> {
    const { data } = await api.put(`/workflow/rules/${id}`, payload)
    return data.data
  },

  async toggleRule(id: string): Promise<WorkflowRule> {
    const { data } = await api.post(`/workflow/rules/${id}/toggle`)
    return data.data
  },

  async deleteRule(id: string): Promise<void> {
    await api.delete(`/workflow/rules/${id}`)
  },

  async getLogs(ruleId?: string): Promise<{ data: WorkflowLog[]; total: number }> {
    const params = ruleId ? { rule_id: ruleId } : {}
    const { data } = await api.get('/workflow/logs', { params })
    return { data: data.data, total: data.total }
  },
}
