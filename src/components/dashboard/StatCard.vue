<template>
  <div class="stat-card" :style="{ animationDelay: delay + 'ms' }">
    <div class="sc-top">
      <div>
        <div class="sc-label">{{ title }}</div>
        <div class="sc-value">{{ formatted }}</div>
        <div class="sc-change" :class="deltaClass">{{ change }}</div>
      </div>
      <div class="sc-spark">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none">
          <polyline
            :points="sparkPoints"
            fill="none"
            :stroke="color"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'

interface Props {
  title: string
  value: number
  change: string
  points: number[]
  color?: string
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  color: 'var(--accent)',
  delay: 0,
})

const animated = reactive({ val: 0 })

function animateValue(start: number, end: number, duration: number) {
  let startTime: number | null = null
  function step(ts: number) {
    if (startTime === null) startTime = ts
    const p = Math.min((ts - startTime) / duration, 1)
    animated.val = Math.floor(p * (end - start) + start)
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => animateValue(0, props.value, 800))

const formatted = computed(() => formatCompact(animated.val))

const sparkPoints = computed(() =>
  props.points
    .map((p, i) => `${(i / Math.max(props.points.length - 1, 1)) * 100},${40 - (p / 100) * 40}`)
    .join(' '),
)

const deltaClass = computed(() =>
  props.change.trim().startsWith('-') ? 'neg' : 'pos',
)

function formatCompact(val: number): string {
  if (val === undefined || val === null) return '0'
  if (val >= 10000000) return (val / 10000000).toFixed(2) + ' Cr'
  if (val >= 100000)   return (val / 100000).toFixed(2) + ' L'
  if (val >= 1000)     return (val / 1000).toFixed(1) + 'K'
  return String(val)
}
</script>

<style scoped>
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 20px;
  animation: fadeUp .45s ease both;
  transition: box-shadow .2s, border-color .2s;
}
.stat-card:hover {
  border-color: var(--border-hi);
  box-shadow: 0 8px 24px rgba(0,0,0,.35);
}

.sc-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.sc-label {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 6px;
}

.sc-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -.5px;
  line-height: 1;
}

.sc-change {
  font-size: 12px;
  font-weight: 500;
  margin-top: 6px;
}
.sc-change.pos { color: var(--green); }
.sc-change.neg { color: var(--red); }

.sc-spark {
  width: 80px;
  height: 36px;
  flex-shrink: 0;
  opacity: .85;
}
.sc-spark svg {
  width: 100%;
  height: 100%;
}
</style>
