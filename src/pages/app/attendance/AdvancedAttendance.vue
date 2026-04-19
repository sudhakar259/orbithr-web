<script setup lang="ts">
defineOptions({ name: 'AdvancedAttendance' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import PageHeader from '@/components/ui/PageHeader.vue'
import SimpleStatCard from '@/components/ui/SimpleStatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Modal from '@/components/ui/Modal.vue'

const toast = useToast()
const { confirm: dialog } = useConfirm()
const activeTab = ref<'overview' | 'rules' | 'alerts' | 'devices'>('overview')

/* ── Overview ────────────────────────── */
interface AnalyticsData {
  present_percentage: number
  late_percentage: number
  absent_percentage: number
  total_employees: number
}
interface ReportRow {
  date: string
  present?: number
  late?: number
  absent?: number
  present_percentage?: number
}
interface AttendanceRule {
  id: number
  name: string
  rule_type: string
  threshold_minutes: number
  grace_minutes: number
  action: string
  is_active: boolean
}
interface AttendanceAlert {
  id: number
  employee_name?: string
  alert_type: string
  message: string
  date?: string
  created_at?: string
  is_read: boolean
}
interface AttendanceDevice {
  id: number
  name: string
  device_type: string
  location?: string
  status: string
  last_sync_at?: string
}

const analyticsLoading = ref(false)
const analytics = ref<AnalyticsData | null>(null)
const reportRows = ref<ReportRow[]>([])

const now = new Date()
const currentMonth = ref(now.getMonth() + 1)
const currentYear = ref(now.getFullYear())

const loadOverview = async () => {
  analyticsLoading.value = true
  try {
    const [analyticsRes, reportRes] = await Promise.all([
      api.get('/api/attendance-advanced/analytics', { params: { month: currentMonth.value, year: currentYear.value } }),
      api.get('/api/attendance-advanced/report', {
        params: {
          from: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0],
        },
      }),
    ])
    analytics.value = analyticsRes.data?.data ?? analyticsRes.data
    reportRows.value = reportRes.data?.data ?? reportRes.data ?? []
  } catch {
    toast.error('Failed to load overview data')
  } finally {
    analyticsLoading.value = false
  }
}

const presentPct = computed(() => analytics.value?.present_percentage ?? 0)
const latePct = computed(() => analytics.value?.late_percentage ?? 0)
const absentPct = computed(() => analytics.value?.absent_percentage ?? 0)
const totalEmployees = computed(() => analytics.value?.total_employees ?? 0)

/* ── Rules ───────────────────────────── */
const rulesLoading = ref(false)
const rules = ref<AttendanceRule[]>([])
const showRuleModal = ref(false)
const ruleSaving = ref(false)
const ruleForm = ref({
  name: '',
  rule_type: 'late_mark',
  threshold_minutes: 15,
  grace_minutes: 5,
  action: 'mark_late',
  is_active: true,
})

const resetRuleForm = () => {
  ruleForm.value = { name: '', rule_type: 'late_mark', threshold_minutes: 15, grace_minutes: 5, action: 'mark_late', is_active: true }
}

const loadRules = async () => {
  rulesLoading.value = true
  try {
    const res = await api.get('/api/attendance-advanced/rules')
    rules.value = res.data?.data ?? res.data ?? []
  } catch {
    toast.error('Failed to load rules')
  } finally {
    rulesLoading.value = false
  }
}

const saveRule = async () => {
  ruleSaving.value = true
  try {
    await api.post('/api/attendance-advanced/rules', ruleForm.value)
    toast.success('Rule created')
    showRuleModal.value = false
    resetRuleForm()
    await loadRules()
  } catch {
    toast.error('Failed to save rule')
  } finally {
    ruleSaving.value = false
  }
}

const deleteRule = async (id: number) => {
  if (!await dialog('Delete', 'Delete this rule?')) return
  try {
    await api.delete(`/api/attendance-advanced/rules/${id}`)
    toast.success('Rule deleted')
    rules.value = rules.value.filter(r => r.id !== id)
  } catch {
    toast.error('Failed to delete rule')
  }
}

/* ── Alerts ──────────────────────────── */
const alertsLoading = ref(false)
const alerts = ref<AttendanceAlert[]>([])
const alertFilter = ref<'all' | 'unread' | 'read'>('all')

const filteredAlerts = computed(() => {
  if (alertFilter.value === 'unread') return alerts.value.filter(a => !a.is_read)
  if (alertFilter.value === 'read') return alerts.value.filter(a => a.is_read)
  return alerts.value
})

const loadAlerts = async () => {
  alertsLoading.value = true
  try {
    const res = await api.get('/api/attendance-advanced/alerts')
    alerts.value = res.data?.data ?? res.data ?? []
  } catch {
    toast.error('Failed to load alerts')
  } finally {
    alertsLoading.value = false
  }
}

const markAlertRead = async (id: number) => {
  try {
    await api.post(`/api/attendance-advanced/alerts/${id}/read`)
    const a = alerts.value.find(x => x.id === id)
    if (a) a.is_read = true
    toast.success('Marked as read')
  } catch {
    toast.error('Failed to update alert')
  }
}

const alertTypeBadge = (type: string) => {
  const map: Record<string, string> = {
    late: 'badge-yellow',
    absent: 'badge-red',
    overtime: 'badge-purple',
    early_exit: 'badge-blue',
    half_day: 'badge-blue',
  }
  return map[type] ?? 'badge-muted'
}

/* ── Devices ─────────────────────────── */
const devicesLoading = ref(false)
const devices = ref<AttendanceDevice[]>([])
const showDeviceModal = ref(false)
const deviceSaving = ref(false)
const deviceForm = ref({
  name: '',
  device_type: 'fingerprint',
  location: '',
  ip_address: '',
  serial_number: '',
})

const resetDeviceForm = () => {
  deviceForm.value = { name: '', device_type: 'fingerprint', location: '', ip_address: '', serial_number: '' }
}

const loadDevices = async () => {
  devicesLoading.value = true
  try {
    const res = await api.get('/api/attendance-advanced/devices')
    devices.value = res.data?.data ?? res.data ?? []
  } catch {
    toast.error('Failed to load devices')
  } finally {
    devicesLoading.value = false
  }
}

const saveDevice = async () => {
  deviceSaving.value = true
  try {
    await api.post('/api/attendance-advanced/devices', deviceForm.value)
    toast.success('Device added')
    showDeviceModal.value = false
    resetDeviceForm()
    await loadDevices()
  } catch {
    toast.error('Failed to add device')
  } finally {
    deviceSaving.value = false
  }
}

const syncDevice = async (id: number) => {
  try {
    await api.post(`/api/attendance-advanced/devices/${id}/sync`)
    toast.success('Sync initiated')
    await loadDevices()
  } catch {
    toast.error('Sync failed')
  }
}

const deviceStatusClass = (status: string) => {
  if (status === 'active') return 'badge-green'
  if (status === 'inactive') return 'badge-red'
  return 'badge-yellow'
}

/* ── Tab switch loader ───────────────── */
const switchTab = (tab: typeof activeTab.value) => {
  activeTab.value = tab
  if (tab === 'overview') loadOverview()
  else if (tab === 'rules') loadRules()
  else if (tab === 'alerts') loadAlerts()
  else if (tab === 'devices') loadDevices()
}

onMounted(() => loadOverview())
</script>

<template>
  <div class="adv-attendance">
    <PageHeader title="Advanced Attendance" subtitle="Rules, alerts, devices and analytics" />

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="t in (['overview', 'rules', 'alerts', 'devices'] as const)"
        :key="t"
        :class="['tab', { active: activeTab === t }]"
        @click="switchTab(t)"
      >
        {{ t.charAt(0).toUpperCase() + t.slice(1) }}
      </button>
    </div>

    <!-- ═══ OVERVIEW TAB ═══ -->
    <div v-if="activeTab === 'overview'">
      <div v-if="analyticsLoading" class="loading-skeleton">
        <div v-for="i in 4" :key="i" class="skel-card" />
      </div>
      <template v-else>
        <div class="stat-grid">
          <SimpleStatCard icon="👥" label="Total Employees" :value="totalEmployees" color="blue" :delay="0" />
          <SimpleStatCard icon="✅" label="Present %" :value="`${presentPct}%`" color="green" :delay="0.05" />
          <SimpleStatCard icon="⏰" label="Late %" :value="`${latePct}%`" color="yellow" :delay="0.1" />
          <SimpleStatCard icon="🚫" label="Absent %" :value="`${absentPct}%`" color="red" :delay="0.15" />
        </div>

        <!-- 7-day trend -->
        <div class="card" style="margin-top:20px">
          <h3 class="card-title">Last 7 Days Trend</h3>
          <div class="trend-table">
            <div v-for="row in reportRows.slice(0, 7)" :key="row.date" class="trend-row">
              <span class="trend-date">{{ row.date }}</span>
              <div class="trend-bar-track">
                <div class="trend-bar" :style="{ width: (row.present_percentage ?? 0) + '%' }" />
              </div>
              <span class="trend-pct">{{ row.present_percentage ?? 0 }}%</span>
            </div>
            <EmptyState v-if="!reportRows.length" icon="📊" message="No report data available" />
          </div>
        </div>

        <!-- Report rows table -->
        <div v-if="reportRows.length" class="card" style="margin-top:16px">
          <h3 class="card-title">Daily Report</h3>
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="r">Present</th>
                  <th class="r">Late</th>
                  <th class="r">Absent</th>
                  <th class="r">Present %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in reportRows" :key="row.date">
                  <td>{{ row.date }}</td>
                  <td class="r green">{{ row.present ?? 0 }}</td>
                  <td class="r yellow">{{ row.late ?? 0 }}</td>
                  <td class="r red">{{ row.absent ?? 0 }}</td>
                  <td class="r">{{ row.present_percentage ?? 0 }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ RULES TAB ═══ -->
    <div v-if="activeTab === 'rules'">
      <div class="toolbar">
        <button class="btn-primary" @click="showRuleModal = true">+ Add Rule</button>
      </div>
      <div v-if="rulesLoading" class="loading-skeleton">
        <div v-for="i in 3" :key="i" class="skel-row" />
      </div>
      <div v-else-if="rules.length" class="card">
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th class="r">Threshold (min)</th>
                <th class="r">Grace (min)</th>
                <th>Action</th>
                <th>Active</th>
                <th class="r">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rule in rules" :key="rule.id">
                <td class="fw">{{ rule.name }}</td>
                <td><span class="badge badge-muted">{{ rule.rule_type }}</span></td>
                <td class="r">{{ rule.threshold_minutes }}</td>
                <td class="r">{{ rule.grace_minutes }}</td>
                <td>{{ rule.action }}</td>
                <td>
                  <span :class="['badge', rule.is_active ? 'badge-green' : 'badge-red']">
                    {{ rule.is_active ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td class="r">
                  <button class="btn-danger-sm" @click="deleteRule(rule.id)">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <EmptyState v-else icon="📏" message="No rules configured" sub="Add attendance rules to automate late marks, deductions and alerts." />

      <!-- Add Rule Modal -->
      <Modal v-model="showRuleModal" title="Add Attendance Rule" max-width="520px">
        <form class="form" @submit.prevent="saveRule">
          <div class="field">
            <label>Name</label>
            <input v-model="ruleForm.name" required placeholder="e.g. Late after 15 min" />
          </div>
          <div class="field">
            <label>Rule Type</label>
            <select v-model="ruleForm.rule_type">
              <option value="late_mark">Late Mark</option>
              <option value="early_exit">Early Exit</option>
              <option value="overtime">Overtime</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
          <div class="row-2">
            <div class="field">
              <label>Threshold (minutes)</label>
              <input v-model.number="ruleForm.threshold_minutes" type="number" min="0" />
            </div>
            <div class="field">
              <label>Grace (minutes)</label>
              <input v-model.number="ruleForm.grace_minutes" type="number" min="0" />
            </div>
          </div>
          <div class="field">
            <label>Action</label>
            <select v-model="ruleForm.action">
              <option value="mark_late">Mark Late</option>
              <option value="deduct_leave">Deduct Leave</option>
              <option value="send_alert">Send Alert</option>
              <option value="none">None</option>
            </select>
          </div>
          <div class="field-check">
            <input id="rule-active" v-model="ruleForm.is_active" type="checkbox" />
            <label for="rule-active">Active</label>
          </div>
        </form>
        <template #footer>
          <button class="btn-ghost" @click="showRuleModal = false">Cancel</button>
          <button class="btn-primary" :disabled="ruleSaving || !ruleForm.name" @click="saveRule">
            {{ ruleSaving ? 'Saving...' : 'Save Rule' }}
          </button>
        </template>
      </Modal>
    </div>

    <!-- ═══ ALERTS TAB ═══ -->
    <div v-if="activeTab === 'alerts'">
      <div class="toolbar">
        <div class="filter-pills">
          <button v-for="f in (['all', 'unread', 'read'] as const)" :key="f"
            :class="['pill', { active: alertFilter === f }]"
            @click="alertFilter = f"
          >
            {{ f.charAt(0).toUpperCase() + f.slice(1) }}
          </button>
        </div>
      </div>
      <div v-if="alertsLoading" class="loading-skeleton">
        <div v-for="i in 4" :key="i" class="skel-card" />
      </div>
      <div v-else-if="filteredAlerts.length" class="alert-grid">
        <div v-for="a in filteredAlerts" :key="a.id" :class="['alert-card', { read: a.is_read }]">
          <div class="alert-top">
            <span class="alert-name">{{ a.employee_name ?? 'Employee' }}</span>
            <span :class="['badge', alertTypeBadge(a.alert_type)]">{{ a.alert_type }}</span>
          </div>
          <p class="alert-msg">{{ a.message }}</p>
          <div class="alert-bottom">
            <span class="alert-date">{{ a.date ?? a.created_at }}</span>
            <button v-if="!a.is_read" class="btn-sm" @click="markAlertRead(a.id)">Mark Read</button>
            <span v-else class="badge badge-green">Read</span>
          </div>
        </div>
      </div>
      <EmptyState v-else icon="🔔" message="No alerts" sub="Attendance alerts will appear here when rules are triggered." />
    </div>

    <!-- ═══ DEVICES TAB ═══ -->
    <div v-if="activeTab === 'devices'">
      <div class="toolbar">
        <button class="btn-primary" @click="showDeviceModal = true">+ Add Device</button>
      </div>
      <div v-if="devicesLoading" class="loading-skeleton">
        <div v-for="i in 3" :key="i" class="skel-row" />
      </div>
      <div v-else-if="devices.length" class="card">
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Last Sync</th>
                <th class="r">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in devices" :key="d.id">
                <td class="fw">{{ d.name }}</td>
                <td>{{ d.device_type }}</td>
                <td>{{ d.location ?? '-' }}</td>
                <td><span :class="['badge', deviceStatusClass(d.status)]">{{ d.status }}</span></td>
                <td class="muted">{{ d.last_sync_at ?? 'Never' }}</td>
                <td class="r">
                  <button class="btn-sm" @click="syncDevice(d.id)">Sync</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <EmptyState v-else icon="📱" message="No devices registered" sub="Add biometric, RFID or facial recognition devices." />

      <!-- Add Device Modal -->
      <Modal v-model="showDeviceModal" title="Add Device" max-width="520px">
        <form class="form" @submit.prevent="saveDevice">
          <div class="field">
            <label>Device Name</label>
            <input v-model="deviceForm.name" required placeholder="e.g. Main Entrance Scanner" />
          </div>
          <div class="field">
            <label>Device Type</label>
            <select v-model="deviceForm.device_type">
              <option value="fingerprint">Fingerprint</option>
              <option value="face_recognition">Face Recognition</option>
              <option value="rfid">RFID</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="field">
            <label>Location</label>
            <input v-model="deviceForm.location" placeholder="e.g. Building A, Floor 1" />
          </div>
          <div class="row-2">
            <div class="field">
              <label>IP Address</label>
              <input v-model="deviceForm.ip_address" placeholder="192.168.1.100" />
            </div>
            <div class="field">
              <label>Serial Number</label>
              <input v-model="deviceForm.serial_number" placeholder="SN-12345" />
            </div>
          </div>
        </form>
        <template #footer>
          <button class="btn-ghost" @click="showDeviceModal = false">Cancel</button>
          <button class="btn-primary" :disabled="deviceSaving || !deviceForm.name" @click="saveDevice">
            {{ deviceSaving ? 'Saving...' : 'Add Device' }}
          </button>
        </template>
      </Modal>
    </div>
  </div>
</template>

<style scoped>
/* ── Design-system variables (page-level) ── */
.adv-attendance {
  --bg: #0C0E14;
  --surface: #141720;
  --surface2: #1C2030;
  --surface3: #222840;
  --accent: #4F7EFF;
  --green: #36D399;
  --yellow: #F9A825;
  --red: #FF6B6B;
  --purple: #9B6EFF;
  --text: #E8EAF0;
  --muted: #6B7280;
  --border: rgba(255,255,255,.08);
  --border-hi: rgba(255,255,255,.14);
  --r: 10px;
  color: var(--text);
}

/* ── Tabs ── */
.tabs {
  display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); padding: 4px; margin-bottom: 20px;
}
.tab {
  flex: 1; padding: 10px 16px; font-size: 13px; font-weight: 500;
  background: transparent; border: none; border-radius: 7px; color: var(--muted);
  cursor: pointer; transition: all .18s;
}
.tab:hover { color: var(--text); background: var(--surface2); }
.tab.active { background: var(--accent); color: #fff; }

/* ── Stat grid ── */
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }

/* ── Cards ── */
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px;
}
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; color: var(--text); }

/* ── Trend bars ── */
.trend-table { display: flex; flex-direction: column; gap: 8px; }
.trend-row { display: flex; align-items: center; gap: 12px; }
.trend-date { width: 90px; font-size: 12px; color: var(--muted); flex-shrink: 0; }
.trend-bar-track { flex: 1; height: 22px; background: var(--surface2); border-radius: 4px; overflow: hidden; }
.trend-bar { height: 100%; background: linear-gradient(90deg, var(--accent), var(--green)); border-radius: 4px; transition: width .4s ease; }
.trend-pct { width: 42px; text-align: right; font-size: 12px; font-weight: 600; color: var(--text); }

/* ── Table ── */
.table-wrap { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); padding: 10px 12px; border-bottom: 1px solid var(--border); }
.tbl td { padding: 12px; border-bottom: 1px solid var(--border); color: var(--text); }
.tbl tr:hover td { background: var(--surface2); }
.tbl .r { text-align: right; }
.tbl .fw { font-weight: 500; }
.tbl .green { color: var(--green); }
.tbl .yellow { color: var(--yellow); }
.tbl .red { color: var(--red); }
.tbl .muted { color: var(--muted); }

