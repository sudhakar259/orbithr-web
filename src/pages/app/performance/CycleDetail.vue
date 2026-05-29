<script setup lang="ts">
defineOptions({ name: 'PerformanceCycleDetail' })
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { performanceService, type AppraisalCycle, type EmployeeAppraisal } from '@/services/performanceService'

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const cycle = ref<AppraisalCycle | null>(null)
const appraisals = ref<EmployeeAppraisal[]>([])
const error = ref('')
const actionError = ref('')

const loadCycle = async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    cycle.value = await performanceService.getCycle(id)
    const result = await performanceService.getCycleAppraisals(id)
    appraisals.value = result.data
  } catch {
    error.value = 'Failed to load cycle'
  } finally {
    loading.value = false
  }
}

const handleActivate = async () => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    cycle.value = await performanceService.activateCycle(cycle.value.id)
  } catch {
    actionError.value = 'Failed to activate cycle'
  }
}

const handleInitialize = async () => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    await performanceService.initializeCycle(cycle.value.id)
    await loadCycle()
  } catch {
    actionError.value = 'Failed to initialize appraisals'
  }
}

const handleLock = async () => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    cycle.value = await performanceService.lockCycle(cycle.value.id)
  } catch {
    actionError.value = 'Failed to lock cycle'
  }
}

const handleComplete = async () => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    cycle.value = await performanceService.completeCycle(cycle.value.id)
  } catch {
    actionError.value = 'Failed to complete cycle'
  }
}

const activateStage = async (stageId: number) => {
  if (!cycle.value) return
  actionError.value = ''
  try {
    await performanceService.activateStage(cycle.value.id, stageId)
    await loadCycle()
  } catch {
    actionError.value = 'Failed to activate stage'
  }
}

const getStatusTone = (status: string) => {
  const map: Record<string, string> = {
    draft: 'muted',
    active: 'ok',
    locked: 'warn',
    completed: 'accent',
    archived: 'muted',
  }
  return map[status] ?? 'muted'
}

const getAppraisalStatusTone = (status: string) => {
  const map: Record<string, string> = {
    not_started: 'muted',
    in_progress: 'accent',
    self_review_done: 'accent',
    manager_review_done: 'accent',
    calibration: 'warn',
    completed: 'ok',
    acknowledged: 'ok',
  }
  return map[status] ?? 'muted'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadCycle())
</script>

