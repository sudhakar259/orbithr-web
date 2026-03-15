<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import DocumentsManager from '@/components/employee/profile/DocumentsManager.vue'
import ShiftAssignment from '@/components/employee/ShiftAssignment.vue'
import ProjectAssignment from '@/components/employee/ProjectAssignment.vue'
import HierarchyAssignment from '@/components/employee/HierarchyAssignment.vue'

const route  = useRoute()
const router = useRouter()
const id     = computed(() => Number(route.params.id))
const loading = ref(true)
const error   = ref<string | null>(null)
const activeTab = ref<'overview' | 'personal' | 'work' | 'hierarchy'>('overview')

const employee = reactive<Record<string, any>>({
  id: 0, first_name: '', last_name: '', name: '', email: '', phone: '',
  employee_id: '', role: '', designation: '', department: '', team: '',
  location: '', status: '', manager_id: null, hire_date: '', employment_type: '',
  date_of_birth: '', gender: '', address: '', nationality: '',
  bank_name: '', account_number: '', ifsc_code: '', pan_number: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  working_days: [1,2,3,4,5], avatar: '', manager: null,
})

async function fetchEmployee() {
  loading.value = true; error.value = null
  try {
    const { data } = await api.get(`/employees/${id.value}`)
    Object.assign(employee, {
      ...data,
      name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
      working_days: data.working_days || [1,2,3,4,5],
      avatar: `https://i.pravatar.cc/120?u=${data.email}`,
    })
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load employee data.'
  } finally { loading.value = false }
}

const statusClass = computed(() => {
  if (employee.status === 'Active') return 'badge--active'
  if (employee.status === 'On Leave') return 'badge--leave'
  return 'badge--inactive'
})

const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

onMounted(fetchEmployee)
</script>

