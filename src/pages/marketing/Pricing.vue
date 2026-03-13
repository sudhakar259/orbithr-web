<script setup lang="ts"></script>

<template>
  <section class="container py-16">
    <div class="mx-auto max-w-2xl text-center">
      <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">Pricing</h1>
      <p class="mt-3 text-slate-600">Simple pricing that scales with your team. Cancel anytime.</p>
    </div>
    <div class="mt-10 grid gap-6 lg:grid-cols-3">
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h3 class="text-lg font-semibold">Starter</h3>
        <p class="mt-1 text-sm text-slate-600">Up to 20 employees</p>
        <p class="mt-6 text-4xl font-extrabold">
          $49<span class="text-base font-semibold text-slate-500">/mo</span>
        </p>
        <ul class="mt-6 space-y-2 text-sm text-slate-600">
          <li>Directory & Documents</li>
          <li>Attendance & Leaves</li>
          <li>Email support</li>
        </ul>
        <RouterLink
          to="/app"
          class="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >Start</RouterLink
        >
      </div>
      <div class="rounded-xl border-2 border-brand-600 bg-white p-6 shadow-soft">
        <div
          class="inline-flex rounded-full bg-brand-600/10 px-2 py-1 text-xs font-semibold text-brand-700"
        >
          Most popular
        </div>
        <h3 class="mt-2 text-lg font-semibold">Growth</h3>
        <p class="mt-1 text-sm text-slate-600">Up to 200 employees</p>
        <p class="mt-6 text-4xl font-extrabold">
          $149<span class="text-base font-semibold text-slate-500">/mo</span>
        </p>
        <ul class="mt-6 space-y-2 text-sm text-slate-600">
          <li>Everything in Starter</li>
          <li>Payroll & Performance</li>
          <li>Priority support</li>
        </ul>
        <RouterLink
          to="/app"
          class="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >Start</RouterLink
        >
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h3 class="text-lg font-semibold">Enterprise</h3>
        <p class="mt-1 text-sm text-slate-600">Unlimited employees</p>
        <p class="mt-6 text-4xl font-extrabold">Custom</p>
        <ul class="mt-6 space-y-2 text-sm text-slate-600">
          <li>SAML SSO, SCIM</li>
          <li>Dedicated CSM</li>
          <li>Advanced security</li>
        </ul>
        <RouterLink
          to="/pricing"
          class="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >Contact sales</RouterLink
        >
      </div>
    </div>
  </section>
</template>
