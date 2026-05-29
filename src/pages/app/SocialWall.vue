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

function getInitials(name: string) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
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
  <div class="sw-page">
    <!-- Header -->
    <header class="sw-header">
      <div class="sw-eyebrow">Engagement · Live feed</div>
      <h1 class="sw-title">Social wall</h1>
      <p class="sw-subtitle">Share updates, recognition, and culture moments with your team.</p>
    </header>

    <div class="sw-grid">
      <!-- Main feed -->
      <main class="sw-main">
        <!-- Composer -->
        <section class="sw-card sw-composer">
          <div class="sw-composer-head">
            <span class="sw-eyebrow">New post</span>
            <span class="sw-mono">Visible to · All employees</span>
          </div>
          <textarea
            v-model="newPostContent"
            rows="3"
            placeholder="What's on your mind?"
            class="sw-textarea"
          />
          <div class="sw-composer-actions">
            <button class="sw-btn sw-btn-ghost" type="button">📎 Attach</button>
            <button class="sw-btn sw-btn-ghost" type="button">🎉 Kudos</button>
            <div class="sw-spacer" />
            <button
              class="sw-btn sw-btn-primary"
              :disabled="!newPostContent.trim() || posting"
              @click="createPost"
            >
              {{ posting ? 'Posting…' : 'Post update' }}
            </button>
          </div>
        </section>

        <!-- Loading -->
        <div v-if="loading" class="sw-loading">
          <div class="sw-spinner" />
        </div>

        <!-- Posts feed -->
        <template v-else>
          <article
            v-for="post in posts"
            :key="post.id"
            class="sw-card sw-post"
          >
            <header class="sw-post-head">
              <span class="sw-avatar lg" :style="{ background: `hsl(${(post.id * 47) % 360}, 50%, 35%)` }">
                {{ getInitials(post.user_name) }}
              </span>
              <div class="sw-post-author">
                <div class="sw-post-name">{{ post.user_name }}</div>
                <div class="sw-post-time">{{ timeAgo(post.created_at) }}</div>
              </div>
              <span class="sw-badge">Update</span>
            </header>

            <div class="sw-post-body">{{ post.content }}</div>

            <footer class="sw-post-actions">
              <button
                class="sw-action-btn"
                :class="{ active: post.is_liked }"
                @click="toggleLike(post)"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
                <span>{{ post.likes_count }}</span>
              </button>
              <span class="sw-action-btn static">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" />
                </svg>
                <span>{{ post.comments_count }}</span>
              </span>
              <span class="sw-action-btn static">🎉 {{ Math.floor(post.likes_count / 2) }}</span>
            </footer>

            <!-- Comments -->
            <div v-if="post.latest_comments.length" class="sw-comments">
              <div
                v-for="c in post.latest_comments.slice(-3)"
                :key="c.id"
                class="sw-comment"
              >
                <span class="sw-avatar sm">{{ getInitial(c.user_name) }}</span>
                <div class="sw-comment-body">
                  <div class="sw-comment-meta">
                    <span class="sw-comment-name">{{ c.user_name }}</span>
                    <span class="sw-comment-time">· {{ timeAgo(c.created_at) }}</span>
                  </div>
                  <div class="sw-comment-text">{{ c.content }}</div>
                </div>
              </div>
            </div>

            <!-- Comment input -->
            <div class="sw-comment-input">
              <input
                v-model="commentInputs[post.id]"
                type="text"
                placeholder="Write a comment…"
                @keyup.enter="addComment(post)"
              />
              <button
                class="sw-btn sw-btn-secondary"
                :disabled="!commentInputs[post.id]?.trim() || commentingId === post.id"
                @click="addComment(post)"
              >
                Send
              </button>
            </div>
          </article>

          <!-- Load more -->
          <div v-if="hasMore && posts.length" class="sw-load-more">
            <button
              class="sw-btn sw-btn-secondary"
              :disabled="loadingMore"
              @click="loadMore"
            >
              {{ loadingMore ? 'Loading…' : 'Load more' }}
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="!posts.length" class="sw-card sw-empty">
            <div class="sw-empty-icon">💬</div>
            <div class="sw-empty-text">No posts yet</div>
            <div class="sw-empty-sub">Be the first to share something with your team</div>
          </div>
        </template>
      </main>

      <!-- Sidebar -->
      <aside class="sw-side">
        <section class="sw-card">
          <div class="sw-section-head">
            <span class="sw-section-title">Pulse · this wave</span>
            <span class="sw-badge tone-ok">+8</span>
          </div>
          <div class="sw-pulse">
            <div class="sw-pulse-score">62</div>
            <div class="sw-pulse-meta">
              <div class="sw-pulse-status">↑ Excellent</div>
              <div class="sw-pulse-sub">eNPS · 12 weeks</div>
            </div>
          </div>
          <div class="sw-pulse-bars">
            <div
              v-for="(v, i) in [28,32,30,35,38,42,45,48,52,55,58,62]"
              :key="i"
              class="sw-pulse-bar"
              :class="{ accent: i >= 9 }"
              :style="{ height: `${(v / 62) * 100}%` }"
            />
          </div>
          <div class="sw-pulse-axis">
            <span>Wk 6</span>
            <span>Wk 17</span>
          </div>
        </section>

        <section class="sw-card">
          <div class="sw-section-head">
            <span class="sw-section-title">Kudos this week</span>
          </div>
          <div class="sw-kudos">
            <div
              v-for="(k, i) in [
                { from: 'Arjun S', to: 'Ria M', val: 'Customer obsession', c: '#6B5BFF' },
                { from: 'Priya S', to: 'Dev M', val: 'Craft', c: '#4DD39A' },
                { from: 'Neha P', to: 'Kabir M', val: 'Care', c: '#F5A623' },
              ]"
              :key="i"
              class="sw-kudos-item"
            >
              <span class="sw-kudos-tag" :style="{ background: `${k.c}22`, borderColor: k.c, color: k.c }">{{ k.val }}</span>
              <div class="sw-kudos-text">
                <span class="sw-kudos-name">{{ k.from }}</span>
                <span class="sw-kudos-arrow">→</span>
                <span class="sw-kudos-name">{{ k.to }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="sw-card">
          <div class="sw-section-head">
            <span class="sw-section-title">Upcoming</span>
          </div>
          <div class="sw-upcoming">
            <div class="sw-up-item">
              <div class="sw-up-icon" style="background: rgba(107,91,255,.15); color: #6B5BFF;">📣</div>
              <div class="sw-up-body">
                <div class="sw-up-title">Town hall · Q2 review</div>
                <div class="sw-up-meta">Fri · 16:00</div>
              </div>
            </div>
            <div class="sw-up-item">
              <div class="sw-up-icon" style="background: rgba(245,166,35,.15); color: #F5A623;">📅</div>
              <div class="sw-up-body">
                <div class="sw-up-title">Diwali off-site</div>
                <div class="sw-up-meta">24 Oct</div>
              </div>
            </div>
            <div class="sw-up-item">
              <div class="sw-up-icon" style="background: rgba(77,211,154,.15); color: #4DD39A;">✏️</div>
              <div class="sw-up-body">
                <div class="sw-up-title">Skip-level forms</div>
                <div class="sw-up-meta">Closes Sat</div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.sw-page {
  font-family: 'Inter', system-ui, sans-serif;
  color: #EEF0F4;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sw-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sw-eyebrow {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #7A8299;
}
.sw-title {
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin: 0;
  line-height: 1;
}
.sw-subtitle {
  font-size: 13px;
  color: #B6BED0;
  margin: 0;
}

.sw-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.sw-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.sw-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.sw-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 18px;
}

