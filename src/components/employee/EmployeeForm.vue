<template>
  <div class="ef-wrap">

    <!-- Step tabs -->
    <div class="ef-tabs">
      <button
        v-for="(tab, i) in tabs"
        :key="i"
        type="button"
        class="ef-tab"
        :class="{ 'ef-tab--active': activeTab === i, 'ef-tab--done': i < activeTab }"
        @click="goTo(i)"
      >
        <span class="ef-tab-num">
          <svg v-if="i < activeTab" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span class="ef-tab-label">{{ tab }}</span>
      </button>
    </div>

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
            {{ loading ? 'Saving…' : isEdit ? 'Update Employee' : 'Save Employee' }}
          </button>
          <button v-if="activeTab < tabs.length - 1" type="button" class="ef-btn ef-btn--primary" @click="goTo(activeTab + 1)">
            Next →
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { reactive, ref, computed, onMounted } from 'vue'
import { updateEmployee, createEmployee, listEmployees } from '@/services/employee'
import api from '@/services/api'

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

  loading.value = true
  try {
    const payload = { ...form }
    if (isEdit.value && props.employeeId) {
      await updateEmployee(props.employeeId, payload)
    } else {
      await createEmployee(payload)
    }
    emit('submit', form)
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
.ef-wrap { color: var(--text); display: flex; flex-direction: column; gap: 0; }

/* ── Tabs ── */
.ef-tabs {
  display: flex; gap: 0; border-bottom: 1px solid var(--border, rgba(255,255,255,.08));
  margin-bottom: 20px; overflow-x: auto;
}
.ef-tab {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 18px; font-size: 13px; font-weight: 500;
  background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--muted); cursor: pointer; white-space: nowrap;
  transition: all .15s; margin-bottom: -1px;
}
.ef-tab:hover { color: var(--text); }
.ef-tab--active { color: var(--accent); border-bottom-color: var(--accent); }
.ef-tab--done { color: var(--green, #36D399); }
.ef-tab-num {
  width: 20px; height: 20px; border-radius: 50%; font-size: 11px; font-weight: 700;
  display: grid; place-items: center;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  flex-shrink: 0;
}
.ef-tab--active .ef-tab-num { background: rgba(79,126,255,.18); border-color: var(--accent); color: var(--accent); }
.ef-tab--done  .ef-tab-num { background: rgba(54,211,153,.18); border-color: var(--green, #36D399); color: var(--green, #36D399); }
.ef-tab-label { }

/* ── Form ── */
.ef-form { display: flex; flex-direction: column; gap: 20px; }

/* ── Panel ── */
.ef-panel {
  background: var(--surface, #141720);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.ef-panel-head { display: flex; align-items: flex-start; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,.06); }
.ef-panel-icon {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: rgba(79,126,255,.12); border: 1px solid rgba(79,126,255,.2);
  display: grid; place-items: center; color: var(--accent);
}
.ef-panel-title { font-size: 14px; font-weight: 600; color: var(--text); }
.ef-panel-sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }

.ef-subsection-label {
  font-size: 11px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: .6px;
}
.ef-divider { height: 1px; background: rgba(255,255,255,.06); margin: 4px 0; }

/* ── Grid ── */
.ef-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 600px) { .ef-grid { grid-template-columns: 1fr; } }

.ef-field { display: flex; flex-direction: column; gap: 5px; }
.ef-field--full { grid-column: 1 / -1; }

/* ── Labels / inputs ── */
.ef-label { font-size: 12px; font-weight: 500; color: var(--muted); }
.req { color: var(--red, #FF6B6B); }

.ef-input {
  background: var(--surface2, #1C2030);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 7px; padding: 8px 12px;
  font-size: 13px; color: var(--text);
  outline: none; transition: border-color .15s;
  width: 100%; box-sizing: border-box;
}
.ef-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(79,126,255,.1); }
.ef-input--locked, .ef-input:disabled { opacity: .5; cursor: not-allowed; }
.ef-textarea { resize: vertical; min-height: 64px; }

.ef-hint { font-size: 12px; color: var(--muted); }
.ef-err  { font-size: 12px; color: var(--red, #FF6B6B); }

/* ── Working days ── */
.days-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.day-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
  cursor: pointer; user-select: none; transition: all .12s;
  background: var(--surface2, #1C2030); border: 1px solid rgba(255,255,255,.08); color: var(--muted);
}
.day-chip--on { background: rgba(79,126,255,.18); border-color: var(--accent); color: var(--accent); }
.day-chk { display: none; }

/* ── Error box ── */
.ef-error-box {
  background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.25);
  border-radius: 8px; padding: 12px 16px; font-size: 13px; color: var(--red, #FF6B6B);
}

/* ── Actions ── */
.ef-actions { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.ef-actions-right { display: flex; gap: 8px; }
.ef-btn {
  display: inline-flex; align-items: center; border-radius: 8px;
  padding: 9px 20px; font-size: 13px; font-weight: 500; cursor: pointer; border: none;
}
.ef-btn:disabled { opacity: .5; cursor: not-allowed; }
.ef-btn--primary { background: var(--accent); color: #fff; }
.ef-btn--primary:not(:disabled):hover { opacity: .88; }
.ef-btn--save {
  background: var(--surface2, #1C2030);
  border: 1px solid rgba(79,126,255,.35);
  color: var(--accent);
}
.ef-btn--save:not(:disabled):hover { background: rgba(79,126,255,.12); }
.ef-btn--ghost {
  background: var(--surface2, #1C2030);
  border: 1px solid rgba(255,255,255,.1);
  color: var(--text);
}
.ef-btn--ghost:hover { background: var(--surface3, #222840); }
</style>
