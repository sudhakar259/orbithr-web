<script setup lang="ts">
defineOptions({ name: 'RecruitmentCalendarSettings' })
import { ref, onMounted } from 'vue'
import { calendarService, type CalendarIntegration } from '@/services/recruitmentService'

const integrations = ref<CalendarIntegration[]>([])
const loading = ref(true)
const error = ref('')
const successMsg = ref('')

// Connect form state
const googleForm = ref({ access_token: '', refresh_token: '', calendar_id: 'primary' })
const outlookForm = ref({ access_token: '', refresh_token: '', calendar_id: 'primary' })
const connectingGoogle = ref(false)
const connectingOutlook = ref(false)
const connectError = ref('')

const loadIntegrations = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await calendarService.getIntegrations()
    integrations.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load calendar integrations'
  } finally {
    loading.value = false
  }
}

const toggleActive = async (integration: CalendarIntegration) => {
  try {
    await calendarService.updateIntegration(integration.id, {
      is_active: !integration.is_active,
    })
    integration.is_active = !integration.is_active
  } catch {
    error.value = 'Failed to update integration'
  }
}

const disconnectIntegration = async (integration: CalendarIntegration) => {
  if (!confirm(`Disconnect ${providerLabel(integration.provider)}? Calendar sync will stop.`)) return
  try {
    await calendarService.disconnectIntegration(integration.id)
    integrations.value = integrations.value.filter((i) => i.id !== integration.id)
    successMsg.value = 'Calendar disconnected'
    setTimeout(() => (successMsg.value = ''), 3000)
  } catch {
    error.value = 'Failed to disconnect calendar'
  }
}

const connectGoogle = async () => {
  if (!googleForm.value.access_token) {
    connectError.value = 'Access token is required'
    return
  }
  connectingGoogle.value = true
  connectError.value = ''
  try {
    const payload: { access_token: string; refresh_token?: string; calendar_id?: string } = {
      access_token: googleForm.value.access_token,
    }
    if (googleForm.value.refresh_token) payload.refresh_token = googleForm.value.refresh_token
    if (googleForm.value.calendar_id) payload.calendar_id = googleForm.value.calendar_id
    await calendarService.connectGoogle(payload)
    googleForm.value = { access_token: '', refresh_token: '', calendar_id: 'primary' }
    successMsg.value = 'Google Calendar connected!'
    setTimeout(() => (successMsg.value = ''), 3000)
    await loadIntegrations()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    connectError.value = err.response?.data?.message ?? 'Failed to connect Google Calendar'
  } finally {
    connectingGoogle.value = false
  }
}

const connectOutlook = async () => {
  if (!outlookForm.value.access_token) {
    connectError.value = 'Access token is required'
    return
  }
  connectingOutlook.value = true
  connectError.value = ''
  try {
    const payload: { access_token: string; refresh_token?: string; calendar_id?: string } = {
      access_token: outlookForm.value.access_token,
    }
    if (outlookForm.value.refresh_token) payload.refresh_token = outlookForm.value.refresh_token
    if (outlookForm.value.calendar_id) payload.calendar_id = outlookForm.value.calendar_id
    await calendarService.connectOutlook(payload)
    outlookForm.value = { access_token: '', refresh_token: '', calendar_id: 'primary' }
    successMsg.value = 'Outlook Calendar connected!'
    setTimeout(() => (successMsg.value = ''), 3000)
    await loadIntegrations()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    connectError.value = err.response?.data?.message ?? 'Failed to connect Outlook Calendar'
  } finally {
    connectingOutlook.value = false
  }
}

const providerLabel = (provider: string) => {
  if (provider === 'google_calendar') return 'Google Calendar'
  if (provider === 'outlook') return 'Outlook Calendar'
  return provider
}

const providerBadgeClass = (provider: string) => {
  if (provider === 'google_calendar') return 'badge-google'
  return 'badge-outlook'
}

