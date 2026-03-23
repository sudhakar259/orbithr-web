<script setup lang="ts">
defineOptions({ name: 'HrLetters' })

import { ref, onMounted } from 'vue'
import api from '@/services/api'

type Tab = 'templates' | 'generated'
const activeTab = ref<Tab>('templates')

// ── Templates ──
interface LetterTemplate {
  id: number
  name: string
  type: string
  body: string
  footer_text: string
  is_active: boolean
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
  if (!confirm('Delete this template?')) return
  try {
    await api.delete(`/hr-letters/templates/${id}`)
    await fetchTemplates()
  } catch { /* silently ignore */ }
}

// ── Generated Letters ──
interface GeneratedLetter {
  id: number
  employee_name: string
  letter_type: string
  generated_at: string
  status: string
}

const generatedLetters = ref<GeneratedLetter[]>([])
const lettersLoading = ref(false)
const showGenerateForm = ref(false)
const generateForm = ref({ employee_id: '', template_id: '', custom_values: '' })
const generating = ref(false)

interface Employee { id: number; first_name: string; last_name: string }
const employees = ref<Employee[]>([])

async function fetchGeneratedLetters() {
  lettersLoading.value = true
  try {
    const { data } = await api.get('/hr-letters')
    generatedLetters.value = data.data ?? data
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
    await api.post('/hr-letters/generate', generateForm.value)
    showGenerateForm.value = false
    generateForm.value = { employee_id: '', template_id: '', custom_values: '' }
    await fetchGeneratedLetters()
  } catch { /* silently ignore */ }
  finally { generating.value = false }
}

async function downloadLetter(id: number) {
  try {
    const { data } = await api.get(`/hr-letters/${id}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `letter-${id}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch { /* silently ignore */ }
}

function typeBadgeClass(type: string) {
  const map: Record<string, string> = {
    appointment: 'bg-blue-900/50 text-blue-400',
    experience: 'bg-green-900/50 text-green-400',
    relieving: 'bg-yellow-900/50 text-yellow-400',
    salary_certificate: 'bg-purple-900/50 text-purple-400',
    noc: 'bg-orange-900/50 text-orange-400',
    custom: 'bg-gray-700 text-gray-300',
  }
  return map[type] ?? 'bg-gray-700 text-gray-300'
}

onMounted(() => {
  fetchTemplates()
  fetchGeneratedLetters()
  fetchEmployees()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="mt-1 text-sm text-gray-400">Manage letter templates and generate employee letters</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <nav class="flex gap-4">
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'templates' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
          @click="activeTab = 'templates'"
        >Letter Templates</button>
        <button
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === 'generated' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
          @click="activeTab = 'generated'"
        >Generated Letters</button>
      </nav>
    </div>

    <!-- Templates Tab -->
    <div v-if="activeTab === 'templates'">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-white">Templates</h2>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" @click="openNewTemplate">New Template</button>
      </div>

      <!-- Template Form Modal -->
      <div v-if="showTemplateForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div class="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-white">{{ editingTemplate ? 'Edit Template' : 'New Template' }}</h3>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Name</label>
            <input v-model="templateForm.name" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Type</label>
            <select v-model="templateForm.type" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
              <option v-for="t in templateTypes" :key="t" :value="t">{{ t.replace(/_/g, ' ') }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Body</label>
            <p class="text-xs text-gray-500 mb-1">Use placeholders: <span v-pre>{{employee_name}} {{designation}} {{department}} {{date_of_joining}} {{last_working_date}}</span></p>
            <textarea v-model="templateForm.body" rows="10" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2 font-mono" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Footer Text</label>
            <input v-model="templateForm.footer_text" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" />
          </div>
          <div class="flex justify-end gap-3">
            <button class="bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 px-4 py-2 text-sm font-medium rounded-lg" @click="showTemplateForm = false">Cancel</button>
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" :disabled="templateSaving" @click="saveTemplate">{{ templateSaving ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>

      <div v-if="templatesLoading" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
            <tr>
              <th class="px-4 py-3">Name</th>
              <th class="px-4 py-3">Type</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="t in templates" :key="t.id" class="text-gray-300">
              <td class="px-4 py-3 text-white font-medium">{{ t.name }}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 text-xs rounded-full" :class="typeBadgeClass(t.type)">{{ t.type.replace(/_/g, ' ') }}</span></td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs rounded-full" :class="t.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'">{{ t.is_active ? 'Active' : 'Inactive' }}</span>
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <button class="text-blue-400 hover:text-blue-300 text-xs" @click="openEditTemplate(t)">Edit</button>
                  <button class="text-red-400 hover:text-red-300 text-xs" @click="deleteTemplate(t.id)">Delete</button>
                </div>
              </td>
            </tr>
            <tr v-if="templates.length === 0"><td colspan="4" class="px-4 py-8 text-center text-gray-500">No templates yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Generated Letters Tab -->
    <div v-if="activeTab === 'generated'">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-white">Generated Letters</h2>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" @click="showGenerateForm = true">Generate Letter</button>
      </div>

      <!-- Generate Form Modal -->
      <div v-if="showGenerateForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div class="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-lg p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Generate Letter</h3>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Employee</label>
            <select v-model="generateForm.employee_id" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
              <option value="">Select employee</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Template</label>
            <select v-model="generateForm.template_id" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
              <option value="">Select template</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Custom Values (optional)</label>
            <textarea v-model="generateForm.custom_values" rows="3" class="w-full bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2" placeholder="Any additional values..." />
          </div>
          <div class="flex justify-end gap-3">
            <button class="bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 px-4 py-2 text-sm font-medium rounded-lg" @click="showGenerateForm = false">Cancel</button>
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg" :disabled="generating" @click="generateLetter">{{ generating ? 'Generating...' : 'Generate' }}</button>
          </div>
        </div>
      </div>

      <div v-if="lettersLoading" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
            <tr>
              <th class="px-4 py-3">Employee</th>
              <th class="px-4 py-3">Letter Type</th>
              <th class="px-4 py-3">Generated</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="l in generatedLetters" :key="l.id" class="text-gray-300">
              <td class="px-4 py-3 text-white font-medium">{{ l.employee_name }}</td>
              <td class="px-4 py-3"><span class="px-2 py-0.5 text-xs rounded-full" :class="typeBadgeClass(l.letter_type)">{{ l.letter_type.replace(/_/g, ' ') }}</span></td>
              <td class="px-4 py-3 text-gray-400">{{ l.generated_at }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 text-xs rounded-full" :class="l.status === 'generated' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'">{{ l.status }}</span>
              </td>
              <td class="px-4 py-3">
                <button class="text-blue-400 hover:text-blue-300 text-xs" @click="downloadLetter(l.id)">Download</button>
              </td>
            </tr>
            <tr v-if="generatedLetters.length === 0"><td colspan="5" class="px-4 py-8 text-center text-gray-500">No letters generated yet</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
