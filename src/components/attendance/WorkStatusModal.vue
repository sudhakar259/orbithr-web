<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="$emit('close')">
    <div class="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md mx-4 shadow-2xl">
      <form @submit.prevent="handleSubmit">
        <!-- Header -->
        <div class="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-700">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-900/50">
            <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-white">Check In</h3>
            <p class="text-xs text-gray-400">{{ currentTime }} · {{ currentDate }}</p>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 space-y-4">
          <!-- Task / What are you working on -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">What are you working on today?</label>
            <textarea
              v-model="task"
              rows="4"
              placeholder="Describe your tasks for today..."
              class="w-full bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              autofocus
            />
          </div>

          <!-- Location -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Location</label>
            <select
              v-model="location"
              class="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="office">Office</option>
              <option value="home">Work from Home</option>
              <option value="client_site">Client Site</option>
              <option value="field_work">Field Work</option>
              <option value="remote">Remote</option>
            </select>
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
            class="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {{ loading ? 'Checking In...' : 'Check In' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface PunchData {
  punch_type: 'check_in'
  attendance_date: string
  timestamp: string
  method: string
  location: string
  work_status: string
  notes?: string
}

defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: []; punch: [data: PunchData] }>()

const loading = ref(false)
const task = ref('')
const location = ref('office')

const currentTime = computed(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
const currentDate = computed(() => new Date().toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }))

const handleSubmit = () => {
  loading.value = true
  try {
    emit('punch', {
      punch_type: 'check_in',
      attendance_date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toTimeString().slice(0, 5),
      method: 'web',
      location: location.value,
      work_status: location.value,
      notes: task.value || undefined,
    })
  } finally {
    loading.value = false
    task.value = ''
    location.value = 'office'
  }
}
</script>
