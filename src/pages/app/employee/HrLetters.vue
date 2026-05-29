<script setup lang="ts">
defineOptions({ name: 'HrLetters' })

import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

type Tab = 'templates' | 'generated'
const activeTab = ref<Tab>('templates')

interface LetterTemplate {
  id: number; name: string; type: string; body: string; footer_text: string; is_active: boolean
}

const templates = ref<LetterTemplate[]>([])
const templatesLoading = ref(false)
const showTemplateForm = ref(false)
const editingTemplate = ref<LetterTemplate | null>(null)
const templateForm = ref({ name: '', type: 'appointment', body: '', footer_text: '' })
const templateTypes = ['appointment', 'experience', 'relieving', 'salary_certificate', 'noc', 'custom']
const templateSaving = ref(false)

async function fetchTemplates() {
  templatesLoading.value = true
  try {
    const { data } = await api.get('/hr-letters/templates')
    templates.value = data.data ?? data
  } catch { /* silently ignore */ }
  finally { templatesLoading.value = false }
}

function openNewTemplate() {
  editingTemplate.value = null
  templateForm.value = { name: '', type: 'appointment', body: '', footer_text: '' }
  showTemplateForm.value = true
}

function openEditTemplate(t: LetterTemplate) {
  editingTemplate.value = t
  templateForm.value = { name: t.name, type: t.type, body: t.body, footer_text: t.footer_text }
  showTemplateForm.value = true
}

async function saveTemplate() {
  templateSaving.value = true
  try {
    if (editingTemplate.value) {
      await api.put(`/hr-letters/templates/${editingTemplate.value.id}`, templateForm.value)
    } else {
      await api.post('/hr-letters/templates', templateForm.value)
    }
    showTemplateForm.value = false
    await fetchTemplates()
  } catch { /* silently ignore */ }
  finally { templateSaving.value = false }
}

async function deleteTemplate(id: number) {
  if (!await dialog('Delete', 'Delete this template?')) return
  try { await api.delete(`/hr-letters/templates/${id}`); await fetchTemplates() }
  catch { /* silently ignore */ }
}

interface GeneratedLetter { id: number; employee_name: string; letter_type: string; generated_at: string; status: string }
interface GeneratedLetterRaw {
  id: number; status: string; created_at: string
  employee?: { first_name?: string; last_name?: string }
  template?: { type?: string }
}

const generatedLetters = ref<GeneratedLetter[]>([])
const lettersLoading = ref(false)
const showGenerateForm = ref(false)
const generateForm = ref({ employee_id: '', template_id: '', custom_values: '' })
const generating = ref(false)

interface Employee { id: number; first_name: string; last_name: string }
const employees = ref<Employee[]>([])

function mapLetter(raw: GeneratedLetterRaw): GeneratedLetter {
  return {
    id: raw.id,
    employee_name: [raw.employee?.first_name, raw.employee?.last_name].filter(Boolean).join(' ') || '—',
    letter_type: raw.template?.type ?? '',
    generated_at: raw.created_at ? new Date(raw.created_at).toLocaleDateString() : '—',
    status: raw.status,
  }
}

async function fetchGeneratedLetters() {
  lettersLoading.value = true
  try {
    const { data } = await api.get('/hr-letters')
    const rows: GeneratedLetterRaw[] = data.data ?? data
    generatedLetters.value = rows.map(mapLetter)
  } catch { /* silently ignore */ }
  finally { lettersLoading.value = false }
}

async function fetchEmployees() {
  try {
    const { data } = await api.get('/employees', { params: { per_page: 200 } })
    employees.value = data.data ?? data
  } catch { /* silently ignore */ }
}

async function generateLetter() {
  generating.value = true
  try {
    let parsedCustomValues: Record<string, string> = {}
    if (generateForm.value.custom_values.trim()) {
      try { parsedCustomValues = JSON.parse(generateForm.value.custom_values) }
      catch {
        alert('Custom values must be valid JSON, e.g.\n{"last_working_date": "31 Dec 2024"}')
        generating.value = false
        return
      }
    }
    await api.post('/hr-letters/generate', {
      employee_id: generateForm.value.employee_id,
      template_id: generateForm.value.template_id,
      custom_values: parsedCustomValues,
    })
    showGenerateForm.value = false
    generateForm.value = { employee_id: '', template_id: '', custom_values: '' }
    await fetchGeneratedLetters()
  } catch { /* silently ignore */ }
  finally { generating.value = false }
}

