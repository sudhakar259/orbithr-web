<template>
  <div class="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-md border border-gray-100 hover:shadow-xl transition">
    <div class="p-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500">{{ title }}</div>
          <div class="mt-2 text-3xl font-extrabold text-gray-800">{{ formatted }}</div>
          <div class="mt-1 text-xs font-medium" :class="deltaColor">{{ change }}</div>
        </div>
        <div class="w-24 h-12 opacity-80">
          <svg class="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
            <polyline :points="sparkPoints" fill="none" :stroke="color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
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
}

const props = withDefaults(defineProps<Props>(), { color: '#6D5EF6' })
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

const formatted = computed(() => formatCompactNumber(animated.val))
const trend = computed(() => {
  const arr = props.points
  if (!arr.length) return 0
  const first = arr[0]
  const last = arr[arr.length - 1]
  return Math.round(((last - first) / (first || 1)) * 100)
})

const sparkPoints = computed(() =>
  props.points.map((p, i) => `${(i / Math.max(props.points.length - 1, 1)) * 100},${40 - (p / 100) * 40}`).join(' '),
)
const areaPoints = computed(() =>
  props.points.map((p, i) => `${(i / Math.max(props.points.length - 1, 1)) * 600},${200 - (p / 100) * 200}`).join(' '),
)

const deltaColor = computed(() => (props.change.trim().startsWith('-') ? 'text-rose-600' : 'text-emerald-600'))

function formatCompactNumber(val?: number): string {
  if (val === undefined || val === null) return '0'
  if (val >= 10000000) return (val / 10000000).toFixed(2) + ' Cr'
  if (val >= 100000) return (val / 100000).toFixed(2) + ' L'
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K'
  return String(val)
}
</script>
