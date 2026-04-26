<script setup lang="ts">
defineOptions({ name: 'CompanyEvents' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

interface CompanyEvent {
  id: number
  title: string
  type: string
  description?: string
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  venue?: string
  meeting_link?: string
  max_capacity?: number
  attendees_count?: number
  rsvp_deadline?: string
  user_rsvp?: string | null
  creator?: { name: string }
  created_at?: string
}

interface Birthday {
  id: number
  name: string
  first_name: string
  last_name?: string
  date_of_birth?: string
  days_until?: number
  avatar?: string
}

interface Milestone {
  id: number
  name: string
  first_name: string
  last_name?: string
  hire_date?: string
  years?: number
  company_name?: string
}

const { hasRole } = useAuth()
const toast = useToast()

const loading = ref(true)
const events = ref<CompanyEvent[]>([])
const birthdays = ref<Birthday[]>([])
const milestones = ref<Milestone[]>([])
const activeTab = ref('all')
const monthFilter = ref(new Date().toISOString().slice(0, 7))
const showCreate = ref(false)
const saving = ref(false)

const isAdmin = computed(() => hasRole('admin') || hasRole('hr_manager'))

const tabs = [
  { val: 'all', label: 'All' },
  { val: 'company', label: 'Company' },
  { val: 'training', label: 'Training' },
  { val: 'holiday', label: 'Holidays' },
]

const form = ref({
  title: '', event_type: 'company', start_date: '', end_date: '', start_time: '', end_time: '',
  venue: '', meeting_link: '', max_capacity: null as number | null,
  rsvp_deadline: '', description: '',
})

const filteredEvents = computed(() => {
  if (activeTab.value === 'all') return events.value
  return events.value.filter(e => e.type === activeTab.value)
})

async function loadEvents() {
  loading.value = true
  try {
    const { data } = await api.get('/events', { params: { month: monthFilter.value } })
    events.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    events.value = []
  } finally {
    loading.value = false
  }
}

async function loadBirthdays() {
  try {
    const { data } = await api.get('/upcoming-birthdays')
    birthdays.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch { birthdays.value = [] }
}

async function loadMilestones() {
  try {
    const { data } = await api.get('/milestones')
    milestones.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch { milestones.value = [] }
}

async function rsvp(eventId: number, status: string) {
  try {
    await api.post(`/events/${eventId}/rsvp`, { status })
    const ev = events.value.find(e => e.id === eventId)
    if (ev) ev.user_rsvp = status
    toast.success('RSVP updated')
  } catch {
    toast.error('Failed to update RSVP')
  }
}

async function createEvent() {
  if (!form.value.title || !form.value.start_date) return
  saving.value = true
  try {
    const payload: Record<string, unknown> = { ...form.value }
    if (!payload.max_capacity) delete payload.max_capacity
    if (!payload.end_date) delete payload.end_date
    if (!payload.rsvp_deadline) delete payload.rsvp_deadline
    await api.post('/events', payload)
    toast.success('Event created')
    showCreate.value = false
    form.value = { title: '', event_type: 'company', start_date: '', end_date: '', start_time: '', end_time: '', venue: '', meeting_link: '', max_capacity: null, rsvp_deadline: '', description: '' }
    await loadEvents()
  } catch {
    toast.error('Failed to create event')
  } finally {
    saving.value = false
  }
}

function typeBand(type: string) {
  const map: Record<string, string> = { company: 'band-accent', holiday: 'band-green', training: 'band-purple', birthday: 'band-yellow' }
  return map[type] ?? 'band-accent'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function personName(p: { first_name: string; last_name?: string; name?: string }) {
  if (p.name) return p.name
  return [p.first_name, p.last_name].filter(Boolean).join(' ')
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

onMounted(() => {
  loadEvents()
  loadBirthdays()
  loadMilestones()
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <p class="page-sub">Company events, celebrations and milestones</p>
      </div>
      <button v-if="isAdmin" class="btn-primary" @click="showCreate = true">+ Create Event</button>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal-box">
        <h3 class="modal-title">Create Event</h3>
        <div class="form-stack">
          <div class="field">
            <label>Title *</label>
            <input v-model="form.title" placeholder="Event title" />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Type</label>
              <select v-model="form.event_type">
                <option value="company">Company</option>
                <option value="training">Training</option>
                <option value="holiday">Holiday</option>
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="field">
              <label>Venue</label>
              <input v-model="form.venue" placeholder="Location or room" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Start Date *</label>
              <input v-model="form.start_date" type="date" />
            </div>
            <div class="field">
              <label>End Date</label>
              <input v-model="form.end_date" type="date" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Start Time</label>
              <input v-model="form.start_time" type="time" />
            </div>
            <div class="field">
              <label>End Time</label>
              <input v-model="form.end_time" type="time" />
            </div>
          </div>
          <div class="field">
            <label>Meeting Link</label>
            <input v-model="form.meeting_link" placeholder="https://..." />
          </div>
          <div class="field-row">
            <div class="field">
              <label>Max Capacity</label>
              <input v-model.number="form.max_capacity" type="number" placeholder="Optional" />
            </div>
            <div class="field">
              <label>RSVP Deadline</label>
              <input v-model="form.rsvp_deadline" type="date" />
            </div>
          </div>
          <div class="field">
            <label>Description</label>
            <textarea v-model="form.description" rows="3" placeholder="Event details..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" @click="showCreate = false">Cancel</button>
          <button class="btn-primary" :disabled="saving" @click="createEvent">{{ saving ? 'Creating...' : 'Create Event' }}</button>
        </div>
      </div>
    </div>

    <!-- Section 1: Upcoming Events -->
    <section class="section">
      <h2 class="section-title">Upcoming Events</h2>
      <div class="controls-row">
        <div class="tab-row">
          <button
            v-for="t in tabs" :key="t.val"
            class="tab" :class="{ active: activeTab === t.val }"
            @click="activeTab = t.val"
          >{{ t.label }}</button>
        </div>
        <input type="month" v-model="monthFilter" class="month-input" @change="loadEvents" />
      </div>

      <div v-if="loading" class="loading-row">Loading events...</div>

      <div v-else-if="filteredEvents.length" class="event-grid">
        <div v-for="ev in filteredEvents" :key="ev.id" class="event-card">
          <div class="ev-band" :class="typeBand(ev.type)"></div>
          <div class="ev-body">
            <div class="ev-top">
              <span class="ev-type-badge" :class="typeBand(ev.type)">{{ ev.type }}</span>
              <span class="ev-date">{{ formatDate(ev.start_date) }}</span>
            </div>
            <h3 class="ev-title">{{ ev.title }}</h3>
            <div v-if="ev.venue || ev.meeting_link" class="ev-location">
              <span v-if="ev.venue">{{ ev.venue }}</span>
              <a v-if="ev.meeting_link" :href="ev.meeting_link" target="_blank" class="ev-link">Join Meeting</a>
            </div>
            <div v-if="ev.max_capacity" class="ev-capacity">
              {{ ev.attendees_count ?? 0 }} / {{ ev.max_capacity }} attending
            </div>
            <div class="ev-rsvp">
              <button
                class="rsvp-btn" :class="{ chosen: ev.user_rsvp === 'attending' }"
                @click="rsvp(ev.id, 'attending')"
              >Attending</button>
              <button
                class="rsvp-btn" :class="{ chosen: ev.user_rsvp === 'maybe' }"
                @click="rsvp(ev.id, 'maybe')"
              >Maybe</button>
              <button
                class="rsvp-btn decline" :class="{ chosen: ev.user_rsvp === 'not_attending' }"
                @click="rsvp(ev.id, 'not_attending')"
              >Not Attending</button>
            </div>
            <div v-if="ev.creator" class="ev-creator">
              <span class="ev-creator-name">{{ ev.creator.name }}</span>
              <span class="ev-creator-date">{{ ev.created_at ? formatDate(ev.created_at) : '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty">No events found for this period.</div>
    </section>

    <!-- Section 2: Celebrations -->
    <section v-if="birthdays.length || milestones.length" class="section">
      <h2 class="section-title">Upcoming Celebrations</h2>
      <div class="celebrations-strip">
        <div v-for="b in birthdays" :key="'b-' + b.id" class="celeb-card celeb-birthday">
          <div class="celeb-avatar">{{ initials(personName(b)) }}</div>
          <div class="celeb-info">
            <div class="celeb-name">{{ personName(b) }}</div>
            <div class="celeb-label">Birthday in {{ b.days_until ?? '?' }} days</div>
          </div>
        </div>
        <div v-for="m in milestones" :key="'m-' + m.id" class="celeb-card celeb-milestone">
          <div class="celeb-avatar milestone-av">{{ initials(personName(m)) }}</div>
          <div class="celeb-info">
            <div class="celeb-name">{{ personName(m) }}</div>
            <div class="celeb-label">{{ m.years ?? '?' }} years at {{ m.company_name ?? 'company' }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }
.page-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }

.section { display: flex; flex-direction: column; gap: 14px; }
.section-title { font-size: 15px; font-weight: 600; color: var(--text); margin: 0; }

.controls-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.tab-row { display: flex; gap: 4px; }
.tab { padding: 7px 14px; border-radius: var(--rs); background: var(--surface); border: 1px solid var(--border); font-size: 12px; font-weight: 500; color: var(--muted); cursor: pointer; font-family: inherit; transition: all .14s; }
.tab:hover { border-color: var(--border-hi); color: var(--text); }
.tab.active { background: rgba(79,126,255,.08); border-color: var(--accent); color: var(--accent); }

.month-input { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 7px 12px; color: var(--text); font-size: 12px; font-family: inherit; outline: none; }
.month-input:focus { border-color: var(--accent); }

.loading-row { padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }

.event-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.event-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); overflow: hidden; transition: border-color .15s; }
.event-card:hover { border-color: var(--border-hi); }

.ev-band { height: 4px; }
.band-accent { background: var(--accent); }
.band-green { background: var(--green); }
.band-purple { background: var(--purple); }
.band-yellow { background: var(--yellow); }

.ev-body { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.ev-top { display: flex; align-items: center; justify-content: space-between; }
.ev-type-badge { font-size: 10px; font-weight: 700; text-transform: capitalize; padding: 2px 8px; border-radius: 10px; }
.ev-type-badge.band-accent { background: rgba(79,126,255,.12); color: var(--accent); }
.ev-type-badge.band-green { background: rgba(54,211,153,.12); color: var(--green); }
.ev-type-badge.band-purple { background: rgba(155,110,255,.12); color: var(--purple); }
.ev-type-badge.band-yellow { background: rgba(249,168,37,.12); color: var(--yellow); }
.ev-date { font-size: 11px; color: var(--muted); }
.ev-title { font-size: 15px; font-weight: 600; color: var(--text); margin: 0; }
.ev-location { font-size: 12px; color: var(--muted); display: flex; gap: 10px; align-items: center; }
.ev-link { color: var(--accent); text-decoration: none; font-weight: 500; }
.ev-link:hover { text-decoration: underline; }
.ev-capacity { font-size: 11px; color: var(--muted); background: var(--surface2); padding: 4px 10px; border-radius: 8px; display: inline-block; }

.ev-rsvp { display: flex; gap: 6px; margin-top: 4px; }
.rsvp-btn { padding: 5px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface2); font-size: 11px; font-weight: 500; color: var(--muted); cursor: pointer; font-family: inherit; transition: all .14s; }
.rsvp-btn:hover { border-color: var(--border-hi); color: var(--text); }
.rsvp-btn.chosen { border-color: var(--green); color: var(--green); background: rgba(54,211,153,.08); }
.rsvp-btn.decline.chosen { border-color: var(--red); color: var(--red); background: rgba(255,107,107,.08); }

.ev-creator { display: flex; gap: 8px; font-size: 10px; color: var(--muted); margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--border); }

.empty { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 40px; text-align: center; color: var(--muted); font-size: 13px; }

/* Celebrations strip */
.celebrations-strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; }
.celeb-card { display: flex; align-items: center; gap: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 12px 16px; min-width: 220px; flex-shrink: 0; }
.celeb-birthday { border-left: 3px solid var(--yellow); }
.celeb-milestone { border-left: 3px solid var(--purple); }
.celeb-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--yellow), #F97316); display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
.milestone-av { background: linear-gradient(135deg, var(--purple), var(--accent)); }
.celeb-name { font-size: 13px; font-weight: 500; color: var(--text); }
.celeb-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-box { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 24px; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 0 0 16px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

.form-stack { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field label { font-size: 11px; color: var(--muted); font-weight: 500; }
.field input, .field select, .field textarea {
  background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs);
  padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit;
  outline: none; transition: border-color .15s; resize: vertical;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--accent); }

.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--rs); padding: 9px 18px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
.btn-primary:hover { background: #3d6ee8; transform: translateY(-1px); }
.btn-primary:disabled { opacity: .5; cursor: default; transform: none; }
.btn-ghost { background: var(--surface2); color: var(--muted); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }
</style>
