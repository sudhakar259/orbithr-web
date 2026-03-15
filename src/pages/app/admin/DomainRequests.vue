<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import api from '@/services/api'

interface DomainRequest {
  id: number
  name: string
  email: string
  domain_name: string
  plan_name: string
  status: 'pending' | 'approved' | 'rejected'
  payment_status: number | string | null
  selected_modules: number[] | null
  created_at: string
}

const router = useRouter()
const { token, isAuthenticated } = useAuth()

const loading    = ref(false)
const actionId   = ref<number | null>(null)
const items      = ref<DomainRequest[]>([])
const total      = ref(0)
const page       = ref(1)
const perPage    = ref(10)
const searchQuery = ref('')
let   searchTimer: number | undefined

// detail drawer
const drawerOpen = ref(false)
const drawerRow  = ref<DomainRequest | null>(null)

// reject modal
const rejectOpen   = ref(false)
const rejectRow    = ref<DomainRequest | null>(null)
const rejectReason = ref('')

// selection
const selectedIds = ref<Set<number>>(new Set())

const lastPage = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(it =>
    [it.name, it.email, it.domain_name, it.plan_name]
      .some(v => String(v || '').toLowerCase().includes(q))
  )
})

function onSearch() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => { page.value = 1; load() }, 300)
}

function mapRow(r: any): DomainRequest {
  const planName = r.plan?.name ?? r.plan_name ?? r.order?.plan?.name ?? '—'
  const status: DomainRequest['status'] =
    r.is_approved === 1 ? 'approved' : r.is_approved === 2 ? 'rejected' : 'pending'
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    domain_name: r.domain_name,
    plan_name: planName,
    status,
    payment_status: r.payment_status ?? null,
    selected_modules: r.selected_modules ? JSON.parse(r.selected_modules) : null,
    created_at: r.created_at,
  }
}

async function load() {
  if (!token.value) return
  loading.value = true
  try {
    const { data } = await api.get('requested-domain', {
      params: { page: page.value, per_page: perPage.value, search: searchQuery.value || undefined },
    })
    if (Array.isArray(data)) {
      items.value = data.map(mapRow)
      total.value = items.value.length
    } else {
      items.value = (data.data || []).map(mapRow)
      total.value = data.meta?.total ?? items.value.length
    }
    selectedIds.value.clear()
  } catch (err: any) {
    items.value = []
    total.value = 0
    if (err.response?.status === 401) router.push('/login')
  } finally {
    loading.value = false
  }
}

async function approve(row: DomainRequest) {
  if (!confirm(`Approve workspace for "${row.name}" (${row.domain_name})?`)) return
  actionId.value = row.id
  try {
    await api.post(`requested-domain/${row.id}/approve`)
    await load()
  } finally { actionId.value = null }
}

function openReject(row: DomainRequest) {
  rejectRow.value = row
  rejectReason.value = ''
  rejectOpen.value = true
}

async function confirmReject() {
  if (!rejectRow.value) return
  actionId.value = rejectRow.value.id
  try {
    await api.post(`requested-domain/${rejectRow.value.id}/reject`, {
      disapprove_reason: rejectReason.value || 'Rejected by admin',
    })
    rejectOpen.value = false
    await load()
  } finally { actionId.value = null }
}

async function destroy(row: DomainRequest) {
  if (!confirm(`Permanently delete request from "${row.name}"? This cannot be undone.`)) return
  actionId.value = row.id
  try {
    await api.delete(`requested-domain/${row.id}`)
    await load()
  } finally { actionId.value = null }
}

async function bulkApprove() {
  if (selectedIds.value.size === 0) return
  if (!confirm(`Approve ${selectedIds.value.size} selected request(s)?`)) return
  await Promise.all(Array.from(selectedIds.value).map(id => api.post(`requested-domain/${id}/approve`)))
  await load()
}

async function bulkReject() {
  if (selectedIds.value.size === 0) return
  const reason = prompt('Rejection reason (optional):') ?? ''
  await Promise.all(Array.from(selectedIds.value).map(id =>
    api.post(`requested-domain/${id}/reject`, { disapprove_reason: reason || 'Rejected by admin' })
  ))
  await load()
}

