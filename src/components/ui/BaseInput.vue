<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    label?: string
    placeholder?: string
    error?: string
    hint?: string
    type?: string
    disabled?: boolean
    readonly?: boolean
    required?: boolean
    iconLeft?: boolean
    iconRight?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    type: 'text',
    disabled: false,
    readonly: false,
    required: false,
    iconLeft: false,
    iconRight: false,
    size: 'md',
  },
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
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

const inputClasses = computed(() => [
  'w-full rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 ' +
    'dark:bg-surface-2 dark:text-slate-100 dark:placeholder:text-slate-500 ' +
    'transition-all duration-150 outline-none ' +
    'focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed',
  sizeClass.value,
  props.iconLeft ? 'pl-10' : 'pl-3',
  props.iconRight ? 'pr-10' : 'pr-3',
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
      <span
        v-if="iconLeft"
        class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500 pointer-events-none"
      >
        <slot name="icon-left" />
      </span>

      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :class="inputClasses"
        @input="
          $emit(
            'update:modelValue',
            ($event.target as HTMLInputElement).value,
          )
        "
      />

      <span
        v-if="iconRight"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 dark:text-slate-500 pointer-events-none"
      >
        <slot name="icon-right" />
      </span>
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
