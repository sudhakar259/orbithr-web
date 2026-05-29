<script setup lang="ts">
/* eslint-disable vue/multi-word-component-names */
import { ref, computed } from 'vue'

interface NavItem {
  icon: string
  label: string
  key: string
}

interface NavSection {
  section: string
  items: NavItem[]
}

const navGroups: NavSection[] = [
  {
    section: 'Workspace',
    items: [
      { icon: 'briefcase', label: 'General', key: 'general' },
      { icon: 'edit', label: 'Branding', key: 'branding' },
      { icon: 'globe', label: 'Locale & timezone', key: 'locale' },
    ],
  },
  {
    section: 'Security',
    items: [
      { icon: 'shield', label: 'SSO & SCIM', key: 'sso' },
      { icon: 'key', label: 'Sessions & 2FA', key: 'sessions' },
      { icon: 'shield', label: 'Audit log', key: 'audit' },
      { icon: 'shield', label: 'Data residency', key: 'residency' },
    ],
  },
  {
    section: 'People',
    items: [
      { icon: 'briefcase', label: 'Departments', key: 'departments' },
      { icon: 'briefcase', label: 'Designations', key: 'designations' },
      { icon: 'box', label: 'Custom fields', key: 'fields' },
      { icon: 'calendar', label: 'Holiday calendar', key: 'holidays' },
    ],
  },
  {
    section: 'Integrations',
    items: [
      { icon: 'zap', label: 'Slack', key: 'slack' },
      { icon: 'zap', label: 'Google Workspace', key: 'google' },
      { icon: 'zap', label: 'GitHub', key: 'github' },
      { icon: 'zap', label: 'Razorpay payroll', key: 'razorpay' },
    ],
  },
  {
    section: 'Notifications',
    items: [
      { icon: 'mail', label: 'Email templates', key: 'email-tpl' },
      { icon: 'bell', label: 'Channels', key: 'channels' },
    ],
  },
]

const activeKey = ref<string>('general')

const identityFields = [
  { label: 'Workspace name', value: 'Crevol Labs Pvt Ltd', mono: false, action: '' },
  { label: 'Subdomain', value: 'crevollabs.orbithr.app', mono: true, action: 'Change' },
  { label: 'Primary contact', value: 'Sudhakar Singh · sudhakar@crevol.com', mono: false, action: '' },
  { label: 'Tax ID (GSTIN)', value: '29ABCDE1234F1Z5', mono: true, action: '' },
]

const accentColors = ['#6B5BFF', '#4DD39A', '#F5C16E', '#7ED7FF', '#F38288', '#B28DFF', '#3E7BFA']
const selectedAccent = ref(accentColors[0])

const localeFields = [
  { label: 'Default timezone', value: 'Asia/Kolkata · IST UTC+5:30' },
  { label: 'Default locale', value: 'English (India) · en-IN' },
  { label: 'Currency', value: '₹ Indian Rupee · INR' },
  { label: 'Date format', value: 'DD MMM YYYY · 22 Apr 2026' },
  { label: 'Week starts', value: 'Monday' },
]

interface SecurityRow {
  label: string
  sub: string
  on: boolean
}

const security = ref<SecurityRow[]>([
  { label: 'Single sign-on (SAML)', sub: 'Okta · 512 users provisioned', on: true },
  { label: 'SCIM auto-provisioning', sub: 'Daily sync · last 04:00 IST', on: true },
  { label: 'Two-factor required', sub: 'For all admins', on: true },
  { label: 'Session timeout', sub: '8 hours · refresh on activity', on: true },
  { label: 'IP allowlist', sub: 'Off · enable for VPN-only', on: false },
])

function toggleSecurity(idx: number) {
  security.value[idx].on = !security.value[idx].on
}

interface Integration {
  name: string
  color: string
  sub: string
  on: boolean
}

