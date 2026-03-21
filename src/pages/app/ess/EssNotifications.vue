<script setup lang="ts">
defineOptions({ name: 'EssNotifications' })
import { ref, computed, onMounted } from 'vue'
import { essService, type AppNotification } from '@/services/essService'

const loading = ref(true)
const notifications = ref<AppNotification[]>([])
const error = ref('')

const load = async () => {
  loading.value = true
  try {
    const res = await essService.getNotifications()
    notifications.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load notifications'
  } finally {
    loading.value = false
  }
}

const markRead = async (n: AppNotification) => {
  if (n.read_at) return
  try {
    await essService.markRead(n.id)
    n.read_at = new Date().toISOString()
  } catch {
    // silent
  }
}

const markAllRead = async () => {
  try {
    await essService.markAllRead()
    notifications.value.forEach((n) => {
      if (!n.read_at) n.read_at = new Date().toISOString()
    })
  } catch {
    error.value = 'Failed to mark all as read'
  }
}

const unreadCount = computed(() => notifications.value.filter((n) => !n.read_at).length)

const formatDate = (d: string) =>
  new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-400">{{ unreadCount }} unread</p>
      <button
        v-if="unreadCount > 0"
        @click="markAllRead"
        class="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >Mark all read</button>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <div v-if="loading" class="space-y-3">
      <div
        v-for="i in 5"
        :key="i"
        class="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
      >
        <div class="h-4 bg-gray-700 rounded w-2/3 mb-2"></div>
        <div class="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>

    <div v-else-if="notifications.length" class="space-y-2">
      <div
        v-for="n in notifications"
        :key="n.id"
        @click="markRead(n)"
        :class="[
          'border rounded-lg p-4 cursor-pointer transition-colors',
          n.read_at
            ? 'bg-gray-800 border-gray-700'
            : 'bg-gray-800/80 border-blue-700/50 hover:border-blue-600/50',
        ]"
      >
        <div class="flex items-start gap-3">
          <div
            :class="[
              'w-2 h-2 rounded-full mt-1.5 shrink-0',
              n.read_at ? 'bg-gray-600' : 'bg-blue-500',
            ]"
          ></div>
          <div class="flex-1 min-w-0">
            <p :class="['text-sm font-medium', n.read_at ? 'text-gray-300' : 'text-white']">
              {{ n.title }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">{{ n.body }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ formatDate(n.created_at) }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No notifications.</p>
    </div>
  </div>
</template>
