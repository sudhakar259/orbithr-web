<script setup lang="ts">
defineOptions({ name: 'ReportsAttrition' })
import { ref, computed, onMounted } from 'vue'
import {
  reportService,
  type AttritionReportRow,
  type ReportFilter,
} from '@/services/reportService'

const loading = ref(false)
const error = ref('')
const rows = ref<AttritionReportRow[]>([])
const filters = ref<ReportFilter>({ start_date: '', end_date: '' })

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await reportService.getAttritionReport(filters.value)
    rows.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const totalAttrition = computed(() => rows.value.reduce((s, r) => s + r.count, 0))
const avgRate = computed(() =>
  rows.value.length
    ? (rows.value.reduce((s, r) => s + r.attrition_rate, 0) / rows.value.length).toFixed(2)
    : '0',
)

onMounted(load)
</script>

<template>
  <div class="atr-page">
    <div class="atr-filter-bar">
      <div class="atr-filter-field">
        <label class="atr-filter-label">Start Date</label>
        <input v-model="filters.start_date" type="date" class="atr-input" />
      </div>
      <div class="atr-filter-field">
        <label class="atr-filter-label">End Date</label>
        <input v-model="filters.end_date" type="date" class="atr-input" />
      </div>
      <button class="atr-btn-primary" @click="load">Apply</button>
    </div>

    <div class="atr-stats">
      <div class="atr-stat-card">
        <div class="atr-stat-label">Total Attrition</div>
        <div class="atr-stat-value atr-red">{{ totalAttrition }}</div>
      </div>
      <div class="atr-stat-card">
        <div class="atr-stat-label">Avg Attrition Rate</div>
        <div class="atr-stat-value atr-yellow">{{ avgRate }}%</div>
      </div>
    </div>

    <div v-if="error" class="atr-error">{{ error }}</div>

    <div v-if="loading" class="atr-card atr-loading">
      <div v-for="i in 5" :key="i" class="atr-skeleton"></div>
    </div>

    <div v-else-if="rows.length" class="atr-card">
      <table class="atr-table">
        <thead>
          <tr>
            <th class="atr-th">Month</th>
            <th class="atr-th">Department</th>
            <th class="atr-th atr-th-right">Count</th>
            <th class="atr-th">Reason</th>
            <th class="atr-th atr-th-right">Rate %</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i" class="atr-row">
            <td class="atr-td atr-td-name">{{ row.month }}</td>
            <td class="atr-td">{{ row.department }}</td>
            <td class="atr-td atr-td-right atr-mono atr-red atr-bold">{{ row.count }}</td>
            <td class="atr-td atr-capitalize">{{ row.reason }}</td>
            <td class="atr-td atr-td-right atr-mono atr-yellow">{{ row.attrition_rate }}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="atr-empty">No attrition data. Apply filters and click Apply.</div>
  </div>
</template>

<style scoped>
.atr-page { display: flex; flex-direction: column; gap: 16px; }
.atr-filter-bar { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.atr-filter-field { display: flex; flex-direction: column; gap: 4px; }
.atr-filter-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.atr-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; }
.atr-input:focus { border-color: #6B5BFF; }
.atr-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 18px; font-size: 13px; font-weight: 500; cursor: pointer; }
.atr-btn-primary:hover { opacity: 0.88; }
.atr-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.atr-stat-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; }
.atr-stat-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; }
.atr-stat-value { font-family: 'Instrument Serif', serif; font-size: 28px; color: #EEF0F4; letter-spacing: -0.02em; margin-top: 4px; }
.atr-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.atr-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.atr-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.atr-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: atr-pulse 1.2s ease-in-out infinite; }
@keyframes atr-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.atr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.atr-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.atr-th-right { text-align: right; }
.atr-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.atr-row:last-child { border-bottom: none; }
.atr-row:hover { background: rgba(255,255,255,0.02); }
.atr-td { padding: 11px 16px; color: #B6BED0; vertical-align: middle; }
.atr-td-name { color: #EEF0F4; font-weight: 500; }
.atr-td-right { text-align: right; }
.atr-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.atr-bold { font-weight: 600; }
.atr-capitalize { text-transform: capitalize; }
.atr-green { color: #4DD39A; }
.atr-red { color: #F38288; }
.atr-yellow { color: #F5A623; }
.atr-blue { color: #7ED7FF; }
.atr-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }
</style>