<template>
  <div class="ep-page">
    <div v-if="loading" class="ep-state">Loading employee data…</div>

    <div v-else-if="error" class="ep-state ep-state--error">
      {{ error }}
      <button class="ep-retry" @click="fetchEmployee">Try Again</button>
    </div>

    <template v-else>
      <!-- Profile Header -->
      <div class="ep-header">
        <div class="ep-header-left">
          <img :src="employee.avatar" :alt="employee.name" class="ep-avatar" />
          <div>
            <h1 class="ep-name">{{ employee.name }}</h1>
            <p class="ep-code">{{ employee.employee_id }}</p>
            <p class="ep-meta">{{ [employee.designation, employee.department].filter(Boolean).join(' · ') }}</p>
            <div class="ep-badges">
              <span :class="['badge', statusClass]">{{ employee.status }}</span>
              <span v-if="employee.employment_type" class="badge badge--type">{{ employee.employment_type }}</span>
            </div>
          </div>
        </div>
        <button class="ep-edit-btn" @click="router.push({ name: 'employee-edit', params: { id: employee.id } })">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          Edit Profile
        </button>
      </div>

      <!-- Tabs -->
      <div class="ep-tabs">
        <button
          v-for="tab in (['overview','personal','work','hierarchy'] as const)"
          :key="tab"
          :class="['ep-tab', activeTab === tab && 'ep-tab--active']"
          @click="activeTab = tab"
        >
          <span v-if="tab === 'overview'">Overview</span>
          <span v-else-if="tab === 'personal'">Personal</span>
          <span v-else-if="tab === 'work'">Work</span>
          <span v-else>Hierarchy</span>
        </button>
      </div>

      <!-- Overview Tab -->
      <div v-show="activeTab === 'overview'" class="ep-tab-content">
        <div class="ep-grid2">
          <!-- Contact Info -->
          <div class="ep-card">
            <h3 class="ep-card-title">Contact Information</h3>
            <dl class="ep-dl">
              <div class="ep-dl-row"><dt>Email</dt><dd>{{ employee.email || '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Phone</dt><dd>{{ employee.phone || '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Location</dt><dd>{{ employee.location || '—' }}</dd></div>
            </dl>
          </div>
          <!-- Employment Status -->
          <div class="ep-card">
            <h3 class="ep-card-title">Employment Status</h3>
            <dl class="ep-dl">
              <div class="ep-dl-row"><dt>Status</dt><dd>{{ employee.status || '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Date of Joining</dt><dd>{{ employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Employment Type</dt><dd>{{ employee.employment_type || '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Role</dt><dd>{{ employee.role || '—' }}</dd></div>
            </dl>
          </div>
        </div>

        <!-- Working Days -->
        <div class="ep-card ep-card--full">
          <h3 class="ep-card-title">Working Days</h3>
          <div class="wd-grid">
            <span
              v-for="(day, idx) in dayNames"
              :key="idx"
              :class="['wd-chip', employee.working_days?.includes(idx) && 'wd-chip--on']"
            >{{ day }}</span>
          </div>
        </div>

        <!-- Documents -->
        <div class="ep-card ep-card--full">
          <DocumentsManager :employee-id="employee.id" @changed="fetchEmployee" />
        </div>
      </div>

      <!-- Personal Tab -->
      <div v-show="activeTab === 'personal'" class="ep-tab-content">
        <div class="ep-grid2">
          <div class="ep-card">
            <h3 class="ep-card-title">Personal Information</h3>
            <dl class="ep-dl">
              <div class="ep-dl-row"><dt>Date of Birth</dt><dd>{{ employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Gender</dt><dd>{{ employee.gender || '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Nationality</dt><dd>{{ employee.nationality || '—' }}</dd></div>
            </dl>
          </div>
          <div class="ep-card">
            <h3 class="ep-card-title">Address</h3>
            <p class="ep-text">{{ employee.address || '—' }}</p>
          </div>
          <div class="ep-card">
            <h3 class="ep-card-title">Bank Details</h3>
            <dl class="ep-dl">
              <div class="ep-dl-row"><dt>Bank Name</dt><dd>{{ employee.bank_name || '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Account Number</dt><dd>{{ employee.account_number ? `****${employee.account_number.slice(-4)}` : '—' }}</dd></div>
              <div class="ep-dl-row"><dt>IFSC Code</dt><dd>{{ employee.ifsc_code || '—' }}</dd></div>
              <div class="ep-dl-row"><dt>PAN Number</dt><dd>{{ employee.pan_number || '—' }}</dd></div>
            </dl>
          </div>
          <div class="ep-card">
            <h3 class="ep-card-title">Emergency Contact</h3>
            <dl class="ep-dl">
              <div class="ep-dl-row"><dt>Name</dt><dd>{{ employee.emergency_contact_name || '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Phone</dt><dd>{{ employee.emergency_contact_phone || '—' }}</dd></div>
              <div class="ep-dl-row"><dt>Relationship</dt><dd>{{ employee.emergency_contact_relationship || '—' }}</dd></div>
            </dl>
          </div>
        </div>
      </div>

      <!-- Work Tab -->
      <div v-show="activeTab === 'work'" class="ep-tab-content">
        <ShiftAssignment :employee-id="employee.id" />
        <ProjectAssignment :employee-id="employee.id" />
      </div>

      <!-- Hierarchy Tab -->
      <div v-show="activeTab === 'hierarchy'" class="ep-tab-content">
        <HierarchyAssignment :employee-id="employee.id" :current-manager="employee.manager_id" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.ep-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; color: var(--text); }

/* States */
.ep-state { background: var(--surface); border-radius: 10px; padding: 40px; text-align: center; color: var(--muted); }
.ep-state--error { color: var(--red); background: rgba(255,107,107,.07); }
.ep-retry { display: inline-block; margin-top: 10px; color: var(--accent); background: none; border: none; cursor: pointer; font-size: 0.875rem; }

/* Header */
.ep-header { background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 12px; padding: 24px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ep-header-left { display: flex; gap: 16px; align-items: flex-start; }
.ep-avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,.1); flex-shrink: 0; }
.ep-name  { font-size: 1.3rem; font-weight: 700; }
.ep-code  { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }
.ep-meta  { font-size: 0.85rem; color: var(--muted); margin-top: 4px; }
.ep-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
.badge--active   { background: rgba(54,211,153,.15); color: var(--green); }
.badge--leave    { background: rgba(249,168,37,.15);  color: var(--yellow); }
.badge--inactive { background: rgba(107,114,128,.15); color: var(--muted); }
.badge--type     { background: rgba(79,126,255,.12); color: var(--accent); }
.ep-edit-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: var(--surface2); border: 1px solid rgba(255,255,255,.1); color: var(--text); font-size: 0.875rem; font-weight: 500; cursor: pointer; white-space: nowrap; }
.ep-edit-btn:hover { background: var(--surface3); }

/* Tabs */
.ep-tabs { display: flex; gap: 2px; background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 4px; width: fit-content; }
.ep-tab { padding: 7px 18px; border-radius: 7px; font-size: 0.85rem; font-weight: 500; color: var(--muted); background: transparent; border: none; cursor: pointer; }
.ep-tab--active { background: var(--surface2); color: var(--text); }

/* Tab content */
.ep-tab-content { display: flex; flex-direction: column; gap: 16px; }
.ep-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 768px) { .ep-grid2 { grid-template-columns: 1fr; } }

.ep-card { background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 16px; }
.ep-card--full { grid-column: 1 / -1; }
.ep-card-title { font-size: 0.875rem; font-weight: 600; color: var(--text); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,.05); }
.ep-text { font-size: 0.875rem; color: var(--muted); }

.ep-dl { display: flex; flex-direction: column; gap: 10px; }
.ep-dl-row { display: flex; justify-content: space-between; font-size: 0.85rem; gap: 12px; }
.ep-dl-row dt { color: var(--muted); font-weight: 500; white-space: nowrap; }
.ep-dl-row dd { color: var(--text); text-align: right; }

/* Working days */
.wd-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.wd-chip { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; background: var(--surface2); border: 1px solid rgba(255,255,255,.07); color: var(--muted); }
.wd-chip--on { background: rgba(79,126,255,.15); border-color: rgba(79,126,255,.35); color: var(--accent); }
</style>
