<script setup lang="ts">
defineOptions({ name: 'AdvancedAttendance' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

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

const alertTypeStyle = (type: string): { bg: string; fg: string; bd: string } => {
  const map: Record<string, { bg: string; fg: string; bd: string }> = {
    late:       { bg: 'rgba(245,166,35,0.12)',  fg: '#F5A623', bd: 'rgba(245,166,35,0.3)' },
    absent:     { bg: 'rgba(243,130,136,0.12)', fg: '#F38288', bd: 'rgba(243,130,136,0.3)' },
    overtime:   { bg: 'rgba(178,141,255,0.12)', fg: '#B28DFF', bd: 'rgba(178,141,255,0.3)' },
    early_exit: { bg: 'rgba(126,215,255,0.12)', fg: '#7ED7FF', bd: 'rgba(126,215,255,0.3)' },
    half_day:   { bg: 'rgba(107,91,255,0.12)',  fg: '#6B5BFF', bd: 'rgba(107,91,255,0.3)' },
  }
  return map[type] ?? { bg: 'rgba(122,130,153,0.12)', fg: '#7A8299', bd: 'rgba(122,130,153,0.3)' }
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

const deviceStatusStyle = (status: string): { bg: string; fg: string; bd: string } => {
  if (status === 'active')   return { bg: 'rgba(77,211,154,0.12)',  fg: '#4DD39A', bd: 'rgba(77,211,154,0.3)' }
  if (status === 'inactive') return { bg: 'rgba(243,130,136,0.12)', fg: '#F38288', bd: 'rgba(243,130,136,0.3)' }
  return { bg: 'rgba(245,166,35,0.12)', fg: '#F5A623', bd: 'rgba(245,166,35,0.3)' }
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
  <div class="adv-att">

    <!-- Page header -->
    <div class="ph">
      <div class="ph-l">
        <div class="eyebrow">Time · Attendance</div>
        <h1 class="ph-title">Advanced attendance</h1>
        <p class="ph-sub">Rules, alerts, devices and analytics — keep coverage within policy limits.</p>
      </div>
      <div class="ph-r">
        <button class="btn-sec">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          Export
        </button>
        <button class="btn-pri" v-if="activeTab === 'rules'" @click="showRuleModal = true">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          New rule
        </button>
        <button class="btn-pri" v-else-if="activeTab === 'devices'" @click="showDeviceModal = true">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Add device
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tab-strip">
      <button
        v-for="t in (['overview', 'rules', 'alerts', 'devices'] as const)"
        :key="t"
        class="tab-btn"
        :class="{ active: activeTab === t }"
        @click="switchTab(t)"
      >
        {{ t.charAt(0).toUpperCase() + t.slice(1) }}
      </button>
    </div>

    <!-- ═══ OVERVIEW TAB ═══ -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <div v-if="analyticsLoading" class="skel-grid">
        <div v-for="i in 4" :key="i" class="skel-card" />
      </div>
      <template v-else>
        <!-- KPI strip -->
        <div class="kpi-strip">
          <div class="kpi-card">
            <div class="kpi-eyebrow">Total employees</div>
            <div class="kpi-value">{{ totalEmployees }}</div>
            <div class="kpi-meta">on roster</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-eyebrow">Present</div>
            <div class="kpi-value accent-green">{{ presentPct }}<span class="kpi-suffix">%</span></div>
            <div class="kpi-meta">attendance today</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-eyebrow">Late</div>
            <div class="kpi-value accent-yellow">{{ latePct }}<span class="kpi-suffix">%</span></div>
            <div class="kpi-meta">behind schedule</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-eyebrow">Absent</div>
            <div class="kpi-value accent-red">{{ absentPct }}<span class="kpi-suffix">%</span></div>
            <div class="kpi-meta">no-show today</div>
          </div>
        </div>

        <!-- 7-day trend -->
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">Last 7 days · trend</div>
            <div class="panel-meta">{{ reportRows.length }} day{{ reportRows.length === 1 ? '' : 's' }}</div>
          </div>
          <div v-if="!reportRows.length" class="panel-empty">No report data available.</div>
          <div v-else class="trend-body">
            <div v-for="row in reportRows.slice(0, 7)" :key="row.date" class="trend-row">
              <span class="trend-date">{{ row.date }}</span>
              <div class="trend-track">
                <div class="trend-fill" :style="{ width: (row.present_percentage ?? 0) + '%' }" />
              </div>
              <span class="trend-pct">{{ row.present_percentage ?? 0 }}%</span>
            </div>
          </div>
        </div>

        <!-- Daily report table -->
        <div v-if="reportRows.length" class="panel">
          <div class="panel-head">
            <div class="panel-title">Daily report</div>
            <div class="panel-meta">{{ reportRows.length }} entries</div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th class="num">Present</th>
                  <th class="num">Late</th>
                  <th class="num">Absent</th>
                  <th class="num">Present %</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in reportRows" :key="row.date">
                  <td class="cell-mono">{{ row.date }}</td>
                  <td class="num cell-mono accent-green">{{ row.present ?? 0 }}</td>
                  <td class="num cell-mono accent-yellow">{{ row.late ?? 0 }}</td>
                  <td class="num cell-mono accent-red">{{ row.absent ?? 0 }}</td>
                  <td class="num cell-mono">{{ row.present_percentage ?? 0 }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ RULES TAB ═══ -->
    <div v-if="activeTab === 'rules'" class="tab-content">
      <div v-if="rulesLoading" class="skel-list">
        <div v-for="i in 3" :key="i" class="skel-row" />
      </div>
      <div v-else-if="rules.length" class="panel">
        <div class="panel-head">
          <div class="panel-title">Attendance rules</div>
          <div class="panel-meta">{{ rules.length }} configured</div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th class="num">Threshold</th>
                <th class="num">Grace</th>
                <th>Action</th>
                <th>Active</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rule in rules" :key="rule.id">
                <td>
                  <div class="cell-name">{{ rule.name }}</div>
                </td>
                <td>
                  <span class="dept-badge">{{ rule.rule_type }}</span>
                </td>
                <td class="num cell-mono">{{ rule.threshold_minutes }}m</td>
                <td class="num cell-mono">{{ rule.grace_minutes }}m</td>
                <td class="cell-dim">{{ rule.action }}</td>
                <td>
                  <span
                    class="st-pill"
                    :style="rule.is_active
                      ? { background: 'rgba(77,211,154,0.12)', color: '#4DD39A', borderColor: 'rgba(77,211,154,0.3)' }
                      : { background: 'rgba(243,130,136,0.12)', color: '#F38288', borderColor: 'rgba(243,130,136,0.3)' }"
                  >{{ rule.is_active ? 'Active' : 'Off' }}</span>
                </td>
                <td class="actions-col">
                  <button class="act-btn act-btn--del" title="Delete" @click="deleteRule(rule.id)">
                    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="panel">
        <div class="panel-empty">
          <div class="empty-title">No rules configured</div>
          <div class="empty-sub">Add attendance rules to automate late marks, deductions and alerts.</div>
        </div>
      </div>
    </div>

    <!-- ═══ ALERTS TAB ═══ -->
    <div v-if="activeTab === 'alerts'" class="tab-content">
      <div class="filter-row">
        <div class="seg">
          <button
            v-for="f in (['all', 'unread', 'read'] as const)"
            :key="f"
            class="seg-btn"
            :class="{ active: alertFilter === f }"
            @click="alertFilter = f"
          >{{ f.charAt(0).toUpperCase() + f.slice(1) }}</button>
        </div>
      </div>

      <div v-if="alertsLoading" class="skel-grid">
        <div v-for="i in 4" :key="i" class="skel-card" />
      </div>
      <div v-else-if="filteredAlerts.length" class="alert-grid">
        <div
          v-for="a in filteredAlerts"
          :key="a.id"
          class="alert-card"
          :class="{ read: a.is_read }"
        >
          <div class="alert-top">
            <div class="alert-name">{{ a.employee_name ?? 'Employee' }}</div>
            <span
              class="st-pill"
              :style="{
                background: alertTypeStyle(a.alert_type).bg,
                color: alertTypeStyle(a.alert_type).fg,
                borderColor: alertTypeStyle(a.alert_type).bd,
              }"
            >{{ a.alert_type }}</span>
          </div>
          <p class="alert-msg">{{ a.message }}</p>
          <div class="alert-bottom">
            <span class="alert-date cell-mono">{{ a.date ?? a.created_at }}</span>
            <button v-if="!a.is_read" class="btn-link" @click="markAlertRead(a.id)">Mark read</button>
            <span v-else class="alert-done">Read ✓</span>
          </div>
        </div>
      </div>
      <div v-else class="panel">
        <div class="panel-empty">
          <div class="empty-title">No alerts</div>
          <div class="empty-sub">Attendance alerts will appear here when rules are triggered.</div>
        </div>
      </div>
    </div>

    <!-- ═══ DEVICES TAB ═══ -->
    <div v-if="activeTab === 'devices'" class="tab-content">
      <div v-if="devicesLoading" class="skel-list">
        <div v-for="i in 3" :key="i" class="skel-row" />
      </div>
      <div v-else-if="devices.length" class="panel">
        <div class="panel-head">
          <div class="panel-title">Registered devices</div>
          <div class="panel-meta">{{ devices.length }} device{{ devices.length === 1 ? '' : 's' }}</div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Last sync</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in devices" :key="d.id">
                <td><div class="cell-name">{{ d.name }}</div></td>
                <td class="cell-dim">{{ d.device_type }}</td>
                <td class="cell-dim">{{ d.location ?? '—' }}</td>
                <td>
                  <span
                    class="st-pill"
                    :style="{
                      background: deviceStatusStyle(d.status).bg,
                      color: deviceStatusStyle(d.status).fg,
                      borderColor: deviceStatusStyle(d.status).bd,
                    }"
                  >{{ d.status }}</span>
                </td>
                <td class="cell-mono cell-dim">{{ d.last_sync_at ?? 'Never' }}</td>
                <td class="actions-col">
                  <button class="act-btn" title="Sync" @click="syncDevice(d.id)">
                    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="panel">
        <div class="panel-empty">
          <div class="empty-title">No devices registered</div>
          <div class="empty-sub">Add biometric, RFID or facial recognition devices to capture punches.</div>
        </div>
      </div>
    </div>

    <!-- ═══ Add Rule Modal ═══ -->
    <Teleport to="body">
      <div
        v-if="showRuleModal"
        class="modal-backdrop"
        @click.self="showRuleModal = false"
      >
        <div class="modal-card">
          <div class="modal-head">
            <h3 class="modal-title">Add attendance rule</h3>
            <button class="modal-close" @click="showRuleModal = false">×</button>
          </div>
          <form class="modal-body" @submit.prevent="saveRule">
            <div class="form-row">
              <label class="form-label">Name</label>
              <input v-model="ruleForm.name" required placeholder="e.g. Late after 15 min" class="form-input" />
            </div>
            <div class="form-row">
              <label class="form-label">Rule type</label>
              <select v-model="ruleForm.rule_type" class="form-input">
                <option value="late_mark">Late mark</option>
                <option value="early_exit">Early exit</option>
                <option value="overtime">Overtime</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half day</option>
              </select>
            </div>
            <div class="form-grid-2">
              <div class="form-row">
                <label class="form-label">Threshold (min)</label>
                <input v-model.number="ruleForm.threshold_minutes" type="number" min="0" class="form-input" />
              </div>
              <div class="form-row">
                <label class="form-label">Grace (min)</label>
                <input v-model.number="ruleForm.grace_minutes" type="number" min="0" class="form-input" />
              </div>
            </div>
            <div class="form-row">
              <label class="form-label">Action</label>
              <select v-model="ruleForm.action" class="form-input">
                <option value="mark_late">Mark late</option>
                <option value="deduct_leave">Deduct leave</option>
                <option value="send_alert">Send alert</option>
                <option value="none">None</option>
              </select>
            </div>
            <label class="form-check">
              <input v-model="ruleForm.is_active" type="checkbox" />
              <span>Active</span>
            </label>
            <div class="modal-actions">
              <button type="button" class="btn-ghost" @click="showRuleModal = false">Cancel</button>
              <button type="submit" class="btn-pri" :disabled="ruleSaving || !ruleForm.name">
                {{ ruleSaving ? 'Saving…' : 'Save rule' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ═══ Add Device Modal ═══ -->
    <Teleport to="body">
      <div
        v-if="showDeviceModal"
        class="modal-backdrop"
        @click.self="showDeviceModal = false"
      >
        <div class="modal-card">
          <div class="modal-head">
            <h3 class="modal-title">Add device</h3>
            <button class="modal-close" @click="showDeviceModal = false">×</button>
          </div>
          <form class="modal-body" @submit.prevent="saveDevice">
            <div class="form-row">
              <label class="form-label">Device name</label>
              <input v-model="deviceForm.name" required placeholder="e.g. Main entrance scanner" class="form-input" />
            </div>
            <div class="form-row">
              <label class="form-label">Device type</label>
              <select v-model="deviceForm.device_type" class="form-input">
                <option value="fingerprint">Fingerprint</option>
                <option value="face_recognition">Face recognition</option>
                <option value="rfid">RFID</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">Location</label>
              <input v-model="deviceForm.location" placeholder="e.g. Building A, Floor 1" class="form-input" />
            </div>
            <div class="form-grid-2">
              <div class="form-row">
                <label class="form-label">IP address</label>
                <input v-model="deviceForm.ip_address" placeholder="192.168.1.100" class="form-input" />
              </div>
              <div class="form-row">
                <label class="form-label">Serial number</label>
                <input v-model="deviceForm.serial_number" placeholder="SN-12345" class="form-input" />
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-ghost" @click="showDeviceModal = false">Cancel</button>
              <button type="submit" class="btn-pri" :disabled="deviceSaving || !deviceForm.name">
                {{ deviceSaving ? 'Saving…' : 'Add device' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Design tokens (page-scoped) ──────── */
.adv-att {
  --pg-bg: #0D0F17;
  --surface: #161A23;
  --surface2: #1C2030;
  --surface3: #232936;
  --border: #232936;
  --border-hi: #2E3548;
  --text: #EEF0F4;
  --dim: #C7CCD8;
  --muted: #7A8299;
  --accent: #6B5BFF;
  --accent-soft: rgba(107, 91, 255, 0.14);
  --accent-ring: rgba(107, 91, 255, 0.35);
  --green: #4DD39A;
  --red: #F38288;
  --yellow: #F5A623;
  --serif: 'Instrument Serif', Georgia, serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;

  display: flex;
  flex-direction: column;
  gap: 18px;
  color: var(--text);
}

/* ── Page header ──────────────────────── */
.ph { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding-bottom: 4px; }
.ph-l { display: flex; flex-direction: column; gap: 6px; }
.eyebrow {
  font-family: var(--mono);
  font-size: 10px; font-weight: 500;
  letter-spacing: .14em; text-transform: uppercase;
  color: var(--muted);
}
.ph-title {
  margin: 0;
  font-family: var(--serif);
  font-size: 38px; font-weight: 400;
  color: var(--text);
  letter-spacing: -0.015em; line-height: 1.05;
}
.ph-sub { margin: 0; font-size: 12.5px; color: var(--muted); max-width: 64ch; }
.ph-r { display: flex; gap: 8px; flex-shrink: 0; }

/* ── Buttons ──────────────────────────── */
.btn-sec {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 12px;
  border-radius: 6px; font-size: 12px; font-weight: 500;
  cursor: pointer; white-space: nowrap;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--dim);
  transition: border-color .13s, color .13s, background .13s;
  font-family: inherit;
}
.btn-sec:hover { border-color: var(--border-hi); color: var(--text); background: var(--surface2); }

.btn-pri {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 13px;
  border-radius: 6px; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  background: var(--accent); border: 1px solid var(--accent);
  color: #fff;
  box-shadow: 0 0 18px rgba(107, 91, 255, .32);
  transition: background .13s, opacity .13s;
  font-family: inherit;
}
.btn-pri:hover:not(:disabled) { background: #5a4cf0; }
.btn-pri:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 13px;
  border-radius: 6px; font-size: 12px; font-weight: 500;
  cursor: pointer; white-space: nowrap;
  background: transparent; border: 1px solid var(--border);
  color: var(--muted);
  transition: color .13s, border-color .13s, background .13s;
  font-family: inherit;
}
.btn-ghost:hover { color: var(--text); border-color: var(--border-hi); background: var(--surface2); }

.btn-link {
  background: none; border: none;
  color: var(--accent); font-size: 11.5px; font-weight: 500;
  cursor: pointer; padding: 2px 4px;
  font-family: inherit;
}
.btn-link:hover { text-decoration: underline; }

/* ── Tab strip ────────────────────────── */
.tab-strip {
  display: inline-flex; gap: 4px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 4px;
  align-self: flex-start;
}
.tab-btn {
  font-size: 12.5px; font-weight: 500;
  color: var(--muted);
  background: transparent; border: none;
  padding: 7px 14px; border-radius: 7px;
  cursor: pointer;
  transition: background .15s, color .15s;
  font-family: inherit;
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active { background: var(--surface2); color: var(--text); }

/* ── Tab content ──────────────────────── */
.tab-content { display: flex; flex-direction: column; gap: 16px; }

/* ── KPI strip ────────────────────────── */
.kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 16px;
  display: flex; flex-direction: column; gap: 6px;
  transition: border-color .15s;
}
.kpi-card:hover { border-color: var(--border-hi); }
.kpi-eyebrow {
  font-family: var(--mono);
  font-size: 10px; letter-spacing: .1em;
  text-transform: uppercase; color: var(--muted);
}
.kpi-value {
  font-family: var(--serif);
  font-size: 38px; line-height: 1;
  letter-spacing: -0.02em; color: var(--text);
  display: flex; align-items: baseline; gap: 4px;
}
.kpi-suffix {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px; color: var(--muted); letter-spacing: 0;
}
.kpi-meta { font-size: 11px; color: var(--muted); }
.accent-green  { color: var(--green); }
.accent-yellow { color: var(--yellow); }
.accent-red    { color: var(--red); }

/* ── Panel ────────────────────────────── */
.panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden;
}
.panel-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border);
}
.panel-title { font-size: 13.5px; font-weight: 600; color: var(--text); }
.panel-meta { font-family: var(--mono); font-size: 11px; color: var(--muted); }
.panel-empty {
  padding: 36px 16px; text-align: center;
  display: flex; flex-direction: column; gap: 4px; align-items: center;
}
.empty-title { font-size: 13px; color: var(--text); font-weight: 500; }
.empty-sub { font-size: 12px; color: var(--muted); max-width: 50ch; }

/* ── Trend body ───────────────────────── */
.trend-body { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 8px; }
.trend-row { display: flex; align-items: center; gap: 12px; }
.trend-date {
  width: 110px; font-family: var(--mono);
  font-size: 11px; color: var(--muted); flex-shrink: 0;
}
.trend-track {
  flex: 1; height: 22px;
  background: var(--pg-bg); border: 1px solid var(--border);
  border-radius: 4px; overflow: hidden;
}
.trend-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--green));
  border-radius: 4px; transition: width .4s ease;
}
.trend-pct {
  width: 48px; text-align: right;
  font-family: var(--mono); font-size: 11px;
  font-weight: 500; color: var(--text);
}

