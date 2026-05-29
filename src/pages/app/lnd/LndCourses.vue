<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import lndService from '@/services/lndService'
import type { Course, CourseCategory } from '@/services/lndService'
import { useAuth } from '@/composables/useAuth'

const { hasPermission } = useAuth()
const canCreate = hasPermission('create courses')

const loading = ref(true)
const courses = ref<Course[]>([])
const categories = ref<CourseCategory[]>([])
const error = ref('')

const filters = ref({
  category_id: '',
  status: '',
  difficulty_level: '',
  q: '',
})

const pagination = ref({ current_page: 1, last_page: 1, total: 0 })

async function loadCourses(page = 1) {
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, unknown> = { page }
    if (filters.value.category_id) params.category_id = filters.value.category_id
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.difficulty_level) params.difficulty_level = filters.value.difficulty_level
    if (filters.value.q) params.q = filters.value.q

    const res = await lndService.getCourses(params)
    courses.value = res.data.data
    pagination.value = {
      current_page: res.data.current_page ?? 1,
      last_page: res.data.last_page ?? 1,
      total: res.data.total ?? 0,
    }
  } catch {
    error.value = 'Failed to load courses.'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await lndService.getCategories()
    categories.value = res.data.data
  } catch {
    // silent
  }
}

function difficultyClass(level: string) {
  switch (level) {
    case 'beginner':
      return 'pill-green'
    case 'intermediate':
      return 'pill-yellow'
    case 'advanced':
      return 'pill-red'
    default:
      return 'pill-muted'
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'published':
      return 'pill-green'
    case 'draft':
      return 'pill-muted'
    case 'archived':
      return 'pill-red'
    default:
      return 'pill-muted'
  }
}

watch(filters, () => loadCourses(1), { deep: true })

onMounted(() => {
  loadCourses()
  loadCategories()
})
</script>

<template>
  <div class="lnd-courses">
    <div class="page-toolbar">
      <p class="page-meta">{{ pagination.total }} course(s) found</p>
      <RouterLink v-if="canCreate" :to="{ name: 'lnd.courses.create' }" class="btn-primary">
        + New Course
      </RouterLink>
    </div>

    <div class="filter-row">
      <input
        v-model="filters.q"
        type="text"
        placeholder="Search courses..."
        class="input search-input"
      />
      <select v-model="filters.category_id" class="input">
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <select v-model="filters.difficulty_level" class="input">
        <option value="">All Levels</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <select v-model="filters.status" class="input">
        <option value="">All Status</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="loading" class="course-grid">
      <div v-for="n in 6" :key="n" class="course-card skeleton">
        <div class="course-thumb skeleton-thumb" />
        <div style="padding: 14px">
          <div class="skeleton-line w-2-3" />
          <div class="skeleton-line w-1-2" />
        </div>
      </div>
    </div>

    <div v-else-if="courses.length" class="course-grid">
      <RouterLink
        v-for="course in courses"
        :key="course.id"
        :to="{ name: 'lnd.courses.show', params: { id: course.id } }"
        class="course-card"
      >
        <div class="course-thumb">
          <div class="thumb-pattern" />
          <div class="play-circle">
            <span class="play-tri" />
          </div>
          <div class="thumb-cat">
            {{ course.category?.name || 'Course' }}
          </div>
          <div class="thumb-dur">{{ course.duration_minutes }} min</div>
        </div>
        <div class="course-body">
          <div class="course-row-top">
            <h3 class="course-title">{{ course.title }}</h3>
            <span :class="['pill', statusClass(course.status)]">{{ course.status }}</span>
          </div>
          <p class="course-desc">
            {{ course.short_description || course.description || 'No description' }}
          </p>
          <div class="course-tags">
            <span :class="['pill', difficultyClass(course.difficulty_level)]">
              {{ course.difficulty_level }}
            </span>
            <span v-if="course.is_mandatory" class="pill pill-purple">mandatory</span>
            <span class="course-enrolled">{{ course.enrolled_count }} enrolled</span>
          </div>
        </div>
      </RouterLink>
    </div>

    <div v-else class="empty-card">No courses found.</div>

    <div v-if="pagination.last_page > 1" class="pagination">
      <button
        v-for="p in pagination.last_page"
        :key="p"
        :class="['page-btn', { active: p === pagination.current_page }]"
        @click="loadCourses(p)"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.lnd-courses {
  color: #eef0f4;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-meta {
  color: #7a8299;
  font-size: 13px;
  margin: 0;
}

.btn-primary {
  background: #6b5bff;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: #5a4be8;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.input {
  background: #161a23;
  border: 1px solid #232936;
  color: #eef0f4;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
}

.input:focus {
  border-color: #6b5bff;
}

.search-input {
  width: 240px;
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

/* Course grid */
.course-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 1024px) {
  .course-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .course-grid {
    grid-template-columns: 1fr;
  }
}

.course-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, transform 0.15s ease;
  display: block;
}

.course-card:hover {
  border-color: #6b5bff;
}

.course-thumb {
  height: 130px;
  position: relative;
  background: linear-gradient(145deg, #4d2eaa 0%, #6b5bff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumb-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px);
  background-size: 16px 16px;
  opacity: 0.6;
}

.skeleton-thumb {
  background: #232936;
}

.play-circle {
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.play-tri {
  width: 0;
  height: 0;
  border-left: 13px solid #fff;
  border-top: 9px solid transparent;
  border-bottom: 9px solid transparent;
  margin-left: 4px;
}

.thumb-cat {
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 10.5px;
  padding: 3px 8px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 999px;
}

.thumb-dur {
  position: absolute;
  bottom: 12px;
  right: 12px;
  font-size: 10.5px;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
}

.course-body {
  padding: 14px;
}

.course-row-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}

.course-title {
  font-size: 14px;
  color: #eef0f4;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.005em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.course-desc {
  font-size: 11.5px;
  color: #7a8299;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.course-enrolled {
  font-size: 10.5px;
  color: #7a8299;
  margin-left: auto;
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

.pill-yellow {
  background: rgba(245, 166, 35, 0.14);
  color: #f5a623;
}

.pill-red {
  background: rgba(243, 130, 136, 0.14);
  color: #f38288;
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

/* Skeletons */
.skeleton-line {
  height: 12px;
  background: #232936;
  border-radius: 6px;
  margin-bottom: 8px;
}

.w-2-3 {
  width: 66%;
}

.w-1-2 {
  width: 50%;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 20px;
}

.page-btn {
  background: #161a23;
  border: 1px solid #232936;
  color: #7a8299;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.page-btn:hover {
  border-color: #6b5bff;
  color: #eef0f4;
}

.page-btn.active {
  background: #6b5bff;
  color: #fff;
  border-color: #6b5bff;
}
</style>
