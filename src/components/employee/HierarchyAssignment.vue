<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import api from '@/services/api'

const props = withDefaults(defineProps<{ employeeId: number; currentManager?: number | null }>(), {
  currentManager: null,
})

const allEmployees  = ref<any[]>([])
const manager       = ref<any>(null)
const subordinates  = ref<any[]>([])
const allTeams      = ref<any[]>([])
const assignedTeams = ref<any[]>([])

const showManagerModal = ref(false)
const showTeamForm   = ref(false)
const teamLoading    = ref(false)
const removeTeamLoading = ref(false)
const teamError      = ref('')

const teamForm = reactive({ team_id: '', role: '' })

const availableManagers = computed(() =>
  allEmployees.value.filter(e => e.id !== props.employeeId && e.status === 'Active')
)
const availableTeams = computed(() =>
  allTeams.value.filter(t => !assignedTeams.value.some(at => at.id === t.id))
)

async function loadEmployees() {
  try { const { data } = await api.get('/employees?status=Active'); allEmployees.value = Array.isArray(data) ? data : data?.data || [] } catch {}
}
async function loadManagerInfo() {
  try {
    const { data } = await api.get(`/employees/${props.employeeId}`)
    manager.value = data.manager || null
    subordinates.value = data.subordinates || []
  } catch {}
}
async function loadTeams() {
  try { const { data } = await api.get('/employee-teams/list'); allTeams.value = Array.isArray(data) ? data : data?.data || [] } catch {}
}
async function loadAssignedTeams() {
  try { const { data } = await api.get(`/employees/${props.employeeId}/teams`); assignedTeams.value = Array.isArray(data) ? data : data?.data || [] } catch {}
}

async function setManager(managerId: number | null) {
  try { await api.put(`/employees/${props.employeeId}`, { manager_id: managerId }); await loadManagerInfo(); showManagerModal.value = false } catch {}
}
async function assignTeam() {
  teamError.value = ''; teamLoading.value = true
  try {
    await api.post(`/employees/${props.employeeId}/assign-team`, teamForm)
    await loadAssignedTeams(); teamForm.team_id = ''; teamForm.role = ''; showTeamForm.value = false
  } catch (e: any) {
    teamError.value = e?.response?.data?.message || 'Failed to assign team'
  } finally { teamLoading.value = false }
}
async function removeTeam(teamId: number) {
  if (!confirm('Remove this team assignment?')) return
  removeTeamLoading.value = true
  try { await api.delete(`/employees/${props.employeeId}/remove-team/${teamId}`); await loadAssignedTeams() } catch {}
  finally { removeTeamLoading.value = false }
}

onMounted(() => { loadEmployees(); loadManagerInfo(); loadTeams(); loadAssignedTeams() })
</script>

