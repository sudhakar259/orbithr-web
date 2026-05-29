<script setup lang="ts">
defineOptions({ name: 'AnnouncementsPage' })
import { ref, computed, reactive, onMounted } from 'vue'
import api from '@/services/api'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

interface Announcement {
  id: number | string
  title: string
  body?: string
  content?: string
  type?: string
  category?: string
  author?: string
  author_name?: string
  user_name?: string
  audience?: string
  views?: number
  pinned?: boolean
  is_pinned?: boolean
  created_at?: string
}

const toast      = useToast()
const loading    = ref(false)
const showCreate = ref(false)
const activeTab  = ref('all')

const announcements = ref<Announcement[]>([])

const tabs = [
  { val: 'all',     label: 'All'      },
  { val: 'general', label: 'General'  },
  { val: 'holiday', label: 'Holidays' },
  { val: 'policy',  label: 'Policy'   },
  { val: 'event',   label: 'Events'   },
  { val: 'urgent',  label: 'Urgent'   },
]

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/announcements')
    announcements.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    announcements.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

const typeOf = (a: Announcement) => a.type ?? a.category ?? 'general'
const bodyOf = (a: Announcement) => a.body ?? a.content ?? ''
const authorOf = (a: Announcement) => a.author ?? a.author_name ?? a.user_name ?? 'HR Team'
const pinnedOf = (a: Announcement) => a.pinned ?? a.is_pinned ?? false

const filtered = computed(() => {
  const list = activeTab.value === 'all'
    ? [...announcements.value]
    : announcements.value.filter(a => typeOf(a) === activeTab.value)
  return [...list].sort((a, b) => (pinnedOf(b) ? 1 : 0) - (pinnedOf(a) ? 1 : 0))
})

const countFor = (val: string) =>
  val === 'all' ? announcements.value.length : announcements.value.filter(a => typeOf(a) === val).length

const selectedId = ref<number | string | null>(null)
const selected = computed(() => filtered.value.find(a => a.id === selectedId.value) ?? filtered.value[0] ?? null)

const typeMeta: Record<string, { label: string; tone: string }> = {
  general: { label: 'General', tone: 'accent' },
  holiday: { label: 'Holiday', tone: 'warn' },
  policy:  { label: 'Policy',  tone: 'info' },
  event:   { label: 'Event',   tone: 'purple' },
  urgent:  { label: 'Urgent',  tone: 'err' },
}

