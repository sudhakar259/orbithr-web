<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getEmployee } from '@/services/employee'
import EmployeeForm from '@/components/employee/EmployeeForm.vue'

const router = useRouter()
const route = useRoute()
const employeeId = computed(() => Number(route.params.id))
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
  <div class="space-y-6 p-6">
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Edit Employee</h1>
      <p class="mt-1 text-slate-600">Update employee information</p>
    </div>

    <div v-if="loading" class="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
      Loading employee details...
    </div>

    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-600">
      {{ error }}
    </div>

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
