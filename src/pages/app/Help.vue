<script setup lang="ts">
defineOptions({ name: 'HelpPage' })
import { ref, computed } from 'vue'

interface Ticket {
  id: string
  title: string
  category: 'IT' | 'Payroll' | 'HR' | 'Finance'
  sla: string
  slaTone: 'ok' | 'warn' | 'err' | 'muted' | 'accent'
  from: string
  hue: number
  time: string
  priority: 'High' | 'Med' | 'Low'
}

const tickets = ref<Ticket[]>([
  { id: 'HD-1284', title: 'Laptop charger not working', category: 'IT', sla: '2h left', slaTone: 'warn', from: 'Ananya Iyer', hue: 200, time: '14m ago', priority: 'High' },
  { id: 'HD-1283', title: 'Form 16 download error', category: 'Payroll', sla: '4h left', slaTone: 'accent', from: 'Kabir Menon', hue: 280, time: '32m ago', priority: 'Med' },
  { id: 'HD-1282', title: 'Add bank account · spouse', category: 'HR', sla: '1d', slaTone: 'ok', from: 'Dev Malhotra', hue: 120, time: '1h ago', priority: 'Low' },
  { id: 'HD-1281', title: 'Reimburse client lunch', category: 'Finance', sla: 'Breach', slaTone: 'err', from: 'Rohan Kapoor', hue: 40, time: '3h ago', priority: 'High' },
  { id: 'HD-1280', title: 'Office WiFi password', category: 'IT', sla: 'Resolved', slaTone: 'muted', from: 'Zara Ali', hue: 60, time: 'Yesterday', priority: 'Low' },
])

const filters = [
  { label: 'All', count: 24 },
  { label: 'Mine', count: 6 },
  { label: 'Unassigned', count: 3 },
  { label: 'Breaching', count: 2, accent: 'err' as const },
]

const activeFilter = ref('All')
const selectedId = ref(tickets.value[0].id)

const selected = computed(() => tickets.value.find(t => t.id === selectedId.value) ?? tickets.value[0])

const messages = [
  { who: 'Ananya Iyer', hue: 200, time: '14m ago', body: "Charger stopped working this morning. The LED on the brick is off and the laptop isn't charging at all. I have a customer demo in 2 hours.", tag: 'Reporter', system: false },
  { who: 'Auto-router', hue: 250, time: '14m ago', body: 'Routed to IT · L1 queue based on category and asset tag.', tag: '', system: true },
  { who: 'Vikram (IT)', hue: 30, time: '8m ago', body: "Hi Ananya — sorry to hear that. We have a spare 96W USB-C brick in the asset locker on level 3. Can you swing by? I'll also raise an RMA with Apple in parallel.", tag: '', system: false },
]

const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
const avatarBg = (hue: number) => `hsl(${hue}, 50%, 35%)`
</script>

