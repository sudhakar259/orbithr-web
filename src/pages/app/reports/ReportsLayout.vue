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
]

const isActive = (name: string) => route.name === name
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-white">Reports & Analytics</h2>
    </div>
    <!-- Tab Nav -->
    <div class="border-b border-gray-700">
      <nav class="-mb-px flex gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          @click="router.push(tab.to)"
          :class="[
            'px-4 py-2 text-sm font-medium transition-colors',
            isActive(tab.to.name as string)
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white',
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>
    <router-view />
  </div>
</template>
