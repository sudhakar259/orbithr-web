<script setup lang="ts">
defineOptions({ name: 'RecruitmentInterviews' })
import { ref, computed, onMounted } from 'vue'
import { recruitmentService, calendarService, type Interview } from '@/services/recruitmentService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()
import AvailabilityGrid from '@/components/recruitment/AvailabilityGrid.vue'

const loading = ref(true)
const interviews = ref<Interview[]>([])
const error = ref('')
const filterStatus = ref('')
const showForm = ref(false)
const saving = ref(false)
const actionError = ref('')
const syncingId = ref<number | null>(null)
const calendarDropdownId = ref<number | null>(null)

const form = ref({
  application_id: undefined as number | undefined,
  title: '',
  interview_type: 'video',
  scheduled_at: '',
  duration_minutes: 60,
  location: '',
  meeting_link: '',
  interviewer_ids: [] as number[],
  sync_to_calendar: true,
})

// Computed date for the availability grid
const scheduledDate = computed(() => {
  if (!form.value.scheduled_at) return ''
  return form.value.scheduled_at.split('T')[0]
})

const showAvailabilityGrid = computed(
  () => form.value.interviewer_ids.length > 0 && scheduledDate.value !== '',
)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string> = {}
    if (filterStatus.value) params.status = filterStatus.value
    const res = await recruitmentService.getInterviews(params)
    interviews.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load interviews'
  } finally {
    loading.value = false
  }
}

const submitForm = async () => {
  saving.value = true
  actionError.value = ''
  try {
    await recruitmentService.createInterview(form.value)
    showForm.value = false
    form.value = {
      application_id: undefined,
      title: '',
      interview_type: 'video',
      scheduled_at: '',
      duration_minutes: 60,
      location: '',
      meeting_link: '',
      interviewer_ids: [],
      sync_to_calendar: true,
    }
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    actionError.value = err.response?.data?.message ?? 'Failed to schedule interview'
  } finally {
    saving.value = false
  }
}

const completeInterview = async (id: number) => {
  try {
    await recruitmentService.completeInterview(id)
    await load()
  } catch {
    error.value = 'Failed to mark interview complete'
  }
}

const cancelInterview = async (id: number) => {
  if (!(await dialog('Cancel Interview', 'Cancel this interview?'))) return
  try {
    await recruitmentService.cancelInterview(id, 'Cancelled by recruiter')
    await load()
  } catch {
    error.value = 'Failed to cancel interview'
  }
}

const syncToCalendar = async (iv: Interview) => {
  syncingId.value = iv.id
  try {
    await calendarService.createEvent(iv.id)
    iv.calendar_synced = true
  } catch {
    error.value = 'Failed to sync to calendar'
  } finally {
    syncingId.value = null
  }
}

const toggleCalendarDropdown = (id: number) => {
  calendarDropdownId.value = calendarDropdownId.value === id ? null : id
}