<template>
  <div class="cd">
    <div v-if="loading" class="state-block"><div class="spinner" /></div>

    <div v-else-if="error" class="state-error">{{ error }}</div>

    <template v-else-if="cycle">
      <div v-if="actionError" class="state-error">{{ actionError }}</div>

      <!-- Header -->
      <div class="cd-head">
        <div class="cd-head-left">
          <button class="back-btn" @click="router.push({ name: 'performance.cycles' })" aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <div class="cd-title-row">
              <span class="eyebrow">Review cycle</span>
              <span :class="['badge', `badge-${getStatusTone(cycle.status)}`]">{{ cycle.status }}</span>
            </div>
            <h2 class="cd-title">{{ cycle.name }}</h2>
            <p class="cd-sub">{{ formatDate(cycle.start_date) }} – {{ formatDate(cycle.end_date) }}</p>
          </div>
        </div>
        <div class="cd-actions">
          <button v-if="cycle.status === 'draft'" class="btn-success" @click="handleActivate">Activate</button>
          <button v-if="cycle.status === 'active' && appraisals.length === 0" class="btn-primary" @click="handleInitialize">Initialize appraisals</button>
          <button v-if="cycle.status === 'active'" class="btn-secondary" @click="handleLock">Lock</button>
          <button v-if="cycle.status === 'locked'" class="btn-primary" @click="handleComplete">Complete</button>
          <button class="btn-secondary" @click="router.push({ name: 'performance.cycles.create', query: { edit: cycle.id } })">Edit</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="kpi-strip">
        <div class="kpi">
          <div class="eyebrow">Type</div>
          <div class="kpi-val">{{ cycle.cycle_type.replace('_', ' ') }}</div>
        </div>
        <div class="kpi">
          <div class="eyebrow">Rating scale</div>
          <div class="kpi-val mono">1 – {{ cycle.rating_scale }}</div>
        </div>
        <div class="kpi">
          <div class="eyebrow">Appraisals</div>
          <div class="kpi-val mono">{{ appraisals.length }}</div>
        </div>
        <div class="kpi">
          <div class="eyebrow">Completed</div>
          <div class="kpi-val mono ok">{{ appraisals.filter(a => a.status === 'completed' || a.status === 'acknowledged').length }}</div>
        </div>
      </div>

      <!-- Stages -->
      <div v-if="cycle.stages && cycle.stages.length > 0" class="card pad0">
        <div class="card-head pad">
          <h3 class="card-title">Stages</h3>
        </div>
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Type</th>
                <th>Period</th>
                <th>Status</th>
                <th class="th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stage in cycle.stages" :key="stage.id">
                <td><div class="cell-strong">{{ stage.name }}</div></td>
                <td class="cell-muted">{{ stage.stage_type.replace(/_/g, ' ') }}</td>
                <td class="cell-muted cell-mono">{{ stage.start_date ? formatDate(stage.start_date) : '—' }} – {{ stage.end_date ? formatDate(stage.end_date) : '—' }}</td>
                <td>
                  <span v-if="stage.is_active" class="badge badge-ok">Active</span>
                  <span v-else-if="stage.is_locked" class="badge badge-muted">Locked</span>
                  <span v-else class="badge badge-muted">Inactive</span>
                </td>
                <td class="th-right">
                  <button v-if="!stage.is_active && cycle.status === 'active'" class="btn-link" @click="activateStage(stage.id)">Activate</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Appraisals -->
      <div v-if="appraisals.length > 0" class="card pad0">
        <div class="card-head pad">
          <h3 class="card-title">Appraisals</h3>
        </div>
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Final score</th>
                <th>Rating</th>
                <th class="th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="appraisal in appraisals" :key="appraisal.id">
                <td>
                  <div class="cell-strong">{{ appraisal.employee?.first_name }} {{ appraisal.employee?.last_name }}</div>
                  <div class="cell-muted">{{ appraisal.employee?.department }}</div>
                </td>
                <td>
                  <span :class="['badge', `badge-${getAppraisalStatusTone(appraisal.status)}`]">{{ appraisal.status.replace(/_/g, ' ') }}</span>
                </td>
                <td class="cell-mono">{{ appraisal.final_score ?? '—' }}</td>
                <td class="cell-muted">{{ appraisal.final_rating ?? '—' }}</td>
                <td class="th-right">
                  <button class="btn-link" @click="router.push({ name: 'performance.appraisals.show', params: { id: appraisal.id } })">View →</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cd { display: flex; flex-direction: column; gap: 20px; color: #EEF0F4; }

.state-block { display: flex; justify-content: center; padding: 56px 0; }
.spinner { width: 28px; height: 28px; border: 2px solid #232936; border-top-color: #6B5BFF; border-radius: 50%; animation: spin .9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.state-error { background: rgba(243,130,136,.08); border: 1px solid rgba(243,130,136,.3); color: #F38288; padding: 14px 16px; border-radius: 10px; font-size: 13px; }

.cd-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.cd-head-left { display: flex; align-items: flex-start; gap: 12px; }
.back-btn { width: 32px; height: 32px; padding: 0; background: #161A23; border: 1px solid #232936; border-radius: 8px; color: #7A8299; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: color .15s, border-color .15s; }
.back-btn:hover { color: #EEF0F4; border-color: #6B5BFF; }
.back-btn svg { width: 16px; height: 16px; }
.eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #7A8299; }
.cd-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.cd-title { font-family: 'Instrument Serif', serif; font-size: 30px; letter-spacing: -0.02em; color: #EEF0F4; margin: 0; line-height: 1.1; }
.cd-sub { font-size: 13px; color: #7A8299; margin: 4px 0 0; }

.cd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-primary, .btn-secondary, .btn-success { padding: 8px 16px; font-size: 12.5px; font-weight: 600; border-radius: 8px; cursor: pointer; font-family: inherit; transition: opacity .15s, border-color .15s; border: 1px solid transparent; }
.btn-primary { background: #6B5BFF; color: #fff; }
.btn-primary:hover { opacity: .9; }
.btn-secondary { background: #161A23; border-color: #232936; color: #EEF0F4; }
.btn-secondary:hover { border-color: #6B5BFF; }
.btn-success { background: #4DD39A; color: #0D0F17; }
.btn-success:hover { opacity: .9; }
.btn-link { background: transparent; border: none; color: #6B5BFF; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 0; }
.btn-link:hover { color: #8B7EFF; }

.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi { background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 14px 16px; }
.kpi-val { font-family: 'Instrument Serif', serif; font-size: 22px; color: #EEF0F4; letter-spacing: -0.01em; margin-top: 4px; text-transform: capitalize; }
.kpi-val.mono { font-family: 'JetBrains Mono', monospace; font-size: 20px; }
.kpi-val.ok { color: #4DD39A; }

.card { background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 20px; }
.card.pad0 { padding: 0; overflow: hidden; }
.card-head { margin-bottom: 14px; }
.card-head.pad { padding: 16px 20px; border-bottom: 1px solid #232936; margin-bottom: 0; }
.card-title { font-family: 'Instrument Serif', serif; font-size: 18px; color: #EEF0F4; letter-spacing: -0.01em; margin: 0; }

.table-wrap { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; min-width: 720px; }
.tbl th { padding: 11px 16px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #7A8299; text-align: left; background: #0D0F17; border-bottom: 1px solid #232936; }
.tbl th.th-right { text-align: right; }
.tbl td { padding: 13px 16px; font-size: 12.5px; color: #EEF0F4; border-bottom: 1px solid #232936; vertical-align: top; }
.tbl td.th-right { text-align: right; }
.tbl tr:last-child td { border-bottom: none; }
.tbl tbody tr:hover td { background: rgba(107,91,255,.04); }
.cell-strong { color: #EEF0F4; font-weight: 500; }
.cell-muted { color: #7A8299; font-size: 11.5px; margin-top: 2px; }
.cell-mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }

.badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 999px; border: 1px solid transparent; white-space: nowrap; }
.badge-muted { background: rgba(122,130,153,.12); color: #7A8299; border-color: rgba(122,130,153,.25); }
.badge-accent { background: rgba(107,91,255,.12); color: #6B5BFF; border-color: rgba(107,91,255,.3); }
.badge-warn { background: rgba(245,166,35,.12); color: #F5A623; border-color: rgba(245,166,35,.3); }
.badge-ok { background: rgba(77,211,154,.12); color: #4DD39A; border-color: rgba(77,211,154,.25); }
</style>
