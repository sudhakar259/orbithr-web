<script setup lang="ts">
defineOptions({ name: 'EssAttendance' })
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { attendanceService, type AttendanceRecord } from '@/services/attendance'
import { regularizationService, type RegularizationRequest } from '@/services/regularization'
import { leaveService, type LeaveType, type LeaveRequest } from '@/services/leave'
import { useAuth } from '@/composables/useAuth'
import api from '@/services/api'

const { getUser, hasRole, hasPermission } = useAuth()

const isPrivileged = computed(() =>
  hasRole('admin') || hasRole('hr_manager') || hasRole('Super Admin') || hasPermission('attendance.records.manage')
)
const isTeamLead = computed(() => isPrivileged.value || hasRole('manager') || hasRole('team_lead'))
const isAdmin = computed(() => hasRole('admin') || hasRole('hr_manager'))

// ── Top-level view tabs ───────────────────────────────────────────────────────
const mainTab = ref<'calendar' | 'team' | 'staff'>('calendar')

// ── Month navigation ─────────────────────────────────────────────────────────
const today = new Date()
const viewYear  = ref(today.getFullYear())
const viewMonth = ref(today.getMonth() + 1)

const todayStr = today.toISOString().split('T')[0]

function prevMonth() {
  if (viewMonth.value === 1) { viewMonth.value = 12; viewYear.value-- }
  else viewMonth.value--
  loadCalendar()
}
function nextMonth() {
  if (viewMonth.value === 12) { viewMonth.value = 1; viewYear.value++ }
  else viewMonth.value++
  loadCalendar()
}

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)

// ── My calendar data ──────────────────────────────────────────────────────────
const calLoading = ref(false)
const calError   = ref('')
const attendanceMap = ref<Record<string, AttendanceRecord>>({})
const leaveMap      = ref<Record<string, string>>({})
const summary = ref({ total_days: 0, present_days: 0, absent_days: 0, late_days: 0, leave_days: 0 })

async function loadCalendar() {
  calLoading.value = true
  calError.value   = ''
  try {
    const cal = await attendanceService.getCalendarData(viewYear.value, viewMonth.value)
    const aMap: Record<string, AttendanceRecord> = {}
    cal.records.forEach(r => { aMap[r.attendance_date] = r })
    attendanceMap.value = aMap

    const lMap: Record<string, string> = {}
    if (Array.isArray(cal.leaves)) {
      cal.leaves.forEach((l: Record<string, unknown>) => {
        const start = l['start_date'] as string | undefined
        const end   = l['end_date']   as string | undefined
        const name  = (l['leave_type_name'] as string | undefined) ?? 'Leave'
        if (start && end) {
          const cur = new Date(start)
          const fin = new Date(end)
          while (cur <= fin) {
            lMap[cur.toISOString().split('T')[0]] = name
            cur.setDate(cur.getDate() + 1)
          }
        }
      })
    }
    leaveMap.value = lMap

    const s = cal.summary
    summary.value = {
      total_days:   s.present_days + s.absent_days + (s.leave_days ?? 0),
      present_days: s.present_days,
      absent_days:  s.absent_days,
      late_days:    s.late_days,
      leave_days:   s.leave_days ?? 0,
    }
  } catch {
    calError.value = 'Failed to load attendance data'
  } finally {
    calLoading.value = false
  }
}

// ── Calendar grid ─────────────────────────────────────────────────────────────
const calCells = computed(() => {
  const firstDay = new Date(viewYear.value, viewMonth.value - 1, 1).getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length < 42) cells.push(null)
  return cells
})