/* ── Tables ───────────────────────────── */
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table thead th {
  background: rgba(255, 255, 255, .02);
  font-family: var(--mono);
  font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--muted); text-align: left;
  padding: 10px 16px; font-weight: 600;
  border-bottom: 1px solid var(--border);
}
.data-table thead th.num,
.data-table thead th.actions-col { text-align: right; }
.data-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px; color: var(--text);
  vertical-align: middle;
}
.data-table tbody td.num,
.data-table tbody td.actions-col { text-align: right; }
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover { background: rgba(255, 255, 255, .02); }
.cell-name { font-size: 12.5px; font-weight: 500; color: var(--text); }
.cell-dim { color: var(--dim); }
.cell-mono { font-family: var(--mono); font-size: 11.5px; color: var(--dim); }

/* ── Status pills + badges ────────────── */
.st-pill {
  display: inline-flex; align-items: center;
  font-size: 10.5px; font-weight: 600;
  padding: 3px 10px; border-radius: 999px;
  border: 1px solid transparent;
  text-transform: capitalize; letter-spacing: .02em;
}
.dept-badge {
  display: inline-block;
  padding: 2px 7px; border-radius: 4px;
  background: var(--surface2);
  font-family: var(--mono);
  font-size: 10px; font-weight: 500;
  color: var(--dim); letter-spacing: .02em;
}

