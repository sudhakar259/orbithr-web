<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(
  defineProps<{
    show: boolean
    title?: string
    size?: Size
    persistent?: boolean
  }>(),
  {
    show: false,
    size: 'md',
    persistent: false,
  },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:show', value: boolean): void
}>()

const sizeClass = computed(
  () =>
    ({
      sm: 'max-w-sm',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
    })[props.size],
)

function close() {
  if (props.persistent) return
  emit('close')
  emit('update:show', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.show) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

watch(
  () => props.show,
  (v) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = v ? 'hidden' : ''
    }
  },
)
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    leave-active-class="transition-opacity duration-150"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      @click.self="close"
    >
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-150 ease-in"
        enter-from-class="opacity-0 scale-95 translate-y-2"
        leave-to-class="opacity-0 scale-95 translate-y-2"
        appear
      >
        <div
          v-if="show"
          :class="[
            'relative w-full rounded-2xl border shadow-xl',
            'bg-white border-slate-200',
            'dark:bg-surface-2 dark:border-surface-3',
            sizeClass,
          ]"
          role="dialog"
          aria-modal="true"
        >
          <header
            v-if="title || $slots.header"
            class="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-surface-3 px-6 py-4"
          >
            <div class="flex-1">
              <slot name="header">
                <h3
                  class="text-lg font-semibold text-slate-900 dark:text-slate-100"
                >
                  {{ title }}
                </h3>
              </slot>
            </div>
            <button
              type="button"
              class="rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-surface-3 transition"
              aria-label="Close"
              @click="close"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </header>

          <div class="px-6 py-5 text-sm text-slate-700 dark:text-slate-300">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-surface-3 px-6 py-4"
          >
            <slot name="footer" />
          </footer>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