async function bulkDelete() {
  if (selectedIds.value.size === 0) return
  if (!confirm(`Delete ${selectedIds.value.size} selected request(s)?`)) return
  await Promise.all(Array.from(selectedIds.value).map(id => api.delete(`requested-domain/${id}`)))
  await load()
}

function openDrawer(row: DomainRequest) {
  drawerRow.value = row
  drawerOpen.value = true
}

const allSelected = computed(() =>
  filteredItems.value.length > 0 &&
  filteredItems.value.every(r => selectedIds.value.has(r.id))
)

function toggleAll(checked: boolean) {
  if (checked) filteredItems.value.forEach(r => selectedIds.value.add(r.id))
  else selectedIds.value.clear()
}

function toggleOne(id: number, checked: boolean) {
  if (checked) selectedIds.value.add(id)
  else selectedIds.value.delete(id)
}

function fmtDate(s: string) {
  return s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
}

onMounted(() => { if (isAuthenticated()) load() })
</script>

<template>
  <div class="dr-page">
    <!-- ── Header ───────────────────────────────────────────── -->
    <div class="dr-header">
      <div>
        <h1 class="dr-title">Domain Requests</h1>
        <p class="dr-sub">Review and approve incoming tenant workspace requests.</p>
      </div>
      <div class="dr-header-right">
        <div class="dr-search">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" class="dr-search-icon">
            <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
            <path d="M14 14l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search requests…"
            class="dr-search-input"
            @input="onSearch"
          />
        </div>
      </div>
    </div>

    <!-- ── Bulk actions ─────────────────────────────────────── -->
    <div v-if="selectedIds.size" class="bulk-bar">
      <span class="bulk-count">{{ selectedIds.size }} selected</span>
      <button class="bulk-btn bulk-approve" @click="bulkApprove">Approve</button>
      <button class="bulk-btn bulk-reject"  @click="bulkReject">Reject</button>
      <button class="bulk-btn bulk-delete"  @click="bulkDelete">Delete</button>
      <button class="bulk-clear" @click="selectedIds.clear()">Clear</button>
    </div>

    <!-- ── Table card ───────────────────────────────────────── -->
    <div class="dr-card">
      <div class="dr-table-wrap">
        <table class="dr-table">
          <thead>
            <tr>
              <th class="th-check">
                <input type="checkbox" class="dr-checkbox" :checked="allSelected" @change="toggleAll(($event.target as HTMLInputElement).checked)" />
              </th>
              <th>Requester</th>
              <th>Domain</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Submitted</th>
              <th class="th-actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="td-state">
                <span class="spinner" />
                Loading…
              </td>
            </tr>
            <tr v-else-if="filteredItems.length === 0">
              <td colspan="7" class="td-state">No domain requests found.</td>
            </tr>
            <tr
              v-else
              v-for="row in filteredItems"
              :key="row.id"
              class="dr-row"
            >
              <td class="td-check">
                <input
                  type="checkbox"
                  class="dr-checkbox"
                  :checked="selectedIds.has(row.id)"
                  @change="toggleOne(row.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td>
                <div class="requester">
                  <div class="req-avatar">{{ row.name.charAt(0).toUpperCase() }}</div>
                  <div>
                    <div class="req-name">{{ row.name }}</div>
                    <div class="req-email">{{ row.email }}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="domain-pill">{{ row.domain_name }}</span>
              </td>
              <td class="td-muted">{{ row.plan_name }}</td>
              <td>
                <span :class="['status-badge', `status-${row.status}`]">{{ row.status }}</span>
              </td>
              <td class="td-muted">{{ fmtDate(row.created_at) }}</td>
              <td class="td-actions">
                <div class="action-row">
                  <button
                    v-if="row.status === 'pending'"
                    class="act-btn act-approve"
                    :disabled="actionId === row.id"
                    @click="approve(row)"
                    title="Approve"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    Approve
                  </button>
                  <button
                    v-if="row.status === 'pending'"
                    class="act-btn act-reject"
                    :disabled="actionId === row.id"
                    @click="openReject(row)"
                    title="Reject"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                    Reject
                  </button>
                  <button class="act-btn act-view" @click="openDrawer(row)" title="View details">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                  <button class="act-btn act-delete" @click="destroy(row)" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="dr-pagination">
        <span class="pg-info">
          Showing {{ total === 0 ? 0 : (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} of {{ total }}
        </span>
        <div class="pg-controls">
          <select class="pg-select" :value="perPage" @change="perPage = +($event.target as HTMLSelectElement).value; page = 1; load()">
            <option :value="10">10 / page</option>
            <option :value="25">25 / page</option>
            <option :value="50">50 / page</option>
          </select>
          <button class="pg-btn" :disabled="page <= 1" @click="page--; load()">‹</button>
          <span class="pg-current">{{ page }} / {{ lastPage }}</span>
          <button class="pg-btn" :disabled="page >= lastPage" @click="page++; load()">›</button>
        </div>
      </div>
    </div>

    <!-- ── Detail drawer ────────────────────────────────────── -->
    <Transition name="drawer">
      <div v-if="drawerOpen" class="drawer-overlay" @click.self="drawerOpen = false">
        <div class="drawer-panel">
          <div class="drawer-head">
            <h3 class="drawer-title">Request Details</h3>
            <button class="drawer-close" @click="drawerOpen = false">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          <div v-if="drawerRow" class="drawer-body">
            <div class="detail-avatar">{{ drawerRow.name.charAt(0).toUpperCase() }}</div>
            <div class="detail-name">{{ drawerRow.name }}</div>
            <div class="detail-email">{{ drawerRow.email }}</div>
            <span :class="['status-badge', `status-${drawerRow.status}`, 'mt-2']">{{ drawerRow.status }}</span>

            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Domain</span>
                <span class="detail-value domain-pill">{{ drawerRow.domain_name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Plan</span>
                <span class="detail-value">{{ drawerRow.plan_name }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Submitted</span>
                <span class="detail-value">{{ fmtDate(drawerRow.created_at) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Payment</span>
                <span class="detail-value">
                  {{ drawerRow.payment_status === 1 ? 'Paid' : drawerRow.payment_status === 2 ? 'Failed' : 'Pending' }}
                </span>
              </div>
            </div>

            <div v-if="drawerRow.status === 'pending'" class="drawer-actions">
              <button class="btn-primary" @click="approve(drawerRow); drawerOpen = false">
                Approve Workspace
              </button>
              <button class="btn-ghost" @click="openReject(drawerRow); drawerOpen = false">
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Reject modal ─────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="rejectOpen" class="modal-overlay" @click.self="rejectOpen = false">
        <div class="modal-card">
          <h3 class="modal-title">Reject Request</h3>
          <p class="modal-sub">Provide a reason for rejecting <strong>{{ rejectRow?.name }}</strong>'s request.</p>
          <textarea
            v-model="rejectReason"
            class="modal-textarea"
            placeholder="Optional rejection reason…"
            rows="3"
          />
          <div class="modal-footer">
            <button class="btn-danger" @click="confirmReject">Reject</button>
            <button class="btn-ghost" @click="rejectOpen = false">Cancel</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dr-page { display: flex; flex-direction: column; gap: 24px; }

/* Header */
.dr-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.dr-title  { font-size: 22px; font-weight: 700; color: var(--text); }
.dr-sub    { margin-top: 4px; font-size: 13px; color: var(--muted); }
.dr-header-right { display: flex; align-items: center; gap: 12px; }

/* Search */
.dr-search {
  position: relative; display: flex; align-items: center;
}
.dr-search-icon {
  position: absolute; left: 10px; color: var(--muted); pointer-events: none;
}
.dr-search-input {
  height: 36px; padding: 0 12px 0 32px; font-size: 13px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  border-radius: 8px; color: var(--text); outline: none; width: 240px;
  transition: border-color .15s;
}
.dr-search-input::placeholder { color: var(--muted); }
.dr-search-input:focus { border-color: var(--accent); }

/* Bulk bar */
.bulk-bar {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  border-radius: 10px; padding: 8px 14px; flex-wrap: wrap;
}
.bulk-count { font-size: 13px; font-weight: 600; color: var(--text); margin-right: 4px; }
.bulk-btn {
  font-size: 12px; font-weight: 500; padding: 5px 12px;
  border-radius: 6px; border: 1px solid; cursor: pointer; transition: opacity .15s;
}
.bulk-approve { color: var(--green);  border-color: rgba(54,211,153,.35); background: rgba(54,211,153,.08); }
.bulk-reject  { color: var(--yellow); border-color: rgba(249,168,37,.35); background: rgba(249,168,37,.08); }
.bulk-delete  { color: var(--red);    border-color: rgba(255,107,107,.35); background: rgba(255,107,107,.08); }
.bulk-clear   { margin-left: auto; font-size: 12px; color: var(--muted); background: none; border: none; cursor: pointer; }
.bulk-clear:hover { color: var(--text); }

/* Card */
.dr-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r); overflow: hidden;
}
.dr-table-wrap { overflow-x: auto; }

/* Table */
.dr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dr-table thead tr {
  background: var(--surface2); border-bottom: 1px solid var(--border-hi);
}
.dr-table th {
  padding: 11px 16px; text-align: left;
  font-size: 11px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap;
}
.th-check, .td-check { width: 40px; padding-left: 16px; }
.th-actions { width: 200px; }

.dr-row { border-bottom: 1px solid var(--border); transition: background .12s; }
.dr-row:last-child { border-bottom: none; }
.dr-row:hover { background: var(--surface2); }
.dr-table td { padding: 12px 16px; color: var(--text); vertical-align: middle; }

.td-state { padding: 40px 16px; text-align: center; color: var(--muted); }
.td-muted { color: var(--dim); }
.td-actions { padding-right: 12px; }

/* Checkbox */
.dr-checkbox {
  width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer;
}

/* Requester cell */
.requester { display: flex; align-items: center; gap: 10px; }
.req-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  display: grid; place-items: center;
  font-size: 13px; font-weight: 700; color: #fff;
}
.req-name  { font-weight: 500; color: var(--text); font-size: 13px; }
.req-email { font-size: 11px; color: var(--muted); margin-top: 1px; }

/* Domain pill */
.domain-pill {
  display: inline-block;
  padding: 2px 8px; border-radius: 6px;
  background: var(--surface3); border: 1px solid var(--border-hi);
  font-size: 12px; font-family: monospace; color: var(--accent);
}

/* Status badge */
.status-badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; text-transform: capitalize;
  letter-spacing: 0.3px;
}
.status-pending  { background: rgba(249,168,37,.12);  color: var(--yellow); border: 1px solid rgba(249,168,37,.3); }
.status-approved { background: rgba(54,211,153,.12);  color: var(--green);  border: 1px solid rgba(54,211,153,.3); }
.status-rejected { background: rgba(255,107,107,.12); color: var(--red);    border: 1px solid rgba(255,107,107,.3); }

/* Action buttons */
.action-row { display: flex; align-items: center; gap: 6px; }
.act-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 500;
  border: 1px solid; cursor: pointer; transition: opacity .15s, transform .1s;
  background: none;
}
.act-btn:disabled { opacity: .4; cursor: not-allowed; }
.act-btn:not(:disabled):hover { opacity: .85; transform: translateY(-1px); }

.act-approve { color: var(--green);  border-color: rgba(54,211,153,.4); }
.act-approve:hover { background: rgba(54,211,153,.1) !important; }
.act-reject  { color: var(--yellow); border-color: rgba(249,168,37,.4); }
.act-reject:hover  { background: rgba(249,168,37,.1) !important; }
.act-view    { color: var(--dim);    border-color: var(--border-hi); }
.act-view:hover    { color: var(--text); background: var(--surface2) !important; }
.act-delete  { color: var(--red);    border-color: rgba(255,107,107,.3); }
.act-delete:hover  { background: rgba(255,107,107,.1) !important; }

/* Spinner */
.spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.15); border-top-color: var(--accent);
  border-radius: 50%; animation: spin .7s linear infinite; vertical-align: middle; margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Pagination */
.dr-pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-top: 1px solid var(--border);
  flex-wrap: wrap; gap: 8px;
}
.pg-info { font-size: 12px; color: var(--muted); }
.pg-controls { display: flex; align-items: center; gap: 8px; }
.pg-select {
  height: 30px; padding: 0 8px; font-size: 12px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  border-radius: 6px; color: var(--dim); cursor: pointer; outline: none;
}
.pg-btn {
  width: 28px; height: 28px; border-radius: 6px; font-size: 15px;
  background: var(--surface2); border: 1px solid var(--border-hi);
  color: var(--dim); cursor: pointer; transition: all .15s;
}
.pg-btn:not(:disabled):hover { background: var(--surface3); color: var(--text); border-color: var(--accent); }
.pg-btn:disabled { opacity: .35; cursor: not-allowed; }
.pg-current { font-size: 12px; color: var(--dim); min-width: 50px; text-align: center; }

