<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import type { Employee } from '@/services/employee'

const injected = inject<Ref<Employee | null> | null>('employee', null)
const employee = computed(() => injected?.value ?? null)
const displayEmployeeId = computed(() => {
  const e = employee.value as Record<string, unknown> | null
  if (!e) return ''
  return (e.employee_id as string) || (e.employeeId as string) || String(e.id ?? '')
})

const lifecycle = [
  { d: 'Jul 2020', l: 'Hired', done: true },
  { d: 'Jan 2022', l: 'Promotion', done: true },
  { d: 'Apr 2023', l: 'Transfer', done: true },
  { d: 'Jan 2024', l: 'Promotion', done: true },
  { d: '—', l: 'Next review', done: false },
]

const compensation = [
  { l: 'Annual CTC', v: '₹ 42,00,000', s: '+18% YoY' },
  { l: 'Monthly take-home', v: '₹ 2,64,500', s: 'After tax & PF' },
  { l: 'ESOP vested', v: '1,850', s: 'of 4,000 granted' },
]

const documents = [
  { n: 'Offer letter — v2.pdf', s: '218 KB · Uploaded Jul 2020', tag: 'Onboarding' },
  { n: 'PAN card.jpg', s: '1.2 MB · Verified', tag: 'ID' },
  { n: 'Form 16 — FY24.pdf', s: '384 KB · May 2024', tag: 'Tax' },
  { n: 'Appraisal letter — 2024.pdf', s: '120 KB · Jan 2024', tag: 'HR' },
]

const atGlance = [
  { l: 'Attendance (30d)', v: '96%', c: '#4DD39A' },
  { l: 'Leave balance', v: '14d', c: '#9B8DFF' },
  { l: 'Goals on track', v: '4/5', c: '#F5C16E' },
  { l: 'Avg rating', v: '4.2', c: '#9B8DFF' },
]

const reportingLine = [
  { n: 'Sudhakar Singh', r: 'CEO', ind: 0, me: false },
  { n: 'Priya Sharma', r: 'CTO', ind: 1, me: false },
  { n: 'Amit Verma', r: 'Eng. Manager', ind: 2, me: false },
  { n: 'Arjun Singh', r: 'Tech Lead', ind: 3, me: false },
  { n: 'Ananya Iyer', r: 'Senior Engineer (you)', ind: 4, me: true },
]

const skills = ['Node.js', 'TypeScript', 'Postgres', 'Kubernetes', 'Distributed systems', 'Mentorship', 'Hiring panel', 'On-call champion']

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}
</script>

