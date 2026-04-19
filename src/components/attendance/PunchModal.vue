<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="$emit('close')">
    <div class="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
      <form @submit.prevent="handleSubmit">
        <!-- Header -->
        <div class="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-700">
          <div class="flex h-10 w-10 items-center justify-center rounded-full" :class="isCheckOut ? 'bg-red-900/50' : 'bg-blue-900/50'">
            <svg class="h-5 w-5" :class="isCheckOut ? 'text-red-400' : 'text-blue-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="isCheckOut" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-white">{{ isCheckOut ? 'Check Out' : 'Check In' }}</h3>
            <p class="text-xs text-gray-400">{{ currentTime }} · {{ currentDate }}</p>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">
              {{ isCheckOut ? 'What did you accomplish today?' : 'What are you working on?' }}
            </label>
            <textarea
              v-model="notes"
              rows="4"
              :placeholder="isCheckOut ? 'Summarise what you worked on today...' : 'Describe your tasks for today...'"
              class="w-full bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              autofocus
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 px-6 pb-6">
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            :class="isCheckOut ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'"
          >
            {{ loading ? 'Recording...' : (isCheckOut ? 'Check Out' : 'Check In') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  show: boolean
  punchType?: 'check_in' | 'check_out'
}

interface PunchData {
  punch_type: 'check_in' | 'check_out'
  attendance_date: string
  timestamp: string
  method: string
  notes?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ close: []; punch: [data: PunchData] }>()

const loading = ref(false)
const notes = ref('')

const isCheckOut = computed(() => props.punchType === 'check_out')
const currentTime = computed(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
const currentDate = computed(() => new Date().toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }))

watch(() => props.show, (val) => { if (!val) notes.value = '' })

const handleSubmit = () => {
  loading.value = true
  try {
    emit('punch', {
      punch_type: props.punchType ?? 'check_in',
      attendance_date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toTimeString().slice(0, 5),
      method: 'web',
      notes: notes.value || undefined,
    })
  } finally {
    loading.value = false
  }
}
</script>
