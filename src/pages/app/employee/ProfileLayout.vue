<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import ProfileHeader from '@/components/employee/profile/ProfileHeader.vue'
import { getEmployee, type Employee } from '@/services/employee'

const route = useRoute()
const router = useRouter()
const id = computed(() => Number(route.params.id))

const loading = ref(false)
const error = ref('')
const employee = ref<Employee | null>(null)

onMounted(async () => {
  loading.value = true
  try {
    const data = await getEmployee(id.value)
    const computedName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim()
    const displayEmployeeId = data.employee_id && String(data.employee_id).trim() !== ''
      ? String(data.employee_id)
      : `EMP${String(data.id).padStart(5, '0')}`

    employee.value = {
      ...data,
      employee_id: displayEmployeeId,
      name: computedName,
      designation: data.designation || data.role,
      manager: undefined as any,
      avatar: 'https://i.pravatar.cc/120?img=1',
    } as any
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Failed to load employee'
  } finally {
    loading.value = false
  }
})

provide('employee', employee)

const tabs = [
  { name: 'Overview', to: { name: 'employee-overview', params: { id: id.value } } },
  { name: 'Personal', to: { name: 'employee-personal', params: { id: id.value } } },
  { name: 'Contact', to: { name: 'employee-contact', params: { id: id.value } } },
  { name: 'Documents', to: { name: 'employee-documents', params: { id: id.value } } },
  { name: 'Bank', to: { name: 'employee-bank', params: { id: id.value } } },
  { name: 'Job', to: { name: 'employee-job', params: { id: id.value } } },
  { name: 'Security', to: { name: 'employee-security', params: { id: id.value } } },
]
</script>

<template>
  <section class="space-y-6 p-6">
    <div v-if="error" class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{{ error }}</div>
    <ProfileHeader v-if="employee" :employee="employee as any" />

    <nav class="-mb-px flex flex-wrap gap-3 border-b border-slate-200">
      <RouterLink
        v-for="t in tabs"
        :key="t.name"
        :to="t.to"
        class="px-3 py-2 text-sm font-medium border-b-2"
        :class="$route.name===t.to.name ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'"
      >
        {{ t.name }}
      </RouterLink>
    </nav>

    <router-view />
  </section>
</template>
