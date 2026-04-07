<script setup lang="ts">
defineOptions({ name: 'AiFeatures' })

import { ref, onMounted } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'

/* ── Types ─────────────────────────────────────────── */
interface AiInsight {
  id: number
  type: 'attrition' | 'performance' | 'engagement' | 'compliance' | 'hiring'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  action: string
}

interface CandidateScore {
  id: number
  name: string
  position: string
  match_score: number
  skills_match: number
  experience_match: number
  status: 'shortlisted' | 'under_review' | 'rejected' | 'new'
}

interface AttritionRisk {
  employee_id: number
  name: string
  department: string
  risk_score: number
  factors: string[]
  predicted_date: string
}

interface AiFeature {
  id: string
  name: string
  icon: string
  description: string
  status: 'active' | 'beta' | 'coming_soon'
  color: string
}

interface AiActivity {
  id: number
  action: string
  feature: string
  timestamp: string
  result: string
}

/* ── State ─────────────────────────────────────────── */
const loading = ref(true)
const activeSection = ref<string | null>(null)
const sentimentScore = ref(72)
const departmentSentiment = ref<{ name: string; score: number }[]>([])
const dragOver = ref(false)

/* ── Features ──────────────────────────────────────── */
const aiFeatures = ref<AiFeature[]>([
  { id: 'resume', name: 'Resume Screening', icon: '📄', description: 'AI-powered resume parsing and candidate scoring against job requirements', status: 'active', color: 'blue' },
  { id: 'attrition', name: 'Attrition Predictor', icon: '📊', description: 'Predict employee attrition risk using ML models trained on historical data', status: 'active', color: 'red' },
  { id: 'sentiment', name: 'Sentiment Analysis', icon: '😊', description: 'Analyse employee sentiment from surveys, feedback, and communication patterns', status: 'beta', color: 'green' },
  { id: 'scheduling', name: 'Smart Scheduling', icon: '📅', description: 'Optimise shift schedules and meeting times using AI-driven availability analysis', status: 'beta', color: 'yellow' },
  { id: 'jd', name: 'Auto Job Descriptions', icon: '✍️', description: 'Generate compelling job descriptions from minimal input using large language models', status: 'active', color: 'purple' },
  { id: 'predictive', name: 'Predictive Analytics', icon: '🔮', description: 'Forecast headcount needs, budget impact, and workforce planning insights', status: 'coming_soon', color: 'blue' },
])

/* ── Mock Data ─────────────────────────────────────── */
const aiInsights = ref<AiInsight[]>([
  { id: 1, type: 'attrition', title: 'High attrition risk in Engineering', description: '3 senior engineers show elevated attrition signals: reduced commits, missed standup attendance, and LinkedIn activity spike.', impact: 'high', confidence: 87, action: 'Schedule 1:1 retention meetings' },
  { id: 2, type: 'hiring', title: 'Time-to-hire trending up', description: 'Average time-to-hire increased from 28 to 41 days this quarter. Bottleneck identified in technical interview scheduling.', impact: 'medium', confidence: 92, action: 'Review interview process' },
  { id: 3, type: 'engagement', title: 'Low engagement in Finance team', description: 'Finance department engagement scores dropped 18% in Q1. Key drivers: limited growth opportunities and compensation concerns.', impact: 'high', confidence: 79, action: 'Plan team workshop' },
  { id: 4, type: 'compliance', title: 'Document renewals approaching', description: '12 employees have work permits expiring within 60 days. 4 are in critical roles with no identified backup.', impact: 'medium', confidence: 95, action: 'Initiate renewal process' },
  { id: 5, type: 'performance', title: 'Performance review gap detected', description: '23 employees have not received a performance review in over 8 months. Majority are in Operations department.', impact: 'low', confidence: 100, action: 'Schedule pending reviews' },
])

