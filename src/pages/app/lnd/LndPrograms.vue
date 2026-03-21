<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import lndService from '@/services/lndService'
import type { TrainingProgram } from '@/services/lndService'
import { useAuth } from '@/composables/useAuth'

const { hasPermission } = useAuth()
const canManage = hasPermission('manage training programs')

const loading = ref(true)
const programs = ref<TrainingProgram[]>([])
const error = ref('')
const statusFilter = ref('')

async function loadPrograms() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {}
    if (statusFilter.value) params.status = statusFilter.value
    const res = await lndService.getPrograms(params)
    programs.value = res.data.data
  } catch {
    error.value = 'Failed to load programs.'
  } finally {
    loading.value = false
  }
}

function programTypeColor(type: string) {
  switch (type) {
    case 'onboarding':
      return 'bg-blue-900/50 text-blue-400'
    case 'compliance':
      return 'bg-red-900/50 text-red-400'
    case 'role_based':
      return 'bg-purple-900/50 text-purple-400'
    default:
      return 'bg-gray-700 text-gray-400'
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-900/50 text-green-400'
    case 'completed':
      return 'bg-blue-900/50 text-blue-400'
    case 'draft':
      return 'bg-gray-700 text-gray-400'
    case 'archived':
      return 'bg-red-900/50 text-red-400'
    default:
      return 'bg-gray-700 text-gray-400'
  }
}

onMounted(loadPrograms)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <select
          v-model="statusFilter"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          @change="loadPrograms"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <RouterLink
        v-if="canManage"
        :to="{ name: 'lnd.programs.create' }"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        + New Program
      </RouterLink>
    </div>

    <div
      v-if="error"
      class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
    >
      {{ error }}
    </div>

    <div v-if="loading" class="space-y-3">
      <div
        v-for="n in 4"
        :key="n"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse"
      >
        <div class="h-5 bg-gray-700 rounded w-1/3 mb-2" />
        <div class="h-3 bg-gray-700 rounded w-2/3" />
      </div>
    </div>

    <div v-else-if="programs.length" class="space-y-3">
      <RouterLink
        v-for="program in programs"
        :key="program.id"
        :to="{ name: 'lnd.programs.show', params: { id: program.id } }"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5 block hover:border-gray-600 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-white font-semibold">{{ program.title }}</h3>
              <span
                :class="statusColor(program.status)"
                class="text-xs px-2 py-0.5 rounded-full"
              >
                {{ program.status }}
              </span>
              <span
                :class="programTypeColor(program.program_type)"
                class="text-xs px-2 py-0.5 rounded-full"
              >
                {{ program.program_type.replace('_', ' ') }}
              </span>
              <span
                v-if="program.is_mandatory"
                class="bg-purple-900/50 text-purple-400 text-xs px-2 py-0.5 rounded-full"
              >
                mandatory
              </span>
            </div>
            <p class="text-gray-400 text-sm line-clamp-1">
              {{ program.description || 'No description' }}
            </p>
          </div>
          <div class="text-right text-sm text-gray-400">
            <p>{{ program.enrolled_count }} enrolled</p>
            <p v-if="program.start_date" class="text-xs">
              {{ program.start_date }} - {{ program.end_date || 'ongoing' }}
            </p>
          </div>
        </div>
      </RouterLink>
    </div>

    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center">
      <p class="text-gray-400">No training programs found.</p>
    </div>
  </div>
</template>
