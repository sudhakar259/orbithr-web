<script setup lang="ts">
import { ref, reactive } from 'vue'
import { documentApi } from '@/services/api'

interface Document {
  id?: number
  document_type: string
  document_name: string
  file_path?: string
  original_filename?: string
  mime_type?: string
  file_size?: number
  expiry_date?: string
  notes?: string
  created_at?: string
}

interface Props {
  employeeId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  success: [document: Document]
  cancel: []
}>()

const loading = ref(false)
const dragOver = ref(false)
const selectedFile = ref<File | null>(null)

const form = reactive({
  document_type: '',
  document_name: '',
  expiry_date: '',
  notes: ''
})

const documentTypes = [
  { value: 'id_proof', label: 'ID Proof' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'resume', label: 'Resume' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'employment_contract', label: 'Employment Contract' },
  { value: 'work_permit', label: 'Work Permit' },
  { value: 'passport', label: 'Passport' },
  { value: 'visa', label: 'Visa' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'bank_details', label: 'Bank Details' },
  { value: 'tax_documents', label: 'Tax Documents' },
  { value: 'other', label: 'Other' }
]

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
    if (!form.document_name) {
      form.document_name = target.files[0].name
    }
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false

  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    selectedFile.value = event.dataTransfer.files[0]
    if (!form.document_name) {
      form.document_name = event.dataTransfer.files[0].name
    }
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  dragOver.value = true
}

function handleDragLeave() {
  dragOver.value = false
}

function removeFile() {
  selectedFile.value = null
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

async function handleSubmit() {
  if (!selectedFile.value || !form.document_type || !form.document_name) {
    return
  }

  loading.value = true

  try {
    const formData = new FormData()
    formData.append('document', selectedFile.value)
    formData.append('document_type', form.document_type)
    formData.append('document_name', form.document_name)
    if (form.expiry_date) {
      formData.append('expiry_date', form.expiry_date)
    }
    if (form.notes) {
      formData.append('notes', form.notes)
    }

    const response = await documentApi.upload(props.employeeId, formData)
    emit('success', response.data)
  } catch (error) {
    console.error('Error uploading document:', error)
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-xl border border-slate-200 shadow-soft">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-200">
        <h2 class="text-xl font-semibold text-slate-900">Upload Document</h2>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <!-- File Upload Area -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Document File *
          </label>

          <!-- File Drop Zone -->
          <div
            v-if="!selectedFile"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            :class="[
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              dragOver
                ? 'border-brand-400 bg-brand-50'
                : 'border-slate-300 hover:border-slate-400'
            ]"
          >
            <div class="space-y-4">
              <div class="text-4xl">📄</div>
              <div>
                <p class="text-lg font-medium text-slate-900">
                  Drop your file here, or
                  <label class="text-brand-600 hover:text-brand-700 cursor-pointer underline">
                    browse
                    <input
                      type="file"
                      @change="handleFileSelect"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      class="hidden"
                    />
                  </label>
                </p>
                <p class="text-sm text-slate-500 mt-1">
                  Supports: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                </p>
              </div>
            </div>
          </div>

          <!-- Selected File Display -->
          <div v-else class="border border-slate-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="text-2xl">📄</div>
                <div>
                  <p class="font-medium text-slate-900">{{ selectedFile.name }}</p>
                  <p class="text-sm text-slate-500">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
              </div>
              <button
                type="button"
                @click="removeFile"
                class="text-slate-400 hover:text-slate-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Document Type -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Document Type *
          </label>
          <select v-model="form.document_type" required class="input">
            <option value="">Select document type</option>
            <option v-for="type in documentTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <!-- Document Name -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Document Name *
          </label>
          <input
            v-model="form.document_name"
            type="text"
            required
            class="input"
            placeholder="Enter document name"
          />
        </div>

        <!-- Expiry Date -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Expiry Date (Optional)
          </label>
          <input
            v-model="form.expiry_date"
            type="date"
            class="input"
          />
          <p class="text-xs text-slate-500 mt-1">
            Leave empty if document doesn't expire
          </p>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            v-model="form.notes"
            rows="3"
            class="input"
            placeholder="Add any additional notes about this document"
          ></textarea>
        </div>

        <!-- Form Actions -->
        <div class="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <button
            type="button"
            @click="handleCancel"
            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="!selectedFile || !form.document_type || !form.document_name || loading"
            class="px-4 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Uploading...' : 'Upload Document' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
