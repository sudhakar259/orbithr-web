<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import lndService from '@/services/lndService'
import type { TrainingProgram } from '@/services/lndService'
import { useAuth } from '@/composables/useAuth'

const { hasPermission } = useAuth()
const canManage = hasPermission('manage training programs')

const loading = ref(true)
const programs = ref<TrainingProgram[]>([])
const error = ref('')
const statusFilter = ref('')

async function loadPrograms() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {}
    if (statusFilter.value) params.status = statusFilter.value
    const res = await lndService.getPrograms(params)
    programs.value = res.data.data
  } catch {
    error.value = 'Failed to load programs.'
  } finally {
    loading.value = false
  }
}

function programTypeClass(type: string) {
  switch (type) {
    case 'onboarding':
      return 'pill-purple'
    case 'compliance':
      return 'pill-red'
    case 'role_based':
      return 'pill-yellow'
    default:
      return 'pill-muted'
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'active':
      return 'pill-green'
    case 'completed':
      return 'pill-purple'
    case 'draft':
      return 'pill-muted'
    case 'archived':
      return 'pill-red'
    default:
      return 'pill-muted'
  }
}

onMounted(loadPrograms)
</script>

<template>
  <div class="lnd-programs">
    <div class="page-toolbar">
      <div class="filter-row">
        <select v-model="statusFilter" class="input" @change="loadPrograms">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <RouterLink
        v-if="canManage"
        :to="{ name: 'lnd.programs.create' }"
        class="btn-primary"
      >
        + New Program
      </RouterLink>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="loading" class="program-list">
      <div v-for="n in 4" :key="n" class="program-card skeleton">
        <div class="skeleton-line w-1-3" />
        <div class="skeleton-line w-2-3" />
      </div>
    </div>

    <div v-else-if="programs.length" class="program-list">
      <RouterLink
        v-for="program in programs"
        :key="program.id"
        :to="{ name: 'lnd.programs.show', params: { id: program.id } }"
        class="program-card"
      >
        <div class="program-row">
          <div class="program-meta">
            <div class="program-title-row">
              <h3 class="program-title">{{ program.title }}</h3>
              <span :class="['pill', statusClass(program.status)]">
                {{ program.status }}
              </span>
              <span :class="['pill', programTypeClass(program.program_type)]">
                {{ program.program_type.replace('_', ' ') }}
              </span>
              <span v-if="program.is_mandatory" class="pill pill-purple">mandatory</span>
            </div>
            <p class="program-desc">
              {{ program.description || 'No description' }}
            </p>
          </div>
          <div class="program-stats">
            <p class="program-enrolled">{{ program.enrolled_count }} enrolled</p>
            <p v-if="program.start_date" class="program-dates">
              {{ program.start_date }} &mdash; {{ program.end_date || 'ongoing' }}
            </p>
          </div>
        </div>
      </RouterLink>
    </div>

    <div v-else class="empty-card">No training programs found.</div>
  </div>
</template>

<style scoped>
.lnd-programs {
  color: #eef0f4;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.input {
  background: #161a23;
  border: 1px solid #232936;
  color: #eef0f4;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
}

.input:focus {
  border-color: #6b5bff;
}

.btn-primary {
  background: #6b5bff;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: #5a4be8;
}

.alert {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
}

.alert-error {
  background: rgba(243, 130, 136, 0.12);
  border: 1px solid rgba(243, 130, 136, 0.4);
  color: #f38288;
}

.program-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.program-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 16px 18px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease;
  display: block;
}

.program-card:hover {
  border-color: #6b5bff;
}

.program-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.program-meta {
  flex: 1;
  min-width: 0;
}

.program-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.program-title {
  font-size: 14px;
  color: #eef0f4;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.005em;
}

.program-desc {
  font-size: 11.5px;
  color: #7a8299;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.program-stats {
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

.program-enrolled {
  font-size: 12.5px;
  color: #eef0f4;
  margin: 0;
  font-weight: 500;
}

.program-dates {
  font-size: 10.5px;
  color: #7a8299;
  margin: 2px 0 0;
}

.pill {
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
}

.pill-green {
  background: rgba(77, 211, 154, 0.14);
  color: #4dd39a;
}

.pill-yellow {
  background: rgba(245, 166, 35, 0.14);
  color: #f5a623;
}

.pill-red {
  background: rgba(243, 130, 136, 0.14);
  color: #f38288;
}

.pill-purple {
  background: rgba(107, 91, 255, 0.16);
  color: #6b5bff;
}

.pill-muted {
  background: rgba(122, 130, 153, 0.16);
  color: #7a8299;
}

.empty-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  color: #7a8299;
  font-size: 13px;
}

.skeleton {
  position: relative;
  overflow: hidden;
}

.skeleton-line {
  height: 12px;
  background: #232936;
  border-radius: 6px;
  margin-bottom: 8px;
}

.w-1-3 {
  width: 33%;
}

.w-2-3 {
  width: 66%;
}
</style>
