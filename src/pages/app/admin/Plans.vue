<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Plans & Pricing</h1>
        <p class="mt-2 text-slate-600">Create and manage subscription plans for your tenants</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-white font-semibold hover:bg-brand-700"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Plan
      </button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-slate-200">
      <div class="flex gap-8">
        <button
          @click="activeTab = 'plans'"
          :class="[
            'px-4 py-4 font-medium text-sm border-b-2 transition',
            activeTab === 'plans'
              ? 'text-brand-600 border-brand-600'
              : 'text-slate-600 border-transparent hover:text-slate-900',
          ]"
        >
          Plans
        </button>
        <button
          @click="activeTab = 'features'"
          :class="[
            'px-4 py-4 font-medium text-sm border-b-2 transition',
            activeTab === 'features'
              ? 'text-brand-600 border-brand-600'
              : 'text-slate-600 border-transparent hover:text-slate-900',
          ]"
        >
          Feature Templates
        </button>
      </div>
    </div>

    <!-- Plans Tab -->
    <div v-if="activeTab === 'plans'" class="space-y-6">
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>

      <div v-else-if="plans.length === 0" class="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
        <p class="text-slate-600">No plans created yet. Create your first plan to get started.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="rounded-lg border border-slate-200 p-6 hover:shadow-lg transition"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="font-semibold text-lg text-slate-900">{{ plan.name }}</h3>
              <p v-if="plan.description" class="text-sm text-slate-600 mt-1">{{ plan.description }}</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="editPlan(plan)"
                class="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                title="Edit"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-7-4l2.146-2.146a4 4 0 015.708 0l2.146 2.146V7a2 2 0 00-2-2h-1.172a2 2 0 00-1.414.586l-.828.828m0 0L9 9m0 0a2 2 0 11-2.828-2.828m2.828 2.828L9 9m0 0l2.586-2.586" />
                </svg>
              </button>
              <button
                @click="deletePlan(plan.id)"
                class="p-2 hover:bg-rose-100 rounded text-rose-600 hover:text-rose-700"
                title="Delete"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <div class="space-y-3 mb-4 pb-4 border-b border-slate-200">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-bold text-slate-900">${{ plan.price }}</span>
              <span class="text-slate-600">/ {{ plan.billing_cycle }}</span>
            </div>

            <div class="text-sm text-slate-600 space-y-1">
              <div v-if="plan.max_users === -1">
                <strong>Users:</strong> Unlimited
              </div>
              <div v-else>
                <strong>Max Users:</strong> {{ plan.max_users }}
              </div>
              <div><strong>Duration:</strong> {{ plan.duration }} {{ plan.durationtype }}(s)</div>
              <div v-if="plan.trial_days > 0"><strong>Trial:</strong> {{ plan.trial_days }} days free</div>
            </div>
          </div>

          <div class="mb-4">
            <div class="text-xs font-semibold text-slate-700 uppercase mb-2">Status</div>
            <span
              :class="[
                'inline-block px-3 py-1 rounded text-xs font-medium',
                plan.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-700',
              ]"
            >
              {{ plan.is_active ? 'Active' : 'Inactive' }}
            </span>
            <span
              v-if="plan.is_popular"
              class="ml-2 inline-block px-3 py-1 rounded text-xs font-medium bg-brand-100 text-brand-700"
            >
              Most Popular
            </span>
          </div>

          <div class="text-xs text-slate-600 mb-4">
            <div><strong>{{ plan.modules_count }}</strong> modules included</div>
            <div><strong>{{ plan.features_count }}</strong> features</div>
          </div>

          <button
            @click="managePlanModules(plan)"
            class="w-full px-3 py-2 border border-slate-300 rounded text-slate-700 font-medium hover:bg-slate-50"
          >
            Manage Modules & Features
          </button>
        </div>
      </div>
    </div>

    <!-- Features Tab -->
    <div v-if="activeTab === 'features'" class="space-y-6">
      <div class="rounded-lg border border-slate-200 p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="font-semibold text-lg">Feature Templates</h3>
          <button
            @click="showFeatureModal = true"
            class="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Feature
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-slate-200 bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-slate-900">Feature Name</th>
                <th class="px-4 py-3 text-left font-semibold text-slate-900">Slug</th>
                <th class="px-4 py-3 text-left font-semibold text-slate-900">Description</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="template in featureTemplates" :key="template.slug" class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium text-slate-900">{{ template.name }}</td>
                <td class="px-4 py-3 text-slate-600"><code class="bg-slate-100 px-2 py-1 rounded">{{ template.slug }}</code></td>
                <td class="px-4 py-3 text-slate-600 text-xs">{{ template.description }}</td>
                <td class="px-4 py-3 text-right">
                  <button class="text-brand-600 hover:text-brand-700 font-medium text-sm">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create/Edit Plan Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold">
            {{ showEditModal ? 'Edit Plan' : 'Create New Plan' }}
          </h2>
          <button
            @click="closeModals"
            class="text-slate-400 hover:text-slate-600"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="px-6 py-6 space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Plan Name</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="e.g., Starter, Growth, Enterprise"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Price</label>
              <input
                v-model.number="form.price"
                type="number"
                class="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <textarea
              v-model="form.description"
              class="w-full rounded-lg border border-slate-300 px-3 py-2"
              rows="3"
              placeholder="Describe the plan benefits"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Max Users</label>
              <input
                v-model.number="form.max_users"
                type="number"
                class="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Enter -1 for unlimited"
              />
              <p class="text-xs text-slate-500 mt-1">Use -1 for unlimited users</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Duration</label>
              <div class="flex gap-2">
                <input
                  v-model.number="form.duration"
                  type="number"
                  class="flex-1 rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="1"
                />
                <select v-model="form.durationtype" class="rounded-lg border border-slate-300 px-3 py-2">
                  <option value="day">Days</option>
                  <option value="month">Months</option>
                  <option value="year">Years</option>
                </select>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Billing Cycle</label>
              <select v-model="form.billing_cycle" class="w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one-time">One-time</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Trial Days</label>
              <input
                v-model.number="form.trial_days"
                type="number"
                class="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="0"
              />
            </div>
          </div>

          <div class="space-y-3">
            <label class="flex items-center gap-2">
              <input
                v-model="form.is_active"
                type="checkbox"
                class="rounded border-slate-300"
              />
              <span class="text-sm font-medium text-slate-700">Active Plan</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                v-model="form.is_popular"
                type="checkbox"
                class="rounded border-slate-300"
              />
              <span class="text-sm font-medium text-slate-700">Mark as Most Popular</span>
            </label>
          </div>
        </div>

        <div class="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
          <button
            @click="closeModals"
            class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            @click="savePlan"
            :disabled="formLoading"
            class="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {{ formLoading ? 'Saving...' : 'Save Plan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Manage Modules Modal -->
    <div v-if="showModulesModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 class="text-xl font-semibold">Manage {{ selectedPlan?.name }} - Modules & Features</h2>
          <button
            @click="showModulesModal = false"
            class="text-slate-400 hover:text-slate-600"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="px-6 py-6 space-y-6">
          <div>
            <h3 class="font-semibold mb-4">Included Modules</h3>
            <div v-if="availableModules.length === 0" class="text-slate-600 text-sm">
              No modules available
            </div>
            <div v-else class="space-y-2">
              <label v-for="module in availableModules" :key="module.id" class="flex items-center gap-2">
                <input
                  type="checkbox"
                  :checked="selectedModules.includes(module.id)"
                  @change="toggleModule(module.id)"
                  class="rounded border-slate-300"
                />
                <span class="text-sm font-medium text-slate-700">{{ module.name }}</span>
              </label>
            </div>
          </div>

          <div>
            <h3 class="font-semibold mb-4">Plan Features</h3>
            <div class="space-y-3">
              <div v-for="(feature, idx) in planFeatures" :key="idx" class="flex gap-3 p-3 border border-slate-200 rounded">
                <div class="flex-1">
                  <input
                    v-model="feature.name"
                    type="text"
                    placeholder="Feature name"
                    class="w-full text-sm rounded border border-slate-300 px-2 py-1 mb-2"
                  />
                  <input
                    v-model="feature.value"
                    type="text"
                    placeholder="Value"
                    class="w-full text-sm rounded border border-slate-300 px-2 py-1"
                  />
                </div>
                <button
                  @click="planFeatures.splice(idx, 1)"
                  class="px-3 text-rose-600 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
              <button
                @click="planFeatures.push({ name: '', value: '' })"
                class="px-3 py-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                + Add Feature
              </button>
            </div>
          </div>
        </div>

        <div class="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
          <button
            @click="showModulesModal = false"
            class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
          >
            Close
          </button>
          <button
            @click="saveModules"
            :disabled="formLoading"
            class="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {{ formLoading ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

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
    const method = showEditModal.value ? 'put' : 'post'

    if (method === 'post') {
      await api.post(url, form.value)
    } else {
      await api.put(url, form.value)
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
  if (!confirm('Are you sure you want to delete this plan?')) {
    return
  }

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
  selectedModules.value = plan.modules?.map((m: any) => m.id) || []
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
    // Save modules
    for (const moduleId of selectedModules.value) {
      await api.post(`/admin/plans/${selectedPlan.value.id}/modules`, {
        module_id: moduleId,
        is_included: true,
      }).catch(() => {
        // Module might already be added
      })
    }

    // Remove modules not in selection
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
  showModulesModal.value = false
  showFeatureModal.value = false

  form.value = {
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
  }
  selectedPlan.value = null
  selectedModules.value = []
  planFeatures.value = []
}
</script>

<style scoped>
input[type='text'],
input[type='number'],
textarea,
select {
  @apply w-full rounded-lg border border-slate-300 px-3 py-2 text-sm;
}

input[type='text']:focus,
input[type='number']:focus,
textarea:focus,
select:focus {
  @apply outline-none ring-2 ring-brand-500 border-brand-500;
}

input[type='checkbox'] {
  @apply w-4 h-4 rounded border-slate-300 text-brand-600;
}
</style>
