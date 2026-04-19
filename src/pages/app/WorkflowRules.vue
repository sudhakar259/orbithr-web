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

// ── Form state ──────────────────────────────────────────────────────────────
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

// ── Conditions ──────────────────────────────────────────────────────────────
const addCondition = () => {
  form.value.conditions.push({ field: 'location', operator: 'equals', value: '' })
}
const removeCondition = (i: number) => form.value.conditions.splice(i, 1)

// ── Actions ─────────────────────────────────────────────────────────────────
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

// ── Save ─────────────────────────────────────────────────────────────────────
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

// ── Toggle / Delete ──────────────────────────────────────────────────────────
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

// ── Load logs ────────────────────────────────────────────────────────────────
const loadLogs = async () => {
  const result = await workflowService.getLogs()
  logs.value = result.data
  showLogs.value = true
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const eventLabel = (val: string) => schema.value?.trigger_events.find(e => e.value === val)?.label ?? val

const recipientOptions = computed(() => schema.value?.email_recipients ?? [])
const templateVars = computed(() => schema.value?.template_variables ?? [])

const insertVar = (action: WorkflowAction, field: 'subject' | 'body', v: string) => {
  (action as Record<string, string>)[field] = ((action as Record<string, string>)[field] ?? '') + v
}

// ── Mount ────────────────────────────────────────────────────────────────────
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-gray-400 text-sm">Automate actions when HR events occur — check-ins, leaves, and more.</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="loadLogs"
          class="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
        >
          View Logs
        </button>
        <button
          @click="openCreate"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        >
          + New Rule
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-brand-500"></div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!rules.length"
      class="rounded-xl border border-dashed border-gray-600 bg-gray-800/50 p-12 text-center"
    >
      <div class="text-4xl mb-3">⚡</div>
      <h3 class="text-lg font-semibold text-white mb-1">No workflow rules yet</h3>
      <p class="text-gray-400 text-sm mb-4">Create your first rule to automate notifications when employees check in, request leave, and more.</p>
      <button @click="openCreate" class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Create First Rule
      </button>
    </div>

    <!-- Rules list -->
    <div v-else class="space-y-3">
      <div
        v-for="rule in rules"
        :key="rule.id"
        class="rounded-xl border border-gray-700 bg-gray-800 p-5 flex items-start gap-4"
      >
        <!-- Active toggle -->
        <button
          @click="toggleRule(rule)"
          :class="['relative inline-flex h-6 w-11 shrink-0 mt-0.5 rounded-full transition-colors', rule.is_active ? 'bg-brand-600' : 'bg-gray-600']"
        >
          <span :class="['inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform', rule.is_active ? 'translate-x-5' : 'translate-x-0.5']"></span>
        </button>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-white">{{ rule.name }}</span>
            <span class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">{{ eventLabel(rule.trigger_event) }}</span>
            <span v-if="!rule.is_active" class="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
          </div>
          <p v-if="rule.description" class="mt-0.5 text-sm text-gray-400">{{ rule.description }}</p>

          <!-- Action summary -->
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="(action, i) in rule.actions"
              :key="i"
              class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
            >
              {{ action.type === 'send_email' ? `Email → ${(action.recipients ?? []).join(', ')}` : `Webhook → ${action.url}` }}
            </span>
          </div>

          <div class="mt-2 text-xs text-gray-500">
            Ran {{ rule.run_count }} time{{ rule.run_count !== 1 ? 's' : '' }}
            <span v-if="rule.last_run_at"> · Last: {{ new Date(rule.last_run_at).toLocaleString() }}</span>
          </div>
        </div>

        <div class="flex gap-2 shrink-0">
          <button @click="openEdit(rule)" class="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700">Edit</button>
          <button @click="deleteRule(rule)" class="rounded-lg border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30">Delete</button>
        </div>
      </div>
    </div>

    <!-- ── Rule Builder Modal ── -->
    <Teleport to="body">
      <div v-if="showBuilder" class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
        <div class="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900 shadow-2xl my-8">
          <div class="flex items-center justify-between border-b border-gray-700 px-6 py-4">
            <h2 class="text-lg font-semibold text-white">{{ editingRule ? 'Edit Rule' : 'New Workflow Rule' }}</h2>
            <button @click="showBuilder = false; resetForm()" class="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
          </div>

          <div class="px-6 py-5 space-y-5">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Rule Name <span class="text-red-400">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g. Notify manager on check-in"
                class="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <input
                v-model="form.description"
                type="text"
                placeholder="Optional description"
                class="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <!-- Trigger -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Trigger Event <span class="text-red-400">*</span></label>
              <select
                v-model="form.trigger_event"
                class="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              >
                <option v-for="ev in schema?.trigger_events ?? []" :key="ev.value" :value="ev.value">{{ ev.label }}</option>
              </select>
            </div>

            <!-- Conditions -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-gray-300">Conditions <span class="text-gray-500 font-normal">(optional — all must match)</span></label>
                <button @click="addCondition" class="text-xs text-brand-400 hover:text-brand-300">+ Add</button>
              </div>
              <div v-if="!form.conditions.length" class="text-xs text-gray-500 italic">No conditions — rule runs on every {{ eventLabel(form.trigger_event) }} event.</div>
              <div v-for="(cond, i) in form.conditions" :key="i" class="mt-2 flex gap-2 items-center">
                <select v-model="cond.field" class="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white flex-1">
                  <option v-for="f in schema?.condition_fields ?? []" :key="f.value" :value="f.value">{{ f.label }}</option>
                </select>
                <select v-model="cond.operator" class="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white w-32">
                  <option v-for="op in schema?.condition_operators ?? []" :key="op.value" :value="op.value">{{ op.label }}</option>
                </select>
                <input v-model="cond.value" type="text" placeholder="value" class="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white flex-1 focus:border-brand-500 focus:outline-none" />
                <button @click="removeCondition(i)" class="text-red-400 hover:text-red-300 text-sm px-1">&times;</button>
              </div>
            </div>

            <!-- Actions -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-sm font-medium text-gray-300">Actions <span class="text-red-400">*</span></label>
                <button @click="addAction" class="text-xs text-brand-400 hover:text-brand-300">+ Add Action</button>
              </div>
              <div v-if="!form.actions.length" class="text-xs text-gray-500 italic">Add at least one action.</div>

              <div
                v-for="(action, i) in form.actions"
                :key="i"
                class="mt-3 rounded-lg border border-gray-600 bg-gray-800/60 p-4 space-y-3"
              >
                <div class="flex items-center justify-between">
                  <select v-model="action.type" class="rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-white">
                    <option v-for="at in schema?.action_types ?? []" :key="at.value" :value="at.value">{{ at.label }}</option>
                  </select>
                  <button @click="removeAction(i)" class="text-red-400 hover:text-red-300 text-sm">&times;</button>
                </div>

                <!-- Email fields -->
                <template v-if="action.type === 'send_email'">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Send To</label>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="r in recipientOptions"
                        :key="r.value"
                        @click="toggleRecipient(action, r.value)"
                        :class="['rounded-full border px-3 py-1 text-xs transition-colors', (action.recipients ?? []).includes(r.value) ? 'border-brand-500 bg-brand-600/20 text-brand-300' : 'border-gray-600 text-gray-400 hover:border-gray-500']"
                      >
                        {{ r.label }}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Subject</label>
                    <input
                      v-model="action.subject"
                      type="text"
                      placeholder="e.g. {{employee_name}} has checked in"
                      class="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Body</label>
                    <textarea
                      v-model="action.body"
                      rows="3"
                      placeholder="e.g. {{employee_name}} checked in at {{check_in}} from {{location}}."
                      class="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none resize-none"
                    ></textarea>
                    <div class="mt-1 flex flex-wrap gap-1">
                      <button
                        v-for="v in templateVars"
                        :key="v"
                        @click="insertVar(action, 'body', v)"
                        class="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-gray-600"
                      >
                        {{ v }}
                      </button>
                    </div>
                  </div>
                </template>

                <!-- Webhook fields -->
                <template v-if="action.type === 'send_webhook'">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Webhook URL</label>
                    <input
                      v-model="action.url"
                      type="url"
                      placeholder="https://hooks.example.com/..."
                      class="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 border-t border-gray-700 px-6 py-4">
            <button @click="showBuilder = false; resetForm()" class="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
            <button
              @click="saveRule"
              :disabled="saving"
              class="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Logs Modal ── -->
    <Teleport to="body">
      <div v-if="showLogs" class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
        <div class="w-full max-w-3xl rounded-xl border border-gray-700 bg-gray-900 shadow-2xl my-8">
          <div class="flex items-center justify-between border-b border-gray-700 px-6 py-4">
            <h2 class="text-lg font-semibold text-white">Execution Logs</h2>
            <button @click="showLogs = false" class="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
          </div>

          <div class="px-6 py-4">
            <div v-if="!logs.length" class="text-center py-8 text-gray-500">No logs yet.</div>
            <table v-else class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-700 text-left text-xs text-gray-400">
                  <th class="pb-2 pr-4">Rule</th>
                  <th class="pb-2 pr-4">Event</th>
                  <th class="pb-2 pr-4">Status</th>
                  <th class="pb-2">Executed At</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in logs" :key="log.id" class="border-b border-gray-800">
                  <td class="py-2 pr-4 text-white">{{ log.rule?.name ?? '—' }}</td>
                  <td class="py-2 pr-4 text-gray-300">{{ log.trigger_event }}</td>
                  <td class="py-2 pr-4">
                    <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', log.status === 'success' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400']">
                      {{ log.status }}
                    </span>
                  </td>
                  <td class="py-2 text-gray-400 text-xs">{{ new Date(log.executed_at).toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
