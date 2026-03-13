<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
      <h2 class="mb-4 text-lg font-semibold text-slate-900">Upload Document</h2>

      <form @submit.prevent="submit" class="space-y-4">
        <!-- Document Type -->
        <div>
          <label class="block text-sm font-medium text-slate-700">Document Type *</label>
          <select v-model="form.document_type" required class="input mt-1">
            <option value="">Select Document Type</option>
            <option value="appointment_letter">Appointment Letter</option>
            <option value="verification_document">Verification Document</option>
            <option value="appraisal_letter">Appraisal Letter</option>
            <option value="id_proof">ID Proof</option>
            <option value="address_proof">Address Proof</option>
            <option value="qualification">Educational Qualification</option>
            <option value="certificate">Certificate</option>
            <option value="other">Other</option>
          </select>
        </div>

        <!-- Document Name -->
        <div>
          <label class="block text-sm font-medium text-slate-700">Document Name *</label>
          <input
            v-model="form.document_name"
            type="text"
            required
            class="input mt-1"
            placeholder="e.g., Appointment Letter 2024"
          />
        </div>

        <!-- File Upload -->
        <div>
          <label class="block text-sm font-medium text-slate-700">File *</label>
          <div class="mt-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-6 transition-colors hover:border-brand-400">
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              @change="handleFileSelect"
            />
            <button
              type="button"
              class="text-center text-sm text-brand-600 hover:text-brand-700"
              @click="$refs.fileInput?.click()"
            >
              <div class="text-lg">📎</div>
              <p>Click to upload or drag and drop</p>
              <p class="text-xs text-slate-500">PDF, DOC, DOCX, JPG, PNG (Max 10MB)</p>
            </button>
            <p v-if="form.file" class="mt-2 text-sm text-green-600">✓ {{ form.file.name }}</p>
          </div>
        </div>

        <!-- Expiry Date -->
        <div>
          <label class="block text-sm font-medium text-slate-700">Expiry Date (Optional)</label>
          <input v-model="form.expiry_date" type="date" class="input mt-1" />
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-slate-700">Notes (Optional)</label>
          <textarea v-model="form.notes" class="input mt-1" rows="3" placeholder="Additional notes..."></textarea>
        </div>

        <!-- Error Message -->
        <p v-if="error" class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ error }}</p>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button type="button" class="btn-ghost" @click="$emit('cancel')">Cancel</button>
          <button type="submit" class="btn-primary" :disabled="loading || !form.file">
            {{ loading ? 'Uploading…' : 'Upload' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import api from '@/services/api'

interface Props {
  employeeId: number
}

interface DocumentForm {
  document_type: string
  document_name: string
  file: File | null
  expiry_date: string
  notes: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'success'): void
}>()

const fileInput = ref<HTMLInputElement>()
const loading = ref(false)
const error = ref('')

const form = reactive<DocumentForm>({
  document_type: '',
  document_name: '',
  file: null,
  expiry_date: '',
  notes: '',
})

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.size > 10 * 1024 * 1024) {
      error.value = 'File size must be less than 10MB'
      return
    }
    form.file = file
    error.value = ''
  }
}

async function submit() {
  if (!form.file) {
    error.value = 'Please select a file'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const formData = new FormData()
    formData.append('document', form.file)
    formData.append('document_type', form.document_type)
    formData.append('document_name', form.document_name)
    if (form.expiry_date) formData.append('expiry_date', form.expiry_date)
    if (form.notes) formData.append('notes', form.notes)

    await api.post(`/employees/${props.employeeId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    emit('success')
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to upload document'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.input {
  @apply w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500;
}

.btn-primary {
  @apply inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50;
}

.btn-ghost {
  @apply inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50;
}
</style>
