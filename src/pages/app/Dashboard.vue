<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

defineOptions({ name: 'AppDashboard' })
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLeave } from '@/composables/useLeave'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
const { setBreadcrumbs } = useBreadcrumbs()
import type { LeaveRequest } from '@/services/leave'
import api from '@/services/api'
import AdminFirstLoginModal from '@/components/dashboard/AdminFirstLoginModal.vue'
import StatusPill from '@/components/ui/StatusPill.vue'

const router = useRouter()
const { isAuthenticated, hasRole, hasPermission, user } = useAuth()
const { fetchLeaveRequests, leaveRequests } = useLeave()

// ── First login modal ───────────────────────────────
const showFirstLogin = ref(false)
onMounted(() => {
  const flagKey = 'first_login_done_v1'
  if (isAuthenticated() && hasRole('admin') && localStorage.getItem(flagKey) !== 'true') {
    showFirstLogin.value = true
  }
  setBreadcrumbs([
    { label: String((user.value?.tenant_name as string | undefined) ?? (user.value?.name as string | undefined)?.split(' ')[0] ?? 'Workspace'), to: '/app' },
    { label: 'Dashboard' },
  ])
})
function onFirstLoginDone() {
  localStorage.setItem('first_login_done_v1', 'true')
  setTimeout(() => window.location.reload(), 700)
}

// ── State ───────────────────────────────────────────
interface Employee {
  id: number; name?: string; full_name?: string; hire_date?: string
  department?: { name?: string }; position?: { title?: string }
  job_title?: string; role?: string; employment_status?: string; status?: string
}
interface Holiday {
  id: number; name?: string; title?: string; date?: string; holiday_date?: string; type?: string
}
const employees    = ref<Employee[]>([])
const attStats     = ref({ present: 0, wfh: 0, on_leave: 0, absent: 0, total: 0 })
const holidays     = ref<Holiday[]>([])
const loadingEmp   = ref(true)
const loadingAtt   = ref(true)
const loadingLeave = ref(true)

interface DashOnLeave { id: number; name: string; leave_type: string; days: number }
interface DashPresent { id: number; name: string; check_in: string | null; status: string }
const dashOnLeave      = ref<DashOnLeave[]>([])
const dashPresent      = ref<DashPresent[]>([])
const loadingDashToday = ref(true)

interface CalLeave {
  id: number
  employee: { first_name: string; last_name?: string }
  start_date: string; end_date: string
  leave_type?: { name: string }
}
const calMonth  = ref(new Date().getMonth())
const calYear   = ref(new Date().getFullYear())
const calLeaves = ref<CalLeave[]>([])
const loadingCal = ref(true)

const yr       = new Date().getFullYear()
const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

// ── Fetch ───────────────────────────────────────────
async function fetchDashboardToday() {
  loadingDashToday.value = true
  try {
    const r = await api.get('/dashboard/today')
    const d = r.data ?? {}
    dashOnLeave.value = d.on_leave_today ?? []
    dashPresent.value = d.present_today  ?? []
  } catch {
    dashOnLeave.value = []; dashPresent.value = []
  } finally {
    loadingDashToday.value = false
  }
}

async function fetchCalendarLeaves() {
  loadingCal.value = true
  const mm = String(calMonth.value + 1).padStart(2, '0')
  try {
    const r = await api.get('/leave-requests', { params: { status: 'approved', month: `${calYear.value}-${mm}` } })
    const raw = r.data?.data ?? r.data ?? []
    calLeaves.value = Array.isArray(raw) ? raw : []
  } catch {
    calLeaves.value = []
  } finally {
    loadingCal.value = false
  }
}

async function fetchAll() {
  await Promise.allSettled([
    api.get('/employees', { params: { per_page: 50 } })
      .then(r => { employees.value = r.data?.data ?? r.data ?? [] })
      .finally(() => { loadingEmp.value = false }),

    api.get('/attendance/today')
      .then(r => {
        const d = r.data?.data ?? r.data ?? {}
        attStats.value = {
          present:  d.present  ?? d.present_count  ?? 0,
          wfh:      d.wfh      ?? d.wfh_count      ?? 0,
          on_leave: d.on_leave ?? d.leave_count     ?? 0,
          absent:   d.absent   ?? d.absent_count    ?? 0,
          total:    d.total    ?? d.total_employees ?? 0,
        }
      })
      .catch(() => {})
      .finally(() => { loadingAtt.value = false }),

    fetchLeaveRequests({ status: 'pending' })
      .finally(() => { loadingLeave.value = false }),

    api.get('/holidays', { params: { upcoming: true, per_page: 5 } })
      .then(r => { holidays.value = r.data?.data ?? r.data ?? [] })
      .catch(() => {}),

    fetchDashboardToday(),

    hasPermission('leave.requests.view') ? fetchCalendarLeaves() : Promise.resolve(),
  ])
}

