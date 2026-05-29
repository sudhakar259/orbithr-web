<script setup lang="ts">
import { ref, onMounted } from 'vue'
import lndService from '@/services/lndService'
import type { LndDashboard } from '@/services/lndService'

const loading = ref(true)
const stats = ref<LndDashboard | null>(null)
const error = ref('')

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const res = await lndService.getDashboard()
    stats.value = res.data.data
  } catch {
    error.value = 'Failed to load dashboard data.'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="lnd-dashboard">
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="loading" class="stats-grid">
      <div v-for="n in 6" :key="n" class="stat-card skeleton">
        <div class="skeleton-line w-2-3" />
        <div class="skeleton-line w-1-2 tall" />
      </div>
    </div>

    <template v-if="!loading && stats">
      <!-- Stat cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-label">Courses</p>
          <p class="stat-value" style="color: #eef0f4">{{ stats.total_courses }}</p>
          <p class="stat-sub">In library</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Programs</p>
          <p class="stat-value" style="color: #6b5bff">{{ stats.total_programs }}</p>
          <p class="stat-sub">Active tracks</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Active Enrollments</p>
          <p class="stat-value" style="color: #6b5bff">{{ stats.active_enrollments }}</p>
          <p class="stat-sub">Currently learning</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Completed</p>
          <p class="stat-value" style="color: #4dd39a">{{ stats.completed_courses }}</p>
          <p class="stat-sub">All time</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Skills</p>
          <p class="stat-value" style="color: #f5a623">{{ stats.total_skills }}</p>
          <p class="stat-sub">Tracked competencies</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Expiring Certs</p>
          <p
            class="stat-value"
            :style="{ color: stats.expiring_certifications > 0 ? '#f5a623' : '#eef0f4' }"
          >
            {{ stats.expiring_certifications }}
          </p>
          <p class="stat-sub">Next 30 days</p>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="section-card">
        <div class="section-head">
          <p class="section-eyebrow">Recent activity</p>
          <h3 class="section-title">Across the team</h3>
        </div>
        <div
          v-if="stats.recent_activity && stats.recent_activity.length > 0"
          class="activity-list"
        >
          <div v-for="item in stats.recent_activity" :key="item.id" class="activity-row">
            <div class="activity-meta">
              <p class="activity-title">{{ item.course?.title || 'Course' }}</p>
              <p class="activity-sub">{{ item.employee?.name || 'Employee' }}</p>
            </div>
            <div class="activity-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{
                    width: item.progress_percent + '%',
                    background: item.status === 'completed' ? '#4dd39a' : '#6b5bff',
                  }"
                />
              </div>
              <span class="progress-pct">{{ item.progress_percent }}%</span>
              <span :class="['pill', `pill-${item.status}`]">
                {{ item.status.replace('_', ' ') }}
              </span>
            </div>
          </div>
        </div>
        <div v-else class="empty">No recent activity yet.</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.lnd-dashboard {
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

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.stat-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 14px;
}

.stat-label {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
  margin: 0;
}

.stat-value {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  letter-spacing: -0.02em;
  margin: 4px 0 2px;
  font-weight: 400;
  line-height: 1.05;
}

.stat-sub {
  font-size: 11px;
  color: #7a8299;
  margin: 0;
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
  margin-top: 8px;
}

.skeleton-line.tall {
  height: 24px;
}

.w-2-3 {
  width: 66%;
}

.w-1-2 {
  width: 50%;
}

/* Section card */
.section-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 16px;
}

.section-head {
  margin-bottom: 12px;
}

.section-eyebrow {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
  margin: 0 0 4px;
}

.section-title {
  font-family: 'Instrument Serif', serif;
  font-size: 22px;
  letter-spacing: -0.02em;
  color: #eef0f4;
  margin: 0;
  font-weight: 400;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #232936;
  border: 1px solid #232936;
  border-radius: 10px;
  overflow: hidden;
}

.activity-row {
  background: #161a23;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.activity-title {
  color: #eef0f4;
  font-size: 13px;
  margin: 0 0 2px;
  font-weight: 500;
}

.activity-sub {
  color: #7a8299;
  font-size: 11.5px;
  margin: 0;
}

.activity-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  width: 96px;
  height: 6px;
  background: #232936;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-pct {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #eef0f4;
  width: 38px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.pill {
  font-size: 10.5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 500;
  text-transform: capitalize;
}

.pill-completed {
  background: rgba(77, 211, 154, 0.14);
  color: #4dd39a;
}

.pill-in_progress {
  background: rgba(107, 91, 255, 0.16);
  color: #6b5bff;
}

.pill-not_started {
  background: rgba(122, 130, 153, 0.16);
  color: #7a8299;
}

.empty {
  padding: 32px 16px;
  text-align: center;
  color: #7a8299;
  font-size: 13px;
}
</style>
