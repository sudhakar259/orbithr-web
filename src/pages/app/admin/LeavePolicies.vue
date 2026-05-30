<template>
  <section class="lp-page">
    <div class="lp-header">
      <div>
        <h1 class="lp-title">Leave Policies</h1>
        <p class="lp-sub">Manage leave allocation and accrual policies for your organisation.</p>
      </div>
      <button class="lp-btn-primary" @click="router.push({ name: 'leave-policies.create' })">
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        New Policy
      </button>
    </div>

    <div v-if="loading" class="lp-loading">
      <div v-for="i in 3" :key="i" class="lp-skeleton"></div>
    </div>

    <div v-else-if="!policies.length" class="lp-empty">
      <p>No policies yet.</p>
      <button class="lp-empty-link" @click="router.push({ name: 'leave-policies.create' })">Create your first policy →</button>
    </div>

    <div v-else class="lp-card">
      <table class="lp-table">
        <thead>
          <tr>
            <th class="lp-th">Name</th>
            <th class="lp-th">Description</th>
            <th class="lp-th">Auto Accrual</th>
            <th class="lp-th">Frequency</th>
            <th class="lp-th">Status</th>
            <th class="lp-th lp-th-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in policies" :key="p.id" class="lp-row">
            <td class="lp-td lp-td-name">{{ p.name }}</td>
            <td class="lp-td lp-td-desc">{{ p.description || '—' }}</td>
            <td class="lp-td">
              <span :class="['lp-badge', p.auto_accrual ? 'lp-badge-green' : 'lp-badge-muted']">
                {{ p.auto_accrual ? 'Yes' : 'No' }}
              </span>
            </td>
            <td class="lp-td lp-td-freq">{{ p.accrual_frequency }}</td>
            <td class="lp-td">
              <span :class="['lp-badge', p.is_active ? 'lp-badge-green' : 'lp-badge-muted']">
                {{ p.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="lp-td lp-td-right">
              <button class="lp-btn-ghost" @click="router.push({ name: 'leave-policies.edit', params: { id: p.id } })">Edit</button>
              <button class="lp-btn-danger" @click="remove(p)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Leave Accrual Proration -->
    <div class="lp-card lp-settings-card">
      <div class="lp-settings-head">
        <h2 class="lp-settings-title">Leave Accrual Proration</h2>
        <p class="lp-settings-sub">Controls how leave is credited for employees in their joining month.</p>
      </div>
      <div class="lp-settings-body">
        <label class="lp-field">
          <span class="lp-field-label">Proration Mode</span>
          <select v-model="prorationMode" class="lp-select" :disabled="prorationLoading">
            <option v-for="opt in prorationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </label>
        <div class="lp-settings-actions">
          <button class="lp-btn-primary" :disabled="prorationSaving || prorationLoading" @click="saveProrationMode">
            {{ prorationSaving ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({ name: 'LeavePolicies' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { leaveService, type LeavePolicy } from '@/services/leave'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import api from '@/services/api'

const router = useRouter()
const { confirm: dialog } = useConfirm()
const toast = useToast()

const policies = ref<LeavePolicy[]>([])
const loading  = ref(false)

// ---- Leave accrual proration ----
const prorationOptions = [
  { value: 'day_15_rule', label: 'Day-15 Rule (≤15th = full, >15th = half)' },
  { value: 'exact_days', label: 'Exact Days (pro-rated by days remaining)' },
  { value: 'full_month', label: 'Full Month (always 100% of monthly accrual)' },
  { value: 'no_accrual', label: 'No Accrual (no leave credited in joining month)' },
]
const prorationMode = ref('day_15_rule')
const prorationLoading = ref(false)
const prorationSaving = ref(false)

onMounted(() => {
  loadPolicies()
  loadProrationMode()
})

async function loadProrationMode() {
  prorationLoading.value = true
  try {
    const res = await api.get('/leave/proration-mode')
    if (res.data?.mode) prorationMode.value = res.data.mode
  } catch {
    // keep default
  } finally {
    prorationLoading.value = false
  }
}

async function saveProrationMode() {
  prorationSaving.value = true
  try {
    await api.put('/leave/proration-mode', { mode: prorationMode.value })
    toast.success('Proration mode saved')
  } catch (e) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.error(msg || 'Failed to save proration mode')
  } finally {
    prorationSaving.value = false
  }
}

async function loadPolicies() {
  loading.value = true
  try {
    policies.value = await leaveService.getLeavePolicies()
  } catch {
    toast.error('Failed to load policies')
  } finally {
    loading.value = false
  }
}

async function remove(p: LeavePolicy) {
  if (!await dialog('Delete', 'Delete this policy?')) return
  try {
    await leaveService.deleteLeavePolicy(p.id)
    await loadPolicies()
  } catch (e) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.error(msg || 'Failed to delete policy')
  }
}
</script>

<style scoped>
.lp-page { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.lp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.lp-title { margin: 0; font-family: 'Instrument Serif', serif; font-size: 24px; font-weight: 400; color: #EEF0F4; letter-spacing: -0.02em; }
.lp-sub { margin: 4px 0 0; font-size: 13px; color: #7A8299; }

.lp-btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  background: #6B5BFF; border: none; color: #fff;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: opacity 0.15s;
}
.lp-btn-primary:hover { opacity: 0.88; }

.lp-loading { display: flex; flex-direction: column; gap: 8px; }
.lp-skeleton { height: 52px; border-radius: 8px; background: #161A23; animation: lp-pulse 1.2s ease-in-out infinite; }
@keyframes lp-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

.lp-empty { background: #161A23; border: 1px dashed #232936; border-radius: 10px; padding: 48px 24px; text-align: center; }
.lp-empty p { margin: 0; font-size: 14px; color: #7A8299; }
.lp-empty-link { margin-top: 10px; display: inline-block; font-size: 13px; color: #6B5BFF; background: none; border: none; cursor: pointer; }
.lp-empty-link:hover { text-decoration: underline; }

.lp-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; }
.lp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lp-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.lp-th-right { text-align: right; }
.lp-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.lp-row:last-child { border-bottom: none; }
.lp-row:hover { background: rgba(255,255,255,0.02); }
.lp-td { padding: 13px 16px; color: #B6BED0; vertical-align: middle; }
.lp-td-name { color: #EEF0F4; font-weight: 500; }
.lp-td-desc { font-size: 12px; color: #7A8299; max-width: 240px; }
.lp-td-freq { text-transform: capitalize; }
.lp-td-right { text-align: right; display: flex; justify-content: flex-end; gap: 6px; }

.lp-badge { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.lp-badge-green { background: rgba(77,211,154,0.12); color: #4DD39A; }
.lp-badge-muted { background: rgba(122,130,153,0.12); color: #7A8299; }

.lp-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; transition: background 0.12s;
}
.lp-btn-ghost:hover { background: #232936; color: #EEF0F4; }
.lp-btn-danger {
  background: rgba(243,130,136,0.08); border: 1px solid rgba(243,130,136,0.25); color: #F38288;
  border-radius: 6px; padding: 5px 12px; font-size: 12px; cursor: pointer; transition: background 0.12s;
}
.lp-btn-danger:hover { background: rgba(243,130,136,0.16); }

/* Proration settings card */
.lp-settings-card { padding: 0; }
.lp-settings-head { padding: 16px 20px; border-bottom: 1px solid #232936; }
.lp-settings-title { margin: 0; font-size: 15px; font-weight: 600; color: #EEF0F4; }
.lp-settings-sub { margin: 4px 0 0; font-size: 12px; color: #7A8299; }
.lp-settings-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.lp-field { display: flex; flex-direction: column; gap: 6px; max-width: 480px; }
.lp-field-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.lp-select {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 9px 12px; outline: none;
  transition: border-color 0.15s; width: 100%; box-sizing: border-box;
}
.lp-select:focus { border-color: #6B5BFF; }
.lp-select:disabled { opacity: 0.5; }
.lp-settings-actions { display: flex; justify-content: flex-start; }
</style>
