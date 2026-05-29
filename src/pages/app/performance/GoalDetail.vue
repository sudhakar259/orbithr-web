<script setup lang="ts">
defineOptions({ name: 'PerformanceGoalDetail' })
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { performanceService, type Goal, type GoalKeyResult } from '@/services/performanceService'

const router = useRouter()
const route = useRoute()
const { roles } = useAuth()
const loading = ref(true)
const goal = ref<Goal | null>(null)
const error = ref('')
const progressLogs = ref<Array<{ id: number; previous_value: number; new_value: number; progress_percent: number; notes?: string; created_at: string; logged_by_user?: { id: number; name: string }; key_result?: GoalKeyResult }>>([])
const showLogForm = ref(false)
const logForm = ref({ key_result_id: undefined as number | undefined, new_value: 0, notes: '' })
const savingLog = ref(false)

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const canManage = computed(() => rLower.value.includes('admin') || rLower.value.includes('hr_manager') || rLower.value.includes('manager'))

const loadGoal = async () => {
  loading.value = true
  try {
    const id = Number(route.params.id)
    goal.value = await performanceService.getGoal(id)
    const logs = await performanceService.getProgressLogs(id)
    progressLogs.value = logs.data
  } catch {
    error.value = 'Failed to load goal'
  } finally {
    loading.value = false
  }
}

const handlePublish = async () => {
  if (!goal.value) return
  try {
    goal.value = await performanceService.publishGoal(goal.value.id)
  } catch {
    error.value = 'Failed to publish goal'
  }
}

const handleComplete = async () => {
  if (!goal.value) return
  try {
    goal.value = await performanceService.completeGoal(goal.value.id)
  } catch {
    error.value = 'Failed to complete goal'
  }
}

const submitProgressLog = async () => {
  if (!goal.value) return
  savingLog.value = true
  try {
    await performanceService.logProgress(goal.value.id, logForm.value)
    showLogForm.value = false
    logForm.value = { key_result_id: undefined, new_value: 0, notes: '' }
    await loadGoal()
  } catch {
    error.value = 'Failed to log progress'
  } finally {
    savingLog.value = false
  }
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    draft: 'gd-badge-muted',
    active: 'gd-badge-blue',
    completed: 'gd-badge-green',
    cancelled: 'gd-badge-red',
    on_hold: 'gd-badge-yellow',
  }
  return map[status] || 'gd-badge-muted'
}

