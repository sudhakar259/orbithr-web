<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import EmpAvatar from '@/components/employee/EmpAvatar.vue'
import DocumentsManager from '@/components/employee/profile/DocumentsManager.vue'
import ShiftAssignment from '@/components/employee/ShiftAssignment.vue'
import ProjectAssignment from '@/components/employee/ProjectAssignment.vue'
import HierarchyAssignment from '@/components/employee/HierarchyAssignment.vue'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'

const route  = useRoute()
const router = useRouter()
const { setBreadcrumbs } = useBreadcrumbs()
const id     = computed(() => route.params.id as string)

const loading  = ref(true)
const error    = ref<string | null>(null)
const activeTab = ref('overview')

const employee = reactive<Record<string, any>>({
  id: 0, first_name: '', last_name: '', name: '', email: '', phone: '',
  employee_id: '', role: '', designation: '', department: '', team: '',
  location: '', status: '', manager_id: null, hire_date: '', employment_type: '',
  date_of_birth: '', gender: '', address: '', nationality: '',
  bank_name: '', account_number: '', ifsc_code: '', pan_number: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  working_days: [1, 2, 3, 4, 5], manager: null, documents: [],
})

async function fetchEmployee() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get(`/employees/${id.value}`)
    Object.assign(employee, {
      ...data,
      name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
      working_days: data.working_days || [1, 2, 3, 4, 5],
    })
    setBreadcrumbs([
      { label: 'People' },
      { label: 'Employees', to: '/app/employees' },
      { label: employee.name },
    ])
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load employee data.'
  } finally {
    loading.value = false
  }
}

const tabs = computed(() => [
  { key: 'overview',    label: 'Overview' },
  { key: 'job',         label: 'Job & compensation' },
  { key: 'docs',        label: 'Documents', count: employee.documents?.length || 0 },
  { key: 'attendance',  label: 'Attendance' },
  { key: 'leave',       label: 'Leave' },
  { key: 'perf',        label: 'Performance' },
  { key: 'assets',      label: 'Assets' },
  { key: 'audit',       label: 'Audit' },
])

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DEPT_COLORS: Record<string, string> = {
  engineering: '#6B5BFF', design: '#E8A63C', hr: '#2FB872', people: '#2FB872',
  finance: '#4CC2FF', sales: '#F07A7A', ops: '#B28DFF', operations: '#B28DFF', gtm: '#FF8A65',
}

const deptColor = computed(() => {
  const key = (employee.department || '').toLowerCase().replace(/\s+/g, '')
  return DEPT_COLORS[key] || '#6B5BFF'
})

const statusColor = computed(() => {
  if (employee.status === 'Active') return '#2FB872'
  if (employee.status === 'On Leave') return '#E8A63C'
  return '#7A8299'
})

const statusBadgeClass = computed(() => {
  if (employee.status === 'Active') return 'ep-badge--active'
  if (employee.status === 'On Leave') return 'ep-badge--leave'
  return 'ep-badge--inactive'
})

