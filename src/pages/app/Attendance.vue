<script setup lang="ts">
defineOptions({ name: 'AttendancePage' })
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAttendance } from '@/composables/useAttendance'
import { useAuth } from '@/composables/useAuth'
import AttendanceCalendar from '@/components/attendance/AttendanceCalendar.vue'
import PunchModal from '@/components/attendance/PunchModal.vue'
import WorkStatusModal from '@/components/attendance/WorkStatusModal.vue'
import PunchLogModal from '@/components/attendance/PunchLogModal.vue'
import RegularizationModal from '@/components/attendance/RegularizationModal.vue'
import TimesheetExportModal from '@/components/attendance/TimesheetExportModal.vue'
import type { PunchPayload, AttendanceRecord } from '@/services/attendance'
import { regularizationService } from '@/services/regularization'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const { fetchCalendarData, fetchTodayAttendance, fetchWorkStatuses, recordPunch, records, leaves, summary, loading, error, todaysRecord } = useAttendance()
const { user } = useAuth()

const currentDate = ref(new Date())
const showPunchModal = ref(false)
const showWorkStatusModal = ref(false)
const showPunchLogModal = ref(false)
const showRegularizationModal = ref(false)
const showTimesheetModal = ref(false)
const selectedAttendance = ref<AttendanceRecord | null>(null)
const selectedAttendanceForRegularization = ref<AttendanceRecord | null>(null)
const punchLoading = ref(false)
const regularizationLoading = ref(false)

const isCurrentlyLoggedIn = computed(() => {
  if (!todaysRecord.value?.punch_logs || todaysRecord.value.punch_logs.length === 0) return false
  const lastPunch = todaysRecord.value.punch_logs[todaysRecord.value.punch_logs.length - 1]
  return lastPunch.type === 'check_in'
})

// ── Live timer ────────────────────────────────────────────────────────────────
const clockTick = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval>

const clockDisplay = computed(() => {
  if (isCurrentlyLoggedIn.value) {
    const logs = todaysRecord.value?.punch_logs ?? []
    const lastIn = [...logs].reverse().find(l => l.type === 'check_in')
    if (!lastIn) return { hm: '00:00', s: '00' }
    const elapsed = Math.max(0, Math.floor((clockTick.value - new Date(lastIn.timestamp).getTime()) / 1000))
    const h = Math.floor(elapsed / 3600)
    const m = Math.floor((elapsed % 3600) / 60)
    const s = elapsed % 60
    return { hm: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, s: String(s).padStart(2,'0') }
  }
  const wh = todaysRecord.value?.working_hours
  if (!wh) return { hm: '--:--', s: '--' }
  const h = Math.floor(wh)
  const m = Math.round((wh - h) * 60)
  return { hm: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, s: '00' }
})

// ── KPI strip ─────────────────────────────────────────────────────────────────
const kpiCards = computed(() => [
  { label: 'Present days',  value: String(summary.value?.present_days ?? 0),                             color: '#4DD39A' },
  { label: 'Late arrivals', value: String(summary.value?.late_days ?? 0),                                color: '#F5C16E' },
  { label: 'Absent days',   value: String(summary.value?.absent_days ?? 0),                              color: '#F38288' },
  { label: 'Working hours', value: Number(summary.value?.total_working_hours ?? 0).toFixed(0),           color: '#8979FF' },
])

const monthLabel = computed(() =>
  currentDate.value.toLocaleString('default', { month: 'long', year: 'numeric' })
)

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
  loadAttendance()
}

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
  loadAttendance()
}

const loadAttendance = async () => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth() + 1
  await fetchCalendarData(year, month, user.value?.employee?.id)
}

const loadTodayAttendance = async () => {
  await fetchTodayAttendance(user.value?.employee?.id)
}

const handlePunch = async (punchData: PunchPayload) => {
  punchLoading.value = true
  try {
    const payload: PunchPayload = {
      ...punchData,
      punch_type: punchData.punch_type,
      method: punchData.method || 'api',
      employee_id: user.value?.employee?.id,
    }
    await recordPunch(payload)
    showPunchModal.value = false
    await loadTodayAttendance()
  } catch {
    error.value = 'Failed to record punch. Please try again.'
  } finally {
    punchLoading.value = false
  }
}

const handleWorkStatus = async (punchData: PunchPayload) => {
  punchLoading.value = true
  try {
    const payload: PunchPayload = {
      attendance_date: punchData.attendance_date,
      timestamp: punchData.timestamp,
      punch_type: 'check_in',
      method: 'web',
      location: punchData.location,
      work_status: punchData.work_status,
      project: punchData.project,
      notes: punchData.notes,
      gps_coordinates: punchData.gps_coordinates,
      employee_id: user.value?.employee?.id,
    }
    await recordPunch(payload)
    showWorkStatusModal.value = false
    await loadTodayAttendance()
  } catch {
    // silently ignore
  } finally {
    punchLoading.value = false
  }
}

