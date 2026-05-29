<script setup lang="ts">
defineOptions({ name: 'PerformanceAppraisals' })
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { performanceService, type EmployeeAppraisal } from '@/services/performanceService'

const router = useRouter()
const { roles } = useAuth()
const loading = ref(true)
const appraisals = ref<EmployeeAppraisal[]>([])
const teamAppraisals = ref<EmployeeAppraisal[]>([])
const error = ref('')
const activeTab = ref<'my' | 'team'>('my')
const filterStatus = ref('')

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const canViewTeam = computed(
  () =>
    rLower.value.includes('admin') ||
    rLower.value.includes('hr_manager') ||
    rLower.value.includes('manager'),
)

const loadAppraisals = async () => {
  loading.value = true
  try {
    const params: { status?: string } = {}
    if (filterStatus.value) params.status = filterStatus.value
    const result = await performanceService.getAppraisals(params)
    appraisals.value = result.data
    if (canViewTeam.value) {
      const teamResult = await performanceService.getTeamAppraisals(params)
      teamAppraisals.value = teamResult.data
    }
  } catch {
    error.value = 'Failed to load appraisals'
  } finally {
    loading.value = false
  }
}

const displayedAppraisals = computed(() =>
  activeTab.value === 'team' ? teamAppraisals.value : appraisals.value,
)

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    not_started: 'badge-muted',
    in_progress: 'badge-accent',
    self_review_done: 'badge-accent',
    manager_review_done: 'badge-accent',
    calibration: 'badge-warn',
    completed: 'badge-ok',
    acknowledged: 'badge-ok',
  }
  return map[status] || 'badge-muted'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()

onMounted(() => loadAppraisals())
</script>

<template>
  <div class="appraisals">
    <!-- Sub tabs -->
    <div v-if="canViewTeam" class="sub-tabs">
      <button
        :class="['sub-tab', activeTab === 'my' && 'is-active']"
        @click="activeTab = 'my'"
      >
        My Appraisals
      </button>
      <button
        :class="['sub-tab', activeTab === 'team' && 'is-active']"
        @click="activeTab = 'team'"
      >
        Team Appraisals
      </button>
    </div>

    <div class="toolbar">
      <select v-model="filterStatus" class="select" @change="loadAppraisals()">
        <option value="">All status</option>
        <option value="not_started">Not started</option>
        <option value="in_progress">In progress</option>
        <option value="self_review_done">Self review done</option>
        <option value="manager_review_done">Manager review done</option>
        <option value="completed">Completed</option>
        <option value="acknowledged">Acknowledged</option>
      </select>
    </div>

    <div v-if="loading" class="state-block">
      <div class="spinner"></div>
    </div>

    <div v-else-if="error" class="state-error">{{ error }}</div>

    <div v-else-if="displayedAppraisals.length === 0" class="empty-pad">
      No appraisals found.
    </div>

    <div v-else class="card pad0">
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th v-if="activeTab === 'team'">Employee</th>
              <th>Cycle</th>
              <th>Status</th>
              <th>Final score</th>
              <th>Self review</th>
              <th class="th-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appraisal in displayedAppraisals" :key="appraisal.id">
              <td v-if="activeTab === 'team'">
                <div class="cell-strong">
                  {{ appraisal.employee?.first_name }} {{ appraisal.employee?.last_name }}
                </div>
                <div class="cell-muted">{{ appraisal.employee?.email }}</div>
              </td>
              <td>
                <div class="cell-strong">{{ appraisal.appraisal_cycle?.name ?? '—' }}</div>
                <div v-if="appraisal.appraisal_cycle" class="cell-muted">
                  {{ formatDate(appraisal.appraisal_cycle.end_date) }}
                </div>
              </td>
              <td>
                <span :class="['badge', getStatusClass(appraisal.status)]">
                  {{ appraisal.status.replace(/_/g, ' ') }}
                </span>
              </td>
              <td class="cell-mono">{{ appraisal.final_score ?? '—' }}</td>
              <td class="cell-muted cell-mono">
                {{
                  appraisal.self_review_submitted_at
                    ? formatDate(appraisal.self_review_submitted_at)
                    : '—'
                }}
              </td>
              <td class="th-right">
                <button
                  class="btn-link"
                  @click="
                    router.push({
                      name: 'performance.appraisals.show',
                      params: { id: appraisal.id },
                    })
                  "
                >
                  View &rarr;
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.appraisals {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sub-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #232936;
}

.sub-tab {
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: #7a8299;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  font-family: inherit;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.sub-tab:hover {
  color: #eef0f4;
}

.sub-tab.is-active {
  color: #eef0f4;
  border-bottom-color: #6b5bff;
}

.toolbar {
  display: flex;
  align-items: center;
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

.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}

.card.pad0 {
  padding: 0;
}

.table-wrap {
  overflow-x: auto;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.tbl th {
  padding: 11px 16px;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a8299;
  text-align: left;
  background: #0d0f17;
  border-bottom: 1px solid #232936;
}

.tbl th.th-right {
  text-align: right;
}

.tbl td {
  padding: 13px 16px;
  font-size: 12.5px;
  color: #eef0f4;
  border-bottom: 1px solid #232936;
  vertical-align: top;
}

.tbl td.th-right {
  text-align: right;
}

.tbl tr:last-child td {
  border-bottom: none;
}

.tbl tbody tr:hover td {
  background: rgba(107, 91, 255, 0.04);
}

.cell-strong {
  color: #eef0f4;
  font-weight: 500;
}

.cell-muted {
  color: #7a8299;
  font-size: 11.5px;
  margin-top: 2px;
}

.cell-mono {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}

.btn-link {
  background: transparent;
  border: none;
  color: #6b5bff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.btn-link:hover {
  color: #8b7eff;
}

.badge {
  display: inline-flex;
  align-items: center;
  font-size: 10.5px;
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
</style>
