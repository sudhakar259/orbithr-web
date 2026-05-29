<script setup lang="ts">
defineOptions({ name: 'EssLeave' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { leaveService, type LeaveBalanceSummary } from '@/services/leave'

interface LeaveApplication {
  id: string
  leaveType?: { name: string }
  start_date: string
  end_date: string
  days_requested: number
  reason: string
  status: string
  created_at: string
}

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const success = ref('')
const balanceSummary = ref<LeaveBalanceSummary[]>([])
const applications = ref<LeaveApplication[]>([])
const showForm = ref(false)
const employeeId = ref<string>('')

const form = ref({
  leave_type_id: '' as string | number,
  start_date: '',
  end_date: '',
  reason: '',
  leave_period: 'full_day' as 'full_day' | 'half_day_morning' | 'half_day_afternoon',
})

const selectedBalance = computed<LeaveBalanceSummary | null>(() => {
  if (!form.value.leave_type_id) return null
  const id = Number(form.value.leave_type_id)
  return balanceSummary.value.find(b => Number(b.leave_type_id) === id) ?? null
})

const requestedDays = computed<number>(() => {
  if (!form.value.start_date || !form.value.end_date) return 0
  const start = new Date(form.value.start_date)
  const end = new Date(form.value.end_date)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1
})

const balanceWarning = computed<string>(() => {
  if (!selectedBalance.value) return ''
  if (requestedDays.value > 0 && requestedDays.value > selectedBalance.value.available) {
    return `Only ${selectedBalance.value.available} days available`
  }
  return ''
})

const load = async () => {
  loading.value = true
  try {
    const [summaryRes, appRes, profileRes] = await Promise.allSettled([
      leaveService.getMyBalanceSummary(),
      api.get('/leave-requests', { params: { my_applications: true } }),
      api.get('/ess/profile'),
    ])
    if (summaryRes.status === 'fulfilled') balanceSummary.value = summaryRes.value
    if (appRes.status === 'fulfilled') applications.value = appRes.value.data?.data ?? []
    if (profileRes.status === 'fulfilled') employeeId.value = profileRes.value.data?.data?.employee?.id ?? ''
  } catch {
    error.value = 'Failed to load leave data'
  } finally {
    loading.value = false
  }
}

const applyLeave = async () => {
  error.value = ''
  if (!employeeId.value) {
    error.value = 'Employee profile not found. Please contact HR.'
    return
  }
  if (selectedBalance.value && requestedDays.value > selectedBalance.value.available) {
    error.value = `Only ${selectedBalance.value.available} days available for ${selectedBalance.value.leave_type}`
    return
  }
  submitting.value = true
  try {
    await leaveService.createLeaveRequest({
      employee_id: employeeId.value as unknown as number,
      leave_type_id: Number(form.value.leave_type_id),
      start_date: form.value.start_date,
      end_date: form.value.end_date,
      leave_period: form.value.leave_period,
      reason: form.value.reason,
    })
    success.value = 'Leave application submitted successfully!'
    showForm.value = false
    form.value = { leave_type_id: '', start_date: '', end_date: '', reason: '', leave_period: 'full_day' }
    setTimeout(() => (success.value = ''), 4000)
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string; error?: string } } }
    error.value = err.response?.data?.error ?? err.response?.data?.message ?? 'Failed to submit leave application'
  } finally {
    submitting.value = false
  }
}

