<script setup lang="ts">
defineOptions({ name: 'IntegrationsPage' })
import { ref, computed, onMounted } from 'vue'
import {
  tenantIntegrationApi,
  type TenantIntegrationGrouped,
  type TenantIntegrationItem,
  type IntegrationLogEntry,
  type UsageReport,
} from '@/services/integrationService'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'

const { confirm: dialog } = useConfirm()
const toast = useToast()

// ─── State ───────────────────────────────────────────────────────────────────
const activeTab = ref<'overview' | 'logs' | 'usage'>('overview')
const loading = ref(false)
const saving = ref(false)
const error = ref('')

const grouped = ref<TenantIntegrationGrouped>({})
const logs = ref<IntegrationLogEntry[]>([])
const logsTotal = ref(0)
const usage = ref<UsageReport | null>(null)

// Modal
const showModal = ref(false)
const modalItem = ref<TenantIntegrationItem | null>(null)
const credentialForm = ref<Record<string, string>>({})
const formError = ref('')

// Log filters
const logFilter = ref<{ type: string; status: string }>({ type: '', status: '' })

// ─── Computed ─────────────────────────────────────────────────────────────────
const allItems = computed((): TenantIntegrationItem[] => {
  return [
    ...(grouped.value.payment ?? []),
    ...(grouped.value.sms ?? []),
    ...(grouped.value.whatsapp ?? []),
  ]
})

const typeSections = computed(() => [
  { key: 'payment', label: 'Payment Gateways', icon: '💳', items: grouped.value.payment ?? [] },
  { key: 'sms', label: 'SMS Providers', icon: '📱', items: grouped.value.sms ?? [] },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', items: grouped.value.whatsapp ?? [] },
])

// ─── Methods ──────────────────────────────────────────────────────────────────
const loadIntegrations = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await tenantIntegrationApi.list()
    grouped.value = res.data.data
  } catch (e) {
    error.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to load integrations'
  } finally {
    loading.value = false
  }
}

