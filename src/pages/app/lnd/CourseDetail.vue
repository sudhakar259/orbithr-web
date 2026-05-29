<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import lndService from '@/services/lndService'
import type { Course } from '@/services/lndService'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuth()
const canEdit = hasPermission('edit courses')

const loading = ref(true)
const course = ref<Course | null>(null)
const error = ref('')
const enrolling = ref(false)
const myProgress = ref<{ status: string; progress_percent: number } | null>(null)

const courseId = computed(() => Number(route.params.id))

async function loadCourse() {
  loading.value = true
  try {
    const res = await lndService.getCourse(courseId.value)
    course.value = res.data.data
  } catch {
    error.value = 'Failed to load course.'
  } finally {
    loading.value = false
  }
}

async function loadMyProgress() {
  try {
    const res = await lndService.getCourseProgress(courseId.value)
    myProgress.value = res.data.data
  } catch {
    // not enrolled
  }
}

async function handleEnroll() {
  enrolling.value = true
  try {
    await lndService.enrollInCourse(courseId.value)
    await loadMyProgress()
  } catch {
    error.value = 'Failed to enroll.'
  } finally {
    enrolling.value = false
  }
}

async function handlePublish() {
  try {
    await lndService.publishCourse(courseId.value)
    await loadCourse()
  } catch {
    error.value = 'Failed to publish.'
  }
}

async function handleArchive() {
  try {
    await lndService.archiveCourse(courseId.value)
    router.push({ name: 'lnd.courses' })
  } catch {
    error.value = 'Failed to archive.'
  }
}

function difficultyBadge(level: string) {
  switch (level) {
    case 'beginner': return 'cdd-badge-green'
    case 'intermediate': return 'cdd-badge-yellow'
    case 'advanced': return 'cdd-badge-red'
    default: return 'cdd-badge-muted'
  }
}

function progressBadge(status: string) {
  switch (status) {
    case 'completed': return 'cdd-badge-green'
    case 'in_progress': return 'cdd-badge-blue'
    default: return 'cdd-badge-muted'
  }
}

onMounted(() => {
  loadCourse()
  loadMyProgress()
})
</script>

<template>
  <div class="cdd-page">
    <RouterLink :to="{ name: 'lnd.courses' }" class="cdd-back-link">&larr; Back to Courses</RouterLink>

    <div v-if="error" class="cdd-error">{{ error }}</div>

    <div v-if="loading" class="cdd-card cdd-loading">
      <div v-for="i in 4" :key="i" class="cdd-skeleton"></div>
    </div>

    <template v-if="!loading && course">
      <div class="cdd-header-card">
        <div class="cdd-header-body">
          <div class="cdd-header-info">
            <div class="cdd-title-row">
              <h2 class="cdd-title">{{ course.title }}</h2>
              <span :class="['cdd-badge', difficultyBadge(course.difficulty_level)]">{{ course.difficulty_level }}</span>
              <span v-if="course.is_mandatory" class="cdd-badge cdd-badge-purple">mandatory</span>
            </div>
            <p class="cdd-desc">{{ course.description || 'No description' }}</p>
            <div class="cdd-meta">
              <span>{{ course.duration_minutes }} min</span>
              <span>{{ course.content_type }}</span>
              <span>{{ course.enrolled_count }} enrolled</span>
              <span>{{ course.completion_count }} completed</span>
              <span v-if="course.category">{{ course.category.name }}</span>
            </div>
          </div>
          <div class="cdd-header-actions">
            <template v-if="canEdit">
              <RouterLink :to="{ name: 'lnd.courses.edit', params: { id: course.id } }" class="cdd-btn-ghost">Edit</RouterLink>
              <button v-if="course.status === 'draft'" class="cdd-btn-publish" @click="handlePublish">Publish</button>
              <button v-if="course.status === 'published'" class="cdd-btn-archive" @click="handleArchive">Archive</button>
            </template>
            <button v-if="!myProgress && course.status === 'published'" :disabled="enrolling" class="cdd-btn-primary" @click="handleEnroll">
              {{ enrolling ? 'Enrolling…' : 'Enroll' }}
            </button>
            <span v-else-if="myProgress" :class="['cdd-badge', progressBadge(myProgress.status)]">
              {{ myProgress.status.replace('_', ' ') }} - {{ myProgress.progress_percent }}%
            </span>
          </div>
        </div>
      </div>

      <div class="cdd-content-grid">
        <!-- Course Content -->
        <div class="cdd-card">
          <div class="cdd-card-head">Course Content</div>
          <div v-if="course.contents && course.contents.length">
            <div v-for="(content, idx) in course.contents" :key="content.id" class="cdd-content-row">
              <div class="cdd-content-left">
                <span class="cdd-content-num">{{ idx + 1 }}.</span>
                <div>
                  <p class="cdd-content-title">{{ content.title }}</p>
                  <p class="cdd-content-meta">{{ content.content_type }} &middot; {{ content.duration_minutes }} min</p>
                </div>
              </div>
              <span v-if="content.is_required" class="cdd-req-label">required</span>
            </div>
          </div>
          <div v-else class="cdd-card-empty">No content items yet.</div>
        </div>

        <div class="cdd-sidebar">
          <!-- Instructors -->
          <div class="cdd-card">
            <div class="cdd-card-head">Instructors</div>
            <div v-if="course.instructors && course.instructors.length">
              <div v-for="inst in course.instructors" :key="inst.id" class="cdd-inst-row">
                <p class="cdd-inst-name">{{ inst.user?.name || inst.external_name || 'Instructor' }}</p>
                <p v-if="inst.bio" class="cdd-inst-bio">{{ inst.bio }}</p>
              </div>
            </div>
            <div v-else class="cdd-card-empty">No instructors assigned.</div>
          </div>

          <!-- Tags -->
          <div v-if="course.tags && course.tags.length" class="cdd-card cdd-tags-card">
            <div class="cdd-tags-label">Tags</div>
            <div class="cdd-tags-row">
              <span v-for="tag in course.tags" :key="tag" class="cdd-tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cdd-page { display: flex; flex-direction: column; gap: 16px; }
