<script setup lang="ts">
defineOptions({ name: 'OrgGoals' })
import { ref, onMounted, computed } from 'vue'
import api from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import PageHeader from '@/components/ui/PageHeader.vue'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

interface OrgGoal {
  id: number
  name: string
  description?: string
  parent_goal_id?: number | null
  target_date?: string | null
  status: string
  progress?: number
  target_progress?: number
  current_progress?: number
  owner?: string
  department?: string
  children?: OrgGoal[]
}

const { roles } = useAuth()
const toast = useToast()

const activeTab = ref<'tree' | 'progress'>('tree')
const loading = ref(true)
const goals = ref<OrgGoal[]>([])
const flatGoals = ref<OrgGoal[]>([])
const error = ref('')

const rLower = computed(() => roles().map((r: string) => r.toLowerCase()))
const canManage = computed(
  () => rLower.value.includes('admin') || rLower.value.includes('hr_manager'),
)

/* Modal state */
const showAddModal = ref(false)
const showEditModal = ref(false)
const showProgressModal = ref(false)
const saving = ref(false)

const form = ref({
  name: '',
  description: '',
  parent_goal_id: null as number | null,
  target_date: '',
  status: 'active',
})

const editForm = ref({
  id: 0,
  name: '',
  description: '',
  parent_goal_id: null as number | null,
  target_date: '',
  status: 'active',
})

const progressForm = ref({ id: 0, name: '', progress: 0 })

/* Flatten tree for select options & progress list */
function flattenTree(nodes: OrgGoal[], acc: OrgGoal[] = []): OrgGoal[] {
  for (const n of nodes) {
    acc.push(n)
    if (n.children?.length) flattenTree(n.children, acc)
  }
  return acc
}

/* Load */
const loadGoals = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/org-goals/tree')
    goals.value = res.data?.data ?? res.data ?? []
    flatGoals.value = flattenTree(goals.value)
  } catch {
    error.value = 'Failed to load organizational goals'
  } finally {
    loading.value = false
  }
}

/* Create */
const createGoal = async () => {
  saving.value = true
  try {
    await api.post('/org-goals', {
      name: form.value.name,
      description: form.value.description || undefined,
      parent_goal_id: form.value.parent_goal_id || undefined,
      target_date: form.value.target_date || undefined,
      status: form.value.status,
    })
    toast.success('Goal created')
    showAddModal.value = false
    resetForm()
    await loadGoals()
  } catch {
    toast.error('Failed to create goal')
  } finally {
    saving.value = false
  }
}

/* Edit */
const openEdit = (g: OrgGoal) => {
  editForm.value = {
    id: g.id,
    name: g.name,
    description: g.description ?? '',
    parent_goal_id: g.parent_goal_id ?? null,
    target_date: g.target_date ?? '',
    status: g.status,
  }
  showEditModal.value = true
}

const updateGoal = async () => {
  saving.value = true
  try {
    await api.put(`/org-goals/${editForm.value.id}`, {
      name: editForm.value.name,
      description: editForm.value.description || undefined,
      parent_goal_id: editForm.value.parent_goal_id || undefined,
      target_date: editForm.value.target_date || undefined,
      status: editForm.value.status,
    })
    toast.success('Goal updated')
    showEditModal.value = false
    await loadGoals()
  } catch {
    toast.error('Failed to update goal')
  } finally {
    saving.value = false
  }
}

/* Delete */
const deleteGoal = async (id: number) => {
  if (!confirm('Delete this goal?')) return
  try {
    await api.delete(`/org-goals/${id}`)
    toast.success('Goal deleted')
    await loadGoals()
  } catch {
    toast.error('Failed to delete goal')
  }
}

/* Progress */
const openProgress = (g: OrgGoal) => {
  progressForm.value = {
    id: g.id,
    name: g.name,
    progress: g.current_progress ?? g.progress ?? 0,
  }
  showProgressModal.value = true
}

