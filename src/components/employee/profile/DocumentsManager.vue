<template>
  <SectionCard title="Documents" description="Upload and manage employee documents">
    <div class="space-y-4">
      <div class="flex justify-end">
        <button class="btn-primary" @click="showUpload = true">Upload Document</button>
      </div>
      <div class="overflow-hidden rounded-lg border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Name</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Type</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Added</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="doc in docs" :key="doc.id">
              <td class="px-4 py-2">{{ doc.document_name || doc.original_filename }}</td>
              <td class="px-4 py-2">{{ doc.document_type }}</td>
              <td class="px-4 py-2">{{ doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-' }}</td>
              <td class="px-4 py-2 text-right">
                <button class="text-brand-700 hover:underline mr-3" @click="$emit('download', doc)">Download</button>
                <button class="text-red-600 hover:underline" @click="remove(doc)">Delete</button>
              </td>
            </tr>
            <tr v-if="!docs.length">
              <td colspan="4" class="px-4 py-6 text-center text-slate-500">No documents found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocumentUpload v-if="showUpload" :employee-id="employeeId" @success="onUploaded" @cancel="showUpload=false" />
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SectionCard from './SectionCard.vue'
import DocumentUpload from '@/components/employee/DocumentUpload.vue'
import { documentApi } from '@/services/api'

const props = defineProps<{ employeeId: number }>()
const emit = defineEmits<{ (e: 'changed'): void; (e: 'download', doc: any): void }>()

const docs = ref<any[]>([])
const showUpload = ref(false)

async function load() {
  try {
    const { data } = await documentApi.getAll(props.employeeId)
    docs.value = Array.isArray(data) ? data : (data.data || [])
  } catch {
    docs.value = []
  }
}

async function remove(doc: any) {
  if (!confirm('Delete this document?')) return
  await documentApi.delete(props.employeeId, doc.id)
  await load()
  emit('changed')
}

function onUploaded() {
  showUpload.value = false
  load()
  emit('changed')
}

onMounted(load)
</script>
