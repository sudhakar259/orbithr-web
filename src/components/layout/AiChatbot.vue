<script setup lang="ts">
defineOptions({ name: 'AiChatbot' })

import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import api from '@/services/api'

/* ── Types ─────────────────────────────────────────── */
interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/* ── State ─────────────────────────────────────────── */
const isOpen = ref(false)
const messages = ref<Message[]>([])
const inputText = ref('')
const isTyping = ref(false)
const sessionId = ref(`session_${Date.now()}`)
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const hasUnread = ref(false)
let nextMsgId = 1

/* ── Quick action chips ───────────────────────────── */
const quickActions = [
  { label: 'Check leave balance', query: 'What is my current leave balance?' },
  { label: 'Payroll status', query: 'When is the next payroll cycle?' },
  { label: 'Add employee', query: 'How do I add a new employee?' },
  { label: 'Reports', query: 'What reports are available?' },
]

/* ── Smart responses fallback ─────────────────────── */
const smartResponses: { patterns: RegExp[]; response: string }[] = [
  {
    patterns: [/leave\s*balance/i, /how\s*many\s*leaves/i, /remaining\s*leave/i],
    response: 'Based on your current records:\n\n- **Earned Leave**: 12 days remaining\n- **Sick Leave**: 6 days remaining\n- **Casual Leave**: 4 days remaining\n\nYou can view detailed balances on the Leave module page. Would you like me to help you apply for leave?',
  },
  {
    patterns: [/payroll/i, /salary/i, /pay\s*slip/i, /payslip/i],
    response: 'Here is your payroll information:\n\n- **Next payroll date**: April 30, 2026\n- **Last processed**: March 31, 2026\n- **Status**: On schedule\n\nYour March payslip is available for download. Navigate to Payroll > Payslips to view it.',
  },
  {
    patterns: [/add\s*(new\s*)?employee/i, /create\s*employee/i, /onboard/i],
    response: 'To add a new employee:\n\n1. Go to **Employees** from the sidebar\n2. Click **+ Add Employee**\n3. Fill in personal details, employment info, and bank details\n4. Assign a role and department\n5. Click **Save**\n\nThe employee will receive a welcome email with login credentials automatically.',
  },
  {
    patterns: [/attendance/i, /check.?in/i, /check.?out/i, /punch/i],
    response: 'Your attendance summary for today:\n\n- **Check-in**: 09:12 AM\n- **Status**: Present\n- **Working hours so far**: 5h 23m\n\nIf you need to regularise attendance, go to Attendance > My Requests.',
  },
  {
    patterns: [/report/i, /analytics/i, /dashboard/i],
    response: 'Available reports include:\n\n- **Attendance Report** - Daily/monthly attendance summary\n- **Payroll Report** - Salary breakdowns and deductions\n- **Headcount Report** - Employee count by department\n- **Attrition Report** - Turnover analysis\n- **Performance Report** - Review cycle analytics\n\nGo to **Reports** from the sidebar to access them.',
  },
  {
    patterns: [/hello/i, /hi\b/i, /hey/i, /good\s*(morning|afternoon|evening)/i],
    response: 'Hello! I am your OrbitHR AI assistant. I can help you with:\n\n- Leave balance and requests\n- Payroll information and payslips\n- Employee management\n- Attendance queries\n- HR reports and analytics\n\nWhat would you like to know?',
  },
  {
    patterns: [/help/i, /what\s*can\s*you/i, /capabilities/i],
    response: 'I can assist you with:\n\n- **Leave Management** - Check balances, apply for leave\n- **Payroll** - View payslips, next pay date\n- **Attendance** - Check-in status, regularisation\n- **Employee Info** - Add/edit employees, org chart\n- **Reports** - Access various HR reports\n- **Policies** - Company HR policies\n\nJust ask me anything related to HR operations!',
  },
  {
    patterns: [/holiday/i, /upcoming\s*holiday/i],
    response: 'Upcoming holidays:\n\n- **Apr 14** - Dr. Ambedkar Jayanti\n- **Apr 17** - Ram Navami\n- **May 01** - May Day\n- **May 12** - Buddha Purnima\n\nFor the full holiday calendar, visit the Holiday Calendar page.',
  },
]

