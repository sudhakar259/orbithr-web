<script setup lang="ts">
defineOptions({ name: 'ContinuousFeedback' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

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
    form.value = { receiver_id: null, feedback_type: 'positive', message: '', is_anonymous: false }
  } catch {
    toast.error('Failed to submit feedback')
  } finally {
    saving.value = false
  }
}

const getInitials = (name?: string) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const getTypeClass = (t: string) => {
  const m: Record<string, string> = { positive: 'type-positive', constructive: 'type-constructive', neutral: 'type-neutral' }
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
  <div class="page">
    <PageHeader title="Continuous Feedback" subtitle="Share and receive feedback with your team" />

    <!-- Tabs -->
    <div class="tabs">
      <button :class="['tab', activeTab === 'received' && 'tab-active']" @click="switchTab('received')">Received</button>
      <button :class="['tab', activeTab === 'given' && 'tab-active']" @click="switchTab('given')">Given</button>
      <button :class="['tab', activeTab === 'give' && 'tab-active']" @click="switchTab('give')">Give Feedback</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loader"><div class="spinner" /></div>

    <!-- Received -->
    <div v-else-if="activeTab === 'received'">
      <EmptyState v-if="!receivedFeedback.length" icon="📬" message="No feedback received yet" />
      <div v-else class="fb-list">
        <div v-for="item in receivedFeedback" :key="item.id" class="fb-card">
          <div class="fb-top">
            <div class="avatar">{{ item.is_anonymous ? '?' : getInitials(getDisplayName(item, 'giver')) }}</div>
            <div class="fb-meta">
              <span class="fb-name">{{ getDisplayName(item, 'giver') }}</span>
              <span class="fb-date">{{ formatDate(item.given_at || item.created_at) }}</span>
            </div>
            <span :class="['type-badge', getTypeClass(item.feedback_type)]">{{ item.feedback_type }}</span>
          </div>
          <p class="fb-msg">{{ item.message }}</p>
        </div>
      </div>
    </div>

    <!-- Given -->
    <div v-else-if="activeTab === 'given'">
      <EmptyState v-if="!givenFeedback.length" icon="📤" message="No feedback given yet" />
      <div v-else class="fb-list">
        <div v-for="item in givenFeedback" :key="item.id" class="fb-card">
          <div class="fb-top">
            <div class="avatar">{{ getInitials(getDisplayName(item, 'receiver')) }}</div>
            <div class="fb-meta">
              <span class="fb-name">To: {{ getDisplayName(item, 'receiver') }}</span>
              <span class="fb-date">{{ formatDate(item.given_at || item.created_at) }}</span>
            </div>
            <span :class="['type-badge', getTypeClass(item.feedback_type)]">{{ item.feedback_type }}</span>
          </div>
          <p class="fb-msg">{{ item.message }}</p>
        </div>
      </div>
    </div>

    <!-- Give Feedback -->
    <div v-else-if="activeTab === 'give'" class="give-section">
      <div class="card form-card">
        <form @submit.prevent="submitFeedback" class="form">
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
            <label>Feedback Type</label>
            <div class="radio-group">
              <label class="radio-item">
                <input v-model="form.feedback_type" type="radio" value="positive" name="fbtype" />
                <span class="radio-label positive-label">Positive</span>
              </label>
              <label class="radio-item">
                <input v-model="form.feedback_type" type="radio" value="constructive" name="fbtype" />
                <span class="radio-label constructive-label">Constructive</span>
              </label>
              <label class="radio-item">
                <input v-model="form.feedback_type" type="radio" value="neutral" name="fbtype" />
                <span class="radio-label neutral-label">Neutral</span>
              </label>
            </div>
          </div>

          <div class="field">
            <label>Message <span class="req">*</span></label>
            <textarea v-model="form.message" class="input textarea" rows="5" required placeholder="Share your feedback..." />
          </div>

          <div class="toggle-row">
            <label class="toggle">
              <input v-model="form.is_anonymous" type="checkbox" />
              <span class="toggle-slider" />
            </label>
            <span class="toggle-text">Submit anonymously</span>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary" :disabled="saving || !form.receiver_id || !form.message.trim()">
              {{ saving ? 'Submitting...' : 'Send Feedback' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }

/* Tabs */
.tabs { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 4px; width: fit-content; }
.tab { padding: 8px 18px; font-size: 13px; font-weight: 500; color: var(--muted); background: transparent; border: none; border-radius: calc(var(--rs) - 2px); cursor: pointer; transition: all .15s; }
.tab:hover { color: var(--text); }
.tab-active { background: var(--surface2); color: var(--text); }

.loader { display: flex; justify-content: center; padding: 48px 0; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Feedback list */
.fb-list { display: flex; flex-direction: column; gap: 12px; }
.fb-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
.fb-top { display: flex; align-items: center; gap: 12px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--surface3); color: var(--muted); font-size: 12px; font-weight: 700; display: grid; place-items: center; flex-shrink: 0; }
.fb-meta { display: flex; flex-direction: column; flex: 1; }
.fb-name { font-size: 13px; font-weight: 600; color: var(--text); }
.fb-date { font-size: 11px; color: var(--muted); }
.fb-msg { font-size: 13px; color: var(--text); line-height: 1.6; opacity: .9; }

/* Type badges */
.type-badge { display: inline-flex; padding: 2px 10px; font-size: 11px; font-weight: 600; border-radius: 20px; text-transform: capitalize; white-space: nowrap; }
.type-positive { background: rgba(54,211,153,.15); color: var(--green); }
.type-constructive { background: rgba(249,168,37,.15); color: var(--yellow); }
.type-neutral { background: rgba(79,126,255,.15); color: var(--accent); }

/* Form */
.give-section { max-width: 640px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); }
.form-card { padding: 24px; }
.form { display: flex; flex-direction: column; gap: 18px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
.req { color: var(--red); }
.input { padding: 9px 12px; font-size: 13px; color: var(--text); background: var(--surface2); border: 1px solid var(--border); border-radius: calc(var(--rs) - 2px); outline: none; transition: border-color .15s; font-family: inherit; }
.input:focus { border-color: var(--accent); }
.textarea { resize: vertical; min-height: 100px; }

/* Radio */
.radio-group { display: flex; gap: 16px; }
.radio-item { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.radio-item input { accent-color: var(--accent); }
.radio-label { font-size: 13px; font-weight: 500; }
.positive-label { color: var(--green); }
.constructive-label { color: var(--yellow); }
.neutral-label { color: var(--accent); }

/* Toggle */
.toggle-row { display: flex; align-items: center; gap: 10px; }
.toggle { position: relative; width: 38px; height: 20px; display: inline-block; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; inset: 0; background: var(--surface3); border-radius: 10px; cursor: pointer; transition: background .2s; }
.toggle-slider::before { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: var(--muted); border-radius: 50%; transition: all .2s; }
.toggle input:checked + .toggle-slider { background: var(--accent); }
.toggle input:checked + .toggle-slider::before { left: 20px; background: #fff; }
.toggle-text { font-size: 13px; color: var(--muted); }

.form-actions { display: flex; justify-content: flex-end; }
.btn-primary { padding: 10px 22px; font-size: 13px; font-weight: 600; color: #fff; background: var(--accent); border: none; border-radius: calc(var(--rs) - 2px); cursor: pointer; transition: opacity .15s; }
.btn-primary:hover { opacity: .85; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
</style>
