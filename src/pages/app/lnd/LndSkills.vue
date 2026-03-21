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

function levelColor(level: string) {
  switch (level) {
    case 'expert':
      return 'bg-purple-900/50 text-purple-400'
    case 'advanced':
      return 'bg-blue-900/50 text-blue-400'
    case 'intermediate':
      return 'bg-yellow-900/50 text-yellow-400'
    default:
      return 'bg-gray-700 text-gray-400'
  }
}

onMounted(loadData)
</script>

<template>
  <div>
    <div
      v-if="error"
      class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
    >
      {{ error }}
    </div>

    <!-- View toggle -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex gap-2">
        <button
          :class="
            activeView === 'catalog'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          "
          class="px-3 py-1.5 rounded-lg text-sm"
          @click="activeView = 'catalog'"
        >
          Skill Catalog
        </button>
        <button
          :class="
            activeView === 'my-skills'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          "
          class="px-3 py-1.5 rounded-lg text-sm"
          @click="activeView = 'my-skills'"
        >
          My Skills
        </button>
      </div>
      <div v-if="canManage" class="flex gap-2">
        <button
          class="bg-gray-700 border border-gray-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-gray-600"
          @click="showNewCatForm = !showNewCatForm"
        >
          + Category
        </button>
        <button
          class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg"
          @click="showNewSkillForm = !showNewSkillForm"
        >
          + Skill
        </button>
      </div>
    </div>

    <!-- New Category Form -->
    <div
      v-if="showNewCatForm"
      class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4"
    >
      <h4 class="text-white text-sm font-semibold mb-3">New Category</h4>
      <form class="flex gap-3" @submit.prevent="createCategory">
        <input
          v-model="newCat.name"
          type="text"
          placeholder="Category name"
          required
          class="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <input
          v-model="newCat.description"
          type="text"
          placeholder="Description"
          class="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          :disabled="savingCat"
          class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Save
        </button>
      </form>
    </div>

    <!-- New Skill Form -->
    <div
      v-if="showNewSkillForm"
      class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4"
    >
      <h4 class="text-white text-sm font-semibold mb-3">New Skill</h4>
      <form class="flex gap-3" @submit.prevent="createSkill">
        <input
          v-model="newSkill.name"
          type="text"
          placeholder="Skill name"
          required
          class="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          v-model="newSkill.category_id"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">No Category</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
        <button
          type="submit"
          :disabled="savingSkill"
          class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Save
        </button>
      </form>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div
        v-for="n in 5"
        :key="n"
        class="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
      >
        <div class="h-4 bg-gray-700 rounded w-1/3" />
      </div>
    </div>

    <!-- Catalog View -->
    <template v-else-if="activeView === 'catalog'">
      <div v-if="skills.length" class="bg-gray-800 border border-gray-700 rounded-lg">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-700">
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Skill
              </th>
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Category
              </th>
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Description
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="skill in skills" :key="skill.id">
              <td class="px-5 py-3 text-white text-sm">{{ skill.name }}</td>
              <td class="px-5 py-3 text-gray-400 text-sm">
                {{ skill.category?.name || '-' }}
              </td>
              <td class="px-5 py-3 text-gray-400 text-sm">
                {{ skill.description || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-else
        class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center"
      >
        <p class="text-gray-400">No skills defined yet.</p>
      </div>
    </template>

    <!-- My Skills View -->
    <template v-else>
      <div v-if="mySkills.length" class="space-y-3">
        <div
          v-for="es in mySkills"
          :key="es.id"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
        >
          <div>
            <p class="text-white text-sm font-medium">{{ es.skill?.name || 'Skill' }}</p>
            <p class="text-gray-400 text-xs">
              {{ es.skill?.category?.name || 'Uncategorized' }}
              <span v-if="es.verified_at" class="text-green-400 ml-2">Verified</span>
            </p>
          </div>
          <span :class="levelColor(es.proficiency_level)" class="text-xs px-2 py-0.5 rounded-full">
            {{ es.proficiency_level }}
          </span>
        </div>
      </div>
      <div
        v-else
        class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center"
      >
        <p class="text-gray-400">No skills assigned to you yet.</p>
      </div>
    </template>
  </div>
</template>
