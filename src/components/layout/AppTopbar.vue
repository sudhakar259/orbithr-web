<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useTheme, type Theme } from '@/composables/useTheme'
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import api from '@/services/api'

const route = useRoute()

// ── Page title ───────────────────────────────────────────────────────────────
const pageTitle = computed(() => {
  if (route.meta?.title) return route.meta.title as string
  const name = (route.name as string) ?? ''
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
})

const today = computed(() =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)

// ── Theme ────────────────────────────────────────────────────────────────────
const { theme, setTheme } = useTheme()
const showThemePicker = ref(false)
const themeBtn = ref<HTMLElement | null>(null)
const themeLabels: Record<Theme, string> = { dark: 'Dark', light: 'Light', auto: 'Auto' }

// ── Search ───────────────────────────────────────────────────────────────────
const { query, results, loading, onInput, clear, navigate, goToAll } = useGlobalSearch()
const searchFocus = ref(false)
const searchRef = ref<HTMLElement | null>(null)
const showResults = computed(() => searchFocus.value && query.value.length > 0)

// ── Notifications ─────────────────────────────────────────────────────────────
interface Notif {
  id: number
  type: string
  title: string
  body: string
  read_at: string | null
  created_at?: string
}
const notifs = ref<Notif[]>([])
const unreadCount = ref(0)
const showNotifs = ref(false)
const notifsRef = ref<HTMLElement | null>(null)
const notifsLoading = ref(false)

async function fetchNotifs() {
  notifsLoading.value = true
  try {
    const { data } = await api.get('/notifications')
    const list = data.data ?? data
    notifs.value = list
    unreadCount.value = list.filter((n: Notif) => !n.read_at).length
  } catch {
    // silently ignore — could be no notifications yet
  } finally {
    notifsLoading.value = false
  }
}

async function fetchUnreadCount() {
  try {
    const { data } = await api.get('/notifications/unread-count')
    unreadCount.value = data.count ?? 0
  } catch {
    /* ignore */
  }
}

