<script setup lang="ts">
defineOptions({ name: 'PerformanceGoals' })
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { performanceService, type Goal } from '@/services/performanceService'

const router = useRouter()
const { roles } = useAuth()
const loading = ref(true)
const goals = ref<Goal[]>([])
const error = ref('')

const filterStatus = ref('')
const filterType = ref('')

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const canCreate = computed(
  () =>
    rLower.value.includes('admin') ||
    rLower.value.includes('hr_manager') ||
    rLower.value.includes('manager'),
)

const loadGoals = async () => {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filterStatus.value) params.status = filterStatus.value
    if (filterType.value) params.type = filterType.value
    const result = await performanceService.getGoals(params)
    goals.value = result.data
  } catch {
    error.value = 'Failed to load goals'
  } finally {
    loading.value = false
  }
}

const progressColor = (v: number) => {
  if (v >= 70) return '#4DD39A'
  if (v >= 40) return '#F5A623'
  return '#F38288'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadGoals())
</script>

<template>
  <div class="goals">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filters">
        <select v-model="filterStatus" class="select" @change="loadGoals()">
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select v-model="filterType" class="select" @change="loadGoals()">
          <option value="">All types</option>
          <option value="okr">OKR</option>
          <option value="kpi">KPI</option>
          <option value="individual">Individual</option>
          <option value="team">Team</option>
          <option value="company">Company</option>
        </select>
      </div>
      <button
        v-if="canCreate"
        class="btn btn-primary"
        @click="router.push({ name: 'performance.goals.create' })"
      >
        + New goal
      </button>
    </div>

    <div v-if="loading" class="state-block">
      <div class="spinner"></div>
    </div>

    <div v-else-if="error" class="state-error">{{ error }}</div>

    <div v-else-if="goals.length === 0" class="empty-pad">No goals found.</div>

    <!-- OKR-style cards with KR rows -->
    <div v-else class="goal-cards">
      <div v-for="goal in goals" :key="goal.id" class="goal-card">
        <div class="goal-card-head">
          <div class="goal-card-main">
            <div class="goal-card-row">
              <span class="badge badge-accent">{{ goal.type.toUpperCase() }}</span>
              <span class="badge" :class="'badge-' + goal.status.replace('_', '-')">
                {{ goal.status.replace('_', ' ') }}
              </span>
              <div class="goal-card-title">{{ goal.title }}</div>
            </div>
            <div v-if="goal.description" class="goal-card-desc">{{ goal.description }}</div>
            <div class="goal-card-meta">
              <span v-if="goal.owner" class="meta-item">
                <span class="owner-avatar">{{
                  (goal.owner.name || '?').slice(0, 1).toUpperCase()
                }}</span>
                <span class="meta-value owner-name">{{ goal.owner.name }}</span>
              </span>
              <span v-if="goal.owner" class="meta-divider">&middot;</span>
              <span class="meta-item">
                <span class="meta-label">W</span>
                <span class="meta-value">{{ goal.weightage }}%</span>
              </span>
              <span class="meta-divider">&middot;</span>
              <span class="meta-item">
                <span class="meta-label">Due</span>
                <span class="meta-value">{{ formatDate(goal.end_date) }}</span>
              </span>
              <span v-if="goal.key_results && goal.key_results.length" class="meta-divider"
                >&middot;</span
              >
              <span v-if="goal.key_results && goal.key_results.length" class="meta-item">
                <span class="meta-value">{{ goal.key_results.length }} key results</span>
              </span>
            </div>
          </div>

          <div class="goal-card-progress">
            <div
              class="donut"
              :style="{
                background: `conic-gradient(${progressColor(goal.progress)} ${goal.progress}%, #232936 0)`,
              }"
            >
              <div class="donut-inner">
                <span class="donut-value">{{ goal.progress }}</span>
                <span class="donut-pct">%</span>
              </div>
            </div>
            <button
              class="btn-link"
              @click="router.push({ name: 'performance.goals.show', params: { id: goal.id } })"
            >
              View &rarr;
            </button>
          </div>
        </div>

        <!-- KR rows -->
        <div v-if="goal.key_results && goal.key_results.length" class="kr-list">
          <div
            v-for="(kr, j) in goal.key_results"
            :key="kr.id"
            class="kr-row"
          >
            <div class="kr-tag">KR{{ j + 1 }}</div>
            <div class="kr-main">
              <div class="kr-title">{{ kr.title }}</div>
              <div v-if="kr.description" class="kr-detail">{{ kr.description }}</div>
            </div>
            <div class="kr-bar">
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{ width: kr.progress + '%', background: progressColor(kr.progress) }"
                ></div>
              </div>
            </div>
            <div class="kr-pct">{{ kr.progress }}%</div>
          </div>
        </div>

        <!-- Fallback bar when no KRs -->
        <div v-else class="goal-card-bar">
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: goal.progress + '%', background: progressColor(goal.progress) }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.goals {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.select {
  background: #161a23;
  border: 1px solid #232936;
  color: #eef0f4;
  font-size: 12.5px;
  padding: 7px 12px;
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  font-family: inherit;
}

.select:focus {
  border-color: #6b5bff;
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
    border-color 0.15s ease;
}

.btn-primary {
  background: #6b5bff;
  color: #fff;
}

.btn-primary:hover {
  background: #5a4ce6;
}

.btn-link {
  background: transparent;
  border: none;
  color: #6b5bff;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.btn-link:hover {
  color: #8b7eff;
}

/* States */
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

.empty-pad {
  padding: 56px 16px;
  text-align: center;
  color: #7a8299;
  font-size: 13px;
  background: #161a23;
  border: 1px dashed #232936;
  border-radius: 12px;
}

/* Cards */
.goal-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}

