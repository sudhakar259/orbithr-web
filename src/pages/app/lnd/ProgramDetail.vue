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

onMounted(loadProgram)
</script>

<template>
  <div>
    <RouterLink
      :to="{ name: 'lnd.programs' }"
      class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
    >
      &larr; Back to Programs
    </RouterLink>

    <div
      v-if="error"
      class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
    >
      {{ error }}
    </div>

    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
      <div class="h-6 bg-gray-700 rounded w-1/3 mb-4" />
      <div class="h-4 bg-gray-700 rounded w-2/3" />
    </div>

    <template v-if="!loading && program">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h2 class="text-xl font-bold text-white">{{ program.title }}</h2>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="{
                  'bg-green-900/50 text-green-400': program.status === 'active',
                  'bg-gray-700 text-gray-400': program.status === 'draft',
                  'bg-blue-900/50 text-blue-400': program.status === 'completed',
                  'bg-red-900/50 text-red-400': program.status === 'archived',
                }"
              >
                {{ program.status }}
              </span>
            </div>
            <p class="text-gray-400 text-sm mb-3">{{ program.description || 'No description' }}</p>
            <div class="flex items-center gap-4 text-sm text-gray-400">
              <span>{{ program.program_type.replace('_', ' ') }}</span>
              <span>{{ program.enrolled_count }} enrolled</span>
              <span v-if="program.start_date">
                {{ program.start_date }} - {{ program.end_date || 'ongoing' }}
              </span>
            </div>
          </div>
          <div v-if="canManage" class="flex items-center gap-2">
            <button
              v-if="program.status === 'draft'"
              class="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg"
              @click="handleActivate"
            >
              Activate
            </button>
            <button
              v-if="program.status === 'active'"
              class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg"
              @click="handleComplete"
            >
              Mark Complete
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Courses -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg">
          <div class="px-5 py-4 border-b border-gray-700">
            <h3 class="text-white font-semibold">
              Courses ({{ program.courses?.length || 0 }})
            </h3>
          </div>
          <div v-if="program.courses?.length" class="divide-y divide-gray-700">
            <RouterLink
              v-for="course in program.courses"
              :key="course.id"
              :to="{ name: 'lnd.courses.show', params: { id: course.id } }"
              class="px-5 py-3 flex items-center justify-between hover:bg-gray-700/50 block"
            >
              <div>
                <p class="text-white text-sm">{{ course.title }}</p>
                <p class="text-gray-400 text-xs">{{ course.duration_minutes }} min</p>
              </div>
              <span class="text-xs text-gray-500">{{ course.difficulty_level }}</span>
            </RouterLink>
          </div>
          <div v-else class="px-5 py-8 text-center text-gray-400 text-sm">No courses assigned.</div>
        </div>

        <!-- Enrollments -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg">
          <div class="px-5 py-4 border-b border-gray-700">
            <h3 class="text-white font-semibold">
              Enrollments ({{ program.enrollments?.length || 0 }})
            </h3>
          </div>
          <div v-if="program.enrollments?.length" class="divide-y divide-gray-700">
            <div
              v-for="enrollment in program.enrollments"
              :key="enrollment.id"
              class="px-5 py-3 flex items-center justify-between"
            >
              <div>
                <p class="text-white text-sm">
                  {{ enrollment.employee?.name || 'Employee' }}
                </p>
                <p class="text-gray-400 text-xs">
                  {{ enrollment.employee?.email }}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <div class="w-20 bg-gray-700 rounded-full h-1.5">
                  <div
                    class="h-1.5 rounded-full"
                    :class="
                      enrollment.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                    "
                    :style="{ width: enrollment.progress_percent + '%' }"
                  />
                </div>
                <span class="text-gray-400 text-xs w-8 text-right">
                  {{ enrollment.progress_percent }}%
                </span>
              </div>
            </div>
          </div>
          <div v-else class="px-5 py-8 text-center text-gray-400 text-sm">No enrollments yet.</div>
        </div>
      </div>
    </template>
  </div>
</template>
