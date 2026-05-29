<script setup lang="ts">
defineOptions({ name: 'RecruitmentPipeline' })
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  recruitmentService,
  type CandidatePipeline,
  type JobApplication,
} from '@/services/recruitmentService'

const router = useRouter()
const loading = ref(true)
const pipelines = ref<CandidatePipeline[]>([])
const applications = ref<JobApplication[]>([])
const selectedPipelineId = ref<number | null>(null)
const error = ref('')
const movingId = ref<number | null>(null)

const selectedPipeline = computed(
  () => pipelines.value.find((p) => p.id === selectedPipelineId.value) ?? null,
)

const stageApplications = computed(() => {
  if (!selectedPipeline.value) return {}
  const map: Record<number, JobApplication[]> = {}
  for (const stage of selectedPipeline.value.stages ?? []) {
    map[stage.id] = applications.value.filter((a) => a.pipeline_stage_id === stage.id)
  }
  // Unassigned
  map[0] = applications.value.filter((a) => !a.pipeline_stage_id)
  return map
})

const totalApplications = computed(() => applications.value.length)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const pRes = await recruitmentService.getPipelines()
    pipelines.value = pRes.data?.data ?? []
    if (pipelines.value.length > 0) {
      selectedPipelineId.value =
        pipelines.value.find((p) => p.is_default)?.id ?? pipelines.value[0].id
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
    const app = applications.value.find((a) => a.id === appId)
    if (app) app.pipeline_stage_id = stageId
  } catch {
    error.value = 'Failed to move application'
  } finally {
    movingId.value = null
  }
}

const getStatusTone = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'accent',
    shortlisted: 'purple',
    hired: 'ok',
    rejected: 'danger',
    offered: 'warn',
  }
  return map[status] ?? 'neutral'
}

const initials = (name: string | undefined): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

onMounted(load)
</script>

