<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 bg-black bg-opacity-50" @click="$emit('close')" />

    <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div class="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 class="text-xl font-bold text-slate-900">{{ isEditMode ? 'Edit Plan' : 'Create New Plan' }}</h2>
          <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <!-- Content -->
        <div class="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-4">
          <!-- Basic Information -->
          <div class="mb-6">
            <h3 class="mb-4 font-semibold text-slate-900">Basic Information</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="block text-sm font-medium text-slate-700">Plan Name *</label>
                <input
                  v-model="formData.name"
                  type="text"
                  placeholder="e.g., Starter"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700">Price ($) *</label>
                <input
                  v-model.number="formData.price"
                  type="number"
                  step="0.01"
                  placeholder="99.99"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  v-model="formData.description"
                  placeholder="Plan description"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  rows="2"
                />
              </div>
            </div>
          </div>

          <!-- Billing -->
          <div class="mb-6">
            <h3 class="mb-4 font-semibold text-slate-900">Billing Details</h3>
            <div class="grid gap-4 md:grid-cols-3">
              <div>
                <label class="block text-sm font-medium text-slate-700">Billing Cycle *</label>
                <select v-model="formData.billing_cycle" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700">Duration *</label>
                <input
                  v-model.number="formData.duration"
                  type="number"
                  placeholder="30"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700">Trial Days</label>
                <input
                  v-model.number="formData.trial_days"
                  type="number"
                  placeholder="0"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
          </div>

          <!-- Features -->
          <div class="mb-6">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="font-semibold text-slate-900">Features</h3>
              <button
                @click="showAddFeatureModal = true"
                class="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                + Add Feature
              </button>
            </div>
            <div class="space-y-2">
              <div
                v-for="feature in features"
                :key="feature.id || feature.slug"
                class="flex items-center justify-between rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <p class="font-medium text-slate-900">{{ feature.name }}</p>
                  <p class="text-sm text-slate-600">{{ feature.value }}</p>
                </div>
                <button
                  @click="removeFeature(feature)"
                  class="text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
              <div v-if="!features.length" class="rounded-lg bg-slate-50 p-3 text-center text-sm text-slate-600">
                No features added yet
              </div>
            </div>
          </div>

          <!-- Modules -->
          <div class="mb-6">
            <div class="mb-4">
              <h3 class="font-semibold text-slate-900">Included Modules</h3>
            </div>
            <div class="space-y-2">
              <div
                v-for="module in selectedModules"
                :key="module.id"
                class="flex items-center justify-between rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <p class="font-medium text-slate-900">{{ module.name }}</p>
                  <p class="text-sm text-slate-600">{{ module.slug }}</p>
                </div>
                <button
                  @click="removeModule(module)"
                  class="text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
            <div v-if="availableModules.length" class="mt-4">
              <label class="block text-sm font-medium text-slate-700">Add Module</label>
              <select
                @change="addModule"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">-- Select Module --</option>
                <option
                  v-for="mod in availableModules.filter(m => !selectedModules.some(sm => sm.id === m.id))"
                  :key="mod.id"
                  :value="mod.id"
                >
                  {{ mod.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Options -->
          <div class="mb-6 flex gap-4">
            <label class="flex items-center">
              <input v-model="formData.is_active" type="checkbox" class="rounded" />
              <span class="ml-2 text-sm font-medium text-slate-700">Active</span>
            </label>
            <label class="flex items-center">
              <input v-model="formData.is_popular" type="checkbox" class="rounded" />
              <span class="ml-2 text-sm font-medium text-slate-700">Popular</span>
            </label>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex gap-3 border-t border-slate-200 px-6 py-4">
          <button
            @click="$emit('close')"
            class="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            @click="submitForm"
            :disabled="loading"
            class="flex-1 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {{ loading ? 'Saving...' : 'Save Plan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add Feature Modal -->
    <div v-if="showAddFeatureModal" class="fixed inset-0 z-50 bg-black bg-opacity-50" @click="showAddFeatureModal = false" />
    <div v-if="showAddFeatureModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 class="mb-4 text-lg font-bold text-slate-900">Add Feature</h3>
        <div class="mb-4 space-y-3">
          <div>
            <label class="block text-sm font-medium text-slate-700">Feature</label>
            <select v-model="newFeature.slug" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="">-- Select Feature --</option>
              <option v-for="feat in featureTemplate" :key="feat.slug" :value="feat.slug">
                {{ feat.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Value</label>
            <input
              v-model="newFeature.value"
              type="text"
              placeholder="e.g., 10, unlimited"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div class="flex gap-3">
          <button
            @click="showAddFeatureModal = false"
            class="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            @click="confirmAddFeature"
            class="flex-1 rounded-lg bg-brand-600 px-3 py-2 font-medium text-white hover:bg-brand-700"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Plan {
  id?: number
  name: string
  description?: string
  price: number
  duration: number
  durationtype: string
  billing_cycle: string
  trial_days?: number
  max_users: number
  is_active: boolean
  is_popular: boolean
}

const props = defineProps<{
  plan?: Plan | null
  modules: any[]
  featureTemplate: any[]
  isEditMode: boolean
}>()

const emit = defineEmits<{
  save: []
  close: []
}>()

const formData = ref<Plan>({
  name: '',
  description: '',
  price: 0,
  duration: 30,
  durationtype: 'day',
  billing_cycle: 'monthly',
  trial_days: 0,
  max_users: 10,
  is_active: true,
  is_popular: false,
})

const features = ref<any[]>([])
const selectedModules = ref<any[]>([])
const showAddFeatureModal = ref(false)
const newFeature = ref({ slug: '', value: '' })
const loading = ref(false)

const availableModules = computed(() => props.modules)

watch(
  () => props.plan,
  (newPlan) => {
    if (newPlan) {
      formData.value = { ...newPlan }
      features.value = newPlan.features || []
      selectedModules.value = newPlan.planModules?.map((pm: any) => pm.module) || []
    }
  },
  { immediate: true }
)

const addModule = (event: Event) => {
  const moduleId = +(event.target as HTMLSelectElement).value
  if (!moduleId) return

  const module = availableModules.value.find((m) => m.id === moduleId)
  if (module && !selectedModules.value.some((m) => m.id === moduleId)) {
    selectedModules.value.push(module)
  }

  ;(event.target as HTMLSelectElement).value = ''
}

const removeModule = (module: any) => {
  selectedModules.value = selectedModules.value.filter((m) => m.id !== module.id)
}

const confirmAddFeature = () => {
  if (!newFeature.value.slug || !newFeature.value.value) return

  const template = props.featureTemplate.find((f) => f.slug === newFeature.value.slug)
  if (template) {
    features.value.push({
      name: template.name,
      slug: newFeature.value.slug,
      value: newFeature.value.value,
      description: template.description,
      is_active: true,
    })
  }

  newFeature.value = { slug: '', value: '' }
  showAddFeatureModal.value = false
}

const removeFeature = (feature: any) => {
  features.value = features.value.filter((f) => f.slug !== feature.slug)
}

const submitForm = async () => {
  loading.value = true
  try {
    const url = props.isEditMode ? `/api/admin/plans/${props.plan?.id}` : '/api/admin/plans'
    const method = props.isEditMode ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        ...formData.value,
        max_users: formData.value.max_users || 10,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      alert(error.message || 'Failed to save plan')
      return
    }

    // Save features
    if (props.isEditMode && props.plan?.id) {
      for (const feature of features.value) {
        if (feature.id) {
          // Update existing
          await fetch(`/api/admin/plans/${props.plan.id}/features/${feature.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(feature),
          })
        } else {
          // Create new
          await fetch(`/api/admin/plans/${props.plan.id}/features`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(feature),
          })
        }
      }
    }

    emit('save')
  } catch (error) {
    console.error('Failed to save plan:', error)
  } finally {
    loading.value = false
  }
}
</script>
