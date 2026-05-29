<script setup lang="ts">
defineOptions({ name: 'PerformanceReports' })
import { ref, onMounted } from 'vue'
import { performanceService, type AppraisalCycle, type TeamSummary, type EmployeeAppraisal } from '@/services/performanceService'

const loading = ref(false)
const cycles = ref<AppraisalCycle[]>([])
const selectedCycleId = ref<number | null>(null)
const teamReport = ref<{ cycle: AppraisalCycle; summary: TeamSummary; appraisals: EmployeeAppraisal[] } | null>(null)
const error = ref('')
const calculating = ref(false)

const loadCycles = async () => {
  try {
    const result = await performanceService.getCycles({ status: 'active' })
    cycles.value = result.data
    if (!result.data.length) {
      const all = await performanceService.getCycles()
      cycles.value = all.data.filter(c => ['active', 'locked', 'completed'].includes(c.status))
    }
    if (cycles.value.length > 0) {
      selectedCycleId.value = cycles.value[0].id
      await loadReport()
    }
  } catch {
    error.value = 'Failed to load cycles'
  }
}

const loadReport = async () => {
  if (!selectedCycleId.value) return
  loading.value = true
  error.value = ''
  try {
    teamReport.value = await performanceService.getCycleSummary(selectedCycleId.value)
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const handleCalculate = async () => {
  if (!selectedCycleId.value) return
  calculating.value = true
  error.value = ''
  try {
    await performanceService.calculateCycleScores(selectedCycleId.value)
    await loadReport()
  } catch {
    error.value = 'Failed to calculate scores'
  } finally {
    calculating.value = false
  }
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    not_started: 'pr-badge-muted',
    in_progress: 'pr-badge-blue',
    completed: 'pr-badge-green',
    acknowledged: 'pr-badge-teal',
  }
  return map[status] || 'pr-badge-muted'
}

onMounted(() => loadCycles())
</script>

<template>
  <div class="pr-page">
    <!-- Controls -->
    <div class="pr-controls">
      <div class="pr-field">
        <label class="pr-label">Appraisal Cycle</label>
        <select v-model="selectedCycleId" class="pr-select" @change="loadReport()">
          <option v-for="cycle in cycles" :key="cycle.id" :value="cycle.id">{{ cycle.name }}</option>
        </select>
      </div>
      <button class="pr-btn-calc" :disabled="calculating || !selectedCycleId" @click="handleCalculate">
        {{ calculating ? 'Calculating…' : 'Recalculate Scores' }}
      </button>
    </div>

    <div v-if="loading" class="pr-loading">
      <div v-for="i in 4" :key="i" class="pr-skeleton"></div>
    </div>

    <div v-else-if="error" class="pr-error">{{ error }}</div>

    <div v-else-if="cycles.length === 0" class="pr-empty">No active or completed appraisal cycles found.</div>

    <template v-else-if="teamReport">
      <!-- Summary Cards -->
      <div class="pr-stat-grid">
        <div class="pr-stat-card">
          <p class="pr-stat-label">Total Employees</p>
          <p class="pr-stat-val">{{ teamReport.summary.total_employees }}</p>
        </div>
        <div class="pr-stat-card">
          <p class="pr-stat-label">Completed</p>
          <p class="pr-stat-val pr-val-green">{{ teamReport.summary.completed }}</p>
        </div>
        <div class="pr-stat-card">
          <p class="pr-stat-label">In Progress</p>
          <p class="pr-stat-val pr-val-blue">{{ teamReport.summary.in_progress }}</p>
        </div>
        <div class="pr-stat-card">
          <p class="pr-stat-label">Not Started</p>
          <p class="pr-stat-val pr-val-muted">{{ teamReport.summary.not_started }}</p>
        </div>
      </div>

      <!-- Score Summary -->
      <div class="pr-score-grid">
        <div class="pr-stat-card">
          <p class="pr-stat-label">Average Score</p>
          <p class="pr-stat-val">{{ teamReport.summary.average_score?.toFixed(2) ?? 'N/A' }}</p>
        </div>
        <div class="pr-stat-card">
          <p class="pr-stat-label">Highest Score</p>
          <p class="pr-stat-val pr-val-green">{{ teamReport.summary.highest_score?.toFixed(2) ?? 'N/A' }}</p>
        </div>
        <div class="pr-stat-card">
          <p class="pr-stat-label">Lowest Score</p>
          <p class="pr-stat-val pr-val-red">{{ teamReport.summary.lowest_score?.toFixed(2) ?? 'N/A' }}</p>
        </div>
      </div>

      <!-- Rating Distribution -->
      <div v-if="Object.keys(teamReport.summary.rating_distribution).length > 0" class="pr-card">
        <div class="pr-card-head">Rating Distribution</div>
        <div class="pr-dist-body">
          <div v-for="(count, label) in teamReport.summary.rating_distribution" :key="label" class="pr-dist-row">
            <span class="pr-dist-label">{{ label }}</span>
            <div class="pr-dist-track">
              <div
                class="pr-dist-fill"
                :style="{ width: teamReport.summary.total_employees > 0 ? (Number(count) / teamReport.summary.total_employees * 100) + '%' : '0%' }"
              />
            </div>
            <span class="pr-dist-count">{{ count }}</span>
          </div>
        </div>
      </div>

      <!-- Individual Results Table -->
      <div class="pr-card">
        <div class="pr-card-head">Individual Results</div>
        <div class="pr-table-wrap">
          <table class="pr-table">
            <thead>
              <tr>
                <th class="pr-th">Employee</th>
                <th class="pr-th">Status</th>
                <th class="pr-th">Final Score</th>
                <th class="pr-th">Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="appraisal in teamReport.appraisals" :key="appraisal.id" class="pr-tr">
                <td class="pr-td">
                  <p class="pr-td-name">{{ appraisal.employee?.first_name }} {{ appraisal.employee?.last_name }}</p>
                  <p class="pr-td-dept">{{ appraisal.employee?.department }}</p>
                </td>
                <td class="pr-td">
                  <span :class="['pr-badge', getStatusClass(appraisal.status)]">{{ appraisal.status.replace(/_/g, ' ') }}</span>
                </td>
                <td class="pr-td pr-td-score">{{ appraisal.final_score?.toFixed(2) ?? '—' }}</td>
                <td class="pr-td pr-td-rating">{{ appraisal.final_rating ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pr-page { display: flex; flex-direction: column; gap: 16px; }
.pr-controls { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.pr-field { display: flex; flex-direction: column; gap: 5px; }
.pr-label { font-size: 11px; font-weight: 500; color: #B6BED0; }
.pr-select { background: #161A23; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 7px 11px; font-size: 13px; outline: none; }
.pr-select:focus { border-color: #6B5BFF; }
.pr-btn-calc { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.pr-btn-calc:hover:not(:disabled) { opacity: 0.88; }
.pr-btn-calc:disabled { opacity: 0.45; cursor: not-allowed; }
.pr-loading { display: flex; flex-direction: column; gap: 10px; }
.pr-skeleton { height: 48px; background: #232936; border-radius: 7px; animation: pr-pulse 1.2s ease-in-out infinite; }
@keyframes pr-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.pr-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.pr-empty { text-align: center; font-size: 13px; color: #7A8299; padding: 40px 0; }
.pr-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.pr-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.pr-stat-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; }
.pr-stat-label { font-size: 11px; color: #7A8299; margin: 0 0 6px; }
.pr-stat-val { font-size: 22px; font-weight: 700; color: #EEF0F4; margin: 0; font-family: 'Instrument Serif', serif; }
.pr-val-green { color: #4DD39A; }
.pr-val-blue  { color: #7ED7FF; }
.pr-val-red   { color: #F38288; }
.pr-val-muted { color: #7A8299; }
.pr-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.pr-card-head { padding: 14px 16px; border-bottom: 1px solid #232936; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.pr-dist-body { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.pr-dist-row { display: flex; align-items: center; gap: 12px; }
.pr-dist-label { font-size: 12px; color: #B6BED0; width: 120px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pr-dist-track { flex: 1; height: 14px; background: #232936; border-radius: 4px; overflow: hidden; }
.pr-dist-fill { height: 100%; background: #6B5BFF; border-radius: 4px; }
.pr-dist-count { font-size: 12px; color: #7A8299; width: 28px; text-align: right; flex-shrink: 0; }
.pr-table-wrap { overflow-x: auto; }
.pr-table { width: 100%; border-collapse: collapse; }
.pr-th { padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; background: #11141C; border-bottom: 1px solid #232936; white-space: nowrap; }
.pr-tr { border-bottom: 1px solid #1C2030; }
.pr-tr:last-child { border-bottom: none; }
.pr-tr:hover { background: rgba(255,255,255,0.02); }
.pr-td { padding: 12px 16px; font-size: 13px; color: #EEF0F4; vertical-align: middle; }
.pr-td-name { font-size: 13px; color: #EEF0F4; margin: 0 0 2px; font-weight: 500; }
.pr-td-dept { font-size: 11px; color: #7A8299; margin: 0; }
.pr-td-score { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
.pr-td-rating { color: #B6BED0; }
.pr-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.pr-badge-green { background: rgba(77,211,154,0.12); color: #4DD39A; }
.pr-badge-blue  { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.pr-badge-teal  { background: rgba(77,211,154,0.08); color: #4DD39A; }
.pr-badge-red   { background: rgba(243,130,136,0.12); color: #F38288; }
.pr-badge-muted { background: rgba(122,130,153,0.12); color: #7A8299; }
</style>
