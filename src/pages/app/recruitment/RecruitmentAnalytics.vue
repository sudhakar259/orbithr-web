<script setup lang="ts">
defineOptions({ name: 'RecruitmentAnalytics' })
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { recruitmentService, type RecruitmentAnalytics } from '@/services/recruitmentService'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const data = ref<RecruitmentAnalytics | null>(null)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await recruitmentService.getAnalytics()
    data.value = res.data?.data ?? null
  } catch {
    error.value = 'Failed to load analytics'
  } finally {
    loading.value = false
  }
}

const funnelColors = [
  '#6B5BFF',
  '#7D6FFF',
  '#8A7DFF',
  '#9B6EFF',
  '#B89BFF',
  '#F5A623',
  '#4DD39A',
  '#F38288',
]

const maxFunnelCount = computed(() =>
  Math.max(...(data.value?.funnel?.map((f) => f.count) ?? [0]), 1),
)

const totalSources = computed(() =>
  Math.max(data.value?.sources?.reduce((s, r) => s + r.count, 0) ?? 0, 1),
)

const maxTrend = computed(() =>
  Math.max(...(data.value?.monthly_trend?.map((t) => t.count) ?? [0]), 1),
)

const funnelWidth = (count: number) => `${Math.round((count / maxFunnelCount.value) * 100)}%`
const sourceWidth = (count: number) => `${Math.round((count / totalSources.value) * 100)}%`
const sourcePct = (count: number) => `${((count / totalSources.value) * 100).toFixed(1)}%`
const trendHeight = (count: number) => `${Math.round((count / maxTrend.value) * 100)}%`

const formatStatus = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

const getJobStatusClass = (status: string) => {
  const map: Record<string, string> = {
    published: 'badge-ok',
    draft: 'badge-neutral',
    closed: 'badge-danger',
  }
  return map[status] ?? 'badge-neutral'
}

onMounted(load)
</script>

<template>
  <div class="ra-page">
    <!-- Header -->
    <div class="page-header">
      <div class="ph-text">
        <button class="back-btn" @click="router.push({ name: 'recruitment' })">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Dashboard
        </button>
        <div class="ph-eyebrow">Hiring intelligence</div>
        <h1 class="ph-title">Recruitment analytics</h1>
        <p class="ph-sub">
          Funnel conversion, time-to-hire, source mix and monthly volume across all open
          roles.
        </p>
      </div>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="loading-grid">
      <div class="stat-skeleton-row">
        <div v-for="i in 4" :key="i" class="stat-card sk">
          <div class="sk-line sk-sm"></div>
          <div class="sk-line sk-lg"></div>
        </div>
      </div>
      <div class="card sk-block">
        <div class="sk-line sk-sm"></div>
        <div v-for="i in 6" :key="i" class="sk-bar" :style="{ width: `${100 - i * 10}%` }"></div>
      </div>
    </div>

    <template v-else-if="data">
      <!-- Summary Cards -->
      <section class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">Total applications</div>
          <div class="stat-value tone-default">
            {{ data.conversion.total_applications }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg time to hire</div>
          <div class="stat-value tone-accent">
            {{ data.time_to_hire_days }}<span class="stat-unit">days</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Hire rate</div>
          <div class="stat-value tone-green">{{ data.conversion.hire_rate }}%</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Shortlist rate</div>
          <div class="stat-value tone-purple">{{ data.conversion.shortlist_rate }}%</div>
        </div>
      </section>

      <!-- Recruitment Funnel -->
      <section class="card panel">
        <div class="panel-head">Recruitment funnel</div>
        <div class="funnel">
          <div
            v-for="(stage, i) in data.funnel"
            :key="stage.status"
            class="funnel-row"
          >
            <div class="funnel-label">{{ formatStatus(stage.status) }}</div>
            <div class="funnel-track">
              <div
                class="funnel-fill"
                :style="{
                  width: funnelWidth(stage.count),
                  background: funnelColors[i] ?? '#6B5BFF',
                }"
              ></div>
            </div>
            <div class="funnel-count">{{ stage.count }}</div>
          </div>
        </div>
      </section>

      <!-- Source Analytics & Monthly Trend -->
      <section class="dual-grid">
        <!-- Source Analytics -->
        <div class="card panel">
          <div class="panel-head">Application sources</div>
          <div v-if="!data.sources.length" class="panel-empty">No source data</div>
          <div v-else class="source-list">
            <div v-for="src in data.sources" :key="src.source" class="source-row">
              <div class="source-line">
                <span class="source-name">{{ src.source }}</span>
                <span class="source-meta">
                  {{ src.count }} <span class="source-pct">{{ sourcePct(src.count) }}</span>
                </span>
              </div>
              <div class="source-track">
                <div class="source-fill" :style="{ width: sourceWidth(src.count) }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly Trend -->
        <div class="card panel">
          <div class="panel-head">Monthly applications · last 6 months</div>
          <div v-if="!data.monthly_trend.length" class="panel-empty">No trend data</div>
          <div v-else class="trend-chart">
            <div
              v-for="point in data.monthly_trend"
              :key="point.month"
              class="trend-col"
            >
              <span class="trend-num">{{ point.count }}</span>
              <div class="trend-track">
                <div class="trend-fill" :style="{ height: trendHeight(point.count) }"></div>
              </div>
              <span class="trend-month">{{ point.month.slice(5) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Top Jobs -->
      <section class="card table-card">
        <div class="panel-head panel-head-bordered">Top jobs by applications</div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Job title</th>
              <th>Department</th>
              <th class="t-right">Applications</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in data.top_jobs" :key="job.id" class="row">
              <td class="t-strong">{{ job.title }}</td>
              <td class="t-muted">{{ job.department || '—' }}</td>
              <td class="t-right t-mono t-accent">{{ job.applications_count }}</td>
              <td>
                <span :class="['badge', getJobStatusClass(job.status)]">
                  {{ job.status }}
                </span>
              </td>
            </tr>
            <tr v-if="!data.top_jobs.length">
              <td colspan="4" class="t-empty">No jobs found</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.ra-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #eef0f4;
}

/* Page header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}
.ph-text {
  display: flex;
  flex-direction: column;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: #7a8299;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  margin-bottom: 12px;
  font-family: inherit;
  align-self: flex-start;
  transition: color 0.15s ease;
}
.back-btn:hover {
  color: #eef0f4;
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

/* Alerts */
.alert-error {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #f38288;
  font-size: 13px;
  padding: 12px 14px;
  border-radius: 8px;
}

/* Card */
.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
}

