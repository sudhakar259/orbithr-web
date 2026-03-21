<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const { roles } = useAuth()

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const isAdminOrHR = computed(
  () => rLower.value.includes('admin') || rLower.value.includes('hr_manager'),
)
const isManager = computed(() => isAdminOrHR.value || rLower.value.includes('manager'))

const tabs = computed(() => {
  const items = [
    { name: 'Dashboard', to: 'performance', exact: true },
    { name: 'Goals', to: 'performance.goals' },
    { name: 'My Appraisals', to: 'performance.appraisals' },
  ]
  if (isAdminOrHR.value) {
    items.push({ name: 'Appraisal Cycles', to: 'performance.cycles' })
  }
  items.push({ name: '360 Feedback', to: 'performance.feedback' })
  if (isManager.value) {
    items.push({ name: 'Reports', to: 'performance.reports' })
  }
  return items
})

const isActive = (name: string, exact = false) => {
  const current = String(route.name)
  if (exact) return current === name
  return current === name || current.startsWith(name + '.')
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-white">Performance Management</h1>
      <p class="text-gray-400">Manage goals, appraisals, reviews, and feedback.</p>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-700">
      <nav class="-mb-px flex space-x-8">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="{ name: tab.to }"
          :class="[
            isActive(tab.to, tab.exact)
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500',
            'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm',
          ]"
        >
          {{ tab.name }}
        </RouterLink>
      </nav>
    </div>

    <RouterView />
  </div>
</template>
