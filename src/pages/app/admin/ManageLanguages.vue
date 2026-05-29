<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ name: 'ManageLanguages' })

interface Language {
  code: string
  name: string
  native: string
  flag: string
  enabled: boolean
  default: boolean
  coverage: number
}

const languages = ref<Language[]>([
  { code: 'en', name: 'English', native: 'English', flag: 'EN', enabled: true, default: true, coverage: 100 },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: 'HI', enabled: true, default: false, coverage: 96 },
  { code: 'fr', name: 'French', native: 'Français', flag: 'FR', enabled: true, default: false, coverage: 92 },
  { code: 'es', name: 'Spanish', native: 'Español', flag: 'ES', enabled: true, default: false, coverage: 88 },
  { code: 'de', name: 'German', native: 'Deutsch', flag: 'DE', enabled: false, default: false, coverage: 74 },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: 'PT', enabled: false, default: false, coverage: 68 },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: 'JA', enabled: false, default: false, coverage: 52 },
  { code: 'zh', name: 'Chinese', native: '中文', flag: 'ZH', enabled: false, default: false, coverage: 41 },
])

function toggle(lang: Language) {
  if (lang.default) return
  lang.enabled = !lang.enabled
}

function setDefault(lang: Language) {
  languages.value.forEach(l => (l.default = false))
  lang.default = true
  lang.enabled = true
}

const accentMap: Record<string, string> = {
  EN: '#6B5BFF', HI: '#F5C16E', FR: '#7ED7FF', ES: '#F38288',
  DE: '#4DD39A', PT: '#B28DFF', JA: '#9B6EFF', ZH: '#F38288',
}
</script>

