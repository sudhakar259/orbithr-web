<script setup lang="ts">
defineOptions({ name: 'IntegrationProvidersAdmin' })
import { ref, onMounted } from 'vue'
import {
  adminIntegrationApi,
  type IntegrationProvider,
  type GlobalIntegrationConfig,
} from '@/services/integrationService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

// ─── State ───────────────────────────────────────────────────────────────────
const providers = ref<IntegrationProvider[]>([])
const globalConfigs = ref<GlobalIntegrationConfig[]>([])
const loading = ref(false)
const error = ref('')

// Provider modal
const showProviderModal = ref(false)
const editingProvider = ref<IntegrationProvider | null>(null)
const providerForm = ref({ name: '', slug: '', type: 'payment' as 'payment' | 'sms' | 'whatsapp', description: '', config_schema: '' })
const providerError = ref('')
const savingProvider = ref(false)

// Global config modal
const showConfigModal = ref(false)
const configForProvider = ref<IntegrationProvider | null>(null)
const configForm = ref<Record<string, string>>({})
const configError = ref('')
const savingConfig = ref(false)

// ─── Methods ──────────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const [pRes, gRes] = await Promise.all([
      adminIntegrationApi.getProviders(),
      adminIntegrationApi.getGlobalConfigs(),
    ])
    providers.value = pRes.data.data
    globalConfigs.value = gRes.data.data
  } catch {
    error.value = 'Failed to load integration data'
  } finally {
    loading.value = false
  }
}

const openCreateProvider = () => {
  editingProvider.value = null
  providerForm.value = { name: '', slug: '', type: 'payment', description: '', config_schema: '' }
  providerError.value = ''
  showProviderModal.value = true
}

const openEditProvider = (p: IntegrationProvider) => {
  editingProvider.value = p
  providerForm.value = {
    name: p.name,
    slug: p.slug,
    type: p.type,
    description: p.description ?? '',
    config_schema: p.config_schema ? JSON.stringify(p.config_schema, null, 2) : '',
  }
  providerError.value = ''
  showProviderModal.value = true
}

const saveProvider = async () => {
  providerError.value = ''
  savingProvider.value = true
  try {
    let schemaObj: Record<string, unknown> | null = null
    if (providerForm.value.config_schema.trim()) {
      schemaObj = JSON.parse(providerForm.value.config_schema)
    }
    const payload = {
      name: providerForm.value.name,
      slug: providerForm.value.slug,
      type: providerForm.value.type,
      description: providerForm.value.description || null,
      config_schema: schemaObj,
    }
    if (editingProvider.value) {
      await adminIntegrationApi.updateProvider(editingProvider.value.id, payload)
    } else {
      await adminIntegrationApi.createProvider(payload)
    }
    showProviderModal.value = false
    await load()
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    providerError.value = err?.response?.data?.message ?? err?.message ?? 'Failed to save provider'
  } finally {
    savingProvider.value = false
  }
}

const deleteProvider = async (p: IntegrationProvider) => {
  if (!await dialog('Delete', `Delete provider "${p.name}"?`)) return
  try {
    await adminIntegrationApi.deleteProvider(p.id)
    await load()
  } catch {
    // ignore
  }
}

const toggleProvider = async (p: IntegrationProvider) => {
  try {
    await adminIntegrationApi.toggleProvider(p.id)
    await load()
  } catch {
    // ignore
  }
}

const openGlobalConfig = (p: IntegrationProvider) => {
  configForProvider.value = p
  configForm.value = {}
  configError.value = ''
  showConfigModal.value = true
}

const saveGlobalConfig = async () => {
  if (!configForProvider.value) return
  configError.value = ''
  savingConfig.value = true
  try {
    await adminIntegrationApi.createGlobalConfig({
      provider_id: configForProvider.value.id,
      credentials: configForm.value,
      is_default: true,
      is_active: true,
    })
    showConfigModal.value = false
    await load()
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } }
    configError.value = err?.response?.data?.message ?? 'Failed to save configuration'
  } finally {
    savingConfig.value = false
  }
}

const deleteGlobalConfig = async (cfg: GlobalIntegrationConfig) => {
  if (!await dialog('Remove', 'Remove this global configuration?')) return
  try {
    await adminIntegrationApi.deleteGlobalConfig(cfg.id)
    await load()
  } catch {
    // ignore
  }
}

