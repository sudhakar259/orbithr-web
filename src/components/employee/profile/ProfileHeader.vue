<template>
  <div class="ph-wrap">
    <div class="ph-identity">
      <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.name" class="ph-avatar" />
      <div v-else class="ph-avatar-placeholder">{{ employee.name?.[0] }}</div>
      <div>
        <h1 class="ph-name">{{ employee.name }}</h1>
        <p class="ph-role">
          {{ employee.designation || employee.role }}<span v-if="employee.team"> · {{ employee.team }}</span>
        </p>
        <div class="ph-meta">
          <span v-if="employee.email">{{ employee.email }}</span>
          <span v-if="employee.phone">{{ employee.phone }}</span>
          <span v-if="employee.location">{{ employee.location }}</span>
        </div>
      </div>
    </div>
    <div class="ph-actions">
      <button class="ph-btn-ghost" @click="$emit('edit')">Edit</button>
      <button class="ph-btn-primary" @click="$emit('message')">Message</button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface EmployeeOverview {
  id: number; name: string; role?: string; designation?: string; team?: string
  location?: string; email?: string; phone?: string; manager?: string; avatar?: string
}

defineProps<{ employee: EmployeeOverview }>()
defineEmits<{ (e: 'edit'): void; (e: 'message'): void }>()
</script>

<style scoped>
.ph-wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ph-identity { display: flex; align-items: center; gap: 16px; }
.ph-avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid #232936; }
.ph-avatar-placeholder {
  width: 64px; height: 64px; border-radius: 50%; background: #232936; border: 3px solid #161A23;
  display: flex; align-items: center; justify-content: center; font-size: 22px; color: #EEF0F4;
  font-family: 'Instrument Serif', serif;
}
.ph-name { margin: 0; font-family: 'Instrument Serif', serif; font-size: 26px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.ph-role { margin: 3px 0 0; font-size: 13px; color: #7A8299; }
.ph-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 4px; font-size: 12px; color: #7A8299; }
.ph-actions { display: flex; gap: 10px; }
.ph-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; transition: background 0.15s;
}
.ph-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.ph-btn-primary {
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
}
.ph-btn-primary:hover { opacity: 0.88; }
</style>
