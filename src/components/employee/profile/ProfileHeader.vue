<template>
  <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
    <div class="flex items-center gap-4">
      <img :src="employee.avatar" :alt="employee.name" class="h-16 w-16 rounded-full object-cover" />
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">{{ employee.name }}</h1>
        <p class="text-slate-600">{{ employee.designation || employee.role }}<span v-if="employee.team"> • {{ employee.team }}</span></p>
        <div class="mt-1 text-sm text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
          <span v-if="employee.email">{{ employee.email }}</span>
          <span v-if="employee.phone">{{ employee.phone }}</span>
          <span v-if="employee.location">{{ employee.location }}</span>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <button class="btn-ghost" @click="$emit('edit')">Edit</button>
      <button class="btn-primary" @click="$emit('message')">Message</button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface EmployeeOverview {
  id: number
  name: string
  role?: string
  designation?: string
  team?: string
  location?: string
  email?: string
  phone?: string
  manager?: string
  avatar?: string
}

defineProps<{ employee: EmployeeOverview }>()

defineEmits<{ (e: 'edit'): void; (e: 'message'): void }>()
</script>
