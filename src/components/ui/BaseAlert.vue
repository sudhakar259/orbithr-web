<script setup lang="ts">
import { computed, ref } from 'vue'

type Variant = 'success' | 'warning' | 'danger' | 'info'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    title?: string
    dismissible?: boolean
  }>(),
  {
    variant: 'info',
    dismissible: false,
  },
)

const emit = defineEmits<{
  (e: 'dismiss'): void
}>()

const dismissed = ref(false)
function dismiss() {
  dismissed.value = true
  emit('dismiss')
}

const styles = computed(() => {
  switch (props.variant) {
    case 'success':
      return {
        wrap: 'bg-success-light border-l-success-base text-success-dark dark:bg-success-base/10 dark:text-success-muted dark:border-l-success-base',
        icon: 'text-success-base',
      }
    case 'warning':
      return {
        wrap: 'bg-warning-light border-l-warning-base text-warning-dark dark:bg-warning-base/10 dark:text-warning-muted dark:border-l-warning-base',
        icon: 'text-warning-base',
      }
    case 'danger':
      return {
        wrap: 'bg-danger-light border-l-danger-base text-danger-dark dark:bg-danger-base/10 dark:text-danger-muted dark:border-l-danger-base',
        icon: 'text-danger-base',
      }
    case 'info':
    default:
      return {
        wrap: 'bg-info-light border-l-info-base text-info-dark dark:bg-info-base/10 dark:text-info-muted dark:border-l-info-base',
        icon: 'text-info-base',
      }
  }
})
</script>

<template>
  <div
    v-if="!dismissed"
    :class="[
      'relative flex items-start gap-3 rounded-lg border-l-4 p-4 text-sm',
      styles.wrap,
    ]"
    role="alert"
  >
    <!-- Icon -->
    <span :class="['mt-0.5 flex-shrink-0', styles.icon]">
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
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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
          d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3l-6.93-12a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z"
        />
      </svg>
      <svg
        v-else-if="variant === 'danger'"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
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

    <div class="flex-1">
      <p v-if="title" class="font-semibold mb-0.5">{{ title }}</p>
      <div class="text-sm opacity-90">
        <slot />
      </div>
    </div>

    <button
      v-if="dismissible"
      type="button"
      class="ml-2 flex-shrink-0 rounded p-1 opacity-60 hover:opacity-100 transition"
      aria-label="Dismiss"
      @click="dismiss"
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
