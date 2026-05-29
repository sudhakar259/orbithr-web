<script setup lang="ts">
defineOptions({ name: 'TeamPolls' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface PollOption {
  id: number
  text: string
  votes_count: number
}

interface Poll {
  id: number
  question: string
  description: string | null
  options: PollOption[]
  is_multiple_choice: boolean
  is_anonymous: boolean
  ends_at: string | null
  total_votes: number
  user_voted: boolean
  user_vote_option_ids: number[]
  is_closed: boolean
  is_mine: boolean
  created_by_name: string
  created_at: string
}

const activeTab = ref<'active' | 'mine'>('active')
const loading = ref(true)
const polls = ref<Poll[]>([])
const showCreateForm = ref(false)
const submitting = ref(false)
const votingId = ref<number | null>(null)
const selectedOptions = ref<Record<number, number[]>>({})

const form = ref({
  question: '',
  description: '',
  options: ['', ''],
  is_multiple_choice: false,
  is_anonymous: false,
  ends_at: '',
})

const displayedPolls = computed(() => {
  if (activeTab.value === 'mine') return polls.value.filter((p) => p.is_mine)
  return polls.value.filter((p) => !p.is_closed)
})

const activeCount = computed(() => polls.value.filter((p) => !p.is_closed).length)
const totalVotes = computed(() => polls.value.reduce((acc, p) => acc + p.total_votes, 0))
const closedCount = computed(() => polls.value.filter((p) => p.is_closed).length)

async function fetchPolls() {
  loading.value = true
  try {
    const res = await api.get('/polls')
    polls.value = res.data?.data ?? res.data ?? []
  } catch {
    polls.value = []
  } finally {
    loading.value = false
  }
}

function addOption() {
  form.value.options.push('')
}

function removeOption(idx: number) {
  if (form.value.options.length <= 2) return
  form.value.options.splice(idx, 1)
}

async function createPoll() {
  submitting.value = true
  try {
    await api.post('/polls', {
      ...form.value,
      options: form.value.options.filter((o) => o.trim()),
    })
    showCreateForm.value = false
    form.value = {
      question: '',
      description: '',
      options: ['', ''],
      is_multiple_choice: false,
      is_anonymous: false,
      ends_at: '',
    }
    await fetchPolls()
  } catch {
    // error handled silently
  } finally {
    submitting.value = false
  }
}

function toggleOption(pollId: number, optionId: number, isMultiple: boolean) {
  if (!selectedOptions.value[pollId]) {
    selectedOptions.value[pollId] = []
  }
  const arr = selectedOptions.value[pollId]
  const idx = arr.indexOf(optionId)
  if (isMultiple) {
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(optionId)
  } else {
    selectedOptions.value[pollId] = [optionId]
  }
}

function isSelected(pollId: number, optionId: number) {
  return selectedOptions.value[pollId]?.includes(optionId) ?? false
}

async function vote(poll: Poll) {
  const opts = selectedOptions.value[poll.id]
  if (!opts?.length) return
  votingId.value = poll.id
  try {
    await api.post(`/polls/${poll.id}/vote`, { option_ids: opts })
    await fetchPolls()
  } catch {
    // error handled silently
  } finally {
    votingId.value = null
  }
}

async function closePoll(id: number) {
  try {
    await api.post(`/polls/${id}/close`)
    await fetchPolls()
  } catch {
    // error handled silently
  }
}

function votePercentage(option: PollOption, total: number) {
  if (total === 0) return 0
  return Math.round((option.votes_count / total) * 100)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

onMounted(fetchPolls)
</script>

<template>
  <div class="polls-page">
    <!-- Page header -->
    <header class="page-header">
      <div class="header-text">
        <div class="eyebrow">Pulse · {{ activeCount }} active · {{ totalVotes }} total votes</div>
        <h1 class="title">Polls</h1>
        <p class="subtitle">Quick pulses on team sentiment, decisions, and culture signals.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="showCreateForm = !showCreateForm">
          <span>{{ showCreateForm ? '×' : '+' }}</span>
          {{ showCreateForm ? 'Cancel' : 'Launch poll' }}
        </button>
      </div>
    </header>

    <!-- KPI strip -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-eyebrow">Active</div>
        <div class="kpi-value">{{ activeCount }}<span class="kpi-unit"> polls</span></div>
        <div class="kpi-bar"><div class="kpi-fill" :style="{ width: '70%', background: '#6B5BFF' }" /></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-eyebrow">Total votes</div>
        <div class="kpi-value">{{ totalVotes }}</div>
        <div class="kpi-bar"><div class="kpi-fill" :style="{ width: '85%', background: '#4DD39A' }" /></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-eyebrow">Closed</div>
        <div class="kpi-value">{{ closedCount }}</div>
        <div class="kpi-bar"><div class="kpi-fill" :style="{ width: '40%', background: '#F5A623' }" /></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-eyebrow">Mine</div>
        <div class="kpi-value">{{ polls.filter((p) => p.is_mine).length }}</div>
        <div class="kpi-bar"><div class="kpi-fill" :style="{ width: '55%', background: '#B28DFF' }" /></div>
      </div>
    </div>

    <!-- Create poll form -->
    <section v-if="showCreateForm" class="card builder-card">
      <div class="section-head">
        <div class="section-title">New poll</div>
        <span class="badge badge-accent">Draft</span>
      </div>
      <form class="form-grid" @submit.prevent="createPoll">
        <div class="field full">
          <label>Question</label>
          <input
            v-model="form.question"
            type="text"
            required
            placeholder="What do you want to ask?"
          />
        </div>
        <div class="field full">
          <label>Description (optional)</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="Add more context..."
          />
        </div>
        <div class="field full">
          <label>Options</label>
          <div class="option-list">
            <div v-for="(_, idx) in form.options" :key="idx" class="option-row">
              <input
                v-model="form.options[idx]"
                type="text"
                required
                :placeholder="'Option ' + (idx + 1)"
              />
              <button
                v-if="form.options.length > 2"
                type="button"
                class="btn-icon btn-icon-danger"
                aria-label="Remove option"
                @click="removeOption(idx)"
              >
                ×
              </button>
            </div>
          </div>
          <button type="button" class="btn-link" @click="addOption">+ Add option</button>
        </div>
        <div class="field">
          <label class="check">
            <input v-model="form.is_multiple_choice" type="checkbox" />
            <span>Multiple choice</span>
          </label>
        </div>
        <div class="field">
          <label class="check">
            <input v-model="form.is_anonymous" type="checkbox" />
            <span>Anonymous</span>
          </label>
        </div>
        <div class="field">
          <label>Ends at</label>
          <input v-model="form.ends_at" type="date" />
        </div>
        <div class="form-actions full">
          <button type="submit" :disabled="submitting" class="btn btn-primary">
            {{ submitting ? 'Creating...' : 'Create poll' }}
          </button>
        </div>
      </form>
    </section>

    <!-- Tabs -->
    <nav class="tabs">
      <button
        :class="['tab', activeTab === 'active' && 'tab-active']"
        @click="activeTab = 'active'"
      >
        Active <span class="tab-count">{{ activeCount }}</span>
      </button>
      <button
        :class="['tab', activeTab === 'mine' && 'tab-active']"
        @click="activeTab = 'mine'"
      >
        Mine <span class="tab-count">{{ polls.filter((p) => p.is_mine).length }}</span>
      </button>
    </nav>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner" />
    </div>

    <!-- Polls grid -->
    <div v-else-if="displayedPolls.length" class="polls-grid">
      <article
        v-for="poll in displayedPolls"
        :key="poll.id"
        class="card poll-card"
      >
        <header class="poll-head">
          <div class="poll-head-text">
            <h3 class="poll-question">{{ poll.question }}</h3>
            <p v-if="poll.description" class="poll-desc">{{ poll.description }}</p>
          </div>
          <div class="poll-tags">
            <span v-if="poll.is_closed" class="badge badge-muted">Closed</span>
            <span v-else class="badge badge-ok">Live</span>
            <button
              v-if="poll.is_mine && !poll.is_closed"
              class="btn-link btn-link-muted"
              @click="closePoll(poll.id)"
            >
              Close
            </button>
          </div>
        </header>

        <!-- Vote ballot -->
        <div v-if="!poll.user_voted && !poll.is_closed" class="ballot">
          <button
            v-for="opt in poll.options"
            :key="opt.id"
            :class="['ballot-option', isSelected(poll.id, opt.id) && 'ballot-selected']"
            @click="toggleOption(poll.id, opt.id, poll.is_multiple_choice)"
          >
            <span class="ballot-dot" />
            <span class="ballot-text">{{ opt.text }}</span>
          </button>
          <button
            :disabled="!selectedOptions[poll.id]?.length || votingId === poll.id"
            class="btn btn-primary btn-block"
            @click="vote(poll)"
          >
            {{ votingId === poll.id ? 'Voting...' : 'Submit vote →' }}
          </button>
        </div>

        <!-- Results -->
        <div v-else class="results">
          <div v-for="opt in poll.options" :key="opt.id" class="result-row">
            <div class="result-head">
              <span class="result-label">{{ opt.text }}</span>
              <span class="result-pct">{{ votePercentage(opt, poll.total_votes) }}%</span>
            </div>
            <div class="result-bar">
              <div
                class="result-fill"
                :style="{ width: votePercentage(opt, poll.total_votes) + '%' }"
              />
            </div>
            <div class="result-meta">{{ opt.votes_count }} vote{{ opt.votes_count !== 1 ? 's' : '' }}</div>
          </div>
        </div>

        <!-- Footer -->
        <footer class="poll-foot">
          <span class="foot-mono">{{ poll.total_votes }} vote{{ poll.total_votes !== 1 ? 's' : '' }}</span>
          <div class="foot-meta">
            <span v-if="poll.is_anonymous">Anonymous</span>
            <span v-if="poll.ends_at">Ends {{ new Date(poll.ends_at).toLocaleDateString() }}</span>
            <span class="foot-mono">{{ timeAgo(poll.created_at) }}</span>
          </div>
        </footer>
      </article>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-icon">◇</div>
      <h3>No polls yet</h3>
      <p>Launch a quick pulse to get the team's read on a decision.</p>
    </div>
  </div>
</template>

<style scoped>
.polls-page {
  --bg: #0D0F17;
  --surface: #161A23;
  --surface-2: #1C2030;
  --surface-3: #222840;
  --border: #232936;
  --border-soft: #2A3142;
  --text: #EEF0F4;
  --text-muted: #7A8299;
  --accent: #6B5BFF;
  --accent-soft: rgba(107, 91, 255, 0.14);
  --green: #4DD39A;
  --red: #F38288;
  --yellow: #F5A623;
  --purple: #B28DFF;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.title {
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  letter-spacing: -0.02em;
  line-height: 1;
  color: var(--text);
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  max-width: 560px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  background: transparent;
  color: var(--text);
}

.btn-primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.btn-primary:hover:not(:disabled) {
  background: #5849e6;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-block {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 0;
}
.btn-link:hover { color: #8472ff; }
.btn-link-muted { color: var(--text-muted); }
.btn-link-muted:hover { color: var(--text); }

.btn-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
}
.btn-icon-danger:hover { color: var(--red); border-color: var(--red); }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.kpi-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.kpi-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.kpi-value {
  font-family: 'Instrument Serif', serif;
  font-size: 36px;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-top: 10px;
  color: var(--text);
}

.kpi-unit {
  font-size: 13px;
  color: var(--text-muted);
  font-family: 'Inter', sans-serif;
}

.kpi-bar {
  margin-top: 12px;
  height: 4px;
  background: var(--surface-3);
  border-radius: 3px;
  overflow: hidden;
}

.kpi-fill {
  height: 100%;
  border-radius: 3px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.badge-accent { background: var(--accent-soft); color: var(--accent); border: 1px solid rgba(107,91,255,0.3); }
.badge-ok { background: rgba(77,211,154,0.13); color: var(--green); border: 1px solid rgba(77,211,154,0.3); }
.badge-muted { background: var(--surface-3); color: var(--text-muted); border: 1px solid var(--border); }

.builder-card { padding: 20px; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field.full { grid-column: 1 / -1; }

.field label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.field input[type='text'],
.field input[type='date'],
.field textarea {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}
.field input:focus, .field textarea:focus { border-color: var(--accent); }
.field textarea { resize: vertical; min-height: 60px; }
.field input::placeholder, .field textarea::placeholder { color: var(--text-muted); }

.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text);
  cursor: pointer;
  padding-top: 22px;
}
.check input[type='checkbox'] {
  appearance: none;
  width: 16px; height: 16px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
}
.check input[type='checkbox']:checked { background: var(--accent); border-color: var(--accent); }
.check input[type='checkbox']:checked::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
}

.option-list { display: flex; flex-direction: column; gap: 6px; }

.option-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.option-row input { flex: 1; }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
}

.tab {
  background: none;
  border: none;
  padding: 10px 14px;
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.tab:hover { color: var(--text); }

.tab-active {
  color: var(--text);
  border-bottom-color: var(--accent);
}

.tab-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--text-muted);
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--surface-3);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.polls-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (max-width: 900px) {
  .polls-grid { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

.poll-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
}

.poll-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.poll-head-text { flex: 1; min-width: 0; }

.poll-question {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.005em;
  line-height: 1.4;
}

.poll-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin: 4px 0 0;
  line-height: 1.5;
}

