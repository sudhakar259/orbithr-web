<script setup lang="ts">
import { reactive } from 'vue'
import ContactEmergencyCard, { type ContactEmergencyInfo } from '@/components/employee/profile/ContactEmergencyCard.vue'

const contact = reactive<ContactEmergencyInfo>({ address: '', phone: '', alt_phone: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '' })
</script>
<template>
  <ContactEmergencyCard v-model="contact" @save="(v)=>Object.assign(contact,v)" />
</template>
