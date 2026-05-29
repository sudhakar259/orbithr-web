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
  linkedin: '#0A66C2',
  indeed: '#2164F3',
  naukri: '#FF7555',
  glassdoor: '#0CAA41',
  monster: '#6E45E2',
}

const getPlatformColor = (platform: string) =>
  platformColors[platform.toLowerCase()] ?? '#7A8299'

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
  <Teleport to="body">
    <div class="ptb-overlay">
      <div class="ptb-backdrop" @click="emit('close')"></div>
      <div class="ptb-modal">
        <!-- Header -->
        <div class="ptb-head">
          <h2 class="ptb-title">Publish to Job Boards</h2>
          <button class="ptb-close" @click="emit('close')">&#10005;</button>
        </div>

        <!-- Body -->
        <div class="ptb-body">
          <div v-if="error" class="ptb-error">{{ error }}</div>

          <!-- Loading -->
          <div v-if="loading" class="ptb-loading">
            <div v-for="n in 3" :key="n" class="ptb-sk"></div>
          </div>

          <!-- Result -->
          <div v-else-if="result" class="ptb-result">
            <div v-if="result.success.length" class="ptb-result-group">
              <p class="ptb-result-label ptb-label-green">Published Successfully</p>
              <div v-for="s in result.success" :key="s.platform" class="ptb-result-row ptb-result-success">
                <div class="ptb-platform-icon" :style="{ background: getPlatformColor(s.platform) }">
                  {{ getPlatformInitial(s.platform) }}
                </div>
                <span class="ptb-platform-name">{{ s.platform }}</span>
              </div>
            </div>
            <div v-if="result.failed.length" class="ptb-result-group">
              <p class="ptb-result-label ptb-label-red">Failed</p>
              <div v-for="f in result.failed" :key="f.platform" class="ptb-result-row ptb-result-fail">
                <div class="ptb-platform-icon ptb-icon-dim" :style="{ background: getPlatformColor(f.platform) }">
                  {{ getPlatformInitial(f.platform) }}
                </div>
                <div>
                  <span class="ptb-platform-name">{{ f.platform }}</span>
                  <p class="ptb-fail-reason">{{ f.error }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Integration list -->
          <div v-else class="ptb-integration-list">
            <p v-if="!integrations.length" class="ptb-empty-msg">
              No integrations configured. Set up integrations first.
            </p>
            <div
              v-for="integration in integrations"
              :key="integration.id"
              :class="['ptb-integration-row', integration.is_active ? 'ptb-row-active' : 'ptb-row-disabled', selectedIds.includes(integration.id) ? 'ptb-row-selected' : '']"
              @click="integration.is_active ? toggleSelection(integration.id) : undefined"
            >
              <div class="ptb-platform-icon" :style="{ background: getPlatformColor(integration.platform) }">
                {{ getPlatformInitial(integration.platform) }}
              </div>
              <div class="ptb-integration-info">
                <p class="ptb-integration-name">{{ integration.display_name }}</p>
                <p class="ptb-integration-platform">{{ integration.platform }}</p>
              </div>
              <div class="ptb-check-area">
                <div v-if="integration.is_active && selectedIds.includes(integration.id)" class="ptb-checkmark">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div v-else-if="integration.is_active" class="ptb-check-empty"></div>
                <span v-else class="ptb-disabled-label">Disabled</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="ptb-footer">
          <button class="ptb-btn-ghost" @click="emit('close')">
            {{ result ? 'Close' : 'Cancel' }}
          </button>
          <button v-if="result" class="ptb-btn-primary" @click="done">Done</button>
          <button
            v-else
            class="ptb-btn-primary"
            :disabled="publishing || !selectedIds.length"
            @click="publish"
          >
            {{ publishing ? 'Publishing…' : 'Publish' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ptb-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; }
.ptb-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
.ptb-modal { position: relative; background: #161A23; border: 1px solid #232936; border-radius: 12px; width: 100%; max-width: 440px; margin: 0 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); display: flex; flex-direction: column; max-height: 85vh; }

.ptb-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #232936; flex-shrink: 0; }
.ptb-title { font-size: 15px; font-weight: 700; color: #EEF0F4; margin: 0; }
.ptb-close { background: none; border: none; color: #7A8299; font-size: 15px; cursor: pointer; line-height: 1; }
.ptb-close:hover { color: #EEF0F4; }

.ptb-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; flex: 1; }
.ptb-error { padding: 10px 14px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }

.ptb-loading { display: flex; flex-direction: column; gap: 8px; }
.ptb-sk { height: 60px; background: #232936; border-radius: 8px; animation: ptb-pulse 1.2s ease-in-out infinite; }
@keyframes ptb-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

.ptb-result { display: flex; flex-direction: column; gap: 14px; }
.ptb-result-group { display: flex; flex-direction: column; gap: 6px; }
.ptb-result-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
.ptb-label-green { color: #4DD39A; }
.ptb-label-red { color: #F38288; }
.ptb-result-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; border: 1px solid; }
.ptb-result-success { background: rgba(77,211,154,0.06); border-color: rgba(77,211,154,0.18); }
.ptb-result-fail { background: rgba(243,130,136,0.06); border-color: rgba(243,130,136,0.18); }

.ptb-integration-list { display: flex; flex-direction: column; gap: 6px; }
.ptb-empty-msg { font-size: 13px; color: #7A8299; text-align: center; padding: 20px 0; margin: 0; }
.ptb-integration-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid #232936; border-radius: 8px; transition: border-color 0.15s, background 0.15s; }
.ptb-row-active { cursor: pointer; }
.ptb-row-active:hover { border-color: #2D3448; }
.ptb-row-disabled { opacity: 0.5; cursor: not-allowed; }
.ptb-row-selected { border-color: #6B5BFF !important; background: rgba(107,91,255,0.08); }

.ptb-platform-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0; }
.ptb-icon-dim { opacity: 0.5; }
.ptb-integration-info { flex: 1; min-width: 0; }
.ptb-integration-name { font-size: 13px; font-weight: 600; color: #EEF0F4; margin: 0 0 2px; }
.ptb-integration-platform { font-size: 11px; color: #7A8299; margin: 0; text-transform: capitalize; }
.ptb-platform-name { font-size: 13px; color: #B6BED0; text-transform: capitalize; }
.ptb-fail-reason { font-size: 11px; color: #F38288; margin: 2px 0 0; }

.ptb-check-area { flex-shrink: 0; }
.ptb-checkmark { width: 20px; height: 20px; border-radius: 5px; background: #6B5BFF; display: flex; align-items: center; justify-content: center; color: #fff; }
.ptb-check-empty { width: 20px; height: 20px; border-radius: 5px; border: 2px solid #2D3448; }
.ptb-disabled-label { font-size: 11px; color: #7A8299; }

.ptb-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #232936; flex-shrink: 0; }
.ptb-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; }
.ptb-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.ptb-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.ptb-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
.ptb-btn-ghost:hover { color: #EEF0F4; }
</style>
