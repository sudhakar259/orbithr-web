<template>
  <ExpandableCard title="Role Distribution" description="Breakdown of employee roles">
    <template #default>
      <div class="flex items-center gap-6">
        <svg viewBox="0 0 36 36" class="w-28 h-28 -rotate-90">
          <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e5e7eb" stroke-width="3"></circle>
          <circle cx="18" cy="18" r="15.9155" fill="none" :stroke="colors[0]" stroke-width="3" :stroke-dasharray="segments[0] + ' ' + (100 - segments[0])" stroke-dashoffset="25"></circle>
          <circle cx="18" cy="18" r="15.9155" fill="none" :stroke="colors[1]" stroke-width="3" :stroke-dasharray="segments[1] + ' ' + (100 - segments[1])" :stroke-dashoffset="25 - segments[0]"></circle>
          <circle cx="18" cy="18" r="15.9155" fill="none" :stroke="colors[2]" stroke-width="3" :stroke-dasharray="segments[2] + ' ' + (100 - segments[2])" :stroke-dashoffset="25 - segments[0] - segments[1]"></circle>
        </svg>
        <ul class="text-sm text-slate-700 space-y-2">
          <li class="flex items-center gap-2"><span class="w-3 h-3 rounded" :style="{background: colors[0]}"/>Managers <span class="ml-2 font-medium">{{ roles.managers }}</span></li>
          <li class="flex items-center gap-2"><span class="w-3 h-3 rounded" :style="{background: colors[1]}"/>ICs <span class="ml-2 font-medium">{{ roles.ics }}</span></li>
          <li class="flex items-center gap-2"><span class="w-3 h-3 rounded" :style="{background: colors[2]}"/>Contractors <span class="ml-2 font-medium">{{ roles.contractors }}</span></li>
        </ul>
      </div>
    </template>
  </ExpandableCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ExpandableCard from './ExpandableCard.vue'

const roles = { managers: 38, ics: 220, contractors: 26 }
const colors = ['#6D5EF6', '#00C2A8', '#f59e0b']
const total = roles.managers + roles.ics + roles.contractors
const segments = computed(() => [
  Math.round((roles.managers / total) * 100),
  Math.round((roles.ics / total) * 100),
  Math.round((roles.contractors / total) * 100),
])
</script>
