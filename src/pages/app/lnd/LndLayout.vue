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
    { name: 'Dashboard', to: 'lnd', exact: true },
    { name: 'My Learning', to: 'lnd.my-learning' },
    { name: 'Courses', to: 'lnd.courses' },
    { name: 'Programs', to: 'lnd.programs' },
    { name: 'Skills', to: 'lnd.skills' },
    { name: 'Certifications', to: 'lnd.certifications' },
  ]
  if (isManager.value) {
    items.push({ name: 'Reports', to: 'lnd.reports' })
  }
  return items
})

const isActive = (name: string, exact = false) => {
  const current = String(route.name)
  if (exact) return current === name
  return current === name || current.startsWith(name + '.')
}

const showTabs = computed(() => {
  const hiddenOn = [
    'lnd.courses.create',
    'lnd.courses.edit',
    'lnd.courses.show',
    'lnd.programs.create',
    'lnd.programs.show',
  ]
  return !hiddenOn.includes(String(route.name))
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-white">Learning & Development</h1>
      <p class="text-gray-400">Manage courses, training programs, skills, and certifications.</p>
    </div>

    <!-- Tab Navigation -->
    <div v-if="showTabs" class="border-b border-gray-700">
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
