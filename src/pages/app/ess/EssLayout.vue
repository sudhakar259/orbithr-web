<script setup lang="ts">
defineOptions({ name: 'EssLayout' })
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()

const tabs = [
  {
    name: 'Dashboard',
    to: { name: 'ess.dashboard' },
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    name: 'My Profile',
    to: { name: 'ess.profile' },
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    name: 'Attendance',
    to: { name: 'ess.attendance' },
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    name: 'Leave',
    to: { name: 'ess.leave' },
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    name: 'Payslips',
    to: { name: 'ess.payslips' },
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    name: 'HR Tickets',
    to: { name: 'ess.tickets' },
    icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  },
  {
    name: 'Notifications',
    to: { name: 'ess.notifications' },
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
]

const isActive = (name: string) => {
  const r = route.name as string
  return r === name
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-white">Employee Self-Service</h1>
      <p class="text-gray-400 text-sm mt-1">Manage your personal HR data and requests</p>
    </div>
    <div class="border-b border-gray-700">
      <nav class="-mb-px flex gap-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          @click="router.push(tab.to)"
          :class="[
            'flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
            isActive(tab.to.name)
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white',
          ]"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
          </svg>
          {{ tab.name }}
        </button>
      </nav>
    </div>
    <router-view />
  </div>
</template>
