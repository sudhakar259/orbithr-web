<script setup lang="ts">
import SectionCard from '@/components/employee/profile/SectionCard.vue'
import { computed, inject, type Ref } from 'vue'
import type { Employee } from '@/services/employee'

const injected = inject<Ref<Employee | null> | null>('employee', null)
const employee = computed(() => injected?.value ?? null)
const displayEmployeeId = computed(() => {
  const e = employee.value
  if (!e) return ''
  return (e as any).employee_id || (e as any).employeeId || String(e.id)
})
</script>
<template>
  <div class="space-y-6">
    <SectionCard title="Profile Overview">
      <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
        <div>
          <dt class="text-xs uppercase tracking-wide text-slate-500">Employee ID</dt>
          <dd>#{{ displayEmployeeId }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-slate-500">Email</dt>
          <dd>{{ employee?.email || '-' }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-slate-500">Phone</dt>
          <dd>{{ employee?.phone || '-' }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-slate-500">Department</dt>
          <dd>{{ employee?.department || '-' }}</dd>
        </div>
      </dl>
    </SectionCard>
  </div>
</template>
