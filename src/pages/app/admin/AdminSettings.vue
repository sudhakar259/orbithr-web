<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ name: 'AdminSettings' })

const sections = [
  {
    sec: 'Workspace',
    items: [
      { id: 'general', label: 'General', icon: 'briefcase', active: true },
      { id: 'branding', label: 'Branding', icon: 'edit' },
      { id: 'locale', label: 'Locale & timezone', icon: 'globe' },
    ],
  },
  {
    sec: 'Security',
    items: [
      { id: 'sso', label: 'SSO & SCIM', icon: 'shield' },
      { id: '2fa', label: 'Sessions & 2FA', icon: 'key' },
      { id: 'audit', label: 'Audit log', icon: 'shield' },
      { id: 'data', label: 'Data residency', icon: 'shield' },
    ],
  },
  {
    sec: 'People',
    items: [
      { id: 'depts', label: 'Departments', icon: 'briefcase' },
      { id: 'desigs', label: 'Designations', icon: 'briefcase' },
      { id: 'fields', label: 'Custom fields', icon: 'box' },
      { id: 'holidays', label: 'Holiday calendar', icon: 'calendar' },
    ],
  },
  {
    sec: 'Integrations',
    items: [
      { id: 'slack', label: 'Slack', icon: 'zap' },
      { id: 'gws', label: 'Google Workspace', icon: 'zap' },
      { id: 'gh', label: 'GitHub', icon: 'zap' },
      { id: 'razorpay', label: 'Razorpay payroll', icon: 'zap' },
    ],
  },
  {
    sec: 'Notifications',
    items: [
      { id: 'email', label: 'Email templates', icon: 'mail' },
      { id: 'channels', label: 'Channels', icon: 'bell' },
    ],
  },
]

const activeSection = ref('general')

const accents = ['#6B5BFF', '#4DD39A', '#F5C16E', '#7ED7FF', '#F38288', '#B28DFF', '#3E7BFA']
const selectedAccent = ref(0)

const securityItems = ref([
  { l: 'Single sign-on (SAML)', s: 'Okta · 512 users provisioned', on: true },
  { l: 'SCIM auto-provisioning', s: 'Daily sync · last 04:00 IST', on: true },
  { l: 'Two-factor required', s: 'For all admins', on: true },
  { l: 'Session timeout', s: '8 hours · refresh on activity', on: true },
  { l: 'IP allowlist', s: 'Off · enable for VPN-only', on: false },
])

const integrations = ref([
  { n: 'Slack', c: '#611F69', sub: 'Notifications, approvals', on: true },
  { n: 'Google Workspace', c: '#4285F4', sub: 'SSO + calendar', on: true },
  { n: 'GitHub', c: '#1a1a1a', sub: 'Provisioning + offboard', on: true },
  { n: 'Razorpay payroll', c: '#0F2DAB', sub: 'Salary disbursement', on: true },
  { n: 'Zoom', c: '#2D8CFF', sub: 'Interview scheduling', on: false },
  { n: 'Microsoft 365', c: '#D83B01', sub: 'SSO · Outlook', on: false },
  { n: 'Greenhouse', c: '#24A47F', sub: 'ATS sync', on: false },
  { n: 'DocuSign', c: '#FFCC22', sub: 'Offer letters', on: true },
])

function toggleSecurity(idx: number) {
  securityItems.value[idx].on = !securityItems.value[idx].on
}
</script>