<template>
  <div class="pipe-page">
    <!-- Page header -->
    <div class="page-header">
      <div class="ph-text">
        <div class="ph-eyebrow">Applicant tracking · {{ pipelines.length }} pipelines</div>
        <h1 class="ph-title">Pipeline</h1>
        <p class="ph-sub">
          Candidates across all stages. Move cards between columns to advance them through
          the hiring funnel. AI screening scores each résumé against the job spec.
        </p>
      </div>
    </div>

    <!-- Toolbar / filter chips -->
    <div class="toolbar">
      <div class="filters">
        <select
          v-if="pipelines.length > 0"
          v-model="selectedPipelineId"
          class="input select"
        >
          <option v-for="p in pipelines" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="toolbar-meta">
        Total candidates:
        <span class="meta-num">{{ totalApplications }}</span>
        <span class="meta-sep">·</span>
        <span class="meta-stages">{{ selectedPipeline?.stages?.length ?? 0 }} stages</span>
      </div>
      <button
        class="btn btn-secondary btn-sm"
        @click="router.push({ name: 'recruitment.pipeline.settings' })"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Manage pipelines
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="kanban">
      <div v-for="i in 4" :key="i" class="col-skeleton">
        <div class="sk-head"></div>
        <div v-for="j in 3" :key="j" class="sk-card"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert-error">{{ error }}</div>

    <!-- No pipelines -->
    <div v-else-if="pipelines.length === 0" class="card empty-state">
      <div class="empty-title">No pipelines configured yet.</div>
      <button
        class="btn btn-primary btn-sm"
        @click="router.push({ name: 'recruitment.pipeline.settings' })"
      >
        Create pipeline
      </button>
    </div>

    <!-- Kanban Board -->
    <template v-else-if="selectedPipeline">
      <div class="kanban">
        <!-- Unassigned column -->
        <div class="col">
          <div class="col-head">
            <div class="col-head-left">
              <div class="col-dot" style="background: #7a8299"></div>
              <div class="col-name">Unassigned</div>
              <div class="col-count">· {{ stageApplications[0]?.length ?? 0 }}</div>
            </div>
            <button class="col-add">+</button>
          </div>
          <div class="col-body">
            <div v-for="app in stageApplications[0]" :key="app.id" class="cand-card">
              <div class="cc-top">
                <div class="cc-avatar">{{ initials(app.applicant_name) }}</div>
                <div class="cc-meta">
                  <div class="cc-name">{{ app.applicant_name }}</div>
                  <div class="cc-role">{{ app.job_posting?.title ?? '—' }}</div>
                </div>
              </div>
              <div class="cc-tags">
                <span :class="['tag', `tag-${getStatusTone(app.status)}`]">
                  {{ app.status }}
                </span>
              </div>
              <div class="cc-foot">
                <button
                  class="cc-link"
                  @click="
                    router.push({
                      name: 'recruitment.jobs.show',
                      params: { id: app.job_posting_id },
                    })
                  "
                >
                  View
                </button>
                <select
                  v-if="selectedPipeline.stages?.length"
                  :disabled="movingId === app.id"
                  class="cc-select"
                  @change="
                    moveStage(
                      app.id,
                      Number(($event.target as HTMLSelectElement).value) || null,
                    )
                  "
                >
                  <option value="">Move to...</option>
                  <option
                    v-for="stage in selectedPipeline.stages"
                    :key="stage.id"
                    :value="stage.id"
                  >
                    {{ stage.name }}
                  </option>
                </select>
              </div>
            </div>
            <div v-if="(stageApplications[0]?.length ?? 0) === 0" class="empty-col">
              Drop candidates here
            </div>
          </div>
        </div>

        <!-- Stage columns -->
        <div v-for="stage in selectedPipeline.stages" :key="stage.id" class="col">
          <div class="col-head">
            <div class="col-head-left">
              <div
                class="col-dot"
                :style="{ background: stage.color || '#6B5BFF' }"
              ></div>
              <div class="col-name">{{ stage.name }}</div>
              <div class="col-count">
                · {{ stageApplications[stage.id]?.length ?? 0 }}
              </div>
            </div>
            <button class="col-add">+</button>
          </div>
          <div class="col-body">
            <div
              v-for="app in stageApplications[stage.id]"
              :key="app.id"
              class="cand-card"
            >
              <div class="cc-top">
                <div class="cc-avatar">{{ initials(app.applicant_name) }}</div>
                <div class="cc-meta">
                  <div class="cc-name">{{ app.applicant_name }}</div>
                  <div class="cc-role">{{ app.job_posting?.title ?? '—' }}</div>
                </div>
              </div>
              <div class="cc-tags">
                <span :class="['tag', `tag-${getStatusTone(app.status)}`]">
                  {{ app.status }}
                </span>
              </div>
              <div class="cc-foot">
                <button
                  class="cc-link"
                  @click="
                    router.push({
                      name: 'recruitment.jobs.show',
                      params: { id: app.job_posting_id },
                    })
                  "
                >
                  View
                </button>
                <select
                  :disabled="movingId === app.id"
                  class="cc-select"
                  @change="
                    moveStage(
                      app.id,
                      Number(($event.target as HTMLSelectElement).value) || null,
                    )
                  "
                >
                  <option value="">Move to...</option>
                  <option
                    v-for="s in selectedPipeline.stages?.filter((x) => x.id !== stage.id)"
                    :key="s.id"
                    :value="s.id"
                  >
                    {{ s.name }}
                  </option>
                </select>
              </div>
            </div>
            <div
              v-if="(stageApplications[stage.id]?.length ?? 0) === 0"
              class="empty-col"
            >
              Drop candidates here
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pipe-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: #eef0f4;
}

