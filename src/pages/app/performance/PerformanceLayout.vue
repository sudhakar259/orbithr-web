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
  items.push({ name: '360° Feedback', to: 'performance.feedback' })
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
  <div class="perf-layout">
    <header class="perf-header">
      <div class="perf-eyebrow">Review cycle &middot; Q2 2026</div>
      <h1 class="perf-title">Performance</h1>
      <p class="perf-subtitle">
        OKR progress, review cycles and 360&deg; feedback. Self-review opens May 15.
      </p>
    </header>

    <nav class="perf-tabs">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="{ name: tab.to }"
        class="perf-tab"
        :class="{ 'is-active': isActive(tab.to, tab.exact) }"
      >
        {{ tab.name }}
      </RouterLink>
    </nav>

    <div class="perf-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.perf-layout {
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: #eef0f4;
}

.perf-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.perf-eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b5bff;
  font-weight: 600;
}

.perf-title {
  font-family: 'Instrument Serif', serif;
  font-size: 34px;
  letter-spacing: -0.02em;
  color: #eef0f4;
  margin: 0;
  font-weight: 400;
  line-height: 1.05;
}

.perf-subtitle {
  font-size: 13px;
  color: #7a8299;
  margin: 0;
  max-width: 720px;
  line-height: 1.55;
}

.perf-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #232936;
  overflow-x: auto;
}

.perf-tab {
  padding: 10px 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: #7a8299;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
  text-decoration: none;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.perf-tab:hover {
  color: #eef0f4;
}

.perf-tab.is-active {
  color: #eef0f4;
  border-bottom-color: #6b5bff;
}

.perf-content {
  margin-top: 4px;
}
</style>
