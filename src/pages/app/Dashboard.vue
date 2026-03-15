<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useLeave } from '@/composables/useLeave'
import api from '@/services/api'
import AdminFirstLoginModal from '@/components/dashboard/AdminFirstLoginModal.vue'
import StatusPill from '@/components/ui/StatusPill.vue'

const router = useRouter()
const { isAuthenticated, hasRole, user } = useAuth()
const { fetchLeaveRequests, leaveRequests } = useLeave()

// ── First login modal ───────────────────────────────
const showFirstLogin = ref(false)
onMounted(() => {
  const flagKey = 'first_login_done_v1'
  if (isAuthenticated() && hasRole('admin') && localStorage.getItem(flagKey) !== 'true') {
    showFirstLogin.value = true
  }
})
function onFirstLoginDone() {
  localStorage.setItem('first_login_done_v1', 'true')
  setTimeout(() => window.location.reload(), 700)
}

// ── State ───────────────────────────────────────────
const employees   = ref<any[]>([])
const attStats    = ref({ present: 0, wfh: 0, on_leave: 0, absent: 0, total: 0 })
const holidays    = ref<any[]>([])
const loadingEmp  = ref(true)
const loadingAtt  = ref(true)
const loadingLeave = ref(true)

const yr = new Date().getFullYear()
const todayStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

// ── Fetch ───────────────────────────────────────────
async function fetchAll() {
  await Promise.allSettled([
    // Employees
    api.get('/employees', { params: { per_page: 50 } })
      .then(r => { employees.value = r.data?.data ?? r.data ?? [] })
      .finally(() => { loadingEmp.value = false }),

    // Attendance stats (today)
    api.get('/attendance/stats/today')
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

    // Pending leaves
    fetchLeaveRequests({ status: 'pending' })
      .finally(() => { loadingLeave.value = false }),

    // Upcoming holidays
    api.get('/holidays', { params: { upcoming: true, per_page: 5 } })
      .then(r => { holidays.value = r.data?.data ?? r.data ?? [] })
      .catch(() => {}),
  ])
}

onMounted(fetchAll)

// ── KPI cards ───────────────────────────────────────
const kpiStats = computed(() => [
  {
    id: 'emp', icon: '👥', label: 'Total Employees',
    value: loadingEmp.value ? '…' : (employees.value.length || 0),
    color: 'blue', change: null, up: true,
  },
  {
    id: 'att', icon: '✅', label: 'Present Today',
    value: loadingAtt.value ? '…' : (attStats.value.present + attStats.value.wfh || 0),
    color: 'green',
    change: attStats.value.total ? `${Math.round((attStats.value.present + attStats.value.wfh) / attStats.value.total * 100)}%` : null,
    up: true,
  },
  {
    id: 'leave', icon: '📋', label: 'Pending Leaves',
    value: loadingLeave.value ? '…' : pendingLeaves.value.length,
    color: 'yellow', change: null, up: false,
  },
  {
    id: 'absent', icon: '🔴', label: 'Absent Today',
    value: loadingAtt.value ? '…' : (attStats.value.absent || 0),
    color: 'red', change: null, up: false,
  },
])