.cdd-back-link { font-size: 13px; color: #7A8299; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
.cdd-back-link:hover { color: #EEF0F4; }
.cdd-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.cdd-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.cdd-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.cdd-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: cdd-pulse 1.2s ease-in-out infinite; }
@keyframes cdd-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.cdd-header-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; }
.cdd-header-body { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.cdd-header-info { flex: 1; min-width: 0; }
.cdd-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.cdd-title { font-size: 18px; font-weight: 700; color: #EEF0F4; margin: 0; }
.cdd-desc { font-size: 13px; color: #7A8299; margin: 0 0 10px; }
.cdd-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #7A8299; }
.cdd-header-actions { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
.cdd-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 7px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cdd-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.cdd-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.cdd-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 7px 14px; font-size: 13px; text-decoration: none; cursor: pointer; }
.cdd-btn-ghost:hover { color: #EEF0F4; }
.cdd-btn-publish { background: rgba(77,211,154,0.15); border: 1px solid rgba(77,211,154,0.3); color: #4DD39A; border-radius: 7px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cdd-btn-publish:hover { background: rgba(77,211,154,0.25); }
.cdd-btn-archive { background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); color: #F38288; border-radius: 7px; padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer; }
.cdd-btn-archive:hover { background: rgba(243,130,136,0.2); }
.cdd-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.cdd-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.cdd-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.cdd-badge-red    { background: rgba(243,130,136,0.12); color: #F38288; }
.cdd-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.cdd-badge-purple { background: rgba(178,141,255,0.12); color: #B28DFF; }
.cdd-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.cdd-content-grid { display: grid; grid-template-columns: 1fr 280px; gap: 16px; }
.cdd-sidebar { display: flex; flex-direction: column; gap: 12px; }
.cdd-card-head { padding: 12px 16px; border-bottom: 1px solid #232936; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.cdd-card-empty { padding: 32px 16px; text-align: center; font-size: 13px; color: #7A8299; }
.cdd-content-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #1C2030; }
.cdd-content-row:last-child { border-bottom: none; }
.cdd-content-left { display: flex; align-items: center; gap: 10px; }
.cdd-content-num { font-size: 11px; color: #7A8299; width: 20px; }
.cdd-content-title { font-size: 13px; color: #EEF0F4; margin: 0; }
.cdd-content-meta { font-size: 11px; color: #7A8299; margin: 2px 0 0; }
.cdd-req-label { font-size: 11px; color: #7A8299; }
.cdd-inst-row { padding: 10px 16px; border-bottom: 1px solid #1C2030; }
.cdd-inst-row:last-child { border-bottom: none; }
.cdd-inst-name { font-size: 13px; color: #EEF0F4; margin: 0; }
.cdd-inst-bio { font-size: 12px; color: #7A8299; margin: 4px 0 0; }
.cdd-tags-card { padding: 16px; }
.cdd-tags-label { font-size: 12px; font-weight: 600; color: #EEF0F4; margin-bottom: 10px; }
.cdd-tags-row { display: flex; flex-wrap: wrap; gap: 6px; }
.cdd-tag { background: #232936; color: #B6BED0; border-radius: 4px; padding: 3px 8px; font-size: 11px; }
</style>
