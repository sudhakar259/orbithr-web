<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { performanceService, type PerformanceDashboard } from '@/services/performanceService'

const router = useRouter()
const loading = ref(true)
const dashboard = ref<PerformanceDashboard | null>(null)
const error = ref('')

const loadDashboard = async () => {
  loading.value = true
  try {
    dashboard.value = await performanceService.getDashboard()
  } catch (err: unknown) {
    error.value = 'Failed to load dashboard data'
    console.error(err)
  } finally {
    loading.value = false
  }
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

const progressColor = (v: number) => {
  if (v >= 70) return '#4DD39A'
  if (v >= 40) return '#F5A623'
  return '#F38288'
}

onMounted(() => loadDashboard())
</script>

<template>
  <div class="dash">
    <div v-if="loading" class="state-block">
      <div class="spinner"></div>
    </div>

    <div v-else-if="error" class="state-error">{{ error }}</div>

    <template v-else-if="dashboard">
      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Active goals</div>
          <div class="kpi-value">{{ dashboard.active_goals }}</div>
          <div class="kpi-foot">
            <span class="dot dot-purple"></span>
            <span>Currently in progress</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Pending appraisals</div>
          <div class="kpi-value">{{ dashboard.pending_appraisals }}</div>
          <div class="kpi-foot">
            <span class="dot dot-yellow"></span>
            <span>Awaiting action</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Feedback requests</div>
          <div class="kpi-value">{{ dashboard.feedback_requests }}</div>
          <div class="kpi-foot">
            <span class="dot dot-green"></span>
            <span>360&deg; reviews</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Avg team score</div>
          <div class="kpi-value">{{ dashboard.avg_team_score ?? 'N/A' }}</div>
          <div class="kpi-foot">
            <span class="dot dot-purple"></span>
            <span>Last cycle</span>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="quick-actions">
        <button class="btn btn-primary" @click="router.push({ name: 'performance.goals.create' })">
          + New goal
        </button>
        <button class="btn btn-secondary" @click="router.push({ name: 'performance.appraisals' })">
          View appraisals
        </button>
        <button class="btn btn-secondary" @click="router.push({ name: 'performance.feedback' })">
          Give feedback
        </button>
      </div>

      <!-- Two-col layout -->
      <div class="two-col">
        <div class="card pad0">
          <div class="card-head">
            <div>
              <div class="card-title">Recent goals</div>
              <div class="card-eyebrow">Tracking this quarter</div>
            </div>
          </div>

          <ul v-if="dashboard.recent_goals.length" class="goal-list">
            <li
              v-for="goal in dashboard.recent_goals"
              :key="goal.id"
              class="goal-row"
              @click="router.push({ name: 'performance.goals.show', params: { id: goal.id } })"
            >
              <div class="goal-row-main">
                <div class="goal-row-title">{{ goal.title }}</div>
                <div class="goal-row-meta">Due {{ formatDate(goal.end_date) }}</div>
              </div>
              <div class="goal-row-right">
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :style="{
                      width: goal.progress + '%',
                      background: progressColor(goal.progress),
                    }"
                  ></div>
                </div>
                <div class="bar-pct">{{ goal.progress }}%</div>
              </div>
            </li>
          </ul>
          <div v-else class="empty-pad">No active goals</div>
        </div>

        <div class="card">
          <div class="card-head inline">
            <div class="card-title">Cycle status</div>
            <span class="badge badge-warn">Preparing</span>
          </div>

          <div class="cycle-name">{{ dashboard.active_cycle?.name ?? 'Q2 2026 review' }}</div>
          <div class="cycle-window">
            <span v-if="dashboard.active_cycle">
              {{ formatDate(dashboard.active_cycle.start_date) }} &mdash;
              {{ formatDate(dashboard.active_cycle.end_date) }}
            </span>
            <span v-else>Opens May 15 &middot; Closes Jun 12</span>
          </div>

          <div class="deadlines">
            <div class="deadlines-title">Upcoming deadlines</div>
            <ul v-if="dashboard.upcoming_deadlines.length" class="deadline-list">
              <li v-for="stage in dashboard.upcoming_deadlines" :key="stage.id" class="deadline-row">
                <div class="step-dot" :class="{ 'is-active': stage.is_active }">
                  <svg
                    v-if="stage.is_locked"
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    stroke-width="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div class="deadline-main">
                  <div class="deadline-name">{{ stage.name }}</div>
                  <div class="deadline-meta">{{ stage.stage_type.replace(/_/g, ' ') }}</div>
                </div>
                <div class="deadline-date">
                  {{ stage.end_date ? formatDate(stage.end_date) : '—' }}
                </div>
              </li>
            </ul>
            <div v-else class="empty-pad small">No upcoming deadlines</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dash {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.state-block {
  text-align: center;
  padding: 48px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid #232936;
  border-top-color: #6b5bff;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.state-error {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #f38288;
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 13px;
}

/* KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}

.kpi-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kpi-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a8299;
  font-weight: 600;
}

.kpi-value {
  font-family: 'Instrument Serif', serif;
  font-size: 42px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #eef0f4;
  font-weight: 400;
}

.kpi-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: #7a8299;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.dot-purple {
  background: #6b5bff;
}

.dot-green {
  background: #4dd39a;
}

.dot-yellow {
  background: #f5a623;
}

/* Quick actions */
.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  font-size: 12.5px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.btn-primary {
  background: #6b5bff;
  color: #fff;
}

.btn-primary:hover {
  background: #5a4ce6;
}

.btn-secondary {
  background: transparent;
  border-color: #232936;
  color: #eef0f4;
}

.btn-secondary:hover {
  border-color: #6b5bff;
  color: #6b5bff;
}

/* Two col */
.two-col {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

@media (max-width: 1024px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 16px 18px;
}

.card.pad0 {
  padding: 0;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #232936;
}

.card:not(.pad0) .card-head {
  padding: 0 0 12px 0;
  margin-bottom: 12px;
  border-bottom: 1px solid #232936;
}

.card-head.inline {
  border-bottom: 1px solid #232936;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #eef0f4;
  letter-spacing: -0.01em;
}

.card-eyebrow {
  font-size: 11px;
  color: #7a8299;
  margin-top: 2px;
}

/* Goal rows in dashboard */
.goal-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.goal-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-top: 1px solid #232936;
  cursor: pointer;
  transition: background 0.15s ease;
}

.goal-row:first-child {
  border-top: none;
}

.goal-row:hover {
  background: rgba(107, 91, 255, 0.04);
}

.goal-row-main {
  flex: 1;
  min-width: 0;
}

.goal-row-title {
  font-size: 13px;
  color: #eef0f4;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.goal-row-meta {
  font-size: 11.5px;
  color: #7a8299;
  margin-top: 2px;
}

.goal-row-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-track {
  width: 120px;
  height: 6px;
  background: #0d0f17;
  border: 1px solid #232936;
  border-radius: 3px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.bar-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: #eef0f4;
  font-weight: 600;
  width: 38px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.empty-pad {
  padding: 32px 18px;
  text-align: center;
  color: #7a8299;
  font-size: 13px;
}

.empty-pad.small {
  padding: 16px 0;
  font-size: 12px;
}

/* Cycle card */
.badge {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.badge-warn {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.3);
}

.cycle-name {
  font-family: 'Instrument Serif', serif;
  font-size: 24px;
  letter-spacing: -0.02em;
  color: #eef0f4;
  margin-top: 12px;
  font-weight: 400;
}

.cycle-window {
  font-size: 11.5px;
  color: #7a8299;
  margin-top: 4px;
}

.deadlines {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #232936;
}

.deadlines-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a8299;
  font-weight: 600;
  margin-bottom: 12px;
}

.deadline-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.deadline-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.step-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #232936;
  border: 2px solid #232936;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-dot.is-active {
  background: transparent;
  border-color: #6b5bff;
}

.deadline-main {
  flex: 1;
  min-width: 0;
}

.deadline-name {
  color: #eef0f4;
  font-weight: 500;
  font-size: 12px;
}

.deadline-meta {
  font-size: 11px;
  color: #7a8299;
  margin-top: 2px;
  text-transform: capitalize;
}

.deadline-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #7a8299;
  font-variant-numeric: tabular-nums;
}
</style>
