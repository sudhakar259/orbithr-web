<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '@/services/api'

/* ── Types ── */
interface ModuleMeta {
  price?: number
  billing_type?: string
  icon?: string
  category?: string
  docs_url?: string
  [key: string]: unknown
}

interface Module {
  id: number
  parent_id: number | null
  name: string
  slug: string
  description: string | null
  is_core: boolean
  is_restricted: boolean
  meta: ModuleMeta | null
  children?: Module[]
  tenant_modules?: unknown[]
}

interface Stats {
  total_tenants: number
  active_tenants: number
  pending_tenants: number
  suspended_tenants: number
}

/* ── State ── */
const loading = ref(false)
const modules = ref<Module[]>([])
const allModules = ref<Module[]>([])
const selected = ref<Module | null>(null)
const stats = ref<Stats | null>(null)
const saving = ref(false)
const showPicker = ref(false)
const toast = ref<{ msg: string; type: 'ok' | 'err' } | null>(null)

/* ── Edit form ── */
const editName = ref('')
const editDesc = ref('')
const editPrice = ref<number | string>('')
const editBillingType = ref('recurring')

/* ── Computed ── */
const orphanModules = computed(() => {
  if (!selected.value) return []
  const parentId = selected.value.id
  const childIds = (selected.value.children ?? []).map((c) => c.id)
  return allModules.value.filter(
    (m) => m.parent_id === null && m.id !== parentId && !childIds.includes(m.id),
  )
})

function iconFor(mod: Module): string {
  if (mod.meta?.icon) return mod.meta.icon
  const map: Record<string, string> = {
    employee: '\u{1F465}',
    attendance: '\u{1F553}',
    leave: '\u{1F334}',
    payroll: '\u{1F4B0}',
    projects: '\u{1F4CB}',
    chat: '\u{1F4AC}',
    performance: '\u{1F4C8}',
  }
  return map[mod.slug] ?? '\u{1F9E9}'
}

/* ── API calls ── */
async function load() {
  loading.value = true
  try {
    const [parentRes, allRes] = await Promise.all([
      api.get('/admin/modules'),
      api.get('/admin/modules/all'),
    ])
    modules.value = Array.isArray(parentRes.data) ? parentRes.data : parentRes.data.data ?? []
    allModules.value = Array.isArray(allRes.data) ? allRes.data : allRes.data.data ?? []
  } finally {
    loading.value = false
  }
}

async function loadStats(moduleId: number) {
  try {
    const { data } = await api.get(`/admin/modules/${moduleId}/stats`)
    stats.value = data
  } catch {
    stats.value = null
  }
}

function selectModule(mod: Module) {
  selected.value = mod
  editName.value = mod.name
  editDesc.value = mod.description ?? ''
  editPrice.value = mod.meta?.price ?? ''
  editBillingType.value = mod.meta?.billing_type ?? 'recurring'
  showPicker.value = false
  loadStats(mod.id)
}

async function saveModule() {
  if (!selected.value) return
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      name: editName.value,
      description: editDesc.value,
      meta: {
        ...(selected.value.meta ?? {}),
        price: editPrice.value === '' ? null : Number(editPrice.value),
        billing_type: editBillingType.value,
      },
    }
    const { data } = await api.put(`/admin/modules/${selected.value.id}`, payload)
    Object.assign(selected.value, data)
    // Also refresh flat list name
    const flat = allModules.value.find((m) => m.id === selected.value!.id)
    if (flat) Object.assign(flat, data)
    showToast('Module saved', 'ok')
  } catch {
    showToast('Failed to save module', 'err')
  } finally {
    saving.value = false
  }
}

async function toggleCore() {
  if (!selected.value) return
  const endpoint = selected.value.is_core
    ? `/admin/modules/${selected.value.id}/unmark-core`
    : `/admin/modules/${selected.value.id}/mark-core`
  try {
    const { data } = await api.post(endpoint)
    selected.value.is_core = data.is_core
    const parent = modules.value.find((m) => m.id === selected.value!.id)
    if (parent) parent.is_core = data.is_core
    showToast(data.is_core ? 'Marked as core' : 'Unmarked as core', 'ok')
  } catch {
    showToast('Failed to toggle core flag', 'err')
  }
}

