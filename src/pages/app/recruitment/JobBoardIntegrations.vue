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
  linkedin: '#0A66C2',
  indeed: '#2164F3',
  naukri: '#FF7555',
  glassdoor: '#0CAA41',
  monster: '#6E45E2',
  custom: '#7A8299',
}

const getPlatformColor = (platform: string) => platformColors[platform.toLowerCase()] ?? '#7A8299'
const getPlatformInitial = (platform: string) => platform.charAt(0).toUpperCase()

const formatDate = (date?: string) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
    testMessage.value = { id: integration.id, success: data?.success ?? false, message: data?.message ?? 'Test completed' }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    testMessage.value = { id: integration.id, success: false, message: e.response?.data?.message ?? 'Connection test failed' }
  }
  setTimeout(() => { if (testMessage.value?.id === integration.id) testMessage.value = null }, 5000)
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

const openCreate = () => { editingIntegration.value = null; showFormModal.value = true }
const openEdit = (integration: JobBoardIntegration) => { editingIntegration.value = integration; showFormModal.value = true }

const onFormSaved = async () => {
  showFormModal.value = false
  editingIntegration.value = null
  await loadIntegrations()
}

onMounted(loadIntegrations)
</script>

<template>
  <div class="jbi-page">
    <div class="jbi-header">
      <div>
        <h1 class="jbi-title">Job Board Integrations</h1>
        <p class="jbi-subtitle">Connect to external job boards to post openings automatically.</p>
      </div>
      <button class="jbi-btn-primary" @click="openCreate">+ Add Integration</button>
    </div>

    <div v-if="error" class="jbi-error">{{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="jbi-grid">
      <div v-for="n in 3" :key="n" class="jbi-card jbi-card-loading">
        <div class="jbi-loading-row">
          <div class="jbi-sk jbi-sk-avatar"></div>
          <div class="jbi-sk-lines">
            <div class="jbi-sk jbi-sk-name"></div>
            <div class="jbi-sk jbi-sk-sub"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="!integrations.length" class="jbi-empty">
      <p class="jbi-empty-title">No integrations configured</p>
      <p class="jbi-empty-sub">Add a job board integration to start posting jobs externally.</p>
      <button class="jbi-btn-primary" @click="openCreate">Add Integration</button>
    </div>

    <!-- Cards -->
    <div v-else class="jbi-grid">
      <div v-for="integration in integrations" :key="integration.id" class="jbi-card">
        <div class="jbi-card-top">
          <div class="jbi-platform-icon" :style="{ background: getPlatformColor(integration.platform) }">
            {{ getPlatformInitial(integration.platform) }}
          </div>
          <div class="jbi-card-info">
            <h3 class="jbi-card-name">{{ integration.display_name }}</h3>
            <p class="jbi-card-platform">{{ integration.platform }}</p>
          </div>
        </div>

        <div class="jbi-card-status-row">
          <span :class="['jbi-badge', integration.is_active ? 'jbi-badge-green' : 'jbi-badge-muted']">
            {{ integration.is_active ? 'Active' : 'Inactive' }}
          </span>
          <span class="jbi-sync-date">Last sync: {{ formatDate(integration.last_synced_at) }}</span>
        </div>

        <div
          v-if="testMessage?.id === integration.id"
          :class="['jbi-test-msg', testMessage.success ? 'jbi-test-success' : 'jbi-test-fail']"
        >
          {{ testMessage.message }}
        </div>

        <div class="jbi-card-actions">
          <button class="jbi-action-btn" @click="openEdit(integration)">Edit</button>
          <button class="jbi-action-btn" @click="testIntegration(integration)">Test</button>
          <button
            :class="['jbi-toggle-btn', integration.is_active ? 'jbi-toggle-disable' : 'jbi-toggle-enable']"
            :title="integration.is_active ? 'Disable' : 'Enable'"
            @click="toggleIntegration(integration)"
          >{{ integration.is_active ? 'Disable' : 'Enable' }}</button>
          <button class="jbi-delete-btn" @click="deleteIntegration(integration)">Delete</button>
        </div>
      </div>
    </div>

    <IntegrationFormModal
      v-if="showFormModal"
      :integration="editingIntegration"
      @close="showFormModal = false"
      @saved="onFormSaved"
    />
  </div>
</template>

<style scoped>
.jbi-page { display: flex; flex-direction: column; gap: 20px; }
.jbi-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.jbi-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0 0 4px; }
.jbi-subtitle { font-size: 13px; color: #7A8299; margin: 0; }
.jbi-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.jbi-btn-primary:hover { opacity: 0.88; }
.jbi-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.jbi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.jbi-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.jbi-card:hover { border-color: #2D3448; }
.jbi-card-loading { min-height: 120px; }
.jbi-loading-row { display: flex; align-items: center; gap: 12px; }
.jbi-sk { background: #232936; border-radius: 6px; animation: jbi-pulse 1.2s ease-in-out infinite; }
.jbi-sk-avatar { width: 44px; height: 44px; border-radius: 8px; flex-shrink: 0; }
.jbi-sk-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.jbi-sk-name { height: 14px; width: 60%; }
.jbi-sk-sub { height: 11px; width: 35%; }
@keyframes jbi-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.jbi-card-top { display: flex; align-items: center; gap: 12px; }
.jbi-platform-icon { width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
.jbi-card-info { flex: 1; min-width: 0; }
.jbi-card-name { font-size: 13px; font-weight: 600; color: #EEF0F4; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jbi-card-platform { font-size: 11px; color: #7A8299; margin: 0; text-transform: capitalize; }
.jbi-card-status-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.jbi-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.jbi-badge-green { background: rgba(77,211,154,0.12); color: #4DD39A; }
.jbi-badge-muted { background: rgba(122,130,153,0.12); color: #7A8299; }
.jbi-sync-date { font-size: 11px; color: #7A8299; }
.jbi-test-msg { font-size: 12px; padding: 8px 12px; border-radius: 6px; border: 1px solid; }
.jbi-test-success { background: rgba(77,211,154,0.08); border-color: rgba(77,211,154,0.2); color: #4DD39A; }
.jbi-test-fail { background: rgba(243,130,136,0.08); border-color: rgba(243,130,136,0.2); color: #F38288; }
.jbi-card-actions { display: flex; align-items: center; gap: 6px; }
.jbi-action-btn { flex: 1; padding: 6px 8px; font-size: 12px; font-weight: 500; color: #B6BED0; background: #232936; border: 1px solid #2D3448; border-radius: 6px; cursor: pointer; }
.jbi-action-btn:hover { color: #EEF0F4; }
.jbi-toggle-btn { padding: 6px 8px; font-size: 12px; font-weight: 500; border-radius: 6px; border: 1px solid; cursor: pointer; }
.jbi-toggle-enable { background: rgba(77,211,154,0.08); border-color: rgba(77,211,154,0.2); color: #4DD39A; }
.jbi-toggle-disable { background: rgba(245,166,35,0.08); border-color: rgba(245,166,35,0.2); color: #F5A623; }
.jbi-delete-btn { padding: 6px 8px; font-size: 12px; color: #F38288; background: none; border: none; cursor: pointer; }
.jbi-delete-btn:hover { color: #ff9ea1; }
.jbi-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 60px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.jbi-empty-title { font-size: 14px; color: #B6BED0; margin: 0; font-weight: 500; }
.jbi-empty-sub { font-size: 13px; color: #7A8299; margin: 0; }
</style>