/* ── Badges ── */
.badge { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
.badge-green  { background: rgba(54,211,153,.12); color: var(--green); }
.badge-red    { background: rgba(255,107,107,.12); color: var(--red); }
.badge-yellow { background: rgba(249,168,37,.12); color: var(--yellow); }
.badge-purple { background: rgba(155,110,255,.12); color: var(--purple); }
.badge-blue   { background: rgba(79,126,255,.12); color: var(--accent); }
.badge-muted  { background: var(--surface2); color: var(--muted); }

/* ── Toolbar ── */
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.filter-pills { display: flex; gap: 4px; }
.pill {
  padding: 7px 16px; font-size: 12px; font-weight: 500; border: 1px solid var(--border);
  border-radius: 20px; background: transparent; color: var(--muted); cursor: pointer;
  transition: all .15s;
}
.pill:hover { border-color: var(--border-hi); color: var(--text); }
.pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }

/* ── Alert cards ── */
.alert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.alert-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  padding: 16px; transition: border-color .15s;
}
.alert-card:hover { border-color: var(--border-hi); }
.alert-card.read { opacity: .6; }
.alert-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.alert-name { font-size: 14px; font-weight: 600; color: var(--text); }
.alert-msg { font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 10px; }
.alert-bottom { display: flex; align-items: center; justify-content: space-between; }
.alert-date { font-size: 11px; color: var(--muted); }

