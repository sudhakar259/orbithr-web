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
  <div class="ps-page">
    <div class="ps-header">
      <h2 class="ps-title">Pipeline Settings</h2>
      <button class="ps-btn-primary" @click="openCreatePipeline">+ New Pipeline</button>
    </div>

    <div v-if="error" class="ps-error">{{ error }}</div>

    <!-- Create/Edit Pipeline Form -->
    <div v-if="showPipelineForm" class="ps-form-card">
      <h3 class="ps-form-label">{{ editingPipeline ? 'Edit Pipeline' : 'New Pipeline' }}</h3>
      <div class="ps-form-grid">
        <div class="ps-field">
          <label class="ps-label">Name <span class="ps-req">*</span></label>
          <input v-model="pipelineForm.name" type="text" class="ps-input" />
        </div>
        <div class="ps-field">
          <label class="ps-label">Description</label>
          <input v-model="pipelineForm.description" type="text" class="ps-input" />
        </div>
      </div>
      <label class="ps-check-row">
        <input v-model="pipelineForm.is_default" type="checkbox" class="ps-checkbox" />
        <span>Set as default pipeline</span>
      </label>
      <div class="ps-form-actions">
        <button class="ps-btn-primary" :disabled="saving" @click="savePipeline">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button class="ps-btn-ghost" @click="showPipelineForm = false">Cancel</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="ps-loading">
      <div v-for="i in 2" :key="i" class="ps-skeleton-card">
        <div class="ps-sk ps-sk-title"></div>
        <div class="ps-sk-rows">
          <div v-for="j in 3" :key="j" class="ps-sk ps-sk-row"></div>
        </div>
      </div>
    </div>

    <div v-else-if="pipelines.length === 0" class="ps-empty">
      No pipelines yet. Create one to get started.
    </div>

    <!-- Pipeline Cards -->
    <div v-else class="ps-list">
      <div v-for="pipeline in pipelines" :key="pipeline.id" class="ps-card">
        <div class="ps-card-head">
          <div class="ps-card-name-row">
            <h3 class="ps-card-name">{{ pipeline.name }}</h3>
            <span v-if="pipeline.is_default" class="ps-default-badge">Default</span>
          </div>
          <div class="ps-card-actions">
            <button class="ps-action-btn" @click="openEditPipeline(pipeline)">Edit</button>
            <button class="ps-delete-btn" @click="deletePipeline(pipeline.id)">Delete</button>
          </div>
        </div>

        <p v-if="pipeline.description" class="ps-card-desc">{{ pipeline.description }}</p>

        <!-- Stages -->
        <div class="ps-stages">
          <div v-for="stage in pipeline.stages" :key="stage.id" class="ps-stage-row">
            <div class="ps-stage-left">
              <span class="ps-stage-dot" :style="{ background: stage.color ?? '#6B7280' }"></span>
              <span class="ps-stage-name">{{ stage.name }}</span>
              <span class="ps-stage-type">{{ stage.type }}</span>
            </div>
            <button class="ps-stage-remove" @click="deleteStage(pipeline.id, stage.id)">Remove</button>
          </div>

          <!-- Add Stage Form -->
          <div v-if="showStageForm === pipeline.id" class="ps-stage-form">
            <div class="ps-stage-form-grid">
              <input v-model="stageForm.name" type="text" placeholder="Stage name" class="ps-input ps-input-sm" />
              <select v-model="stageForm.type" class="ps-input ps-input-sm">
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
              <div class="ps-color-add">
                <input v-model="stageForm.color" type="color" class="ps-color-input" />
                <button class="ps-btn-primary ps-btn-sm" :disabled="saving" @click="addStage(pipeline.id)">Add</button>
              </div>
            </div>
            <button class="ps-cancel-link" @click="showStageForm = null">Cancel</button>
          </div>

          <button
            v-else
            class="ps-add-stage-btn"
            @click="showStageForm = pipeline.id"
          >+ Add Stage</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ps-page { display: flex; flex-direction: column; gap: 16px; }
