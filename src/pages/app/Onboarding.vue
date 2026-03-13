<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const step = ref(1)
const router = useRouter()
const inviteEmail = ref('')
const invited = ref<string[]>([])
const loading = ref(false)
const error = ref('')

async function sendInvite() {
  if (!inviteEmail.value) return
  loading.value = true
  try {
    // POST to backend invites endpoint
    await api.post('/invitations', { email: inviteEmail.value })
    invited.value.push(inviteEmail.value)
    inviteEmail.value = ''
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Failed to invite'
  } finally {
    loading.value = false
  }
}

function next() {
  if (step.value < 3) step.value++
  else router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">Onboarding</h1>
      <p class="text-slate-600">Quick setup to get your team started.</p>
    </div>

    <div v-if="step === 1" class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 class="text-lg font-semibold">Add teammates</h2>
      <p class="mt-2 text-sm text-slate-600">
        Invite team members (you can skip and invite later).
      </p>
      <div class="mt-4 flex gap-3">
        <input
          v-model="inviteEmail"
          placeholder="email@company.com"
          class="flex-1 rounded-lg border-slate-300 px-3 py-2"
        />
        <button
          @click="sendInvite"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Invite
        </button>
      </div>
      <ul class="mt-4 space-y-2 text-sm">
        <li v-for="e in invited" :key="e" class="flex items-center justify-between">
          <span>{{ e }}</span
          ><span class="text-slate-500">Invited</span>
        </li>
      </ul>
      <div class="mt-4 text-right">
        <button
          @click="next"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Next
        </button>
      </div>
    </div>

    <div v-if="step === 2" class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 class="text-lg font-semibold">Setup company defaults</h2>
      <p class="mt-2 text-sm text-slate-600">Working hours, leave policies, and payroll cycle.</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label class="block text-sm text-slate-600">Working hours</label>
          <input
            class="mt-1 w-full rounded-lg border-slate-300 px-3 py-2"
            placeholder="9:00 - 18:00"
          />
        </div>
        <div>
          <label class="block text-sm text-slate-600">Payroll cycle</label>
          <select class="mt-1 w-full rounded-lg border-slate-300 px-3 py-2">
            <option>Monthly</option>
            <option>Bi-weekly</option>
          </select>
        </div>
      </div>
      <div class="mt-4 text-right">
        <button
          @click="next"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Finish
        </button>
      </div>
    </div>

    <div v-if="step === 3" class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 class="text-lg font-semibold">You're all set</h2>
      <p class="mt-2 text-sm text-slate-600">
        Your workspace is ready. Start by adding employees or running payroll.
      </p>
      <div class="mt-4 text-right">
        <button
          @click="next"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  </div>
</template>
