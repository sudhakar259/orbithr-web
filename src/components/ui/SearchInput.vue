<template>
  <div class="si-wrap" :class="{ focused }">
    <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" class="si-icon">
      <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
    </svg>
    <input
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @focus="focused = true"
      @blur="focused = false"
      @keydown.escape="$emit('update:modelValue', '')"
    />
    <button v-if="modelValue" class="si-clear" @click="$emit('update:modelValue', '')">✕</button>
    <kbd v-if="!modelValue && shortcut" class="si-kbd">{{ shortcut }}</kbd>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
withDefaults(defineProps<{ modelValue: string; placeholder?: string; shortcut?: string }>(), {
  placeholder: 'Search…',
})
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
const focused = ref(false)
</script>

<style scoped>
.si-wrap {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 8px 12px; transition: border-color .15s; min-width: 200px;
}
.si-wrap.focused { border-color: var(--accent); }
.si-icon { color: var(--muted); flex-shrink: 0; }
input { background: none; border: none; outline: none; color: var(--text); font-size: 13px; font-family: inherit; flex: 1; min-width: 0; }
input::placeholder { color: var(--muted); }
.si-clear { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 11px; padding: 0; transition: color .1s; }
.si-clear:hover { color: var(--text); }
.si-kbd { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; font-size: 10px; color: var(--muted); flex-shrink: 0; }
</style>
