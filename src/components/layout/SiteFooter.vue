<script setup lang="ts"></script>

<template>
  <footer class="border-t border-slate-200 bg-white">
    <div class="container py-10 grid gap-8 md:grid-cols-4">
      <div>
        <div class="flex items-center gap-2">
          <span
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white"
            >OH</span
          >
          <span class="text-lg font-semibold">OrbitHR</span>
        </div>
        <p class="mt-3 text-sm text-slate-600">
          Modern SaaS for employee management. Directory, attendance, payroll, performance and more.
        </p>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-slate-900">Product</h4>
        <ul class="mt-3 space-y-2 text-sm text-slate-600">
          <li><RouterLink to="/" class="hover:text-slate-900">Features</RouterLink></li>
          <li><RouterLink to="/pricing" class="hover:text-slate-900">Pricing</RouterLink></li>
          <li><RouterLink to="/app" class="hover:text-slate-900">Sign in</RouterLink></li>
        </ul>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-slate-900">Resources</h4>
        <ul class="mt-3 space-y-2 text-sm text-slate-600">
          <li><a href="#" class="hover:text-slate-900">Docs</a></li>
          <li><a href="#" class="hover:text-slate-900">Guides</a></li>
          <li><a href="#" class="hover:text-slate-900">Support</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-slate-900">Company</h4>
        <ul class="mt-3 space-y-2 text-sm text-slate-600">
          <li><a href="#" class="hover:text-slate-900">About</a></li>
          <li><a href="#" class="hover:text-slate-900">Careers</a></li>
          <li><a href="#" class="hover:text-slate-900">Contact</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
      © <span>{{ new Date().getFullYear() }}</span> OrbitHR. All rights reserved.
    </div>
  </footer>
</template>

<style scoped></style>
