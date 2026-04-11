<script setup lang="ts">
import { computed } from 'vue'

type Padding = 'none' | 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    padding?: Padding
    hover?: boolean
    bordered?: boolean
    as?: string
  }>(),
  {
    padding: 'md',
    hover: false,
    bordered: true,
    as: 'div',
  },
)

const paddingClass = computed(
  () =>
    ({
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-7',
    })[props.padding],
)

const classes = computed(() => [
  'bg-white dark:bg-surface-2 rounded-xl shadow-card dark:shadow-card-dark transition-all duration-200',
  props.bordered ? 'border border-slate-200 dark:border-surface-3' : '',
  props.hover
    ? 'hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer'
    : '',
  paddingClass.value,
])
</script>

<template>
  <component :is="as" :class="classes">
    <header v-if="$slots.header" class="mb-4 flex items-start justify-between gap-4">
      <slot name="header" />
    </header>
    <slot />
    <footer v-if="$slots.footer" class="mt-4 flex items-center justify-end gap-2">
      <slot name="footer" />
    </footer>
  </component>
</template>