const addToGoogleCalendar = (iv: Interview) => {
  const start = new Date(iv.scheduled_at)
  const end = new Date(start.getTime() + iv.duration_minutes * 60000)
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(iv.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(iv.notes || '')}&location=${encodeURIComponent(iv.meeting_link || iv.location || '')}`
  window.open(url, '_blank')
  calendarDropdownId.value = null
}

const downloadIcs = (iv: Interview) => {
  window.open(calendarService.icsUrl(iv.id), '_blank')
  calendarDropdownId.value = null
}

const syncViaApi = async (iv: Interview) => {
  calendarDropdownId.value = null
  await syncToCalendar(iv)
}

const onSlotSelected = (datetime: string) => {
  form.value.scheduled_at = datetime.replace(':00', '').slice(0, 16)
}

const getStatusTone = (status: string) => {
  const map: Record<string, string> = {
    scheduled: 'accent',
    completed: 'ok',
    cancelled: 'danger',
    no_show: 'warn',
  }
  return map[status] ?? 'neutral'
}

const getTypeIcon = (type: string) => {
  const map: Record<string, string> = {
    video: '📹',
    phone: '📞',
    in_person: '🏢',
    technical: '💻',
    hr: '👤',
  }
  return map[type] ?? '📋'
}

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const isUpcoming = (iv: Interview) =>
  iv.status === 'scheduled' && new Date(iv.scheduled_at) > new Date()

onMounted(load)
</script>

<template>
  <div class="iv-page">
    <!-- Page header -->
    <div class="page-header">
      <div class="ph-text">
        <div class="ph-eyebrow">Interview pipeline</div>
        <h1 class="ph-title">Interviews</h1>
        <p class="ph-sub">
          Schedule, run and track interviews across rounds. Sync events to calendars and
          coordinate with interviewers.
        </p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filters">
        <select v-model="filterStatus" class="input select" @change="load">
          <option value="">All status</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No show</option>
        </select>
      </div>
      <button class="btn btn-primary btn-sm" @click="showForm = !showForm">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v12m6-6H6"
          />
        </svg>
        Schedule interview
      </button>
    </div>

    <!-- Schedule Form -->
    <div v-if="showForm" class="card form-card">
      <div class="form-head">Schedule interview</div>
      <div v-if="actionError" class="alert-error">{{ actionError }}</div>
      <div class="form-grid">
        <div class="field">
          <label>Application ID</label>
          <input
            v-model.number="form.application_id"
            type="number"
            class="input"
            placeholder="Enter application ID"
          />
        </div>
        <div class="field">
          <label>Title *</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="e.g. Technical Round 1"
            class="input"
          />
        </div>
        <div class="field">
          <label>Type</label>
          <select v-model="form.interview_type" class="input select">
            <option value="phone">Phone</option>
            <option value="video">Video</option>
            <option value="in_person">In Person</option>
            <option value="technical">Technical</option>
            <option value="hr">HR</option>
          </select>
        </div>
        <div class="field">
          <label>Scheduled at *</label>
          <input v-model="form.scheduled_at" type="datetime-local" class="input" />
        </div>
        <div class="field">
          <label>Duration (minutes)</label>
          <input
            v-model.number="form.duration_minutes"
            type="number"
            min="15"
            step="15"
            class="input"
          />
        </div>
        <div class="field">
          <label>Location / meeting link</label>
          <input
            v-model="form.meeting_link"
            type="text"
            placeholder="Zoom/Meet URL or office location"
            class="input"
          />
        </div>
      </div>

      <!-- Sync to Calendar checkbox -->
      <div class="checkbox-row">
        <input id="sync-cal" v-model="form.sync_to_calendar" type="checkbox" />
        <label for="sync-cal">📅 Sync to calendar</label>
      </div>

      <!-- Availability Grid -->
      <AvailabilityGrid
        v-if="showAvailabilityGrid"
        :interviewer-ids="form.interviewer_ids"
        :date="scheduledDate"
        :duration-minutes="form.duration_minutes"
        :model-value="form.scheduled_at"
        @update:model-value="onSlotSelected"
      />

      <div class="form-actions">
        <button class="btn btn-primary btn-sm" :disabled="saving" @click="submitForm">
          {{ saving ? 'Scheduling...' : 'Schedule' }}
        </button>
        <button class="btn btn-secondary btn-sm" @click="showForm = false">Cancel</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card skeleton-card">
      <div v-for="i in 4" :key="i" class="sk-line"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert-error">{{ error }}</div>

    <!-- Empty -->
    <div v-else-if="interviews.length === 0" class="card empty-state">
      <div class="empty-title">No interviews found.</div>
    </div>

    <!-- Interview List -->
    <div v-else class="iv-list">
      <div v-for="iv in interviews" :key="iv.id" class="iv-card">
        <div class="iv-row">
          <div class="iv-main">
            <span class="iv-icon">{{ getTypeIcon(iv.interview_type) }}</span>
            <div>
              <div class="iv-title-row">
                <h3 class="iv-title">{{ iv.title }}</h3>
                <span :class="['badge', `badge-${getStatusTone(iv.status)}`]">
                  {{ iv.status.replace('_', ' ') }}
                </span>
                <!-- Calendar sync badge -->
                <span v-if="iv.calendar_synced" class="badge badge-ok">📅 Synced</span>
                <span v-else-if="isUpcoming(iv)" class="badge badge-neutral">
                  📅 Not synced
                  <button
                    :disabled="syncingId === iv.id"
                    class="badge-link"
                    @click.stop="syncToCalendar(iv)"
                  >
                    {{ syncingId === iv.id ? '...' : 'Sync' }}
                  </button>
                </span>
              </div>
              <p class="iv-meta">
                {{ formatDateTime(iv.scheduled_at) }} · {{ iv.duration_minutes }}min
              </p>
              <p v-if="iv.meeting_link" class="iv-link">
                <a :href="iv.meeting_link" target="_blank" rel="noopener">
                  {{ iv.meeting_link }}
                </a>
              </p>
              <div v-if="iv.interviewers?.length" class="iv-interviewers">
                <span class="iv-label">Interviewers:</span>
                <span v-for="iw in iv.interviewers" :key="iw.id" class="iv-interviewer">
                  {{ iw.user?.name ?? `User ${iw.user_id}` }}
                </span>
              </div>
            </div>
          </div>
          <div class="iv-actions">
            <!-- Add to Calendar dropdown -->
            <div class="dropdown-wrap">
              <button
                class="btn btn-secondary btn-xs"
                title="Add to Calendar"
                @click="toggleCalendarDropdown(iv.id)"
              >
                📅
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div v-if="calendarDropdownId === iv.id" class="dropdown">
                <button class="dropdown-item" @click="addToGoogleCalendar(iv)">
                  Add to Google Calendar
                </button>
                <button class="dropdown-item" @click="downloadIcs(iv)">
                  Download .ics
                </button>
                <button class="dropdown-item" @click="syncViaApi(iv)">
                  Sync via API
                </button>
              </div>
            </div>
            <button
              v-if="iv.status === 'scheduled'"
              class="btn btn-success btn-xs"
              @click="completeInterview(iv.id)"
            >
              Mark complete
            </button>
            <button
              v-if="iv.status === 'scheduled'"
              class="btn btn-secondary btn-xs"
              @click="cancelInterview(iv.id)"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.iv-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #eef0f4;
}

/* Page header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}
.ph-eyebrow {
  font-size: 11px;
  font-weight: 500;
  color: #7a8299;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.ph-title {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: #eef0f4;
  margin: 0 0 6px;
  line-height: 1.1;
}
.ph-sub {
  font-size: 13px;
  color: #7a8299;
  margin: 0;
  max-width: 640px;
  line-height: 1.55;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Inputs */
.input {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 6px;
  color: #eef0f4;
  font-size: 12.5px;
  padding: 7px 10px;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
  width: 100%;
}
.input:focus {
  border-color: #6b5bff;
}
.input::placeholder {
  color: #7a8299;
}
.select {
  cursor: pointer;
  padding-right: 28px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A8299' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  padding: 7px 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  font-family: inherit;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-sm {
  padding: 7px 11px;
  font-size: 12px;
}
.btn-xs {
  padding: 5px 9px;
  font-size: 11px;
}
.btn-primary {
  background: #6b5bff;
  color: #fff;
  border-color: #6b5bff;
}
.btn-primary:hover {
  background: #7d6fff;
}
.btn-secondary {
  background: #161a23;
  color: #eef0f4;
  border-color: #232936;
}
.btn-secondary:hover {
  border-color: #2c3242;
  background: #1a1f2a;
}
.btn-success {
  background: #4dd39a;
  color: #0d0f17;
  border-color: #4dd39a;
}
.btn-success:hover {
  background: #5fdaa6;
}

/* Card */
.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
}

.skeleton-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-line {
  height: 64px;
  background: #1a1f2a;
  border-radius: 6px;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

.alert-error {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #f38288;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
}

.empty-state {
  padding: 56px 20px;
  text-align: center;
}
.empty-title {
  color: #7a8299;
  font-size: 13px;
}

/* Form card */
.form-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-head {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field label {
  font-size: 11.5px;
  font-weight: 500;
  color: #c8ccd6;
}
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #c8ccd6;
}
.checkbox-row input[type='checkbox'] {
  width: 14px;
  height: 14px;
  accent-color: #6b5bff;
}
.form-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

/* Interview list */
.iv-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.iv-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 16px 18px;
  transition: border-color 0.15s ease;
}
.iv-card:hover {
  border-color: #2c3242;
}
.iv-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.iv-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.iv-icon {
  font-size: 22px;
  line-height: 1;
  margin-top: 2px;
}
.iv-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.iv-title {
  font-size: 14px;
  font-weight: 600;
  color: #eef0f4;
  margin: 0;
}
.iv-meta {
  font-size: 12px;
  color: #7a8299;
  margin: 4px 0 0;
}
.iv-link {
  font-size: 11.5px;
  margin: 4px 0 0;
}
.iv-link a {
  color: #6b5bff;
  text-decoration: none;
}
.iv-link a:hover {
  color: #8a7dff;
  text-decoration: underline;
}
.iv-interviewers {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.iv-label {
  font-size: 11px;
  color: #7a8299;
}
.iv-interviewer {
  font-size: 11.5px;
  color: #c8ccd6;
}

.iv-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Dropdown */
.dropdown-wrap {
  position: relative;
}
.dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 4px;
  width: 200px;
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 20;
  padding: 4px;
}
.dropdown-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: #c8ccd6;
  font-size: 11.5px;
  padding: 7px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease;
}
.dropdown-item:hover {
  background: #1a1f2a;
  color: #eef0f4;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  border: 1px solid transparent;
  text-transform: capitalize;
}
.badge-ok {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}
.badge-warn {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.25);
}
.badge-danger {
  background: rgba(243, 130, 136, 0.12);
  color: #f38288;
  border-color: rgba(243, 130, 136, 0.25);
}
.badge-accent {
  background: rgba(107, 91, 255, 0.12);
  color: #9b8eff;
  border-color: rgba(107, 91, 255, 0.25);
}
.badge-neutral {
  background: #1a1f2a;
  color: #c8ccd6;
  border-color: #232936;
}
.badge-link {
  background: transparent;
  border: none;
  color: #6b5bff;
  font-size: 10.5px;
  cursor: pointer;
  margin-left: 4px;
  text-decoration: underline;
  font-family: inherit;
  padding: 0;
}
.badge-link:hover {
  color: #8a7dff;
}
</style>