const authorInitials = (a: Announcement) => {
  const name = authorOf(a)
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const fmtDate = (d?: string) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  : ''

async function togglePin(ann: Announcement) {
  const newVal = !pinnedOf(ann)
  try {
    await api.patch(`/announcements/${ann.id}`, { pinned: newVal })
    ann.pinned = newVal
    ann.is_pinned = newVal
  } catch {
    ann.pinned = newVal
    ann.is_pinned = newVal
  }
}

async function deleteAnn(id: number | string) {
  if (!await dialog('Delete', 'Delete this announcement?')) return
  try {
    await api.delete(`/announcements/${id}`)
  } catch {
    // silent
  }
  announcements.value = announcements.value.filter(a => a.id !== id)
  if (selectedId.value === id) selectedId.value = null
  toast.success('Announcement deleted.')
}

const na = reactive({ title: '', body: '', type: 'general', audience: 'All Employees', pinned: false })

async function createAnn() {
  if (!na.title || !na.body) return
  try {
    const { data } = await api.post('/announcements', {
      title: na.title, body: na.body, type: na.type,
      audience: na.audience, pinned: na.pinned,
    })
    announcements.value.unshift(data.data ?? data)
  } catch {
    announcements.value.unshift({
      id: Date.now(), title: na.title, body: na.body, type: na.type,
      author: 'You', audience: na.audience, views: 0, pinned: na.pinned,
      created_at: new Date().toISOString(),
    })
  }
  Object.assign(na, { title: '', body: '', type: 'general', audience: 'All Employees', pinned: false })
  showCreate.value = false
  toast.success('✓ Announcement published!')
}
</script>

<template>
  <div class="ann-shell">
    <!-- Filter rail -->
    <aside class="ann-rail">
      <div class="ann-eyebrow">Filters</div>
      <nav class="ann-rail-list">
        <button
          v-for="t in tabs"
          :key="t.val"
          class="ann-rail-item"
          :class="{ active: activeTab === t.val }"
          @click="activeTab = t.val"
        >
          <span class="ann-rail-dot" :class="t.val" />
          <span class="ann-rail-label">{{ t.label }}</span>
          <span class="ann-rail-count">{{ countFor(t.val) }}</span>
        </button>
      </nav>

      <div class="ann-eyebrow ann-eyebrow-spaced">Saved views</div>
      <div class="ann-saved">
        <div class="ann-saved-item"><span class="ann-hash">#</span>Pinned only</div>
        <div class="ann-saved-item"><span class="ann-hash">#</span>This month</div>
        <div class="ann-saved-item"><span class="ann-hash">#</span>HR team</div>
      </div>
    </aside>

    <!-- List column -->
    <section class="ann-list-wrap">
      <header class="ann-list-head">
        <div>
          <h1 class="ann-title">Announcements</h1>
          <p class="ann-subtitle">{{ announcements.length }} items · Company-wide notices and HR updates</p>
        </div>
        <div class="ann-list-actions">
          <button class="ann-btn ann-btn-secondary">Filter</button>
          <button class="ann-btn ann-btn-primary" @click="showCreate = true">+ New</button>
        </div>
      </header>

      <div v-if="loading" class="ann-empty">Loading announcements…</div>

      <transition-group v-else name="ann" tag="div" class="ann-items">
        <button
          v-for="ann in filtered"
          :key="ann.id"
          class="ann-item"
          :class="{ active: selected && selected.id === ann.id }"
          @click="selectedId = ann.id"
        >
          <div class="ann-item-bar" :class="{ unread: pinnedOf(ann) }" />
          <span class="ann-avatar" :data-hue="typeOf(ann)">{{ authorInitials(ann) }}</span>
          <div class="ann-item-body">
            <div class="ann-item-row">
              <span class="ann-badge" :class="`tone-${typeMeta[typeOf(ann)]?.tone ?? 'accent'}`">{{ typeMeta[typeOf(ann)]?.label ?? typeOf(ann) }}</span>
              <span class="ann-item-cat">{{ ann.audience ?? 'All Employees' }}</span>
              <span class="ann-item-dot">·</span>
              <span class="ann-item-author">{{ authorOf(ann) }}</span>
            </div>
            <div class="ann-item-title">{{ ann.title }}</div>
            <div class="ann-item-preview">{{ bodyOf(ann) }}</div>
          </div>
          <div class="ann-item-time">{{ fmtDate(ann.created_at) }}</div>
        </button>
      </transition-group>

      <div v-if="!loading && !filtered.length" class="ann-empty">
        <div class="ann-empty-icon">📢</div>
        <div class="ann-empty-text">No announcements yet</div>
        <div class="ann-empty-sub">Create one to notify your team</div>
      </div>
    </section>

    <!-- Detail column -->
    <aside class="ann-detail">
      <template v-if="selected">
        <div class="ann-detail-head">
          <span class="ann-badge" :class="`tone-${typeMeta[typeOf(selected)]?.tone ?? 'accent'}`">
            {{ typeMeta[typeOf(selected)]?.label ?? typeOf(selected) }}
          </span>
          <span class="ann-detail-id">#{{ String(selected.id).slice(-6) }}</span>
          <div class="ann-spacer" />
          <button class="ann-icon-btn" @click="togglePin(selected)" :title="pinnedOf(selected) ? 'Unpin' : 'Pin'">
            {{ pinnedOf(selected) ? '📌' : '📍' }}
          </button>
          <button class="ann-icon-btn ann-danger" @click="deleteAnn(selected.id)" title="Delete">🗑</button>
        </div>

        <h2 class="ann-detail-title">{{ selected.title }}</h2>

        <div class="ann-author-card">
          <span class="ann-avatar lg">{{ authorInitials(selected) }}</span>
          <div class="ann-author-info">
            <div class="ann-author-name">{{ authorOf(selected) }}</div>
            <div class="ann-author-meta">{{ selected.audience ?? 'All Employees' }} · {{ fmtDate(selected.created_at) }}</div>
          </div>
        </div>

        <div class="ann-detail-section">
          <div class="ann-eyebrow">Message</div>
          <p class="ann-detail-body">{{ bodyOf(selected) }}</p>
        </div>

        <div class="ann-stats">
          <div class="ann-stat">
            <div class="ann-stat-label">Views</div>
            <div class="ann-stat-value">{{ selected.views ?? 0 }}</div>
          </div>
          <div class="ann-stat">
            <div class="ann-stat-label">Audience</div>
            <div class="ann-stat-value">{{ selected.audience ?? 'All' }}</div>
          </div>
          <div class="ann-stat">
            <div class="ann-stat-label">Type</div>
            <div class="ann-stat-value">{{ typeMeta[typeOf(selected)]?.label ?? typeOf(selected) }}</div>
          </div>
          <div class="ann-stat">
            <div class="ann-stat-label">Pinned</div>
            <div class="ann-stat-value">{{ pinnedOf(selected) ? 'Yes' : 'No' }}</div>
          </div>
        </div>

        <div class="ann-actions">
          <button class="ann-btn ann-btn-primary ann-flex">Acknowledge</button>
          <button class="ann-btn ann-btn-secondary">Share</button>
        </div>
      </template>

      <div v-else class="ann-empty">
        <div class="ann-empty-icon">📭</div>
        <div class="ann-empty-text">Select an announcement</div>
      </div>
    </aside>

    <Teleport to="body">
      <Modal v-model="showCreate" title="New Announcement" subtitle="Broadcast a message to your team" max-width="560px">
        <div class="ann-form">
          <div class="ann-field">
            <label>Title *</label>
            <input v-model="na.title" placeholder="e.g. Office Closed on Holi" />
          </div>
          <div class="ann-field-row">
            <div class="ann-field">
              <label>Type</label>
              <select v-model="na.type">
                <option value="general">General</option>
                <option value="holiday">Holiday</option>
                <option value="policy">Policy Update</option>
                <option value="event">Event</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div class="ann-field">
              <label>Audience</label>
              <select v-model="na.audience">
                <option>All Employees</option>
                <option>Engineering</option>
                <option>HR Team</option>
                <option>Management</option>
              </select>
            </div>
          </div>
          <div class="ann-field">
            <label>Message *</label>
            <textarea v-model="na.body" rows="4" placeholder="Write your announcement…"></textarea>
          </div>
          <label class="ann-check">
            <input type="checkbox" v-model="na.pinned" />
            <span>Pin this announcement to the top</span>
          </label>
        </div>
        <template #footer>
          <button class="ann-btn ann-btn-secondary" @click="showCreate = false">Cancel</button>
          <button class="ann-btn ann-btn-primary" @click="createAnn">Publish</button>
        </template>
      </Modal>
    </Teleport>
  </div>
</template>

<style scoped>
.ann-shell {
  display: grid;
  grid-template-columns: 240px 1fr 360px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
  min-height: calc(100vh - 160px);
  color: #EEF0F4;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Rail */
.ann-rail {
  border-right: 1px solid #232936;
  padding: 18px 12px;
  overflow: auto;
}
.ann-eyebrow {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7A8299;
  padding: 0 8px 10px;
}
.ann-eyebrow-spaced { padding-top: 24px; }
.ann-rail-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.ann-rail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: #B6BED0;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.ann-rail-item:hover {
  background: rgba(255, 255, 255, 0.03);
}
.ann-rail-item.active {
  background: rgba(107, 91, 255, 0.12);
  color: #EEF0F4;
  font-weight: 500;
}
.ann-rail-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7A8299;
}
.ann-rail-dot.general { background: #6B5BFF; }
.ann-rail-dot.holiday { background: #F5A623; }
.ann-rail-dot.policy  { background: #4DD39A; }
.ann-rail-dot.event   { background: #9B6EFF; }
.ann-rail-dot.urgent  { background: #F38288; }
.ann-rail-label { flex: 1; }
.ann-rail-count {
  font-size: 11px;
  color: #7A8299;
  font-variant-numeric: tabular-nums;
}
.ann-rail-item.active .ann-rail-count { color: #6B5BFF; }
.ann-saved {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.ann-saved-item {
  padding: 6px 10px;
  font-size: 12.5px;
  color: #B6BED0;
  border-radius: 6px;
  cursor: pointer;
}
.ann-saved-item:hover { background: rgba(255, 255, 255, 0.03); }
.ann-hash { color: #7A8299; margin-right: 6px; }

/* List */
.ann-list-wrap {
  border-right: 1px solid #232936;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.ann-list-head {
  padding: 16px 20px;
  border-bottom: 1px solid #232936;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ann-title {
  font-family: 'Instrument Serif', serif;
  font-size: 26px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin: 0;
}
.ann-subtitle {
  font-size: 11.5px;
  color: #7A8299;
  margin: 3px 0 0;
}
.ann-list-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.ann-items {
  display: block;
}
.ann-item {
  display: grid;
  grid-template-columns: 4px 28px 1fr auto;
  gap: 10px;
  padding: 14px 18px;
  border: none;
  border-bottom: 1px solid #1C2030;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  width: 100%;
  text-align: left;
  align-items: start;
}
.ann-item:hover { background: rgba(255, 255, 255, 0.02); }
.ann-item.active { background: rgba(107, 91, 255, 0.08); }
.ann-item-bar {
  width: 3px;
  height: 100%;
  border-radius: 2px;
  background: transparent;
  align-self: stretch;
}
.ann-item-bar.unread { background: #6B5BFF; }

.ann-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6B5BFF, #9B6EFF);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
.ann-avatar[data-hue="holiday"] { background: linear-gradient(135deg, #F5A623, #F38288); }
.ann-avatar[data-hue="policy"]  { background: linear-gradient(135deg, #4DD39A, #6B5BFF); }
.ann-avatar[data-hue="event"]   { background: linear-gradient(135deg, #9B6EFF, #6B5BFF); }
.ann-avatar[data-hue="urgent"]  { background: linear-gradient(135deg, #F38288, #6B5BFF); }
.ann-avatar.lg { width: 36px; height: 36px; font-size: 13px; }

.ann-item-body {
  min-width: 0;
}
.ann-item-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}
.ann-item-cat {
  font-size: 11.5px;
  color: #B6BED0;
  font-weight: 500;
}
.ann-item-dot, .ann-item-author {
  font-size: 11px;
  color: #7A8299;
}
.ann-item-title {
  font-size: 12.5px;
  font-weight: 500;
  color: #EEF0F4;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ann-item-preview {
  font-size: 11.5px;
  color: #7A8299;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ann-item-time {
  font-size: 10.5px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}

/* Badges */
.ann-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tone-accent { background: rgba(107, 91, 255, 0.18); color: #6B5BFF; }
.tone-warn   { background: rgba(245, 166, 35, 0.18); color: #F5A623; }
.tone-info   { background: rgba(77, 211, 154, 0.16); color: #4DD39A; }
.tone-purple { background: rgba(155, 110, 255, 0.18); color: #9B6EFF; }
.tone-err    { background: rgba(243, 130, 136, 0.18); color: #F38288; }

/* Detail */
.ann-detail {
  padding: 22px 22px;
  overflow: auto;
}
.ann-detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.ann-detail-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #7A8299;
}
.ann-spacer { flex: 1; }
.ann-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #232936;
  background: #1C2030;
  color: #B6BED0;
  cursor: pointer;
  font-size: 13px;
}
.ann-icon-btn:hover { border-color: #3a4258; }
.ann-icon-btn.ann-danger:hover { border-color: #F38288; color: #F38288; }

.ann-detail-title {
  font-family: 'Instrument Serif', serif;
  font-size: 26px;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: #EEF0F4;
  margin: 0;
}

.ann-author-card {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 12px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 8px;
}
.ann-author-info { flex: 1; }
.ann-author-name {
  font-size: 12.5px;
  font-weight: 500;
  color: #EEF0F4;
}
.ann-author-meta {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}

.ann-detail-section { margin-top: 18px; }
.ann-detail-body {
  font-size: 13px;
  color: #D8DCE6;
  line-height: 1.6;
  margin: 6px 0 0;
  white-space: pre-wrap;
}

.ann-stats {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.ann-stat {
  padding: 10px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 6px;
}
.ann-stat-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7A8299;
}
.ann-stat-value {
  font-size: 13px;
  color: #EEF0F4;
  margin-top: 3px;
  font-weight: 500;
}

.ann-actions {
  display: flex;
  gap: 8px;
  margin-top: 22px;
}
.ann-flex { flex: 1; justify-content: center; }

/* Buttons */
.ann-btn {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.ann-btn-primary { background: #6B5BFF; color: #fff; }
.ann-btn-primary:hover { background: #5a4ce8; }
.ann-btn-secondary { background: #1C2030; color: #EEF0F4; border-color: #232936; }
.ann-btn-secondary:hover { border-color: #3a4258; }

/* Empty */
.ann-empty {
  padding: 40px 20px;
  text-align: center;
  color: #7A8299;
  font-size: 13px;
}
.ann-empty-icon { font-size: 30px; margin-bottom: 8px; }
.ann-empty-text { color: #B6BED0; font-size: 14px; font-weight: 500; }
.ann-empty-sub { color: #7A8299; font-size: 12px; margin-top: 4px; }

/* Form */
.ann-form { display: flex; flex-direction: column; gap: 14px; }
.ann-field { display: flex; flex-direction: column; gap: 5px; }
.ann-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ann-field label {
  font-size: 11px;
  color: #7A8299;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ann-field input,
.ann-field select,
.ann-field textarea {
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 6px;
  padding: 9px 12px;
  color: #EEF0F4;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: vertical;
}
.ann-field input:focus,
.ann-field select:focus,
.ann-field textarea:focus { border-color: #6B5BFF; }
.ann-check {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #B6BED0;
}
.ann-check input { accent-color: #6B5BFF; width: 14px; height: 14px; }

.ann-enter-active, .ann-leave-active { transition: all 0.25s ease; }
.ann-enter-from, .ann-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 1100px) {
  .ann-shell { grid-template-columns: 1fr; min-height: auto; }
  .ann-rail { border-right: none; border-bottom: 1px solid #232936; }
  .ann-list-wrap { border-right: none; border-bottom: 1px solid #232936; }
}
</style>
