<script setup lang="ts">
import { ref, reactive } from 'vue'
import { documentApi } from '@/services/api'

interface Props { employeeId: number }
const props = defineProps<Props>()
const emit = defineEmits<{ success: [doc: any]; cancel: [] }>()

const loading  = ref(false)
const dragOver = ref(false)
const selectedFile = ref<File | null>(null)
const uploadError  = ref('')

const form = reactive({
  document_type: '',
  document_name: '',
  expiry_date: '',
  notes: '',
})

const documentTypes = [
  { value: 'appointment_letter',    label: 'Appointment Letter' },
  { value: 'appraisal_letter',      label: 'Appraisal Letter' },
  { value: 'verification_document', label: 'Verification Document' },
  { value: 'offer_letter',          label: 'Offer Letter' },
  { value: 'employment_contract',   label: 'Employment Contract' },
  { value: 'id_proof',              label: 'ID Proof' },
  { value: 'certificate',           label: 'Certificate' },
  { value: 'resume',                label: 'Resume' },
  { value: 'passport',              label: 'Passport' },
  { value: 'driving_license',       label: 'Driving License' },
  { value: 'tax_documents',         label: 'Tax Documents' },
  { value: 'bank_details',          label: 'Bank Details' },
  { value: 'work_permit',           label: 'Work Permit' },
  { value: 'other',                 label: 'Other' },
]

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files?.[0]) {
    selectedFile.value = target.files[0]
    if (!form.document_name) form.document_name = target.files[0].name.replace(/\.[^/.]+$/, '')
  }
}
function handleDrop(event: DragEvent) {
  event.preventDefault(); dragOver.value = false
  if (event.dataTransfer?.files?.[0]) {
    selectedFile.value = event.dataTransfer.files[0]
    if (!form.document_name) form.document_name = event.dataTransfer.files[0].name.replace(/\.[^/.]+$/, '')
  }
}
function removeFile() { selectedFile.value = null }

function formatSize(bytes: number) {
  const units = ['B','KB','MB','GB']
  let s = bytes, u = 0
  while (s >= 1024 && u < units.length - 1) { s /= 1024; u++ }
  return `${s.toFixed(1)} ${units[u]}`
}

function fileIcon(mime?: string) {
  if (!mime) return '📄'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📕'
  return '📄'
}

