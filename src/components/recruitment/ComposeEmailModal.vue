<script setup lang="ts">
defineOptions({ name: 'ComposeEmailModal' })
import { ref, watch, onMounted } from 'vue'
import api from '@/services/api'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const props = defineProps<{
  visible: boolean
  candidateId?: number
  candidateName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'sent'): void
}>()

// ── Types ──────────────────────────────────────────────
interface EmailAccount {
  id: number
  provider: string
  display_name: string
  email_address: string
  is_active: boolean
}
interface CandidateOption {
  id: number
  first_name: string
  last_name: string
  email: string
}
interface EmailTemplate {
  id: number
  name: string
  subject?: string
  body?: string
}

// ── State ──────────────────────────────────────────────
const accounts = ref<EmailAccount[]>([])
const candidates = ref<CandidateOption[]>([])
const templates = ref<EmailTemplate[]>([])
const candidateSearch = ref('')
const showTemplateDropdown = ref(false)
const appliedTemplate = ref<string | null>(null)
const sending = ref(false)

const form = ref({
  candidate_id: props.candidateId ?? null as number | null,
  account_integration_id: null as number | null,
  subject: '',
  body_html: '',
})

// ── Load data ──────────────────────────────────────────
async function loadAccounts() {
  try {
    const res = await api.get('/email-integration/accounts')
    accounts.value = (res.data?.data ?? res.data ?? []).filter((a: EmailAccount) => a.is_active)
    if (accounts.value.length && !form.value.account_integration_id) {
      form.value.account_integration_id = accounts.value[0].id
    }
  } catch { /* ignore */ }
}

async function searchCandidates() {
  if (!candidateSearch.value || candidateSearch.value.length < 2) { candidates.value = []; return }
  try {
    const res = await api.get('/recruitment/candidates', { params: { search: candidateSearch.value } })
    candidates.value = res.data?.data ?? res.data ?? []
  } catch { candidates.value = [] }
}

async function loadTemplates() {
  try {
    const res = await api.get('/candidate-emails/templates')
    templates.value = res.data?.data ?? res.data ?? []
  } catch { templates.value = [] }
}

async function applyTemplate(tpl: EmailTemplate) {
  showTemplateDropdown.value = false
  if (props.candidateId || form.value.candidate_id) {
    try {
      const res = await api.get('/candidate-emails/resolve-template', {
        params: { template_id: tpl.id, candidate_id: form.value.candidate_id ?? props.candidateId },
      })
      const resolved = res.data?.data ?? res.data
      if (resolved?.subject) form.value.subject = resolved.subject
      if (resolved?.body) form.value.body_html = resolved.body
    } catch {
      if (tpl.subject) form.value.subject = tpl.subject
      if (tpl.body) form.value.body_html = tpl.body
    }
  } else {
    if (tpl.subject) form.value.subject = tpl.subject
    if (tpl.body) form.value.body_html = tpl.body
  }
  appliedTemplate.value = tpl.name
}

function clearTemplate() {
  appliedTemplate.value = null
  form.value.subject = ''
  form.value.body_html = ''
}

function selectCandidate(c: CandidateOption) {
  form.value.candidate_id = c.id
  candidateSearch.value = `${c.first_name} ${c.last_name}`
  candidates.value = []
}

// ── Send ───────────────────────────────────────────────
async function send() {
  if (!form.value.candidate_id || !form.value.account_integration_id || !form.value.subject) return
  sending.value = true
  try {
    await api.post('/email-integration/compose', {
      candidate_id: form.value.candidate_id,
      subject: form.value.subject,
      body_html: form.value.body_html,
      account_integration_id: form.value.account_integration_id,
    })
    toast.success('Email sent')
    emit('sent')
    emit('close')
    form.value = { candidate_id: null, account_integration_id: accounts.value[0]?.id ?? null, subject: '', body_html: '' }
    appliedTemplate.value = null
  } catch {
    toast.error('Failed to send email')
  } finally {
    sending.value = false
  }
}

// ── Watchers ───────────────────────────────────────────
watch(() => props.visible, (v) => {
  if (v) {
    loadAccounts()
    loadTemplates()
    if (props.candidateId) {
      form.value.candidate_id = props.candidateId
    }
  }
})

watch(candidateSearch, () => { searchCandidates() })

onMounted(() => {
  if (props.visible) { loadAccounts(); loadTemplates() }
})
</script>

