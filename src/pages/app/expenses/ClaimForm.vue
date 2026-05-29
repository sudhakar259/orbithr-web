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
  <div class="claim-form">
    <header class="form-head">
      <button class="back-btn" @click="router.back()">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
      <div>
        <span class="eyebrow">{{ isEdit ? 'Editing' : 'New entry' }} · expense claim</span>
        <h1 class="page-title">{{ isEdit ? 'Edit claim' : 'New claim' }}</h1>
      </div>
    </header>

    <div v-if="loading" class="card skeleton-card">
      <div v-for="i in 4" :key="i" class="skeleton-row" />
    </div>

    <template v-else>
      <div v-if="error" class="alert alert--err">{{ error }}</div>

      <section class="card card--pad">
        <h2 class="section-title">Claim details</h2>
        <div class="field-grid">
          <div class="field field--full">
            <label class="field__label">Title</label>
            <input v-model="form.title" type="text" class="input" placeholder="Business trip, office supplies..." />
          </div>
          <div class="field field--full">
            <label class="field__label">Description</label>
            <textarea v-model="form.description" rows="3" class="input textarea" placeholder="Optional description..." />
          </div>
          <div class="field">
            <label class="field__label">Currency</label>
            <select v-model="form.currency" class="input">
              <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
      </section>

      <section class="card">
        <header class="card__head">
          <div>
            <h2 class="card__title">Line items</h2>
            <p class="card__sub">Add each receipt or expense line</p>
          </div>
          <button class="btn btn--ghost btn--sm" @click="addItem">+ Add item</button>
        </header>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th class="num">Amount</th>
                <th>Merchant</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in items" :key="idx">
                <td>
                  <input v-model="item.date" type="date" class="input input--inline" />
                </td>
                <td>
                  <select v-model="item.category_id" class="input input--inline">
                    <option :value="null">Select…</option>
                    <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                  </select>
                </td>
                <td>
                  <input v-model="item.description" type="text" class="input input--inline" placeholder="Description" />
                </td>
                <td class="num">
                  <input v-model="item.amount" type="number" step="0.01" min="0" class="input input--inline input--num" placeholder="0.00" />
                </td>
                <td>
                  <input v-model="item.merchant_name" type="text" class="input input--inline" placeholder="Merchant" />
                </td>
                <td class="action-col">
                  <button v-if="items.length > 1" class="icon-btn" @click="removeItem(idx)" aria-label="Remove">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="total-bar">
          <span class="total-bar__label">Total</span>
          <span class="total-bar__value mono">{{ fmtCurrency(total) }}</span>
        </div>
      </section>

      <div class="actions-bar">
        <button :disabled="saving" class="btn btn--ghost" @click="save(false)">
          {{ saving ? 'Saving…' : 'Save draft' }}
        </button>
        <button :disabled="saving" class="btn btn--primary" @click="save(true)">
          {{ saving ? 'Submitting…' : 'Submit claim' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.claim-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1100px;
}

.form-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 8px;
  color: #7A8299;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.back-btn:hover { color: #EEF0F4; border-color: #2F374A; }

.eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}

.page-title {
  margin: 2px 0 0;
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  font-weight: 400;
}

.alert {
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
}

.alert--err {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #F38288;
}

.card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}

.card--pad { padding: 20px; }

.skeleton-card { padding: 18px; }
.skeleton-row {
  height: 14px;
  margin-bottom: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #1B1F2A 0%, #232936 50%, #1B1F2A 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.section-title {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: #EEF0F4;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field--full { grid-column: 1 / -1; }

.field__label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7A8299;
}

.input {
  width: 100%;
  padding: 9px 12px;
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 8px;
  color: #EEF0F4;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}

.input::placeholder { color: #5A6378; }
.input:focus { border-color: #6B5BFF; }
.input.textarea { resize: vertical; min-height: 80px; }

.input--inline {
  padding: 7px 9px;
  font-size: 12.5px;
  background: #161A23;
}

.input--num {
  font-family: 'JetBrains Mono', monospace;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #232936;
}

.card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #EEF0F4;
}

.card__sub {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: #7A8299;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn--primary { background: #6B5BFF; color: #fff; }
.btn--primary:hover:not(:disabled) { background: #7C6CFF; }
.btn--ghost { background: transparent; color: #C9CDD9; border-color: #232936; }
.btn--ghost:hover:not(:disabled) { background: rgba(255, 255, 255, 0.03); color: #EEF0F4; }
.btn--sm { padding: 6px 12px; font-size: 12px; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.table-wrap { overflow-x: auto; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table thead th {
  padding: 10px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
  text-align: left;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid #232936;
}

.data-table thead th.num { text-align: right; }

.data-table tbody td {
  padding: 8px 14px;
  border-bottom: 1px solid #1F2430;
  vertical-align: middle;
}

.data-table tbody tr:last-child td { border-bottom: none; }
.data-table td.num { text-align: right; }
.data-table td.action-col { width: 36px; text-align: right; }

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #F38288;
  cursor: pointer;
  transition: background 0.15s ease;
}

.icon-btn:hover {
  background: rgba(243, 130, 136, 0.1);
  border-color: rgba(243, 130, 136, 0.3);
}

.total-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 14px 20px;
  border-top: 1px solid #232936;
  background: rgba(107, 91, 255, 0.04);
}

.total-bar__label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}

.total-bar__value {
  font-family: 'Instrument Serif', serif;
  font-size: 26px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
}

.actions-bar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
</style>