async function handleSubmit() {
  if (!selectedFile.value || !form.document_type || !form.document_name) return
  loading.value = true; uploadError.value = ''
  try {
    const fd = new FormData()
    fd.append('document', selectedFile.value)
    fd.append('document_type', form.document_type)
    fd.append('document_name', form.document_name)
    if (form.expiry_date) fd.append('expiry_date', form.expiry_date)
    if (form.notes) fd.append('notes', form.notes)
    const response = await documentApi.upload(props.employeeId, fd)
    emit('success', response.data)
  } catch (e: any) {
    uploadError.value = e?.response?.data?.message || 'Upload failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="du-wrap">
    <form @submit.prevent="handleSubmit" class="du-form">

      <!-- Drop zone -->
      <div class="du-field">
        <label class="du-label">File <span class="req">*</span></label>

        <div
          v-if="!selectedFile"
          class="du-dropzone"
          :class="{ 'du-dropzone--over': dragOver }"
          @drop="handleDrop"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
        >
          <div class="du-drop-icon">📁</div>
          <p class="du-drop-text">Drop your file here, or
            <label class="du-browse">
              browse
              <input type="file" class="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" @change="handleFileSelect" />
            </label>
          </p>
          <p class="du-drop-hint">PDF, DOC, DOCX, JPG, PNG — max 10 MB</p>
        </div>

        <div v-else class="du-file-card">
          <span class="du-file-icon">{{ fileIcon(selectedFile.type) }}</span>
          <div class="du-file-info">
            <p class="du-file-name">{{ selectedFile.name }}</p>
            <p class="du-file-size">{{ formatSize(selectedFile.size) }}</p>
          </div>
          <button type="button" class="du-remove" @click="removeFile" title="Remove">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Type -->
      <div class="du-field">
        <label class="du-label">Document Type <span class="req">*</span></label>
        <select v-model="form.document_type" required class="du-input">
          <option value="">Select type</option>
          <option v-for="t in documentTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>

      <!-- Name -->
      <div class="du-field">
        <label class="du-label">Document Name <span class="req">*</span></label>
        <input v-model="form.document_name" type="text" required class="du-input" placeholder="e.g. Offer Letter 2024" />
      </div>

      <!-- Grid: expiry + notes -->
      <div class="du-grid">
        <div class="du-field">
          <label class="du-label">Expiry Date <span class="du-optional">(optional)</span></label>
          <input v-model="form.expiry_date" type="date" class="du-input" />
        </div>
        <div class="du-field">
          <label class="du-label">Notes <span class="du-optional">(optional)</span></label>
          <input v-model="form.notes" type="text" class="du-input" placeholder="Any notes…" />
        </div>
      </div>

      <!-- Error -->
      <div v-if="uploadError" class="du-error">{{ uploadError }}</div>

      <!-- Actions -->
      <div class="du-actions">
        <button type="button" class="du-btn du-btn--ghost" @click="$emit('cancel')">Cancel</button>
        <button
          type="submit"
          class="du-btn du-btn--primary"
          :disabled="!selectedFile || !form.document_type || !form.document_name || loading"
        >
          {{ loading ? 'Uploading…' : 'Upload Document' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.du-wrap  { color: var(--text); }
.du-form  { display: flex; flex-direction: column; gap: 16px; }

.du-field { display: flex; flex-direction: column; gap: 6px; }
.du-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 560px) { .du-grid { grid-template-columns: 1fr; } }

.du-label    { font-size: 0.8rem; font-weight: 500; color: var(--muted); }
.du-optional { font-weight: 400; }
.req { color: var(--red); }

.du-input {
  background: var(--surface2);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 7px;
  padding: 8px 12px;
  font-size: 0.875rem;
  color: var(--text);
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.du-input:focus { border-color: var(--accent); }

/* Drop zone */
.du-dropzone {
  border: 2px dashed rgba(255,255,255,.12);
  border-radius: 10px;
  padding: 32px;
  text-align: center;
  background: var(--surface2);
  transition: border-color .15s, background .15s;
  cursor: pointer;
}
.du-dropzone--over { border-color: var(--accent); background: rgba(79,126,255,.07); }
.du-drop-icon { font-size: 2rem; margin-bottom: 8px; }
.du-drop-text { font-size: 0.875rem; color: var(--muted); }
.du-browse { color: var(--accent); cursor: pointer; text-decoration: underline; }
.du-drop-hint { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
.hidden { display: none; }

/* File card */
.du-file-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--surface2);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px;
  padding: 12px;
}
.du-file-icon { font-size: 1.5rem; flex-shrink: 0; }
.du-file-info { flex: 1; min-width: 0; }
.du-file-name { font-size: 0.875rem; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.du-file-size { font-size: 0.75rem; color: var(--muted); }
.du-remove { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: transparent; border: 1px solid rgba(255,255,255,.1); color: var(--muted); cursor: pointer; flex-shrink: 0; }
.du-remove:hover { background: rgba(255,107,107,.15); color: var(--red); border-color: rgba(255,107,107,.3); }

/* Error */
.du-error { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.25); border-radius: 7px; padding: 10px 14px; font-size: 0.8rem; color: var(--red); }

/* Actions */
.du-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.du-btn { display: inline-flex; align-items: center; padding: 8px 18px; border-radius: 7px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; }
.du-btn:disabled { opacity: .45; cursor: not-allowed; }
.du-btn--primary { background: var(--accent); color: #fff; }
.du-btn--primary:not(:disabled):hover { opacity: .88; }
.du-btn--ghost { background: var(--surface2); border: 1px solid rgba(255,255,255,.1); color: var(--text); }
.du-btn--ghost:hover { background: var(--surface3); }
</style>
