<template>
  <div class="ef-page">

    <!-- Left sidebar: step tracker -->
    <div class="ef-sidebar">
      <!-- Progress header -->
      <div class="ef-sidebar-head">
        <div class="ef-sidebar-eyebrow">Setup</div>
        <div class="ef-sidebar-progress-label">{{ activeTab + 1 }} of {{ tabs.length }} done</div>
        <div class="ef-sidebar-bar-track">
          <div class="ef-sidebar-bar-fill" :style="{ width: ((activeTab + 1) / tabs.length * 100) + '%' }"></div>
        </div>
      </div>
      <!-- Step list -->
      <div class="ef-step-list">
        <div
          v-for="(tab, i) in tabs"
          :key="i"
          :class="['ef-step', i === activeTab && 'ef-step--active', i < activeTab && 'ef-step--done']"
          @click="goTo(i)"
        >
          <div :class="['ef-step-badge', i === activeTab && 'ef-step-badge--active', i < activeTab && 'ef-step-badge--done']">
            <svg v-if="i < activeTab" width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2 6l3 3 5-5"/>
            </svg>
            <template v-else>{{ i + 1 }}</template>
          </div>
          <span class="ef-step-label">{{ tab }}</span>
        </div>
      </div>
    </div>

    <!-- Center: form -->
    <form @submit.prevent="submit" class="ef-form" novalidate>

      <!-- ── Step 0: Basic Information ───────────────────────────────── -->
      <div v-show="activeTab === 0" class="ef-panel">
        <div class="ef-panel-head">
          <div class="ef-panel-icon">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
            </svg>
          </div>
          <div>
            <div class="ef-panel-eyebrow">Step 1 of 4</div>
            <div class="ef-panel-title">Basic Information</div>
            <div class="ef-panel-sub">Name, contact details and account email</div>
          </div>
        </div>
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
            <p v-if="errors.phone" class="ef-err">{{ errors.phone }}</p>
          </div>
        </div>
      </div>

      <!-- ── Step 1: Employment Details ─────────────────────────────── -->
      <div v-show="activeTab === 1" class="ef-panel">
        <div class="ef-panel-head">
          <div class="ef-panel-icon">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6 6V5a3 3 0 016 0v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 012 0v1H8V5zm1 5a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" clip-rule="evenodd"/>
              <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
            </svg>
          </div>
          <div>
            <div class="ef-panel-eyebrow">Step 2 of 4</div>
            <div class="ef-panel-title">Employment Details</div>
            <div class="ef-panel-sub">Role, department, schedule and reporting structure</div>
          </div>
        </div>
        <div class="ef-grid">
          <div class="ef-field">
            <label class="ef-label">Employee Code</label>
            <div v-if="isEdit" class="ef-code-badge ef-code-badge--locked">
              {{ form.employee_id || '—' }}
            </div>
            <div v-else class="ef-code-badge ef-code-badge--auto">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style="flex-shrink:0">
                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
              </svg>
              <span>Auto-generated on save<template v-if="employeePrefix"> — preview: <strong>{{ employeePrefix }}0001</strong></template></span>
            </div>
            <p class="ef-hint">Employee code is auto-generated and cannot be edited.</p>
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
          <div class="ef-field">
            <label class="ef-label">Reporting Manager</label>
            <select v-model="form.manager_id" class="ef-input">
              <option :value="null">No Manager</option>
              <option v-for="emp in managers" :key="emp.id" :value="emp.id">
                {{ emp.first_name }} {{ emp.last_name }}<template v-if="emp.designation"> — {{ emp.designation }}</template>
              </option>
            </select>
          </div>
          <div class="ef-field">
            <label class="ef-label">Team Lead</label>
            <select v-model="form.team_lead_id" class="ef-input">
              <option :value="null">No Team Lead</option>
              <option v-for="emp in teamLeads" :key="emp.id" :value="emp.id">
                {{ emp.first_name }} {{ emp.last_name }}<template v-if="emp.designation"> — {{ emp.designation }}</template>
              </option>
            </select>
          </div>
        </div>
        <!-- Working Days -->
        <div class="ef-field" style="margin-top:4px">
          <label class="ef-label">Working Days</label>
          <div class="days-grid">
            <label
              v-for="(day, idx) in workDays"
              :key="idx"
              class="day-chip"
              :class="{ 'day-chip--on': form.working_days.includes(idx) }"
            >
              <input type="checkbox" class="day-chk" :checked="form.working_days.includes(idx)" @change="toggleWorkingDay(idx)" />
              {{ day.slice(0, 3) }}
            </label>
          </div>
        </div>
      </div>

      <!-- ── Step 2: Personal Information ───────────────────────────── -->
      <div v-show="activeTab === 2" class="ef-panel">
        <div class="ef-panel-head">
          <div class="ef-panel-icon">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <div class="ef-panel-eyebrow">Step 3 of 4</div>
            <div class="ef-panel-title">Personal Information</div>
            <div class="ef-panel-sub">Date of birth, gender, address and nationality</div>
          </div>
        </div>
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
          <div class="ef-field">
            <label class="ef-label">Nationality</label>
            <input v-model="form.nationality" type="text" class="ef-input" placeholder="Indian" />
          </div>
          <div class="ef-field ef-field--full">
            <label class="ef-label">Address</label>
            <textarea v-model="form.address" class="ef-input ef-textarea" rows="2" placeholder="Street address"></textarea>
          </div>
        </div>
      </div>

      <!-- ── Step 3: Banking & Emergency ────────────────────────────── -->
      <div v-show="activeTab === 3" class="ef-panel">
        <div class="ef-panel-head">
          <div class="ef-panel-icon">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
              <path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div>
            <div class="ef-panel-eyebrow">Step 4 of 4</div>
            <div class="ef-panel-title">Banking & Emergency</div>
            <div class="ef-panel-sub">Bank account details and emergency contact</div>
          </div>
        </div>

        <div class="ef-subsection-label">Bank Details</div>
        <div class="ef-grid">
          <div class="ef-field">
            <label class="ef-label">Bank Name</label>
            <input v-model="form.bank_name" type="text" class="ef-input" placeholder="HDFC Bank" />
          </div>
          <div class="ef-field">
            <label class="ef-label">Account Number</label>
            <input v-model="form.account_number" type="text" class="ef-input" placeholder="Account number" />
            <p v-if="errors.account_number" class="ef-err">{{ errors.account_number }}</p>
          </div>
          <div class="ef-field">
            <label class="ef-label">IFSC Code</label>
            <input v-model="form.ifsc_code" type="text" class="ef-input" placeholder="HDFC0000001" />
            <p v-if="errors.ifsc_code" class="ef-err">{{ errors.ifsc_code }}</p>
          </div>
          <div class="ef-field">
            <label class="ef-label">PAN Number</label>
            <input v-model="form.pan_number" type="text" class="ef-input" placeholder="AAAPA1234A" />
            <p v-if="errors.pan_number" class="ef-err">{{ errors.pan_number }}</p>
          </div>
        </div>

        <div class="ef-divider"></div>
        <div class="ef-subsection-label">Emergency Contact</div>
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
        <button type="button" class="ef-btn ef-btn--ghost" @click="activeTab > 0 ? activeTab-- : $emit('cancel')">
          {{ activeTab > 0 ? '← Back' : 'Cancel' }}
        </button>
        <div class="ef-actions-right">
          <button type="submit" class="ef-btn ef-btn--save" :disabled="loading">
            <span v-if="loading" class="mini-spin"></span>
            {{ loading ? 'Saving…' : isEdit ? 'Update Employee' : 'Save Employee' }}
          </button>
          <button v-if="activeTab < tabs.length - 1" type="button" class="ef-btn ef-btn--primary" @click="goTo(activeTab + 1)">
            Next →
          </button>
        </div>
      </div>
    </form>

    <!-- Right rail: live preview -->
    <div class="ef-preview">
      <!-- Live preview card -->
      <div class="ef-prev-card">
        <div class="ef-prev-eyebrow">Live preview</div>
        <div class="ef-prev-avatar">
          <EmpAvatar :name="previewName" :size="52" />
        </div>
        <div class="ef-prev-name">{{ previewName }}</div>
        <div class="ef-prev-sub">{{ form.designation || 'Designation' }} · {{ form.department || 'Department' }}</div>
        <div class="ef-prev-grid">
          <div v-for="item in previewItems" :key="item.label" class="ef-prev-item">
            <div class="ef-prev-item-label">{{ item.label }}</div>
            <div class="ef-prev-item-val">{{ item.value }}</div>
          </div>
        </div>
      </div>
      <!-- What happens next card -->
      <div class="ef-next-card">
        <div class="ef-next-eyebrow">What happens next</div>
        <div class="ef-next-list">
          <div v-for="(item, i) in whatHappensNext" :key="i" class="ef-next-item">
            <div class="ef-next-dot"></div>
            <span>{{ item }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { reactive, ref, computed, onMounted } from 'vue'
import { updateEmployee, createEmployee, listEmployees } from '@/services/employee'
import api from '@/services/api'
import EmpAvatar from '@/components/employee/EmpAvatar.vue'

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
  (e: 'success', data: EmployeeData): void
  (e: 'cancel'): void
}>()

