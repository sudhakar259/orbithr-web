<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getEmployee } from '@/services/employee'
import EmployeeForm from '@/components/employee/EmployeeForm.vue'

const router = useRouter()
const route = useRoute()
const employeeId = computed(() => route.params.id as string)
const loading = ref(true)
const error = ref('')
const employeeData = ref<any>(null)

async function loadEmployee() {
  loading.value = true
  error.value = ''
  try {
    const data = await getEmployee(employeeId.value)
    employeeData.value = data
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to load employee'
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  router.push({ name: 'employee-profile', params: { id: employeeId.value } })
}

function handleCancel() {
  router.push({ name: 'employee-profile', params: { id: employeeId.value } })
}

onMounted(loadEmployee)
</script>

<template>
  <div class="ee-page">
    <div class="ee-header">
      <h1 class="ee-title">Edit Employee</h1>
      <p class="ee-subtitle">Update employee information</p>
    </div>

    <div v-if="loading" class="ee-card ee-loading">
      <div v-for="i in 5" :key="i" class="ee-skeleton"></div>
    </div>

    <div v-else-if="error" class="ee-error">{{ error }}</div>

    <div v-else-if="employeeData">
      <EmployeeForm
        :employee-id="employeeId"
        :initial-data="employeeData"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>

<style scoped>
.ee-page { display: flex; flex-direction: column; gap: 20px; padding: 24px; }
.ee-header { display: flex; flex-direction: column; gap: 4px; }
.ee-title { font-size: 22px; font-weight: 700; color: #EEF0F4; margin: 0; }
.ee-subtitle { font-size: 13px; color: #7A8299; margin: 0; }
.ee-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; }
.ee-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.ee-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: ee-pulse 1.2s ease-in-out infinite; }
@keyframes ee-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ee-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
</style>