// ── Recent employees ────────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg,#4F7EFF,#9B6EFF)',
  'linear-gradient(135deg,#36D399,#4F7EFF)',
  'linear-gradient(135deg,#F9A825,#FF6B6B)',
  'linear-gradient(135deg,#9B6EFF,#FF6B6B)',
  'linear-gradient(135deg,#4F7EFF,#36D399)',
]
const recentEmps = computed(() =>
  employees.value.slice(0, 6).map((e: any, i: number) => ({
    id:       e.id,
    name:     e.name ?? e.full_name ?? '—',
    dept:     e.department?.name ?? e.department ?? '—',
    role:     e.position?.title ?? e.job_title ?? e.role ?? '—',
    status:   e.employment_status ?? e.status ?? 'active',
    joined:   e.hire_date ? new Date(e.hire_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
    initials: (e.name ?? e.full_name ?? '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
    gradient: GRADIENTS[i % GRADIENTS.length],
  }))
)

// ── Headcount chart ─────────────────────────────────
const tab = ref<'Monthly' | 'Quarterly'>('Monthly')
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const chartData = computed(() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const m = (now.getMonth() - 11 + i + 12) % 12
    const hired = employees.value.filter((e: any) => {
      if (!e.hire_date) return false
      const d = new Date(e.hire_date)
      return d.getMonth() === m && d.getFullYear() === now.getFullYear()
    }).length
    return { month: MONTHS[m], hired, left: 0 }
  })
})
const maxHired   = computed(() => Math.max(...chartData.value.map(d => d.hired), 1))
const pct        = (v: number) => Math.round(v / maxHired.value * 95)
const yLabels    = computed(() => [0, Math.round(maxHired.value * .25), Math.round(maxHired.value * .5), Math.round(maxHired.value * .75), maxHired.value].reverse())
const totalHired = computed(() => chartData.value.reduce((a, d) => a + d.hired, 0))
const totalLeft  = computed(() => chartData.value.reduce((a, d) => a + d.left, 0))

// ── Attendance ring ─────────────────────────────────
const C = 326.7
const presRate   = computed(() => attStats.value.total ? Math.round((attStats.value.present + attStats.value.wfh) / attStats.value.total * 100) : 0)
const presentArc = computed(() => attStats.value.total ? (attStats.value.present / attStats.value.total) * C : 0)
const wfhArc     = computed(() => attStats.value.total ? (attStats.value.wfh / attStats.value.total) * C : 0)
const leaveArc   = computed(() => attStats.value.total ? (attStats.value.on_leave / attStats.value.total) * C : 0)
const wfhOff     = computed(() => -(presentArc.value - 81.7))
const leaveOff   = computed(() => -(presentArc.value + wfhArc.value - 81.7))
const ringRows   = computed(() => [
  { l: 'Present',  c: '#36D399', v: attStats.value.present },
  { l: 'WFH',      c: '#4F7EFF', v: attStats.value.wfh },
  { l: 'On Leave', c: '#F9A825', v: attStats.value.on_leave },
  { l: 'Absent',   c: '#FF6B6B', v: attStats.value.absent },
])