async function toggleRestricted() {
  if (!selected.value) return
  try {
    const { data } = await api.post(`/admin/modules/${selected.value.id}/toggle-restricted`)
    selected.value.is_restricted = data.is_restricted
    const parent = modules.value.find((m) => m.id === selected.value!.id)
    if (parent) parent.is_restricted = data.is_restricted
    showToast(data.is_restricted ? 'Now restricted' : 'Now unrestricted', 'ok')
  } catch {
    showToast('Failed to toggle restricted flag', 'err')
  }
}

async function detachChild(child: Module) {
  try {
    await api.put(`/admin/modules/${child.id}`, { parent_id: null })
    if (selected.value?.children) {
      selected.value.children = selected.value.children.filter((c) => c.id !== child.id)
    }
    // Add to orphan list
    child.parent_id = null
    if (!allModules.value.find((m) => m.id === child.id)) {
      allModules.value.push(child)
    } else {
      const flat = allModules.value.find((m) => m.id === child.id)
      if (flat) flat.parent_id = null
    }
    // Also add to parent modules list
    await load()
    // Re-select to refresh
    const refreshed = modules.value.find((m) => m.id === selected.value?.id)
    if (refreshed) selectModule(refreshed)
    showToast('Sub-module removed', 'ok')
  } catch {
    showToast('Failed to remove sub-module', 'err')
  }
}

async function attachChild(orphan: Module) {
  if (!selected.value) return
  try {
    await api.put(`/admin/modules/${orphan.id}`, { parent_id: selected.value.id })
    showPicker.value = false
    await load()
    const refreshed = modules.value.find((m) => m.id === selected.value?.id)
    if (refreshed) selectModule(refreshed)
    showToast('Sub-module added', 'ok')
  } catch {
    showToast('Failed to add sub-module', 'err')
  }
}

function showToast(msg: string, type: 'ok' | 'err') {
  toast.value = { msg, type }
  setTimeout(() => {
    toast.value = null
  }, 2500)
}

/* ── Lifecycle ── */
onMounted(load)

watch(
  () => selected.value?.id,
  () => {
    showPicker.value = false
  },
)
</script>

