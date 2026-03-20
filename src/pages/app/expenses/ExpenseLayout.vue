<script setup lang="ts">
defineOptions({ name: 'ExpenseLayout' })

import { computed } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const { hasPermission } = useAuth()

const tabs = computed(() => {
  const list: { label: string; to: { name: string }; active: boolean }[] = [
    { label: 'Dashboard', to: { name: 'expenses' }, active: route.name === 'expenses' },
    { label: 'My Claims', to: { name: 'expenses.my-claims' }, active: String(route.name).startsWith('expenses.my-claims') || String(route.name).startsWith('expenses.claims') },
  ]
  if (hasPermission('approve expenses')) {
    list.push({ label: 'Approvals', to: { name: 'expenses.approvals' }, active: route.name === 'expenses.approvals' })
  }
  if (hasPermission('process reimbursements')) {
    list.push({ label: 'Reimbursements', to: { name: 'expenses.reimbursements' }, active: route.name === 'expenses.reimbursements' })
  }
  if (hasPermission('manage expense policies')) {
    list.push({ label: 'Policies', to: { name: 'expenses.policies' }, active: route.name === 'expenses.policies' })
  }
  if (hasPermission('view expense reports')) {
    list.push({ label: 'Reports', to: { name: 'expenses.reports' }, active: route.name === 'expenses.reports' })
  }
  return list
})

const showTabs = computed(() => {
  const hiddenOn = ['expenses.claims.create', 'expenses.claims.edit', 'expenses.claims.show']
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
