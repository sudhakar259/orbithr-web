<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import api from '@/services/api'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

const props = defineProps<{ employeeId: number }>()

const allProjects      = ref<any[]>([])
const assignedProjects = ref<any[]>([])
const showForm    = ref(false)
const assignLoading = ref(false)
const removeLoading = ref(false)
const assignError   = ref('')

const form = reactive({ project_id: '', role: '' })

const availableProjects = computed(() =>
  allProjects.value.filter(p => !assignedProjects.value.some(ap => ap.id === p.id))
)

async function loadAll() {
  try { const { data } = await api.get('/employee-projects/list'); allProjects.value = Array.isArray(data) ? data : data?.data || [] } catch {}
}
async function loadAssigned() {
  try { const { data } = await api.get(`/employees/${props.employeeId}/projects`); assignedProjects.value = Array.isArray(data) ? data : data?.data || [] } catch {}
}
async function assignProject() {
  assignError.value = ''; assignLoading.value = true
  try {
    await api.post(`/employees/${props.employeeId}/assign-project`, form)
    await loadAssigned(); form.project_id = ''; form.role = ''; showForm.value = false
  } catch (e: any) {
    assignError.value = e?.response?.data?.message || e?.response?.data?.error || 'Failed to assign project'
  } finally { assignLoading.value = false }
}
async function removeProject(projectId: number) {
  if (!await dialog('Remove', 'Remove this project assignment?')) return
  removeLoading.value = true
  try { await api.delete(`/employees/${props.employeeId}/remove-project/${projectId}`); await loadAssigned() } catch {}
  finally { removeLoading.value = false }
}

onMounted(() => { loadAll(); loadAssigned() })
</script>

<template>
  <div class="pa-card">
    <div class="pa-head">
      <h3 class="pa-title">Assigned Projects</h3>
      <button class="pa-toggle" @click="showForm = !showForm">{{ showForm ? 'Cancel' : '+ Assign Project' }}</button>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="pa-form-wrap">
      <form @submit.prevent="assignProject" class="pa-form">
        <div class="pa-grid">
          <div class="pa-field">
            <label class="pa-label">Project <span class="req">*</span></label>
            <select v-model="form.project_id" required class="pa-input">
              <option value="">Select project</option>
              <option v-for="p in availableProjects" :key="p.id" :value="p.id">{{ p.project_name }} ({{ p.project_code }})</option>
            </select>
          </div>
          <div class="pa-field">
            <label class="pa-label">Role</label>
            <input v-model="form.role" type="text" class="pa-input" placeholder="e.g. Developer" />
          </div>
        </div>
        <div v-if="assignError" class="pa-error">{{ assignError }}</div>
        <div class="pa-form-foot">
          <button type="submit" class="pa-btn pa-btn--primary" :disabled="assignLoading">{{ assignLoading ? 'Assigning…' : 'Assign' }}</button>
        </div>
      </form>
    </div>

    <!-- Table -->
    <div v-if="assignedProjects.length" class="pa-table-wrap">
      <table class="pa-table">
        <thead><tr>
          <th class="pa-th">Project</th>
          <th class="pa-th">Code</th>
          <th class="pa-th">Role</th>
          <th class="pa-th">Status</th>
          <th class="pa-th"></th>
        </tr></thead>
        <tbody>
          <tr v-for="p in assignedProjects" :key="p.id" class="pa-tr">
            <td class="pa-td pa-td--bold">{{ p.project_name }}</td>
            <td class="pa-td pa-td--muted">{{ p.project_code }}</td>
            <td class="pa-td pa-td--muted">{{ p.project_role || '—' }}</td>
            <td class="pa-td">
              <span :class="['pa-badge', p.is_active ? 'pa-badge--on' : 'pa-badge--off']">{{ p.is_active ? 'Active' : 'Inactive' }}</span>
            </td>
            <td class="pa-td pa-td-act">
              <button class="pa-rm" @click="removeProject(p.id)" :disabled="removeLoading">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="pa-empty">No projects assigned</div>
  </div>
</template>

<style scoped>
.pa-card { background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 16px; }
.pa-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.pa-title { font-size: 0.9rem; font-weight: 600; color: var(--text); }
.pa-toggle { padding: 6px 14px; border-radius: 7px; font-size: 0.8rem; font-weight: 500; cursor: pointer; background: var(--accent); border: none; color: #fff; }
.pa-toggle:hover { opacity: .88; }
.pa-form-wrap { background: var(--surface2); border: 1px solid rgba(255,255,255,.07); border-radius: 8px; padding: 14px; margin-bottom: 14px; }
.pa-form  { display: flex; flex-direction: column; gap: 12px; }
.pa-grid  { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (max-width: 640px) { .pa-grid { grid-template-columns: 1fr; } }
.pa-field { display: flex; flex-direction: column; gap: 5px; }
.pa-label { font-size: 0.78rem; font-weight: 500; color: var(--muted); }
.req { color: var(--red); }
.pa-input { background: var(--surface3); border: 1px solid rgba(255,255,255,.08); border-radius: 7px; padding: 7px 10px; font-size: 0.875rem; color: var(--text); outline: none; width: 100%; box-sizing: border-box; }
.pa-input:focus { border-color: var(--accent); }
.pa-error { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.25); border-radius: 7px; padding: 8px 12px; font-size: 0.8rem; color: var(--red); }
.pa-form-foot { display: flex; justify-content: flex-end; }
.pa-btn { padding: 7px 16px; border-radius: 7px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; }
.pa-btn:disabled { opacity: .45; cursor: not-allowed; }
.pa-btn--primary { background: var(--accent); color: #fff; }
.pa-table-wrap { border: 1px solid rgba(255,255,255,.06); border-radius: 8px; overflow: hidden; }
.pa-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.pa-th { padding: 8px 12px; text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); background: var(--surface2); border-bottom: 1px solid rgba(255,255,255,.06); }
.pa-tr:not(:last-child) td { border-bottom: 1px solid rgba(255,255,255,.04); }
.pa-td { padding: 9px 12px; vertical-align: middle; color: var(--text); }
.pa-td--muted { color: var(--muted); }
.pa-td--bold  { font-weight: 500; }
.pa-td-act   { text-align: right; }
.pa-badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
.pa-badge--on  { background: rgba(54,211,153,.15); color: var(--green); }
.pa-badge--off { background: rgba(107,114,128,.15); color: var(--muted); }
.pa-rm { font-size: 0.8rem; color: var(--red); background: none; border: none; cursor: pointer; padding: 2px 0; }
.pa-rm:hover { text-decoration: underline; }
.pa-rm:disabled { opacity: .45; cursor: not-allowed; }
.pa-empty { padding: 24px; text-align: center; font-size: 0.875rem; color: var(--muted); }
</style>
