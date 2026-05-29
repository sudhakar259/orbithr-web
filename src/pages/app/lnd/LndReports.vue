<script setup lang="ts">
import { ref, onMounted } from 'vue'
import lndService from '@/services/lndService'
import type { CompletionRate, SkillGapEntry } from '@/services/lndService'

const loading = ref(true)
const completionRates = ref<CompletionRate[]>([])
const skillGap = ref<SkillGapEntry[]>([])
const error = ref('')
const activeTab = ref<'completion' | 'skill-gap'>('completion')
const threshold = ref('intermediate')

async function loadCompletionRates() {
  try {
    const res = await lndService.getCompletionRates()
    completionRates.value = res.data.data
  } catch {
    error.value = 'Failed to load completion rates.'
  }
}

async function loadSkillGap() {
  try {
    const res = await lndService.getSkillGap(threshold.value)
    skillGap.value = res.data.data
  } catch {
    error.value = 'Failed to load skill gap report.'
  }
}

async function loadAll() {
  loading.value = true
  await Promise.all([loadCompletionRates(), loadSkillGap()])
  loading.value = false
}

onMounted(loadAll)
</script>

<template>
  <div class="lnd-reports">
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Tab toggle -->
    <div class="seg">
      <button
        :class="['seg-btn', { active: activeTab === 'completion' }]"
        @click="activeTab = 'completion'"
      >
        Completion Rates
      </button>
      <button
        :class="['seg-btn', { active: activeTab === 'skill-gap' }]"
        @click="activeTab = 'skill-gap'"
      >
        Skill Gap Analysis
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="report-list">
      <div v-for="n in 5" :key="n" class="report-card skeleton">
        <div class="skeleton-line w-1-2" />
      </div>
    </div>

    <!-- Completion Rates -->
    <template v-else-if="activeTab === 'completion'">
      <div v-if="completionRates.length" class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Enrolled</th>
              <th>In Progress</th>
              <th>Completed</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rate in completionRates" :key="rate.id">
              <td class="td-strong">{{ rate.title }}</td>
              <td><span class="td-mono">{{ rate.enrolled }}</span></td>
              <td><span class="td-mono td-purple">{{ rate.in_progress }}</span></td>
              <td><span class="td-mono td-green">{{ rate.completed }}</span></td>
              <td>
                <div class="rate-cell">
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      :style="{ width: rate.completion_rate + '%' }"
                    />
                  </div>
                  <span class="rate-pct">{{ rate.completion_rate }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-card">No course data available yet.</div>
    </template>

    <!-- Skill Gap -->
    <template v-else>
      <div class="filter-row">
        <label class="filter-label">Threshold</label>
        <select v-model="threshold" class="input" @change="loadSkillGap">
          <option value="intermediate">Below Intermediate</option>
          <option value="advanced">Below Advanced</option>
          <option value="expert">Below Expert</option>
        </select>
      </div>

      <div v-if="skillGap.length" class="report-list">
        <div
          v-for="entry in skillGap"
          :key="entry.employee_id"
          class="report-card"
        >
          <div class="report-header">
            <div>
              <p class="report-title">{{ entry.employee_name }}</p>
              <p class="report-sub">{{ entry.employee_email }}</p>
            </div>
            <span class="report-meta">
              {{ entry.skills_below_threshold.length }} skill(s) below threshold
            </span>
          </div>
          <div class="skill-tags">
            <span
              v-for="(s, idx) in entry.skills_below_threshold"
              :key="idx"
              class="skill-tag"
            >
              {{ s.skill }}
              <span class="skill-level">({{ s.current_level }})</span>
            </span>
          </div>
        </div>
      </div>
      <div v-else class="empty-card">No skill gaps found at this threshold.</div>
    </template>
  </div>
</template>

<style scoped>
.lnd-reports {
  color: #eef0f4;
}

.alert {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
}

.alert-error {
  background: rgba(243, 130, 136, 0.12);
  border: 1px solid rgba(243, 130, 136, 0.4);
  color: #f38288;
}

/* Segmented tabs */
.seg {
  display: inline-flex;
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
  margin-bottom: 18px;
}

.seg-btn {
  background: transparent;
  border: none;
  color: #7a8299;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-btn:hover {
  color: #eef0f4;
}

.seg-btn.active {
  background: #6b5bff;
  color: #fff;
}

/* Filter */
.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
}

.input {
  background: #161a23;
  border: 1px solid #232936;
  color: #eef0f4;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
}

.input:focus {
  border-color: #6b5bff;
}

/* Table */
.table-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead tr {
  border-bottom: 1px solid #232936;
}

.data-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7a8299;
  padding: 12px 18px;
  background: rgba(35, 41, 54, 0.4);
}

.data-table td {
  padding: 12px 18px;
  font-size: 13px;
  color: #7a8299;
  border-bottom: 1px solid #232936;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.td-strong {
  color: #eef0f4;
  font-weight: 500;
}

.td-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.td-purple {
  color: #6b5bff;
}

.td-green {
  color: #4dd39a;
}

.rate-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  width: 90px;
  height: 6px;
  background: #232936;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4dd39a;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.rate-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: #eef0f4;
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Reports list */
.report-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.report-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 14px 16px;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.report-title {
  color: #eef0f4;
  font-size: 13px;
  font-weight: 500;
  margin: 0 0 2px;
}

.report-sub {
  color: #7a8299;
  font-size: 11.5px;
  margin: 0;
}

.report-meta {
  color: #7a8299;
  font-size: 11px;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.skill-tag {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.skill-level {
  opacity: 0.7;
  font-weight: 400;
  margin-left: 2px;
}

.empty-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  color: #7a8299;
  font-size: 13px;
}

/* Skeletons */
.skeleton {
  position: relative;
  overflow: hidden;
}

.skeleton-line {
  height: 12px;
  background: #232936;
  border-radius: 6px;
}

.w-1-2 {
  width: 50%;
}
</style>
