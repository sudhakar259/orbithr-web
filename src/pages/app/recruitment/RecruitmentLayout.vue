<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const { hasPermission } = useAuth()

const tabs = computed(() => {
  const list = [
    { label: 'Jobs', to: { name: 'recruitment' }, active: route.name === 'recruitment' },
  ]
  if (hasPermission('manage job-board-integrations')) {
    list.push({
      label: 'Integrations',
      to: { name: 'recruitment.integrations' },
      active: route.name === 'recruitment.integrations',
    })
  }
  list.push(
    { label: 'Email', to: { name: 'recruitment.email' }, active: route.name === 'recruitment.email' },
    { label: 'Email Settings', to: { name: 'recruitment.email-settings' }, active: route.name === 'recruitment.email-settings' },
  )
  return list
})

const showTabs = computed(() => {
  const hiddenOn = ['recruitment.jobs.create', 'recruitment.jobs.edit', 'recruitment.jobs.show', 'recruitment.candidates.show']
  return !hiddenOn.includes(String(route.name))
})
</script>

<template>
  <div class="space-y-6">
    <!-- Tab nav -->
    <div v-if="showTabs" class="border-b border-gray-700">
      <nav class="-mb-px flex space-x-8">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.label"
          :to="tab.to"
          :class="[
            tab.active
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500',
            'whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
          ]"
        >
          {{ tab.label }}
        </RouterLink>
      </nav>
    </div>

    <RouterView />
  </div>
</template>