async function markRead(n: Notif) {
  if (n.read_at) return
  try {
    await api.post(`/notifications/${n.id}/read`)
    n.read_at = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch {
    /* ignore */
  }
}

async function markAllRead() {
  try {
    await api.post('/notifications/read-all')
    notifs.value.forEach((n) => {
      n.read_at = n.read_at ?? new Date().toISOString()
    })
    unreadCount.value = 0
  } catch {
    /* ignore */
  }
}

function typeEmoji(type: string) {
  const map: Record<string, string> = {
    leave: '📋',
    payroll: '💰',
    performance: '📊',
    attendance: '📅',
    general: '🔔',
    system: '⚙️',
  }
  return map[type] ?? '🔔'
}

function typeBg(type: string) {
  const map: Record<string, string> = {
    leave: 'rgba(79,126,255,.15)',
    payroll: 'rgba(54,211,153,.15)',
    performance: 'rgba(249,168,37,.15)',
    attendance: 'rgba(155,110,255,.15)',
    general: 'rgba(79,126,255,.15)',
    system: 'rgba(156,163,175,.15)',
  }
  return map[type] ?? 'rgba(79,126,255,.15)'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Impersonation ────────────────────────────────────────────────────────────
const hasImpersonation = ref(!!localStorage.getItem('orbithr_impersonate_backup'))
function stopImpersonation() {
  const backup = localStorage.getItem('orbithr_impersonate_backup')
  if (backup) {
    localStorage.setItem('orbithr_token', backup)
    localStorage.removeItem('orbithr_impersonate_backup')
    window.location.reload()
  }
}

// ── Context-aware CTA ─────────────────────────────────────────────────────────
interface CtaConfig {
  label: string
  to: string
}
const ctaMap: Record<string, CtaConfig> = {
  recruitment: { label: 'Post Job', to: '/app/recruitment/jobs/new' },
  'recruitment.jobs.create': { label: 'Post Job', to: '/app/recruitment/jobs/new' },
  candidates: { label: 'Add Candidate', to: '/app/recruitment/candidates/new' },
  'leave-requests': { label: 'Request Leave', to: '/app/leave' },
  'holiday-calendar': { label: 'Add Holiday', to: '/app/holiday-calendar' },
  'hr-letters': { label: 'New Template', to: '/app/hr-letters' },
  'knowledge-base': { label: 'New Article', to: '/app/knowledge-base' },
  events: { label: 'Add Event', to: '/app/events' },
}
const cta = computed<CtaConfig | null>(() => ctaMap[route.name as string] ?? null)

// ── Outside click handler ─────────────────────────────────────────────────────
function onDocClick(e: MouseEvent) {
  if (notifsRef.value && !notifsRef.value.contains(e.target as Node)) showNotifs.value = false
  if (themeBtn.value && !themeBtn.value.contains(e.target as Node)) showThemePicker.value = false
  if (searchRef.value && !searchRef.value.contains(e.target as Node)) {
    searchFocus.value = false
    clear()
  }
}

let pollTimer: ReturnType<typeof setInterval>
onMounted(() => {
  document.addEventListener('click', onDocClick)
  fetchNotifs()
  pollTimer = setInterval(fetchUnreadCount, 60_000)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  clearInterval(pollTimer)
})
</script>

<template>
  <header class="topbar">
    <!-- Left: title + date -->
    <div class="title-group">
      <h1 class="title">{{ pageTitle }}</h1>
      <p class="date">{{ today }}</p>
    </div>

    <!-- Search -->
    <div ref="searchRef" class="search-wrap">
      <div class="search" :class="{ focus: searchFocus }">
        <svg
          v-if="!loading"
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clip-rule="evenodd"
          />
        </svg>
        <div v-else class="search-spin" />
        <input
          :value="query"
          placeholder="Search employees…"
          @focus="searchFocus = true"
          @input="onInput(($event.target as HTMLInputElement).value)"
          @keydown.enter="goToAll"
          @keydown.escape="
            () => {
              searchFocus = false
              clear()
            }
          "
        />
        <kbd v-if="!searchFocus && !query">⌘K</kbd>
        <button
          v-if="query"
          class="search-clear"
          @click="
            () => {
              clear()
              searchFocus = true
            }
          "
        >
          ×
        </button>
      </div>

      <!-- Results dropdown -->
      <Transition name="drop">
        <div v-if="showResults" class="search-panel">
          <div v-if="results.length === 0 && !loading" class="search-empty">
            No employees found for "{{ query }}"
          </div>
          <div
            v-for="r in results"
            :key="r.id"
            class="search-item"
            @click="navigate(r)"
          >
            <div class="search-avatar">
              <img v-if="r.avatar" :src="r.avatar" :alt="r.label" />
              <span v-else>{{ r.label.charAt(0) }}</span>
            </div>
            <div>
              <div class="search-name">{{ r.label }}</div>
              <div class="search-sub">{{ r.sub }}</div>
            </div>
          </div>
          <div v-if="results.length > 0" class="search-footer" @click="goToAll">
            View all results for "{{ query }}"
          </div>
        </div>
      </Transition>
    </div>

    <!-- Right: actions -->
    <div class="actions">
      <!-- Impersonation -->
      <button v-if="hasImpersonation" class="imp-btn" @click="stopImpersonation">
        Return to admin
      </button>

      <!-- Notifications -->
      <div ref="notifsRef" class="icon-btn" @click="showNotifs = !showNotifs">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path
            d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"
          />
        </svg>
        <span v-if="unreadCount > 0" class="ndot">{{
          unreadCount > 9 ? '9+' : unreadCount
        }}</span>

        <Transition name="drop">
          <div v-if="showNotifs" class="notif-panel" @click.stop>
            <div class="np-head">
              <span>Notifications</span>
              <span v-if="unreadCount > 0" class="np-read" @click="markAllRead"
                >Mark all read</span
              >
            </div>
            <div v-if="notifsLoading" class="np-loading">Loading...</div>
            <template v-else>
              <div
                v-for="n in notifs"
                :key="n.id"
                class="np-item"
                :class="{ unread: !n.read_at }"
                @click="markRead(n)"
              >
                <div class="np-icon" :style="{ background: typeBg(n.type) }">
                  {{ typeEmoji(n.type) }}
                </div>
                <div class="np-body">
                  <div class="np-title">{{ n.title }}</div>
                  <div class="np-text">{{ n.body }}</div>
                  <div class="np-time">
                    {{ timeAgo(n.created_at ?? new Date().toISOString()) }}
                  </div>
                </div>
              </div>
              <div v-if="notifs.length === 0" class="np-empty">You're all caught up</div>
            </template>
          </div>
        </Transition>
      </div>

      <!-- Theme picker -->
      <div
        ref="themeBtn"
        class="icon-btn theme-btn"
        @click="showThemePicker = !showThemePicker"
      >
        <!-- Dark icon -->
        <svg
          v-if="theme === 'dark'"
          width="15"
          height="15"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
          />
        </svg>
        <!-- Light icon -->
        <svg
          v-else-if="theme === 'light'"
          width="15"
          height="15"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clip-rule="evenodd"
          />
        </svg>
        <!-- Auto icon -->
        <svg v-else width="15" height="15" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"
            clip-rule="evenodd"
          />
        </svg>

        <Transition name="drop">
          <div v-if="showThemePicker" class="theme-panel" @click.stop>
            <button
              v-for="opt in (['dark', 'light', 'auto'] as Theme[])"
              :key="opt"
              class="theme-opt"
              :class="{ active: theme === opt }"
              @click="
                () => {
                  setTheme(opt)
                  showThemePicker = false
                }
              "
            >
              {{ themeLabels[opt] }}
            </button>
          </div>
        </Transition>
      </div>

      <!-- Context-aware CTA -->
      <RouterLink v-if="cta" :to="cta.to" class="btn-add">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
            clip-rule="evenodd"
          />
        </svg>
        {{ cta.label }}
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--th);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 28px;
  gap: 14px;
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 50;
  flex-shrink: 0;
}

