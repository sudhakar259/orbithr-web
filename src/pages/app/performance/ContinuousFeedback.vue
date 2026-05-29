<script setup lang="ts">
defineOptions({ name: 'ContinuousFeedback' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'

interface FeedbackItem {
  id: number
  giver?: { id: number; name: string }
  receiver?: { id: number; name: string }
  giver_name?: string
  receiver_name?: string
  feedback_type: string
  message: string
  is_anonymous?: boolean
  given_at?: string
  created_at?: string
}

interface Employee {
  id: number
  first_name: string
  last_name?: string
  email: string
}

const toast = useToast()

const activeTab = ref<'received' | 'given' | 'give'>('received')
const loading = ref(false)
const receivedFeedback = ref<FeedbackItem[]>([])
const givenFeedback = ref<FeedbackItem[]>([])
const employees = ref<Employee[]>([])
const saving = ref(false)

const form = ref({
  receiver_id: null as number | null,
  feedback_type: 'positive',
  message: '',
  is_anonymous: false,
})

const loadReceived = async () => {
  loading.value = true
  try {
    const res = await api.get('/feedback', { params: { type: 'receiver' } })
    receivedFeedback.value = res.data?.data ?? res.data ?? []
  } catch {
    toast.error('Failed to load received feedback')
  } finally {
    loading.value = false
  }
}

const loadGiven = async () => {
  loading.value = true
  try {
    const res = await api.get('/feedback', { params: { type: 'given' } })
    givenFeedback.value = res.data?.data ?? res.data ?? []
  } catch {
    toast.error('Failed to load given feedback')
  } finally {
    loading.value = false
  }
}

const loadEmployees = async () => {
  try {
    const res = await api.get('/employees', { params: { per_page: 100 } })
    employees.value = res.data?.data ?? res.data ?? []
  } catch {
    /* silent */
  }
}

const switchTab = (tab: 'received' | 'given' | 'give') => {
  activeTab.value = tab
  if (tab === 'received') loadReceived()
  else if (tab === 'given') loadGiven()
  else if (tab === 'give' && !employees.value.length) loadEmployees()
}

const submitFeedback = async () => {
  if (!form.value.receiver_id || !form.value.message.trim()) return
  saving.value = true
  try {
    await api.post('/feedback', {
      receiver_id: form.value.receiver_id,
      feedback_type: form.value.feedback_type,
      message: form.value.message,
      is_anonymous: form.value.is_anonymous,
    })
    toast.success('Feedback submitted')
    form.value = {
      receiver_id: null,
      feedback_type: 'positive',
      message: '',
      is_anonymous: false,
    }
  } catch {
    toast.error('Failed to submit feedback')
  } finally {
    saving.value = false
  }
}

const getInitials = (name?: string) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const getTypeClass = (t: string) => {
  const m: Record<string, string> = {
    positive: 'type-positive',
    constructive: 'type-constructive',
    neutral: 'type-neutral',
  }
  return m[t] || 'type-neutral'
}

const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '')

const getDisplayName = (item: FeedbackItem, field: 'giver' | 'receiver') => {
  if (field === 'giver' && item.is_anonymous) return 'Anonymous'
  if (field === 'giver') return item.giver?.name ?? item.giver_name ?? 'Unknown'
  return item.receiver?.name ?? item.receiver_name ?? 'Unknown'
}

onMounted(() => loadReceived())
</script>

<template>
  <div class="cfb">
    <header class="cfb-head">
      <div class="cfb-eyebrow">Continuous</div>
      <h1 class="cfb-title">Continuous feedback</h1>
      <p class="cfb-subtitle">Share and receive feedback with your team.</p>
    </header>

    <!-- Tabs -->
    <div class="sub-tabs">
      <button
        :class="['sub-tab', activeTab === 'received' && 'is-active']"
        @click="switchTab('received')"
      >
        Received
      </button>
      <button
        :class="['sub-tab', activeTab === 'given' && 'is-active']"
        @click="switchTab('given')"
      >
        Given
      </button>
      <button
        :class="['sub-tab', activeTab === 'give' && 'is-active']"
        @click="switchTab('give')"
      >
        Give feedback
      </button>
    </div>

    <div v-if="loading" class="state-block">
      <div class="spinner"></div>
    </div>

    <!-- Received -->
    <template v-else-if="activeTab === 'received'">
      <div v-if="!receivedFeedback.length" class="empty-pad">No feedback received yet.</div>
      <div v-else class="fb-list">
        <div v-for="item in receivedFeedback" :key="item.id" class="fb-card">
          <div class="fb-top">
            <div class="avatar">
              {{ item.is_anonymous ? '?' : getInitials(getDisplayName(item, 'giver')) }}
            </div>
            <div class="fb-meta">
              <span class="fb-name">{{ getDisplayName(item, 'giver') }}</span>
              <span class="fb-date">{{ formatDate(item.given_at || item.created_at) }}</span>
            </div>
            <span :class="['type-badge', getTypeClass(item.feedback_type)]">
              {{ item.feedback_type }}
            </span>
          </div>
          <p class="fb-msg">"{{ item.message }}"</p>
        </div>
      </div>
    </template>

    <!-- Given -->
    <template v-else-if="activeTab === 'given'">
      <div v-if="!givenFeedback.length" class="empty-pad">No feedback given yet.</div>
      <div v-else class="fb-list">
        <div v-for="item in givenFeedback" :key="item.id" class="fb-card">
          <div class="fb-top">
            <div class="avatar">{{ getInitials(getDisplayName(item, 'receiver')) }}</div>
            <div class="fb-meta">
              <span class="fb-name">To: {{ getDisplayName(item, 'receiver') }}</span>
              <span class="fb-date">{{ formatDate(item.given_at || item.created_at) }}</span>
            </div>
            <span :class="['type-badge', getTypeClass(item.feedback_type)]">
              {{ item.feedback_type }}
            </span>
          </div>
          <p class="fb-msg">"{{ item.message }}"</p>
        </div>
      </div>
    </template>

    <!-- Give -->
    <template v-else>
      <div class="give-section">
        <div class="card">
          <form class="form" @submit.prevent="submitFeedback">
            <div class="field">
              <label>Recipient <span class="req">*</span></label>
              <select v-model="form.receiver_id" class="input" required>
                <option :value="null" disabled>Select an employee...</option>
                <option v-for="emp in employees" :key="emp.id" :value="emp.id">
                  {{ emp.first_name }} {{ emp.last_name || '' }} ({{ emp.email }})
                </option>
              </select>
            </div>

            <div class="field">
              <label>Feedback type</label>
              <div class="radio-group">
                <label class="radio-item">
                  <input
                    v-model="form.feedback_type"
                    type="radio"
                    value="positive"
                    name="fbtype"
                  />
                  <span class="radio-label positive-label">Positive</span>
                </label>
                <label class="radio-item">
                  <input
                    v-model="form.feedback_type"
                    type="radio"
                    value="constructive"
                    name="fbtype"
                  />
                  <span class="radio-label constructive-label">Constructive</span>
                </label>
                <label class="radio-item">
                  <input
                    v-model="form.feedback_type"
                    type="radio"
                    value="neutral"
                    name="fbtype"
                  />
                  <span class="radio-label neutral-label">Neutral</span>
                </label>
              </div>
            </div>

            <div class="field">
              <label>Message <span class="req">*</span></label>
              <textarea
                v-model="form.message"
                class="input textarea"
                rows="5"
                required
                placeholder="Share your feedback..."
              />
            </div>

            <div class="toggle-row">
              <label class="toggle">
                <input v-model="form.is_anonymous" type="checkbox" />
                <span class="toggle-slider" />
              </label>
              <span class="toggle-text">Submit anonymously</span>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="saving || !form.receiver_id || !form.message.trim()"
              >
                {{ saving ? 'Submitting...' : 'Send feedback' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cfb {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: #eef0f4;
}

.cfb-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cfb-eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b5bff;
  font-weight: 600;
}

.cfb-title {
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  letter-spacing: -0.02em;
  color: #eef0f4;
  margin: 0;
  font-weight: 400;
}

.cfb-subtitle {
  font-size: 12.5px;
  color: #7a8299;
  margin: 0;
}

.sub-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #232936;
}

.sub-tab {
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: #7a8299;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  font-family: inherit;
  transition:
    color 0.15s ease,
    border-color 0.15s ease;
}

.sub-tab:hover {
  color: #eef0f4;
}

.sub-tab.is-active {
  color: #eef0f4;
  border-bottom-color: #6b5bff;
}

.state-block {
  text-align: center;
  padding: 48px 0;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 2px solid #232936;
  border-top-color: #6b5bff;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-pad {
  padding: 56px 16px;
  text-align: center;
  color: #7a8299;
  font-size: 13px;
  background: #161a23;
  border: 1px dashed #232936;
  border-radius: 12px;
}

.fb-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fb-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fb-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(107, 91, 255, 0.18);
  color: #6b5bff;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.fb-meta {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.fb-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #eef0f4;
}

