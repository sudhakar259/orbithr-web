<script setup lang="ts">
import { useRouter } from 'vue-router'
import EmployeeForm from '@/components/employee/EmployeeForm.vue'

const router = useRouter()

function handleSubmit() {
  router.push({ name: 'employees' })
}

function handleCancel() {
  router.push({ name: 'employees' })
}
</script>

<template>
  <div class="en-page">
    <div class="en-header">
      <h1 class="en-title">Add New Employee</h1>
      <p class="en-subtitle">Fill in all required information to create a new employee profile</p>
    </div>

    <EmployeeForm @submit="handleSubmit" @cancel="handleCancel" />
  </div>
</template>

<style scoped>
.en-page { display: flex; flex-direction: column; gap: 20px; padding: 24px; }
.en-header { display: flex; flex-direction: column; gap: 4px; }
.en-title { font-size: 22px; font-weight: 700; color: #EEF0F4; margin: 0; }
.en-subtitle { font-size: 13px; color: #7A8299; margin: 0; }
</style>