const tabs = ['Basic Info', 'Employment', 'Personal', 'Banking & Emergency']
const activeTab = ref(0)

function goTo(i: number) {
  activeTab.value = i
}

const workDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const loading = ref(false)
const generalError = ref('')
const managers = ref<EmployeeData[]>([])
const employeePrefix = ref('EMP')
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

const teamLeads = computed(() =>
  managers.value.filter(e =>
    ['team_lead', 'manager', 'admin', 'hr_manager'].includes((e.role || '').toLowerCase())
  )
)

const previewName = computed(() =>
  [form.first_name, form.last_name].filter(Boolean).join(' ') || 'New Employee'
)

const previewItems = computed(() => [
  { label: 'Joins',    value: form.hire_date || '—' },
  { label: 'Location', value: form.location || '—' },
  { label: 'Type',     value: form.employment_type || '—' },
  { label: 'Status',   value: form.status || 'Active' },
])

const whatHappensNext = [
  'Invite email sent to employee',
  'Onboarding journey starts automatically',
  'Default password set — employee must reset',
  'Leave balances initialized',
]

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

async function fetchPrefix() {
  try {
    const { data } = await api.get('/system/settings')
    const settings: Record<string, string> = Array.isArray(data)
      ? Object.fromEntries(data.map((s: { key: string; value: string }) => [s.key, s.value]))
      : data
    employeePrefix.value = settings['employee_id_prefix'] || 'EMP'
  } catch { /* ignore */ }
}