/* ── Action buttons ───────────────────── */
.act-btn {
  width: 26px; height: 26px; border-radius: 5px;
  border: 1px solid var(--border);
  background: transparent; color: var(--muted);
  cursor: pointer;
  display: inline-grid; place-items: center;
  transition: border-color .13s, color .13s, background .13s;
}
.act-btn:hover { border-color: var(--border-hi); color: var(--text); background: var(--surface2); }
.act-btn--del:hover {
  background: rgba(243, 130, 136, .12);
  color: var(--red);
  border-color: rgba(243, 130, 136, .3);
}

/* ── Filter row + segmented ───────────── */
.filter-row { display: flex; align-items: center; justify-content: flex-start; gap: 10px; }
.seg {
  display: inline-flex; gap: 2px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 3px;
}
.seg-btn {
  height: 26px; padding: 0 12px;
  font-size: 11.5px; font-weight: 500;
  color: var(--muted); background: transparent;
  border: none; border-radius: 5px;
  cursor: pointer;
  transition: background .13s, color .13s;
  font-family: inherit;
}
.seg-btn:hover { color: var(--text); }
.seg-btn.active { background: var(--surface2); color: var(--text); }

/* ── Alerts ───────────────────────────── */
.alert-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.alert-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 8px;
  transition: border-color .15s;
}
.alert-card:hover { border-color: var(--border-hi); }
.alert-card.read { opacity: .6; }
.alert-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.alert-name { font-size: 13px; font-weight: 600; color: var(--text); }
.alert-msg { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--dim); }
.alert-bottom {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 2px;
}
.alert-date { font-size: 11px; color: var(--muted); }
.alert-done { font-size: 10.5px; font-weight: 500; color: var(--green); }

