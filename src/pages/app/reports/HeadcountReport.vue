<script setup lang="ts">
defineOptions({ name: 'ReportsHeadcount' })
import { ref, computed, onMounted } from 'vue'
import { reportService, type HeadcountReportRow, type ReportFilter } from '@/services/reportService'

const loading = ref(false)
const error = ref('')
const rows = ref<HeadcountReportRow[]>([])
const filters = ref<ReportFilter>({})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await reportService.getHeadcountReport(filters.value)
    rows.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load report'
  } finally {
    loading.value = false
  }
}

const totalHeadcount = computed(() => rows.value.reduce((s, r) => s + r.total, 0))
const totalActive = computed(() => rows.value.reduce((s, r) => s + r.active, 0))

onMounted(load)
</script>

<template>
  <div class="hc-page">
    <div class="hc-filter-bar">
      <button class="hc-btn-primary" @click="load">Refresh</button>
    </div>

    <div class="hc-stats">
      <div class="hc-stat-card">
        <div class="hc-stat-label">Total Headcount</div>
        <div class="hc-stat-value">{{ totalHeadcount }}</div>
      </div>
      <div class="hc-stat-card">
        <div class="hc-stat-label">Active Employees</div>
        <div class="hc-stat-value hc-green">{{ totalActive }}</div>
      </div>
    </div>

    <div v-if="error" class="hc-error">{{ error }}</div>

    <div v-if="loading" class="hc-card hc-loading">
      <div v-for="i in 5" :key="i" class="hc-skeleton"></div>
    </div>

    <div v-else-if="rows.length" class="hc-card">
      <table class="hc-table">
        <thead>
          <tr>
            <th class="hc-th">Department</th>
            <th class="hc-th hc-th-right">Total</th>
            <th class="hc-th hc-th-right">Active</th>
            <th class="hc-th hc-th-right">Inactive</th>
            <th class="hc-th hc-th-right">Male</th>
            <th class="hc-th hc-th-right">Female</th>
            <th class="hc-th hc-th-right">Full-time</th>
            <th class="hc-th hc-th-right">Part-time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.department" class="hc-row">
            <td class="hc-td hc-td-name">{{ row.department }}</td>
            <td class="hc-td hc-td-right hc-mono hc-bold">{{ row.total }}</td>
            <td class="hc-td hc-td-right hc-mono hc-green">{{ row.active }}</td>
            <td class="hc-td hc-td-right hc-mono hc-red">{{ row.inactive }}</td>
            <td class="hc-td hc-td-right hc-mono hc-blue">{{ row.male }}</td>
            <td class="hc-td hc-td-right hc-mono hc-purple">{{ row.female }}</td>
            <td class="hc-td hc-td-right hc-mono">{{ row.full_time }}</td>
            <td class="hc-td hc-td-right hc-mono">{{ row.part_time }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="hc-empty">No employee data found.</div>
  </div>
</template>

<style scoped>
.hc-page { display: flex; flex-direction: column; gap: 16px; }
.hc-filter-bar { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px 16px; display: flex; gap: 12px; align-items: center; }
.hc-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 18px; font-size: 13px; font-weight: 500; cursor: pointer; }
.hc-btn-primary:hover { opacity: 0.88; }
.hc-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.hc-stat-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 16px; }
.hc-stat-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; }
.hc-stat-value { font-family: 'Instrument Serif', serif; font-size: 28px; color: #EEF0F4; letter-spacing: -0.02em; margin-top: 4px; }
.hc-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.hc-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.hc-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.hc-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: hc-pulse 1.2s ease-in-out infinite; }
@keyframes hc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.hc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.hc-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.hc-th-right { text-align: right; }
.hc-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.hc-row:last-child { border-bottom: none; }
.hc-row:hover { background: rgba(255,255,255,0.02); }
.hc-td { padding: 11px 16px; color: #B6BED0; vertical-align: middle; }
.hc-td-name { color: #EEF0F4; font-weight: 500; }
.hc-td-right { text-align: right; }
.hc-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.hc-bold { font-weight: 600; }
.hc-green { color: #4DD39A; }
.hc-red { color: #F38288; }
.hc-blue { color: #7ED7FF; }
.hc-purple { color: #B28DFF; }
.hc-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }
</style>