async function submit() {
  generalError.value = ''
  Object.keys(errors).forEach(k => delete errors[k])

  // Manual validation for required fields (native validation disabled via novalidate)
  if (!form.first_name?.trim()) { errors.first_name = 'First name is required'; activeTab.value = 0; return }
  if (!form.email?.trim())      { errors.email = 'Email is required'; activeTab.value = 0; return }
  if (!form.phone?.trim())      { errors.phone = 'Phone is required'; activeTab.value = 0; return }

  // Phone: 7-15 digits (ignore spaces, dashes, parentheses, leading +)
  const phoneDigits = String(form.phone).replace(/[\s\-()+]/g, '')
  if (!/^\d{7,15}$/.test(phoneDigits)) {
    errors.phone = 'Phone must be 7-15 digits'
    activeTab.value = 0
    return
  }

  // PAN (India): ABCDE1234F
  if (form.pan_number?.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan_number.trim())) {
    errors.pan_number = 'PAN must be in format ABCDE1234F'
    activeTab.value = 3
    return
  }

  // IFSC: 4 letters + 0 + 6 alphanumeric
  if (form.ifsc_code?.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc_code.trim())) {
    errors.ifsc_code = 'Invalid IFSC code format'
    activeTab.value = 3
    return
  }

  // Bank account number: 9-18 digits
  if (form.account_number?.trim() && !/^\d{9,18}$/.test(form.account_number.trim())) {
    errors.account_number = 'Bank account number must be 9-18 digits'
    activeTab.value = 3
    return
  }

  // Aadhaar: 12 digits (only validated if the field is present on the form)
  const aadhaar = (form as Record<string, unknown>).aadhaar_number
  if (typeof aadhaar === 'string' && aadhaar.trim() && !/^\d{12}$/.test(aadhaar.trim())) {
    errors.aadhaar_number = 'Aadhaar must be 12 digits'
    activeTab.value = 3
    return
  }

  loading.value = true
  try {
    const payload = { ...form }
    if (isEdit.value && props.employeeId) {
      await updateEmployee(props.employeeId, payload)
    } else {
      await createEmployee(payload)
    }
    emit('success', form)
  } catch (e: any) {
    const d = e?.response?.data
    if (d?.errors) {
      Object.assign(errors, d.errors)
      // Jump to first tab that has an error
      const errorKey = Object.keys(d.errors)[0]
      const tabMap: Record<string, number> = {
        first_name: 0, last_name: 0, email: 0, phone: 0,
        employee_id: 1, designation: 1, department: 1, role: 1, hire_date: 1, employment_type: 1, location: 1, status: 1,
        date_of_birth: 2, gender: 2, address: 2, nationality: 2,
        bank_name: 3, account_number: 3, ifsc_code: 3, pan_number: 3,
        emergency_contact_name: 3, emergency_contact_phone: 3, emergency_contact_relationship: 3,
      }
      if (errorKey && tabMap[errorKey] !== undefined) activeTab.value = tabMap[errorKey]
    } else {
      generalError.value = d?.message || 'An error occurred'
    }
  } finally {
    loading.value = false
  }
}

