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
  <div>
    <div
      v-if="error"
      class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
    >
      {{ error }}
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Enrolled</p>
        <p class="text-2xl font-bold text-white">{{ stats.total }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">In Progress</p>
        <p class="text-2xl font-bold text-blue-400">{{ stats.in_progress }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Completed</p>
        <p class="text-2xl font-bold text-green-400">{{ stats.completed }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Not Started</p>
        <p class="text-2xl font-bold text-gray-400">{{ stats.not_started }}</p>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-6">
      <button
        v-for="tab in (['all', 'in_progress', 'completed'] as const)"
        :key="tab"
        :class="
          activeTab === tab
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        "
        class="px-3 py-1.5 rounded-lg text-sm"
        @click="activeTab = tab"
      >
        {{ tab === 'all' ? 'All' : tab === 'in_progress' ? 'In Progress' : 'Completed' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div
        v-for="n in 4"
        :key="n"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse"
      >
        <div class="h-4 bg-gray-700 rounded w-1/3 mb-2" />
        <div class="h-2 bg-gray-700 rounded w-full" />
      </div>
    </div>

    <!-- List -->
    <div v-else-if="filteredProgress.length" class="space-y-3">
      <RouterLink
        v-for="item in filteredProgress"
        :key="item.id"
        :to="{ name: 'lnd.courses.show', params: { id: item.course_id } }"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5 block hover:border-gray-600 transition-colors"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-white font-semibold text-sm">
            {{ item.course?.title || 'Course' }}
          </h3>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="{
              'bg-green-900/50 text-green-400': item.status === 'completed',
              'bg-blue-900/50 text-blue-400': item.status === 'in_progress',
              'bg-gray-700 text-gray-400': item.status === 'not_started',
            }"
          >
            {{ item.status.replace('_', ' ') }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex-1 bg-gray-700 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="item.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'"
              :style="{ width: item.progress_percent + '%' }"
            />
          </div>
          <span class="text-gray-400 text-sm w-12 text-right">
            {{ item.progress_percent }}%
          </span>
        </div>
        <div v-if="item.course" class="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{{ item.course.difficulty_level }}</span>
          <span>{{ item.course.duration_minutes }} min</span>
          <span v-if="item.completed_at">
            Completed: {{ new Date(item.completed_at).toLocaleDateString() }}
          </span>
        </div>
      </RouterLink>
    </div>

    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center">
      <p class="text-gray-400">No learning activity yet. Browse courses to get started.</p>
      <RouterLink
        :to="{ name: 'lnd.courses' }"
        class="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
      >
        Browse Courses
      </RouterLink>
    </div>
  </div>
</template>
