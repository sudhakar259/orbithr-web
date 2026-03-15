<template>
  <div class="spinner-wrap" :class="size">
    <div class="spinner" :style="spinnerStyle"></div>
    <div v-if="label" class="spinner-label">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{
  size?: 'sm' | 'md' | 'lg'
  color?: string
  label?: string
}>(), { size: 'md', color: 'var(--accent)' })

const sizes = { sm: '16px', md: '28px', lg: '44px' }
const spinnerStyle = computed(() => ({
  width: sizes[props.size],
  height: sizes[props.size],
  borderTopColor: props.color,
}))
</script>

<style scoped>
.spinner-wrap { display: inline-flex; flex-direction: column; align-items: center; gap: 10px; }
.spinner {
  border: 2px solid rgba(255,255,255,.1); border-radius: 50%;
  animation: spin .7s linear infinite; flex-shrink: 0;
}
.spinner-wrap.lg .spinner { border-width: 3px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spinner-label { font-size: 12px; color: var(--muted); }
</style>