const integrations: Integration[] = [
  { name: 'Slack', color: '#611F69', sub: 'Notifications, approvals', on: true },
  { name: 'Google Workspace', color: '#4285F4', sub: 'SSO + calendar', on: true },
  { name: 'GitHub', color: '#1a1a1a', sub: 'Provisioning + offboard', on: true },
  { name: 'Razorpay payroll', color: '#0F2DAB', sub: 'Salary disbursement', on: true },
  { name: 'Zoom', color: '#2D8CFF', sub: 'Interview scheduling', on: false },
  { name: 'Microsoft 365', color: '#D83B01', sub: 'SSO · Outlook', on: false },
  { name: 'Greenhouse', color: '#24A47F', sub: 'ATS sync', on: false },
  { name: 'DocuSign', color: '#FFCC22', sub: 'Offer letters', on: true },
]

const activeBreadcrumb = computed(() => {
  for (const g of navGroups) {
    const found = g.items.find(i => i.key === activeKey.value)
    if (found) return `${g.section} · ${found.label}`
  }
  return 'Workspace · General'
})
</script>

<template>
  <div class="st-page">
    <div class="st-shell">
      <!-- Settings nav -->
      <aside class="st-nav">
        <div v-for="group in navGroups" :key="group.section" class="st-nav-group">
          <div class="st-nav-eyebrow">{{ group.section }}</div>
          <button
            v-for="item in group.items"
            :key="item.key"
            class="st-nav-item"
            :class="{ 'st-nav-item-active': activeKey === item.key }"
            @click="activeKey = item.key"
          >
            <span class="st-nav-ico" :class="{ 'st-nav-ico-active': activeKey === item.key }">
              <!-- briefcase -->
              <svg v-if="item.icon === 'briefcase'" width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="3" y="6" width="14" height="11" rx="2"/>
                <path d="M7 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              <!-- edit -->
              <svg v-else-if="item.icon === 'edit'" width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
              <!-- globe -->
              <svg v-else-if="item.icon === 'globe'" width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                <circle cx="10" cy="10" r="7"/>
                <path d="M3 10h14M10 3a11 11 0 010 14M10 3a11 11 0 000 14"/>
              </svg>
              <!-- shield -->
              <svg v-else-if="item.icon === 'shield'" width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M10 2l6 3v5c0 4-3 7-6 8-3-1-6-4-6-8V5l6-3z"/>
              </svg>
              <!-- key -->
              <svg v-else-if="item.icon === 'key'" width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                <circle cx="7" cy="13" r="3"/>
                <path d="M9.5 11l7-7M14 6l2 2"/>
              </svg>
              <!-- box -->
              <svg v-else-if="item.icon === 'box'" width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M3 7l7-3 7 3-7 3-7-3z"/>
                <path d="M3 7v7l7 3 7-3V7M10 10v7"/>
              </svg>
              <!-- calendar -->
              <svg v-else-if="item.icon === 'calendar'" width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="3" y="5" width="14" height="12" rx="1.5"/>
                <path d="M7 3v4M13 3v4M3 9h14"/>
              </svg>
              <!-- zap -->
              <svg v-else-if="item.icon === 'zap'" width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 2L3 12h6l-1 6 8-10h-6l1-6z"/>
              </svg>
              <!-- mail -->
              <svg v-else-if="item.icon === 'mail'" width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="3" y="5" width="14" height="11" rx="1.5"/>
                <path d="M3 6l7 5 7-5"/>
              </svg>
              <!-- bell -->
              <svg v-else width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                <path d="M5 8a5 5 0 0110 0v4l1.5 2H3.5L5 12V8z"/>
                <path d="M8 16a2 2 0 004 0"/>
              </svg>
            </span>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </aside>

      <!-- Settings content -->
      <main class="st-content">
        <header class="st-page-head">
          <div class="st-eyebrow">{{ activeBreadcrumb }}</div>
          <h1 class="st-title">General settings</h1>
          <p class="st-sub">Branding, locale, and core defaults that apply across Crevol Labs.</p>
        </header>

        <!-- Workspace identity -->
        <section class="st-card">
          <div class="st-section-head">
            <h2 class="st-section-title">Workspace identity</h2>
          </div>
          <div class="st-identity">
            <div class="st-identity-fields">
              <div v-for="f in identityFields" :key="f.label" class="st-field">
                <div class="st-field-label">{{ f.label }}</div>
                <div class="st-field-row">
                  <div class="st-field-value" :class="{ 'st-mono': f.mono }">{{ f.value }}</div>
                  <button v-if="f.action" class="btn-ghost-xs">{{ f.action }}</button>
                </div>
              </div>
            </div>
            <div class="st-logo-col">
              <div class="st-eyebrow-sm">Logo</div>
              <div class="st-logo-drop">
                <div class="st-logo-mark">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <ellipse cx="12" cy="12" rx="9" ry="4"/>
                    <ellipse cx="12" cy="12" rx="4" ry="9"/>
                  </svg>
                </div>
                <div class="st-logo-hint">PNG / SVG · 256x256</div>
              </div>
              <button class="btn-secondary st-replace-btn">
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3a1 1 0 01.78.375l4 5A1 1 0 0114 10h-3v6a1 1 0 11-2 0v-6H6a1 1 0 01-.78-1.625l4-5A1 1 0 0110 3z"/>
                </svg>
                Replace logo
              </button>
            </div>
          </div>
        </section>

        <!-- Branding -->
        <section class="st-card">
          <div class="st-section-head">
            <h2 class="st-section-title">Branding · accent color</h2>
          </div>
          <div class="st-color-row">
            <button
              v-for="c in accentColors"
              :key="c"
              class="st-swatch"
              :class="{ 'st-swatch-on': selectedAccent === c }"
              :style="{ background: c, boxShadow: selectedAccent === c ? `0 0 0 2px ${c}` : 'none' }"
              @click="selectedAccent = c"
            >
              <svg v-if="selectedAccent === c" width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 10l3 3 7-7"/>
              </svg>
            </button>
            <button class="st-swatch st-swatch-add">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 5v10M5 10h10"/>
              </svg>
            </button>
          </div>
        </section>

        <!-- Locale + Security -->
        <div class="st-grid-2">
          <section class="st-card">
            <div class="st-section-head">
              <h2 class="st-section-title">Locale & timezone</h2>
            </div>
            <div class="st-field" v-for="(f, i) in localeFields" :key="f.label" :style="{ marginTop: i === 0 ? 0 : '12px' }">
              <div class="st-field-label">{{ f.label }}</div>
              <div class="st-field-value">{{ f.value }}</div>
            </div>
          </section>

          <section class="st-card">
            <div class="st-section-head">
              <h2 class="st-section-title">Security highlights</h2>
              <span class="st-badge st-badge-ok">SOC 2 · ISO 27001</span>
            </div>
            <div
              v-for="(s, i) in security"
              :key="s.label"
              class="st-sec-row"
              :class="{ 'st-sec-row-bordered': i > 0 }"
            >
              <span class="st-sec-ico" :style="{ color: s.on ? '#4DD39A' : '#7A8299' }">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M10 2l6 3v5c0 4-3 7-6 8-3-1-6-4-6-8V5l6-3z"/>
                </svg>
              </span>
              <div class="st-sec-info">
                <div class="st-sec-label">{{ s.label }}</div>
                <div class="st-sec-sub">{{ s.sub }}</div>
              </div>
              <button class="st-toggle" :class="{ 'st-toggle-on': s.on }" @click="toggleSecurity(i)">
                <span class="st-toggle-knob"/>
              </button>
            </div>
          </section>
        </div>

        <!-- Integrations -->
        <section class="st-card">
          <div class="st-section-head">
            <h2 class="st-section-title">Integrations</h2>
            <button class="btn-ghost-sm">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 5v10M5 10h10"/>
              </svg>
              Browse marketplace
            </button>
          </div>
          <div class="st-int-grid">
            <div
              v-for="it in integrations"
              :key="it.name"
              class="st-int-card"
              :class="{ 'st-int-card-on': it.on }"
            >
              <div class="st-int-head">
                <div class="st-int-mark" :style="{ background: it.color }">{{ it.name[0] }}</div>
                <div class="st-int-name">{{ it.name }}</div>
                <svg v-if="it.on" width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="#4DD39A" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 10l3 3 7-7"/>
                </svg>
              </div>
              <div class="st-int-sub">{{ it.sub }}</div>
              <div class="st-int-foot">
                <div class="st-int-status" :class="{ 'st-int-status-on': it.on }">
                  {{ it.on ? 'Connected' : 'Not connected' }}
                </div>
                <button class="btn-ghost-xs">{{ it.on ? 'Manage' : 'Connect' }}</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.st-page {
  --st-bg: #0D0F17;
  --st-card: #161A23;
  --st-card-2: #1C2030;
  --st-card-3: #222840;
  --st-border: #232936;
  --st-border-hi: #2C3344;
  --st-text: #EEF0F4;
  --st-muted: #7A8299;
  --st-dim: #B5BAC8;
  --st-accent: #6B5BFF;
  --st-green: #4DD39A;
  --st-yellow: #F5A623;
  --st-red: #F38288;
  --font-serif: 'Instrument Serif', serif;
  --font-mono: 'JetBrains Mono', monospace;

  background: var(--st-bg);
  color: var(--st-text);
  border: 1px solid var(--st-border);
  border-radius: 14px;
  overflow: hidden;
}

