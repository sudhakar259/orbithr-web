<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  recruitmentService,
  type JobBoardIntegration,
  type PublishResult,
} from '@/services/recruitmentService'

const props = defineProps<{
  jobId: number
}>()

const emit = defineEmits<{
  close: []
  published: []
}>()

const integrations = ref<JobBoardIntegration[]>([])
const selectedIds = ref<number[]>([])
const loading = ref(true)
const publishing = ref(false)
const error = ref<string | null>(null)
const result = ref<PublishResult | null>(null)

const platformColors: Record<string, string> = {
  linkedin: 'bg-blue-600',
  indeed: 'bg-indigo-600',
  naukri: 'bg-teal-600',
  glassdoor: 'bg-green-600',
  monster: 'bg-purple-600',
}

const getPlatformColor = (platform: string) =>
  platformColors[platform.toLowerCase()] ?? 'bg-gray-600'

const getPlatformInitial = (platform: string) =>
  platform.charAt(0).toUpperCase()

const toggleSelection = (id: number) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

const loadIntegrations = async () => {
  loading.value = true
  try {
    const res = await recruitmentService.getIntegrations()
    integrations.value = res.data?.data ?? []
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to load integrations'
  } finally {
    loading.value = false
  }
}

const publish = async () => {
  if (!selectedIds.value.length) {
    error.value = 'Select at least one integration'
    return
  }
  publishing.value = true
  error.value = null
  try {
    const res = await recruitmentService.publishToBoards(props.jobId, selectedIds.value)
    result.value = res.data?.data ?? null
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to publish'
  } finally {
    publishing.value = false
  }
}

const done = () => {
  emit('published')
}

onMounted(loadIntegrations)
</script>

<template>
  <!-- Modal backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>

    <div class="relative bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-md mx-4">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">Publish to Job Boards</h2>
        <button @click="emit('close')" class="text-gray-400 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
        <!-- Error -->
        <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-3">
          <p class="text-sm text-red-400">{{ error }}</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="space-y-3">
          <div v-for="n in 3" :key="n" class="h-16 bg-gray-700 rounded-lg animate-pulse"></div>
        </div>

        <!-- Result -->
        <div v-else-if="result" class="space-y-3">
          <div v-if="result.success.length" class="space-y-2">
            <h3 class="text-sm font-medium text-green-400">Published Successfully</h3>
            <div
              v-for="s in result.success"
              :key="s.platform"
              class="flex items-center space-x-3 p-3 bg-green-900/20 border border-green-800 rounded-lg"
            >
              <div :class="[getPlatformColor(s.platform), 'w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold']">
                {{ getPlatformInitial(s.platform) }}
              </div>
              <span class="text-sm text-gray-300 capitalize">{{ s.platform }}</span>
            </div>
          </div>
          <div v-if="result.failed.length" class="space-y-2">
            <h3 class="text-sm font-medium text-red-400">Failed</h3>
            <div
              v-for="f in result.failed"
              :key="f.platform"
              class="flex items-center space-x-3 p-3 bg-red-900/20 border border-red-800 rounded-lg"
            >
              <div :class="[getPlatformColor(f.platform), 'w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold opacity-50']">
                {{ getPlatformInitial(f.platform) }}
              </div>
              <div>
                <span class="text-sm text-gray-300 capitalize">{{ f.platform }}</span>
                <p class="text-xs text-red-400">{{ f.error }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Integration list -->
        <div v-else class="space-y-2">
          <p v-if="!integrations.length" class="text-sm text-gray-500 text-center py-4">
            No integrations configured. Set up integrations first.
          </p>
          <div
            v-for="integration in integrations"
            :key="integration.id"
            @click="integration.is_active ? toggleSelection(integration.id) : undefined"
            :class="[
              'flex items-center space-x-3 p-3 border rounded-lg transition-colors',
              integration.is_active ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
              selectedIds.includes(integration.id)
                ? 'border-blue-500 bg-blue-900/20'
                : 'border-gray-700 hover:border-gray-600',
            ]"
          >
            <div :class="[getPlatformColor(integration.platform), 'w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0']">
              {{ getPlatformInitial(integration.platform) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white">{{ integration.display_name }}</p>
              <p class="text-xs text-gray-400 capitalize">{{ integration.platform }}</p>
            </div>
            <div>
              <div
                v-if="integration.is_active && selectedIds.includes(integration.id)"
                class="w-5 h-5 rounded bg-blue-600 flex items-center justify-center"
              >
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div
                v-else-if="integration.is_active"
                class="w-5 h-5 rounded border-2 border-gray-600"
              ></div>
              <span
                v-else
                class="text-xs text-gray-500"
              >Disabled</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
        <button
          @click="emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >
          {{ result ? 'Close' : 'Cancel' }}
        </button>
        <button
          v-if="result"
          @click="done"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Done
        </button>
        <button
          v-else
          @click="publish"
          :disabled="publishing || !selectedIds.length"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {{ publishing ? 'Publishing...' : 'Publish' }}
        </button>
      </div>
    </div>
  </div>
</template>
