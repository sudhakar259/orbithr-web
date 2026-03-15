<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DocumentUpload from '@/components/employee/DocumentUpload.vue'
import { documentApi } from '@/services/api'

const props = defineProps<{ employeeId: number }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const docs      = ref<any[]>([])
const loading   = ref(false)
const showUpload = ref(false)

const TYPE_LABELS: Record<string, string> = {
  appointment_letter:    'Appointment Letter',
  appraisal_letter:      'Appraisal Letter',
  verification_document: 'Verification Document',
  offer_letter:          'Offer Letter',
  employment_contract:   'Employment Contract',
  id_proof:              'ID Proof',
  certificate:           'Certificate',
  resume:                'Resume',
  passport:              'Passport',
  driving_license:       'Driving License',
  tax_documents:         'Tax Documents',
  bank_details:          'Bank Details',
  work_permit:           'Work Permit',
  other:                 'Other',
}

function typeLabel(type: string) { return TYPE_LABELS[type] || type }

async function load() {
  loading.value = true
  try {
    const { data } = await documentApi.getAll(props.employeeId)
    docs.value = Array.isArray(data) ? data : (data.data || [])
  } catch { docs.value = [] }
  finally { loading.value = false }
}

async function download(doc: any) {
  try {
    const response = await documentApi.download(props.employeeId, doc.id)
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = doc.original_filename || doc.document_name
    link.click()
    window.URL.revokeObjectURL(url)
  } catch { alert('Download failed.') }
}

async function remove(doc: any) {
  if (!confirm(`Delete "${doc.document_name}"?`)) return
  try {
    await documentApi.delete(props.employeeId, doc.id)
    await load(); emit('changed')
  } catch (e: any) {
    alert(e?.response?.data?.error || 'Failed to delete document.')
  }
}

function onUploaded() { showUpload.value = false; load(); emit('changed') }

onMounted(load)
</script>

<template>
  <div class="dm-wrap">
    <!-- Header -->
    <div class="dm-head">
      <div>
        <h3 class="dm-title">Documents</h3>
        <p class="dm-sub">{{ docs.length }} file{{ docs.length !== 1 ? 's' : '' }}</p>
      </div>
      <button class="dm-upload-btn" @click="showUpload = !showUpload">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-8-4-4m0 0L8 8m4-4v12"/></svg>
        {{ showUpload ? 'Cancel' : 'Upload' }}
      </button>
    </div>

    <!-- Upload Form -->
    <div v-if="showUpload" class="dm-upload-area">
      <DocumentUpload :employee-id="employeeId" @success="onUploaded" @cancel="showUpload = false" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="dm-empty">Loading documents…</div>

    <!-- Table -->
    <div v-else-if="docs.length" class="dm-table-wrap">
      <table class="dm-table">
        <thead>
          <tr>
            <th class="dm-th">Name</th>
            <th class="dm-th">Type</th>
            <th class="dm-th">Added</th>
            <th class="dm-th dm-th-right"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in docs" :key="doc.id" class="dm-tr">
            <td class="dm-td">
              <div class="dm-doc-name">
                <span class="dm-doc-icon">{{ doc.mime_type?.includes('image') ? '🖼️' : doc.mime_type?.includes('pdf') ? '📕' : '📄' }}</span>
                <span>{{ doc.document_name || doc.original_filename }}</span>
              </div>
            </td>
            <td class="dm-td dm-td--muted">{{ typeLabel(doc.document_type) }}</td>
            <td class="dm-td dm-td--muted">{{ doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—' }}</td>
            <td class="dm-td dm-td-actions">
              <button class="dm-act dm-act--download" @click="download(doc)" title="Download">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4"/></svg>
              </button>
              <button class="dm-act dm-act--delete" @click="remove(doc)" title="Delete">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty -->
    <div v-else class="dm-empty">No documents uploaded yet.</div>
  </div>
</template>

<style scoped>
.dm-wrap { color: var(--text); }

.dm-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
.dm-title { font-size: 0.875rem; font-weight: 600; color: var(--text); }
.dm-sub   { font-size: 0.75rem; color: var(--muted); margin-top: 2px; }

.dm-upload-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--surface2); border: 1px solid rgba(255,255,255,.1);
  border-radius: 7px; padding: 6px 14px;
  font-size: 0.8rem; font-weight: 500; color: var(--text); cursor: pointer;
}
.dm-upload-btn:hover { background: var(--surface3); }

.dm-upload-area { margin-bottom: 14px; background: var(--surface2); border: 1px solid rgba(255,255,255,.07); border-radius: 10px; padding: 16px; }

.dm-empty { padding: 24px; text-align: center; font-size: 0.875rem; color: var(--muted); background: var(--surface2); border-radius: 8px; }

.dm-table-wrap { border: 1px solid rgba(255,255,255,.06); border-radius: 8px; overflow: hidden; }
.dm-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.dm-th { padding: 9px 12px; text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); background: var(--surface2); border-bottom: 1px solid rgba(255,255,255,.06); }
.dm-th-right { text-align: right; width: 80px; }
.dm-tr:not(:last-child) td { border-bottom: 1px solid rgba(255,255,255,.04); }
.dm-td { padding: 10px 12px; vertical-align: middle; }
.dm-td--muted { color: var(--muted); }
.dm-td-actions { text-align: right; white-space: nowrap; }

.dm-doc-name { display: flex; align-items: center; gap: 8px; font-weight: 500; }
.dm-doc-icon { font-size: 1rem; }

.dm-act { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(255,255,255,.08); background: transparent; color: var(--muted); cursor: pointer; margin-left: 4px; }
.dm-act--download:hover { background: rgba(79,126,255,.15); color: var(--accent); border-color: rgba(79,126,255,.3); }
.dm-act--delete:hover   { background: rgba(255,107,107,.15); color: var(--red); border-color: rgba(255,107,107,.3); }
</style>