/* Loading */
.loading-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stat-skeleton-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.stat-card.sk {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-line {
  background: #1a1f2a;
  border-radius: 4px;
  animation: shimmer 1.4s ease-in-out infinite;
}
.sk-sm {
  height: 12px;
  width: 50%;
}
.sk-lg {
  height: 28px;
  width: 35%;
}
.sk-block {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-bar {
  height: 24px;
  background: #1a1f2a;
  border-radius: 4px;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.85;
  }
}

/* Stat grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.stat-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s ease;
}
.stat-card:hover {
  border-color: #2c3242;
}
.stat-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
}
.stat-value {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  line-height: 1.05;
  font-weight: 400;
  letter-spacing: -0.01em;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.stat-unit {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px;
  color: #7a8299;
  font-weight: 500;
}
.tone-default {
  color: #eef0f4;
}
.tone-accent {
  color: #6b5bff;
}
.tone-green {
  color: #4dd39a;
}
.tone-purple {
  color: #9b6eff;
}

/* Panel */
.panel {
  padding: 22px;
}
.panel-head {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
  margin-bottom: 18px;
}
.panel-head-bordered {
  margin-bottom: 0;
  padding: 14px 18px;
  border-bottom: 1px solid #232936;
}
.panel-empty {
  text-align: center;
  padding: 32px 0;
  color: #7a8299;
  font-size: 12px;
}

/* Funnel */
.funnel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.funnel-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.funnel-label {
  width: 140px;
  text-align: right;
  font-size: 11.5px;
  color: #c8ccd6;
  flex-shrink: 0;
}
.funnel-track {
  flex: 1;
  height: 26px;
  background: #1a1f2a;
  border: 1px solid #232936;
  border-radius: 6px;
  overflow: hidden;
}
.funnel-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.6s ease;
}
.funnel-count {
  width: 40px;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #eef0f4;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* Dual grid */
.dual-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

/* Source list */
.source-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.source-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.source-line {
  display: flex;
  justify-content: space-between;
  font-size: 11.5px;
}
.source-name {
  color: #eef0f4;
  text-transform: capitalize;
  font-weight: 500;
}
.source-meta {
  color: #7a8299;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}
.source-pct {
  color: #6b5bff;
  margin-left: 4px;
}
.source-track {
  width: 100%;
  height: 6px;
  background: #1a1f2a;
  border-radius: 3px;
  overflow: hidden;
}
.source-fill {
  height: 100%;
  background: linear-gradient(90deg, #6b5bff, #8a7dff);
  border-radius: 3px;
  transition: width 0.6s ease;
}

/* Trend chart */
.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 150px;
}
.trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.trend-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #c8ccd6;
  font-weight: 600;
}
.trend-track {
  width: 100%;
  height: 96px;
  background: #1a1f2a;
  border-radius: 4px 4px 0 0;
  position: relative;
  overflow: hidden;
}
.trend-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #6b5bff, #4f3fdc);
  border-radius: 4px 4px 0 0;
  transition: height 0.6s ease;
}
.trend-month {
  font-size: 10.5px;
  color: #7a8299;
  font-family: 'JetBrains Mono', monospace;
}

/* Table */
.table-card {
  overflow: hidden;
  padding: 0;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table thead th {
  background: #1a1f2a;
  border-bottom: 1px solid #232936;
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
  padding: 10px 18px;
}
.data-table tbody td {
  padding: 14px 18px;
  border-bottom: 1px solid #232936;
  font-size: 13px;
  color: #c8ccd6;
  vertical-align: middle;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.row {
  transition: background 0.12s ease;
}
.row:hover {
  background: rgba(107, 91, 255, 0.04);
}

.t-strong {
  color: #eef0f4;
  font-weight: 500;
}
.t-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.t-accent {
  color: #6b5bff;
  font-weight: 600;
}
.t-muted {
  color: #7a8299;
}
.t-right {
  text-align: right;
}
.t-empty {
  text-align: center;
  color: #7a8299;
  font-size: 12.5px;
  padding: 24px !important;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  border: 1px solid transparent;
  text-transform: capitalize;
}
.badge-ok {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}
.badge-danger {
  background: rgba(243, 130, 136, 0.12);
  color: #f38288;
  border-color: rgba(243, 130, 136, 0.25);
}
.badge-neutral {
  background: #1a1f2a;
  color: #c8ccd6;
  border-color: #232936;
}
</style>
