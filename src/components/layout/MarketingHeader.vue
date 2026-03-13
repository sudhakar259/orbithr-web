<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
const open = ref(false)
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-slate-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60"
  >
    <div class="container flex h-16 items-center justify-between">
      <RouterLink to="/" class="flex items-center gap-2">
        <span
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-soft"
          >OH</span
        >
        <span class="text-lg font-semibold tracking-tight">OrbitHR</span>
      </RouterLink>
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-700">
        <RouterLink to="/" class="hover:text-slate-900">Features</RouterLink>
        <RouterLink to="/pricing" class="hover:text-slate-900">Pricing</RouterLink>
        <RouterLink to="/app" class="hover:text-slate-900">App</RouterLink>
        <a href="#customers" class="hover:text-slate-900">Customers</a>
        <a href="#faq" class="hover:text-slate-900">FAQ</a>
      </nav>
      <div class="hidden md:flex items-center gap-3">
        <RouterLink to="/login" class="text-sm font-medium text-slate-700 hover:text-slate-900"
          >Sign In</RouterLink
        >
        <RouterLink
          to="/register"
          class="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand-700"
          >Start free trial</RouterLink
        >
      </div>

      <button class="md:hidden" @click="open = !open" aria-label="Toggle menu">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
    <div v-if="open" class="md:hidden border-t border-slate-200">
      <nav class="container py-4 grid gap-3">
        <RouterLink to="/" class="py-2">Features</RouterLink>
        <RouterLink to="/pricing" class="py-2">Pricing</RouterLink>
        <a href="#customers" class="py-2">Customers</a>
        <a href="#faq" class="py-2">FAQ</a>
        <RouterLink
          to="/register"
          class="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-brand-700"
          >Start free trial</RouterLink
        >
      </nav>
    </div>
  </header>
</template>

<style scoped></style>
