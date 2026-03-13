<template>
  <div class="relative">
    <span class="pointer-events-none absolute inset-y-0 left-2 flex items-center text-slate-400">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
        <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 104.236 12.06l3.727 3.727a.75.75 0 101.06-1.06l-3.727-3.727A6.75 6.75 0 0010.5 3.75zm-5.25 6.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0z" clip-rule="evenodd" />
      </svg>
    </span>
    <input
      :value="modelValue"
      @input="onInput"
      :placeholder="placeholder"
      type="text"
      class="h-9 w-full rounded-md border border-slate-300 pl-7 pr-7 text-sm text-slate-700 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    />
    <button v-if="modelValue" class="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600" @click="$emit('update:modelValue', '')" aria-label="Clear">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1.78-5.78a.75.75 0 101.06 1.06L10 11.06l.72.72a.75.75 0 101.06-1.06L11.06 10l.72-.72a.75.75 0 10-1.06-1.06L10 8.94l-.72-.72a.75.75 0 10-1.06 1.06L8.94 10l-.72.72z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>
