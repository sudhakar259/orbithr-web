<script setup lang="ts">
import { reactive } from 'vue'
import BankInfoCard, { type BankInfo } from '@/components/employee/profile/BankInfoCard.vue'

const bank = reactive<BankInfo>({ bank_name: '', account_number: '', ifsc_code: '', uan: '' })
</script>
<template>
  <BankInfoCard v-model="bank" @save="(v)=>Object.assign(bank,v)" />
</template>
