<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-3xl rounded-xl bg-white shadow-soft border border-slate-200">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h3 class="text-lg font-semibold">Add Employee</h3>
        <button class="text-slate-500 hover:text-slate-700" @click="$emit('close')">✕</button>
      </div>
      <div class="p-5">
        <EmployeeForm @success="onSuccess" @cancel="$emit('close')" :managers="managers" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EmployeeForm from '@/components/employee/EmployeeForm.vue'

const props = defineProps<{ open: boolean; employees: Array<{ id: number; full_name: string }> }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created', employee: any): void }>()

const managers = computed(() => props.employees)

function onSuccess(emp: any) {
  emit('created', emp)
  emit('close')
}
</script>
