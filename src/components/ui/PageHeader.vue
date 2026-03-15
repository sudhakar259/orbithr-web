<template>
  <div class="ph">
    <div class="ph-left">
      <router-link v-if="backTo" :to="backTo" class="ph-back">← {{ backLabel }}</router-link>
      <div v-if="breadcrumbs.length" class="ph-breadcrumb">
        <span v-for="(b, i) in breadcrumbs" :key="b.label">
          <router-link v-if="b.to" :to="b.to" class="bc-link">{{ b.label }}</router-link>
          <span v-else class="bc-cur">{{ b.label }}</span>
          <span v-if="i < breadcrumbs.length - 1" class="bc-sep"> / </span>
        </span>
      </div>
      <h1 class="ph-title">{{ title }}</h1>
      <p v-if="subtitle" class="ph-sub">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="ph-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Breadcrumb { label: string; to?: string }
withDefaults(defineProps<{
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  breadcrumbs?: Breadcrumb[]
}>(), { breadcrumbs: () => [], backLabel: 'Back' })
</script>

<style scoped>
.ph { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 4px; }
.ph-left { display: flex; flex-direction: column; gap: 3px; }
.ph-back { font-size: 12px; color: var(--accent); text-decoration: none; margin-bottom: 2px; transition: opacity .14s; }
.ph-back:hover { opacity: .7; }
.ph-breadcrumb { display: flex; align-items: center; font-size: 12px; color: var(--muted); margin-bottom: 2px; }
.bc-link { color: var(--muted); text-decoration: none; transition: color .14s; }
.bc-link:hover { color: var(--text); }
.bc-cur { color: var(--dim); }
.bc-sep { color: var(--muted); }
.ph-title { font-size: 22px; font-weight: 700; letter-spacing: -.3px; color: var(--text); }
.ph-sub { font-size: 13px; color: var(--muted); }
.ph-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
