<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    loading?: boolean
    disabled?: boolean
    icon?: boolean
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    icon: false,
    type: 'button',
    block: false,
  },
)

defineEmits<{
  (e: 'click', ev: MouseEvent): void
}>()

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg border transition-all duration-150 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-1 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none'

const sizeClasses = computed(() => {
  if (props.icon) {
    return {
      sm: 'h-8 w-8 p-0 text-sm',
      md: 'h-10 w-10 p-0 text-base',
      lg: 'h-12 w-12 p-0 text-lg',
    }[props.size]
  }
  return {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }[props.size]
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return (
        'bg-primary-600 border-primary-600 text-white shadow-sm ' +
        'hover:bg-primary-700 hover:border-primary-700 ' +
        'active:bg-primary-800 active:border-primary-800 ' +
        'dark:bg-primary-500 dark:border-primary-500 dark:hover:bg-primary-600 dark:hover:border-primary-600'
      )
    case 'secondary':
      return (
        'bg-slate-100 border-slate-200 text-slate-900 ' +
        'hover:bg-slate-200 hover:border-slate-300 ' +
        'active:bg-slate-300 ' +
        'dark:bg-surface-2 dark:border-surface-3 dark:text-slate-100 ' +
        'dark:hover:bg-surface-3 dark:hover:border-surface-4'
      )
    case 'ghost':
      return (
        'bg-transparent border-transparent text-slate-700 ' +
        'hover:bg-slate-100 ' +
        'active:bg-slate-200 ' +
        'dark:text-slate-300 dark:hover:bg-surface-2 dark:hover:text-white'
      )
    case 'outline':
      return (
        'bg-transparent border-slate-300 text-slate-800 ' +
        'hover:bg-slate-50 hover:border-slate-400 ' +
        'active:bg-slate-100 ' +
        'dark:border-surface-3 dark:text-slate-100 dark:hover:bg-surface-2 dark:hover:border-surface-4'
      )
    case 'danger':
      return (
        'bg-danger-base border-danger-base text-white shadow-sm ' +
        'hover:brightness-95 ' +
        'active:brightness-90 ' +
        'focus-visible:ring-danger-base/40'
      )
    default:
      return ''
  }
})

const classes = computed(() => [
  base,
  sizeClasses.value,
  variantClasses.value,
  props.block ? 'w-full' : '',
])
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="classes"
    @click="$emit('click', $event)"
  >
    <svg
      v-if="loading"
      class="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
    <slot v-if="!loading || $slots.default" />
  </button>
</template>
