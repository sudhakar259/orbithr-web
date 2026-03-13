<template>
  <div :class="['rounded-2xl bg-white shadow-md border border-gray-100', isExpanded ? 'lg:col-span-2 xl:col-span-2' : '']">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <div>
        <h3 class="text-base font-semibold text-slate-800">{{ title }}</h3>
        <p v-if="description" class="text-xs text-slate-500 mt-0.5">{{ description }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NestedMenu v-if="menuItems && menuItems.length" :items="menuItems" />
        <button
          v-if="expandable"
          type="button"
          class="rounded-md p-1.5 text-slate-600 hover:bg-gray-50 border border-gray-200"
          :aria-pressed="isExpanded"
          :title="isExpanded ? 'Collapse' : 'Expand width'"
          @click="isExpanded = !isExpanded"
        >
          <svg v-if="!isExpanded" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
            <path d="M3.75 9A2.25 2.25 0 016 6.75h3a.75.75 0 000-1.5H6A3.75 3.75 0 002.25 9v3a.75.75 0 001.5 0V9zM21.75 15A2.25 2.25 0 0119.5 17.25h-3a.75.75 0 000 1.5h3A3.75 3.75 0 0024 15v-3a.75.75 0 00-1.5 0v3zM8.47 8.47a.75.75 0 011.06 0L12 10.94l2.47-2.47a.75.75 0 111.06 1.06L13.06 12l2.47 2.47a.75.75 0 11-1.06 1.06L12 13.06l-2.47 2.47a.75.75 0 11-1.06-1.06L10.94 12 8.47 9.53a.75.75 0 010-1.06z"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
            <path d="M9 2.25a.75.75 0 000 1.5h3A2.25 2.25 0 0114.25 6v3a.75.75 0 001.5 0V6A3.75 3.75 0 0012 2.25H9zM15 21.75a.75.75 0 000-1.5h-3A2.25 2.25 0 019.75 18v-3a.75.75 0 00-1.5 0v3A3.75 3.75 0 0012 21.75h3zM15.53 8.47a.75.75 0 010 1.06L13.06 12l2.47 2.47a.75.75 0 11-1.06 1.06L12 13.06l-2.47 2.47a.75.75 0 11-1.06-1.06L10.94 12 8.47 9.53a.75.75 0 111.06-1.06L12 10.94l2.47-2.47a.75.75 0 011.06 0z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="p-5">
      <slot />
      <div v-if="$slots.expanded && isExpanded" class="mt-5 border-t border-gray-100 pt-5">
        <slot name="expanded" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NestedMenu from './NestedMenu.vue'

interface MenuItem {
  label: string
  icon?: string
  children?: MenuItem[]
  action?: () => void
}

interface Props {
  title: string
  description?: string
  menuItems?: MenuItem[]
  expandable?: boolean
}

const props = defineProps<Props>()
const isExpanded = ref(false)
</script>
