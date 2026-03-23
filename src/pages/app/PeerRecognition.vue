<script setup lang="ts">
defineOptions({ name: 'PeerRecognition' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface Recognition {
  id: number
  giver_name: string
  receiver_name: string
  badge: string
  message: string
  created_at: string
}

interface Employee {
  id: number
  first_name: string
  last_name: string
  user_id: number | null
}

const activeTab = ref<'all' | 'received' | 'given'>('all')
const loading = ref(true)
const recognitions = ref<Recognition[]>([])
const showForm = ref(false)
const submitting = ref(false)
const employees = ref<Employee[]>([])

const form = ref({
  receiver_user_id: '',
  badge: 'star',
  message: '',
})

const badges: Record<string, { emoji: string; label: string }> = {
  star: { emoji: '\u2B50', label: 'Star' },
  rockstar: { emoji: '\uD83C\uDF1F', label: 'Rockstar' },
  innovator: { emoji: '\uD83D\uDCA1', label: 'Innovator' },
  teamplayer: { emoji: '\uD83E\uDD1D', label: 'Team Player' },
  leader: { emoji: '\uD83C\uDFC6', label: 'Leader' },
  above_and_beyond: { emoji: '\uD83D\uDE80', label: 'Above & Beyond' },
}

const endpoint = computed(() => {
  if (activeTab.value === 'received') return '/peer-recognition/received'
  if (activeTab.value === 'given') return '/peer-recognition/given'
  return '/peer-recognition'
})

async function fetchRecognitions() {
  loading.value = true
  try {
    const res = await api.get(endpoint.value)
    recognitions.value = res.data?.data ?? res.data ?? []
  } catch {
    recognitions.value = []
  } finally {
    loading.value = false
  }
}

async function fetchEmployees() {
  try {
    const res = await api.get('/employees', { params: { per_page: 100 } })
    employees.value = res.data?.data ?? res.data ?? []
  } catch {
    employees.value = []
  }
}

async function submitRecognition() {
  submitting.value = true
  try {
    await api.post('/peer-recognition', form.value)
    showForm.value = false
    form.value = { receiver_user_id: '', badge: 'star', message: '' }
    await fetchRecognitions()
  } catch {
    // error handled silently
  } finally {
    submitting.value = false
  }
}

function getBadge(key: string) {
  return badges[key] || { emoji: '\u2B50', label: key }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function switchTab(tab: 'all' | 'received' | 'given') {
  activeTab.value = tab
  fetchRecognitions()
}

onMounted(() => {
  fetchRecognitions()
  fetchEmployees()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="mt-1 text-sm text-gray-400">Celebrate your colleagues and their achievements</p>
      </div>
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        @click="showForm = !showForm"
      >
        {{ showForm ? 'Cancel' : 'Give Recognition' }}
      </button>
    </div>

    <!-- Give Recognition Form -->
    <div
      v-if="showForm"
      class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4"
    >
      <h3 class="text-lg font-semibold text-white">Recognize a Colleague</h3>
      <form class="space-y-4" @submit.prevent="submitRecognition">
        <div>
          <label class="mb-1 block text-sm text-gray-400">Who would you like to recognize?</label>
          <select
            v-model="form.receiver_user_id"
            required
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
          >
            <option value="" disabled>Select employee</option>
            <option
              v-for="emp in employees"
              :key="emp.id"
              :value="emp.user_id || emp.id"
            >
              {{ emp.first_name }} {{ emp.last_name }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm text-gray-400">Select a Badge</label>
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <button
              v-for="(b, key) in badges"
              :key="key"
              type="button"
              :class="[
                'flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors',
                form.badge === key
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 bg-gray-700 hover:border-gray-500',
              ]"
              @click="form.badge = key as string"
            >
              <span class="text-2xl">{{ b.emoji }}</span>
              <span class="text-xs text-gray-300">{{ b.label }}</span>
            </button>
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm text-gray-400">Message</label>
          <textarea
            v-model="form.message"
            rows="3"
            required
            placeholder="What did they do that was awesome?"
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="submitting"
            class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ submitting ? 'Sending...' : 'Send Recognition' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in (['all', 'received', 'given'] as const)"
          :key="tab"
          :class="[
            activeTab === tab
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500',
            'whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors capitalize',
          ]"
          @click="switchTab(tab)"
        >
          {{ tab === 'all' ? 'All Recognition' : tab === 'received' ? 'I Received' : 'I Gave' }}
        </button>
      </nav>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>

    <!-- Recognition Feed -->
    <div v-else-if="recognitions.length" class="space-y-4">
      <div
        v-for="r in recognitions"
        :key="r.id"
        class="rounded-lg border border-gray-700 bg-gray-800 p-5"
      >
        <div class="flex items-start gap-4">
          <span class="text-3xl">{{ getBadge(r.badge).emoji }}</span>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-gray-300">
              <span class="font-semibold text-white">{{ r.giver_name }}</span>
              <span class="mx-1 text-gray-500">recognized</span>
              <span class="font-semibold text-white">{{ r.receiver_name }}</span>
              <span class="ml-1 rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
                {{ getBadge(r.badge).label }}
              </span>
            </p>
            <p class="mt-2 text-sm text-gray-300">{{ r.message }}</p>
            <p class="mt-2 text-xs text-gray-500">{{ timeAgo(r.created_at) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800 py-16"
    >
      <p class="text-gray-400">No recognitions yet</p>
      <p class="mt-1 text-sm text-gray-500">Be the first to recognize a colleague</p>
    </div>
  </div>
</template>
