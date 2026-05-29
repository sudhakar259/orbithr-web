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
    monster: [{ key: 'api_key', label: 'API Key', type: 'password' }],
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
  <Teleport to="body">
    <div class="ifm-overlay">
      <div class="ifm-backdrop" @click="emit('close')"></div>
      <div class="ifm-modal">
        <!-- Header -->
        <div class="ifm-head">
          <h2 class="ifm-title">{{ isEdit ? 'Edit Integration' : 'Add Integration' }}</h2>
          <button class="ifm-close" @click="emit('close')">&#10005;</button>
        </div>

        <!-- Body -->
        <form class="ifm-body" @submit.prevent="save">
          <div v-if="error" class="ifm-error">{{ error }}</div>

          <div class="ifm-field">
            <label class="ifm-label">Platform</label>
            <select v-model="form.platform" :disabled="isEdit" class="ifm-input">
              <option v-for="p in platforms" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>

          <div class="ifm-field">
            <label class="ifm-label">Display Name</label>
            <input v-model="form.display_name" type="text" required class="ifm-input" :placeholder="`e.g. My ${form.platform} Account`" />
          </div>

          <div v-for="field in credentialFields" :key="field.key" class="ifm-field">
            <label class="ifm-label">{{ field.label }}</label>
            <input v-model="form.credentials[field.key]" :type="field.type" class="ifm-input" :placeholder="field.label" />
          </div>

          <div class="ifm-field">
            <label class="ifm-label">Webhook Secret (optional)</label>
            <input v-model="form.webhook_secret" type="password" class="ifm-input" placeholder="Optional webhook secret" />
          </div>

          <div class="ifm-footer">
            <button type="button" class="ifm-btn-ghost" @click="emit('close')">Cancel</button>
            <button type="submit" :disabled="saving" class="ifm-btn-primary">
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ifm-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; }
.ifm-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
.ifm-modal { position: relative; background: #161A23; border: 1px solid #232936; border-radius: 12px; width: 100%; max-width: 440px; margin: 0 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.ifm-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #232936; }
.ifm-title { font-size: 15px; font-weight: 700; color: #EEF0F4; margin: 0; }
.ifm-close { background: none; border: none; color: #7A8299; font-size: 15px; cursor: pointer; line-height: 1; }
.ifm-close:hover { color: #EEF0F4; }
.ifm-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.ifm-error { padding: 10px 14px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.ifm-field { display: flex; flex-direction: column; gap: 5px; }
.ifm-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.ifm-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.ifm-input:focus { border-color: #6B5BFF; }
.ifm-input:disabled { opacity: 0.5; }
.ifm-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.ifm-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; }
.ifm-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.ifm-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.ifm-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.ifm-btn-ghost:hover { color: #EEF0F4; }
</style>
