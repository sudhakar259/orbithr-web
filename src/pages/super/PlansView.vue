<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const loading = ref(false)
const formLoading = ref(false)
const plans = ref<any[]>([])
const availableModules = ref<any[]>([])
const featureTemplates = ref<any[]>([])

// Panel state
const activePlan = ref<any>(null)
const activeTab = ref<'details' | 'modules' | 'features'>('details')
const showCreateModal = ref(false)

// Edit form
const form = ref({
  name: '', description: '', price: 0, duration: 1,
  durationtype: 'month', billing_cycle: 'monthly',
  trial_days: 0, max_users: 10, is_active: true, is_popular: false,
  stripe_price_id: '', stripe_product_id: '',
})

// Module selections for the active plan
const selectedModules = ref<number[]>([])

// Feature editing
const features = ref<any[]>([])
const featureLoading = ref(false)

// Create form
const createForm = ref({
  name: '', description: '', price: 0, duration: 1,
  durationtype: 'month', billing_cycle: 'monthly',
  trial_days: 0, max_users: 10, is_active: true, is_popular: false,
})

const totalTenants = computed(() =>
  plans.value.reduce((sum, p) => sum + (p.subscriptions_count ?? 0), 0)
)

onMounted(async () => {
  await Promise.all([fetchPlans(), fetchAvailableModules(), fetchFeatureTemplates()])
  if (plans.value.length > 0) openPlan(plans.value[0])
})

async function fetchPlans() {
  loading.value = true
  try {
    const res = await api.get('/admin/plans', { params: { per_page: 100 } })
    plans.value = res.data.data ?? res.data
  } catch (e) {
    console.error('Failed to fetch plans', e)
  } finally {
    loading.value = false
  }
}

async function fetchAvailableModules() {
  try {
    const res = await api.get('/admin/plans/modules/available')
    availableModules.value = res.data ?? []
  } catch (e) { console.error(e) }
}

async function fetchFeatureTemplates() {
  try {
    const res = await api.get('/admin/plans/features/template')
    featureTemplates.value = res.data ?? []
  } catch (e) { console.error(e) }
}

async function fetchPlanDetail(planId: number) {
  try {
    const res = await api.get(`/admin/plans/${planId}`)
    const data = res.data
    const plan = data.plan ?? data
    // Merge fresh detail back into list
    const idx = plans.value.findIndex(p => p.id === planId)
    if (idx > -1) plans.value[idx] = plan
    return plan
  } catch (e) { console.error(e) }
}

async function openPlan(plan: any) {
  activePlan.value = null
  activeTab.value = 'details'
  const detail = await fetchPlanDetail(plan.id)
  activePlan.value = detail ?? plan
  form.value = {
    name: activePlan.value.name,
    description: activePlan.value.description ?? '',
    price: activePlan.value.price,
    duration: activePlan.value.duration,
    durationtype: activePlan.value.durationtype,
    billing_cycle: activePlan.value.billing_cycle,
    trial_days: activePlan.value.trial_days ?? 0,
    max_users: activePlan.value.max_users,
    is_active: activePlan.value.is_active,
    is_popular: activePlan.value.is_popular,
    stripe_price_id: activePlan.value.stripe_price_id ?? '',
    stripe_product_id: activePlan.value.stripe_product_id ?? '',
  }
  selectedModules.value = (activePlan.value.plan_modules ?? []).map((pm: any) => pm.module_id)
  features.value = (activePlan.value.features ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    value: f.value,
    description: f.description ?? '',
    is_active: f.is_active ?? true,
    _editing: false,
  }))
}

async function saveDetails() {
  formLoading.value = true
  try {
    const res = await api.put(`/admin/plans/${activePlan.value.id}`, form.value)
    const updated = res.data.plan ?? res.data
    activePlan.value = { ...activePlan.value, ...updated }
    const idx = plans.value.findIndex(p => p.id === activePlan.value.id)
    if (idx > -1) plans.value[idx] = { ...plans.value[idx], ...updated }
  } catch (e: any) {
    alert(e?.response?.data?.message ?? 'Failed to save plan')
  } finally {
    formLoading.value = false
  }
}

// --- Modules tab ---
function toggleModule(moduleId: number) {
  const idx = selectedModules.value.indexOf(moduleId)
  if (idx > -1) selectedModules.value.splice(idx, 1)
  else selectedModules.value.push(moduleId)
}

