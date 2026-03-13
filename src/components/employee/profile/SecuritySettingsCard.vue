<template>
  <SectionCard title="Security Settings" description="Manage password, 2FA, and notifications">
    <div class="space-y-8">
      <form class="space-y-3" @submit.prevent="$emit('change-password', { current, next: nextPassword })">
        <h3 class="text-sm font-semibold text-slate-700">Change Password</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input v-model="current" type="password" placeholder="Current password" class="input" />
          <input v-model="nextPassword" type="password" placeholder="New password" class="input" />
          <input v-model="confirm" type="password" placeholder="Confirm new password" class="input" />
        </div>
        <div class="flex justify-end">
          <button class="btn-primary" type="submit" :disabled="!canSubmit">Update Password</button>
        </div>
      </form>

      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-slate-700">Two-Factor Authentication</h3>
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" v-model="twofa" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          Enable 2FA
        </label>
        <div class="text-xs text-slate-500">Use an authenticator app to secure your account.</div>
        <div class="flex justify-end">
          <button class="btn-ghost" @click="$emit('toggle-2fa', twofa)">Save 2FA</button>
        </div>
      </div>

      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-slate-700">Notifications</h3>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="notif.email" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" /> Email updates</label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="notif.sms" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" /> SMS alerts</label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="notif.push" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" /> Push notifications</label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="notif.news" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" /> Product news</label>
        </div>
        <div class="flex justify-end">
          <button class="btn-ghost" @click="$emit('save-notifications', notif)">Save Preferences</button>
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

defineEmits<{ (e: 'change-password', payload: { current: string; next: string }): void; (e: 'toggle-2fa', enabled: boolean): void; (e: 'save-notifications', prefs: { email: boolean; sms: boolean; push: boolean; news: boolean }): void }>()
</script>
