<script setup lang="ts">
defineOptions({ name: 'ExpensePolicies' })

import { ref, onMounted } from 'vue'
import expenseService, { type ExpenseCategory, type ExpensePolicy } from '@/services/expenseService'

const loading = ref(true)
const error = ref('')
const categories = ref<ExpenseCategory[]>([])
const policies = ref<ExpensePolicy[]>([])

// Category form
const newCat = ref({ name: '', color: '#4F7EFF', is_active: true })
const catSaving = ref(false)

// Policy form
const showPolicyForm = ref(false)
const policySaving = ref(false)
const newPolicy = ref({
  category_id: null as number | null,
  name: '',
  daily_limit: '' as string | number,
  per_claim_limit: '' as string | number,
  monthly_cap: '' as string | number,
  requires_attachment: false,
})

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [catRes, polRes] = await Promise.all([expenseService.getCategories(), expenseService.getPolicies()])
    categories.value = catRes.data?.data ?? catRes.data ?? []
    policies.value = polRes.data?.data ?? polRes.data ?? []
  } catch {
    error.value = 'Failed to load data.'
  } finally {
    loading.value = false
  }
}

async function addCategory() {
  if (!newCat.value.name.trim()) return
  catSaving.value = true
  try {
    await expenseService.createCategory(newCat.value)
    newCat.value = { name: '', color: '#4F7EFF', is_active: true }
    await fetchData()
  } catch {
    error.value = 'Failed to create category.'
  } finally {
    catSaving.value = false
  }
}

async function toggleCatActive(cat: ExpenseCategory) {
  try {
    await expenseService.updateCategory(cat.id, { is_active: !cat.is_active })
    cat.is_active = !cat.is_active
  } catch {
    error.value = 'Failed to update category.'
  }
}

async function removeCat(id: number) {
  if (!confirm('Delete this category?')) return
  try {
    await expenseService.deleteCategory(id)
    categories.value = categories.value.filter(c => c.id !== id)
  } catch {
    error.value = 'Failed to delete category.'
  }
}

async function addPolicy() {
  if (!newPolicy.value.name.trim() || !newPolicy.value.category_id) return
  policySaving.value = true
  try {
    await expenseService.createPolicy({
      ...newPolicy.value,
      daily_limit: Number(newPolicy.value.daily_limit) || null,
      per_claim_limit: Number(newPolicy.value.per_claim_limit) || null,
      monthly_cap: Number(newPolicy.value.monthly_cap) || null,
    } as unknown as Partial<ExpensePolicy>)
    newPolicy.value = { category_id: null, name: '', daily_limit: '', per_claim_limit: '', monthly_cap: '', requires_attachment: false }
    showPolicyForm.value = false
    await fetchData()
  } catch {
    error.value = 'Failed to create policy.'
  } finally {
    policySaving.value = false
  }
}

async function removePolicy(id: number) {
  if (!confirm('Delete this policy?')) return
  try {
    await expenseService.deletePolicy(id)
    policies.value = policies.value.filter(p => p.id !== id)
  } catch {
    error.value = 'Failed to delete policy.'
  }
}

