<script setup lang="ts">
defineOptions({ name: 'WorkflowRulesPage' })
import { ref, onMounted, computed } from 'vue'
import { workflowService, type WorkflowRule, type WorkflowAction, type WorkflowCondition, type WorkflowSchema } from '@/services/workflow'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const rules = ref<WorkflowRule[]>([])
const logs = ref<{ id: string; rule?: { name: string } | null; trigger_event: string; status: string; executed_at: string; error_message: string | null }[]>([])
const schema = ref<WorkflowSchema | null>(null)
const loading = ref(false)
const showBuilder = ref(false)
const showLogs = ref(false)
const editingRule = ref<WorkflowRule | null>(null)

const form = ref({
  name: '',
  description: '',
  trigger_event: 'punch_in',
  conditions: [] as WorkflowCondition[],
  actions: [] as WorkflowAction[],
  is_active: true,
})

const saving = ref(false)

const resetForm = () => {
  form.value = {
    name: '',
    description: '',
    trigger_event: 'punch_in',
    conditions: [],
    actions: [],
    is_active: true,
  }
  editingRule.value = null
}

const openCreate = () => {
  resetForm()
  showBuilder.value = true
}

const openEdit = (rule: WorkflowRule) => {
  editingRule.value = rule
  form.value = {
    name: rule.name,
    description: rule.description ?? '',
    trigger_event: rule.trigger_event,
    conditions: JSON.parse(JSON.stringify(rule.conditions ?? [])),
    actions: JSON.parse(JSON.stringify(rule.actions ?? [])),
    is_active: rule.is_active,
  }
  showBuilder.value = true
}

const addCondition = () => {
  form.value.conditions.push({ field: 'location', operator: 'equals', value: '' })
}
const removeCondition = (i: number) => form.value.conditions.splice(i, 1)

const addAction = () => {
  form.value.actions.push({ type: 'send_email', recipients: ['manager'], subject: '', body: '' })
}
const removeAction = (i: number) => form.value.actions.splice(i, 1)

const toggleRecipient = (action: WorkflowAction, value: string) => {
  if (!action.recipients) action.recipients = []
  const idx = action.recipients.indexOf(value)
  if (idx >= 0) action.recipients.splice(idx, 1)
  else action.recipients.push(value)
}

const saveRule = async () => {
  if (!form.value.name.trim()) { toast.error('Rule name is required'); return }
  if (!form.value.actions.length) { toast.error('Add at least one action'); return }

  saving.value = true
  try {
    if (editingRule.value) {
      const updated = await workflowService.updateRule(editingRule.value.id, form.value)
      const idx = rules.value.findIndex(r => r.id === updated.id)
      if (idx >= 0) rules.value[idx] = updated
      toast.success('Rule updated')
    } else {
      const created = await workflowService.createRule(form.value)
      rules.value.unshift(created)
      toast.success('Rule created')
    }
    showBuilder.value = false
    resetForm()
  } catch {
    toast.error('Failed to save rule')
  } finally {
    saving.value = false
  }
}

const toggleRule = async (rule: WorkflowRule) => {
  try {
    const updated = await workflowService.toggleRule(rule.id)
    const idx = rules.value.findIndex(r => r.id === updated.id)
    if (idx >= 0) rules.value[idx] = updated
  } catch {
    toast.error('Failed to update rule')
  }
}

const deleteRule = async (rule: WorkflowRule) => {
  if (!confirm(`Delete rule "${rule.name}"?`)) return
  try {
    await workflowService.deleteRule(rule.id)
    rules.value = rules.value.filter(r => r.id !== rule.id)
    toast.success('Rule deleted')
  } catch {
    toast.error('Failed to delete rule')
  }
}

const loadLogs = async () => {
  const result = await workflowService.getLogs()
  logs.value = result.data
  showLogs.value = true
}

const eventLabel = (val: string) => schema.value?.trigger_events.find(e => e.value === val)?.label ?? val

