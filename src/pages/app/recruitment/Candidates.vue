<script setup lang="ts">
defineOptions({ name: 'RecruitmentCandidates' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { recruitmentService, type Candidate } from '@/services/recruitmentService'

const router = useRouter()
const loading = ref(true)
const candidates = ref<Candidate[]>([])
const error = ref('')
const search = ref('')
const filterStatus = ref('')
const filterSkill = ref('')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string> = {}
    if (search.value) params.q = search.value
    if (filterStatus.value) params.status = filterStatus.value
    if (filterSkill.value) params.skill = filterSkill.value
    const res = await recruitmentService.getCandidates(params)
    candidates.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load candidates'
  } finally {
    loading.value = false
  }
}

const getStatusTone = (status: string) => {
  const map: Record<string, string> = {
    active: 'ok',
    passive: 'neutral',
    hired: 'accent',
    blacklisted: 'danger',
  }
  return map[status] ?? 'neutral'
}

onMounted(load)
</script>

<template>
  <div class="cand-page">
    <!-- Page header -->
    <div class="page-header">
      <div class="ph-text">
        <div class="ph-eyebrow">Talent pool</div>
        <h1 class="ph-title">Candidates</h1>
        <p class="ph-sub">
          Browse, filter and manage candidates across all sources. Add new profiles or move
          them into an active pipeline.
        </p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="filters">
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
            v-model="search"
            type="text"
            placeholder="Search by name, email..."
            class="input search-input"
            @keyup.enter="load"
          />
        </div>
        <select v-model="filterStatus" class="input select" @change="load">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="passive">Passive</option>
          <option value="hired">Hired</option>
          <option value="blacklisted">Blacklisted</option>
        </select>
        <input
          v-model="filterSkill"
          type="text"
          placeholder="Filter by skill..."
          class="input"
          @keyup.enter="load"
        />
        <button class="btn btn-secondary btn-sm" @click="load">Search</button>
      </div>
      <button
        class="btn btn-primary btn-sm"
        @click="router.push({ name: 'recruitment.candidates.create' })"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v12m6-6H6"
          />
        </svg>
        Add candidate
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card skeleton-card">
      <div v-for="i in 5" :key="i" class="sk-line"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert-error">{{ error }}</div>

    <!-- Empty -->
    <div v-else-if="candidates.length === 0" class="card empty-state">
      <div class="empty-title">No candidates found.</div>
      <button
        class="btn btn-primary btn-sm"
        @click="router.push({ name: 'recruitment.candidates.create' })"
      >
        Add your first candidate
      </button>
    </div>

    <!-- Table -->
    <div v-else class="card table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Current role</th>
            <th>Experience</th>
            <th>Status</th>
            <th>Source</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in candidates" :key="c.id" class="row">
            <td>
              <div class="cand-cell">
                <div class="avatar">
                  {{ (c.first_name[0] + c.last_name[0]).toUpperCase() }}
                </div>
                <div>
                  <div class="cand-name">{{ c.first_name }} {{ c.last_name }}</div>
                  <div class="cand-email">{{ c.email }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="role-name">{{ c.current_title ?? '—' }}</div>
              <div v-if="c.current_company" class="role-company">
                {{ c.current_company }}
              </div>
            </td>
            <td class="t-mono">
              {{ c.total_experience_years ? `${c.total_experience_years} yrs` : '—' }}
            </td>
            <td>
              <span :class="['badge', `badge-${getStatusTone(c.status)}`]">
                {{ c.status }}
              </span>
            </td>
            <td class="t-muted t-cap">{{ c.source ?? '—' }}</td>
            <td class="t-right">
              <button
                class="link-btn"
                @click="
                  router.push({
                    name: 'recruitment.candidates.show',
                    params: { id: c.id },
                  })
                "
              >
                View
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.cand-page {
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
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.search-wrap {
  position: relative;
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
  width: 240px;
}

/* Inputs */
.input {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 6px;
  color: #eef0f4;
  font-size: 12.5px;
  padding: 7px 10px;
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
.select {
  cursor: pointer;
  padding-right: 28px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A8299' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  padding: 7px 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  font-family: inherit;
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
  border-color: #7d6fff;
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

/* Card */
.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
}

.skeleton-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-line {
  height: 36px;
  background: #1a1f2a;
  border-radius: 6px;
  animation: shimmer 1.4s ease-in-out infinite;
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

.alert-error {
  background: rgba(243, 130, 136, 0.08);
  border: 1px solid rgba(243, 130, 136, 0.3);
  color: #f38288;
  font-size: 13px;
  padding: 12px 14px;
  border-radius: 8px;
}

.empty-state {
  padding: 56px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.empty-title {
  color: #7a8299;
  font-size: 13px;
}

/* Table */
.table-card {
  overflow: hidden;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table thead th {
  background: #1a1f2a;
  border-bottom: 1px solid #232936;
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
  padding: 10px 18px;
}
.data-table tbody td {
  padding: 14px 18px;
  border-bottom: 1px solid #232936;
  font-size: 13px;
  color: #eef0f4;
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

.cand-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2c3242, #1a1f2a);
  border: 1px solid #232936;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #eef0f4;
  flex-shrink: 0;
}
.cand-name {
  font-size: 13px;
  font-weight: 500;
  color: #eef0f4;
}
.cand-email {
  font-size: 11.5px;
  color: #7a8299;
  margin-top: 2px;
}
.role-name {
  font-size: 13px;
  color: #eef0f4;
}
.role-company {
  font-size: 11.5px;
  color: #7a8299;
  margin-top: 2px;
}

.t-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #c8ccd6;
}
.t-muted {
  color: #7a8299;
}
.t-cap {
  text-transform: capitalize;
}
.t-right {
  text-align: right;
}

.link-btn {
  background: transparent;
  border: none;
  color: #6b5bff;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 6px;
  font-family: inherit;
}
.link-btn:hover {
  color: #8a7dff;
}

/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid transparent;
  text-transform: capitalize;
  letter-spacing: 0.01em;
}
.badge-ok {
  background: rgba(77, 211, 154, 0.12);
  color: #4dd39a;
  border-color: rgba(77, 211, 154, 0.25);
}
.badge-accent {
  background: rgba(107, 91, 255, 0.12);
  color: #9b8eff;
  border-color: rgba(107, 91, 255, 0.25);
}
.badge-danger {
  background: rgba(243, 130, 136, 0.12);
  color: #f38288;
  border-color: rgba(243, 130, 136, 0.25);
}
.badge-neutral {
  background: #1a1f2a;
  color: #c8ccd6;
  border-color: #232936;
}
</style>
