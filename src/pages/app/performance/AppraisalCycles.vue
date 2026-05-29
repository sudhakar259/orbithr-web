<script setup lang="ts">
defineOptions({ name: 'PerformanceAppraisalCycles' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { performanceService, type AppraisalCycle } from '@/services/performanceService'

const router = useRouter()
const loading = ref(true)
const cycles = ref<AppraisalCycle[]>([])
const error = ref('')
const filterStatus = ref('')

const loadCycles = async () => {
  loading.value = true
  try {
    const params: { status?: string } = {}
    if (filterStatus.value) params.status = filterStatus.value
    const result = await performanceService.getCycles(params)
    cycles.value = result.data
  } catch {
    error.value = 'Failed to load appraisal cycles'
  } finally {
    loading.value = false
  }
}

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    draft: 'badge-muted',
    active: 'badge-ok',
    locked: 'badge-warn',
    completed: 'badge-accent',
    archived: 'badge-muted',
  }
  return map[status] || 'badge-muted'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadCycles())
</script>

<template>
  <div class="cycles">
    <div class="toolbar">
      <select v-model="filterStatus" class="select" @change="loadCycles()">
        <option value="">All status</option>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="locked">Locked</option>
        <option value="completed">Completed</option>
        <option value="archived">Archived</option>
      </select>
      <button
        class="btn btn-primary"
        @click="router.push({ name: 'performance.cycles.create' })"
      >
        + New cycle
      </button>
    </div>

    <div v-if="loading" class="state-block">
      <div class="spinner"></div>
    </div>

    <div v-else-if="error" class="state-error">{{ error }}</div>

    <div v-else-if="cycles.length === 0" class="empty-pad">No appraisal cycles found.</div>

    <div v-else class="cycle-cards">
      <div
        v-for="cycle in cycles"
        :key="cycle.id"
        class="cycle-card"
        @click="router.push({ name: 'performance.cycles.show', params: { id: cycle.id } })"
      >
        <div class="cycle-card-head">
          <div class="cycle-main">
            <div class="cycle-title-row">
              <h3 class="cycle-title">{{ cycle.name }}</h3>
              <span :class="['badge', getStatusClass(cycle.status)]">{{ cycle.status }}</span>
              <span class="badge badge-accent">{{ cycle.cycle_type.replace('_', ' ') }}</span>
            </div>
            <p v-if="cycle.description" class="cycle-desc">{{ cycle.description }}</p>
            <div class="cycle-window">
              {{ formatDate(cycle.start_date) }} &mdash; {{ formatDate(cycle.end_date) }}
            </div>
          </div>
          <div v-if="cycle.employee_appraisals_count !== undefined" class="cycle-count">
            <div class="count-value">{{ cycle.employee_appraisals_count }}</div>
            <div class="count-label">appraisals</div>
          </div>
        </div>

        <div class="cycle-flags">
          <span v-if="cycle.is_goal_setting_enabled" class="chip chip-ok">Goals</span>
          <span v-if="cycle.is_self_review_enabled" class="chip chip-accent">Self review</span>
          <span v-if="cycle.is_manager_review_enabled" class="chip chip-purple">Manager review</span>
          <span v-if="cycle.is_360_feedback_enabled" class="chip chip-warn">360 feedback</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cycles {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.cycle-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cycle-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 16px 18px;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.cycle-card:hover {
  border-color: rgba(107, 91, 255, 0.3);
  background: rgba(107, 91, 255, 0.03);
}

.cycle-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cycle-main {
  flex: 1;
  min-width: 0;
}

.cycle-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cycle-title {
  font-family: 'Instrument Serif', serif;
  font-size: 19px;
  letter-spacing: -0.01em;
  color: #eef0f4;
  margin: 0;
  font-weight: 500;
}

.cycle-desc {
  font-size: 12.5px;
  color: #7a8299;
  margin: 8px 0 0 0;
  line-height: 1.5;
  max-width: 70ch;
}

.cycle-window {
  margin-top: 8px;
  font-size: 11.5px;
  color: #7a8299;
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}

.cycle-count {
  text-align: right;
  flex-shrink: 0;
}

.count-value {
  font-family: 'Instrument Serif', serif;
  font-size: 28px;
  letter-spacing: -0.02em;
  color: #eef0f4;
  line-height: 1;
  font-weight: 400;
}

.count-label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a8299;
  margin-top: 4px;
}

.cycle-flags {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #1c2030;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.badge {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge-muted {
  background: rgba(122, 130, 153, 0.12);
  color: #7a8299;
  border-color: rgba(122, 130, 153, 0.25);
}

.badge-accent {
  background: rgba(107, 91, 255, 0.12);
  color: #6b5bff;
  border-color: rgba(107, 91, 255, 0.3);
}

.badge-warn {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.3);
}

.badge-ok {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}

.chip {
  display: inline-flex;
  align-items: center;
  font-size: 10.5px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.chip-ok {
  background: rgba(77, 211, 154, 0.1);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.22);
}

.chip-accent {
  background: rgba(107, 91, 255, 0.1);
  color: #6b5bff;
  border-color: rgba(107, 91, 255, 0.25);
}

.chip-purple {
  background: rgba(155, 110, 255, 0.1);
  color: #9b6eff;
  border-color: rgba(155, 110, 255, 0.25);
}

.chip-warn {
  background: rgba(245, 166, 35, 0.1);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.25);
}
</style>