const relativeTime = (dateStr?: string) => {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

onMounted(loadIntegrations)
</script>

<template>
  <div class="cal-settings">
    <div class="cal-container">
      <!-- Page header -->
      <div class="page-header">
        <h2 class="page-title">Calendar Integration</h2>
        <p class="page-desc">
          Connect your calendar to sync interview events and check interviewer availability.
        </p>
      </div>

      <!-- Success toast -->
      <div v-if="successMsg" class="toast-success">
        {{ successMsg }}
      </div>

      <!-- Error -->
      <div v-if="error" class="toast-error">
        {{ error }}
      </div>

      <!-- Section 1: Connected Calendars -->
      <div class="section">
        <h3 class="section-title">Connected Calendars</h3>

        <div v-if="loading" class="skeleton-list">
          <div v-for="i in 2" :key="i" class="skeleton-card"></div>
        </div>

        <div
          v-else-if="integrations.length === 0"
          class="empty-state"
        >
          <span class="empty-icon">📅</span>
          <p class="empty-text">No calendars connected</p>
          <p class="empty-hint">Connect a calendar below to get started</p>
        </div>

        <div v-else class="integration-list">
          <div
            v-for="integration in integrations"
            :key="integration.id"
            class="integration-card"
          >
            <div class="integration-info">
              <span :class="['provider-badge', providerBadgeClass(integration.provider)]">
                {{ integration.provider === 'google_calendar' ? 'G' : '&#9993;' }}
              </span>
              <div class="integration-details">
                <span class="integration-name">{{ providerLabel(integration.provider) }}</span>
                <span class="integration-email">{{
                  integration.calendar_id || integration.email || 'primary'
                }}</span>
                <span class="integration-sync"
                  >Last synced: {{ relativeTime(integration.last_sync_at) }}</span
                >
              </div>
            </div>
            <div class="integration-actions">
              <button
                :class="['toggle-btn', { 'toggle-active': integration.is_active }]"
                @click="toggleActive(integration)"
                :title="integration.is_active ? 'Disable sync' : 'Enable sync'"
              >
                <span class="toggle-knob"></span>
              </button>
              <button class="disconnect-btn" @click="disconnectIntegration(integration)">
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 2: Connect a Calendar -->
      <div class="section">
        <h3 class="section-title">Connect a Calendar</h3>

        <div v-if="connectError" class="toast-error">{{ connectError }}</div>

        <div class="connect-grid">
          <!-- Google Calendar Card -->
          <div class="connect-card">
            <div class="connect-header">
              <span class="provider-logo google-logo">G</span>
              <div>
                <h4 class="connect-name">Google Calendar</h4>
                <p class="connect-desc">Connect your Google account to sync interview events</p>
              </div>
            </div>
            <div class="connect-fields">
              <div class="field">
                <label class="field-label">Access Token *</label>
                <input
                  v-model="googleForm.access_token"
                  type="password"
                  class="field-input"
                  placeholder="Paste OAuth access token"
                />
              </div>
              <div class="field">
                <label class="field-label">Refresh Token</label>
                <input
                  v-model="googleForm.refresh_token"
                  type="password"
                  class="field-input"
                  placeholder="Optional refresh token"
                />
              </div>
              <div class="field">
                <label class="field-label">Calendar ID</label>
                <input
                  v-model="googleForm.calendar_id"
                  type="text"
                  class="field-input"
                  placeholder="primary"
                />
              </div>
            </div>
            <p class="connect-hint">
              Get tokens from Google OAuth 2.0 Playground or your OAuth flow
            </p>
            <button
              class="connect-btn google-btn"
              :disabled="connectingGoogle"
              @click="connectGoogle"
            >
              {{ connectingGoogle ? 'Connecting...' : 'Connect Google Calendar' }}
            </button>
          </div>

          <!-- Outlook Calendar Card -->
          <div class="connect-card">
            <div class="connect-header">
              <span class="provider-logo outlook-logo">&#9993;</span>
              <div>
                <h4 class="connect-name">Outlook Calendar</h4>
                <p class="connect-desc">Connect your Microsoft Outlook to sync interviews</p>
              </div>
            </div>
            <div class="connect-fields">
              <div class="field">
                <label class="field-label">Access Token *</label>
                <input
                  v-model="outlookForm.access_token"
                  type="password"
                  class="field-input"
                  placeholder="Paste OAuth access token"
                />
              </div>
              <div class="field">
                <label class="field-label">Refresh Token</label>
                <input
                  v-model="outlookForm.refresh_token"
                  type="password"
                  class="field-input"
                  placeholder="Optional refresh token"
                />
              </div>
              <div class="field">
                <label class="field-label">Calendar ID</label>
                <input
                  v-model="outlookForm.calendar_id"
                  type="text"
                  class="field-input"
                  placeholder="primary"
                />
              </div>
            </div>
            <p class="connect-hint">
              Get tokens from Microsoft Azure App Registration or your OAuth flow
            </p>
            <button
              class="connect-btn outlook-btn"
              :disabled="connectingOutlook"
              @click="connectOutlook"
            >
              {{ connectingOutlook ? 'Connecting...' : 'Connect Outlook Calendar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cal-settings {
  --bg: #0c0e14;
  --surface: #141720;
  --surface2: #1c2030;
  --surface3: #222840;
  --accent: #4f7eff;
  --green: #36d399;
  --yellow: #f9a825;
  --red: #ff6b6b;
  --purple: #9b6eff;
  --text: #e8eaf0;
  --muted: #6b7280;
  --border: rgba(255, 255, 255, 0.08);
  --border-hi: rgba(255, 255, 255, 0.14);
  --rs: 10px;

  display: flex;
  justify-content: center;
}

.cal-container {
  max-width: 760px;
  width: 100%;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
}

.page-desc {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

.toast-success {
  background: rgba(54, 211, 153, 0.12);
  border: 1px solid rgba(54, 211, 153, 0.3);
  color: var(--green);
  font-size: 13px;
  padding: 10px 14px;
  border-radius: var(--rs);
  margin-bottom: 16px;
}

.toast-error {
  background: rgba(255, 107, 107, 0.12);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: var(--red);
  font-size: 13px;
  padding: 10px 14px;
  border-radius: var(--rs);
  margin-bottom: 16px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Skeleton */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-card {
  height: 72px;
  background: var(--surface2);
  border-radius: var(--rs);
  animation: pulse 1.5s infinite;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 32px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
}

.empty-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 14px;
  color: var(--text);
  margin: 0 0 4px;
}

.empty-hint {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

/* Integration list */
.integration-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.integration-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  transition: border-color 0.15s;
}

.integration-card:hover {
  border-color: var(--border-hi);
}

.integration-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.badge-google {
  background: rgba(234, 67, 53, 0.15);
  color: #ea4335;
}

.badge-outlook {
  background: rgba(0, 120, 212, 0.15);
  color: #0078d4;
}

.integration-details {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.integration-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.integration-email {
  font-size: 12px;
  color: var(--muted);
}

.integration-sync {
  font-size: 11px;
  color: var(--muted);
}

.integration-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Toggle */
.toggle-btn {
  width: 38px;
  height: 20px;
  border-radius: 10px;
  border: none;
  background: var(--surface3);
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  padding: 0;
}

.toggle-btn.toggle-active {
  background: var(--green);
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text);
  transition: transform 0.2s;
}

.toggle-active .toggle-knob {
  transform: translateX(18px);
}

.disconnect-btn {
  background: none;
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: var(--red);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.disconnect-btn:hover {
  background: rgba(255, 107, 107, 0.1);
  border-color: var(--red);
}

/* Connect cards */
.connect-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 640px) {
  .connect-grid {
    grid-template-columns: 1fr;
  }
}

.connect-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.connect-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.provider-logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  flex-shrink: 0;
}

.google-logo {
  background: rgba(234, 67, 53, 0.15);
  color: #ea4335;
}

.outlook-logo {
  background: rgba(0, 120, 212, 0.15);
  color: #0078d4;
  font-size: 22px;
}

.connect-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 2px;
}

.connect-desc {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

.connect-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
}

.field-input {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}

.field-input:focus {
  border-color: var(--accent);
}

.field-input::placeholder {
  color: var(--muted);
  opacity: 0.6;
}

.connect-hint {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
  opacity: 0.8;
}

.connect-btn {
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.connect-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.google-btn {
  background: #ea4335;
  color: #fff;
}

.google-btn:hover:not(:disabled) {
  background: #d33426;
}

.outlook-btn {
  background: #0078d4;
  color: #fff;
}

.outlook-btn:hover:not(:disabled) {
  background: #006abc;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
