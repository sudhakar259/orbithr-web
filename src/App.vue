<script setup lang="ts">
import { useRoute } from 'vue-router'
import MarketingHeader from '@/components/layout/MarketingHeader.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import { RouterView } from 'vue-router'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog  from '@/components/ui/ConfirmDialog.vue'

const route = useRoute()
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
