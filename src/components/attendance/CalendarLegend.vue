<template>
  <div class="rounded-lg border border-slate-200 bg-white p-4">
    <h3 class="mb-4 text-sm font-semibold text-slate-900">Calendar Legend</h3>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- Present -->
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
        <span class="text-xs text-slate-600">Present (P)</span>
      </div>

      <!-- Absent -->
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
        <span class="text-xs text-slate-600">Absent (A)</span>
      </div>

      <!-- Half Day -->
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
        <span class="text-xs text-slate-600">Half Day (HD)</span>
      </div>

      <!-- Late -->
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
        <span class="text-xs text-slate-600">Late (L)</span>
      </div>

      <!-- Early Leave -->
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
        <span class="text-xs text-slate-600">Early Leave (EL)</span>
      </div>

      <!-- Holiday -->
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
        <span class="text-xs text-slate-600">Holiday (H)</span>
      </div>

      <!-- Weekend -->
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
        <span class="text-xs text-slate-600">Weekend (W)</span>
      </div>

      <!-- Regularized -->
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 rounded bg-indigo-100 border border-indigo-300"></div>
        <span class="text-xs text-slate-600">Regularized</span>
      </div>
    </div>

    <!-- Additional Information -->
    <div class="mt-4 pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
      <div class="flex gap-2">
        <span class="font-medium">📌</span>
        <span>Click on any date to view detailed punch logs</span>
      </div>
      <div class="flex gap-2">
        <span class="font-medium">⏱️</span>
        <span>Regularization allowed within 3 working days of absence</span>
      </div>
      <div class="flex gap-2">
        <span class="font-medium">📋</span>
        <span>After 3 days, attendance is locked and EL is auto-deducted</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Calendar legend component - displays color coding and status information
</script>

<style scoped>
</style>
