<script setup lang="ts">
const heroImg =
  'https://images.pexels.com/photos/5453922/pexels-photo-5453922.jpeg?auto=compress&cs=tinysrgb&w=1600'
const dashboardImg =
  'https://images.pexels.com/photos/95916/pexels-photo-95916.jpeg?auto=compress&cs=tinysrgb&w=1600'
const facesImg =
  'https://images.pexels.com/photos/3807758/pexels-photo-3807758.jpeg?auto=compress&cs=tinysrgb&w=1200'
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="container relative z-10 grid gap-10 py-20 md:grid-cols-2 md:py-28">
        <div class="max-w-xl">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700"
          >
            New • Payroll 2.0
          </div>
          <h1 class="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            All-in-one Employee Management, reimagined
          </h1>
          <p class="mt-4 text-lg text-slate-600">
            Run HR like BambooHR and Keka in one beautiful SaaS. Directory, attendance, leaves,
            payroll, performance, recruitment, and more — unified and effortless.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <RouterLink
              to="/app"
              class="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-soft hover:bg-brand-700"
              >Start free trial</RouterLink
            >
            <RouterLink
              to="/pricing"
              class="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
              >See pricing</RouterLink
            >
          </div>
          <div class="mt-6 flex items-center gap-4 text-sm text-slate-600">
            <div class="flex -space-x-2">
              <img
                :src="facesImg"
                alt="Happy customers"
                class="h-8 w-8 rounded-full object-cover ring-2 ring-white"
              />
            </div>
            <span>Trusted by 2,000+ teams</span>
          </div>
        </div>
        <div class="relative">
          <div class="relative rounded-xl border border-slate-200 bg-white p-2 shadow-soft">
            <img
              :src="dashboardImg"
              alt="OrbitHR dashboard preview"
              class="h-[380px] w-full rounded-lg object-cover"
            />
          </div>
        </div>
      </div>
      <div
        class="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/60 via-white to-white"
      ></div>
      <img
        :src="heroImg"
        alt="Modern team in office"
        class="pointer-events-none absolute -top-10 right-[-10%] hidden w-[720px] rotate-2 opacity-10 md:block"
      />
    </section>

    <!-- Logos -->
    <section class="border-y border-slate-200 bg-white/50">
      <div class="container py-8">
        <div class="grid grid-cols-2 items-center gap-6 opacity-70 sm:grid-cols-3 md:grid-cols-6">
          <div class="text-center text-sm font-semibold">ACME</div>
          <div class="text-center text-sm font-semibold">SKYLINE</div>
          <div class="text-center text-sm font-semibold">PIXELWARE</div>
          <div class="text-center text-sm font-semibold">VELOCITY</div>
          <div class="text-center text-sm font-semibold">NIMBUS</div>
          <div class="text-center text-sm font-semibold">QUANTUM</div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="container py-20">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-tight text-slate-900">Everything HR in one place</h2>
        <p class="mt-3 text-slate-600">
          Powerful modules that work beautifully together so your team can focus on people, not
          paperwork.
        </p>
      </div>
      <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700"
          >
            👥
          </div>
          <h3 class="mt-4 text-lg font-semibold">Employee Directory</h3>
          <p class="mt-2 text-sm text-slate-600">
            Smart profiles, org chart, teams, documents, lifecycle and offboarding.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700"
          >
            ⏱️
          </div>
          <h3 class="mt-4 text-lg font-semibold">Attendance & Timesheets</h3>
          <p class="mt-2 text-sm text-slate-600">
            Shifts, geofencing, approvals and insightful reports.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700"
          >
            🏝️
          </div>
          <h3 class="mt-4 text-lg font-semibold">Leaves</h3>
          <p class="mt-2 text-sm text-slate-600">
            Policies, accruals, holiday calendars and easy self-serve requests.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700"
          >
            💸
          </div>
          <h3 class="mt-4 text-lg font-semibold">Payroll</h3>
          <p class="mt-2 text-sm text-slate-600">
            Run payroll in minutes with compliance and payouts.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700"
          >
            📈
          </div>
          <h3 class="mt-4 text-lg font-semibold">Performance</h3>
          <p class="mt-2 text-sm text-slate-600">
            Reviews, goals, 1:1s, feedback and growth plans.
          </p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
          <div
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/10 text-brand-700"
          >
            🎯
          </div>
          <h3 class="mt-4 text-lg font-semibold">Recruitment</h3>
          <p class="mt-2 text-sm text-slate-600">
            ATS, careers site, interview schedules and offers.
          </p>
        </div>
      </div>
    </section>

    <!-- Pricing teaser -->
    <section class="bg-slate-50">
      <div class="container py-20">
        <div class="mx-auto max-w-2xl text-center">
          <h2 class="text-3xl font-bold tracking-tight text-slate-900">
            Simple, transparent pricing
          </h2>
          <p class="mt-3 text-slate-600">Only pay for active employees. Cancel anytime.</p>
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
      </div>
    </section>

    <!-- CTA -->
    <section class="container py-20">
      <div
        class="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-10 text-white shadow-soft"
      >
        <div class="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h3 class="text-2xl font-bold">Ready to upgrade your HR?</h3>
            <p class="mt-2 text-white/80">Start your 14-day free trial. No credit card required.</p>
          </div>
          <div class="flex justify-end">
            <RouterLink
              to="/app"
              class="inline-flex items-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-700 shadow-soft hover:bg-slate-50"
              >Create your workspace</RouterLink
            >
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