async function downloadLetter(id: number) {
  try {
    const { data } = await api.get(`/hr-letters/${id}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url; a.download = `letter-${id}.pdf`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  } catch { /* silently ignore */ }
}

async function deleteLetter(id: number) {
  if (!await dialog('Delete Letter', 'Are you sure you want to delete this generated letter?')) return
  try { await api.delete(`/hr-letters/${id}`); await fetchGeneratedLetters() }
  catch { /* silently ignore */ }
}

const TYPE_TONES: Record<string, string> = {
  appointment: 'tone-blue', experience: 'tone-green', relieving: 'tone-yellow',
  salary_certificate: 'tone-accent', noc: 'tone-orange', custom: 'tone-muted',
}
function typeTone(type: string | undefined | null) { return TYPE_TONES[type ?? ''] ?? 'tone-muted' }

onMounted(() => { fetchTemplates(); fetchGeneratedLetters(); fetchEmployees() })
</script>

<template>
  <div class="hl-wrap">
    <!-- Tabs -->
    <div class="hl-tabs">
      <button class="hl-tab" :class="{ active: activeTab === 'templates' }" @click="activeTab = 'templates'">
        Letter Templates
      </button>
      <button class="hl-tab" :class="{ active: activeTab === 'generated' }" @click="activeTab = 'generated'">
        Generated Letters
      </button>
    </div>

    <!-- Templates Tab -->
    <div v-if="activeTab === 'templates'">
      <div class="hl-bar">
        <span class="hl-section-title">Templates</span>
        <button class="hl-btn-primary" @click="openNewTemplate">New Template</button>
      </div>

      <div v-if="templatesLoading" class="hl-loading"><div class="hl-spinner" /></div>
      <div v-else class="hl-table-card">
        <table class="hl-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in templates" :key="t.id">
              <td class="hl-td-primary">{{ t.name }}</td>
              <td><span class="hl-pill" :class="typeTone(t.type)">{{ (t.type ?? '').replace(/_/g, ' ') }}</span></td>
              <td><span class="hl-pill" :class="t.is_active ? 'tone-green' : 'tone-muted'">{{ t.is_active ? 'Active' : 'Inactive' }}</span></td>
              <td>
                <div class="hl-row-actions">
                  <button class="hl-link-btn" @click="openEditTemplate(t)">Edit</button>
                  <button class="hl-link-btn hl-link-danger" @click="deleteTemplate(t.id)">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="templates.length === 0"><td colspan="4" class="hl-empty">No templates yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Generated Letters Tab -->
    <div v-if="activeTab === 'generated'">
      <div class="hl-bar">
        <span class="hl-section-title">Generated Letters</span>
        <button class="hl-btn-primary" @click="showGenerateForm = true">Generate Letter</button>
      </div>

      <div v-if="lettersLoading" class="hl-loading"><div class="hl-spinner" /></div>
      <div v-else class="hl-table-card">
        <table class="hl-table">
          <thead>
            <tr><th>Employee</th><th>Letter Type</th><th>Generated</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in generatedLetters" :key="l.id">
              <td class="hl-td-primary">{{ l.employee_name }}</td>
              <td><span class="hl-pill" :class="typeTone(l.letter_type)">{{ (l.letter_type ?? '').replace(/_/g, ' ') }}</span></td>
              <td class="hl-mono">{{ l.generated_at }}</td>
              <td><span class="hl-pill" :class="l.status === 'generated' ? 'tone-green' : 'tone-yellow'">{{ l.status }}</span></td>
              <td>
                <div class="hl-row-actions">
                  <button class="hl-link-btn" @click="downloadLetter(l.id)">Download</button>
                  <button class="hl-link-btn hl-link-danger" @click="deleteLetter(l.id)">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="generatedLetters.length === 0"><td colspan="5" class="hl-empty">No letters generated yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Template Form Modal -->
    <Teleport to="body">
      <div v-if="showTemplateForm" class="hl-overlay" @click.self="showTemplateForm = false">
        <div class="hl-modal">
          <h3 class="hl-modal-title">{{ editingTemplate ? 'Edit Template' : 'New Template' }}</h3>
          <div class="hl-form-field">
            <label class="hl-form-label">Name</label>
            <input v-model="templateForm.name" class="hl-form-input" />
          </div>
          <div class="hl-form-field">
            <label class="hl-form-label">Type</label>
            <select v-model="templateForm.type" class="hl-form-input">
              <option v-for="t in templateTypes" :key="t" :value="t">{{ t.replace(/_/g, ' ') }}</option>
            </select>
          </div>
          <div class="hl-form-field">
            <label class="hl-form-label">Body</label>
            <p class="hl-form-hint">Use placeholders: <code v-pre>{{employee_name}} {{designation}} {{department}} {{date_of_joining}} {{last_working_date}}</code></p>
            <textarea v-model="templateForm.body" rows="10" class="hl-form-input hl-form-mono" />
          </div>
          <div class="hl-form-field">
            <label class="hl-form-label">Footer Text</label>
            <input v-model="templateForm.footer_text" class="hl-form-input" />
          </div>
          <div class="hl-modal-actions">
            <button class="hl-btn-ghost" @click="showTemplateForm = false">Cancel</button>
            <button class="hl-btn-primary" :disabled="templateSaving" @click="saveTemplate">
              {{ templateSaving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Generate Letter Modal -->
    <Teleport to="body">
      <div v-if="showGenerateForm" class="hl-overlay" @click.self="showGenerateForm = false">
        <div class="hl-modal hl-modal-sm">
          <h3 class="hl-modal-title">Generate Letter</h3>
          <div class="hl-form-field">
            <label class="hl-form-label">Employee</label>
            <select v-model="generateForm.employee_id" class="hl-form-input">
              <option value="">Select employee</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name }}</option>
            </select>
          </div>
          <div class="hl-form-field">
            <label class="hl-form-label">Template</label>
            <select v-model="generateForm.template_id" class="hl-form-input">
              <option value="">Select template</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div class="hl-form-field">
            <label class="hl-form-label">Custom Values <span class="hl-form-opt">(optional)</span></label>
            <p class="hl-form-hint">JSON object, e.g. <code>{"last_working_date": "31 Dec 2024"}</code></p>
            <textarea v-model="generateForm.custom_values" rows="3" class="hl-form-input hl-form-mono" placeholder='{"last_working_date": "31 Dec 2024"}' />
          </div>
          <div class="hl-modal-actions">
            <button class="hl-btn-ghost" @click="showGenerateForm = false">Cancel</button>
            <button class="hl-btn-primary" :disabled="generating" @click="generateLetter">
              {{ generating ? 'Generating…' : 'Generate' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.hl-wrap { display: flex; flex-direction: column; gap: 16px; }

.hl-tabs { display: flex; gap: 0; border-bottom: 1px solid #232936; }
.hl-tab {
  background: none; border: none; color: #7A8299; font-size: 13px; font-weight: 500;
  padding: 10px 18px; cursor: pointer; border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s; margin-bottom: -1px;
}
.hl-tab.active { color: #6B5BFF; border-bottom-color: #6B5BFF; }
.hl-tab:hover:not(.active) { color: #EEF0F4; }

.hl-bar { display: flex; align-items: center; justify-content: space-between; }
.hl-section-title { font-size: 14px; font-weight: 600; color: #EEF0F4; }

.hl-table-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.hl-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.hl-table thead tr { background: rgba(35,41,54,0.5); }
.hl-table th { padding: 10px 14px; font-size: 10.5px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.hl-table tbody tr { border-top: 1px solid #232936; }
.hl-table tbody tr:hover { background: rgba(107,91,255,0.04); }
.hl-table td { padding: 10px 14px; color: #B6BED0; }
.hl-td-primary { color: #EEF0F4 !important; font-weight: 500; }
.hl-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #7A8299 !important; }
.hl-empty { text-align: center; padding: 28px !important; color: #7A8299 !important; }

.hl-row-actions { display: flex; gap: 10px; }
.hl-link-btn { background: none; border: none; font-size: 12px; color: #6B5BFF; cursor: pointer; padding: 0; }
.hl-link-btn:hover { opacity: 0.8; }
.hl-link-danger { color: #F38288; }

.hl-pill {
  display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize;
}
.tone-green { background: rgba(77,211,154,0.12); color: #4DD39A; }
.tone-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.tone-blue { background: rgba(107,91,255,0.15); color: #6B5BFF; }
.tone-accent { background: rgba(155,110,255,0.12); color: #9B6EFF; }
.tone-orange { background: rgba(245,166,35,0.1); color: #F5A623; }
.tone-muted { background: rgba(122,130,153,0.12); color: #7A8299; }

.hl-loading { display: flex; justify-content: center; padding: 40px; }
.hl-spinner { width: 28px; height: 28px; border: 2px solid #232936; border-top-color: #6B5BFF; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.hl-btn-primary {
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
}
.hl-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.hl-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.hl-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 14px; font-size: 13px; cursor: pointer; transition: background 0.15s;
}
.hl-btn-ghost:hover { background: #232936; }

.hl-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; }
.hl-modal {
  background: #161A23; border: 1px solid #232936; border-radius: 12px;
  width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; padding: 24px;
  display: flex; flex-direction: column; gap: 14px;
}
.hl-modal-sm { max-width: 480px; }
.hl-modal-title { margin: 0; font-size: 15px; font-weight: 600; color: #EEF0F4; }
.hl-form-field { display: flex; flex-direction: column; gap: 6px; }
.hl-form-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.hl-form-opt { font-size: 10px; color: #7A8299; text-transform: none; letter-spacing: 0; margin-left: 4px; }
.hl-form-hint { margin: 0; font-size: 11px; color: #7A8299; }
.hl-form-hint code { color: #6B5BFF; }
.hl-form-input {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 8px 12px; outline: none;
  transition: border-color 0.15s; width: 100%; box-sizing: border-box; resize: vertical;
}
.hl-form-input:focus { border-color: #6B5BFF; }
.hl-form-input option { background: #161A23; }
.hl-form-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.hl-modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
</style>
