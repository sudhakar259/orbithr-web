<script setup lang="ts">
defineOptions({ name: 'EssAttendance' })
import { ref, computed, onMounted } from 'vue'
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

function cellRecord(day: number): AttendanceRecord | null {
  return attendanceMap.value[dateStr(day)] ?? null
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

function cellClass(day: number) {
  const s = cellStatus(day)
  const statusCls: Record<string, string> = {
    present:     'cell--present',
    late:        'cell--late',
    absent:      'cell--absent',
    leave:       'cell--leave',
    holiday:     'cell--holiday',
    half_day:    'cell--half',
    regularized: 'cell--regularized',
    none:        '',
  }
  const cls = ['cal-cell', statusCls[s] ?? '']
  if (isToday(day)) cls.push('cell--today')
  if (isFuture(day)) cls.push('cell--future')
  return cls.filter(Boolean).join(' ')
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
const regBlocked    = ref('')  // non-empty = already regularized, show message

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
    // Group by employee
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
  if (isAdmin.value) loadStaffAttendance()
})
</script>

<template>
  <div class="ess-att">

    <!-- ── Main tab switcher (Calendar / Team) ────────────────────────────── -->
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

      <!-- Today punch card -->
      <div class="punch-card">
        <div class="punch-info">
          <span class="punch-label">Today</span>
          <span class="punch-times">
            <span>In: {{ formatTime(todayRecord?.check_in) }}</span>
            <span>Out: {{ formatTime(todayRecord?.check_out) }}</span>
          </span>
        </div>
        <div class="punch-right">
          <span v-if="punchSuccess" class="punch-msg punch-ok">{{ punchSuccess }}</span>
          <span v-if="punchError" class="punch-msg punch-err">{{ punchError }}</span>
          <button class="punch-btn" :class="isPunchedIn ? 'punch-btn--out' : 'punch-btn--in'" :disabled="punchLoading" @click="doPunch">
            <div v-if="punchLoading" class="mini-spin"></div>
            {{ isPunchedIn ? 'Check Out' : 'Check In' }}
          </button>
        </div>
      </div>

      <!-- Summary strip -->
      <div class="summary-row">
        <div class="stat-card"><p class="stat-label">Present</p><p class="stat-val stat-green">{{ summary.present_days }}</p></div>
        <div class="stat-card"><p class="stat-label">Absent</p><p class="stat-val stat-red">{{ summary.absent_days }}</p></div>
        <div class="stat-card"><p class="stat-label">Late</p><p class="stat-val stat-yellow">{{ summary.late_days }}</p></div>
        <div class="stat-card"><p class="stat-label">On Leave</p><p class="stat-val stat-blue">{{ summary.leave_days }}</p></div>
      </div>

      <!-- Calendar header -->
      <div class="cal-header">
        <button class="nav-btn" @click="prevMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span class="cal-month">{{ monthLabel }}</span>
        <button class="nav-btn" @click="nextMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span class="leg-item"><i class="leg-dot dot-present"></i>Present</span>
        <span class="leg-item"><i class="leg-dot dot-late"></i>Late</span>
        <span class="leg-item"><i class="leg-dot dot-absent"></i>Absent</span>
        <span class="leg-item"><i class="leg-dot dot-leave"></i>Leave</span>
        <span class="leg-item"><i class="leg-dot dot-reg"></i>Regularized</span>
        <span class="leg-hint">Click past date → Regularize &nbsp;|&nbsp; Click future date → Apply Leave</span>
      </div>

      <div v-if="calError" class="alert-error">{{ calError }}</div>

      <!-- Calendar grid -->
      <div :class="['cal-grid', calLoading && 'cal-loading']">
        <div v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d" class="cal-dow">{{ d }}</div>
        <template v-if="calLoading">
          <div v-for="i in 35" :key="i" class="cal-cell cal-skel"></div>
        </template>
        <template v-else>
          <div
            v-for="(day, idx) in calCells"
            :key="idx"
            :class="day ? cellClass(day) : 'cal-cell cell--empty'"
            @click="day ? onDayClick(day) : undefined"
          >
            <template v-if="day">
              <span class="cell-day">{{ day }}</span>
              <span v-if="cellRecord(day)?.is_regularized" class="cell-reg-badge">R</span>
              <span v-else-if="cellRecord(day)" class="cell-time">{{ formatTime(cellRecord(day)!.check_in) }}</span>
              <span v-else-if="leaveMap[dateStr(day)]" class="cell-leave-label">{{ leaveMap[dateStr(day)] }}</span>
              <span v-if="!isFuture(day)" class="cell-hint">{{ cellRecord(day)?.is_regularized ? 'View' : 'Regularize' }}</span>
              <span v-else class="cell-hint">Apply Leave</span>
            </template>
          </div>
        </template>
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
                  <button
                    class="btn-approve"
                    :disabled="actionLoading === `reg-${req.id}`"
                    @click="approveReg(req.id)"
                  >
                    <div v-if="actionLoading === `reg-${req.id}`" class="mini-spin"></div>
                    Approve
                  </button>
                  <button
                    class="btn-reject"
                    :disabled="actionLoading === `reg-${req.id}` || !approveNotes[req.id]?.trim()"
                    @click="rejectReg(req.id)"
                  >
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
                <button
                  class="btn-approve"
                  :disabled="actionLoading === `leave-${req.id}`"
                  @click="approveLeave(req.id)"
                >
                  <div v-if="actionLoading === `leave-${req.id}`" class="mini-spin"></div>
                  Approve
                </button>
                <button
                  class="btn-reject"
                  :disabled="actionLoading === `leave-${req.id}`"
                  @click="rejectLeave(req.id)"
                >
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
            <!-- Already regularized block -->
            <div v-else-if="regBlocked" class="lookup-state lookup-warn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 8v4M12 16h.01"/></svg>
              {{ regBlocked }}
            </div>
            <template v-else-if="regRecord">
              <!-- Existing punch -->
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
.main-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--surface3); }
.mtab {
  padding: 9px 20px; font-size: 13px; font-weight: 500; color: var(--muted);
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: color .15s, border-color .15s;
  display: flex; align-items: center; gap: 7px;
}
.mtab:hover { color: var(--text); }
.mtab--active { color: var(--accent); border-bottom-color: var(--accent); }
.mtab-badge {
  font-size: 10px; font-weight: 700; background: var(--red); color: #fff;
  padding: 1px 6px; border-radius: 10px;
}

