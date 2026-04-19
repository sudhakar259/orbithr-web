<script setup lang="ts">
defineOptions({ name: 'RecruitmentPipelineSettings' })
import { ref, onMounted } from 'vue'
import { recruitmentService, type CandidatePipeline } from '@/services/recruitmentService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

const loading = ref(true)
const pipelines = ref<CandidatePipeline[]>([])
const error = ref('')
const saving = ref(false)

const showPipelineForm = ref(false)
const editingPipeline = ref<CandidatePipeline | null>(null)
const pipelineForm = ref({ name: '', description: '', is_default: false })

const showStageForm = ref<number | null>(null)
const stageForm = ref({ name: '', color: '#4F7EFF', type: 'screening' })

const load = async () => {
  loading.value = true
  try {
    const res = await recruitmentService.getPipelines()
    pipelines.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load pipelines'
  } finally {
    loading.value = false
  }
}

const openCreatePipeline = () => {
  editingPipeline.value = null
  pipelineForm.value = { name: '', description: '', is_default: false }
  showPipelineForm.value = true
}

const openEditPipeline = (p: CandidatePipeline) => {
  editingPipeline.value = p
  pipelineForm.value = { name: p.name, description: p.description ?? '', is_default: p.is_default }
  showPipelineForm.value = true
}

const savePipeline = async () => {
  saving.value = true
  error.value = ''
  try {
    if (editingPipeline.value) {
      await recruitmentService.updatePipeline(editingPipeline.value.id, pipelineForm.value)
    } else {
      await recruitmentService.createPipeline(pipelineForm.value)
    }
    showPipelineForm.value = false
    await load()
  } catch {
    error.value = 'Failed to save pipeline'
  } finally {
    saving.value = false
  }
}

const deletePipeline = async (id: number) => {
  if (!await dialog('Delete', 'Delete this pipeline?')) return
  try {
    await recruitmentService.deletePipeline(id)
    await load()
  } catch {
    error.value = 'Failed to delete pipeline'
  }
}

const addStage = async (pipelineId: number) => {
  if (!stageForm.value.name.trim()) return
  saving.value = true
  try {
    await recruitmentService.addPipelineStage(pipelineId, stageForm.value)
    stageForm.value = { name: '', color: '#4F7EFF', type: 'screening' }
    showStageForm.value = null
    await load()
  } catch {
    error.value = 'Failed to add stage'
  } finally {
    saving.value = false
  }
}

const deleteStage = async (pipelineId: number, stageId: number) => {
  if (!await dialog('Remove', 'Remove this stage?')) return
  try {
    await recruitmentService.deletePipelineStage(pipelineId, stageId)
    await load()
  } catch {
    error.value = 'Failed to delete stage'
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-white">Pipeline Settings</h2>
      <button
        @click="openCreatePipeline"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
        New Pipeline
      </button>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Create/Edit Pipeline Form -->
    <div v-if="showPipelineForm" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">{{ editingPipeline ? 'Edit Pipeline' : 'New Pipeline' }}</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Name *</label>
          <input v-model="pipelineForm.name" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <input v-model="pipelineForm.description" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input v-model="pipelineForm.is_default" type="checkbox" class="rounded" />
        Set as default pipeline
      </label>
      <div class="flex gap-3">
        <button @click="savePipeline" :disabled="saving" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
        <button @click="showPipelineForm = false" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <div v-for="i in 2" :key="i" class="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
        <div class="h-5 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div class="space-y-2">
          <div v-for="j in 4" :key="j" class="h-8 bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>

    <div v-else-if="pipelines.length === 0" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No pipelines yet. Create one to get started.</p>
    </div>

    <!-- Pipeline Cards -->
    <div v-else class="space-y-6">
      <div v-for="pipeline in pipelines" :key="pipeline.id" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h3 class="text-base font-semibold text-white">{{ pipeline.name }}</h3>
            <span v-if="pipeline.is_default" class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-900/50 text-blue-400">Default</span>
          </div>
          <div class="flex gap-2">
            <button @click="openEditPipeline(pipeline)" class="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">Edit</button>
            <button @click="deletePipeline(pipeline.id)" class="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors">Delete</button>
          </div>
        </div>

        <!-- Stages -->
        <div class="p-4 space-y-2">
          <div
            v-for="stage in pipeline.stages"
            :key="stage.id"
            class="flex items-center justify-between bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2"
          >
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full" :style="{ backgroundColor: stage.color ?? '#6B7280' }"></div>
              <span class="text-sm text-white">{{ stage.name }}</span>
              <span class="text-xs text-gray-500 capitalize">{{ stage.type }}</span>
            </div>
            <button @click="deleteStage(pipeline.id, stage.id)" class="text-xs text-red-400 hover:text-red-300">Remove</button>
          </div>

          <!-- Add Stage -->
          <div v-if="showStageForm === pipeline.id" class="bg-gray-900/50 border border-gray-700 rounded-lg p-3 space-y-2">
            <div class="grid grid-cols-3 gap-2">
              <input v-model="stageForm.name" type="text" placeholder="Stage name" class="bg-gray-700 border border-gray-600 text-white rounded text-sm px-2 py-1.5 focus:border-blue-500 focus:outline-none" />
              <select v-model="stageForm.type" class="bg-gray-700 border border-gray-600 text-white rounded text-sm px-2 py-1.5 focus:border-blue-500 focus:outline-none">
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
              <div class="flex gap-2">
                <input v-model="stageForm.color" type="color" class="w-10 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer" />
                <button @click="addStage(pipeline.id)" :disabled="saving" class="flex-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 px-2">Add</button>
              </div>
            </div>
            <button @click="showStageForm = null" class="text-xs text-gray-400 hover:text-white">Cancel</button>
          </div>
          <button
            v-else
            @click="showStageForm = pipeline.id"
            class="w-full text-sm text-gray-400 hover:text-white border border-dashed border-gray-700 hover:border-gray-500 rounded-lg py-2 transition-colors"
          >+ Add Stage</button>
        </div>
      </div>
    </div>
  </div>
</template>