/* Composer */
.sw-composer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.sw-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #7A8299;
}
.sw-textarea {
  width: 100%;
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 8px;
  padding: 12px 14px;
  color: #EEF0F4;
  font-size: 13.5px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  outline: none;
  transition: border-color 0.15s;
}
.sw-textarea::placeholder { color: #7A8299; }
.sw-textarea:focus { border-color: #6B5BFF; }
.sw-composer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #232936;
}

/* Buttons */
.sw-btn {
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.sw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sw-btn-primary { background: #6B5BFF; color: #fff; }
.sw-btn-primary:hover:not(:disabled) { background: #5a4ce8; }
.sw-btn-secondary {
  background: #1C2030;
  color: #EEF0F4;
  border-color: #232936;
}
.sw-btn-secondary:hover:not(:disabled) { border-color: #3a4258; }
.sw-btn-ghost {
  background: transparent;
  color: #B6BED0;
}
.sw-btn-ghost:hover { background: #1C2030; }
.sw-spacer { flex: 1; }

/* Posts */
.sw-post-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.sw-post-author { flex: 1; min-width: 0; }
.sw-post-name {
  font-size: 13px;
  font-weight: 600;
  color: #EEF0F4;
}
.sw-post-time {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}
.sw-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(107, 91, 255, 0.18);
  color: #6B5BFF;
}
.sw-badge.tone-ok {
  background: rgba(77, 211, 154, 0.16);
  color: #4DD39A;
}

.sw-post-body {
  font-size: 13.5px;
  color: #D8DCE6;
  line-height: 1.6;
  white-space: pre-wrap;
}

.sw-post-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #232936;
}
.sw-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  color: #7A8299;
  transition: color 0.15s;
}
.sw-action-btn:hover:not(.static) { color: #F38288; }
.sw-action-btn.active { color: #F38288; }
.sw-action-btn.static { cursor: default; }

/* Avatars */
.sw-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #6B5BFF, #9B6EFF);
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}
.sw-avatar.lg { width: 36px; height: 36px; font-size: 13px; }
.sw-avatar.sm { width: 24px; height: 24px; font-size: 10px; }

/* Comments */
.sw-comments {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #232936;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sw-comment {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.sw-comment-body { flex: 1; min-width: 0; }
.sw-comment-meta {
  font-size: 11px;
  margin-bottom: 2px;
}
.sw-comment-name {
  color: #EEF0F4;
  font-weight: 500;
}
.sw-comment-time { color: #7A8299; }
.sw-comment-text {
  font-size: 12.5px;
  color: #D8DCE6;
  line-height: 1.5;
}

.sw-comment-input {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.sw-comment-input input {
  flex: 1;
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 6px;
  padding: 7px 12px;
  color: #EEF0F4;
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.sw-comment-input input::placeholder { color: #7A8299; }
.sw-comment-input input:focus { border-color: #6B5BFF; }

/* Loading */
.sw-loading {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.sw-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid #232936;
  border-top-color: #6B5BFF;
  border-radius: 50%;
  animation: sw-spin 0.7s linear infinite;
}
@keyframes sw-spin { to { transform: rotate(360deg); } }

.sw-load-more {
  display: flex;
  justify-content: center;
}

/* Empty */
.sw-empty {
  text-align: center;
  padding: 40px 20px;
}
.sw-empty-icon { font-size: 32px; margin-bottom: 10px; }
.sw-empty-text {
  font-size: 14px;
  color: #B6BED0;
  font-weight: 500;
}
.sw-empty-sub {
  font-size: 12px;
  color: #7A8299;
  margin-top: 4px;
}

/* Section heads */
.sw-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.sw-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #EEF0F4;
  letter-spacing: -0.005em;
}

/* Pulse */
.sw-pulse {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 6px;
}
.sw-pulse-score {
  font-family: 'Instrument Serif', serif;
  font-size: 56px;
  color: #EEF0F4;
  letter-spacing: -0.03em;
  line-height: 1;
}
.sw-pulse-meta { display: flex; flex-direction: column; gap: 2px; }
.sw-pulse-status { font-size: 12px; color: #4DD39A; }
.sw-pulse-sub { font-size: 11px; color: #7A8299; }

.sw-pulse-bars {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 100px;
  margin-top: 14px;
}
.sw-pulse-bar {
  flex: 1;
  background: #232936;
  border-radius: 3px 3px 0 0;
  min-height: 6%;
}
.sw-pulse-bar.accent { background: #6B5BFF; }
.sw-pulse-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #7A8299;
}

/* Kudos sidebar */
.sw-kudos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sw-kudos-item {
  padding: 10px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.sw-kudos-tag {
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
  font-size: 10px;
  font-weight: 600;
}
.sw-kudos-text {
  font-size: 11.5px;
  color: #B6BED0;
  display: flex;
  align-items: center;
  gap: 5px;
}
.sw-kudos-name { color: #EEF0F4; font-weight: 500; }
.sw-kudos-arrow { color: #7A8299; }

/* Upcoming */
.sw-upcoming {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sw-up-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #1C2030;
}
.sw-up-item:last-child { border-bottom: none; }
.sw-up-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.sw-up-body { flex: 1; min-width: 0; }
.sw-up-title {
  font-size: 12.5px;
  color: #EEF0F4;
  font-weight: 500;
}
.sw-up-meta {
  font-size: 10.5px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
  margin-top: 2px;
}

@media (max-width: 1100px) {
  .sw-grid { grid-template-columns: 1fr; }
}
</style>
