<script setup lang="ts">
defineOptions({ name: 'PeopleAnalytics' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'
import PageHeader from '@/components/ui/PageHeader.vue'
import SimpleStatCard from '@/components/ui/SimpleStatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const toast = useToast()
const activeTab = ref<'overview' | 'timeline'>('overview')

/* ── Overview ────────────────────────── */
interface OverviewData {
  total_headcount: number
  attrition_rate: number
  avg_tenure_months: number
  new_hires_this_month: number
  department_distribution: Record<string, number>
  gender_distribution: Record<string, number>
  age_distribution: Record<string, number>
}

const overviewLoading = ref(false)
const overview = ref<OverviewData | null>(null)

const loadOverview = async () => {
  overviewLoading.value = true
  try {
    const res = await api.get('/api/people-analytics/overview')
    overview.value = res.data?.data ?? res.data
  } catch {
    toast.error('Failed to load analytics')
  } finally {
    overviewLoading.value = false
  }
}

const maxDeptValue = () => {
  if (!overview.value?.department_distribution) return 1
  return Math.max(...Object.values(overview.value.department_distribution), 1)
}

const maxAgeValue = () => {
  if (!overview.value?.age_distribution) return 1
  return Math.max(...Object.values(overview.value.age_distribution), 1)
}

/* ── Employee Timeline ───────────────── */
interface Employee {
  id: number
  first_name: string
  last_name?: string
  employee_id?: string
}

interface TimelineEvent {
  id?: number
  date: string
  label: string
  type: string
  description?: string
}

const employees = ref<Employee[]>([])
const selectedEmployeeId = ref<number | null>(null)
const employeeSearch = ref('')
const timelineLoading = ref(false)
const timelineEvents = ref<TimelineEvent[]>([])

const loadEmployees = async () => {
  try {
    const res = await api.get('/api/employees', { params: { per_page: 50 } })
    employees.value = res.data?.data ?? res.data ?? []
  } catch {
    toast.error('Failed to load employees')
  }
}

const loadTimeline = async () => {
  if (!selectedEmployeeId.value) return
  timelineLoading.value = true
  try {
    const res = await api.get('/api/people-analytics/timeline', {
      params: { employee_id: selectedEmployeeId.value },
    })
    timelineEvents.value = res.data?.data ?? res.data ?? []
  } catch {
    toast.error('Failed to load timeline')
  } finally {
    timelineLoading.value = false
  }
}

const selectEmployee = (id: number) => {
  selectedEmployeeId.value = id
  loadTimeline()
}

const typeColor = (type: string) => {
  const map: Record<string, string> = {
    joining: 'tl-green',
    promotion: 'tl-purple',
    leave: 'tl-yellow',
    exit: 'tl-red',
    training: 'tl-blue',
  }
  return map[type] ?? 'tl-muted'
}

const typeBadgeClass = (type: string) => {
  const map: Record<string, string> = {
    joining: 'badge-green',
    promotion: 'badge-purple',
    leave: 'badge-yellow',
    exit: 'badge-red',
    training: 'badge-blue',
  }
  return map[type] ?? 'badge-muted'
}

const typeIcon = (type: string) => {
  const map: Record<string, string> = {
    joining: '🟢',
    promotion: '🟣',
    leave: '🟡',
    exit: '🔴',
    training: '🔵',
  }
  return map[type] ?? '⚪'
}

const switchTab = (tab: typeof activeTab.value) => {
  activeTab.value = tab
  if (tab === 'overview') loadOverview()
  else if (tab === 'timeline') loadEmployees()
}

onMounted(() => loadOverview())
</script>

<template>
  <div class="people-analytics">
    <PageHeader title="People Analytics" subtitle="Workforce insights, trends and employee timelines" />

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="t in (['overview', 'timeline'] as const)"
        :key="t"
        :class="['tab', { active: activeTab === t }]"
        @click="switchTab(t)"
      >
        {{ t === 'timeline' ? 'Employee Timeline' : 'Overview' }}
      </button>
    </div>

    <!-- ═══ OVERVIEW TAB ═══ -->
    <div v-if="activeTab === 'overview'">
      <div v-if="overviewLoading" class="loading-skeleton">
        <div v-for="i in 4" :key="i" class="skel-card" />
      </div>
      <template v-else-if="overview">
        <div class="stat-grid">
          <SimpleStatCard icon="👥" label="Total Headcount" :value="overview.total_headcount ?? 0" color="blue" :delay="0" />
          <SimpleStatCard icon="📉" label="Attrition Rate" :value="`${overview.attrition_rate ?? 0}%`" color="red" :delay="0.05" />
          <SimpleStatCard icon="📅" label="Avg Tenure" :value="`${overview.avg_tenure_months ?? 0} mo`" color="purple" :delay="0.1" />
          <SimpleStatCard icon="🆕" label="New Hires (Month)" :value="overview.new_hires_this_month ?? 0" color="green" :delay="0.15" />
        </div>

        <!-- Department Distribution -->
        <div class="card" style="margin-top: 20px">
          <h3 class="card-title">Department Distribution</h3>
          <div v-if="overview.department_distribution && Object.keys(overview.department_distribution).length" class="bar-list">
            <div v-for="(count, dept) in overview.department_distribution" :key="dept" class="bar-item">
              <div class="bar-label">
                <span class="bar-name">{{ dept }}</span>
                <span class="bar-count">{{ count }}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill blue" :style="{ width: ((count as number) / maxDeptValue() * 100) + '%' }" />
              </div>
            </div>
          </div>
          <EmptyState v-else icon="🏢" message="No department data" />
        </div>

        <!-- Gender Distribution -->
        <div class="card" style="margin-top: 16px">
          <h3 class="card-title">Gender Distribution</h3>
          <div v-if="overview.gender_distribution && Object.keys(overview.gender_distribution).length" class="pill-row">
            <span
              v-for="(count, gender) in overview.gender_distribution"
              :key="gender"
              :class="['gender-pill', gender === 'Male' ? 'gp-blue' : gender === 'Female' ? 'gp-purple' : 'gp-green']"
            >
              {{ gender }}: {{ count }}
            </span>
          </div>
          <EmptyState v-else icon="👤" message="No gender data" />
        </div>

        <!-- Age Distribution -->
        <div class="card" style="margin-top: 16px">
          <h3 class="card-title">Age Distribution</h3>
          <div v-if="overview.age_distribution && Object.keys(overview.age_distribution).length" class="bar-list">
            <div v-for="(count, range) in overview.age_distribution" :key="range" class="bar-item">
              <div class="bar-label">
                <span class="bar-name">{{ range }}</span>
                <span class="bar-count">{{ count }}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill purple" :style="{ width: ((count as number) / maxAgeValue() * 100) + '%' }" />
              </div>
            </div>
          </div>
          <EmptyState v-else icon="📊" message="No age data" />
        </div>
      </template>
      <EmptyState v-else icon="📊" message="No analytics data available" />
    </div>

    <!-- ═══ TIMELINE TAB ═══ -->
    <div v-if="activeTab === 'timeline'">
      <!-- Employee selector -->
      <div class="card" style="margin-bottom: 16px">
        <label class="field-label">Select Employee</label>
        <input
          v-model="employeeSearch"
          type="text"
          placeholder="Search employees..."
          class="search-input"
        />
        <div v-if="employees.length" class="emp-list">
          <button
            v-for="emp in employees.filter(e =>
              !employeeSearch || `${e.first_name} ${e.last_name ?? ''}`.toLowerCase().includes(employeeSearch.toLowerCase())
            )"
            :key="emp.id"
            :class="['emp-item', { active: selectedEmployeeId === emp.id }]"
            @click="selectEmployee(emp.id)"
          >
            {{ emp.first_name }} {{ emp.last_name ?? '' }}
            <span v-if="emp.employee_id" class="emp-code">{{ emp.employee_id }}</span>
          </button>
        </div>
      </div>

      <!-- Timeline -->
      <div v-if="timelineLoading" class="loading-skeleton">
        <div v-for="i in 4" :key="i" class="skel-row" />
      </div>
      <div v-else-if="selectedEmployeeId && timelineEvents.length" class="timeline">
        <div v-for="(evt, idx) in timelineEvents" :key="idx" class="tl-item">
          <div :class="['tl-dot', typeColor(evt.type)]" />
          <div class="tl-line" />
          <div class="tl-content">
            <div class="tl-header">
              <span class="tl-icon">{{ typeIcon(evt.type) }}</span>
              <span class="tl-label">{{ evt.label }}</span>
              <span :class="['badge', typeBadgeClass(evt.type)]">{{ evt.type }}</span>
            </div>
            <div class="tl-date">{{ evt.date }}</div>
            <div v-if="evt.description" class="tl-desc">{{ evt.description }}</div>
          </div>
        </div>
      </div>
      <EmptyState v-else-if="selectedEmployeeId" icon="📅" message="No timeline events found" sub="This employee has no recorded events yet." />
      <EmptyState v-else icon="👆" message="Select an employee" sub="Choose an employee above to view their timeline." />
    </div>
  </div>
</template>

<style scoped>
.people-analytics {
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

/* ── Card ── */
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px;
}
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; color: var(--text); }

