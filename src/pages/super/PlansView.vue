<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const activeTab = ref<'plans' | 'features'>('plans')
const loading = ref(false)
const formLoading = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showModulesModal = ref(false)

const plans = ref<any[]>([])
const availableModules = ref<any[]>([])
const featureTemplates = ref<any[]>([])
const selectedPlan = ref<any>(null)
const selectedModules = ref<number[]>([])
const planFeatures = ref<any[]>([])

const form = ref({
  name: '',
  description: '',
  price: 0,
  duration: 1,
  durationtype: 'month',
  billing_cycle: 'monthly',
  trial_days: 0,
  max_users: 10,
  is_active: true,
  is_popular: false,
})

onMounted(async () => {
  await fetchPlans()
  await fetchFeatureTemplate()
})

async function fetchPlans() {
  loading.value = true
  try {
    const res = await api.get('/admin/plans')
    plans.value = res.data.data || res.data
  } catch (e) {
    console.error('Failed to fetch plans', e)
  } finally {
    loading.value = false
  }
}

async function fetchFeatureTemplate() {
  try {
    const res = await api.get('/admin/plans/features/template')
    featureTemplates.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch feature template', e)
  }
}

async function fetchAvailableModules() {
  try {
    const res = await api.get('/admin/plans/modules/available')
    availableModules.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch available modules', e)
  }
}

function editPlan(plan: any) {
  selectedPlan.value = plan
  form.value = {
    name: plan.name,
    description: plan.description,
    price: plan.price,
    duration: plan.duration,
    durationtype: plan.durationtype,
    billing_cycle: plan.billing_cycle,
    trial_days: plan.trial_days,
    max_users: plan.max_users,
    is_active: plan.is_active,
    is_popular: plan.is_popular,
  }
  showEditModal.value = true
}

async function savePlan() {
  formLoading.value = true
  try {
    const url = showEditModal.value ? `/admin/plans/${selectedPlan.value.id}` : '/admin/plans'
    if (showEditModal.value) {
      await api.put(url, form.value)
    } else {
      await api.post(url, form.value)
    }
    closeModals()
    await fetchPlans()
  } catch (e) {
    console.error('Failed to save plan', e)
    alert('Failed to save plan')
  } finally {
    formLoading.value = false
  }
}

async function deletePlan(planId: number) {
  if (!confirm('Are you sure you want to delete this plan?')) return
  try {
    await api.delete(`/admin/plans/${planId}`)
    await fetchPlans()
  } catch (e) {
    console.error('Failed to delete plan', e)
    alert('Failed to delete plan')
  }
}

async function managePlanModules(plan: any) {
  selectedPlan.value = plan
  // planModules is the HasMany relation; each entry has module_id
  selectedModules.value = plan.plan_modules?.map((pm: any) => pm.module_id) || []
  planFeatures.value = plan.features?.map((f: any) => ({ name: f.name, value: f.value })) || []
  await fetchAvailableModules()
  showModulesModal.value = true
}

function toggleModule(moduleId: number) {
  const idx = selectedModules.value.indexOf(moduleId)
  if (idx > -1) {
    selectedModules.value.splice(idx, 1)
  } else {
    selectedModules.value.push(moduleId)
  }
}

async function saveModules() {
  formLoading.value = true
  try {
    for (const moduleId of selectedModules.value) {
      await api.post(`/admin/plans/${selectedPlan.value.id}/modules`, { module_id: moduleId, is_included: true }).catch(() => {})
    }
    const currentModules = selectedPlan.value.plan_modules?.map((pm: any) => pm.module_id) || []
    for (const moduleId of currentModules) {
      if (!selectedModules.value.includes(moduleId)) {
        await api.delete(`/admin/plans/${selectedPlan.value.id}/modules/${moduleId}`).catch(() => {})
      }
    }
    showModulesModal.value = false
    await fetchPlans()
  } catch (e) {
    console.error('Failed to save modules', e)
    alert('Failed to save modules')
  } finally {
    formLoading.value = false
  }
}

function closeModals() {
  showCreateModal.value = false
  showEditModal.value = false
  showModulesModal.value = false
  form.value = { name: '', description: '', price: 0, duration: 1, durationtype: 'month', billing_cycle: 'monthly', trial_days: 0, max_users: 10, is_active: true, is_popular: false }
  selectedPlan.value = null
  selectedModules.value = []
  planFeatures.value = []
}
</script>

