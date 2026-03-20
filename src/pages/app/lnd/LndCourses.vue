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

function difficultyColor(level: string) {
  switch (level) {
    case 'beginner':
      return 'bg-green-900/50 text-green-400'
    case 'intermediate':
      return 'bg-yellow-900/50 text-yellow-400'
    case 'advanced':
      return 'bg-red-900/50 text-red-400'
    default:
      return 'bg-gray-700 text-gray-400'
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'published':
      return 'bg-green-900/50 text-green-400'
    case 'draft':
      return 'bg-gray-700 text-gray-400'
    case 'archived':
      return 'bg-red-900/50 text-red-400'
    default:
      return 'bg-gray-700 text-gray-400'
  }
}

watch(filters, () => loadCourses(1), { deep: true })

onMounted(() => {
  loadCourses()
  loadCategories()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-gray-400 text-sm">{{ pagination.total }} course(s) found</p>
      </div>
      <RouterLink
        v-if="canCreate"
        :to="{ name: 'lnd.courses.create' }"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + New Course
      </RouterLink>
    </div>

    <div class="flex flex-wrap gap-3 mb-6">
      <input
        v-model="filters.q"
        type="text"
        placeholder="Search courses..."
        class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none w-64"
      />
      <select
        v-model="filters.category_id"
        class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <select
        v-model="filters.difficulty_level"
        class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Levels</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <select
        v-model="filters.status"
        class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Status</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
    </div>

    <div
      v-if="error"
      class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
    >
      {{ error }}
    </div>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="n in 6"
        :key="n"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse"
      >
        <div class="h-4 bg-gray-700 rounded w-3/4 mb-3" />
        <div class="h-3 bg-gray-700 rounded w-1/2 mb-2" />
        <div class="h-3 bg-gray-700 rounded w-full" />
      </div>
    </div>

    <div
      v-else-if="courses.length"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <RouterLink
        v-for="course in courses"
        :key="course.id"
        :to="{ name: 'lnd.courses.show', params: { id: course.id } }"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-colors block"
      >
        <div class="flex items-start justify-between mb-3">
          <h3 class="text-white font-semibold text-sm line-clamp-2 flex-1 mr-2">
            {{ course.title }}
          </h3>
          <span
            :class="statusColor(course.status)"
            class="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
          >
            {{ course.status }}
          </span>
        </div>
        <p class="text-gray-400 text-xs mb-3 line-clamp-2">
          {{ course.short_description || course.description || 'No description' }}
        </p>
        <div class="flex items-center gap-2 flex-wrap">
          <span
            :class="difficultyColor(course.difficulty_level)"
            class="text-xs px-2 py-0.5 rounded-full"
          >
            {{ course.difficulty_level }}
          </span>
          <span class="text-gray-500 text-xs">{{ course.duration_minutes }} min</span>
          <span
            v-if="course.is_mandatory"
            class="bg-purple-900/50 text-purple-400 text-xs px-2 py-0.5 rounded-full"
          >
            mandatory
          </span>
          <span class="text-gray-500 text-xs ml-auto">{{ course.enrolled_count }} enrolled</span>
        </div>
        <div v-if="course.category" class="mt-2">
          <span class="text-xs text-gray-500">{{ course.category.name }}</span>
        </div>
      </RouterLink>
    </div>

    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center">
      <p class="text-gray-400">No courses found.</p>
    </div>

    <div v-if="pagination.last_page > 1" class="flex justify-center gap-2 mt-6">
      <button
        v-for="p in pagination.last_page"
        :key="p"
        :class="
          p === pagination.current_page
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        "
        class="px-3 py-1 rounded text-sm"
        @click="loadCourses(p)"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>
