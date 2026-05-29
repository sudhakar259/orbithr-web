<script setup lang="ts">
import { ref, onMounted } from 'vue'
import lndService from '@/services/lndService'
import type { Skill, SkillCategory, EmployeeSkill } from '@/services/lndService'
import { useAuth } from '@/composables/useAuth'

const { hasPermission } = useAuth()
const canManage = hasPermission('manage skills')

const loading = ref(true)
const skills = ref<Skill[]>([])
const categories = ref<SkillCategory[]>([])
const mySkills = ref<EmployeeSkill[]>([])
const error = ref('')
const activeView = ref<'catalog' | 'my-skills'>('catalog')

// New skill form
const showNewSkillForm = ref(false)
const newSkill = ref({ name: '', description: '', category_id: '' as string | number })
const savingSkill = ref(false)

// New category form
const showNewCatForm = ref(false)
const newCat = ref({ name: '', description: '' })
const savingCat = ref(false)

async function loadData() {
  loading.value = true
  try {
    const [skillsRes, catsRes, myRes] = await Promise.all([
      lndService.getSkills(),
      lndService.getSkillCategories(),
      lndService.getMySkills(),
    ])
    skills.value = skillsRes.data.data
    categories.value = catsRes.data.data
    mySkills.value = myRes.data.data
  } catch {
    error.value = 'Failed to load skills.'
  } finally {
    loading.value = false
  }
}

async function createSkill() {
  savingSkill.value = true
  try {
    await lndService.createSkill({
      name: newSkill.value.name,
      description: newSkill.value.description,
      category_id: newSkill.value.category_id ? Number(newSkill.value.category_id) : undefined,
    })
    newSkill.value = { name: '', description: '', category_id: '' }
    showNewSkillForm.value = false
    await loadData()
  } catch {
    error.value = 'Failed to create skill.'
  } finally {
    savingSkill.value = false
  }
}

async function createCategory() {
  savingCat.value = true
  try {
    await lndService.createSkillCategory(newCat.value)
    newCat.value = { name: '', description: '' }
    showNewCatForm.value = false
    await loadData()
  } catch {
    error.value = 'Failed to create category.'
  } finally {
    savingCat.value = false
  }
}

function levelClass(level: string) {
  switch (level) {
    case 'expert':
      return 'pill-purple'
    case 'advanced':
      return 'pill-purple-soft'
    case 'intermediate':
      return 'pill-yellow'
    default:
      return 'pill-muted'
  }
}

onMounted(loadData)
</script>

