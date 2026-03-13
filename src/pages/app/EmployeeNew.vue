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
  <div class="space-y-6 p-6">
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Add New Employee</h1>
      <p class="mt-1 text-slate-600">Fill in all required information to create a new employee profile</p>
    </div>

    <EmployeeForm @submit="handleSubmit" @cancel="handleCancel" />
  </div>
</template>