/* Drawer */
.drawer-overlay {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,.6); backdrop-filter: blur(2px);
  display: flex; justify-content: flex-end;
}
.drawer-panel {
  width: 100%; max-width: 420px; height: 100%;
  background: var(--surface); border-left: 1px solid var(--border-hi);
  display: flex; flex-direction: column;
  animation: slideIn .2s ease;
}
@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } }

.drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; border-bottom: 1px solid var(--border);
}
.drawer-title { font-size: 15px; font-weight: 600; color: var(--text); }
.drawer-close {
  width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center;
  background: var(--surface2); border: 1px solid var(--border-hi); color: var(--muted); cursor: pointer;
}
.drawer-close:hover { color: var(--text); border-color: var(--border-hi); }

.drawer-body {
  flex: 1; overflow-y: auto; padding: 24px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.detail-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  display: grid; place-items: center;
  font-size: 22px; font-weight: 700; color: #fff;
  margin-bottom: 6px;
}
.detail-name  { font-size: 16px; font-weight: 600; color: var(--text); }
.detail-email { font-size: 12px; color: var(--muted); }

.detail-grid  { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
.detail-item  { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.detail-label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--muted); margin-bottom: 4px; }
.detail-value { font-size: 13px; color: var(--text); font-weight: 500; }

