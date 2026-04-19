<script setup lang="ts">
import { computed, useId } from 'vue'

interface Option {
  value: string | number
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    label?: string
    options?: Option[]
    placeholder?: string
    error?: string
    hint?: string
    disabled?: boolean
    required?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    options: () => [],
    disabled: false,
    required: false,
    size: 'md',
  },
)

defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

const id = useId()

const sizeClass = computed(
  () =>
    ({
      sm: 'h-8 text-xs',
      md: 'h-10 text-sm',
      lg: 'h-12 text-base',
    })[props.size],
)

const selectClasses = computed(() => [
  'w-full appearance-none rounded-lg border bg-white text-slate-900 ' +
    'dark:bg-surface-2 dark:text-slate-100 ' +
    'pl-3 pr-10 transition-all duration-150 outline-none ' +
    'focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed',
  sizeClass.value,
  props.error
    ? 'border-danger-base focus:border-danger-base focus:ring-danger-base/20'
    : 'border-slate-300 dark:border-surface-3',
])
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="id"
      class="block mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
    >
      {{ label }}
      <span v-if="required" class="text-danger-base">*</span>
    </label>

    <div class="relative">
      <select
        :id="id"
        :value="modelValue ?? ''"
        :disabled="disabled"
        :required="required"
        :class="selectClasses"
        @change="
          $emit(
            'update:modelValue',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </select>
      <svg
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>

    <p v-if="error" class="mt-1.5 text-xs text-danger-base">{{ error }}</p>
    <p
      v-else-if="hint"
      class="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
    >
      {{ hint }}
    </p>
  </div>
</template>
