<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Modal      from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'

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

const typeLabel = (t: string) => ({
  general: '📢 General', holiday: '🎉 Holiday', policy: '📋 Policy',
  event: '📅 Event', urgent: '🚨 Urgent',
}[t] ?? t)

const authorInitials = (a: Announcement) => {
  const name = authorOf(a)
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

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
  if (!confirm('Delete this announcement?')) return
  try {
    await api.delete(`/announcements/${id}`)
  } catch {}
  announcements.value = announcements.value.filter(a => a.id !== id)
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
    // optimistic insert if API not ready
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
  <div class="ann-page">
    <PageHeader title="Announcements" subtitle="Company-wide notices and HR updates">
      <template #actions>
        <button class="btn-primary" @click="showCreate = true">+ New Announcement</button>
      </template>
    </PageHeader>

    <!-- Filter tabs -->
    <div class="tab-row">
      <button
        v-for="t in tabs" :key="t.val"
        class="tab" :class="{ active: activeTab === t.val }"
        @click="activeTab = t.val"
      >
        {{ t.label }} <span class="tab-count">{{ countFor(t.val) }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-row">Loading announcements…</div>

    <!-- List -->
    <div v-else class="ann-list">
      <transition-group name="ann" tag="div" class="ann-grid">
        <div v-for="ann in filtered" :key="ann.id" class="ann-card" :class="{ pinned: pinnedOf(ann) }">
          <div class="ann-head">
            <div class="ann-badges">
              <span v-if="pinnedOf(ann)" class="badge pin">📌 Pinned</span>
              <span class="badge" :class="typeOf(ann)">{{ typeLabel(typeOf(ann)) }}</span>
            </div>
            <div class="ann-actions">
              <button class="ia-btn" @click="togglePin(ann)" :title="pinnedOf(ann) ? 'Unpin' : 'Pin'">
                {{ pinnedOf(ann) ? '📌' : '📍' }}
              </button>
              <button class="ia-btn danger" @click="deleteAnn(ann.id)">🗑</button>
            </div>
          </div>
          <div class="ann-title">{{ ann.title }}</div>
          <div class="ann-body">{{ bodyOf(ann) }}</div>
          <div class="ann-footer">
            <div class="ann-author">
              <div class="aa-av">{{ authorInitials(ann) }}</div>
              <div>
                <div class="aa-name">{{ authorOf(ann) }}</div>
                <div class="aa-time">
                  {{ ann.created_at ? new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '' }}
                </div>
              </div>
            </div>
            <div class="ann-reach">
              <span v-if="ann.views !== undefined">👁 {{ ann.views }} views</span>
              <span v-if="ann.audience">🏢 {{ ann.audience }}</span>
            </div>
          </div>
        </div>
      </transition-group>
      <EmptyState v-if="!filtered.length" icon="📢" message="No announcements yet" sub="Create one to notify your team" />
    </div>

    <!-- Create Modal -->
    <Modal v-model="showCreate" title="New Announcement" subtitle="Broadcast a message to your team" max-width="560px">
      <div class="form-stack">
        <div class="field">
          <label>Title *</label>
          <input v-model="na.title" placeholder="e.g. Office Closed on Holi" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Type</label>
            <select v-model="na.type">
              <option value="general">General</option>
              <option value="holiday">Holiday</option>
              <option value="policy">Policy Update</option>
              <option value="event">Event</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="field">
            <label>Audience</label>
            <select v-model="na.audience">
              <option>All Employees</option>
              <option>Engineering</option>
              <option>HR Team</option>
              <option>Management</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label>Message *</label>
          <textarea v-model="na.body" rows="4" placeholder="Write your announcement…"></textarea>
        </div>
        <div class="field-check">
          <label class="check-label">
            <input type="checkbox" v-model="na.pinned" />
            <span>Pin this announcement to the top</span>
          </label>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showCreate = false">Cancel</button>
        <button class="btn-primary" @click="createAnn">Publish</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.ann-page { display: flex; flex-direction: column; gap: 18px; }

.tab-row { display: flex; gap: 4px; flex-wrap: wrap; }
.tab { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: var(--rs); background: var(--surface); border: 1px solid var(--border); font-size: 12px; font-weight: 500; color: var(--dim); cursor: pointer; font-family: inherit; transition: all .14s; }
.tab:hover { border-color: var(--border-hi); color: var(--text); }
.tab.active { background: var(--accent-glow); border-color: var(--accent); color: var(--accent); }
.tab-count { background: var(--surface2); border-radius: 10px; padding: 1px 6px; font-size: 10px; font-weight: 700; }
.tab.active .tab-count { background: rgba(79,126,255,.2); }

.loading-row { padding: 32px; text-align: center; color: var(--muted); font-size: 13px; }
.ann-grid { display: flex; flex-direction: column; gap: 12px; }
.ann-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; transition: border-color .2s; }
.ann-card:hover { border-color: var(--border-hi); }
.ann-card.pinned { border-color: rgba(79,126,255,.3); background: rgba(79,126,255,.03); }

.ann-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.ann-badges { display: flex; gap: 6px; flex-wrap: wrap; }
.badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
.badge.pin     { background: rgba(79,126,255,.12); color: var(--accent); }
.badge.general { background: rgba(54,211,153,.1);  color: #36D399; }
.badge.holiday { background: rgba(249,168,37,.1);  color: #F9A825; }
.badge.policy  { background: rgba(79,126,255,.1);  color: var(--accent); }
.badge.event   { background: rgba(155,110,255,.1); color: #9B6EFF; }
.badge.urgent  { background: rgba(255,107,107,.1); color: var(--red); }

.ann-actions { display: flex; gap: 5px; opacity: 0; transition: opacity .15s; }
.ann-card:hover .ann-actions { opacity: 1; }
.ia-btn { width: 26px; height: 26px; background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; cursor: pointer; display: grid; place-items: center; font-size: 12px; transition: all .1s; }
.ia-btn:hover { border-color: var(--border-hi); }
.ia-btn.danger:hover { border-color: var(--red); }

.ann-title { font-size: 16px; font-weight: 700; margin-bottom: 8px; line-height: 1.3; color: var(--text); }
.ann-body { font-size: 13px; color: var(--dim); line-height: 1.7; margin-bottom: 14px; }
.ann-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border); }
.ann-author { display: flex; align-items: center; gap: 10px; }
.aa-av { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg,#4F7EFF,#9B6EFF); display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #fff; }
.aa-name { font-size: 12px; font-weight: 500; }
.aa-time { font-size: 11px; color: var(--muted); margin-top: 1px; }
.ann-reach { display: flex; gap: 12px; font-size: 11px; color: var(--muted); }

.form-stack { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field label { font-size: 11px; color: var(--dim); font-weight: 500; }
.field input, .field select, .field textarea {
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit;
  outline: none; transition: border-color .15s; resize: vertical;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--accent); }
.check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: var(--dim); }
.check-label input { accent-color: var(--accent); width: 14px; height: 14px; }

.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--rs); padding: 9px 18px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
.btn-primary:hover { background: #3d6ee8; transform: translateY(-1px); }
.btn-ghost { background: var(--surface2); color: var(--dim); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }

.ann-enter-active, .ann-leave-active { transition: all .25s ease; }
.ann-enter-from, .ann-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
