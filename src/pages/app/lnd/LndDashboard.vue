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
  <div>
    <!-- Error -->
    <div v-if="error" class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-6">
      {{ error }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <div v-for="n in 6" :key="n" class="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse">
        <div class="h-4 bg-gray-700 rounded w-2/3 mb-3" />
        <div class="h-8 bg-gray-700 rounded w-1/2" />
      </div>
    </div>

    <template v-if="!loading && stats">
      <!-- Stat cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Courses</p>
          <p class="text-2xl font-bold text-white">{{ stats.total_courses }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Programs</p>
          <p class="text-2xl font-bold text-white">{{ stats.total_programs }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Active Enrollments</p>
          <p class="text-2xl font-bold text-blue-400">{{ stats.active_enrollments }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Completed</p>
          <p class="text-2xl font-bold text-green-400">{{ stats.completed_courses }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Skills</p>
          <p class="text-2xl font-bold text-purple-400">{{ stats.total_skills }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-gray-400 text-xs uppercase tracking-wider mb-1">Expiring Certs</p>
          <p class="text-2xl font-bold" :class="stats.expiring_certifications > 0 ? 'text-yellow-400' : 'text-white'">
            {{ stats.expiring_certifications }}
          </p>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg">
        <div class="px-5 py-4 border-b border-gray-700">
          <h3 class="text-white font-semibold">Recent Activity</h3>
        </div>
        <div v-if="stats.recent_activity && stats.recent_activity.length > 0" class="divide-y divide-gray-700">
          <div
            v-for="item in stats.recent_activity"
            :key="item.id"
            class="px-5 py-3 flex items-center justify-between"
          >
            <div>
              <p class="text-white text-sm">{{ item.course?.title || 'Course' }}</p>
              <p class="text-gray-400 text-xs">{{ item.employee?.name || 'Employee' }}</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-24 bg-gray-700 rounded-full h-2">
                <div
                  class="h-2 rounded-full"
                  :class="item.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'"
                  :style="{ width: item.progress_percent + '%' }"
                />
              </div>
              <span class="text-gray-400 text-xs w-10 text-right">{{ item.progress_percent }}%</span>
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
          </div>
        </div>
        <div v-else class="px-5 py-8 text-center text-gray-400 text-sm">
          No recent activity yet.
        </div>
      </div>
    </template>
  </div>
</template>
