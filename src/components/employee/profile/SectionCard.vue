<template>
  <div class="section-card">
    <div class="section-card-header">
      <div>
        <h2 class="section-card-title">{{ title }}</h2>
        <p v-if="description" class="section-card-desc">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="section-card-actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="section-card-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string }>(), {})
</script>

<style scoped>
.section-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 20px;
}
.section-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.section-card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #EEF0F4;
  letter-spacing: 0.01em;
}
.section-card-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #7A8299;
}
.section-card-actions { flex-shrink: 0; }
.section-card-body { margin-top: 16px; }
</style>
