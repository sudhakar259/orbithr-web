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
    { label: 'Calendar', to: { name: 'recruitment.calendar-settings' }, active: route.name === 'recruitment.calendar-settings' },
  )
  return list
})

const showTabs = computed(() => {
  const hiddenOn = ['recruitment.jobs.create', 'recruitment.jobs.edit', 'recruitment.jobs.show', 'recruitment.candidates.show']
  return !hiddenOn.includes(String(route.name))
})
</script>

<template>
  <div class="recruitment-layout">
    <!-- Tab nav -->
    <div v-if="showTabs" class="tab-nav-wrap">
      <nav class="tab-nav">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.label"
          :to="tab.to"
          :class="['tab-link', { 'is-active': tab.active }]"
        >
          {{ tab.label }}
        </RouterLink>
      </nav>
    </div>

    <RouterView />
  </div>
</template>

<style scoped>
.recruitment-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: #0d0f17;
  color: #eef0f4;
  min-height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.tab-nav-wrap {
  border-bottom: 1px solid #232936;
}

.tab-nav {
  display: flex;
  gap: 28px;
  margin-bottom: -1px;
  overflow-x: auto;
}

.tab-link {
  white-space: nowrap;
  padding: 0 2px 14px;
  border-bottom: 2px solid transparent;
  font-size: 12.5px;
  font-weight: 500;
  color: #7a8299;
  text-decoration: none;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
  letter-spacing: 0.01em;
}

.tab-link:hover {
  color: #eef0f4;
  border-bottom-color: #2c3242;
}

.tab-link.is-active {
  color: #eef0f4;
  border-bottom-color: #6b5bff;
}
</style>
