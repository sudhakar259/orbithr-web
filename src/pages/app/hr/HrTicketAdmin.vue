<script setup lang="ts">
defineOptions({ name: 'HrTicketAdmin' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'

interface Ticket {
  id: number
  ticket_number: string
  employee?: { id: number; first_name: string; last_name?: string }
  employee_name?: string
  category: string
  subject: string
  priority: string
  status: string
  assignee?: { id: number; name: string } | null
  assignee_name?: string
  sla_due_at?: string
  sla_breached?: boolean
  created_at: string
}

interface Stats {
  total: number
  open: number
  sla_breached: number
  avg_resolution_hours: number
}

const toast = useToast()
const loading = ref(true)
const tickets = ref<Ticket[]>([])
const stats = ref<Stats>({ total: 0, open: 0, sla_breached: 0, avg_resolution_hours: 0 })
const hrStaff = ref<{ id: number; name: string }[]>([])
const assignDropdown = ref<number | null>(null)

const filterStatus = ref('')
const filterCategory = ref('')
const filterPriority = ref('')
const filterSlaBreached = ref(false)

const categories = ['leave', 'payroll', 'attendance', 'policy', 'it', 'general']
const priorities = ['low', 'medium', 'high', 'urgent']
const statuses = ['open', 'in_progress', 'resolved', 'closed']

const filtered = computed(() => {
  let list = [...tickets.value]
  if (filterStatus.value) list = list.filter(t => t.status === filterStatus.value)
  if (filterCategory.value) list = list.filter(t => t.category === filterCategory.value)
  if (filterPriority.value) list = list.filter(t => t.priority === filterPriority.value)
  if (filterSlaBreached.value) list = list.filter(t => t.sla_breached)
  return list
})

async function loadStats() {
  try {
    const { data } = await api.get('/tickets/stats')
    stats.value = data.data ?? data
  } catch { /* keep defaults */ }
}

async function loadTickets() {
  loading.value = true
  try {
    const { data } = await api.get('/tickets')
    tickets.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    tickets.value = []
  } finally {
    loading.value = false
  }
}

async function loadHrStaff() {
  try {
    const { data } = await api.get('/users', { params: { role: 'hr_manager' } })
    hrStaff.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch { /* ignore */ }
}

async function assignTicket(ticketId: number, userId: number) {
  try {
    await api.post(`/tickets/${ticketId}/assign`, { assignee_id: userId })
    toast.success('Ticket assigned successfully')
    assignDropdown.value = null
    await loadTickets()
  } catch {
    toast.error('Failed to assign ticket')
  }
}

function employeeName(t: Ticket): string {
  if (t.employee) return [t.employee.first_name, t.employee.last_name].filter(Boolean).join(' ')
  return t.employee_name ?? 'Unknown'
}

function assigneeName(t: Ticket): string {
  if (t.assignee) return t.assignee.name
  return t.assignee_name ?? 'Unassigned'
}

function slaClass(t: Ticket): string {
  if (t.sla_breached) return 'sla-breached'
  if (t.sla_due_at) {
    const due = new Date(t.sla_due_at).getTime()
    const now = Date.now()
    if (due - now < 2 * 60 * 60 * 1000) return 'sla-soon'
  }
  return ''
}

function slaLabel(t: Ticket): string {
  if (t.sla_breached) return 'Breached'
  if (t.sla_due_at) {
    const due = new Date(t.sla_due_at).getTime()
    const now = Date.now()
    if (due - now < 2 * 60 * 60 * 1000 && due > now) return 'Due soon'
    return formatDate(t.sla_due_at)
  }
  return '-'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(() => {
  loadStats()
  loadTickets()
  loadHrStaff()
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Ticket Management</h1>
      <p class="page-sub">SLA tracking and ticket administration</p>
    </div>

    <!-- Stats bar -->
    <div class="stats-row">
      <div class="stat-card stat-blue">
        <div class="stat-label">Total Tickets</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="stat-card stat-yellow">
        <div class="stat-label">Open</div>
        <div class="stat-value">{{ stats.open }}</div>
      </div>
      <div class="stat-card stat-red">
        <div class="stat-label">
          <svg class="warn-icon" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          SLA Breached
        </div>
        <div class="stat-value">{{ stats.sla_breached }}</div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-label">Avg Resolution</div>
        <div class="stat-value">{{ stats.avg_resolution_hours }}h</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-row">
      <select v-model="filterStatus" class="sel">
        <option value="">All Status</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s.replace('_', ' ') }}</option>
      </select>
      <select v-model="filterCategory" class="sel">
        <option value="">All Category</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterPriority" class="sel">
        <option value="">All Priority</option>
        <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
      </select>
      <label class="toggle-label">
        <input type="checkbox" v-model="filterSlaBreached" />
        <span>SLA Breached Only</span>
      </label>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-row">Loading tickets...</div>

    <!-- Table -->
    <div v-else-if="filtered.length" class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Employee</th>
            <th>Category</th>
            <th>Subject</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>SLA Due</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in filtered" :key="t.id">
            <td class="mono">{{ t.ticket_number }}</td>
            <td>{{ employeeName(t) }}</td>
            <td><span class="cat-badge">{{ t.category }}</span></td>
            <td class="subj">{{ t.subject }}</td>
            <td><span class="priority-badge" :class="'p-' + t.priority">{{ t.priority }}</span></td>
            <td><span class="status-badge" :class="'s-' + t.status">{{ t.status.replace('_', ' ') }}</span></td>
            <td>{{ assigneeName(t) }}</td>
            <td>
              <span :class="['sla-cell', slaClass(t)]">{{ slaLabel(t) }}</span>
            </td>
            <td class="date-cell">{{ formatDate(t.created_at) }}</td>
            <td class="actions-cell">
              <div class="assign-wrap">
                <button class="act-btn" @click="assignDropdown = assignDropdown === t.id ? null : t.id">Assign</button>
                <div v-if="assignDropdown === t.id" class="assign-dd">
                  <div
                    v-for="u in hrStaff"
                    :key="u.id"
                    class="dd-item"
                    @click="assignTicket(t.id, u.id)"
                  >{{ u.name }}</div>
                  <div v-if="!hrStaff.length" class="dd-empty">No HR staff found</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty">
      <p>No tickets match the current filters.</p>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-header { margin-bottom: 4px; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }
.page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 16px 18px; }
.stat-label { font-size: 11px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; display: flex; align-items: center; gap: 5px; }
.stat-value { font-size: 26px; font-weight: 700; margin-top: 6px; }
.stat-blue .stat-value { color: var(--accent); }
.stat-yellow .stat-value { color: var(--yellow); }
.stat-red .stat-value { color: var(--red); }
.stat-green .stat-value { color: var(--green); }
.warn-icon { color: var(--red); }

.filter-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sel {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 7px 12px; color: var(--text); font-size: 12px; font-family: inherit;
  outline: none; text-transform: capitalize; cursor: pointer;
}
.sel:focus { border-color: var(--accent); }
.toggle-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); cursor: pointer; }
.toggle-label input { accent-color: var(--accent); }

.loading-row { padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }

.table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); }
.tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
.tbl th { text-align: left; padding: 10px 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); border-bottom: 1px solid var(--border); background: var(--surface2); white-space: nowrap; }
.tbl td { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--text); vertical-align: middle; }
.tbl tbody tr:hover { background: var(--surface2); }
.mono { font-family: monospace; font-size: 11px; color: var(--muted); }
.subj { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.date-cell { white-space: nowrap; font-size: 11px; color: var(--muted); }

.cat-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: capitalize; background: var(--surface2); color: var(--muted); border: 1px solid var(--border); }

