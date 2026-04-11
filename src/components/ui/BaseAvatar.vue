<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type Status = 'online' | 'offline' | 'away' | null

const props = withDefaults(
  defineProps<{
    name?: string
    src?: string | null
    size?: Size
    status?: Status
  }>(),
  {
    size: 'md',
    status: null,
  },
)

const failed = ref(false)
watch(
  () => props.src,
  () => (failed.value = false),
)

const sizeClass = computed(
  () =>
    ({
      xs: 'h-6 w-6 text-[10px]',
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    })[props.size],
)

const statusSize = computed(
  () =>
    ({
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
      xl: 'h-3.5 w-3.5',
    })[props.size],
)

const initials = computed(() => {
  if (!props.name) return '?'
  return props.name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
})

// Deterministic bg color from the name
const bgClass = computed(() => {
  const palette = [
    'bg-primary-500 text-white',
    'bg-accent-500 text-white',
    'bg-info-base text-white',
    'bg-success-base text-white',
    'bg-warning-base text-white',
    'bg-danger-base text-white',
  ]
  const seed = (props.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return palette[seed % palette.length]
})

const statusColor = computed(() => {
  switch (props.status) {
    case 'online':
      return 'bg-success-base'
    case 'away':
      return 'bg-warning-base'
    case 'offline':
      return 'bg-slate-400'
    default:
      return ''
  }
})
</script>

<template>
  <span
    :class="[
      'relative inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-white dark:ring-surface-1',
      sizeClass,
      !src || failed ? bgClass : '',
    ]"
  >
    <img
      v-if="src && !failed"
      :src="src"
      :alt="name || 'Avatar'"
      class="h-full w-full rounded-full object-cover"
      @error="failed = true"
    />
    <template v-else>{{ initials }}</template>

    <span
      v-if="status"
      :class="[
        'absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-surface-1',
        statusSize,
        statusColor,
      ]"
    />
  </span>
</template>
