<script setup lang="ts">
defineOptions({ name: 'ReportsCustomBuilder' })
import { ref, onMounted } from 'vue'
import { reportService, type ReportTemplate } from '@/services/reportService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

const loading = ref(false)
const saving = ref(false)
const running = ref(false)
const error = ref('')
const templates = ref<ReportTemplate[]>([])
const results = ref<Record<string, unknown>[]>([])
const resultKeys = ref<string[]>([])
const showForm = ref(false)
const runningTemplate = ref<ReportTemplate | null>(null)

const form = ref({ name: '', description: '', report_type: 'attendance', is_shared: false })

const reportTypes = ['attendance', 'payroll', 'headcount', 'attrition', 'performance']

const load = async () => {
  loading.value = true
  try {
    const res = await reportService.getTemplates()
    templates.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load templates'
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  error.value = ''
  try {
    await reportService.createTemplate({
      ...form.value,
      config: {},
      filters: {},
      columns: [],
    })
    showForm.value = false
    form.value = { name: '', description: '', report_type: 'attendance', is_shared: false }
    await load()
  } catch {
    error.value = 'Failed to save template'
  } finally {
    saving.value = false
  }
}

const runReport = async (template: ReportTemplate) => {
  running.value = true
  runningTemplate.value = template
  results.value = []
  resultKeys.value = []
  try {
    const res = await reportService.runCustomReport(template.id)
    const data = res.data?.data ?? []
    results.value = data
    resultKeys.value = data.length ? Object.keys(data[0]) : []
  } catch {
    error.value = 'Failed to run report'
  } finally {
    running.value = false
  }
}

const deleteTemplate = async (id: number) => {
  if (!await dialog('Delete', 'Delete this template?')) return
  try {
    await reportService.deleteTemplate(id)
    await load()
  } catch {
    error.value = 'Failed to delete template'
  }
}

onMounted(load)
</script>

<template>
  <div class="crb-page">
    <div class="crb-toolbar">
      <p class="crb-desc">Create and run custom report templates</p>
      <button class="crb-btn-primary" @click="showForm = !showForm">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
        New Template
      </button>
    </div>

    <div v-if="showForm" class="crb-form-card">
      <h3 class="crb-form-title">New Report Template</h3>
      <div class="crb-form-grid">
        <div class="crb-field">
          <label class="crb-label">Template Name *</label>
          <input v-model="form.name" type="text" class="crb-input" />
        </div>
        <div class="crb-field">
          <label class="crb-label">Report Type</label>
          <select v-model="form.report_type" class="crb-input">
            <option v-for="t in reportTypes" :key="t" :value="t" class="capitalize">{{ t }}</option>
          </select>
        </div>
        <div class="crb-field crb-full">
          <label class="crb-label">Description</label>
          <input v-model="form.description" type="text" class="crb-input" />
        </div>
      </div>
      <label class="crb-checkbox-row">
        <input v-model="form.is_shared" type="checkbox" class="crb-checkbox" />
        <span>Share with team</span>
      </label>
      <div class="crb-form-actions">
        <button class="crb-btn-primary" :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save Template' }}</button>
        <button class="crb-btn-ghost" @click="showForm = false">Cancel</button>
      </div>
    </div>

    <div v-if="error" class="crb-error">{{ error }}</div>

    <div v-if="loading" class="crb-card crb-loading">
      <div v-for="i in 3" :key="i" class="crb-skeleton"></div>
    </div>

    <div v-else-if="templates.length === 0 && !showForm" class="crb-empty">No report templates yet. Create one to get started.</div>

    <div v-else class="crb-template-list">
      <div v-for="t in templates" :key="t.id" class="crb-template-card">
        <div class="crb-template-info">
          <div class="crb-template-name">{{ t.name }}</div>
          <div class="crb-template-meta">
            <span class="crb-type-badge">{{ t.report_type }}</span>
            <span v-if="t.description" class="crb-template-desc">{{ t.description }}</span>
          </div>
        </div>
        <div class="crb-template-actions">
          <button class="crb-btn-run" :disabled="running" @click="runReport(t)">
            {{ running && runningTemplate?.id === t.id ? 'Running…' : 'Run' }}
          </button>
          <button class="crb-btn-delete" @click="deleteTemplate(t.id)">Delete</button>
        </div>
      </div>
    </div>

    <div v-if="results.length" class="crb-results-card">
      <div class="crb-results-head">Results — {{ runningTemplate?.name }}</div>
      <div class="crb-results-scroll">
        <table class="crb-table">
          <thead>
            <tr>
              <th v-for="key in resultKeys" :key="key" class="crb-th">{{ key }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in results" :key="i" class="crb-row">
              <td v-for="key in resultKeys" :key="key" class="crb-td">{{ row[key] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crb-page { display: flex; flex-direction: column; gap: 16px; }
.crb-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.crb-desc { font-size: 13px; color: #7A8299; margin: 0; }
.crb-btn-primary { display: inline-flex; align-items: center; gap: 6px; background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.crb-btn-primary:hover { opacity: 0.88; }
.crb-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.crb-btn-ghost { background: transparent; border: 1px solid #232936; color: #7A8299; border-radius: 7px; padding: 8px 14px; font-size: 13px; cursor: pointer; }
.crb-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.crb-form-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.crb-form-title { margin: 0; font-size: 13px; font-weight: 600; color: #EEF0F4; text-transform: uppercase; letter-spacing: 0.08em; }
.crb-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.crb-field { display: flex; flex-direction: column; gap: 5px; }
.crb-full { grid-column: 1 / -1; }
.crb-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.crb-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.crb-input:focus { border-color: #6B5BFF; }
.crb-checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.crb-checkbox { accent-color: #6B5BFF; }
.crb-form-actions { display: flex; gap: 10px; }
.crb-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.crb-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; }
.crb-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.crb-skeleton { height: 64px; background: #232936; border-radius: 6px; animation: crb-pulse 1.2s ease-in-out infinite; }
@keyframes crb-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.crb-template-list { display: flex; flex-direction: column; gap: 8px; }
.crb-template-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.crb-template-info { flex: 1; min-width: 0; }
.crb-template-name { font-size: 14px; font-weight: 600; color: #EEF0F4; margin-bottom: 4px; }
.crb-template-meta { display: flex; align-items: center; gap: 8px; }
.crb-type-badge { font-size: 11px; color: #8A7BFF; background: rgba(107,91,255,0.12); padding: 2px 7px; border-radius: 4px; text-transform: capitalize; font-family: 'JetBrains Mono', monospace; }
.crb-template-desc { font-size: 12px; color: #7A8299; }
.crb-template-actions { display: flex; gap: 8px; flex-shrink: 0; }
.crb-btn-run { background: #6B5BFF; border: none; color: #fff; border-radius: 6px; padding: 6px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.crb-btn-run:hover { opacity: 0.88; }
.crb-btn-run:disabled { opacity: 0.45; cursor: not-allowed; }
.crb-btn-delete { background: transparent; border: 1px solid rgba(243,130,136,0.25); color: #F38288; border-radius: 6px; padding: 6px 14px; font-size: 12px; cursor: pointer; }
.crb-btn-delete:hover { background: rgba(243,130,136,0.1); }
.crb-results-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.crb-results-head { padding: 14px 16px; border-bottom: 1px solid #232936; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.crb-results-scroll { overflow-x: auto; }
.crb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.crb-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; white-space: nowrap; }
.crb-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.crb-row:last-child { border-bottom: none; }
.crb-row:hover { background: rgba(255,255,255,0.02); }
.crb-td { padding: 11px 16px; color: #B6BED0; vertical-align: middle; white-space: nowrap; }
.crb-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }
</style>