<template>
  <div class="ha-wrap">
    <!-- Reporting Structure -->
    <div class="ha-card">
      <h3 class="ha-title">Reporting Structure</h3>
      <div class="ha-grid2">
        <!-- Manager -->
        <div class="ha-box">
          <p class="ha-box-label">Reporting Manager</p>
          <div v-if="manager" class="ha-person">
            <p class="ha-person-name">{{ manager.first_name }} {{ manager.last_name }}</p>
            <p class="ha-person-role">{{ manager.designation || manager.role || '—' }}</p>
          </div>
          <p v-else class="ha-none">No manager assigned</p>
          <button class="ha-change-btn" @click="showManagerModal = true">
            {{ manager ? 'Change Manager' : 'Assign Manager' }}
          </button>
        </div>

        <!-- Subordinates -->
        <div class="ha-box">
          <p class="ha-box-label">Subordinates ({{ subordinates.length }})</p>
          <div v-if="subordinates.length" class="ha-sub-list">
            <div v-for="sub in subordinates" :key="sub.id" class="ha-sub">
              <p class="ha-sub-name">{{ sub.first_name }} {{ sub.last_name }}</p>
              <p class="ha-sub-role">{{ sub.designation || '—' }}</p>
            </div>
          </div>
          <p v-else class="ha-none">No subordinates</p>
        </div>
      </div>
    </div>

    <!-- Teams -->
    <div class="ha-card">
      <div class="ha-card-head">
        <h3 class="ha-title">Team Assignments</h3>
        <button class="ha-toggle" @click="showTeamForm = !showTeamForm">{{ showTeamForm ? 'Cancel' : '+ Assign Team' }}</button>
      </div>

      <!-- Team form -->
      <div v-if="showTeamForm" class="ha-form-wrap">
        <form @submit.prevent="assignTeam" class="ha-form">
          <div class="ha-grid">
            <div class="ha-field">
              <label class="ha-label">Team <span class="req">*</span></label>
              <select v-model="teamForm.team_id" required class="ha-input">
                <option value="">Select team</option>
                <option v-for="t in availableTeams" :key="t.id" :value="t.id">{{ t.team_name }} ({{ t.team_code }})</option>
              </select>
            </div>
            <div class="ha-field">
              <label class="ha-label">Role in Team</label>
              <input v-model="teamForm.role" type="text" class="ha-input" placeholder="e.g. Member, Lead" />
            </div>
          </div>
          <div v-if="teamError" class="ha-error">{{ teamError }}</div>
          <div class="ha-form-foot">
            <button type="submit" class="ha-btn ha-btn--primary" :disabled="teamLoading">{{ teamLoading ? 'Assigning…' : 'Assign' }}</button>
          </div>
        </form>
      </div>

      <!-- Teams table -->
      <div v-if="assignedTeams.length" class="ha-table-wrap">
        <table class="ha-table">
          <thead><tr>
            <th class="ha-th">Team</th>
            <th class="ha-th">Code</th>
            <th class="ha-th">Role</th>
            <th class="ha-th">Team Lead</th>
            <th class="ha-th"></th>
          </tr></thead>
          <tbody>
            <tr v-for="t in assignedTeams" :key="t.id" class="ha-tr">
              <td class="ha-td ha-td--bold">{{ t.team_name }}</td>
              <td class="ha-td ha-td--muted">{{ t.team_code }}</td>
              <td class="ha-td ha-td--muted">{{ t.team_role || '—' }}</td>
              <td class="ha-td ha-td--muted">{{ t.teamLead ? `${t.teamLead.first_name} ${t.teamLead.last_name}` : '—' }}</td>
              <td class="ha-td ha-td-act">
                <button class="ha-rm" @click="removeTeam(t.id)" :disabled="removeTeamLoading">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="ha-empty">No teams assigned</div>
    </div>

    <!-- Manager modal -->
    <Teleport to="body">
      <div v-if="showManagerModal" class="modal-overlay" @click.self="showManagerModal = false">
        <div class="modal-box">
          <div class="modal-head">
            <h3 class="modal-title">Select Reporting Manager</h3>
            <button class="modal-close" @click="showManagerModal = false">✕</button>
          </div>
          <div class="modal-body">
            <button class="modal-opt" @click="setManager(null)">
              <p class="modal-opt-name">None</p>
              <p class="modal-opt-role">No reporting manager</p>
            </button>
            <button v-for="emp in availableManagers" :key="emp.id" class="modal-opt" @click="setManager(emp.id)">
              <p class="modal-opt-name">{{ emp.first_name }} {{ emp.last_name }}</p>
              <p class="modal-opt-role">{{ emp.designation || emp.role || '—' }}</p>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ha-wrap { display: flex; flex-direction: column; gap: 16px; }
.ha-card { background: var(--surface); border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 16px; }
.ha-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ha-title { font-size: 0.9rem; font-weight: 600; color: var(--text); margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,.05); }
.ha-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (max-width: 640px) { .ha-grid2 { grid-template-columns: 1fr; } }

