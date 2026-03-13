<script setup lang="ts">
import { reactive } from 'vue'
import JobDetailsCard, { type JobDetails } from '@/components/employee/profile/JobDetailsCard.vue'

const job = reactive<JobDetails>({ role: '', department: '', joining_date: '', status: 'Active' })
</script>
<template>
  <JobDetailsCard v-model="job" @save="(v)=>Object.assign(job,v)" />
</template>
