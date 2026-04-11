<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'info'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    icon?: string
    trend?: string | null
    variant?: Variant
  }>(),
  {
    variant: 'primary',
    trend: null,
  },
)

const variantStyles = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-success-base/10 text-success-base'
    case 'warning':
      return 'bg-warning-base/10 text-warning-base'
    case 'danger':
      return 'bg-danger-base/10 text-danger-base'
    case 'info':
      return 'bg-info-base/10 text-info-base'
    case 'primary':
    default:
      return 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
  }
})

const trendIsUp = computed(() => props.trend?.trim().startsWith('+'))
const trendIsDown = computed(() => props.trend?.trim().startsWith('-'))
</script>

<template>
  <div
    class="rounded-xl border border-slate-200 dark:border-surface-3 bg-white dark:bg-surface-2 p-5 shadow-card dark:shadow-card-dark transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {{ label }}
        </p>
        <p
          class="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white"
        >
          {{ value }}
        </p>
        <div
          v-if="trend"
          :class="[
            'mt-2 inline-flex items-center gap-1 text-xs font-medium',
            trendIsUp
              ? 'text-success-base'
              : trendIsDown
                ? 'text-danger-base'
                : 'text-slate-500 dark:text-slate-400',
          ]"
        >
          <svg
            v-if="trendIsUp"
            class="h-3 w-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
              clip-rule="evenodd"
            />
          </svg>
          <svg
            v-else-if="trendIsDown"
            class="h-3 w-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
          <span>{{ trend }}</span>
        </div>
      </div>

      <div
        :class="[
          'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
          variantStyles,
        ]"
      >
        <span v-if="icon" v-html="icon" />
        <slot v-else name="icon">
          <svg
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        </slot>
      </div>
    </div>
  </div>
</template>