.priority-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: capitalize; }
.p-urgent { background: rgba(255,107,107,.12); color: var(--red); }
.p-high { background: rgba(249,168,37,.12); color: var(--yellow); }
.p-medium { background: rgba(79,126,255,.12); color: var(--accent); }
.p-low { background: var(--surface2); color: var(--muted); }

.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: capitalize; }
.s-open { background: rgba(79,126,255,.12); color: var(--accent); }
.s-in_progress { background: rgba(249,168,37,.12); color: var(--yellow); }
.s-resolved { background: rgba(54,211,153,.12); color: var(--green); }
.s-closed { background: var(--surface2); color: var(--muted); }

.sla-cell { font-size: 11px; }
.sla-breached { color: var(--red); font-weight: 700; }
.sla-breached::before { content: '\26A0 '; }
.sla-soon { color: var(--yellow); font-weight: 600; }
.sla-soon::before { content: '\23F0 '; }

.actions-cell { position: relative; }
.assign-wrap { position: relative; display: inline-block; }
.act-btn { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; font-size: 11px; color: var(--text); cursor: pointer; font-family: inherit; transition: all .15s; }
.act-btn:hover { border-color: var(--accent); color: var(--accent); }

.assign-dd { position: absolute; top: 100%; left: 0; margin-top: 4px; background: var(--surface2); border: 1px solid var(--border-hi); border-radius: var(--rs); min-width: 160px; z-index: 20; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
.dd-item { padding: 8px 12px; font-size: 12px; color: var(--text); cursor: pointer; transition: background .1s; }
.dd-item:hover { background: var(--surface3); }
.dd-empty { padding: 8px 12px; font-size: 11px; color: var(--muted); }

.empty { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 48px; text-align: center; color: var(--muted); font-size: 13px; }
</style>
