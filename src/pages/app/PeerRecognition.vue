<script setup lang="ts">
defineOptions({ name: 'PeerRecognition' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface Recognition {
  id: number
  giver_name: string
  receiver_name: string
  badge: string
  message: string
  created_at: string
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  user_id: number | null
}

const activeTab = ref<'all' | 'received' | 'given'>('all')
const loading = ref(true)
const recognitions = ref<Recognition[]>([])
const showForm = ref(false)
const submitting = ref(false)
const employees = ref<Employee[]>([])

const form = ref({
  receiver_user_id: '',
  badge: 'star',
  message: '',
})

const badges: Record<string, { emoji: string; label: string }> = {
  star: { emoji: '⭐', label: 'Star' },
  rockstar: { emoji: '🌟', label: 'Rockstar' },
  innovator: { emoji: '💡', label: 'Innovator' },
  teamplayer: { emoji: '🤝', label: 'Team Player' },
  leader: { emoji: '🏆', label: 'Leader' },
  above_and_beyond: { emoji: '🚀', label: 'Above & Beyond' },
}

const endpoint = computed(() => {
  if (activeTab.value === 'received') return '/peer-recognition/received'
  if (activeTab.value === 'given') return '/peer-recognition/given'
  return '/peer-recognition'
})

async function fetchRecognitions() {
  loading.value = true
  try {
    const res = await api.get(endpoint.value)
    recognitions.value = res.data?.data ?? res.data ?? []
  } catch {
    recognitions.value = []
  } finally {
    loading.value = false
  }
}

async function fetchEmployees() {
  try {
    const res = await api.get('/employees', { params: { per_page: 100 } })
    employees.value = res.data?.data ?? res.data ?? []
  } catch {
    employees.value = []
  }
}

async function submitRecognition() {
  submitting.value = true
  try {
    await api.post('/peer-recognition', form.value)
    showForm.value = false
    form.value = { receiver_user_id: '', badge: 'star', message: '' }
    await fetchRecognitions()
  } catch {
    // error handled silently
  } finally {
    submitting.value = false
  }
}

function getBadge(key: string) {
  return badges[key] || { emoji: '⭐', label: key }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function switchTab(tab: 'all' | 'received' | 'given') {
  activeTab.value = tab
  fetchRecognitions()
}

function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || 'U'
}

onMounted(() => {
  fetchRecognitions()
  fetchEmployees()
})
</script>

<template>
  <div class="pr-page">
    <!-- Header -->
    <header class="pr-head">
      <div>
        <div class="pr-eyebrow">Recognition · Kudos wall · Peer to peer</div>
        <h1 class="pr-title">Peer recognition</h1>
        <p class="pr-sub">Celebrate your colleagues and the moments that lift the bar.</p>
      </div>
      <button class="btn-primary" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ Give kudos' }}
      </button>
    </header>

    <!-- Give Recognition Form -->
    <section v-if="showForm" class="card form-card">
      <div class="card-head">
        <h3 class="card-title">Recognize a colleague</h3>
      </div>
      <form class="form-body" @submit.prevent="submitRecognition">
        <div class="field">
          <label>Who would you like to recognize?</label>
          <select v-model="form.receiver_user_id" required>
            <option value="" disabled>Select employee</option>
            <option
              v-for="emp in employees"
              :key="emp.id"
              :value="emp.user_id || emp.id"
            >
              {{ emp.first_name }} {{ emp.last_name }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>Select a badge</label>
          <div class="badge-grid">
            <button
              v-for="(b, key) in badges"
              :key="key"
              type="button"
              class="badge-tile"
              :class="{ active: form.badge === key }"
              @click="form.badge = key as string"
            >
              <span class="badge-emoji">{{ b.emoji }}</span>
              <span class="badge-label">{{ b.label }}</span>
            </button>
          </div>
        </div>

        <div class="field">
          <label>Message</label>
          <textarea
            v-model="form.message"
            rows="3"
            required
            placeholder="What did they do that was awesome?"
          />
        </div>

        <div class="form-actions">
          <button type="submit" :disabled="submitting" class="btn-primary">
            {{ submitting ? 'Sending...' : 'Send recognition' }}
          </button>
        </div>
      </form>
    </section>

    <!-- Tabs -->
    <nav class="tab-row">
      <button
        v-for="tab in (['all', 'received', 'given'] as const)"
        :key="tab"
        class="tab"
        :class="{ active: activeTab === tab }"
        @click="switchTab(tab)"
      >
        {{ tab === 'all' ? 'All recognition' : tab === 'received' ? 'I received' : 'I gave' }}
      </button>
    </nav>

    <!-- Loading -->
    <div v-if="loading" class="loading-row">Loading kudos…</div>

    <!-- Recognition Wall -->
    <section v-else-if="recognitions.length" class="kudos-grid">
      <article
        v-for="r in recognitions"
        :key="r.id"
        class="kudo-card"
      >
        <span class="kudo-tag">{{ getBadge(r.badge).label }}</span>
        <div class="kudo-people">
          <div class="ava ava-from">{{ getInitial(r.giver_name) }}</div>
          <span class="kudo-arrow">→</span>
          <div class="ava ava-to">{{ getInitial(r.receiver_name) }}</div>
          <span class="kudo-emoji">{{ getBadge(r.badge).emoji }}</span>
        </div>
        <p class="kudo-line">
          <span class="kudo-name">{{ r.giver_name }}</span>
          recognized
          <span class="kudo-name">{{ r.receiver_name }}</span>
        </p>
        <blockquote class="kudo-msg">"{{ r.message }}"</blockquote>
        <div class="kudo-foot">
          <span class="kudo-time">{{ timeAgo(r.created_at) }}</span>
          <div class="kudo-reactions">
            <span>♡ 14</span>
            <span>💬 3</span>
            <span>🎉 8</span>
          </div>
        </div>
      </article>
    </section>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <p class="empty-title">No recognitions yet</p>
      <p class="empty-sub">Be the first to recognize a colleague.</p>
    </div>
  </div>
</template>

<style scoped>
.pr-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #EEF0F4;
}

.pr-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.pr-eyebrow {
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: #7A8299;
  font-weight: 600;
  margin-bottom: 6px;
}
.pr-title {
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  letter-spacing: -.02em;
  line-height: 1;
  margin: 0;
  color: #EEF0F4;
}
.pr-sub {
  font-size: 13px;
  color: #7A8299;
  margin-top: 6px;
}

.btn-primary {
  background: #6B5BFF;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background .15s;
}
.btn-primary:hover { background: #5a4ce6; }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

.card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 18px 20px;
}
.card-head { margin-bottom: 14px; }
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #EEF0F4;
  margin: 0;
}

.form-body { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label {
  font-size: 11px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: #7A8299;
  font-weight: 600;
}
.field select,
.field textarea {
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 6px;
  padding: 9px 12px;
  color: #EEF0F4;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.field select:focus,
.field textarea:focus { border-color: #6B5BFF; }
.field textarea { resize: vertical; min-height: 72px; }

.badge-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
@media (min-width: 640px) {
  .badge-grid { grid-template-columns: repeat(6, 1fr); }
}
.badge-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
}
.badge-tile:hover { border-color: #2e3547; }
.badge-tile.active {
  border-color: #6B5BFF;
  background: rgba(107, 91, 255, .08);
}
.badge-emoji { font-size: 22px; }
.badge-label { font-size: 11px; color: #7A8299; }
.badge-tile.active .badge-label { color: #EEF0F4; }

.form-actions { display: flex; justify-content: flex-end; }

.tab-row {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid #232936;
}
.tab {
  background: transparent;
  border: none;
  padding: 10px 14px;
  font-size: 13px;
  color: #7A8299;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color .15s, border-color .15s;
}
.tab:hover { color: #EEF0F4; }
.tab.active {
  color: #6B5BFF;
  border-bottom-color: #6B5BFF;
}

.loading-row {
  padding: 32px;
  text-align: center;
  color: #7A8299;
  font-size: 13px;
}

.kudos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.kudo-card {
  position: relative;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 16px;
  transition: border-color .2s;
}
.kudo-card:hover { border-color: #2e3547; }
.kudo-tag {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(107, 91, 255, .14);
  border: 1px solid rgba(107, 91, 255, .4);
  font-size: 10px;
  color: #B28DFF;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.kudo-people {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.ava {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}
.ava-from { background: linear-gradient(135deg, #4DD39A, #36b97f); }
.ava-to   { background: linear-gradient(135deg, #6B5BFF, #9B6EFF); }
.kudo-arrow { font-size: 13px; color: #7A8299; }
.kudo-emoji { margin-left: auto; font-size: 18px; }
.kudo-line {
  font-size: 11.5px;
  color: #7A8299;
  margin: 0 0 8px;
}
.kudo-name { color: #EEF0F4; font-weight: 500; }
.kudo-msg {
  font-size: 13px;
  color: #EEF0F4;
  line-height: 1.55;
  font-style: italic;
  margin: 0 0 12px;
  border-left: 2px solid #6B5BFF;
  padding-left: 10px;
}
.kudo-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #232936;
  padding-top: 10px;
  margin-top: 4px;
}
.kudo-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #7A8299;
}
.kudo-reactions {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #7A8299;
}

.empty-state {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 56px 24px;
  text-align: center;
}
.empty-title {
  font-family: 'Instrument Serif', serif;
  font-size: 22px;
  color: #EEF0F4;
  margin: 0;
}
.empty-sub {
  font-size: 13px;
  color: #7A8299;
  margin-top: 6px;
}
</style>