.title-group {
  flex: 1;
  min-width: 0;
}
.title {
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.3px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.date {
  font-size: 11px;
  color: var(--muted);
}

/* Search */
.search-wrap {
  position: relative;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  padding: 7px 12px;
  width: 260px;
  transition: border-color 0.15s;
}
.search.focus {
  border-color: var(--accent);
}
.search svg {
  color: var(--muted);
  flex-shrink: 0;
}
.search input {
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  width: 100%;
}
.search input::placeholder {
  color: var(--muted);
}
.search-spin {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid var(--border-hi);
  border-top-color: var(--accent);
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
kbd {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 10px;
  color: var(--muted);
  flex-shrink: 0;
}
.search-clear {
  background: none;
  border: none;
  padding: 0 2px;
  color: var(--muted);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}
.search-clear:hover {
  color: var(--text);
}

.search-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  min-width: 320px;
  background: var(--surface);
  border: 1px solid var(--border-hi);
  border-radius: var(--r);
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
  z-index: 300;
}
.search-empty {
  padding: 16px;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}
.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.1s;
}
.search-item:hover {
  background: var(--surface2);
}
.search-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--accent-glow);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  overflow: hidden;
}
.search-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.search-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.search-sub {
  font-size: 11px;
  color: var(--muted);
}
.search-footer {
  padding: 10px 14px;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  border-top: 1px solid var(--border);
  text-align: center;
  transition: background 0.1s;
}
.search-footer:hover {
  background: var(--surface2);
}

/* Actions */
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.imp-btn {
  padding: 6px 12px;
  border-radius: var(--rs);
  font-size: 12px;
  font-weight: 500;
  background: rgba(255, 107, 107, 0.15);
  color: var(--red);
  border: 1px solid rgba(255, 107, 107, 0.3);
  cursor: pointer;
  transition: all 0.14s;
}
.imp-btn:hover {
  background: rgba(255, 107, 107, 0.25);
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--rs);
  border: 1px solid var(--border);
  background: var(--surface);
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--dim);
  transition: all 0.14s;
  position: relative;
  flex-shrink: 0;
}
.icon-btn:hover {
  border-color: var(--border-hi);
  color: var(--text);
}

.ndot {
  position: absolute;
  top: 5px;
  right: 5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--red);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  border-radius: 10px;
  border: 2px solid var(--bg);
  display: grid;
  place-items: center;
}

/* Notifications panel */
.notif-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 320px;
  background: var(--surface);
  border: 1px solid var(--border-hi);
  border-radius: var(--r);
  overflow: hidden;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
  z-index: 300;
  max-height: 420px;
  overflow-y: auto;
}
.np-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 13px 15px 11px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  position: sticky;
  top: 0;
  background: var(--surface);
}
.np-read {
  font-size: 11px;
  color: var(--accent);
  cursor: pointer;
  font-weight: 400;
}
.np-read:hover {
  text-decoration: underline;
}
.np-loading {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
}
.np-empty {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
}
.np-item {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  transition: background 0.1s;
}
.np-item:last-child {
  border-bottom: none;
}
.np-item:hover {
  background: var(--surface2);
}
.np-item.unread {
  background: rgba(79, 126, 255, 0.04);
}
.np-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 14px;
  flex-shrink: 0;
}
.np-body {
  flex: 1;
  min-width: 0;
}
.np-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.np-text {
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  margin-top: 2px;
}
.np-time {
  font-size: 10px;
  color: var(--dim);
  margin-top: 3px;
}

/* Theme picker */
.theme-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 120px;
  background: var(--surface);
  border: 1px solid var(--border-hi);
  border-radius: var(--rs);
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 300;
}
.theme-opt {
  display: block;
  width: 100%;
  padding: 8px 14px;
  text-align: left;
  font-size: 13px;
  color: var(--dim);
  background: none;
  border: none;
  cursor: pointer;
  transition:
    background 0.1s,
    color 0.1s;
}
.theme-opt:hover {
  background: var(--surface2);
  color: var(--text);
}
.theme-opt.active {
  color: var(--accent);
  font-weight: 500;
}

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: var(--rs);
  font-size: 13px;
  font-weight: 500;
  background: var(--accent);
  color: #fff;
  border: none;
  box-shadow: 0 0 16px rgba(79, 126, 255, 0.3);
  transition: all 0.15s;
  text-decoration: none;
  white-space: nowrap;
}
.btn-add:hover {
  background: #3d6ee8;
  transform: translateY(-1px);
  box-shadow: 0 0 22px rgba(79, 126, 255, 0.45);
}

.drop-enter-active,
.drop-leave-active {
  transition: all 0.18s ease;
}
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
