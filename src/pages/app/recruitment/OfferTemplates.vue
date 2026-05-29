<script setup lang="ts">
defineOptions({ name: 'RecruitmentOfferTemplates' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { recruitmentService, type OfferTemplate } from '@/services/recruitmentService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

const router = useRouter()
const loading = ref(true)
const templates = ref<OfferTemplate[]>([])
const error = ref('')
const saving = ref(false)
const showForm = ref(false)
const editingId = ref<number | null>(null)

const form = ref({ name: '', content: '', is_default: false })

const defaultContent = `Dear {{candidate_name}},

We are pleased to offer you the position of {{position}} at {{company_name}}.

Salary: {{salary}}
Joining Date: {{joining_date}}

Please confirm your acceptance by {{expires_at}}.

Regards,
HR Team`

const load = async () => {
  loading.value = true
  try {
    const res = await recruitmentService.getOfferTemplates()
    templates.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load templates'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  form.value = { name: '', content: defaultContent, is_default: false }
  showForm.value = true
}

const openEdit = (t: OfferTemplate) => {
  editingId.value = t.id
  form.value = { name: t.name, content: t.content, is_default: t.is_default }
  showForm.value = true
}

const save = async () => {
  saving.value = true
  error.value = ''
  try {
    if (editingId.value) {
      await recruitmentService.updateOfferTemplate(editingId.value, form.value)
    } else {
      await recruitmentService.createOfferTemplate(form.value)
    }
    showForm.value = false
    await load()
  } catch {
    error.value = 'Failed to save template'
  } finally {
    saving.value = false
  }
}

const deleteTemplate = async (id: number) => {
  if (!await dialog('Delete', 'Delete this template?')) return
  try {
    await recruitmentService.deleteOfferTemplate(id)
    await load()
  } catch {
    error.value = 'Failed to delete template'
  }
}

onMounted(load)
</script>

<template>
  <div class="ot-page">
    <div class="ot-header">
      <div class="ot-header-left">
        <button class="ot-back" @click="router.push({ name: 'recruitment.offers' })">&#8592; Back to Offers</button>
        <h2 class="ot-title">Offer Templates</h2>
      </div>
      <button class="ot-btn-primary" @click="openCreate">+ New Template</button>
    </div>

    <div v-if="error" class="ot-error">{{ error }}</div>

    <!-- Form -->
    <div v-if="showForm" class="ot-form-card">
      <h3 class="ot-form-title">{{ editingId ? 'Edit Template' : 'New Template' }}</h3>
      <div class="ot-field">
        <label class="ot-label">Template Name <span class="ot-req">*</span></label>
        <input v-model="form.name" type="text" class="ot-input" />
      </div>
      <div class="ot-field">
        <label class="ot-label">
          Content
          <span class="ot-hint">Use: &#123;&#123;candidate_name&#125;&#125;, &#123;&#123;position&#125;&#125;, &#123;&#123;company_name&#125;&#125;, &#123;&#123;salary&#125;&#125;, &#123;&#123;joining_date&#125;&#125;, &#123;&#123;expires_at&#125;&#125;</span>
        </label>
        <textarea v-model="form.content" rows="12" class="ot-input ot-mono" />
      </div>
      <label class="ot-check-row">
        <input v-model="form.is_default" type="checkbox" class="ot-checkbox" />
        <span>Set as default template</span>
      </label>
      <div class="ot-form-actions">
        <button class="ot-btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save Template' }}
        </button>
        <button class="ot-btn-ghost" @click="showForm = false">Cancel</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="ot-loading">
      <div v-for="i in 2" :key="i" class="ot-skeleton"></div>
    </div>

    <div v-else-if="templates.length === 0" class="ot-empty">No templates yet.</div>

    <div v-else class="ot-list">
      <div v-for="t in templates" :key="t.id" class="ot-template-card">
        <div class="ot-template-head">
          <div class="ot-template-name-row">
            <h3 class="ot-template-name">{{ t.name }}</h3>
            <span v-if="t.is_default" class="ot-default-badge">Default</span>
          </div>
          <div class="ot-template-actions">
            <button class="ot-action-btn" @click="openEdit(t)">Edit</button>
            <button class="ot-delete-btn" @click="deleteTemplate(t.id)">Delete</button>
          </div>
        </div>
        <pre class="ot-content-preview">{{ t.content }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ot-page { display: flex; flex-direction: column; gap: 16px; }
.ot-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.ot-header-left { display: flex; align-items: center; gap: 12px; }
.ot-back { font-size: 13px; color: #7A8299; background: none; border: none; cursor: pointer; padding: 0; }
.ot-back:hover { color: #EEF0F4; }
.ot-title { font-size: 16px; font-weight: 700; color: #EEF0F4; margin: 0; }
.ot-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.ot-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.ot-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.ot-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.ot-btn-ghost:hover { color: #EEF0F4; }
.ot-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.ot-form-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.ot-form-title { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.08em; margin: 0; }
.ot-field { display: flex; flex-direction: column; gap: 5px; }
.ot-label { font-size: 12px; font-weight: 500; color: #B6BED0; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.ot-hint { font-size: 11px; color: #7A8299; font-weight: 400; }
.ot-req { color: #F38288; }
.ot-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.ot-input:focus { border-color: #6B5BFF; }
.ot-mono { font-family: 'JetBrains Mono', monospace; resize: vertical; min-height: 240px; }
.ot-check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.ot-checkbox { accent-color: #6B5BFF; }
.ot-form-actions { display: flex; gap: 10px; }
.ot-loading { display: flex; flex-direction: column; gap: 10px; }
.ot-skeleton { height: 100px; background: #232936; border-radius: 10px; animation: ot-pulse 1.2s ease-in-out infinite; }
@keyframes ot-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ot-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 60px 20px; text-align: center; font-size: 13px; color: #7A8299; }
.ot-list { display: flex; flex-direction: column; gap: 12px; }
.ot-template-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.ot-template-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.ot-template-name-row { display: flex; align-items: center; gap: 10px; }
.ot-template-name { font-size: 14px; font-weight: 600; color: #EEF0F4; margin: 0; }
.ot-default-badge { background: rgba(107,91,255,0.12); color: #8A7BFF; border-radius: 20px; padding: 2px 9px; font-size: 11px; font-weight: 500; }
.ot-template-actions { display: flex; gap: 6px; }
.ot-action-btn { font-size: 12px; color: #7A8299; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 5px; }
.ot-action-btn:hover { color: #EEF0F4; background: #232936; }
.ot-delete-btn { font-size: 12px; color: #F38288; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 5px; }
.ot-delete-btn:hover { background: rgba(243,130,136,0.08); }
.ot-content-preview { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #B6BED0; background: rgba(13,15,23,0.5); border: 1px solid #1C2030; border-radius: 6px; padding: 10px 12px; white-space: pre-wrap; max-height: 120px; overflow-y: auto; margin: 0; }
</style>
