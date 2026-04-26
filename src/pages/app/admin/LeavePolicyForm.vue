<script setup lang="ts">
defineOptions({ name: 'LeavePolicyForm' })
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { leaveService, type LeaveType } from '@/services/leave'
import { useLeave } from '@/composables/useLeave'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route  = useRoute()
const toast  = useToast()
const { leaveTypes, fetchLeaveTypes } = useLeave()

// ── Mode ──────────────────────────────────────────────────────────────────────
const isEdit   = computed(() => !!route.params.id)
const pageTitle = computed(() => isEdit.value ? 'Edit Leave Policy' : 'New Leave Policy')

// ── State ─────────────────────────────────────────────────────────────────────
const loading  = ref(false)
const saving   = ref(false)
const errors   = ref<Record<string, string>>({})
const isDirty  = ref(false)
const leaveTypesLocal = ref<LeaveType[]>([])

// ── Form ──────────────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
const form = reactive<any>({
  name: '',
  description: '',
  is_active: true,
  auto_accrual: true,
  accrual_frequency: 'monthly',
  accrual_rate: 1.25,
  accrual_start_month: 1,
  accrual_max_carry_forward: null,
  requires_approval: true,
  max_approvers: 1,
  allow_self_approval: false,
  min_notice_days: 0,
  restrict_consecutive_days: false,
  max_consecutive_days: null,
  restrict_weekends_holidays: true,
  allow_negative_balance: false,
  probation_restrictions: true,
  probation_period_months: 3,
  probation_leave_rate: 0.5,
})

const items       = ref<any[]>([])
const assignments = ref<any[]>([{ scope: 'organization', target_id: null, target_key: '' }])

// ── Policy Items helpers ──────────────────────────────────────────────────────
const newItemLeaveType  = ref<number>(0)
const newItemAllocation = ref<number | null>(null)

const availableLeaveTypes = computed(() =>
  leaveTypesLocal.value.filter(lt => !items.value.some(i => i.leave_type_id === lt.id))
)

function leaveTypeName(id: number) {
  const lt = leaveTypesLocal.value.find(l => l.id === id)
  return lt ? `${lt.name} (${lt.code})` : 'Unknown'
}

function addItem() {
  if (!newItemLeaveType.value || !newItemAllocation.value) return
  items.value.push({ leave_type_id: newItemLeaveType.value, allocation_per_year: newItemAllocation.value, can_carry_forward: false, carry_forward_limit: null, is_encashable: false })
  newItemLeaveType.value = 0
  newItemAllocation.value = null
  markDirty()
}

function removeItem(id: number) {
  items.value = items.value.filter(i => i.leave_type_id !== id)
  markDirty()
}

// ── Assignment helpers ────────────────────────────────────────────────────────
const newAssignment = reactive({ scope: 'organization', target_id: null as number | null, target_key: '' })

function addAssignment() {
  assignments.value.push({ scope: newAssignment.scope, target_id: newAssignment.target_id, target_key: newAssignment.target_key })
  newAssignment.scope = 'organization'
  newAssignment.target_id = null
  newAssignment.target_key = ''
  markDirty()
}

// ── Utilities ─────────────────────────────────────────────────────────────────
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
function monthName(m: number) { return monthNames[m - 1] }

function markDirty() { isDirty.value = true }

function fieldError(f: string) { return errors.value[f] }

