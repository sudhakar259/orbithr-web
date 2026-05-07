<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  size?: number
  src?: string
}>(), { size: 32 })

const hue = computed(() =>
  (props.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 37) % 360
)
const initials = computed(() =>
  props.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
)
</script>

<template>
  <div
    class="av"
    :style="{
      width:      `${size}px`,
      height:     `${size}px`,
      fontSize:   `${Math.round(size * 0.35)}px`,
      background: src ? 'var(--surface2)' : `oklch(0.55 0.14 ${hue})`,
    }"
    :title="name"
  >
    <img v-if="src" :src="src" :alt="name" />
    <span v-else>{{ initials }}</span>
  </div>
</template>

<style scoped>
.av {
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.1);
}
.av img { width: 100%; height: 100%; object-fit: cover; }
</style>