const getKRStatusClass = (status: string) => {
  const map: Record<string, string> = {
    not_started: 'gd-badge-muted',
    in_progress: 'gd-badge-blue',
    completed: 'gd-badge-green',
    at_risk: 'gd-badge-red',
  }
  return map[status] || 'gd-badge-muted'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()
const formatDateTime = (d: string) => new Date(d).toLocaleString()

onMounted(() => loadGoal())
</script>

<template>
  <div class="gd-page">
    <div v-if="loading" class="gd-loading">
      <div v-for="i in 4" :key="i" class="gd-skeleton"></div>
    </div>

    <div v-else-if="error" class="gd-error">{{ error }}</div>

    <template v-else-if="goal">
      <!-- Header -->
      <div class="gd-header">
        <div class="gd-header-left">
          <button class="gd-back-btn" @click="router.push({ name: 'performance.goals' })">&#8592;</button>
          <div>
            <div class="gd-title-row">
              <h2 class="gd-title">{{ goal.title }}</h2>
              <span :class="['gd-badge', getStatusClass(goal.status)]">{{ goal.status.replace('_', ' ') }}</span>
            </div>
            <p v-if="goal.description" class="gd-desc">{{ goal.description }}</p>
          </div>
        </div>
        <div v-if="canManage" class="gd-actions">
          <button v-if="goal.status === 'draft'" class="gd-btn-publish" @click="handlePublish">Publish</button>
          <button v-if="goal.status === 'active'" class="gd-btn-complete" @click="handleComplete">Mark Complete</button>
          <button class="gd-btn-ghost" @click="router.push({ name: 'performance.goals.show', params: { id: goal.id }, query: { edit: '1' } })">Edit</button>
        </div>
      </div>

      <!-- Meta Cards -->
      <div class="gd-meta-grid">
        <div class="gd-meta-card">
          <p class="gd-meta-label">Type</p>
          <p class="gd-meta-value">{{ goal.type }}</p>
        </div>
        <div class="gd-meta-card">
          <p class="gd-meta-label">Framework</p>
          <p class="gd-meta-value">{{ goal.framework }}</p>
        </div>
        <div class="gd-meta-card">
          <p class="gd-meta-label">Period</p>
          <p class="gd-meta-value">{{ formatDate(goal.start_date) }} – {{ formatDate(goal.end_date) }}</p>
        </div>
        <div class="gd-meta-card">
          <p class="gd-meta-label">Overall Progress</p>
          <div class="gd-progress-row">
            <div class="gd-progress-track">
              <div class="gd-progress-fill" :style="{ width: goal.progress + '%' }" />
            </div>
            <span class="gd-progress-pct">{{ goal.progress }}%</span>
          </div>
        </div>
      </div>

      <!-- Key Results -->
      <div v-if="goal.key_results && goal.key_results.length > 0" class="gd-card">
        <div class="gd-card-head">
          <span>Key Results</span>
          <button v-if="goal.status === 'active'" class="gd-log-btn" @click="showLogForm = !showLogForm">Log Progress</button>
        </div>

        <!-- Log Progress Form -->
        <div v-if="showLogForm" class="gd-log-form">
          <div class="gd-grid-3">
            <div class="gd-field">
              <label class="gd-label">Key Result (optional)</label>
              <select v-model="logForm.key_result_id" class="gd-input">
                <option :value="undefined">Overall Goal</option>
                <option v-for="kr in goal.key_results" :key="kr.id" :value="kr.id">{{ kr.title }}</option>
              </select>
            </div>
            <div class="gd-field">
              <label class="gd-label">New Value</label>
              <input v-model.number="logForm.new_value" type="number" class="gd-input" />
            </div>
            <div class="gd-field">
              <label class="gd-label">Notes</label>
              <input v-model="logForm.notes" type="text" placeholder="Optional notes" class="gd-input" />
            </div>
          </div>
          <div class="gd-log-actions">
            <button class="gd-btn-primary" :disabled="savingLog" @click="submitProgressLog">
              {{ savingLog ? 'Saving…' : 'Log Progress' }}
            </button>
            <button class="gd-btn-ghost" @click="showLogForm = false">Cancel</button>
          </div>
        </div>

        <div v-for="kr in goal.key_results" :key="kr.id" class="gd-kr-row">
          <div class="gd-kr-body">
            <div class="gd-kr-title-row">
              <p class="gd-kr-title">{{ kr.title }}</p>
              <span :class="['gd-badge', getKRStatusClass(kr.status)]">{{ kr.status.replace(/_/g, ' ') }}</span>
            </div>
            <p v-if="kr.description" class="gd-kr-desc">{{ kr.description }}</p>
            <div class="gd-kr-progress-row">
              <div class="gd-progress-track gd-track-sm">
                <div class="gd-progress-fill" :style="{ width: kr.progress + '%' }" />
              </div>
              <span class="gd-kr-vals">{{ kr.current_value }} / {{ kr.target_value }} {{ kr.unit }}</span>
              <span class="gd-kr-pct">{{ kr.progress }}%</span>
            </div>
          </div>
          <div v-if="kr.due_date" class="gd-kr-due">Due: {{ formatDate(kr.due_date) }}</div>
        </div>
      </div>

      <!-- Progress History -->
      <div v-if="progressLogs.length > 0" class="gd-card">
        <div class="gd-card-head"><span>Progress History</span></div>
        <div v-for="log in progressLogs" :key="log.id" class="gd-log-row">
          <div>
            <p class="gd-log-change">{{ log.previous_value }} → {{ log.new_value }} <span v-if="log.key_result" class="gd-log-kr">({{ log.key_result.title }})</span></p>
            <p v-if="log.notes" class="gd-log-note">{{ log.notes }}</p>
          </div>
          <div class="gd-log-right">
            <p class="gd-log-pct">{{ log.progress_percent }}%</p>
            <p class="gd-log-ts">{{ formatDateTime(log.created_at) }}</p>
            <p v-if="log.logged_by_user" class="gd-log-by">by {{ log.logged_by_user.name }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.gd-page { display: flex; flex-direction: column; gap: 16px; }
.gd-loading { display: flex; flex-direction: column; gap: 10px; }
.gd-skeleton { height: 38px; background: #232936; border-radius: 7px; animation: gd-pulse 1.2s ease-in-out infinite; }
@keyframes gd-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.gd-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.gd-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.gd-header-left { display: flex; align-items: flex-start; gap: 12px; }
.gd-back-btn { background: none; border: none; color: #7A8299; font-size: 18px; cursor: pointer; padding: 0; line-height: 1; margin-top: 2px; }
.gd-back-btn:hover { color: #EEF0F4; }
.gd-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
.gd-title { font-size: 18px; font-weight: 700; color: #EEF0F4; margin: 0; }
.gd-desc { font-size: 13px; color: #7A8299; margin: 0; }
.gd-actions { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
.gd-btn-publish { background: rgba(77,211,154,0.15); border: 1px solid rgba(77,211,154,0.3); color: #4DD39A; border-radius: 7px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
.gd-btn-publish:hover { background: rgba(77,211,154,0.25); }
.gd-btn-complete { background: rgba(107,91,255,0.15); border: 1px solid rgba(107,91,255,0.3); color: #8A7BFF; border-radius: 7px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
.gd-btn-complete:hover { background: rgba(107,91,255,0.25); }
.gd-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 7px 14px; font-size: 13px; cursor: pointer; }
.gd-btn-ghost:hover { color: #EEF0F4; }
.gd-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 7px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.gd-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.gd-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.gd-meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.gd-meta-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px 16px; }
.gd-meta-label { font-size: 11px; color: #7A8299; margin: 0 0 4px; }
.gd-meta-value { font-size: 13px; font-weight: 600; color: #EEF0F4; margin: 0; text-transform: capitalize; }
.gd-progress-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.gd-progress-track { flex: 1; height: 6px; background: #232936; border-radius: 4px; overflow: hidden; }
.gd-track-sm { max-width: 160px; }
.gd-progress-fill { height: 100%; background: #6B5BFF; border-radius: 4px; }
.gd-progress-pct { font-size: 12px; font-weight: 600; color: #EEF0F4; }
.gd-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.gd-card-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #232936; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.gd-log-btn { font-size: 12px; color: #6B5BFF; background: none; border: none; cursor: pointer; font-weight: 500; }
.gd-log-btn:hover { color: #8A7BFF; }
.gd-log-form { padding: 14px 16px; border-bottom: 1px solid #232936; background: rgba(13,15,23,0.5); display: flex; flex-direction: column; gap: 12px; }
.gd-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.gd-field { display: flex; flex-direction: column; gap: 4px; }
.gd-label { font-size: 11px; color: #7A8299; }
.gd-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 7px 10px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.gd-input:focus { border-color: #6B5BFF; }
.gd-log-actions { display: flex; gap: 8px; }
.gd-kr-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #1C2030; }
.gd-kr-row:last-child { border-bottom: none; }
.gd-kr-body { flex: 1; min-width: 0; }
.gd-kr-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.gd-kr-title { font-size: 13px; font-weight: 500; color: #EEF0F4; margin: 0; }
.gd-kr-desc { font-size: 12px; color: #7A8299; margin: 0 0 6px; }
.gd-kr-progress-row { display: flex; align-items: center; gap: 10px; }
.gd-kr-vals { font-size: 12px; color: #7A8299; }
.gd-kr-pct { font-size: 12px; font-weight: 600; color: #B6BED0; }
.gd-kr-due { font-size: 12px; color: #7A8299; flex-shrink: 0; }
.gd-log-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #1C2030; }
.gd-log-row:last-child { border-bottom: none; }
.gd-log-change { font-size: 13px; color: #EEF0F4; margin: 0 0 2px; }
.gd-log-kr { color: #7A8299; }
.gd-log-note { font-size: 12px; color: #7A8299; margin: 0; }
.gd-log-right { text-align: right; flex-shrink: 0; }
.gd-log-pct { font-size: 13px; font-weight: 600; color: #6B5BFF; margin: 0 0 2px; }
.gd-log-ts { font-size: 11px; color: #7A8299; margin: 0 0 2px; }
.gd-log-by { font-size: 11px; color: #7A8299; margin: 0; }
.gd-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.gd-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.gd-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.gd-badge-red    { background: rgba(243,130,136,0.12); color: #F38288; }
.gd-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.gd-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
</style>
