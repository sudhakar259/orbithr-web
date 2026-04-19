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
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-400">Create and run custom report templates</p>
      <button
        @click="showForm = !showForm"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        New Template
      </button>
    </div>

    <div v-if="showForm" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        New Report Template
      </h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Template Name *</label>
          <input
            v-model="form.name"
            type="text"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Report Type</label>
          <select
            v-model="form.report_type"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          >
            <option v-for="t in reportTypes" :key="t" :value="t" class="capitalize">
              {{ t }}
            </option>
          </select>
        </div>
        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <input
            v-model="form.description"
            type="text"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input v-model="form.is_shared" type="checkbox" class="rounded" />
        Share with team
      </label>
      <div class="flex gap-3">
        <button
          @click="save"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save Template' }}
        </button>
        <button
          @click="showForm = false"
          class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-16 bg-gray-700 rounded"></div>
      </div>
    </div>

    <div
      v-else-if="templates.length === 0"
      class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center"
    >
      <p class="text-gray-500">No report templates yet. Create one to get started.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="t in templates"
        :key="t.id"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-white">{{ t.name }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ t.report_type }}
              <span v-if="t.description"> -- {{ t.description }}</span>
            </p>
          </div>
          <div class="flex gap-2">
            <button
              @click="runReport(t)"
              :disabled="running"
              class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {{ running && runningTemplate?.id === t.id ? 'Running...' : 'Run' }}
            </button>
            <button
              @click="deleteTemplate(t.id)"
              class="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 rounded hover:bg-gray-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Results -->
    <div
      v-if="results.length"
      class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
    >
      <div class="px-5 py-4 border-b border-gray-700">
        <h3 class="text-sm font-semibold text-white">Results -- {{ runningTemplate?.name }}</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-700">
          <thead class="bg-gray-700/50">
            <tr>
              <th
                v-for="key in resultKeys"
                :key="key"
                class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
              >
                {{ key }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr
              v-for="(row, i) in results"
              :key="i"
              class="hover:bg-gray-700/30 transition-colors"
            >
              <td
                v-for="key in resultKeys"
                :key="key"
                class="px-4 py-3 text-sm text-gray-300"
              >
                {{ row[key] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
