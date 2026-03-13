<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import ProfileHeader from '@/components/employee/profile/ProfileHeader.vue'
import SectionCard from '@/components/employee/profile/SectionCard.vue'
import PersonalInfoCard from '@/components/employee/profile/PersonalInfoCard.vue'
import ContactEmergencyCard from '@/components/employee/profile/ContactEmergencyCard.vue'
import DocumentsManager from '@/components/employee/profile/DocumentsManager.vue'
import BankInfoCard from '@/components/employee/profile/BankInfoCard.vue'
import JobDetailsCard from '@/components/employee/profile/JobDetailsCard.vue'
import SecuritySettingsCard from '@/components/employee/profile/SecuritySettingsCard.vue'
import ShiftAssignment from '@/components/employee/ShiftAssignment.vue'
import ProjectAssignment from '@/components/employee/ProjectAssignment.vue'
import HierarchyAssignment from '@/components/employee/HierarchyAssignment.vue'

const route = useRoute()
const router = useRouter()
const id = computed(() => Number(route.params.id))
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'overview' | 'personal' | 'work' | 'hierarchy'>('overview')

const employee = reactive({
  id: id.value,
  first_name: '',
  last_name: '',
  name: '',
  email: '',
  phone: '',
  employee_id: '',
  role: '',
  designation: '',
  department: '',
  team: '',
  location: '',
  status: '',
  manager_id: null,
  hire_date: '',
  employment_type: '',
  date_of_birth: '',
  gender: '',
  address: '',
  nationality: '',
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  pan_number: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  working_days: [1, 2, 3, 4, 5],
  avatar: '',
  manager: null as any,
})

async function fetchEmployee() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get(`/employees/${id.value}`)
    Object.assign(employee, {
      id: data.id,
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
      email: data.email,
      phone: data.phone,
      employee_id: data.employee_id,
      role: data.role,
      designation: data.designation,
      department: data.department,
      team: data.team,
      location: data.location,
      status: data.status,
      manager_id: data.manager_id,
      hire_date: data.hire_date,
      employment_type: data.employment_type,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      address: data.address,
      nationality: data.nationality,
      bank_name: data.bank_name,
      account_number: data.account_number,
      ifsc_code: data.ifsc_code,
      pan_number: data.pan_number,
      emergency_contact_name: data.emergency_contact_name,
      emergency_contact_phone: data.emergency_contact_phone,
      emergency_contact_relationship: data.emergency_contact_relationship,
      working_days: data.working_days || [1, 2, 3, 4, 5],
      avatar: `https://i.pravatar.cc/120?u=${data.email}`,
      manager: data.manager,
    })
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to load employee data.'
  } finally {
    loading.value = false
  }
}

function editEmployee() {
  router.push({ name: 'employee-edit', params: { id: id.value } })
}

onMounted(fetchEmployee)
</script>