// ── Load for edit ─────────────────────────────────────────────────────────────
async function loadPolicy() {
  loading.value = true
  try {
    const policies: any[] = await leaveService.getLeavePolicies()
    const p = policies.find((x: any) => String(x.id) === String(route.params.id))
    if (!p) { toast.error('Policy not found'); router.push({ name: 'leave-policies' }); return }
    Object.assign(form, p)
    items.value = (p.items || []).map((i: any) => ({
      leave_type_id: i.leave_type_id,
      allocation_per_year: i.allocation_per_year,
      can_carry_forward: i.can_carry_forward ?? false,
      carry_forward_limit: i.carry_forward_limit ?? null,
      is_encashable: i.is_encashable ?? false,
    }))
    assignments.value = (p.assignments || []).map((a: any) => ({ ...a }))
    if (!assignments.value.length) assignments.value = [{ scope: 'organization', target_id: null, target_key: '' }]
  } catch {
    toast.error('Failed to load policy')
    router.push({ name: 'leave-policies' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchLeaveTypes(false)
  leaveTypesLocal.value = leaveTypes.value
  if (isEdit.value) await loadPolicy()
})

// ── Unsaved-changes guard ─────────────────────────────────────────────────────
function beforeUnload(e: BeforeUnloadEvent) {
  if (isDirty.value) { e.preventDefault(); e.returnValue = '' }
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
  errors.value = {}
  if (!form.name.trim()) { errors.value.name = 'Policy name is required'; return }

  saving.value = true
  const payload: any = {
    name: form.name, description: form.description, is_active: form.is_active,
    auto_accrual: form.auto_accrual, accrual_frequency: form.accrual_frequency,
    accrual_rate: form.accrual_rate, accrual_start_month: form.accrual_start_month,
    accrual_max_carry_forward: form.accrual_max_carry_forward,
    requires_approval: form.requires_approval, max_approvers: form.max_approvers,
    allow_self_approval: form.allow_self_approval, min_notice_days: form.min_notice_days,
    restrict_consecutive_days: form.restrict_consecutive_days,
    max_consecutive_days: form.restrict_consecutive_days ? form.max_consecutive_days : null,
    restrict_weekends_holidays: form.restrict_weekends_holidays,
    allow_negative_balance: form.allow_negative_balance,
    probation_restrictions: form.probation_restrictions,
    probation_period_months: form.probation_period_months,
    probation_leave_rate: form.probation_leave_rate,
    items: items.value, assignments: assignments.value,
  }

  try {
    if (isEdit.value) {
      await leaveService.updateLeavePolicy(route.params.id as string, payload)
    } else {
      await leaveService.createLeavePolicy(payload)
    }
    isDirty.value = false
    toast.success(`Policy ${isEdit.value ? 'updated' : 'created'} successfully`)
    router.push({ name: 'leave-policies' })
  } catch (e: any) {
    const data = e?.response?.data
    if (data?.errors) {
      errors.value = Object.fromEntries(
        Object.entries(data.errors).map(([k, v]) => [k, (v as string[]).join(', ')])
      )
    } else {
      toast.error(data?.message || e.message || 'Failed to save policy')
    }
  } finally {
    saving.value = false
  }
}

async function cancel() {
  if (isDirty.value) {
    const ok = window.confirm('You have unsaved changes. Leave anyway?')
    if (!ok) return
  }
  router.push({ name: 'leave-policies' })
}
</script>

<template>
  <div class="space-y-6">

    <!-- ── Breadcrumb ──────────────────────────────────────────────────────── -->
    <nav class="flex items-center gap-2 text-sm text-gray-400">
      <button class="hover:text-white transition-colors" @click="router.push({ name: 'leave-policies' })">Leave Policies</button>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      <span class="text-white">{{ pageTitle }}</span>
    </nav>

    <!-- ── Page header ─────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-white">{{ pageTitle }}</h1>
        <p class="mt-1 text-sm text-gray-400">{{ isEdit ? 'Update the policy settings below.' : 'Configure a new leave allocation policy for your organisation.' }}</p>
      </div>
      <!-- sticky action buttons at top -->
      <div class="flex items-center gap-3">
        <button type="button" class="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:text-white hover:border-gray-400 transition-colors" @click="cancel">Cancel</button>
        <button type="button" class="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors" :disabled="saving" @click="save">
          <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          {{ saving ? 'Saving…' : (isEdit ? 'Update Policy' : 'Create Policy') }}
        </button>
      </div>
    </div>

    <!-- ── Loading skeleton ────────────────────────────────────────────────── -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-lg bg-gray-800"></div>
    </div>

    <template v-else>
      <form @submit.prevent="save" class="space-y-6" @input="markDirty" @change="markDirty">

        <!-- ── Section: Basic Info ──────────────────────────────────────────── -->
        <section class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Basic Information</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-300">Policy Name <span class="text-red-400">*</span></label>
              <input v-model="form.name" type="text" placeholder="e.g. Standard Leave Policy"
                class="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-gray-700 text-white placeholder-gray-400 focus:outline-none transition-colors"
                :class="fieldError('name') ? 'border-red-500' : 'border-gray-600 focus:border-brand-500'" />
              <p v-if="fieldError('name')" class="mt-1 text-xs text-red-400">{{ fieldError('name') }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Description</label>
              <input v-model="form.description" type="text" placeholder="Optional — shown to HR managers"
                class="mt-1 w-full rounded-md border border-gray-600 px-3 py-2 text-sm bg-gray-700 text-white placeholder-gray-400 focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label class="inline-flex cursor-pointer items-center gap-3">
              <button type="button" role="switch" :aria-checked="form.is_active"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                :class="form.is_active ? 'bg-brand-600' : 'bg-gray-600'"
                @click="form.is_active = !form.is_active">
                <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="form.is_active ? 'translate-x-4' : 'translate-x-1'" />
              </button>
              <span class="text-sm text-gray-300">Active</span>
            </label>
          </div>
        </section>

        <!-- ── Section: Accrual ─────────────────────────────────────────────── -->
        <section class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Accrual Settings</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label class="block text-sm font-medium text-gray-300">Frequency</label>
              <select v-model="form.accrual_frequency" class="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="half_yearly">Half Yearly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Start Month</label>
              <select v-model.number="form.accrual_start_month" class="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Rate (days/period)</label>
              <input v-model.number="form.accrual_rate" type="number" step="0.01" min="0"
                class="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Max Carry Forward</label>
              <input v-model.number="form.accrual_max_carry_forward" type="number" min="0" placeholder="Unlimited"
                class="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
          <label class="inline-flex cursor-pointer items-center gap-3">
            <button type="button" role="switch" :aria-checked="form.auto_accrual"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
              :class="form.auto_accrual ? 'bg-brand-600' : 'bg-gray-600'"
              @click="form.auto_accrual = !form.auto_accrual">
              <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                :class="form.auto_accrual ? 'translate-x-4' : 'translate-x-1'" />
            </button>
            <span class="text-sm text-gray-300">Enable automatic accrual</span>
          </label>
        </section>

        <!-- ── Section: Approval ────────────────────────────────────────────── -->
        <section class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Approval Workflow</h2>
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <label class="inline-flex cursor-pointer items-center gap-3 self-end pb-2">
              <button type="button" role="switch" :aria-checked="form.requires_approval"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                :class="form.requires_approval ? 'bg-brand-600' : 'bg-gray-600'"
                @click="form.requires_approval = !form.requires_approval">
                <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="form.requires_approval ? 'translate-x-4' : 'translate-x-1'" />
              </button>
              <span class="text-sm text-gray-300">Requires approval</span>
            </label>
            <div>
              <label class="block text-sm font-medium text-gray-300">Max Approvers</label>
              <input v-model.number="form.max_approvers" type="number" min="1"
                class="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Min Notice (days)</label>
              <input v-model.number="form.min_notice_days" type="number" min="0"
                class="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
          <label class="inline-flex cursor-pointer items-center gap-3">
            <button type="button" role="switch" :aria-checked="form.allow_self_approval"
              class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
              :class="form.allow_self_approval ? 'bg-brand-600' : 'bg-gray-600'"
              @click="form.allow_self_approval = !form.allow_self_approval">
              <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                :class="form.allow_self_approval ? 'translate-x-4' : 'translate-x-1'" />
            </button>
            <span class="text-sm text-gray-300">Allow self-approval</span>
          </label>
        </section>

        <!-- ── Section: Restrictions ────────────────────────────────────────── -->
        <section class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Leave Restrictions</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label class="inline-flex cursor-pointer items-center gap-3">
              <button type="button" role="switch" :aria-checked="form.restrict_weekends_holidays"
                class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                :class="form.restrict_weekends_holidays ? 'bg-brand-600' : 'bg-gray-600'"
                @click="form.restrict_weekends_holidays = !form.restrict_weekends_holidays">
                <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="form.restrict_weekends_holidays ? 'translate-x-4' : 'translate-x-1'" />
              </button>
              <span class="text-sm text-gray-300">Exclude weekends & holidays</span>
            </label>
            <label class="inline-flex cursor-pointer items-center gap-3">
              <button type="button" role="switch" :aria-checked="form.allow_negative_balance"
                class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                :class="form.allow_negative_balance ? 'bg-brand-600' : 'bg-gray-600'"
                @click="form.allow_negative_balance = !form.allow_negative_balance">
                <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="form.allow_negative_balance ? 'translate-x-4' : 'translate-x-1'" />
              </button>
              <span class="text-sm text-gray-300">Allow negative balance</span>
            </label>
            <div class="flex items-center gap-4">
              <label class="inline-flex cursor-pointer items-center gap-3">
                <button type="button" role="switch" :aria-checked="form.restrict_consecutive_days"
                  class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none"
                  :class="form.restrict_consecutive_days ? 'bg-brand-600' : 'bg-gray-600'"
                  @click="form.restrict_consecutive_days = !form.restrict_consecutive_days">
                  <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                    :class="form.restrict_consecutive_days ? 'translate-x-4' : 'translate-x-1'" />
                </button>
                <span class="text-sm text-gray-300">Restrict consecutive days</span>
              </label>
              <input v-if="form.restrict_consecutive_days" v-model.number="form.max_consecutive_days"
                type="number" min="1" placeholder="Max"
                class="w-20 rounded-md border border-gray-600 bg-gray-700 text-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
        </section>

        <!-- ── Section: Probation ───────────────────────────────────────────── -->
        <section class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Probation Settings</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label class="inline-flex cursor-pointer items-center gap-3 self-end pb-2">
              <button type="button" role="switch" :aria-checked="form.probation_restrictions"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                :class="form.probation_restrictions ? 'bg-brand-600' : 'bg-gray-600'"
                @click="form.probation_restrictions = !form.probation_restrictions">
                <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="form.probation_restrictions ? 'translate-x-4' : 'translate-x-1'" />
              </button>
              <span class="text-sm text-gray-300">Enable probation restrictions</span>
            </label>
            <div>
              <label class="block text-sm font-medium text-gray-300">Probation period (months)</label>
              <input v-model.number="form.probation_period_months" type="number" min="1" max="12"
                class="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300">Probation leave rate</label>
              <input v-model.number="form.probation_leave_rate" type="number" step="0.01" min="0" max="5"
                class="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
          </div>
        </section>

        <!-- ── Section: Policy Items ────────────────────────────────────────── -->
        <section class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Leave Type Allocations</h2>
              <p class="mt-0.5 text-xs text-gray-500">Set how many days per year each leave type grants.</p>
            </div>
          </div>

          <!-- existing items -->
          <div v-if="items.length" class="overflow-hidden rounded-md border border-gray-700">
            <table class="min-w-full">
              <thead class="bg-gray-700/60">
                <tr>
                  <th class="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Leave Type</th>
                  <th class="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Days / Year</th>
                  <th class="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Carry Forward</th>
                  <th class="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">CF Limit</th>
                  <th class="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Encashable</th>
                  <th class="w-12"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                <tr v-for="item in items" :key="item.leave_type_id" class="hover:bg-gray-700/30">
                  <td class="px-4 py-3 text-sm font-medium text-white">{{ leaveTypeName(item.leave_type_id) }}</td>
                  <td class="px-4 py-3">
                    <input type="number" step="0.01" v-model.number="item.allocation_per_year"
                      class="w-24 rounded border border-gray-600 bg-gray-700 text-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none" />
                  </td>
                  <td class="px-4 py-3">
                    <button type="button" role="switch" :aria-checked="item.can_carry_forward"
                      class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                      :class="item.can_carry_forward ? 'bg-brand-600' : 'bg-gray-600'"
                      @click="item.can_carry_forward = !item.can_carry_forward">
                      <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                        :class="item.can_carry_forward ? 'translate-x-4' : 'translate-x-1'" />
                    </button>
                  </td>
                  <td class="px-4 py-3">
                    <input v-if="item.can_carry_forward" type="number" min="0" v-model.number="item.carry_forward_limit" placeholder="No limit"
                      class="w-24 rounded border border-gray-600 bg-gray-700 text-white placeholder-gray-500 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none" />
                    <span v-else class="text-xs text-gray-500">—</span>
                  </td>
                  <td class="px-4 py-3">
                    <button type="button" role="switch" :aria-checked="item.is_encashable"
                      class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                      :class="item.is_encashable ? 'bg-brand-600' : 'bg-gray-600'"
                      @click="item.is_encashable = !item.is_encashable">
                      <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                        :class="item.is_encashable ? 'translate-x-4' : 'translate-x-1'" />
                    </button>
                  </td>
                  <td class="px-4 py-3">
                    <button type="button" class="rounded p-1 text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors" @click="removeItem(item.leave_type_id)" title="Remove">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="rounded-md border border-dashed border-gray-600 py-6 text-center text-sm text-gray-500">No allocations yet. Add one below.</p>

          <!-- add new item -->
          <div class="flex flex-wrap items-end gap-3 rounded-md border border-gray-700 bg-gray-700/30 p-4">
            <div class="flex-1 min-w-40">
              <label class="block text-xs font-medium text-gray-400 mb-1">Leave Type</label>
              <select v-model.number="newItemLeaveType" class="w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option :value="0">Select leave type…</option>
                <option v-for="lt in availableLeaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }} ({{ lt.code }})</option>
              </select>
            </div>
            <div class="w-32">
              <label class="block text-xs font-medium text-gray-400 mb-1">Days / Year</label>
              <input v-model.number="newItemAllocation" type="number" step="0.01" placeholder="e.g. 12"
                class="w-full rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </div>
            <button type="button" class="inline-flex items-center gap-1.5 rounded-md bg-brand-600/20 border border-brand-600/40 px-4 py-2 text-sm text-brand-400 hover:bg-brand-600/30 transition-colors" @click="addItem">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add
            </button>
          </div>
        </section>

        <!-- ── Section: Assignments ──────────────────────────────────────────── -->
        <section class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Assignments</h2>
            <p class="mt-0.5 text-xs text-gray-500">Who this policy applies to — organization-wide, by department, team, or individual.</p>
          </div>

          <div class="space-y-2">
            <div v-for="(a, idx) in assignments" :key="idx" class="flex flex-wrap items-center gap-3 rounded-md border border-gray-700 bg-gray-700/30 p-3">
              <div class="w-40">
                <select v-model="a.scope" class="w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                  <option value="organization">Organization</option>
                  <option value="department">Department</option>
                  <option value="team">Team</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <input v-if="a.scope === 'department'" v-model="a.target_key" placeholder="Department name"
                class="flex-1 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              <input v-if="a.scope === 'team' || a.scope === 'employee'" v-model.number="a.target_id" placeholder="ID"
                class="flex-1 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              <span v-if="a.scope === 'organization'" class="flex-1 text-sm text-gray-400 italic">Applies to all employees</span>
              <button v-if="assignments.length > 1" type="button" class="rounded p-1 text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors" @click="assignments.splice(idx, 1)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <!-- add new assignment -->
          <div class="flex flex-wrap items-end gap-3 rounded-md border border-gray-700 bg-gray-700/30 p-4">
            <div class="w-40">
              <label class="block text-xs font-medium text-gray-400 mb-1">Scope</label>
              <select v-model="newAssignment.scope" class="w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option value="organization">Organization</option>
                <option value="department">Department</option>
                <option value="team">Team</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <div class="flex-1 min-w-40">
              <label class="block text-xs font-medium text-gray-400 mb-1">{{ newAssignment.scope === 'department' ? 'Department Name' : (newAssignment.scope === 'organization' ? '—' : 'ID') }}</label>
              <input v-if="newAssignment.scope === 'department'" v-model="newAssignment.target_key" placeholder="e.g. Engineering"
                class="w-full rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              <input v-else-if="newAssignment.scope !== 'organization'" v-model.number="newAssignment.target_id" placeholder="Numeric ID"
                class="w-full rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
              <p v-else class="py-2 text-sm text-gray-500 italic">All employees will be assigned.</p>
            </div>
            <button type="button" class="inline-flex items-center gap-1.5 rounded-md bg-brand-600/20 border border-brand-600/40 px-4 py-2 text-sm text-brand-400 hover:bg-brand-600/30 transition-colors" @click="addAssignment">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add
            </button>
          </div>
        </section>

        <!-- ── Bottom action bar ─────────────────────────────────────────────── -->
        <div class="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-lg border border-gray-700 bg-gray-800/90 px-6 py-4 backdrop-blur">
          <button type="button" class="rounded-md border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:text-white hover:border-gray-400 transition-colors" @click="cancel">Cancel</button>
          <button type="submit" class="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors" :disabled="saving">
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            {{ saving ? 'Saving…' : (isEdit ? 'Update Policy' : 'Create Policy') }}
          </button>
        </div>

      </form>
    </template>
  </div>
</template>
