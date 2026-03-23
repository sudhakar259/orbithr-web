<script setup lang="ts">
defineOptions({ name: 'SocialWall' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface Comment {
  id: number
  user_name: string
  content: string
  created_at: string
}

interface Post {
  id: number
  user_name: string
  user_avatar: string | null
  content: string
  likes_count: number
  comments_count: number
  is_liked: boolean
  latest_comments: Comment[]
  created_at: string
}

const loading = ref(true)
const posts = ref<Post[]>([])
const newPostContent = ref('')
const posting = ref(false)
const commentInputs = ref<Record<number, string>>({})
const commentingId = ref<number | null>(null)
const page = ref(1)
const hasMore = ref(true)
const loadingMore = ref(false)

async function fetchPosts(reset = true) {
  if (reset) {
    loading.value = true
    page.value = 1
  } else {
    loadingMore.value = true
  }
  try {
    const res = await api.get('/social-wall', { params: { page: page.value } })
    const data = res.data?.data ?? res.data ?? []
    if (reset) {
      posts.value = data
    } else {
      posts.value.push(...data)
    }
    hasMore.value = data.length >= 10
  } catch {
    if (reset) posts.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function createPost() {
  if (!newPostContent.value.trim()) return
  posting.value = true
  try {
    await api.post('/social-wall', { content: newPostContent.value })
    newPostContent.value = ''
    await fetchPosts()
  } catch {
    // error handled silently
  } finally {
    posting.value = false
  }
}

async function toggleLike(post: Post) {
  try {
    await api.post(`/social-wall/${post.id}/like`)
    post.is_liked = !post.is_liked
    post.likes_count += post.is_liked ? 1 : -1
  } catch {
    // error handled silently
  }
}

async function addComment(post: Post) {
  const content = commentInputs.value[post.id]?.trim()
  if (!content) return
  commentingId.value = post.id
  try {
    const res = await api.post(`/social-wall/${post.id}/comment`, { content })
    const comment = res.data?.data ?? res.data
    if (comment) {
      post.latest_comments.push(comment)
      post.comments_count++
    }
    commentInputs.value[post.id] = ''
  } catch {
    // error handled silently
  } finally {
    commentingId.value = null
  }
}

function loadMore() {
  page.value++
  fetchPosts(false)
}

function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || 'U'
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

onMounted(() => fetchPosts())
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <!-- Header -->
    <div>
      <p class="mt-1 text-sm text-gray-400">Share updates and connect with your team</p>
    </div>

    <!-- Post Composer -->
    <div class="rounded-lg border border-gray-700 bg-gray-800 p-4 space-y-3">
      <textarea
        v-model="newPostContent"
        rows="3"
        placeholder="What's on your mind?"
        class="w-full resize-none rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
      <div class="flex justify-end">
        <button
          :disabled="!newPostContent.trim() || posting"
          class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          @click="createPost"
        >
          {{ posting ? 'Posting...' : 'Post' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
    </div>

    <!-- Posts Feed -->
    <template v-else>
      <div
        v-for="post in posts"
        :key="post.id"
        class="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-4"
      >
        <!-- Post Header -->
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            {{ getInitial(post.user_name) }}
          </div>
          <div>
            <p class="text-sm font-medium text-white">{{ post.user_name }}</p>
            <p class="text-xs text-gray-500">{{ timeAgo(post.created_at) }}</p>
          </div>
        </div>

        <!-- Post Content -->
        <p class="whitespace-pre-wrap text-sm text-gray-300">{{ post.content }}</p>

        <!-- Actions -->
        <div class="flex items-center gap-6 border-t border-gray-700 pt-3">
          <button
            :class="[
              'flex items-center gap-1.5 text-sm transition-colors',
              post.is_liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400',
            ]"
            @click="toggleLike(post)"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                v-if="post.is_liked"
                fill-rule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clip-rule="evenodd"
              />
              <path
                v-else
                fill-rule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clip-rule="evenodd"
              />
            </svg>
            {{ post.likes_count }}
          </button>
          <span class="flex items-center gap-1.5 text-sm text-gray-400">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clip-rule="evenodd"
              />
            </svg>
            {{ post.comments_count }}
          </span>
        </div>

        <!-- Latest Comments -->
        <div v-if="post.latest_comments.length" class="space-y-2 border-t border-gray-700 pt-3">
          <div
            v-for="c in post.latest_comments.slice(-3)"
            :key="c.id"
            class="flex items-start gap-2"
          >
            <div class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-600 text-xs font-medium text-white">
              {{ getInitial(c.user_name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs">
                <span class="font-medium text-white">{{ c.user_name }}</span>
                <span class="ml-2 text-gray-500">{{ timeAgo(c.created_at) }}</span>
              </p>
              <p class="text-sm text-gray-300">{{ c.content }}</p>
            </div>
          </div>
        </div>

        <!-- Comment Input -->
        <div class="flex items-center gap-2">
          <input
            v-model="commentInputs[post.id]"
            type="text"
            placeholder="Write a comment..."
            class="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            @keyup.enter="addComment(post)"
          />
          <button
            :disabled="!commentInputs[post.id]?.trim() || commentingId === post.id"
            class="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-600 disabled:opacity-50"
            @click="addComment(post)"
          >
            Send
          </button>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore && posts.length" class="flex justify-center">
        <button
          :disabled="loadingMore"
          class="rounded-lg border border-gray-600 bg-gray-700 px-6 py-2 text-sm text-gray-300 hover:bg-gray-600 disabled:opacity-50"
          @click="loadMore"
        >
          {{ loadingMore ? 'Loading...' : 'Load More' }}
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="!posts.length"
        class="flex flex-col items-center justify-center rounded-lg border border-gray-700 bg-gray-800 py-16"
      >
        <p class="text-gray-400">No posts yet</p>
        <p class="mt-1 text-sm text-gray-500">Be the first to share something</p>
      </div>
    </template>
  </div>
</template>
