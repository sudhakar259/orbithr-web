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
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          @click="router.push({ name: 'recruitment.offers' })"
          class="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center"
        >
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Back to Offers
        </button>
        <h2 class="text-lg font-semibold text-white">Offer Templates</h2>
      </div>
      <button
        @click="openCreate"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
        New Template
      </button>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">{{ editingId ? 'Edit Template' : 'New Template' }}</h3>
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">Template Name *</label>
        <input v-model="form.name" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">
          Content
          <span class="ml-2 text-xs text-gray-500 font-normal">Use: {{candidate_name}}, {{position}}, {{company_name}}, {{salary}}, {{joining_date}}, {{expires_at}}</span>
        </label>
        <textarea v-model="form.content" rows="12" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none font-mono" />
      </div>
      <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input v-model="form.is_default" type="checkbox" class="rounded" />
        Set as default template
      </label>
      <div class="flex gap-3">
        <button @click="save" :disabled="saving" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {{ saving ? 'Saving...' : 'Save Template' }}
        </button>
        <button @click="showForm = false" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 2" :key="i" class="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse">
        <div class="h-5 bg-gray-700 rounded w-1/3 mb-2"></div>
        <div class="h-20 bg-gray-700 rounded"></div>
      </div>
    </div>

    <div v-else-if="templates.length === 0" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No templates yet.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="t in templates"
        :key="t.id"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <h3 class="text-base font-semibold text-white">{{ t.name }}</h3>
            <span v-if="t.is_default" class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-900/50 text-blue-400">Default</span>
          </div>
          <div class="flex gap-2">
            <button @click="openEdit(t)" class="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">Edit</button>
            <button @click="deleteTemplate(t.id)" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors">Delete</button>
          </div>
        </div>
        <pre class="text-xs text-gray-400 whitespace-pre-wrap bg-gray-900/50 rounded p-3 max-h-40 overflow-y-auto">{{ t.content }}</pre>
      </div>
    </div>
  </div>
</template>