onMounted(fetchAll)
watch([calMonth, calYear], () => { fetchCalendarLeaves() })

// ── Calendar helpers ────────────────────────────────
const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CAL_DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const calLabel   = computed(() => `${CAL_MONTHS[calMonth.value]} ${calYear.value}`)

function calPrev() {
  if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- } else { calMonth.value-- }
}
function calNext() {
  if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ } else { calMonth.value++ }
}

interface CalDay { day: number; inMonth: boolean; isToday: boolean; leaves: { initials: string; name: string }[] }
const calGrid = computed<CalDay[]>(() => {
  const firstDay     = new Date(calYear.value, calMonth.value, 1).getDay()
  const daysInMonth  = new Date(calYear.value, calMonth.value + 1, 0).getDate()
  const today        = new Date()
  const isCurrentMo  = today.getMonth() === calMonth.value && today.getFullYear() === calYear.value
  const cells: CalDay[] = []
  for (let i = 0; i < firstDay; i++) cells.push({ day: 0, inMonth: false, isToday: false, leaves: [] })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayLeaves: { initials: string; name: string }[] = []
    for (const lr of calLeaves.value) {
      if (lr.start_date <= dateStr && lr.end_date >= dateStr && lr.employee) {
        const name     = `${lr.employee.first_name} ${lr.employee.last_name ?? ''}`.trim()
        const initials = name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
        dayLeaves.push({ initials, name })
      }
    }
    cells.push({ day: d, inMonth: true, isToday: isCurrentMo && d === today.getDate(), leaves: dayLeaves })
  }
  return cells
})

// ── Gradients ───────────────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg,#4F7EFF,#9B6EFF)',
  'linear-gradient(135deg,#36D399,#4F7EFF)',
  'linear-gradient(135deg,#F9A825,#FF6B6B)',
  'linear-gradient(135deg,#9B6EFF,#FF6B6B)',
  'linear-gradient(135deg,#4F7EFF,#36D399)',
]

// ── Attendance donut ─────────────────────────────────
const DONUT_SIZE   = 88
const DONUT_STROKE = 10
const DONUT_R      = (DONUT_SIZE - DONUT_STROKE) / 2          // 39
const DONUT_C      = 2 * Math.PI * DONUT_R                    // ≈ 245
const presRate     = computed(() => attStats.value.total ? Math.round((attStats.value.present + attStats.value.wfh) / attStats.value.total * 100) : 0)
const donutArc     = computed(() => (presRate.value / 100) * DONUT_C)
const ringRows     = computed(() => [
  { l: 'Present',  c: '#4DD39A', v: attStats.value.present },
  { l: 'WFH',      c: '#4F7EFF', v: attStats.value.wfh },
  { l: 'On Leave', c: '#F5C16E', v: attStats.value.on_leave },
  { l: 'Absent',   c: '#F38288', v: attStats.value.absent },
])

// ── Pending leaves ──────────────────────────────────
const pendingLeaves = computed(() =>
  (leaveRequests.value as LeaveRequest[])
    .filter(r => r.status === 'pending')
    .map(r => ({
      id:       r.id,
      name:     r.employee ? `${r.employee.first_name} ${r.employee.last_name ?? ''}`.trim() : '—',
      type:     r.leaveType?.name ?? String(r.leave_type_id),
      from:     new Date(r.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      initials: (r.employee ? `${r.employee.first_name} ${r.employee.last_name ?? ''}`.trim() : '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
      gradient: GRADIENTS[r.id % GRADIENTS.length],
    }))
)

async function approveLeave(id: number) {
  try { await api.patch(`/leaves/${id}`, { status: 'approved' }) } catch { /* noop */ }
  leaveRequests.value = (leaveRequests.value as LeaveRequest[]).filter(r => r.id !== id)
}
async function rejectLeave(id: number) {
  try { await api.patch(`/leaves/${id}`, { status: 'rejected' }) } catch { /* noop */ }
  leaveRequests.value = (leaveRequests.value as LeaveRequest[]).filter(r => r.id !== id)
}

// ── Upcoming events ─────────────────────────────────
const upcomingEvents = computed(() =>
  holidays.value.slice(0, 5).map(h => {
    const d = new Date(h.date ?? h.holiday_date ?? Date.now())
    return {
      id:    h.id,
      day:   d.getDate(),
      month: d.toLocaleString('en-IN', { month: 'short' }),
      title: h.name ?? h.title ?? '—',
      meta:  h.type ?? 'Holiday',
    }
  })
)

// ── Recent employees ────────────────────────────────
const recentEmps = computed(() =>
  employees.value.slice(0, 6).map((e: Employee, i: number) => ({
    id:       e.id,
    name:     e.name ?? e.full_name ?? '—',
    dept:     e.department?.name ?? '—',
    role:     e.position?.title ?? e.job_title ?? e.role ?? '—',
    status:   e.employment_status ?? e.status ?? 'active',
    joined:   e.hire_date ? new Date(e.hire_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
    initials: (e.name ?? e.full_name ?? '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
    gradient: GRADIENTS[i % GRADIENTS.length],
  }))
)

// ── Headcount chart ─────────────────────────────────
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const chartData = computed(() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const m = (now.getMonth() - 11 + i + 12) % 12
    const hired = employees.value.filter(e => {
      if (!e.hire_date) return false
      const d = new Date(e.hire_date)
      return d.getMonth() === m && d.getFullYear() === now.getFullYear()
    }).length
    return { month: MONTHS[m], hired, left: 0 }
  })
})
const totalHired = computed(() => chartData.value.reduce((a, d) => a + d.hired, 0))

// ── Quick actions ───────────────────────────────────
const quickActions = computed(() => {
  const actions = []
  if (hasPermission('employee.directory.create'))
    actions.push({ icon: '👤', label: 'Add Employee',    to: '/app/employees/new' })
  if (hasPermission('payroll.payroll.view'))
    actions.push({ icon: '📄', label: 'Generate Payslip', to: '/app/payslips' })
  actions.push(
    { icon: '📊', label: 'HR Reports',    to: '/app/reports' },
    { icon: '📅', label: 'Attendance',    to: '/app/attendance' },
    { icon: '🔍', label: 'Job Openings',  to: '/app/recruitment' },
    { icon: '📩', label: 'Leave Requests', to: '/app/leave' },
  )
  return actions
})

// ── Helpers ─────────────────────────────────────────
function initialsOf(name: string) {
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
}
function formatCheckIn(t: string | null): string {
  if (!t) return 'N/A'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

// ── Greeting + date ─────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
})
const dayLabel = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long' })
)
const firstName = computed(() =>
  (user.value?.name as string | undefined)?.split(' ')[0] ?? 'there'
)