if (props.initialData && Object.keys(props.initialData).length > 0) {
  Object.assign(form, props.initialData)
}

onMounted(() => {
  fetchManagers()
  fetchPrefix()
})
</script>

<style scoped>
/* ── Page layout ── */
.ef-page {
  display: grid;
  grid-template-columns: 220px 1fr 260px;
  gap: 0;
  min-height: 0;
}

/* ── Sidebar ── */
.ef-sidebar {
  background: #161A23;
  border-right: 1px solid #232936;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.ef-sidebar-head {
  padding: 18px 16px 14px;
  border-bottom: 1px solid #232936;
}
.ef-sidebar-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #7A8299;
}
.ef-sidebar-progress-label {
  font-size: 13.5px;
  font-weight: 600;
  color: #EEF0F4;
  margin-top: 4px;
}
.ef-sidebar-bar-track {
  height: 3px;
  background: #232936;
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}
.ef-sidebar-bar-fill {
  height: 100%;
  background: #6B5BFF;
  border-radius: 2px;
  transition: width .3s;
}

.ef-step-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ef-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border-radius: 7px;
  cursor: pointer;
  transition: background .12s;
}
.ef-step:hover { background: rgba(255,255,255,.03); }
.ef-step--active { background: rgba(107,91,255,.1); }
.ef-step-badge {
  width: 18px;
  height: 18px;
  border-radius: 9px;
  flex-shrink: 0;
  background: #232936;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #7A8299;
}
.ef-step-badge--active { background: #6B5BFF; color: #fff; }
.ef-step-badge--done   { background: #4DD39A; color: #fff; }
.ef-step-label { font-size: 12.5px; color: #7A8299; }
.ef-step--active .ef-step-label { color: #EEF0F4; }
.ef-step--done  .ef-step-label  { color: #A0B0B0; }

/* ── Center form ── */
.ef-form {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
}
.ef-panel {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex: 1;
}
.ef-panel-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #232936;
}
.ef-panel-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #7A8299;
}
.ef-panel-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  flex-shrink: 0;
  background: rgba(107,91,255,.12);
  border: 1px solid rgba(107,91,255,.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B5BFF;
}
.ef-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #EEF0F4;
  margin-top: 2px;
  letter-spacing: -0.01em;
}
.ef-panel-sub {
  font-size: 12px;
  color: #7A8299;
  margin-top: 3px;
}

.ef-subsection-label {
  font-size: 11px;
  font-weight: 600;
  color: #7A8299;
  text-transform: uppercase;
  letter-spacing: .6px;
}
.ef-divider {
  height: 1px;
  background: #232936;
  margin: 4px 0;
}

.ef-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.ef-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ef-field--full { grid-column: 1 / -1; }
.ef-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .4px;
  color: #7A8299;
}
.req { color: #F38288; }
.ef-input {
  background: #1C212C;
  border: 1px solid #232936;
  border-radius: 7px;
  padding: 8px 12px;
  font-size: 13px;
  color: #EEF0F4;
  outline: none;
  transition: border-color .15s;
  width: 100%;
  box-sizing: border-box;
}
.ef-input:focus {
  border-color: #6B5BFF;
  box-shadow: 0 0 0 3px rgba(107,91,255,.1);
}
.ef-input--locked,
.ef-input:disabled { opacity: .5; cursor: not-allowed; }
.ef-textarea {
  resize: vertical;
  min-height: 64px;
  font-family: inherit;
  line-height: 1.5;
}
select.ef-input option { color-scheme: dark; }
.ef-input[type="date"] { color-scheme: dark; }

.ef-code-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 12px;
}
.ef-code-badge--auto {
  background: rgba(107,91,255,.08);
  border: 1px solid rgba(107,91,255,.2);
  color: #8979FF;
}
.ef-code-badge--locked {
  background: #1C212C;
  border: 1px solid #232936;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
}
.ef-hint { font-size: 11px; color: #7A8299; margin: 0; }
.ef-err  { font-size: 11px; color: #F38288; margin: 0; }

.days-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 4px;
}
.day-chip {
  padding: 5px 13px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
  transition: all .12s;
  background: #1C212C;
  border: 1px solid #232936;
  color: #7A8299;
}
.day-chip--on {
  background: rgba(107,91,255,.15);
  border-color: #6B5BFF;
  color: #8979FF;
}
.day-chk { display: none; }

.ef-error-box {
  background: rgba(243,130,136,.1);
  border: 1px solid rgba(243,130,136,.25);
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 13px;
  color: #F38288;
  margin: 0 24px;
}
.ef-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #232936;
}
.ef-actions-right { display: flex; gap: 8px; }
.ef-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity .15s;
}
.ef-btn:disabled { opacity: .5; cursor: not-allowed; }
.ef-btn--primary { background: #6B5BFF; color: #fff; }
.ef-btn--primary:not(:disabled):hover { opacity: .88; }
.ef-btn--save {
  background: #1C212C;
  border: 1px solid rgba(107,91,255,.35);
  color: #6B5BFF;
}
.ef-btn--save:not(:disabled):hover { background: rgba(107,91,255,.12); }
.ef-btn--ghost {
  background: #1C212C;
  border: 1px solid #232936;
  color: #EEF0F4;
}
.ef-btn--ghost:hover { background: #232936; }

.mini-spin {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255,255,255,.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ef-spin .7s linear infinite;
}
@keyframes ef-spin { to { transform: rotate(360deg); } }

/* ── Right rail ── */
.ef-preview {
  background: #161A23;
  border-left: 1px solid #232936;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}
.ef-prev-card {
  background: #1C212C;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}
.ef-prev-eyebrow {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #7A8299;
  align-self: flex-start;
  margin-bottom: 6px;
}
.ef-prev-avatar  { margin-bottom: 6px; }
.ef-prev-name    { font-family: 'Instrument Serif', Georgia, serif; font-size: 16px; color: #EEF0F4; }
.ef-prev-sub     { font-size: 11px; color: #7A8299; margin-top: 2px; }
.ef-prev-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #232936;
  text-align: left;
  width: 100%;
}
.ef-prev-item-label {
  font-size: 9.5px;
  color: #7A8299;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.ef-prev-item-val {
  font-size: 11.5px;
  color: #EEF0F4;
  margin-top: 2px;
}

.ef-next-card {
  background: #1C212C;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 16px;
}
.ef-next-eyebrow {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: #7A8299;
  margin-bottom: 10px;
}
.ef-next-list { display: flex; flex-direction: column; gap: 8px; }
.ef-next-item { display: flex; gap: 8px; align-items: flex-start; }
.ef-next-dot {
  width: 5px;
  height: 5px;
  border-radius: 3px;
  background: #6B5BFF;
  margin-top: 5px;
  flex-shrink: 0;
}
.ef-next-item span { font-size: 11.5px; color: #7A8299; line-height: 1.5; }

@media (max-width: 900px) {
  .ef-page { grid-template-columns: 1fr; }
  .ef-sidebar { border-right: none; border-bottom: 1px solid #232936; }
  .ef-step-list { flex-direction: row; flex-wrap: wrap; }
  .ef-preview { display: none; }
}
</style>