<template>
  <div class="settings-shell">
    <!-- Settings nav -->
    <aside class="settings-rail">
      <div v-for="g in sections" :key="g.sec" class="rail-group">
        <div class="rail-eyebrow">{{ g.sec }}</div>
        <button
          v-for="it in g.items"
          :key="it.id"
          class="rail-item"
          :class="{ active: activeSection === it.id || it.active }"
          @click="activeSection = it.id"
        >
          <span class="rail-dot" :class="{ on: activeSection === it.id || it.active }" />
          <span class="rail-label">{{ it.label }}</span>
        </button>
      </div>
    </aside>

    <!-- Settings content -->
    <div class="settings-content">
      <header class="page-header">
        <div class="page-eyebrow">Workspace · General</div>
        <h1 class="page-title">General settings</h1>
        <p class="page-sub">Branding, locale, and core defaults that apply across your workspace.</p>
      </header>

      <!-- Workspace identity -->
      <section class="card">
        <h3 class="section-head">Workspace identity</h3>
        <div class="identity-grid">
          <div class="identity-fields">
            <div class="field">
              <div class="field-label">Workspace name</div>
              <div class="field-value">OrbitHR Workspace</div>
            </div>
            <div class="field">
              <div class="field-label">Subdomain</div>
              <div class="field-value mono">workspace.orbithr.app</div>
            </div>
            <div class="field">
              <div class="field-label">Primary contact</div>
              <div class="field-value">Admin · admin@orbithr.com</div>
            </div>
            <div class="field">
              <div class="field-label">Tax ID</div>
              <div class="field-value mono">29ABCDE1234F1Z5</div>
            </div>
          </div>
          <div class="logo-box">
            <div class="logo-eyebrow">Logo</div>
            <div class="logo-drop">
              <div class="logo-icon">O</div>
              <div class="logo-hint">PNG / SVG · 256×256</div>
            </div>
            <button class="btn btn-secondary btn-block">Replace logo</button>
          </div>
        </div>
      </section>

      <!-- Branding -->
      <section class="card">
        <h3 class="section-head">Branding · accent color</h3>
        <div class="accent-row">
          <button
            v-for="(c, i) in accents"
            :key="c"
            class="accent-swatch"
            :class="{ selected: selectedAccent === i }"
            :style="{ background: c }"
            @click="selectedAccent = i"
          >
            <span v-if="selectedAccent === i" class="accent-check">✓</span>
          </button>
          <button class="accent-swatch add">+</button>
        </div>
      </section>

      <!-- Locale + Security highlights -->
      <div class="dual-grid">
        <section class="card">
          <h3 class="section-head">Locale &amp; timezone</h3>
          <div class="field"><div class="field-label">Default timezone</div><div class="field-value">Asia/Kolkata · IST UTC+5:30</div></div>
          <div class="field"><div class="field-label">Default locale</div><div class="field-value">English (India) · en-IN</div></div>
          <div class="field"><div class="field-label">Currency</div><div class="field-value">₹ Indian Rupee · INR</div></div>
          <div class="field"><div class="field-label">Date format</div><div class="field-value">DD MMM YYYY · 22 Apr 2026</div></div>
          <div class="field"><div class="field-label">Week starts</div><div class="field-value">Monday</div></div>
        </section>

        <section class="card">
          <div class="section-head-row">
            <h3 class="section-head">Security highlights</h3>
            <span class="badge ok">SOC 2 · ISO 27001</span>
          </div>
          <div
            v-for="(s, i) in securityItems"
            :key="s.l"
            class="security-row"
            :class="{ 'with-border': i > 0 }"
          >
            <span class="security-icon" :class="{ on: s.on }">●</span>
            <div class="security-info">
              <div class="security-label">{{ s.l }}</div>
              <div class="security-sub">{{ s.s }}</div>
            </div>
            <button
              type="button"
              class="toggle"
              :class="{ on: s.on }"
              @click="toggleSecurity(i)"
            >
              <span class="toggle-knob" />
            </button>
          </div>
        </section>
      </div>

      <!-- Integrations -->
      <section class="card">
        <div class="section-head-row">
          <h3 class="section-head">Integrations</h3>
          <button class="btn btn-ghost">+ Browse marketplace</button>
        </div>
        <div class="integrations-grid">
          <div
            v-for="it in integrations"
            :key="it.n"
            class="integration-card"
            :class="{ on: it.on }"
          >
            <div class="integration-head">
              <div class="integration-logo" :style="{ background: it.c }">{{ it.n[0] }}</div>
              <div class="integration-name">{{ it.n }}</div>
              <span v-if="it.on" class="integration-check">✓</span>
            </div>
            <div class="integration-sub">{{ it.sub }}</div>
            <div class="integration-foot">
              <span class="integration-status" :class="{ on: it.on }">{{ it.on ? 'Connected' : 'Not connected' }}</span>
              <button class="btn btn-ghost btn-xs">{{ it.on ? 'Manage' : 'Connect' }}</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
  min-height: calc(100vh - 160px);
  color: #EEF0F4;
  font-family: 'Inter', system-ui, sans-serif;
}

