<script setup lang="ts">
defineOptions({ name: 'SkillMatrix' })
import { ref, onMounted, computed } from 'vue'
import api from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import PageHeader from '@/components/ui/PageHeader.vue'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

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
    form.value = { employee_id: null, skill_name: '', skill_category: '', proficiency_level: 'beginner', years_of_experience: 0, notes: '' }
    await loadSkills()
  } catch {
    toast.error('Failed to add skill')
  } finally {
    saving.value = false
  }
}

const deleteSkill = async (id: number) => {
  if (!await dialog('Remove', 'Remove this skill entry?')) return
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
  <div class="page">
    <PageHeader title="Skill Matrix" subtitle="Track skills and proficiency across the organization">
      <template #actions>
        <button v-if="canManage" class="btn-primary" @click="showAddModal = true">+ Add Skill</button>
      </template>
    </PageHeader>

    <!-- Filter -->
    <div class="filter-bar">
      <select v-model="filterEmployee" @change="loadSkills()" class="input filter-select">
        <option value="">All Employees</option>
        <option v-for="emp in employees" :key="emp.id" :value="emp.id">
          {{ emp.first_name }} {{ emp.last_name || '' }}
        </option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loader"><div class="spinner" /></div>

    <!-- Content -->
    <template v-else>
      <EmptyState v-if="!skills.length" icon="📚" message="No skills recorded" sub="Add employee skills to build the matrix" />
      <div v-else class="card">
        <table class="tbl">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Skill Name</th>
              <th>Category</th>
              <th>Proficiency</th>
              <th>Years Exp.</th>
              <th>Last Assessed</th>
              <th v-if="canManage">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in skills" :key="s.id">
              <td class="td-name">{{ getEmployeeName(s) }}</td>
              <td>{{ s.skill_name }}</td>
              <td class="td-muted">{{ s.skill_category || '--' }}</td>
              <td><span :class="['prof-badge', getProficiencyClass(s.proficiency_level)]">{{ s.proficiency_level }}</span></td>
              <td class="td-muted">{{ s.years_of_experience ?? '--' }}</td>
              <td class="td-muted">{{ formatDate(s.last_assessed) }}</td>
              <td v-if="canManage">
                <button class="btn-sm btn-danger-ghost" @click="deleteSkill(s.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Add Skill Modal -->
    <Modal v-model="showAddModal" title="Add Skill">
      <form @submit.prevent="addSkill" class="form">
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
            <label>Skill Name <span class="req">*</span></label>
            <input v-model="form.skill_name" required class="input" placeholder="e.g. JavaScript" />
          </div>
          <div class="field">
            <label>Category</label>
            <input v-model="form.skill_category" class="input" placeholder="e.g. Frontend" />
          </div>
        </div>
        <div class="row2">
          <div class="field">
            <label>Proficiency Level</label>
            <select v-model="form.proficiency_level" class="input">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div class="field">
            <label>Years of Experience</label>
            <input v-model.number="form.years_of_experience" type="number" min="0" step="0.5" class="input" />
          </div>
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea v-model="form.notes" class="input textarea" rows="2" placeholder="Optional notes" />
        </div>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="showAddModal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving || !form.employee_id || !form.skill_name" @click="addSkill">
          {{ saving ? 'Saving...' : 'Add Skill' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }

.filter-bar { display: flex; gap: 12px; }
.filter-select { max-width: 280px; }

.loader { display: flex; justify-content: center; padding: 48px 0; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Table */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); overflow: hidden; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th { padding: 12px 18px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); text-align: left; background: var(--surface2); border-bottom: 1px solid var(--border); }
.tbl td { padding: 14px 18px; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border); }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: rgba(255,255,255,.02); }
.td-name { font-weight: 500; }
.td-muted { color: var(--muted); }

/* Proficiency badges */
.prof-badge { display: inline-flex; padding: 2px 10px; font-size: 11px; font-weight: 600; border-radius: 20px; text-transform: capitalize; }
.prof-beginner { background: rgba(107,114,128,.2); color: var(--muted); }
.prof-intermediate { background: rgba(249,168,37,.15); color: var(--yellow); }
.prof-advanced { background: rgba(79,126,255,.15); color: var(--accent); }
.prof-expert { background: rgba(54,211,153,.15); color: var(--green); }

/* Buttons */
.btn-primary { padding: 8px 18px; font-size: 13px; font-weight: 600; color: #fff; background: var(--accent); border: none; border-radius: calc(var(--rs) - 2px); cursor: pointer; transition: opacity .15s; }
.btn-primary:hover { opacity: .85; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary { padding: 8px 18px; font-size: 13px; font-weight: 500; color: var(--muted); background: var(--surface2); border: 1px solid var(--border); border-radius: calc(var(--rs) - 2px); cursor: pointer; transition: color .15s; }
.btn-secondary:hover { color: var(--text); }
.btn-sm { padding: 4px 10px; font-size: 11px; font-weight: 500; border: none; border-radius: 6px; cursor: pointer; transition: all .15s; }
.btn-danger-ghost { color: var(--red); background: rgba(255,107,107,.08); }
.btn-danger-ghost:hover { background: rgba(255,107,107,.18); }

/* Form */
.form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.req { color: var(--red); }
.input { padding: 9px 12px; font-size: 13px; color: var(--text); background: var(--surface2); border: 1px solid var(--border); border-radius: calc(var(--rs) - 2px); outline: none; transition: border-color .15s; font-family: inherit; }
.input:focus { border-color: var(--accent); }
.textarea { resize: vertical; min-height: 50px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
