<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <select v-model="filters.action" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="loadLogs">
        <option value="">All Actions</option>
        <option value="leave_approved">Leave Approved</option>
        <option value="leave_rejected">Leave Rejected</option>
        <option value="balance_adjusted">Balance Adjusted</option>
        <option value="type_created">Type Created</option>
        <option value="type_updated">Type Updated</option>
        <option value="policy_created">Policy Created</option>
        <option value="policy_updated">Policy Updated</option>
      </select>
      <select v-model="filters.entity_type" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="loadLogs">
        <option value="">All Entities</option>
        <option value="leave_request">Leave Requests</option>
        <option value="leave_adjustment">Adjustments</option>
        <option value="leave_type">Leave Types</option>
        <option value="leave_policy">Policies</option>
      </select>
      <input v-model="filters.start_date" type="date" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="loadLogs" />
      <input v-model="filters.end_date" type="date" class="rounded-md border border-slate-300 px-3 py-2 text-sm" @change="loadLogs" />
    </div>

    <!-- Log Table -->
    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Timestamp</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">User</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Action</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Entity</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">Description</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">IP</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-50">
            <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
              {{ log.created_at ? new Date(log.created_at).toLocaleString() : '—' }}
            </td>
            <td class="px-4 py-3 text-sm text-slate-800">{{ log.user?.name || `User #${log.user_id}` }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="actionClass(log.action)">
                {{ formatAction(log.action) }}
              </span>
            </td>
            <td class="px-4 py-3 text-sm text-slate-600">
              {{ formatEntityType(log.entity_type) }}
              <span v-if="log.entity_id" class="text-xs text-slate-400">#{{ log.entity_id }}</span>
            </td>
            <td class="max-w-xs truncate px-4 py-3 text-sm text-slate-600" :title="log.description">
              {{ log.description || '—' }}
            </td>
            <td class="px-4 py-3 font-mono text-xs text-slate-400">{{ log.ip_address || '—' }}</td>
          </tr>
          <tr v-if="!logs.length && !loading">
            <td colspan="6" class="px-4 py-8 text-center text-slate-400">No audit log entries found.</td>
          </tr>
          <tr v-if="loading">
            <td colspan="6" class="px-4 py-8 text-center text-slate-400">Loading…</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
      <button v-for="p in totalPages" :key="p"
        class="rounded border px-3 py-1 text-sm"
        :class="p === currentPage ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'"
        @click="loadLogs(p)">
        {{ p }}
      </button>
    </div>
  </div>
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
  if (action.includes('approved')) return 'bg-green-100 text-green-800'
  if (action.includes('rejected')) return 'bg-red-100 text-red-800'
  if (action.includes('adjusted')) return 'bg-yellow-100 text-yellow-800'
  if (action.includes('created')) return 'bg-blue-100 text-blue-800'
  if (action.includes('updated')) return 'bg-purple-100 text-purple-800'
  return 'bg-slate-100 text-slate-800'
}

onMounted(() => loadLogs())
</script>
