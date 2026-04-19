<script setup lang="ts">
defineOptions({ name: 'TeamPolls' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface PollOption {
  id: number
  text: string
  votes_count: number
}

interface Poll {
  id: number
  question: string
  description: string | null
  options: PollOption[]
  is_multiple_choice: boolean
  is_anonymous: boolean
  ends_at: string | null
  total_votes: number
  user_voted: boolean
  user_vote_option_ids: number[]
  is_closed: boolean
  is_mine: boolean
  created_by_name: string
  created_at: string
}

const activeTab = ref<'active' | 'mine'>('active')
const loading = ref(true)
const polls = ref<Poll[]>([])
const showCreateForm = ref(false)
const submitting = ref(false)
const votingId = ref<number | null>(null)
const selectedOptions = ref<Record<number, number[]>>({})

const form = ref({
  question: '',
  description: '',
  options: ['', ''],
  is_multiple_choice: false,
  is_anonymous: false,
  ends_at: '',
})

const displayedPolls = computed(() => {
  if (activeTab.value === 'mine') return polls.value.filter((p) => p.is_mine)
  return polls.value.filter((p) => !p.is_closed)
})

async function fetchPolls() {
  loading.value = true
  try {
    const res = await api.get('/polls')
    polls.value = res.data?.data ?? res.data ?? []
  } catch {
    polls.value = []
  } finally {
    loading.value = false
  }
}

function addOption() {
  form.value.options.push('')
}

function removeOption(idx: number) {
  if (form.value.options.length <= 2) return
  form.value.options.splice(idx, 1)
}

async function createPoll() {
  submitting.value = true
  try {
    await api.post('/polls', {
      ...form.value,
      options: form.value.options.filter((o) => o.trim()),
    })
    showCreateForm.value = false
    form.value = {
      question: '',
      description: '',
      options: ['', ''],
      is_multiple_choice: false,
      is_anonymous: false,
      ends_at: '',
    }
    await fetchPolls()
  } catch {
    // error handled silently
  } finally {
    submitting.value = false
  }
}

function toggleOption(pollId: number, optionId: number, isMultiple: boolean) {
  if (!selectedOptions.value[pollId]) {
    selectedOptions.value[pollId] = []
  }
  const arr = selectedOptions.value[pollId]
  const idx = arr.indexOf(optionId)
  if (isMultiple) {
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(optionId)
  } else {
    selectedOptions.value[pollId] = [optionId]
  }
}

function isSelected(pollId: number, optionId: number) {
  return selectedOptions.value[pollId]?.includes(optionId) ?? false
}

async function vote(poll: Poll) {
  const opts = selectedOptions.value[poll.id]
  if (!opts?.length) return
  votingId.value = poll.id
  try {
    await api.post(`/polls/${poll.id}/vote`, { option_ids: opts })
    await fetchPolls()
  } catch {
    // error handled silently
  } finally {
    votingId.value = null
  }
}

async function closePoll(id: number) {
  try {
    await api.post(`/polls/${id}/close`)
    await fetchPolls()
  } catch {
    // error handled silently
  }
}

function votePercentage(option: PollOption, total: number) {
  if (total === 0) return 0
  return Math.round((option.votes_count / total) * 100)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

onMounted(fetchPolls)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="mt-1 text-sm text-gray-400">Create and participate in team polls</p>
      </div>
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        @click="showCreateForm = !showCreateForm"
      >
        {{ showCreateForm ? 'Cancel' : 'Create Poll' }}
      </button>
    </div>

    <!-- Create Form -->
    <div
      v-if="showCreateForm"
      class="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4"
    >
      <h3 class="text-lg font-semibold text-white">New Poll</h3>
      <form class="space-y-4" @submit.prevent="createPoll">
        <div>
          <label class="mb-1 block text-sm text-gray-400">Question</label>
          <input
            v-model="form.question"
            type="text"
            required
            placeholder="What do you want to ask?"
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-400">Description (optional)</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="Add more context..."
            class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
        <div>
          <label class="mb-2 block text-sm text-gray-400">Options</label>
          <div v-for="(_, idx) in form.options" :key="idx" class="mb-2 flex items-center gap-2">
            <input
              v-model="form.options[idx]"
              type="text"
              required
              :placeholder="'Option ' + (idx + 1)"
              class="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500"
            />
            <button
              v-if="form.options.length > 2"
              type="button"
              class="text-red-400 hover:text-red-300 text-sm"
              @click="removeOption(idx)"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            class="text-sm text-blue-400 hover:text-blue-300"
            @click="addOption"
          >
            + Add Option
          </button>
        </div>
        <div class="flex flex-wrap gap-6">
          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input
              v-model="form.is_multiple_choice"
              type="checkbox"
              class="rounded border-gray-600 bg-gray-700"
            />
            Multiple choice
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input
              v-model="form.is_anonymous"
              type="checkbox"
              class="rounded border-gray-600 bg-gray-700"
            />
            Anonymous
          </label>
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-400">Ends At</label>
          <input
            v-model="form.ends_at"
            type="date"
            class="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
          />
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="submitting"
            class="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ submitting ? 'Creating...' : 'Create Poll' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <nav class="-mb-px flex space-x-8">
        <button
          :class="[
            activeTab === 'active'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500',
            'whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
          ]"
          @click="activeTab = 'active'"
        >
          Active Polls
        </button>
        <button
          :class="[
            activeTab === 'mine'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500',
            'whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors',
          ]"
          @click="activeTab = 'mine'"
        >
          My Polls
        </button>
      </nav>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>

    <!-- Polls Grid -->
    <div v-else-if="displayedPolls.length" class="grid gap-4 md:grid-cols-2">
      <div
        v-for="poll in displayedPolls"
        :key="poll.id"
        class="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-4"
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-semibold text-white">{{ poll.question }}</h3>
            <p v-if="poll.description" class="mt-1 text-sm text-gray-400">
              {{ poll.description }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="poll.is_closed" class="rounded-full bg-gray-500/20 px-2 py-0.5 text-xs text-gray-400">
              Closed
            </span>
            <button
              v-if="poll.is_mine && !poll.is_closed"
              class="text-xs text-gray-400 hover:text-gray-200"
              @click="closePoll(poll.id)"
            >
              Close
            </button>
          </div>
        </div>

        <!-- Vote options (user has not voted yet) -->
        <div v-if="!poll.user_voted && !poll.is_closed" class="space-y-2">
          <button
            v-for="opt in poll.options"
            :key="opt.id"
            :class="[
              'w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors',
              isSelected(poll.id, opt.id)
                ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500',
            ]"
            @click="toggleOption(poll.id, opt.id, poll.is_multiple_choice)"
          >
            {{ opt.text }}
          </button>
          <button
            :disabled="!selectedOptions[poll.id]?.length || votingId === poll.id"
            class="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            @click="vote(poll)"
          >
            {{ votingId === poll.id ? 'Voting...' : 'Vote' }}
          </button>
        </div>

        <!-- Results (user voted or poll closed) -->
        <div v-else class="space-y-2">
          <div v-for="opt in poll.options" :key="opt.id" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-300">{{ opt.text }}</span>
              <span class="text-gray-400">{{ votePercentage(opt, poll.total_votes) }}%</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                class="h-full rounded-full bg-blue-500 transition-all duration-300"
                :style="{ width: votePercentage(opt, poll.total_votes) + '%' }"
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>{{ poll.total_votes }} vote{{ poll.total_votes !== 1 ? 's' : '' }}</span>
          <div class="flex items-center gap-3">
            <span v-if="poll.is_anonymous">Anonymous</span>
            <span v-if="poll.ends_at">Ends {{ new Date(poll.ends_at).toLocaleDateString() }}</span>
            <span>{{ timeAgo(poll.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800 py-16"
    >
      <p class="text-gray-400">No polls found</p>
      <p class="mt-1 text-sm text-gray-500">Create a poll to get started</p>
    </div>
  </div>
</template>
