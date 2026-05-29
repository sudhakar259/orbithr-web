<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import lndService from '@/services/lndService'
import type { CourseProgress } from '@/services/lndService'

const loading = ref(true)
const progress = ref<CourseProgress[]>([])
const error = ref('')
const activeTab = ref<'all' | 'in_progress' | 'completed'>('all')

async function loadMyLearning() {
  loading.value = true
  try {
    const res = await lndService.getMyLearning()
    progress.value = res.data.data
  } catch {
    error.value = 'Failed to load learning data.'
  } finally {
    loading.value = false
  }
}

const filteredProgress = computed(() => {
  if (activeTab.value === 'all') return progress.value
  return progress.value.filter((p) => p.status === activeTab.value)
})

const stats = computed(() => ({
  total: progress.value.length,
  in_progress: progress.value.filter((p) => p.status === 'in_progress').length,
  completed: progress.value.filter((p) => p.status === 'completed').length,
  not_started: progress.value.filter((p) => p.status === 'not_started').length,
}))

onMounted(loadMyLearning)
</script>

<template>
  <div class="my-learning">
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <p class="stat-label">Total Enrolled</p>
        <p class="stat-value" style="color: #eef0f4">{{ stats.total }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">In Progress</p>
        <p class="stat-value" style="color: #6b5bff">{{ stats.in_progress }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Completed</p>
        <p class="stat-value" style="color: #4dd39a">{{ stats.completed }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Not Started</p>
        <p class="stat-value" style="color: #7a8299">{{ stats.not_started }}</p>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="seg">
      <button
        v-for="tab in (['all', 'in_progress', 'completed'] as const)"
        :key="tab"
        :class="['seg-btn', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        {{ tab === 'all' ? 'All' : tab === 'in_progress' ? 'In Progress' : 'Completed' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="learning-list">
      <div v-for="n in 4" :key="n" class="learning-card skeleton">
        <div class="skeleton-line w-1-3" />
        <div class="skeleton-line w-2-3" />
      </div>
    </div>

    <!-- List -->
    <div v-else-if="filteredProgress.length" class="learning-list">
      <RouterLink
        v-for="item in filteredProgress"
        :key="item.id"
        :to="{ name: 'lnd.courses.show', params: { id: item.course_id } }"
        class="learning-card"
      >
        <div class="learning-header">
          <h3 class="learning-title">
            {{ item.course?.title || 'Course' }}
          </h3>
          <span
            class="pill"
            :class="{
              'pill-green': item.status === 'completed',
              'pill-purple': item.status === 'in_progress',
              'pill-muted': item.status === 'not_started',
            }"
          >
            {{ item.status.replace('_', ' ') }}
          </span>
        </div>
        <div class="learning-progress">
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
        </div>
        <div v-if="item.course" class="learning-meta">
          <span>{{ item.course.difficulty_level }}</span>
          <span>&middot;</span>
          <span>{{ item.course.duration_minutes }} min</span>
          <template v-if="item.completed_at">
            <span>&middot;</span>
            <span>Completed {{ new Date(item.completed_at).toLocaleDateString() }}</span>
          </template>
        </div>
      </RouterLink>
    </div>

    <div v-else class="empty-card">
      <p>No learning activity yet. Browse courses to get started.</p>
      <RouterLink :to="{ name: 'lnd.courses' }" class="empty-link">
        Browse Courses &rarr;
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.my-learning {
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

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

@media (max-width: 1024px) {
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
  margin: 4px 0 0;
  font-weight: 400;
  line-height: 1.05;
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

/* Learning list */
.learning-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.learning-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 16px 18px;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: border-color 0.15s ease;
}

.learning-card:hover {
  border-color: #6b5bff;
}

.learning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.learning-title {
  font-size: 14px;
  color: #eef0f4;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.005em;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.learning-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
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
  width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.learning-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  color: #7a8299;
  text-transform: capitalize;
}

/* Pills */
.pill {
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
}

.pill-green {
  background: rgba(77, 211, 154, 0.14);
  color: #4dd39a;
}

.pill-purple {
  background: rgba(107, 91, 255, 0.16);
  color: #6b5bff;
}

.pill-muted {
  background: rgba(122, 130, 153, 0.16);
  color: #7a8299;
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

.empty-card p {
  margin: 0 0 8px;
}

.empty-link {
  color: #6b5bff;
  font-size: 13px;
  text-decoration: none;
  font-weight: 500;
}

.empty-link:hover {
  color: #8473ff;
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
  margin-bottom: 8px;
}

.w-1-3 {
  width: 33%;
}

.w-2-3 {
  width: 66%;
}
</style>
