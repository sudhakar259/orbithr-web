<script setup lang="ts">
defineOptions({ name: 'RecruitmentCandidateDetail' })
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { recruitmentService, type Candidate } from '@/services/recruitmentService'
import api from '@/services/api'
import EmptyState from '@/components/ui/EmptyState.vue'
import ComposeEmailModal from '@/components/recruitment/ComposeEmailModal.vue'

const router = useRouter()
const route = useRoute()
const loading = ref(true)
const candidate = ref<Candidate | null>(null)
const error = ref('')

const load = async () => {
  loading.value = true
  try {
    const res = await recruitmentService.getCandidate(Number(route.params.id))
    candidate.value = res.data?.data ?? res.data
  } catch {
    error.value = 'Failed to load candidate'
  } finally {
    loading.value = false
  }
}

const statusPill = (status: string) => {
  const map: Record<string, string> = {
    active: 'pill pill-green',
    passive: 'pill pill-muted',
    hired: 'pill pill-accent',
    blacklisted: 'pill pill-red',
  }
  return map[status] ?? 'pill pill-muted'
}

const proficiencyPill = (level: string) => {
  const map: Record<string, string> = {
    beginner: 'pill pill-muted',
    intermediate: 'pill pill-accent',
    advanced: 'pill pill-purple',
    expert: 'pill pill-yellow',
  }
  return map[level] ?? 'pill pill-muted'
}

const appStatusPill = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'pill pill-accent',
    shortlisted: 'pill pill-purple',
    hired: 'pill pill-green',
    rejected: 'pill pill-red',
    offered: 'pill pill-yellow',
  }
  return map[status] ?? 'pill pill-muted'
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

interface Assessment {
  id: number
  platform: string
  assessment_title: string
  status: string
  score: number | null
  max_score: number | null
  result_data: Record<string, unknown> | null
  completed_at: string | null
  expires_at: string | null
  invite_email_sent: boolean
}

const assessments = ref<Assessment[]>([])
const loadingAssessments = ref(false)

const loadAssessments = async () => {
  loadingAssessments.value = true
  try {
    const res = await api.get(`/assessments/candidate/${route.params.id}`)
    assessments.value = res.data?.data ?? res.data ?? []
  } catch {
    assessments.value = []
  } finally {
    loadingAssessments.value = false
  }
}

const scorePercent = (a: Assessment) =>
  a.score != null && a.max_score ? Math.round((a.score / a.max_score) * 100) : null

const passFail = (a: Assessment) => {
  const pct = scorePercent(a)
  if (pct == null) return null
  return pct >= 70 ? 'pass' : 'fail'
}

const assessmentStatusPill = (status: string) => {
  const map: Record<string, string> = {
    pending: 'pill pill-muted',
    sent: 'pill pill-accent',
    in_progress: 'pill pill-yellow',
    completed: 'pill pill-green',
    expired: 'pill pill-red',
  }
  return map[status] ?? 'pill pill-muted'
}

const platformLabel: Record<string, string> = {
  hackerrank: 'HackerRank', testgorilla: 'TestGorilla',
  codility: 'Codility', mettl: 'Mettl', custom: 'Custom',
}

const onTabAssessments = () => {
  activeTab.value = 'assessments'
  if (!assessments.value.length) loadAssessments()
}

interface EmailThread {
  id: number
  candidate_id: number
  candidate_name: string
  subject: string
  last_message_at: string
  messages_count: number
}

const activeTab = ref<'details' | 'assessments' | 'emails'>('details')
const emailThreads = ref<EmailThread[]>([])
const loadingEmails = ref(false)
const showCompose = ref(false)

const loadEmails = async () => {
  loadingEmails.value = true
  try {
    const res = await api.get('/email-integration/threads', { params: { candidate_id: route.params.id } })
    emailThreads.value = res.data?.data ?? res.data ?? []
  } catch {
    emailThreads.value = []
  } finally {
    loadingEmails.value = false
  }
}

const onTabEmails = () => {
  activeTab.value = 'emails'
  if (!emailThreads.value.length) loadEmails()
}

const onComposeSent = () => {
  showCompose.value = false
  loadEmails()
}

onMounted(load)
</script>

