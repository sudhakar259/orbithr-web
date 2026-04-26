<script setup lang="ts">
defineOptions({ name: 'EssProfile' })
import { ref, computed, onMounted } from 'vue'
import { essService, type EssProfile } from '@/services/essService'
import { attendanceService } from '@/services/attendance'
import api from '@/services/api'

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
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

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
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const annTypeColor: Record<string, string> = {
  general: 'tag-blue', urgent: 'tag-red', event: 'tag-purple', hr: 'tag-green',
}

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
  <div class="prof-wrap">

    <!-- ── Skeleton ──────────────────────────────────────────────────────── -->
    <template v-if="loading">
      <div class="skel-hero"></div>
      <div class="prof-body">
        <div class="skel-block" style="height:200px"></div>
        <div class="skel-block" style="height:400px"></div>
      </div>
    </template>

    <template v-else-if="profile">

      <!-- ── Hero banner ────────────────────────────────────────────────── -->
      <div
        class="hero"
        :style="profile.banner_url ? `background-image:url('${profile.banner_url}')` : ''"
      >
        <!-- bottom gradient scrim so text is readable over any banner -->
        <div class="hero-scrim"></div>

        <!-- banner upload pill (top-right, appears on hover) -->
        <button class="banner-upload-btn" @click.stop="bannerInput?.click()">
          <div v-if="uploadingBanner" class="mini-spin"></div>
          <svg v-else width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
          {{ uploadingBanner ? 'Uploading…' : 'Change Banner' }}
          <input ref="bannerInput" type="file" accept="image/*" class="file-input-hidden" @change="onBannerChange" />
        </button>

        <!-- hero content sits on the banner, z above scrim -->
        <div class="hero-content">
          <div class="hero-avatar" @click="avatarInput?.click()">
            <img v-if="profile.avatar_url" :src="profile.avatar_url" class="avatar-img" :alt="profile.name" />
            <span v-else>{{ initials(profile.name) }}</span>
            <div class="avatar-overlay">
              <div v-if="uploadingAvatar" class="mini-spin mini-spin--sm"></div>
              <svg v-else width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
            </div>
            <input ref="avatarInput" type="file" accept="image/*" class="file-input-hidden" @change="onAvatarChange" />
          </div>
          <div class="hero-info">
            <h1 class="hero-name">{{ profile.name }}</h1>
            <p class="hero-role">
              <span v-if="profile.employee?.designation">{{ profile.employee.designation }}</span>
              <span v-if="profile.employee?.designation && profile.employee?.department" class="hero-sep">·</span>
              <span v-if="profile.employee?.department">{{ profile.employee.department }}</span>
            </p>
            <div class="hero-meta">
              <span v-if="profile.employee?.employee_id" class="hero-chip">
                <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 000 6h.75l.75 3H8a1 1 0 100 2h4a1 1 0 100-2h-.5l.75-3H13a3 3 0 000-6h3a1 1 0 010 2h-3a1 1 0 00-1 1v.5a1 1 0 001 1h.5a1 1 0 010 2h-.5a1 1 0 00-.97.757L11.5 14h-3l-.53-2.243A1 1 0 007 11h-.5a1 1 0 010-2H7a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 010-2z" clip-rule="evenodd"/></svg>
                {{ profile.employee.employee_id }}
              </span>
              <span v-if="profile.employee?.hire_date" class="hero-chip">
                <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
                Joined {{ formatDate(profile.employee.hire_date) }}
              </span>
              <span v-if="tenure" class="hero-chip hero-chip--accent">
                <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                {{ tenure }}
              </span>
              <span class="hero-chip" :class="punchedIn ? 'hero-chip--green' : 'hero-chip--muted'">
                <span class="dot" :class="punchedIn ? 'dot-green' : 'dot-muted'"></span>
                {{ punchedIn ? 'Currently Working' : 'Not Punched In' }}
              </span>
            </div>
          </div>
          <button class="edit-btn" @click="editing = !editing">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
            {{ editing ? 'Cancel' : 'Edit Profile' }}
          </button>
        </div>
      </div>

      <!-- ── Stats bar ───────────────────────────────────────────────────── -->
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-n stat-green">{{ attSummary.present_days }}</span>
          <span class="stat-l">Present this month</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat">
          <span class="stat-n stat-yellow">{{ attSummary.late_days }}</span>
          <span class="stat-l">Late arrivals</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat">
          <span class="stat-n stat-red">{{ attSummary.absent_days }}</span>
          <span class="stat-l">Absent days</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat">
          <span class="stat-n stat-accent">{{ leaveBalances.reduce((s, b) => s + (b.current_balance || 0), 0) }}</span>
          <span class="stat-l">Leave balance</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat">
          <span class="stat-n">{{ todayRec ? formatTime(todayRec.check_in) : '—' }}</span>
          <span class="stat-l">Today check-in</span>
        </div>
        <div class="stat-div"></div>
        <div class="stat">
          <span class="stat-n">{{ todayRec ? formatTime(todayRec.check_out) : '—' }}</span>
          <span class="stat-l">Today check-out</span>
        </div>
      </div>

      <!-- ── Success / error banner ─────────────────────────────────────── -->
      <div v-if="success" class="flash flash-ok">{{ success }}</div>
      <div v-if="errMsg"  class="flash flash-err">{{ errMsg }}</div>

      <!-- ── Edit form (inline, collapsible) ───────────────────────────── -->
      <div v-if="editing" class="edit-panel">
        <h3 class="edit-title">Edit Profile</h3>
        <div class="edit-grid">
          <div class="field">
            <label class="label">Full Name</label>
            <input v-model="form.name" type="text" class="input" placeholder="Your full name" />
          </div>
          <div class="field">
            <label class="label">Phone</label>
            <input v-model="form.phone" type="tel" class="input" placeholder="+91 XXXXX XXXXX" />
          </div>
          <div class="field field-full">
            <label class="label">Address</label>
            <input v-model="form.address" type="text" class="input" placeholder="Your address" />
          </div>
          <div class="field">
            <label class="label">Emergency Contact Name</label>
            <input v-model="form.emergency_contact_name" type="text" class="input" />
          </div>
          <div class="field">
            <label class="label">Emergency Contact Phone</label>
            <input v-model="form.emergency_contact_phone" type="tel" class="input" />
          </div>
          <div class="field">
            <label class="label">Relationship</label>
            <input v-model="form.emergency_contact_relationship" type="text" class="input" placeholder="e.g. Spouse, Parent" />
          </div>
        </div>
        <div class="edit-actions">
          <button class="btn-save" :disabled="saving" @click="save">
            <div v-if="saving" class="mini-spin"></div>
            {{ saving ? 'Saving…' : 'Save Changes' }}
          </button>
          <button class="btn-discard" @click="editing = false">Discard</button>
        </div>
      </div>

      <!-- ── Main 2-col layout ──────────────────────────────────────────── -->
      <div class="prof-body">

        <!-- LEFT: Feed ─────────────────────────────────────────────────── -->
        <div class="feed-col">

          <!-- Today's activity card -->
          <div class="card today-card">
            <div class="card-head">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
              Today's Activity
            </div>
            <div v-if="todayRec" class="today-row">
              <div class="today-item">
                <span class="today-label">Check In</span>
                <span class="today-val today-green">{{ formatTime(todayRec.check_in) }}</span>
              </div>
              <div class="today-sep"></div>
              <div class="today-item">
                <span class="today-label">Check Out</span>
                <span class="today-val">{{ formatTime(todayRec.check_out) }}</span>
              </div>
              <div class="today-sep"></div>
              <div class="today-item">
                <span class="today-label">Hours</span>
                <span class="today-val today-accent">{{ todayRec.working_hours ? todayRec.working_hours + 'h' : '—' }}</span>
              </div>
              <div class="today-sep"></div>
              <div class="today-item">
                <span class="today-label">Status</span>
                <span class="today-val" :class="{ 'today-green': todayRec.status === 'present', 'today-yellow': todayRec.status === 'late' }">{{ todayRec.status ?? '—' }}</span>
              </div>
            </div>
            <p v-else class="today-empty">No attendance record for today yet.</p>
          </div>

          <!-- Announcements feed -->
          <div class="card-head mt-feed">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z"/></svg>
            Company Announcements
          </div>

          <div v-if="annLoading" class="ann-loading">
            <div class="mini-spin"></div> Loading…
          </div>
          <div v-else-if="announcements.length === 0" class="empty-state">No announcements yet.</div>
          <div v-else class="ann-list">
            <div v-for="ann in announcements" :key="ann.id" class="ann-card">
              <div class="ann-head">
                <div class="ann-avatar">
                  {{ ann.user?.name ? initials(ann.user.name) : 'HR' }}
                </div>
                <div class="ann-meta">
                  <span class="ann-author">{{ ann.user?.name ?? 'HR Team' }}</span>
                  <span class="ann-time">{{ formatAgo(ann.published_at) }}</span>
                </div>
                <span v-if="ann.is_pinned" class="pin-badge">
                  <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-.427l.196 2.763a1 1 0 01-.98 1.063 1 1 0 01-.037 0h-.004l-.022.003L14.5 12H11v5a1 1 0 11-2 0v-5H5.5l-1.226-.172a1 1 0 01-.858-1.086L3.627 8H3a1 1 0 110-2h2.47l-.44-1.757a1 1 0 111.94-.486L7.53 6h2.94l-.44-1.757a1 1 0 01.213-.727z"/></svg>
                  Pinned
                </span>
                <span v-if="ann.type" :class="['type-tag', annTypeColor[ann.type] ?? 'tag-blue']">{{ ann.type }}</span>
              </div>
              <h4 class="ann-title">{{ ann.title }}</h4>
              <p class="ann-body">{{ ann.body }}</p>
              <div class="ann-footer">
                <span v-if="ann.views" class="ann-views">
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>
                  {{ ann.views }} views
                </span>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT: Sidebar ─────────────────────────────────────────────── -->
        <div class="side-col">

          <!-- About card -->
          <div class="card">
            <div class="card-head">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
              About
            </div>
            <div class="about-list">
              <div v-if="profile.email" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                <span>{{ profile.email }}</span>
              </div>
              <div v-if="profile.phone" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                <span>{{ profile.phone }}</span>
              </div>
              <div v-if="profile.address" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                <span>{{ profile.address }}</span>
              </div>
              <div v-if="profile.employee?.gender" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
                <span class="capitalize">{{ profile.employee.gender }}</span>
              </div>
              <div v-if="profile.employee?.date_of_birth" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
                <span>{{ formatDate(profile.employee.date_of_birth) }}</span>
              </div>
              <div v-if="profile.employee?.employment_type" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                <span class="capitalize">{{ profile.employee.employment_type.replace('_', ' ') }}</span>
              </div>
              <div v-if="profile.employee?.role" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                <span class="capitalize">{{ profile.employee.role }}</span>
              </div>
              <div v-if="profile.employee?.team" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                <span>{{ profile.employee.team }}</span>
              </div>
              <div v-if="profile.employee?.location" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                <span>{{ profile.employee.location }}</span>
              </div>
              <div v-if="profile.nationality" class="about-row">
                <svg class="about-icon" width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 7l2.55 2.4A1 1 0 0116 11H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clip-rule="evenodd"/></svg>
                <span>{{ profile.nationality }}</span>
              </div>
            </div>

            <!-- Emergency contact -->
            <div v-if="profile.emergency_contact_name" class="emergency-block">
              <p class="emg-label">Emergency Contact</p>
              <p class="emg-name">{{ profile.emergency_contact_name }}</p>
              <p v-if="profile.emergency_contact_phone" class="emg-sub">{{ profile.emergency_contact_phone }}</p>
              <p v-if="profile.emergency_contact_relationship" class="emg-sub">{{ profile.emergency_contact_relationship }}</p>
            </div>
          </div>

          <!-- Working schedule -->
          <div class="card">
            <div class="card-head">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
              Work Schedule
            </div>
            <div class="days-row">
              <div
                v-for="d in ALL_DAYS" :key="d"
                :class="['day-chip', isDayOn(d) ? 'day-on' : 'day-off']"
              >{{ d.slice(0, 1) }}</div>
            </div>
            <p class="days-label">{{ workingDays.length }} days / week</p>
          </div>

          <!-- Leave balances -->
          <div v-if="leaveBalances.length" class="card">
            <div class="card-head">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"/></svg>
              Leave Balances
            </div>
            <div class="bal-list">
              <div v-for="b in leaveBalances" :key="b.leave_type_id" class="bal-row">
                <span class="bal-name">{{ b.leave_type_name ?? 'Leave' }}</span>
                <span class="bal-num">{{ b.current_balance }} <span class="bal-unit">days</span></span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </template>

    <div v-else class="empty-state">Could not load profile. Please refresh.</div>
  </div>
