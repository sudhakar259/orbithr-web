<template>
  <div class="empty">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-msg">{{ message }}</div>
    <div v-if="sub" class="empty-sub">{{ sub }}</div>
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ icon?: string; message?: string; sub?: string }>(), {
  icon: '📭', message: 'No records found', sub: '',
})
</script>

<style scoped>
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; gap: 8px; }
.empty-icon { font-size: 36px; }
.empty-msg { font-size: 14px; font-weight: 500; color: var(--muted); }
.empty-sub { font-size: 12px; color: var(--muted); text-align: center; max-width: 280px; }
</style>