const loadLogs = async () => {
  loading.value = true
  try {
    const res = await tenantIntegrationApi.getLogs({
      type: logFilter.value.type || undefined,
      status: logFilter.value.status || undefined,
    })
    logs.value = res.data.data
    logsTotal.value = res.data.total
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

const loadUsage = async () => {
  loading.value = true
  try {
    const res = await tenantIntegrationApi.getUsage()
    usage.value = res.data.data
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

const openConfigureModal = (item: TenantIntegrationItem) => {
  modalItem.value = item
  credentialForm.value = {}
  formError.value = ''
  showModal.value = true
}

const saveIntegration = async () => {
  if (!modalItem.value) return
  formError.value = ''
  saving.value = true
  try {
    if (modalItem.value.integration_id) {
      await tenantIntegrationApi.update(modalItem.value.integration_id, {
        credentials: credentialForm.value,
      })
    } else {
      await tenantIntegrationApi.configure({
        provider_id: modalItem.value.provider.id,
        credentials: credentialForm.value,
        is_active: true,
      })
    }
    showModal.value = false
    await loadIntegrations()
  } catch (e) {
    formError.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save integration'
  } finally {
    saving.value = false
  }
}

const toggleIntegration = async (item: TenantIntegrationItem) => {
  if (!item.integration_id) return
  try {
    await tenantIntegrationApi.toggle(item.integration_id)
    await loadIntegrations()
  } catch {
    // ignore
  }
}

const testIntegration = async (item: TenantIntegrationItem) => {
  if (!item.integration_id) return
  try {
    const res = await tenantIntegrationApi.test(item.integration_id)
    toast.success(res.data.message)
  } catch (e) {
    toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Connection test failed')
  }
}

const removeIntegration = async (item: TenantIntegrationItem) => {
  if (!item.integration_id) return
  if (!await dialog('Remove', 'Remove this integration?')) return
  try {
    await tenantIntegrationApi.remove(item.integration_id)
    await loadIntegrations()
  } catch {
    // ignore
  }
}

const retryLog = async (log: IntegrationLogEntry) => {
  try {
    await tenantIntegrationApi.retryLog(log.id)
    await loadLogs()
  } catch {
    // ignore
  }
}

const onTabChange = (tab: typeof activeTab.value) => {
  activeTab.value = tab
  if (tab === 'logs') loadLogs()
  if (tab === 'usage') loadUsage()
}

const schemaFields = computed(() => {
  if (!modalItem.value?.provider?.config_schema) return []
  return Object.entries(modalItem.value.provider.config_schema).map(([key, field]) => ({
    key,
    ...field,
  }))
})

const typeBadgeClass = (type: string) => {
  const map: Record<string, string> = {
    payment: 'badge-payment',
    sms: 'badge-sms',
    whatsapp: 'badge-whatsapp',
  }
  return map[type] ?? ''
}

const statusClass = (status: string) => {
  if (status === 'success') return 'text-green'
  if (status === 'failed') return 'text-red'
  return 'text-yellow'
}

onMounted(loadIntegrations)
</script>

<template>
  <div class="integrations-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Integrations</h1>
        <p class="page-subtitle">Connect payment gateways, SMS providers, and WhatsApp for your organisation.</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        v-for="tab in [{ id: 'overview', label: 'Providers' }, { id: 'logs', label: 'Activity Logs' }, { id: 'usage', label: 'Usage' }]"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="onTabChange(tab.id as any)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-state">Loading…</div>
    <div v-else-if="error" class="error-banner">{{ error }}</div>

    <!-- Overview Tab -->
    <template v-else-if="activeTab === 'overview'">
      <div
        v-for="section in typeSections"
        :key="section.key"
        class="section"
      >
        <h2 class="section-title">{{ section.icon }} {{ section.label }}</h2>

        <div v-if="section.items.length === 0" class="empty-section">
          No {{ section.label.toLowerCase() }} providers available.
        </div>

        <div class="cards-grid">
          <div
            v-for="item in section.items"
            :key="item.provider.id"
            class="integration-card"
          >
            <div class="card-header">
              <div>
                <span class="provider-name">{{ item.provider.name }}</span>
                <span :class="['type-badge', typeBadgeClass(item.provider.type)]">
                  {{ item.provider.type }}
                </span>
              </div>
              <div class="status-dot" :class="item.is_active ? 'dot-active' : 'dot-inactive'" />
            </div>

            <p class="provider-desc">{{ item.provider.description ?? 'No description provided.' }}</p>

            <div class="card-footer">
              <span class="configured-label">
                {{ item.configured ? (item.is_active ? '✓ Active' : '⏸ Inactive') : 'Not configured' }}
              </span>
              <div class="card-actions">
                <button
                  v-if="item.configured"
                  class="btn-sm btn-ghost"
                  @click="toggleIntegration(item)"
                >
                  {{ item.is_active ? 'Disable' : 'Enable' }}
                </button>
                <button
                  v-if="item.configured"
                  class="btn-sm btn-ghost"
                  @click="testIntegration(item)"
                >
                  Test
                </button>
                <button
                  class="btn-sm btn-primary"
                  @click="openConfigureModal(item)"
                >
                  {{ item.configured ? 'Edit' : 'Configure' }}
                </button>
                <button
                  v-if="item.configured"
                  class="btn-sm btn-danger"
                  @click="removeIntegration(item)"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="allItems.length === 0 && !loading" class="empty-state">
        No integration providers are available yet. Ask your Super Admin to add providers.
      </div>
    </template>

    <!-- Logs Tab -->
    <template v-else-if="activeTab === 'logs'">
      <div class="filters-row">
        <select v-model="logFilter.type" class="filter-select" @change="loadLogs">
          <option value="">All Types</option>
          <option value="payment">Payment</option>
          <option value="sms">SMS</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select v-model="logFilter.status" class="filter-select" @change="loadLogs">
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Provider</th>
              <th>Direction</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ new Date(log.created_at).toLocaleString() }}</td>
              <td><span :class="['type-badge', typeBadgeClass(log.type)]">{{ log.type }}</span></td>
              <td>{{ log.provider?.name ?? '—' }}</td>
              <td>{{ log.direction }}</td>
              <td><span :class="statusClass(log.status)">{{ log.status }}</span></td>
              <td>{{ log.duration_ms != null ? `${log.duration_ms}ms` : '—' }}</td>
              <td>
                <button
                  v-if="log.status === 'failed'"
                  class="btn-sm btn-ghost"
                  @click="retryLog(log)"
                >
                  Retry
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="logs.length === 0" class="empty-state">No logs found.</div>
      </div>
    </template>

    <!-- Usage Tab -->
    <template v-else-if="activeTab === 'usage'">
      <div v-if="usage" class="usage-section">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">SMS Sent</div>
            <div class="stat-value">{{ usage.totals.sms_count }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Payments</div>
            <div class="stat-value">{{ usage.totals.payment_count }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">WhatsApp Messages</div>
            <div class="stat-value">{{ usage.totals.whatsapp_count }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Amount</div>
            <div class="stat-value">{{ usage.totals.total_amount.toFixed(2) }}</div>
          </div>
        </div>

        <div class="table-wrap" style="margin-top: 1.5rem">
          <table class="data-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Type</th>
                <th>SMS</th>
                <th>Payments</th>
                <th>WhatsApp</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in usage.by_provider" :key="row.provider_slug">
                <td>{{ row.provider }}</td>
                <td><span :class="['type-badge', typeBadgeClass(row.type)]">{{ row.type }}</span></td>
                <td>{{ row.sms_count }}</td>
                <td>{{ row.payment_count }}</td>
                <td>{{ row.whatsapp_count }}</td>
                <td>{{ row.total_amount.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="usage.by_provider.length === 0" class="empty-state">No usage data for this period.</div>
        </div>
      </div>
      <div v-else class="empty-state">No usage data available.</div>
    </template>

    <!-- Configure Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ modalItem?.configured ? 'Update' : 'Configure' }} {{ modalItem?.provider.name }}</h3>
            <button class="modal-close" @click="showModal = false">✕</button>
          </div>

          <div class="modal-body">
            <p v-if="!schemaFields.length" class="muted">
              No configuration fields required.
            </p>
            <div v-for="field in schemaFields" :key="field.key" class="form-group">
              <label class="form-label">
                {{ field.label }}
                <span v-if="field.required" class="required-star">*</span>
              </label>
              <input
                v-model="credentialForm[field.key]"
                :type="field.type === 'password' ? 'password' : 'text'"
                class="form-input"
                :placeholder="`Enter ${field.label}`"
              />
            </div>
            <div v-if="formError" class="form-error">{{ formError }}</div>
          </div>

          <div class="modal-footer">
            <button class="btn-ghost" @click="showModal = false">Cancel</button>
            <button class="btn-primary" :disabled="saving" @click="saveIntegration">
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.integrations-page { padding: 1.5rem; color: var(--text); }
.page-header { margin-bottom: 1.5rem; }
.page-title { font-size: 1.5rem; font-weight: 700; color: var(--text); margin: 0 0 0.25rem; }
.page-subtitle { color: var(--muted); font-size: 0.875rem; margin: 0; }

.tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--surface3); margin-bottom: 1.5rem; }
.tab-btn { padding: 0.625rem 1rem; background: none; border: none; color: var(--muted); cursor: pointer; font-size: 0.875rem; border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-btn:hover:not(.active) { color: var(--text); }

.loading-state, .empty-state { color: var(--muted); padding: 2rem; text-align: center; }
.error-banner { background: rgba(255,107,107,0.12); border: 1px solid var(--red); color: var(--red); padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; }

.section { margin-bottom: 2rem; }
.section-title { font-size: 1rem; font-weight: 600; color: var(--text); margin: 0 0 1rem; }
.empty-section { color: var(--muted); font-size: 0.875rem; padding: 0.5rem 0; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.integration-card { background: var(--surface); border: 1px solid var(--surface3); border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; }
.provider-name { font-weight: 600; font-size: 0.9375rem; margin-right: 0.5rem; }
.provider-desc { font-size: 0.8125rem; color: var(--muted); flex: 1; margin: 0; }
.card-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
.configured-label { font-size: 0.8125rem; color: var(--muted); }
.card-actions { display: flex; gap: 0.375rem; flex-wrap: wrap; }

.type-badge { font-size: 0.6875rem; padding: 0.1rem 0.45rem; border-radius: 999px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.badge-payment { background: rgba(79,126,255,0.15); color: var(--accent); }
.badge-sms { background: rgba(155,110,255,0.15); color: var(--purple); }
.badge-whatsapp { background: rgba(54,211,153,0.18); color: var(--green); }

.status-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; margin-top: 0.35rem; }
.dot-active { background: var(--green); }
.dot-inactive { background: var(--surface3); }

.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: 0.375rem; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--surface3); border-radius: 0.375rem; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; }
.btn-ghost:hover { color: var(--text); border-color: var(--muted); }
.btn-danger { background: rgba(255,107,107,0.12); color: var(--red); border: 1px solid transparent; border-radius: 0.375rem; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; }
.btn-sm { padding: 0.25rem 0.625rem; font-size: 0.8125rem; }

.filters-row { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
.filter-select { background: var(--surface); color: var(--text); border: 1px solid var(--surface3); border-radius: 0.375rem; padding: 0.375rem 0.625rem; font-size: 0.875rem; }

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { background: var(--surface2); color: var(--muted); font-weight: 600; text-align: left; padding: 0.625rem 0.875rem; border-bottom: 1px solid var(--surface3); white-space: nowrap; }
.data-table td { padding: 0.625rem 0.875rem; border-bottom: 1px solid var(--surface2); color: var(--text); }
.data-table tr:last-child td { border-bottom: none; }

.text-green { color: var(--green); }
.text-red { color: var(--red); }
.text-yellow { color: var(--yellow); }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
.stat-card { background: var(--surface); border: 1px solid var(--surface3); border-radius: 0.75rem; padding: 1.25rem; }
.stat-label { font-size: 0.8125rem; color: var(--muted); margin-bottom: 0.375rem; }
.stat-value { font-size: 1.75rem; font-weight: 700; color: var(--text); }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--surface); border: 1px solid var(--surface3); border-radius: 0.75rem; width: 480px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--surface3); }
.modal-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
.modal-close { background: none; border: none; color: var(--muted); font-size: 1.125rem; cursor: pointer; }
.modal-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.modal-footer { padding: 1rem 1.25rem; border-top: 1px solid var(--surface3); display: flex; justify-content: flex-end; gap: 0.75rem; }

.form-group { display: flex; flex-direction: column; gap: 0.375rem; }
.form-label { font-size: 0.875rem; font-weight: 500; color: var(--text); }
.required-star { color: var(--red); margin-left: 0.2rem; }
.form-input { background: var(--surface2); border: 1px solid var(--surface3); color: var(--text); border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
.form-input:focus { outline: none; border-color: var(--accent); }
.form-error { color: var(--red); font-size: 0.8125rem; }
.muted { color: var(--muted); font-size: 0.875rem; }
</style>
