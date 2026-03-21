<script setup lang="ts">
defineOptions({ name: 'EssTickets' })
import { ref, onMounted } from 'vue'
import { essService, type HrTicket } from '@/services/essService'

const loading = ref(true)
const saving = ref(false)
const commenting = ref(false)
const error = ref('')
const tickets = ref<HrTicket[]>([])
const selected = ref<HrTicket | null>(null)
const showForm = ref(false)
const newComment = ref('')
const filterStatus = ref('')

const form = ref({ category: 'general', subject: '', description: '', priority: 'medium' })

const categories = ['leave', 'payroll', 'attendance', 'policy', 'general', 'other']
const priorities = ['low', 'medium', 'high', 'urgent']

const load = async () => {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (filterStatus.value) params.status = filterStatus.value
    const res = await essService.getTickets(params)
    tickets.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load tickets'
  } finally {
    loading.value = false
  }
}

const createTicket = async () => {
  saving.value = true
  error.value = ''
  try {
    await essService.createTicket(form.value)
    showForm.value = false
    form.value = { category: 'general', subject: '', description: '', priority: 'medium' }
    await load()
  } catch {
    error.value = 'Failed to create ticket'
  } finally {
    saving.value = false
  }
}

const viewTicket = async (ticket: HrTicket) => {
  try {
    const res = await essService.getTicket(ticket.id)
    selected.value = res.data?.data ?? ticket
  } catch {
    selected.value = ticket
  }
}

const addComment = async () => {
  if (!selected.value || !newComment.value.trim()) return
  commenting.value = true
  try {
    await essService.addComment(selected.value.id, newComment.value)
    newComment.value = ''
    const res = await essService.getTicket(selected.value.id)
    selected.value = res.data?.data ?? selected.value
  } catch {
    error.value = 'Failed to add comment'
  } finally {
    commenting.value = false
  }
}

const closeTicket = async () => {
  if (!selected.value) return
  try {
    await essService.closeTicket(selected.value.id)
    selected.value = null
    await load()
  } catch {
    error.value = 'Failed to close ticket'
  }
}

const getStatusClass = (s: string) => {
  const map: Record<string, string> = {
    open: 'bg-blue-900/50 text-blue-400',
    in_progress: 'bg-yellow-900/50 text-yellow-400',
    resolved: 'bg-green-900/50 text-green-400',
    closed: 'bg-gray-700 text-gray-400',
  }
  return map[s] ?? 'bg-gray-700 text-gray-300'
}

const getPriorityClass = (p: string) => {
  const map: Record<string, string> = {
    low: 'text-gray-400',
    medium: 'text-blue-400',
    high: 'text-orange-400',
    urgent: 'text-red-400',
  }
  return map[p] ?? 'text-gray-400'
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <select
        v-model="filterStatus"
        @change="load"
        class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
      >
        <option value="">All Status</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </select>
      <button
        @click="showForm = !showForm"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Ticket
      </button>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Create form -->
    <div v-if="showForm" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">New HR Ticket</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Category</label>
          <select
            v-model="form.category"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none capitalize"
          >
            <option v-for="c in categories" :key="c" :value="c" class="capitalize">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Priority</label>
          <select
            v-model="form.priority"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none capitalize"
          >
            <option v-for="p in priorities" :key="p" :value="p" class="capitalize">{{ p }}</option>
          </select>
        </div>
        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-300 mb-1">Subject *</label>
          <input
            v-model="form.subject"
            type="text"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-300 mb-1">Description *</label>
          <textarea
            v-model="form.description"
            rows="4"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          ></textarea>
        </div>
      </div>
      <div class="flex gap-3">
        <button
          @click="createTicket"
          :disabled="saving"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >{{ saving ? 'Creating...' : 'Submit Ticket' }}</button>
        <button
          @click="showForm = false"
          class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >Cancel</button>
      </div>
    </div>

    <!-- Ticket detail panel -->
    <div v-if="selected" class="bg-gray-800 border border-blue-700/50 rounded-lg p-6 space-y-4">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs text-gray-500 font-mono">{{ selected.ticket_number }}</span>
            <span
              :class="[
                'inline-flex px-2 py-0.5 text-xs font-semibold rounded-full',
                getStatusClass(selected.status),
              ]"
            >{{ selected.status.replace('_', ' ') }}</span>
          </div>
          <h3 class="text-base font-semibold text-white">{{ selected.subject }}</h3>
          <p class="text-sm text-gray-400 mt-1">{{ selected.description }}</p>
        </div>
        <button @click="selected = null" class="text-gray-400 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="border-t border-gray-700 pt-4">
        <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Comments</h4>
        <div v-if="selected.comments?.length" class="space-y-3 mb-4">
          <div
            v-for="c in selected.comments"
            :key="c.id"
            class="bg-gray-700/50 rounded-lg p-3"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-medium text-gray-300">{{ c.user?.name ?? 'User' }}</span>
              <span class="text-xs text-gray-500">{{ formatDate(c.created_at) }}</span>
            </div>
            <p class="text-sm text-gray-300">{{ c.comment }}</p>
          </div>
        </div>
        <p v-else class="text-xs text-gray-500 mb-3">No comments yet.</p>
        <div v-if="selected.status !== 'closed'" class="flex gap-2">
          <input
            v-model="newComment"
            type="text"
            placeholder="Add a comment..."
            class="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
            @keyup.enter="addComment"
          />
          <button
            @click="addComment"
            :disabled="commenting"
            class="px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >Send</button>
          <button
            @click="closeTicket"
            class="px-3 py-2 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >Close</button>
        </div>
      </div>
    </div>

    <!-- Tickets list -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-14 bg-gray-700 rounded"></div>
      </div>
    </div>

    <div v-else-if="tickets.length" class="space-y-3">
      <div
        v-for="ticket in tickets"
        :key="ticket.id"
        @click="viewTicket(ticket)"
        class="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-gray-600 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs text-gray-500 font-mono">{{ ticket.ticket_number }}</span>
              <span class="text-xs text-gray-500 capitalize bg-gray-700 px-1.5 py-0.5 rounded">
                {{ ticket.category }}
              </span>
              <span :class="['text-xs font-medium capitalize', getPriorityClass(ticket.priority)]">
                {{ ticket.priority }}
              </span>
            </div>
            <p class="text-sm font-medium text-white truncate">{{ ticket.subject }}</p>
          </div>
          <span
            :class="[
              'ml-3 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full shrink-0',
              getStatusClass(ticket.status),
            ]"
          >{{ ticket.status.replace('_', ' ') }}</span>
        </div>
        <p class="text-xs text-gray-500 mt-1">{{ formatDate(ticket.created_at) }}</p>
      </div>
    </div>

    <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No tickets found. Create one to get started.</p>
    </div>
  </div>
</template>