const getStatusTone = (s: string) => {
  const map: Record<string, string> = {
    approved: 'tone-green',
    pending: 'tone-yellow',
    rejected: 'tone-red',
    cancelled: 'tone-muted',
  }
  return map[s] ?? 'tone-muted'
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// Palette of accent colors used to vary balance card visuals
const balanceColors = ['#6B5BFF', '#F5A623', '#4DD39A', '#7ED7FF', '#B28DFF']
const colorFor = (idx: number) => balanceColors[idx % balanceColors.length]

const totalFor = (b: LeaveBalanceSummary) => Number(b.balance) || 0
const usedFor = (b: LeaveBalanceSummary) => Number(b.used) || 0
const progressPct = (b: LeaveBalanceSummary) => {
  const t = totalFor(b)
  if (!t) return 0
  return Math.min(100, Math.round((usedFor(b) / t) * 100))
}

onMounted(load)
</script>

<template>
  <div class="ess-leave">
    <!-- Alerts -->
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <!-- Page header -->
    <header class="page-head">
      <div class="eyebrow">FY 2026</div>
      <h1 class="page-title">Leave</h1>
      <p class="page-sub">Your balances, pending applications, and team calendar.</p>
    </header>

    <!-- Balance cards -->
    <section class="balance-grid" v-if="loading">
      <div v-for="i in 5" :key="i" class="card balance-card skeleton">
        <div class="sk-line w-50" />
        <div class="sk-line w-30 tall" />
        <div class="sk-line w-100 thin" />
      </div>
    </section>

    <section class="balance-grid" v-else-if="balanceSummary.length">
      <div
        v-for="(bal, i) in balanceSummary"
        :key="bal.leave_type_id"
        class="card balance-card"
      >
        <div class="balance-head">
          <span class="eyebrow">{{ bal.leave_type }}</span>
          <span class="mono small muted">{{ bal.used }}/{{ bal.balance }}</span>
        </div>
        <div class="balance-num">
          {{ bal.available
          }}<span class="balance-num-suffix"> days</span>
        </div>
        <div class="progress">
          <div
            class="progress-bar"
            :style="{
              width: progressPct(bal) + '%',
              background: colorFor(i),
            }"
          />
        </div>
      </div>
    </section>

    <section v-else class="card empty-card">
      <p class="muted">No leave balance data available.</p>
    </section>

    <!-- Apply form + workflow -->
    <section class="split-grid">
      <!-- Apply form -->
      <div class="card">
        <div class="section-head">
          <h2 class="section-title">Apply for leave</h2>
          <button
            v-if="!showForm"
            class="btn btn-primary btn-sm"
            @click="showForm = true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
            </svg>
            New application
          </button>
          <button
            v-else
            class="btn btn-ghost btn-sm"
            @click="showForm = false"
          >Cancel</button>
        </div>

        <div v-if="showForm" class="form-body">
          <div class="field-grid">
            <div class="field">
              <label class="field-label">Leave type</label>
              <select v-model="form.leave_type_id" class="field-input">
                <option value="">Select type</option>
                <option
                  v-for="bal in balanceSummary"
                  :key="bal.leave_type_id"
                  :value="bal.leave_type_id"
                  :disabled="Number(bal.available) === 0"
                >
                  {{ bal.leave_type }} ({{ bal.code }}) — {{ bal.available }} avail
                </option>
              </select>
            </div>

            <div class="field">
              <label class="field-label">Balance after</label>
              <div class="field-static">
                <span v-if="selectedBalance">
                  {{ Math.max(0, Number(selectedBalance.available) - requestedDays) }} days remaining
                </span>
                <span v-else class="muted">Select a leave type</span>
              </div>
            </div>

            <div class="field">
              <label class="field-label">From</label>
              <input v-model="form.start_date" type="date" class="field-input" />
            </div>

            <div class="field">
              <label class="field-label">To</label>
              <input v-model="form.end_date" type="date" class="field-input" />
            </div>

            <div class="field span-2">
              <label class="field-label">Days</label>
              <div class="field-static">
                <span v-if="requestedDays > 0">{{ requestedDays }} working days</span>
                <span v-else class="muted">Pick a date range</span>
              </div>
            </div>

            <div class="field span-2">
              <label class="field-label">Leave period</label>
              <select v-model="form.leave_period" class="field-input">
                <option value="full_day">Full day</option>
                <option value="half_day_morning">Half day (morning)</option>
                <option value="half_day_afternoon">Half day (afternoon)</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label class="field-label">Reason</label>
            <textarea
              v-model="form.reason"
              rows="3"
              class="field-input field-textarea"
              placeholder="Add context for your manager..."
            />
          </div>

          <div v-if="balanceWarning" class="ai-suggest tone-warn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ai-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" />
            </svg>
            <div class="ai-text">
              <span class="ai-label">Heads up · </span>
              {{ balanceWarning }} (requesting {{ requestedDays }} days)
            </div>
          </div>

          <div v-else-if="selectedBalance && requestedDays > 0" class="ai-suggest">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ai-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div class="ai-text">
              <span class="ai-label">AI suggestion · </span>
              You'll have {{ Math.max(0, Number(selectedBalance.available) - requestedDays) }} days left.
              Consider attaching a handoff note for your team.
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn-ghost" @click="showForm = false">Cancel</button>
            <button
              class="btn btn-primary"
              :disabled="submitting || !!balanceWarning || !form.leave_type_id || !form.start_date || !form.end_date"
              @click="applyLeave"
            >
              {{ submitting ? 'Submitting…' : 'Submit for approval' }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

        <div v-else class="form-collapsed">
          <p class="muted">Need time off? Start a new application to see balances and submit for approval.</p>
        </div>
      </div>

      <!-- Approval workflow -->
      <div class="card">
        <div class="section-head">
          <h2 class="section-title">Approval workflow</h2>
          <span class="badge tone-yellow">In progress</span>
        </div>
        <div class="workflow">
          <div
            v-for="(step, idx) in [
              { a: 'Submitted', who: 'You', at: 'On request', done: true, active: false },
              { a: 'Manager approval', who: 'Reporting Manager', at: 'Pending', done: false, active: true },
              { a: 'HR review', who: 'HR Business Partner', at: '~2h SLA', done: false, active: false },
              { a: 'Final confirmation', who: 'System', at: 'Auto-applied', done: false, active: false },
            ]"
            :key="idx"
            class="wf-step"
          >
            <div class="wf-rail">
              <div
                v-if="idx < 3"
                class="wf-line"
                :class="{ 'wf-line-done': step.done }"
              />
              <div
                class="wf-dot"
                :class="{
                  'wf-dot-done': step.done,
                  'wf-dot-active': step.active,
                }"
              >
                <svg v-if="step.done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div v-else-if="step.active" class="wf-pulse" />
              </div>
            </div>
            <div class="wf-body">
              <div class="wf-title">{{ step.a }}</div>
              <div class="wf-meta">
                <span class="wf-avatar">{{ step.who.charAt(0) }}</span>
                <span>{{ step.who }}</span>
                <span class="muted small">· {{ step.at }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Leave history -->
    <section class="card history-card">
      <div class="section-head with-border">
        <h2 class="section-title">Leave history</h2>
        <span class="muted small">{{ applications.length }} application{{ applications.length === 1 ? '' : 's' }}</span>
      </div>

      <div v-if="loading" class="history-loading">
        <div v-for="i in 4" :key="i" class="sk-line tall" />
      </div>

      <div v-else-if="applications.length" class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th class="ta-right">Days</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="app in applications" :key="app.id">
              <td class="strong">{{ app.leaveType?.name ?? '—' }}</td>
              <td>{{ formatDate(app.start_date) }}</td>
              <td>{{ formatDate(app.end_date) }}</td>
              <td class="ta-right mono">{{ app.days_requested }}</td>
              <td>
                <span class="badge" :class="getStatusTone(app.status)">{{ app.status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <p class="muted">No leave applications found.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ess-leave {
  --bg: #0D0F17;
  --surface: #161A23;
  --surface-2: #1C2030;
  --border: #232936;
  --text: #EEF0F4;
  --muted: #7A8299;
  --accent: #6B5BFF;
  --green: #4DD39A;
  --red: #F38288;
  --yellow: #F5A623;
  --serif: 'Instrument Serif', serif;
  --mono: 'JetBrains Mono', monospace;

  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--text);
}

/* Alerts */
.alert {
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
  border: 1px solid transparent;
}
.alert-error {
  color: var(--red);
  background: rgba(243, 130, 136, 0.08);
  border-color: rgba(243, 130, 136, 0.3);
}
.alert-success {
  color: var(--green);
  background: rgba(77, 211, 154, 0.08);
  border-color: rgba(77, 211, 154, 0.3);
}

/* Page head */
.page-head {
  padding: 4px 0 0;
}
.eyebrow {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.page-title {
  font-family: var(--serif);
  font-size: 40px;
  line-height: 1;
  letter-spacing: -0.02em;
  margin: 8px 0 6px;
  color: var(--text);
}
.page-sub {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

/* Card base */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
}
.empty-card {
  text-align: center;
  padding: 28px;
}

/* Balance grid */
.balance-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
@media (max-width: 1100px) {
  .balance-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .balance-grid { grid-template-columns: repeat(2, 1fr); }
}

.balance-card {
  padding: 16px;
}
.balance-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.balance-num {
  font-family: var(--serif);
  font-size: 38px;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-top: 10px;
  color: var(--text);
}
.balance-num-suffix {
  font-family: inherit;
  font-size: 13px;
  color: var(--muted);
  font-family: 'Inter', system-ui, sans-serif;
}
.progress {
  margin-top: 14px;
  height: 4px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

/* Split grid */
.split-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
}
@media (max-width: 960px) {
  .split-grid { grid-template-columns: 1fr; }
}

/* Section head */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.section-head.with-border {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.section-title {
  font-family: var(--serif);
  font-size: 20px;
  line-height: 1;
  margin: 0;
  letter-spacing: -0.01em;
  color: var(--text);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  font-family: inherit;
}
.btn svg {
  width: 14px;
  height: 14px;
}
.btn-sm {
  padding: 6px 10px;
  font-size: 12px;
}
.btn-primary {
  background: var(--accent);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: #5a4cf0;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-ghost {
  background: transparent;
  color: var(--muted);
  border-color: var(--border);
}
.btn-ghost:hover {
  color: var(--text);
  background: var(--surface-2);
}

/* Form */
.form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-collapsed {
  padding: 8px 2px;
}
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.span-2 {
  grid-column: span 2;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.field-input {
  padding: 9px 11px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}
.field-input:focus {
  border-color: var(--accent);
}
.field-textarea {
  resize: vertical;
  min-height: 80px;
  line-height: 1.5;
}
.field-static {
  padding: 9px 11px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
}

/* AI suggestion */
.ai-suggest {
  padding: 12px;
  background: rgba(107, 91, 255, 0.08);
  border: 1px solid rgba(107, 91, 255, 0.25);
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.ai-suggest.tone-warn {
  background: rgba(245, 166, 35, 0.08);
  border-color: rgba(245, 166, 35, 0.3);
}
.ai-icon {
  width: 14px;
  height: 14px;
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 1px;
}
.tone-warn .ai-icon {
  color: var(--yellow);
}
.ai-text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text);
}
.ai-label {
  color: var(--accent);
  font-weight: 600;
}
.tone-warn .ai-label {
  color: var(--yellow);
}

/* Form actions */
.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 4px;
}

/* Workflow */
.workflow {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wf-step {
  display: flex;
  gap: 12px;
  position: relative;
}
.wf-rail {
  width: 22px;
  display: flex;
  justify-content: center;
  position: relative;
}
.wf-line {
  position: absolute;
  top: 22px;
  left: 10px;
  bottom: -10px;
  width: 2px;
  background: var(--border);
}
.wf-line-done {
  background: var(--accent);
}
.wf-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.wf-dot svg {
  width: 11px;
  height: 11px;
  color: #fff;
}
.wf-dot-done {
  background: var(--accent);
  border-color: var(--accent);
}
.wf-dot-active {
  background: rgba(245, 166, 35, 0.2);
  border-color: var(--yellow);
}
.wf-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--yellow);
}
.wf-body {
  flex: 1;
  padding-bottom: 14px;
}
.wf-title {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
}
.wf-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--muted);
}
.wf-avatar {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text);
  font-weight: 600;
}

