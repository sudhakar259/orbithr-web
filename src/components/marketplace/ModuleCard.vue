<template>
  <div class="rounded-lg border border-slate-200 bg-white p-6 shadow-soft transition-all hover:shadow-lg">
    <!-- Header -->
    <div class="mb-4 flex items-start justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-900">{{ module.name }}</h3>
        <div class="mt-1 flex flex-wrap gap-2">
          <span v-if="module.is_core" class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            Core
          </span>
          <span :class="statusBadgeClass">
            {{ statusLabel }}
          </span>
        </div>
      </div>
      <div v-if="module.icon" class="text-3xl">
        <component :is="`Icon${module.icon}`" class="h-8 w-8 text-brand-600" />
      </div>
    </div>

    <!-- Description -->
    <p class="mb-4 text-sm text-slate-600">{{ module.description }}</p>

    <!-- Features -->
    <div v-if="module.features && module.features.length" class="mb-4">
      <p class="mb-2 text-xs font-semibold text-slate-700">Features:</p>
      <ul class="space-y-1">
        <li v-for="feature in module.features.slice(0, 3)" :key="feature.slug" class="text-sm text-slate-600">
          ✓ {{ feature.name }}
        </li>
        <li v-if="module.features.length > 3" class="text-sm text-slate-500">
          +{{ module.features.length - 3 }} more...
        </li>
      </ul>
    </div>

    <!-- Pricing -->
    <div class="mb-4 flex items-baseline gap-2">
      <span v-if="module.is_free" class="text-2xl font-bold text-slate-900">Free</span>
      <span v-else>
        <span class="text-2xl font-bold text-slate-900">${{ module.price }}</span>
        <span class="text-sm text-slate-600">/{{ billingTypeLabel }}</span>
      </span>
    </div>

    <!-- Action Button -->
    <button
      v-if="!module.is_core"
      :disabled="loading || isOwned"
      :class="actionButtonClass"
      @click="handleAction"
    >
      <span v-if="loading" class="mr-2 inline-block animate-spin">⚙️</span>
      {{ actionButtonLabel }}
    </button>
    <div v-else class="rounded-lg bg-blue-50 px-3 py-2 text-center text-sm text-blue-700">
      Included with your plan
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useModuleStore } from '@/stores/modules'

interface Feature {
  id: number
  module_id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
}

interface Module {
  id: number
  name: string
  slug: string
  description: string
  features: Feature[]
  price: number
  billing_type: string
  is_free: boolean
  is_core: boolean
  status?: string
  icon?: string
  category?: string
}

interface Props {
  module: Module
}

const props = defineProps<Props>()
const emit = defineEmits<{
  purchase: [slug: string]
  enable: [slug: string]
}>()

const loading = ref(false)
const moduleStore = useModuleStore()

const isOwned = computed(() => props.module.status === 'owned' || props.module.status === 'free')

const statusLabel = computed(() => {
  switch (props.module.status) {
    case 'owned':
      return 'Purchased'
    case 'free':
      return 'Available'
    case 'available':
      return 'Available'
    default:
      return 'Not Purchased'
  }
})

const statusBadgeClass = computed(() => {
  const baseClass = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
  switch (props.module.status) {
    case 'owned':
    case 'free':
      return `${baseClass} bg-green-100 text-green-800`
    case 'available':
      return `${baseClass} bg-gray-100 text-gray-800`
    default:
      return `${baseClass} bg-gray-100 text-gray-800`
  }
})

const billingTypeLabel = computed(() => {
  return props.module.billing_type === 'recurring' ? 'month' : 'one-time'
})

const actionButtonLabel = computed(() => {
  if (isOwned.value) return 'Manage'
  if (props.module.is_free) return 'Enable'
  return 'Purchase'
})

const actionButtonClass = computed(() => {
  const baseClass = 'w-full rounded-lg px-4 py-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  if (isOwned.value) {
    return `${baseClass} bg-slate-200 text-slate-700 hover:bg-slate-300`
  }
  return `${baseClass} bg-brand-600 text-white hover:bg-brand-700`
})

const handleAction = async () => {
  loading.value = true
  try {
    if (isOwned.value) {
      // Navigate to module management
      // TODO: implement navigation
    } else if (props.module.is_free) {
      emit('enable', props.module.slug)
    } else {
      emit('purchase', props.module.slug)
    }
  } finally {
    loading.value = false
  }
}

</script>