.settings-rail {
  border-right: 1px solid #232936;
  padding: 18px 12px;
  overflow: auto;
}
.rail-group { margin-bottom: 14px; }
.rail-eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
  padding: 4px 10px 6px;
}
.rail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12.5px;
  color: #B6BED0;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  margin-top: 1px;
}
.rail-item:hover { background: rgba(255,255,255,0.03); }
.rail-item.active {
  background: rgba(107,91,255,0.14);
  color: #EEF0F4;
  font-weight: 500;
}
.rail-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3A4055;
}
.rail-dot.on { background: #6B5BFF; box-shadow: 0 0 0 3px rgba(107,91,255,0.18); }
.rail-label { flex: 1; }

.settings-content {
  overflow: auto;
  padding: 24px 32px;
}

.page-header { margin-bottom: 22px; }
.page-eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.page-title {
  font-family: 'Instrument Serif', serif;
  font-size: 30px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin: 4px 0 4px;
}
.page-sub { font-size: 13px; color: #7A8299; }

.card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 16px;
}
.section-head {
  font-size: 13.5px;
  font-weight: 600;
  color: #EEF0F4;
  margin: 0 0 14px;
}
.section-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.section-head-row .section-head { margin: 0; }

.identity-grid { display: flex; gap: 24px; }
.identity-fields { flex: 1; display: flex; flex-direction: column; gap: 14px; }
.logo-box { width: 240px; }
.logo-eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.logo-drop {
  margin-top: 8px;
  height: 130px;
  background: #0D0F17;
  border: 1px dashed #2C3142;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
}
.logo-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6B5BFF, #3E2FB8);
  color: #fff;
  font-family: 'Instrument Serif', serif;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-hint { font-size: 11px; color: #7A8299; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field-label {
  font-size: 11px;
  font-weight: 500;
  color: #7A8299;
}
.field + .field { margin-top: 12px; }
.field-value {
  font-size: 13px;
  color: #EEF0F4;
  padding: 8px 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid #232936;
  border-radius: 6px;
}
.field-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-secondary { background: rgba(255,255,255,0.04); border-color: #232936; color: #EEF0F4; }
.btn-secondary:hover { background: rgba(255,255,255,0.08); }
.btn-ghost { background: transparent; color: #B6BED0; }
.btn-ghost:hover { color: #EEF0F4; background: rgba(255,255,255,0.04); }
.btn-block { width: 100%; margin-top: 8px; }
.btn-xs { padding: 3px 8px; font-size: 11px; }

.accent-row { display: flex; gap: 8px; flex-wrap: wrap; }
.accent-swatch {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
}
.accent-swatch.selected { border-color: #fff; box-shadow: 0 0 0 2px #6B5BFF; }
.accent-swatch.add {
  background: rgba(255,255,255,0.04);
  border: 1px dashed #2C3142;
  color: #7A8299;
}
.accent-check { color: #fff; font-size: 14px; }

.dual-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.dual-grid .card { margin-bottom: 0; }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.badge.ok { background: rgba(77,211,154,0.12); color: #4DD39A; border: 1px solid rgba(77,211,154,0.25); }

.security-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}
.security-row.with-border { border-top: 1px solid #232936; }
.security-icon {
  font-size: 8px;
  color: #3A4055;
  width: 14px;
  text-align: center;
}
.security-icon.on { color: #4DD39A; }
.security-info { flex: 1; }
.security-label { font-size: 12.5px; color: #EEF0F4; }
.security-sub { font-size: 11px; color: #7A8299; margin-top: 2px; }

.toggle {
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 10px;
  background: #2C3142;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}
.toggle.on { background: #6B5BFF; }
.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s;
}
.toggle.on .toggle-knob { transform: translateX(14px); }

.integrations-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.integration-card {
  padding: 12px;
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 10px;
}
.integration-card.on { border-color: rgba(107,91,255,0.45); }
.integration-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.integration-logo {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  font-family: 'Instrument Serif', serif;
}
.integration-name { flex: 1; font-size: 12.5px; color: #EEF0F4; font-weight: 500; }
.integration-check { font-size: 12px; color: #4DD39A; }
.integration-sub { font-size: 11px; color: #7A8299; margin-top: 6px; }
.integration-foot {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.integration-status {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #7A8299;
}
.integration-status.on { color: #4DD39A; }

@media (max-width: 1100px) {
  .settings-shell { grid-template-columns: 200px 1fr; }
  .integrations-grid { grid-template-columns: repeat(2, 1fr); }
  .dual-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .settings-shell { grid-template-columns: 1fr; }
  .settings-rail { display: none; }
  .identity-grid { flex-direction: column; }
  .logo-box { width: 100%; }
}
</style>