const managerName = computed(() => {
  const m = employee.manager
  if (!m) return null
  return m.full_name || `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || null
})

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

const tenureText = computed(() => {
  if (!employee.hire_date) return null
  const hired = new Date(employee.hire_date)
  const now = new Date()
  const m = (now.getFullYear() - hired.getFullYear()) * 12 + now.getMonth() - hired.getMonth()
  const yr = Math.floor(m / 12); const rem = m % 12
  if (yr === 0) return `${rem}mo`
  if (rem === 0) return `${yr}yr`
  return `${yr}yr ${rem}mo`
})

const lifecycleItems = computed(() => {
  const items: { d: string; l: string; done: boolean }[] = []
  if (employee.hire_date) {
    const hired = new Date(employee.hire_date)
    const now = new Date()
    items.push({ d: fmtMonthYear(hired), l: 'Hired', done: true })
    const y1 = new Date(hired); y1.setFullYear(y1.getFullYear() + 1)
    if (y1 <= now) items.push({ d: fmtMonthYear(y1), l: '1 yr milestone', done: true })
    const y3 = new Date(hired); y3.setFullYear(y3.getFullYear() + 3)
    if (y3 <= now) items.push({ d: fmtMonthYear(y3), l: '3 yr milestone', done: true })
  }
  items.push({ d: '—', l: 'Next review', done: false })
  return items
})

const lifecycleFillPct = computed(() => {
  const total = lifecycleItems.value.length
  const done  = lifecycleItems.value.filter(m => m.done).length
  return total > 1 ? `${(done / (total - 1)) * 100}%` : '0%'
})

onMounted(fetchEmployee)
</script>

<template>
  <div class="ep-page">
    <!-- Loading / error -->
    <div v-if="loading" class="ep-full-state">Loading employee data…</div>
    <div v-else-if="error" class="ep-full-state ep-full-state--err">
      {{ error }}
      <button class="ep-retry" @click="fetchEmployee">Try again</button>
    </div>

    <template v-else>
      <!-- Cover banner -->
      <div class="ep-cover">
        <div class="ep-cover-stripes"/>
      </div>

      <!-- Inner content -->
      <div class="ep-inner">
        <!-- Identity row -->
        <div class="ep-identity">
          <div class="ep-avatar-ring">
            <EmpAvatar :name="employee.name || '?'" :size="88"/>
          </div>
          <div class="ep-identity-info">
            <div class="ep-identity-row1">
              <h1 class="ep-name">{{ employee.name }}</h1>
              <span v-if="employee.status" :class="['ep-badge', statusBadgeClass]">{{ employee.status }}</span>
              <span
                v-if="employee.department"
                class="ep-badge ep-badge--dept"
                :style="{ background: deptColor + '22', color: deptColor }"
              >{{ employee.department }}</span>
            </div>
            <div class="ep-subtitle">
              <span v-if="employee.designation || employee.role">{{ employee.designation || employee.role }}</span>
              <span v-if="(employee.designation || employee.role) && managerName"> · </span>
              <span v-if="managerName">Reports to {{ managerName }}</span>
              <span v-if="employee.employee_id" class="ep-mono"> · {{ employee.employee_id }}</span>
            </div>
          </div>
          <div class="ep-actions">
            <button class="ep-btn ep-btn--sec">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Call
            </button>
            <button class="ep-btn ep-btn--sec">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Schedule
            </button>
            <button
              class="ep-btn ep-btn--sec"
              @click="router.push({ name: 'employee-edit', params: { id: employee.id } })"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Edit
            </button>
            <button class="ep-btn ep-btn--pri">
              <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Raise request
            </button>
          </div>
        </div>

        <!-- Tab bar -->
        <div class="ep-tabbar">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['ep-tab', activeTab === tab.key && 'ep-tab--active']"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.count" class="ep-tab-count">{{ tab.count }}</span>
          </button>
        </div>

        <!-- ── Overview tab ── -->
        <div v-show="activeTab === 'overview'" class="ep-grid">
          <!-- Left main -->
          <div class="ep-col-left">
            <!-- Lifecycle timeline -->
            <div class="ep-card">
              <div class="ep-card-head">
                <span class="ep-card-title">Lifecycle</span>
                <span v-if="tenureText" class="ep-muted-sm">{{ tenureText }}</span>
              </div>
              <div class="ep-lc-wrap">
                <div class="ep-lc-rail">
                  <div class="ep-lc-fill" :style="{ width: lifecycleFillPct }"/>
                </div>
                <div class="ep-lc-dots">
                  <div v-for="(m, i) in lifecycleItems" :key="i" class="ep-lc-item">
                    <div :class="['ep-lc-dot', !m.done && 'ep-lc-dot--pending']"/>
                    <div class="ep-lc-label" :style="{ color: m.done ? '#EEF0F4' : '#7A8299' }">{{ m.l }}</div>
                    <div class="ep-lc-date">{{ m.d }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Personal + Job 2-col cards -->
            <div class="ep-cards2">
              <div class="ep-card">
                <div class="ep-card-head"><span class="ep-card-title">Personal</span></div>
                <div class="ep-dl">
                  <div class="ep-dl-row"><span class="ep-dk">Email</span><span class="ep-dv">{{ employee.email || '—' }}</span></div>
                  <div class="ep-dl-row"><span class="ep-dk">Phone</span><span class="ep-dv">{{ employee.phone || '—' }}</span></div>
                  <div class="ep-dl-row"><span class="ep-dk">Date of birth</span><span class="ep-dv">{{ fmtDate(employee.date_of_birth) }}</span></div>
                  <div class="ep-dl-row"><span class="ep-dk">Address</span><span class="ep-dv">{{ employee.address || '—' }}</span></div>
                  <div class="ep-dl-row">
                    <span class="ep-dk">Emergency</span>
                    <span class="ep-dv">{{ [employee.emergency_contact_name, employee.emergency_contact_relationship].filter(Boolean).join(' · ') || '—' }}</span>
                  </div>
                </div>
              </div>
              <div class="ep-card">
                <div class="ep-card-head"><span class="ep-card-title">Job</span></div>
                <div class="ep-dl">
                  <div class="ep-dl-row"><span class="ep-dk">Title</span><span class="ep-dv">{{ employee.designation || employee.role || '—' }}</span></div>
                  <div class="ep-dl-row"><span class="ep-dk">Department</span><span class="ep-dv">{{ employee.department || '—' }}</span></div>
                  <div class="ep-dl-row"><span class="ep-dk">Team</span><span class="ep-dv">{{ employee.team || '—' }}</span></div>
                  <div class="ep-dl-row"><span class="ep-dk">Manager</span><span class="ep-dv">{{ managerName || '—' }}</span></div>
                  <div class="ep-dl-row"><span class="ep-dk">Work mode</span><span class="ep-dv">{{ [employee.employment_type, employee.location].filter(Boolean).join(' · ') || '—' }}</span></div>
                  <div class="ep-dl-row"><span class="ep-dk">Joined</span><span class="ep-dv">{{ fmtDate(employee.hire_date) }}</span></div>
                </div>
              </div>
            </div>

            <!-- Working schedule -->
            <div class="ep-card">
              <div class="ep-card-head"><span class="ep-card-title">Working schedule</span></div>
              <div class="ep-wd-row">
                <span
                  v-for="(day, idx) in dayNames"
                  :key="idx"
                  :class="['ep-wd-chip', employee.working_days?.includes(idx) && 'ep-wd-chip--on']"
                >{{ day }}</span>
              </div>
            </div>

            <!-- Documents (managed) -->
            <div class="ep-card ep-card--flush">
              <DocumentsManager :employee-id="employee.id" @changed="fetchEmployee"/>
            </div>
          </div>

          <!-- Right rail -->
          <div class="ep-col-right">
            <!-- At a glance -->
            <div class="ep-card">
              <div class="ep-card-head"><span class="ep-card-title">At a glance</span></div>
              <div class="ep-glance-grid">
                <div class="ep-glance-cell">
                  <div class="ep-eyebrow">Status</div>
                  <div class="ep-glance-val" :style="{ color: statusColor }">{{ employee.status || '—' }}</div>
                </div>
                <div class="ep-glance-cell">
                  <div class="ep-eyebrow">Type</div>
                  <div class="ep-glance-val" style="color: #8979FF">{{ employee.employment_type || '—' }}</div>
                </div>
                <div class="ep-glance-cell">
                  <div class="ep-eyebrow">Location</div>
                  <div class="ep-glance-val" style="color: #F5C16E">{{ employee.location || '—' }}</div>
                </div>
                <div class="ep-glance-cell">
                  <div class="ep-eyebrow">Tenure</div>
                  <div class="ep-glance-val" style="color: #8979FF">{{ tenureText || '—' }}</div>
                </div>
              </div>
            </div>

            <!-- Reporting line -->
            <div class="ep-card">
              <div class="ep-card-head"><span class="ep-card-title">Reporting line</span></div>
              <div class="ep-reporting">
                <div v-if="employee.manager" class="ep-report-item">
                  <EmpAvatar :name="managerName || '?'" :size="22"/>
                  <div class="ep-report-info">
                    <div class="ep-report-name">{{ managerName }}</div>
                    <div class="ep-report-role">{{ employee.manager.designation || employee.manager.role || 'Manager' }}</div>
                  </div>
                </div>
                <div
                  class="ep-report-item ep-report-item--me"
                  :style="{ paddingLeft: employee.manager ? '14px' : '0' }"
                >
                  <EmpAvatar :name="employee.name || '?'" :size="22"/>
                  <div class="ep-report-info">
                    <div class="ep-report-name ep-report-name--me">{{ employee.name }} <span class="ep-muted-sm">(you)</span></div>
                    <div class="ep-report-role">{{ employee.designation || employee.role || '' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bank details -->
            <div class="ep-card">
              <div class="ep-card-head"><span class="ep-card-title">Bank details</span></div>
              <div class="ep-dl">
                <div class="ep-dl-row"><span class="ep-dk">Bank</span><span class="ep-dv">{{ employee.bank_name || '—' }}</span></div>
                <div class="ep-dl-row">
                  <span class="ep-dk">Account</span>
                  <span class="ep-dv ep-mono">{{ employee.account_number ? `****${employee.account_number.slice(-4)}` : '—' }}</span>
                </div>
                <div class="ep-dl-row"><span class="ep-dk">IFSC</span><span class="ep-dv ep-mono">{{ employee.ifsc_code || '—' }}</span></div>
                <div class="ep-dl-row"><span class="ep-dk">PAN</span><span class="ep-dv ep-mono">{{ employee.pan_number || '—' }}</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Job & compensation tab ── -->
        <div v-show="activeTab === 'job'" class="ep-tab-content">
          <ShiftAssignment :employee-id="employee.id"/>
          <ProjectAssignment :employee-id="employee.id"/>
          <HierarchyAssignment :employee-id="employee.id" :current-manager="employee.manager_id"/>
        </div>

        <!-- ── Documents tab ── -->
        <div v-show="activeTab === 'docs'" class="ep-tab-content">
          <DocumentsManager :employee-id="employee.id" @changed="fetchEmployee"/>
        </div>

        <!-- ── Placeholder tabs ── -->
        <div
          v-show="!['overview', 'job', 'docs'].includes(activeTab)"
          class="ep-placeholder"
        >
          <div class="ep-placeholder-label">
            {{ tabs.find(t => t.key === activeTab)?.label }} — coming soon
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Page shell ── */
.ep-page {
  margin: -28px -32px 0;
  display: flex;
  flex-direction: column;
  color: #EEF0F4;
  min-height: calc(100vh - 60px);
}

/* ── Loading / error ── */
.ep-full-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #7A8299;
  font-size: 14px;
  padding: 80px 32px;
}
.ep-full-state--err { color: #E5484D; }
.ep-retry {
  color: #6B5BFF; background: none; border: none;
  cursor: pointer; font-size: 13px; text-decoration: underline;
}

/* ── Cover banner ── */
.ep-cover {
  height: 120px;
  background: linear-gradient(115deg, #2A1B5C 0%, #6B5BFF 60%, #F5C16E 130%);
  opacity: 0.75;
  position: relative;
  flex-shrink: 0;
}
.ep-cover-stripes {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(45deg, transparent 0 12px, rgba(0,0,0,.08) 12px 14px);
}

/* ── Inner layout ── */
.ep-inner {
  padding: 0 32px 48px;
  position: relative;
  z-index: 1;
  flex: 1;
}

/* ── Identity ── */
.ep-identity {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  margin-top: -40px;
  flex-wrap: wrap;
}
.ep-avatar-ring {
  border: 3px solid #0B0D12;
  border-radius: 50%;
  flex-shrink: 0;
  line-height: 0;
}
.ep-identity-info { flex: 1; padding-bottom: 6px; min-width: 0; }
.ep-identity-row1 { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ep-name {
  margin: 0;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 32px;
  font-weight: 400;
  color: #FAFBFC;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.ep-subtitle { font-size: 13px; color: #A8AEC0; margin-top: 5px; }
.ep-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11.5px; color: #7A8299; }

.ep-actions { display: flex; gap: 8px; padding-bottom: 6px; flex-wrap: wrap; }
.ep-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; font-size: 13px;
  font-weight: 500; cursor: pointer; border: none; white-space: nowrap;
}
.ep-btn--sec { background: #1C212C; border: 1px solid #2E3544; color: #EEF0F4; }
.ep-btn--sec:hover { background: #232936; }
.ep-btn--pri { background: #6B5BFF; color: #fff; }
.ep-btn--pri:hover { background: #5545E8; }

/* Badges */
.ep-badge {
  display: inline-flex; align-items: center;
  padding: 3px 9px; border-radius: 9999px; font-size: 11.5px; font-weight: 500;
}
.ep-badge--active   { background: rgba(47,184,114,0.14);  color: #2FB872; }
.ep-badge--leave    { background: rgba(232,166,60,0.14);   color: #E8A63C; }
.ep-badge--inactive { background: rgba(122,130,153,0.14);  color: #7A8299; }
.ep-badge--dept     { font-size: 11px; font-weight: 600; letter-spacing: .04em; }

/* ── Tab bar ── */
.ep-tabbar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #232936;
  margin-top: 22px;
  overflow-x: auto;
}
.ep-tab {
  padding: 10px 16px; font-size: 13px; font-weight: 500; color: #7A8299;
  background: none; border: none; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap;
}
.ep-tab:hover { color: #A8AEC0; }
.ep-tab--active { color: #EEF0F4; border-bottom-color: #6B5BFF; }
.ep-tab-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; border-radius: 9999px;
  background: #232936; font-size: 10.5px; padding: 0 5px; margin-left: 5px;
}

/* ── Overview grid ── */
.ep-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  padding: 20px 0 28px;
}
.ep-col-left, .ep-col-right { display: flex; flex-direction: column; gap: 16px; }

/* Card */
.ep-card {
  background: #161A23; border: 1px solid #232936;
  border-radius: 12px; padding: 16px;
}
.ep-card--flush { padding: 0; overflow: hidden; }
.ep-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.ep-card-title { font-size: 13.5px; font-weight: 600; color: #EEF0F4; }
.ep-muted-sm { font-size: 11px; color: #7A8299; }

/* Lifecycle */
.ep-lc-wrap { position: relative; padding: 0 12px; }
.ep-lc-rail {
  height: 2px; background: #232936; border-radius: 1px;
  position: relative; margin: 16px 0;
}
.ep-lc-fill {
  position: absolute; left: 0; top: 0; height: 100%;
  background: #6B5BFF; border-radius: 1px;
  transition: width 0.4s ease;
}
.ep-lc-dots {
  display: flex; justify-content: space-between;
  margin-top: -28px; position: relative; z-index: 1;
}
.ep-lc-item { display: flex; flex-direction: column; align-items: center; }
.ep-lc-dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: #6B5BFF; border: 2px solid #6B5BFF;
}
.ep-lc-dot--pending { background: #161A23; border-color: #3A4254; }
.ep-lc-label { margin-top: 8px; font-size: 11px; font-weight: 500; white-space: nowrap; }
.ep-lc-date { font-size: 10.5px; color: #7A8299; font-family: 'JetBrains Mono', monospace; margin-top: 2px; }

/* Personal + Job 2-col */
.ep-cards2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.ep-dl { display: flex; flex-direction: column; gap: 10px; }
.ep-dl-row { display: grid; grid-template-columns: 110px 1fr; gap: 8px; font-size: 12px; }
.ep-dk { color: #7A8299; }
.ep-dv { color: #EEF0F4; word-break: break-word; }

/* Working days */
.ep-wd-row { display: flex; flex-wrap: wrap; gap: 8px; }
.ep-wd-chip {
  padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 500;
  background: #1C212C; border: 1px solid #232936; color: #7A8299;
}
.ep-wd-chip--on {
  background: rgba(107,91,255,0.12);
  border-color: rgba(107,91,255,0.3);
  color: #8979FF;
}

/* At a glance */
.ep-glance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ep-glance-cell {
  padding: 12px; background: #0B0D12;
  border-radius: 6px; border: 1px solid #232936;
}
.ep-eyebrow {
  font-size: 10.5px; font-weight: 600; color: #7A8299;
  text-transform: uppercase; letter-spacing: .06em;
}
.ep-glance-val {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 20px; letter-spacing: -0.02em; margin-top: 3px;
}

/* Reporting line */
.ep-reporting { display: flex; flex-direction: column; gap: 10px; }
.ep-report-item { display: flex; align-items: center; gap: 10px; }
.ep-report-info { flex: 1; }
.ep-report-name { font-size: 12px; color: #EEF0F4; font-weight: 400; }
.ep-report-name--me { color: #8979FF; font-weight: 600; }
.ep-report-role { font-size: 10.5px; color: #7A8299; margin-top: 1px; }

/* Other tabs */
.ep-tab-content { display: flex; flex-direction: column; gap: 16px; padding: 20px 0; }
.ep-placeholder {
  padding: 80px 0;
  text-align: center;
  color: #7A8299;
  font-size: 14px;
}
.ep-placeholder-label { color: #7A8299; font-size: 13px; }

@media (max-width: 1024px) {
  .ep-grid { grid-template-columns: 1fr; }
  .ep-cards2 { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .ep-name { font-size: 24px; }
  .ep-inner { padding: 0 16px 32px; }
}
</style>