const updateProgress = async () => {
  saving.value = true
  try {
    await api.patch(`/org-goals/${progressForm.value.id}/progress`, {
      progress: progressForm.value.progress,
    })
    toast.success('Progress updated')
    showProgressModal.value = false
    await loadGoals()
  } catch {
    toast.error('Failed to update progress')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  form.value = { name: '', description: '', parent_goal_id: null, target_date: '', status: 'active' }
}

const getStatusClass = (s: string) => {
  const map: Record<string, string> = {
    active: 'badge-active',
    on_hold: 'badge-hold',
    completed: 'badge-completed',
    draft: 'badge-draft',
    cancelled: 'badge-cancelled',
  }
  return map[s] || 'badge-draft'
}

const goalProgress = (g: OrgGoal) => g.current_progress ?? g.progress ?? 0

const formatDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '--')

onMounted(() => loadGoals())
</script>

<template>
  <div class="page">
    <PageHeader title="Organizational Goals" subtitle="Align company objectives across teams">
      <template #actions>
        <button v-if="canManage" class="btn-primary" @click="showAddModal = true">+ Add Goal</button>
      </template>
    </PageHeader>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', activeTab === 'tree' && 'tab-active']" @click="activeTab = 'tree'">Goals Tree</button>
      <button :class="['tab', activeTab === 'progress' && 'tab-active']" @click="activeTab = 'progress'">Progress</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loader"><div class="spinner" /></div>

    <!-- Error -->
    <div v-else-if="error" class="err">{{ error }}</div>

    <!-- Content -->
    <template v-else>
      <!-- Goals Tree tab -->
      <div v-if="activeTab === 'tree'">
        <EmptyState v-if="!goals.length" icon="🎯" message="No organizational goals yet" sub="Create your first goal to get started" />
        <div v-else class="tree">
          <template v-for="goal in goals" :key="goal.id">
            <div class="goal-node">
              <div class="goal-card">
                <div class="gc-top">
                  <div class="gc-info">
                    <span class="gc-name">{{ goal.name }}</span>
                    <span v-if="goal.department || goal.description" class="gc-owner">{{ goal.department || goal.description }}</span>
                  </div>
                  <span :class="['badge', getStatusClass(goal.status)]">{{ goal.status.replace('_', ' ') }}</span>
                </div>
                <div class="gc-bar-row">
                  <div class="progress-track"><div class="progress-fill" :style="{ width: goalProgress(goal) + '%' }" /></div>
                  <span class="gc-pct">{{ goalProgress(goal) }}%</span>
                </div>
                <div v-if="goal.target_date" class="gc-date">Target: {{ formatDate(goal.target_date) }}</div>
                <div v-if="canManage" class="gc-actions">
                  <button class="btn-sm btn-ghost" @click="openProgress(goal)">Update Progress</button>
                  <button class="btn-sm btn-ghost" @click="openEdit(goal)">Edit</button>
                  <button class="btn-sm btn-danger-ghost" @click="deleteGoal(goal.id)">Delete</button>
                </div>
              </div>
              <!-- Children -->
              <div v-if="goal.children?.length" class="children">
                <div v-for="child in goal.children" :key="child.id" class="goal-card child-card">
                  <div class="gc-top">
                    <div class="gc-info">
                      <span class="gc-name">{{ child.name }}</span>
                      <span v-if="child.department || child.description" class="gc-owner">{{ child.department || child.description }}</span>
                    </div>
                    <span :class="['badge', getStatusClass(child.status)]">{{ child.status.replace('_', ' ') }}</span>
                  </div>
                  <div class="gc-bar-row">
                    <div class="progress-track"><div class="progress-fill" :style="{ width: goalProgress(child) + '%' }" /></div>
                    <span class="gc-pct">{{ goalProgress(child) }}%</span>
                  </div>
                  <div v-if="child.target_date" class="gc-date">Target: {{ formatDate(child.target_date) }}</div>
                  <div v-if="canManage" class="gc-actions">
                    <button class="btn-sm btn-ghost" @click="openProgress(child)">Update Progress</button>
                    <button class="btn-sm btn-ghost" @click="openEdit(child)">Edit</button>
                    <button class="btn-sm btn-danger-ghost" @click="deleteGoal(child.id)">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Progress tab -->
      <div v-if="activeTab === 'progress'">
        <EmptyState v-if="!flatGoals.length" icon="📊" message="No goals to track" />
        <div v-else class="card">
          <table class="tbl">
            <thead>
              <tr>
                <th>Goal</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Target Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in flatGoals" :key="g.id">
                <td class="td-name">{{ g.name }}</td>
                <td><span :class="['badge', getStatusClass(g.status)]">{{ g.status.replace('_', ' ') }}</span></td>
                <td>
                  <div class="bar-cell">
                    <div class="progress-track"><div class="progress-fill" :style="{ width: goalProgress(g) + '%' }" /></div>
                    <span class="gc-pct">{{ goalProgress(g) }}%</span>
                  </div>
                </td>
                <td class="td-muted">{{ formatDate(g.target_date) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Add Goal Modal -->
    <Modal v-model="showAddModal" title="Add Organizational Goal">
      <form @submit.prevent="createGoal" class="form">
        <div class="field">
          <label>Name <span class="req">*</span></label>
          <input v-model="form.name" required class="input" placeholder="Goal name" />
        </div>
        <div class="field">
          <label>Description</label>
          <textarea v-model="form.description" class="input textarea" rows="3" placeholder="Optional description" />
        </div>
        <div class="field">
          <label>Parent Goal</label>
          <select v-model="form.parent_goal_id" class="input">
            <option :value="null">None (top-level)</option>
            <option v-for="g in flatGoals" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div class="row2">
          <div class="field">
            <label>Target Date</label>
            <input v-model="form.target_date" type="date" class="input" />
          </div>
          <div class="field">
            <label>Status</label>
            <select v-model="form.status" class="input">
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="showAddModal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving || !form.name" @click="createGoal">{{ saving ? 'Saving...' : 'Create' }}</button>
      </template>
    </Modal>

    <!-- Edit Goal Modal -->
    <Modal v-model="showEditModal" title="Edit Goal">
      <form @submit.prevent="updateGoal" class="form">
        <div class="field">
          <label>Name <span class="req">*</span></label>
          <input v-model="editForm.name" required class="input" />
        </div>
        <div class="field">
          <label>Description</label>
          <textarea v-model="editForm.description" class="input textarea" rows="3" />
        </div>
        <div class="field">
          <label>Parent Goal</label>
          <select v-model="editForm.parent_goal_id" class="input">
            <option :value="null">None (top-level)</option>
            <option v-for="g in flatGoals.filter(x => x.id !== editForm.id)" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div class="row2">
          <div class="field">
            <label>Target Date</label>
            <input v-model="editForm.target_date" type="date" class="input" />
          </div>
          <div class="field">
            <label>Status</label>
            <select v-model="editForm.status" class="input">
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="showEditModal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving || !editForm.name" @click="updateGoal">{{ saving ? 'Saving...' : 'Update' }}</button>
      </template>
    </Modal>

    <!-- Progress Modal -->
    <Modal v-model="showProgressModal" title="Update Progress" maxWidth="400px">
      <div class="form">
        <p class="progress-label">{{ progressForm.name }}</p>
        <div class="slider-row">
          <input v-model.number="progressForm.progress" type="range" min="0" max="100" class="slider" />
          <span class="slider-val">{{ progressForm.progress }}%</span>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showProgressModal = false">Cancel</button>
        <button class="btn-primary" :disabled="saving" @click="updateProgress">{{ saving ? 'Saving...' : 'Save' }}</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }

/* Tabs */
.tabs { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 4px; width: fit-content; }
.tab { padding: 8px 18px; font-size: 13px; font-weight: 500; color: var(--muted); background: transparent; border: none; border-radius: calc(var(--rs) - 2px); cursor: pointer; transition: all .15s; }
.tab:hover { color: var(--text); }
.tab-active { background: var(--surface2); color: var(--text); }

/* Loader */
.loader { display: flex; justify-content: center; padding: 48px 0; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.err { background: rgba(255,107,107,.1); border: 1px solid rgba(255,107,107,.3); border-radius: var(--rs); padding: 14px 18px; font-size: 13px; color: var(--red); }

/* Tree */
.tree { display: flex; flex-direction: column; gap: 16px; }
.goal-node { display: flex; flex-direction: column; gap: 8px; }
.children { margin-left: 32px; display: flex; flex-direction: column; gap: 8px; border-left: 2px solid var(--border-hi); padding-left: 16px; }
.goal-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
.child-card { background: var(--surface2); }
.gc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.gc-info { display: flex; flex-direction: column; gap: 2px; }
.gc-name { font-size: 14px; font-weight: 600; color: var(--text); }
.gc-owner { font-size: 12px; color: var(--muted); }
.gc-bar-row { display: flex; align-items: center; gap: 10px; }
.progress-track { flex: 1; height: 6px; background: var(--surface3); border-radius: 3px; overflow: hidden; max-width: 200px; }
.progress-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width .3s; }
.gc-pct { font-size: 12px; color: var(--muted); min-width: 36px; }
.gc-date { font-size: 12px; color: var(--muted); }
.gc-actions { display: flex; gap: 6px; }

/* Badges */
.badge { display: inline-flex; padding: 2px 10px; font-size: 11px; font-weight: 600; border-radius: 20px; text-transform: capitalize; white-space: nowrap; }
.badge-active { background: rgba(79,126,255,.15); color: var(--accent); }
.badge-hold { background: rgba(249,168,37,.15); color: var(--yellow); }
.badge-completed { background: rgba(54,211,153,.15); color: var(--green); }
.badge-draft { background: rgba(107,114,128,.2); color: var(--muted); }
.badge-cancelled { background: rgba(255,107,107,.15); color: var(--red); }

/* Table */
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); overflow: hidden; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th { padding: 12px 18px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); text-align: left; background: var(--surface2); border-bottom: 1px solid var(--border); }
.tbl td { padding: 14px 18px; font-size: 13px; color: var(--text); border-bottom: 1px solid var(--border); }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: rgba(255,255,255,.02); }
.td-name { font-weight: 500; }
.td-muted { color: var(--muted); }
.bar-cell { display: flex; align-items: center; gap: 10px; }

