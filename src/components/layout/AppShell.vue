<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <div class="flex min-h-screen">
      <AppSidebar />
      <div class="flex-1 flex min-h-screen flex-col">
        <AppTopbar />
        <main class="p-6 md:p-8">
          <RouterView />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
