<script setup lang="ts">
import { useRoute } from 'vue-router'
import DocumentsManager from '@/components/employee/profile/DocumentsManager.vue'
const route = useRoute()
</script>
<template>
  <DocumentsManager :employee-id="Number(route.params.id)" />
</template>