.ha-box { background: var(--surface2); border: 1px solid rgba(255,255,255,.07); border-radius: 8px; padding: 14px; }
.ha-box-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 10px; }
.ha-person { margin-bottom: 8px; }
.ha-person-name { font-weight: 600; color: var(--text); font-size: 0.9rem; }
.ha-person-role { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }
.ha-none { font-size: 0.875rem; color: var(--muted); font-style: italic; margin-bottom: 8px; }
.ha-change-btn { font-size: 0.8rem; color: var(--accent); background: none; border: none; cursor: pointer; padding: 0; }
.ha-change-btn:hover { text-decoration: underline; }

.ha-sub-list { display: flex; flex-direction: column; gap: 8px; max-height: 160px; overflow-y: auto; }
.ha-sub { padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.05); }
.ha-sub:last-child { border-bottom: none; }
.ha-sub-name { font-size: 0.85rem; font-weight: 500; color: var(--text); }
.ha-sub-role { font-size: 0.75rem; color: var(--muted); }

.ha-toggle { padding: 6px 14px; border-radius: 7px; font-size: 0.8rem; font-weight: 500; cursor: pointer; background: var(--accent); border: none; color: #fff; }
.ha-toggle:hover { opacity: .88; }
.ha-form-wrap { background: var(--surface2); border: 1px solid rgba(255,255,255,.07); border-radius: 8px; padding: 14px; margin-bottom: 14px; }
.ha-form { display: flex; flex-direction: column; gap: 12px; }
.ha-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (max-width: 640px) { .ha-grid { grid-template-columns: 1fr; } }
.ha-field { display: flex; flex-direction: column; gap: 5px; }
.ha-label { font-size: 0.78rem; font-weight: 500; color: var(--muted); }
.req { color: var(--red); }
.ha-input { background: var(--surface3); border: 1px solid rgba(255,255,255,.08); border-radius: 7px; padding: 7px 10px; font-size: 0.875rem; color: var(--text); outline: none; width: 100%; box-sizing: border-box; }
.ha-input:focus { border-color: var(--accent); }
.ha-error { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.25); border-radius: 7px; padding: 8px 12px; font-size: 0.8rem; color: var(--red); }
.ha-form-foot { display: flex; justify-content: flex-end; }
.ha-btn { padding: 7px 16px; border-radius: 7px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; }
.ha-btn:disabled { opacity: .45; cursor: not-allowed; }
.ha-btn--primary { background: var(--accent); color: #fff; }
.ha-table-wrap { border: 1px solid rgba(255,255,255,.06); border-radius: 8px; overflow: hidden; }
.ha-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.ha-th { padding: 8px 12px; text-align: left; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); background: var(--surface2); border-bottom: 1px solid rgba(255,255,255,.06); }
.ha-tr:not(:last-child) td { border-bottom: 1px solid rgba(255,255,255,.04); }
.ha-td { padding: 9px 12px; vertical-align: middle; color: var(--text); }
.ha-td--muted { color: var(--muted); }
.ha-td--bold  { font-weight: 500; }
.ha-td-act   { text-align: right; }
.ha-rm { font-size: 0.8rem; color: var(--red); background: none; border: none; cursor: pointer; }
.ha-rm:hover { text-decoration: underline; }
.ha-rm:disabled { opacity: .45; cursor: not-allowed; }
.ha-empty { padding: 24px; text-align: center; font-size: 0.875rem; color: var(--muted); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.6); }
.modal-box { background: var(--surface); border: 1px solid rgba(255,255,255,.1); border-radius: 14px; width: 100%; max-width: 420px; overflow: hidden; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.07); }
.modal-title { font-size: 1rem; font-weight: 600; color: var(--text); }
.modal-close { background: none; border: none; color: var(--muted); font-size: 1rem; cursor: pointer; line-height: 1; }
.modal-close:hover { color: var(--text); }
.modal-body { padding: 8px; max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.modal-opt { width: 100%; text-align: left; background: transparent; border: 1px solid rgba(255,255,255,.07); border-radius: 8px; padding: 10px 14px; cursor: pointer; }
.modal-opt:hover { background: var(--surface2); }
.modal-opt-name { font-size: 0.875rem; font-weight: 500; color: var(--text); }
.modal-opt-role { font-size: 0.78rem; color: var(--muted); margin-top: 2px; }
</style>
