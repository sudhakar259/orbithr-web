<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="confirmState.show" class="confirm-overlay" @click.self="cancel">
        <div class="confirm-box">
          <div class="cb-icon">⚠️</div>
          <div class="cb-title">{{ confirmState.title }}</div>
          <div class="cb-msg">{{ confirmState.message }}</div>
          <div class="cb-actions">
            <button class="cb-cancel" @click="cancel">Cancel</button>
            <button class="cb-ok" @click="accept">Confirm</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
const { confirmState, accept, cancel } = useConfirm()
</script>

<style scoped>
.confirm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.65);
  backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;
  z-index: 9998; padding: 16px;
}
.confirm-box {
  background: var(--surface); border: 1px solid var(--border-hi); border-radius: var(--r);
  padding: 32px 28px; max-width: 360px; width: 100%;
  text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,.6);
}
.cb-icon  { font-size: 32px; margin-bottom: 14px; }
.cb-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: var(--text); }
.cb-msg   { font-size: 13px; color: var(--muted); margin-bottom: 24px; line-height: 1.5; }
.cb-actions { display: flex; gap: 10px; justify-content: center; }
.cb-cancel {
  padding: 9px 22px; border-radius: var(--rs); border: 1px solid var(--border);
  background: var(--surface2); color: var(--dim); font-size: 13px; font-weight: 500;
  cursor: pointer; font-family: inherit; transition: all .14s;
}
.cb-cancel:hover { border-color: var(--border-hi); color: var(--text); }
.cb-ok {
  padding: 9px 22px; border-radius: var(--rs); border: none;
  background: var(--red); color: #fff; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .15s;
  box-shadow: 0 0 16px rgba(255,107,107,.3);
}
.cb-ok:hover { background: #e05555; transform: translateY(-1px); }
.modal-enter-active, .modal-leave-active { transition: all .22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.94); }
</style>