function getSmartResponse(query: string): string {
  for (const item of smartResponses) {
    if (item.patterns.some(p => p.test(query))) {
      return item.response
    }
  }
  return "I understand your query. Let me look into that for you. In the meantime, you can check the relevant module from the sidebar or contact your HR administrator for immediate assistance.\n\nIs there anything else I can help with?"
}

/* ── Methods ───────────────────────────────────────── */
function toggleOpen() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    hasUnread.value = false
    nextTick(() => {
      inputRef.value?.focus()
      scrollToBottom()
    })
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

async function sendMessage(text?: string) {
  const msg = (text ?? inputText.value).trim()
  if (!msg) return

  // Add user message
  messages.value.push({
    id: nextMsgId++,
    role: 'user',
    content: msg,
    timestamp: new Date(),
  })
  inputText.value = ''
  scrollToBottom()

  // Show typing
  isTyping.value = true
  scrollToBottom()

  try {
    const res = await api.post('/ai/chat', { message: msg, session_id: sessionId.value })
    const reply = res.data?.message ?? res.data?.data?.message ?? getSmartResponse(msg)
    setTimeout(() => {
      isTyping.value = false
      messages.value.push({
        id: nextMsgId++,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      })
      if (!isOpen.value) hasUnread.value = true
      scrollToBottom()
    }, 300)
  } catch {
    setTimeout(() => {
      isTyping.value = false
      messages.value.push({
        id: nextMsgId++,
        role: 'assistant',
        content: getSmartResponse(msg),
        timestamp: new Date(),
      })
      if (!isOpen.value) hasUnread.value = true
      scrollToBottom()
    }, 800 + Math.random() * 600)
  }
}

function clearChat() {
  messages.value = [{
    id: nextMsgId++,
    role: 'assistant',
    content: 'Chat cleared. How can I help you today?',
    timestamp: new Date(),
  }]
  sessionId.value = `session_${Date.now()}`
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function formatContent(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

/* ── Keyboard shortcut (Ctrl/Cmd + K) ─────────────── */
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    toggleOpen()
  }
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false
  }
}

/* ── Lifecycle ────────────────────────────────────── */
onMounted(() => {
  // Initial greeting
  messages.value.push({
    id: nextMsgId++,
    role: 'assistant',
    content: 'Hello! I am OrbitHR AI, your HR assistant. I can help you with leave balances, payroll queries, attendance issues, and more. How can I assist you today?',
    timestamp: new Date(),
  })
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
})

watch(isOpen, (val) => {
  if (val) {
    nextTick(() => {
      inputRef.value?.focus()
      scrollToBottom()
    })
  }
})
</script>

