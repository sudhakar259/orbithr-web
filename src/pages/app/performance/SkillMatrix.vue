<script setup lang="ts">
defineOptions({ name: 'SkillMatrix' })
import { ref, onMounted, computed } from 'vue'
import api from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

interface SkillEntry {
  id: number
  employee_id: number
  employee?: { id: number; first_name: string; last_name?: string }
  employee_name?: string
  skill_name: string
  skill_category?: string
  proficiency_level: string
  years_of_experience?: number
  last_assessed?: string
  notes?: string
}

interface Employee {
  id: number
  first_name: string
  last_name?: string
  email: string
}

const { roles } = useAuth()
const toast = useToast()

const loading = ref(true)
const skills = ref<SkillEntry[]>([])
const employees = ref<Employee[]>([])
const filterEmployee = ref<number | ''>('')
const showAddModal = ref(false)
const saving = ref(false)

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const canManage = computed(
  () => rLower.value.includes('admin') || rLower.value.includes('hr_manager'),
)

const form = ref({
  employee_id: null as number | null,
  skill_name: '',
  skill_category: '',
  proficiency_level: 'beginner',
  years_of_experience: 0,
  notes: '',
})

const loadSkills = async () => {
  loading.value = true
  try {
    const params: Record<string, unknown> = {}
    if (filterEmployee.value) params.employee_id = filterEmployee.value
    const res = await api.get('/skill-matrix', { params })
    skills.value = res.data?.data ?? res.data ?? []
  } catch {
    toast.error('Failed to load skill matrix')
  } finally {
    loading.value = false
  }
}

const loadEmployees = async () => {
  try {
    const res = await api.get('/employees', { params: { per_page: 100 } })
    employees.value = res.data?.data ?? res.data ?? []
  } catch {
    /* silent */
  }
}

const addSkill = async () => {
  if (!form.value.employee_id || !form.value.skill_name) return
  saving.value = true
  try {
    await api.post('/skill-matrix', {
      employee_id: form.value.employee_id,
      skill_name: form.value.skill_name,
      skill_category: form.value.skill_category || undefined,
      proficiency_level: form.value.proficiency_level,
      years_of_experience: form.value.years_of_experience || undefined,
      notes: form.value.notes || undefined,
    })
    toast.success('Skill added')
    showAddModal.value = false
    form.value = {
      employee_id: null,
      skill_name: '',
      skill_category: '',
      proficiency_level: 'beginner',
      years_of_experience: 0,
      notes: '',
    }
    await loadSkills()
  } catch {
    toast.error('Failed to add skill')
  } finally {
    saving.value = false
  }
}

const deleteSkill = async (id: number) => {
  if (!(await dialog('Remove', 'Remove this skill entry?'))) return
  try {
    await api.delete(`/skill-matrix/${id}`)
    toast.success('Skill removed')
    await loadSkills()
  } catch {
    toast.error('Failed to remove skill')
  }
}

const getProficiencyClass = (level: string) => {
  const m: Record<string, string> = {
    beginner: 'prof-beginner',
    intermediate: 'prof-intermediate',
    advanced: 'prof-advanced',
    expert: 'prof-expert',
  }
  return m[level] || 'prof-beginner'
}

const getEmployeeName = (s: SkillEntry) => {
  if (s.employee) return `${s.employee.first_name} ${s.employee.last_name || ''}`.trim()
  return s.employee_name ?? '--'
}

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '--')

onMounted(async () => {
  await loadEmployees()
  await loadSkills()
})
</script>

