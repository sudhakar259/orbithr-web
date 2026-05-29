<template>
  <section class="lal-page">
    <div class="lal-header">
      <div>
        <h1 class="lal-title">Leave Audit Log</h1>
        <p class="lal-sub">Track all leave-related actions and system events.</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="lal-filters">
      <select v-model="filters.action" class="lal-select" @change="loadLogs">
        <option value="">All Actions</option>
        <option value="leave_approved">Leave Approved</option>
        <option value="leave_rejected">Leave Rejected</option>
        <option value="balance_adjusted">Balance Adjusted</option>
        <option value="type_created">Type Created</option>
        <option value="type_updated">Type Updated</option>
        <option value="policy_created">Policy Created</option>
        <option value="policy_updated">Policy Updated</option>
      </select>
      <select v-model="filters.entity_type" class="lal-select" @change="loadLogs">
        <option value="">All Entities</option>
        <option value="leave_request">Leave Requests</option>
        <option value="leave_adjustment">Adjustments</option>
        <option value="leave_type">Leave Types</option>
        <option value="leave_policy">Policies</option>
      </select>
      <input v-model="filters.start_date" type="date" class="lal-select" @change="loadLogs" />
      <input v-model="filters.end_date" type="date" class="lal-select" @change="loadLogs" />
    </div>

    <!-- Table -->
    <div class="lal-card">
      <table class="lal-table">
        <thead>
          <tr>
            <th class="lal-th">Timestamp</th>
            <th class="lal-th">User</th>
            <th class="lal-th">Action</th>
            <th class="lal-th">Entity</th>
            <th class="lal-th">Description</th>
            <th class="lal-th">IP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id" class="lal-row">
            <td class="lal-td lal-td-ts">
              {{ log.created_at ? new Date(log.created_at).toLocaleString() : '—' }}
            </td>
            <td class="lal-td lal-td-user">{{ log.user?.name || `User #${log.user_id}` }}</td>
            <td class="lal-td">
              <span :class="['lal-badge', actionClass(log.action)]">
                {{ formatAction(log.action) }}
              </span>
            </td>
            <td class="lal-td">
              <span class="lal-entity">{{ formatEntityType(log.entity_type) }}</span>
              <span v-if="log.entity_id" class="lal-entity-id">#{{ log.entity_id }}</span>
            </td>
            <td class="lal-td lal-td-desc" :title="log.description">{{ log.description || '—' }}</td>
            <td class="lal-td lal-td-ip">{{ log.ip_address || '—' }}</td>
          </tr>
          <tr v-if="!logs.length && !loading">
            <td colspan="6" class="lal-empty">No audit log entries found.</td>
          </tr>
          <tr v-if="loading">
            <td colspan="6" class="lal-empty">Loading…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="lal-pagination">
      <button v-for="p in totalPages" :key="p"
        :class="['lal-page-btn', p === currentPage && 'lal-page-btn-active']"
        @click="loadLogs(p)">
        {{ p }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { leaveService } from '@/services/leave'
import type { LeaveAuditLog } from '@/services/leave'

const logs = ref<LeaveAuditLog[]>([])
const loading = ref(false)
const currentPage = ref(1)
const totalPages = ref(1)

const filters = reactive({
  action: '',
  entity_type: '',
  start_date: '',
  end_date: '',
})

async function loadLogs(page = 1) {
  loading.value = true
  try {
    const params: Record<string, unknown> = { page }
    if (filters.action) params.action = filters.action
    if (filters.entity_type) params.entity_type = filters.entity_type
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await leaveService.getAuditLogs(params as any)
    logs.value = result.data
    currentPage.value = result.current_page
    totalPages.value = result.last_page
  } catch {
    logs.value = []
  } finally {
    loading.value = false
  }
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatEntityType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function actionClass(action: string): string {
  if (action.includes('approved')) return 'lal-badge-green'
  if (action.includes('rejected')) return 'lal-badge-red'
  if (action.includes('adjusted')) return 'lal-badge-yellow'
  if (action.includes('created')) return 'lal-badge-blue'
  if (action.includes('updated')) return 'lal-badge-purple'
  return 'lal-badge-muted'
}

onMounted(() => loadLogs())
</script>

<style scoped>
.lal-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.lal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.lal-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.lal-sub { margin: 4px 0 0; font-size: 13px; color: #7A8299; }

.lal-filters { display: flex; flex-wrap: wrap; gap: 10px; }
.lal-select {
  background: #161A23; border: 1px solid #232936; color: #EEF0F4;
  border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; cursor: pointer;
}
.lal-select:focus { border-color: #6B5BFF; }

.lal-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.lal-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lal-th { padding: 11px 14px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.lal-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.lal-row:last-child { border-bottom: none; }
.lal-row:hover { background: rgba(255,255,255,0.02); }
.lal-td { padding: 11px 14px; color: #B6BED0; vertical-align: middle; }
.lal-td-ts { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #7A8299; white-space: nowrap; }
.lal-td-user { color: #EEF0F4; font-size: 13px; }
.lal-td-desc { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.lal-td-ip { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #7A8299; }
.lal-entity { font-size: 12px; color: #B6BED0; }
.lal-entity-id { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #7A8299; margin-left: 4px; }
.lal-empty { padding: 32px; text-align: center; color: #7A8299; }

.lal-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.lal-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.lal-badge-red    { background: rgba(243,130,136,0.12); color: #F38288; }
.lal-badge-yellow { background: rgba(245,166,35,0.12); color: #F5A623; }
.lal-badge-blue   { background: rgba(126,215,255,0.12); color: #7ED7FF; }
.lal-badge-purple { background: rgba(178,141,255,0.12); color: #B28DFF; }
.lal-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }

.lal-pagination { display: flex; justify-content: center; gap: 6px; }
.lal-page-btn { background: #161A23; border: 1px solid #232936; color: #7A8299; border-radius: 6px; padding: 5px 11px; font-size: 13px; cursor: pointer; }
.lal-page-btn:hover { background: #232936; color: #EEF0F4; }
.lal-page-btn-active { border-color: #6B5BFF; color: #6B5BFF; background: rgba(107,91,255,0.08); }
</style>