/* ── Horizontal bar charts ── */
.bar-list { display: flex; flex-direction: column; gap: 10px; }
.bar-item { display: flex; flex-direction: column; gap: 4px; }
.bar-label { display: flex; justify-content: space-between; align-items: center; }
.bar-name { font-size: 13px; color: var(--text); }
.bar-count { font-size: 12px; font-weight: 600; color: var(--muted); }
.bar-track { height: 20px; background: var(--surface2); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width .4s ease; min-width: 4px; }
.bar-fill.blue { background: linear-gradient(90deg, var(--accent), rgba(79,126,255,.6)); }
.bar-fill.purple { background: linear-gradient(90deg, var(--purple), rgba(155,110,255,.6)); }

/* ── Gender pills ── */
.pill-row { display: flex; flex-wrap: wrap; gap: 10px; }
.gender-pill {
  padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;
}
.gp-blue { background: rgba(79,126,255,.12); color: var(--accent); }
.gp-purple { background: rgba(155,110,255,.12); color: var(--purple); }
.gp-green { background: rgba(54,211,153,.12); color: var(--green); }

/* ── Employee selector ── */
.field-label { font-size: 12px; font-weight: 500; color: var(--muted); margin-bottom: 8px; display: block; }
.search-input {
  width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: 7px;
  padding: 9px 12px; font-size: 13px; color: var(--text); outline: none; transition: border-color .15s;
  margin-bottom: 10px;
}
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--muted); opacity: .5; }
.emp-list { display: flex; flex-wrap: wrap; gap: 6px; max-height: 180px; overflow-y: auto; }
.emp-item {
  padding: 6px 14px; font-size: 12px; font-weight: 500; border: 1px solid var(--border);
  border-radius: 6px; background: transparent; color: var(--text); cursor: pointer;
  transition: all .15s; display: flex; align-items: center; gap: 6px;
}
.emp-item:hover { border-color: var(--accent); }
.emp-item.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.emp-code { font-size: 10px; color: var(--muted); }
.emp-item.active .emp-code { color: rgba(255,255,255,.7); }

