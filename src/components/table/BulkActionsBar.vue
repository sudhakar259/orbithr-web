<template>
  <div class="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800">
    <div>{{ count }} selected</div>
    <div class="flex gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ count: number }>()
</script>