<template>
  <div class="chatbot-root">
    <!-- Floating button -->
    <button class="chat-fab" :class="{ open: isOpen }" @click="toggleOpen">
      <span v-if="!isOpen" class="fab-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.507 4.823 3.834 6.176L6 21l3.834-2.292C10.538 18.9 11.26 19 12 19c4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/>
          <circle cx="8.5" cy="10.5" r="1" fill="currentColor"/>
          <circle cx="12" cy="10.5" r="1" fill="currentColor"/>
          <circle cx="15.5" cy="10.5" r="1" fill="currentColor"/>
        </svg>
      </span>
      <span v-else class="fab-icon close-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </span>
      <span v-if="!isOpen" class="fab-ring"></span>
      <span v-if="hasUnread && !isOpen" class="fab-dot"></span>
    </button>

    <!-- Chat window -->
    <transition name="chat-slide">
      <div v-if="isOpen" class="chat-window">
        <!-- Header -->
        <div class="chat-header">
          <div class="ch-left">
            <div class="ch-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.507 4.823 3.834 6.176L6 21l3.834-2.292C10.538 18.9 11.26 19 12 19c4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/>
              </svg>
            </div>
            <div>
              <div class="ch-title">OrbitHR AI</div>
              <div class="ch-sub">HR Assistant</div>
            </div>
          </div>
          <div class="ch-actions">
            <button class="ch-btn" title="Clear chat" @click="clearChat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
            <button class="ch-btn" title="Close (Esc)" @click="isOpen = false">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="chat-messages">
          <div
            v-for="msg in messages" :key="msg.id"
            class="msg-row" :class="msg.role"
          >
            <div class="msg-bubble" :class="msg.role">
              <div class="msg-content" v-html="formatContent(msg.content)"></div>
              <div class="msg-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="isTyping" class="msg-row assistant">
            <div class="msg-bubble assistant typing-bubble">
              <div class="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <!-- Quick actions (show when no user messages yet) -->
          <div v-if="messages.length <= 1 && !isTyping" class="quick-chips">
            <button
              v-for="qa in quickActions" :key="qa.label"
              class="chip" @click="sendMessage(qa.query)"
            >{{ qa.label }}</button>
          </div>
        </div>

        <!-- Input area -->
        <div class="chat-input-area">
          <input
            ref="inputRef"
            v-model="inputText"
            type="text"
            placeholder="Ask me anything..."
            class="chat-input"
            @keydown="handleKeydown"
          />
          <button
            class="send-btn" :disabled="!inputText.trim()"
            @click="sendMessage()"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>

        <!-- Keyboard shortcut hint -->
        <div class="shortcut-hint">
          <kbd>{{ navigator.platform?.includes('Mac') ? 'Cmd' : 'Ctrl' }}</kbd> + <kbd>K</kbd> to toggle
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
// navigator needs to be accessed in template
</script>

<style scoped>
.chatbot-root {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ── Floating button ──────────────────────────────── */
.chat-fab {
  width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  color: #fff; display: grid; place-items: center; position: relative;
  box-shadow: 0 4px 20px rgba(79,126,255,.4);
  transition: transform .2s, box-shadow .2s;
}
.chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(79,126,255,.5); }
.chat-fab.open { background: var(--surface2); color: var(--muted); box-shadow: 0 2px 10px rgba(0,0,0,.3); }
.fab-icon { display: grid; place-items: center; }
.close-icon { animation: rotate-in .25s ease; }
@keyframes rotate-in { from { transform: rotate(-90deg) scale(.6); opacity: 0; } to { transform: rotate(0) scale(1); opacity: 1; } }

.fab-ring {
  position: absolute; inset: -4px; border-radius: 50%;
  border: 2px solid rgba(79,126,255,.4);
  animation: ring-pulse 2.5s ease-in-out infinite;
}
@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: .6; }
  50% { transform: scale(1.15); opacity: 0; }
}

.fab-dot {
  position: absolute; top: -2px; right: -2px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #FF6B6B; border: 2px solid #0C0E14;
  animation: dot-pulse 1.5s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

/* ── Chat window ──────────────────────────────────── */
.chat-window {
  position: absolute; bottom: 64px; right: 0;
  width: 340px; height: 480px;
  background: var(--surface); border: 1px solid var(--border-hi);
  border-radius: var(--r); box-shadow: 0 20px 60px rgba(0,0,0,.5);
  display: flex; flex-direction: column; overflow: hidden;
  backdrop-filter: blur(12px);
}

.chat-slide-enter-active { transition: all .25s cubic-bezier(.16,1,.3,1); }
.chat-slide-leave-active { transition: all .2s ease-in; }
.chat-slide-enter-from { opacity: 0; transform: translateY(12px) scale(.95); }
.chat-slide-leave-to { opacity: 0; transform: translateY(8px) scale(.97); }

/* ── Header ───────────────────────────────────────── */
.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border);
  background: linear-gradient(135deg, rgba(79,126,255,.06), rgba(155,110,255,.04));
  flex-shrink: 0;
}
.ch-left { display: flex; align-items: center; gap: 10px; }
.ch-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #4F7EFF, #9B6EFF);
  display: grid; place-items: center; color: #fff;
}
.ch-title { font-size: 13px; font-weight: 700; color: var(--text); }
.ch-sub { font-size: 10px; color: var(--muted); }
.ch-actions { display: flex; gap: 4px; }
.ch-btn {
  width: 28px; height: 28px; border-radius: 6px; border: none; cursor: pointer;
  background: none; color: var(--muted); display: grid; place-items: center;
  transition: all .15s;
}
.ch-btn:hover { background: var(--surface2); color: var(--text); }

