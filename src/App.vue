<script setup lang="ts">
import { useRoute } from 'vue-router'
import MarketingHeader from '@/components/layout/MarketingHeader.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import { RouterView } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="min-h-screen bg-white text-slate-800">
    <template v-if="route.meta.layout === 'marketing'">
      <MarketingHeader />
      <main>
        <RouterView />
      </main>
      <SiteFooter />
    </template>
    <template v-else>
      <RouterView />
    </template>
  </div>
</template>

<style scoped></style>
