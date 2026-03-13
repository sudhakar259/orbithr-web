<template>
  <ExpandableCard title="Activity" description="Recent system and employee updates">
    <template #default>
      <ul class="space-y-4">
        <li v-for="item in items" :key="item.id" class="flex items-start gap-3">
          <span class="mt-0.5 inline-flex h-2.5 w-2.5 rounded-full" :class="item.color"></span>
          <div>
            <p class="text-sm text-slate-800">{{ item.text }}</p>
            <p class="text-xs text-slate-500">{{ item.time }}</p>
          </div>
        </li>
      </ul>
    </template>
  </ExpandableCard>
</template>

<script setup lang="ts">
import ExpandableCard from './ExpandableCard.vue'

interface Item { id: number; text: string; time: string; color: string }
const items: Item[] = [
  { id: 1, text: 'Anita Rao approved leave request from Priya', time: '3m ago', color: 'bg-emerald-500' },
  { id: 2, text: 'Payroll processed for August', time: '1h ago', color: 'bg-indigo-500' },
  { id: 3, text: 'New hire added: Karthik N', time: '2h ago', color: 'bg-blue-500' },
  { id: 4, text: 'Policy updated: Hybrid work', time: 'Yesterday', color: 'bg-amber-500' },
]
</script>