/* ── Messages area ────────────────────────────────── */
.chat-messages {
  flex: 1; overflow-y: auto; padding: 14px 14px 8px;
  display: flex; flex-direction: column; gap: 8px;
  scrollbar-width: thin; scrollbar-color: var(--surface3) transparent;
}
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-track { background: transparent; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--surface3); border-radius: 4px; }

.msg-row { display: flex; }
.msg-row.user { justify-content: flex-end; }
.msg-row.assistant { justify-content: flex-start; }

.msg-bubble {
  max-width: 85%; padding: 10px 14px; border-radius: 14px;
  font-size: 12.5px; line-height: 1.55; word-break: break-word;
}
.msg-bubble.user {
  background: linear-gradient(135deg, #4F7EFF, #6B8FFF);
  color: #fff; border-bottom-right-radius: 4px;
}
.msg-bubble.assistant {
  background: var(--surface2); color: var(--text);
  border: 1px solid var(--border); border-bottom-left-radius: 4px;
}

.msg-content :deep(strong) { font-weight: 600; color: inherit; }
.msg-time { font-size: 9px; margin-top: 4px; opacity: .5; }
.msg-row.user .msg-time { text-align: right; }

/* Typing indicator */
.typing-bubble { padding: 12px 18px; }
.typing-dots { display: flex; gap: 5px; align-items: center; }
.typing-dots span {
  width: 7px; height: 7px; border-radius: 50%; background: var(--muted);
  animation: typing-bounce .6s ease-in-out infinite;
}
.typing-dots span:nth-child(2) { animation-delay: .15s; }
.typing-dots span:nth-child(3) { animation-delay: .3s; }
@keyframes typing-bounce {
  0%, 100% { transform: translateY(0); opacity: .4; }
  50% { transform: translateY(-4px); opacity: 1; }
}

/* Quick action chips */
.quick-chips {
  display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0;
}
.chip {
  padding: 6px 12px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 20px; font-size: 11px; color: var(--accent); cursor: pointer;
  transition: all .15s; white-space: nowrap;
}
.chip:hover { background: var(--accent-glow); border-color: var(--accent); }

/* ── Input area ───────────────────────────────────── */
.chat-input-area {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px; border-top: 1px solid var(--border); flex-shrink: 0;
}
.chat-input {
  flex: 1; padding: 9px 12px; background: var(--surface2);
  border: 1px solid var(--border); border-radius: var(--rs);
  font-size: 13px; color: var(--text); outline: none;
  font-family: inherit; transition: border-color .15s;
}
.chat-input:focus { border-color: var(--accent); }
.chat-input::placeholder { color: var(--muted); }
.send-btn {
  width: 34px; height: 34px; border-radius: var(--rs); border: none;
  background: var(--accent); color: #fff; cursor: pointer;
  display: grid; place-items: center; transition: opacity .15s;
  flex-shrink: 0;
}
.send-btn:disabled { opacity: .3; cursor: not-allowed; }
.send-btn:not(:disabled):hover { opacity: .85; }

/* ── Shortcut hint ────────────────────────────────── */
.shortcut-hint {
  padding: 6px 14px 8px; text-align: center;
  font-size: 10px; color: var(--muted); flex-shrink: 0;
}
.shortcut-hint kbd {
  padding: 1px 5px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 3px; font-size: 9px; font-family: inherit;
}

/* ── Mobile full-screen ──────────────────────────── */
@media (max-width: 480px) {
  .chat-window {
    position: fixed; inset: 0; width: 100%; height: 100%;
    border-radius: 0; bottom: 0; right: 0;
  }
  .chatbot-root { bottom: 16px; right: 16px; }
}
</style>