<template>
  <div class="mm-page">
    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast" :class="['mm-toast', toast.type]">{{ toast.msg }}</div>
    </Transition>

    <!-- Left: Module Grid -->
    <div class="mm-left">
      <h2 class="mm-title">Modules</h2>
      <p class="mm-subtitle">Manage parent modules, sub-modules, and flags</p>

      <div v-if="loading" class="mm-empty">Loading modules...</div>
      <div v-else-if="!modules.length" class="mm-empty">No modules found.</div>
      <div v-else class="mm-grid">
        <button
          v-for="mod in modules"
          :key="mod.id"
          :class="['mm-card', { 'mm-card--sel': selected?.id === mod.id }]"
          @click="selectModule(mod)"
        >
          <div class="mc-top">
            <span class="mc-icon">{{ iconFor(mod) }}</span>
            <span v-if="mod.is_core" class="mc-badge mc-badge--core">Core</span>
            <span v-if="mod.is_restricted" class="mc-badge mc-badge--restr">Restricted</span>
          </div>
          <div class="mc-name">{{ mod.name }}</div>
          <div class="mc-desc">{{ mod.description ?? 'No description' }}</div>
          <div class="mc-footer">
            <span class="mc-sub-count">{{
              (mod.children?.length ?? 0) + ' sub-module' + ((mod.children?.length ?? 0) !== 1 ? 's' : '')
            }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Right: Detail Panel -->
    <Transition name="panel">
      <div v-if="selected" class="mm-right">
        <div class="dp-header">
          <span class="dp-icon">{{ iconFor(selected) }}</span>
          <div class="dp-htext">
            <div class="dp-name">{{ selected.name }}</div>
            <div class="dp-slug">{{ selected.slug }}</div>
          </div>
          <button class="dp-close" @click="selected = null" title="Close">&times;</button>
        </div>

        <!-- Stats -->
        <div v-if="stats" class="dp-stats">
          <div class="ds-item">
            <div class="ds-val">{{ stats.active_tenants }}</div>
            <div class="ds-lbl">Active</div>
          </div>
          <div class="ds-item">
            <div class="ds-val ds-val--warn">{{ stats.pending_tenants }}</div>
            <div class="ds-lbl">Pending</div>
          </div>
          <div class="ds-item">
            <div class="ds-val ds-val--err">{{ stats.suspended_tenants }}</div>
            <div class="ds-lbl">Suspended</div>
          </div>
          <div class="ds-item">
            <div class="ds-val ds-val--muted">{{ stats.total_tenants }}</div>
            <div class="ds-lbl">Total</div>
          </div>
        </div>

        <!-- Flags -->
        <div class="dp-section">
          <div class="dp-sec-title">Flags</div>
          <div class="dp-flags">
            <label class="dp-toggle">
              <span class="dt-label">Core Module</span>
              <button
                :class="['dt-switch', { 'dt-switch--on': selected.is_core }]"
                @click="toggleCore"
              >
                <span class="dt-knob" />
              </button>
            </label>
            <label class="dp-toggle">
              <span class="dt-label">Super Admin Only</span>
              <button
                :class="['dt-switch', { 'dt-switch--on': selected.is_restricted }]"
                @click="toggleRestricted"
              >
                <span class="dt-knob" />
              </button>
            </label>
          </div>
        </div>

        <!-- Edit Form -->
        <div class="dp-section">
          <div class="dp-sec-title">Details</div>
          <div class="dp-form">
            <div class="df-group">
              <label class="df-label">Name</label>
              <input v-model="editName" class="df-input" />
            </div>
            <div class="df-group">
              <label class="df-label">Description</label>
              <textarea v-model="editDesc" class="df-input df-textarea" rows="3" />
            </div>
            <div class="df-row">
              <div class="df-group df-half">
                <label class="df-label">Price</label>
                <input v-model="editPrice" type="number" step="0.01" min="0" class="df-input" placeholder="0.00" />
              </div>
              <div class="df-group df-half">
                <label class="df-label">Billing Type</label>
                <select v-model="editBillingType" class="df-input">
                  <option value="recurring">Recurring</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
            </div>
            <button class="dp-save" :disabled="saving" @click="saveModule">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>

        <!-- Sub-modules -->
        <div class="dp-section">
          <div class="dp-sec-title">
            Sub-modules
            <span class="dp-sec-count">{{ selected.children?.length ?? 0 }}</span>
          </div>

          <div v-if="!selected.children?.length" class="dp-empty">No sub-modules attached.</div>

          <div v-else class="dp-children">
            <div v-for="child in selected.children" :key="child.id" class="dc-row">
              <span class="dc-icon">{{ iconFor(child) }}</span>
              <div class="dc-info">
                <div class="dc-name">{{ child.name }}</div>
                <div class="dc-slug">{{ child.slug }}</div>
              </div>
              <button class="dc-remove" @click="detachChild(child)" title="Remove sub-module">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div class="dc-add-wrap">
            <button class="dc-add-btn" @click="showPicker = !showPicker">
              {{ showPicker ? 'Cancel' : '+ Add Sub-module' }}
            </button>

            <Transition name="picker">
              <div v-if="showPicker" class="dc-picker">
                <div v-if="!orphanModules.length" class="dc-picker-empty">
                  No available modules to attach.
                </div>
                <button
                  v-for="orphan in orphanModules"
                  :key="orphan.id"
                  class="dc-picker-item"
                  @click="attachChild(orphan)"
                >
                  <span class="dc-icon">{{ iconFor(orphan) }}</span>
                  <div class="dc-info">
                    <div class="dc-name">{{ orphan.name }}</div>
                    <div class="dc-slug">{{ orphan.slug }}</div>
                  </div>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Placeholder when nothing selected -->
    <div v-if="!selected && !loading" class="mm-right mm-right--empty">
      <div class="mm-empty-panel">
        <div class="mep-icon">&#128450;</div>
        <div class="mep-text">Select a module to view details</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Variables ── */
:root {
  --bg: #070910;
  --surface: #0D0F1A;
  --surface2: #141720;
  --text: #E8EAF0;
  --muted: #6B7280;
  --accent: #4F7EFF;
  --green: #36D399;
  --red: #FF6B6B;
  --yellow: #F9A825;
  --purple: #9B6EFF;
  --border: rgba(79, 126, 255, 0.12);
}

/* ── Page layout ── */
.mm-page {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  min-height: calc(100vh - 80px);
  position: relative;
}

.mm-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mm-title {
  font-size: 20px;
  font-weight: 700;
  color: #E8EAF0;
  margin: 0;
}

.mm-subtitle {
  font-size: 13px;
  color: #6B7280;
  margin: -8px 0 0 0;
}

.mm-empty {
  padding: 48px;
  text-align: center;
  color: #6B7280;
  font-size: 13px;
}

/* ── Module Grid ── */
.mm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

.mm-card {
  background: #0D0F1A;
  border: 1px solid rgba(79, 126, 255, 0.12);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  text-align: left;
  color: inherit;
  font: inherit;
}

.mm-card:hover {
  border-color: rgba(79, 126, 255, 0.3);
  transform: translateY(-1px);
}

.mm-card--sel {
  border-color: #4F7EFF;
  box-shadow: 0 0 0 1px #4F7EFF, 0 4px 20px rgba(79, 126, 255, 0.15);
}

.mc-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mc-icon {
  font-size: 24px;
  line-height: 1;
}

.mc-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.mc-badge--core {
  background: rgba(54, 211, 153, 0.15);
  color: #36D399;
}

.mc-badge--restr {
  background: rgba(155, 110, 255, 0.15);
  color: #9B6EFF;
}

.mc-name {
  font-weight: 600;
  font-size: 14px;
  color: #E8EAF0;
}

.mc-desc {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mc-footer {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.mc-sub-count {
  font-size: 11px;
  color: #6B7280;
}

/* ── Detail Panel ── */
.mm-right {
  background: #0D0F1A;
  border: 1px solid rgba(79, 126, 255, 0.12);
  border-radius: 16px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  position: sticky;
  top: 20px;
}

.mm-right--empty {
  align-items: center;
  justify-content: center;
}

.mm-empty-panel {
  text-align: center;
}

.mep-icon {
  font-size: 40px;
  opacity: 0.3;
  margin-bottom: 12px;
}

.mep-text {
  font-size: 13px;
  color: #6B7280;
}

.dp-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dp-icon {
  font-size: 28px;
  line-height: 1;
}

.dp-htext {
  flex: 1;
  min-width: 0;
}

.dp-name {
  font-size: 16px;
  font-weight: 700;
  color: #E8EAF0;
}

.dp-slug {
  font-size: 11px;
  color: #6B7280;
  font-family: monospace;
}

.dp-close {
  background: none;
  border: none;
  color: #6B7280;
  font-size: 22px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
}

.dp-close:hover {
  color: #E8EAF0;
}

/* ── Stats ── */
.dp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #141720;
  border-radius: 10px;
  overflow: hidden;
}

.ds-item {
  padding: 10px 6px;
  text-align: center;
}

.ds-val {
  font-size: 18px;
  font-weight: 700;
  color: #36D399;
  line-height: 1;
}

.ds-val--warn {
  color: #F9A825;
}

.ds-val--err {
  color: #FF6B6B;
}

.ds-val--muted {
  color: #6B7280;
}

.ds-lbl {
  font-size: 10px;
  color: #6B7280;
  margin-top: 4px;
}

/* ── Sections ── */
.dp-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dp-sec-title {
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dp-sec-count {
  background: rgba(79, 126, 255, 0.15);
  color: #4F7EFF;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
}

/* ── Flags / Toggles ── */
.dp-flags {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dp-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #141720;
  border-radius: 10px;
}

.dt-label {
  font-size: 13px;
  color: #E8EAF0;
}

.dt-switch {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
  padding: 0;
}

.dt-switch--on {
  background: #4F7EFF;
}

.dt-knob {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #E8EAF0;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: transform 0.2s;
}

.dt-switch--on .dt-knob {
  transform: translateX(18px);
}

/* ── Edit Form ── */
.dp-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.df-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.df-label {
  font-size: 11px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.df-input {
  background: #141720;
  border: 1px solid rgba(79, 126, 255, 0.12);
  border-radius: 8px;
  padding: 8px 12px;
  color: #E8EAF0;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.df-input:focus {
  border-color: #4F7EFF;
}

.df-textarea {
  resize: vertical;
  min-height: 60px;
}

.df-row {
  display: flex;
  gap: 10px;
}

.df-half {
  flex: 1;
}

select.df-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

select.df-input option {
  background: #141720;
  color: #E8EAF0;
}

.dp-save {
  background: #4F7EFF;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  margin-top: 4px;
}

.dp-save:hover {
  opacity: 0.9;
}

.dp-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Sub-module List ── */
.dp-empty {
  font-size: 12px;
  color: #6B7280;
  padding: 8px 0;
}

.dp-children {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #141720;
  border-radius: 10px;
  transition: background 0.15s;
}

.dc-row:hover {
  background: #1C2030;
}

.dc-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.dc-info {
  flex: 1;
  min-width: 0;
}

.dc-name {
  font-size: 13px;
  font-weight: 500;
  color: #E8EAF0;
}

.dc-slug {
  font-size: 10px;
  color: #6B7280;
  font-family: monospace;
}

.dc-remove {
  background: none;
  border: none;
  color: #6B7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.dc-remove:hover {
  color: #FF6B6B;
  background: rgba(255, 107, 107, 0.1);
}

/* ── Add Sub-module ── */
.dc-add-wrap {
  position: relative;
}

.dc-add-btn {
  background: rgba(79, 126, 255, 0.1);
  color: #4F7EFF;
  border: 1px dashed rgba(79, 126, 255, 0.3);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s;
}

.dc-add-btn:hover {
  background: rgba(79, 126, 255, 0.18);
}

.dc-picker {
  margin-top: 8px;
  background: #141720;
  border: 1px solid rgba(79, 126, 255, 0.2);
  border-radius: 10px;
  max-height: 200px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.dc-picker-empty {
  padding: 16px;
  text-align: center;
  font-size: 12px;
  color: #6B7280;
}

.dc-picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.dc-picker-item:last-child {
  border-bottom: none;
}

.dc-picker-item:hover {
  background: rgba(79, 126, 255, 0.08);
}

/* ── Toast ── */
.mm-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  z-index: 9999;
  pointer-events: none;
}

.mm-toast.ok {
  background: rgba(54, 211, 153, 0.15);
  color: #36D399;
  border: 1px solid rgba(54, 211, 153, 0.3);
}

.mm-toast.err {
  background: rgba(255, 107, 107, 0.15);
  color: #FF6B6B;
  border: 1px solid rgba(255, 107, 107, 0.3);
}

/* ── Transitions ── */
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.panel-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.panel-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

.picker-enter-active,
.picker-leave-active {
  transition: opacity 0.15s, max-height 0.2s;
}

.picker-enter-from,
.picker-leave-to {
  opacity: 0;
  max-height: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Scrollbar ── */
.mm-right::-webkit-scrollbar {
  width: 4px;
}

.mm-right::-webkit-scrollbar-track {
  background: transparent;
}

.mm-right::-webkit-scrollbar-thumb {
  background: rgba(79, 126, 255, 0.2);
  border-radius: 2px;
}

.dc-picker::-webkit-scrollbar {
  width: 4px;
}

.dc-picker::-webkit-scrollbar-thumb {
  background: rgba(79, 126, 255, 0.2);
  border-radius: 2px;
}
</style>