/* Buttons */
.btn-primary { padding: 8px 18px; font-size: 13px; font-weight: 600; color: #fff; background: var(--accent); border: none; border-radius: calc(var(--rs) - 2px); cursor: pointer; transition: opacity .15s; }
.btn-primary:hover { opacity: .85; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary { padding: 8px 18px; font-size: 13px; font-weight: 500; color: var(--muted); background: var(--surface2); border: 1px solid var(--border); border-radius: calc(var(--rs) - 2px); cursor: pointer; transition: color .15s; }
.btn-secondary:hover { color: var(--text); }
.btn-sm { padding: 4px 10px; font-size: 11px; font-weight: 500; border: none; border-radius: 6px; cursor: pointer; transition: all .15s; }
.btn-ghost { color: var(--accent); background: rgba(79,126,255,.08); }
.btn-ghost:hover { background: rgba(79,126,255,.18); }
.btn-danger-ghost { color: var(--red); background: rgba(255,107,107,.08); }
.btn-danger-ghost:hover { background: rgba(255,107,107,.18); }

/* Form */
.form { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.req { color: var(--red); }
.input { padding: 9px 12px; font-size: 13px; color: var(--text); background: var(--surface2); border: 1px solid var(--border); border-radius: calc(var(--rs) - 2px); outline: none; transition: border-color .15s; font-family: inherit; }
.input:focus { border-color: var(--accent); }
.textarea { resize: vertical; min-height: 60px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* Slider */
.progress-label { font-size: 14px; font-weight: 500; color: var(--text); }
.slider-row { display: flex; align-items: center; gap: 14px; }
.slider { flex: 1; accent-color: var(--accent); }
.slider-val { font-size: 16px; font-weight: 700; color: var(--accent); min-width: 44px; text-align: right; }
</style>
