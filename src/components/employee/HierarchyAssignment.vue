<template>
  <div class="space-y-6">
    <!-- Reporting Structure -->
    <div class="rounded-lg border border-slate-200 bg-white p-6">
      <h3 class="mb-4 text-lg font-semibold text-slate-900">Reporting Structure</h3>

      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Manager -->
        <div class="rounded-lg bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase text-slate-600">Reporting Manager</p>
          <div v-if="manager" class="mt-3">
            <p class="font-medium text-slate-900">{{ manager.first_name }} {{ manager.last_name }}</p>
            <p class="text-sm text-slate-600">{{ manager.designation }}</p>
            <button
              type="button"
              class="mt-2 text-sm text-red-600 hover:text-red-700"
              @click="changeManager"
            >
              Change Manager
            </button>
          </div>
          <div v-else>
            <p class="italic text-slate-600">No manager assigned</p>
            <button
              type="button"
              class="mt-2 text-sm text-brand-600 hover:text-brand-700"
              @click="changeManager"
            >
              Assign Manager
            </button>
          </div>
        </div>

        <!-- Subordinates -->
        <div class="rounded-lg bg-slate-50 p-4">
          <p class="text-xs font-medium uppercase text-slate-600">Subordinates</p>
          <div v-if="subordinates.length > 0" class="mt-3 space-y-2">
            <div v-for="sub in subordinates" :key="sub.id" class="text-sm">
              <p class="font-medium text-slate-900">{{ sub.first_name }} {{ sub.last_name }}</p>
              <p class="text-xs text-slate-600">{{ sub.designation }}</p>
            </div>
          </div>
          <p v-else class="mt-3 italic text-slate-600">No subordinates</p>
        </div>
      </div>

      <!-- Change Manager Modal -->
      <div v-if="showManagerModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
          <h3 class="mb-4 text-lg font-semibold text-slate-900">Select Reporting Manager</h3>

          <div class="max-h-96 space-y-2 overflow-y-auto">
            <button
              type="button"
              class="w-full rounded-lg border border-slate-300 p-3 text-left transition-colors hover:bg-slate-50"
              @click="setManager(null)"
            >
              <p class="font-medium text-slate-900">None</p>
              <p class="text-sm text-slate-600">No reporting manager</p>
            </button>
            <button
              v-for="emp in availableManagers"
              :key="emp.id"
              type="button"
              class="w-full rounded-lg border border-slate-300 p-3 text-left transition-colors hover:bg-slate-50"
              @click="setManager(emp.id)"
            >
              <p class="font-medium text-slate-900">{{ emp.first_name }} {{ emp.last_name }}</p>
              <p class="text-sm text-slate-600">{{ emp.designation }}</p>
            </button>
          </div>

          <div class="mt-4 flex justify-end gap-3">
            <button type="button" class="btn-ghost" @click="showManagerModal = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Teams Assignment -->
    <div class="rounded-lg border border-slate-200 bg-white p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">Team Assignments</h3>
        <button
          type="button"
          class="btn-primary text-sm"
          @click="showTeamForm = !showTeamForm"
        >
          {{ showTeamForm ? 'Cancel' : '+ Assign Team' }}
        </button>
      </div>

      <!-- Assign Team Form -->
      <form v-if="showTeamForm" @submit.prevent="assignTeam" class="mb-4 rounded-lg bg-slate-50 p-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700">Team *</label>
            <select v-model="newTeamForm.team_id" required class="input mt-1">
              <option value="">Select Team</option>
              <option v-for="team in availableTeams" :key="team.id" :value="team.id">
                {{ team.team_name }} ({{ team.team_code }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Role in Team</label>
            <input v-model="newTeamForm.role" type="text" class="input mt-1" placeholder="e.g., Team Member, Lead" />
          </div>
        </div>
        <p v-if="teamError" class="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ teamError }}</p>
        <div class="mt-3 flex justify-end gap-2">
          <button type="submit" class="btn-primary text-sm" :disabled="teamLoading">
            {{ teamLoading ? 'Assigning…' : 'Assign' }}
          </button>
        </div>
      </form>

      <!-- Teams List -->
      <div v-if="assignedTeams.length > 0" class="overflow-hidden rounded-lg border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Team</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Code</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Role</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Team Lead</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="team in assignedTeams" :key="team.id">
              <td class="px-4 py-2 font-medium text-slate-900">{{ team.team_name }}</td>
              <td class="px-4 py-2 text-slate-600">{{ team.team_code }}</td>
              <td class="px-4 py-2 text-slate-600">{{ team.team_role || '-' }}</td>
              <td class="px-4 py-2 text-slate-600">
                {{ team.teamLead?.first_name || '-' }} {{ team.teamLead?.last_name || '' }}
              </td>
              <td class="px-4 py-2 text-right">
                <button
                  type="button"
                  class="text-sm text-red-600 hover:text-red-700"
                  @click="removeTeam(team.id)"
                  :disabled="removeTeamLoading"
                >
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-8 text-center text-slate-500">No teams assigned</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import api from '@/services/api'

interface Props {
  employeeId: number
  currentManager?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  currentManager: null,
})

const allEmployees = ref<any[]>([])
const manager = ref<any>(null)
const subordinates = ref<any[]>([])
const allTeams = ref<any[]>([])
const assignedTeams = ref<any[]>([])

const showManagerModal = ref(false)
const showTeamForm = ref(false)
const teamLoading = ref(false)
const removeTeamLoading = ref(false)
const teamError = ref('')

const newTeamForm = reactive({
  team_id: '',
  role: '',
})

const availableManagers = computed(() => {
  return allEmployees.value.filter(e => e.id !== props.employeeId && e.status === 'Active')
})

const availableTeams = computed(() => {
  return allTeams.value.filter(t => !assignedTeams.value.some(at => at.id === t.id))
})

async function loadEmployees() {
  try {
    const { data } = await api.get('/employees?status=Active')
    allEmployees.value = Array.isArray(data) ? data : data?.data || []
  } catch (e) {
    console.error('Failed to load employees', e)
  }
}

async function loadManagerInfo() {
  try {
    const { data } = await api.get(`/employees/${props.employeeId}`)
    if (data.manager_id) {
      manager.value = data.manager
    }
    subordinates.value = data.subordinates || []
  } catch (e) {
    console.error('Failed to load manager info', e)
  }
}

async function loadTeams() {
  try {
    const { data } = await api.get('/employee-teams/list')
    allTeams.value = Array.isArray(data) ? data : data?.data || []
  } catch (e) {
    console.error('Failed to load teams', e)
  }
}

async function loadAssignedTeams() {
  try {
    const { data } = await api.get(`/employees/${props.employeeId}/teams`)
    assignedTeams.value = Array.isArray(data) ? data : data?.data || []
  } catch (e) {
    console.error('Failed to load assigned teams', e)
  }
}

function changeManager() {
  showManagerModal.value = true
}

async function setManager(managerId: number | null) {
  try {
    await api.put(`/employees/${props.employeeId}`, {
      manager_id: managerId,
    })
    await loadManagerInfo()
    showManagerModal.value = false
  } catch (e: any) {
    console.error('Failed to set manager', e)
  }
}

async function assignTeam() {
  teamError.value = ''
  teamLoading.value = true

  try {
    await api.post(`/employees/${props.employeeId}/assign-team`, newTeamForm)
    await loadAssignedTeams()

    newTeamForm.team_id = ''
    newTeamForm.role = ''
    showTeamForm.value = false
  } catch (e: any) {
    teamError.value = e?.response?.data?.message || e?.response?.data?.error || 'Failed to assign team'
  } finally {
    teamLoading.value = false
  }
}

async function removeTeam(teamId: number) {
  if (!confirm('Remove this team assignment?')) return

  removeTeamLoading.value = true

  try {
    await api.delete(`/employees/${props.employeeId}/remove-team/${teamId}`)
    await loadAssignedTeams()
  } catch (e: any) {
    console.error('Failed to remove team', e)
  } finally {
    removeTeamLoading.value = false
  }
}

onMounted(() => {
  loadEmployees()
  loadManagerInfo()
  loadTeams()
  loadAssignedTeams()
})
</script>

<style scoped>
.input {
  @apply w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500;
}

.btn-primary {
  @apply inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50;
}

.btn-ghost {
  @apply inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50;
}
</style>