// ── Pending leaves ──────────────────────────────────
const pendingLeaves = computed(() =>
  leaveRequests.value
    .filter((r: any) => r.status === 'pending')
    .map((r: any) => ({
      id:       r.id,
      name:     r.employee?.name ?? r.employee_name ?? '—',
      type:     r.leave_type?.name ?? r.type ?? 'Leave',
      from:     r.start_date ? new Date(r.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
      initials: (r.employee?.name ?? r.employee_name ?? '?').split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
      gradient: GRADIENTS[r.id % GRADIENTS.length],
    }))
)

async function approveLeave(id: number) {
  try {
    await api.patch(`/leaves/${id}`, { status: 'approved' })
    leaveRequests.value = leaveRequests.value.filter((r: any) => r.id !== id)
  } catch { leaveRequests.value = leaveRequests.value.filter((r: any) => r.id !== id) }
}
async function rejectLeave(id: number) {
  try {
    await api.patch(`/leaves/${id}`, { status: 'rejected' })
    leaveRequests.value = leaveRequests.value.filter((r: any) => r.id !== id)
  } catch { leaveRequests.value = leaveRequests.value.filter((r: any) => r.id !== id) }
}

// ── Upcoming events ─────────────────────────────────
const upcomingEvents = computed(() =>
  holidays.value.slice(0, 4).map((h: any) => {
    const d = new Date(h.date ?? h.holiday_date ?? Date.now())
    return {
      id:    h.id,
      day:   d.getDate(),
      month: d.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
      title: h.name ?? h.title ?? '—',
      meta:  h.type ?? 'Holiday',
      tag:   'holiday',
    }
  })
)

// ── Quick actions ───────────────────────────────────
const quickActions = [
  { icon: '📄', label: 'Generate Payslip', to: '/app/payslips' },
  { icon: '👤', label: 'Add Employee',     to: '/app/employees/new' },
  { icon: '📊', label: 'HR Reports',       to: '/app/reports' },
  { icon: '📅', label: 'Attendance Log',   to: '/app/attendance' },
  { icon: '🔍', label: 'Job Openings',     to: '/app/recruitment' },
  { icon: '📩', label: 'Leave Requests',   to: '/app/leave' },
]

// ── Greeting ────────────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})
</script>

<template>
  <div class="dash">
    <!-- Page header -->
    <div class="dash-header">
      <div>
        <h1 class="dash-title">{{ greeting }}, {{ user?.name?.split(' ')[0] ?? 'there' }} 👋</h1>
        <p class="dash-sub">{{ todayStr }} · Here's what's happening today</p>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi" v-for="(k, i) in kpiStats" :key="k.id" :style="{ '--i': i }">
        <div class="kpi-head">
          <div class="kpi-icon" :class="k.color">{{ k.icon }}</div>
          <span v-if="k.change" class="kpi-chg" :class="k.up ? 'up' : 'down'">
            {{ k.up ? '↑' : '↓' }} {{ k.change }}
          </span>
        </div>
        <div class="kpi-val">{{ k.value }}</div>
        <div class="kpi-lbl">{{ k.label }}</div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="dash-grid">
      <!-- Left column -->
      <div class="col-l">

        <!-- Headcount Chart -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="ct">Headcount Overview</div>
              <div class="cs">Hires vs Separations — {{ yr }}</div>
            </div>
            <div class="tabs">
              <div v-for="t in ['Monthly', 'Quarterly']" :key="t" class="tab"
                :class="{ active: tab === t }" @click="tab = t as 'Monthly' | 'Quarterly'">{{ t }}</div>
            </div>
          </div>
          <div class="card-body">
            <div class="chart-area">
              <div class="y-labels">
                <span v-for="l in yLabels" :key="l">{{ l }}</span>
              </div>
              <div class="bars-wrap">
                <div class="grid-lines"><div v-for="n in 4" :key="n" class="gl"></div></div>
                <div class="bars">
                  <div v-for="(d, i) in chartData" :key="d.month" class="bar-grp" :style="{ '--bi': i }">
                    <div class="bar-pair">
                      <div class="bar blue" :style="{ height: pct(d.hired) + '%' }" :title="`${d.hired} hired`"></div>
                      <div class="bar grn"  :style="{ height: pct(d.left) + '%'  }" :title="`${d.left} left`"></div>
                    </div>
                    <span class="bl">{{ d.month }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="legend">
              <div class="leg"><div class="ld blue"></div>New Hires ({{ totalHired }})</div>
              <div class="leg"><div class="ld grn"></div>Separations ({{ totalLeft }})</div>
            </div>
          </div>
        </div>

        <!-- Recent Employees Table -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="ct">Recent Employees</div>
              <div class="cs">Last onboarded</div>
            </div>
            <RouterLink to="/app/employees" class="btn-link">View All →</RouterLink>
          </div>
          <div v-if="loadingEmp" class="empty-state">Loading…</div>
          <div v-else-if="recentEmps.length === 0" class="empty-state">No employees found.</div>
          <div v-else class="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Department</th><th>Role</th><th>Status</th><th>Joined</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="emp in recentEmps" :key="emp.id"
                  @click="router.push(`/app/employees/${emp.id}`)" style="cursor:pointer">
                  <td>
                    <div class="ec">
                      <div class="av" :style="{ background: emp.gradient }">{{ emp.initials }}</div>
                      <div>
                        <div class="en">{{ emp.name }}</div>
                        <div class="eid">#{{ emp.id }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="dim">{{ emp.dept }}</td>
                  <td class="dim">{{ emp.role }}</td>
                  <td><StatusPill :status="emp.status" /></td>
                  <td class="sm dim">{{ emp.joined }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Right column -->
      <div class="col-r">

        <!-- Attendance Ring -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="ct">Today's Attendance</div>
              <div class="cs">{{ todayStr }}</div>
            </div>
            <RouterLink to="/app/attendance" class="btn-link">Details →</RouterLink>
          </div>
          <div class="card-body">
            <div class="ring-wrap">
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="52" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="12"/>
                <circle cx="70" cy="70" r="52" fill="none" stroke="#36D399" stroke-width="12"
                  :stroke-dasharray="`${presentArc} 326.7`" stroke-dashoffset="81.7" stroke-linecap="round"/>
                <circle cx="70" cy="70" r="52" fill="none" stroke="#4F7EFF" stroke-width="12"
                  :stroke-dasharray="`${wfhArc} 326.7`" :stroke-dashoffset="wfhOff" stroke-linecap="round"/>
                <circle cx="70" cy="70" r="52" fill="none" stroke="#F9A825" stroke-width="12"
                  :stroke-dasharray="`${leaveArc} 326.7`" :stroke-dashoffset="leaveOff" stroke-linecap="round"/>
                <text x="70" y="65" text-anchor="middle" font-size="22" font-weight="700" fill="#E8EAF0">{{ presRate }}%</text>
                <text x="70" y="80" text-anchor="middle" font-size="11" fill="#6B7280">Present+WFH</text>
              </svg>
            </div>
            <div class="ring-stats">
              <div class="rs" v-for="r in ringRows" :key="r.l">
                <div class="rs-dot" :style="{ background: r.c }"></div>
                <div class="rs-l">{{ r.l }}</div>
                <div class="rs-v">{{ r.v }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Upcoming Events -->
        <div class="card" v-if="upcomingEvents.length">
          <div class="card-head">
            <div>
              <div class="ct">Upcoming Holidays</div>
              <div class="cs">Next {{ upcomingEvents.length }} events</div>
            </div>
            <RouterLink to="/app/holiday-calendar" class="btn-link">View →</RouterLink>
          </div>
          <div class="card-body" style="padding:10px 14px 14px">
            <div class="ev-list">
              <div v-for="ev in upcomingEvents" :key="ev.id" class="ev-item">
                <div class="ev-date">
                  <div class="ev-d">{{ ev.day }}</div>
                  <div class="ev-m">{{ ev.month }}</div>
                </div>
                <div class="ev-sep"></div>
                <div class="ev-info">
                  <div class="ev-t">{{ ev.title }}</div>
                  <div class="ev-meta">{{ ev.meta }}</div>
                </div>
                <span class="ev-tag holiday">Holiday</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Leave Approvals -->
        <div class="card">
          <div class="card-head">
            <div>
              <div class="ct">Leave Requests</div>
              <div class="cs">{{ pendingLeaves.length }} pending</div>
            </div>
            <RouterLink to="/app/leave" class="btn-link">View all →</RouterLink>
          </div>
          <div class="card-body">
            <TransitionGroup name="lr" tag="div" class="lr-list">
              <div v-for="req in pendingLeaves.slice(0, 3)" :key="req.id" class="lr-item">
                <div class="lr-av" :style="{ background: req.gradient }">{{ req.initials }}</div>
                <div class="lr-info">
                  <div class="lr-n">{{ req.name }}</div>
                  <div class="lr-t">{{ req.type }} · {{ req.from }}</div>
                </div>
                <div class="lr-btns">
                  <button class="lbtn a" @click="approveLeave(req.id)" title="Approve">✓</button>
                  <button class="lbtn r" @click="rejectLeave(req.id)"  title="Reject">✕</button>
                </div>
              </div>
            </TransitionGroup>
            <div v-if="!loadingLeave && !pendingLeaves.length" class="empty-state">🎉 All caught up!</div>
            <div v-if="loadingLeave" class="empty-state">Loading…</div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
          <div class="card-head">
            <div class="ct">Quick Actions</div>
          </div>
          <div class="card-body">
            <div class="qa-grid">
              <RouterLink v-for="a in quickActions" :key="a.label" :to="a.to" class="qa-btn">
                <div class="qa-icon">{{ a.icon }}</div>
                <div class="qa-lbl">{{ a.label }}</div>
              </RouterLink>
            </div>
          </div>
        </div>

      </div>
    </div>

    <AdminFirstLoginModal v-model="showFirstLogin" @completed="onFirstLoginDone" />
  </div>
</template>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 20px; }

/* Header */
.dash-header { display: flex; align-items: flex-start; justify-content: space-between; }
.dash-title { font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -.3px; }
.dash-sub   { font-size: 12px; color: var(--muted); margin-top: 3px; }

/* KPI */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.kpi {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 20px;
  animation: fadeUp .4s ease calc(var(--i) * .07s) both;
  transition: border-color .2s, transform .2s; cursor: default;
}
.kpi:hover { border-color: var(--border-hi); transform: translateY(-2px); }
@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.kpi-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; font-size: 18px; }
.kpi-icon.blue   { background: rgba(79,126,255,.12); }
.kpi-icon.green  { background: rgba(54,211,153,.12); }
.kpi-icon.yellow { background: rgba(249,168,37,.12); }
.kpi-icon.red    { background: rgba(255,107,107,.12); }
.kpi-chg { font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 20px; }
.kpi-chg.up   { background: rgba(54,211,153,.12); color: #36D399; }
.kpi-chg.down { background: rgba(255,107,107,.12); color: #FF6B6B; }
.kpi-val { font-size: 30px; font-weight: 700; letter-spacing: -1px; line-height: 1; margin-bottom: 3px; color: var(--text); }
.kpi-lbl { font-size: 12px; color: var(--muted); }

/* Layout */
.dash-grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
.col-l, .col-r { display: flex; flex-direction: column; gap: 16px; }

/* Card */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.card-head {
  padding: 16px 20px 14px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.ct { font-weight: 600; font-size: 15px; color: var(--text); }
.cs { font-size: 11px; color: var(--muted); margin-top: 2px; }
.card-body { padding: 18px 20px; }
.btn-link { font-size: 12px; color: var(--accent); font-weight: 500; text-decoration: none; transition: opacity .15s; white-space: nowrap; }
.btn-link:hover { opacity: .7; }

/* Tabs */
.tabs { display: flex; gap: 3px; background: var(--surface2); border-radius: var(--rs); padding: 3px; }
.tab { padding: 5px 13px; border-radius: 5px; font-size: 12px; font-weight: 500; cursor: pointer; color: var(--muted); transition: all .14s; }
.tab.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0,0,0,.3); }

/* Chart */
.chart-area { display: flex; gap: 8px; height: 150px; }
.y-labels { display: flex; flex-direction: column-reverse; justify-content: space-between; font-size: 10px; color: var(--muted); padding-bottom: 18px; min-width: 20px; text-align: right; }
.bars-wrap { flex: 1; position: relative; }
.grid-lines { position: absolute; inset: 0; bottom: 18px; display: flex; flex-direction: column-reverse; justify-content: space-between; pointer-events: none; }
.gl { height: 1px; background: var(--border); width: 100%; }
.bars { display: flex; align-items: flex-end; gap: 5px; height: calc(100% - 18px); position: relative; z-index: 1; }
.bar-grp { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; height: 100%; justify-content: flex-end; animation: barUp .5s ease calc(var(--bi) * .04s) both; }
@keyframes barUp { from { opacity: 0; transform: scaleY(0); transform-origin: bottom; } to { opacity: 1; transform: scaleY(1); } }
.bar-pair { display: flex; gap: 2px; align-items: flex-end; flex: 1; width: 100%; justify-content: center; }
.bar { width: 9px; border-radius: 3px 3px 0 0; transition: opacity .15s; min-height: 2px; }
.bar:hover { opacity: .7; }
.bar.blue { background: var(--accent); }
.bar.grn  { background: #36D399; }
.bl { font-size: 9px; color: var(--muted); height: 18px; display: flex; align-items: center; }
.legend { display: flex; gap: 16px; margin-top: 14px; }
.leg { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--dim); }
.ld { width: 8px; height: 8px; border-radius: 50%; }
.ld.blue { background: var(--accent); } .ld.grn { background: #36D399; }

/* Table */
.tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase; color: var(--muted); background: rgba(255,255,255,.02); border-bottom: 1px solid var(--border); }
tbody tr { border-bottom: 1px solid var(--border); transition: background .1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(255,255,255,.02); }
td { padding: 11px 14px; vertical-align: middle; }
td.dim { color: var(--dim); font-size: 13px; }
td.sm  { font-size: 11px; }
.ec { display: flex; align-items: center; gap: 9px; }
.av { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 600; color: #fff; flex-shrink: 0; }
.en { font-weight: 500; color: var(--text); }
.eid { font-size: 10px; color: var(--muted); }

/* Ring */
.ring-wrap { display: flex; justify-content: center; padding: 4px 0 12px; }
.ring-stats { display: flex; flex-direction: column; gap: 9px; }
.rs { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.rs-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rs-l { flex: 1; color: var(--dim); }
.rs-v { font-weight: 600; color: var(--text); }

/* Events */
.ev-list { display: flex; flex-direction: column; gap: 2px; }
.ev-item { display: flex; align-items: center; gap: 10px; padding: 8px 9px; border-radius: var(--rs); transition: background .1s; cursor: pointer; }
.ev-item:hover { background: var(--surface2); }
.ev-date { width: 34px; text-align: center; flex-shrink: 0; }
.ev-d { font-weight: 700; font-size: 16px; line-height: 1; color: var(--accent); }
.ev-m { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; }
.ev-sep { width: 1px; height: 28px; background: var(--border); flex-shrink: 0; }
.ev-info { flex: 1; min-width: 0; }
.ev-t { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
.ev-meta { font-size: 10px; color: var(--muted); margin-top: 1px; }
.ev-tag { font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; text-transform: uppercase; letter-spacing: .5px; }
.ev-tag.holiday { background: rgba(249,168,37,.1); color: #F9A825; }

/* Leave approvals */
.lr-list { display: flex; flex-direction: column; gap: 8px; }
.lr-item { display: flex; align-items: center; gap: 10px; padding: 10px 11px; background: var(--surface2); border-radius: var(--rs); border: 1px solid var(--border); }
.lr-av { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 11px; font-weight: 600; color: #fff; flex-shrink: 0; }
.lr-info { flex: 1; min-width: 0; }
.lr-n { font-size: 13px; font-weight: 500; color: var(--text); }
.lr-t { font-size: 11px; color: var(--muted); margin-top: 1px; }
.lr-btns { display: flex; gap: 5px; }
.lbtn { width: 28px; height: 28px; border-radius: 6px; border: none; cursor: pointer; display: grid; place-items: center; font-size: 12px; font-weight: 700; transition: transform .1s; }
.lbtn:hover { transform: scale(1.1); }
.lbtn.a { background: rgba(54,211,153,.15); color: #36D399; }
.lbtn.r { background: rgba(255,107,107,.15); color: #FF6B6B; }
.lr-enter-active, .lr-leave-active { transition: all .25s ease; }
.lr-enter-from { opacity: 0; transform: translateX(-10px); }
.lr-leave-to   { opacity: 0; transform: translateX(10px); }

/* Quick actions */
.qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.qa-btn { display: flex; flex-direction: column; align-items: flex-start; gap: 7px; padding: 13px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs); cursor: pointer; transition: all .15s; text-decoration: none; }
.qa-btn:hover { border-color: var(--accent); background: var(--accent-glow); transform: translateY(-1px); }
.qa-icon { width: 32px; height: 32px; background: var(--surface); border-radius: 7px; display: grid; place-items: center; font-size: 14px; }
.qa-lbl { font-size: 12px; font-weight: 500; color: var(--text); line-height: 1.3; }

/* Empty */
.empty-state { text-align: center; padding: 20px; color: var(--muted); font-size: 13px; }

/* Responsive */
@media (max-width: 1100px) {
  .dash-grid  { grid-template-columns: 1fr; }
  .kpi-grid   { grid-template-columns: repeat(2, 1fr); }
}
</style>