/* ── Timeline ── */
.timeline { position: relative; padding-left: 32px; }
.tl-item { position: relative; padding-bottom: 24px; }
.tl-dot {
  position: absolute; left: -32px; top: 4px; width: 14px; height: 14px;
  border-radius: 50%; border: 2px solid var(--surface); z-index: 1;
}
.tl-dot.tl-green { background: var(--green); }
.tl-dot.tl-purple { background: var(--purple); }
.tl-dot.tl-yellow { background: var(--yellow); }
.tl-dot.tl-red { background: var(--red); }
.tl-dot.tl-blue { background: var(--accent); }
.tl-dot.tl-muted { background: var(--muted); }
.tl-line {
  position: absolute; left: -26px; top: 18px; bottom: 0;
  width: 2px; background: var(--border);
}
.tl-item:last-child .tl-line { display: none; }
.tl-content {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  padding: 14px 18px; transition: border-color .15s;
}
.tl-content:hover { border-color: var(--border-hi); }
.tl-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.tl-icon { font-size: 14px; }
.tl-label { font-size: 14px; font-weight: 600; color: var(--text); }
.tl-date { font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.tl-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }

/* ── Badges ── */
.badge { font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
.badge-green  { background: rgba(54,211,153,.12); color: var(--green); }
.badge-red    { background: rgba(255,107,107,.12); color: var(--red); }
.badge-yellow { background: rgba(249,168,37,.12); color: var(--yellow); }
.badge-purple { background: rgba(155,110,255,.12); color: var(--purple); }
.badge-blue   { background: rgba(79,126,255,.12); color: var(--accent); }
.badge-muted  { background: var(--surface2); color: var(--muted); }

/* ── Skeleton loading ── */
.loading-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.skel-card { height: 100px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); animation: pulse 1.4s ease infinite; }
.skel-row { height: 48px; background: var(--surface); border: 1px solid var(--border); border-radius: 7px; animation: pulse 1.4s ease infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
</style>