const schemaFieldsForProvider = (p: IntegrationProvider) => {
  if (!p.config_schema) return []
  return Object.entries(p.config_schema).map(([key, field]) => ({ key, ...field }))
}

const typeBadgeClass = (type: string) => {
  const map: Record<string, string> = { payment: 'badge-payment', sms: 'badge-sms', whatsapp: 'badge-whatsapp' }
  return map[type] ?? ''
}

const globalConfigForProvider = (providerId: string) =>
  globalConfigs.value.filter(c => c.provider_id === providerId)

onMounted(load)
</script>

<template>
  <div class="admin-integrations">
    <div class="page-header">
      <div>
        <h1 class="page-title">Integration Providers</h1>
        <p class="page-subtitle">Manage available payment, SMS, and WhatsApp providers and their global credentials.</p>
      </div>
      <button class="btn-primary" @click="openCreateProvider">+ Add Provider</button>
    </div>

    <div v-if="loading" class="loading-state">Loading…</div>
    <div v-else-if="error" class="error-banner">{{ error }}</div>

    <template v-else>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Type</th>
              <th>Status</th>
              <th>Global Config</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in providers" :key="p.id">
              <td class="provider-name-cell">
                {{ p.name }}
                <p class="provider-desc">{{ p.description }}</p>
              </td>
              <td><code class="slug-code">{{ p.slug }}</code></td>
              <td><span :class="['type-badge', typeBadgeClass(p.type)]">{{ p.type }}</span></td>
              <td>
                <span :class="p.is_active ? 'status-active' : 'status-inactive'">
                  {{ p.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div class="global-configs">
                  <span
                    v-for="cfg in globalConfigForProvider(p.id)"
                    :key="cfg.id"
                    class="config-pill"
                  >
                    {{ cfg.label ?? 'Default' }}
                    <button class="pill-remove" @click="deleteGlobalConfig(cfg)">✕</button>
                  </span>
                  <button class="btn-sm btn-ghost" @click="openGlobalConfig(p)">+ Add</button>
                </div>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-sm btn-ghost" @click="toggleProvider(p)">
                    {{ p.is_active ? 'Disable' : 'Enable' }}
                  </button>
                  <button class="btn-sm btn-ghost" @click="openEditProvider(p)">Edit</button>
                  <button class="btn-sm btn-danger" @click="deleteProvider(p)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="providers.length === 0" class="empty-state">No providers yet. Click "+ Add Provider" to create one.</div>
      </div>
    </template>

    <!-- Provider Modal -->
    <Teleport to="body">
      <div v-if="showProviderModal" class="modal-backdrop" @click.self="showProviderModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ editingProvider ? 'Edit Provider' : 'Add Provider' }}</h3>
            <button class="modal-close" @click="showProviderModal = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Name <span class="required-star">*</span></label>
              <input v-model="providerForm.name" class="form-input" placeholder="e.g. Razorpay" />
            </div>
            <div class="form-group">
              <label class="form-label">Slug <span class="required-star">*</span></label>
              <input v-model="providerForm.slug" class="form-input" placeholder="e.g. razorpay" />
            </div>
            <div class="form-group">
              <label class="form-label">Type <span class="required-star">*</span></label>
              <select v-model="providerForm.type" class="form-input">
                <option value="payment">Payment</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <input v-model="providerForm.description" class="form-input" placeholder="Short description" />
            </div>
            <div class="form-group">
              <label class="form-label">Config Schema (JSON)</label>
              <textarea
                v-model="providerForm.config_schema"
                class="form-input schema-textarea"
                placeholder='{"api_key": {"type": "password", "label": "API Key", "required": true}}'
              />
              <p class="field-hint">Define the credential fields tenants must fill in.</p>
            </div>
            <div v-if="providerError" class="form-error">{{ providerError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="showProviderModal = false">Cancel</button>
            <button class="btn-primary" :disabled="savingProvider" @click="saveProvider">
              {{ savingProvider ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Global Config Modal -->
    <Teleport to="body">
      <div v-if="showConfigModal" class="modal-backdrop" @click.self="showConfigModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>Global Config — {{ configForProvider?.name }}</h3>
            <button class="modal-close" @click="showConfigModal = false">✕</button>
          </div>
          <div class="modal-body">
            <p v-if="!configForProvider?.config_schema" class="muted">
              No credential fields defined for this provider.
            </p>
            <div
              v-for="field in schemaFieldsForProvider(configForProvider!)"
              :key="field.key"
              class="form-group"
            >
              <label class="form-label">
                {{ field.label }}
                <span v-if="field.required" class="required-star">*</span>
              </label>
              <input
                v-model="configForm[field.key]"
                :type="field.type === 'password' ? 'password' : 'text'"
                class="form-input"
                :placeholder="`Enter ${field.label}`"
              />
            </div>
            <div v-if="configError" class="form-error">{{ configError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="showConfigModal = false">Cancel</button>
            <button class="btn-primary" :disabled="savingConfig" @click="saveGlobalConfig">
              {{ savingConfig ? 'Saving…' : 'Save Global Config' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-integrations { padding: 1.5rem; color: var(--text); }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.25rem; }
.page-subtitle { color: var(--muted); font-size: 0.875rem; margin: 0; }

.loading-state, .empty-state { color: var(--muted); padding: 2rem; text-align: center; }
.error-banner { background: rgba(255,107,107,0.12); border: 1px solid var(--red); color: var(--red); padding: 0.75rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem; }

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th { background: var(--surface2); color: var(--muted); font-weight: 600; text-align: left; padding: 0.625rem 0.875rem; border-bottom: 1px solid var(--surface3); white-space: nowrap; }
.data-table td { padding: 0.625rem 0.875rem; border-bottom: 1px solid var(--surface2); vertical-align: top; }
.data-table tr:last-child td { border-bottom: none; }

.provider-name-cell { font-weight: 500; }
.provider-desc { color: var(--muted); font-size: 0.8125rem; margin: 0.2rem 0 0; }
.slug-code { background: var(--surface2); padding: 0.1rem 0.4rem; border-radius: 0.25rem; font-size: 0.8125rem; color: var(--purple); }

.type-badge { font-size: 0.6875rem; padding: 0.1rem 0.45rem; border-radius: 999px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
.badge-payment { background: rgba(79,126,255,0.15); color: var(--accent); }
.badge-sms { background: rgba(155,110,255,0.15); color: var(--purple); }
.badge-whatsapp { background: rgba(54,211,153,0.18); color: var(--green); }

.status-active { color: var(--green); font-size: 0.875rem; }
.status-inactive { color: var(--muted); font-size: 0.875rem; }

.global-configs { display: flex; flex-wrap: wrap; gap: 0.375rem; align-items: center; }
.config-pill { background: var(--surface2); border: 1px solid var(--surface3); border-radius: 999px; padding: 0.1rem 0.5rem 0.1rem 0.625rem; font-size: 0.8125rem; display: flex; align-items: center; gap: 0.3rem; }
.pill-remove { background: none; border: none; color: var(--muted); cursor: pointer; padding: 0; line-height: 1; font-size: 0.75rem; }
.pill-remove:hover { color: var(--red); }

.row-actions { display: flex; gap: 0.375rem; }
.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: 0.375rem; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--surface3); border-radius: 0.375rem; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; }
.btn-ghost:hover { color: var(--text); border-color: var(--muted); }
.btn-danger { background: rgba(255,107,107,0.12); color: var(--red); border: 1px solid transparent; border-radius: 0.375rem; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; }
.btn-sm { padding: 0.25rem 0.625rem; font-size: 0.8125rem; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--surface); border: 1px solid var(--surface3); border-radius: 0.75rem; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--surface3); }
.modal-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
.modal-close { background: none; border: none; color: var(--muted); font-size: 1.125rem; cursor: pointer; }
.modal-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.modal-footer { padding: 1rem 1.25rem; border-top: 1px solid var(--surface3); display: flex; justify-content: flex-end; gap: 0.75rem; }

.form-group { display: flex; flex-direction: column; gap: 0.375rem; }
.form-label { font-size: 0.875rem; font-weight: 500; }
.required-star { color: var(--red); margin-left: 0.2rem; }
.form-input { background: var(--surface2); border: 1px solid var(--surface3); color: var(--text); border-radius: 0.375rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; }
.form-input:focus { outline: none; border-color: var(--accent); }
.schema-textarea { min-height: 120px; resize: vertical; font-family: monospace; font-size: 0.8125rem; }
.field-hint { color: var(--muted); font-size: 0.8125rem; margin: 0; }
.form-error { color: var(--red); font-size: 0.8125rem; }
.muted { color: var(--muted); font-size: 0.875rem; }
</style>