.st-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: calc(100vh - 160px);
}

/* ── Nav ─────────────────────────────────────────────────────────── */
.st-nav {
  border-right: 1px solid var(--st-border);
  padding: 18px 12px;
  overflow: auto;
  background: var(--st-card);
}
.st-nav-group { margin-bottom: 14px; }
.st-nav-eyebrow {
  padding: 4px 10px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--st-muted);
  margin-bottom: 4px;
}
.st-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  font-size: 12.5px;
  border-radius: 6px;
  background: transparent;
  color: var(--st-dim);
  font-weight: 400;
  margin-top: 1px;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background .12s, color .12s;
}
.st-nav-item:hover { color: var(--st-text); background: var(--st-card-2); }
.st-nav-item-active {
  background: rgba(107, 91, 255, 0.18);
  color: var(--st-text);
  font-weight: 500;
}
.st-nav-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--st-muted);
}
.st-nav-ico-active { color: var(--st-accent); }

/* ── Content ─────────────────────────────────────────────────────── */
.st-content {
  overflow: auto;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.st-page-head { margin-bottom: 6px; }
.st-eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--st-muted);
  margin-bottom: 8px;
}
.st-eyebrow-sm {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--st-muted);
}
.st-title {
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 400;
  color: var(--st-text);
  letter-spacing: -0.01em;
  line-height: 1.1;
  margin: 0;
}
.st-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--st-muted);
}

