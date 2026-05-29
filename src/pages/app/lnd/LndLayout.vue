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
  <div class="lnd-layout">
    <div class="lnd-header">
      <p class="lnd-eyebrow">Your library &middot; learning &amp; growth</p>
      <h1 class="lnd-title">Learning &amp; Development</h1>
      <p class="lnd-subtitle">
        Assign courses, track completion, and build role-based paths for every team.
      </p>
    </div>

    <div v-if="showTabs" class="lnd-subnav">
      <nav class="lnd-subnav-inner">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="{ name: tab.to }"
          :class="['lnd-tab', { active: isActive(tab.to, tab.exact) }]"
        >
          {{ tab.name }}
        </RouterLink>
      </nav>
    </div>

    <div class="lnd-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.lnd-layout {
  background: #0d0f17;
  color: #eef0f4;
  min-height: 100%;
  padding: 4px 0 32px;
}

.lnd-header {
  margin-bottom: 20px;
}

.lnd-eyebrow {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
  margin: 0 0 6px;
}

.lnd-title {
  font-family: 'Instrument Serif', serif;
  font-size: 36px;
  letter-spacing: -0.02em;
  color: #eef0f4;
  margin: 0 0 6px;
  font-weight: 400;
}

.lnd-subtitle {
  color: #7a8299;
  font-size: 13.5px;
  margin: 0;
  max-width: 640px;
}

.lnd-subnav {
  border-bottom: 1px solid #232936;
  margin-bottom: 24px;
}

.lnd-subnav-inner {
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
}

.lnd-tab {
  position: relative;
  padding: 12px 0;
  font-size: 13px;
  font-weight: 500;
  color: #7a8299;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.lnd-tab:hover {
  color: #eef0f4;
}

.lnd-tab.active {
  color: #eef0f4;
  border-bottom-color: #6b5bff;
}

.lnd-content {
  margin-top: 4px;
}
</style>
