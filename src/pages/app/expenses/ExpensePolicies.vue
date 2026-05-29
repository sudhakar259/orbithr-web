<script setup lang="ts">
defineOptions({ name: 'ExpensePolicies' })

import { ref, onMounted } from 'vue'
import expenseService, { type ExpenseCategory, type ExpensePolicy } from '@/services/expenseService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

const loading = ref(true)
const error = ref('')
const categories = ref<ExpenseCategory[]>([])
const policies = ref<ExpensePolicy[]>([])

const newCat = ref({ name: '', color: '#4F7EFF', is_active: true })
const catSaving = ref(false)

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
  if (!await dialog('Delete', 'Delete this category?')) return
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
  if (!await dialog('Delete', 'Delete this policy?')) return
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
  <div class="ep-page">
    <h1 class="ep-title">Expense Policies</h1>

    <div v-if="error" class="ep-error">{{ error }}</div>

    <div v-if="loading" class="ep-card ep-loading">
      <div v-for="i in 4" :key="i" class="ep-skeleton"></div>
    </div>

    <template v-else>
      <!-- Categories -->
      <div class="ep-section-card">
        <div class="ep-section-head">
          <span class="ep-section-title">Categories</span>
        </div>
        <table class="ep-table">
          <thead>
            <tr>
              <th class="ep-th">Name</th>
              <th class="ep-th">Color</th>
              <th class="ep-th">Active</th>
              <th class="ep-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categories" :key="cat.id" class="ep-row">
              <td class="ep-td ep-td-name">{{ cat.name }}</td>
              <td class="ep-td">
                <div class="ep-color-cell">
                  <span class="ep-color-dot" :style="{ backgroundColor: cat.color ?? '#4F7EFF' }" />
                  <span class="ep-color-label">{{ cat.color }}</span>
                </div>
              </td>
              <td class="ep-td">
                <button
                  :class="['ep-status-btn', cat.is_active ? 'ep-status-active' : 'ep-status-inactive']"
                  @click="toggleCatActive(cat)"
                >
                  {{ cat.is_active ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="ep-td">
                <button class="ep-btn-delete" @click="removeCat(cat.id)">Delete</button>
              </td>
            </tr>
            <tr class="ep-add-row">
              <td class="ep-td">
                <input v-model="newCat.name" type="text" class="ep-input-sm" placeholder="Category name" />
              </td>
              <td class="ep-td">
                <input v-model="newCat.color" type="color" class="ep-color-picker" />
              </td>
              <td class="ep-td" />
              <td class="ep-td">
                <button :disabled="catSaving || !newCat.name.trim()" class="ep-btn-add" @click="addCategory">
                  {{ catSaving ? 'Adding…' : 'Add' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Policies -->
      <div class="ep-section-card">
        <div class="ep-section-head">
          <span class="ep-section-title">Policies</span>
          <button v-if="!showPolicyForm" class="ep-btn-primary" @click="showPolicyForm = true">Add Policy</button>
        </div>
        <table class="ep-table">
          <thead>
            <tr>
              <th class="ep-th">Category</th>
              <th class="ep-th">Name</th>
              <th class="ep-th">Daily Limit</th>
              <th class="ep-th">Per Claim</th>
              <th class="ep-th">Monthly Cap</th>
              <th class="ep-th">Attachment</th>
              <th class="ep-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in policies" :key="p.id" class="ep-row">
              <td class="ep-td">{{ p.category?.name || catName(p.category_id) }}</td>
              <td class="ep-td ep-td-name">{{ p.name }}</td>
              <td class="ep-td ep-td-mono">{{ p.daily_limit != null ? '$' + p.daily_limit : '-' }}</td>
              <td class="ep-td ep-td-mono">{{ p.per_claim_limit != null ? '$' + p.per_claim_limit : '-' }}</td>
              <td class="ep-td ep-td-mono">{{ p.monthly_cap != null ? '$' + p.monthly_cap : '-' }}</td>
              <td class="ep-td">
                <span :class="p.requires_attachment ? 'ep-req-yes' : 'ep-req-no'">
                  {{ p.requires_attachment ? 'Required' : 'No' }}
                </span>
              </td>
              <td class="ep-td">
                <button class="ep-btn-delete" @click="removePolicy(p.id)">Delete</button>
              </td>
            </tr>
            <tr v-if="!policies.length && !showPolicyForm">
              <td colspan="7" class="ep-td-empty">No policies configured</td>
            </tr>
            <tr v-if="showPolicyForm" class="ep-add-row">
              <td class="ep-td">
                <select v-model="newPolicy.category_id" class="ep-input-sm">
                  <option :value="null">Select…</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </td>
              <td class="ep-td">
                <input v-model="newPolicy.name" type="text" class="ep-input-sm" placeholder="Policy name" />
              </td>
              <td class="ep-td">
                <input v-model="newPolicy.daily_limit" type="number" step="0.01" class="ep-input-num" placeholder="0" />
              </td>
              <td class="ep-td">
                <input v-model="newPolicy.per_claim_limit" type="number" step="0.01" class="ep-input-num" placeholder="0" />
              </td>
              <td class="ep-td">
                <input v-model="newPolicy.monthly_cap" type="number" step="0.01" class="ep-input-num" placeholder="0" />
              </td>
              <td class="ep-td">
                <label class="ep-checkbox-row">
                  <input v-model="newPolicy.requires_attachment" type="checkbox" class="ep-checkbox" />
                  <span>Req.</span>
                </label>
              </td>
              <td class="ep-td">
                <div class="ep-inline-actions">
                  <button :disabled="policySaving" class="ep-btn-add" @click="addPolicy">{{ policySaving ? 'Saving…' : 'Save' }}</button>
                  <button class="ep-btn-cancel-sm" @click="showPolicyForm = false">Cancel</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ep-page { display: flex; flex-direction: column; gap: 20px; }
.ep-title { font-size: 20px; font-weight: 700; color: #EEF0F4; margin: 0; }
.ep-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.ep-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; }
.ep-loading { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.ep-skeleton { height: 36px; background: #232936; border-radius: 6px; animation: ep-pulse 1.2s ease-in-out infinite; }
@keyframes ep-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ep-section-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.ep-section-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #232936; }
.ep-section-title { font-size: 13px; font-weight: 600; color: #EEF0F4; text-transform: uppercase; letter-spacing: 0.08em; }
.ep-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 7px 14px; font-size: 12px; font-weight: 500; cursor: pointer; }
.ep-btn-primary:hover { opacity: 0.88; }
.ep-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ep-th { padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.ep-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.ep-row:last-child { border-bottom: none; }
.ep-row:hover { background: rgba(255,255,255,0.02); }
.ep-add-row { background: rgba(255,255,255,0.01); border-top: 1px solid #232936; }
.ep-td { padding: 10px 14px; color: #B6BED0; vertical-align: middle; }
.ep-td-name { color: #EEF0F4; font-weight: 500; }
.ep-td-mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.ep-td-empty { padding: 32px 14px; text-align: center; color: #7A8299; font-size: 13px; }
.ep-color-cell { display: flex; align-items: center; gap: 8px; }
.ep-color-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.ep-color-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #7A8299; }
.ep-status-btn { border: none; border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: 500; cursor: pointer; }
.ep-status-active { background: rgba(77,211,154,0.12); color: #4DD39A; }
.ep-status-inactive { background: rgba(122,130,153,0.1); color: #7A8299; }
.ep-req-yes { color: #4DD39A; font-size: 12px; }
.ep-req-no { color: #7A8299; font-size: 12px; }
.ep-btn-delete { background: none; border: none; color: #F38288; font-size: 12px; cursor: pointer; }
.ep-btn-delete:hover { text-decoration: underline; }
.ep-input-sm { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 6px; padding: 6px 10px; font-size: 12px; outline: none; width: 100%; box-sizing: border-box; }
.ep-input-sm:focus { border-color: #6B5BFF; }
.ep-input-num { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 6px; padding: 6px 8px; font-size: 12px; outline: none; width: 72px; }
.ep-input-num:focus { border-color: #6B5BFF; }
.ep-color-picker { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #232936; cursor: pointer; background: none; }
.ep-checkbox-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #B6BED0; cursor: pointer; }
.ep-checkbox { accent-color: #6B5BFF; }
.ep-inline-actions { display: flex; gap: 8px; align-items: center; }
.ep-btn-add { background: #6B5BFF; border: none; color: #fff; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 500; cursor: pointer; }
.ep-btn-add:hover:not(:disabled) { opacity: 0.88; }
.ep-btn-add:disabled { opacity: 0.45; cursor: not-allowed; }
.ep-btn-cancel-sm { background: none; border: none; color: #7A8299; font-size: 12px; cursor: pointer; }
.ep-btn-cancel-sm:hover { color: #EEF0F4; }
</style>