</template>

<style scoped>
/* ── Design tokens ──────────────────────────────────────────────────────────── */
/* Uses the project CSS variables: --bg, --surface, --surface2, --surface3,
   --accent, --green, --yellow, --red, --purple, --text, --muted             */

.prof-wrap { display: flex; flex-direction: column; gap: 16px; width: 100%; }

/* ── Hero ────────────────────────────────────────────────────────────────── */
.hero {
  border-radius: 14px; overflow: hidden;
  border: 1px solid var(--surface3);
  background: linear-gradient(135deg, #1a2550 0%, #0e1a3d 40%, #1a1030 70%, #0e0e20 100%);
  background-size: cover; background-position: center;
  min-height: 220px;
  display: flex; flex-direction: column; justify-content: flex-end;
  position: relative;
}
/* subtle diagonal pattern when no banner image */
.hero::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(79,126,255,.03) 30px, rgba(79,126,255,.03) 60px);
  pointer-events: none;
}
/* dark gradient scrim so text is readable over any banner */
.hero-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,.05) 0%, rgba(0,0,0,.55) 100%);
  pointer-events: none;
}
/* banner upload pill — hidden until hover */
.banner-upload-btn {
  position: absolute; top: 12px; right: 12px; z-index: 10;
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 500;
  background: rgba(0,0,0,.55); color: #fff;
  border: 1px solid rgba(255,255,255,.18);
  cursor: pointer; backdrop-filter: blur(6px);
  opacity: 0; transition: opacity .2s;
}
.hero:hover .banner-upload-btn { opacity: 1; }
.hero-content {
  position: relative; z-index: 5;
  display: flex; align-items: flex-end; gap: 20px;
  padding: 0 24px 22px;
  flex-wrap: wrap;
}
.hero-avatar {
  width: 80px; height: 80px; border-radius: 50%;
  background: var(--accent); color: #fff;
  font-size: 26px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 3px solid rgba(255,255,255,.15); flex-shrink: 0;
  position: relative; cursor: pointer; overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,.4);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.avatar-overlay {
  position: absolute; inset: 0; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.5); opacity: 0; transition: opacity .2s; color: #fff;
}
.hero-avatar:hover .avatar-overlay { opacity: 1; }
.file-input-hidden { display: none; }
.mini-spin--sm { width: 10px; height: 10px; border-width: 1.5px; }
.hero-info { flex: 1; min-width: 0; }
.hero-name { font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 2px; text-shadow: 0 1px 4px rgba(0,0,0,.4); }
.hero-role { font-size: 13px; color: rgba(255,255,255,.7); margin: 0 0 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.hero-sep  { color: rgba(255,255,255,.3); }
.hero-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.hero-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 20px; font-size: 11px;
  background: rgba(0,0,0,.35); color: rgba(255,255,255,.75);
  backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,.1);
}
.hero-chip--accent { background: rgba(79,126,255,.3); color: #a8c0ff; border-color: rgba(79,126,255,.3); }
.hero-chip--green  { background: rgba(54,211,153,.25); color: #6eefc3; border-color: rgba(54,211,153,.25); }
.hero-chip--muted  { background: rgba(0,0,0,.35); color: rgba(255,255,255,.5); }
.dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.dot-green { background: var(--green); }
.dot-muted { background: rgba(255,255,255,.35); }
.edit-btn {
  margin-left: auto; padding: 7px 14px;
  background: rgba(0,0,0,.4); color: #fff;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 8px; font-size: 12px; font-weight: 500; cursor: pointer;
  display: flex; align-items: center; gap: 5px; transition: background .15s;
  align-self: flex-end; backdrop-filter: blur(6px);
}
.edit-btn:hover { background: rgba(0,0,0,.6); }

/* ── Stats bar ───────────────────────────────────────────────────────────── */
.stats-bar {
  display: flex; align-items: center; gap: 0;
  background: var(--surface); border: 1px solid var(--surface3); border-radius: 12px;
  padding: 0; overflow-x: auto;
}
.stat { display: flex; flex-direction: column; align-items: center; padding: 14px 20px; min-width: 100px; }
.stat-n { font-size: 20px; font-weight: 700; color: var(--text); line-height: 1; }
.stat-l { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-top: 3px; text-align: center; }
.stat-green  { color: var(--green); }
.stat-yellow { color: var(--yellow); }
.stat-red    { color: var(--red); }
.stat-accent { color: var(--accent); }
.stat-div    { width: 1px; height: 36px; background: var(--surface3); flex-shrink: 0; }

/* ── Flash ───────────────────────────────────────────────────────────────── */
.flash { padding: 10px 16px; border-radius: 8px; font-size: 13px; }
.flash-ok  { background: rgba(54,211,153,.12); color: var(--green); border: 1px solid rgba(54,211,153,.25); }
.flash-err { background: rgba(255,107,107,.12); color: var(--red);  border: 1px solid rgba(255,107,107,.25); }

/* ── Edit panel ──────────────────────────────────────────────────────────── */
.edit-panel {
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 12px; padding: 20px;
}
.edit-title { font-size: 13px; font-weight: 600; color: var(--text); text-transform: uppercase; letter-spacing: .05em; margin: 0 0 16px; }
.edit-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-full { grid-column: 1 / -1; }
.label      { display: block; font-size: 11px; font-weight: 500; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; }
.input      { width: 100%; background: var(--surface2); border: 1px solid var(--surface3); color: var(--text); border-radius: 7px; padding: 8px 10px; font-size: 13px; outline: none; box-sizing: border-box; }
.input:focus { border-color: var(--accent); }
.edit-actions { display: flex; gap: 8px; margin-top: 16px; }
.btn-save    { padding: 8px 18px; background: var(--accent); color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.btn-save:disabled { opacity: .6; cursor: not-allowed; }
.btn-discard { padding: 8px 14px; background: var(--surface3); color: var(--muted); border: none; border-radius: 7px; font-size: 13px; cursor: pointer; }

/* ── 2-col layout ────────────────────────────────────────────────────────── */
.prof-body { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
@media (max-width: 800px) { .prof-body { grid-template-columns: 1fr; } }

/* ── Cards ───────────────────────────────────────────────────────────────── */
.card { background: var(--surface); border: 1px solid var(--surface3); border-radius: 12px; padding: 16px; margin-bottom: 14px; }
.card-head {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px;
}
.mt-feed { margin-top: 4px; color: var(--muted); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; display: flex; align-items: center; gap: 6px; }

/* ── Today card ──────────────────────────────────────────────────────────── */
.today-card { margin-bottom: 14px; }
.today-row  { display: flex; gap: 0; }
.today-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
.today-sep  { width: 1px; background: var(--surface3); margin: 0 4px; }
.today-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
.today-val   { font-size: 16px; font-weight: 600; color: var(--text); margin-top: 2px; }
.today-green  { color: var(--green); }
.today-accent { color: var(--accent); }
.today-yellow { color: var(--yellow); }
.today-empty  { font-size: 13px; color: var(--muted); text-align: center; padding: 8px 0; }

/* ── Announcements ───────────────────────────────────────────────────────── */
.ann-loading { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); padding: 16px 0; }
.ann-list    { display: flex; flex-direction: column; gap: 12px; }
.ann-card {
  background: var(--surface); border: 1px solid var(--surface3); border-radius: 10px; padding: 14px;
  transition: border-color .15s;
}
.ann-card:hover { border-color: var(--accent); }
.ann-head   { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ann-avatar {
  width: 30px; height: 30px; border-radius: 50%; background: var(--surface3);
  color: var(--accent); font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ann-meta   { flex: 1; min-width: 0; }
.ann-author { font-size: 12px; font-weight: 600; color: var(--text); display: block; }
.ann-time   { font-size: 11px; color: var(--muted); }
.pin-badge  { display: flex; align-items: center; gap: 3px; font-size: 10px; color: var(--yellow); background: rgba(249,168,37,.1); padding: 2px 7px; border-radius: 10px; }
.ann-title  { font-size: 14px; font-weight: 600; color: var(--text); margin: 0 0 5px; }
.ann-body   { font-size: 13px; color: var(--muted); line-height: 1.5; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.ann-footer { display: flex; align-items: center; gap: 12px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--surface3); }
.ann-views  { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted); }
.type-tag   { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 10px; text-transform: capitalize; }
.tag-blue   { background: rgba(79,126,255,.15); color: var(--accent); }
.tag-red    { background: rgba(255,107,107,.15); color: var(--red); }
.tag-purple { background: rgba(155,110,255,.15); color: var(--purple); }
.tag-green  { background: rgba(54,211,153,.15);  color: var(--green); }

/* ── About ───────────────────────────────────────────────────────────────── */
.about-list  { display: flex; flex-direction: column; gap: 8px; }
.about-row   { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text); }
.about-icon  { color: var(--muted); flex-shrink: 0; margin-top: 1px; }
.emergency-block { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--surface3); }
.emg-label   { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin: 0 0 4px; }
.emg-name    { font-size: 13px; font-weight: 600; color: var(--text); margin: 0 0 2px; }
.emg-sub     { font-size: 12px; color: var(--muted); margin: 0; }

/* ── Work schedule ───────────────────────────────────────────────────────── */
.days-row  { display: flex; gap: 6px; }
.day-chip  { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.day-on    { background: rgba(79,126,255,.2); color: var(--accent); border: 1px solid rgba(79,126,255,.4); }
.day-off   { background: var(--surface3); color: var(--muted); border: 1px solid transparent; }
.days-label { font-size: 11px; color: var(--muted); margin-top: 8px; }

/* ── Leave balances ──────────────────────────────────────────────────────── */
.bal-list { display: flex; flex-direction: column; gap: 6px; }
.bal-row  { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--surface3); }
.bal-row:last-child { border-bottom: none; }
.bal-name { font-size: 13px; color: var(--text); }
.bal-num  { font-size: 15px; font-weight: 700; color: var(--accent); }
.bal-unit { font-size: 10px; font-weight: 400; color: var(--muted); }

/* ── Misc ────────────────────────────────────────────────────────────────── */
.empty-state { text-align: center; color: var(--muted); font-size: 13px; padding: 32px; }
.skel-hero   { height: 160px; background: var(--surface2); border-radius: 14px; animation: pulse 1.4s infinite; }
.skel-block  { background: var(--surface2); border-radius: 12px; animation: pulse 1.4s infinite; }
.mini-spin   { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.2); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
.capitalize { text-transform: capitalize; }

</style>
