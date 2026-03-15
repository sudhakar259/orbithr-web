<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="!persistent && $emit('update:modelValue', false)">
        <div class="modal" :style="maxWidth ? { maxWidth } : {}">
          <div class="modal-head">
            <div>
              <div class="modal-title">{{ title }}</div>
              <div v-if="subtitle" class="modal-sub">{{ subtitle }}</div>
            </div>
            <button v-if="!persistent" class="mc" @click="$emit('update:modelValue', false)">✕</button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="modal-foot">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  title: string
  subtitle?: string
  maxWidth?: string
  persistent?: boolean
}>(), { maxWidth: '500px' })
defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.65);
  backdrop-filter: blur(4px); display: flex; align-items: center;
  justify-content: center; z-index: 1000; padding: 16px;
}
.modal {
  background: var(--surface); border: 1px solid var(--border-hi); border-radius: var(--r);
  width: 100%; box-shadow: 0 24px 60px rgba(0,0,0,.6);
  display: flex; flex-direction: column; max-height: 90vh; overflow: hidden;
}
.modal-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 22px 24px 18px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.modal-title { font-size: 18px; font-weight: 700; color: var(--text); }
.modal-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
.mc {
  width: 28px; height: 28px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; cursor: pointer; color: var(--muted); font-size: 12px;
  display: grid; place-items: center; flex-shrink: 0; transition: color .1s;
}
.mc:hover { color: var(--text); }
.modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
.modal-foot {
  padding: 16px 24px; border-top: 1px solid var(--border);
  display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0;
}
.modal-enter-active, .modal-leave-active { transition: all .22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.96) translateY(-8px); }
</style>
