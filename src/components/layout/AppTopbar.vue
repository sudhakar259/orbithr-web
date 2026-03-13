<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { ref } from 'vue'

const router = useRouter()
const { user, logout, isAuthenticated, roles } = useAuth()

function handleLogout() {
  logout()
  router.push({ name: 'login' })
}

const hasImpersonation = ref(!!localStorage.getItem('orbithr_impersonate_backup'))
function stopImpersonation() {
  const backup = localStorage.getItem('orbithr_impersonate_backup')
  if (backup) {
    localStorage.setItem('orbithr_token', backup)
    localStorage.removeItem('orbithr_impersonate_backup')
    window.location.reload()
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-30 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200"
  >
    <div class="flex h-16 items-center justify-between px-4">
      <div class="flex items-center gap-3">
        <div class="relative">
          <input
            type="text"
            placeholder="Search employees, policies, payroll…"
            class="w-72 md:w-96 rounded-lg border-slate-300 focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
      </div>
      <div class="flex items-center gap-4">
        <button v-if="hasImpersonation" class="btn-ghost" @click="stopImpersonation">Return to admin</button>
        <div v-if="isAuthenticated()" class="flex items-center gap-3">
          <div
            class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
          >
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white"
              >{{ user?.name ? user.name.charAt(0) : 'U' }}</span
            >
            <span class="hidden md:inline">{{ user?.name || 'User' }}</span>
            <span
              class="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
              >{{ roles().join(', ') }}</span
            >
          </div>
          <button @click="handleLogout" class="text-sm text-slate-600">Logout</button>
        </div>
        <div v-else>
          <RouterLink
            to="/login"
            class="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >Sign in</RouterLink
          >
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped></style>
