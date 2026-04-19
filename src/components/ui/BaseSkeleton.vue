<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'text' | 'rect' | 'circle'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    width?: string
    height?: string
    lines?: number
    rounded?: boolean
  }>(),
  {
    variant: 'text',
    lines: 1,
    rounded: true,
  },
)

const style = computed(() => ({
  width: props.width,
  height: props.height,
}))

const shapeClass = computed(() => {
  if (props.variant === 'circle') return 'rounded-full'
  if (props.variant === 'rect') return props.rounded ? 'rounded-lg' : ''
  return 'rounded'
})
</script>

<template>
  <span
    v-if="variant !== 'text' || lines <= 1"
    :class="[
      'block animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-surface-3 dark:via-surface-2 dark:to-surface-3 bg-[length:400px_100%] animate-shimmer',
      shapeClass,
      variant === 'text' && !height ? 'h-3' : '',
      variant === 'circle' && !width ? 'h-10 w-10' : '',
      variant === 'rect' && !height ? 'h-24' : '',
    ]"
    :style="style"
  />
  <span v-else class="block space-y-2">
    <span
      v-for="i in lines"
      :key="i"
      class="block h-3 rounded animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-surface-3 dark:via-surface-2 dark:to-surface-3 bg-[length:400px_100%] animate-shimmer"
      :style="{ width: i === lines ? '60%' : '100%' }"
    />
  </span>
</template>
