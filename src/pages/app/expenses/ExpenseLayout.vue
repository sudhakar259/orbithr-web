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
  <div class="exp-layout">
    <nav v-if="showTabs" class="exp-subnav">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.label"
        :to="tab.to"
        class="exp-subnav__tab"
        :class="{ 'is-active': tab.active }"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <RouterView />
  </div>
</template>

<style scoped>
.exp-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.exp-subnav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow-x: auto;
}

.exp-subnav__tab {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #7A8299;
  text-decoration: none;
  border-radius: 8px;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.exp-subnav__tab:hover {
  color: #EEF0F4;
  background: rgba(107, 91, 255, 0.06);
}

.exp-subnav__tab.is-active {
  color: #EEF0F4;
  background: rgba(107, 91, 255, 0.14);
  box-shadow: inset 0 0 0 1px rgba(107, 91, 255, 0.35);
}
</style>
