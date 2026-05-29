<script setup lang="ts">
defineOptions({ name: 'EssLayout' })
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'My Profile',     to: { name: 'ess.profile' },        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { name: 'Attendance',     to: { name: 'ess.attendance' },      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { name: 'Leave',          to: { name: 'ess.leave' },           icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { name: 'Payslips',       to: { name: 'ess.payslips' },        icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { name: 'HR Tickets',     to: { name: 'ess.tickets' },         icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
  { name: 'Notifications',  to: { name: 'ess.notifications' },   icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
]

const isActive = (name: string) => route.name === name
</script>

<template>
  <div class="essl-shell">
    <div class="essl-tabs">
      <button
        v-for="tab in tabs" :key="tab.name"
        :class="['essl-tab', isActive(tab.to.name) && 'essl-tab-active']"
        @click="router.push(tab.to)"
      >
        <svg class="essl-tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
        </svg>
        {{ tab.name }}
      </button>
    </div>
    <router-view />
  </div>
</template>

<style scoped>
.essl-shell { display: flex; flex-direction: column; gap: 24px; }
.essl-tabs { display: flex; gap: 2px; border-bottom: 1px solid #232936; overflow-x: auto; }
.essl-tab {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; font-size: 13px; font-weight: 500; white-space: nowrap;
  background: none; border: none; border-bottom: 2px solid transparent;
  color: #7A8299; cursor: pointer; transition: color 0.12s, border-color 0.12s;
  margin-bottom: -1px;
}
.essl-tab:hover { color: #B6BED0; }
.essl-tab-active { color: #EEF0F4; border-bottom-color: #6B5BFF; }
.essl-tab-icon { width: 15px; height: 15px; flex-shrink: 0; }
</style>