const punchType = ref<'check_in' | 'check_out'>('check_in')

const openCheckInModal = () => {
  if (isCurrentlyLoggedIn.value) {
    punchType.value = 'check_out'
    showPunchModal.value = true
  } else {
    showWorkStatusModal.value = true
  }
}

const handleDayClick = (attendance: AttendanceRecord | undefined) => {
  if (attendance && attendance.punch_logs && attendance.punch_logs.length > 0) {
    selectedAttendance.value = attendance
    showPunchLogModal.value = true
  }
}

const openRegularizationModal = (attendance: AttendanceRecord) => {
  selectedAttendanceForRegularization.value = attendance
  showRegularizationModal.value = true
}

const handleRegularizationSubmit = async (data: {
  attendance_id: number
  regularization_type: string
  reason: string
  notes?: string | null
  check_in?: string | null
  check_out?: string | null
  working_hours?: number | null
  overtime_hours?: number | null
}) => {
  regularizationLoading.value = true
  try {
    await regularizationService.createRequest({
      attendance_id: data.attendance_id,
      regularization_type: data.regularization_type,
      reason: data.reason,
      notes: data.notes,
      check_in: data.check_in,
      check_out: data.check_out,
      working_hours: data.working_hours,
      overtime_hours: data.overtime_hours,
    })
    showRegularizationModal.value = false
    selectedAttendanceForRegularization.value = null
    toast.success('Regularization request submitted successfully! Your manager and team lead will review it.')
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { error?: string } } }
    toast.error(axiosErr.response?.data?.error || 'Failed to submit regularization request')
  } finally {
    regularizationLoading.value = false
  }
}

