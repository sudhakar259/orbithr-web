<script setup lang="ts">
defineOptions({ name: 'InternalJobs' })
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

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
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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
    <!-- Page header -->
    <div class="page-header">
      <div class="ph-text">
        <div class="ph-eyebrow">Internal mobility</div>
        <h1 class="ph-title">Internal job board</h1>
        <p class="ph-sub">
          Browse open positions within the organization and apply for new opportunities.
        </p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
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
          class="input search-input"
        />
      </div>
    </div>

    <div v-if="error" class="alert-error">{{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="job-grid">
      <div v-for="n in 6" :key="n" class="job-card skeleton">
        <div class="sk-line sk-title"></div>
        <div class="sk-line sk-dept"></div>
        <div class="sk-line sk-desc"></div>
        <div class="sk-line sk-desc short"></div>
        <div class="sk-line sk-date"></div>
      </div>
    </div>

    <!-- Empty -->
    <template v-else-if="filteredJobs.length === 0 && !error">
      <div class="card empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">
          {{ search ? 'No jobs match your search' : 'No internal jobs posted yet' }}
        </div>
        <div class="empty-sub">
          {{
            search
              ? 'Try adjusting your search terms'
              : 'Check back later for new opportunities'
          }}
        </div>
      </div>
    </template>

    <!-- Jobs Grid -->
    <div v-else class="job-grid">
      <div v-for="job in filteredJobs" :key="job.id" class="job-card">
        <div class="job-head">
          <h3 class="job-title">{{ job.title }}</h3>
          <span v-if="job.department" class="badge badge-accent">{{ job.department }}</span>
        </div>
        <div v-if="job.location" class="job-meta">
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clip-rule="evenodd"
            />
          </svg>
          <span>{{ job.location }}</span>
        </div>
        <p class="job-desc">{{ excerpt(job.description) }}</p>
        <div class="job-foot">
          <span class="job-date">Posted {{ formatDate(job.created_at) }}</span>
          <span class="apply-wrap" title="Coming Soon">
            <button class="apply-btn" disabled>Apply</button>
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
  color: #eef0f4;
}

/* Page header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}
.ph-eyebrow {
  font-size: 11px;
  font-weight: 500;
  color: #7a8299;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.ph-title {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: #eef0f4;
  margin: 0 0 6px;
  line-height: 1.1;
}
.ph-sub {
  font-size: 13px;
  color: #7a8299;
  margin: 0;
  max-width: 640px;
  line-height: 1.55;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.search-wrap {
  position: relative;
  width: 340px;
  max-width: 100%;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #7a8299;
  pointer-events: none;
}
.search-input {
  padding-left: 34px;
}

.input {
  width: 100%;
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 8px;
  color: #eef0f4;
  font-size: 13px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
}
.input:focus {
  border-color: #6b5bff;
}
.input::placeholder {
  color: #7a8299;
}

.alert-error {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #f38288;
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
}

/* Cards / grid */
.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
}
.empty-state {
  padding: 56px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.empty-icon {
  font-size: 28px;
  margin-bottom: 4px;
}
.empty-title {
  font-size: 14px;
  color: #eef0f4;
  font-weight: 500;
}
.empty-sub {
  font-size: 12.5px;
  color: #7a8299;
}

.job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.job-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s ease;
}
.job-card:hover {
  border-color: #2c3242;
}
.job-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.job-title {
  font-size: 15px;
  font-weight: 600;
  color: #eef0f4;
  margin: 0;
  line-height: 1.3;
}
.job-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #7a8299;
}
.job-desc {
  font-size: 12.5px;
  color: #c8ccd6;
  line-height: 1.5;
  margin: 0;
  flex: 1;
}
.job-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid #232936;
}
.job-date {
  font-size: 11px;
  color: #7a8299;
}
.apply-wrap {
  cursor: not-allowed;
}
.apply-btn {
  font-size: 11.5px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #232936;
  background: #1a1f2a;
  color: #7a8299;
  cursor: not-allowed;
  opacity: 0.7;
  font-family: inherit;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  border: 1px solid transparent;
  white-space: nowrap;
  flex-shrink: 0;
}
.badge-accent {
  background: rgba(107, 91, 255, 0.12);
  color: #9b8eff;
  border-color: rgba(107, 91, 255, 0.25);
}

/* Skeleton */
.skeleton {
  pointer-events: none;
}
.sk-line {
  border-radius: 4px;
  background: #1a1f2a;
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
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
