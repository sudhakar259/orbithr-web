<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { recruitmentService, type JobBoardIntegration } from '@/services/recruitmentService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()
import IntegrationFormModal from '@/pages/app/recruitment/IntegrationFormModal.vue'

const integrations = ref<JobBoardIntegration[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const testMessage = ref<{ id: number; success: boolean; message: string } | null>(null)
const showFormModal = ref(false)
const editingIntegration = ref<JobBoardIntegration | null>(null)

const platformColors: Record<string, string> = {
  linkedin: 'bg-blue-600',
  indeed: 'bg-indigo-600',
  naukri: 'bg-teal-600',
  glassdoor: 'bg-green-600',
  monster: 'bg-purple-600',
  custom: 'bg-gray-600',
}

const getPlatformColor = (platform: string) =>
  platformColors[platform.toLowerCase()] ?? 'bg-gray-600'

const getPlatformInitial = (platform: string) =>
  platform.charAt(0).toUpperCase()

const formatDate = (date?: string) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadIntegrations = async () => {
  loading.value = true
  error.value = null
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

const testIntegration = async (integration: JobBoardIntegration) => {
  testMessage.value = null
  try {
    const res = await recruitmentService.testIntegration(integration.id)
    const data = res.data?.data
    testMessage.value = {
      id: integration.id,
      success: data?.success ?? false,
      message: data?.message ?? 'Test completed',
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    testMessage.value = {
      id: integration.id,
      success: false,
      message: e.response?.data?.message ?? 'Connection test failed',
    }
  }
  setTimeout(() => {
    if (testMessage.value?.id === integration.id) {
      testMessage.value = null
    }
  }, 5000)
}

const toggleIntegration = async (integration: JobBoardIntegration) => {
  try {
    await recruitmentService.toggleIntegration(integration.id)
    await loadIntegrations()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to toggle integration'
  }
}

const deleteIntegration = async (integration: JobBoardIntegration) => {
  if (!await dialog('Remove', `Remove ${integration.display_name} integration?`)) return
  try {
    await recruitmentService.deleteIntegration(integration.id)
    await loadIntegrations()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to delete integration'
  }
}

const openCreate = () => {
  editingIntegration.value = null
  showFormModal.value = true
}

const openEdit = (integration: JobBoardIntegration) => {
  editingIntegration.value = integration
  showFormModal.value = true
}

const onFormSaved = async () => {
  showFormModal.value = false
  editingIntegration.value = null
  await loadIntegrations()
}

onMounted(loadIntegrations)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-white">Job Board Integrations</h1>
        <p class="text-gray-400 text-sm mt-1">Connect to external job boards to post openings automatically.</p>
      </div>
      <button
        @click="openCreate"
        class="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Integration
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="n in 3" :key="n" class="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
        <div class="flex items-center space-x-4 mb-4">
          <div class="w-12 h-12 bg-gray-700 rounded-lg"></div>
          <div class="flex-1">
            <div class="h-4 bg-gray-700 rounded w-2/3 mb-2"></div>
            <div class="h-3 bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="!integrations.length"
      class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center"
    >
      <svg class="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
      <h3 class="mt-3 text-sm font-medium text-gray-300">No integrations configured</h3>
      <p class="mt-1 text-sm text-gray-500">Add a job board integration to start posting jobs externally.</p>
      <button
        @click="openCreate"
        class="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        Add Integration
      </button>
    </div>

    <!-- Integration cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="integration in integrations"
        :key="integration.id"
        class="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
      >
        <!-- Platform header -->
        <div class="flex items-center space-x-4 mb-4">
          <div :class="[getPlatformColor(integration.platform), 'w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0']">
            {{ getPlatformInitial(integration.platform) }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-white truncate">{{ integration.display_name }}</h3>
            <p class="text-xs text-gray-400 capitalize">{{ integration.platform }}</p>
          </div>
        </div>

        <!-- Status -->
        <div class="flex items-center justify-between mb-4">
          <span
            :class="[
              integration.is_active
                ? 'bg-green-900/50 text-green-400'
                : 'bg-gray-700 text-gray-400',
              'px-2 py-0.5 text-xs font-medium rounded-full',
            ]"
          >
            {{ integration.is_active ? 'Active' : 'Inactive' }}
          </span>
          <span class="text-xs text-gray-500">
            Last sync: {{ formatDate(integration.last_synced_at) }}
          </span>
        </div>

        <!-- Test message -->
        <div
          v-if="testMessage?.id === integration.id"
          :class="[
            testMessage.success
              ? 'bg-green-900/20 border-green-800 text-green-400'
              : 'bg-red-900/20 border-red-800 text-red-400',
            'border rounded-lg p-3 mb-4 text-xs',
          ]"
        >
          {{ testMessage.message }}
        </div>

        <!-- Actions -->
        <div class="flex items-center space-x-2">
          <button
            @click="openEdit(integration)"
            class="flex-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Edit
          </button>
          <button
            @click="testIntegration(integration)"
            class="flex-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Test
          </button>
          <button
            @click="toggleIntegration(integration)"
            :class="[
              integration.is_active
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-green-400 hover:text-green-300',
              'p-1.5 transition-colors',
            ]"
            :title="integration.is_active ? 'Disable' : 'Enable'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                v-if="integration.is_active"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
              <path
                v-else
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <button
            @click="deleteIntegration(integration)"
            class="p-1.5 text-red-400 hover:text-red-300 transition-colors"
            title="Delete"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Form modal -->
    <IntegrationFormModal
      v-if="showFormModal"
      :integration="editingIntegration"
      @close="showFormModal = false"
      @saved="onFormSaved"
    />
  </div>
</template>
