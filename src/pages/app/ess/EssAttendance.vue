<script setup lang="ts">
defineOptions({ name: 'EssAttendance' })
import { ref, computed, onMounted } from 'vue'
import { attendanceService, type AttendanceRecord } from '@/services/attendance'
import { regularizationService } from '@/services/regularization'
import { leaveService, type LeaveType } from '@/services/leave'
import { useAuth } from '@/composables/useAuth'

const { getUser } = useAuth()

// ── Month navigation ─────────────────────────────────────────────────────────
const today = new Date()
const viewYear  = ref(today.getFullYear())
const viewMonth = ref(today.getMonth() + 1) // 1-based

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

// ── Calendar data ────────────────────────────────────────────────────────────
const calLoading = ref(false)
const calError   = ref('')
const attendanceMap  = ref<Record<string, AttendanceRecord>>({})  // date → record
const leaveMap       = ref<Record<string, string>>({})             // date → leave type name
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
        const name  = l['leave_type_name'] as string | undefined ?? 'Leave'
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
// Returns array of 42 cells (6 rows × 7 cols), null = day from prev/next month
const calCells = computed(() => {
  const firstDay = new Date(viewYear.value, viewMonth.value - 1, 1).getDay() // 0=Sun
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
  return rec.status ?? 'none'
}

function cellRecord(day: number): AttendanceRecord | null {
  return attendanceMap.value[dateStr(day)] ?? null
}

function isToday(day: number) { return dateStr(day) === todayStr }
function isFuture(day: number) { return dateStr(day) > todayStr }

function cellClass(day: number) {
  const s = cellStatus(day)
  const base = 'cal-cell'
  const statusCls: Record<string, string> = {
    present:  'cell--present',
    late:     'cell--late',
    absent:   'cell--absent',
    leave:    'cell--leave',
    holiday:  'cell--holiday',
    half_day: 'cell--half',
    none:     '',
  }
  const cls = [base, statusCls[s] ?? '']
  if (isToday(day)) cls.push('cell--today')
  if (isFuture(day)) cls.push('cell--future')
  return cls.filter(Boolean).join(' ')
}

// ── Click handler ─────────────────────────────────────────────────────────────
function onDayClick(day: number | null) {
  if (!day) return
  const d = dateStr(day)
  if (d > todayStr) {
    // Future → apply leave
    openLeaveModal(d, d)
  } else {
    // Today or past → regularize
    openRegModal(d)
  }
}

// ── Regularization modal ──────────────────────────────────────────────────────
const regModal = ref(false)
const regForm  = ref({ date: '', regularization_type: '', check_in: '', check_out: '', reason: '', notes: '' })
const regRecord    = ref<AttendanceRecord | null>(null)
const regLookup    = ref(false)
const regLookupDone = ref(false)
const regSubmitting = ref(false)
const regError      = ref('')

async function openRegModal(date: string) {
  regForm.value = { date, regularization_type: '', check_in: '', check_out: '', reason: '', notes: '' }
  regRecord.value    = null
  regLookupDone.value = false
  regError.value     = ''
  regModal.value     = true
  // lookup attendance for this date
  regLookup.value = true
  try {
    const res = await attendanceService.getAttendanceRecords({ start_date: date, end_date: date })
    regRecord.value = res.records?.[0] ?? null
  } catch {
    regRecord.value = null
  } finally {
    regLookup.value = false
    regLookupDone.value = true
  }
}

const regCanSubmit = computed(() =>
  !!regRecord.value &&
  !!regForm.value.regularization_type &&
  regForm.value.reason.length >= 10
)

async function submitReg() {
  if (!regCanSubmit.value || !regRecord.value) return
  regSubmitting.value = true
  regError.value = ''
  try {
    await regularizationService.createRequest({
      attendance_id:      Number(regRecord.value.id),
      regularization_type: regForm.value.regularization_type,
      reason:              regForm.value.reason,
      notes:               regForm.value.notes || null,
      check_in:            regForm.value.check_in || null,
      check_out:           regForm.value.check_out || null,
    })
    regModal.value = false
    await loadCalendar()
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
const leaveBalances = ref<Record<number, number>>({}) // leave_type_id → available
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
    try {
      leaveTypes.value = await leaveService.getLeaveTypes({ active_only: true })
    } catch {
      leaveTypes.value = []
    }
  }
  // load balances
  try {
    const res = await leaveService['getMyLeaveBalances']?.() ?? { data: [] }
    const balArr: Array<{ leave_type_id?: number; available?: number }> = Array.isArray(res) ? res : (res as Record<string, unknown[]>)?.data ?? []
    const map: Record<number, number> = {}
    balArr.forEach(b => { if (b.leave_type_id) map[b.leave_type_id] = b.available ?? 0 })
    leaveBalances.value = map
  } catch {
    leaveBalances.value = {}
  }
}

const selectedTypeBalance = computed(() => {
  if (!leaveForm.value.leave_type_id) return null
  const b = leaveBalances.value[leaveForm.value.leave_type_id]
  return b !== undefined ? b : null
})

const leaveCanSubmit = computed(() =>
  !!leaveForm.value.leave_type_id &&
  !!leaveForm.value.start_date &&
  !!leaveForm.value.end_date &&
  leaveForm.value.reason.length >= 5
)

async function submitLeave() {
  if (!leaveCanSubmit.value) return
  leaveSubmitting.value = true
  leaveError.value = ''
  try {
    const user = getUser()
    const employeeId = (user?.employee_id as number) || (user?.id as number)
    await leaveService.createLeaveRequest({
      employee_id:    Number(employeeId),
      leave_type_id:  leaveForm.value.leave_type_id,
      start_date:     leaveForm.value.start_date,
      end_date:       leaveForm.value.end_date,
      leave_period:   leaveForm.value.leave_period,
      reason:         leaveForm.value.reason,
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

// ── Format helpers ────────────────────────────────────────────────────────────
const formatTime = (t?: string | null) => {
  if (!t) return '—'
  const ts = t.includes('T') ? t : `1970-01-01T${t}`
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const REG_TYPES: Record<string, string> = {
  forgot_punch:    'Forgot to Punch',
  system_error:    'System Error',
  late_arrival:    'Late Arrival',
  early_departure: 'Early Departure',
  work_from_home:  'Work from Home',
  official_work:   'Official Work',
  other:           'Other',
}

onMounted(loadCalendar)
</script>

<template>
  <div class="ess-att">

    <!-- ── Summary strip ─────────────────────────────────────────────────── -->
    <div class="summary-row">
      <div class="stat-card">
        <p class="stat-label">Present</p>
        <p class="stat-val stat-green">{{ summary.present_days }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Absent</p>
        <p class="stat-val stat-red">{{ summary.absent_days }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Late</p>
        <p class="stat-val stat-yellow">{{ summary.late_days }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">On Leave</p>
        <p class="stat-val stat-blue">{{ summary.leave_days }}</p>
      </div>
    </div>

    <!-- ── Calendar header ───────────────────────────────────────────────── -->
    <div class="cal-header">
      <button class="nav-btn" @click="prevMonth">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
      <span class="cal-month">{{ monthLabel }}</span>
      <button class="nav-btn" @click="nextMonth">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>

    <!-- Legend -->
    <div class="legend">
      <span class="leg-item"><i class="leg-dot dot-present"></i>Present</span>
      <span class="leg-item"><i class="leg-dot dot-late"></i>Late</span>
      <span class="leg-item"><i class="leg-dot dot-absent"></i>Absent</span>
      <span class="leg-item"><i class="leg-dot dot-leave"></i>Leave</span>
      <span class="leg-item"><i class="leg-dot dot-half"></i>Half Day</span>
      <span class="leg-hint">Click past date → Regularize &nbsp;|&nbsp; Click future date → Apply Leave</span>
    </div>

    <!-- Error -->
    <div v-if="calError" class="alert-error">{{ calError }}</div>

    <!-- Loading skeleton -->
    <div v-if="calLoading" class="cal-grid cal-loading">
      <div v-for="i in 7" :key="i" class="cal-dow">{{ ['Su','Mo','Tu','We','Th','Fr','Sa'][i-1] }}</div>
      <div v-for="i in 35" :key="i" class="cal-cell cal-skel"></div>
    </div>

    <!-- Calendar grid -->
    <div v-else class="cal-grid">
      <!-- Day of week headers -->
      <div v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d" class="cal-dow">{{ d }}</div>

      <!-- Date cells -->
      <div
        v-for="(day, idx) in calCells"
        :key="idx"
        :class="day ? cellClass(day) : 'cal-cell cell--empty'"
        @click="day ? onDayClick(day) : undefined"
      >
        <template v-if="day">
          <span class="cell-day">{{ day }}</span>
          <template v-if="cellRecord(day)">
            <span class="cell-time">{{ formatTime(cellRecord(day)!.check_in) }}</span>
          </template>
          <template v-else-if="leaveMap[dateStr(day)]">
            <span class="cell-leave-label">{{ leaveMap[dateStr(day)] }}</span>
          </template>
          <!-- action hint on hover -->
          <span v-if="!isFuture(day)" class="cell-hint">Regularize</span>
          <span v-else class="cell-hint">Apply Leave</span>
        </template>
      </div>
    </div>

    <!-- ── Regularization Modal ────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="regModal" class="modal-overlay" @click.self="regModal = false">
        <div class="modal">
          <div class="modal-head">
            <div>
              <h2 class="modal-title">Regularization Request</h2>
              <p class="modal-sub">{{ regForm.date }}</p>
            </div>
            <button class="modal-close" @click="regModal = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <!-- Lookup state -->
            <div v-if="regLookup" class="lookup-state lookup-loading">
              <div class="mini-spin"></div> Looking up attendance record…
            </div>

            <div v-else-if="regLookupDone && !regRecord" class="lookup-state lookup-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 8v4M12 16h.01"/>
              </svg>
              No attendance record found for this date. Contact HR to create one first.
            </div>

            <template v-else-if="regRecord">
              <!-- Existing punch -->
              <div class="punch-summary">
                <span class="punch-summary__label">Existing record</span>
                <div class="punch-grid">
                  <div><span class="pk">In</span><span class="pv">{{ formatTime(regRecord.check_in) }}</span></div>
                  <div><span class="pk">Out</span><span class="pv">{{ formatTime(regRecord.check_out) }}</span></div>
                  <div><span class="pk">Hours</span><span class="pv">{{ regRecord.working_hours ? regRecord.working_hours+'h' : '—' }}</span></div>
                  <div><span class="pk">Status</span><span class="pv">{{ regRecord.status }}</span></div>
                </div>
              </div>

              <!-- Type -->
              <div class="field">
                <label class="label">Type <span class="req">*</span></label>
                <select v-model="regForm.regularization_type" class="input">
                  <option value="">Select…</option>
                  <option v-for="(label, val) in REG_TYPES" :key="val" :value="val">{{ label }}</option>
                </select>
              </div>

              <!-- Times -->
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

              <!-- Reason -->
              <div class="field">
                <label class="label">Reason <span class="req">*</span></label>
                <textarea v-model="regForm.reason" class="input textarea" rows="3" placeholder="Minimum 10 characters…"></textarea>
              </div>

              <!-- Notes -->
              <div class="field">
                <label class="label">Additional Notes</label>
                <textarea v-model="regForm.notes" class="input textarea" rows="2" placeholder="Optional…"></textarea>
              </div>

              <div v-if="regError" class="alert-error">{{ regError }}</div>

              <div class="modal-actions">
                <button class="btn-cancel" @click="regModal = false" :disabled="regSubmitting">Cancel</button>
                <button class="btn-submit" @click="submitReg" :disabled="regSubmitting || !regCanSubmit">
                  <div v-if="regSubmitting" class="mini-spin"></div>
                  {{ regSubmitting ? 'Submitting…' : 'Submit Request' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Leave Request Modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="leaveModal" class="modal-overlay" @click.self="leaveModal = false">
        <div class="modal">
          <div class="modal-head">
            <div>
              <h2 class="modal-title">Apply for Leave</h2>
              <p class="modal-sub">{{ leaveForm.start_date }}</p>
            </div>
            <button class="modal-close" @click="leaveModal = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">

            <!-- Success -->
            <div v-if="leaveSuccess" class="success-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              Leave request submitted successfully!
            </div>

            <template v-else>
              <!-- Date range -->
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

              <!-- Leave type -->
              <div class="field">
                <label class="label">Leave Type <span class="req">*</span></label>
                <select v-model.number="leaveForm.leave_type_id" class="input">
                  <option :value="0">Select type…</option>
                  <option v-for="lt in leaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
                </select>
                <p v-if="selectedTypeBalance !== null" class="hint">
                  Available balance: <strong>{{ selectedTypeBalance }} days</strong>
                </p>
              </div>

              <!-- Period -->
              <div class="field">
                <label class="label">Period</label>
                <select v-model="leaveForm.leave_period" class="input">
                  <option value="full_day">Full Day</option>
                  <option value="half_day_morning">Half Day – Morning</option>
                  <option value="half_day_afternoon">Half Day – Afternoon</option>
                </select>
              </div>

              <!-- Reason -->
              <div class="field">
                <label class="label">Reason <span class="req">*</span></label>
                <textarea v-model="leaveForm.reason" class="input textarea" rows="3" placeholder="Why are you applying for leave?"></textarea>
              </div>

              <div v-if="leaveError" class="alert-error">{{ leaveError }}</div>

              <div class="modal-actions">
                <button class="btn-cancel" @click="leaveModal = false" :disabled="leaveSubmitting">Cancel</button>
                <button class="btn-submit" @click="submitLeave" :disabled="leaveSubmitting || !leaveCanSubmit">
                  <div v-if="leaveSubmitting" class="mini-spin"></div>
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
/* ── page ─────────────────────────────────────────────────────────────────── */
.ess-att { display: flex; flex-direction: column; gap: 20px; }

/* ── summary strip ────────────────────────────────────────────────────────── */
.summary-row {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
.stat-card {
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 10px; padding: 14px 18px;
}
.stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); margin: 0; }
.stat-val   { font-size: 26px; font-weight: 700; color: var(--text); margin: 4px 0 0; }
.stat-green { color: #36D399; }
.stat-red   { color: #FF6B6B; }
.stat-yellow{ color: #F9A825; }
.stat-blue  { color: #4F7EFF; }

/* ── calendar header ──────────────────────────────────────────────────────── */
.cal-header {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 10px; padding: 10px 16px;
}
.cal-month { font-size: 15px; font-weight: 600; color: var(--text); }
.nav-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 7px;
  background: var(--surface2); border: 1px solid var(--surface3);
  color: var(--muted); cursor: pointer; transition: color .15s, background .15s;
}
.nav-btn:hover { color: var(--text); background: var(--surface3); }

/* ── legend ───────────────────────────────────────────────────────────────── */
.legend {
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px 18px;
  font-size: 11px; color: var(--muted);
}
.leg-item { display: flex; align-items: center; gap: 5px; }
.leg-dot  { display: inline-block; width: 9px; height: 9px; border-radius: 3px; }
.dot-present { background: #36D399; }
.dot-late    { background: #F9A825; }
.dot-absent  { background: #FF6B6B; }
.dot-leave   { background: #4F7EFF; }
.dot-half    { background: #9B6EFF; }
.leg-hint    { margin-left: auto; font-size: 11px; color: var(--muted); opacity: .7; }

/* ── calendar grid ────────────────────────────────────────────────────────── */
.cal-grid {
  display: grid; grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 12px; padding: 14px;
}
.cal-dow {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px;
  color: var(--muted); text-align: center; padding: 6px 0 10px;
}
.cal-cell {
  position: relative;
  min-height: 68px; border-radius: 8px; padding: 7px 8px;
  display: flex; flex-direction: column; gap: 3px;
  border: 1px solid transparent;
  cursor: pointer; transition: background .12s, border-color .12s;
  overflow: hidden;
}
.cal-cell:hover .cell-hint { opacity: 1; }
.cal-cell:hover { border-color: var(--surface3); }

.cell--empty { cursor: default; }

/* status colours */
.cell--present { background: rgba(54,211,153,.1); border-color: rgba(54,211,153,.2); }
.cell--late    { background: rgba(249,168,37,.1); border-color: rgba(249,168,37,.2); }
.cell--absent  { background: rgba(255,107,107,.1); border-color: rgba(255,107,107,.2); }
.cell--leave   { background: rgba(79,126,255,.1);  border-color: rgba(79,126,255,.2); }
.cell--holiday { background: rgba(155,110,255,.1); border-color: rgba(155,110,255,.2); }
.cell--half    { background: rgba(155,110,255,.08); border-color: rgba(155,110,255,.2); }
.cell--today   { border-color: var(--accent) !important; }
.cell--future  { opacity: .75; }
.cell--future:hover { opacity: 1; background: rgba(79,126,255,.07); }

/* cell internals */
.cell-day   { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1; }
.cell-time  { font-size: 10px; color: var(--muted); }
.cell-leave-label { font-size: 10px; color: #4F7EFF; }
.cell-hint  {
  position: absolute; bottom: 5px; left: 0; right: 0;
  text-align: center; font-size: 9px; font-weight: 600;
  color: var(--accent); opacity: 0;
  transition: opacity .15s;
  pointer-events: none;
  text-transform: uppercase; letter-spacing: .3px;
}

/* loading skeleton */
.cal-skel { background: var(--surface2); animation: pulse 1.4s ease infinite; }
@keyframes pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }

/* ── modal ────────────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 16px; width: 100%; max-width: 520px;
  max-height: 92vh; display: flex; flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,.5);
}
.modal-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px 14px; border-bottom: 1px solid var(--surface3); flex-shrink: 0;
}
.modal-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
.modal-sub   { font-size: 12px; color: var(--muted); margin: 3px 0 0; }
.modal-close {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px;
  background: none; border: none; color: var(--muted);
  cursor: pointer; transition: background .15s, color .15s; flex-shrink: 0;
}
.modal-close:hover { background: var(--surface2); color: var(--text); }
.modal-body  { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }

/* ── form ─────────────────────────────────────────────────────────────────── */
.field      { display: flex; flex-direction: column; gap: 5px; }
.field-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.label      { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
.req        { color: var(--red); }
.input {
  background: var(--surface2); border: 1px solid var(--surface3);
  color: var(--text); border-radius: 8px; padding: 9px 12px;
  font-size: 13px; outline: none; transition: border-color .15s;
  width: 100%; box-sizing: border-box;
}
.input:focus  { border-color: var(--accent); }
.textarea     { resize: vertical; min-height: 68px; font-family: inherit; line-height: 1.5; }
.hint         { font-size: 11px; color: var(--muted); margin: 0; }
.input[type="date"], .input[type="time"], select.input option { color-scheme: dark; }

/* lookup */
.lookup-state {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; padding: 12px 14px; border-radius: 8px;
}
.lookup-loading { background: var(--surface2); color: var(--muted); }
.lookup-error {
  background: rgba(255,107,107,.08); border: 1px solid rgba(255,107,107,.2); color: var(--red);
}

/* punch summary */
.punch-summary {
  background: var(--surface2); border: 1px solid var(--surface3);
  border-radius: 8px; padding: 12px 14px;
}
.punch-summary__label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); display: block; margin-bottom: 10px; }
.punch-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.pk { font-size: 11px; color: var(--muted); display: block; }
.pv { font-size: 13px; font-weight: 500; color: var(--text); display: block; margin-top: 2px; }

/* success */
.success-banner {
  display: flex; align-items: center; gap: 10px;
  background: rgba(54,211,153,.1); border: 1px solid rgba(54,211,153,.25);
  color: #36D399; padding: 14px 16px; border-radius: 8px; font-size: 14px; font-weight: 500;
}

/* alerts */
.alert-error {
  background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.3);
  color: var(--red); padding: 10px 14px; border-radius: 8px; font-size: 13px;
}

/* actions */
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.btn-cancel {
  padding: 9px 18px; font-size: 13px; font-weight: 500;
  background: var(--surface2); color: var(--muted);
  border: 1px solid var(--surface3); border-radius: 8px; cursor: pointer;
  transition: color .15s, border-color .15s;
}
.btn-cancel:hover:not(:disabled) { color: var(--text); border-color: var(--text); }
.btn-cancel:disabled { opacity: .5; cursor: not-allowed; }
.btn-submit {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 20px; font-size: 13px; font-weight: 600;
  background: var(--accent); color: #fff;
  border: none; border-radius: 8px; cursor: pointer; transition: opacity .15s;
}
.btn-submit:hover:not(:disabled) { opacity: .88; }
.btn-submit:disabled { opacity: .45; cursor: not-allowed; }

/* spinner */
.mini-spin {
  width: 13px; height: 13px; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.25); border-top-color: #fff;
  border-radius: 50%; animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .summary-row { grid-template-columns: 1fr 1fr; }
  .field-row   { grid-template-columns: 1fr; }
  .punch-grid  { grid-template-columns: 1fr 1fr; }
  .cal-cell    { min-height: 52px; padding: 5px 4px; }
  .cell-day    { font-size: 12px; }
  .cell-time   { display: none; }
  .leg-hint    { display: none; }
}
</style>
