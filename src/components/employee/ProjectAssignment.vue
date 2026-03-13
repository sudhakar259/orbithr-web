<template>
  <div class="space-y-6">
    <!-- Assigned Projects -->
    <div class="rounded-lg border border-slate-200 bg-white p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">Assigned Projects</h3>
        <button
          type="button"
          class="btn-primary text-sm"
          @click="showAssignForm = !showAssignForm"
        >
          {{ showAssignForm ? 'Cancel' : '+ Assign Project' }}
        </button>
      </div>

      <!-- Assign Project Form -->
      <form v-if="showAssignForm" @submit.prevent="assignProject" class="mb-4 rounded-lg bg-slate-50 p-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="block text-sm font-medium text-slate-700">Project *</label>
            <select v-model="newProjectForm.project_id" required class="input mt-1">
              <option value="">Select Project</option>
              <option v-for="project in availableProjects" :key="project.id" :value="project.id">
                {{ project.project_name }} ({{ project.project_code }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">Role on Project</label>
            <input v-model="newProjectForm.role" type="text" class="input mt-1" placeholder="e.g., Developer, Lead" />
          </div>
        </div>
        <p v-if="assignError" class="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ assignError }}</p>
        <div class="mt-3 flex justify-end gap-2">
          <button type="submit" class="btn-primary text-sm" :disabled="assignLoading">
            {{ assignLoading ? 'Assigning…' : 'Assign' }}
          </button>
        </div>
      </form>

      <!-- Projects List -->
      <div v-if="assignedProjects.length > 0" class="overflow-hidden rounded-lg border border-slate-200">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Project</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Code</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Role</th>
              <th class="px-4 py-2 text-left font-semibold text-slate-700">Status</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="project in assignedProjects" :key="project.id">
              <td class="px-4 py-2 font-medium text-slate-900">{{ project.project_name }}</td>
              <td class="px-4 py-2 text-slate-600">{{ project.project_code }}</td>
              <td class="px-4 py-2 text-slate-600">{{ project.project_role || '-' }}</td>
              <td class="px-4 py-2">
                <span
                  :class="[
                    'inline-block rounded-full px-2 py-1 text-xs font-medium',
                    project.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-slate-100 text-slate-800',
                  ]"
                >
                  {{ project.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-2 text-right">
                <button
                  type="button"
                  class="text-sm text-red-600 hover:text-red-700"
                  @click="removeProject(project.id)"
                  :disabled="removeLoading"
                >
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-8 text-center text-slate-500">No projects assigned</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import api from '@/services/api'

interface Props {
  employeeId: number
}

const props = defineProps<Props>()

const allProjects = ref<any[]>([])
const assignedProjects = ref<any[]>([])
const showAssignForm = ref(false)
const assignLoading = ref(false)
const removeLoading = ref(false)
const assignError = ref('')

const newProjectForm = reactive({
  project_id: '',
  role: '',
})

const availableProjects = computed(() => {
  return allProjects.value.filter(p => !assignedProjects.value.some(ap => ap.id === p.id))
})

async function loadProjects() {
  try {
    const { data } = await api.get('/employee-projects/list')
    allProjects.value = Array.isArray(data) ? data : data?.data || []
  } catch (e) {
    console.error('Failed to load projects', e)
  }
}

async function loadAssignedProjects() {
  try {
    const { data } = await api.get(`/employees/${props.employeeId}/projects`)
    assignedProjects.value = Array.isArray(data) ? data : data?.data || []
  } catch (e) {
    console.error('Failed to load assigned projects', e)
  }
}

async function assignProject() {
  assignError.value = ''
  assignLoading.value = true

  try {
    await api.post(`/employees/${props.employeeId}/assign-project`, newProjectForm)
    await loadAssignedProjects()

    newProjectForm.project_id = ''
    newProjectForm.role = ''
    showAssignForm.value = false
  } catch (e: any) {
    assignError.value = e?.response?.data?.message || e?.response?.data?.error || 'Failed to assign project'
  } finally {
    assignLoading.value = false
  }
}

async function removeProject(projectId: number) {
  if (!confirm('Remove this project assignment?')) return

  removeLoading.value = true

  try {
    await api.delete(`/employees/${props.employeeId}/remove-project/${projectId}`)
    await loadAssignedProjects()
  } catch (e: any) {
    console.error('Failed to remove project', e)
  } finally {
    removeLoading.value = false
  }
}

onMounted(() => {
  loadProjects()
  loadAssignedProjects()
})
</script>

<style scoped>
.input {
  @apply w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500;
}

.btn-primary {
  @apply inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50;
}
</style>
