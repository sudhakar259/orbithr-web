<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

export interface NavItem {
  label: string
  to: string | { name: string }
  icon?: string
  badge?: string | number | null
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

const props = withDefaults(
  defineProps<{
    groups: NavGroup[]
    collapsed?: boolean
  }>(),
  {
    collapsed: false,
  },
)

const route = useRoute()

function isActive(item: NavItem): boolean {
  if (typeof item.to === 'string') return route.path === item.to
  return String(route.name) === String(item.to.name)
}

const visibleGroups = computed(() => props.groups)
</script>

<template>
  <nav
    :class="[
      'flex flex-col gap-6 px-3 py-4',
      collapsed ? 'items-center' : '',
    ]"
  >
    <div v-for="(group, gIdx) in visibleGroups" :key="gIdx" class="space-y-1">
      <p
        v-if="group.label && !collapsed"
        class="px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500"
      >
        {{ group.label }}
      </p>

      <RouterLink
        v-for="item in group.items"
        :key="item.label"
        :to="item.to"
        :class="[
          'group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150',
          collapsed ? 'h-10 w-10 justify-center' : 'px-3 py-2',
          isActive(item)
            ? 'bg-[var(--ds-sidebar-active-bg)] text-[var(--ds-sidebar-active-text)]'
            : 'text-[var(--ds-sidebar-text)] hover:bg-white/5 hover:text-white',
        ]"
      >
        <span
          v-if="isActive(item) && !collapsed"
          class="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-primary-400"
          aria-hidden="true"
        />
        <span
          v-if="item.icon"
          class="flex h-5 w-5 flex-shrink-0 items-center justify-center"
          v-html="item.icon"
        />
        <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
        <span
          v-if="!collapsed && item.badge != null"
          class="ml-auto rounded-full bg-primary-500/20 px-2 py-0.5 text-[10px] font-semibold text-primary-300"
        >
          {{ item.badge }}
        </span>
      </RouterLink>
    </div>
  </nav>
</template>
