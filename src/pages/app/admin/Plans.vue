<template>
  <section class="pl-page">
    <div class="pl-header">
      <div>
        <h1 class="pl-title">Plans</h1>
        <p class="pl-sub">Create and manage subscription plans for your tenants.</p>
      </div>
      <button class="pl-btn-primary" @click="showCreateModal = true">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        New Plan
      </button>
    </div>

    <!-- Tabs -->
    <div class="pl-tabs">
      <button :class="['pl-tab', activeTab === 'plans' && 'pl-tab-active']" @click="activeTab = 'plans'">Plans</button>
      <button :class="['pl-tab', activeTab === 'features' && 'pl-tab-active']" @click="activeTab = 'features'">Feature Templates</button>
    </div>

    <!-- Plans Tab -->
    <template v-if="activeTab === 'plans'">
      <div v-if="loading" class="pl-loading">
        <div class="pl-spinner"></div>
      </div>
      <div v-else-if="plans.length === 0" class="pl-empty">
        <p>No plans created yet. Create your first plan to get started.</p>
      </div>
      <div v-else class="pl-plan-grid">
        <div v-for="plan in plans" :key="plan.id" class="pl-plan-card">
          <div class="pl-plan-head">
            <div>
              <h3 class="pl-plan-name">{{ plan.name }}</h3>
              <p v-if="plan.description" class="pl-plan-desc">{{ plan.description }}</p>
            </div>
            <div class="pl-plan-actions">
              <button class="pl-icon-btn" title="Edit" @click="editPlan(plan)">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button class="pl-icon-btn pl-icon-btn-danger" title="Delete" @click="deletePlan(plan.id)">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <div class="pl-plan-pricing">
            <span class="pl-price">${{ plan.price }}</span>
            <span class="pl-billing-cycle">/ {{ plan.billing_cycle }}</span>
          </div>

          <div class="pl-plan-details">
            <div class="pl-detail-row">
              <span class="pl-detail-key">Users</span>
              <span class="pl-detail-val">{{ plan.max_users === -1 ? 'Unlimited' : plan.max_users }}</span>
            </div>
            <div class="pl-detail-row">
              <span class="pl-detail-key">Duration</span>
              <span class="pl-detail-val">{{ plan.duration }} {{ plan.durationtype }}(s)</span>
            </div>
            <div v-if="plan.trial_days > 0" class="pl-detail-row">
              <span class="pl-detail-key">Trial</span>
              <span class="pl-detail-val">{{ plan.trial_days }} days free</span>
            </div>
          </div>

          <div class="pl-plan-status-row">
            <span :class="['pl-badge', plan.is_active ? 'pl-badge-green' : 'pl-badge-muted']">
              {{ plan.is_active ? 'Active' : 'Inactive' }}
            </span>
            <span v-if="plan.is_popular" class="pl-badge pl-badge-accent">Most Popular</span>
          </div>

          <div class="pl-plan-counts">
            <span class="pl-count-item">{{ plan.modules_count }} modules</span>
            <span class="pl-count-sep">·</span>
            <span class="pl-count-item">{{ plan.features_count }} features</span>
          </div>

          <button class="pl-btn-ghost pl-btn-full" @click="managePlanModules(plan)">
            Manage Modules & Features
          </button>
        </div>
      </div>
    </template>

    <!-- Features Tab -->
    <template v-if="activeTab === 'features'">
      <div class="pl-card">
        <div class="pl-card-head">
          <h3 class="pl-card-title">Feature Templates</h3>
          <button class="pl-btn-primary" @click="showFeatureModal = true">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Feature
          </button>
        </div>
        <table class="pl-table">
          <thead>
            <tr>
              <th class="pl-th">Feature Name</th>
              <th class="pl-th">Slug</th>
              <th class="pl-th">Description</th>
              <th class="pl-th pl-th-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="template in featureTemplates" :key="template.slug" class="pl-row">
              <td class="pl-td pl-td-name">{{ template.name }}</td>
              <td class="pl-td"><code class="pl-code">{{ template.slug }}</code></td>
              <td class="pl-td pl-td-desc">{{ template.description }}</td>
              <td class="pl-td pl-td-right">
                <button class="pl-link-btn">Edit</button>
              </td>
            </tr>
            <tr v-if="!featureTemplates.length">
              <td colspan="4" class="pl-empty-row">No feature templates yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Create/Edit Plan Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal || showEditModal" class="pl-overlay" @click.self="closeModals">
        <div class="pl-modal">
          <div class="pl-modal-head">
            <h2 class="pl-modal-title">{{ showEditModal ? 'Edit Plan' : 'Create New Plan' }}</h2>
            <button class="pl-modal-close" @click="closeModals">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="pl-modal-body">
            <div class="pl-grid-2">
              <div class="pl-field">
                <label class="pl-label">Plan Name</label>
                <input v-model="form.name" type="text" class="pl-input" placeholder="e.g., Starter, Growth, Enterprise" />
              </div>
              <div class="pl-field">
                <label class="pl-label">Price</label>
                <input v-model.number="form.price" type="number" class="pl-input" placeholder="0.00" step="0.01" />
              </div>
            </div>

            <div class="pl-field">
              <label class="pl-label">Description</label>
              <textarea v-model="form.description" class="pl-input pl-textarea" rows="3" placeholder="Describe the plan benefits"></textarea>
            </div>

            <div class="pl-grid-2">
              <div class="pl-field">
                <label class="pl-label">Max Users</label>
                <input v-model.number="form.max_users" type="number" class="pl-input" placeholder="-1 for unlimited" />
                <p class="pl-hint">Use -1 for unlimited users</p>
              </div>
              <div class="pl-field">
                <label class="pl-label">Duration</label>
                <div class="pl-duration-wrap">
                  <input v-model.number="form.duration" type="number" class="pl-input pl-input-sm" placeholder="1" />
                  <select v-model="form.durationtype" class="pl-input">
                    <option value="day">Days</option>
                    <option value="month">Months</option>
                    <option value="year">Years</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="pl-grid-2">
              <div class="pl-field">
                <label class="pl-label">Billing Cycle</label>
                <select v-model="form.billing_cycle" class="pl-input">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
              <div class="pl-field">
                <label class="pl-label">Trial Days</label>
                <input v-model.number="form.trial_days" type="number" class="pl-input" placeholder="0" />
              </div>
            </div>

            <div class="pl-checks">
              <label class="pl-check-label">
                <input v-model="form.is_active" type="checkbox" class="pl-checkbox" />
                Active Plan
              </label>
              <label class="pl-check-label">
                <input v-model="form.is_popular" type="checkbox" class="pl-checkbox" />
                Mark as Most Popular
              </label>
            </div>
          </div>

          <div class="pl-modal-foot">
            <button class="pl-btn-ghost" @click="closeModals">Cancel</button>
            <button class="pl-btn-primary" :disabled="formLoading" @click="savePlan">
              {{ formLoading ? 'Saving…' : 'Save Plan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Manage Modules Modal -->
    <Teleport to="body">
      <div v-if="showModulesModal" class="pl-overlay" @click.self="showModulesModal = false">
        <div class="pl-modal">
          <div class="pl-modal-head">
            <h2 class="pl-modal-title">{{ selectedPlan?.name }} — Modules & Features</h2>
            <button class="pl-modal-close" @click="showModulesModal = false">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="pl-modal-body">
            <div class="pl-section-head">Included Modules</div>
            <div v-if="availableModules.length === 0" class="pl-hint">No modules available.</div>
            <div v-else class="pl-module-list">
              <label v-for="module in availableModules" :key="module.id" class="pl-check-label">
                <input type="checkbox" :checked="selectedModules.includes(module.id)" class="pl-checkbox" @change="toggleModule(module.id)" />
                {{ module.name }}
              </label>
            </div>

            <div class="pl-section-head" style="margin-top: 20px;">Plan Features</div>
            <div class="pl-feature-list">
              <div v-for="(feature, idx) in planFeatures" :key="idx" class="pl-feature-row">
                <div class="pl-feature-inputs">
                  <input v-model="feature.name" type="text" placeholder="Feature name" class="pl-input" />
                  <input v-model="feature.value" type="text" placeholder="Value" class="pl-input" />
                </div>
                <button class="pl-remove-btn" @click="planFeatures.splice(idx, 1)">Remove</button>
              </div>
              <button class="pl-add-btn" @click="planFeatures.push({ name: '', value: '' })">+ Add Feature</button>
            </div>
          </div>

          <div class="pl-modal-foot">
            <button class="pl-btn-ghost" @click="showModulesModal = false">Close</button>
            <button class="pl-btn-primary" :disabled="formLoading" @click="saveModules">
              {{ formLoading ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
defineOptions({ name: 'AdminPlansPage' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'

const { confirm: dialog } = useConfirm()
const toast = useToast()

const activeTab = ref<'plans' | 'features'>('plans')
const loading = ref(false)
const formLoading = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showModulesModal = ref(false)
const showFeatureModal = ref(false)

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
    toast.error('Failed to save plan')
  } finally {
    formLoading.value = false
  }
}

async function deletePlan(planId: number) {
  if (!await dialog('Delete', 'Are you sure you want to delete this plan?')) return
  try {
    await api.delete(`/admin/plans/${planId}`)
    await fetchPlans()
  } catch (e) {
    console.error('Failed to delete plan', e)
    toast.error('Failed to delete plan')
  }
}

async function managePlanModules(plan: any) {
  selectedPlan.value = plan
  selectedModules.value = plan.modules?.map((m: any) => m.id) || []
  planFeatures.value = plan.features?.map((f: any) => ({ name: f.name, value: f.value })) || []
  await fetchAvailableModules()
  showModulesModal.value = true
}

function toggleModule(moduleId: number) {
  const idx = selectedModules.value.indexOf(moduleId)
  if (idx > -1) selectedModules.value.splice(idx, 1)
  else selectedModules.value.push(moduleId)
}

async function saveModules() {
  formLoading.value = true
  try {
    for (const moduleId of selectedModules.value) {
      await api.post(`/admin/plans/${selectedPlan.value.id}/modules`, { module_id: moduleId, is_included: true }).catch(() => {})
    }
    const currentModules = selectedPlan.value.modules?.map((m: any) => m.id) || []
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
  showFeatureModal.value = false
  form.value = { name: '', description: '', price: 0, duration: 1, durationtype: 'month', billing_cycle: 'monthly', trial_days: 0, max_users: 10, is_active: true, is_popular: false }
  selectedPlan.value = null
  selectedModules.value = []
  planFeatures.value = []
}
</script>

<style scoped>
.pl-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.pl-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.pl-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.pl-sub { margin: 4px 0 0; font-size: 13px; color: #7A8299; }

.pl-btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
}
.pl-btn-primary:hover { opacity: 0.88; }
.pl-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.pl-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer;
}
.pl-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.pl-btn-full { width: 100%; justify-content: center; }

.pl-tabs { display: flex; border-bottom: 1px solid #232936; }
.pl-tab { background: none; border: none; border-bottom: 2px solid transparent; color: #7A8299; padding: 10px 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: color 0.12s, border-color 0.12s; margin-bottom: -1px; }
.pl-tab:hover { color: #B6BED0; }
.pl-tab-active { color: #6B5BFF; border-bottom-color: #6B5BFF; }

.pl-loading { display: flex; justify-content: center; padding: 48px; }
.pl-spinner { width: 32px; height: 32px; border-radius: 50%; border: 3px solid #232936; border-top-color: #6B5BFF; animation: pl-spin 0.7s linear infinite; }
@keyframes pl-spin { to { transform: rotate(360deg); } }

.pl-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }

.pl-plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.pl-plan-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 14px; transition: border-color 0.15s; }
.pl-plan-card:hover { border-color: rgba(107,91,255,0.4); }
.pl-plan-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.pl-plan-name { margin: 0; font-size: 16px; font-weight: 600; color: #EEF0F4; }
.pl-plan-desc { margin: 4px 0 0; font-size: 12px; color: #7A8299; }
.pl-plan-actions { display: flex; gap: 4px; }
.pl-icon-btn { background: none; border: 1px solid #232936; color: #7A8299; border-radius: 6px; padding: 5px; cursor: pointer; display: flex; align-items: center; }
.pl-icon-btn:hover { background: #232936; color: #EEF0F4; }
.pl-icon-btn-danger:hover { border-color: rgba(243,130,136,0.4); color: #F38288; background: rgba(243,130,136,0.08); }

.pl-plan-pricing { display: flex; align-items: baseline; gap: 4px; border-bottom: 1px solid #232936; padding-bottom: 14px; }
.pl-price { font-family: 'Instrument Serif', serif; font-size: 28px; color: #EEF0F4; letter-spacing: -0.02em; }
.pl-billing-cycle { font-size: 13px; color: #7A8299; }

.pl-plan-details { display: flex; flex-direction: column; gap: 6px; }
.pl-detail-row { display: flex; justify-content: space-between; font-size: 12px; }
.pl-detail-key { color: #7A8299; }
.pl-detail-val { color: #B6BED0; font-weight: 500; }

.pl-plan-status-row { display: flex; gap: 6px; flex-wrap: wrap; }
.pl-badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.pl-badge-green  { background: rgba(77,211,154,0.12); color: #4DD39A; }
.pl-badge-muted  { background: rgba(122,130,153,0.12); color: #7A8299; }
.pl-badge-accent { background: rgba(107,91,255,0.12); color: #8A7BFF; }

.pl-plan-counts { font-size: 12px; color: #7A8299; display: flex; gap: 6px; }
.pl-count-sep { color: #232936; }

/* Card (features tab) */
.pl-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.pl-card-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #232936; }
.pl-card-title { margin: 0; font-size: 14px; font-weight: 600; color: #EEF0F4; }
.pl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pl-th { padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.pl-th-right { text-align: right; }
.pl-row { border-bottom: 1px solid #1C2030; }
.pl-row:last-child { border-bottom: none; }
.pl-row:hover { background: rgba(255,255,255,0.02); }
.pl-td { padding: 12px 16px; color: #B6BED0; }
.pl-td-name { color: #EEF0F4; font-weight: 500; }
.pl-td-desc { font-size: 12px; color: #7A8299; }
.pl-td-right { text-align: right; }
.pl-code { background: #0D0F17; border: 1px solid #232936; border-radius: 4px; padding: 2px 7px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #8A7BFF; }
.pl-link-btn { background: none; border: none; color: #6B5BFF; font-size: 13px; font-weight: 500; cursor: pointer; }
.pl-link-btn:hover { text-decoration: underline; }
.pl-empty-row { padding: 28px; text-align: center; color: #7A8299; }

/* Modal */
.pl-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
.pl-modal { background: #161A23; border: 1px solid #232936; border-radius: 12px; width: 100%; max-width: 580px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.pl-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid #232936; position: sticky; top: 0; background: #161A23; }
.pl-modal-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 20px; font-weight: 400; color: #EEF0F4; }
.pl-modal-close { background: none; border: none; color: #7A8299; cursor: pointer; padding: 4px; border-radius: 4px; }
.pl-modal-close:hover { color: #EEF0F4; background: #232936; }
.pl-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.pl-modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 20px; border-top: 1px solid #232936; background: #11141C; position: sticky; bottom: 0; }

.pl-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pl-field { display: flex; flex-direction: column; gap: 5px; }
.pl-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.pl-hint { font-size: 11px; color: #7A8299; margin-top: 3px; }
.pl-input {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 8px 12px; outline: none; width: 100%; box-sizing: border-box;
}
.pl-input:focus { border-color: #6B5BFF; }
.pl-textarea { resize: vertical; min-height: 80px; }
.pl-input-sm { max-width: 80px; }
.pl-duration-wrap { display: flex; gap: 8px; }

.pl-checks { display: flex; flex-direction: column; gap: 10px; }
.pl-check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.pl-checkbox { accent-color: #6B5BFF; width: 14px; height: 14px; }

.pl-section-head { font-size: 12px; font-weight: 600; color: #EEF0F4; margin-bottom: 10px; }
.pl-module-list { display: flex; flex-direction: column; gap: 8px; }
.pl-feature-list { display: flex; flex-direction: column; gap: 8px; }
.pl-feature-row { display: flex; align-items: flex-start; gap: 10px; background: #0D0F17; border: 1px solid #232936; border-radius: 8px; padding: 12px; }
.pl-feature-inputs { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.pl-remove-btn { background: none; border: none; color: #F38288; font-size: 12px; cursor: pointer; white-space: nowrap; margin-top: 6px; }
.pl-remove-btn:hover { text-decoration: underline; }
.pl-add-btn { background: none; border: none; color: #6B5BFF; font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; padding: 0; }
.pl-add-btn:hover { text-decoration: underline; }
</style>