/* ── sub tabs ────────────────────────────────────────────────────────────── */
.sub-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--surface3); }
.stab {
  padding: 8px 16px; font-size: 13px; font-weight: 500; color: var(--muted);
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: color .15s; display: flex; align-items: center; gap: 6px;
}
.stab:hover { color: var(--text); }
.stab--active { color: var(--accent); border-bottom-color: var(--accent); }
.stab-badge {
  font-size: 10px; font-weight: 700; background: var(--yellow); color: #000;
  padding: 1px 5px; border-radius: 10px;
}

/* ── summary strip ───────────────────────────────────────────────────────── */
.summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat-card { background: var(--surface); border: 1px solid var(--surface3); border-radius: 10px; padding: 14px 18px; }
.stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); margin: 0; }
.stat-val   { font-size: 26px; font-weight: 700; color: var(--text); margin: 4px 0 0; }
.stat-green { color: #36D399; } .stat-red { color: #FF6B6B; } .stat-yellow { color: #F9A825; } .stat-blue { color: #4F7EFF; }

/* ── calendar header ─────────────────────────────────────────────────────── */
.cal-header { display: flex; align-items: center; justify-content: space-between; background: var(--surface); border: 1px solid var(--surface3); border-radius: 10px; padding: 10px 16px; }
.cal-month { font-size: 15px; font-weight: 600; color: var(--text); }
.nav-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 7px; background: var(--surface2); border: 1px solid var(--surface3); color: var(--muted); cursor: pointer; transition: color .15s, background .15s; }
.nav-btn:hover { color: var(--text); background: var(--surface3); }

