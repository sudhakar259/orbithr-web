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

const isEdit   = computed(() => !!route.params.id)
const pageTitle = computed(() => isEdit.value ? 'Edit Leave Policy' : 'New Leave Policy')

const loading  = ref(false)
const saving   = ref(false)
const errors   = ref<Record<string, string>>({})
const isDirty  = ref(false)
const leaveTypesLocal = ref<LeaveType[]>([])

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

const newAssignment = reactive({ scope: 'organization', target_id: null as number | null, target_key: '' })

function addAssignment() {
  assignments.value.push({ scope: newAssignment.scope, target_id: newAssignment.target_id, target_key: newAssignment.target_key })
  newAssignment.scope = 'organization'
  newAssignment.target_id = null
  newAssignment.target_key = ''
  markDirty()
}

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
function monthName(m: number) { return monthNames[m - 1] }

function markDirty() { isDirty.value = true }
function fieldError(f: string) { return errors.value[f] }

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

function beforeUnload(e: BeforeUnloadEvent) {
  if (isDirty.value) { e.preventDefault(); e.returnValue = '' }
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

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
  <div class="lpf-wrap" @input="markDirty" @change="markDirty">
    <!-- Breadcrumb -->
    <nav class="lpf-breadcrumb">
      <button class="lpf-crumb-link" @click="router.push({ name: 'leave-policies' })">Leave Policies</button>
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
      <span class="lpf-crumb-current">{{ pageTitle }}</span>
    </nav>

    <!-- Page header -->
    <div class="lpf-page-head">
      <div>
        <h1 class="lpf-title">{{ pageTitle }}</h1>
        <p class="lpf-sub">{{ isEdit ? 'Update the policy settings below.' : 'Configure a new leave allocation policy for your organisation.' }}</p>
      </div>
      <div class="lpf-head-actions">
        <button class="lpf-btn-ghost" @click="cancel">Cancel</button>
        <button class="lpf-btn-primary" :disabled="saving" @click="save">
          <svg v-if="saving" class="lpf-spinner-icon" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="lpf-circle-track"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" class="lpf-circle-fill"/></svg>
          {{ saving ? 'Saving…' : (isEdit ? 'Update Policy' : 'Create Policy') }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="lpf-loading">
      <div v-for="i in 3" :key="i" class="lpf-skeleton"></div>
    </div>

    <form v-else @submit.prevent="save">

      <!-- Basic Info -->
      <section class="lpf-section">
        <h2 class="lpf-section-head">Basic Information</h2>
        <div class="lpf-grid-2">
          <div class="lpf-field">
            <label class="lpf-label">Policy Name <span class="lpf-required">*</span></label>
            <input v-model="form.name" type="text" placeholder="e.g. Standard Leave Policy"
              :class="['lpf-input', fieldError('name') ? 'lpf-input-error' : '']" />
            <p v-if="fieldError('name')" class="lpf-error-msg">{{ fieldError('name') }}</p>
          </div>
          <div class="lpf-field">
            <label class="lpf-label">Description</label>
            <input v-model="form.description" type="text" placeholder="Optional — shown to HR managers" class="lpf-input" />
          </div>
        </div>
        <label class="lpf-toggle-label">
          <button type="button" :class="['lpf-toggle', form.is_active && 'lpf-toggle-on']" @click="form.is_active = !form.is_active">
            <span class="lpf-toggle-knob" />
          </button>
          <span class="lpf-toggle-text">Active</span>
        </label>
      </section>

      <!-- Accrual Settings -->
      <section class="lpf-section">
        <h2 class="lpf-section-head">Accrual Settings</h2>
        <div class="lpf-grid-4">
          <div class="lpf-field">
            <label class="lpf-label">Frequency</label>
            <select v-model="form.accrual_frequency" class="lpf-input">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="half_yearly">Half Yearly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div class="lpf-field">
            <label class="lpf-label">Start Month</label>
            <select v-model.number="form.accrual_start_month" class="lpf-input">
              <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
            </select>
          </div>
          <div class="lpf-field">
            <label class="lpf-label">Rate (days/period)</label>
            <input v-model.number="form.accrual_rate" type="number" step="0.01" min="0" class="lpf-input" />
          </div>
          <div class="lpf-field">
            <label class="lpf-label">Max Carry Forward</label>
            <input v-model.number="form.accrual_max_carry_forward" type="number" min="0" placeholder="Unlimited" class="lpf-input" />
          </div>
        </div>
        <label class="lpf-toggle-label">
          <button type="button" :class="['lpf-toggle', form.auto_accrual && 'lpf-toggle-on']" @click="form.auto_accrual = !form.auto_accrual">
            <span class="lpf-toggle-knob" />
          </button>
          <span class="lpf-toggle-text">Enable automatic accrual</span>
        </label>
      </section>

      <!-- Approval Workflow -->
      <section class="lpf-section">
        <h2 class="lpf-section-head">Approval Workflow</h2>
        <div class="lpf-grid-3">
          <label class="lpf-toggle-label lpf-self-end">
            <button type="button" :class="['lpf-toggle', form.requires_approval && 'lpf-toggle-on']" @click="form.requires_approval = !form.requires_approval">
              <span class="lpf-toggle-knob" />
            </button>
            <span class="lpf-toggle-text">Requires approval</span>
          </label>
          <div class="lpf-field">
            <label class="lpf-label">Max Approvers</label>
            <input v-model.number="form.max_approvers" type="number" min="1" class="lpf-input" />
          </div>
          <div class="lpf-field">
            <label class="lpf-label">Min Notice (days)</label>
            <input v-model.number="form.min_notice_days" type="number" min="0" class="lpf-input" />
          </div>
        </div>
        <label class="lpf-toggle-label">
          <button type="button" :class="['lpf-toggle', form.allow_self_approval && 'lpf-toggle-on']" @click="form.allow_self_approval = !form.allow_self_approval">
            <span class="lpf-toggle-knob" />
          </button>
          <span class="lpf-toggle-text">Allow self-approval</span>
        </label>
      </section>

      <!-- Leave Restrictions -->
      <section class="lpf-section">
        <h2 class="lpf-section-head">Leave Restrictions</h2>
        <div class="lpf-toggle-grid">
          <label class="lpf-toggle-label">
            <button type="button" :class="['lpf-toggle', form.restrict_weekends_holidays && 'lpf-toggle-on']" @click="form.restrict_weekends_holidays = !form.restrict_weekends_holidays">
              <span class="lpf-toggle-knob" />
            </button>
            <span class="lpf-toggle-text">Exclude weekends & holidays</span>
          </label>
          <label class="lpf-toggle-label">
            <button type="button" :class="['lpf-toggle', form.allow_negative_balance && 'lpf-toggle-on']" @click="form.allow_negative_balance = !form.allow_negative_balance">
              <span class="lpf-toggle-knob" />
            </button>
            <span class="lpf-toggle-text">Allow negative balance</span>
          </label>
          <div class="lpf-toggle-with-input">
            <label class="lpf-toggle-label">
              <button type="button" :class="['lpf-toggle', form.restrict_consecutive_days && 'lpf-toggle-on']" @click="form.restrict_consecutive_days = !form.restrict_consecutive_days">
                <span class="lpf-toggle-knob" />
              </button>
              <span class="lpf-toggle-text">Restrict consecutive days</span>
            </label>
            <input v-if="form.restrict_consecutive_days" v-model.number="form.max_consecutive_days"
              type="number" min="1" placeholder="Max" class="lpf-input lpf-input-inline" />
          </div>
        </div>
      </section>

      <!-- Probation Settings -->
      <section class="lpf-section">
        <h2 class="lpf-section-head">Probation Settings</h2>
        <div class="lpf-grid-3">
          <label class="lpf-toggle-label lpf-self-end">
            <button type="button" :class="['lpf-toggle', form.probation_restrictions && 'lpf-toggle-on']" @click="form.probation_restrictions = !form.probation_restrictions">
              <span class="lpf-toggle-knob" />
            </button>
            <span class="lpf-toggle-text">Enable probation restrictions</span>
          </label>
          <div class="lpf-field">
            <label class="lpf-label">Probation period (months)</label>
            <input v-model.number="form.probation_period_months" type="number" min="1" max="12" class="lpf-input" />
          </div>
          <div class="lpf-field">
            <label class="lpf-label">Probation leave rate</label>
            <input v-model.number="form.probation_leave_rate" type="number" step="0.01" min="0" max="5" class="lpf-input" />
          </div>
        </div>
      </section>

      <!-- Leave Type Allocations -->
      <section class="lpf-section">
        <div class="lpf-section-title-row">
          <div>
            <h2 class="lpf-section-head">Leave Type Allocations</h2>
            <p class="lpf-section-hint">Set how many days per year each leave type grants.</p>
          </div>
        </div>

        <div v-if="items.length" class="lpf-items-table-wrap">
          <table class="lpf-items-table">
            <thead>
              <tr>
                <th class="lpf-th">Leave Type</th>
                <th class="lpf-th">Days / Year</th>
                <th class="lpf-th">Carry Forward</th>
                <th class="lpf-th">CF Limit</th>
                <th class="lpf-th">Encashable</th>
                <th class="lpf-th" style="width:40px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.leave_type_id" class="lpf-item-row">
                <td class="lpf-td lpf-td-name">{{ leaveTypeName(item.leave_type_id) }}</td>
                <td class="lpf-td">
                  <input type="number" step="0.01" v-model.number="item.allocation_per_year" class="lpf-input lpf-input-sm" />
                </td>
                <td class="lpf-td">
                  <button type="button" :class="['lpf-toggle', item.can_carry_forward && 'lpf-toggle-on']" @click="item.can_carry_forward = !item.can_carry_forward">
                    <span class="lpf-toggle-knob" />
                  </button>
                </td>
                <td class="lpf-td">
                  <input v-if="item.can_carry_forward" type="number" min="0" v-model.number="item.carry_forward_limit" placeholder="No limit" class="lpf-input lpf-input-sm" />
                  <span v-else class="lpf-muted">—</span>
                </td>
                <td class="lpf-td">
                  <button type="button" :class="['lpf-toggle', item.is_encashable && 'lpf-toggle-on']" @click="item.is_encashable = !item.is_encashable">
                    <span class="lpf-toggle-knob" />
                  </button>
                </td>
                <td class="lpf-td">
                  <button type="button" class="lpf-remove-icon" @click="removeItem(item.leave_type_id)">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="lpf-items-empty">No allocations yet. Add one below.</p>

        <div class="lpf-add-row">
          <div class="lpf-field lpf-add-flex">
            <label class="lpf-label">Leave Type</label>
            <select v-model.number="newItemLeaveType" class="lpf-input">
              <option :value="0">Select leave type…</option>
              <option v-for="lt in availableLeaveTypes" :key="lt.id" :value="lt.id">{{ lt.name }} ({{ lt.code }})</option>
            </select>
          </div>
          <div class="lpf-field">
            <label class="lpf-label">Days / Year</label>
            <input v-model.number="newItemAllocation" type="number" step="0.01" placeholder="e.g. 12" class="lpf-input lpf-input-sm" />
          </div>
          <button type="button" class="lpf-add-btn" @click="addItem">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add
          </button>
        </div>
      </section>

      <!-- Assignments -->
      <section class="lpf-section">
        <h2 class="lpf-section-head">Assignments</h2>
        <p class="lpf-section-hint">Who this policy applies to — organization-wide, by department, team, or individual.</p>

        <div class="lpf-assign-list">
          <div v-for="(a, idx) in assignments" :key="idx" class="lpf-assign-row">
            <div class="lpf-field">
              <select v-model="a.scope" class="lpf-input lpf-input-scope">
                <option value="organization">Organization</option>
                <option value="department">Department</option>
                <option value="team">Team</option>
                <option value="employee">Employee</option>
              </select>
            </div>
            <input v-if="a.scope === 'department'" v-model="a.target_key" placeholder="Department name" class="lpf-input lpf-flex-1" />
            <input v-else-if="a.scope === 'team' || a.scope === 'employee'" v-model.number="a.target_id" placeholder="ID" class="lpf-input lpf-flex-1" />
            <span v-else class="lpf-assign-org-note">Applies to all employees</span>
            <button v-if="assignments.length > 1" type="button" class="lpf-remove-icon" @click="assignments.splice(idx, 1)">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div class="lpf-add-row lpf-add-row-assign">
          <div class="lpf-field">
            <label class="lpf-label">Scope</label>
            <select v-model="newAssignment.scope" class="lpf-input lpf-input-scope">
              <option value="organization">Organization</option>
              <option value="department">Department</option>
              <option value="team">Team</option>
              <option value="employee">Employee</option>
            </select>
          </div>
          <div class="lpf-field lpf-flex-1">
            <label class="lpf-label">{{ newAssignment.scope === 'department' ? 'Department Name' : (newAssignment.scope === 'organization' ? '—' : 'ID') }}</label>
            <input v-if="newAssignment.scope === 'department'" v-model="newAssignment.target_key" placeholder="e.g. Engineering" class="lpf-input" />
            <input v-else-if="newAssignment.scope !== 'organization'" v-model.number="newAssignment.target_id" placeholder="Numeric ID" class="lpf-input" />
            <p v-else class="lpf-muted">All employees will be assigned.</p>
          </div>
          <button type="button" class="lpf-add-btn" @click="addAssignment">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add
          </button>
        </div>
      </section>

      <!-- Sticky bottom bar -->
      <div class="lpf-bottom-bar">
        <button type="button" class="lpf-btn-ghost" @click="cancel">Cancel</button>
        <button type="submit" class="lpf-btn-primary" :disabled="saving">
          <svg v-if="saving" class="lpf-spinner-icon" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="lpf-circle-track"/><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" class="lpf-circle-fill"/></svg>
          {{ saving ? 'Saving…' : (isEdit ? 'Update Policy' : 'Create Policy') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.lpf-wrap { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

.lpf-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #7A8299; }
.lpf-crumb-link { background: none; border: none; color: #7A8299; cursor: pointer; padding: 0; font-size: 13px; }
.lpf-crumb-link:hover { color: #EEF0F4; }
.lpf-crumb-current { color: #EEF0F4; }

.lpf-page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.lpf-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.lpf-sub { margin: 4px 0 0; font-size: 13px; color: #7A8299; }
.lpf-head-actions { display: flex; gap: 10px; align-items: center; }

.lpf-btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 18px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
}
.lpf-btn-primary:hover { opacity: 0.88; }
.lpf-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.lpf-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer;
}
.lpf-btn-ghost:hover { background: #232936; color: #EEF0F4; }

.lpf-spinner-icon { width: 14px; height: 14px; animation: lpf-spin 0.7s linear infinite; }
@keyframes lpf-spin { to { transform: rotate(360deg); } }
.lpf-circle-track { opacity: 0.25; }
.lpf-circle-fill { opacity: 0.75; }

.lpf-loading { display: flex; flex-direction: column; gap: 12px; }
.lpf-skeleton { height: 88px; border-radius: 10px; background: #161A23; animation: lpf-pulse 1.2s ease-in-out infinite; }
@keyframes lpf-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

.lpf-section { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.lpf-section-head { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; }
.lpf-section-hint { margin: -8px 0 0; font-size: 12px; color: #7A8299; }
.lpf-section-title-row { display: flex; align-items: flex-start; justify-content: space-between; }

.lpf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.lpf-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; align-items: end; }
.lpf-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.lpf-toggle-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

.lpf-field { display: flex; flex-direction: column; gap: 5px; }
.lpf-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.lpf-required { color: #F38288; }
.lpf-input {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 8px 11px; outline: none; width: 100%; box-sizing: border-box;
  transition: border-color 0.15s;
}
.lpf-input:focus { border-color: #6B5BFF; }
.lpf-input-error { border-color: #F38288; }
.lpf-input-sm { width: 90px; }
.lpf-input-inline { width: 72px; }
.lpf-input-scope { width: 160px; }
.lpf-flex-1 { flex: 1; }
.lpf-error-msg { font-size: 11px; color: #F38288; margin-top: 2px; }
.lpf-muted { font-size: 12px; color: #7A8299; }
.lpf-self-end { align-self: flex-end; padding-bottom: 8px; }

.lpf-toggle-label { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.lpf-toggle-text { font-size: 13px; color: #B6BED0; }
.lpf-toggle {
  position: relative; width: 32px; height: 18px; border-radius: 10px;
  background: #2C3142; border: none; cursor: pointer; padding: 0; transition: background 0.15s; flex-shrink: 0;
}
.lpf-toggle-on { background: #6B5BFF; }
.lpf-toggle-knob {
  position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  border-radius: 50%; background: #fff; transition: transform 0.15s; display: block;
}
.lpf-toggle-on .lpf-toggle-knob { transform: translateX(14px); }

.lpf-toggle-with-input { display: flex; align-items: center; gap: 12px; }

/* Items table */
.lpf-items-table-wrap { border: 1px solid #232936; border-radius: 8px; overflow: hidden; }
.lpf-items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lpf-th { padding: 9px 14px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.lpf-item-row { border-bottom: 1px solid #1C2030; }
.lpf-item-row:last-child { border-bottom: none; }
.lpf-item-row:hover { background: rgba(255,255,255,0.02); }
.lpf-td { padding: 10px 14px; vertical-align: middle; }
.lpf-td-name { color: #EEF0F4; font-weight: 500; }
.lpf-items-empty { border: 1px dashed #232936; border-radius: 8px; padding: 24px; text-align: center; font-size: 13px; color: #7A8299; }

.lpf-remove-icon { background: none; border: none; color: #7A8299; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; }
.lpf-remove-icon:hover { color: #F38288; background: rgba(243,130,136,0.1); }

.lpf-add-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; background: #0D0F17; border: 1px solid #232936; border-radius: 8px; padding: 14px; }
.lpf-add-row-assign { margin-top: 4px; }
.lpf-add-flex { flex: 1; min-width: 160px; }
.lpf-add-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(107,91,255,0.12); border: 1px solid rgba(107,91,255,0.35); color: #8A7BFF;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; transition: background 0.12s; white-space: nowrap;
}
.lpf-add-btn:hover { background: rgba(107,91,255,0.2); }

/* Assignments */
.lpf-assign-list { display: flex; flex-direction: column; gap: 8px; }
.lpf-assign-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; background: #0D0F17; border: 1px solid #232936; border-radius: 8px; padding: 12px; }
.lpf-assign-org-note { flex: 1; font-size: 13px; color: #7A8299; font-style: italic; }

/* Sticky bottom bar */
.lpf-bottom-bar {
  position: sticky; bottom: 0; z-index: 10;
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  background: rgba(17,20,28,0.9); backdrop-filter: blur(8px);
  border: 1px solid #232936; border-radius: 10px;
  padding: 14px 20px;
}
</style>
