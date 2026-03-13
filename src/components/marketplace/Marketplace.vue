<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <h1 class="text-3xl font-bold text-slate-900">Module Marketplace</h1>
        <p class="mt-2 text-slate-600">Browse and manage modules for your organization</p>

        <!-- Search & Filter -->
        <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div class="flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search modules..."
              class="w-full rounded-lg border border-slate-300 px-4 py-2 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <select
            v-model="filterCategory"
            class="rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            <option value="core">Core</option>
            <option value="business">Business</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Loading State -->
      <div v-if="loading" class="space-y-6">
        <div v-for="i in 6" :key="i" class="h-96 animate-pulse rounded-lg bg-slate-200"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p class="font-medium">Error loading modules</p>
        <p class="text-sm">{{ error }}</p>
        <button
          @click="loadModules"
          class="mt-2 rounded px-3 py-1 text-sm font-medium hover:bg-red-100"
        >
          Retry
        </button>
      </div>

      <!-- Modules Grid -->
      <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          v-for="module in filteredModules"
          :key="module.slug"
          :module="module"
          @purchase="handlePurchase"
          @enable="handleEnable"
        />
      </div>

      <!-- Empty State -->
      <div v-if="!loading && modules.length === 0" class="text-center">
        <p class="text-slate-600">No modules available</p>
      </div>

      <!-- No Results -->
      <div v-if="!loading && modules.length > 0 && filteredModules.length === 0" class="text-center">
        <p class="text-slate-600">No modules match your search</p>
      </div>
    </div>

    <!-- Checkout Modal -->
    <ModuleCheckoutModal
      v-if="selectedModuleForCheckout"
      :module="selectedModuleForCheckout"
      :open="showCheckoutModal"
      @close="showCheckoutModal = false"
      @success="handleCheckoutSuccess"
    />

    <!-- Success Notification -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="successMessage"
        class="fixed bottom-4 right-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700 shadow-lg"
      >
        <p class="font-medium">{{ successMessage }}</p>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useModuleStore } from '@/stores/modules'
import ModuleCard from './ModuleCard.vue'
import ModuleCheckoutModal from './ModuleCheckoutModal.vue'

interface Module {
  id: number
  name: string
  slug: string
  description: string
  features: string[]
  price: number
  billing_type: string
  is_free: boolean
  is_core: boolean
  status?: string
  icon?: string
  category?: string
}

const moduleStore = useModuleStore()
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const filterCategory = ref('')
const modules = ref<Module[]>([])
const selectedModuleForCheckout = ref<Module | null>(null)
const showCheckoutModal = ref(false)
const successMessage = ref('')

const filteredModules = computed(() => {
  return modules.value.filter((module) => {
    const matchesSearch =
      module.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesCategory = !filterCategory.value || module.category === filterCategory.value

    return matchesSearch && matchesCategory
  })
})

const loadModules = async () => {
  loading.value = true
  error.value = null
  try {
    const response = await fetch('/api/marketplace')
    if (!response.ok) throw new Error('Failed to load modules')
    modules.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred'
  } finally {
    loading.value = false
  }
}

const handlePurchase = (slug: string) => {
  const module = modules.value.find((m) => m.slug === slug)
  if (module) {
    selectedModuleForCheckout.value = module
    showCheckoutModal.value = true
  }
}

const handleEnable = async (slug: string) => {
  try {
    const response = await fetch(`/api/tenant/modules/${slug}/enable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })

    if (!response.ok) throw new Error('Failed to enable module')

    successMessage.value = 'Module enabled successfully!'
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)

    // Reload modules to refresh status
    loadModules()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred'
  }
}

const handleCheckoutSuccess = () => {
  showCheckoutModal.value = false
  selectedModuleForCheckout.value = null
  successMessage.value = 'Module purchased successfully!'
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
  loadModules()
}

onMounted(() => {
  loadModules()
})
</script>