const candidateScores = ref<CandidateScore[]>([
  { id: 1, name: 'Priya Sharma', position: 'Senior Frontend Developer', match_score: 94, skills_match: 96, experience_match: 91, status: 'shortlisted' },
  { id: 2, name: 'Rahul Mehta', position: 'Senior Frontend Developer', match_score: 88, skills_match: 85, experience_match: 92, status: 'shortlisted' },
  { id: 3, name: 'Anjali Krishnan', position: 'Senior Frontend Developer', match_score: 82, skills_match: 89, experience_match: 74, status: 'under_review' },
  { id: 4, name: 'Vikram Patel', position: 'Senior Frontend Developer', match_score: 76, skills_match: 72, experience_match: 81, status: 'under_review' },
  { id: 5, name: 'Sneha Reddy', position: 'Senior Frontend Developer', match_score: 71, skills_match: 78, experience_match: 63, status: 'new' },
  { id: 6, name: 'Arjun Nair', position: 'Senior Frontend Developer', match_score: 65, skills_match: 60, experience_match: 71, status: 'rejected' },
])

const attritionRisks = ref<AttritionRisk[]>([
  { employee_id: 101, name: 'Karthik Iyer', department: 'Engineering', risk_score: 89, factors: ['Stagnant role', 'Market demand', 'No promotion in 2 years'], predicted_date: '2026-06-15' },
  { employee_id: 102, name: 'Deepa Nair', department: 'Engineering', risk_score: 82, factors: ['Below market pay', 'Remote preference denied'], predicted_date: '2026-07-20' },
  { employee_id: 103, name: 'Amit Deshmukh', department: 'Product', risk_score: 74, factors: ['Manager change', 'Team restructuring'], predicted_date: '2026-08-10' },
  { employee_id: 104, name: 'Sunita Joshi', department: 'Design', risk_score: 68, factors: ['Limited growth path', 'Competitor outreach'], predicted_date: '2026-09-01' },
  { employee_id: 105, name: 'Rajesh Kumar', department: 'Operations', risk_score: 61, factors: ['Commute distance', 'Shift timing'], predicted_date: '2026-10-15' },
])

const aiActivities = ref<AiActivity[]>([
  { id: 1, action: 'Screened 14 resumes for Senior Frontend Developer', feature: 'Resume Screening', timestamp: '2026-04-08T10:30:00Z', result: '4 shortlisted, 8 under review, 2 rejected' },
  { id: 2, action: 'Updated attrition risk scores for 156 employees', feature: 'Attrition Predictor', timestamp: '2026-04-08T06:00:00Z', result: '5 high-risk, 12 medium-risk identified' },
  { id: 3, action: 'Analysed Q1 pulse survey responses', feature: 'Sentiment Analysis', timestamp: '2026-04-07T18:00:00Z', result: 'Overall sentiment: 72/100 (down 4 points)' },
  { id: 4, action: 'Generated job description for Product Manager role', feature: 'Auto Job Descriptions', timestamp: '2026-04-07T14:22:00Z', result: 'Published to 3 job boards' },
  { id: 5, action: 'Optimised April shift schedule for Operations', feature: 'Smart Scheduling', timestamp: '2026-04-06T09:00:00Z', result: 'Reduced conflicts by 34%' },
])

departmentSentiment.value = [
  { name: 'Engineering', score: 78 },
  { name: 'Product', score: 75 },
  { name: 'Design', score: 82 },
  { name: 'Operations', score: 64 },
  { name: 'Finance', score: 58 },
  { name: 'HR', score: 85 },
  { name: 'Sales', score: 71 },
]

/* ── Helpers ───────────────────────────────────────── */
function getImpactClass(impact: string) {
  return impact === 'high' ? 'impact-high' : impact === 'medium' ? 'impact-medium' : 'impact-low'
}

function getStatusClass(status: string) {
  if (status === 'shortlisted') return 'status-green'
  if (status === 'under_review') return 'status-yellow'
  if (status === 'rejected') return 'status-red'
  return 'status-blue'
}

