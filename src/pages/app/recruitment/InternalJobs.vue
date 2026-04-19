<script setup lang="ts">
defineOptions({ name: 'InternalJobs' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

interface InternalJob {
  id: number
  title: string
  department: string | null
  location: string | null
  description: string
  created_at: string
}

const loading = ref(true)
const jobs = ref<InternalJob[]>([])
const error = ref('')
const search = ref('')

const filteredJobs = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return jobs.value
  return jobs.value.filter((j) => j.title.toLowerCase().includes(q))
})

const excerpt = (text: string, max = 150) => {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '...' : text
}

const formatDate = (d: string) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/jobs/internal')
    jobs.value = res.data?.data ?? res.data ?? []
  } catch {
    error.value = 'Failed to load internal jobs'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="ij-page">
    <PageHeader title="Internal Job Board" subtitle="Browse open positions within the organization" />

    <div class="ij-toolbar">
      <div class="ij-search-wrap">
        <svg class="ij-search-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clip-rule="evenodd"
          />
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search by job title..."
          class="ij-search"
        />
      </div>
    </div>

    <div v-if="error" class="ij-error">{{ error }}</div>

    <div v-if="loading" class="ij-grid">
      <div v-for="n in 6" :key="n" class="ij-card ij-skeleton">
        <div class="sk-line sk-title"></div>
        <div class="sk-line sk-dept"></div>
        <div class="sk-line sk-desc"></div>
        <div class="sk-line sk-desc short"></div>
        <div class="sk-line sk-date"></div>
      </div>
    </div>

    <template v-else-if="filteredJobs.length === 0 && !error">
      <EmptyState
        icon="📋"
        :message="search ? 'No jobs match your search' : 'No internal jobs posted yet'"
        :sub="search ? 'Try adjusting your search terms' : 'Check back later for new opportunities'"
      />
    </template>

    <div v-else class="ij-grid">
      <div v-for="job in filteredJobs" :key="job.id" class="ij-card">
        <div class="ij-card-header">
          <h3 class="ij-card-title">{{ job.title }}</h3>
          <span v-if="job.department" class="ij-badge dept">{{ job.department }}</span>
        </div>
        <div v-if="job.location" class="ij-meta">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" class="ij-meta-icon">
            <path
              fill-rule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clip-rule="evenodd"
            />
          </svg>
          <span>{{ job.location }}</span>
        </div>
        <p class="ij-desc">{{ excerpt(job.description) }}</p>
        <div class="ij-card-footer">
          <span class="ij-date">Posted {{ formatDate(job.created_at) }}</span>
          <span class="ij-apply-wrap" title="Coming Soon">
            <button class="ij-apply" disabled>Apply</button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ij-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ij-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ij-search-wrap {
  position: relative;
  flex: 1;
  max-width: 360px;
}
.ij-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
}
.ij-search {
  width: 100%;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  color: var(--text);
  font-size: 13px;
  padding: 9px 12px 9px 36px;
  outline: none;
  transition: border-color 0.15s;
}
.ij-search:focus {
  border-color: var(--accent);
}
.ij-search::placeholder {
  color: var(--muted);
}
.ij-error {
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: var(--rs);
  padding: 12px 16px;
  font-size: 13px;
  color: var(--red);
}
.ij-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.ij-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.15s;
}
.ij-card:hover {
  border-color: var(--border-hi);
}
.ij-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.ij-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}
.ij-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.ij-badge.dept {
  background: rgba(79, 126, 255, 0.15);
  color: var(--accent);
}
.ij-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
}
.ij-meta-icon {
  color: var(--muted);
  flex-shrink: 0;
}
.ij-desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0;
  flex: 1;
}
.ij-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
.ij-date {
  font-size: 11px;
  color: var(--muted);
}
.ij-apply-wrap {
  cursor: not-allowed;
}
.ij-apply {
  font-size: 12px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--muted);
  cursor: not-allowed;
  opacity: 0.6;
}

/* Skeleton */
.ij-skeleton {
  pointer-events: none;
}
.sk-line {
  border-radius: 4px;
  background: var(--surface2);
  animation: shimmer 1.4s ease-in-out infinite;
}
.sk-title {
  height: 16px;
  width: 60%;
}
.sk-dept {
  height: 12px;
  width: 30%;
}
.sk-desc {
  height: 12px;
  width: 100%;
}
.sk-desc.short {
  width: 70%;
}
.sk-date {
  height: 10px;
  width: 40%;
}
@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
</style>