<template>
  <div class="hd-shell">
    <!-- Queue column -->
    <aside class="hd-queue">
      <div class="hd-queue-head">
        <div class="hd-title">Helpdesk</div>
        <div class="hd-filters">
          <button
            v-for="f in filters"
            :key="f.label"
            class="hd-chip"
            :class="{ active: activeFilter === f.label, err: f.accent === 'err' }"
            @click="activeFilter = f.label"
          >
            {{ f.label }}
            <span class="hd-chip-count">{{ f.count }}</span>
          </button>
        </div>
      </div>

      <div class="hd-queue-list">
        <button
          v-for="t in tickets"
          :key="t.id"
          class="hd-ticket"
          :class="{ active: t.id === selectedId }"
          @click="selectedId = t.id"
        >
          <div class="hd-ticket-row">
            <div class="hd-ticket-id">#{{ t.id }}</div>
            <span class="hd-badge" :class="`cat-${t.category.toLowerCase()}`">{{ t.category }}</span>
            <div class="hd-spacer" />
            <div class="hd-sla" :class="`tone-${t.slaTone}`">{{ t.sla }}</div>
          </div>
          <div class="hd-ticket-title">{{ t.title }}</div>
          <div class="hd-ticket-meta">
            <span class="hd-avatar hd-av-sm" :style="{ background: avatarBg(t.hue) }">{{ initials(t.from) }}</span>
            <span class="hd-from">{{ t.from }}</span>
            <span class="hd-dot">·</span>
            <span class="hd-time">{{ t.time }}</span>
          </div>
        </button>
      </div>
    </aside>

    <!-- Thread column -->
    <section class="hd-thread">
      <header class="hd-thread-head">
        <div class="hd-thread-title-wrap">
          <div class="hd-thread-title-row">
            <h2 class="hd-thread-title">{{ selected.title }}</h2>
            <span class="hd-badge cat-it">IT · L1</span>
            <span class="hd-badge tone-warn">{{ selected.priority }}</span>
          </div>
          <div class="hd-thread-sub">#{{ selected.id }} · Opened {{ selected.time }} by {{ selected.from }} · Asset MBP-3392</div>
        </div>
        <div class="hd-thread-actions">
          <button class="hd-btn hd-btn-secondary">Assign</button>
          <button class="hd-btn hd-btn-secondary">Snooze</button>
          <button class="hd-btn hd-btn-primary">Resolve</button>
        </div>
      </header>

      <div class="hd-thread-body">
        <div class="hd-thread-feed">
          <template v-for="(m, i) in messages" :key="i">
            <div v-if="m.system" class="hd-system-msg">
              <span class="hd-system-icon">⚡</span>
              <span>{{ m.body }}</span>
            </div>
            <div v-else class="hd-msg">
              <span class="hd-avatar hd-av-md" :style="{ background: avatarBg(m.hue) }">{{ initials(m.who) }}</span>
              <div class="hd-msg-body">
                <div class="hd-msg-head">
                  <span class="hd-msg-who">{{ m.who }}</span>
                  <span v-if="m.tag" class="hd-badge tone-neutral">{{ m.tag }}</span>
                  <span class="hd-msg-time">{{ m.time }}</span>
                </div>
                <p class="hd-msg-text">{{ m.body }}</p>
              </div>
            </div>
          </template>

          <div class="hd-reply">
            <div class="hd-reply-label">Reply to {{ selected.from }}…</div>
            <div class="hd-reply-actions">
              <button class="hd-btn hd-btn-ghost">Attach</button>
              <button class="hd-btn hd-btn-ghost">AI draft</button>
              <div class="hd-spacer" />
              <button class="hd-btn hd-btn-secondary">Save draft</button>
              <button class="hd-btn hd-btn-primary">Send reply →</button>
            </div>
          </div>
        </div>

        <aside class="hd-meta">
          <div class="hd-meta-block">
            <div class="hd-eyebrow">Reporter</div>
            <div class="hd-meta-row">
              <span class="hd-avatar hd-av-lg" :style="{ background: avatarBg(200) }">{{ initials(selected.from) }}</span>
              <div>
                <div class="hd-meta-name">{{ selected.from }}</div>
                <div class="hd-meta-sub">Sr. Engineer · Platform</div>
              </div>
            </div>
          </div>

          <div class="hd-meta-block">
            <div class="hd-eyebrow">Linked asset</div>
            <div class="hd-meta-card">
              <div class="hd-meta-name">MacBook Pro 14 · M3</div>
              <div class="hd-meta-mono">MBP-3392 · S/N C02XR</div>
            </div>
          </div>

          <div class="hd-meta-block">
            <div class="hd-eyebrow">SLA · High priority</div>
            <div class="hd-sla-row">
              <span>Response</span>
              <span class="tone-ok">Met · 6m</span>
            </div>
            <div class="hd-sla-row">
              <span>Resolution</span>
              <span class="tone-warn">2h 14m left</span>
            </div>
            <div class="hd-progress">
              <div class="hd-progress-bar" style="width: 50%; background: #F5A623;" />
            </div>
          </div>

          <div class="hd-meta-block">
            <div class="hd-eyebrow">Suggested article</div>
            <div class="hd-meta-card hd-meta-card-accent">
              <div class="hd-meta-name">Replacement laptop charger · process</div>
              <div class="hd-meta-sub">Knowledge base · 92% match</div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hd-shell {
  display: grid;
  grid-template-columns: 380px 1fr;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
  min-height: calc(100vh - 160px);
  color: #EEF0F4;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Queue */
.hd-queue {
  border-right: 1px solid #232936;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.hd-queue-head {
  padding: 16px 20px;
  border-bottom: 1px solid #232936;
}
.hd-title {
  font-family: 'Instrument Serif', serif;
  font-size: 26px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
}
.hd-filters {
  display: flex;
  gap: 5px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.hd-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #1C2030;
  border: 1px solid #232936;
  color: #7A8299;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}
.hd-chip.active {
  background: rgba(107, 91, 255, 0.18);
  border-color: #6B5BFF;
  color: #EEF0F4;
}
.hd-chip.err:not(.active) {
  color: #F38288;
}
.hd-chip-count {
  color: #7A8299;
  font-size: 10.5px;
}

.hd-queue-list {
  flex: 1;
  overflow: auto;
}
.hd-ticket {
  width: 100%;
  text-align: left;
  padding: 12px 20px;
  border: none;
  border-bottom: 1px solid #1C2030;
  border-left: 3px solid transparent;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  display: block;
}
.hd-ticket.active {
  background: rgba(107, 91, 255, 0.08);
  border-left-color: #6B5BFF;
}
.hd-ticket:hover:not(.active) {
  background: rgba(255, 255, 255, 0.02);
}
.hd-ticket-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.hd-ticket-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #7A8299;
}
.hd-spacer { flex: 1; }
.hd-sla {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
}
.hd-sla.tone-ok { color: #4DD39A; }
.hd-sla.tone-warn { color: #F5A623; }
.hd-sla.tone-err { color: #F38288; }
.hd-sla.tone-muted { color: #7A8299; }
.hd-sla.tone-accent { color: #6B5BFF; }

.hd-ticket-title {
  font-size: 13px;
  color: #EEF0F4;
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 1.35;
}
.hd-ticket-meta {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
}
.hd-from {
  font-size: 11px;
  color: #B6BED0;
}
.hd-dot, .hd-time {
  font-size: 10.5px;
  color: #7A8299;
}

/* Avatar */
.hd-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}
.hd-av-sm { width: 20px; height: 20px; font-size: 9px; }
.hd-av-md { width: 32px; height: 32px; font-size: 12px; }
.hd-av-lg { width: 36px; height: 36px; font-size: 13px; }

/* Badges */
.hd-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.cat-it { background: rgba(107, 91, 255, 0.18); color: #6B5BFF; }
.cat-payroll { background: rgba(77, 211, 154, 0.15); color: #4DD39A; }
.cat-hr { background: rgba(155, 110, 255, 0.15); color: #9B6EFF; }
.cat-finance { background: rgba(243, 130, 136, 0.15); color: #F38288; }
.tone-warn { background: rgba(245, 166, 35, 0.15); color: #F5A623; }
.tone-neutral { background: #1C2030; color: #B6BED0; }

/* Thread */
.hd-thread {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.hd-thread-head {
  padding: 16px 26px;
  border-bottom: 1px solid #232936;
  display: flex;
  align-items: center;
  gap: 12px;
}
.hd-thread-title-wrap { flex: 1; min-width: 0; }
.hd-thread-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.hd-thread-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #EEF0F4;
  margin: 0;
}
.hd-thread-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: #7A8299;
  margin-top: 5px;
}
.hd-thread-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.hd-btn {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.hd-btn-primary { background: #6B5BFF; color: #fff; }
.hd-btn-primary:hover { background: #5a4ce8; }
.hd-btn-secondary { background: #1C2030; color: #EEF0F4; border-color: #232936; }
.hd-btn-secondary:hover { border-color: #3a4258; }
.hd-btn-ghost { background: transparent; color: #B6BED0; }
.hd-btn-ghost:hover { background: #1C2030; }

.hd-thread-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
.hd-thread-feed {
  overflow: auto;
  padding: 22px 28px;
}

.hd-msg {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}
.hd-msg-body { flex: 1; }
.hd-msg-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hd-msg-who {
  font-size: 12.5px;
  font-weight: 600;
  color: #EEF0F4;
}
.hd-msg-time {
  font-size: 10.5px;
  color: #7A8299;
}
.hd-msg-text {
  font-size: 13px;
  color: #D8DCE6;
  line-height: 1.6;
  margin: 6px 0 0;
}

.hd-system-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 12px 0;
  background: #1C2030;
  border: 1px dashed #232936;
  border-radius: 6px;
  font-size: 11px;
  color: #B6BED0;
}
.hd-system-icon { color: #6B5BFF; }

.hd-reply {
  margin-top: 22px;
  padding: 14px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 8px;
}
.hd-reply-label {
  font-size: 12px;
  color: #7A8299;
  padding-bottom: 36px;
}
.hd-reply-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #232936;
}

/* Meta */
.hd-meta {
  border-left: 1px solid #232936;
  padding: 22px 18px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.hd-meta-block { display: flex; flex-direction: column; }
.hd-eyebrow {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7A8299;
  margin-bottom: 8px;
}
.hd-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hd-meta-name {
  font-size: 12.5px;
  font-weight: 500;
  color: #EEF0F4;
}
.hd-meta-sub {
  font-size: 10.5px;
  color: #7A8299;
  margin-top: 2px;
}
.hd-meta-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #7A8299;
  margin-top: 2px;
}
.hd-meta-card {
  padding: 10px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 6px;
}
.hd-meta-card-accent {
  background: rgba(107, 91, 255, 0.08);
  border-color: rgba(107, 91, 255, 0.35);
}

.hd-sla-row {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: #7A8299;
  margin-bottom: 6px;
}
.hd-sla-row .tone-ok { color: #4DD39A; }
.hd-sla-row .tone-warn { color: #F5A623; }
.hd-progress {
  margin-top: 6px;
  height: 4px;
  background: #232936;
  border-radius: 2px;
  overflow: hidden;
}
.hd-progress-bar {
  height: 100%;
  border-radius: 2px;
}

@media (max-width: 1100px) {
  .hd-shell { grid-template-columns: 1fr; min-height: auto; }
  .hd-queue { border-right: none; border-bottom: 1px solid #232936; }
  .hd-thread-body { grid-template-columns: 1fr; }
  .hd-meta { border-left: none; border-top: 1px solid #232936; }
}
</style>
