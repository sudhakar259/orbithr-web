<script setup lang="ts">
defineOptions({ name: 'ReportsPerformance' })
import { ref, computed, onMounted } from 'vue'
import {
  reportService,
  type PerformanceReportRow,
  type ReportFilter,
} from '@/services/reportService'

const loading = ref(false)
const error = ref('')
const rows = ref<PerformanceReportRow[]>([])
const filters = ref<ReportFilter>({ start_date: '', end_date: '' })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await reportService.getPerformanceReport(filters.value)
    rows.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const avgScore = computed(() =>
  rows.value.length
    ? (rows.value.reduce((s, r) => s + r.appraisal_score, 0) / rows.value.length).toFixed(1)
    : '0',
)

const getRatingClass = (rating: string) => {
  const map: Record<string, string> = {
    excellent: 'perf-badge-green',
    good: 'perf-badge-blue',
    satisfactory: 'perf-badge-yellow',
    needs_improvement: 'perf-badge-red',
  }
  return map[rating?.toLowerCase()] ?? 'perf-badge-muted'
}

onMounted(load)
</script>

<template>
  <div class="perf-page">
    <div class="perf-filter-bar">
      <div class="perf-filter-field">
        <label class="perf-filter-label">Start Date</label>
        <input v-model="filters.start_date" type="date" class="perf-input" />
      </div>
      <div class="perf-filter-field">
        <label class="perf-filter-label">End Date</label>
        <input v-model="filters.end_date" type="date" class="perf-input" />
      </div>
      <button class="perf-btn-primary" @click="load">Apply</button>
    </div>

    <div class="perf-stat-card">
      <div class="perf-stat-label">Average Appraisal Score</div>
      <div class="perf-stat-value perf-purple">{{ avgScore }} / 5</div>
    </div>

    <div v-if="error" class="perf-error">{{ error }}</div>

    <div v-if="loading" class="perf-card perf-loading">
      <div v-for="i in 5" :key="i" class="perf-skeleton"></div>
    </div>

    <div v-else-if="rows.length" class="perf-card">
      <table class="perf-table">
        <thead>
          <tr>
            <th class="perf-th">Employee</th>
            <th class="perf-th">Department</th>
            <th class="perf-th perf-th-right">Score</th>
            <th class="perf-th">Rating</th>
            <th class="perf-th">Cycle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.employee_id" class="perf-row">
            <td class="perf-td perf-td-name">{{ row.name }}</td>
            <td class="perf-td">{{ row.department }}</td>
            <td class="perf-td perf-td-right perf-mono perf-purple perf-bold">{{ row.appraisal_score }}</td>
            <td class="perf-td">
              <span :class="['perf-badge', getRatingClass(row.rating)]">{{ row.rating }}</span>
            </td>
            <td class="perf-td">{{ row.cycle }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="perf-empty">No performance data. Apply filters and click Apply.</div>
  </div>
</template>

<style scoped>
.perf-page { display: flex; flex-direction: column; gap: 16px; }
.perf-filter-bar { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.perf-filter-field { display: flex; flex-direction: column; gap: 4px; }
.perf-filter-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.perf-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; }
.perf-input:focus { border-color: #6B5BFF; }
.perf-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 18px; font-size: 13px; font-weight: 500; cursor: pointer; }
.perf-btn-primary:hover { opacity: 0.88; }
.perf-stat-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; }
.perf-stat-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; }
.perf-stat-value { font-family: 'Instrument Serif', serif; font-size: 28px; color: #EEF0F4; letter-spacing: -0.02em; margin-top: 4px; }
.perf-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.perf-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.perf-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.perf-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: perf-pulse 1.2s ease-in-out infinite; }
@keyframes perf-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.perf-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.perf-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.perf-th-right { text-align: right; }
.perf-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.perf-row:last-child { border-bottom: none; }
.perf-row:hover { background: rgba(255,255,255,0.02); }
.perf-td { padding: 11px 16px; color: #B6BED0; vertical-align: middle; }
.perf-td-name { color: #EEF0F4; font-weight: 500; }
.perf-td-right { text-align: right; }
.perf-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.perf-bold { font-weight: 600; }
.perf-purple { color: #B28DFF; }
.perf-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.perf-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.perf-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.perf-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.perf-badge-red    { background: rgba(243,130,136,0.12); color: #F38288; }
.perf-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.perf-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }
</style>