<template>
  <Modal :model-value="visible" title="Compose Email" max-width="640px" @update:model-value="!$event && emit('close')">
    <div class="compose-form">
      <!-- Candidate -->
      <div class="field">
        <label class="field-label">Candidate</label>
        <div v-if="candidateId && candidateName" class="readonly-field">{{ candidateName }}</div>
        <div v-else class="search-wrap">
          <input v-model="candidateSearch" class="input" placeholder="Search candidates..." />
          <div v-if="candidates.length" class="dropdown">
            <button
              v-for="c in candidates" :key="c.id"
              class="dropdown-item"
              @click="selectCandidate(c)"
            >
              {{ c.first_name }} {{ c.last_name }} <span class="dropdown-sub">{{ c.email }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- From Account -->
      <div class="field">
        <label class="field-label">From Account</label>
        <select v-model="form.account_integration_id" class="input">
          <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.email_address }} ({{ a.display_name }})</option>
        </select>
      </div>

      <!-- Template picker -->
      <div class="field">
        <label class="field-label">Email Template</label>
        <div class="template-row">
          <div v-if="appliedTemplate" class="template-badge">
            Template applied: {{ appliedTemplate }}
            <button class="badge-clear" @click="clearTemplate">&times;</button>
          </div>
          <div v-else class="template-picker-wrap">
            <button class="btn-outline-sm" @click="showTemplateDropdown = !showTemplateDropdown">Use Template</button>
            <div v-if="showTemplateDropdown" class="dropdown">
              <div v-if="!templates.length" class="dropdown-empty">No templates available</div>
              <button
                v-for="t in templates" :key="t.id"
                class="dropdown-item"
                @click="applyTemplate(t)"
              >{{ t.name }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Subject -->
      <div class="field">
        <label class="field-label">Subject</label>
        <input v-model="form.subject" class="input" placeholder="Email subject" required />
      </div>

      <!-- Body -->
      <div class="field">
        <label class="field-label">Body</label>
        <textarea v-model="form.body_html" class="input textarea" rows="8" placeholder="Compose your email..." />
      </div>
    </div>

    <template #footer>
      <button class="btn-cancel" @click="emit('close')">Cancel</button>
      <button class="btn-send" :disabled="sending || !form.candidate_id || !form.subject" @click="send">
        <span v-if="sending" class="spinner" /> Send Email
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.compose-form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.input { padding: 9px 12px; font-size: 13px; color: var(--text); background: var(--surface2); border: 1px solid var(--border-hi); border-radius: 8px; outline: none; transition: border-color .14s; width: 100%; box-sizing: border-box; }
.input:focus { border-color: var(--accent); }
.input::placeholder { color: var(--muted); }
select.input { appearance: none; cursor: pointer; }
.textarea { min-height: 120px; resize: vertical; font-family: inherit; line-height: 1.5; }

.readonly-field { padding: 9px 12px; font-size: 13px; color: var(--text); background: var(--surface3); border: 1px solid var(--border); border-radius: 8px; }

/* Search dropdown */
.search-wrap { position: relative; }
.dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--surface2); border: 1px solid var(--border-hi); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 10; margin-top: 4px; }
.dropdown-item { display: block; width: 100%; padding: 8px 12px; font-size: 13px; color: var(--text); background: none; border: none; text-align: left; cursor: pointer; transition: background .1s; }
.dropdown-item:hover { background: var(--surface3); }
.dropdown-sub { color: var(--muted); font-size: 11px; margin-left: 8px; }
.dropdown-empty { padding: 12px; font-size: 12px; color: var(--muted); text-align: center; }

/* Template picker */
.template-row { display: flex; align-items: center; gap: 10px; }
.template-picker-wrap { position: relative; }
.btn-outline-sm { padding: 6px 14px; font-size: 12px; font-weight: 500; color: var(--accent); background: transparent; border: 1px solid var(--accent); border-radius: 6px; cursor: pointer; transition: all .14s; }
.btn-outline-sm:hover { background: rgba(79,126,255,.08); }
.template-badge { display: inline-flex; align-items: center; gap: 8px; padding: 5px 12px; font-size: 12px; font-weight: 500; color: var(--green); background: rgba(54,211,153,.1); border: 1px solid rgba(54,211,153,.2); border-radius: 6px; }
.badge-clear { background: none; border: none; color: var(--green); cursor: pointer; font-size: 16px; padding: 0 2px; line-height: 1; }

/* Footer buttons */
.btn-cancel { padding: 8px 18px; font-size: 13px; font-weight: 500; background: var(--surface2); color: var(--muted); border: 1px solid var(--border-hi); border-radius: 8px; cursor: pointer; transition: all .14s; }
.btn-cancel:hover { color: var(--text); }
.btn-send { padding: 8px 20px; font-size: 13px; font-weight: 600; background: var(--accent); color: #fff; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: opacity .14s; }
.btn-send:hover:not(:disabled) { opacity: .85; }
.btn-send:disabled { opacity: .5; cursor: not-allowed; }

.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.2); border-top-color: currentColor; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