<template>
  <div class="overview-grid">
    <!-- Left main -->
    <div class="col-main">
      <!-- Lifecycle -->
      <div class="card">
        <div class="section-head">
          <div class="section-title">Lifecycle</div>
          <span class="muted-mono">4 years, 9 months</span>
        </div>
        <div class="lifecycle">
          <div class="lifecycle-track" />
          <div class="lifecycle-progress" />
          <div v-for="(m, i) in lifecycle" :key="i" class="lifecycle-step">
            <div class="dot" :class="{ done: m.done }" />
            <div class="step-label" :class="{ muted: !m.done }">{{ m.l }}</div>
            <div class="step-date">{{ m.d }}</div>
          </div>
        </div>
      </div>

      <!-- Personal & Job two-up -->
      <div class="two-up">
        <div class="card">
          <div class="section-head">
            <div class="section-title">Personal</div>
            <span class="edit-icon">edit</span>
          </div>
          <dl class="info">
            <div class="info-row"><dt>Email</dt><dd>{{ employee?.email || '—' }}</dd></div>
            <div class="info-row"><dt>Phone</dt><dd>{{ employee?.phone || '—' }}</dd></div>
            <div class="info-row"><dt>Date of birth</dt><dd>{{ employee?.date_of_birth || '—' }}</dd></div>
            <div class="info-row"><dt>Address</dt><dd>{{ employee?.address || '—' }}</dd></div>
            <div class="info-row"><dt>Emergency</dt><dd>{{ employee?.emergency_contact_name || '—' }}</dd></div>
          </dl>
        </div>

        <div class="card">
          <div class="section-head">
            <div class="section-title">Job</div>
            <span class="edit-icon">edit</span>
          </div>
          <dl class="info">
            <div class="info-row"><dt>Title</dt><dd>{{ employee?.designation || employee?.role || '—' }}</dd></div>
            <div class="info-row"><dt>Department</dt><dd>{{ employee?.department || '—' }}</dd></div>
            <div class="info-row"><dt>Team</dt><dd>{{ employee?.team || '—' }}</dd></div>
            <div class="info-row"><dt>Employee ID</dt><dd class="mono">{{ displayEmployeeId }}</dd></div>
            <div class="info-row"><dt>Location</dt><dd>{{ employee?.location || '—' }}</dd></div>
            <div class="info-row"><dt>Status</dt><dd>{{ employee?.status || 'Active' }}</dd></div>
          </dl>
        </div>
      </div>

      <!-- Compensation -->
      <div class="card">
        <div class="section-head">
          <div class="section-title">Compensation</div>
          <span class="badge badge-accent">Restricted</span>
        </div>
        <div class="comp-grid">
          <div v-for="x in compensation" :key="x.l" class="comp-cell">
            <div class="eyebrow">{{ x.l }}</div>
            <div class="comp-value">{{ x.v }}</div>
            <div class="comp-sub">{{ x.s }}</div>
          </div>
        </div>
      </div>

      <!-- Documents -->
      <div class="card card-flush">
        <div class="card-flush-head">
          <div class="section-title">Documents</div>
          <button class="btn-sm">Upload</button>
        </div>
        <div v-for="(d, i) in documents" :key="i" class="doc-row">
          <div class="doc-thumb">PDF</div>
          <div class="doc-meta">
            <div class="doc-name">{{ d.n }}</div>
            <div class="doc-sub">{{ d.s }}</div>
          </div>
          <span class="badge badge-neutral">{{ d.tag }}</span>
          <span class="muted">↓</span>
        </div>
      </div>
    </div>

    <!-- Right rail -->
    <div class="col-rail">
      <div class="card">
        <div class="section-head">
          <div class="section-title">At a glance</div>
        </div>
        <div class="glance-grid">
          <div v-for="s in atGlance" :key="s.l" class="glance-cell">
            <div class="eyebrow">{{ s.l }}</div>
            <div class="glance-value" :style="{ color: s.c }">{{ s.v }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-head">
          <div class="section-title">Reporting line</div>
        </div>
        <div class="reporting">
          <div
            v-for="p in reportingLine"
            :key="p.n"
            class="report-row"
            :class="{ me: p.me }"
            :style="{ paddingLeft: (p.ind * 14) + 'px' }"
          >
            <div class="mini-avatar">{{ initials(p.n) }}</div>
            <div class="report-meta">
              <div class="report-name" :class="{ me: p.me }">{{ p.n }}</div>
              <div class="report-role">{{ p.r }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-head">
          <div class="section-title">Skills & tags</div>
        </div>
        <div class="tags">
          <span v-for="s in skills" :key="s" class="badge badge-neutral">{{ s }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.col-main,
.col-rail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 16px;
  color: #EEF0F4;
}

.card-flush {
  padding: 0;
  overflow: hidden;
}

.card-flush-head {
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 13.5px;
  font-weight: 600;
  color: #EEF0F4;
}

.muted-mono {
  font-size: 11px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
}

.muted {
  color: #7A8299;
  font-size: 12px;
}

.edit-icon {
  font-size: 11px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
}

.lifecycle {
  position: relative;
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding: 0 12px;
}

.lifecycle-track {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 11px;
  height: 2px;
  background: #232936;
}

.lifecycle-progress {
  position: absolute;
  left: 12px;
  width: calc(72% - 24px);
  top: 11px;
  height: 2px;
  background: #6B5BFF;
}

.lifecycle-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 6px;
  background: #0D0F17;
  border: 2px solid #3A4154;
}

.dot.done {
  background: #6B5BFF;
  border-color: #6B5BFF;
}

.step-label {
  margin-top: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #EEF0F4;
}

.step-label.muted {
  color: #7A8299;
}

.step-date {
  font-size: 10.5px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
}

.two-up {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
}

.info-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  font-size: 12px;
  margin: 0;
}

.info-row dt {
  color: #7A8299;
}

.info-row dd {
  color: #EEF0F4;
  margin: 0;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
}

.comp-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.eyebrow {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
}

.comp-value {
  font-family: 'Instrument Serif', serif;
  font-size: 24px;
  color: #EEF0F4;
  letter-spacing: -0.02em;
  margin-top: 4px;
}

.comp-sub {
  font-size: 11px;
  color: #7A8299;
  margin-top: 2px;
}

.doc-row {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #232936;
}

.doc-thumb {
  width: 32px;
  height: 38px;
  border-radius: 4px;
  background: #1B2030;
  border: 1px solid #2A3142;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #7A8299;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 0.05em;
}

.doc-meta {
  flex: 1;
  min-width: 0;
}

.doc-name {
  font-size: 12.5px;
  color: #EEF0F4;
  font-weight: 500;
}

.doc-sub {
  font-size: 11px;
  color: #7A8299;
}

.badge {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  letter-spacing: 0.02em;
}

.badge-accent {
  background: rgba(107, 91, 255, 0.14);
  color: #9B8DFF;
  border-color: rgba(107, 91, 255, 0.3);
}

.badge-neutral {
  background: #1B2030;
  color: #9AA3B5;
  border-color: #2A3142;
}

.btn-sm {
  font-size: 11.5px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 6px;
  background: #1B2030;
  border: 1px solid #232936;
  color: #EEF0F4;
  cursor: pointer;
}

.btn-sm:hover {
  background: #232A3C;
}

.glance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.glance-cell {
  padding: 12px;
  background: #0D0F17;
  border-radius: 8px;
  border: 1px solid #232936;
}

.glance-value {
  font-family: 'Instrument Serif', serif;
  font-size: 22px;
  letter-spacing: -0.02em;
  margin-top: 2px;
}

.reporting {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.report-row {
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0.85;
}

.report-row.me {
  opacity: 1;
}

.mini-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6B5BFF, #2A1B5C);
  color: #EEF0F4;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.report-meta {
  flex: 1;
  min-width: 0;
}

.report-name {
  font-size: 12px;
  color: #EEF0F4;
}

.report-name.me {
  color: #9B8DFF;
  font-weight: 600;
}

.report-role {
  font-size: 10.5px;
  color: #7A8299;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@media (max-width: 1024px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
  .two-up {
    grid-template-columns: 1fr;
  }
  .comp-grid {
    grid-template-columns: 1fr;
  }
}
</style>
