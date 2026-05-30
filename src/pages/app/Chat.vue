<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

defineOptions({ name: 'ChatPage' })

interface ChatMessage {
  id: number | string
  author: string
  body: string
  time: string
  self?: boolean
}

interface Channel {
  key: string
  name: string
  type?: string
}

const router = useRouter()

const channels = ref<Channel[]>([])
const activeChannel = ref('')

const moduleActive = ref(true)
const loading = ref(true)
const messagesLoading = ref(false)
const sending = ref(false)
const notice = ref('')
const draft = ref('')
const threadRef = ref<HTMLElement | null>(null)

const messages = ref<ChatMessage[]>([])

async function loadMessages(key: string) {
  messagesLoading.value = true
  try {
    const res = await api.get(`/chat/channels/${key}/messages`)
    messages.value = Array.isArray(res.data?.data) ? res.data.data : []
    await scrollToBottom()
  } catch {
    messages.value = []
  } finally {
    messagesLoading.value = false
  }
}

async function selectChannel(key: string) {
  if (key === activeChannel.value) return
  activeChannel.value = key
  await loadMessages(key)
}

async function scrollToBottom() {
  await nextTick()
  if (threadRef.value) {
    threadRef.value.scrollTop = threadRef.value.scrollHeight
  }
}

function now(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  sending.value = true
  notice.value = ''

  try {
    const res = await api.post('/chat/messages', { channel: activeChannel.value, body: text })
    const created = res.data?.data
    if (created) {
      messages.value.push(created as ChatMessage)
    } else {
      messages.value.push({ id: `local-${Date.now()}`, author: 'You', body: text, time: now(), self: true })
    }
    draft.value = ''
    await scrollToBottom()
  } catch {
    notice.value = 'Real-time chat requires the Chat module subscription'
  } finally {
    sending.value = false
  }
}

function goToMarketplace() {
  router.push({ name: 'marketplace' })
}

onMounted(async () => {
  try {
    const res = await api.get('/chat/channels')
    channels.value = Array.isArray(res.data?.data) ? res.data.data : []
    if (channels.value.length) {
      activeChannel.value = channels.value[0].key
      await loadMessages(activeChannel.value)
    }
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      moduleActive.value = false
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="chat-wrap">
    <!-- Initial loading state -->
    <div v-if="loading" class="chat-loading">Loading chat…</div>

    <!-- Empty state when module not active -->
    <div v-else-if="!moduleActive" class="chat-empty">
      <div class="empty-icon">💬</div>
      <h2 class="empty-title">Chat module not yet activated</h2>
      <p class="empty-sub">Activate the Chat module to start real-time messaging with your team.</p>
      <button class="empty-btn" @click="goToMarketplace">Go to Marketplace</button>
    </div>

    <!-- Active chat UI -->
    <div v-else class="chat-grid">
      <!-- Channels panel -->
      <aside class="channels">
        <div class="channels-head">Channels</div>
        <button
          v-for="ch in channels"
          :key="ch.key"
          class="channel"
          :class="{ active: ch.key === activeChannel }"
          @click="selectChannel(ch.key)"
        >
          <span class="hash">#</span>{{ ch.name }}
        </button>
      </aside>

      <!-- Messages panel -->
      <section class="messages">
        <header class="msg-head">
          <span class="hash">#</span>{{ activeChannel }}
        </header>

        <div ref="threadRef" class="thread">
          <div v-if="messagesLoading" class="thread-loading">Loading messages…</div>
          <div v-else-if="!messages.length" class="thread-loading">No messages yet. Say hello!</div>
          <div
            v-for="m in messages"
            :key="m.id"
            class="msg"
            :class="{ self: m.self }"
          >
            <div class="msg-meta">
              <span class="msg-author">{{ m.author }}</span>
              <span class="msg-time">{{ m.time }}</span>
            </div>
            <div class="msg-bubble">{{ m.body }}</div>
          </div>
        </div>

        <div v-if="notice" class="notice">{{ notice }}</div>

        <form class="composer" @submit.prevent="send">
          <input
            v-model="draft"
            class="composer-input"
            type="text"
            :placeholder="`Message #${activeChannel}`"
          />
          <button class="composer-btn" type="submit" :disabled="!draft.trim() || sending">
            {{ sending ? 'Sending…' : 'Send' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.chat-wrap {
  --bg: #0C0E14;
  --surface: #141720;
  --surface2: #1C2030;
  --surface3: #222840;
  --accent: #4F7EFF;
  --green: #36D399;
  --text: #E8EAF0;
  --muted: #6B7280;
  height: calc(100vh - 120px);
  min-height: 480px;
  color: var(--text);
}

.chat-grid {
  display: flex;
  height: 100%;
  border: 1px solid var(--surface3);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
}

/* Channels panel */
.channels {
  flex: 0 0 250px;
  background: var(--bg);
  border-right: 1px solid var(--surface3);
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.channels-head {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  padding: 4px 10px 10px;
}
.channel {
  text-align: left;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 14px;
  font-family: inherit;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all .14s;
}
.channel:hover { background: var(--surface2); color: var(--text); }
.channel.active { background: var(--surface3); color: var(--text); }
.hash { color: var(--muted); margin-right: 6px; }
.channel.active .hash { color: var(--accent); }

/* Messages panel */
.messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.msg-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--surface3);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.thread {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.msg { max-width: 70%; }
.msg.self { align-self: flex-end; text-align: right; }
.msg-meta { display: flex; gap: 8px; margin-bottom: 4px; font-size: 11px; }
.msg.self .msg-meta { justify-content: flex-end; }
.msg-author { color: var(--text); font-weight: 600; }
.msg-time { color: var(--muted); }
.msg-bubble {
  display: inline-block;
  background: var(--surface2);
  border: 1px solid var(--surface3);
  border-radius: 10px;
  padding: 9px 13px;
  font-size: 14px;
  color: var(--text);
  text-align: left;
}
.msg.self .msg-bubble {
  background: rgba(79,126,255,.18);
  border-color: rgba(79,126,255,.35);
}

.notice {
  margin: 0 18px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--green);
  background: rgba(54,211,153,.1);
  border: 1px solid rgba(54,211,153,.25);
  border-radius: 8px;
}

.composer {
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid var(--surface3);
}
.composer-input {
  flex: 1;
  background: var(--surface2);
  border: 1px solid var(--surface3);
  border-radius: 10px;
  padding: 11px 14px;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color .15s;
}
.composer-input:focus { border-color: var(--accent); }
.composer-input::placeholder { color: var(--muted); }
.composer-btn {
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
}
.composer-btn:disabled { opacity: .4; cursor: not-allowed; }

/* Empty state */
.chat-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid var(--surface3);
  border-radius: 12px;
  background: var(--surface);
  text-align: center;
  padding: 24px;
}
.chat-loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--muted);
  border: 1px solid var(--surface3);
  border-radius: 12px;
  background: var(--surface);
}
.thread-loading {
  margin: auto;
  font-size: 13px;
  color: var(--muted);
}
.empty-icon { font-size: 42px; }
.empty-title { font-size: 20px; font-weight: 700; color: var(--text); }
.empty-sub { font-size: 14px; color: var(--muted); max-width: 360px; }
.empty-btn {
  margin-top: 10px;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 11px 22px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all .15s;
}
.empty-btn:hover { transform: translateY(-1px); }
</style>