<template>
  <div class="lang-shell">
    <header class="page-header">
      <div class="page-eyebrow">Workspace · Localization</div>
      <h1 class="page-title">Manage languages</h1>
      <p class="page-sub">Choose which languages are available to your tenants and set the workspace default.</p>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-eyebrow">Enabled</div>
        <div class="kpi-value">{{ languages.filter(l => l.enabled).length }}</div>
        <div class="kpi-sub">of {{ languages.length }} languages</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-eyebrow">Default</div>
        <div class="kpi-value" style="color:#6B5BFF">{{ languages.find(l => l.default)?.name || '—' }}</div>
        <div class="kpi-sub">Applied to new users</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-eyebrow">Avg coverage</div>
        <div class="kpi-value" style="color:#4DD39A">
          {{ Math.round(languages.filter(l => l.enabled).reduce((a, l) => a + l.coverage, 0) / Math.max(1, languages.filter(l => l.enabled).length)) }}%
        </div>
        <div class="kpi-sub">Across enabled set</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-eyebrow">Translation jobs</div>
        <div class="kpi-value">3</div>
        <div class="kpi-sub">Pending review</div>
      </div>
    </div>

    <section class="card">
      <div class="card-head">
        <h3 class="section-head">All languages</h3>
        <button class="btn btn-secondary">+ Add language</button>
      </div>

      <div class="lang-list">
        <div
          v-for="lang in languages"
          :key="lang.code"
          class="lang-row"
        >
          <div class="lang-flag" :style="{ background: (accentMap[lang.flag] || '#6B5BFF') + '22', borderColor: accentMap[lang.flag] || '#6B5BFF', color: accentMap[lang.flag] || '#6B5BFF' }">
            {{ lang.flag }}
          </div>

          <div class="lang-name">
            <div class="lang-en">
              {{ lang.name }}
              <span v-if="lang.default" class="badge accent">Default</span>
            </div>
            <div class="lang-native">{{ lang.native }} · {{ lang.code }}</div>
          </div>

          <div class="lang-coverage">
            <div class="cov-eyebrow">Coverage</div>
            <div class="cov-bar">
              <div
                class="cov-fill"
                :style="{
                  width: lang.coverage + '%',
                  background: lang.coverage > 90 ? '#4DD39A' : lang.coverage > 70 ? '#F5A623' : '#F38288'
                }"
              />
            </div>
            <div class="cov-num">{{ lang.coverage }}%</div>
          </div>

          <div class="lang-status">
            <span :class="['badge', lang.enabled ? 'ok' : 'neutral']">
              {{ lang.enabled ? 'Enabled' : 'Disabled' }}
            </span>
          </div>

          <div class="lang-actions">
            <button
              class="btn btn-ghost btn-xs"
              :disabled="lang.default"
              @click="setDefault(lang)"
            >
              Make default
            </button>
            <button
              type="button"
              class="toggle"
              :class="{ on: lang.enabled }"
              :disabled="lang.default"
              @click="toggle(lang)"
            >
              <span class="toggle-knob" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h3 class="section-head">Translation activity</h3>
      <div class="activity-list">
        <div class="activity-row">
          <span class="dot" style="background:#4DD39A" />
          <div class="activity-info">
            <div class="activity-title">Hindi · 14 strings updated</div>
            <div class="activity-sub">Auto-translated from English source · 2h ago</div>
          </div>
          <button class="btn btn-ghost btn-xs">Review</button>
        </div>
        <div class="activity-row with-border">
          <span class="dot" style="background:#F5A623" />
          <div class="activity-info">
            <div class="activity-title">French · awaiting human review</div>
            <div class="activity-sub">8 strings flagged for accuracy · yesterday</div>
          </div>
          <button class="btn btn-ghost btn-xs">Review</button>
        </div>
        <div class="activity-row with-border">
          <span class="dot" style="background:#6B5BFF" />
          <div class="activity-info">
            <div class="activity-title">German · added to workspace</div>
            <div class="activity-sub">Coverage at 74% · enable when ready</div>
          </div>
          <button class="btn btn-ghost btn-xs">Configure</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.lang-shell {
  background: #0D0F17;
  color: #EEF0F4;
  font-family: 'Inter', system-ui, sans-serif;
  padding: 24px 28px;
  min-height: calc(100vh - 120px);
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
  font-size: 32px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin: 4px 0;
}
.page-sub { font-size: 13px; color: #7A8299; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.kpi-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 14px;
}
.kpi-eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.kpi-value {
  font-family: 'Instrument Serif', serif;
  font-size: 28px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin-top: 4px;
}
.kpi-sub { font-size: 11px; color: #7A8299; }

.card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 16px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.section-head { font-size: 13.5px; font-weight: 600; color: #EEF0F4; margin: 0; }

.lang-list { display: flex; flex-direction: column; }
.lang-row {
  display: grid;
  grid-template-columns: 50px 1.6fr 1.5fr 110px 200px;
  align-items: center;
  gap: 14px;
  padding: 14px 4px;
  border-top: 1px solid #232936;
}
.lang-row:first-child { border-top: none; }

.lang-flag {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  border: 1px solid #6B5BFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.lang-en {
  font-size: 13.5px;
  color: #EEF0F4;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.lang-native {
  font-size: 11.5px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
  margin-top: 3px;
}

.lang-coverage { display: flex; flex-direction: column; gap: 4px; }
.cov-eyebrow {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.cov-bar {
  height: 5px;
  background: #232936;
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}
.cov-fill { height: 100%; transition: width 0.2s; }
.cov-num { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #B6BED0; }

.lang-status { text-align: center; }

.lang-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.badge.ok { background: rgba(77,211,154,0.12); color: #4DD39A; border: 1px solid rgba(77,211,154,0.25); }
.badge.accent { background: rgba(107,91,255,0.14); color: #6B5BFF; border: 1px solid rgba(107,91,255,0.3); }
.badge.neutral { background: #232936; color: #7A8299; border: 1px solid #2C3142; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: inherit;
}
.btn-secondary { background: rgba(255,255,255,0.04); border-color: #232936; color: #EEF0F4; }
.btn-secondary:hover { background: rgba(255,255,255,0.08); }
.btn-ghost { background: transparent; color: #B6BED0; }
.btn-ghost:hover:not(:disabled) { color: #EEF0F4; background: rgba(255,255,255,0.04); }
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-xs { padding: 4px 9px; font-size: 11px; }

.toggle {
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 10px;
  background: #2C3142;
  border: none;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.toggle.on { background: #6B5BFF; }
.toggle:disabled { opacity: 0.55; cursor: not-allowed; }
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

.activity-list { display: flex; flex-direction: column; }
.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}
.activity-row.with-border { border-top: 1px solid #232936; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.activity-info { flex: 1; }
.activity-title { font-size: 12.5px; color: #EEF0F4; }
.activity-sub { font-size: 11px; color: #7A8299; margin-top: 2px; }

@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .lang-row { grid-template-columns: 50px 1.4fr 1.2fr 110px 180px; }
}
@media (max-width: 720px) {
  .lang-row {
    grid-template-columns: 38px 1fr;
    grid-template-rows: auto auto auto;
    gap: 10px;
  }
  .lang-coverage, .lang-status, .lang-actions { grid-column: 1 / -1; }
}
</style>
