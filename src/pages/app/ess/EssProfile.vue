<script setup lang="ts">
defineOptions({ name: 'EssProfile' })
import { ref, computed, onMounted } from 'vue'
import { essService, type EssProfile } from '@/services/essService'
import { attendanceService } from '@/services/attendance'
import api from '@/services/api'
import EmpAvatar from '@/components/employee/EmpAvatar.vue'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'

const { setBreadcrumbs } = useBreadcrumbs()

// ── Profile ───────────────────────────────────────────────────────────────────
const loading  = ref(true)
const saving   = ref(false)
const editing  = ref(false)
const errMsg   = ref('')
const success  = ref('')
const profile  = ref<EssProfile | null>(null)
const form     = ref({ name: '', phone: '', address: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '' })

async function loadProfile() {
  loading.value = true
  try {
    const res = await essService.getProfile()
    profile.value = res.data?.data ?? null
    if (profile.value) {
      form.value = {
        name: profile.value.name,
        phone: profile.value.phone ?? '',
        address: profile.value.address ?? '',
        emergency_contact_name: profile.value.emergency_contact_name ?? '',
        emergency_contact_phone: profile.value.emergency_contact_phone ?? '',
        emergency_contact_relationship: profile.value.emergency_contact_relationship ?? '',
      }
      setBreadcrumbs([{ label: 'My Profile' }])
    }
  } catch {
    errMsg.value = 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  errMsg.value = ''
  try {
    const res = await essService.updateProfile(form.value)
    profile.value = res.data?.data ?? profile.value
    editing.value = false
    success.value = 'Profile updated!'
    setTimeout(() => (success.value = ''), 3000)
  } catch {
    errMsg.value = 'Failed to save changes'
  } finally {
    saving.value = false
  }
}

// ── Today's attendance ────────────────────────────────────────────────────────
const todayRec = ref<Awaited<ReturnType<typeof attendanceService.getTodayAttendance>>>(null)
async function loadToday() {
  try { todayRec.value = await attendanceService.getTodayAttendance() }
  catch { todayRec.value = null }
}

// ── Announcements feed ────────────────────────────────────────────────────────
interface Announcement { id: number; title: string; body: string; type?: string; is_pinned: boolean; views?: number; published_at?: string; user?: { name: string } }
const announcements = ref<Announcement[]>([])
const annLoading    = ref(false)
async function loadAnnouncements() {
  annLoading.value = true
  try {
    const res = await api.get('/announcements', { params: { per_page: 8, sort: 'latest' } })
    const raw = res.data?.data ?? res.data ?? []
    announcements.value = Array.isArray(raw) ? raw : []
  } catch { announcements.value = [] }
  finally { annLoading.value = false }
}

// ── Leave balances ────────────────────────────────────────────────────────────
interface LeaveBalance { leave_type_id: number; leave_type_name?: string; current_balance: number }
const leaveBalances = ref<LeaveBalance[]>([])
async function loadLeaveBalances() {
  try {
    const res = await api.get('/leave/my-balances')
    const raw = res.data?.data ?? res.data ?? []
    leaveBalances.value = Array.isArray(raw) ? raw : []
  } catch { leaveBalances.value = [] }
}

// ── Attendance summary ────────────────────────────────────────────────────────
const attSummary = ref({ present_days: 0, late_days: 0, absent_days: 0 })
async function loadAttSummary() {
  try {
    const now = new Date()
    const s = await attendanceService.getAttendanceSummary({ year: now.getFullYear(), month: now.getMonth() + 1 })
    attSummary.value = { present_days: s.present_days, late_days: s.late_days, absent_days: s.absent_days }
  } catch { /* silent */ }
}

// ── Computed helpers ──────────────────────────────────────────────────────────
const initials = (name: string) =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

const tenure = computed(() => {
  const hd = profile.value?.employee?.hire_date
  if (!hd) return null
  const ms   = Date.now() - new Date(hd).getTime()
  const years  = Math.floor(ms / (365.25 * 24 * 3600 * 1000))
  const months = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000))
  if (years > 0) return `${years}y ${months}m`
  return `${months} month${months !== 1 ? 's' : ''}`
})

