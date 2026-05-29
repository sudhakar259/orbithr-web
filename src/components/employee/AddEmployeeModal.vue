<template>
  <Teleport to="body">
    <div v-if="open" class="aem-overlay" @click.self="$emit('close')">
      <div class="aem-modal">
        <div class="aem-head">
          <div class="aem-head-left">
            <div class="aem-head-title">{{ isEdit ? 'Edit Employee' : 'Add New Employee' }}</div>
            <div class="aem-head-sub">{{ isEdit ? 'Update employee information' : 'Fill in the details to create a new employee account' }}</div>
          </div>
          <button class="aem-close" @click="$emit('close')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="aem-body">
          <EmployeeForm
            :employee-id="employeeId"
            :initial-data="initialData"
            @success="onSuccess"
            @cancel="$emit('close')"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EmployeeForm from '@/components/employee/EmployeeForm.vue'

const props = defineProps<{
  open: boolean
  employeeId?: number | null
  initialData?: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', employee: unknown): void
}>()

const isEdit = computed(() => !!props.employeeId)

function onSuccess(emp: unknown) {
  emit('created', emp)
  emit('close')
}
</script>

<style scoped>
.aem-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0,0,0,.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.aem-modal {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 16px;
  width: 100%;
  max-width: 1000px;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 32px 80px rgba(0,0,0,.6);
  overflow: hidden;
}
.aem-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 24px 14px;
  border-bottom: 1px solid #232936;
  flex-shrink: 0;
}
.aem-head-title { font-size: 16px; font-weight: 600; color: #EEF0F4; }
.aem-head-sub   { font-size: 12px; color: #7A8299; margin-top: 3px; }
.aem-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: none;
  border: none;
  color: #7A8299;
  cursor: pointer;
  transition: background .15s, color .15s;
  flex-shrink: 0;
}
.aem-close:hover { background: #1C212C; color: #EEF0F4; }
.aem-body { overflow-y: auto; flex: 1; }
</style>
