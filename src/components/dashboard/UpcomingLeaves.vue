<template>
  <ExpandableCard title="Upcoming Leaves" description="Approved and pending leaves">
    <template #default>
      <div class="relative max-h-[300px] overflow-hidden">
        <!-- Auto-scrolling wrapper -->
        <div class="flex flex-col gap-3 animate-scroll">
          <div
            v-for="leave in loopedLeaves"
            :key="leave.id + '-' + leave._dup"
            @click="handleClick(leave)"
            class="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
                :class="avatarColor(leave.name)"
              >
                {{ initials(leave.name) }}
              </div>
              <div>
                <div class="font-medium text-slate-800">{{ leave.name }}</div>
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  :class="typeColor(leave.type)"
                >
                  {{ leave.type }}
                </span>
              </div>
            </div>
            <span class="text-sm text-slate-500">{{ leave.dateRange }}</span>
          </div>
        </div>
      </div>
    </template>
  </ExpandableCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ExpandableCard from './ExpandableCard.vue'

interface Leave {
  id: number
  name: string
  type: string
  dateRange: string
  _dup?: number
}

const leaves = ref<Leave[]>([
  { id: 1, name: 'Priya Sharma', type: 'Annual Leave', dateRange: 'Sep 21–24' },
  { id: 2, name: 'Arjun Mehta', type: 'Sick Leave', dateRange: 'Sep 19' },
  { id: 3, name: 'Anita Rao', type: 'WFH', dateRange: 'Sep 20' },
  { id: 4, name: 'Rohan Singh', type: 'Annual Leave', dateRange: 'Sep 25–27' },
  { id: 5, name: 'Kunal Verma', type: 'Annual Leave', dateRange: 'Sep 29–30' },
])

// Duplicate list for seamless infinite scroll
const loopedLeaves = computed(() =>
  leaves.value.concat(leaves.value.map((l) => ({ ...l, _dup: Math.random() }))),
)

// Utils
const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
const avatarColors = ['bg-red-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500']
const avatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length]
const typeColor = (type: string) => {
  switch (type) {
    case 'Annual Leave':
      return 'bg-green-100 text-green-700'
    case 'Sick Leave':
      return 'bg-red-100 text-red-700'
    case 'WFH':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// Click handler
const handleClick = (leave: Leave) => {
  console.log('Clicked leave:', leave)
  // 👉 You can instead open a modal or navigate like:
  // router.push(`/leaves/${leave.id}`)
}
</script>

<style scoped>
@keyframes scroll {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-50%);
  }
}
.animate-scroll {
  animation: scroll 12s linear infinite;
}
</style>