const punchedIn = computed(() => {
  const logs = todayRec.value?.punch_logs
  if (!logs?.length) return false
  return logs[logs.length - 1].type === 'check_in'
})

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const workingDays = computed<string[]>(() => {
  const wd = profile.value?.employee?.working_days
  if (Array.isArray(wd) && wd.length) return wd as string[]
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
})

function isDayOn(d: string) {
  return workingDays.value.some(w => w.toLowerCase().startsWith(d.toLowerCase().slice(0, 3)))
}

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const formatAgo = (d?: string | null) => {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days > 0)  return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0)  return `${mins}m ago`
  return 'just now'
}

const formatTime = (t?: string | null) => {
  if (!t) return '—'
  const ts = t.includes('T') ? t : `1970-01-01T${t}`
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const annTypeColor: Record<string, string> = {
  general: 'tag-blue', urgent: 'tag-red', event: 'tag-purple', hr: 'tag-green',
}

const DEPT_COLORS: Record<string, string> = {
  engineering: '#6B5BFF', design: '#E8A63C', hr: '#2FB872', people: '#2FB872',
  finance: '#4CC2FF', sales: '#F07A7A', ops: '#B28DFF', operations: '#B28DFF', gtm: '#FF8A65',
}

const deptColor = computed(() => {
  const key = (profile.value?.employee?.department || '').toLowerCase().replace(/\s+/g, '')
  return DEPT_COLORS[key] || '#6B5BFF'
})

const statusColor = computed(() => {
  const s = profile.value?.employee?.status
  if (s === 'Active') return '#2FB872'
  if (s === 'On Leave') return '#E8A63C'
  return '#7A8299'
})

// ── Image upload ──────────────────────────────────────────────────────────────
const avatarInput = ref<HTMLInputElement | null>(null)
const bannerInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)
const uploadingBanner = ref(false)

async function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingAvatar.value = true
  try {
    const res = await essService.uploadAvatar(file)
    if (profile.value) profile.value.avatar_url = res.data.avatar_url
    success.value = 'Avatar updated!'
    setTimeout(() => (success.value = ''), 3000)
  } catch { errMsg.value = 'Failed to upload avatar' }
  finally { uploadingAvatar.value = false }
}

async function onBannerChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingBanner.value = true
  try {
    const res = await essService.uploadBanner(file)
    if (profile.value) profile.value.banner_url = res.data.banner_url
    success.value = 'Banner updated!'
    setTimeout(() => (success.value = ''), 3000)
  } catch { errMsg.value = 'Failed to upload banner' }
  finally { uploadingBanner.value = false }
}

onMounted(() => {
  loadProfile()
  loadToday()
  loadAnnouncements()
  loadLeaveBalances()
  loadAttSummary()
})
</script>