<template>
  <div class="lnd-skills">
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- View toggle -->
    <div class="page-toolbar">
      <div class="seg">
        <button
          :class="['seg-btn', { active: activeView === 'catalog' }]"
          @click="activeView = 'catalog'"
        >
          Skill Catalog
        </button>
        <button
          :class="['seg-btn', { active: activeView === 'my-skills' }]"
          @click="activeView = 'my-skills'"
        >
          My Skills
        </button>
      </div>
      <div v-if="canManage" class="action-row">
        <button class="btn-secondary" @click="showNewCatForm = !showNewCatForm">
          + Category
        </button>
        <button class="btn-primary" @click="showNewSkillForm = !showNewSkillForm">
          + Skill
        </button>
      </div>
    </div>

    <!-- New Category Form -->
    <div v-if="showNewCatForm" class="form-card">
      <h4 class="form-title">New Category</h4>
      <form class="form-row" @submit.prevent="createCategory">
        <input
          v-model="newCat.name"
          type="text"
          placeholder="Category name"
          required
          class="input flex-1"
        />
        <input
          v-model="newCat.description"
          type="text"
          placeholder="Description"
          class="input flex-1"
        />
        <button type="submit" :disabled="savingCat" class="btn-primary">Save</button>
      </form>
    </div>

    <!-- New Skill Form -->
    <div v-if="showNewSkillForm" class="form-card">
      <h4 class="form-title">New Skill</h4>
      <form class="form-row" @submit.prevent="createSkill">
        <input
          v-model="newSkill.name"
          type="text"
          placeholder="Skill name"
          required
          class="input flex-1"
        />
        <select v-model="newSkill.category_id" class="input">
          <option value="">No Category</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
        <button type="submit" :disabled="savingSkill" class="btn-primary">Save</button>
      </form>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="skill-list">
      <div v-for="n in 5" :key="n" class="skill-card skeleton">
        <div class="skeleton-line w-1-3" />
      </div>
    </div>

    <!-- Catalog View -->
    <template v-else-if="activeView === 'catalog'">
      <div v-if="skills.length" class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Category</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="skill in skills" :key="skill.id">
              <td class="td-strong">{{ skill.name }}</td>
              <td>{{ skill.category?.name || '-' }}</td>
              <td>{{ skill.description || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-card">No skills defined yet.</div>
    </template>

    <!-- My Skills View -->
    <template v-else>
      <div v-if="mySkills.length" class="skill-list">
        <div v-for="es in mySkills" :key="es.id" class="skill-card">
          <div class="skill-meta">
            <p class="skill-name">{{ es.skill?.name || 'Skill' }}</p>
            <p class="skill-sub">
              {{ es.skill?.category?.name || 'Uncategorized' }}
              <span v-if="es.verified_at" class="verified">&middot; Verified</span>
            </p>
          </div>
          <span :class="['pill', levelClass(es.proficiency_level)]">
            {{ es.proficiency_level }}
          </span>
        </div>
      </div>
      <div v-else class="empty-card">No skills assigned to you yet.</div>
    </template>
  </div>
</template>

<style scoped>
.lnd-skills {
  color: #eef0f4;
}

.alert {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
}

.alert-error {
  background: rgba(243, 130, 136, 0.12);
  border: 1px solid rgba(243, 130, 136, 0.4);
  color: #f38288;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* Segmented tabs */
.seg {
  display: inline-flex;
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.seg-btn {
  background: transparent;
  border: none;
  color: #7a8299;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-btn:hover {
  color: #eef0f4;
}

.seg-btn.active {
  background: #6b5bff;
  color: #fff;
}

.action-row {
  display: flex;
  gap: 8px;
}

.btn-primary {
  background: #6b5bff;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: #5a4be8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #161a23;
  border: 1px solid #232936;
  color: #eef0f4;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.btn-secondary:hover {
  border-color: #6b5bff;
}

/* Form */
.form-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-title {
  font-family: 'Instrument Serif', serif;
  font-size: 18px;
  letter-spacing: -0.02em;
  color: #eef0f4;
  margin: 0 0 12px;
  font-weight: 400;
}

.form-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.input {
  background: #0d0f17;
  border: 1px solid #232936;
  color: #eef0f4;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
}

.input:focus {
  border-color: #6b5bff;
}

.flex-1 {
  flex: 1;
  min-width: 180px;
}

/* Table */
.table-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead tr {
  border-bottom: 1px solid #232936;
}

.data-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7a8299;
  padding: 12px 18px;
  background: rgba(35, 41, 54, 0.4);
}

.data-table td {
  padding: 12px 18px;
  font-size: 13px;
  color: #7a8299;
  border-bottom: 1px solid #232936;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.td-strong {
  color: #eef0f4;
  font-weight: 500;
}

/* Skill list */
.skill-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.skill-meta {
  flex: 1;
  min-width: 0;
}

.skill-name {
  color: #eef0f4;
  font-size: 13px;
  font-weight: 500;
  margin: 0 0 2px;
}

.skill-sub {
  color: #7a8299;
  font-size: 11.5px;
  margin: 0;
}

.verified {
  color: #4dd39a;
  margin-left: 4px;
}

/* Pills */
.pill {
  font-size: 10.5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
}

.pill-purple {
  background: rgba(107, 91, 255, 0.18);
  color: #6b5bff;
}

.pill-purple-soft {
  background: rgba(107, 91, 255, 0.1);
  color: #8473ff;
}

.pill-yellow {
  background: rgba(245, 166, 35, 0.14);
  color: #f5a623;
}

.pill-muted {
  background: rgba(122, 130, 153, 0.16);
  color: #7a8299;
}

.empty-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  color: #7a8299;
  font-size: 13px;
}

/* Skeletons */
.skeleton {
  position: relative;
  overflow: hidden;
}

.skeleton-line {
  height: 12px;
  background: #232936;
  border-radius: 6px;
}

.w-1-3 {
  width: 33%;
}
</style>