const formatTime = (t?: string | null) => {
  if (!t) return '—'
  const ts = t.includes('T') ? t : `1970-01-01T${t}`
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

onMounted(() => {
  loadAttendance()
  loadTodayAttendance()
  fetchWorkStatuses()
  tickInterval = setInterval(() => { clockTick.value = Date.now() }, 1000)
})

onUnmounted(() => {
  clearInterval(tickInterval)
})
</script>

<template>
  <div class="att-page">

    <!-- Error banner -->
    <div v-if="error" class="alert-error">{{ error }}</div>

    <div class="att-layout">

      <!-- ── LEFT COLUMN ───────────────────────────────────────────────── -->
      <div class="att-left">

        <!-- KPI Strip -->
        <div class="kpi-strip">
          <div v-for="k in kpiCards" :key="k.label" class="kpi-card">
            <div class="kpi-label">{{ k.label }}</div>
            <div class="kpi-value" :style="{ color: k.color }">{{ k.value }}</div>
          </div>
        </div>

        <!-- Calendar Card -->
        <div class="cal-card">
          <div class="cal-card-head">
            <div class="cal-head-left">
              <span class="cal-month-title">{{ monthLabel }}</span>
              <div class="cal-nav-pair">
                <button class="nav-btn" :disabled="loading" @click="previousMonth">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button class="nav-btn" :disabled="loading" @click="nextMonth">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            <div class="cal-legend">
              <span v-for="[l, c] in [['Present','#4DD39A'],['Late','#F5C16E'],['Absent','#F38288'],['Leave','#8979FF']]" :key="l" class="leg-item">
                <i class="leg-dot" :style="{ background: c }"></i>{{ l }}
              </span>
            </div>
          </div>
          <div class="cal-card-body">
            <div v-if="loading && !records?.length" class="loading-state">
              <div class="spinner"></div>
              <span>Loading attendance data…</span>
            </div>
            <AttendanceCalendar
              v-else
              :current-date="currentDate"
              :attendance-data="records"
              :leaves="leaves"
              @day-clicked="handleDayClick"
              @regularize="openRegularizationModal"
            />
          </div>
        </div>

      </div>

      <!-- ── RIGHT RAIL ────────────────────────────────────────────────── -->
      <div class="att-right">

        <!-- Check-in Widget -->
        <div class="check-widget">
          <div class="check-widget-top">
            <div class="check-status-label">
              {{ isCurrentlyLoggedIn ? 'CURRENTLY WORKING' : todaysRecord?.check_in ? 'SHIFT ENDED' : 'NOT CHECKED IN' }}
            </div>
            <div class="check-timer">
              {{ clockDisplay.hm }}<span class="check-timer-s">:{{ clockDisplay.s }}</span>
            </div>
            <div class="check-since">
              <template v-if="isCurrentlyLoggedIn">Since {{ formatTime(todaysRecord?.check_in) }}</template>
              <template v-else-if="todaysRecord?.check_in">Today's total</template>
              <template v-else>&nbsp;</template>
            </div>
          </div>

          <div class="check-times-row" v-if="todaysRecord">
            <div class="check-time-chip" v-if="todaysRecord.check_in">
              <span class="ctc-label">IN</span>
              <span class="ctc-val">{{ formatTime(todaysRecord.check_in) }}</span>
            </div>
            <div class="check-time-chip" v-if="todaysRecord.check_out">
              <span class="ctc-label">OUT</span>
              <span class="ctc-val">{{ formatTime(todaysRecord.check_out) }}</span>
            </div>
            <div class="check-time-chip" v-if="todaysRecord.working_hours">
              <span class="ctc-label">HRS</span>
              <span class="ctc-val">{{ Number(todaysRecord.working_hours).toFixed(1) }}h</span>
            </div>
          </div>

          <button
            class="punch-big-btn"
            :class="isCurrentlyLoggedIn ? 'punch-big-btn--out' : 'punch-big-btn--in'"
            :disabled="loading || punchLoading"
            @click="openCheckInModal"
          >
            <div v-if="punchLoading" class="mini-spin btn-spin"></div>
            {{ isCurrentlyLoggedIn ? 'Check out' : 'Check in' }}
          </button>
        </div>

        <!-- Today's Status Details -->
        <div class="today-card" v-if="todaysRecord">
          <div class="today-card-head">Today's Record</div>
          <div class="today-fields">
            <div class="tf-row">
              <span class="tf-label">Status</span>
              <span class="tf-val tf-val--status" :class="`status--${todaysRecord.status}`">{{ todaysRecord.status || 'Pending' }}</span>
            </div>
            <div class="tf-row" v-if="todaysRecord.work_status || todaysRecord.daily_status">
              <span class="tf-label">Work mode</span>
              <span class="tf-val">{{ todaysRecord.work_status || todaysRecord.daily_status }}</span>
            </div>
            <div class="tf-row" v-if="todaysRecord.project">
              <span class="tf-label">Project</span>
              <span class="tf-val">{{ todaysRecord.project }}</span>
            </div>
            <div class="tf-row" v-if="todaysRecord.overtime_hours">
              <span class="tf-label">Overtime</span>
              <span class="tf-val" style="color: #F5C16E;">{{ Number(todaysRecord.overtime_hours).toFixed(1) }}h</span>
            </div>
            <div class="tf-row" v-if="todaysRecord.location">
              <span class="tf-label">Location</span>
              <span class="tf-val">{{ todaysRecord.location }}</span>
            </div>
          </div>
          <div v-if="todaysRecord.punch_logs?.length" class="today-log-btn" @click="selectedAttendance = todaysRecord; showPunchLogModal = true">
            View punch log ({{ todaysRecord.punch_logs.length }} entries)
          </div>
        </div>

        <!-- Timesheet Export -->
        <button class="timesheet-btn" @click="showTimesheetModal = true" :disabled="loading">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          Download Timesheet
        </button>

      </div>
    </div>

    <!-- Modals -->
    <PunchModal
      :show="showPunchModal"
      :punch-type="punchType"
      @close="showPunchModal = false"
      @punch="handlePunch"
    />
    <WorkStatusModal
      :show="showWorkStatusModal"
      @close="showWorkStatusModal = false"
      @punch="handleWorkStatus"
    />
    <PunchLogModal
      :show="showPunchLogModal"
      :attendance="selectedAttendance"
      @close="showPunchLogModal = false"
    />
    <RegularizationModal
      :show="showRegularizationModal"
      :attendance="selectedAttendanceForRegularization"
      @close="showRegularizationModal = false"
      @submit="handleRegularizationSubmit"
    />
    <TimesheetExportModal
      :show="showTimesheetModal"
      :current-month="currentDate.getMonth() + 1"
      :current-year="currentDate.getFullYear()"
      @close="showTimesheetModal = false"
    />
  </div>
</template>

<style scoped>
.att-page { display: flex; flex-direction: column; gap: 20px; }

.alert-error { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.3); color: #F38288; padding: 10px 14px; border-radius: 8px; font-size: 13px; }

/* ── two-column layout ───────────────────────────────────────────────────── */
.att-layout { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
.att-left  { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.att-right { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

/* ── KPI strip ───────────────────────────────────────────────────────────── */
.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi-card  { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px; }
.kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #7A8299; margin: 0; }
.kpi-value { font-family: 'Instrument Serif', Georgia, serif; font-size: 28px; letter-spacing: -0.02em; margin-top: 4px; font-variant-numeric: tabular-nums; line-height: 1; }

/* ── calendar card ───────────────────────────────────────────────────────── */
.cal-card { background: #161A23; border: 1px solid #232936; border-radius: 12px; overflow: hidden; }
.cal-card-head {
  padding: 14px 16px; display: flex; align-items: center;
  justify-content: space-between; border-bottom: 1px solid #232936;
  gap: 12px; flex-wrap: wrap;
}
.cal-head-left  { display: flex; align-items: center; gap: 10px; }
.cal-month-title { font-size: 13.5px; font-weight: 600; color: #EEF0F4; }
.cal-nav-pair { display: flex; gap: 3px; }
.nav-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 6px;
  background: #1C212C; border: 1px solid #232936; color: #7A8299;
  cursor: pointer; transition: color .15s, background .15s;
}
.nav-btn:hover:not(:disabled) { color: #EEF0F4; background: #232936; }
.nav-btn:disabled { opacity: .4; cursor: not-allowed; }
.cal-legend { display: flex; gap: 14px; font-size: 11px; flex-wrap: wrap; }
.leg-item { display: flex; align-items: center; gap: 5px; color: #7A8299; }
.leg-dot  { display: inline-block; width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.cal-card-body { padding: 16px; }
.loading-state { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 48px; color: #7A8299; font-size: 13px; }

/* ── check-in widget ─────────────────────────────────────────────────────── */
.check-widget {
  background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
}
.check-widget-top { text-align: center; }
.check-status-label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px; color: #7A8299; letter-spacing: .1em;
}
.check-timer {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 44px; color: #FAFBFC; letter-spacing: -0.02em;
  margin-top: 4px; font-variant-numeric: tabular-nums; line-height: 1;
}
.check-timer-s { font-size: 22px; color: #7A8299; }
.check-since { font-size: 11px; color: #7A8299; margin-top: 4px; }

.check-times-row { display: flex; gap: 8px; }
.check-time-chip {
  flex: 1; background: #1C212C; border: 1px solid #232936;
  border-radius: 7px; padding: 8px 10px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.ctc-label { font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #7A8299; }
.ctc-val   { font-size: 12px; font-weight: 500; color: #EEF0F4; }

.punch-big-btn {
  width: 100%; height: 44px; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: opacity .15s;
}
.punch-big-btn:disabled { opacity: .55; cursor: not-allowed; }
.punch-big-btn--in {
  background: linear-gradient(180deg, #4DD39A, #36C487);
  color: #0a1a0a; border: 1px solid rgba(77,211,154,.5);
  box-shadow: 0 1px 0 rgba(255,255,255,.18) inset, 0 4px 14px rgba(77,211,154,.2);
}
.punch-big-btn--out {
  background: linear-gradient(180deg, #F38288, #E5484D);
  color: #fff; border: 1px solid rgba(229,72,77,.5);
  box-shadow: 0 1px 0 rgba(255,255,255,.18) inset, 0 4px 14px rgba(229,72,77,.25);
}

/* ── today's record card ─────────────────────────────────────────────────── */
.today-card { background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.today-card-head { font-size: 13px; font-weight: 600; color: #EEF0F4; }
.today-fields { display: flex; flex-direction: column; gap: 8px; }
.tf-row { display: flex; align-items: center; justify-content: space-between; }
.tf-label { font-size: 11px; color: #7A8299; font-weight: 500; }
.tf-val   { font-size: 12px; color: #EEF0F4; font-weight: 500; text-align: right; }
.tf-val--status { text-transform: capitalize; }
.status--present { color: #4DD39A; }
.status--late    { color: #F5C16E; }
.status--absent  { color: #F38288; }
.status--leave   { color: #8979FF; }
.today-log-btn {
  font-size: 11px; color: #6B5BFF; cursor: pointer; padding-top: 4px;
  border-top: 1px solid #232936; text-align: center;
  transition: color .15s;
}
.today-log-btn:hover { color: #8979FF; }

/* ── timesheet button ────────────────────────────────────────────────────── */
.timesheet-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 16px; font-size: 13px; font-weight: 500;
  background: #1C212C; border: 1px solid #232936; color: #7A8299;
  border-radius: 8px; cursor: pointer; transition: color .15s, border-color .15s, background .15s;
}
.timesheet-btn:hover:not(:disabled) { color: #EEF0F4; border-color: #6B5BFF; background: rgba(107,91,255,.08); }
.timesheet-btn:disabled { opacity: .4; cursor: not-allowed; }

/* ── shared ──────────────────────────────────────────────────────────────── */
.spinner   { width: 24px; height: 24px; border: 2.5px solid rgba(107,91,255,.2); border-top-color: #6B5BFF; border-radius: 50%; animation: spin .8s linear infinite; }
.mini-spin { width: 13px; height: 13px; flex-shrink: 0; border: 2px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
.btn-spin  { border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .att-layout { grid-template-columns: 1fr; }
  .att-right  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .check-widget { grid-column: span 2; }
}
@media (max-width: 640px) {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .att-right { grid-template-columns: 1fr; }
  .check-widget { grid-column: span 1; }
}
</style>