<template>
  <div class="plans-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title">Plans & Pricing</div>
        <div class="page-sub">Create and manage subscription plans for tenants</div>
      </div>
      <button class="btn-primary" @click="showCreateModal = true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 4v16m8-8H4"/></svg>
        New Plan
      </button>
    </div>

    <!-- Tabs -->
    <div class="tab-row">
      <button class="tab-btn" :class="{ active: activeTab === 'plans' }" @click="activeTab = 'plans'">Plans</button>
      <button class="tab-btn" :class="{ active: activeTab === 'features' }" @click="activeTab = 'features'">Feature Templates</button>
    </div>

    <!-- Plans Tab -->
    <div v-if="activeTab === 'plans'">
      <div v-if="loading" class="sa-empty">Loading plans…</div>
      <div v-else-if="plans.length === 0" class="sa-empty">No plans yet. Create your first plan.</div>
      <div v-else class="plans-grid">
        <div v-for="plan in plans" :key="plan.id" class="plan-card">
          <div class="plan-card-top">
            <div>
              <div class="plan-name">{{ plan.name }}</div>
              <div v-if="plan.description" class="plan-desc">{{ plan.description }}</div>
            </div>
            <div class="plan-actions">
              <button class="icon-btn" title="Edit" @click="editPlan(plan)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="icon-btn red" title="Delete" @click="deletePlan(plan.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              </button>
            </div>
          </div>

          <div class="plan-price-row">
            <span class="plan-price">₹{{ Number(plan.price).toLocaleString() }}</span>
            <span class="plan-cycle">/ {{ plan.billing_cycle }}</span>
          </div>

          <div class="plan-meta">
            <div><span class="meta-key">Users:</span> {{ plan.max_users === -1 ? 'Unlimited' : plan.max_users }}</div>
            <div><span class="meta-key">Duration:</span> {{ plan.duration }} {{ plan.durationtype }}(s)</div>
            <div v-if="plan.trial_days > 0"><span class="meta-key">Trial:</span> {{ plan.trial_days }} days</div>
          </div>

          <div class="plan-badges">
            <span class="pill" :class="plan.is_active ? 'green' : 'gray'">{{ plan.is_active ? 'Active' : 'Inactive' }}</span>
            <span v-if="plan.is_popular" class="pill purple">Most Popular</span>
          </div>

          <div class="plan-counts">
            <span>{{ plan.modules_count ?? 0 }} modules</span>
            <span>{{ plan.features_count ?? 0 }} features</span>
          </div>

          <button class="btn-outline w-full" @click="managePlanModules(plan)">Manage Modules & Features</button>
        </div>
      </div>
    </div>

    <!-- Features Tab -->
    <div v-if="activeTab === 'features'">
      <div class="sa-card">
        <div class="sa-card-head">
          <div class="sa-card-title">Feature Templates</div>
        </div>
        <div v-if="featureTemplates.length === 0" class="sa-empty">No feature templates found.</div>
        <table v-else class="sa-table">
          <thead>
            <tr>
              <th>Feature Name</th><th>Slug</th><th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in featureTemplates" :key="t.slug">
              <td>{{ t.name }}</td>
              <td><code class="code-pill">{{ t.slug }}</code></td>
              <td class="dim sm">{{ t.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create / Edit Plan Modal -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">{{ showEditModal ? 'Edit Plan' : 'New Plan' }}</div>
          <button class="modal-close" @click="closeModals">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row2">
            <div class="form-group">
              <label>Plan Name</label>
              <input v-model="form.name" type="text" placeholder="e.g. Starter, Growth" />
            </div>
            <div class="form-group">
              <label>Price (₹)</label>
              <input v-model.number="form.price" type="number" placeholder="0.00" step="0.01" />
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea v-model="form.description" rows="3" placeholder="Describe the plan benefits"></textarea>
          </div>
          <div class="form-row2">
            <div class="form-group">
              <label>Max Users <span class="hint">(-1 = unlimited)</span></label>
              <input v-model.number="form.max_users" type="number" placeholder="-1" />
            </div>
            <div class="form-group">
              <label>Duration</label>
              <div class="input-pair">
                <input v-model.number="form.duration" type="number" placeholder="1" style="flex:1" />
                <select v-model="form.durationtype">
                  <option value="day">Days</option>
                  <option value="month">Months</option>
                  <option value="year">Years</option>
                </select>
              </div>
            </div>
          </div>
          <div class="form-row2">
            <div class="form-group">
              <label>Billing Cycle</label>
              <select v-model="form.billing_cycle">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-time</option>
              </select>
            </div>
            <div class="form-group">
              <label>Trial Days</label>
              <input v-model.number="form.trial_days" type="number" placeholder="0" />
            </div>
          </div>
          <div class="form-checks">
            <label class="check-label">
              <input v-model="form.is_active" type="checkbox" />
              <span>Active Plan</span>
            </label>
            <label class="check-label">
              <input v-model="form.is_popular" type="checkbox" />
              <span>Mark as Most Popular</span>
            </label>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" @click="closeModals">Cancel</button>
          <button class="btn-primary" :disabled="formLoading" @click="savePlan">
            {{ formLoading ? 'Saving…' : 'Save Plan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Manage Modules Modal -->
    <div v-if="showModulesModal" class="modal-overlay" @click.self="showModulesModal = false">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">{{ selectedPlan?.name }} — Modules & Features</div>
          <button class="modal-close" @click="showModulesModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="section-label">Included Modules</div>
          <div v-if="availableModules.length === 0" class="dim sm">No modules available</div>
          <div v-else class="check-list">
            <label v-for="mod in availableModules" :key="mod.id" class="check-label">
              <input type="checkbox" :checked="selectedModules.includes(mod.id)" @change="toggleModule(mod.id)" />
              <span>{{ mod.name }}</span>
            </label>
          </div>

          <div class="section-label" style="margin-top:20px">Plan Features</div>
          <div class="feature-list">
            <div v-for="(feature, idx) in planFeatures" :key="idx" class="feature-row">
              <div style="flex:1;display:flex;flex-direction:column;gap:6px">
                <input v-model="feature.name" type="text" placeholder="Feature name" />
                <input v-model="feature.value" type="text" placeholder="Value" />
              </div>
              <button class="remove-btn" @click="planFeatures.splice(idx, 1)">✕</button>
            </div>
            <button class="add-feature-btn" @click="planFeatures.push({ name: '', value: '' })">+ Add Feature</button>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" @click="showModulesModal = false">Close</button>
          <button class="btn-primary" :disabled="formLoading" @click="saveModules">
            {{ formLoading ? 'Saving…' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plans-page { display: flex; flex-direction: column; gap: 20px; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.page-title { font-size: 20px; font-weight: 700; color: #E8EAF0; }
.page-sub { font-size: 13px; color: #6B7280; margin-top: 3px; }

.tab-row { display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.tab-btn {
  padding: 10px 18px; font-size: 13px; font-weight: 500; color: #6B7280;
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: all .14s; margin-bottom: -1px;
}
.tab-btn:hover { color: #9CA3AF; }
.tab-btn.active { color: #4F7EFF; border-bottom-color: #4F7EFF; }

.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.plan-card {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 14px;
}
.plan-card-top { display: flex; justify-content: space-between; gap: 8px; }
.plan-name { font-weight: 600; font-size: 15px; color: #E8EAF0; }
.plan-desc { font-size: 12px; color: #6B7280; margin-top: 3px; }
.plan-actions { display: flex; gap: 4px; flex-shrink: 0; }

.plan-price-row { display: flex; align-items: baseline; gap: 4px; border-bottom: 1px solid rgba(255,255,255,.06); padding-bottom: 14px; }
.plan-price { font-size: 24px; font-weight: 700; color: #E8EAF0; }
.plan-cycle { font-size: 12px; color: #6B7280; }

.plan-meta { font-size: 12px; color: #9CA3AF; display: flex; flex-direction: column; gap: 3px; }
.meta-key { color: #6B7280; }

.plan-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.plan-counts { display: flex; gap: 12px; font-size: 11px; color: #6B7280; }

.pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.pill.green { color: #36D399; background: rgba(54,211,153,.12); }
.pill.gray { color: #9CA3AF; background: rgba(255,255,255,.07); }
.pill.purple { color: #9B6EFF; background: rgba(155,110,255,.12); }

.sa-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
.sa-card-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
.sa-card-title { font-weight: 600; font-size: 15px; color: #E8EAF0; }
.sa-empty { padding: 32px; text-align: center; color: #6B7280; font-size: 13px; }
.sa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sa-table thead th { text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase; color: #6B7280; background: rgba(255,255,255,.02); border-bottom: 1px solid rgba(255,255,255,.06); }
.sa-table tbody tr { border-bottom: 1px solid rgba(255,255,255,.04); }
.sa-table tbody tr:last-child { border-bottom: none; }
.sa-table tbody tr:hover { background: rgba(79,126,255,.04); }
.sa-table td { padding: 10px 14px; color: #E8EAF0; }
.dim { color: #9CA3AF; } .sm { font-size: 12px; }
.code-pill { background: rgba(255,255,255,.07); color: #9B6EFF; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; }

/* Buttons */
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
  background: #4F7EFF; color: #fff; border: none; border-radius: 8px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: background .14s;
}
.btn-primary:hover { background: #3d6de8; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

.btn-outline {
  display: block; padding: 8px 14px; background: none;
  border: 1px solid rgba(255,255,255,.12); border-radius: 8px;
  color: #9CA3AF; font-size: 12px; font-weight: 500; cursor: pointer; transition: all .14s;
  text-align: center;
}
.btn-outline:hover { background: rgba(255,255,255,.05); color: #E8EAF0; }
.w-full { width: 100%; }

.btn-ghost {
  padding: 8px 16px; background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1); border-radius: 8px;
  color: #9CA3AF; font-size: 13px; cursor: pointer; transition: all .14s;
}
.btn-ghost:hover { background: rgba(255,255,255,.1); }

.icon-btn { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); border-radius: 6px; padding: 5px; color: #9CA3AF; cursor: pointer; transition: all .14s; display: grid; place-items: center; }
.icon-btn:hover { background: rgba(79,126,255,.15); color: #4F7EFF; }
.icon-btn.red:hover { background: rgba(255,107,107,.15); color: #FF6B6B; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 200; }
.modal { background: #0D0F1A; border: 1px solid rgba(255,255,255,.1); border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; margin: 16px; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.07); flex-shrink: 0; }
.modal-title { font-weight: 600; font-size: 15px; color: #E8EAF0; }
.modal-close { background: none; border: none; color: #6B7280; font-size: 16px; cursor: pointer; padding: 2px 6px; transition: color .14s; }
.modal-close:hover { color: #FF6B6B; }
.modal-body { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid rgba(255,255,255,.07); flex-shrink: 0; }

/* Form */
.form-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 12px; font-weight: 500; color: #9CA3AF; }
.hint { font-weight: 400; color: #6B7280; margin-left: 4px; }
.form-group input, .form-group textarea, .form-group select {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 8px 12px; color: #E8EAF0; font-size: 13px;
  font-family: inherit; outline: none; transition: border-color .14s;
}
.form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: rgba(79,126,255,.5); }
.form-group input::placeholder, .form-group textarea::placeholder { color: #4B5563; }
.form-group select option { background: #0D0F1A; }
.input-pair { display: flex; gap: 8px; }

.form-checks { display: flex; flex-direction: column; gap: 10px; }
.check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #9CA3AF; }
.check-label input[type="checkbox"] { width: 15px; height: 15px; accent-color: #4F7EFF; cursor: pointer; }

.section-label { font-size: 10px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: #4B5563; margin-bottom: 8px; }
.check-list { display: flex; flex-direction: column; gap: 8px; }

.feature-list { display: flex; flex-direction: column; gap: 8px; }
.feature-row { display: flex; gap: 10px; align-items: flex-start; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); border-radius: 8px; padding: 10px; }
.remove-btn { background: none; border: none; color: #6B7280; cursor: pointer; font-size: 13px; padding: 2px 4px; transition: color .14s; }
.remove-btn:hover { color: #FF6B6B; }
.add-feature-btn { background: none; border: none; color: #4F7EFF; font-size: 13px; cursor: pointer; padding: 4px 0; font-weight: 500; text-align: left; }
.add-feature-btn:hover { color: #7aa0ff; }
</style>