.goal-card-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 18px;
}

.goal-card-main {
  flex: 1;
  min-width: 0;
}

.goal-card-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.goal-card-title {
  font-family: 'Instrument Serif', serif;
  font-size: 18px;
  letter-spacing: -0.01em;
  color: #eef0f4;
  font-weight: 500;
}

.goal-card-desc {
  font-size: 12.5px;
  color: #7a8299;
  margin-top: 6px;
  line-height: 1.5;
  max-width: 70ch;
}

.goal-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 11.5px;
  flex-wrap: wrap;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.meta-label {
  color: #7a8299;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10px;
  font-weight: 600;
}

.meta-value {
  color: #eef0f4;
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}

.owner-name {
  font-family: inherit;
  font-size: 11.5px;
}

.owner-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(107, 91, 255, 0.2);
  color: #6b5bff;
  font-size: 9.5px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.meta-divider {
  color: #232936;
}

.goal-card-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Donut */
.donut {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.donut-inner {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #161a23;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 1px;
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}

.donut-value {
  font-size: 14px;
  font-weight: 600;
  color: #eef0f4;
}

.donut-pct {
  font-size: 9px;
  color: #7a8299;
}

.goal-card-bar {
  padding: 0 18px 14px;
}

/* KR rows (mirror JSX layout) */
.kr-list {
  border-top: 1px solid #232936;
}

.kr-row {
  display: grid;
  grid-template-columns: 28px 1fr 140px 48px;
  gap: 12px;
  align-items: center;
  padding: 10px 18px;
  border-top: 1px solid #1c2030;
}

.kr-row:first-child {
  border-top: none;
}

.kr-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #7a8299;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.kr-main {
  min-width: 0;
}

.kr-title {
  font-size: 12.5px;
  color: #eef0f4;
  line-height: 1.4;
}

.kr-detail {
  font-size: 11px;
  color: #7a8299;
  margin-top: 2px;
}

.kr-bar {
  width: 100%;
}

.kr-pct {
  font-size: 12px;
  color: #eef0f4;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', monospace;
}

.bar-track {
  width: 100%;
  height: 4px;
  background: #0d0f17;
  border-radius: 2px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Badges */
.badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge-accent {
  background: rgba(107, 91, 255, 0.12);
  color: #6b5bff;
  border-color: rgba(107, 91, 255, 0.3);
}

.badge-active {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}

.badge-completed {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}

.badge-draft {
  background: rgba(122, 130, 153, 0.12);
  color: #7a8299;
  border-color: rgba(122, 130, 153, 0.25);
}

.badge-on-hold {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.25);
}

.badge-cancelled {
  background: rgba(243, 130, 136, 0.12);
  color: #f38288;
  border-color: rgba(243, 130, 136, 0.25);
}
</style>