/* Badge */
.badge {
  display: inline-flex;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  text-transform: capitalize;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
}
.tone-green {
  color: var(--green);
  background: rgba(77, 211, 154, 0.1);
  border-color: rgba(77, 211, 154, 0.25);
}
.tone-yellow {
  color: var(--yellow);
  background: rgba(245, 166, 35, 0.1);
  border-color: rgba(245, 166, 35, 0.3);
}
.tone-red {
  color: var(--red);
  background: rgba(243, 130, 136, 0.1);
  border-color: rgba(243, 130, 136, 0.3);
}
.tone-muted {
  color: var(--muted);
  background: var(--surface-2);
  border-color: var(--border);
}

/* History card */
.history-card {
  padding: 0;
}
.history-card .section-head {
  margin: 0;
  padding: 16px 18px;
}
.history-loading {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.table-wrap {
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table thead th {
  text-align: left;
  padding: 12px 18px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border);
}
.table tbody td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
}
.table tbody tr:last-child td {
  border-bottom: none;
}
.table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}
.table .strong {
  color: var(--text);
  font-weight: 500;
}
.ta-right {
  text-align: right;
}
.mono {
  font-family: var(--mono);
}
.muted {
  color: var(--muted);
}
.small {
  font-size: 11px;
}

.empty-state {
  padding: 48px 18px;
  text-align: center;
}

/* Skeletons */
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-line {
  height: 10px;
  background: var(--surface-2);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}
.sk-line.tall { height: 28px; }
.sk-line.thin { height: 4px; }
.w-30 { width: 30%; }
.w-50 { width: 50%; }
.w-100 { width: 100%; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