.ps-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.ps-title { font-size: 16px; font-weight: 700; color: #EEF0F4; margin: 0; }
.ps-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.ps-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.ps-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.ps-btn-sm { padding: 6px 14px; font-size: 12px; }
.ps-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.ps-btn-ghost:hover { color: #EEF0F4; }
.ps-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }

.ps-form-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.ps-form-label { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.08em; margin: 0; }
.ps-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ps-field { display: flex; flex-direction: column; gap: 5px; }
.ps-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.ps-req { color: #F38288; }
.ps-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.ps-input:focus { border-color: #6B5BFF; }
.ps-input-sm { padding: 6px 10px; font-size: 12px; border-radius: 6px; }
.ps-check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.ps-checkbox { accent-color: #6B5BFF; }
.ps-form-actions { display: flex; gap: 10px; }

.ps-loading { display: flex; flex-direction: column; gap: 14px; }
.ps-skeleton-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.ps-sk { background: #232936; border-radius: 6px; animation: ps-pulse 1.2s ease-in-out infinite; }
.ps-sk-title { height: 14px; width: 35%; }
.ps-sk-rows { display: flex; flex-direction: column; gap: 8px; }
.ps-sk-row { height: 36px; }
@keyframes ps-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

.ps-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 60px 20px; text-align: center; font-size: 13px; color: #7A8299; }

.ps-list { display: flex; flex-direction: column; gap: 14px; }
.ps-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.ps-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #1C2030; }
.ps-card-name-row { display: flex; align-items: center; gap: 10px; }
.ps-card-name { font-size: 14px; font-weight: 600; color: #EEF0F4; margin: 0; }
.ps-default-badge { background: rgba(107,91,255,0.12); color: #8A7BFF; border-radius: 20px; padding: 2px 9px; font-size: 11px; font-weight: 500; }
.ps-card-actions { display: flex; gap: 6px; }
.ps-action-btn { font-size: 12px; color: #7A8299; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 5px; }
.ps-action-btn:hover { color: #EEF0F4; background: #232936; }
.ps-delete-btn { font-size: 12px; color: #F38288; background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 5px; }
.ps-delete-btn:hover { background: rgba(243,130,136,0.08); }
.ps-card-desc { font-size: 12px; color: #7A8299; margin: 0; padding: 8px 16px 0; }

.ps-stages { padding: 12px 16px; display: flex; flex-direction: column; gap: 6px; }
.ps-stage-row { display: flex; align-items: center; justify-content: space-between; background: rgba(13,15,23,0.5); border: 1px solid #1C2030; border-radius: 7px; padding: 8px 12px; }
.ps-stage-left { display: flex; align-items: center; gap: 10px; }
.ps-stage-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.ps-stage-name { font-size: 13px; color: #EEF0F4; }
.ps-stage-type { font-size: 11px; color: #7A8299; text-transform: capitalize; background: #232936; border-radius: 4px; padding: 1px 7px; }
.ps-stage-remove { font-size: 11px; color: #F38288; background: none; border: none; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.ps-stage-remove:hover { background: rgba(243,130,136,0.08); }

.ps-stage-form { background: rgba(13,15,23,0.5); border: 1px solid #232936; border-radius: 7px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.ps-stage-form-grid { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; }
.ps-color-add { display: flex; align-items: center; gap: 6px; }
.ps-color-input { width: 36px; height: 32px; border: 1px solid #232936; border-radius: 6px; background: #0D0F17; cursor: pointer; padding: 2px; }
.ps-cancel-link { font-size: 11px; color: #7A8299; background: none; border: none; cursor: pointer; padding: 0; align-self: flex-start; }
.ps-cancel-link:hover { color: #EEF0F4; }

.ps-add-stage-btn { width: 100%; font-size: 12px; color: #7A8299; background: none; border: 1px dashed #2D3448; border-radius: 7px; padding: 8px; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
.ps-add-stage-btn:hover { color: #EEF0F4; border-color: #3D4560; }
</style>