<template>
  <div class="ess-wrap">

    <!-- ── Skeleton ──────────────────────────────────────────────────────────── -->
    <template v-if="loading">
      <div class="ess-skel-hero"/>
      <div class="ess-skel-bar"/>
      <div style="display:grid;grid-template-columns:1fr 300px;gap:16px;margin-top:4px">
        <div class="ess-skel-block" style="height:300px"/>
        <div class="ess-skel-block" style="height:300px"/>
      </div>
    </template>

    <template v-else-if="profile">

      <!-- ── Hero banner ────────────────────────────────────────────────────── -->
      <div
        class="ess-hero"
        :class="profile.banner_url ? 'ess-hero--photo' : 'ess-hero--gradient'"
        :style="profile.banner_url ? { backgroundImage: `url('${profile.banner_url}')` } : {}"
      >
        <div class="ess-hero-overlay"/>
        <!-- banner upload (top-right, on hover) -->
        <button class="ess-banner-btn" @click.stop="bannerInput?.click()">
          <div v-if="uploadingBanner" class="ess-spin"/>
          <svg v-else width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
          </svg>
          {{ uploadingBanner ? 'Uploading…' : 'Change banner' }}
          <input ref="bannerInput" type="file" accept="image/*" class="ess-file-hidden" @change="onBannerChange"/>
        </button>

        <!-- hero content at bottom -->
        <div class="ess-hero-content">
          <div class="ess-av-wrap" @click="avatarInput?.click()">
            <EmpAvatar :name="profile.name" :size="80" :src="profile.avatar_url || undefined"/>
            <div class="ess-av-overlay">
              <div v-if="uploadingAvatar" class="ess-spin ess-spin--sm"/>
              <svg v-else width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/>
              </svg>
            </div>
            <input ref="avatarInput" type="file" accept="image/*" class="ess-file-hidden" @change="onAvatarChange"/>
          </div>

          <div class="ess-hero-info">
            <div class="ess-hero-row1">
              <h1 class="ess-name">{{ profile.name }}</h1>
              <span
                v-if="profile.employee?.status"
                class="ess-badge"
                :style="{ background: statusColor + '22', color: statusColor }"
              >{{ profile.employee.status }}</span>
              <span
                v-if="profile.employee?.department"
                class="ess-badge"
                :style="{ background: deptColor + '22', color: deptColor }"
              >{{ profile.employee.department }}</span>
            </div>
            <p class="ess-hero-role">
              <span v-if="profile.employee?.designation">{{ profile.employee.designation }}</span>
              <span v-if="profile.employee?.designation && profile.employee?.department" class="ess-sep"> · </span>
              <span v-if="profile.employee?.department && !profile.employee?.designation">{{ profile.employee.department }}</span>
            </p>
            <div class="ess-hero-meta">
              <span v-if="profile.employee?.employee_id" class="ess-chip">
                {{ profile.employee.employee_id }}
              </span>
              <span v-if="profile.employee?.hire_date" class="ess-chip">
                Joined {{ formatDate(profile.employee.hire_date) }}
              </span>
              <span v-if="tenure" class="ess-chip ess-chip--accent">{{ tenure }}</span>
              <span class="ess-chip" :class="punchedIn ? 'ess-chip--green' : 'ess-chip--muted'">
                <span class="ess-dot" :class="punchedIn ? 'ess-dot--green' : ''"/>
                {{ punchedIn ? 'Currently working' : 'Not punched in' }}
              </span>
            </div>
          </div>

          <button class="ess-edit-hero-btn" @click="editing = !editing">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
            </svg>
            {{ editing ? 'Cancel' : 'Edit profile' }}
          </button>
        </div>
      </div>

      <!-- ── Stats bar ──────────────────────────────────────────────────────── -->
      <div class="ess-stats-bar">
        <div class="ess-stat">
          <span class="ess-stat-n" style="color:#2FB872">{{ attSummary.present_days }}</span>
          <span class="ess-stat-l">Present this month</span>
        </div>
        <div class="ess-stat-div"/>
        <div class="ess-stat">
          <span class="ess-stat-n" style="color:#E8A63C">{{ attSummary.late_days }}</span>
          <span class="ess-stat-l">Late arrivals</span>
        </div>
        <div class="ess-stat-div"/>
        <div class="ess-stat">
          <span class="ess-stat-n" style="color:#E5484D">{{ attSummary.absent_days }}</span>
          <span class="ess-stat-l">Absent days</span>
        </div>
        <div class="ess-stat-div"/>
        <div class="ess-stat">
          <span class="ess-stat-n" style="color:#8979FF">{{ leaveBalances.reduce((s, b) => s + (b.current_balance || 0), 0) }}</span>
          <span class="ess-stat-l">Leave balance</span>
        </div>
        <div class="ess-stat-div"/>
        <div class="ess-stat">
          <span class="ess-stat-n">{{ todayRec ? formatTime(todayRec.check_in) : '—' }}</span>
          <span class="ess-stat-l">Today check-in</span>
        </div>
        <div class="ess-stat-div"/>
        <div class="ess-stat">
          <span class="ess-stat-n">{{ todayRec ? formatTime(todayRec.check_out) : '—' }}</span>
          <span class="ess-stat-l">Today check-out</span>
        </div>
      </div>

      <!-- ── Flash messages ─────────────────────────────────────────────────── -->
      <div v-if="success" class="ess-flash ess-flash--ok">{{ success }}</div>
      <div v-if="errMsg"  class="ess-flash ess-flash--err">{{ errMsg }}</div>

      <!-- ── Edit form ──────────────────────────────────────────────────────── -->
      <div v-if="editing" class="ess-edit-panel">
        <div class="ess-card-head">Edit Profile</div>
        <div class="ess-edit-grid">
          <div class="ess-field">
            <label class="ess-label">Full Name</label>
            <input v-model="form.name" type="text" class="ess-input" placeholder="Your full name"/>
          </div>
          <div class="ess-field">
            <label class="ess-label">Phone</label>
            <input v-model="form.phone" type="tel" class="ess-input" placeholder="+91 XXXXX XXXXX"/>
          </div>
          <div class="ess-field ess-field--full">
            <label class="ess-label">Address</label>
            <input v-model="form.address" type="text" class="ess-input" placeholder="Your address"/>
          </div>
          <div class="ess-field">
            <label class="ess-label">Emergency Contact Name</label>
            <input v-model="form.emergency_contact_name" type="text" class="ess-input"/>
          </div>
          <div class="ess-field">
            <label class="ess-label">Emergency Contact Phone</label>
            <input v-model="form.emergency_contact_phone" type="tel" class="ess-input"/>
          </div>
          <div class="ess-field">
            <label class="ess-label">Relationship</label>
            <input v-model="form.emergency_contact_relationship" type="text" class="ess-input" placeholder="e.g. Spouse, Parent"/>
          </div>
        </div>
        <div class="ess-edit-actions">
          <button class="ess-btn-save" :disabled="saving" @click="save">
            <div v-if="saving" class="ess-spin"/>
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
          <button class="ess-btn-discard" @click="editing = false">Discard</button>
        </div>
      </div>

      <!-- ── 2-col body ─────────────────────────────────────────────────────── -->
      <div class="ess-body">

        <!-- LEFT: Activity + Announcements -->
        <div class="ess-col-main">

          <!-- Today's activity -->
          <div class="ess-card">
            <div class="ess-card-head">Today's Activity</div>
            <div v-if="todayRec" class="ess-today-row">
              <div class="ess-today-item">
                <span class="ess-today-label">Check In</span>
                <span class="ess-today-val" style="color:#2FB872">{{ formatTime(todayRec.check_in) }}</span>
              </div>
              <div class="ess-today-sep"/>
              <div class="ess-today-item">
                <span class="ess-today-label">Check Out</span>
                <span class="ess-today-val">{{ formatTime(todayRec.check_out) }}</span>
              </div>
              <div class="ess-today-sep"/>
              <div class="ess-today-item">
                <span class="ess-today-label">Hours</span>
                <span class="ess-today-val" style="color:#8979FF">{{ todayRec.working_hours ? todayRec.working_hours + 'h' : '—' }}</span>
              </div>
              <div class="ess-today-sep"/>
              <div class="ess-today-item">
                <span class="ess-today-label">Status</span>
                <span
                  class="ess-today-val"
                  :style="{ color: todayRec.status === 'present' ? '#2FB872' : todayRec.status === 'late' ? '#E8A63C' : '#EEF0F4' }"
                >{{ todayRec.status ?? '—' }}</span>
              </div>
            </div>
            <p v-else class="ess-empty-sm">No attendance record for today yet.</p>
          </div>

          <!-- Announcements -->
          <div class="ess-section-label">Company Announcements</div>
          <div v-if="annLoading" class="ess-loading-row">
            <div class="ess-spin"/>
            Loading…
          </div>
          <div v-else-if="announcements.length === 0" class="ess-empty">No announcements yet.</div>
          <div v-else class="ess-ann-list">
            <div v-for="ann in announcements" :key="ann.id" class="ess-card ess-ann-card">
              <div class="ess-ann-head">
                <div class="ess-ann-av">{{ ann.user?.name ? initials(ann.user.name) : 'HR' }}</div>
                <div class="ess-ann-meta">
                  <span class="ess-ann-author">{{ ann.user?.name ?? 'HR Team' }}</span>
                  <span class="ess-ann-time">{{ formatAgo(ann.published_at) }}</span>
                </div>
                <span v-if="ann.is_pinned" class="ess-pin-badge">Pinned</span>
                <span v-if="ann.type" :class="['ess-type-tag', annTypeColor[ann.type] ?? 'tag-blue']">{{ ann.type }}</span>
              </div>
              <h4 class="ess-ann-title">{{ ann.title }}</h4>
              <p class="ess-ann-body">{{ ann.body }}</p>
              <div v-if="ann.views" class="ess-ann-footer">
                <span class="ess-ann-views">{{ ann.views }} views</span>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Sidebar -->
        <div class="ess-col-side">

          <!-- About -->
          <div class="ess-card">
            <div class="ess-card-head">About</div>
            <div class="ess-about-list">
              <div v-if="profile.email" class="ess-about-row">
                <svg class="ess-about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                <span>{{ profile.email }}</span>
              </div>
              <div v-if="profile.phone" class="ess-about-row">
                <svg class="ess-about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                <span>{{ profile.phone }}</span>
              </div>
              <div v-if="profile.address" class="ess-about-row">
                <svg class="ess-about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                <span>{{ profile.address }}</span>
              </div>
              <div v-if="profile.employee?.gender" class="ess-about-row">
                <svg class="ess-about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
                <span style="text-transform:capitalize">{{ profile.employee.gender }}</span>
              </div>
              <div v-if="profile.employee?.date_of_birth" class="ess-about-row">
                <svg class="ess-about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
                <span>{{ formatDate(profile.employee.date_of_birth) }}</span>
              </div>
              <div v-if="profile.employee?.employment_type" class="ess-about-row">
                <svg class="ess-about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                <span style="text-transform:capitalize">{{ profile.employee.employment_type.replace('_', ' ') }}</span>
              </div>
              <div v-if="profile.employee?.role" class="ess-about-row">
                <svg class="ess-about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                <span style="text-transform:capitalize">{{ profile.employee.role }}</span>
              </div>
              <div v-if="profile.employee?.team" class="ess-about-row">
                <svg class="ess-about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                <span>{{ profile.employee.team }}</span>
              </div>
              <div v-if="profile.employee?.location" class="ess-about-row">
                <svg class="ess-about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                <span>{{ profile.employee.location }}</span>
              </div>
            </div>

            <!-- Emergency contact -->
            <div v-if="profile.emergency_contact_name" class="ess-emg-block">
              <div class="ess-emg-label">Emergency Contact</div>
              <div class="ess-emg-name">{{ profile.emergency_contact_name }}</div>
              <div v-if="profile.emergency_contact_phone" class="ess-emg-sub">{{ profile.emergency_contact_phone }}</div>
              <div v-if="profile.emergency_contact_relationship" class="ess-emg-sub">{{ profile.emergency_contact_relationship }}</div>
            </div>
          </div>

          <!-- Working schedule -->
          <div class="ess-card">
            <div class="ess-card-head">Work Schedule</div>
            <div class="ess-days-row">
              <div
                v-for="d in ALL_DAYS" :key="d"
                :class="['ess-day-chip', isDayOn(d) ? 'ess-day-chip--on' : '']"
              >{{ d.slice(0, 1) }}</div>
            </div>
            <p class="ess-days-label">{{ workingDays.length }} days / week</p>
          </div>

          <!-- Leave balances -->
          <div v-if="leaveBalances.length" class="ess-card">
            <div class="ess-card-head">Leave Balances</div>
            <div class="ess-bal-list">
              <div v-for="b in leaveBalances" :key="b.leave_type_id" class="ess-bal-row">
                <span class="ess-bal-name">{{ b.leave_type_name ?? 'Leave' }}</span>
                <span class="ess-bal-num">
                  {{ b.current_balance }}
                  <span class="ess-bal-unit">days</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </template>

    <div v-else class="ess-empty">Could not load profile. Please refresh.</div>
  </div>
