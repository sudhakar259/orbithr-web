<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  recruitmentService,
  type JobPosting,
  type RecruitmentStats,
} from '@/services/recruitmentService'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

const router = useRouter()

// State
const jobs = ref<JobPosting[]>([])
const stats = ref<RecruitmentStats | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const statusFilter = ref('all')
const searchQuery = ref('')

// Computed
const filteredJobs = computed(() => {
  let list = jobs.value
  if (statusFilter.value !== 'all') {
    list = list.filter((j) => j.status === statusFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.department ?? '').toLowerCase().includes(q) ||
        (j.location ?? '').toLowerCase().includes(q),
    )
  }
  return list
})

// Methods
const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    const [jobsRes, statsRes] = await Promise.all([
      recruitmentService.getJobs(),
      recruitmentService.getStats(),
    ])
    jobs.value = jobsRes.data?.data ?? []
    stats.value = statsRes.data?.data ?? null
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to load recruitment data'
  } finally {
    loading.value = false
  }
}

const publishJob = async (job: JobPosting) => {
  try {
    await recruitmentService.publishJob(job.id)
    await loadData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to publish job'
  }
}

const closeJob = async (job: JobPosting) => {
  try {
    await recruitmentService.closeJob(job.id)
    await loadData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to close job'
  }
}

const deleteJob = async (job: JobPosting) => {
  if (!await dialog('Delete', `Delete "${job.title}"? This cannot be undone.`)) return
  try {
    await recruitmentService.deleteJob(job.id)
    await loadData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    error.value = e.response?.data?.message ?? 'Failed to delete job'
  }
}

const getStatusTone = (status: string) => {
  const map: Record<string, string> = {
    draft: 'neutral',
    published: 'ok',
    closed: 'danger',
    cancelled: 'warn',
  }
  return map[status] ?? 'neutral'
}

const formatEmploymentType = (type: string) => {
  const map: Record<string, string> = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    internship: 'Internship',
    freelance: 'Freelance',
  }
  return map[type] ?? type
}

const formatDate = (date?: string) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onMounted(loadData)
</script>

<template>
  <div class="rec-dashboard">
    <!-- Header -->
    <header class="page-header">
      <div class="ph-text">
        <div class="ph-eyebrow">Applicant tracking · 12 open roles</div>
        <h1 class="ph-title">Recruitment</h1>
        <p class="ph-sub">
          Manage job postings, track applications, and monitor your hiring pipeline
          across departments.
        </p>
      </div>
      <div class="ph-actions">
        <button
          class="btn btn-secondary"
          @click="router.push({ name: 'recruitment.analytics' })"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3v18h18" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M7 14l4-4 4 3 5-7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Analytics
        </button>
        <button
          class="btn btn-primary"
          @click="router.push({ name: 'recruitment.jobs.create' })"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Post job
        </button>
      </div>
    </header>

    <!-- Error -->
    <div v-if="error" class="alert-error">{{ error }}</div>

    <!-- Stats -->
    <section class="stat-grid">
      <div
        v-for="stat in [
          { label: 'Total jobs', value: stats?.total_jobs ?? 0, tone: 'default' },
          { label: 'Open jobs', value: stats?.open_jobs ?? 0, tone: 'green' },
          { label: 'Applications this month', value: stats?.applications_this_month ?? 0, tone: 'accent' },
          { label: 'Hired this month', value: stats?.hired_this_month ?? 0, tone: 'yellow' },
        ]"
        :key="stat.label"
        class="stat-card"
      >
        <div class="stat-label">{{ stat.label }}</div>
        <div :class="['stat-value', `tone-${stat.tone}`]">{{ stat.value }}</div>
      </div>
    </section>

    <!-- Filters -->
    <section class="filter-bar">
      <select v-model="statusFilter" class="input select">
        <option value="all">All statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="closed">Closed</option>
      </select>
      <div class="search-wrap">
        <svg
          class="search-icon"
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clip-rule="evenodd"
          />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search jobs..."
          class="input search-input"
        />
      </div>
      <div class="filter-hint">
        Showing
        <span class="hint-num">{{ filteredJobs.length }}</span>
        of
        <span class="hint-num">{{ jobs.length }}</span>
        jobs
      </div>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="skeleton-list">
      <div v-for="n in 4" :key="n" class="skeleton-row" />
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredJobs.length === 0" class="card empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path
          d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <h3>No jobs found</h3>
      <p>Get started by creating a new job posting.</p>
      <button
        class="btn btn-primary btn-sm"
        @click="router.push({ name: 'recruitment.jobs.create' })"
      >
        Create job
      </button>
    </div>

    <!-- Jobs table -->
    <section v-else class="card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Job title</th>
              <th>Department</th>
              <th>Type</th>
              <th>Location</th>
              <th class="t-right">Vacancies</th>
              <th class="t-right">Applications</th>
              <th>Deadline</th>
              <th>Status</th>
              <th class="t-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="job in filteredJobs" :key="job.id" class="row">
              <td>
                <div class="job-title">{{ job.title }}</div>
                <div class="job-code">{{ job.job_code }}</div>
              </td>
              <td class="t-muted">{{ job.department || '—' }}</td>
              <td class="t-muted">{{ formatEmploymentType(job.employment_type) }}</td>
              <td>
                <span v-if="job.is_remote" class="loc-remote">Remote</span>
                <span v-else class="t-muted">{{ job.location || '—' }}</span>
              </td>
              <td class="t-right t-mono">{{ job.vacancies }}</td>
              <td class="t-right t-mono t-accent">{{ job.applications_count }}</td>
              <td class="t-muted">{{ formatDate(job.application_deadline) }}</td>
              <td>
                <span :class="['badge', `badge-${getStatusTone(job.status)}`]">
                  {{ job.status }}
                </span>
              </td>
              <td class="t-right">
                <div class="row-actions">
                  <button
                    class="icon-btn"
                    title="View"
                    @click="router.push({ name: 'recruitment.jobs.show', params: { id: job.id } })"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    class="icon-btn"
                    title="Edit"
                    @click="router.push({ name: 'recruitment.jobs.edit', params: { id: job.id } })"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    v-if="job.status === 'draft'"
                    class="icon-btn icon-btn-ok"
                    title="Publish"
                    @click="publishJob(job)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    v-if="job.status === 'published'"
                    class="icon-btn icon-btn-warn"
                    title="Close"
                    @click="closeJob(job)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    v-if="job.status === 'draft'"
                    class="icon-btn icon-btn-danger"
                    title="Delete"
                    @click="deleteJob(job)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rec-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #eef0f4;
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.ph-text {
  display: flex;
  flex-direction: column;
}
.ph-eyebrow {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
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
  max-width: 560px;
  line-height: 1.55;
}
.ph-actions {
  display: flex;
  gap: 8px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  font-family: inherit;
}
.btn svg {
  width: 14px;
  height: 14px;
}
.btn-sm {
  padding: 7px 11px;
  font-size: 12px;
}
.btn-primary {
  background: #6b5bff;
  color: #fff;
  border-color: #6b5bff;
}
.btn-primary:hover {
  background: #7d6fff;
}
.btn-secondary {
  background: #161a23;
  color: #eef0f4;
  border-color: #232936;
}
.btn-secondary:hover {
  border-color: #2c3242;
  background: #1a1f2a;
}

