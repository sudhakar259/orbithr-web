<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import api from '@/services/api'
import MoreBtn, { type MenuItem as MoreMenuItem } from '@/components/MoreBtn.vue'
import SearchInput from '@/components/table/SearchInput.vue'
import DataTable from '@/components/table/DataTable.vue'
import PaginationBar from '@/components/table/PaginationBar.vue'
import BulkActionsBar from '@/components/table/BulkActionsBar.vue'

interface DomainRequest {
  id: number
  name: string
  email: string
  domain_name: string
  plan_name: string
  status: 'pending' | 'approved' | 'rejected'
  payment_status: number | string | null
  created_at: string
}

function requiredValidator(v: string | number | null | undefined) {
  return v !== undefined && v !== null && String(v).trim().length > 0
}
function emailValidator(v: string) {
  return /^(?:[a-zA-Z0-9_'^&%`{}~|-]+(?:\.[a-zA-Z0-9_'^&%`{}~|-]+)*)@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(v)
}

const router = useRouter()

const loading = ref(false)
const items = ref<DomainRequest[]>([])
const selected = ref<DomainRequest | null>(null)
const isDrawerOpen = ref(false)

// selection
const selectedIds = ref<Set<number>>(new Set())

// pagination
const page = ref(1)
const perPage = ref(10)
const total = ref(0)
const lastPage = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const canPrev = computed(() => page.value > 1)
const canNext = computed(() => page.value < lastPage.value)

const searchQuery = ref('')
let searchTimer: number | undefined
function onSearchChange() {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    page.value = 1
  }, 300)
}

const filteredItems = computed<DomainRequest[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((it) =>
    [it.name, it.email, it.domain_name, it.plan_name]
      .some(v => String(v || '').toLowerCase().includes(q))
  )
})

const paginationData = computed(() => {
  const t = total.value
  if (t === 0) return '0–0 of 0'
  const start = (page.value - 1) * perPage.value + 1
  const end = Math.min(page.value * perPage.value, t)
  return `${start}–${end} of ${t}`
})

const visiblePages = computed<(number | string)[]>(() => {
  const totalPages = lastPage.value
  const current = page.value
  const delta = 1
  const range: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) range.push(i)
  }
  const pages: (number | string)[] = []
  let prev: number | null = null
  for (const p of range) {
    if (prev !== null) {
      if (p - prev === 2) pages.push(prev + 1)
      else if (p - prev > 2) pages.push('…')
    }
    pages.push(p)
    prev = p
  }
  return pages
})

const { token, isAuthenticated } = useAuth()

// Drawer form fields
const fullName = ref('')
const email = ref('')
const company = ref('')
const domain = ref('')
const country = ref('')
const contact = ref('')
const billing = ref('Auto Debit')
const plan = ref('Starter')
const isFormValid = computed(() =>
  requiredValidator(fullName.value) &&
  requiredValidator(company.value) &&
  requiredValidator(domain.value) &&
  requiredValidator(email.value) &&
  emailValidator(email.value)
)

function openDrawer(row?: DomainRequest) {
  isDrawerOpen.value = true
  if (row) {
    selected.value = row
    fullName.value = row.name
    email.value = row.email
    company.value = ''
    domain.value = row.domain_name
  } else {
    selected.value = null
    fullName.value = ''
    email.value = ''
    company.value = ''
    domain.value = ''
    country.value = ''
    contact.value = ''
    billing.value = 'Auto Debit'
    plan.value = 'Starter'
  }
  nextTick(() => {
    const el = document.getElementById('drawer-scroll')
    if (el) el.scrollTop = 0
  })
}

function closeDrawer() {
  isDrawerOpen.value = false
}

async function load() {
  if (!token.value) return
  loading.value = true
  try {
    const { data } = await api.get('requested-domain', { params: { page: page.value, per_page: perPage.value, search: searchQuery.value || undefined } })
    if (Array.isArray(data)) {
      const mapped: DomainRequest[] = data.map((r: any): DomainRequest => {
        const planName = r.plan_name ?? r.plan?.name ?? r.pay_status?.plan?.name ?? r.order?.plan?.name ?? ''
        const payStatus: number | string | null = r.payment_status ?? r.order?.status ?? r.pay_status?.status ?? null
        const status: 'approved' | 'rejected' | 'pending' = r.is_approved === 1 ? 'approved' : r.is_approved === 2 ? 'rejected' : 'pending'
        return {
          id: r.id,
          name: r.name,
          email: r.email,
          domain_name: r.domain_name,
          plan_name: planName,
          status,
          payment_status: payStatus,
          created_at: r.created_at,
        }
      })
      items.value = mapped
      total.value = items.value.length
    } else {
      items.value = (data.data || []).map((r: any): DomainRequest => {
        const planName = r.plan_name ?? r.plan?.name ?? r.pay_status?.plan?.name ?? r.order?.plan?.name ?? ''
        const payStatus: number | string | null = r.payment_status ?? r.order?.status ?? r.pay_status?.status ?? null
        const status: 'approved' | 'rejected' | 'pending' = r.is_approved === 1 ? 'approved' : r.is_approved === 2 ? 'rejected' : 'pending'
        return {
          id: r.id,
          name: r.name,
          email: r.email,
          domain_name: r.domain_name,
          plan_name: planName,
          status,
          payment_status: payStatus,
          created_at: r.created_at,
        }
      })
      total.value = data.meta?.total || 0
    }
    // clear selection when page changes
    selectedIds.value.clear()
  } catch (err: any) {
    console.error(err.response?.data || err.message)
    items.value = []
    total.value = 0
    if (err.response?.status === 401) {
      localStorage.removeItem('tokenKey')
      localStorage.removeItem('userKey')
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

async function approve(row: DomainRequest) {
  await api.post(`requested-domain/${row.id}/approve`)
  await load()
}

async function reject(row: DomainRequest) {
  await api.post(`requested-domain/${row.id}/reject`, { disapprove_reason: 'Rejected by admin' })
  await load()
}

async function destroy(row: DomainRequest) {
  await api.post(`requested-domain/${row.id}`, { disapprove_reason: 'destroyed by admin' })
  await load()
}

async function bulkApprove() {
  if (selectedIds.value.size === 0) return
  if (!confirm(`Approve ${selectedIds.value.size} selected request(s)?`)) return
  await Promise.all(Array.from(selectedIds.value).map(id => api.post(`requested-domain/${id}/approve`)))
  await load()
}

async function bulkReject() {
  if (selectedIds.value.size === 0) return
  const reason = prompt('Reason (optional):')
  await Promise.all(Array.from(selectedIds.value).map(id => api.post(`requested-domain/${id}/reject`, { disapprove_reason: reason })))
  await load()
}

function getMenuItems(row: DomainRequest): MoreMenuItem[] {
  return [
    { title: 'View', value: 'view', icon: '👁️' },
    { title: 'Approve', value: 'approve', icon: '✅' },
    { title: 'Reject', value: 'reject', icon: '❌', color: 'red' },
    { title: 'Destroy', value: 'destroy', icon: '🗑️', color: 'red' },
  ]
}

function handleAction(action: String, row: DomainRequest) {
  if (action === 'view') openDrawer(row)
  else if (action === 'approve') approve(row)
  else if (action === 'reject') reject(row)
  else if (action === 'destroy') destroy(row)
}

async function bulkDelete() {
  if (selectedIds.value.size === 0) return
  if (!confirm(`Delete ${selectedIds.value.size} selected request(s)? This cannot be undone.`)) return
  await Promise.all(Array.from(selectedIds.value).map(id => api.delete(`requested-domain/${id}`)))
  await load()
}

function changePage(to: number) {
  if (to < 1 || to > lastPage.value) return
  page.value = to
  load()
}

onMounted(() => {
  if (isAuthenticated() && token.value) load()
})

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'domain_name', label: 'Domain Name' },
  { key: 'plan_name', label: 'Plan Name' },
  { key: 'status', label: 'Status' },
  { key: 'payment_status', label: 'Payment Status' },
  { key: 'created_at', label: 'Created At' },
  { key: 'actions', label: '', width: '80px', align: 'center' },
] as const satisfies { key: string; label: string; width?: string; align?: 'left'|'right'|'center'; headerClass?: string; cellClass?: string }[]

</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Domain Requests</h1>
        <p class="mt-1 text-slate-600">Review and manage requested tenant domains.</p>
      </div>
      <div class="flex items-center gap-3">
        <SearchInput v-model="searchQuery" placeholder="Search Domain Requests" class="w-64" @update:modelValue="onSearchChange" />
        <button class="btn-primary rounded-lg bg-brand-600 px-3 py-2 text-white hover:bg-brand-700" @click="openDrawer()">
          New Request
        </button>
      </div>
    </div>

    <BulkActionsBar v-if="selectedIds.size" :count="selectedIds.size">
      <button class="rounded border border-emerald-600 px-2.5 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50" @click="bulkApprove">Approve Selected</button>
      <button class="rounded border border-rose-600 px-2.5 py-1.5 text-sm text-rose-700 hover:bg-rose-50" @click="bulkReject">Reject Selected</button>
      <button class="rounded border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50" @click="bulkDelete">Delete Selected</button>
    </BulkActionsBar>

    <DataTable
      :columns="columns"
      :rows="filteredItems"
      row-key="id"
      selectable
      :selected-ids="selectedIds"
      @update:selectedIds="val => (selectedIds = val as Set<number>)"
      :loading="loading"
      empty-text="No domain requests found."
    >
      <template #cell-name="{ row }">
        <span class="font-medium text-slate-900">{{ row.name }}</span>
      </template>
      <template #cell-email="{ row }">{{ row.email }}</template>
      <template #cell-domain_name="{ row }">{{ row.domain_name }}</template>
      <template #cell-plan_name="{ row }">{{ row.plan_name || '-' }}</template>
      <template #cell-status="{ row }">
        <span :class="['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', row.status === 'approved' && 'bg-green-50 text-green-700', row.status === 'pending' && 'bg-amber-50 text-amber-700', row.status === 'rejected' && 'bg-rose-50 text-rose-700']">{{ row.status }}</span>
      </template>
      <template #cell-payment_status="{ row }">{{ typeof row.payment_status === 'string' ? row.payment_status : (row.payment_status === 1 ? 'Paid' : row.payment_status === 2 ? 'Failed' : 'Pending') }}</template>
      <template #cell-created_at="{ row }">{{ new Date(row.created_at).toLocaleString() }}</template>
      <template #cell-actions="{ row }">
        <div class="text-center">
          <MoreBtn :items="getMenuItems(row)" item-props @select="(action) => handleAction(action, row)" />
        </div>
      </template>
    </DataTable>

    <PaginationBar
      :page="page"
      :per-page="perPage"
      :total="total"
      :per-page-options="[10, 25, 50]"
      @update:page="(p: number) => { page = p; load() }"
      @update:perPage="(pp: number) => { perPage = pp; page = 1; load() }"
    />

    <transition name="fade">
      <div v-if="isDrawerOpen" class="fixed inset-0 z-40 flex">
        <div class="fixed inset-0 bg-black/30" @click="closeDrawer" />
        <div class="relative ml-auto h-full w-full max-w-md transform overflow-hidden bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 class="text-base font-semibold text-slate-900">{{ selected ? 'Request Details' : 'Add Domain Request' }}</h3>
            <button class="text-slate-500 hover:text-slate-700" @click="closeDrawer" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div id="drawer-scroll" class="h-full overflow-y-auto px-4 py-4">
            <form class="space-y-4" @submit.prevent>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Full Name</label>
                <input v-model="fullName" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Email</label>
                <input v-model="email" type="email" class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
                <p v-if="email && !emailValidator(email)" class="mt-1 text-xs text-rose-600">Enter a valid email</p>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Organization</label>
                <input v-model="company" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Requested Domain</label>
                <input v-model="domain" type="text" placeholder="acme" class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-600">Country</label>
                  <input v-model="country" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-600">Contact</label>
                  <input v-model="contact" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Billing</label>
                <select v-model="billing" class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500">
                  <option>Auto Debit</option>
                  <option>Manual-Cash</option>
                  <option>Manual-Paypal</option>
                  <option>Manual-Credit-Card</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-slate-600">Plan</label>
                <select v-model="plan" class="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:ring-brand-500">
                  <option>Starter</option>
                  <option>Growth</option>
                  <option>Enterprise</option>
                </select>
              </div>

              <div class="pt-2">
                <button type="button" :disabled="!isFormValid" class="disabled:opacity-50 rounded-lg bg-brand-600 px-3 py-2 text-white hover:bg-brand-700">
                  Submit
                </button>
                <button type="button" class="ml-2 rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-50" @click="closeDrawer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