.fb-date {
  font-size: 11px;
  color: #7a8299;
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
}

.fb-msg {
  font-size: 12.5px;
  color: #eef0f4;
  line-height: 1.55;
  margin: 0;
  font-style: italic;
  opacity: 0.92;
}

.type-badge {
  display: inline-flex;
  padding: 3px 9px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  border: 1px solid transparent;
}

.type-positive {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}

.type-constructive {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.3);
}

.type-neutral {
  background: rgba(107, 91, 255, 0.12);
  color: #6b5bff;
  border-color: rgba(107, 91, 255, 0.3);
}

.give-section {
  max-width: 640px;
}

.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 22px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 10.5px;
  font-weight: 600;
  color: #7a8299;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.req {
  color: #f38288;
}

.input {
  padding: 9px 12px;
  font-size: 12.5px;
  color: #eef0f4;
  background: #0d0f17;
  border: 1px solid #232936;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
}

.input:focus {
  border-color: #6b5bff;
}

.textarea {
  resize: vertical;
  min-height: 100px;
}

.radio-group {
  display: flex;
  gap: 18px;
}

.radio-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.radio-item input {
  accent-color: #6b5bff;
}

.radio-label {
  font-size: 12.5px;
  font-weight: 500;
}

.positive-label {
  color: #4dd39a;
}

.constructive-label {
  color: #f5a623;
}

.neutral-label {
  color: #6b5bff;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle {
  position: relative;
  width: 38px;
  height: 20px;
  display: inline-block;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: #232936;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #7a8299;
  border-radius: 50%;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.toggle input:checked + .toggle-slider {
  background: #6b5bff;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(18px);
  background: #fff;
}

.toggle-text {
  font-size: 12.5px;
  color: #7a8299;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn {
  font-size: 12.5px;
  font-weight: 500;
  padding: 9px 18px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition:
    background 0.15s ease,
    opacity 0.15s ease;
}

.btn-primary {
  background: #6b5bff;
  color: #fff;
}

.btn-primary:hover {
  background: #5a4ce6;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