/* Page header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}
.ph-eyebrow {
  font-size: 11px;
  font-weight: 500;
  color: #7a8299;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.ph-title {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: #eef0f4;
  margin: 0 0 6px;
  line-height: 1.1;
}
.ph-sub {
  font-size: 13px;
  color: #7a8299;
  margin: 0;
  max-width: 640px;
  line-height: 1.55;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.filters {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-meta {
  flex: 1;
  font-size: 11.5px;
  color: #7a8299;
  font-family: 'JetBrains Mono', monospace;
}
.meta-num {
  color: #eef0f4;
  font-weight: 600;
  margin: 0 4px;
}
.meta-sep {
  color: #4a5160;
  margin: 0 6px;
}
.meta-stages {
  color: #c8ccd6;
}

.input {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 6px;
  color: #eef0f4;
  font-size: 12.5px;
  padding: 7px 10px;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
}
.input:focus {
  border-color: #6b5bff;
}
.select {
  cursor: pointer;
  padding-right: 28px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A8299' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  min-width: 200px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  padding: 7px 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  font-family: inherit;
}
.btn-sm {
  padding: 7px 11px;
  font-size: 12px;
}
.btn-primary {
  background: #6b5bff;
  color: #fff;
  border-color: #6b5bff;
}
.btn-primary:hover {
  background: #7d6fff;
}
.btn-secondary {
  background: #161a23;
  color: #eef0f4;
  border-color: #232936;
}
.btn-secondary:hover {
  border-color: #2c3242;
  background: #1a1f2a;
}

/* Card / messages */
.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
}
.alert-error {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #f38288;
  font-size: 13px;
  padding: 12px 14px;
  border-radius: 8px;
}
.empty-state {
  padding: 56px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.empty-title {
  color: #7a8299;
  font-size: 13px;
}

/* Kanban */
.kanban {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.col {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.col-head {
  padding: 10px 12px;
  border-radius: 8px;
  background: #1a1f2a;
  border: 1px solid #232936;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.col-head-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.col-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
.col-name {
  font-size: 12px;
  font-weight: 600;
  color: #eef0f4;
}
.col-count {
  font-size: 11px;
  color: #7a8299;
  font-variant-numeric: tabular-nums;
}
.col-add {
  background: transparent;
  border: none;
  color: #7a8299;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  font-family: inherit;
  transition: color 0.15s ease;
}
.col-add:hover {
  color: #eef0f4;
}

.col-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Candidate card */
.cand-card {
  padding: 12px;
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 8px;
  cursor: grab;
  transition: border-color 0.15s ease;
}
.cand-card:hover {
  border-color: #2c3242;
}
.cc-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.cc-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2c3242, #1a1f2a);
  border: 1px solid #232936;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 600;
  color: #eef0f4;
  flex-shrink: 0;
}
.cc-meta {
  flex: 1;
  min-width: 0;
}
.cc-name {
  font-size: 12.5px;
  color: #eef0f4;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cc-role {
  font-size: 10.5px;
  color: #7a8299;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.tag {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  border: 1px solid transparent;
  text-transform: capitalize;
}
.tag-ok {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}
.tag-warn {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.25);
}
.tag-danger {
  background: rgba(243, 130, 136, 0.12);
  color: #f38288;
  border-color: rgba(243, 130, 136, 0.25);
}
.tag-accent {
  background: rgba(107, 91, 255, 0.12);
  color: #9b8eff;
  border-color: rgba(107, 91, 255, 0.25);
}
.tag-purple {
  background: rgba(155, 110, 255, 0.12);
  color: #b89bff;
  border-color: rgba(155, 110, 255, 0.25);
}
.tag-neutral {
  background: #1a1f2a;
  color: #c8ccd6;
  border-color: #232936;
}

.cc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.cc-link {
  background: transparent;
  border: none;
  color: #6b5bff;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 0;
  font-family: inherit;
}
.cc-link:hover {
  color: #8a7dff;
}
.cc-select {
  background: #1a1f2a;
  border: 1px solid #232936;
  color: #c8ccd6;
  font-size: 10.5px;
  padding: 3px 6px;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
  max-width: 130px;
  cursor: pointer;
}
.cc-select:focus {
  border-color: #6b5bff;
}

.empty-col {
  padding: 20px;
  text-align: center;
  font-size: 11px;
  color: #7a8299;
  border: 1px dashed #232936;
  border-radius: 8px;
}

/* Skeleton */
.col-skeleton {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-head {
  height: 36px;
  background: #1a1f2a;
  border-radius: 8px;
  animation: shimmer 1.4s ease-in-out infinite;
}
.sk-card {
  height: 80px;
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 8px;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
