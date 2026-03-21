<script setup lang="ts">
defineOptions({ name: 'RecruitmentPipeline' })
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { recruitmentService, type CandidatePipeline, type JobApplication } from '@/services/recruitmentService'

const router = useRouter()
const loading = ref(true)
const pipelines = ref<CandidatePipeline[]>([])
const applications = ref<JobApplication[]>([])
const selectedPipelineId = ref<number | null>(null)
const error = ref('')
const movingId = ref<number | null>(null)

const selectedPipeline = computed(() => pipelines.value.find(p => p.id === selectedPipelineId.value) ?? null)

const stageApplications = computed(() => {
  if (!selectedPipeline.value) return {}
  const map: Record<number, JobApplication[]> = {}
  for (const stage of selectedPipeline.value.stages ?? []) {
    map[stage.id] = applications.value.filter(a => a.pipeline_stage_id === stage.id)
  }
  // Unassigned
  map[0] = applications.value.filter(a => !a.pipeline_stage_id)
  return map
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const pRes = await recruitmentService.getPipelines()
    pipelines.value = pRes.data?.data ?? []
    if (pipelines.value.length > 0) {
      selectedPipelineId.value = pipelines.value.find(p => p.is_default)?.id ?? pipelines.value[0].id
    }
    const aRes = await recruitmentService.getApplications()
    applications.value = aRes.data?.data ?? []
  } catch {
    error.value = 'Failed to load pipeline'
  } finally {
    loading.value = false
  }
}

const moveStage = async (appId: number, stageId: number | null) => {
  movingId.value = appId
  try {
    await recruitmentService.moveApplicationStage(appId, stageId)
    const app = applications.value.find(a => a.id === appId)
    if (app) app.pipeline_stage_id = stageId
  } catch {
    error.value = 'Failed to move application'
  } finally {
    movingId.value = null
  }
}

const getAppStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'bg-blue-900/50 text-blue-400',
    shortlisted: 'bg-purple-900/50 text-purple-400',
    hired: 'bg-green-900/50 text-green-400',
    rejected: 'bg-red-900/50 text-red-400',
    offered: 'bg-yellow-900/50 text-yellow-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <select
          v-if="pipelines.length > 0"
          v-model="selectedPipelineId"
          class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option v-for="p in pipelines" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <button
        @click="router.push({ name: 'recruitment.pipeline.settings' })"
        class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors inline-flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        Manage Pipelines
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex gap-4 overflow-x-auto pb-4">
      <div v-for="i in 4" :key="i" class="bg-gray-800 border border-gray-700 rounded-lg p-4 w-64 flex-shrink-0 animate-pulse">
        <div class="h-4 bg-gray-700 rounded w-2/3 mb-4"></div>
        <div v-for="j in 3" :key="j" class="h-16 bg-gray-700 rounded mb-2"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- No pipelines -->
    <div v-else-if="pipelines.length === 0" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500 mb-4">No pipelines configured yet.</p>
      <button
        @click="router.push({ name: 'recruitment.pipeline.settings' })"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >Create Pipeline</button>
    </div>

    <!-- Kanban Board -->
    <template v-else-if="selectedPipeline">
      <div class="flex gap-4 overflow-x-auto pb-4">
        <!-- Unassigned column -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg w-64 flex-shrink-0">
          <div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-300">Unassigned</h3>
            <span class="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">{{ stageApplications[0]?.length ?? 0 }}</span>
          </div>
          <div class="p-3 space-y-2 min-h-24">
            <div
              v-for="app in stageApplications[0]"
              :key="app.id"
              class="bg-gray-900/50 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-white truncate">{{ app.applicant_name }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ app.job_posting?.title ?? '—' }}</p>
                </div>
                <span :class="['inline-flex px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0', getAppStatusClasses(app.status)]">
                  {{ app.status }}
                </span>
              </div>
              <div class="mt-2 flex items-center justify-between">
                <button
                  @click="router.push({ name: 'recruitment.jobs.show', params: { id: app.job_posting_id } })"
                  class="text-xs text-blue-400 hover:text-blue-300"
                >View</button>
                <select
                  v-if="selectedPipeline.stages?.length"
                  @change="moveStage(app.id, Number(($event.target as HTMLSelectElement).value) || null)"
                  :disabled="movingId === app.id"
                  class="text-xs bg-gray-700 border border-gray-600 text-gray-300 rounded px-1 py-0.5 focus:outline-none"
                >
                  <option value="">Move to...</option>
                  <option v-for="stage in selectedPipeline.stages" :key="stage.id" :value="stage.id">
                    {{ stage.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Stage columns -->
        <div
          v-for="stage in selectedPipeline.stages"
          :key="stage.id"
          class="bg-gray-800 border border-gray-700 rounded-lg w-64 flex-shrink-0"
          :style="stage.color ? { borderTopColor: stage.color, borderTopWidth: '3px' } : {}"
        >
          <div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-300">{{ stage.name }}</h3>
            <span class="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">{{ stageApplications[stage.id]?.length ?? 0 }}</span>
          </div>
          <div class="p-3 space-y-2 min-h-24">
            <div
              v-for="app in stageApplications[stage.id]"
              :key="app.id"
              class="bg-gray-900/50 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-white truncate">{{ app.applicant_name }}</p>
                  <p class="text-xs text-gray-400 truncate">{{ app.job_posting?.title ?? '—' }}</p>
                </div>
                <span :class="['inline-flex px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0', getAppStatusClasses(app.status)]">
                  {{ app.status }}
                </span>
              </div>
              <div class="mt-2 flex items-center justify-between">
                <button
                  @click="router.push({ name: 'recruitment.jobs.show', params: { id: app.job_posting_id } })"
                  class="text-xs text-blue-400 hover:text-blue-300"
                >View</button>
                <select
                  @change="moveStage(app.id, Number(($event.target as HTMLSelectElement).value) || null)"
                  :disabled="movingId === app.id"
                  class="text-xs bg-gray-700 border border-gray-600 text-gray-300 rounded px-1 py-0.5 focus:outline-none"
                >
                  <option value="">Move to...</option>
                  <option
                    v-for="s in selectedPipeline.stages?.filter(x => x.id !== stage.id)"
                    :key="s.id"
                    :value="s.id"
                  >{{ s.name }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