<template>
  <div class="skills">
    <header class="skills-head">
      <div>
        <div class="skills-eyebrow">People intelligence</div>
        <h1 class="skills-title">Skill matrix</h1>
        <p class="skills-subtitle">Track skills and proficiency across the organization.</p>
      </div>
      <button v-if="canManage" class="btn btn-primary" @click="showAddModal = true">
        + Add skill
      </button>
    </header>

    <!-- Filter -->
    <div class="toolbar">
      <select v-model="filterEmployee" class="select" @change="loadSkills()">
        <option value="">All employees</option>
        <option v-for="emp in employees" :key="emp.id" :value="emp.id">
          {{ emp.first_name }} {{ emp.last_name || '' }}
        </option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-block">
      <div class="spinner"></div>
    </div>

    <!-- Content -->
    <template v-else>
      <div v-if="!skills.length" class="empty-pad">
        <div class="empty-title">No skills recorded</div>
        <div class="empty-sub">Add employee skills to build the matrix.</div>
      </div>
      <div v-else class="card pad0">
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Skill</th>
                <th>Category</th>
                <th>Proficiency</th>
                <th>Years exp.</th>
                <th>Last assessed</th>
                <th v-if="canManage" class="th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in skills" :key="s.id">
                <td class="td-strong">{{ getEmployeeName(s) }}</td>
                <td>{{ s.skill_name }}</td>
                <td class="td-muted">{{ s.skill_category || '—' }}</td>
                <td>
                  <span :class="['prof-badge', getProficiencyClass(s.proficiency_level)]">
                    {{ s.proficiency_level }}
                  </span>
                </td>
                <td class="td-mono">{{ s.years_of_experience ?? '—' }}</td>
                <td class="td-muted td-mono">{{ formatDate(s.last_assessed) }}</td>
                <td v-if="canManage" class="th-right">
                  <button class="btn-link btn-link-danger" @click="deleteSkill(s.id)">
                    Delete
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Add Skill Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal">
          <div class="modal-head">
            <h3 class="modal-title">Add skill</h3>
            <button class="modal-close" @click="showAddModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <form class="form" @submit.prevent="addSkill">
              <div class="field">
                <label>Employee <span class="req">*</span></label>
                <select v-model="form.employee_id" class="input" required>
                  <option :value="null" disabled>Select employee...</option>
                  <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                    {{ emp.first_name }} {{ emp.last_name || '' }}
                  </option>
                </select>
              </div>
              <div class="row2">
                <div class="field">
                  <label>Skill name <span class="req">*</span></label>
                  <input
                    v-model="form.skill_name"
                    required
                    class="input"
                    placeholder="e.g. JavaScript"
                  />
                </div>
                <div class="field">
                  <label>Category</label>
                  <input v-model="form.skill_category" class="input" placeholder="e.g. Frontend" />
                </div>
              </div>
              <div class="row2">
                <div class="field">
                  <label>Proficiency level</label>
                  <select v-model="form.proficiency_level" class="input">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div class="field">
                  <label>Years of experience</label>
                  <input
                    v-model.number="form.years_of_experience"
                    type="number"
                    min="0"
                    step="0.5"
                    class="input"
                  />
                </div>
              </div>
              <div class="field">
                <label>Notes</label>
                <textarea
                  v-model="form.notes"
                  class="input textarea"
                  rows="2"
                  placeholder="Optional notes"
                />
              </div>
            </form>
          </div>

          <div class="modal-foot">
            <button class="btn btn-secondary" @click="showAddModal = false">Cancel</button>
            <button
              class="btn btn-primary"
              :disabled="saving || !form.employee_id || !form.skill_name"
              @click="addSkill"
            >
              {{ saving ? 'Saving...' : 'Add skill' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.skills {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: #eef0f4;
}

.skills-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.skills-eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b5bff;
  font-weight: 600;
}

.skills-title {
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  letter-spacing: -0.02em;
  color: #eef0f4;
  margin: 4px 0 0 0;
  font-weight: 400;
}

.skills-subtitle {
  font-size: 12.5px;
  color: #7a8299;
  margin: 4px 0 0 0;
}

.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.select {
  background: #161a23;
  border: 1px solid #232936;
  color: #eef0f4;
  font-size: 12.5px;
  padding: 7px 12px;
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  font-family: inherit;
  min-width: 220px;
}

.select:focus {
  border-color: #6b5bff;
}

.state-block {
  text-align: center;
  padding: 48px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid #232936;
  border-top-color: #6b5bff;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-pad {
  padding: 56px 16px;
  text-align: center;
  background: #161a23;
  border: 1px dashed #232936;
  border-radius: 12px;
}

.empty-title {
  color: #eef0f4;
  font-size: 14px;
  font-weight: 500;
}

.empty-sub {
  color: #7a8299;
  font-size: 12.5px;
  margin-top: 6px;
}

.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}

.card.pad0 {
  padding: 0;
}

.table-wrap {
  overflow-x: auto;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

.tbl th {
  padding: 11px 16px;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #7a8299;
  text-align: left;
  background: #0d0f17;
  border-bottom: 1px solid #232936;
}

.tbl th.th-right,
.tbl td.th-right {
  text-align: right;
}

.tbl td {
  padding: 13px 16px;
  font-size: 12.5px;
  color: #eef0f4;
  border-bottom: 1px solid #232936;
}

.tbl tr:last-child td {
  border-bottom: none;
}

.tbl tbody tr:hover td {
  background: rgba(107, 91, 255, 0.04);
}

.td-strong {
  font-weight: 500;
}

.td-muted {
  color: #7a8299;
}

.td-mono {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}

.prof-badge {
  display: inline-flex;
  padding: 3px 9px;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border: 1px solid transparent;
}

.prof-beginner {
  background: rgba(122, 130, 153, 0.12);
  color: #7a8299;
  border-color: rgba(122, 130, 153, 0.25);
}

.prof-intermediate {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.3);
}

.prof-advanced {
  background: rgba(107, 91, 255, 0.12);
  color: #6b5bff;
  border-color: rgba(107, 91, 255, 0.3);
}

.prof-expert {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}

.btn {
  font-size: 12.5px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.btn-primary {
  background: #6b5bff;
  color: #fff;
}

.btn-primary:hover {
  background: #5a4ce6;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border-color: #232936;
  color: #eef0f4;
}

.btn-secondary:hover {
  border-color: #6b5bff;
  color: #6b5bff;
}

.btn-link {
  background: transparent;
  border: none;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  padding: 0;
}

.btn-link-danger {
  color: #f38288;
}

.btn-link-danger:hover {
  color: #ff9aa1;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 15, 23, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 50;
}

.modal {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 14px;
  width: 100%;
  max-width: 600px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #232936;
}

.modal-title {
  font-family: 'Instrument Serif', serif;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: #eef0f4;
  margin: 0;
  font-weight: 400;
}

.modal-close {
  background: transparent;
  border: none;
  color: #7a8299;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.modal-close:hover {
  color: #eef0f4;
}

.modal-body {
  padding: 18px 20px;
  overflow-y: auto;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid #232936;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field label {
  font-size: 10.5px;
  font-weight: 600;
  color: #7a8299;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.req {
  color: #f38288;
}

.input {
  padding: 9px 12px;
  font-size: 12.5px;
  color: #eef0f4;
  background: #0d0f17;
  border: 1px solid #232936;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
}

.input:focus {
  border-color: #6b5bff;
}

.textarea {
  resize: vertical;
  min-height: 60px;
}

.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
