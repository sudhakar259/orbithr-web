<template>
  <div class="space-y-6">
    <form @submit.prevent="submit" class="space-y-6">
      <!-- Basic Information Section -->
      <div class="rounded-lg border border-slate-200 bg-white p-6">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Basic Information</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700">First Name *</label>
            <input
              v-model="form.first_name"
              type="text"
              required
              class="input mt-1"
              placeholder="John"
            />
            <p v-if="errors.first_name" class="mt-1 text-sm text-red-600">{{ errors.first_name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Last Name</label>
            <input v-model="form.last_name" type="text" class="input mt-1" placeholder="Doe" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Email *</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="input mt-1"
              placeholder="john@company.com"
              :disabled="isEdit"
            />
            <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Phone *</label>
            <input
              v-model="form.phone"
              type="tel"
              required
              class="input mt-1"
              placeholder="+91 98xxxxxx"
            />
          </div>
        </div>
      </div>

      <!-- Employment Details Section -->
      <div class="rounded-lg border border-slate-200 bg-white p-6">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Employment Details</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700">Employee Code *</label>
            <input
              v-model="form.employee_id"
              type="text"
              required
              class="input mt-1"
              placeholder="EMP001"
              :disabled="isEdit"
            />
            <p v-if="errors.employee_id" class="mt-1 text-sm text-red-600">{{ errors.employee_id }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Designation</label>
            <input v-model="form.designation" type="text" class="input mt-1" placeholder="Senior Developer" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Department</label>
            <input v-model="form.department" type="text" class="input mt-1" placeholder="Engineering" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Role</label>
            <input v-model="form.role" type="text" class="input mt-1" placeholder="Employee" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Date of Joining</label>
            <input v-model="form.hire_date" type="date" class="input mt-1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Employment Type</label>
            <select v-model="form.employment_type" class="input mt-1">
              <option value="">Select Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Temporary">Temporary</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Location</label>
            <input v-model="form.location" type="text" class="input mt-1" placeholder="Delhi" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Status</label>
            <select v-model="form.status" class="input mt-1">
              <option value="">Select Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <!-- Manager Selection -->
        <div class="mt-4">
          <label class="block text-sm font-medium text-slate-700">Manager</label>
          <select v-model="form.manager_id" class="input mt-1">
            <option value="">Select Manager</option>
            <option v-for="emp in managers" :key="emp.id" :value="emp.id">
              {{ emp.first_name }} {{ emp.last_name }} ({{ emp.designation }})
            </option>
          </select>
        </div>

        <!-- Working Days -->
        <div class="mt-4">
          <label class="block text-sm font-medium text-slate-700 mb-2">Working Days</label>
          <div class="flex flex-wrap gap-3">
            <label v-for="(day, idx) in workDays" :key="idx" class="flex items-center">
              <input
                type="checkbox"
                :checked="form.working_days.includes(idx)"
                @change="toggleWorkingDay(idx)"
                class="rounded border-slate-300"
              />
              <span class="ml-2 text-sm text-slate-700">{{ day }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Personal Information Section -->
      <div class="rounded-lg border border-slate-200 bg-white p-6">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Personal Information</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700">Date of Birth</label>
            <input v-model="form.date_of_birth" type="date" class="input mt-1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Gender</label>
            <select v-model="form.gender" class="input mt-1">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700">Address</label>
            <textarea v-model="form.address" class="input mt-1" rows="3" placeholder="Street address"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Nationality</label>
            <input v-model="form.nationality" type="text" class="input mt-1" placeholder="Indian" />
          </div>
        </div>
      </div>

      <!-- Banking Information Section -->
      <div class="rounded-lg border border-slate-200 bg-white p-6">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Banking Information</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700">Bank Name</label>
            <input v-model="form.bank_name" type="text" class="input mt-1" placeholder="HDFC Bank" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Account Number</label>
            <input v-model="form.account_number" type="text" class="input mt-1" placeholder="Account number" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">IFSC Code</label>
            <input v-model="form.ifsc_code" type="text" class="input mt-1" placeholder="HDFC0000001" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">PAN Number</label>
            <input v-model="form.pan_number" type="text" class="input mt-1" placeholder="AAAPA1234A" />
          </div>
        </div>
      </div>

      <!-- Emergency Contact Section -->
      <div class="rounded-lg border border-slate-200 bg-white p-6">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Emergency Contact</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700">Contact Name</label>
            <input v-model="form.emergency_contact_name" type="text" class="input mt-1" placeholder="Name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Contact Phone</label>
            <input v-model="form.emergency_contact_phone" type="tel" class="input mt-1" placeholder="Phone" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700">Relationship</label>
            <input v-model="form.emergency_contact_relationship" type="text" class="input mt-1" placeholder="Spouse/Parent/Sibling" />
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="flex justify-end gap-3">
        <button type="button" class="btn-ghost" @click="$emit('cancel')">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Saving…' : isEdit ? 'Update Employee' : 'Create Employee' }}
        </button>
      </div>

      <!-- Error Message -->
      <p v-if="generalError" class="rounded-lg bg-red-50 p-4 text-sm text-red-600">{{ generalError }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { updateEmployee, createEmployee, listEmployees } from '@/services/employee'

interface Props {
  employeeId?: number | null
  initialData?: any
}

interface EmployeeForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  employee_id: string
  designation: string
  department: string
  role: string
  hire_date: string
  employment_type: string
  location: string
  status: string
  manager_id: number | null
  working_days: number[]
  date_of_birth: string
  gender: string
  address: string
  nationality: string
  bank_name: string
  account_number: string
  ifsc_code: string
  pan_number: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relationship: string
}

const props = withDefaults(defineProps<Props>(), {
  employeeId: null,
  initialData: () => ({}),
})

const emit = defineEmits<{
  (e: 'submit', data: EmployeeForm): void
  (e: 'cancel'): void
}>()

const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const loading = ref(false)
const generalError = ref('')
const managers = ref<any[]>([])
const isEdit = computed(() => !!props.employeeId)

const form = reactive<EmployeeForm>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  employee_id: '',
  designation: '',
  department: '',
  role: '',
  hire_date: '',
  employment_type: '',
  location: '',
  status: 'Active',
  manager_id: null,
  working_days: [1, 2, 3, 4, 5],
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
})

const errors = reactive<Record<string, string>>({})

function toggleWorkingDay(day: number) {
  const idx = form.working_days.indexOf(day)
  if (idx > -1) {
    form.working_days.splice(idx, 1)
  } else {
    form.working_days.push(day)
    form.working_days.sort()
  }
}

async function fetchManagers() {
  try {
    const response = await listEmployees({ status: 'Active' })
    managers.value = Array.isArray(response.data) ? response.data : response.data?.data || []
  } catch (e) {
    console.error('Failed to fetch managers', e)
  }
}

async function submit() {
  loading.value = true
  generalError.value = ''
  Object.keys(errors).forEach(key => delete errors[key])

  try {
    const payload = { ...form }
    if (isEdit.value && props.employeeId) {
      await updateEmployee(props.employeeId, payload)
    } else {
      await createEmployee(payload)
    }
    emit('submit', form)
  } catch (e: any) {
    const errorData = e?.response?.data
    if (errorData?.errors) {
      Object.assign(errors, errorData.errors)
    } else {
      generalError.value = errorData?.message || 'An error occurred'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchManagers()
  if (props.initialData && Object.keys(props.initialData).length > 0) {
    Object.assign(form, props.initialData)
  }
})
</script>

<style scoped>
.input {
  @apply w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500;
}

.btn-primary {
  @apply inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50;
}

.btn-ghost {
  @apply inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50;
}
</style>
