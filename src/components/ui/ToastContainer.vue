<template>
  <teleport to="body">
    <div class="toast-container">
      <transition-group name="toast-slide" tag="div" style="display:flex;flex-direction:column;gap:8px">
        <div v-for="t in toasts" :key="t.id" class="toast-item" :class="t.type">
          <span class="toast-icon">{{ icons[t.type as keyof typeof icons] }}</span>
          <span class="toast-msg">{{ t.message }}</span>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
const { toasts } = useToast()
const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }
</script>

<style scoped>
.toast-container {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999; pointer-events: none;
}
.toast-item {
  display: flex; align-items: center; gap: 10px; padding: 12px 18px;
  border-radius: 10px; font-size: 13px; font-weight: 600;
  box-shadow: 0 8px 28px rgba(0,0,0,.4); min-width: 240px; pointer-events: auto;
}
.toast-item.success { background: #36D399; color: #fff; }
.toast-item.error   { background: #FF6B6B; color: #fff; }
.toast-item.warning { background: #F9A825; color: #fff; }
.toast-item.info    { background: #4F7EFF; color: #fff; box-shadow: 0 8px 28px rgba(79,126,255,.4); }
.toast-icon { font-size: 14px; font-weight: 700; }

.toast-slide-enter-active { transition: all .3s ease; }
.toast-slide-leave-active { transition: all .25s ease; }
.toast-slide-enter-from   { opacity: 0; transform: translateX(30px); }
.toast-slide-leave-to     { opacity: 0; transform: translateX(30px); }
</style>
