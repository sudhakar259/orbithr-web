<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'success' | 'warning' | 'error' | 'info'

const props = withDefaults(
  defineProps<{
    id?: number | string
    variant?: Variant
    title?: string
    message?: string
  }>(),
  {
    variant: 'info',
  },
)

defineEmits<{
  (e: 'dismiss', id: number | string | undefined): void
}>()

const styles = computed(() => {
  switch (props.variant) {
    case 'success':
      return {
        ring: 'ring-success-base/25',
        icon: 'text-success-base bg-success-base/15',
      }
    case 'warning':
      return {
        ring: 'ring-warning-base/25',
        icon: 'text-warning-base bg-warning-base/15',
      }
    case 'error':
      return {
        ring: 'ring-danger-base/25',
        icon: 'text-danger-base bg-danger-base/15',
      }
    case 'info':
    default:
      return {
        ring: 'ring-info-base/25',
        icon: 'text-info-base bg-info-base/15',
      }
  }
})
</script>

<template>
  <div
    :class="[
      'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl p-4 shadow-lg ring-1',
      'bg-white dark:bg-surface-2 ring-slate-200 dark:ring-surface-3',
      styles.ring,
      'animate-fade-up',
    ]"
    role="status"
  >
    <span
      :class="[
        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
        styles.icon,
      ]"
    >
      <svg
        v-if="variant === 'success'"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
      <svg
        v-else-if="variant === 'warning'"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L12.8 4a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z"
        />
      </svg>
      <svg
        v-else-if="variant === 'error'"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      <svg
        v-else
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </span>

    <div class="flex-1 min-w-0">
      <p
        v-if="title"
        class="text-sm font-semibold text-slate-900 dark:text-slate-100"
      >
        {{ title }}
      </p>
      <p class="text-sm text-slate-600 dark:text-slate-300 break-words">
        {{ message }}
        <slot />
      </p>
    </div>

    <button
      type="button"
      class="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
      aria-label="Dismiss"
      @click="$emit('dismiss', id)"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
</template>
