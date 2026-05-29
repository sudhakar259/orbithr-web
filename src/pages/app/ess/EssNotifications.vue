<script setup lang="ts">
defineOptions({ name: 'EssNotifications' })
import { ref, computed, onMounted } from 'vue'
import { essService, type AppNotification } from '@/services/essService'

const loading = ref(true)
const notifications = ref<AppNotification[]>([])
const error = ref('')

const load = async () => {
  loading.value = true
  try {
    const res = await essService.getNotifications()
    notifications.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load notifications'
  } finally {
    loading.value = false
  }
}

const markRead = async (n: AppNotification) => {
  if (n.read_at) return
  try {
    await essService.markRead(n.id)
    n.read_at = new Date().toISOString()
  } catch {
    // silent
  }
}

const markAllRead = async () => {
  try {
    await essService.markAllRead()
    notifications.value.forEach((n) => {
      if (!n.read_at) n.read_at = new Date().toISOString()
    })
  } catch {
    error.value = 'Failed to mark all as read'
  }
}

const unreadCount = computed(() => notifications.value.filter((n) => !n.read_at).length)

const formatDate = (d: string) =>
  new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const initials = (title: string) => {
  if (!title) return 'N'
  return title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

onMounted(load)
</script>

<template>
  <div class="essn-card">
    <header class="essn-head">
      <div>
        <h2 class="essn-title">Inbox</h2>
        <p class="essn-sub">{{ unreadCount }} unread · {{ notifications.length }} total</p>
      </div>
      <button
        v-if="unreadCount > 0"
        class="essn-btn essn-btn-secondary"
        @click="markAllRead"
      >
        Mark all read
      </button>
    </header>

    <div v-if="error" class="essn-error">{{ error }}</div>

    <div v-if="loading" class="essn-list">
      <div v-for="i in 5" :key="i" class="essn-skeleton">
        <div class="essn-skel-bar" />
        <div class="essn-skel-circle" />
        <div class="essn-skel-content">
          <div class="essn-skel-line w-2-3" />
          <div class="essn-skel-line w-1-2" />
        </div>
      </div>
    </div>

    <div v-else-if="notifications.length" class="essn-list">
      <button
        v-for="n in notifications"
        :key="n.id"
        class="essn-item"
        :class="{ unread: !n.read_at }"
        @click="markRead(n)"
      >
        <div class="essn-bar" :class="{ active: !n.read_at }" />
        <span class="essn-avatar">{{ initials(n.title) }}</span>
        <div class="essn-body">
          <div class="essn-row">
            <span class="essn-badge" :class="n.read_at ? 'tone-muted' : 'tone-accent'">
              {{ n.read_at ? 'Read' : 'New' }}
            </span>
            <span class="essn-item-title" :class="{ bold: !n.read_at }">{{ n.title }}</span>
          </div>
          <p class="essn-preview">{{ n.body }}</p>
        </div>
        <div class="essn-time">{{ formatDate(n.created_at) }}</div>
      </button>
    </div>

    <div v-else class="essn-empty">
      <div class="essn-empty-icon">📭</div>
      <div class="essn-empty-text">No notifications</div>
      <div class="essn-empty-sub">You're all caught up</div>
    </div>
  </div>
</template>

<style scoped>
.essn-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
  color: #EEF0F4;
  font-family: 'Inter', system-ui, sans-serif;
}

.essn-head {
  padding: 16px 20px;
  border-bottom: 1px solid #232936;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.essn-title {
  font-family: 'Instrument Serif', serif;
  font-size: 24px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin: 0;
}
.essn-sub {
  font-size: 11.5px;
  color: #7A8299;
  margin: 3px 0 0;
}

.essn-btn {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.essn-btn-secondary {
  background: #1C2030;
  color: #EEF0F4;
  border-color: #232936;
}
.essn-btn-secondary:hover { border-color: #3a4258; }

.essn-error {
  margin: 14px 20px;
  padding: 10px 14px;
  background: rgba(243, 130, 136, 0.1);
  border: 1px solid rgba(243, 130, 136, 0.3);
  border-radius: 6px;
  font-size: 12.5px;
  color: #F38288;
}

.essn-list {
  display: flex;
  flex-direction: column;
}

.essn-item {
  display: grid;
  grid-template-columns: 4px 28px 1fr auto;
  gap: 10px;
  padding: 14px 20px;
  border: none;
  border-bottom: 1px solid #1C2030;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  text-align: left;
  align-items: start;
  width: 100%;
}
.essn-item:last-child { border-bottom: none; }
.essn-item:hover { background: rgba(255, 255, 255, 0.02); }
.essn-item.unread { background: rgba(107, 91, 255, 0.04); }

.essn-bar {
  width: 3px;
  height: 100%;
  border-radius: 2px;
  background: transparent;
  align-self: stretch;
}
.essn-bar.active { background: #6B5BFF; }

.essn-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6B5BFF, #9B6EFF);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.essn-body { min-width: 0; }
.essn-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.essn-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tone-accent { background: rgba(107, 91, 255, 0.18); color: #6B5BFF; }
.tone-muted { background: #1C2030; color: #7A8299; }

.essn-item-title {
  font-size: 12.5px;
  font-weight: 500;
  color: #EEF0F4;
}
.essn-item-title.bold { font-weight: 600; }
.essn-preview {
  font-size: 11.5px;
  color: #7A8299;
  margin: 0;
  line-height: 1.5;
}
.essn-time {
  font-size: 10.5px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}

/* Skeleton */
.essn-skeleton {
  display: grid;
  grid-template-columns: 4px 28px 1fr;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid #1C2030;
  align-items: center;
}
.essn-skel-bar {
  width: 3px;
  height: 30px;
  background: #1C2030;
  border-radius: 2px;
}
.essn-skel-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #1C2030;
  animation: essn-pulse 1.4s ease-in-out infinite;
}
.essn-skel-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.essn-skel-line {
  height: 9px;
  background: #1C2030;
  border-radius: 4px;
  animation: essn-pulse 1.4s ease-in-out infinite;
}
.w-2-3 { width: 66%; }
.w-1-2 { width: 50%; }

@keyframes essn-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* Empty */
.essn-empty {
  padding: 60px 20px;
  text-align: center;
}
.essn-empty-icon { font-size: 32px; margin-bottom: 10px; }
.essn-empty-text {
  font-size: 14px;
  color: #B6BED0;
  font-weight: 500;
}
.essn-empty-sub {
  font-size: 12px;
  color: #7A8299;
  margin-top: 4px;
}
</style>