</template>

<style scoped>
/* ── Tokens ── */
/* ink: 900=#0B0D12 800=#161A23 750=#1C212C 700=#232936 500=#3A4254 300=#7A8299 200=#A8AEC0 50=#EEF0F4 0=#FAFBFC */
/* accent: 500=#6B5BFF 400=#8979FF */

.ess-wrap { display: flex; flex-direction: column; gap: 12px; color: #EEF0F4; }

/* ── Skeleton ── */
.ess-skel-hero  { height: 220px; background: #161A23; border-radius: 12px; animation: ess-pulse 1.4s infinite; }
.ess-skel-bar   { height: 64px;  background: #161A23; border-radius: 12px; animation: ess-pulse 1.4s infinite; }
.ess-skel-block { background: #161A23; border-radius: 12px; animation: ess-pulse 1.4s infinite; }
@keyframes ess-pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }

/* ── Hero banner ── */
.ess-hero {
  border-radius: 12px; overflow: hidden;
  min-height: 220px; position: relative;
  display: flex; flex-direction: column; justify-content: flex-end;
  background-size: cover; background-position: center;
}
.ess-hero--gradient {
  background-image: linear-gradient(115deg, #2A1B5C 0%, #6B5BFF 60%, #F5C16E 130%);
}
.ess-hero--photo { background-color: #161A23; }

.ess-hero-overlay {
  position: absolute; inset: 0; pointer-events: none;
}
.ess-hero--gradient .ess-hero-overlay {
  background: repeating-linear-gradient(45deg, transparent 0 12px, rgba(0,0,0,.07) 12px 14px);
}
.ess-hero--photo .ess-hero-overlay {
  background: linear-gradient(to bottom, rgba(0,0,0,.15) 0%, rgba(11,13,18,.75) 100%);
}

/* Banner upload button */
.ess-banner-btn {
  position: absolute; top: 12px; right: 12px; z-index: 10;
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 500;
  background: rgba(0,0,0,.55); color: #fff;
  border: 1px solid rgba(255,255,255,.18); cursor: pointer;
  opacity: 0; transition: opacity .2s;
}
.ess-hero:hover .ess-banner-btn { opacity: 1; }

/* Hero content (bottom row) */
.ess-hero-content {
  position: relative; z-index: 5;
  display: flex; align-items: flex-end; gap: 16px;
  padding: 0 20px 20px; flex-wrap: wrap;
}

/* Avatar with upload overlay */
.ess-av-wrap {
  position: relative; cursor: pointer; flex-shrink: 0;
  border: 3px solid #0B0D12; border-radius: 50%; line-height: 0;
}
.ess-av-overlay {
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center;
  color: #fff; opacity: 0; transition: opacity .2s;
}
.ess-av-wrap:hover .ess-av-overlay { opacity: 1; }
.ess-file-hidden { display: none; }

/* Hero name & meta */
.ess-hero-info { flex: 1; min-width: 0; padding-bottom: 2px; }
.ess-hero-row1 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ess-name {
  margin: 0;
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 28px; font-weight: 400; color: #FAFBFC;
  letter-spacing: -0.02em; line-height: 1.1;
}
.ess-badge {
  display: inline-flex; align-items: center;
  padding: 3px 9px; border-radius: 9999px; font-size: 11px; font-weight: 600;
  letter-spacing: .03em;
}
.ess-hero-role { font-size: 13px; color: rgba(255,255,255,.65); margin: 3px 0 6px; }
.ess-sep { color: rgba(255,255,255,.35); }
.ess-hero-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.ess-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 20px; font-size: 11px;
  background: rgba(0,0,0,.35); color: rgba(255,255,255,.75);
  border: 1px solid rgba(255,255,255,.1);
}
.ess-chip--accent { background: rgba(107,91,255,.3); color: #c4baff; border-color: rgba(107,91,255,.3); }
.ess-chip--green  { background: rgba(47,184,114,.25); color: #6eefc3; border-color: rgba(47,184,114,.25); }
.ess-chip--muted  { background: rgba(0,0,0,.35); color: rgba(255,255,255,.45); }
.ess-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.35); }
.ess-dot--green { background: #2FB872; }

.ess-edit-hero-btn {
  padding: 7px 14px; background: rgba(0,0,0,.4); color: #fff;
  border: 1px solid rgba(255,255,255,.18); border-radius: 8px;
  font-size: 12px; font-weight: 500; cursor: pointer;
  display: flex; align-items: center; gap: 5px;
  align-self: flex-end;
}
.ess-edit-hero-btn:hover { background: rgba(0,0,0,.6); }

/* ── Stats bar ── */
.ess-stats-bar {
  display: flex; align-items: center;
  background: #161A23; border: 1px solid #232936; border-radius: 12px;
  overflow-x: auto;
}
.ess-stat { display: flex; flex-direction: column; align-items: center; padding: 14px 20px; min-width: 100px; }
.ess-stat-n { font-size: 20px; font-weight: 700; color: #EEF0F4; line-height: 1; font-family: 'Instrument Serif', Georgia, serif; }
.ess-stat-l { font-size: 10px; color: #7A8299; text-transform: uppercase; letter-spacing: .05em; margin-top: 4px; text-align: center; }
.ess-stat-div { width: 1px; height: 36px; background: #232936; flex-shrink: 0; }

/* ── Flash ── */
.ess-flash { padding: 10px 14px; border-radius: 8px; font-size: 13px; }
.ess-flash--ok  { background: rgba(47,184,114,.12); color: #2FB872; border: 1px solid rgba(47,184,114,.25); }
.ess-flash--err { background: rgba(229,72,77,.12);  color: #E5484D; border: 1px solid rgba(229,72,77,.25); }

/* ── Edit panel ── */
.ess-edit-panel {
  background: #161A23; border: 1px solid #232936;
  border-radius: 12px; padding: 18px;
}
.ess-edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
.ess-field--full { grid-column: 1 / -1; }
.ess-label { display: block; font-size: 11px; font-weight: 600; color: #7A8299; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; }
.ess-input { width: 100%; background: #1C212C; border: 1px solid #2E3544; color: #EEF0F4; border-radius: 7px; padding: 8px 10px; font-size: 13px; outline: none; box-sizing: border-box; }
.ess-input:focus { border-color: #6B5BFF; }
.ess-edit-actions { display: flex; gap: 8px; margin-top: 14px; }
.ess-btn-save { padding: 8px 18px; background: #6B5BFF; color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.ess-btn-save:disabled { opacity: .6; cursor: not-allowed; }
.ess-btn-discard { padding: 8px 14px; background: #1C212C; border: 1px solid #2E3544; color: #7A8299; border-radius: 7px; font-size: 13px; cursor: pointer; }

/* ── Body 2-col ── */
.ess-body { display: grid; grid-template-columns: 1fr 300px; gap: 16px; align-items: start; }
@media (max-width: 800px) { .ess-body { grid-template-columns: 1fr; } }
.ess-col-main, .ess-col-side { display: flex; flex-direction: column; gap: 14px; }

/* ── Card ── */
.ess-card { background: #161A23; border: 1px solid #232936; border-radius: 12px; padding: 16px; }
.ess-card-head { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px; }
.ess-section-label { font-size: 11px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: .06em; }

/* ── Today activity ── */
.ess-today-row { display: flex; gap: 0; }
.ess-today-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
.ess-today-sep { width: 1px; background: #232936; margin: 0 4px; }
.ess-today-label { font-size: 10px; color: #7A8299; text-transform: uppercase; letter-spacing: .04em; }
.ess-today-val { font-size: 16px; font-weight: 600; color: #EEF0F4; margin-top: 3px; font-family: 'Instrument Serif', Georgia, serif; }
.ess-empty-sm { font-size: 13px; color: #7A8299; text-align: center; padding: 8px 0; }

/* ── Announcements ── */
.ess-loading-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #7A8299; padding: 12px 0; }
.ess-ann-list { display: flex; flex-direction: column; gap: 10px; }
.ess-ann-card { transition: border-color .15s; }
.ess-ann-card:hover { border-color: #6B5BFF; }
.ess-ann-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ess-ann-av { width: 28px; height: 28px; border-radius: 50%; background: #232936; color: #8979FF; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ess-ann-meta { flex: 1; min-width: 0; }
.ess-ann-author { font-size: 12px; font-weight: 600; color: #EEF0F4; display: block; }
.ess-ann-time { font-size: 11px; color: #7A8299; }
.ess-pin-badge { font-size: 10px; color: #E8A63C; background: rgba(232,166,60,.1); padding: 2px 7px; border-radius: 10px; }
.ess-ann-title { font-size: 13.5px; font-weight: 600; color: #EEF0F4; margin: 0 0 5px; }
.ess-ann-body { font-size: 12.5px; color: #7A8299; line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.ess-ann-footer { margin-top: 10px; padding-top: 8px; border-top: 1px solid #232936; }
.ess-ann-views { font-size: 11px; color: #7A8299; }
.ess-type-tag { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 10px; text-transform: capitalize; }
.tag-blue   { background: rgba(107,91,255,.15); color: #8979FF; }
.tag-red    { background: rgba(229,72,77,.15);  color: #E5484D; }
.tag-purple { background: rgba(155,110,255,.15); color: #B28DFF; }
.tag-green  { background: rgba(47,184,114,.15);  color: #2FB872; }

/* ── About ── */
.ess-about-list { display: flex; flex-direction: column; gap: 8px; }
.ess-about-row { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: #EEF0F4; }
.ess-about-icon { color: #7A8299; flex-shrink: 0; margin-top: 1px; }
.ess-emg-block { margin-top: 12px; padding-top: 12px; border-top: 1px solid #232936; }
.ess-emg-label { font-size: 10px; font-weight: 600; color: #7A8299; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
.ess-emg-name { font-size: 13px; font-weight: 600; color: #EEF0F4; margin-bottom: 2px; }
.ess-emg-sub { font-size: 12px; color: #7A8299; }

/* ── Schedule ── */
.ess-days-row { display: flex; gap: 6px; }
.ess-day-chip { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; background: #1C212C; border: 1px solid #232936; color: #7A8299; }
.ess-day-chip--on { background: rgba(107,91,255,.15); color: #8979FF; border-color: rgba(107,91,255,.35); }
.ess-days-label { font-size: 11px; color: #7A8299; margin-top: 8px; }

/* ── Leave balances ── */
.ess-bal-list { display: flex; flex-direction: column; gap: 2px; }
.ess-bal-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #232936; }
.ess-bal-row:last-child { border-bottom: none; }
.ess-bal-name { font-size: 13px; color: #EEF0F4; }
.ess-bal-num { font-size: 15px; font-weight: 700; color: #8979FF; font-family: 'Instrument Serif', Georgia, serif; }
.ess-bal-unit { font-size: 10px; font-weight: 400; color: #7A8299; }

/* ── Misc ── */
.ess-empty { text-align: center; color: #7A8299; font-size: 13px; padding: 32px; }
.ess-spin { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.2); border-top-color: #fff; border-radius: 50%; animation: ess-spin .6s linear infinite; }
.ess-spin--sm { width: 12px; height: 12px; border-width: 1.5px; }
@keyframes ess-spin { to { transform: rotate(360deg); } }
</style>
