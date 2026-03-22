<script setup lang="ts">
defineOptions({ name: 'AtsEmailInbox' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ComposeEmailModal from '@/components/recruitment/ComposeEmailModal.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

// ── Types ──────────────────────────────────────────────
interface EmailMessage {
  id: number
  thread_id: number
  direction: 'inbound' | 'outbound'
  sender_email: string
  recipient_email?: string
  subject?: string
  body_html: string
  sent_at: string
  is_read: boolean
}

interface EmailThread {
  id: number
  candidate_id: number
  candidate_name: string
  subject: string
  last_message_at: string
  messages_count: number
  unread_count: number
  last_message_preview?: string
  messages?: EmailMessage[]
}

interface EmailAccount {
  id: number
  display_name: string
  email_address: string
  is_active: boolean
}

// ── State ──────────────────────────────────────────────
const threads = ref<EmailThread[]>([])
const selectedThread = ref<EmailThread | null>(null)
const loadingThreads = ref(true)
const loadingDetail = ref(false)
const candidateFilter = ref('')
const showCompose = ref(false)
const accounts = ref<EmailAccount[]>([])

// Reply state
const replySubject = ref('')
const replyBody = ref('')
const replyAccountId = ref<number | null>(null)
const sendingReply = ref(false)

// ── Computed ───────────────────────────────────────────
const filteredThreads = computed(() => {
  if (!candidateFilter.value) return threads.value
  const q = candidateFilter.value.toLowerCase()
  return threads.value.filter(t => t.candidate_name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
})

// ── Helpers ────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function truncate(str: string | undefined, len: number): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

// ── API ────────────────────────────────────────────────
async function loadThreads() {
  loadingThreads.value = true
  try {
    const res = await api.get('/email-integration/threads')
    threads.value = res.data?.data ?? res.data ?? []
  } catch {
    threads.value = []
  } finally {
    loadingThreads.value = false
  }
}

async function loadAccounts() {
  try {
    const res = await api.get('/email-integration/accounts')
    accounts.value = (res.data?.data ?? res.data ?? []).filter((a: EmailAccount) => a.is_active)
    if (accounts.value.length && !replyAccountId.value) {
      replyAccountId.value = accounts.value[0].id
    }
  } catch { /* ignore */ }
}

async function selectThread(thread: EmailThread) {
  selectedThread.value = thread
  replySubject.value = thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`
  replyBody.value = ''
  loadingDetail.value = true
  try {
    const res = await api.get(`/email-integration/threads/${thread.id}`)
    const data = res.data?.data ?? res.data
    selectedThread.value = data
  } catch {
    toast.error('Failed to load thread')
  } finally {
    loadingDetail.value = false
  }
}

async function sendReply() {
  if (!selectedThread.value || !replyBody.value || !replyAccountId.value) return
  sendingReply.value = true
  try {
    await api.post(`/email-integration/threads/${selectedThread.value.id}/reply`, {
      subject: replySubject.value,
      body_html: replyBody.value,
      account_integration_id: replyAccountId.value,
    })
    toast.success('Reply sent')
    replyBody.value = ''
    await selectThread(selectedThread.value)
  } catch {
    toast.error('Failed to send reply')
  } finally {
    sendingReply.value = false
  }
}

async function applyReplyTemplate() {
  // load templates inline
  try {
    const res = await api.get('/candidate-emails/templates')
    const list = res.data?.data ?? res.data ?? []
    if (!list.length) { toast.info('No templates available'); return }
    // pick first available as a quick action; in future could open picker
    const tpl = list[0]
    const cId = selectedThread.value?.candidate_id
    if (cId) {
      try {
        const resolved = await api.get('/candidate-emails/resolve-template', { params: { template_id: tpl.id, candidate_id: cId } })
        const d = resolved.data?.data ?? resolved.data
        if (d?.subject) replySubject.value = d.subject
        if (d?.body) replyBody.value = d.body
      } catch {
        if (tpl.body) replyBody.value = tpl.body
      }
    } else {
      if (tpl.body) replyBody.value = tpl.body
    }
    toast.info(`Template "${tpl.name}" applied`)
  } catch { toast.error('Failed to load templates') }
}

function handleComposeSent() {
  showCompose.value = false
  loadThreads()
}

onMounted(() => {
  loadThreads()
  loadAccounts()
})
</script>

<template>
  <div class="inbox-page">
    <PageHeader title="Email Inbox" subtitle="Threaded email conversations with candidates">
      <template #actions>
        <button class="btn-primary" @click="showCompose = true">+ Compose Email</button>
      </template>
    </PageHeader>

    <div class="inbox-grid">
      <!-- Left: Thread list -->
      <div class="thread-list-pane">
        <div class="thread-search">
          <input v-model="candidateFilter" class="input" placeholder="Filter by candidate or subject..." />
        </div>

        <div v-if="loadingThreads" class="loading-area">
          <div class="skel" /><div class="skel" /><div class="skel" />
        </div>

        <div v-else-if="!filteredThreads.length" class="empty-area">
          <EmptyState icon="\u2709\uFE0F" message="No email threads" sub="Compose an email to start a conversation." />
        </div>

        <div v-else class="thread-list">
          <button
            v-for="t in filteredThreads" :key="t.id"
            :class="['thread-row', selectedThread?.id === t.id && 'thread-active']"
            @click="selectThread(t)"
          >
            <div class="thread-avatar">{{ initials(t.candidate_name) }}</div>
            <div class="thread-body">
              <div class="thread-header">
                <span class="thread-name">{{ t.candidate_name }}</span>
                <span class="thread-time">{{ timeAgo(t.last_message_at) }}</span>
              </div>
              <div class="thread-subject">{{ truncate(t.subject, 50) }}</div>
              <div class="thread-preview">{{ truncate(t.last_message_preview, 80) }}</div>
            </div>
            <span v-if="t.unread_count" class="unread-badge">{{ t.unread_count }}</span>
          </button>
        </div>
      </div>

      <!-- Right: Thread detail -->
      <div class="thread-detail-pane">
        <div v-if="!selectedThread" class="empty-detail">
          <EmptyState icon="\uD83D\uDCE8" message="Select a thread" sub="Choose a conversation from the list to view messages." />
        </div>

        <template v-else>
          <div class="detail-header">
            <h3 class="detail-subject">{{ selectedThread.subject }}</h3>
            <span class="detail-count">{{ selectedThread.messages_count ?? selectedThread.messages?.length ?? 0 }} messages</span>
          </div>

          <div v-if="loadingDetail" class="loading-area detail-loading">
            <div class="skel" /><div class="skel short" />
          </div>

          <div v-else class="messages-area">
            <div
              v-for="msg in (selectedThread.messages ?? [])" :key="msg.id"
              :class="['message-bubble', msg.direction === 'outbound' ? 'msg-out' : 'msg-in']"
            >
              <div class="msg-meta">
                <span class="msg-sender">{{ msg.direction === 'outbound' ? 'You' : msg.sender_email }}</span>
                <span class="msg-time">{{ formatTimestamp(msg.sent_at) }}</span>
              </div>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="msg-body" v-html="msg.body_html" />
            </div>

            <div v-if="!(selectedThread.messages ?? []).length" class="no-messages">
              No messages in this thread yet.
            </div>
          </div>

          <!-- Reply box -->
          <div class="reply-box">
            <div class="reply-toolbar">
              <button class="btn-outline-sm" @click="applyReplyTemplate">Use Template</button>
              <select v-model="replyAccountId" class="input reply-account">
                <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.email_address }}</option>
              </select>
            </div>
            <div class="reply-subject-row">
              <input v-model="replySubject" class="input" placeholder="Subject" />
            </div>
            <textarea v-model="replyBody" class="input reply-textarea" placeholder="Write your reply..." />
            <div class="reply-actions">
              <button class="btn-send" :disabled="sendingReply || !replyBody" @click="sendReply">
                <span v-if="sendingReply" class="spinner" /> Send Reply
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <ComposeEmailModal :visible="showCompose" @close="showCompose = false" @sent="handleComposeSent" />
  </div>
</template>

<style scoped>
.inbox-page { --bg:#0C0E14; --surface:#141720; --surface2:#1C2030; --surface3:#222840; --accent:#4F7EFF; --green:#36D399; --yellow:#F9A825; --red:#FF6B6B; --purple:#9B6EFF; --text:#E8EAF0; --muted:#6B7280; --border:rgba(255,255,255,.08); --border-hi:rgba(255,255,255,.14); --r:10px; }

.inbox-grid { display: grid; grid-template-columns: 360px 1fr; gap: 0; margin-top: 20px; border: 1px solid var(--border-hi); border-radius: var(--r); overflow: hidden; min-height: 600px; }
@media (max-width: 900px) { .inbox-grid { grid-template-columns: 1fr; min-height: auto; } }

/* Thread list pane */
.thread-list-pane { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
.thread-search { padding: 14px 14px 0; }
.input { padding: 9px 12px; font-size: 13px; color: var(--text); background: var(--surface2); border: 1px solid var(--border-hi); border-radius: 8px; outline: none; transition: border-color .14s; width: 100%; box-sizing: border-box; }
.input:focus { border-color: var(--accent); }
.input::placeholder { color: var(--muted); }

.loading-area { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.skel { height: 60px; background: var(--surface2); border-radius: 8px; animation: pulse 1.5s infinite; }
.skel.short { height: 40px; width: 70%; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
.empty-area { padding: 30px 16px; }
.detail-loading { padding: 20px; }

.thread-list { flex: 1; overflow-y: auto; padding: 10px 0; }
.thread-row { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; width: 100%; background: none; border: none; border-left: 3px solid transparent; cursor: pointer; text-align: left; transition: all .1s; position: relative; }
.thread-row:hover { background: var(--surface2); }
.thread-active { background: var(--surface2); border-left-color: var(--accent); }
.thread-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--surface3); color: var(--muted); font-size: 12px; font-weight: 700; display: grid; place-items: center; flex-shrink: 0; }
.thread-body { flex: 1; min-width: 0; }
.thread-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.thread-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.thread-time { font-size: 11px; color: var(--muted); flex-shrink: 0; }
.thread-subject { font-size: 12px; color: var(--text); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: .85; }
.thread-preview { font-size: 11px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.unread-badge { position: absolute; top: 14px; right: 14px; min-width: 18px; height: 18px; background: var(--accent); color: #fff; font-size: 10px; font-weight: 700; border-radius: 99px; display: grid; place-items: center; padding: 0 5px; }

/* Thread detail pane */
.thread-detail-pane { background: var(--bg); display: flex; flex-direction: column; }
.empty-detail { flex: 1; display: grid; place-items: center; }
.detail-header { padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.detail-subject { font-size: 16px; font-weight: 700; color: var(--text); }
.detail-count { font-size: 12px; color: var(--muted); }

.messages-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.message-bubble { max-width: 80%; padding: 12px 16px; border-radius: 12px; }
.msg-out { align-self: flex-end; background: var(--surface2); border-bottom-right-radius: 4px; }
.msg-in { align-self: flex-start; background: var(--surface3); border-bottom-left-radius: 4px; }
.msg-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.msg-sender { font-size: 12px; font-weight: 600; color: var(--accent); }
.msg-in .msg-sender { color: var(--purple); }
.msg-time { font-size: 10px; color: var(--muted); }
.msg-body { font-size: 13px; color: var(--text); line-height: 1.6; word-break: break-word; }
.msg-body :deep(p) { margin: 0 0 8px; }
.msg-body :deep(a) { color: var(--accent); }
.no-messages { text-align: center; font-size: 13px; color: var(--muted); padding: 40px 0; }

/* Reply box */
.reply-box { border-top: 1px solid var(--border); padding: 16px 20px; background: var(--surface); display: flex; flex-direction: column; gap: 10px; }
.reply-toolbar { display: flex; align-items: center; gap: 10px; }
.btn-outline-sm { padding: 6px 14px; font-size: 12px; font-weight: 500; color: var(--accent); background: transparent; border: 1px solid var(--accent); border-radius: 6px; cursor: pointer; transition: all .14s; flex-shrink: 0; }
.btn-outline-sm:hover { background: rgba(79,126,255,.08); }
.reply-account { flex: 1; max-width: 280px; appearance: none; cursor: pointer; }
select.input { appearance: none; cursor: pointer; }
.reply-subject-row { /* simple wrapper */ }
.reply-textarea { min-height: 120px; resize: vertical; font-family: inherit; line-height: 1.5; }
.reply-actions { display: flex; justify-content: flex-end; }

.btn-primary { padding: 8px 20px; font-size: 13px; font-weight: 600; background: var(--accent); color: #fff; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: opacity .14s; }
.btn-primary:hover { opacity: .85; }

.btn-send { padding: 8px 20px; font-size: 13px; font-weight: 600; background: var(--accent); color: #fff; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: opacity .14s; }
.btn-send:hover:not(:disabled) { opacity: .85; }
.btn-send:disabled { opacity: .5; cursor: not-allowed; }

.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.2); border-top-color: currentColor; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
