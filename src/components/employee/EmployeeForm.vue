<template>
  <div class="ef-wrap">
    <form @submit.prevent="submit" class="ef-form">

      <!-- Basic Information -->
      <div class="ef-section">
        <h2 class="ef-section-title">Basic Information</h2>
        <div class="ef-grid">
          <div class="ef-field">
            <label class="ef-label">First Name <span class="req">*</span></label>
            <input v-model="form.first_name" type="text" required class="ef-input" placeholder="John" />
            <p v-if="errors.first_name" class="ef-err">{{ errors.first_name }}</p>
          </div>
          <div class="ef-field">
            <label class="ef-label">Last Name</label>
            <input v-model="form.last_name" type="text" class="ef-input" placeholder="Doe" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Official Email <span class="req">*</span></label>
            <input
              v-model="form.email"
              type="email"
              required
              class="ef-input"
              :class="{ 'ef-input--locked': isEdit }"
              placeholder="john@company.com"
              :disabled="isEdit"
            />
            <p v-if="isEdit" class="ef-hint">Email cannot be changed after creation.</p>
            <p v-if="errors.email" class="ef-err">{{ errors.email }}</p>
          </div>
          <div class="ef-field">
            <label class="ef-label">Phone <span class="req">*</span></label>
            <input v-model="form.phone" type="tel" required class="ef-input" placeholder="+91 98xxxxxxxx" />
          </div>
        </div>
      </div>

      <!-- Employment Details -->
      <div class="ef-section">
        <h2 class="ef-section-title">Employment Details</h2>
        <div class="ef-grid">
          <div class="ef-field">
            <label class="ef-label">Employee Code <span class="req">*</span></label>
            <input
              v-model="form.employee_id"
              type="text"
              required
              class="ef-input"
              :class="{ 'ef-input--locked': isEdit }"
              placeholder="EMP001"
              :disabled="isEdit"
            />
            <p v-if="isEdit" class="ef-hint">Employee code is immutable.</p>
            <p v-if="errors.employee_id" class="ef-err">{{ errors.employee_id }}</p>
          </div>
          <div class="ef-field">
            <label class="ef-label">Designation</label>
            <input v-model="form.designation" type="text" class="ef-input" placeholder="Senior Developer" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Department</label>
            <input v-model="form.department" type="text" class="ef-input" placeholder="Engineering" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Role</label>
            <select v-model="form.role" class="ef-input">
              <option value="">Select Role</option>
              <option value="admin">Admin</option>
              <option value="hr_manager">HR Manager</option>
              <option value="manager">Manager</option>
              <option value="team_lead">Team Lead</option>
              <option value="employee">Employee</option>
            </select>
          </div>
          <div class="ef-field">
            <label class="ef-label">Date of Joining</label>
            <input v-model="form.hire_date" type="date" class="ef-input" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Employment Type</label>
            <select v-model="form.employment_type" class="ef-input">
              <option value="">Select Type</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Temporary</option>
              <option>Internship</option>
            </select>
          </div>
          <div class="ef-field">
            <label class="ef-label">Location</label>
            <input v-model="form.location" type="text" class="ef-input" placeholder="Bangalore" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Status</label>
            <select v-model="form.status" class="ef-input">
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <!-- Manager -->
        <div class="ef-field ef-field--full">
          <label class="ef-label">Reporting Manager</label>
          <select v-model="form.manager_id" class="ef-input">
            <option :value="null">No Manager</option>
            <option v-for="emp in managers" :key="emp.id" :value="emp.id">
              {{ emp.first_name }} {{ emp.last_name }}
              <template v-if="emp.designation"> — {{ emp.designation }}</template>
            </option>
          </select>
        </div>

        <!-- Team Lead -->
        <div class="ef-field ef-field--full">
          <label class="ef-label">Team Lead</label>
          <select v-model="form.team_lead_id" class="ef-input">
            <option :value="null">No Team Lead</option>
            <option v-for="emp in teamLeads" :key="emp.id" :value="emp.id">
              {{ emp.first_name }} {{ emp.last_name }}
              <template v-if="emp.designation"> — {{ emp.designation }}</template>
            </option>
          </select>
        </div>

        <!-- Working Days -->
        <div class="ef-field ef-field--full">
          <label class="ef-label">Working Days</label>
          <div class="days-grid">
            <label v-for="(day, idx) in workDays" :key="idx" class="day-chip" :class="{ 'day-chip--on': form.working_days.includes(idx) }">
              <input
                type="checkbox"
                class="day-chk"
                :checked="form.working_days.includes(idx)"
                @change="toggleWorkingDay(idx)"
              />
              {{ day.slice(0, 3) }}
            </label>
          </div>
        </div>
      </div>

      <!-- Personal Information -->
      <div class="ef-section">
        <h2 class="ef-section-title">Personal Information</h2>
        <div class="ef-grid">
          <div class="ef-field">
            <label class="ef-label">Date of Birth</label>
            <input v-model="form.date_of_birth" type="date" class="ef-input" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Gender</label>
            <select v-model="form.gender" class="ef-input">
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div class="ef-field ef-field--full">
            <label class="ef-label">Address</label>
            <textarea v-model="form.address" class="ef-input ef-textarea" rows="2" placeholder="Street address"></textarea>
          </div>
          <div class="ef-field">
            <label class="ef-label">Nationality</label>
            <input v-model="form.nationality" type="text" class="ef-input" placeholder="Indian" />
          </div>
        </div>
      </div>

      <!-- Banking Information -->
      <div class="ef-section">
        <h2 class="ef-section-title">Banking Information</h2>
        <div class="ef-grid">
          <div class="ef-field">
            <label class="ef-label">Bank Name</label>
            <input v-model="form.bank_name" type="text" class="ef-input" placeholder="HDFC Bank" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Account Number</label>
            <input v-model="form.account_number" type="text" class="ef-input" placeholder="Account number" />
          </div>
          <div class="ef-field">
            <label class="ef-label">IFSC Code</label>
            <input v-model="form.ifsc_code" type="text" class="ef-input" placeholder="HDFC0000001" />
          </div>
          <div class="ef-field">
            <label class="ef-label">PAN Number</label>
            <input v-model="form.pan_number" type="text" class="ef-input" placeholder="AAAPA1234A" />
          </div>
        </div>
      </div>

      <!-- Emergency Contact -->
      <div class="ef-section">
        <h2 class="ef-section-title">Emergency Contact</h2>
        <div class="ef-grid">
          <div class="ef-field">
            <label class="ef-label">Name</label>
            <input v-model="form.emergency_contact_name" type="text" class="ef-input" placeholder="Contact name" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Phone</label>
            <input v-model="form.emergency_contact_phone" type="tel" class="ef-input" placeholder="Phone" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Relationship</label>
            <input v-model="form.emergency_contact_relationship" type="text" class="ef-input" placeholder="Spouse / Parent / Sibling" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="generalError" class="ef-error-box">{{ generalError }}</div>

      <!-- Actions -->
      <div class="ef-actions">
        <button type="button" class="ef-btn ef-btn--ghost" @click="$emit('cancel')">Cancel</button>
        <button type="submit" class="ef-btn ef-btn--primary" :disabled="loading">
          {{ loading ? 'Saving…' : isEdit ? 'Update Employee' : 'Create Employee' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import { updateEmployee, createEmployee, listEmployees } from '@/services/employee'

interface EmployeeData {
  id?: number | string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  employee_id?: string
  designation?: string
  department?: string
  role?: string
  hire_date?: string
  employment_type?: string
  location?: string
  status?: string
  manager_id?: number | null
  team_lead_id?: number | null
  working_days?: number[]
  date_of_birth?: string
  gender?: string
  address?: string
  nationality?: string
  bank_name?: string
  account_number?: string
  ifsc_code?: string
  pan_number?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
  [key: string]: unknown
}

interface Props {
  employeeId?: number | null
  initialData?: EmployeeData
}

const props = withDefaults(defineProps<Props>(), {
  employeeId: null,
  initialData: () => ({}),
})

const emit = defineEmits<{
  (e: 'submit', data: EmployeeData): void
  (e: 'cancel'): void
}>()

const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const loading = ref(false)
const generalError = ref('')
const managers = ref<EmployeeData[]>([])
const isEdit = computed(() => !!props.employeeId)

const form = reactive({
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
  manager_id: null as number | null,
  team_lead_id: null as number | null,
  working_days: [0, 1, 2, 3, 4] as number[],
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

// Team leads are employees with role team_lead or manager
const teamLeads = computed(() =>
  managers.value.filter(e =>
    ['team_lead', 'manager', 'admin', 'hr_manager'].includes((e.role || '').toLowerCase())
  )
)

function toggleWorkingDay(day: number) {
  const idx = form.working_days.indexOf(day)
  if (idx > -1) form.working_days.splice(idx, 1)
  else { form.working_days.push(day); form.working_days.sort() }
}

async function fetchManagers() {
  try {
    const response = await listEmployees({ status: 'Active' })
    managers.value = Array.isArray(response.data) ? response.data : response.data?.data || []
  } catch { /* ignore */ }
}

async function submit() {
  loading.value = true
  generalError.value = ''
  Object.keys(errors).forEach(k => delete errors[k])
  try {
    const payload = { ...form }
    if (isEdit.value && props.employeeId) {
      await updateEmployee(props.employeeId, payload)
    } else {
      await createEmployee(payload)
    }
    emit('submit', form)
  } catch (e) {
    const d = (e as { response?: { data?: { errors?: Record<string, string>; message?: string } } })?.response?.data
    if (d?.errors) Object.assign(errors, d.errors)
    else generalError.value = d?.message || 'An error occurred'
  } finally {
    loading.value = false
  }
}

// Apply initialData synchronously so the initial render is already correct
if (props.initialData && Object.keys(props.initialData).length > 0) {
  Object.assign(form, props.initialData)
}

onMounted(() => {
  fetchManagers()
})
</script>

<style scoped>
.ef-wrap  { color: var(--text); }
.ef-form  { display: flex; flex-direction: column; gap: 20px; }

.ef-section {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ef-section-title { font-size: 0.95rem; font-weight: 600; color: var(--text); padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,.06); }

.ef-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
@media (max-width: 640px) { .ef-grid { grid-template-columns: 1fr; } }

.ef-field { display: flex; flex-direction: column; gap: 5px; }
.ef-field--full { grid-column: 1 / -1; }

.ef-label { font-size: 0.8rem; font-weight: 500; color: var(--muted); }
.req { color: var(--red); }

.ef-input {
  background: var(--surface2);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 7px;
  padding: 8px 12px;
  font-size: 0.875rem;
  color: var(--text);
  outline: none;
  transition: border-color .15s;
  width: 100%;
  box-sizing: border-box;
}
.ef-input:focus { border-color: var(--accent); }
.ef-input--locked { opacity: .5; cursor: not-allowed; }
.ef-input:disabled { opacity: .5; cursor: not-allowed; }
.ef-textarea { resize: vertical; min-height: 64px; }

.ef-hint { font-size: 0.75rem; color: var(--muted); }
.ef-err  { font-size: 0.75rem; color: var(--red); }

/* Working days */
.days-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.day-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  background: var(--surface2);
  border: 1px solid rgba(255,255,255,.08);
  color: var(--muted);
  user-select: none;
  transition: all .12s;
}
.day-chip--on { background: rgba(79,126,255,.18); border-color: var(--accent); color: var(--accent); }
.day-chk { display: none; }

/* Error box */
.ef-error-box { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.25); border-radius: 8px; padding: 12px 16px; font-size: 0.875rem; color: var(--red); }

/* Actions */
.ef-actions { display: flex; justify-content: flex-end; gap: 10px; }
.ef-btn { display: inline-flex; align-items: center; border-radius: 8px; padding: 9px 20px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; }
.ef-btn:disabled { opacity: .5; cursor: not-allowed; }
.ef-btn--primary { background: var(--accent); color: #fff; }
.ef-btn--primary:not(:disabled):hover { opacity: .88; }
.ef-btn--ghost { background: var(--surface2); border: 1px solid rgba(255,255,255,.1); color: var(--text); }
.ef-btn--ghost:hover { background: var(--surface3); }
</style>
