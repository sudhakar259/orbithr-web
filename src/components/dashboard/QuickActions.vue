<template>
  <ExpandableCard title="Quick Actions" description="Common HR operations">
    <template #default>
      <div class="grid grid-cols-2 gap-3">
        <button class="btn-primary justify-start" @click="go('/app/employees/new')">Add employee</button>
        <button class="btn-ghost justify-start" @click="go('/app/recruitment')">Post job</button>
        <button class="btn-danger justify-start" @click="go('/app/attendance')">Mark attendance</button>
        <button class="btn-ghost justify-start" @click="go('/app/payroll')">Run payroll</button>
      </div>
    </template>
  </ExpandableCard>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import ExpandableCard from './ExpandableCard.vue'

const router = useRouter()
function go(path: string) { router.push(path) }
</script>
