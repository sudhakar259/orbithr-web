<template>
  <ExpandableCard title="Attendance Trends" description="Overview of attendance performance">
    <template #default>
      <div class="flex items-center justify-between">
        <div class="text-sm text-slate-500">
          {{ selected === '7' ? 'Last 7 days' : 'Last 30 days' }}
        </div>
        <select v-model="selected" class="text-sm border rounded-md px-2 py-1 pr-7 text-slate-600">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-xl font-bold text-emerald-600">{{ avg }}%</p>
          <p class="text-xs text-slate-500">Avg Attendance</p>
        </div>
        <div>
          <p class="text-xl font-bold text-blue-600">{{ high }}%</p>
          <p class="text-xs text-slate-500">Highest Day</p>
        </div>
        <div>
          <p class="text-xl font-bold text-rose-600">{{ low }}%</p>
          <p class="text-xs text-slate-500">Lowest Day</p>
        </div>
      </div>
      <div
        class="mt-6 h-44 w-full bg-gradient-to-b from-white to-slate-50 rounded-lg flex items-center justify-center shadow-inner"
      >
        <svg class="w-full h-32" viewBox="0 0 600 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="att-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#00C2A8" stop-opacity="0.4" />
              <stop offset="100%" stop-color="#00C2A8" stop-opacity="0" />
            </linearGradient>
          </defs>
          <polyline
            :points="points"
            fill="none"
            stroke="#00C2A8"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <polygon :points="`0,200 ${points} 600,200`" fill="url(#att-grad)" />
        </svg>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-xl border border-gray-100 p-4">
          <p class="text-sm text-slate-500">On-time arrivals</p>
          <p class="mt-1 text-2xl font-bold text-slate-800">92%</p>
          <p class="text-xs text-emerald-600 mt-1">+3% vs last week</p>
        </div>
        <div class="rounded-xl border border-gray-100 p-4">
          <p class="text-sm text-slate-500">Late check-ins</p>
          <p class="mt-1 text-2xl font-bold text-slate-800">6%</p>
          <p class="text-xs text-rose-600 mt-1">-1% vs last week</p>
        </div>
        <div class="rounded-xl border border-gray-100 p-4">
          <p class="text-sm text-slate-500">Absences</p>
          <p class="mt-1 text-2xl font-bold text-slate-800">2%</p>
          <p class="text-xs text-emerald-600 mt-1">-0.5% vs last week</p>
        </div>
      </div>
      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="text-sm font-semibold text-slate-700 mb-2">Best performing departments</h4>
          <ul class="text-sm text-slate-700 space-y-2">
            <li class="flex items-center justify-between">
              <span>Engineering</span><span class="font-medium">97%</span>
            </li>
            <li class="flex items-center justify-between">
              <span>Finance</span><span class="font-medium">95%</span>
            </li>
            <li class="flex items-center justify-between">
              <span>Support</span><span class="font-medium">93%</span>
            </li>
          </ul>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-slate-700 mb-2">Actions</h4>
          <div class="flex flex-wrap gap-2">
            <button class="btn-ghost">Download CSV</button>
            <button class="btn-ghost">Schedule report</button>
            <button class="btn-primary">Create policy</button>
          </div>
        </div>
      </div>
    </template>
  </ExpandableCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ExpandableCard from './ExpandableCard.vue'
import type { MenuItemType } from './NestedMenu.vue'

const selected = ref<'7' | '30'>('30')

interface D {
  day: string
  value: number
}
const data = ref<D[]>([
  { day: '2025-08-01', value: 82 },
  { day: '2025-08-02', value: 95 },
  { day: '2025-08-03', value: 68 },
  { day: '2025-08-04', value: 75 },
  { day: '2025-08-05', value: 92 },
  { day: '2025-08-06', value: 85 },
  { day: '2025-08-07', value: 70 },
  { day: '2025-08-08', value: 88 },
  { day: '2025-08-09', value: 91 },
  { day: '2025-08-10', value: 90 },
  { day: '2025-08-11', value: 78 },
  { day: '2025-08-12', value: 85 },
  { day: '2025-08-13', value: 96 },
  { day: '2025-08-14', value: 86 },
  { day: '2025-08-15', value: 79 },
  { day: '2025-08-16', value: 83 },
  { day: '2025-08-17', value: 88 },
  { day: '2025-08-18', value: 100 },
  { day: '2025-08-19', value: 98 },
  { day: '2025-08-20', value: 98 },
  { day: '2025-08-21', value: 96 },
  { day: '2025-08-22', value: 91 },
  { day: '2025-08-23', value: 89 },
  { day: '2025-08-24', value: 92 },
  { day: '2025-08-25', value: 94 },
  { day: '2025-08-26', value: 93 },
  { day: '2025-08-27', value: 95 },
  { day: '2025-08-28', value: 96 },
  { day: '2025-08-29', value: 97 },
  { day: '2025-08-30', value: 96 },
])

const filtered = computed(() => (selected.value === '7' ? data.value.slice(-7) : data.value))
const avg = computed(() =>
  (filtered.value.reduce((s, d) => s + d.value, 0) / filtered.value.length).toFixed(0),
)
const high = computed(() => Math.max(...filtered.value.map((d) => d.value)))
const low = computed(() => Math.min(...filtered.value.map((d) => d.value)))

const points = computed(() => {
  const width = 600
  const height = 200
  const stepX = width / Math.max(filtered.value.length - 1, 1)
  return filtered.value.map((d, i) => `${i * stepX},${height - (d.value / 100) * height}`).join(' ')
})

const menu: MenuItemType[] = [
  {
    label: 'Export',
    children: [
      { label: 'CSV', action: () => console.log('export csv') },
      { label: 'PDF', action: () => console.log('export pdf') },
    ],
  },
  {
    label: 'Compare with',
    children: [
      { label: 'Last week', action: () => (selected.value = '7') },
      { label: 'Last month', action: () => (selected.value = '30') },
    ],
  },
]
</script>
