<template>
  <span class="pill" :class="status">{{ labels[status as keyof typeof labels] ?? status }}</span>
</template>

<script setup lang="ts">
defineProps<{ status: string }>()
const labels = {
  active: 'Active', leave: 'On Leave', inactive: 'Inactive', probation: 'Probation',
  present: 'Present', absent: 'Absent', late: 'Late', wfh: 'WFH',
  paid: 'Paid', hold: 'On Hold', pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  shortlisted: 'Shortlisted', hired: 'Hired', 'under review': 'Under Review',
  ongoing: 'Ongoing', upcoming: 'Upcoming', completed: 'Completed',
  assigned: 'Assigned', available: 'Available', maintenance: 'Maintenance', retired: 'Retired',
  online: 'Online', offline: 'Offline', hybrid: 'Hybrid',
}
</script>

<style scoped>
.pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
.pill::before { content: ''; width: 5px; height: 5px; border-radius: 50%; }

.pill.active, .pill.present, .pill.paid, .pill.approved, .pill.hired, .pill.assigned, .pill.completed {
  background: rgba(54,211,153,.1); color: #36D399;
}
.pill.active::before, .pill.present::before, .pill.paid::before, .pill.approved::before,
.pill.hired::before, .pill.assigned::before, .pill.completed::before { background: #36D399; }

.pill.leave, .pill.wfh, .pill.pending, .pill.hold, .pill.probation, .pill.ongoing, .pill.available {
  background: rgba(249,168,37,.1); color: #F9A825;
}
.pill.leave::before, .pill.wfh::before, .pill.pending::before, .pill.hold::before,
.pill.probation::before, .pill.ongoing::before, .pill.available::before { background: #F9A825; }

.pill.inactive, .pill.absent, .pill.rejected, .pill.late, .pill.retired {
  background: rgba(255,107,107,.1); color: #FF6B6B;
}
.pill.inactive::before, .pill.absent::before, .pill.rejected::before,
.pill.late::before, .pill.retired::before { background: #FF6B6B; }

.pill.shortlisted, .pill.upcoming, .pill.maintenance, .pill.offline {
  background: rgba(79,126,255,.1); color: #4F7EFF;
}
.pill.shortlisted::before, .pill.upcoming::before, .pill.maintenance::before,
.pill.offline::before { background: #4F7EFF; }

.pill.online, .pill.hybrid {
  background: rgba(155,110,255,.1); color: #9B6EFF;
}
.pill.online::before, .pill.hybrid::before { background: #9B6EFF; }
</style>
