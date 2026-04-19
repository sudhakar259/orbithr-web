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
  if (!await dialog('Cancel Interview', 'Cancel this interview?')) return
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

const getStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-900/50 text-blue-400',
    completed: 'bg-green-900/50 text-green-400',
    cancelled: 'bg-red-900/50 text-red-400',
    no_show: 'bg-yellow-900/50 text-yellow-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <select
          v-model="filterStatus"
          @change="load"
          class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>
      <button
        @click="showForm = !showForm"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Schedule Interview
      </button>
    </div>

    <!-- Schedule Form -->
    <div v-if="showForm" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Schedule Interview
      </h3>
      <div v-if="actionError" class="bg-red-900/30 border border-red-700 rounded-lg p-3">
        <p class="text-sm text-red-400">{{ actionError }}</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Application ID</label>
          <input
            v-model.number="form.application_id"
            type="number"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
            placeholder="Enter application ID"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Title *</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="e.g. Technical Round 1"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Type</label>
          <select
            v-model="form.interview_type"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          >
            <option value="phone">Phone</option>
            <option value="video">Video</option>
            <option value="in_person">In Person</option>
            <option value="technical">Technical</option>
            <option value="hr">HR</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Scheduled At *</label>
          <input
            v-model="form.scheduled_at"
            type="datetime-local"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Duration (minutes)</label>
          <input
            v-model.number="form.duration_minutes"
            type="number"
            min="15"
            step="15"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1"
            >Location / Meeting Link</label
          >
          <input
            v-model="form.meeting_link"
            type="text"
            placeholder="Zoom/Meet URL or office location"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <!-- Sync to Calendar checkbox -->
      <div class="flex items-center gap-2">
        <input
          id="sync-cal"
          v-model="form.sync_to_calendar"
          type="checkbox"
          class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
        />
        <label for="sync-cal" class="text-sm text-gray-300 flex items-center gap-1.5">
          <span>📅</span> Sync to Calendar
        </label>
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

      <div class="flex gap-3">
        <button
          @click="submitForm"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {{ saving ? 'Scheduling...' : 'Schedule' }}
        </button>
        <button
          @click="showForm = false"
          class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-16 bg-gray-700 rounded"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Empty -->
    <div
      v-else-if="interviews.length === 0"
      class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center"
    >
      <p class="text-gray-500">No interviews found.</p>
    </div>

    <!-- Interview List -->
    <div v-else class="space-y-3">
      <div
        v-for="iv in interviews"
        :key="iv.id"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <span class="text-2xl">{{ getTypeIcon(iv.interview_type) }}</span>
            <div>
              <div class="flex items-center gap-3">
                <h3 class="text-base font-semibold text-white">{{ iv.title }}</h3>
                <span
                  :class="[
                    'inline-flex px-2 py-0.5 text-xs font-semibold rounded-full',
                    getStatusClasses(iv.status),
                  ]"
                >
                  {{ iv.status.replace('_', ' ') }}
                </span>
                <!-- Calendar sync badge -->
                <span
                  v-if="iv.calendar_synced"
                  class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-900/40 text-green-400"
                >
                  📅 Synced
                </span>
                <span
                  v-else-if="isUpcoming(iv)"
                  class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-400"
                >
                  📅 Not synced
                  <button
                    @click.stop="syncToCalendar(iv)"
                    :disabled="syncingId === iv.id"
                    class="ml-1 text-blue-400 hover:text-blue-300 underline text-xs"
                  >
                    {{ syncingId === iv.id ? '...' : 'Sync' }}
                  </button>
                </span>
              </div>
              <p class="text-sm text-gray-400 mt-0.5">
                {{ formatDateTime(iv.scheduled_at) }} · {{ iv.duration_minutes }}min
              </p>
              <p v-if="iv.meeting_link" class="text-xs text-blue-400 mt-0.5">
                <a :href="iv.meeting_link" target="_blank" rel="noopener">{{
                  iv.meeting_link
                }}</a>
              </p>
              <div v-if="iv.interviewers?.length" class="flex items-center gap-1 mt-1">
                <span class="text-xs text-gray-500">Interviewers:</span>
                <span
                  v-for="iw in iv.interviewers"
                  :key="iw.id"
                  class="text-xs text-gray-300"
                  >{{ iw.user?.name ?? `User ${iw.user_id}` }}</span
                >
              </div>
            </div>
          </div>
          <div class="flex gap-2 items-center">
            <!-- Add to Calendar dropdown -->
            <div class="relative">
              <button
                @click="toggleCalendarDropdown(iv.id)"
                class="px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors inline-flex items-center gap-1"
                title="Add to Calendar"
              >
                📅
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                v-if="calendarDropdownId === iv.id"
                class="absolute right-0 top-full mt-1 w-52 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 py-1"
              >
                <button
                  @click="addToGoogleCalendar(iv)"
                  class="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Add to Google Calendar
                </button>
                <button
                  @click="downloadIcs(iv)"
                  class="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Download .ics
                </button>
                <button
                  @click="syncViaApi(iv)"
                  class="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Sync via API
                </button>
              </div>
            </div>
            <button
              v-if="iv.status === 'scheduled'"
              @click="completeInterview(iv.id)"
              class="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              Mark Complete
            </button>
            <button
              v-if="iv.status === 'scheduled'"
              @click="cancelInterview(iv.id)"
              class="px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