/* ── Buttons ── */
.btn-primary {
  padding: 9px 18px; font-size: 13px; font-weight: 600; background: var(--accent);
  color: #fff; border: none; border-radius: 7px; cursor: pointer; transition: opacity .15s;
}
.btn-primary:hover { opacity: .85; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost {
  padding: 9px 18px; font-size: 13px; font-weight: 500; background: transparent;
  color: var(--muted); border: 1px solid var(--border); border-radius: 7px; cursor: pointer;
  transition: all .15s;
}
.btn-ghost:hover { color: var(--text); border-color: var(--border-hi); }
.btn-sm {
  padding: 5px 12px; font-size: 11px; font-weight: 500; background: var(--surface2);
  color: var(--text); border: 1px solid var(--border); border-radius: 5px; cursor: pointer;
  transition: all .15s;
}
.btn-sm:hover { border-color: var(--accent); color: var(--accent); }
.btn-danger-sm {
  padding: 5px 12px; font-size: 11px; font-weight: 500; background: rgba(255,107,107,.1);
  color: var(--red); border: 1px solid rgba(255,107,107,.2); border-radius: 5px; cursor: pointer;
  transition: all .15s;
}
.btn-danger-sm:hover { background: rgba(255,107,107,.2); }

/* ── Form fields ── */
.form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 500; color: var(--muted); }
.field input, .field select {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 7px;
  padding: 9px 12px; font-size: 13px; color: var(--text); outline: none; transition: border-color .15s;
}
.field input:focus, .field select:focus { border-color: var(--accent); }
.field input::placeholder { color: var(--muted); opacity: .5; }
.field select option { background: var(--surface2); color: var(--text); }
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-check { display: flex; align-items: center; gap: 8px; }
.field-check input[type="checkbox"] { accent-color: var(--accent); width: 16px; height: 16px; }
.field-check label { font-size: 13px; color: var(--text); cursor: pointer; }

/* ── Skeleton loading ── */
.loading-skeleton { display: flex; flex-direction: column; gap: 12px; }
.skel-card { height: 100px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); animation: pulse 1.4s ease infinite; }
.skel-row { height: 48px; background: var(--surface); border: 1px solid var(--border); border-radius: 7px; animation: pulse 1.4s ease infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
.loading-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
</style>