async function saveModules() {
  formLoading.value = true
  try {
    const current = (activePlan.value.plan_modules ?? []).map((pm: any) => pm.module_id)
    const toAdd = selectedModules.value.filter((id: number) => !current.includes(id))
    const toRemove = current.filter((id: number) => !selectedModules.value.includes(id))
    await Promise.all([
      ...toAdd.map((id: number) =>
        api.post(`/admin/plans/${activePlan.value.id}/modules`, { module_id: id, is_included: true }).catch(() => {})
      ),
      ...toRemove.map((id: number) =>
        api.delete(`/admin/plans/${activePlan.value.id}/modules/${id}`).catch(() => {})
      ),
    ])
    const detail = await fetchPlanDetail(activePlan.value.id)
    if (detail) {
      activePlan.value = detail
      selectedModules.value = (detail.plan_modules ?? []).map((pm: any) => pm.module_id)
    }
  } catch (e) {
    alert('Failed to save modules')
  } finally {
    formLoading.value = false
  }
}

// --- Features tab ---
function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function addFeatureRow() {
  features.value.push({ id: null, name: '', slug: '', value: '', description: '', is_active: true, _editing: true })
}

function addFromTemplate(tpl: any) {
  if (!features.value.find(f => f.slug === tpl.slug)) {
    features.value.push({ id: null, name: tpl.name, slug: tpl.slug, value: tpl.value, description: tpl.description ?? '', is_active: true, _editing: true })
  }
}

async function saveFeature(feature: any) {
  if (!feature.name || !feature.value) return
  if (!feature.slug) feature.slug = slugify(feature.name)
  featureLoading.value = true
  try {
    if (feature.id) {
      const res = await api.put(`/admin/plans/${activePlan.value.id}/features/${feature.id}`, {
        name: feature.name, value: feature.value, description: feature.description, is_active: feature.is_active,
      })
      Object.assign(feature, res.data.feature ?? {}, { _editing: false })
    } else {
      const res = await api.post(`/admin/plans/${activePlan.value.id}/features`, {
        name: feature.name, slug: feature.slug, value: feature.value, description: feature.description, is_active: feature.is_active,
      })
      Object.assign(feature, res.data.feature ?? {}, { _editing: false })
    }
  } catch (e: any) {
    alert(e?.response?.data?.message ?? 'Failed to save feature')
  } finally {
    featureLoading.value = false
  }
}

async function deleteFeature(feature: any, idx: number) {
  if (!feature.id) { features.value.splice(idx, 1); return }
  if (!confirm(`Delete feature "${feature.name}"?`)) return
  featureLoading.value = true
  try {
    await api.delete(`/admin/plans/${activePlan.value.id}/features/${feature.id}`)
    features.value.splice(idx, 1)
  } catch (e) {
    alert('Failed to delete feature')
  } finally {
    featureLoading.value = false
  }
}

async function createPlan() {
  formLoading.value = true
  try {
    const res = await api.post('/admin/plans', createForm.value)
    showCreateModal.value = false
    await fetchPlans()
    if (res.data.plan) openPlan(res.data.plan)
    createForm.value = { name: '', description: '', price: 0, duration: 1, durationtype: 'month', billing_cycle: 'monthly', trial_days: 0, max_users: 10, is_active: true, is_popular: false }
  } catch (e: any) {
    alert(e?.response?.data?.message ?? 'Failed to create plan')
  } finally {
    formLoading.value = false
  }
}

async function deletePlan(planId: number) {
  if (!confirm('Delete this plan? This cannot be undone.')) return
  try {
    await api.delete(`/admin/plans/${planId}`)
    if (activePlan.value?.id === planId) activePlan.value = null
    await fetchPlans()
  } catch (e: any) {
    alert(e?.response?.data?.message ?? 'Failed to delete plan')
  }
}
</script>