/* ── Skeletons ────────────────────────── */
.skel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.skel-card {
  height: 110px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 12px; animation: pulse 1.4s ease infinite;
}
.skel-list { display: flex; flex-direction: column; gap: 10px; }
.skel-row {
  height: 56px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; animation: pulse 1.4s ease infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .55; }
}

/* ── Modals ───────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(8, 10, 16, 0.7);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex; align-items: center; justify-content: center;
  padding: 24px; overflow-y: auto;
}
.modal-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; width: 100%; max-width: 520px;
  display: flex; flex-direction: column;
  max-height: calc(100vh - 48px); overflow: hidden;
}
.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border);
}
.modal-title { font-size: 15px; font-weight: 600; color: var(--text); margin: 0; }
.modal-close {
  width: 28px; height: 28px;
  background: transparent; border: none;
  color: var(--muted); cursor: pointer;
  font-size: 22px; line-height: 1;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
}
.modal-close:hover { background: var(--surface2); color: var(--text); }
.modal-body {
  padding: 20px; display: flex; flex-direction: column; gap: 14px;
  overflow-y: auto;
}

/* ── Form fields ──────────────────────── */
.form-row { display: flex; flex-direction: column; gap: 5px; }
.form-label {
  font-family: var(--mono);
  font-size: 10px; letter-spacing: .12em;
  text-transform: uppercase; color: var(--muted);
  font-weight: 500;
}
.form-input {
  background: var(--surface2);
  border: 1px solid var(--border); color: var(--text);
  padding: 9px 12px; border-radius: 8px;
  font-size: 13px; font-family: inherit;
  outline: none; width: 100%;
  transition: border-color .15s;
}
.form-input:focus { border-color: var(--accent); }
.form-input::placeholder { color: #545b6e; }
.form-input option { background: var(--surface2); color: var(--text); }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-check {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: var(--text); cursor: pointer;
}
.form-check input[type='checkbox'] {
  width: 14px; height: 14px;
  accent-color: var(--accent);
}
.modal-actions {
  display: flex; justify-content: flex-end; gap: 8px;
  padding-top: 6px;
}

/* ── Responsive ──────────────────────── */
@media (max-width: 1024px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .kpi-strip { grid-template-columns: 1fr; }
  .form-grid-2 { grid-template-columns: 1fr; }
  .ph { flex-direction: column; align-items: flex-start; }
  .ph-title { font-size: 28px; }
}
</style>
