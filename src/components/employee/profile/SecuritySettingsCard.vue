<template>
  <SectionCard title="Security Settings" description="Manage password, 2FA, and notifications">
    <div class="sec-wrap">
      <!-- Change Password -->
      <form class="sec-section" @submit.prevent="$emit('change-password', { current, next: nextPassword })">
        <h3 class="sec-subtitle">Change Password</h3>
        <div class="sec-pw-grid">
          <input v-model="current" type="password" placeholder="Current password" class="sec-input" />
          <input v-model="nextPassword" type="password" placeholder="New password" class="sec-input" />
          <input v-model="confirm" type="password" placeholder="Confirm new password" class="sec-input" />
        </div>
        <div class="sec-actions">
          <button class="sec-btn-primary" type="submit" :disabled="!canSubmit">Update Password</button>
        </div>
      </form>

      <!-- 2FA -->
      <div class="sec-section">
        <h3 class="sec-subtitle">Two-Factor Authentication</h3>
        <label class="sec-check-label">
          <input type="checkbox" v-model="twofa" class="sec-checkbox" />
          Enable 2FA
        </label>
        <p class="sec-hint">Use an authenticator app to secure your account.</p>
        <div class="sec-actions">
          <button class="sec-btn-ghost" @click="$emit('toggle-2fa', twofa)">Save 2FA</button>
        </div>
      </div>

      <!-- Notifications -->
      <div class="sec-section">
        <h3 class="sec-subtitle">Notifications</h3>
        <div class="sec-notif-grid">
          <label class="sec-check-label"><input type="checkbox" v-model="notif.email" class="sec-checkbox" /> Email updates</label>
          <label class="sec-check-label"><input type="checkbox" v-model="notif.sms" class="sec-checkbox" /> SMS alerts</label>
          <label class="sec-check-label"><input type="checkbox" v-model="notif.push" class="sec-checkbox" /> Push notifications</label>
          <label class="sec-check-label"><input type="checkbox" v-model="notif.news" class="sec-checkbox" /> Product news</label>
        </div>
        <div class="sec-actions">
          <button class="sec-btn-ghost" @click="$emit('save-notifications', notif)">Save Preferences</button>
        </div>
      </div>
    </div>
  </SectionCard>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import SectionCard from './SectionCard.vue'

const current = ref('')
const nextPassword = ref('')
const confirm = ref('')
const canSubmit = computed(() => !!current.value && nextPassword.value.length >= 6 && nextPassword.value === confirm.value)
const twofa = ref(false)
const notif = reactive({ email: true, sms: false, push: true, news: false })

defineEmits<{
  (e: 'change-password', payload: { current: string; next: string }): void
  (e: 'toggle-2fa', enabled: boolean): void
  (e: 'save-notifications', prefs: { email: boolean; sms: boolean; push: boolean; news: boolean }): void
}>()
</script>

<style scoped>
.sec-wrap { display: flex; flex-direction: column; gap: 20px; }
.sec-section { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px solid #232936; }
.sec-section:first-child { border-top: none; padding-top: 0; }
.sec-subtitle { margin: 0; font-size: 13px; font-weight: 600; color: #EEF0F4; }
.sec-pw-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
.sec-input {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 8px 12px; outline: none;
  transition: border-color 0.15s; width: 100%; box-sizing: border-box;
}
.sec-input:focus { border-color: #6B5BFF; }
.sec-hint { margin: 0; font-size: 12px; color: #7A8299; }
.sec-check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.sec-checkbox { accent-color: #6B5BFF; width: 14px; height: 14px; }
.sec-notif-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.sec-actions { display: flex; justify-content: flex-end; }
.sec-btn-primary {
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
}
.sec-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.sec-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.sec-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; transition: background 0.15s;
}
.sec-btn-ghost:hover { background: #232936; }
</style>
