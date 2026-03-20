<script setup lang="ts">
defineOptions({ name: 'ClaimForm' })

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import expenseService, { type ExpenseCategory } from '@/services/expenseService'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'expenses.claims.edit')
const claimId = computed(() => Number(route.params.id))

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const categories = ref<ExpenseCategory[]>([])

const form = ref({
  title: '',
  description: '',
  currency: 'USD',
})

interface ItemRow {
  id?: number
  date: string
  category_id: number | null
  description: string
  amount: number | string
  merchant_name: string
}

const items = ref<ItemRow[]>([
  { date: '', category_id: null, description: '', amount: '', merchant_name: '' },
])

const currencies = ['USD', 'INR', 'EUR', 'GBP']

const total = computed(() =>
  items.value.reduce((s, i) => s + (Number(i.amount) || 0), 0),
)

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: form.value.currency }).format(amount)
}

function addItem() {
  items.value.push({ date: '', category_id: null, description: '', amount: '', merchant_name: '' })
}

function removeItem(idx: number) {
  if (items.value.length > 1) items.value.splice(idx, 1)
}

async function loadClaim() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await expenseService.getClaim(claimId.value)
    const c = res.data?.data ?? res.data
    form.value.title = c.title
    form.value.description = c.description ?? ''
    form.value.currency = c.currency ?? 'USD'
    if (c.items?.length) {
      items.value = c.items.map((it: { id: number; date: string; category_id: number; description: string; amount: number; merchant_name: string }) => ({
        id: it.id,
        date: it.date,
        category_id: it.category_id,
        description: it.description,
        amount: it.amount,
        merchant_name: it.merchant_name ?? '',
      }))
    }
  } catch {
    error.value = 'Failed to load claim.'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await expenseService.getCategories()
    categories.value = res.data?.data ?? res.data ?? []
  } catch {
    // categories not critical
  }
}

async function save(andSubmit: boolean) {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      ...form.value,
      items: items.value.map(i => ({
        ...i,
        amount: Number(i.amount) || 0,
      })),
    }

    let id = claimId.value
    if (isEdit.value) {
      await expenseService.updateClaim(id, payload)
    } else {
      const res = await expenseService.createClaim(payload)
      id = res.data?.data?.id ?? res.data?.id
    }

    if (andSubmit && id) {
      await expenseService.submitClaim(id)
    }

    router.push({ name: 'expenses.my-claims' })
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'Failed to save claim.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadCategories()
  loadClaim()
})
</script>

<template>
  <div class="max-w-4xl space-y-6">
    <div class="flex items-center gap-3">
      <button class="text-gray-400 hover:text-white" @click="router.back()">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
      </button>
      <h1 class="text-2xl font-bold text-white">{{ isEdit ? 'Edit Claim' : 'New Claim' }}</h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div v-for="i in 4" :key="i" class="h-4 bg-gray-700 rounded mb-4" />
    </div>

    <template v-else>
      <!-- Error -->
      <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400">{{ error }}</div>

      <!-- Claim details -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Title</label>
          <input v-model="form.title" type="text" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none" placeholder="Business trip, office supplies..." />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Description</label>
          <textarea v-model="form.description" rows="3" class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none" placeholder="Optional description..." />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Currency</label>
          <select v-model="form.currency" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none">
            <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>

      <!-- Items -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Line Items</h2>
          <button class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors" @click="addItem">
            Add Item
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gray-700/50">
                <th class="text-left px-4 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Date</th>
                <th class="text-left px-4 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Category</th>
                <th class="text-left px-4 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Description</th>
                <th class="text-left px-4 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Amount</th>
                <th class="text-left px-4 py-3 text-gray-300 uppercase tracking-wider text-xs font-semibold">Merchant</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-700">
              <tr v-for="(item, idx) in items" :key="idx" class="hover:bg-gray-700/30">
                <td class="px-4 py-2">
                  <input v-model="item.date" type="date" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-36" />
                </td>
                <td class="px-4 py-2">
                  <select v-model="item.category_id" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-32">
                    <option :value="null">Select...</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </td>
                <td class="px-4 py-2">
                  <input v-model="item.description" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-40" placeholder="Description" />
                </td>
                <td class="px-4 py-2">
                  <input v-model="item.amount" type="number" step="0.01" min="0" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-28" placeholder="0.00" />
                </td>
                <td class="px-4 py-2">
                  <input v-model="item.merchant_name" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none w-32" placeholder="Merchant" />
                </td>
                <td class="px-4 py-2">
                  <button v-if="items.length > 1" class="text-red-400 hover:text-red-300" @click="removeItem(idx)">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Total footer -->
        <div class="px-5 py-3 border-t border-gray-700 flex justify-end">
          <span class="text-lg font-semibold text-white">Total: {{ fmtCurrency(total) }}</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-3 justify-end">
        <button
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-40"
          @click="save(false)"
        >
          {{ saving ? 'Saving...' : 'Save Draft' }}
        </button>
        <button
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
          @click="save(true)"
        >
          {{ saving ? 'Submitting...' : 'Submit' }}
        </button>
      </div>
    </template>
  </div>
</template>