const recipientOptions = computed(() => schema.value?.email_recipients ?? [])
const templateVars = computed(() => schema.value?.template_variables ?? [])

const insertVar = (action: WorkflowAction, field: 'subject' | 'body', v: string) => {
  (action as Record<string, string>)[field] = ((action as Record<string, string>)[field] ?? '') + v
}

onMounted(async () => {
  loading.value = true
  try {
    const [r, s] = await Promise.all([workflowService.getRules(), workflowService.getSchema()])
    rules.value = r
    schema.value = s
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="wr-page">
    <!-- Header -->
    <div class="wr-header">
      <p class="wr-desc">Automate actions when HR events occur — check-ins, leaves, and more.</p>
      <div class="wr-header-actions">
        <button class="wr-btn-ghost" @click="loadLogs">View Logs</button>
        <button class="wr-btn-primary" @click="openCreate">+ New Rule</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="wr-card wr-loading">
      <div v-for="i in 3" :key="i" class="wr-skeleton"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="!rules.length" class="wr-empty">
      <div class="wr-empty-icon">⚡</div>
      <h3 class="wr-empty-title">No workflow rules yet</h3>
      <p class="wr-empty-desc">Create your first rule to automate notifications when employees check in, request leave, and more.</p>
      <button class="wr-btn-primary" @click="openCreate">Create First Rule</button>
    </div>

    <!-- Rules -->
    <div v-else class="wr-list">
      <div v-for="rule in rules" :key="rule.id" class="wr-rule-card">
        <button
          class="wr-toggle"
          :class="rule.is_active ? 'wr-toggle-on' : ''"
          @click="toggleRule(rule)"
        >
          <span class="wr-toggle-knob" :class="rule.is_active ? 'wr-knob-on' : ''"></span>
        </button>

        <div class="wr-rule-body">
          <div class="wr-rule-head">
            <span class="wr-rule-name">{{ rule.name }}</span>
            <span class="wr-event-badge">{{ eventLabel(rule.trigger_event) }}</span>
            <span v-if="!rule.is_active" class="wr-inactive-badge">Inactive</span>
          </div>
          <p v-if="rule.description" class="wr-rule-desc">{{ rule.description }}</p>
          <div class="wr-action-tags">
            <span v-for="(action, i) in rule.actions" :key="i" class="wr-action-tag">
              {{ action.type === 'send_email' ? `Email → ${(action.recipients ?? []).join(', ')}` : `Webhook → ${action.url}` }}
            </span>
          </div>
          <div class="wr-run-meta">
            Ran {{ rule.run_count }} time{{ rule.run_count !== 1 ? 's' : '' }}
            <span v-if="rule.last_run_at"> · Last: {{ new Date(rule.last_run_at).toLocaleString() }}</span>
          </div>
        </div>

        <div class="wr-rule-actions">
          <button class="wr-btn-edit" @click="openEdit(rule)">Edit</button>
          <button class="wr-btn-del" @click="deleteRule(rule)">Delete</button>
        </div>
      </div>
    </div>

    <!-- Builder Modal -->
    <Teleport to="body">
      <div v-if="showBuilder" class="wr-overlay" @click.self="showBuilder = false; resetForm()">
        <div class="wr-modal">
          <div class="wr-modal-head">
            <h2 class="wr-modal-title">{{ editingRule ? 'Edit Rule' : 'New Workflow Rule' }}</h2>
            <button class="wr-close-btn" @click="showBuilder = false; resetForm()">&times;</button>
          </div>

          <div class="wr-modal-body">
            <div class="wr-field">
              <label class="wr-label">Rule Name <span class="wr-req">*</span></label>
              <input v-model="form.name" type="text" class="wr-input" placeholder="e.g. Notify manager on check-in" />
            </div>
            <div class="wr-field">
              <label class="wr-label">Description</label>
              <input v-model="form.description" type="text" class="wr-input" placeholder="Optional description" />
            </div>
            <div class="wr-field">
              <label class="wr-label">Trigger Event <span class="wr-req">*</span></label>
              <select v-model="form.trigger_event" class="wr-input">
                <option v-for="ev in schema?.trigger_events ?? []" :key="ev.value" :value="ev.value">{{ ev.label }}</option>
              </select>
            </div>

            <!-- Conditions -->
            <div class="wr-section">
              <div class="wr-section-head">
                <label class="wr-label">Conditions <span class="wr-opt">(optional — all must match)</span></label>
                <button class="wr-btn-add-small" @click="addCondition">+ Add</button>
              </div>
              <div v-if="!form.conditions.length" class="wr-hint">No conditions — rule runs on every {{ eventLabel(form.trigger_event) }} event.</div>
              <div v-for="(cond, i) in form.conditions" :key="i" class="wr-cond-row">
                <select v-model="cond.field" class="wr-input-xs wr-flex-1">
                  <option v-for="f in schema?.condition_fields ?? []" :key="f.value" :value="f.value">{{ f.label }}</option>
                </select>
                <select v-model="cond.operator" class="wr-input-xs wr-w-28">
                  <option v-for="op in schema?.condition_operators ?? []" :key="op.value" :value="op.value">{{ op.label }}</option>
                </select>
                <input v-model="cond.value" type="text" placeholder="value" class="wr-input-xs wr-flex-1" />
                <button class="wr-rm-btn" @click="removeCondition(i)">&times;</button>
              </div>
            </div>

            <!-- Actions -->
            <div class="wr-section">
              <div class="wr-section-head">
                <label class="wr-label">Actions <span class="wr-req">*</span></label>
                <button class="wr-btn-add-small" @click="addAction">+ Add Action</button>
              </div>
              <div v-if="!form.actions.length" class="wr-hint">Add at least one action.</div>
              <div v-for="(action, i) in form.actions" :key="i" class="wr-action-block">
                <div class="wr-action-top">
                  <select v-model="action.type" class="wr-input-xs">
                    <option v-for="at in schema?.action_types ?? []" :key="at.value" :value="at.value">{{ at.label }}</option>
                  </select>
                  <button class="wr-rm-btn" @click="removeAction(i)">&times;</button>
                </div>
                <template v-if="action.type === 'send_email'">
                  <div class="wr-field">
                    <label class="wr-label-xs">Send To</label>
                    <div class="wr-recipient-row">
                      <button
                        v-for="r in recipientOptions"
                        :key="r.value"
                        :class="['wr-recipient-btn', (action.recipients ?? []).includes(r.value) ? 'wr-recipient-active' : '']"
                        @click="toggleRecipient(action, r.value)"
                      >{{ r.label }}</button>
                    </div>
                  </div>
                  <div class="wr-field">
                    <label class="wr-label-xs">Subject</label>
                    <input v-model="action.subject" type="text" placeholder="e.g. {{employee_name}} has checked in" class="wr-input-xs wr-w-full" />
                  </div>
                  <div class="wr-field">
                    <label class="wr-label-xs">Body</label>
                    <textarea v-model="action.body" rows="3" placeholder="e.g. {{employee_name}} checked in at {{check_in}}." class="wr-input-xs wr-w-full wr-textarea"></textarea>
                    <div class="wr-var-row">
                      <button v-for="v in templateVars" :key="v" class="wr-var-btn" @click="insertVar(action, 'body', v)">{{ v }}</button>
                    </div>
                  </div>
                </template>
                <template v-if="action.type === 'send_webhook'">
                  <div class="wr-field">
                    <label class="wr-label-xs">Webhook URL</label>
                    <input v-model="action.url" type="url" placeholder="https://hooks.example.com/..." class="wr-input-xs wr-w-full" />
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="wr-modal-foot">
            <button class="wr-btn-ghost" @click="showBuilder = false; resetForm()">Cancel</button>
            <button :disabled="saving" class="wr-btn-primary" @click="saveRule">
              {{ saving ? 'Saving…' : editingRule ? 'Update Rule' : 'Create Rule' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Logs Modal -->
    <Teleport to="body">
      <div v-if="showLogs" class="wr-overlay" @click.self="showLogs = false">
        <div class="wr-modal wr-modal-wide">
          <div class="wr-modal-head">
            <h2 class="wr-modal-title">Execution Logs</h2>
            <button class="wr-close-btn" @click="showLogs = false">&times;</button>
          </div>
          <div class="wr-modal-body">
            <div v-if="!logs.length" class="wr-hint wr-hint-center">No logs yet.</div>
            <table v-else class="wr-table">
              <thead>
                <tr>
                  <th class="wr-th">Rule</th>
                  <th class="wr-th">Event</th>
                  <th class="wr-th">Status</th>
                  <th class="wr-th">Executed At</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in logs" :key="log.id" class="wr-log-row">
                  <td class="wr-td wr-td-name">{{ log.rule?.name ?? '—' }}</td>
                  <td class="wr-td">{{ log.trigger_event }}</td>
                  <td class="wr-td">
                    <span :class="['wr-badge', log.status === 'success' ? 'wr-badge-green' : 'wr-badge-red']">{{ log.status }}</span>
                  </td>
                  <td class="wr-td wr-mono">{{ new Date(log.executed_at).toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.wr-page { display: flex; flex-direction: column; gap: 16px; }
.wr-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.wr-desc { font-size: 13px; color: #7A8299; margin: 0; }
.wr-header-actions { display: flex; gap: 8px; }
.wr-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.wr-btn-primary:hover { opacity: 0.88; }
.wr-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.wr-btn-ghost { background: transparent; border: 1px solid #232936; color: #7A8299; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.wr-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.wr-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; }
.wr-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.wr-skeleton { height: 60px; background: #232936; border-radius: 6px; animation: wr-pulse 1.2s ease-in-out infinite; }
@keyframes wr-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.wr-empty { background: #161A23; border: 2px dashed #232936; border-radius: 12px; padding: 48px 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.wr-empty-icon { font-size: 32px; }
.wr-empty-title { font-size: 16px; font-weight: 600; color: #EEF0F4; margin: 0; }
.wr-empty-desc { font-size: 13px; color: #7A8299; margin: 0; max-width: 400px; }
.wr-list { display: flex; flex-direction: column; gap: 8px; }
.wr-rule-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; display: flex; align-items: flex-start; gap: 14px; }
.wr-toggle { width: 42px; height: 24px; border-radius: 12px; background: #232936; border: none; position: relative; cursor: pointer; flex-shrink: 0; margin-top: 2px; transition: background 0.15s; }
.wr-toggle-on { background: #6B5BFF; }
.wr-toggle-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.15s; }
.wr-knob-on { transform: translateX(18px); }
.wr-rule-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.wr-rule-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.wr-rule-name { font-size: 14px; font-weight: 600; color: #EEF0F4; }
.wr-event-badge { background: #232936; color: #B6BED0; border-radius: 20px; padding: 2px 9px; font-size: 11px; }
.wr-inactive-badge { background: rgba(122,130,153,0.1); color: #7A8299; border-radius: 20px; padding: 2px 9px; font-size: 11px; }
.wr-rule-desc { font-size: 13px; color: #7A8299; margin: 0; }
.wr-action-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.wr-action-tag { background: #232936; color: #B6BED0; border-radius: 4px; padding: 2px 8px; font-size: 11px; }
.wr-run-meta { font-size: 11px; color: #7A8299; }
.wr-rule-actions { display: flex; gap: 8px; flex-shrink: 0; }
.wr-btn-edit { background: transparent; border: 1px solid #232936; color: #B6BED0; border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; }
.wr-btn-edit:hover { background: #232936; }
.wr-btn-del { background: transparent; border: 1px solid rgba(243,130,136,0.25); color: #F38288; border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; }
.wr-btn-del:hover { background: rgba(243,130,136,0.1); }
.wr-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: flex-start; justify-content: center; background: rgba(0,0,0,0.65); padding: 16px; overflow-y: auto; }
.wr-modal { background: #161A23; border: 1px solid #232936; border-radius: 12px; width: 100%; max-width: 600px; margin: 32px 0; display: flex; flex-direction: column; }
.wr-modal-wide { max-width: 760px; }
.wr-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #232936; }
.wr-modal-title { font-size: 15px; font-weight: 600; color: #EEF0F4; margin: 0; }
.wr-close-btn { background: none; border: none; color: #7A8299; font-size: 20px; cursor: pointer; line-height: 1; padding: 0; }
.wr-close-btn:hover { color: #EEF0F4; }
.wr-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.wr-modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #232936; }
.wr-field { display: flex; flex-direction: column; gap: 5px; }
.wr-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.wr-label-xs { font-size: 11px; color: #7A8299; }
.wr-req { color: #F38288; }
.wr-opt { font-size: 11px; color: #7A8299; font-weight: 400; }
.wr-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.wr-input:focus { border-color: #6B5BFF; }
.wr-input-xs { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 6px; padding: 6px 10px; font-size: 12px; outline: none; box-sizing: border-box; }
.wr-input-xs:focus { border-color: #6B5BFF; }
.wr-w-full { width: 100%; }
.wr-w-28 { width: 112px; }
.wr-flex-1 { flex: 1; }
.wr-textarea { resize: none; }
.wr-section { display: flex; flex-direction: column; gap: 8px; }
.wr-section-head { display: flex; align-items: center; justify-content: space-between; }
.wr-btn-add-small { background: none; border: none; color: #8A7BFF; font-size: 12px; cursor: pointer; }
.wr-btn-add-small:hover { text-decoration: underline; }
.wr-hint { font-size: 12px; color: #7A8299; font-style: italic; }
.wr-hint-center { text-align: center; padding: 24px 0; }
.wr-cond-row { display: flex; align-items: center; gap: 6px; }
.wr-rm-btn { background: none; border: none; color: #F38288; font-size: 16px; cursor: pointer; padding: 0 4px; }
.wr-action-block { background: rgba(255,255,255,0.02); border: 1px solid #232936; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.wr-action-top { display: flex; align-items: center; justify-content: space-between; }
.wr-recipient-row { display: flex; flex-wrap: wrap; gap: 6px; }
.wr-recipient-btn { border: 1px solid #232936; background: none; color: #7A8299; border-radius: 20px; padding: 3px 10px; font-size: 12px; cursor: pointer; }
.wr-recipient-active { border-color: #6B5BFF; background: rgba(107,91,255,0.15); color: #8A7BFF; }
.wr-var-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.wr-var-btn { background: #232936; border: none; color: #7A8299; border-radius: 4px; padding: 2px 7px; font-size: 11px; cursor: pointer; font-family: 'JetBrains Mono', monospace; }
.wr-var-btn:hover { color: #EEF0F4; background: #2D3448; }
.wr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.wr-th { padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; border-bottom: 1px solid #232936; }
.wr-log-row { border-bottom: 1px solid #1C2030; }
.wr-log-row:last-child { border-bottom: none; }
.wr-td { padding: 10px 12px; color: #B6BED0; vertical-align: middle; }
.wr-td-name { color: #EEF0F4; font-weight: 500; }
.wr-mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.wr-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; }
.wr-badge-green { background: rgba(77,211,154,0.12); color: #4DD39A; }
.wr-badge-red   { background: rgba(243,130,136,0.12); color: #F38288; }
</style>
