<template>
  <div class="stat-card" :style="{ '--delay': `${delay}s` }">
    <div class="sc-head">
      <div class="sc-icon" :class="color">{{ icon }}</div>
      <span v-if="change" class="sc-change" :class="changeUp ? 'up' : 'dn'">
        {{ changeUp ? '↑' : '↓' }} {{ change }}
      </span>
    </div>
    <div class="sc-val">{{ value }}</div>
    <div class="sc-label">{{ label }}</div>
    <div v-if="sub" class="sc-sub">{{ sub }}</div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  icon: string
  label: string
  value: string | number
  change?: string
  changeUp?: boolean
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  sub?: string
  delay?: number
}>(), { color: 'blue', delay: 0, changeUp: true })
</script>

<style scoped>
.stat-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  padding: 20px; cursor: default; transition: border-color .2s, transform .2s;
  animation: fadeUp .4s ease var(--delay) both;
}
@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.stat-card:hover { border-color: var(--border-hi); transform: translateY(-2px); }
.sc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sc-icon { width: 42px; height: 42px; border-radius: 11px; display: grid; place-items: center; font-size: 18px; flex-shrink: 0; }
.sc-icon.blue   { background: rgba(79,126,255,.12); }
.sc-icon.green  { background: rgba(54,211,153,.12); }
.sc-icon.yellow { background: rgba(249,168,37,.12); }
.sc-icon.red    { background: rgba(255,107,107,.12); }
.sc-icon.purple { background: rgba(155,110,255,.12); }
.sc-change { font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 20px; }
.sc-change.up { background: rgba(54,211,153,.12); color: #36D399; }
.sc-change.dn { background: rgba(255,107,107,.12); color: #FF6B6B; }
.sc-val   { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 3px; letter-spacing: -1px; color: var(--text); }
.sc-label { font-size: 12px; color: var(--muted); }
.sc-sub   { font-size: 11px; color: var(--dim); margin-top: 2px; }
</style>
