<script setup lang="ts">
import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import MarketingHeader from '@/components/layout/MarketingHeader.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import { RouterView } from 'vue-router'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog  from '@/components/ui/ConfirmDialog.vue'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const themeStore = useThemeStore()

// Marketing pages and super admin always use dark theme regardless of tenant preference.
// Only the app dashboard (tenant area) responds to the user's theme toggle.
watchEffect(() => {
  const meta = route.meta
  const isMarketing = meta.layout === 'marketing'
  const isSuperAdmin = meta.superAdminOnly === true

  if (isMarketing || isSuperAdmin) {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    themeStore.init()
  }
})
</script>

<template>
  <!-- Docs layout: full-screen dark, no shell -->
  <template v-if="route.meta.layout === 'docs'">
    <RouterView />
  </template>

  <!-- Marketing layout -->
  <template v-else-if="route.meta.layout === 'marketing'">
    <div class="min-h-screen">
      <MarketingHeader />
      <main>
        <RouterView />
      </main>
      <SiteFooter />
    </div>
  </template>

  <!-- App layout (default) -->
  <template v-else>
    <div class="min-h-screen">
      <RouterView />
    </div>
  </template>

  <!-- Global overlays -->
  <ToastContainer />
  <ConfirmDialog />
</template>

<style scoped></style>
