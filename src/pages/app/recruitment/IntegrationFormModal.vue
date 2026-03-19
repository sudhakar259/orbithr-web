<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { recruitmentService, type JobBoardIntegration } from '@/services/recruitmentService'

const props = defineProps<{
  integration: JobBoardIntegration | null
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const isEdit = computed(() => !!props.integration)
const saving = ref(false)
const error = ref<string | null>(null)

const platforms = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'naukri', label: 'Naukri' },
  { value: 'glassdoor', label: 'Glassdoor' },
  { value: 'monster', label: 'Monster' },
  { value: 'custom', label: 'Custom' },
]

const form = ref({
  platform: 'linkedin',
  display_name: '',
  webhook_secret: '',
  credentials: {} as Record<string, string>,
})

interface CredentialField {
  key: string
  label: string
  type: string
}

const credentialFields = computed<CredentialField[]>(() => {
  const map: Record<string, CredentialField[]> = {
    linkedin: [
      { key: 'client_id', label: 'Client ID', type: 'text' },
      { key: 'client_secret', label: 'Client Secret', type: 'password' },
      { key: 'organization_id', label: 'Organization ID', type: 'text' },
    ],
    indeed: [
      { key: 'publisher_id', label: 'Publisher ID', type: 'text' },
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
    naukri: [
      { key: 'client_id', label: 'Client ID', type: 'text' },
      { key: 'client_secret', label: 'Client Secret', type: 'password' },
    ],
    glassdoor: [
      { key: 'partner_id', label: 'Partner ID', type: 'text' },
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
    monster: [
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
    custom: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'text' },
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
  }
  return map[form.value.platform] ?? []
})

const save = async () => {
  saving.value = true
  error.value = null
  try {
    const payload = {
      platform: form.value.platform,
      display_name: form.value.display_name,
      webhook_secret: form.value.webhook_secret || undefined,
      credentials: form.value.credentials,
    }
    if (isEdit.value && props.integration) {
      await recruitmentService.updateIntegration(props.integration.id, payload)
    } else {
      await recruitmentService.createIntegration(payload)
    }
    emit('saved')
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
    if (e.response?.data?.errors) {
      error.value = Object.values(e.response.data.errors).flat().join(', ')
    } else {
      error.value = e.response?.data?.message ?? 'Failed to save integration'
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (props.integration) {
    form.value.platform = props.integration.platform
    form.value.display_name = props.integration.display_name
    form.value.webhook_secret = props.integration.webhook_secret ?? ''
    form.value.credentials = { ...(props.integration.credentials ?? {}) }
  }
})
</script>

<template>
  <!-- Modal backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="emit('close')"></div>

    <div class="relative bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-md mx-4">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">
          {{ isEdit ? 'Edit Integration' : 'Add Integration' }}
        </h2>
        <button @click="emit('close')" class="text-gray-400 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <form @submit.prevent="save" class="px-6 py-4 space-y-4">
        <!-- Error -->
        <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-3">
          <p class="text-sm text-red-400">{{ error }}</p>
        </div>

        <!-- Platform -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Platform</label>
          <select
            v-model="form.platform"
            :disabled="isEdit"
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option v-for="p in platforms" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>

        <!-- Display name -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
          <input
            v-model="form.display_name"
            type="text"
            required
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            :placeholder="`e.g. My ${form.platform} Account`"
          />
        </div>

        <!-- Credentials -->
        <div v-for="field in credentialFields" :key="field.key">
          <label class="block text-sm font-medium text-gray-300 mb-1">{{ field.label }}</label>
          <input
            v-model="form.credentials[field.key]"
            :type="field.type"
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            :placeholder="field.label"
          />
        </div>

        <!-- Webhook secret -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Webhook Secret (optional)</label>
          <input
            v-model="form.webhook_secret"
            type="password"
            class="w-full bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
            placeholder="Optional webhook secret"
          />
        </div>

        <!-- Footer -->
        <div class="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
