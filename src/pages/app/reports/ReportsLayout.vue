<script setup lang="ts">
defineOptions({ name: 'ReportsLayout' })
import { useRouter, useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()

const tabs = [
  { name: 'Attendance', to: { name: 'reports.attendance' } },
  { name: 'Payroll', to: { name: 'reports.payroll' } },
  { name: 'Headcount', to: { name: 'reports.headcount' } },
  { name: 'Attrition', to: { name: 'reports.attrition' } },
  { name: 'Performance', to: { name: 'reports.performance' } },
  { name: 'Custom Builder', to: { name: 'reports.custom' } },
  { name: 'Scheduled', to: { name: 'reports.scheduled' } },
]

const isActive = (name: string) => route.name === name
</script>

<template>
  <div class="rl-shell">
    <div class="rl-header">
      <h1 class="rl-title">Reports & Analytics</h1>
    </div>
    <div class="rl-tabs">
      <button
        v-for="tab in tabs" :key="tab.name"
        :class="['rl-tab', isActive(tab.to.name as string) && 'rl-tab-active']"
        @click="router.push(tab.to)"
      >
        {{ tab.name }}
      </button>
    </div>
    <router-view />
  </div>
</template>

<style scoped>
.rl-shell { display: flex; flex-direction: column; gap: 20px; padding: 24px; }
.rl-header { display: flex; align-items: center; justify-content: space-between; }
.rl-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.rl-tabs { display: flex; gap: 2px; border-bottom: 1px solid #232936; }
.rl-tab {
  padding: 9px 18px; font-size: 13px; font-weight: 500;
  background: none; border: none; border-bottom: 2px solid transparent;
  color: #7A8299; cursor: pointer; transition: color 0.12s, border-color 0.12s;
  margin-bottom: -1px; white-space: nowrap;
}
.rl-tab:hover { color: #B6BED0; }
.rl-tab-active { color: #EEF0F4; border-bottom-color: #6B5BFF; }
</style>
