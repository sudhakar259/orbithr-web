<template>
  <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-sm text-slate-600">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <div class="mt-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string }>(), {})
</script>