function getScoreColor(score: number) {
  if (score >= 80) return '#36D399'
  if (score >= 60) return '#F9A825'
  return '#FF6B6B'
}

function getSentimentColor(score: number) {
  if (score >= 75) return '#36D399'
  if (score >= 60) return '#F9A825'
  return '#FF6B6B'
}

function getFeatureStatusLabel(status: string) {
  if (status === 'active') return 'Active'
  if (status === 'beta') return 'Beta'
  return 'Coming Soon'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function toggleSection(id: string) {
  activeSection.value = activeSection.value === id ? null : id
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  // In production, handle file upload here
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

onMounted(() => {
  setTimeout(() => { loading.value = false }, 600)
})
</script>

<template>
  <div class="ai-page">
    <PageHeader title="AI-Powered HR" subtitle="Intelligent insights powered by machine learning">
      <template #actions>
        <div class="ai-badge">
          <span class="ai-pulse"></span>
          AI Engine Active
        </div>
      </template>
    </PageHeader>

    <!-- Loading skeleton -->
    <div v-if="loading" class="skeleton-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card">
        <div class="sk-icon"></div>
        <div class="sk-line w60"></div>
        <div class="sk-line w80"></div>
        <div class="sk-line w40"></div>
      </div>
    </div>

    <template v-else>
      <!-- AI Feature Cards -->
      <div class="features-grid">
        <div
          v-for="(f, i) in aiFeatures" :key="f.id"
          class="feature-card" :class="[f.color, { expanded: activeSection === f.id }]"
          :style="{ '--fi': i }"
          @click="f.status !== 'coming_soon' && toggleSection(f.id)"
        >
          <div class="fc-header">
            <div class="fc-icon-wrap" :class="f.color">
              <span class="fc-icon">{{ f.icon }}</span>
            </div>
            <span class="fc-status" :class="f.status">{{ getFeatureStatusLabel(f.status) }}</span>
          </div>
          <h3 class="fc-name">{{ f.name }}</h3>
          <p class="fc-desc">{{ f.description }}</p>
          <button
            class="fc-btn" :class="{ disabled: f.status === 'coming_soon' }"
            :disabled="f.status === 'coming_soon'"
          >
            {{ f.status === 'coming_soon' ? 'Coming Soon' : 'Launch' }}
          </button>
        </div>
      </div>

      <!-- AI Insights -->
      <div class="section-card">
        <div class="sc-head">
          <div>
            <h2 class="sc-title">AI Insights</h2>
            <p class="sc-sub">{{ aiInsights.length }} actionable insights detected</p>
          </div>
        </div>
        <div class="insights-list">
          <div v-for="insight in aiInsights" :key="insight.id" class="insight-card">
            <div class="insight-left">
              <span class="insight-impact" :class="getImpactClass(insight.impact)">
                {{ insight.impact }}
              </span>
              <div class="insight-body">
                <h4 class="insight-title">{{ insight.title }}</h4>
                <p class="insight-desc">{{ insight.description }}</p>
              </div>
            </div>
            <div class="insight-right">
              <div class="confidence-bar-wrap">
                <div class="confidence-label">{{ insight.confidence }}% confidence</div>
                <div class="confidence-track">
                  <div
                    class="confidence-fill"
                    :style="{ width: insight.confidence + '%', background: getScoreColor(insight.confidence) }"
                  ></div>
                </div>
              </div>
              <button class="action-btn">{{ insight.action }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resume Screening Panel -->
      <div class="section-card" v-if="activeSection === 'resume' || !activeSection">
        <div class="sc-head">
          <div>
            <h2 class="sc-title">Resume Screening</h2>
            <p class="sc-sub">AI-scored candidates for open positions</p>
          </div>
        </div>
        <div class="resume-section">
          <!-- Drop zone -->
          <div
            class="drop-zone" :class="{ 'drag-active': dragOver }"
            @drop="handleDrop" @dragover="handleDragOver" @dragleave="dragOver = false"
          >
            <div class="dz-icon">📎</div>
            <div class="dz-text">Drag & drop resumes here</div>
            <div class="dz-sub">PDF, DOC, DOCX up to 10MB each</div>
            <button class="dz-btn">Browse Files</button>
          </div>

          <!-- Candidate scoring table -->
          <div class="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Match Score</th>
                  <th>Skills</th>
                  <th>Experience</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in candidateScores" :key="c.id">
                  <td>
                    <div class="cand-info">
                      <div class="cand-name">{{ c.name }}</div>
                      <div class="cand-pos">{{ c.position }}</div>
                    </div>
                  </td>
                  <td>
                    <div class="score-cell">
                      <div class="score-bar-wrap">
                        <div class="score-bar" :style="{ width: c.match_score + '%', background: getScoreColor(c.match_score) }"></div>
                      </div>
                      <span class="score-val" :style="{ color: getScoreColor(c.match_score) }">{{ c.match_score }}%</span>
                    </div>
                  </td>
                  <td>
                    <div class="score-cell">
                      <div class="score-bar-wrap sm">
                        <div class="score-bar" :style="{ width: c.skills_match + '%', background: getScoreColor(c.skills_match) }"></div>
                      </div>
                      <span class="score-num">{{ c.skills_match }}%</span>
                    </div>
                  </td>
                  <td>
                    <div class="score-cell">
                      <div class="score-bar-wrap sm">
                        <div class="score-bar" :style="{ width: c.experience_match + '%', background: getScoreColor(c.experience_match) }"></div>
                      </div>
                      <span class="score-num">{{ c.experience_match }}%</span>
                    </div>
                  </td>
                  <td>
                    <span class="status-pill" :class="getStatusClass(c.status)">
                      {{ c.status.replace('_', ' ') }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Attrition Risk & Sentiment Row -->
      <div class="two-col">
        <!-- Attrition Risk -->
        <div class="section-card">
          <div class="sc-head">
            <div>
              <h2 class="sc-title">Attrition Risk</h2>
              <p class="sc-sub">Employees with elevated risk scores</p>
            </div>
          </div>
          <div class="risk-list">
            <div v-for="emp in attritionRisks" :key="emp.employee_id" class="risk-item">
              <div class="risk-header">
                <div class="risk-info">
                  <span class="risk-name">{{ emp.name }}</span>
                  <span class="risk-dept">{{ emp.department }}</span>
                </div>
                <div class="risk-score-badge" :style="{ background: getScoreColor(100 - emp.risk_score) + '1a', color: getScoreColor(100 - emp.risk_score) }">
                  {{ emp.risk_score }}%
                </div>
              </div>
              <div class="risk-bar-track">
                <div class="risk-bar-fill" :style="{ width: emp.risk_score + '%', background: getScoreColor(100 - emp.risk_score) }"></div>
              </div>
              <div class="risk-factors">
                <span v-for="(factor, fi) in emp.factors" :key="fi" class="risk-tag">{{ factor }}</span>
              </div>
              <div class="risk-predicted">
                Predicted by {{ new Date(emp.predicted_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Sentiment -->
        <div class="section-card">
          <div class="sc-head">
            <div>
              <h2 class="sc-title">Sentiment Analysis</h2>
              <p class="sc-sub">Company-wide employee sentiment</p>
            </div>
          </div>
          <div class="sentiment-content">
            <!-- Gauge -->
            <div class="gauge-wrap">
              <svg viewBox="0 0 120 70" class="gauge-svg">
                <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke="var(--surface3)" stroke-width="10" stroke-linecap="round" />
                <path
                  d="M10 65 A50 50 0 0 1 110 65" fill="none"
                  :stroke="getSentimentColor(sentimentScore)" stroke-width="10" stroke-linecap="round"
                  :stroke-dasharray="`${sentimentScore * 1.57} 157`"
                  class="gauge-fill"
                />
              </svg>
              <div class="gauge-val" :style="{ color: getSentimentColor(sentimentScore) }">{{ sentimentScore }}</div>
              <div class="gauge-label">Overall Score</div>
            </div>

            <!-- Department breakdown -->
            <div class="dept-bars">
              <div v-for="dept in departmentSentiment" :key="dept.name" class="dept-row">
                <span class="dept-name">{{ dept.name }}</span>
                <div class="dept-bar-track">
                  <div class="dept-bar-fill" :style="{ width: dept.score + '%', background: getSentimentColor(dept.score) }"></div>
                </div>
                <span class="dept-score" :style="{ color: getSentimentColor(dept.score) }">{{ dept.score }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent AI Activity -->
      <div class="section-card">
        <div class="sc-head">
          <div>
            <h2 class="sc-title">Recent AI Activity</h2>
            <p class="sc-sub">Latest actions performed by AI modules</p>
          </div>
        </div>
        <div class="activity-timeline">
          <div v-for="act in aiActivities" :key="act.id" class="activity-item">
            <div class="act-dot"></div>
            <div class="act-content">
              <div class="act-header">
                <span class="act-action">{{ act.action }}</span>
                <span class="act-time">{{ timeAgo(act.timestamp) }}</span>
              </div>
              <div class="act-meta">
                <span class="act-feature">{{ act.feature }}</span>
                <span class="act-result">{{ act.result }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ai-page { display: flex; flex-direction: column; gap: 20px; }

/* AI badge */
.ai-badge {
  display: flex; align-items: center; gap: 8px; padding: 7px 14px;
  background: linear-gradient(135deg, rgba(79,126,255,.12), rgba(155,110,255,.12));
  border: 1px solid rgba(79,126,255,.2); border-radius: 20px;
  font-size: 12px; font-weight: 600; color: var(--accent);
}
.ai-pulse {
  width: 8px; height: 8px; border-radius: 50%; background: #36D399;
  animation: pulse-ai 2s ease-in-out infinite;
}
@keyframes pulse-ai {
  0%, 100% { box-shadow: 0 0 0 0 rgba(54,211,153,.4); }
  50% { box-shadow: 0 0 0 6px rgba(54,211,153,0); }
}

/* Skeleton */
.skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.skeleton-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  padding: 24px; display: flex; flex-direction: column; gap: 10px;
}
.sk-icon { width: 42px; height: 42px; border-radius: 10px; background: var(--surface2); animation: shimmer 1.5s infinite; }
.sk-line { height: 12px; border-radius: 4px; background: var(--surface2); animation: shimmer 1.5s infinite; }
.sk-line.w60 { width: 60%; }
.sk-line.w80 { width: 80%; }
.sk-line.w40 { width: 40%; }
@keyframes shimmer {
  0%, 100% { opacity: .4; }
  50% { opacity: .8; }
}

/* Feature cards grid */
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.feature-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
  padding: 22px; cursor: pointer; transition: all .2s;
  animation: fadeUp .4s ease calc(var(--fi) * .06s) both;
}
@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.feature-card:hover { border-color: var(--border-hi); transform: translateY(-2px); }
.feature-card.expanded { border-color: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }

.fc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.fc-icon-wrap {
  width: 42px; height: 42px; border-radius: 11px; display: grid; place-items: center; font-size: 20px;
}
.fc-icon-wrap.blue { background: linear-gradient(135deg, rgba(79,126,255,.15), rgba(155,110,255,.1)); }
.fc-icon-wrap.red { background: linear-gradient(135deg, rgba(255,107,107,.15), rgba(249,168,37,.1)); }
.fc-icon-wrap.green { background: linear-gradient(135deg, rgba(54,211,153,.15), rgba(79,126,255,.1)); }
.fc-icon-wrap.yellow { background: linear-gradient(135deg, rgba(249,168,37,.15), rgba(255,107,107,.1)); }
.fc-icon-wrap.purple { background: linear-gradient(135deg, rgba(155,110,255,.15), rgba(79,126,255,.1)); }

.fc-status {
  font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 20px;
  text-transform: uppercase; letter-spacing: .4px;
}
.fc-status.active { background: rgba(54,211,153,.12); color: #36D399; }
.fc-status.beta { background: rgba(155,110,255,.12); color: #9B6EFF; }
.fc-status.coming_soon { background: rgba(156,163,175,.12); color: #9CA3AF; }

.fc-name { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.fc-desc { font-size: 12px; color: var(--muted); line-height: 1.5; margin-bottom: 14px; min-height: 36px; }

.fc-btn {
  width: 100%; padding: 8px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--rs); font-size: 12px; font-weight: 600; color: var(--accent);
  cursor: pointer; transition: all .15s;
}
.fc-btn:hover:not(.disabled) { background: var(--accent-glow); border-color: var(--accent); }
.fc-btn.disabled { color: var(--muted); cursor: not-allowed; }

/* Section cards */
.section-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden;
}
.sc-head {
  padding: 16px 20px 14px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
}
.sc-title { font-size: 15px; font-weight: 600; color: var(--text); }
.sc-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* Insights */
.insights-list { display: flex; flex-direction: column; }
.insight-card {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 16px 20px; border-bottom: 1px solid var(--border); transition: background .1s;
}
.insight-card:last-child { border-bottom: none; }
.insight-card:hover { background: rgba(255,255,255,.01); }
.insight-left { display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0; }
.insight-impact {
  font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: .5px; flex-shrink: 0; margin-top: 2px;
}
.impact-high { background: rgba(255,107,107,.12); color: #FF6B6B; }
.impact-medium { background: rgba(249,168,37,.12); color: #F9A825; }
.impact-low { background: rgba(54,211,153,.12); color: #36D399; }

.insight-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.insight-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }

.insight-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
.confidence-bar-wrap { display: flex; flex-direction: column; gap: 3px; align-items: flex-end; }
.confidence-label { font-size: 10px; color: var(--dim); }
.confidence-track { width: 80px; height: 4px; background: var(--surface3); border-radius: 2px; }
.confidence-fill { height: 100%; border-radius: 2px; transition: width .5s ease; }
.action-btn {
  padding: 5px 12px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; font-size: 11px; font-weight: 500; color: var(--accent);
  cursor: pointer; transition: all .15s; white-space: nowrap;
}
.action-btn:hover { background: var(--accent-glow); border-color: var(--accent); }

/* Resume section */
.resume-section { padding: 18px 20px; display: flex; flex-direction: column; gap: 18px; }
.drop-zone {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 30px 20px; border: 2px dashed var(--border); border-radius: var(--r);
  transition: all .2s; cursor: pointer;
}
.drop-zone:hover, .drop-zone.drag-active {
  border-color: var(--accent); background: var(--accent-glow);
}
.dz-icon { font-size: 28px; }
.dz-text { font-size: 13px; font-weight: 500; color: var(--text); }
.dz-sub { font-size: 11px; color: var(--muted); }
.dz-btn {
  margin-top: 6px; padding: 6px 16px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--rs); font-size: 12px; color: var(--accent); cursor: pointer;
  transition: all .15s;
}
.dz-btn:hover { border-color: var(--accent); }

/* Table */
.tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th {
  text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 600;
  letter-spacing: .7px; text-transform: uppercase; color: var(--muted);
  background: rgba(255,255,255,.02); border-bottom: 1px solid var(--border);
}
tbody tr { border-bottom: 1px solid var(--border); transition: background .1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(255,255,255,.02); }
td { padding: 11px 14px; vertical-align: middle; }

.cand-info { display: flex; flex-direction: column; gap: 2px; }
.cand-name { font-weight: 500; color: var(--text); }
.cand-pos { font-size: 11px; color: var(--muted); }

.score-cell { display: flex; align-items: center; gap: 8px; }
.score-bar-wrap { width: 80px; height: 6px; background: var(--surface3); border-radius: 3px; flex-shrink: 0; }
.score-bar-wrap.sm { width: 50px; height: 4px; }
.score-bar { height: 100%; border-radius: 3px; transition: width .5s ease; }
.score-val { font-size: 14px; font-weight: 700; }
.score-num { font-size: 12px; color: var(--dim); }

.status-pill {
  font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 20px;
  text-transform: capitalize;
}
.status-green { background: rgba(54,211,153,.12); color: #36D399; }
.status-yellow { background: rgba(249,168,37,.12); color: #F9A825; }
.status-red { background: rgba(255,107,107,.12); color: #FF6B6B; }
.status-blue { background: rgba(79,126,255,.12); color: #4F7EFF; }

/* Two column layout */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

/* Attrition risk */
.risk-list { padding: 14px 20px; display: flex; flex-direction: column; gap: 14px; }
.risk-item {
  padding: 14px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--rs); display: flex; flex-direction: column; gap: 8px;
}
.risk-header { display: flex; align-items: center; justify-content: space-between; }
.risk-info { display: flex; flex-direction: column; gap: 2px; }
.risk-name { font-size: 13px; font-weight: 600; color: var(--text); }
.risk-dept { font-size: 11px; color: var(--muted); }
.risk-score-badge {
  font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 6px;
}
.risk-bar-track { width: 100%; height: 4px; background: var(--surface3); border-radius: 2px; }
.risk-bar-fill { height: 100%; border-radius: 2px; transition: width .5s ease; }
.risk-factors { display: flex; flex-wrap: wrap; gap: 4px; }
.risk-tag {
  font-size: 10px; padding: 2px 7px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 4px; color: var(--dim);
}
.risk-predicted { font-size: 10px; color: var(--muted); }

/* Sentiment */
.sentiment-content { padding: 20px; }
.gauge-wrap {
  display: flex; flex-direction: column; align-items: center; margin-bottom: 24px;
}
.gauge-svg { width: 160px; height: 95px; }
.gauge-fill { transition: stroke-dasharray .8s ease; }
.gauge-val { font-size: 32px; font-weight: 700; margin-top: -10px; }
.gauge-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

.dept-bars { display: flex; flex-direction: column; gap: 10px; }
.dept-row { display: flex; align-items: center; gap: 10px; }
.dept-name { font-size: 12px; color: var(--dim); width: 90px; flex-shrink: 0; }
.dept-bar-track { flex: 1; height: 6px; background: var(--surface3); border-radius: 3px; }
.dept-bar-fill { height: 100%; border-radius: 3px; transition: width .5s ease; }
.dept-score { font-size: 12px; font-weight: 600; width: 28px; text-align: right; }

/* Activity timeline */
.activity-timeline { padding: 16px 20px; display: flex; flex-direction: column; }
.activity-item {
  display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border);
  position: relative;
}
.activity-item:last-child { border-bottom: none; }
.act-dot {
  width: 10px; height: 10px; border-radius: 50%; background: var(--accent);
  flex-shrink: 0; margin-top: 4px; position: relative;
}
.act-dot::after {
  content: ''; position: absolute; left: 4px; top: 14px;
  width: 2px; height: calc(100% + 18px); background: var(--border);
}
.activity-item:last-child .act-dot::after { display: none; }
.act-content { flex: 1; min-width: 0; }
.act-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.act-action { font-size: 13px; font-weight: 500; color: var(--text); }
.act-time { font-size: 11px; color: var(--muted); flex-shrink: 0; }
.act-meta { display: flex; align-items: center; gap: 8px; }
.act-feature {
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px;
  background: rgba(79,126,255,.1); color: var(--accent);
}
.act-result { font-size: 11px; color: var(--dim); }

/* Responsive */
@media (max-width: 1100px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .two-col { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .features-grid { grid-template-columns: 1fr; }
  .skeleton-grid { grid-template-columns: 1fr; }
  .insight-card { flex-direction: column; }
  .insight-right { align-items: flex-start; }
}
</style>