<template>
  <div class="candidate-detail">
    <button class="back-btn" @click="router.push({ name: 'recruitment.candidates' })">
      <span class="arrow">&larr;</span> Back to Candidates
    </button>

    <div v-if="loading" class="card skeleton-card">
      <div class="skeleton-line w-1-3" />
      <div class="skeleton-line w-2-3" />
    </div>

    <div v-else-if="error" class="alert alert-error">{{ error }}</div>

    <template v-else-if="candidate">
      <!-- Profile Header -->
      <div class="card profile-card">
        <div class="profile-row">
          <div class="profile-left">
            <div class="avatar">
              {{ (candidate.first_name[0] + candidate.last_name[0]).toUpperCase() }}
            </div>
            <div>
              <div class="name-row">
                <h1 class="profile-name">{{ candidate.first_name }} {{ candidate.last_name }}</h1>
                <span :class="statusPill(candidate.status)">{{ candidate.status }}</span>
              </div>
              <p v-if="candidate.current_title" class="profile-title">
                {{ candidate.current_title }}<span v-if="candidate.current_company"> at {{ candidate.current_company }}</span>
              </p>
              <div class="profile-contact">
                <span>{{ candidate.email }}</span>
                <span v-if="candidate.phone">&middot; {{ candidate.phone }}</span>
                <span v-if="candidate.location">&middot; {{ candidate.location }}</span>
              </div>
            </div>
          </div>
          <button class="btn-secondary" @click="router.push({ name: 'recruitment.candidates.edit', params: { id: candidate.id } })">
            Edit
          </button>
        </div>
      </div>

      <div class="grid-3">
        <!-- Left column -->
        <div class="left-col">
          <!-- Quick info -->
          <div class="card section">
            <h3 class="eyebrow">Details</h3>
            <div class="info-list">
              <div v-if="candidate.total_experience_years != null" class="info-row">
                <span class="info-label">Experience</span>
                <span class="info-value">{{ candidate.total_experience_years }} yrs</span>
              </div>
              <div v-if="candidate.expected_salary" class="info-row">
                <span class="info-label">Expected Salary</span>
                <span class="info-value">{{ candidate.expected_salary.toLocaleString() }}</span>
              </div>
              <div v-if="candidate.notice_period_days != null" class="info-row">
                <span class="info-label">Notice Period</span>
                <span class="info-value">{{ candidate.notice_period_days }} days</span>
              </div>
              <div class="info-row">
                <span class="info-label">Source</span>
                <span class="info-value cap">{{ candidate.source ?? '—' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Added</span>
                <span class="info-value">{{ formatDate(candidate.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Links -->
          <div v-if="candidate.linkedin_url || candidate.portfolio_url" class="card section">
            <h3 class="eyebrow">Links</h3>
            <div class="link-list">
              <a v-if="candidate.linkedin_url" :href="candidate.linkedin_url" target="_blank" rel="noopener" class="link-item">
                LinkedIn
              </a>
              <a v-if="candidate.portfolio_url" :href="candidate.portfolio_url" target="_blank" rel="noopener" class="link-item">
                Portfolio
              </a>
            </div>
          </div>

          <!-- Skills -->
          <div v-if="candidate.skills?.length" class="card section">
            <h3 class="eyebrow">Skills</h3>
            <div class="skill-list">
              <span v-for="s in candidate.skills" :key="s.id" :class="proficiencyPill(s.proficiency_level)">
                {{ s.skill }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="right-col">
          <!-- Tabs -->
          <div class="tab-nav">
            <button :class="['tab-btn', { active: activeTab === 'details' }]" @click="activeTab = 'details'">Details</button>
            <button :class="['tab-btn', { active: activeTab === 'assessments' }]" @click="onTabAssessments">Assessments</button>
            <button :class="['tab-btn', { active: activeTab === 'emails' }]" @click="onTabEmails">Emails</button>
          </div>

          <template v-if="activeTab === 'details'">
            <div v-if="candidate.notes" class="card section">
              <h3 class="eyebrow">Notes</h3>
              <p class="notes-text">{{ candidate.notes }}</p>
            </div>

            <div class="card list-card">
              <div class="list-header">
                <h3 class="list-title">Application History</h3>
              </div>
              <div v-if="!candidate.applications?.length" class="empty">No applications linked yet.</div>
              <div v-else class="divide">
                <div v-for="app in candidate.applications" :key="app.id" class="list-row">
                  <div>
                    <p class="row-title">{{ app.job_posting?.title ?? 'Unknown Position' }}</p>
                    <p class="row-sub">Applied {{ formatDate(app.submitted_at) }}</p>
                  </div>
                  <span :class="appStatusPill(app.status)">{{ app.status.replace(/_/g, ' ') }}</span>
                </div>
              </div>
            </div>
          </template>

          <template v-if="activeTab === 'assessments'">
            <div class="card list-card">
              <div class="list-header">
                <h3 class="list-title">Assessments</h3>
                <span class="meta">{{ assessments.length }} assigned</span>
              </div>
              <div v-if="loadingAssessments" class="skeleton-block">
                <div class="skeleton-line" />
                <div class="skeleton-line" />
              </div>
              <div v-else-if="!assessments.length" class="empty">No assessments assigned to this candidate yet.</div>
              <div v-else class="divide">
                <div v-for="a in assessments" :key="a.id" class="list-row">
                  <div class="row-main">
                    <div class="row-title-wrap">
                      <p class="row-title">{{ a.assessment_title }}</p>
                      <span class="platform-tag">{{ platformLabel[a.platform] ?? a.platform }}</span>
                    </div>
                    <div class="row-meta">
                      <span :class="assessmentStatusPill(a.status)">{{ a.status.replace(/_/g, ' ') }}</span>
                      <span v-if="a.completed_at" class="meta-text">Completed {{ formatDate(a.completed_at) }}</span>
                      <span v-else-if="a.expires_at" class="meta-text">Expires {{ formatDate(a.expires_at) }}</span>
                    </div>
                  </div>
                  <div class="score-cell">
                    <template v-if="scorePercent(a) !== null">
                      <p class="score" :class="passFail(a) === 'pass' ? 'score-pass' : 'score-fail'">
                        {{ scorePercent(a) }}%
                      </p>
                      <span class="pf" :class="passFail(a) === 'pass' ? 'score-pass' : 'score-fail'">
                        {{ passFail(a) === 'pass' ? 'Pass' : 'Fail' }}
                      </span>
                    </template>
                    <span v-else class="meta-text">—</span>
                  </div>
                </div>
              </div>
              <div v-if="assessments.length" class="summary-row">
                <span>Completed: <strong>{{ assessments.filter(a => a.status === 'completed').length }}</strong></span>
                <span>Passed: <strong class="text-green">{{ assessments.filter(a => passFail(a) === 'pass').length }}</strong></span>
                <span>Failed: <strong class="text-red">{{ assessments.filter(a => passFail(a) === 'fail').length }}</strong></span>
                <span v-if="assessments.filter(a => scorePercent(a) !== null).length">
                  Avg Score: <strong>
                    {{ Math.round(assessments.filter(a => scorePercent(a) !== null).reduce((s, a) => s + scorePercent(a)!, 0) / assessments.filter(a => scorePercent(a) !== null).length) }}%
                  </strong>
                </span>
              </div>
            </div>
          </template>

          <template v-if="activeTab === 'emails'">
            <div class="card list-card">
              <div class="list-header">
                <h3 class="list-title">Email Conversations</h3>
                <button class="btn-primary-sm" @click="showCompose = true">+ Compose Email</button>
              </div>
              <div v-if="loadingEmails" class="skeleton-block">
                <div class="skeleton-line" />
                <div class="skeleton-line" />
              </div>
              <div v-else-if="!emailThreads.length">
                <EmptyState icon="&#x2709;&#xFE0F;" message="No emails yet" sub="Compose the first email to this candidate." />
              </div>
              <div v-else class="divide">
                <div v-for="thread in emailThreads" :key="thread.id" class="list-row">
                  <div>
                    <p class="row-title">{{ thread.subject }}</p>
                    <p class="row-sub">{{ formatDate(thread.last_message_at) }}</p>
                  </div>
                  <span class="pill pill-muted">
                    {{ thread.messages_count }} {{ thread.messages_count === 1 ? 'message' : 'messages' }}
                  </span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>

    <ComposeEmailModal
      :visible="showCompose"
      :candidate-id="candidate?.id"
      :candidate-name="candidate ? `${candidate.first_name} ${candidate.last_name}` : undefined"
      @close="showCompose = false"
      @sent="onComposeSent"
    />
  </div>
</template>

<style scoped>
.candidate-detail {
  color: #eef0f4;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.back-btn {
  background: transparent;
  border: none;
  color: #7a8299;
  font-size: 12.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  align-self: flex-start;
  transition: color 0.15s ease;
}
.back-btn:hover { color: #eef0f4; }
.arrow { font-size: 14px; }

.card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
}

.alert-error {
  background: rgba(243, 130, 136, 0.12);
  border: 1px solid rgba(243, 130, 136, 0.4);
  color: #f38288;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 13px;
}

/* Profile header */
.profile-card { padding: 22px; }
.profile-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.profile-left { display: flex; align-items: center; gap: 16px; }
.avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: linear-gradient(135deg, #4d2eaa 0%, #6b5bff 100%);
  color: #fff; font-weight: 700; font-size: 22px;
  display: flex; align-items: center; justify-content: center;
}
.name-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.profile-name {
  font-family: 'Instrument Serif', serif;
  font-size: 28px;
  color: #eef0f4;
  margin: 0;
  letter-spacing: -0.02em;
}
.profile-title { color: #7a8299; margin: 4px 0 0; font-size: 13px; }
.profile-contact {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-top: 8px; font-size: 12.5px; color: #7a8299;
}

.btn-secondary {
  background: #1c2030;
  border: 1px solid #232936;
  color: #eef0f4;
  font-size: 12.5px; font-weight: 500;
  padding: 8px 14px; border-radius: 8px;
  cursor: pointer; transition: border-color 0.15s ease;
}
.btn-secondary:hover { border-color: #6b5bff; }

.btn-primary-sm {
  background: #6b5bff;
  border: none; color: #fff;
  font-size: 12px; font-weight: 500;
  padding: 6px 12px; border-radius: 7px;
  cursor: pointer; transition: background 0.15s ease;
}
.btn-primary-sm:hover { background: #5a4be8; }

/* Grid */
.grid-3 {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
}
@media (max-width: 1024px) {
  .grid-3 { grid-template-columns: 1fr; }
}
.left-col, .right-col { display: flex; flex-direction: column; gap: 16px; }

/* Section card */
.section { padding: 18px; display: flex; flex-direction: column; gap: 12px; }

.eyebrow {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a8299;
  margin: 0;
  font-weight: 500;
}

.info-list { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; justify-content: space-between; font-size: 12.5px; }
.info-label { color: #7a8299; }
.info-value { color: #eef0f4; font-weight: 500; }
.cap { text-transform: capitalize; }

.link-list { display: flex; flex-direction: column; gap: 6px; }
.link-item {
  font-size: 12.5px; color: #6b5bff;
  text-decoration: none; transition: color 0.15s ease;
}
.link-item:hover { color: #8a7cff; }

.skill-list { display: flex; flex-wrap: wrap; gap: 6px; }

/* Pills */
.pill {
  font-size: 10.5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
}
.pill-green { background: rgba(77, 211, 154, 0.14); color: #4dd39a; }
.pill-yellow { background: rgba(245, 166, 35, 0.14); color: #f5a623; }
.pill-red { background: rgba(243, 130, 136, 0.14); color: #f38288; }
.pill-purple { background: rgba(155, 110, 255, 0.16); color: #9b6eff; }
.pill-accent { background: rgba(107, 91, 255, 0.16); color: #6b5bff; }
.pill-muted { background: rgba(122, 130, 153, 0.16); color: #7a8299; }

/* Tabs */
.tab-nav {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid #232936;
  padding-bottom: 1px;
}
.tab-btn {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #7a8299;
  font-size: 12.5px;
  font-weight: 500;
  padding: 0 2px 12px;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
  margin-bottom: -1px;
}
.tab-btn:hover { color: #eef0f4; }
.tab-btn.active { color: #eef0f4; border-bottom-color: #6b5bff; }

.notes-text {
  font-size: 12.5px; color: #7a8299;
  white-space: pre-wrap; margin: 0;
}

/* List cards */
.list-card { overflow: hidden; }
.list-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid #232936;
}
.list-title { font-size: 14px; color: #eef0f4; font-weight: 600; margin: 0; }
.meta { font-size: 11px; color: #7a8299; }

.divide > .list-row + .list-row { border-top: 1px solid #232936; }
.list-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; gap: 12px;
  transition: background 0.15s ease;
}
.list-row:hover { background: rgba(35, 41, 54, 0.4); }

.row-main { flex: 1; min-width: 0; }
.row-title-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.row-title { font-size: 13px; color: #eef0f4; font-weight: 500; margin: 0; }
.row-sub { font-size: 11.5px; color: #7a8299; margin: 2px 0 0; }
.row-meta { display: flex; align-items: center; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
.meta-text { font-size: 11px; color: #7a8299; }

.platform-tag {
  font-size: 10.5px; color: #7a8299;
  background: rgba(122, 130, 153, 0.16);
  padding: 2px 6px; border-radius: 4px;
}

.score-cell { text-align: right; flex-shrink: 0; }
.score {
  font-size: 18px; font-weight: 700; margin: 0;
  font-family: 'JetBrains Mono', monospace;
}
.pf { font-size: 11px; font-weight: 600; }
.score-pass { color: #4dd39a; }
.score-fail { color: #f38288; }

.empty {
  padding: 28px 18px;
  text-align: center;
  color: #7a8299;
  font-size: 12.5px;
}

.summary-row {
  padding: 12px 18px;
  background: rgba(35, 41, 54, 0.4);
  border-top: 1px solid #232936;
  display: flex; flex-wrap: wrap; gap: 18px;
  font-size: 11.5px; color: #7a8299;
}
.summary-row strong { color: #eef0f4; }
.text-green { color: #4dd39a !important; }
.text-red { color: #f38288 !important; }

/* Skeletons */
.skeleton-card { padding: 22px; }
.skeleton-block { padding: 18px; display: flex; flex-direction: column; gap: 10px; }
.skeleton-line {
  height: 12px;
  background: #232936;
  border-radius: 6px;
  margin-bottom: 8px;
}
.w-1-3 { width: 33%; }
.w-2-3 { width: 66%; }
</style>
