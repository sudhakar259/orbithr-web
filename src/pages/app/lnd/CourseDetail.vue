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

onMounted(() => {
  loadCourse()
  loadMyProgress()
})
</script>

<template>
  <div>
    <RouterLink
      :to="{ name: 'lnd.courses' }"
      class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
    >
      &larr; Back to Courses
    </RouterLink>

    <div
      v-if="error"
      class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
    >
      {{ error }}
    </div>

    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
      <div class="h-6 bg-gray-700 rounded w-1/3 mb-4" />
      <div class="h-4 bg-gray-700 rounded w-2/3 mb-2" />
      <div class="h-4 bg-gray-700 rounded w-1/2" />
    </div>

    <template v-if="!loading && course">
      <!-- Header -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h2 class="text-xl font-bold text-white">{{ course.title }}</h2>
              <span
                :class="difficultyColor(course.difficulty_level)"
                class="text-xs px-2 py-0.5 rounded-full"
              >
                {{ course.difficulty_level }}
              </span>
              <span
                v-if="course.is_mandatory"
                class="bg-purple-900/50 text-purple-400 text-xs px-2 py-0.5 rounded-full"
              >
                mandatory
              </span>
            </div>
            <p class="text-gray-400 text-sm mb-4">{{ course.description || 'No description' }}</p>
            <div class="flex items-center gap-4 text-sm text-gray-400">
              <span>{{ course.duration_minutes }} min</span>
              <span>{{ course.content_type }}</span>
              <span>{{ course.enrolled_count }} enrolled</span>
              <span>{{ course.completion_count }} completed</span>
              <span v-if="course.category">{{ course.category.name }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <template v-if="canEdit">
              <RouterLink
                :to="{ name: 'lnd.courses.edit', params: { id: course.id } }"
                class="bg-gray-700 border border-gray-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-gray-600"
              >
                Edit
              </RouterLink>
              <button
                v-if="course.status === 'draft'"
                class="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg"
                @click="handlePublish"
              >
                Publish
              </button>
              <button
                v-if="course.status === 'published'"
                class="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg"
                @click="handleArchive"
              >
                Archive
              </button>
            </template>
            <button
              v-if="!myProgress && course.status === 'published'"
              :disabled="enrolling"
              class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
              @click="handleEnroll"
            >
              {{ enrolling ? 'Enrolling...' : 'Enroll' }}
            </button>
            <span
              v-else-if="myProgress"
              class="text-xs px-2 py-1 rounded-full"
              :class="{
                'bg-green-900/50 text-green-400': myProgress.status === 'completed',
                'bg-blue-900/50 text-blue-400': myProgress.status === 'in_progress',
                'bg-gray-700 text-gray-400': myProgress.status === 'not_started',
              }"
            >
              {{ myProgress.status.replace('_', ' ') }} - {{ myProgress.progress_percent }}%
            </span>
          </div>
        </div>
      </div>

      <!-- Contents -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <div class="bg-gray-800 border border-gray-700 rounded-lg">
            <div class="px-5 py-4 border-b border-gray-700">
              <h3 class="text-white font-semibold">Course Content</h3>
            </div>
            <div
              v-if="course.contents && course.contents.length"
              class="divide-y divide-gray-700"
            >
              <div
                v-for="(content, idx) in course.contents"
                :key="content.id"
                class="px-5 py-3 flex items-center justify-between"
              >
                <div class="flex items-center gap-3">
                  <span class="text-gray-500 text-xs w-6">{{ idx + 1 }}.</span>
                  <div>
                    <p class="text-white text-sm">{{ content.title }}</p>
                    <p class="text-gray-400 text-xs">
                      {{ content.content_type }} &middot; {{ content.duration_minutes }} min
                    </p>
                  </div>
                </div>
                <span
                  v-if="content.is_required"
                  class="text-xs text-gray-500"
                >
                  required
                </span>
              </div>
            </div>
            <div v-else class="px-5 py-8 text-center text-gray-400 text-sm">
              No content items yet.
            </div>
          </div>
        </div>

        <!-- Instructors sidebar -->
        <div>
          <div class="bg-gray-800 border border-gray-700 rounded-lg">
            <div class="px-5 py-4 border-b border-gray-700">
              <h3 class="text-white font-semibold">Instructors</h3>
            </div>
            <div
              v-if="course.instructors && course.instructors.length"
              class="divide-y divide-gray-700"
            >
              <div
                v-for="inst in course.instructors"
                :key="inst.id"
                class="px-5 py-3"
              >
                <p class="text-white text-sm">
                  {{ inst.user?.name || inst.external_name || 'Instructor' }}
                </p>
                <p v-if="inst.bio" class="text-gray-400 text-xs mt-1">{{ inst.bio }}</p>
              </div>
            </div>
            <div v-else class="px-5 py-6 text-center text-gray-400 text-sm">
              No instructors assigned.
            </div>
          </div>

          <!-- Tags -->
          <div
            v-if="course.tags && course.tags.length"
            class="bg-gray-800 border border-gray-700 rounded-lg p-5 mt-4"
          >
            <h3 class="text-white font-semibold text-sm mb-3">Tags</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in course.tags"
                :key="tag"
                class="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
