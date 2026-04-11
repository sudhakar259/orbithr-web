<script setup lang="ts">
import { computed } from 'vue'

type Variant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'primary'
  | 'neutral'
type Size = 'sm' | 'md'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    dot?: boolean
  }>(),
  {
    variant: 'neutral',
    size: 'sm',
    dot: false,
  },
)

const sizeClass = computed(
  () =>
    ({
      sm: 'text-xs px-2 py-0.5 gap-1',
      md: 'text-sm px-2.5 py-1 gap-1.5',
    })[props.size],
)

const variantClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-success-light text-success-dark dark:bg-success-base/15 dark:text-success-muted'
    case 'warning':
      return 'bg-warning-light text-warning-dark dark:bg-warning-base/15 dark:text-warning-muted'
    case 'danger':
      return 'bg-danger-light text-danger-dark dark:bg-danger-base/15 dark:text-danger-muted'
    case 'info':
      return 'bg-info-light text-info-dark dark:bg-info-base/15 dark:text-info-muted'
    case 'primary':
      return 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
    case 'neutral':
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-surface-3 dark:text-slate-300'
  }
})

const dotClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-success-base'
    case 'warning':
      return 'bg-warning-base'
    case 'danger':
      return 'bg-danger-base'
    case 'info':
      return 'bg-info-base'
    case 'primary':
      return 'bg-primary-500'
    default:
      return 'bg-slate-400 dark:bg-slate-500'
  }
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium rounded-full whitespace-nowrap',
      sizeClass,
      variantClass,
    ]"
  >
    <span v-if="dot" :class="['h-1.5 w-1.5 rounded-full', dotClass]" />
    <slot />
  </span>
</template>