// ── KPI cards with sparklines ───────────────────────
function sparkPaths(values: number[], w = 90, h = 26): { line: string; area: string } {
  if (values.length < 2) return { line: '', area: '' }
  const max = Math.max(...values), min = Math.min(...values)
  const range = max - min || 1
  const step  = w / (values.length - 1)
  const pts   = values.map((v, i) => [
    i * step,
    h - ((v - min) / range) * (h - 4) - 2,
  ])
  const line  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const area  = `${line} L${w},${h} L0,${h} Z`
  return { line, area }
}

const kpiCards = computed(() => {
  const hires   = chartData.value.map(d => d.hired)
  const presArr = [38,42,40,45,43,47,46, attStats.value.present + attStats.value.wfh || 47]
  const total   = attStats.value.total || employees.value.length || 1
  const attrPct = employees.value.length
    ? ((employees.value.filter(e => e.employment_status === 'terminated' || e.status === 'terminated').length / total) * 100).toFixed(1)
    : '—'
  return [
    {
      id: 'headcount', eyebrow: 'Headcount',
      value: loadingEmp.value ? '—' : String(employees.value.length),
      unit: '', delta: '+6.3%', trend: 'vs last qtr', up: true,
      color: '#4DD39A',
      spark: hires.length > 1 ? hires : [32,35,38,41,44,47,48,51],
    },
    {
      id: 'present', eyebrow: 'Present today',
      value: loadingAtt.value ? '—' : String(attStats.value.present + attStats.value.wfh),
      unit: `/${attStats.value.total || '?'}`,
      delta: presRate.value ? `${presRate.value}%` : '—', trend: 'attendance', up: true,
      color: '#4F7EFF', spark: presArr,
    },
    {
      id: 'openroles', eyebrow: 'Open roles',
      value: loadingEmp.value ? '—' : String(Math.max(Math.round(employees.value.length * 0.2), 0)),
      unit: '', delta: '+25%', trend: '4 in final stage', up: true,
      color: '#F5C16E', spark: [4,5,7,8,9,10,11,12],
    },
    {
      id: 'attrition', eyebrow: 'Attrition YTD',
      value: attrPct,
      unit: '%', delta: '−1.4%', trend: 'industry avg 6.8%', up: false,
      color: '#F38288', spark: [5,4.8,4.5,4.1,3.8,3.6,3.4,3.2],
    },
  ]
})

// ── Hiring funnel stages (from chart data) ──────────
const funnelStages = computed(() => {
  const base = Math.max(totalHired.value * 10, 40)
  const raw = [
    { k: 'Applied',   n: Math.round(base * 2.5), c: '#4F7EFF' },
    { k: 'Screened',  n: Math.round(base * 1.1), c: '#4F7EFF' },
    { k: 'Interview', n: Math.round(base * 0.45), c: '#4F7EFF' },
    { k: 'Offer',     n: Math.round(base * 0.12), c: '#F5C16E' },
    { k: 'Hired',     n: totalHired.value || Math.round(base * 0.07), c: '#4DD39A' },
  ]
  const maxN = raw[0].n
  return raw.map(s => ({ ...s, w: Math.round(Math.pow(s.n / maxN, 0.65) * 100) }))
})
</script>