.poll-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ballot { display: flex; flex-direction: column; gap: 8px; }

.ballot-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 8px;
  text-align: left;
  font-size: 12.5px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
}
.ballot-option:hover { border-color: var(--border-soft); background: var(--surface-3); }
.ballot-selected {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--text);
}

.ballot-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--text-muted);
  flex-shrink: 0;
}
.ballot-selected .ballot-dot {
  border-color: var(--accent);
  background: var(--accent);
  box-shadow: inset 0 0 0 2px var(--surface);
}

.ballot-text { flex: 1; }

.results { display: flex; flex-direction: column; gap: 12px; }

.result-row { display: flex; flex-direction: column; gap: 4px; }

.result-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.result-label { color: var(--text); }

.result-pct {
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent);
  font-weight: 600;
}

.result-bar {
  height: 5px;
  background: var(--surface-3);
  border-radius: 3px;
  overflow: hidden;
}

.result-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.result-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
}

.poll-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.foot-mono { font-family: 'JetBrains Mono', monospace; }

.foot-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.empty-state {
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 36px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.empty-state h3 {
  font-family: 'Instrument Serif', serif;
  font-size: 22px;
  margin: 0 0 4px;
  color: var(--text);
}

.empty-state p {
  color: var(--text-muted);
  font-size: 13px;
  margin: 0;
}
</style>