/* ── legend ──────────────────────────────────────────────────────────────── */
.legend { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 18px; font-size: 11px; color: var(--muted); }
.leg-item { display: flex; align-items: center; gap: 5px; }
.leg-dot  { display: inline-block; width: 9px; height: 9px; border-radius: 3px; }
.dot-present { background: #36D399; } .dot-late { background: #F9A825; }
.dot-absent  { background: #FF6B6B; } .dot-leave { background: #4F7EFF; }
.dot-reg     { background: #9B6EFF; }
.leg-hint { margin-left: auto; font-size: 11px; color: var(--muted); opacity: .7; }

/* ── calendar grid ───────────────────────────────────────────────────────── */
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; background: var(--surface); border: 1px solid var(--surface3); border-radius: 12px; padding: 14px; }
.cal-dow  { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); text-align: center; padding: 6px 0 10px; }
.cal-cell { position: relative; min-height: 68px; border-radius: 8px; padding: 7px 8px; display: flex; flex-direction: column; gap: 3px; border: 1px solid transparent; cursor: pointer; transition: background .12s, border-color .12s; overflow: hidden; }
.cal-cell:hover .cell-hint { opacity: 1; }
.cal-cell:hover { border-color: var(--surface3); }
.cell--empty { cursor: default; }

.cell--present     { background: rgba(54,211,153,.1);  border-color: rgba(54,211,153,.2); }
.cell--late        { background: rgba(249,168,37,.1);  border-color: rgba(249,168,37,.2); }
.cell--absent      { background: rgba(255,107,107,.1); border-color: rgba(255,107,107,.2); }
.cell--leave       { background: rgba(79,126,255,.1);  border-color: rgba(79,126,255,.2); }
.cell--holiday     { background: rgba(155,110,255,.1); border-color: rgba(155,110,255,.2); }
.cell--half        { background: rgba(155,110,255,.08); border-color: rgba(155,110,255,.2); }
.cell--regularized { background: rgba(155,110,255,.15); border-color: rgba(155,110,255,.4); }
.cell--today       { border-color: var(--accent) !important; }
.cell--future      { opacity: .75; }
.cell--future:hover { opacity: 1; background: rgba(79,126,255,.07); }

.cell-day       { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1; }
.cell-time      { font-size: 10px; color: var(--muted); }
.cell-leave-label { font-size: 10px; color: #4F7EFF; }
.cell-reg-badge { font-size: 9px; font-weight: 700; color: #9B6EFF; background: rgba(155,110,255,.2); padding: 1px 4px; border-radius: 3px; width: fit-content; }
.cell-hint      { position: absolute; bottom: 5px; left: 0; right: 0; text-align: center; font-size: 9px; font-weight: 600; color: var(--accent); opacity: 0; transition: opacity .15s; pointer-events: none; text-transform: uppercase; letter-spacing: .3px; }

.cal-skel { background: var(--surface2); animation: pulse 1.4s ease infinite; }
@keyframes pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }

/* ── team request cards ──────────────────────────────────────────────────── */
.req-list { display: flex; flex-direction: column; gap: 12px; }
.req-card { background: var(--surface); border: 1px solid var(--surface3); border-radius: 12px; overflow: hidden; }
.req-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--surface2); gap: 10px; }
.req-name { font-size: 14px; font-weight: 600; color: var(--text); }
.req-sub  { font-size: 12px; color: var(--muted); margin-top: 2px; }
.req-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; }
.req-meta { display: grid; grid-template-columns: auto 1fr auto 1fr auto 1fr; gap: 6px 14px; align-items: center; }
.mk { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
.mv { font-size: 13px; color: var(--text); }
.req-reason { font-size: 13px; color: var(--text); background: var(--surface2); padding: 8px 12px; border-radius: 6px; margin: 0; line-height: 1.5; }
.notes-input { background: var(--surface2); border: 1px solid var(--surface3); color: var(--text); border-radius: 7px; padding: 8px 12px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.notes-input:focus { border-color: var(--accent); }
.req-actions { display: flex; gap: 8px; }
.req-decided { font-size: 13px; padding: 8px 12px; border-radius: 6px; }
.req-decided--approved { background: rgba(54,211,153,.08); color: #36D399; }
.req-decided--rejected { background: rgba(255,107,107,.08); color: var(--red); }

.btn-approve { display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; font-size: 13px; font-weight: 600; background: rgba(54,211,153,.15); color: #36D399; border: 1px solid rgba(54,211,153,.3); border-radius: 7px; cursor: pointer; transition: background .15s; }
.btn-approve:hover:not(:disabled) { background: rgba(54,211,153,.25); }
.btn-approve:disabled { opacity: .4; cursor: not-allowed; }
.btn-reject  { padding: 7px 16px; font-size: 13px; font-weight: 600; background: rgba(255,107,107,.1); color: var(--red); border: 1px solid rgba(255,107,107,.25); border-radius: 7px; cursor: pointer; transition: background .15s; }
.btn-reject:hover:not(:disabled) { background: rgba(255,107,107,.2); }
.btn-reject:disabled { opacity: .4; cursor: not-allowed; }

/* ── badges ──────────────────────────────────────────────────────────────── */
.badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; letter-spacing: .3px; text-transform: capitalize; }
.badge--pending  { background: rgba(249,168,37,.12); color: var(--yellow); border: 1px solid rgba(249,168,37,.25); }
.badge--approved { background: rgba(54,211,153,.12);  color: #36D399;       border: 1px solid rgba(54,211,153,.25); }
.badge--rejected { background: rgba(255,107,107,.12); color: var(--red);    border: 1px solid rgba(255,107,107,.25); }
.badge--cancelled { background: rgba(107,114,128,.12); color: var(--muted); border: 1px solid rgba(107,114,128,.25); }

/* ── states ──────────────────────────────────────────────────────────────── */
.state-center { display: flex; justify-content: center; padding: 48px; }
.state-empty  { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px; color: var(--muted); background: var(--surface); border: 1px solid var(--surface3); border-radius: 12px; font-size: 13px; }
.alert-error  { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.3); color: var(--red); padding: 10px 14px; border-radius: 8px; font-size: 13px; }

/* ── modal ───────────────────────────────────────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal { background: var(--surface); border: 1px solid var(--surface3); border-radius: 16px; width: 100%; max-width: 520px; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,.5); }
.modal-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px 14px; border-bottom: 1px solid var(--surface3); flex-shrink: 0; }
.modal-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
.modal-sub   { font-size: 12px; color: var(--muted); margin: 3px 0 0; }
.modal-close { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; background: none; border: none; color: var(--muted); cursor: pointer; transition: background .15s, color .15s; flex-shrink: 0; }
.modal-close:hover { background: var(--surface2); color: var(--text); }
.modal-body  { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }

/* ── form ────────────────────────────────────────────────────────────────── */
.field     { display: flex; flex-direction: column; gap: 5px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.label     { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
.req       { color: var(--red); }
.input     { background: var(--surface2); border: 1px solid var(--surface3); color: var(--text); border-radius: 8px; padding: 9px 12px; font-size: 13px; outline: none; transition: border-color .15s; width: 100%; box-sizing: border-box; }
.input:focus { border-color: var(--accent); }
.textarea  { resize: vertical; min-height: 68px; font-family: inherit; line-height: 1.5; }
.hint      { font-size: 11px; color: var(--muted); margin: 0; }
.input[type="date"], .input[type="time"], select.input option { color-scheme: dark; }

.lookup-state { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 12px 14px; border-radius: 8px; }
.lookup-loading { background: var(--surface2); color: var(--muted); }
.lookup-error { background: rgba(255,107,107,.08); border: 1px solid rgba(255,107,107,.2); color: var(--red); }
.lookup-warn  { background: rgba(249,168,37,.08); border: 1px solid rgba(249,168,37,.2); color: var(--yellow); }

.punch-summary { background: var(--surface2); border: 1px solid var(--surface3); border-radius: 8px; padding: 12px 14px; }
.punch-summary__label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.reg-tag { background: rgba(155,110,255,.2); color: #9B6EFF; font-size: 10px; padding: 2px 6px; border-radius: 4px; }
.punch-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.pk { font-size: 11px; color: var(--muted); display: block; }
.pv { font-size: 13px; font-weight: 500; color: var(--text); display: block; margin-top: 2px; }

.success-banner { display: flex; align-items: center; gap: 10px; background: rgba(54,211,153,.1); border: 1px solid rgba(54,211,153,.25); color: #36D399; padding: 14px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.btn-cancel { padding: 9px 18px; font-size: 13px; font-weight: 500; background: var(--surface2); color: var(--muted); border: 1px solid var(--surface3); border-radius: 8px; cursor: pointer; transition: color .15s, border-color .15s; }
.btn-cancel:hover:not(:disabled) { color: var(--text); border-color: var(--text); }
.btn-cancel:disabled { opacity: .5; cursor: not-allowed; }
.btn-submit { display: inline-flex; align-items: center; gap: 8px; padding: 9px 20px; font-size: 13px; font-weight: 600; background: var(--accent); color: #fff; border: none; border-radius: 8px; cursor: pointer; transition: opacity .15s; }
.btn-submit:hover:not(:disabled) { opacity: .88; }
.btn-submit:disabled { opacity: .45; cursor: not-allowed; }

.spinner   { width: 28px; height: 28px; border: 2.5px solid rgba(79,126,255,.2); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
.mini-spin { width: 13px; height: 13px; flex-shrink: 0; border: 2px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
.btn-spin  { border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .summary-row { grid-template-columns: 1fr 1fr; }
  .field-row   { grid-template-columns: 1fr; }
  .punch-grid  { grid-template-columns: 1fr 1fr; }
  .cal-cell    { min-height: 52px; padding: 5px 4px; }
  .cell-day    { font-size: 12px; }
  .cell-time   { display: none; }
  .leg-hint    { display: none; }
  .req-meta    { grid-template-columns: auto 1fr; }
}

/* ── punch card ──────────────────────────────────────────────────────────── */
.punch-card {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--surface2); border: 1px solid var(--surface3);
  border-radius: 10px; padding: 14px 18px;
}
.punch-info { display: flex; flex-direction: column; gap: 4px; }
.punch-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.punch-times { display: flex; gap: 16px; font-size: 13px; color: var(--text); }
.punch-right { display: flex; align-items: center; gap: 12px; }
.punch-msg { font-size: 12px; }
.punch-ok  { color: var(--green); }
.punch-err { color: var(--red); }
.punch-btn {
  padding: 8px 20px; border-radius: 7px; font-size: 13px; font-weight: 600;
  border: none; cursor: pointer; display: flex; align-items: center; gap: 6px;
  transition: opacity .15s;
}
.punch-btn:disabled { opacity: .6; cursor: not-allowed; }
.punch-btn--in  { background: var(--green);  color: #0a1a0a; }
.punch-btn--out { background: var(--red);    color: #fff; }

/* ── all staff table ─────────────────────────────────────────────────────── */
.staff-table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--surface3); }
.staff-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.staff-table th {
  background: var(--surface2); padding: 10px 14px; text-align: left;
  font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase;
  letter-spacing: .05em; border-bottom: 1px solid var(--surface3);
}
.staff-table td { padding: 10px 14px; border-bottom: 1px solid var(--surface3); color: var(--text); }
.staff-table tr:last-child td { border-bottom: none; }
.staff-table tr:hover td { background: var(--surface2); }
.emp-name { font-weight: 500; }
.emp-id   { font-size: 11px; color: var(--muted); margin-top: 2px; }
.td-num   { text-align: center; font-weight: 600; }
.td-green  { color: var(--green); }
.td-red    { color: var(--red); }
.td-yellow { color: var(--yellow); }
.td-blue   { color: #60a5fa; }
.td-purple { color: var(--purple); }
</style>
