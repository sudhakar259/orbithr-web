<script setup lang="ts">
defineOptions({ name: 'AiFeatures' })

import { ref, onMounted } from 'vue'

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
  if (score >= 80) return '#4DD39A'
  if (score >= 60) return '#F5A623'
  return '#F38288'
}

function getSentimentColor(score: number) {
  if (score >= 75) return '#4DD39A'
  if (score >= 60) return '#F5A623'
  return '#F38288'
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
    <!-- Page header -->
    <div class="ph">
      <div>
        <div class="ph-eyebrow">AI Engine · trained on your policies + data</div>
        <h1 class="ph-title">Ask Orbit</h1>
        <p class="ph-sub">Intelligent insights powered by machine learning. Scoped to your role and policies.</p>
      </div>
      <div class="ai-badge">
        <span class="ai-pulse" />
        AI Engine Active
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="skeleton-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card">
        <div class="sk-icon" />
        <div class="sk-line w60" />
        <div class="sk-line w80" />
        <div class="sk-line w40" />
      </div>
    </div>

    <template v-else>
      <!-- Chat assistant -->
      <div class="chat-shell">
        <!-- History rail -->
        <div class="chat-rail">
          <div class="rail-head">
            <div class="rail-logo">
              <span>✦</span>
            </div>
            <div>
              <div class="rail-title">Ask Orbit</div>
              <div class="rail-sub">Trained on your policies + data</div>
            </div>
          </div>
          <button class="new-chat">+ New chat</button>
          <div class="rail-body">
            <div class="rail-section">
              <div class="rail-eyebrow">Today</div>
              <div class="rail-item active">
                <span class="rail-icon">●</span>
                <span>Attrition · what changed in March?</span>
              </div>
              <div class="rail-item">
                <span class="rail-icon">●</span>
                <span>Headcount plan vs actual</span>
              </div>
            </div>
            <div class="rail-section">
              <div class="rail-eyebrow">Yesterday</div>
              <div class="rail-item">
                <span class="rail-icon">●</span>
                <span>Draft offer · Senior PM band</span>
              </div>
              <div class="rail-item">
                <span class="rail-icon">●</span>
                <span>POSH refresh · pending list</span>
              </div>
            </div>
            <div class="rail-section">
              <div class="rail-eyebrow">This week</div>
              <div class="rail-item">
                <span class="rail-icon">●</span>
                <span>Comp benchmark · L4 backend</span>
              </div>
              <div class="rail-item">
                <span class="rail-icon">●</span>
                <span>Q2 review readiness</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat thread -->
        <div class="chat-main">
          <div class="chat-header">
            <div>
              <div class="chat-title">Attrition · what changed in March?</div>
              <div class="chat-meta">Scoped to Engineering · last 6 months</div>
            </div>
            <div class="chat-header-actions">
              <button class="hbtn">Scope · Engineering</button>
              <button class="hbtn">Share</button>
            </div>
          </div>

          <div class="chat-body">
            <!-- User msg -->
            <div class="msg-user">
              <div class="bubble-user">
                Why did engineering attrition spike in March? Show me by team and reason.
              </div>
            </div>

            <!-- Assistant msg -->
            <div class="msg-asst">
              <div class="asst-avatar">✦</div>
              <div class="asst-body">
                <div class="asst-text">
                  Engineering saw <b>9 voluntary exits</b> in March vs a 6-month average of <b>4.2</b> — a <span class="hot">+114%</span> jump. Three signals stand out:
                </div>
                <ol class="asst-list">
                  <li><b>Platform team</b> drove 5 of 9 exits. All cited "compensation" or "scope" in exit interviews.</li>
                  <li><b>Median tenure of leavers</b> was 19 months — earlier than the company-wide 31.</li>
                  <li>The <b>March pulse score</b> for "growth" dropped to 3.2 (Engineering) vs 4.0 (org-wide).</li>
                </ol>

                <!-- Inline chart card -->
                <div class="inline-card">
                  <div class="inline-head">
                    <div class="inline-eyebrow">Engineering exits · last 6 months</div>
                    <span class="badge impact-high">+114% in Mar</span>
                  </div>
                  <div class="bars">
                    <div v-for="(v, i) in [3, 4, 5, 4, 4, 9]" :key="i" class="bar-wrap">
                      <div class="bar" :class="{ hot: i === 5 }" :style="{ height: (v / 9 * 100) + '%' }" />
                      <div class="bar-lbl" :class="{ hot: i === 5 }">
                        {{ ['Oct','Nov','Dec','Jan','Feb','Mar'][i] }} · {{ v }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Recommendations -->
                <div class="rec-card">
                  <div class="rec-head">
                    <span class="rec-icon">⚡</span>
                    <span>Suggested actions</span>
                  </div>
                  <div v-for="(t, i) in ['Run a Platform-only skip-level pulse this week','Pull Platform L3–L5 comp band vs market refresh','Schedule retention conversations for top 5 at-risk']" :key="i" class="rec-row">
                    <span class="rec-tick">✓</span>
                    <span class="rec-text">{{ t }}</span>
                    <button class="rec-btn">Do it</button>
                  </div>
                </div>

                <!-- Sources -->
                <div class="sources">
                  <span v-for="s in ['Exit interviews · 9', 'Pulse · Mar wave', 'HRIS · attrition cube', 'Comp benchmarks · Mercer 2026']" :key="s" class="source-tag">
                    {{ s }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Composer -->
          <div class="composer-wrap">
            <div class="composer">
              <div class="composer-text">Ask anything · "Show top 5 at-risk Platform engineers"</div>
              <div class="composer-foot">
                <button class="hbtn sm">Attach</button>
                <button class="hbtn sm">Scope: Engineering</button>
                <div class="composer-spacer" />
                <span class="kbd">⌘ Enter</span>
                <button class="ask-btn">✦ Ask Orbit</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right rail · prompts + skills -->
        <div class="prompt-rail">
          <div>
            <div class="rail-eyebrow">Quick asks</div>
            <div class="prompt-list">
              <div v-for="p in [
                { ic: '💼', t: 'Hiring · who is hiring slowest?' },
                { ic: '💰', t: 'Comp · who is below band mid?' },
                { ic: '📅', t: 'Leave · forecast Q3 demand' },
                { ic: '🛡', t: 'Compliance · audit gaps' },
              ]" :key="p.t" class="prompt-row">
                <span class="prompt-ic">{{ p.ic }}</span>
                <span>{{ p.t }}</span>
              </div>
            </div>
          </div>
          <div>
            <div class="rail-eyebrow">Skills</div>
            <div class="skills-grid">
              <div v-for="s in [
                { ic: '✏️', t: 'Draft offer' },
                { ic: '📦', t: 'JD generator' },
                { ic: '📊', t: 'Build report' },
                { ic: '✉️', t: 'Bulk message' },
              ]" :key="s.t" class="skill-tile">
                <div class="skill-ic">{{ s.ic }}</div>
                <div class="skill-t">{{ s.t }}</div>
              </div>
            </div>
          </div>
          <div>
            <div class="rail-eyebrow">Privacy</div>
            <div class="privacy-card">
              <span class="privacy-ic">🛡</span>
              Answers are scoped to your role. Compensation data is masked unless you have <b>Comp.read</b>.
            </div>
          </div>
        </div>
      </div>

      <!-- AI Feature Cards -->
      <div class="features-grid">
        <div
          v-for="(f, i) in aiFeatures" :key="f.id"
          class="feature-card" :class="{ expanded: activeSection === f.id }"
          :style="{ '--fi': i } as Record<string, string | number>"
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
            <div class="sc-eyebrow">{{ aiInsights.length }} actionable signals</div>
            <h2 class="sc-title">AI Insights</h2>
          </div>
        </div>
        <div class="insights-list">
          <div v-for="insight in aiInsights" :key="insight.id" class="insight-card">
            <div class="insight-left">
              <span class="badge" :class="getImpactClass(insight.impact)">
                {{ insight.impact }}
              </span>
              <div class="insight-body">
                <h4 class="insight-title">{{ insight.title }}</h4>
                <p class="insight-desc">{{ insight.description }}</p>
              </div>
            </div>
            <div class="insight-right">
              <div class="confidence-wrap">
                <div class="confidence-label">{{ insight.confidence }}% confidence</div>
                <div class="confidence-track">
                  <div
                    class="confidence-fill"
                    :style="{ width: insight.confidence + '%', background: getScoreColor(insight.confidence) }"
                  />
                </div>
              </div>
              <button class="action-btn">{{ insight.action }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resume Screening Panel -->
      <div v-if="activeSection === 'resume' || !activeSection" class="section-card">
        <div class="sc-head">
          <div>
            <div class="sc-eyebrow">Resume screening</div>
            <h2 class="sc-title">AI-scored candidates</h2>
          </div>
        </div>
        <div class="resume-section">
          <div
            class="drop-zone" :class="{ 'drag-active': dragOver }"
            @drop="handleDrop" @dragover="handleDragOver" @dragleave="dragOver = false"
          >
            <div class="dz-icon">📎</div>
            <div class="dz-text">Drag &amp; drop resumes here</div>
            <div class="dz-sub">PDF, DOC, DOCX up to 10MB each</div>
            <button class="dz-btn">Browse files</button>
          </div>

          <div class="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Match score</th>
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
                        <div class="score-bar" :style="{ width: c.match_score + '%', background: getScoreColor(c.match_score) }" />
                      </div>
                      <span class="score-val" :style="{ color: getScoreColor(c.match_score) }">{{ c.match_score }}%</span>
                    </div>
                  </td>
                  <td>
                    <div class="score-cell">
                      <div class="score-bar-wrap sm">
                        <div class="score-bar" :style="{ width: c.skills_match + '%', background: getScoreColor(c.skills_match) }" />
                      </div>
                      <span class="score-num">{{ c.skills_match }}%</span>
                    </div>
                  </td>
                  <td>
                    <div class="score-cell">
                      <div class="score-bar-wrap sm">
                        <div class="score-bar" :style="{ width: c.experience_match + '%', background: getScoreColor(c.experience_match) }" />
                      </div>
                      <span class="score-num">{{ c.experience_match }}%</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" :class="getStatusClass(c.status)">
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
        <div class="section-card">
          <div class="sc-head">
            <div>
              <div class="sc-eyebrow">Attrition predictor</div>
              <h2 class="sc-title">Risk register</h2>
            </div>
          </div>
          <div class="risk-list">
            <div v-for="emp in attritionRisks" :key="emp.employee_id" class="risk-item">
              <div class="risk-header">
                <div class="risk-info">
                  <span class="risk-name">{{ emp.name }}</span>
                  <span class="risk-dept">{{ emp.department }}</span>
                </div>
                <div class="risk-score-badge" :style="{ background: getScoreColor(100 - emp.risk_score) + '22', color: getScoreColor(100 - emp.risk_score) }">
                  {{ emp.risk_score }}%
                </div>
              </div>
              <div class="risk-bar-track">
                <div class="risk-bar-fill" :style="{ width: emp.risk_score + '%', background: getScoreColor(100 - emp.risk_score) }" />
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

        <div class="section-card">
          <div class="sc-head">
            <div>
              <div class="sc-eyebrow">Sentiment analysis</div>
              <h2 class="sc-title">Pulse signals</h2>
            </div>
          </div>
          <div class="sentiment-content">
            <div class="gauge-wrap">
              <svg viewBox="0 0 120 70" class="gauge-svg">
                <path d="M10 65 A50 50 0 0 1 110 65" fill="none" stroke="#222840" stroke-width="10" stroke-linecap="round" />
                <path
                  d="M10 65 A50 50 0 0 1 110 65" fill="none"
                  :stroke="getSentimentColor(sentimentScore)" stroke-width="10" stroke-linecap="round"
                  :stroke-dasharray="`${sentimentScore * 1.57} 157`"
                  class="gauge-fill"
                />
              </svg>
              <div class="gauge-val" :style="{ color: getSentimentColor(sentimentScore) }">{{ sentimentScore }}</div>
              <div class="gauge-label">Overall score</div>
            </div>

            <div class="dept-bars">
              <div v-for="dept in departmentSentiment" :key="dept.name" class="dept-row">
                <span class="dept-name">{{ dept.name }}</span>
                <div class="dept-bar-track">
                  <div class="dept-bar-fill" :style="{ width: dept.score + '%', background: getSentimentColor(dept.score) }" />
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
            <div class="sc-eyebrow">Activity log</div>
            <h2 class="sc-title">Recent AI activity</h2>
          </div>
        </div>
        <div class="activity-timeline">
          <div v-for="act in aiActivities" :key="act.id" class="activity-item">
            <div class="act-dot" />
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
.ai-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: #EEF0F4;
}

/* ── Page header ── */
.ph {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.ph-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
  margin-bottom: 8px;
}
.ph-title {
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin: 0 0 6px;
  line-height: 1.05;
}
.ph-sub {
  font-size: 13px;
  color: #7A8299;
  max-width: 560px;
  margin: 0;
}
.ai-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: rgba(107, 91, 255, 0.12);
  border: 1px solid rgba(107, 91, 255, 0.3);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #B6ABFF;
  flex-shrink: 0;
}
.ai-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4DD39A;
  animation: pulse-ai 2s ease-in-out infinite;
}
@keyframes pulse-ai {
  0%, 100% { box-shadow: 0 0 0 0 rgba(77, 211, 154, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(77, 211, 154, 0); }
}

/* ── Skeleton ── */
.skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.skeleton-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk-icon { width: 42px; height: 42px; border-radius: 10px; background: #1C2030; animation: shimmer 1.5s infinite; }
.sk-line { height: 12px; border-radius: 4px; background: #1C2030; animation: shimmer 1.5s infinite; }
.sk-line.w60 { width: 60%; }
.sk-line.w80 { width: 80%; }
.sk-line.w40 { width: 40%; }
@keyframes shimmer {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* ── Chat shell ── */
.chat-shell {
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
  height: 640px;
}

/* ── Left rail (history) ── */
.chat-rail {
  border-right: 1px solid #232936;
  display: flex;
  flex-direction: column;
  background: #13161E;
}
.rail-head {
  padding: 14px 16px;
  border-bottom: 1px solid #232936;
  display: flex;
  align-items: center;
  gap: 10px;
}
.rail-logo {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6B5BFF, #3E2FB8);
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 13px;
}
.rail-title { font-size: 13px; color: #EEF0F4; font-weight: 600; }
.rail-sub { font-size: 10.5px; color: #7A8299; }
.new-chat {
  margin: 10px;
  padding: 9px 14px;
  background: #6B5BFF;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.new-chat:hover { background: #5a4be8; }
.rail-body {
  padding: 4px 10px 14px;
  overflow: auto;
  flex: 1;
}
.rail-section { margin-bottom: 14px; }
.rail-eyebrow {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.rail-item {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  color: #B6BCC9;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.12s;
}
.rail-item:hover { background: #1C2030; }
.rail-item.active {
  background: rgba(107, 91, 255, 0.16);
  color: #EEF0F4;
}
.rail-icon {
  font-size: 6px;
  color: #7A8299;
}
.rail-item.active .rail-icon { color: #6B5BFF; }

/* ── Chat main ── */
.chat-main {
  display: flex;
  flex-direction: column;
  background: #161A23;
}
.chat-header {
  padding: 14px 24px;
  border-bottom: 1px solid #232936;
  display: flex;
  align-items: center;
  gap: 10px;
}
.chat-title { font-size: 14px; color: #EEF0F4; font-weight: 600; }
.chat-meta { font-size: 11px; color: #7A8299; margin-top: 2px; }
.chat-header-actions { display: flex; gap: 6px; margin-left: auto; }
.hbtn {
  padding: 6px 11px;
  background: transparent;
  border: 1px solid #232936;
  border-radius: 7px;
  color: #B6BCC9;
  font-size: 11.5px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.hbtn:hover { border-color: #2E3547; color: #EEF0F4; }
.hbtn.sm { padding: 5px 9px; font-size: 11px; }

.chat-body {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

.msg-user {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 18px;
}
.bubble-user {
  max-width: 70%;
  padding: 10px 14px;
  background: rgba(107, 91, 255, 0.18);
  border: 1px solid rgba(107, 91, 255, 0.4);
  border-radius: 14px 14px 4px 14px;
  font-size: 13px;
  color: #EEF0F4;
}

.msg-asst { display: flex; gap: 14px; }
.asst-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: linear-gradient(135deg, #6B5BFF, #3E2FB8);
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 14px;
  flex-shrink: 0;
}
.asst-body { flex: 1; min-width: 0; }
.asst-text {
  font-size: 13px;
  color: #B6BCC9;
  line-height: 1.65;
}
.asst-text b { color: #EEF0F4; font-weight: 600; }
.hot { color: #F38288; font-weight: 600; }
.asst-list {
  font-size: 13px;
  color: #B6BCC9;
  line-height: 1.7;
  padding-left: 22px;
  margin-top: 10px;
}
.asst-list b { color: #EEF0F4; }

.inline-card {
  margin-top: 14px;
  padding: 14px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 10px;
}
.inline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.inline-eyebrow {
  font-size: 10.5px;
  color: #7A8299;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 600;
}
.bars {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 80px;
}
.bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.bar {
  width: 100%;
  background: #6B5BFF;
  border-radius: 3px 3px 0 0;
  min-height: 8%;
}
.bar.hot { background: #F38288; }
.bar-lbl {
  font-size: 10px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
}
.bar-lbl.hot { color: #F38288; font-weight: 600; }

.rec-card {
  margin-top: 14px;
  padding: 14px;
  background: rgba(107, 91, 255, 0.08);
  border: 1px solid rgba(107, 91, 255, 0.32);
  border-radius: 10px;
}
.rec-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #B6ABFF;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.rec-icon { color: #B6ABFF; }
.rec-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 12.5px;
  color: #B6BCC9;
}
.rec-tick { color: #B6ABFF; flex-shrink: 0; }
.rec-text { flex: 1; }
.rec-btn {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid #232936;
  border-radius: 6px;
  color: #B6BCC9;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.rec-btn:hover { border-color: #6B5BFF; color: #B6ABFF; }

.sources {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}
.source-tag {
  padding: 4px 10px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 12px;
  font-size: 10.5px;
  color: #B6BCC9;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Composer ── */
.composer-wrap {
  padding: 14px 24px 18px;
  border-top: 1px solid #232936;
}
.composer {
  padding: 14px;
  background: #1C2030;
  border: 1px solid rgba(107, 91, 255, 0.4);
  border-radius: 12px;
  box-shadow: 0 0 0 4px rgba(107, 91, 255, 0.08);
}
.composer-text {
  font-size: 13px;
  color: #7A8299;
}
.composer-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid #232936;
}
.composer-spacer { flex: 1; }
.kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  padding: 3px 7px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 4px;
  color: #7A8299;
}
.ask-btn {
  padding: 7px 14px;
  background: #6B5BFF;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.ask-btn:hover { background: #5a4be8; }

/* ── Right rail ── */
.prompt-rail {
  border-left: 1px solid #232936;
  padding: 18px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: #13161E;
}
.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.prompt-row {
  padding: 10px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #B6BCC9;
  cursor: pointer;
  transition: border-color 0.15s;
}
.prompt-row:hover { border-color: #6B5BFF; }
.prompt-ic { font-size: 13px; }

.skills-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 8px;
}
.skill-tile {
  padding: 10px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 8px;
  font-size: 11.5px;
  color: #B6BCC9;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s;
}
.skill-tile:hover { border-color: #6B5BFF; }
.skill-ic { font-size: 14px; }
.skill-t { margin-top: 4px; }

.privacy-card {
  margin-top: 8px;
  padding: 10px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 8px;
  font-size: 11px;
  color: #B6BCC9;
  line-height: 1.5;
}
.privacy-card b { color: #EEF0F4; }
.privacy-ic { color: #4DD39A; margin-right: 4px; }

/* ── Feature cards ── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.feature-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 22px;
  cursor: pointer;
  transition: all 0.2s;
  animation: fadeUp 0.4s ease calc(var(--fi) * 0.06s) both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.feature-card:hover {
  border-color: #2E3547;
  transform: translateY(-2px);
}
.feature-card.expanded {
  border-color: #6B5BFF;
  box-shadow: 0 0 24px rgba(107, 91, 255, 0.18);
}
.fc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.fc-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  font-size: 20px;
}
.fc-icon-wrap.blue   { background: linear-gradient(135deg, rgba(107, 91, 255, 0.18), rgba(62, 47, 184, 0.10)); }
.fc-icon-wrap.red    { background: linear-gradient(135deg, rgba(243, 130, 136, 0.18), rgba(245, 166, 35, 0.10)); }
.fc-icon-wrap.green  { background: linear-gradient(135deg, rgba(77, 211, 154, 0.18), rgba(107, 91, 255, 0.10)); }
.fc-icon-wrap.yellow { background: linear-gradient(135deg, rgba(245, 166, 35, 0.18), rgba(243, 130, 136, 0.10)); }
.fc-icon-wrap.purple { background: linear-gradient(135deg, rgba(107, 91, 255, 0.20), rgba(62, 47, 184, 0.10)); }

.fc-status {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.fc-status.active { background: rgba(77, 211, 154, 0.14); color: #4DD39A; }
.fc-status.beta { background: rgba(107, 91, 255, 0.16); color: #B6ABFF; }
.fc-status.coming_soon { background: rgba(122, 130, 153, 0.14); color: #7A8299; }

.fc-name { font-size: 15px; font-weight: 600; color: #EEF0F4; margin: 0 0 6px; }
.fc-desc {
  font-size: 12px;
  color: #7A8299;
  line-height: 1.5;
  margin: 0 0 14px;
  min-height: 36px;
}
.fc-btn {
  width: 100%;
  padding: 8px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #B6ABFF;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.fc-btn:hover:not(.disabled) {
  background: rgba(107, 91, 255, 0.14);
  border-color: #6B5BFF;
}
.fc-btn.disabled { color: #7A8299; cursor: not-allowed; }

/* ── Section card ── */
.section-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}
.sc-head {
  padding: 16px 22px 14px;
  border-bottom: 1px solid #232936;
}
.sc-eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.sc-title {
  font-family: 'Instrument Serif', serif;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: #EEF0F4;
  margin: 4px 0 0;
}

/* ── Insights ── */
.insights-list { display: flex; flex-direction: column; }
.insight-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 22px;
  border-bottom: 1px solid #232936;
  transition: background 0.1s;
}
.insight-card:last-child { border-bottom: none; }
.insight-card:hover { background: rgba(255, 255, 255, 0.012); }
.insight-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.insight-body { min-width: 0; }
.insight-title { font-size: 13px; font-weight: 600; color: #EEF0F4; margin: 0 0 4px; }
.insight-desc { font-size: 12px; color: #7A8299; line-height: 1.5; margin: 0; }
.insight-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.confidence-wrap {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-end;
}
.confidence-label { font-size: 10px; color: #7A8299; }
.confidence-track { width: 80px; height: 4px; background: #222840; border-radius: 2px; }
.confidence-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
.action-btn {
  padding: 5px 12px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: #B6ABFF;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.15s;
}
.action-btn:hover { border-color: #6B5BFF; }

.badge {
  display: inline-flex;
  align-items: center;
  font-size: 9px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
  margin-top: 2px;
}
.impact-high { background: rgba(243, 130, 136, 0.14); color: #F38288; }
.impact-medium { background: rgba(245, 166, 35, 0.14); color: #F5A623; }
.impact-low { background: rgba(77, 211, 154, 0.14); color: #4DD39A; }

/* ── Resume section ── */
.resume-section {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 30px 20px;
  border: 2px dashed #232936;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.drop-zone:hover, .drop-zone.drag-active {
  border-color: #6B5BFF;
  background: rgba(107, 91, 255, 0.06);
}
.dz-icon { font-size: 28px; }
.dz-text { font-size: 13px; font-weight: 500; color: #EEF0F4; }
.dz-sub { font-size: 11px; color: #7A8299; }
.dz-btn {
  margin-top: 6px;
  padding: 6px 16px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 8px;
  font-size: 12px;
  color: #B6ABFF;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.dz-btn:hover { border-color: #6B5BFF; }

.tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th {
  text-align: left;
  padding: 9px 14px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid #232936;
}
tbody tr {
  border-bottom: 1px solid #1B1F2A;
  transition: background 0.1s;
}
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(255, 255, 255, 0.012); }
td { padding: 11px 14px; vertical-align: middle; color: #EEF0F4; }

.cand-info { display: flex; flex-direction: column; gap: 2px; }
.cand-name { font-weight: 500; color: #EEF0F4; }
.cand-pos { font-size: 11px; color: #7A8299; }

.score-cell { display: flex; align-items: center; gap: 8px; }
.score-bar-wrap { width: 80px; height: 6px; background: #222840; border-radius: 3px; flex-shrink: 0; }
.score-bar-wrap.sm { width: 50px; height: 4px; }
.score-bar { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.score-val { font-size: 14px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.score-num { font-size: 12px; color: #7A8299; font-family: 'JetBrains Mono', monospace; }

.status-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 12px;
  text-transform: capitalize;
}
.status-green { background: rgba(77, 211, 154, 0.14); color: #4DD39A; padding: 3px 9px; border-radius: 12px; text-transform: capitalize; font-weight: 600; font-size: 10px; }
.status-yellow { background: rgba(245, 166, 35, 0.14); color: #F5A623; padding: 3px 9px; border-radius: 12px; text-transform: capitalize; font-weight: 600; font-size: 10px; }
.status-red { background: rgba(243, 130, 136, 0.14); color: #F38288; padding: 3px 9px; border-radius: 12px; text-transform: capitalize; font-weight: 600; font-size: 10px; }
.status-blue { background: rgba(107, 91, 255, 0.14); color: #B6ABFF; padding: 3px 9px; border-radius: 12px; text-transform: capitalize; font-weight: 600; font-size: 10px; }

/* ── Two col ── */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

/* ── Risk ── */
.risk-list {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.risk-item {
  padding: 14px;
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.risk-header { display: flex; align-items: center; justify-content: space-between; }
.risk-info { display: flex; flex-direction: column; gap: 2px; }
.risk-name { font-size: 13px; font-weight: 600; color: #EEF0F4; }
.risk-dept { font-size: 11px; color: #7A8299; }
.risk-score-badge {
  font-size: 13px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
}
.risk-bar-track { width: 100%; height: 4px; background: #222840; border-radius: 2px; }
.risk-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
.risk-factors { display: flex; flex-wrap: wrap; gap: 4px; }
.risk-tag {
  font-size: 10px;
  padding: 2px 7px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 4px;
  color: #B6BCC9;
}
.risk-predicted { font-size: 10px; color: #7A8299; font-family: 'JetBrains Mono', monospace; }

/* ── Sentiment ── */
.sentiment-content { padding: 22px; }
.gauge-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 22px;
}
.gauge-svg { width: 160px; height: 95px; }
.gauge-fill { transition: stroke-dasharray 0.8s ease; }
.gauge-val {
  font-family: 'Instrument Serif', serif;
  font-size: 34px;
  font-weight: 400;
  margin-top: -10px;
  letter-spacing: -0.02em;
}
.gauge-label { font-size: 11px; color: #7A8299; margin-top: 2px; letter-spacing: 0.04em; text-transform: uppercase; }

.dept-bars { display: flex; flex-direction: column; gap: 10px; }
.dept-row { display: flex; align-items: center; gap: 10px; }
.dept-name { font-size: 12px; color: #B6BCC9; width: 90px; flex-shrink: 0; }
.dept-bar-track { flex: 1; height: 6px; background: #222840; border-radius: 3px; }
.dept-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.dept-score {
  font-size: 12px;
  font-weight: 600;
  width: 28px;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Activity ── */
.activity-timeline {
  padding: 16px 22px;
  display: flex;
  flex-direction: column;
}
.activity-item {
  display: flex;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid #232936;
  position: relative;
}
.activity-item:last-child { border-bottom: none; }
.act-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6B5BFF;
  flex-shrink: 0;
  margin-top: 4px;
  position: relative;
}
.act-dot::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 14px;
  width: 2px;
  height: calc(100% + 18px);
  background: #232936;
}
.activity-item:last-child .act-dot::after { display: none; }
.act-content { flex: 1; min-width: 0; }
.act-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}
.act-action { font-size: 13px; font-weight: 500; color: #EEF0F4; }
.act-time { font-size: 11px; color: #7A8299; flex-shrink: 0; font-family: 'JetBrains Mono', monospace; }
.act-meta { display: flex; align-items: center; gap: 8px; }
.act-feature {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(107, 91, 255, 0.14);
  color: #B6ABFF;
}
.act-result { font-size: 11px; color: #B6BCC9; }

/* ── Responsive ── */
@media (max-width: 1200px) {
  .chat-shell { grid-template-columns: 240px 1fr; height: auto; }
  .prompt-rail { display: none; }
}
@media (max-width: 1100px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .two-col { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .ph { flex-direction: column; align-items: flex-start; }
  .chat-shell { grid-template-columns: 1fr; }
  .chat-rail { display: none; }
  .features-grid { grid-template-columns: 1fr; }
  .skeleton-grid { grid-template-columns: 1fr; }
  .insight-card { flex-direction: column; }
  .insight-right { align-items: flex-start; }
}
</style>
