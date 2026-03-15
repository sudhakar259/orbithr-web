<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <div class="shell-main">
      <AppTopbar />
      <main class="shell-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}
.shell-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  margin-left: var(--sw);
  overflow: hidden;
}
.shell-content {
  flex: 1;
  padding: 28px 32px;
  overflow-y: auto;
}
</style>
