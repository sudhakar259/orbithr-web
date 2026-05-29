<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
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
      manager: undefined as unknown,
      avatar: 'https://i.pravatar.cc/120?img=1',
    } as unknown as Employee
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err?.response?.data?.message || 'Failed to load employee'
  } finally {
    loading.value = false
  }
})

provide('employee', employee)

const tabs = computed(() => [
  { name: 'Overview', to: { name: 'employee-overview', params: { id: id.value } } },
  { name: 'Personal', to: { name: 'employee-personal', params: { id: id.value } } },
  { name: 'Contact', to: { name: 'employee-contact', params: { id: id.value } } },
  { name: 'Documents', to: { name: 'employee-documents', params: { id: id.value } } },
  { name: 'Bank', to: { name: 'employee-bank', params: { id: id.value } } },
  { name: 'Job', to: { name: 'employee-job', params: { id: id.value } } },
  { name: 'Security', to: { name: 'employee-security', params: { id: id.value } } },
])

function initials(name?: string) {
  if (!name) return '??'
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]?.toUpperCase()).join('')
}

function onEdit() {
  router.push({ name: 'employee-edit', params: { id: id.value } })
}

const employeeStatus = computed(() => (employee.value as Record<string, unknown>)?.status as string || 'Active')
const employeeManager = computed(() => (employee.value as Record<string, unknown>)?.manager_name as string || '')
const employeeCode = computed(() => (employee.value as Record<string, unknown>)?.employee_id as string || '')
</script>

<template>
  <section class="profile-layout">
    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Cover -->
    <div class="cover">
      <div class="cover-overlay" />
    </div>

    <div class="profile-body">
      <!-- Identity row -->
      <div v-if="employee" class="identity">
        <div class="avatar-wrap">
          <div class="avatar">{{ initials(employee.name) }}</div>
        </div>
        <div class="identity-meta">
          <div class="identity-line">
            <h1 class="identity-name">{{ employee.name }}</h1>
            <span class="badge badge-ok">{{ employeeStatus }}</span>
            <span v-if="employee.department" class="badge badge-accent">{{ employee.department }}</span>
          </div>
          <div class="identity-sub">
            <span>{{ employee.designation || employee.role }}</span>
            <span v-if="employeeManager"> &middot; Reports to {{ employeeManager }}</span>
            <span class="emp-code"> &middot; {{ employeeCode }}</span>
          </div>
        </div>
        <div class="identity-actions">
          <button class="btn btn-secondary" @click="$router.push({ name: 'employees' })">Back</button>
          <button class="btn btn-secondary" @click="onEdit">Edit</button>
          <button class="btn btn-primary">Raise request</button>
        </div>
      </div>

      <div v-else-if="loading" class="loading">Loading profile...</div>

      <!-- Tabs -->
      <nav class="tabs">
        <RouterLink
          v-for="t in tabs"
          :key="t.name"
          :to="t.to"
          class="tab"
          :class="{ active: $route.name === t.to.name }"
        >
          {{ t.name }}
        </RouterLink>
      </nav>

      <div class="profile-content">
        <router-view />
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-layout {
  background: #0D0F17;
  color: #EEF0F4;
  min-height: 100%;
}

.error-banner {
  margin: 16px 28px 0;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #5A2A2E;
  background: #2A1418;
  color: #F38288;
  font-size: 13px;
}

.cover {
  position: relative;
  height: 120px;
  background: linear-gradient(115deg, #2A1B5C 0%, #6B5BFF 60%, #F5C16E 130%);
  opacity: 0.7;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(45deg, transparent 0 12px, rgba(0, 0, 0, 0.08) 12px 14px);
}

.profile-body {
  padding: 0 28px 28px;
}

.identity {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  margin-top: -40px;
}

.avatar-wrap {
  border: 3px solid #0D0F17;
  border-radius: 50%;
}

.avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6B5BFF, #2A1B5C);
  color: #EEF0F4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  letter-spacing: -0.02em;
}

.identity-meta {
  flex: 1;
  padding-bottom: 6px;
}

.identity-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.identity-name {
  margin: 0;
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  font-weight: 400;
  color: #EEF0F4;
  letter-spacing: -0.02em;
}

.identity-sub {
  font-size: 13px;
  color: #9AA3B5;
  margin-top: 4px;
}

.emp-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: #7A8299;
}

.identity-actions {
  display: flex;
  gap: 8px;
  padding-bottom: 6px;
}

.btn {
  font-size: 12.5px;
  font-weight: 500;
  padding: 7px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-secondary {
  background: #1B2030;
  border-color: #232936;
  color: #EEF0F4;
}

.btn-secondary:hover {
  background: #232A3C;
}

.btn-primary {
  background: #6B5BFF;
  color: #FFFFFF;
}

.btn-primary:hover {
  background: #5848E5;
}

.badge {
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  letter-spacing: 0.02em;
}

.badge-ok {
  background: rgba(77, 211, 154, 0.12);
  color: #4DD39A;
  border-color: rgba(77, 211, 154, 0.25);
}

.badge-accent {
  background: rgba(107, 91, 255, 0.14);
  color: #9B8DFF;
  border-color: rgba(107, 91, 255, 0.3);
}

.loading {
  padding: 40px 0;
  text-align: center;
  color: #7A8299;
  font-size: 13px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 20px;
  border-bottom: 1px solid #232936;
}

.tab {
  padding: 10px 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: #7A8299;
  border-bottom: 2px solid transparent;
  text-decoration: none;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}

.tab:hover {
  color: #EEF0F4;
}

.tab.active {
  color: #EEF0F4;
  border-bottom-color: #6B5BFF;
}

.profile-content {
  padding: 20px 0 0;
}
</style>
