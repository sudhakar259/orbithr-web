<template>
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" :class="started ? 'backdrop-blur-sm md:backdrop-blur' : ''">
    <div class="w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-2xl">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 class="text-lg font-semibold text-slate-900">Welcome, Admin</h3>
        <button class="rounded-md p-2 text-slate-500 hover:bg-gray-50" @click="close()" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd"/></svg>
        </button>
      </div>
      <div class="px-5 py-4 space-y-4">
        <p class="text-slate-600">We will run initial setup for your workspace. You can track progress below.</p>
        <div class="rounded-lg border border-gray-200 p-3 bg-gray-50">
          <div class="h-2 w-full bg-gray-200 rounded">
            <div class="h-2 rounded bg-brand-600 transition-all" :style="{ width: progress + '%' }"></div>
          </div>
          <p class="mt-2 text-xs text-slate-600">{{ currentStep }}</p>
        </div>
        <ul class="text-sm text-slate-700 space-y-1">
          <li v-for="(s, i) in steps" :key="i" class="flex items-center gap-2">
            <span class="inline-flex h-4 w-4 items-center justify-center rounded-full text-white text-[10px]" :class="i < stepIndex ? 'bg-emerald-500' : 'bg-slate-300'">{{ i < stepIndex ? '✓' : i + 1 }}</span>
            <span>{{ s }}</span>
          </li>
        </ul>
        <div class="flex items-center gap-2 pt-2">
          <button v-if="!started" class="btn-primary" @click="start()">Start setup</button>
          <button v-else class="btn-ghost" disabled>Running…</button>
          <button class="btn-ghost" @click="skip()">Skip for now</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

interface Props { modelValue: boolean; autoStart?: boolean }
const props = withDefaults(defineProps<Props>(), { autoStart: true })
const emit = defineEmits(['update:modelValue', 'completed'])

const steps = [
  'Create base departments',
  'Seed default leave types',
  'Configure attendance rules',
  'Generate invite template',
]

const started = ref(false)
const progress = ref(0)
const stepIndex = ref(0)
const currentStep = ref('')
let timer: number | null = null

function start() {
  started.value = true
  stepIndex.value = 0
  progress.value = 0
  runNext()
}

function runNext() {
  if (stepIndex.value >= steps.length) {
    progress.value = 100
    emit('completed')
    setTimeout(() => close(), 500)
    return
  }
  currentStep.value = steps[stepIndex.value]
  let p = 0
  timer = window.setInterval(() => {
    p += 5
    progress.value = Math.min(100, (stepIndex.value / steps.length) * 100 + p / steps.length)
    if (p >= 100) {
      window.clearInterval(timer!)
      timer = null
      stepIndex.value += 1
      runNext()
    }
  }, 80)
}

function close() { emit('update:modelValue', false) }
function skip() { emit('update:modelValue', false) }

watch(() => props.modelValue, (v) => { if (v && props.autoStart && !started.value) start() })

onMounted(() => { if (props.modelValue && props.autoStart && !started.value) start() })
</script>