<template>
  <div class="plans-root">
    <!-- Left: plan list -->
    <div class="plans-sidebar">
      <div class="sidebar-head">
        <div>
          <div class="sidebar-title">Plans</div>
          <div class="sidebar-sub">{{ plans.length }} plans</div>
        </div>
        <button class="btn-icon-add" @click="showCreateModal = true" title="New Plan">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>

      <div v-if="loading" class="plan-list-empty">Loading…</div>
      <div v-else-if="plans.length === 0" class="plan-list-empty">No plans yet.</div>
      <div v-else class="plan-list">
        <button
          v-for="plan in plans"
          :key="plan.id"
          class="plan-item"
          :class="{ active: activePlan?.id === plan.id }"
          @click="openPlan(plan)"
        >
          <div class="plan-item-top">
            <span class="plan-item-name">{{ plan.name }}</span>
            <span class="pill" :class="plan.is_active ? 'green' : 'gray'">{{ plan.is_active ? 'Active' : 'Off' }}</span>
          </div>
          <div class="plan-item-meta">
            <span>₹{{ Number(plan.price).toLocaleString() }} / {{ plan.billing_cycle }}</span>
            <span>{{ plan.plan_modules?.length ?? 0 }} modules</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Right: detail panel -->
    <div v-if="activePlan" class="plan-detail">
      <!-- Detail header -->
      <div class="detail-header">
        <div>
          <div class="detail-title">{{ activePlan.name }}</div>
          <div class="detail-sub">₹{{ Number(activePlan.price).toLocaleString() }} / {{ activePlan.billing_cycle }}</div>
        </div>
        <div class="detail-header-actions">
          <button class="btn-danger-sm" @click="deletePlan(activePlan.id)">Delete</button>
          <button class="btn-close-detail" @click="activePlan = null">✕</button>
        </div>
      </div>

      <!-- Detail tabs -->
      <div class="detail-tabs">
        <button class="dtab" :class="{ active: activeTab === 'details' }" @click="activeTab = 'details'">Details</button>
        <button class="dtab" :class="{ active: activeTab === 'modules' }" @click="activeTab = 'modules'">Modules</button>
        <button class="dtab" :class="{ active: activeTab === 'features' }" @click="activeTab = 'features'">Features</button>
      </div>

      <div class="detail-body">
        <!-- ---- Details tab ---- -->
        <div v-if="activeTab === 'details'" class="detail-tab-content">
          <div class="form-row2">
            <div class="form-group">
              <label>Plan Name</label>
              <input v-model="form.name" type="text" />
            </div>
            <div class="form-group">
              <label>Price (₹)</label>
              <input v-model.number="form.price" type="number" step="0.01" min="0" />
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="form.description" rows="3" placeholder="Describe the plan"></textarea>
          </div>
          <div class="form-row2">
            <div class="form-group">
              <label>Max Users <span class="hint">(-1 = unlimited)</span></label>
              <input v-model.number="form.max_users" type="number" />
            </div>
            <div class="form-group">
              <label>Trial Days</label>
              <input v-model.number="form.trial_days" type="number" min="0" />
            </div>
          </div>
          <div class="form-row2">
            <div class="form-group">
              <label>Duration</label>
              <div class="input-pair">
                <input v-model.number="form.duration" type="number" min="1" style="flex:1" />
                <select v-model="form.durationtype">
                  <option value="day">Days</option>
                  <option value="month">Months</option>
                  <option value="year">Years</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Billing Cycle</label>
              <select v-model="form.billing_cycle">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-time</option>
              </select>
            </div>
          </div>
          <div class="form-row2">
            <div class="form-group">
              <label>Stripe Price ID</label>
              <input v-model="form.stripe_price_id" type="text" placeholder="price_…" />
            </div>
            <div class="form-group">
              <label>Stripe Product ID</label>
              <input v-model="form.stripe_product_id" type="text" placeholder="prod_…" />
            </div>
          </div>
          <div class="form-checks">
            <label class="check-label">
              <input v-model="form.is_active" type="checkbox" />
              <span>Active (visible to tenants)</span>
            </label>
            <label class="check-label">
              <input v-model="form.is_popular" type="checkbox" />
              <span>Mark as Most Popular</span>
            </label>
          </div>

          <div class="detail-footer">
            <button class="btn-primary" :disabled="formLoading" @click="saveDetails">
              {{ formLoading ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>

        <!-- ---- Modules tab ---- -->
        <div v-else-if="activeTab === 'modules'" class="detail-tab-content">
          <div class="section-desc">Select which modules are included in this plan.</div>
          <div v-if="availableModules.length === 0" class="empty-hint">No modules available</div>
          <div v-else class="module-check-list">
            <label
              v-for="mod in availableModules"
              :key="mod.id"
              class="module-check-item"
              :class="{ selected: selectedModules.includes(mod.id) }"
            >
              <input type="checkbox" :checked="selectedModules.includes(mod.id)" @change="toggleModule(mod.id)" />
              <div class="mod-info">
                <span class="mod-name">{{ mod.name }}</span>
                <span v-if="mod.is_core" class="pill green" style="font-size:10px">Core</span>
              </div>
            </label>
          </div>

          <div class="detail-footer">
            <button class="btn-primary" :disabled="formLoading" @click="saveModules">
              {{ formLoading ? 'Saving…' : 'Save Modules' }}
            </button>
          </div>
        </div>

        <!-- ---- Features tab ---- -->
        <div v-else-if="activeTab === 'features'" class="detail-tab-content">
          <!-- Quick-add from templates -->
          <div v-if="featureTemplates.length" class="tpl-row">
            <span class="tpl-label">Add from template:</span>
            <button
              v-for="tpl in featureTemplates"
              :key="tpl.slug"
              class="tpl-btn"
              :class="{ used: features.find(f => f.slug === tpl.slug) }"
              @click="addFromTemplate(tpl)"
            >{{ tpl.name }}</button>
          </div>

          <!-- Features list -->
          <div class="feature-list">
            <div v-if="features.length === 0" class="empty-hint">No features yet. Add one below.</div>
            <div v-for="(feature, idx) in features" :key="idx" class="feature-row">
              <div v-if="!feature._editing" class="feature-view">
                <div class="feature-view-main">
                  <span class="feature-name">{{ feature.name }}</span>
                  <code class="code-pill">{{ feature.slug }}</code>
                  <span class="feature-value">{{ feature.value }}</span>
                  <span v-if="feature.description" class="feature-desc">{{ feature.description }}</span>
                </div>
                <div class="feature-view-actions">
                  <span v-if="!feature.is_active" class="pill gray" style="font-size:10px">Off</span>
                  <button class="icon-btn" @click="feature._editing = true" title="Edit">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="icon-btn red" @click="deleteFeature(feature, idx)" title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                  </button>
                </div>
              </div>
              <div v-else class="feature-edit">
                <div class="form-row3">
                  <div class="form-group">
                    <label>Name</label>
                    <input v-model="feature.name" type="text" placeholder="e.g. Max Users" @input="() => { if (!feature.id) feature.slug = slugify(feature.name) }" />
                  </div>
                  <div class="form-group">
                    <label>Slug</label>
                    <input v-model="feature.slug" type="text" placeholder="max_users" />
                  </div>
                  <div class="form-group">
                    <label>Value</label>
                    <input v-model="feature.value" type="text" placeholder="10" />
                  </div>
                </div>
                <div class="form-row2">
                  <div class="form-group">
                    <label>Description <span class="hint">(optional)</span></label>
                    <input v-model="feature.description" type="text" placeholder="Short description" />
                  </div>
                  <div class="form-group" style="justify-content:flex-end">
                    <label class="check-label" style="margin-top:18px">
                      <input v-model="feature.is_active" type="checkbox" />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
                <div class="feature-edit-foot">
                  <button class="btn-ghost-sm" @click="feature.id ? (feature._editing = false) : features.splice(idx, 1)">Cancel</button>
                  <button class="btn-primary-sm" :disabled="featureLoading" @click="saveFeature(feature)">
                    {{ featureLoading ? '…' : 'Save' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button class="add-feature-btn" @click="addFeatureRow">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 4v16m8-8H4"/></svg>
            Add Feature
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="plan-detail plan-detail-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      <p>Select a plan to view and edit its details</p>
    </div>
  </div>

  <!-- Create Plan Modal -->
  <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">New Plan</div>
        <button class="modal-close" @click="showCreateModal = false">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row2">
          <div class="form-group">
            <label>Plan Name</label>
            <input v-model="createForm.name" type="text" placeholder="e.g. Starter, Growth" />
          </div>
          <div class="form-group">
            <label>Price (₹)</label>
            <input v-model.number="createForm.price" type="number" placeholder="0.00" step="0.01" />
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="createForm.description" rows="2" placeholder="Describe the plan"></textarea>
        </div>
        <div class="form-row2">
          <div class="form-group">
            <label>Max Users <span class="hint">(-1 = unlimited)</span></label>
            <input v-model.number="createForm.max_users" type="number" placeholder="10" />
          </div>
          <div class="form-group">
            <label>Trial Days</label>
            <input v-model.number="createForm.trial_days" type="number" placeholder="0" />
          </div>
        </div>
        <div class="form-row2">
          <div class="form-group">
            <label>Duration</label>
            <div class="input-pair">
              <input v-model.number="createForm.duration" type="number" min="1" style="flex:1" />
              <select v-model="createForm.durationtype">
                <option value="day">Days</option>
                <option value="month">Months</option>
                <option value="year">Years</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Billing Cycle</label>
            <select v-model="createForm.billing_cycle">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one-time">One-time</option>
            </select>
          </div>
        </div>
        <div class="form-checks">
          <label class="check-label">
            <input v-model="createForm.is_active" type="checkbox" />
            <span>Active Plan</span>
          </label>
          <label class="check-label">
            <input v-model="createForm.is_popular" type="checkbox" />
            <span>Mark as Most Popular</span>
          </label>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn-ghost" @click="showCreateModal = false">Cancel</button>
        <button class="btn-primary" :disabled="formLoading" @click="createPlan">
          {{ formLoading ? 'Creating…' : 'Create Plan' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Layout */
.plans-root { display: flex; gap: 0; height: 100%; min-height: 500px; }

/* Sidebar */
.plans-sidebar {
  width: 260px; flex-shrink: 0;
  border-right: 1px solid rgba(255,255,255,.07);
  display: flex; flex-direction: column; overflow: hidden;
}
.sidebar-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.sidebar-title { font-size: 14px; font-weight: 700; color: #E8EAF0; }
.sidebar-sub { font-size: 11px; color: #6B7280; margin-top: 2px; }
.btn-icon-add {
  width: 28px; height: 28px; display: grid; place-items: center;
  background: rgba(79,126,255,.15); border: 1px solid rgba(79,126,255,.3);
  border-radius: 7px; color: #4F7EFF; cursor: pointer;
}
.btn-icon-add:hover { background: rgba(79,126,255,.25); }

.plan-list { flex: 1; overflow-y: auto; padding: 8px; }
.plan-list-empty { padding: 24px; text-align: center; font-size: 12px; color: #6B7280; }

.plan-item {
  width: 100%; text-align: left; background: none;
  border: 1px solid transparent; border-radius: 10px;
  padding: 10px 12px; cursor: pointer; transition: all .14s;
  display: flex; flex-direction: column; gap: 5px; margin-bottom: 4px;
}
.plan-item:hover { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.07); }
.plan-item.active { background: rgba(79,126,255,.1); border-color: rgba(79,126,255,.3); }
.plan-item-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.plan-item-name { font-size: 13px; font-weight: 600; color: #E8EAF0; }
.plan-item-meta { font-size: 11px; color: #6B7280; display: flex; gap: 10px; }

/* Detail panel */
.plan-detail {
  flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;
}
.plan-detail-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: #374151; font-size: 13px;
}

.detail-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.07); flex-shrink: 0;
}
.detail-title { font-size: 17px; font-weight: 700; color: #E8EAF0; }
.detail-sub { font-size: 12px; color: #6B7280; margin-top: 2px; }
.detail-header-actions { display: flex; align-items: center; gap: 8px; }
.btn-danger-sm {
  padding: 5px 12px; font-size: 12px; font-weight: 500;
  background: rgba(255,107,107,.12); border: 1px solid rgba(255,107,107,.2);
  border-radius: 7px; color: #FF6B6B; cursor: pointer; transition: all .14s;
}
.btn-danger-sm:hover { background: rgba(255,107,107,.2); }
.btn-close-detail {
  width: 28px; height: 28px; display: grid; place-items: center;
  background: none; border: none; color: #6B7280; cursor: pointer; font-size: 15px;
}
.btn-close-detail:hover { color: #E8EAF0; }

.detail-tabs {
  display: flex; border-bottom: 1px solid rgba(255,255,255,.06);
  padding: 0 20px; flex-shrink: 0;
}
.dtab {
  padding: 10px 14px; font-size: 13px; font-weight: 500; color: #6B7280;
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: all .14s; margin-bottom: -1px;
}
.dtab:hover { color: #9CA3AF; }
.dtab.active { color: #4F7EFF; border-bottom-color: #4F7EFF; }

.detail-body { flex: 1; overflow-y: auto; }
.detail-tab-content { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.detail-footer { display: flex; justify-content: flex-end; padding-top: 8px; border-top: 1px solid rgba(255,255,255,.06); }

.section-desc { font-size: 12px; color: #6B7280; }
.empty-hint { font-size: 13px; color: #4B5563; text-align: center; padding: 20px; }

/* Module checklist */
.module-check-list { display: flex; flex-direction: column; gap: 6px; }
.module-check-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border: 1px solid rgba(255,255,255,.07); border-radius: 9px;
  cursor: pointer; transition: all .14s; background: rgba(255,255,255,.02);
}
.module-check-item:hover { background: rgba(255,255,255,.04); }
.module-check-item.selected { background: rgba(79,126,255,.07); border-color: rgba(79,126,255,.25); }
.module-check-item input[type="checkbox"] { accent-color: #4F7EFF; width: 14px; height: 14px; cursor: pointer; }
.mod-info { display: flex; align-items: center; gap: 8px; }
.mod-name { font-size: 13px; color: #E8EAF0; }

/* Templates row */
.tpl-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tpl-label { font-size: 11px; color: #6B7280; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; white-space: nowrap; }
.tpl-btn {
  padding: 4px 10px; font-size: 11px; background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1); border-radius: 20px; color: #9CA3AF; cursor: pointer; transition: all .14s;
}
.tpl-btn:hover { background: rgba(79,126,255,.15); color: #4F7EFF; border-color: rgba(79,126,255,.3); }
.tpl-btn.used { opacity: .4; cursor: default; }

/* Features */
.feature-list { display: flex; flex-direction: column; gap: 6px; }
.feature-row { border: 1px solid rgba(255,255,255,.07); border-radius: 9px; overflow: hidden; }

.feature-view { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; }
.feature-view-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.feature-name { font-size: 13px; font-weight: 600; color: #E8EAF0; }
.feature-value { font-size: 13px; color: #36D399; font-weight: 500; }
.feature-desc { font-size: 11px; color: #6B7280; }
.feature-view-actions { display: flex; gap: 4px; flex-shrink: 0; }

.feature-edit { padding: 14px; display: flex; flex-direction: column; gap: 12px; background: rgba(79,126,255,.04); }
.feature-edit-foot { display: flex; justify-content: flex-end; gap: 8px; }

.add-feature-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: none;
  border: 1px dashed rgba(79,126,255,.3); border-radius: 8px;
  color: #4F7EFF; font-size: 12px; font-weight: 500; cursor: pointer; transition: all .14s;
  align-self: flex-start;
}
.add-feature-btn:hover { background: rgba(79,126,255,.08); border-style: solid; }

/* Pills */
.pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.pill.green { color: #36D399; background: rgba(54,211,153,.12); }
.pill.gray { color: #9CA3AF; background: rgba(255,255,255,.07); }

/* Forms */
.form-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: .5px; }
.hint { font-weight: 400; color: #6B7280; text-transform: none; letter-spacing: 0; }
.form-group input, .form-group textarea, .form-group select {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 8px 12px; color: #E8EAF0; font-size: 13px;
  font-family: inherit; outline: none; transition: border-color .14s;
}
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: rgba(79,126,255,.5); background: rgba(79,126,255,.05); }
.form-group input::placeholder, .form-group textarea::placeholder { color: #374151; }
.form-group select option { background: #0D0F1A; }
.input-pair { display: flex; gap: 8px; }
.form-checks { display: flex; flex-direction: column; gap: 10px; }
.check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #9CA3AF; }
.check-label input[type="checkbox"] { width: 14px; height: 14px; accent-color: #4F7EFF; cursor: pointer; }

/* Buttons */
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px;
  background: #4F7EFF; color: #fff; border: none; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: background .14s;
}
.btn-primary:hover { background: #3d6de8; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary-sm { padding: 5px 12px; background: #4F7EFF; color: #fff; border: none; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn-primary-sm:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { padding: 8px 16px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; color: #9CA3AF; font-size: 13px; cursor: pointer; }
.btn-ghost:hover { background: rgba(255,255,255,.1); }
.btn-ghost-sm { padding: 5px 10px; background: none; border: 1px solid rgba(255,255,255,.1); border-radius: 7px; color: #9CA3AF; font-size: 12px; cursor: pointer; }
.icon-btn { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); border-radius: 6px; padding: 5px; color: #9CA3AF; cursor: pointer; display: grid; place-items: center; }
.icon-btn:hover { background: rgba(79,126,255,.15); color: #4F7EFF; }
.icon-btn.red:hover { background: rgba(255,107,107,.15); color: #FF6B6B; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 200; }
.modal { background: #0D0F1A; border: 1px solid rgba(255,255,255,.1); border-radius: 16px; width: 100%; max-width: 560px; max-height: 90vh; display: flex; flex-direction: column; margin: 16px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.07); flex-shrink: 0; }
.modal-title { font-weight: 600; font-size: 15px; color: #E8EAF0; }
.modal-close { background: none; border: none; color: #6B7280; font-size: 16px; cursor: pointer; }
.modal-close:hover { color: #FF6B6B; }
.modal-body { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid rgba(255,255,255,.07); flex-shrink: 0; }

.code-pill { background: rgba(255,255,255,.07); color: #9B6EFF; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-family: monospace; }
</style>
