<script setup lang="ts">
import { reactive } from 'vue'
import PersonalInfoCard, { type PersonalInfo } from '@/components/employee/profile/PersonalInfoCard.vue'

const personal = reactive<PersonalInfo>({ date_of_birth: '', gender: '', marital_status: '', blood_group: '' })
</script>
<template>
  <PersonalInfoCard v-model="personal" @save="(v)=>Object.assign(personal,v)" />
</template>