/* Alerts */
.alert-error {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #f38288;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 13px;
}

/* Stat grid */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.stat-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s ease;
}
.stat-card:hover {
  border-color: #2c3242;
}
.stat-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
}
.stat-value {
  font-family: 'Instrument Serif', serif;
  font-size: 32px;
  line-height: 1.05;
  font-weight: 400;
  letter-spacing: -0.01em;
}
.tone-default {
  color: #eef0f4;
}
.tone-accent {
  color: #6b5bff;
}
.tone-green {
  color: #4dd39a;
}
.tone-purple {
  color: #9b6eff;
}
.tone-yellow {
  color: #f5a623;
}

/* Filter bar */
.filter-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.input {
  background: #161a23;
  border: 1px solid #232936;
  color: #eef0f4;
  border-radius: 6px;
  padding: 7px 10px;
  font-size: 12.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}
.input:focus {
  border-color: #6b5bff;
}
.input::placeholder {
  color: #7a8299;
}
.select {
  cursor: pointer;
  padding-right: 28px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A8299' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.search-wrap {
  position: relative;
  flex: 1;
  max-width: 320px;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #7a8299;
  pointer-events: none;
}
.search-input {
  padding-left: 30px;
  width: 100%;
}
.filter-hint {
  margin-left: auto;
  font-size: 11.5px;
  color: #7a8299;
  font-family: 'JetBrains Mono', monospace;
}
.hint-num {
  color: #eef0f4;
  font-weight: 600;
  margin: 0 2px;
}

/* Skeletons */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-row {
  height: 56px;
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 8px;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.85;
  }
}

/* Card */
.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
  overflow: hidden;
}

/* Empty state */
.empty-state {
  padding: 56px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}
.empty-state svg {
  width: 44px;
  height: 44px;
  color: #4a5160;
}
.empty-state h3 {
  font-size: 14px;
  color: #eef0f4;
  margin: 8px 0 0;
  font-weight: 500;
}
.empty-state p {
  font-size: 12.5px;
  color: #7a8299;
  margin: 0 0 12px;
}

/* Table */
.table-wrap {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table thead th {
  background: #1a1f2a;
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
  padding: 10px 18px;
  border-bottom: 1px solid #232936;
  white-space: nowrap;
}
.data-table tbody td {
  padding: 14px 18px;
  font-size: 13px;
  color: #c8ccd6;
  border-bottom: 1px solid #232936;
  vertical-align: middle;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.row {
  transition: background 0.12s ease;
}
.row:hover {
  background: rgba(107, 91, 255, 0.04);
}

.t-right {
  text-align: right;
}
.t-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.t-accent {
  color: #6b5bff;
  font-weight: 600;
}
.t-muted {
  color: #7a8299;
}

.job-title {
  color: #eef0f4;
  font-weight: 500;
  font-size: 13px;
}
.job-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: #7a8299;
  margin-top: 2px;
}
.loc-remote {
  color: #6b5bff;
  font-weight: 500;
  font-size: 12.5px;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  text-transform: capitalize;
  border: 1px solid transparent;
}
.badge-neutral {
  background: #1a1f2a;
  color: #c8ccd6;
  border-color: #232936;
}
.badge-ok {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}
.badge-danger {
  background: rgba(243, 130, 136, 0.12);
  color: #f38288;
  border-color: rgba(243, 130, 136, 0.25);
}
.badge-warn {
  background: rgba(245, 166, 35, 0.12);
  color: #f5a623;
  border-color: rgba(245, 166, 35, 0.25);
}

/* Row actions */
.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}
.icon-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #7a8299;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  font-family: inherit;
}
.icon-btn svg {
  width: 14px;
  height: 14px;
}
.icon-btn:hover {
  background: #1a1f2a;
  border-color: #232936;
  color: #eef0f4;
}
.icon-btn-ok:hover {
  color: #4dd39a;
}
.icon-btn-warn:hover {
  color: #f5a623;
}
.icon-btn-danger:hover {
  color: #f38288;
}
</style>