/* ── Card ────────────────────────────────────────────────────────── */
.st-card {
  background: var(--st-card);
  border: 1px solid var(--st-border);
  border-radius: 12px;
  padding: 18px 20px;
}
.st-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.st-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--st-text);
  margin: 0;
  letter-spacing: -0.005em;
}

/* ── Identity ────────────────────────────────────────────────────── */
.st-identity {
  display: flex;
  gap: 24px;
}
.st-identity-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.st-field { display: flex; flex-direction: column; gap: 4px; }
.st-field-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--st-muted);
}
.st-field-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.st-field-value {
  font-size: 13px;
  color: var(--st-text);
  flex: 1;
  min-width: 0;
}
.st-mono {
  font-family: var(--font-mono);
  font-size: 12.5px;
  letter-spacing: -0.01em;
}
.st-logo-col {
  width: 240px;
  flex-shrink: 0;
}
.st-logo-drop {
  margin-top: 8px;
  height: 130px;
  background: var(--st-card-2);
  border: 1px dashed var(--st-border-hi);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
}
.st-logo-mark {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6B5BFF, #3E2FB8);
  display: flex;
  align-items: center;
  justify-content: center;
}
.st-logo-hint {
  font-size: 11px;
  color: var(--st-muted);
  font-family: var(--font-mono);
}
.st-replace-btn {
  width: 100%;
  margin-top: 8px;
  justify-content: center;
}