function catName(id: number) {
  return categories.value.find(c => c.id === id)?.name ?? '-'
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-bold text-white">Expense Policies</h1>

    <!-- Error -->
    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div v-for="i in 4" :key="i" class="h-4 bg-gray-700 rounded mb-4" />
    </div>

    <template v-else>
      <!-- Section 1: Categories -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-700">
          <h2 class="text-lg font-semibold text-white">Categories</h2>
        </div>
        <table class="w-full">
          <thead>
            <tr class="bg-gray-700/50">
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Name</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Color</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Active</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="cat in categories" :key="cat.id" class="hover:bg-gray-700/30">
              <td class="px-5 py-3 text-white text-sm">{{ cat.name }}</td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <span class="w-4 h-4 rounded-full inline-block" :style="{ backgroundColor: cat.color ?? '#4F7EFF' }" />
                  <span class="text-gray-400 text-xs">{{ cat.color }}</span>
                </div>
              </td>
              <td class="px-5 py-3">
                <button
                  :class="[cat.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400', 'text-xs px-2 py-0.5 rounded-full font-medium']"
                  @click="toggleCatActive(cat)"
                >
                  {{ cat.is_active ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="px-5 py-3">
                <button class="text-sm text-red-400 hover:text-red-300" @click="removeCat(cat.id)">Delete</button>
              </td>
            </tr>
            <!-- Inline create -->
            <tr class="bg-gray-700/20">
              <td class="px-5 py-3">
                <input v-model="newCat.name" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-full" placeholder="Category name" />
              </td>
              <td class="px-5 py-3">
                <input v-model="newCat.color" type="color" class="w-8 h-8 rounded border border-gray-600 cursor-pointer" />
              </td>
              <td class="px-5 py-3" />
              <td class="px-5 py-3">
                <button :disabled="catSaving || !newCat.name.trim()" class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40" @click="addCategory">
                  {{ catSaving ? 'Adding...' : 'Add' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 2: Policies -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Policies</h2>
          <button
            v-if="!showPolicyForm"
            class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            @click="showPolicyForm = true"
          >
            Add Policy
          </button>
        </div>
        <table class="w-full">
          <thead>
            <tr class="bg-gray-700/50">
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Category</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Name</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Daily Limit</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Per Claim Limit</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Monthly Cap</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Attachment</th>
              <th class="text-left px-5 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="p in policies" :key="p.id" class="hover:bg-gray-700/30">
              <td class="px-5 py-3 text-gray-300 text-sm">{{ p.category?.name || catName(p.category_id) }}</td>
              <td class="px-5 py-3 text-white text-sm">{{ p.name }}</td>
              <td class="px-5 py-3 text-gray-300 text-sm">{{ p.daily_limit != null ? '$' + p.daily_limit : '-' }}</td>
              <td class="px-5 py-3 text-gray-300 text-sm">{{ p.per_claim_limit != null ? '$' + p.per_claim_limit : '-' }}</td>
              <td class="px-5 py-3 text-gray-300 text-sm">{{ p.monthly_cap != null ? '$' + p.monthly_cap : '-' }}</td>
              <td class="px-5 py-3">
                <span :class="[p.requires_attachment ? 'text-green-400' : 'text-gray-500', 'text-sm']">
                  {{ p.requires_attachment ? 'Required' : 'No' }}
                </span>
              </td>
              <td class="px-5 py-3">
                <button class="text-sm text-red-400 hover:text-red-300" @click="removePolicy(p.id)">Delete</button>
              </td>
            </tr>
            <tr v-if="!policies.length && !showPolicyForm">
              <td colspan="7" class="px-5 py-8 text-center text-gray-500">No policies configured</td>
            </tr>
            <!-- Inline add form -->
            <tr v-if="showPolicyForm" class="bg-gray-700/20">
              <td class="px-5 py-3">
                <select v-model="newPolicy.category_id" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-full">
                  <option :value="null">Select...</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </td>
              <td class="px-5 py-3">
                <input v-model="newPolicy.name" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-full" placeholder="Policy name" />
              </td>
              <td class="px-5 py-3">
                <input v-model="newPolicy.daily_limit" type="number" step="0.01" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-20" placeholder="0" />
              </td>
              <td class="px-5 py-3">
                <input v-model="newPolicy.per_claim_limit" type="number" step="0.01" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-20" placeholder="0" />
              </td>
              <td class="px-5 py-3">
                <input v-model="newPolicy.monthly_cap" type="number" step="0.01" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-20" placeholder="0" />
              </td>
              <td class="px-5 py-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="newPolicy.requires_attachment" type="checkbox" class="rounded bg-gray-700 border-gray-600" />
                  <span class="text-sm text-gray-300">Req.</span>
                </label>
              </td>
              <td class="px-5 py-3">
                <div class="flex gap-2">
                  <button :disabled="policySaving" class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40" @click="addPolicy">
                    {{ policySaving ? 'Saving...' : 'Save' }}
                  </button>
                  <button class="text-sm text-gray-400 hover:text-white" @click="showPolicyForm = false">Cancel</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