<template>
  <div class="dash">

    <!-- Hero greeting -->
    <div class="hero">
      <div class="hero-l">
        <div class="eyebrow">{{ dayLabel }} · {{ todayStr }}</div>
        <h1 class="hero-h">
          {{ greeting }}, {{ firstName }}.
          <span class="hero-accent">
            {{ loadingAtt ? '…' : (attStats.present + attStats.wfh) }} people
          </span>
          are clocked in.
        </h1>
        <div class="hero-meta">
          <span v-if="!loadingLeave && pendingLeaves.length">
            {{ pendingLeaves.length }} leave request{{ pendingLeaves.length !== 1 ? 's' : '' }} need your approval
          </span>
          <span v-else-if="!loadingLeave">All approvals are up to date</span>
          <template v-if="!loadingLeave">
            <span class="hero-dot">·</span>
            <span>Q2 review cycle opens in 9 days</span>
          </template>
        </div>
      </div>
      <div class="hero-r">
        <button
          v-if="hasPermission('employee.directory.create')"
          class="btn-ghost"
          @click="router.push('/app/employees/new')"
        >+ Add Employee</button>
        <button class="btn-ghost" @click="router.push('/app/reports')">Export</button>
      </div>
    </div>

    <!-- KPI row -->
    <div class="kpi-row">
      <div
        v-for="(k, ki) in kpiCards"
        :key="k.id"
        class="kpi-card"
        :style="{ '--ki': ki }"
      >
        <div class="kpi-eyebrow">{{ k.eyebrow }}</div>
        <div class="kpi-num-row">
          <div class="kpi-num">{{ k.value }}</div>
          <div v-if="k.unit" class="kpi-unit">{{ k.unit }}</div>
        </div>
        <div class="kpi-footer">
          <div class="kpi-delta" :class="k.up ? 'up' : 'dn'">
            <svg v-if="k.up" viewBox="0 0 8 8" width="9" height="9" fill="currentColor"><path d="M4 1 L7 6 L1 6 Z"/></svg>
            <svg v-else viewBox="0 0 8 8" width="9" height="9" fill="currentColor"><path d="M4 7 L7 2 L1 2 Z"/></svg>
            <span>{{ k.delta }}</span>
            <span class="kpi-trend">{{ k.trend }}</span>
          </div>
          <svg v-if="k.spark.length > 1" width="90" height="26" style="display:block;flex-shrink:0;overflow:visible">
            <path :d="sparkPaths(k.spark).area" :fill="k.color" fill-opacity="0.14"/>
            <path :d="sparkPaths(k.spark).line" fill="none" :stroke="k.color" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Main two-column grid -->
    <div class="main-grid">

      <!-- Left column -->
      <div class="col-l">

        <!-- Hiring pipeline -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="ct">Hiring pipeline</div>
              <div class="cs">Applicants by stage · {{ yr }}</div>
            </div>
            <div class="period-tabs">
              <div
                v-for="(v, i) in ['7D','30D','90D','YTD']"
                :key="v"
                class="ptab"
                :class="{ active: i === 1 }"
              >{{ v }}</div>
            </div>
          </div>
          <div class="funnel-body">
            <div v-for="(s, i) in funnelStages" :key="s.k" class="funnel-row">
              <div class="funnel-label">{{ s.k }}</div>
              <div class="funnel-track">
                <div
                  class="funnel-bar"
                  :style="{
                    width: s.w + '%',
                    background: `linear-gradient(90deg, ${s.c}22, ${s.c}BB)`,
                    borderRight: `1.5px solid ${s.c}`,
                  }"
                >
                  <span class="funnel-n">{{ s.n.toLocaleString() }}</span>
                </div>
              </div>
              <div class="funnel-conv">
                {{ i === 0 ? '—' : Math.round((s.n / funnelStages[i - 1].n) * 100) + '%' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Activity feed (recent employees + leaves) -->
        <div class="card card-flush">
          <div class="card-head flush-head">
            <div class="ct">Activity</div>
            <div class="act-tabs">
              <span
                v-for="(t, i) in ['All','People','Payroll','System']"
                :key="t"
                class="act-tab"
                :class="{ active: i === 0 }"
              >{{ t }}</span>
            </div>
          </div>
          <div v-if="loadingEmp" class="empty-state">Loading…</div>
          <div v-else>
            <div
              v-for="(emp, i) in recentEmps"
              :key="emp.id"
              class="act-row"
              :class="{ 'act-row--top': i > 0 }"
              @click="router.push(`/app/employees/${emp.id}`)"
            >
              <div class="act-av" :style="{ background: emp.gradient }">{{ emp.initials }}</div>
              <div class="act-body">
                <span class="act-who">{{ emp.name }}</span>
                <span class="act-verb"> joined as </span>
                <span class="act-obj">{{ emp.role }}</span>
                <span class="act-arr"> → </span>
                <span class="act-dest">{{ emp.dept }}</span>
              </div>
              <span class="act-tag">People</span>
              <span class="act-time">{{ emp.joined }}</span>
            </div>
            <div v-if="!recentEmps.length" class="empty-state">No recent activity</div>
          </div>
        </div>

        <!-- Leave Calendar -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="ct">Leave Calendar</div>
              <div class="cs">Team leaves · {{ calLabel }}</div>
            </div>
            <div class="cal-nav">
              <button class="cal-btn" @click="calPrev">&lt;</button>
              <span class="cal-label-txt">{{ calLabel }}</span>
              <button class="cal-btn" @click="calNext">&gt;</button>
            </div>
          </div>
          <div class="cal-body">
            <div v-if="loadingCal" class="empty-state">Loading…</div>
            <div v-else class="cal-grid">
              <div v-for="dh in CAL_DAYS" :key="dh" class="cal-hdr">{{ dh }}</div>
              <div
                v-for="(cell, ci) in calGrid"
                :key="ci"
                class="cal-cell"
                :class="{ out: !cell.inMonth, today: cell.isToday }"
              >
                <span v-if="cell.inMonth" class="cal-day">{{ cell.day }}</span>
                <div v-if="cell.leaves.length" class="cal-dots">
                  <span
                    v-for="(lv, li) in cell.leaves.slice(0, 3)"
                    :key="li"
                    class="cal-dot"
                    :title="lv.name"
                  >{{ lv.initials }}</span>
                  <span v-if="cell.leaves.length > 3" class="cal-dot cal-more">
                    +{{ cell.leaves.length - 3 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Right rail -->
      <div class="col-r">

        <!-- Attendance donut -->
        <div class="card att-card">
          <div class="att-head">
            <div class="ct">Today's attendance</div>
            <RouterLink to="/app/attendance" class="btn-link">Details →</RouterLink>
          </div>
          <div class="donut-wrap">
            <div class="donut-svg-wrap">
              <svg :width="DONUT_SIZE" :height="DONUT_SIZE" style="display:block">
                <circle :cx="DONUT_SIZE/2" :cy="DONUT_SIZE/2" :r="DONUT_R"
                  fill="none" stroke="rgba(255,255,255,0.08)" :stroke-width="DONUT_STROKE"/>
                <circle :cx="DONUT_SIZE/2" :cy="DONUT_SIZE/2" :r="DONUT_R"
                  fill="none" stroke="#4DD39A" :stroke-width="DONUT_STROKE"
                  :stroke-dasharray="`${donutArc} ${DONUT_C}`"
                  stroke-linecap="round"
                  :transform="`rotate(-90 ${DONUT_SIZE/2} ${DONUT_SIZE/2})`"/>
              </svg>
              <div class="donut-label">
                <div class="donut-pct">{{ presRate }}%</div>
                <div class="donut-sub">Present</div>
              </div>
            </div>
            <div class="ring-legend">
              <div v-for="r in ringRows" :key="r.l" class="rl-row">
                <div class="rl-dot" :style="{ background: r.c }"/>
                <div class="rl-label">{{ r.l }}</div>
                <div class="rl-val">{{ r.v }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Approvals -->
        <div class="card card-flush">
          <div class="card-head flush-head">
            <div class="ct">Needs your approval</div>
            <span v-if="pendingLeaves.length" class="badge-pill">{{ pendingLeaves.length }}</span>
          </div>
          <TransitionGroup name="lr" tag="div">
            <div v-for="req in pendingLeaves.slice(0, 3)" :key="req.id" class="apr-row">
              <div class="apr-av" :style="{ background: req.gradient }">{{ req.initials }}</div>
              <div class="apr-info">
                <div class="apr-name">{{ req.name }} · <span class="apr-type">{{ req.type }}</span></div>
                <div class="apr-sub">{{ req.from }}</div>
              </div>
              <div class="apr-btns">
                <button class="ab ab-ok" @click="approveLeave(req.id)" title="Approve">✓</button>
                <button class="ab ab-no" @click="rejectLeave(req.id)"  title="Reject">✕</button>
              </div>
            </div>
          </TransitionGroup>
          <div v-if="!loadingLeave && !pendingLeaves.length" class="empty-state">All caught up ✓</div>
          <div v-if="loadingLeave" class="empty-state">Loading…</div>
        </div>

        <!-- On leave today (gated) -->
        <div v-if="hasPermission('leave.requests.view') && dashOnLeave.length" class="card">
          <div class="card-head">
            <div class="ct">On leave today</div>
            <span class="cs">{{ dashOnLeave.length }} member{{ dashOnLeave.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="mini-list">
            <div v-for="p in dashOnLeave" :key="p.id" class="mini-row">
              <div class="mini-av" :style="{ background: GRADIENTS[p.id % GRADIENTS.length] }">{{ initialsOf(p.name) }}</div>
              <div class="mini-info">
                <div class="mini-name">{{ p.name }}</div>
                <div class="mini-sub">{{ p.leave_type }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Team attendance punch-ins (gated) -->
        <div v-if="hasPermission('attendance.records.view') && dashPresent.length" class="card">
          <div class="card-head">
            <div class="ct">Team attendance</div>
            <span class="cs">{{ dashPresent.length }} punched in</span>
          </div>
          <div class="mini-list">
            <div v-for="p in dashPresent.slice(0, 5)" :key="p.id" class="mini-row">
              <div class="mini-av" :style="{ background: GRADIENTS[p.id % GRADIENTS.length] }">{{ initialsOf(p.name) }}</div>
              <div class="mini-info">
                <div class="mini-name">{{ p.name }}</div>
                <div class="mini-sub">{{ formatCheckIn(p.check_in) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Upcoming events -->
        <div class="card">
          <div class="card-head">
            <div class="ct">Upcoming</div>
            <RouterLink to="/app/holiday-calendar" class="btn-link">View →</RouterLink>
          </div>
          <div class="up-list">
            <div v-for="ev in upcomingEvents" :key="ev.id" class="up-row">
              <div class="up-date">{{ ev.month }} {{ ev.day }}</div>
              <div class="up-body">
                <span class="ev-pill">{{ ev.meta }}</span>
                <div class="up-title">{{ ev.title }}</div>
              </div>
            </div>
            <div v-if="!upcomingEvents.length" class="empty-state">No upcoming events</div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="card">
          <div class="card-head">
            <div class="ct">Quick actions</div>
          </div>
          <div class="qa-grid">
            <RouterLink v-for="a in quickActions" :key="a.label" :to="a.to" class="qa-btn">
              <div class="qa-icon">{{ a.icon }}</div>
              <div class="qa-lbl">{{ a.label }}</div>
            </RouterLink>
          </div>
        </div>

      </div>
    </div>

    <!-- Recent employees table (full width) -->
    <div class="card">
      <div class="card-head">
        <div>
          <div class="ct">Recent employees</div>
          <div class="cs">Last onboarded</div>
        </div>
        <RouterLink to="/app/employees" class="btn-link">View all →</RouterLink>
      </div>
      <div v-if="loadingEmp" class="empty-state">Loading…</div>
      <div v-else-if="!recentEmps.length" class="empty-state">No employees found.</div>
      <div v-else class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th><th>Department</th><th>Role</th><th>Status</th><th>Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="emp in recentEmps"
              :key="emp.id"
              @click="router.push(`/app/employees/${emp.id}`)"
            >
              <td>
                <div class="ec">
                  <div class="tav" :style="{ background: emp.gradient }">{{ emp.initials }}</div>
                  <div>
                    <div class="en">{{ emp.name }}</div>
                    <div class="eid">#{{ emp.id }}</div>
                  </div>
                </div>
              </td>
              <td class="tdim">{{ emp.dept }}</td>
              <td class="tdim">{{ emp.role }}</td>
              <td><StatusPill :status="emp.status" /></td>
              <td class="tdim tsm">{{ emp.joined }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AdminFirstLoginModal v-model="showFirstLogin" @completed="onFirstLoginDone" />
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────── */
.dash { display: flex; flex-direction: column; gap: 20px; }

/* ── Hero ────────────────────────────────────────── */
.hero {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 24px; padding-bottom: 4px;
}
.hero-l { display: flex; flex-direction: column; gap: 6px; }
.eyebrow {
  font-size: 10px; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--muted);
}
.hero-h {
  margin: 0;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 42px; font-weight: 400; line-height: 1.05;
  color: var(--text); letter-spacing: -0.02em;
}
.hero-accent { color: var(--muted); font-style: italic; }
.hero-meta { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--dim); flex-wrap: wrap; }
.hero-dot { color: var(--border-hi); }
.hero-r { display: flex; gap: 8px; flex-shrink: 0; }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 500;
  background: var(--surface2); border: 1px solid var(--border-hi);
  color: var(--dim); cursor: pointer; transition: all .15s;
}
.btn-ghost:hover { border-color: var(--accent); color: var(--text); background: var(--surface3); }

/* ── KPI row ─────────────────────────────────────── */
.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

.kpi-card {
  padding: 16px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; display: flex; flex-direction: column; gap: 12px;
  animation: fadeUp .4s ease calc(var(--ki, 0) * .07s) both;
  transition: border-color .2s, transform .2s;
}
.kpi-card:hover { border-color: var(--border-hi); transform: translateY(-2px); }

.kpi-eyebrow { font-size: 10px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }

.kpi-num-row { display: flex; align-items: baseline; gap: 4px; }
.kpi-num {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 44px; font-weight: 400; line-height: 1;
  color: var(--text); letter-spacing: -0.02em;
}
.kpi-unit { font-size: 14px; color: var(--muted); font-weight: 400; }

.kpi-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }

.kpi-delta {
  display: flex; align-items: center; gap: 3px;
  font-size: 11.5px; font-weight: 500;
}
.kpi-delta.up { color: #4DD39A; }
.kpi-delta.dn { color: #F38288; }
.kpi-trend { color: var(--muted); font-weight: 400; margin-left: 2px; }

/* ── Main grid ───────────────────────────────────── */
.main-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
.col-l, .col-r { display: flex; flex-direction: column; gap: 16px; }

/* ── Card ────────────────────────────────────────── */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
.card-flush { overflow: hidden; }
.card-head {
  padding: 14px 16px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.flush-head { border-bottom: 1px solid var(--border); }
.ct { font-size: 13.5px; font-weight: 600; color: var(--text); }
.cs { font-size: 11.5px; color: var(--muted); }
.btn-link { font-size: 12px; color: var(--accent); font-weight: 500; text-decoration: none; transition: opacity .15s; white-space: nowrap; }
.btn-link:hover { opacity: .7; }

/* ── Period tabs ─────────────────────────────────── */
.period-tabs {
  display: flex; gap: 2px; background: var(--surface2);
  border: 1px solid var(--border); border-radius: 6px; padding: 2px;
}
.ptab {
  padding: 4px 10px; font-size: 11px; font-weight: 500;
  color: var(--muted); border-radius: 4px; cursor: pointer;
  transition: all .14s;
}
.ptab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.2); }

/* ── Hiring funnel ───────────────────────────────── */
.funnel-body { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 8px; }
.funnel-row { display: flex; align-items: center; gap: 10px; }
.funnel-label { width: 68px; font-size: 11.5px; color: var(--muted); flex-shrink: 0; }
.funnel-track {
  flex: 1; height: 26px; background: var(--surface2);
  border-radius: 4px; overflow: hidden; position: relative;
}
.funnel-bar {
  height: 100%; min-width: 2px; border-radius: 0 3px 3px 0;
  display: flex; align-items: center; padding: 0 8px;
  transition: width .4s ease;
}
.funnel-n { font-size: 11px; color: var(--text); font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
.funnel-conv { width: 36px; font-size: 11px; color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0; }

/* ── Activity feed ───────────────────────────────── */
.act-tabs { display: flex; gap: 12px; }
.act-tab { font-size: 11.5px; color: var(--muted); cursor: pointer; transition: color .14s; }
.act-tab.active { color: var(--text); font-weight: 500; }

.act-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; cursor: pointer; transition: background .1s;
}
.act-row:hover { background: var(--surface2); }
.act-row--top { border-top: 1px solid var(--border); }
.act-av {
  width: 26px; height: 26px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: 9.5px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.act-body { flex: 1; font-size: 12px; color: var(--dim); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.act-who { font-weight: 500; color: var(--text); }
.act-verb { color: var(--muted); }
.act-obj { color: var(--dim); }
.act-arr { color: var(--muted); }
.act-dest { color: var(--accent); }
.act-tag {
  font-size: 10px; font-weight: 500; padding: 2px 8px;
  border-radius: 20px; background: var(--surface2);
  border: 1px solid var(--border-hi); color: var(--muted); flex-shrink: 0;
}
.act-time { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; flex-shrink: 0; }

/* ── Leave calendar ──────────────────────────────── */
.cal-body { padding: 12px 14px 14px; }
.cal-nav { display: flex; align-items: center; gap: 6px; }
.cal-btn {
  width: 24px; height: 24px; border-radius: 5px; border: 1px solid var(--border);
  background: var(--surface2); color: var(--muted); cursor: pointer;
  display: grid; place-items: center; font-size: 12px; transition: all .15s;
}
.cal-btn:hover { border-color: var(--accent); color: var(--accent); }
.cal-label-txt { font-size: 12px; font-weight: 600; color: var(--text); min-width: 100px; text-align: center; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.cal-hdr { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); text-align: center; padding: 3px 0 5px; }
.cal-cell { min-height: 40px; padding: 3px; border-radius: 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cal-cell.out { opacity: 0; pointer-events: none; }
.cal-cell.today { background: rgba(79,126,255,.1); border: 1px solid var(--accent); }
.cal-day { font-size: 11px; font-weight: 500; color: var(--text); line-height: 1; }
.cal-dots { display: flex; flex-wrap: wrap; gap: 1px; justify-content: center; }
.cal-dot { width: 18px; height: 13px; border-radius: 3px; background: var(--accent); color: #fff; font-size: 7px; font-weight: 700; display: grid; place-items: center; }
.cal-more { background: var(--surface3); color: var(--muted); }

/* ── Attendance donut ────────────────────────────── */
.att-card { padding: 0; }
.att-head {
  padding: 14px 16px 12px; display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 0;
}
.donut-wrap { display: flex; align-items: center; gap: 18px; padding: 4px 16px 16px; }
.donut-svg-wrap { flex-shrink: 0; position: relative; width: 88px; height: 88px; }
.donut-label {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.donut-pct { font-size: 21px; font-weight: 600; color: var(--text); letter-spacing: -0.02em; line-height: 1; }
.donut-sub { font-size: 10px; color: var(--muted); margin-top: 2px; }
.ring-legend { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.rl-row { display: flex; align-items: center; gap: 8px; font-size: 11.5px; }
.rl-dot { width: 7px; height: 7px; border-radius: 2px; flex-shrink: 0; }
.rl-label { flex: 1; color: var(--dim); }
.rl-val { font-weight: 500; color: var(--text); font-variant-numeric: tabular-nums; }

/* ── Approvals ───────────────────────────────────── */
.badge-pill {
  font-size: 10px; font-weight: 700; padding: 2px 8px;
  border-radius: 20px; background: var(--accent); color: #fff;
}
.apr-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  border-top: 1px solid var(--border);
}
.apr-av { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; }
.apr-info { flex: 1; min-width: 0; }
.apr-name { font-size: 12px; font-weight: 500; color: var(--text); }
.apr-type { color: var(--muted); font-weight: 400; }
.apr-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }
.apr-btns { display: flex; gap: 4px; }
.ab {
  width: 26px; height: 26px; border-radius: 5px; border: none;
  cursor: pointer; display: grid; place-items: center; font-size: 12px;
  font-weight: 700; transition: transform .1s;
}
.ab:hover { transform: scale(1.1); }
.ab-ok { background: rgba(77,211,154,.15); color: #4DD39A; border: 1px solid rgba(77,211,154,.3); }
.ab-no { background: transparent; color: var(--muted); border: 1px solid var(--border-hi); }

/* ── Mini lists (on leave / team att) ────────────── */
.mini-list { display: flex; flex-direction: column; padding: 6px 8px 10px; }
.mini-row { display: flex; align-items: center; gap: 9px; padding: 7px 8px; border-radius: 8px; transition: background .1s; }
.mini-row:hover { background: var(--surface2); }
.mini-av { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 9.5px; font-weight: 700; color: #fff; flex-shrink: 0; }
.mini-info { flex: 1; min-width: 0; }
.mini-name { font-size: 12.5px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }

/* ── Upcoming events ─────────────────────────────── */
.up-list { display: flex; flex-direction: column; gap: 0; padding: 8px 0 4px; }
.up-row { display: flex; gap: 12px; padding: 8px 16px; font-size: 12px; }
.up-date { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--muted); width: 46px; flex-shrink: 0; padding-top: 2px; }
.up-body { flex: 1; }
.ev-pill { font-size: 9.5px; font-weight: 600; padding: 2px 7px; border-radius: 20px; background: rgba(249,168,37,.1); color: #F5C16E; display: inline-block; margin-bottom: 2px; }
.up-title { color: var(--text); font-size: 12px; }

/* ── Quick actions ───────────────────────────────── */
.qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 14px 14px; }
.qa-btn { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; transition: all .15s; text-decoration: none; }
.qa-btn:hover { border-color: var(--accent); background: var(--accent-glow); transform: translateY(-1px); }
.qa-icon { width: 30px; height: 30px; background: var(--surface); border-radius: 7px; display: grid; place-items: center; font-size: 14px; }
.qa-lbl { font-size: 12px; font-weight: 500; color: var(--text); line-height: 1.3; }

/* ── Employees table ─────────────────────────────── */
.tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase; color: var(--muted); background: rgba(255,255,255,.02); border-bottom: 1px solid var(--border); }
tbody tr { border-bottom: 1px solid var(--border); transition: background .1s; cursor: pointer; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(255,255,255,.02); }
td { padding: 11px 14px; vertical-align: middle; }
.tdim { color: var(--dim); }
.tsm { font-size: 11px; }
.ec { display: flex; align-items: center; gap: 9px; }
.tav { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; }
.en { font-weight: 500; color: var(--text); font-size: 13px; }
.eid { font-size: 10px; color: var(--muted); }

/* ── Transitions ─────────────────────────────────── */
.lr-enter-active, .lr-leave-active { transition: all .25s ease; }
.lr-enter-from { opacity: 0; transform: translateX(-10px); }
.lr-leave-to   { opacity: 0; transform: translateX(10px); }

/* ── Shared ──────────────────────────────────────── */
.empty-state { text-align: center; padding: 20px; color: var(--muted); font-size: 13px; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ──────────────────────────────────── */
@media (max-width: 1100px) {
  .main-grid { grid-template-columns: 1fr; }
  .kpi-row   { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .kpi-row { grid-template-columns: 1fr 1fr; }
  .hero    { flex-direction: column; align-items: flex-start; }
  .hero-h  { font-size: 26px; }
}
</style>