/* ── Color swatches ──────────────────────────────────────────────── */
.st-color-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.st-swatch {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: transform .12s;
}
.st-swatch:hover { transform: translateY(-1px); }
.st-swatch-on { border-color: #fff; }
.st-swatch-add {
  background: var(--st-card-2);
  border: 1px dashed var(--st-border-hi);
  color: var(--st-muted);
}

/* ── Grid ────────────────────────────────────────────────────────── */
.st-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ── Security ────────────────────────────────────────────────────── */
.st-badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}
.st-badge-ok {
  background: rgba(77, 211, 154, 0.14);
  color: var(--st-green);
  border: 1px solid rgba(77, 211, 154, 0.32);
}
.st-sec-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}
.st-sec-row-bordered { border-top: 1px solid var(--st-border); }
.st-sec-ico { display: inline-flex; flex-shrink: 0; }
.st-sec-info { flex: 1; min-width: 0; }
.st-sec-label { font-size: 12.5px; color: var(--st-text); font-weight: 500; }
.st-sec-sub { font-size: 11px; color: var(--st-muted); margin-top: 1px; }
.st-toggle {
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: var(--st-card-3);
  border: 1px solid var(--st-border-hi);
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background .15s, border-color .15s;
}
.st-toggle-on { background: rgba(107, 91, 255, 0.5); border-color: var(--st-accent); }
.st-toggle-knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--st-text);
  transition: transform .18s ease;
}
.st-toggle-on .st-toggle-knob { transform: translateX(14px); }

/* ── Integrations ────────────────────────────────────────────────── */
.st-int-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.st-int-card {
  padding: 12px;
  background: var(--st-card-2);
  border: 1px solid var(--st-border);
  border-radius: 10px;
}
.st-int-card-on { border-color: rgba(107, 91, 255, 0.45); }
.st-int-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.st-int-mark {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  font-family: var(--font-serif);
  flex-shrink: 0;
}
.st-int-name {
  flex: 1;
  font-size: 12.5px;
  color: var(--st-text);
  font-weight: 500;
  min-width: 0;
}
.st-int-sub {
  font-size: 11px;
  color: var(--st-muted);
  margin-top: 6px;
}
.st-int-foot {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.st-int-status {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--st-muted);
}
.st-int-status-on { color: var(--st-green); }

/* ── Buttons ─────────────────────────────────────────────────────── */
.btn-ghost-xs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  background: transparent;
  border: 1px solid var(--st-border-hi);
  color: var(--st-dim);
  cursor: pointer;
  transition: background .12s, color .12s;
}
.btn-ghost-xs:hover { background: var(--st-card-2); color: var(--st-text); }
.btn-ghost-sm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  border: 1px solid var(--st-border-hi);
  color: var(--st-dim);
  cursor: pointer;
  transition: background .12s, color .12s;
}
.btn-ghost-sm:hover { background: var(--st-card-2); color: var(--st-text); }
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  background: var(--st-card-2);
  border: 1px solid var(--st-border-hi);
  color: var(--st-text);
  cursor: pointer;
  transition: background .12s;
}
.btn-secondary:hover { background: var(--st-card-3); }

@media (max-width: 1100px) {
  .st-shell { grid-template-columns: 200px 1fr; }
  .st-int-grid { grid-template-columns: repeat(2, 1fr); }
  .st-grid-2 { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .st-shell { grid-template-columns: 1fr; }
  .st-nav { border-right: none; border-bottom: 1px solid var(--st-border); }
  .st-identity { flex-direction: column; }
  .st-logo-col { width: 100%; }
}
</style>
