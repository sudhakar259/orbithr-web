<script setup lang="ts">
defineOptions({ name: 'EssDashboard' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { essService } from '@/services/essService'

const router = useRouter()
const unreadCount = ref(0)
const openTickets = ref(0)

const load = async () => {
  const [notifRes, ticketRes] = await Promise.allSettled([
    essService.getUnreadCount(),
    essService.getTickets({ status: 'open' }),
  ])
  if (notifRes.status === 'fulfilled') unreadCount.value = notifRes.value.data?.count ?? 0
  if (ticketRes.status === 'fulfilled') openTickets.value = (ticketRes.value.data?.data ?? []).length
}

const sections = [
  {
    title: 'My Profile',
    desc: 'View and update your personal information',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    to: 'ess.profile',
    color: 'blue',
  },
  {
    title: 'Attendance',
    desc: 'View your attendance history and summaries',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    to: 'ess.attendance',
    color: 'green',
  },
  {
    title: 'Leave',
    desc: 'Apply for leave and track your balances',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    to: 'ess.leave',
    color: 'yellow',
  },
  {
    title: 'Payslips',
    desc: 'Access and download your payslips',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    to: 'ess.payslips',
    color: 'purple',
  },
  {
    title: 'HR Tickets',
    desc: 'Raise and track HR requests',
    icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
    to: 'ess.tickets',
    color: 'orange',
  },
  {
    title: 'Notifications',
    desc: 'View your alerts and updates',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    to: 'ess.notifications',
    color: 'teal',
  },
]

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 text-blue-400',
  green: 'bg-green-500/10 text-green-400',
  yellow: 'bg-yellow-500/10 text-yellow-400',
  purple: 'bg-purple-500/10 text-purple-400',
  orange: 'bg-orange-500/10 text-orange-400',
  teal: 'bg-teal-500/10 text-teal-400',
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Unread Notifications</p>
        <p class="text-2xl font-bold text-blue-400">{{ unreadCount }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
        <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Open Tickets</p>
        <p class="text-2xl font-bold text-orange-400">{{ openTickets }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        v-for="section in sections"
        :key="section.title"
        @click="router.push({ name: section.to })"
        class="bg-gray-800 border border-gray-700 rounded-lg p-5 text-left hover:border-gray-600 transition-colors group"
      >
        <div class="flex items-start gap-4">
          <div
            :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              colorMap[section.color],
            ]"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="section.icon"
              />
            </svg>
          </div>
          <div>
            <h3
              class="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors"
            >{{ section.title }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ section.desc }}</p>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
