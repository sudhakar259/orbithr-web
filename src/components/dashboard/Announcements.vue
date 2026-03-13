<template>
  <ExpandableCard title="Announcements" description="Company-wide updates and notices">
    <template #default>
      <div class="relative max-h-[300px] overflow-hidden">
        <div class="flex flex-col gap-4 animate-scroll">
          <div
            v-for="note in looped"
            :key="note.id + '-' + note._dup"
            @click="handleClick(note)"
            class="group p-4 rounded-xl shadow-sm bg-gradient-to-r from-gray-50 to-white border border-gray-200 hover:shadow-md transition cursor-pointer"
          >
            <p class="text-gray-700 group-hover:text-gray-900">{{ note.text }}</p>
            <span class="text-xs text-gray-400 mt-1 block">📅 {{ note.date }}</span>
          </div>
        </div>
      </div>
    </template>
  </ExpandableCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ExpandableCard from './ExpandableCard.vue'

interface Note {
  id: number
  text: string
  date: string
  _dup?: number
}
const items = ref<Note[]>([
  { id: 1, text: 'Office closed this Friday', date: 'Sep 12, 2025' },
  { id: 2, text: 'New HR policy update', date: 'Sep 15, 2025' },
  { id: 3, text: 'Diwali holiday schedule announced', date: 'Sep 20, 2025' },
])

// Duplicate for infinite scroll
const looped = computed(() =>
  items.value.concat(items.value.map((n) => ({ ...n, _dup: Math.random() }))),
)

// Click handler
const handleClick = (note: Note) => {
  console.log('Clicked announcement:', note)
  // 👉 Replace with modal, navigation, or toast
  // e.g., router.push(`/announcements/${note.id}`)
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