.drawer-actions { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,.7); backdrop-filter: blur(3px);
  display: grid; place-items: center; padding: 20px;
}
.modal-card {
  background: var(--surface); border: 1px solid var(--border-hi);
  border-radius: var(--r); padding: 28px; width: 100%; max-width: 440px;
  animation: fadeUp .2s ease;
}
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } }
.modal-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.modal-sub   { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
.modal-sub strong { color: var(--text); }
.modal-textarea {
  width: 100%; padding: 10px 12px; border-radius: 8px; font-size: 13px; resize: vertical;
  background: var(--surface2); border: 1px solid var(--border-hi);
  color: var(--text); outline: none; font-family: inherit;
}
.modal-textarea::placeholder { color: var(--muted); }
.modal-textarea:focus { border-color: var(--accent); }
.modal-footer { display: flex; gap: 10px; margin-top: 16px; }

/* Shared button styles (pulled from base.css component layer) */
.btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: 600;
  background: var(--accent); color: #fff; border: none; cursor: pointer;
  box-shadow: 0 0 16px rgba(79,126,255,.3); transition: all .15s;
}
.btn-primary:hover { background: #3d6ee8; }
.btn-ghost {
  display: inline-flex; align-items: center; justify-content: center;
  width: 100%; padding: 10px; border-radius: 8px; font-size: 14px; font-weight: 500;
  background: var(--surface2); border: 1px solid var(--border-hi); color: var(--dim); cursor: pointer;
}
.btn-ghost:hover { background: var(--surface3); color: var(--text); }
.btn-danger {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;
  background: var(--red); color: #fff; border: none; cursor: pointer; transition: filter .15s;
}
.btn-danger:hover { filter: brightness(1.1); }

/* Transitions */
.drawer-enter-active, .drawer-leave-active { transition: opacity .2s; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
