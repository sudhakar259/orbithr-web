<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import lndService from '@/services/lndService'
import type { TrainingProgram } from '@/services/lndService'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const { hasPermission } = useAuth()
const canManage = hasPermission('manage training programs')

const loading = ref(true)
const program = ref<TrainingProgram | null>(null)
const error = ref('')

const programId = computed(() => Number(route.params.id))

async function loadProgram() {
  loading.value = true
  try {
    const res = await lndService.getProgram(programId.value)
    program.value = res.data.data
  } catch {
    error.value = 'Failed to load program.'
  } finally {
    loading.value = false
  }
}

async function handleActivate() {
  try {
    await lndService.activateProgram(programId.value)
    await loadProgram()
  } catch {
    error.value = 'Failed to activate program.'
  }
}

async function handleComplete() {
  try {
    await lndService.completeProgram(programId.value)
    await loadProgram()
  } catch {
    error.value = 'Failed to complete program.'
  }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'pd-badge-green',
    draft: 'pd-badge-muted',
    completed: 'pd-badge-blue',
    archived: 'pd-badge-red',
  }
  return map[status] ?? 'pd-badge-muted'
}

onMounted(loadProgram)
</script>

<template>
  <div class="pd-page">
    <RouterLink :to="{ name: 'lnd.programs' }" class="pd-back-link">&larr; Back to Programs</RouterLink>

    <div v-if="error" class="pd-error">{{ error }}</div>

    <div v-if="loading" class="pd-card pd-loading">
      <div v-for="i in 3" :key="i" class="pd-skeleton"></div>
    </div>

    <template v-if="!loading && program">
      <div class="pd-header-card">
        <div class="pd-header-body">
          <div class="pd-header-info">
            <div class="pd-title-row">
              <h2 class="pd-title">{{ program.title }}</h2>
              <span :class="['pd-badge', statusBadge(program.status)]">{{ program.status }}</span>
            </div>
            <p class="pd-desc">{{ program.description || 'No description' }}</p>
            <div class="pd-meta">
              <span>{{ program.program_type.replace('_', ' ') }}</span>
              <span>{{ program.enrolled_count }} enrolled</span>
              <span v-if="program.start_date">{{ program.start_date }} - {{ program.end_date || 'ongoing' }}</span>
            </div>
          </div>
          <div v-if="canManage" class="pd-header-actions">
            <button v-if="program.status === 'draft'" class="pd-btn-activate" @click="handleActivate">Activate</button>
            <button v-if="program.status === 'active'" class="pd-btn-complete" @click="handleComplete">Mark Complete</button>
          </div>
        </div>
      </div>

      <div class="pd-content-grid">
        <!-- Courses -->
        <div class="pd-card">
          <div class="pd-card-head">Courses ({{ program.courses?.length || 0 }})</div>
          <div v-if="program.courses?.length">
            <RouterLink
              v-for="course in program.courses"
              :key="course.id"
              :to="{ name: 'lnd.courses.show', params: { id: course.id } }"
              class="pd-course-row"
            >
              <div>
                <p class="pd-course-title">{{ course.title }}</p>
                <p class="pd-course-meta">{{ course.duration_minutes }} min</p>
              </div>
              <span class="pd-course-level">{{ course.difficulty_level }}</span>
            </RouterLink>
          </div>
          <div v-else class="pd-card-empty">No courses assigned.</div>
        </div>

        <!-- Enrollments -->
        <div class="pd-card">
          <div class="pd-card-head">Enrollments ({{ program.enrollments?.length || 0 }})</div>
          <div v-if="program.enrollments?.length">
            <div v-for="enrollment in program.enrollments" :key="enrollment.id" class="pd-enroll-row">
              <div>
                <p class="pd-enroll-name">{{ enrollment.employee?.name || 'Employee' }}</p>
                <p class="pd-enroll-email">{{ enrollment.employee?.email }}</p>
              </div>
              <div class="pd-progress-col">
                <div class="pd-progress-track">
                  <div
                    class="pd-progress-fill"
                    :class="enrollment.status === 'completed' ? 'pd-fill-green' : 'pd-fill-blue'"
                    :style="{ width: enrollment.progress_percent + '%' }"
                  />
                </div>
                <span class="pd-progress-pct">{{ enrollment.progress_percent }}%</span>
              </div>
            </div>
          </div>
          <div v-else class="pd-card-empty">No enrollments yet.</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pd-page { display: flex; flex-direction: column; gap: 16px; }
.pd-back-link { font-size: 13px; color: #7A8299; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
.pd-back-link:hover { color: #EEF0F4; }
.pd-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.pd-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.pd-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.pd-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: pd-pulse 1.2s ease-in-out infinite; }
@keyframes pd-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.pd-header-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; }
.pd-header-body { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.pd-header-info { flex: 1; min-width: 0; }
.pd-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.pd-title { font-size: 18px; font-weight: 700; color: #EEF0F4; margin: 0; }
.pd-desc { font-size: 13px; color: #7A8299; margin: 0 0 8px; }
.pd-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #7A8299; text-transform: capitalize; }
.pd-header-actions { display: flex; gap: 8px; }
.pd-btn-activate { background: rgba(77,211,154,0.15); border: 1px solid rgba(77,211,154,0.3); color: #4DD39A; border-radius: 7px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
.pd-btn-activate:hover { background: rgba(77,211,154,0.25); }
.pd-btn-complete { background: rgba(126,215,255,0.12); border: 1px solid rgba(126,215,255,0.25); color: #7ED7FF; border-radius: 7px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
.pd-btn-complete:hover { background: rgba(126,215,255,0.22); }
.pd-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.pd-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.pd-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.pd-badge-red    { background: rgba(243,130,136,0.12); color: #F38288; }
.pd-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.pd-content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.pd-card-head { padding: 12px 16px; border-bottom: 1px solid #232936; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.pd-card-empty { padding: 32px 16px; text-align: center; font-size: 13px; color: #7A8299; }
.pd-course-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #1C2030; text-decoration: none; }
.pd-course-row:last-child { border-bottom: none; }
.pd-course-row:hover { background: rgba(255,255,255,0.02); }
.pd-course-title { font-size: 13px; color: #EEF0F4; margin: 0; }
.pd-course-meta { font-size: 11px; color: #7A8299; margin: 2px 0 0; }
.pd-course-level { font-size: 11px; color: #7A8299; text-transform: capitalize; }
.pd-enroll-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; border-bottom: 1px solid #1C2030; }
.pd-enroll-row:last-child { border-bottom: none; }
.pd-enroll-name { font-size: 13px; color: #EEF0F4; margin: 0; }
.pd-enroll-email { font-size: 11px; color: #7A8299; margin: 2px 0 0; }
.pd-progress-col { display: flex; align-items: center; gap: 8px; }
.pd-progress-track { width: 72px; height: 6px; background: #232936; border-radius: 4px; overflow: hidden; }
.pd-progress-fill { height: 100%; border-radius: 4px; }
.pd-fill-green { background: #4DD39A; }
.pd-fill-blue { background: #6B5BFF; }
.pd-progress-pct { font-size: 11px; color: #7A8299; width: 28px; text-align: right; }
</style>