function dateStr(day: number) {
  return `${viewYear.value}-${String(viewMonth.value).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function cellStatus(day: number): string {
  const d = dateStr(day)
  if (leaveMap.value[d]) return 'leave'
  const rec = attendanceMap.value[d]
  if (!rec) return 'none'
  if (rec.is_regularized) return 'regularized'
  return rec.status ?? 'none'
}

function isToday(day: number) { return dateStr(day) === todayStr }
function isFuture(day: number) { return dateStr(day) > todayStr }

function isWeekendDay(day: number): boolean {
  const dow = new Date(viewYear.value, viewMonth.value - 1, day).getDay()
  return dow === 0 || dow === 6
}


function cellClass2(day: number): string {
  if (isToday(day)) return 'cell2--today'
  if (isWeekendDay(day)) return 'cell2--weekend'
  if (isFuture(day)) return 'cell2--future'
  const s = cellStatus(day)
  if (s === 'none') return ''
  return `cell2--${s}`
}

function statusDotColor(status: string): string {
  const colors: Record<string, string> = {
    present: '#4DD39A', late: '#F5C16E', absent: '#F38288',
    leave: '#8979FF', holiday: '#7ED7FF', half_day: '#8979FF',
    regularized: '#9B6EFF',
  }
  return colors[status] ?? '#6B7280'
}

function statusCode(status: string): string {
  const codes: Record<string, string> = {
    present: 'P', late: 'L', absent: 'A', leave: 'LV',
    holiday: 'H', half_day: 'HD', regularized: 'R',
  }
  return codes[status] ?? ''
}

// ── Click handler ─────────────────────────────────────────────────────────────
function onDayClick(day: number | null) {
  if (!day) return
  const d = dateStr(day)
  if (d > todayStr) {
    openLeaveModal(d, d)
  } else {
    openRegModal(d)
  }
}

// ── Regularization modal ──────────────────────────────────────────────────────
const regModal      = ref(false)
const regForm       = ref({ date: '', regularization_type: '', check_in: '', check_out: '', reason: '', notes: '' })
const regRecord     = ref<AttendanceRecord | null>(null)
const regLookup     = ref(false)
const regLookupDone = ref(false)
const regSubmitting = ref(false)
const regError      = ref('')
const regBlocked    = ref('')

// ── Punch ─────────────────────────────────────────────────────────────────
const todayRecord   = ref<AttendanceRecord | null>(null)
const punchLoading  = ref(false)
const punchError    = ref('')
const punchSuccess  = ref('')

async function loadToday() {
  try { todayRecord.value = await attendanceService.getTodayAttendance() }
  catch { todayRecord.value = null }
}

const isPunchedIn = computed(() => {
  const logs = todayRecord.value?.punch_logs
  if (!logs?.length) return false
  return logs[logs.length - 1].type === 'check_in'
})

async function doPunch() {
  punchLoading.value = true
  punchError.value   = ''
  punchSuccess.value = ''
  const now  = new Date()
  const type = isPunchedIn.value ? 'check_out' : 'check_in'
  try {
    todayRecord.value = await attendanceService.recordPunch({
      attendance_date: now.toISOString().split('T')[0],
      timestamp:       now.toISOString(),
      punch_type:      type,
    })
    punchSuccess.value = type === 'check_in' ? 'Checked in!' : 'Checked out!'
    await loadCalendar()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string; message?: string } } }
    punchError.value = e.response?.data?.error || e.response?.data?.message || 'Punch failed'
  } finally {
    punchLoading.value = false
  }
}

// ── Live timer ────────────────────────────────────────────────────────────────
const clockTick = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval>

const clockDisplay = computed(() => {
  if (isPunchedIn.value) {
    const logs = todayRecord.value?.punch_logs ?? []
    const lastIn = [...logs].reverse().find(l => l.type === 'check_in')
    if (!lastIn) return { hm: '00:00', s: '00' }
    const elapsed = Math.max(0, Math.floor((clockTick.value - new Date(lastIn.timestamp).getTime()) / 1000))
    const h = Math.floor(elapsed / 3600)
    const m = Math.floor((elapsed % 3600) / 60)
    const s = elapsed % 60
    return { hm: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, s: String(s).padStart(2,'0') }
  }
  const wh = todayRecord.value?.working_hours
  if (!wh) return { hm: '--:--', s: '--' }
  const h = Math.floor(wh)
  const m = Math.round((wh - h) * 60)
  return { hm: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, s: '00' }
})

// ── KPI cards ─────────────────────────────────────────────────────────────────
const kpiCards = computed(() => [
  { label: 'Present days',  value: String(summary.value.present_days), color: '#4DD39A' },
  { label: 'Late arrivals', value: String(summary.value.late_days),    color: '#F5C16E' },
  { label: 'Absent days',   value: String(summary.value.absent_days),  color: '#F38288' },
  { label: 'Leave days',    value: String(summary.value.leave_days),   color: '#8979FF' },
])

// ── Today's log ───────────────────────────────────────────────────────────────
const todayLog = computed(() => {
  const logs = todayRecord.value?.punch_logs ?? []
  return logs.map(l => ({
    time:  formatTime(l.timestamp),
    label: l.type === 'check_in' ? 'Check in' : 'Check out',
    tone:  l.type === 'check_in' ? '#4DD39A' : '#F38288',
  }))
})

// ── My pending regularizations (right rail) ───────────────────────────────────
const myRegRequests = ref<RegularizationRequest[]>([])

async function loadMyRegs() {
  try {
    const res = await regularizationService.getMyRequests({ status: 'pending', per_page: 5 })
    myRegRequests.value = (res.data as RegularizationRequest[]) ?? []
  } catch {
    myRegRequests.value = []
  }
}

// ── All Staff (admin/hr) ──────────────────────────────────────────────────
const staffLoading  = ref(false)
const staffError    = ref('')
const staffRecords  = ref<Array<{ employee: { id: string; full_name: string; employee_id: string }; records: AttendanceRecord[] }>>([])

async function loadStaffAttendance() {
  if (!isAdmin.value) return
  staffLoading.value = true
  staffError.value   = ''
  try {
    const res = await api.get('/attendance/records', {
      params: { year: viewYear.value, month: viewMonth.value, include_summary: true, per_page: 100 },
    })
    const raw = res.data?.data ?? res.data ?? []
    const map: Record<string, typeof staffRecords.value[0]> = {}
    const records: AttendanceRecord[] = Array.isArray(raw) ? raw : (raw.records ?? [])
    records.forEach((r: AttendanceRecord & { employee?: { id: string; full_name: string; employee_id: string } }) => {
      const empId = String(r.employee_id)
      if (!map[empId]) {
        map[empId] = {
          employee: r.employee ?? { id: empId, full_name: empId, employee_id: empId },
          records:  [],
        }
      }
      map[empId].records.push(r)
    })
    staffRecords.value = Object.values(map)
  } catch {
    staffError.value = 'Failed to load staff attendance'
  } finally {
    staffLoading.value = false
  }
}

async function openRegModal(date: string) {
  regForm.value = { date, regularization_type: '', check_in: '', check_out: '', reason: '', notes: '' }
  regRecord.value     = null
  regLookupDone.value = false
  regError.value      = ''
  regBlocked.value    = ''
  regModal.value      = true
  regLookup.value     = true
  try {
    const res = await attendanceService.getAttendanceRecords({ start_date: date, end_date: date })
    regRecord.value = res.records?.[0] ?? null
    if (regRecord.value?.is_regularized && !isPrivileged.value) {
      regBlocked.value = 'This attendance has already been regularized. Contact HR or an admin to make further changes.'
    }
  } catch {
    regRecord.value = null
  } finally {
    regLookup.value     = false
    regLookupDone.value = true
  }
}

const regCanSubmit = computed(() =>
  !!regRecord.value &&
  !regBlocked.value &&
  !!regForm.value.regularization_type &&
  regForm.value.reason.length >= 10
)

async function submitReg() {
  if (!regCanSubmit.value || !regRecord.value) return
  regSubmitting.value = true
  regError.value = ''
  try {
    await regularizationService.createRequest({
      attendance_id:       regRecord.value.id,
      regularization_type: regForm.value.regularization_type,
      reason:              regForm.value.reason,
      notes:               regForm.value.notes || null,
      check_in:            regForm.value.check_in || null,
      check_out:           regForm.value.check_out || null,
    })
    regModal.value = false
    await loadCalendar()
    if (isTeamLead.value) loadTeamData()
    loadMyRegs()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string; message?: string } } }
    regError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to submit request'
  } finally {
    regSubmitting.value = false
  }
}

// ── Leave request modal ───────────────────────────────────────────────────────
const leaveModal    = ref(false)
const leaveTypes    = ref<LeaveType[]>([])
const leaveBalances = ref<Record<number, number>>({})
const leaveForm     = ref({
  start_date: '', end_date: '',
  leave_type_id: 0,
  leave_period: 'full_day' as 'full_day' | 'half_day_morning' | 'half_day_afternoon',
  reason: '',
})
const leaveSubmitting = ref(false)
const leaveError      = ref('')
const leaveSuccess    = ref(false)

async function openLeaveModal(start: string, end: string) {
  leaveForm.value = { start_date: start, end_date: end, leave_type_id: 0, leave_period: 'full_day', reason: '' }
  leaveError.value   = ''
  leaveSuccess.value = false
  leaveModal.value   = true
  if (!leaveTypes.value.length) {
    try { leaveTypes.value = await leaveService.getLeaveTypes({ active_only: true }) }
    catch { leaveTypes.value = [] }
  }
  try {
    const res = await leaveService['getMyLeaveBalances']?.() ?? { data: [] }
    const balArr: Array<{ leave_type_id?: number; available?: number }> = Array.isArray(res) ? res : (res as Record<string, unknown[]>)?.data ?? []
    const map: Record<number, number> = {}
    balArr.forEach(b => { if (b.leave_type_id) map[b.leave_type_id] = b.available ?? 0 })
    leaveBalances.value = map
  } catch { leaveBalances.value = {} }
}

const selectedTypeBalance = computed(() => {
  if (!leaveForm.value.leave_type_id) return null
  const b = leaveBalances.value[leaveForm.value.leave_type_id]
  return b !== undefined ? b : null
})

const leaveCanSubmit = computed(() =>
  !!leaveForm.value.leave_type_id && !!leaveForm.value.start_date &&
  !!leaveForm.value.end_date && leaveForm.value.reason.length >= 5
)

async function submitLeave() {
  if (!leaveCanSubmit.value) return
  leaveSubmitting.value = true
  leaveError.value = ''
  try {
    const user = getUser()
    const employeeId = (user?.employee_id as number) || (user?.id as number)
    await leaveService.createLeaveRequest({
      employee_id:   Number(employeeId),
      leave_type_id: leaveForm.value.leave_type_id,
      start_date:    leaveForm.value.start_date,
      end_date:      leaveForm.value.end_date,
      leave_period:  leaveForm.value.leave_period,
      reason:        leaveForm.value.reason,
    })
    leaveSuccess.value = true
    setTimeout(() => { leaveModal.value = false; loadCalendar() }, 1200)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string; message?: string } } }
    leaveError.value = e.response?.data?.error || e.response?.data?.message || 'Failed to apply leave'
  } finally {
    leaveSubmitting.value = false
  }
}

// ── Team data (manager / team_lead) ──────────────────────────────────────────
const teamTab          = ref<'regularizations' | 'leaves'>('regularizations')
const teamLoading      = ref(false)
const teamError        = ref('')
const teamRegRequests  = ref<RegularizationRequest[]>([])
const teamLeaveRequests = ref<LeaveRequest[]>([])

const pendingRegCount  = computed(() => teamRegRequests.value.filter(r => r.status === 'pending').length)
const pendingLeaveCount = computed(() => teamLeaveRequests.value.filter(r => r.status === 'pending').length)

async function loadTeamData() {
  if (!isTeamLead.value) return
  teamLoading.value = true
  teamError.value   = ''
  try {
    const [regRes, leaveRes] = await Promise.allSettled([
      regularizationService.getPendingRequests(),
      api.get('/leave-requests', { params: { per_page: 50 } }),
    ])
    if (regRes.status === 'fulfilled') {
      teamRegRequests.value = (regRes.value.data as RegularizationRequest[]) || []
    }
    if (leaveRes.status === 'fulfilled') {
      const d = leaveRes.value.data
      teamLeaveRequests.value = (d?.data ?? d ?? []) as LeaveRequest[]
    }
  } catch {
    teamError.value = 'Failed to load team data'
  } finally {
    teamLoading.value = false
  }
}

// ── Approve / Reject regularization ──────────────────────────────────────────
const actionLoading = ref<string | null>(null)
const approveNotes  = ref<Record<string, string>>({})

async function approveReg(id: number) {
  actionLoading.value = `reg-${id}`
  try {
    await regularizationService.approveRequest(id, { approval_notes: approveNotes.value[id] || null })
    await loadTeamData()
  } catch { /* ignore */ }
  finally { actionLoading.value = null }
}

async function rejectReg(id: number) {
  const notes = approveNotes.value[id]
  if (!notes?.trim()) { approveNotes.value[id] = ''; return }
  actionLoading.value = `reg-${id}`
  try {
    await regularizationService.rejectRequest(id, { approval_notes: notes })
    await loadTeamData()
  } catch { /* ignore */ }
  finally { actionLoading.value = null }
}

// ── Approve / Reject leave ────────────────────────────────────────────────────
async function approveLeave(id: number) {
  actionLoading.value = `leave-${id}`
  try {
    await api.post(`/leave-requests/${id}/approve`, {})
    await loadTeamData()
  } catch { /* ignore */ }
  finally { actionLoading.value = null }
}

async function rejectLeave(id: number) {
  actionLoading.value = `leave-${id}`
  try {
    await api.post(`/leave-requests/${id}/reject`, { rejection_reason: 'Rejected by manager' })
    await loadTeamData()
  } catch { /* ignore */ }
  finally { actionLoading.value = null }
}

// ── Formatters ────────────────────────────────────────────────────────────────
const formatTime = (t?: string | null) => {
  if (!t) return '—'
  const ts = t.includes('T') ? t : `1970-01-01T${t}`
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const formatDate = (d?: string | null) => d
  ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—'

const REG_TYPES: Record<string, string> = {
  forgot_punch:    'Forgot to Punch',
  system_error:    'System Error',
  late_arrival:    'Late Arrival',
  early_departure: 'Early Departure',
  work_from_home:  'Work from Home',
  official_work:   'Official Work',
  other:           'Other',
}

onMounted(() => {
  loadCalendar()
  loadToday()
  loadTeamData()
  loadMyRegs()
  if (isAdmin.value) loadStaffAttendance()
  tickInterval = setInterval(() => { clockTick.value = Date.now() }, 1000)
})

onUnmounted(() => {
  clearInterval(tickInterval)
})
</script>

<template>
  <div class="ess-att">

    <!-- ── Main tab switcher ────────────────────────────────────────────────── -->
    <div class="main-tabs" v-if="isTeamLead">
      <button :class="['mtab', mainTab === 'calendar' && 'mtab--active']" @click="mainTab = 'calendar'">
        My Calendar
      </button>
      <button :class="['mtab', mainTab === 'team' && 'mtab--active']" @click="mainTab = 'team'; loadTeamData()">
        My Team
        <span v-if="pendingRegCount + pendingLeaveCount > 0" class="mtab-badge">
          {{ pendingRegCount + pendingLeaveCount }}
        </span>
      </button>
      <button v-if="isAdmin" :class="['mtab', mainTab === 'staff' && 'mtab--active']" @click="mainTab = 'staff'; loadStaffAttendance()">
        All Staff
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- MY CALENDAR TAB                                                      -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <template v-if="mainTab === 'calendar'">

      <div v-if="calError" class="alert-error">{{ calError }}</div>

      <div class="att-layout">

        <!-- ── LEFT COLUMN ─────────────────────────────────────────────── -->
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
            <!-- Header: month nav + legend -->
            <div class="cal-card-head">
              <div class="cal-head-left">
                <span class="cal-month-title">{{ monthLabel }}</span>
                <div class="cal-nav-pair">
                  <button class="nav-btn" @click="prevMonth">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <button class="nav-btn" @click="nextMonth">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
              </div>
              <div class="cal-legend2">
                <span v-for="[l, c] in [['P','#4DD39A'],['L','#F5C16E'],['A','#F38288'],['LV','#8979FF'],['WFH','#7ED7FF']]" :key="l" class="leg2-item">
                  <i class="leg2-dot" :style="{ background: c }"></i>{{ l }}
                </span>
              </div>
            </div>

            <!-- Day labels + Grid -->
            <div class="cal-card-body">
              <div class="cal-dows">
                <div v-for="d in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="d" class="cal-dow2">{{ d }}</div>
              </div>
              <div :class="['cal-grid2', calLoading && 'cal-loading']">
                <template v-if="calLoading">
                  <div v-for="i in 35" :key="i" class="cal-cell2 cal-skel"></div>
                </template>
                <template v-else>
                  <div
                    v-for="(day, idx) in calCells"
                    :key="idx"
                    :class="['cal-cell2', day ? cellClass2(day) : 'cell2--empty']"
                    @click="day ? onDayClick(day) : undefined"
                  >
                    <template v-if="day">
                      <div class="cell2-day" :class="isToday(day) && 'cell2-day--today'">{{ day }}</div>
                      <template v-if="isToday(day)">
                        <div class="cell2-today-badge">TODAY</div>
                      </template>
                      <template v-else-if="!isWeekendDay(day) && !isFuture(day)">
                        <div class="cell2-status">
                          <div class="cell2-dot" :style="{ background: statusDotColor(leaveMap[dateStr(day)] ? 'leave' : cellStatus(day)) }"></div>
                          <span class="cell2-code">{{ leaveMap[dateStr(day)] ? 'LV' : statusCode(cellStatus(day)) }}</span>
                        </div>
                      </template>
                    </template>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Today's log -->
          <div class="todays-log-card" v-if="todayLog.length > 0">
            <div class="log-head">
              <span class="log-title">Today's Activity</span>
              <span class="log-date">{{ new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }}</span>
            </div>
            <div class="log-timeline">
              <div v-for="(item, i) in todayLog" :key="i" class="log-row">
                <div class="log-time">{{ item.time }}</div>
                <div class="log-spine">
                  <div v-if="i < todayLog.length - 1" class="log-line"></div>
                  <div class="log-dot" :style="{ background: item.tone }"></div>
                </div>
                <div class="log-content" :style="{ paddingBottom: i < todayLog.length - 1 ? '14px' : '0' }">
                  <div class="log-event">{{ item.label }}</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ── RIGHT RAIL ──────────────────────────────────────────────── -->
        <div class="att-right">

          <!-- Check-in Widget -->
          <div class="check-widget">
            <div class="check-widget-top">
              <div class="check-status-label">
                {{ isPunchedIn ? 'CURRENTLY WORKING' : todayRecord?.check_in ? 'SHIFT ENDED' : 'NOT CHECKED IN' }}
              </div>
              <div class="check-timer">
                {{ clockDisplay.hm }}<span class="check-timer-s">:{{ clockDisplay.s }}</span>
              </div>
              <div class="check-since">
                <template v-if="isPunchedIn">Since {{ formatTime(todayRecord?.check_in) }}</template>
                <template v-else-if="todayRecord?.check_in">Today's total</template>
                <template v-else>&nbsp;</template>
              </div>
            </div>

            <div class="check-times-row" v-if="todayRecord?.check_in">
              <div class="check-time-chip">
                <span class="ctc-label">IN</span>
                <span class="ctc-val">{{ formatTime(todayRecord?.check_in) }}</span>
              </div>
              <div class="check-time-chip" v-if="todayRecord?.check_out">
                <span class="ctc-label">OUT</span>
                <span class="ctc-val">{{ formatTime(todayRecord?.check_out) }}</span>
              </div>
            </div>

            <span v-if="punchSuccess" class="punch-msg punch-ok">{{ punchSuccess }}</span>
            <span v-if="punchError" class="punch-msg punch-err">{{ punchError }}</span>

            <button
              class="punch-big-btn"
              :class="isPunchedIn ? 'punch-big-btn--out' : 'punch-big-btn--in'"
              :disabled="punchLoading"
              @click="doPunch"
            >
              <div v-if="punchLoading" class="mini-spin btn-spin"></div>
              {{ isPunchedIn ? 'Check out' : 'Check in' }}
            </button>
          </div>

          <!-- My Pending Regularizations -->
          <div class="pending-reg-card" v-if="myRegRequests.length > 0">
            <div class="pr-head">
              <span class="pr-title">Pending Regularizations</span>
              <span class="pr-badge">{{ myRegRequests.length }}</span>
            </div>
            <div class="pr-list">
              <div v-for="r in myRegRequests" :key="r.id" class="pr-item">
                <div class="pr-item-name">{{ REG_TYPES[r.regularization_type] ?? r.regularization_type }}</div>
                <div class="pr-item-sub">{{ formatDate(r.attendance?.attendance_date) }}</div>
              </div>
            </div>
          </div>

          <!-- Hint card if no regularizations -->
          <div class="hint-card" v-else>
            <div class="hint-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path stroke="#7A8299" stroke-width="1.5" stroke-linecap="round" d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div class="hint-card-text">No pending regularizations</div>
          </div>

          <!-- Quick actions -->
          <div class="quick-actions">
            <button class="qa-btn" @click="openRegModal(todayStr)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
              Regularize
            </button>
            <button class="qa-btn" @click="openLeaveModal(todayStr, todayStr)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Apply Leave
            </button>
          </div>

        </div>
      </div>

    </template>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- TEAM TAB                                                              -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <template v-else-if="mainTab === 'team'">

      <!-- Sub-tabs -->
      <div class="sub-tabs">
        <button :class="['stab', teamTab === 'regularizations' && 'stab--active']" @click="teamTab = 'regularizations'">
          Regularizations
          <span v-if="pendingRegCount > 0" class="stab-badge">{{ pendingRegCount }}</span>
        </button>
        <button :class="['stab', teamTab === 'leaves' && 'stab--active']" @click="teamTab = 'leaves'">
          Leave Requests
          <span v-if="pendingLeaveCount > 0" class="stab-badge">{{ pendingLeaveCount }}</span>
        </button>
      </div>

      <div v-if="teamLoading" class="state-center"><div class="spinner"></div></div>
      <div v-else-if="teamError" class="alert-error">{{ teamError }}</div>

      <!-- ── Team Regularizations ────────────────────────────────────────── -->
      <template v-else-if="teamTab === 'regularizations'">
        <div v-if="teamRegRequests.length === 0" class="state-empty">
          <p>No regularization requests from your team.</p>
        </div>
        <div v-else class="req-list">
          <div v-for="req in teamRegRequests" :key="req.id" class="req-card">
            <div class="req-head">
              <div>
                <div class="req-name">{{ req.employee?.full_name }}</div>
                <div class="req-sub">{{ req.employee?.employee_id }} · {{ formatDate(req.attendance?.attendance_date) }}</div>
              </div>
              <span :class="['badge', `badge--${req.status}`]">{{ req.status }}</span>
            </div>
            <div class="req-body">
              <div class="req-meta">
                <span class="mk">Type</span><span class="mv">{{ REG_TYPES[req.regularization_type] ?? req.regularization_type }}</span>
                <span class="mk">Proposed In</span><span class="mv">{{ req.check_in ? formatTime(req.check_in) : '—' }}</span>
                <span class="mk">Proposed Out</span><span class="mv">{{ req.check_out ? formatTime(req.check_out) : '—' }}</span>
              </div>
              <p class="req-reason">{{ req.reason }}</p>

              <template v-if="req.status === 'pending'">
                <input
                  v-model="approveNotes[req.id]"
                  class="notes-input"
                  placeholder="Approval/rejection notes (required to reject)…"
                />
                <div class="req-actions">
                  <button class="btn-approve" :disabled="actionLoading === `reg-${req.id}`" @click="approveReg(req.id)">
                    <div v-if="actionLoading === `reg-${req.id}`" class="mini-spin"></div>
                    Approve
                  </button>
                  <button class="btn-reject" :disabled="actionLoading === `reg-${req.id}` || !approveNotes[req.id]?.trim()" @click="rejectReg(req.id)">
                    Reject
                  </button>
                </div>
              </template>
              <div v-else class="req-decided" :class="`req-decided--${req.status}`">
                {{ req.status === 'approved' ? '✅ Approved' : '❌ Rejected' }}
                <span v-if="req.approval_notes"> — {{ req.approval_notes }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Team Leave Requests ─────────────────────────────────────────── -->
      <template v-else-if="teamTab === 'leaves'">
        <div v-if="teamLeaveRequests.length === 0" class="state-empty">
          <p>No leave requests from your team.</p>
        </div>
        <div v-else class="req-list">
          <div v-for="req in teamLeaveRequests" :key="req.id" class="req-card">
            <div class="req-head">
              <div>
                <div class="req-name">{{ req.employee?.first_name }} {{ req.employee?.last_name }}</div>
                <div class="req-sub">
                  {{ formatDate(req.start_date) }} → {{ formatDate(req.end_date) }}
                  · {{ req.days_requested }} day{{ req.days_requested !== 1 ? 's' : '' }}
                </div>
              </div>
              <span :class="['badge', `badge--${req.status}`]">{{ req.status }}</span>
            </div>
            <div class="req-body">
              <div class="req-meta">
                <span class="mk">Type</span><span class="mv">{{ req.leaveType?.name ?? req.leave_type_id }}</span>
                <span class="mk">Period</span><span class="mv">{{ req.leave_period?.replace(/_/g, ' ') }}</span>
              </div>
              <p class="req-reason">{{ req.reason }}</p>
              <div v-if="req.status === 'pending'" class="req-actions">
                <button class="btn-approve" :disabled="actionLoading === `leave-${req.id}`" @click="approveLeave(req.id)">
                  <div v-if="actionLoading === `leave-${req.id}`" class="mini-spin"></div>
                  Approve
                </button>
                <button class="btn-reject" :disabled="actionLoading === `leave-${req.id}`" @click="rejectLeave(req.id)">
                  Reject
                </button>
              </div>
              <div v-else class="req-decided" :class="`req-decided--${req.status}`">
                {{ req.status === 'approved' ? '✅ Approved' : req.status === 'rejected' ? '❌ Rejected' : req.status }}
              </div>
            </div>
          </div>
        </div>
      </template>

    </template>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- ALL STAFF TAB (admin / hr_manager)                                  -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <template v-else-if="mainTab === 'staff'">
      <div v-if="staffLoading" class="state-center"><div class="spinner"></div></div>
      <div v-else-if="staffError" class="alert-error">{{ staffError }}</div>
      <div v-else-if="staffRecords.length === 0" class="state-empty"><p>No attendance records for this month.</p></div>
      <div v-else class="staff-table-wrap">
        <table class="staff-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Late</th>
              <th>Leave</th>
              <th>Regularized</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in staffRecords" :key="row.employee.id">
              <td>
                <div class="emp-name">{{ row.employee.full_name }}</div>
                <div class="emp-id">{{ row.employee.employee_id }}</div>
              </td>
              <td class="td-num td-green">{{ row.records.filter(r => r.status === 'present').length }}</td>
              <td class="td-num td-red">{{ row.records.filter(r => r.status === 'absent').length }}</td>
              <td class="td-num td-yellow">{{ row.records.filter(r => r.status === 'late').length }}</td>
              <td class="td-num td-blue">{{ row.records.filter(r => r.status === 'leave').length }}</td>
              <td class="td-num td-purple">{{ row.records.filter(r => r.is_regularized).length }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ── Regularization Modal ────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="regModal" class="modal-overlay" @click.self="regModal = false">
        <div class="modal">
          <div class="modal-head">
            <div>
              <h2 class="modal-title">Regularization Request</h2>
              <p class="modal-sub">{{ regForm.date }}</p>
            </div>
            <button class="modal-close" @click="regModal = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div v-if="regLookup" class="lookup-state lookup-loading">
              <div class="mini-spin"></div> Looking up attendance record…
            </div>
            <div v-else-if="regLookupDone && !regRecord" class="lookup-state lookup-error">
              No attendance record found for this date. Contact HR to create one first.
            </div>
            <div v-else-if="regBlocked" class="lookup-state lookup-warn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 8v4M12 16h.01"/></svg>
              {{ regBlocked }}
            </div>
            <template v-else-if="regRecord">
              <div class="punch-summary">
                <span class="punch-summary__label">
                  Existing record
                  <span v-if="regRecord.is_regularized" class="reg-tag">Regularized</span>
                </span>
                <div class="punch-grid">
                  <div><span class="pk">In</span><span class="pv">{{ formatTime(regRecord.check_in) }}</span></div>
                  <div><span class="pk">Out</span><span class="pv">{{ formatTime(regRecord.check_out) }}</span></div>
                  <div><span class="pk">Hours</span><span class="pv">{{ regRecord.working_hours ? regRecord.working_hours+'h' : '—' }}</span></div>
                  <div><span class="pk">Status</span><span class="pv">{{ regRecord.status }}</span></div>
                </div>
              </div>
              <div class="field">
                <label class="label">Type <span class="req">*</span></label>
                <select v-model="regForm.regularization_type" class="input">
                  <option value="">Select…</option>
                  <option v-for="(label, val) in REG_TYPES" :key="val" :value="val">{{ label }}</option>
                </select>
              </div>
              <div class="field-row">
                <div class="field">
                  <label class="label">Proposed Check In</label>
                  <input type="time" v-model="regForm.check_in" class="input" />
                </div>
                <div class="field">
                  <label class="label">Proposed Check Out</label>
                  <input type="time" v-model="regForm.check_out" class="input" />
                </div>
              </div>
              <div class="field">
                <label class="label">Reason <span class="req">*</span></label>
                <textarea v-model="regForm.reason" class="input textarea" rows="3" placeholder="Minimum 10 characters…"></textarea>
              </div>
              <div class="field">
                <label class="label">Additional Notes</label>
                <textarea v-model="regForm.notes" class="input textarea" rows="2" placeholder="Optional…"></textarea>
              </div>
              <div v-if="regError" class="alert-error">{{ regError }}</div>
              <div class="modal-actions">
                <button class="btn-cancel" @click="regModal = false" :disabled="regSubmitting">Cancel</button>
                <button class="btn-submit" @click="submitReg" :disabled="regSubmitting || !regCanSubmit">
                  <div v-if="regSubmitting" class="mini-spin btn-spin"></div>
                  {{ regSubmitting ? 'Submitting…' : 'Submit Request' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Leave Request Modal ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="leaveModal" class="modal-overlay" @click.self="leaveModal = false">
        <div class="modal">
          <div class="modal-head">
            <div>
              <h2 class="modal-title">Apply for Leave</h2>
              <p class="modal-sub">{{ leaveForm.start_date }}</p>
            </div>
            <button class="modal-close" @click="leaveModal = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div v-if="leaveSuccess" class="success-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              Leave request submitted successfully!
            </div>
            <template v-else>
              <div class="field-row">
                <div class="field">
                  <label class="label">Start Date <span class="req">*</span></label>
                  <input type="date" v-model="leaveForm.start_date" class="input" />
                </div>
                <div class="field">
                  <label class="label">End Date <span class="req">*</span></label>
                  <input type="date" v-model="leaveForm.end_date" :min="leaveForm.start_date" class="input" />
                </div>
              </div>
              <div class="field">
                <label class="label">Leave Type <span class="req">*</span></label>
                <select v-model.number="leaveForm.leave_type_id" class="input">
                  <option :value="0">Select type…</option>
                  <option v-for="lt in leaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
                </select>
                <p v-if="selectedTypeBalance !== null" class="hint">Available: <strong>{{ selectedTypeBalance }} days</strong></p>
              </div>
              <div class="field">
                <label class="label">Period</label>
                <select v-model="leaveForm.leave_period" class="input">
                  <option value="full_day">Full Day</option>
                  <option value="half_day_morning">Half Day – Morning</option>
                  <option value="half_day_afternoon">Half Day – Afternoon</option>
                </select>
              </div>
              <div class="field">
                <label class="label">Reason <span class="req">*</span></label>
                <textarea v-model="leaveForm.reason" class="input textarea" rows="3" placeholder="Why are you applying for leave?"></textarea>
              </div>
              <div v-if="leaveError" class="alert-error">{{ leaveError }}</div>
              <div class="modal-actions">
                <button class="btn-cancel" @click="leaveModal = false" :disabled="leaveSubmitting">Cancel</button>
                <button class="btn-submit" @click="submitLeave" :disabled="leaveSubmitting || !leaveCanSubmit">
                  <div v-if="leaveSubmitting" class="mini-spin btn-spin"></div>
                  {{ leaveSubmitting ? 'Submitting…' : 'Apply Leave' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.ess-att { display: flex; flex-direction: column; gap: 20px; }

/* ── main tabs ───────────────────────────────────────────────────────────── */
.main-tabs { display: flex; gap: 4px; border-bottom: 1px solid #232936; }
.mtab {
  padding: 9px 20px; font-size: 13px; font-weight: 500; color: #7A8299;
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: color .15s, border-color .15s;
  display: flex; align-items: center; gap: 7px;
}
.mtab:hover { color: #EEF0F4; }
.mtab--active { color: #6B5BFF; border-bottom-color: #6B5BFF; }
.mtab-badge { font-size: 10px; font-weight: 700; background: #F38288; color: #fff; padding: 1px 6px; border-radius: 10px; }

/* ── sub tabs ────────────────────────────────────────────────────────────── */
.sub-tabs { display: flex; gap: 4px; border-bottom: 1px solid #232936; }
.stab {
  padding: 8px 16px; font-size: 13px; font-weight: 500; color: #7A8299;
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: color .15s; display: flex; align-items: center; gap: 6px;
}
.stab:hover { color: #EEF0F4; }
.stab--active { color: #6B5BFF; border-bottom-color: #6B5BFF; }
.stab-badge { font-size: 10px; font-weight: 700; background: #F9A825; color: #000; padding: 1px 5px; border-radius: 10px; }

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
.nav-btn:hover { color: #EEF0F4; background: #232936; }

.cal-legend2 { display: flex; gap: 14px; font-size: 11px; flex-wrap: wrap; }
.leg2-item { display: flex; align-items: center; gap: 5px; color: #7A8299; }
.leg2-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

.cal-card-body { padding: 16px; }
.cal-dows { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 6px; }
.cal-dow2 {
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em;
  color: #7A8299; padding: 4px 6px; text-align: center;
}

/* ── new calendar grid ───────────────────────────────────────────────────── */
.cal-grid2 { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.cal-grid2.cal-loading { opacity: .5; pointer-events: none; }

.cal-cell2 {
  aspect-ratio: 1 / 1; padding: 6px; border-radius: 6px;
  background: #1C212C; border: 1px solid #232936;
  display: flex; flex-direction: column; justify-content: space-between;
  cursor: pointer; transition: border-color .12s, background .12s;
}
.cal-cell2:hover:not(.cell2--empty):not(.cell2--future):not(.cell2--weekend) {
  border-color: #6B5BFF;
}
.cell2--empty   { background: transparent; border-color: transparent; cursor: default; }
.cell2--weekend { background: transparent; opacity: .35; cursor: default; }
.cell2--future  { background: transparent; opacity: .45; cursor: pointer; }
.cell2--future:hover { opacity: .75; border-color: #8979FF; }
.cell2--today   { background: rgba(107,91,255,.15); border-color: #6B5BFF; }
.cell2--present { background: rgba(77,211,154,.08); border-color: rgba(77,211,154,.2); }
.cell2--late    { background: rgba(245,193,110,.08); border-color: rgba(245,193,110,.2); }
.cell2--absent  { background: rgba(243,130,136,.08); border-color: rgba(243,130,136,.2); }
.cell2--leave   { background: rgba(139,121,255,.08); border-color: rgba(139,121,255,.2); }
.cell2--holiday { background: rgba(126,215,255,.08); border-color: rgba(126,215,255,.2); }
.cell2--regularized { background: rgba(155,110,255,.12); border-color: rgba(155,110,255,.4); }

.cell2-day { font-size: 11px; font-weight: 400; color: #EEF0F4; font-variant-numeric: tabular-nums; line-height: 1; }
.cell2-day--today { font-weight: 600; }
.cell2-status { display: flex; align-items: center; gap: 3px; }
.cell2-dot  { width: 6px; height: 6px; border-radius: 3px; flex-shrink: 0; }
.cell2-code { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 9px; color: #7A8299; }
.cell2-today-badge { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 9px; color: #8979FF; font-weight: 600; }

.cal-skel { aspect-ratio: 1/1; background: #1C212C; animation: pulse 1.4s ease infinite; border-radius: 6px; }
@keyframes pulse { 0%,100% { opacity: .4; } 50% { opacity: .9; } }

/* ── today's log ─────────────────────────────────────────────────────────── */
.todays-log-card { background: #161A23; border: 1px solid #232936; border-radius: 12px; overflow: hidden; }
.log-head { padding: 14px 16px; border-bottom: 1px solid #232936; display: flex; justify-content: space-between; align-items: center; }
.log-title { font-size: 13.5px; font-weight: 600; color: #EEF0F4; }
.log-date  { font-size: 11px; color: #7A8299; }
.log-timeline { padding: 16px; display: flex; flex-direction: column; }
.log-row  { display: flex; gap: 12px; }
.log-time { width: 54px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10.5px; color: #7A8299; padding-top: 2px; flex-shrink: 0; }
.log-spine { position: relative; width: 18px; flex-shrink: 0; }
.log-line { position: absolute; left: 8px; top: 12px; bottom: -12px; width: 1px; background: #232936; }
.log-dot  { position: absolute; left: 4px; top: 4px; width: 9px; height: 9px; border-radius: 50%; border: 2px solid #161A23; }
.log-content { flex: 1; }
.log-event { font-size: 12px; color: #EEF0F4; font-weight: 500; }

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
  border-radius: 7px; padding: 8px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.ctc-label { font-size: 9.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #7A8299; }
.ctc-val   { font-size: 13px; font-weight: 500; color: #EEF0F4; }

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

/* ── pending regs widget ─────────────────────────────────────────────────── */
.pending-reg-card { background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 16px; }
.pr-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pr-title { font-size: 13px; font-weight: 600; color: #EEF0F4; }
.pr-badge { font-size: 10px; font-weight: 700; background: rgba(249,168,37,.15); color: #F9A825; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(249,168,37,.3); }
.pr-list  { display: flex; flex-direction: column; }
.pr-item  { padding: 8px 0; border-bottom: 1px solid #232936; }
.pr-item:last-child { border-bottom: none; }
.pr-item-name { font-size: 12px; color: #EEF0F4; font-weight: 500; }
.pr-item-sub  { font-size: 11px; color: #7A8299; margin-top: 2px; }

/* ── hint card ───────────────────────────────────────────────────────────── */
.hint-card {
  background: #161A23; border: 1px solid #232936; border-radius: 12px;
  padding: 20px 16px; display: flex; flex-direction: column;
  align-items: center; gap: 8px; text-align: center;
}
.hint-card-icon { opacity: .6; }
.hint-card-text { font-size: 12px; color: #7A8299; }

/* ── quick actions ───────────────────────────────────────────────────────── */
.quick-actions { display: flex; gap: 8px; }
.qa-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 12px; font-size: 12px; font-weight: 500;
  background: #1C212C; border: 1px solid #232936; color: #7A8299;
  border-radius: 8px; cursor: pointer; transition: color .15s, border-color .15s, background .15s;
}
.qa-btn:hover { color: #EEF0F4; border-color: #6B5BFF; background: rgba(107,91,255,.08); }

/* ── punch messages ──────────────────────────────────────────────────────── */
.punch-msg { font-size: 12px; text-align: center; }
.punch-ok  { color: #4DD39A; }
.punch-err { color: #F38288; }

/* ── team request cards ──────────────────────────────────────────────────── */
.req-list { display: flex; flex-direction: column; gap: 12px; }
.req-card { background: #161A23; border: 1px solid #232936; border-radius: 12px; overflow: hidden; }
.req-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #1C212C; gap: 10px; }
.req-name { font-size: 14px; font-weight: 600; color: #EEF0F4; }
.req-sub  { font-size: 12px; color: #7A8299; margin-top: 2px; }
.req-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; }
.req-meta { display: grid; grid-template-columns: auto 1fr auto 1fr auto 1fr; gap: 6px 14px; align-items: center; }
.mk { font-size: 11px; color: #7A8299; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
.mv { font-size: 13px; color: #EEF0F4; }
.req-reason { font-size: 13px; color: #EEF0F4; background: #1C212C; padding: 8px 12px; border-radius: 6px; margin: 0; line-height: 1.5; }
.notes-input { background: #1C212C; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 12px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.notes-input:focus { border-color: #6B5BFF; }
.req-actions { display: flex; gap: 8px; }
.req-decided { font-size: 13px; padding: 8px 12px; border-radius: 6px; }
.req-decided--approved { background: rgba(54,211,153,.08); color: #36D399; }
.req-decided--rejected { background: rgba(255,107,107,.08); color: #F38288; }

.btn-approve { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; font-size: 13px; font-weight: 600; background: rgba(54,211,153,.15); color: #36D399; border: 1px solid rgba(54,211,153,.3); border-radius: 7px; cursor: pointer; transition: background .15s; }
.btn-approve:hover:not(:disabled) { background: rgba(54,211,153,.25); }
.btn-approve:disabled { opacity: .4; cursor: not-allowed; }
.btn-reject  { padding: 7px 16px; font-size: 13px; font-weight: 600; background: rgba(255,107,107,.1); color: #F38288; border: 1px solid rgba(255,107,107,.25); border-radius: 7px; cursor: pointer; transition: background .15s; }
.btn-reject:hover:not(:disabled) { background: rgba(255,107,107,.2); }
.btn-reject:disabled { opacity: .4; cursor: not-allowed; }

/* ── badges ──────────────────────────────────────────────────────────────── */
.badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; letter-spacing: .3px; text-transform: capitalize; }
.badge--pending  { background: rgba(249,168,37,.12);  color: #F9A825; border: 1px solid rgba(249,168,37,.25); }
.badge--approved { background: rgba(54,211,153,.12);  color: #36D399;  border: 1px solid rgba(54,211,153,.25); }
.badge--rejected { background: rgba(255,107,107,.12); color: #F38288;  border: 1px solid rgba(255,107,107,.25); }
.badge--cancelled { background: rgba(107,114,128,.12); color: #7A8299; border: 1px solid rgba(107,114,128,.25); }

/* ── states ──────────────────────────────────────────────────────────────── */
.state-center { display: flex; justify-content: center; padding: 48px; }
.state-empty  { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px; color: #7A8299; background: #161A23; border: 1px solid #232936; border-radius: 12px; font-size: 13px; }
.alert-error  { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.3); color: #F38288; padding: 10px 14px; border-radius: 8px; font-size: 13px; }

/* ── modal ───────────────────────────────────────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal { background: #161A23; border: 1px solid #232936; border-radius: 16px; width: 100%; max-width: 520px; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,.5); }
.modal-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px 14px; border-bottom: 1px solid #232936; flex-shrink: 0; }
.modal-title { font-size: 16px; font-weight: 600; color: #EEF0F4; margin: 0; }
.modal-sub   { font-size: 12px; color: #7A8299; margin: 3px 0 0; }
.modal-close { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: none; border: none; color: #7A8299; cursor: pointer; transition: background .15s, color .15s; flex-shrink: 0; }
.modal-close:hover { background: #1C212C; color: #EEF0F4; }
.modal-body  { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }

/* ── form ────────────────────────────────────────────────────────────────── */
.field     { display: flex; flex-direction: column; gap: 5px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.label     { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #7A8299; }
.req       { color: #F38288; }
.input     { background: #1C212C; border: 1px solid #232936; color: #EEF0F4; border-radius: 8px; padding: 9px 12px; font-size: 13px; outline: none; transition: border-color .15s; width: 100%; box-sizing: border-box; }
.input:focus { border-color: #6B5BFF; }
.textarea  { resize: vertical; min-height: 68px; font-family: inherit; line-height: 1.5; }
.hint      { font-size: 11px; color: #7A8299; margin: 0; }
.input[type="date"], .input[type="time"], select.input option { color-scheme: dark; }

.lookup-state { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 12px 14px; border-radius: 8px; }
.lookup-loading { background: #1C212C; color: #7A8299; }
.lookup-error { background: rgba(255,107,107,.08); border: 1px solid rgba(255,107,107,.2); color: #F38288; }
.lookup-warn  { background: rgba(249,168,37,.08); border: 1px solid rgba(249,168,37,.2); color: #F9A825; }

.punch-summary { background: #1C212C; border: 1px solid #232936; border-radius: 8px; padding: 12px 14px; }
.punch-summary__label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #7A8299; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.reg-tag { background: rgba(155,110,255,.2); color: #9B6EFF; font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.punch-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.pk { font-size: 11px; color: #7A8299; display: block; }
.pv { font-size: 13px; font-weight: 500; color: #EEF0F4; display: block; margin-top: 2px; }

.success-banner { display: flex; align-items: center; gap: 10px; background: rgba(54,211,153,.1); border: 1px solid rgba(54,211,153,.25); color: #36D399; padding: 14px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.btn-cancel { padding: 9px 18px; font-size: 13px; font-weight: 500; background: #1C212C; color: #7A8299; border: 1px solid #232936; border-radius: 8px; cursor: pointer; transition: color .15s, border-color .15s; }
.btn-cancel:hover:not(:disabled) { color: #EEF0F4; border-color: #EEF0F4; }
.btn-cancel:disabled { opacity: .5; cursor: not-allowed; }
.btn-submit { display: inline-flex; align-items: center; gap: 8px; padding: 9px 20px; font-size: 13px; font-weight: 600; background: #6B5BFF; color: #fff; border: none; border-radius: 8px; cursor: pointer; transition: opacity .15s; }
.btn-submit:hover:not(:disabled) { opacity: .88; }
.btn-submit:disabled { opacity: .45; cursor: not-allowed; }

.spinner   { width: 28px; height: 28px; border: 2.5px solid rgba(107,91,255,.2); border-top-color: #6B5BFF; border-radius: 50%; animation: spin .8s linear infinite; }
.mini-spin { width: 13px; height: 13px; flex-shrink: 0; border: 2px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
.btn-spin  { border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── all staff table ─────────────────────────────────────────────────────── */
.staff-table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid #232936; }
.staff-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.staff-table th { background: #1C212C; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #232936; }
.staff-table td { padding: 10px 14px; border-bottom: 1px solid #232936; color: #EEF0F4; }
.staff-table tr:last-child td { border-bottom: none; }
.staff-table tr:hover td { background: #1C212C; }
.emp-name { font-weight: 500; }
.emp-id   { font-size: 11px; color: #7A8299; margin-top: 2px; }
.td-num   { text-align: center; font-weight: 600; }
.td-green  { color: #36D399; }
.td-red    { color: #F38288; }
.td-yellow { color: #F9A825; }
.td-blue   { color: #60a5fa; }
.td-purple { color: #9B6EFF; }

@media (max-width: 900px) {
  .att-layout { grid-template-columns: 1fr; }
  .att-right  { flex-direction: row; flex-wrap: wrap; }
  .check-widget { flex: 1 1 280px; }
  .pending-reg-card, .hint-card { flex: 1 1 200px; }
  .quick-actions { flex: 1 1 100%; }
}
@media (max-width: 600px) {
  .kpi-strip  { grid-template-columns: 1fr 1fr; }
  .field-row  { grid-template-columns: 1fr; }
  .punch-grid { grid-template-columns: 1fr 1fr; }
  .req-meta   { grid-template-columns: auto 1fr; }
  .att-right  { flex-direction: column; }
}
</style>