<template>
  <div class="space-y-6 p-6">
    <div v-if="loading" class="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
      Loading employee data...
    </div>

    <div v-else-if="error" class="rounded-lg bg-red-50 p-4 text-red-600">
      {{ error }}
      <button type="button" class="mt-2 text-red-700 hover:text-red-800 underline" @click="fetchEmployee">
        Try Again
      </button>
    </div>

    <template v-else>
      <!-- Header with Employee Info and Actions -->
      <div class="rounded-lg border border-slate-200 bg-white p-6">
        <div class="flex items-start justify-between">
          <div class="flex gap-4">
            <img
              :src="employee.avatar"
              :alt="employee.name"
              class="h-16 w-16 rounded-full object-cover"
            />
            <div>
              <h1 class="text-2xl font-bold text-slate-900">{{ employee.name }}</h1>
              <p class="text-slate-600">{{ employee.employee_id }}</p>
              <p class="mt-1 text-sm text-slate-500">{{ employee.designation }} • {{ employee.department }}</p>
              <div class="mt-2 flex gap-2">
                <span
                  :class="[
                    'inline-block rounded-full px-3 py-1 text-xs font-medium',
                    employee.status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : employee.status === 'On Leave'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-slate-100 text-slate-800',
                  ]"
                >
                  {{ employee.status }}
                </span>
              </div>
            </div>
          </div>
          <button type="button" class="btn-primary" @click="editEmployee">
            ✏️ Edit Profile
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="border-b border-slate-200">
        <div class="flex gap-4 bg-white">
          <button
            v-for="tab in ['overview', 'personal', 'work', 'hierarchy']"
            :key="tab"
            type="button"
            :class="[
              'border-b-2 px-4 py-3 font-medium transition-colors',
              activeTab === tab
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-600 hover:text-slate-900',
            ]"
            @click="activeTab = tab as any"
          >
            {{ tab === 'overview' ? '👁️ Overview' : tab === 'personal' ? '👤 Personal' : tab === 'work' ? '💼 Work' : '👥 Hierarchy' }}
          </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="space-y-6">
        <!-- Overview Tab -->
        <div v-show="activeTab === 'overview'">
          <div class="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Contact Information">
              <dl class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Email</dt>
                  <dd class="text-slate-900">{{ employee.email }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Phone</dt>
                  <dd class="text-slate-900">{{ employee.phone }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Location</dt>
                  <dd class="text-slate-900">{{ employee.location || '-' }}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Employment Status">
              <dl class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Status</dt>
                  <dd class="text-slate-900">{{ employee.status }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Date of Joining</dt>
                  <dd class="text-slate-900">
                    {{ employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-' }}
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Employment Type</dt>
                  <dd class="text-slate-900">{{ employee.employment_type || '-' }}</dd>
                </div>
              </dl>
            </SectionCard>
          </div>

          <div class="mt-6">
            <DocumentsManager :employee-id="employee.id" @changed="fetchEmployee" />
          </div>
        </div>

        <!-- Personal Tab -->
        <div v-show="activeTab === 'personal'">
          <div class="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Personal Information">
              <dl class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Date of Birth</dt>
                  <dd class="text-slate-900">
                    {{ employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : '-' }}
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Gender</dt>
                  <dd class="text-slate-900">{{ employee.gender || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Nationality</dt>
                  <dd class="text-slate-900">{{ employee.nationality || '-' }}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Address">
              <p class="text-sm text-slate-900">{{ employee.address || '-' }}</p>
            </SectionCard>

            <SectionCard title="Bank Details">
              <dl class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Bank Name</dt>
                  <dd class="text-slate-900">{{ employee.bank_name || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Account Number</dt>
                  <dd class="text-slate-900">{{ employee.account_number ? `****${employee.account_number.slice(-4)}` : '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">IFSC Code</dt>
                  <dd class="text-slate-900">{{ employee.ifsc_code || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">PAN Number</dt>
                  <dd class="text-slate-900">{{ employee.pan_number || '-' }}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Emergency Contact">
              <dl class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Name</dt>
                  <dd class="text-slate-900">{{ employee.emergency_contact_name || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Phone</dt>
                  <dd class="text-slate-900">{{ employee.emergency_contact_phone || '-' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="font-medium text-slate-600">Relationship</dt>
                  <dd class="text-slate-900">{{ employee.emergency_contact_relationship || '-' }}</dd>
                </div>
              </dl>
            </SectionCard>
          </div>
        </div>

        <!-- Work Tab -->
        <div v-show="activeTab === 'work'" class="space-y-6">
          <ShiftAssignment :employee-id="employee.id" />
          <ProjectAssignment :employee-id="employee.id" />
        </div>

        <!-- Hierarchy Tab -->
        <div v-show="activeTab === 'hierarchy'">
          <HierarchyAssignment :employee-id="employee.id" :current-manager="employee.manager_id" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.btn-primary {
  @apply inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700;
}
</style>
