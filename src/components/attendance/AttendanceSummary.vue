<template>
  <div class="summary-grid">

    <!-- Present Days -->
    <div class="stat-card">
      <div class="stat-icon stat-icon--green">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <div class="stat-body">
        <div class="stat-value">{{ stats.present_days || 0 }}</div>
        <div class="stat-label">Present Days</div>
      </div>
    </div>

    <!-- Absent Days -->
    <div class="stat-card">
      <div class="stat-icon stat-icon--red">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
      <div class="stat-body">
        <div class="stat-value">{{ stats.absent_days || 0 }}</div>
        <div class="stat-label">Absent Days</div>
      </div>
    </div>

    <!-- Working Hours -->
    <div class="stat-card">
      <div class="stat-icon stat-icon--blue">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 7v5l3 3"/>
        </svg>
      </div>
      <div class="stat-body">
        <div class="stat-value">{{ Number(stats.total_working_hours || 0).toFixed(1) }}</div>
        <div class="stat-label">Working Hours</div>
      </div>
    </div>

    <!-- Overtime Hours -->
    <div class="stat-card">
      <div class="stat-icon stat-icon--purple">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      </div>
      <div class="stat-body">
        <div class="stat-value">{{ Number(stats.total_overtime_hours || 0).toFixed(1) }}</div>
        <div class="stat-label">Overtime Hours</div>
      </div>
    </div>

    <!-- On Leave Days -->
    <div v-if="stats.leave_days" class="stat-card">
      <div class="stat-icon stat-icon--teal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M8 2v4M16 2v4M3 10h18"/>
        </svg>
      </div>
      <div class="stat-body">
        <div class="stat-value">{{ stats.leave_days || 0 }}</div>
        <div class="stat-label">On Leave</div>
      </div>
    </div>

    <!-- Monthly Overview secondary row -->
    <div class="overview-card" :class="stats.leave_days ? 'overview-card--5col' : 'overview-card--4col'">
      <h3 class="overview-title">Monthly Overview</h3>
      <div class="overview-grid">
        <div class="overview-item">
          <div class="overview-value overview-value--yellow">{{ stats.half_days || 0 }}</div>
          <div class="overview-label">Half Days</div>
        </div>
        <div class="overview-item">
          <div class="overview-value overview-value--orange">{{ stats.late_days || 0 }}</div>
          <div class="overview-label">Late Arrivals</div>
        </div>
        <div class="overview-item">
          <div class="overview-value overview-value--indigo">{{ stats.early_leave_days || 0 }}</div>
          <div class="overview-label">Early Leaves</div>
        </div>
        <div class="overview-item">
          <div class="overview-value overview-value--teal">{{ stats.regularized_count || 0 }}</div>
          <div class="overview-label">Regularized</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
interface AttendanceStats {
  total_days?: number
  present_days?: number
  absent_days?: number
  half_days?: number
  late_days?: number
  early_leave_days?: number
  total_working_hours?: number
  total_overtime_hours?: number
  regularized_count?: number
  leave_days?: number
}

interface Props {
  stats: AttendanceStats
}

defineProps<Props>()
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* ── stat card ─────────────────────────────────────────────────────────── */
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--surface3);
  border-radius: 12px;
  padding: 16px 18px;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}
.stat-icon--green  { background: rgba(54,211,153,.15);  color: var(--green); }
.stat-icon--red    { background: rgba(255,107,107,.15); color: var(--red); }
.stat-icon--blue   { background: rgba(79,126,255,.15);  color: var(--accent); }
.stat-icon--purple { background: rgba(155,110,255,.15); color: var(--purple); }
.stat-icon--teal   { background: rgba(20,184,166,.15);  color: #14b8a6; }

.stat-body { flex: 1; }
.stat-value { font-size: 22px; font-weight: 700; color: var(--text); line-height: 1.1; }
.stat-label { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* ── overview card ─────────────────────────────────────────────────────── */
.overview-card {
  background: var(--surface);
  border: 1px solid var(--surface3);
  border-radius: 12px;
  padding: 16px 18px;
  grid-column: 1 / -1;
}
.overview-title { font-size: 13px; font-weight: 600; color: var(--text); margin: 0 0 14px; }

.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.overview-item { text-align: center; }
.overview-value { font-size: 20px; font-weight: 700; line-height: 1.1; }
.overview-label { font-size: 12px; color: var(--muted); margin-top: 2px; }

.overview-value--yellow { color: var(--yellow); }
.overview-value--orange { color: #f97316; }
.overview-value--indigo { color: #818cf8; }
.overview-value--teal   { color: #14b8a6; }

@media (max-width: 900px) {
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .summary-grid { grid-template-columns: 1fr; }
  .overview-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
