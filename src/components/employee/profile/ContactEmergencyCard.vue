<template>
  <SectionCard title="Contact & Emergency Info">
    <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSave">
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-slate-700">Address</label>
        <textarea v-model="model.address" rows="3" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Phone</label>
        <input v-model="model.phone" type="tel" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Alternate Phone</label>
        <input v-model="model.alt_phone" type="tel" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Emergency Contact Name</label>
        <input v-model="model.emergency_contact_name" type="text" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Emergency Contact Phone</label>
        <input v-model="model.emergency_contact_phone" type="tel" class="input mt-1" />
      </div>
      <div class="sm:col-span-2">
        <label class="block text-sm font-medium text-slate-700">Relationship</label>
        <input v-model="model.emergency_contact_relationship" type="text" class="input mt-1" />
      </div>
      <div class="sm:col-span-2 flex justify-end gap-3 pt-2">
        <button type="button" class="btn-ghost" @click="reset">Reset</button>
        <button type="submit" class="btn-primary">Save</button>
      </div>
    </form>
  </SectionCard>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import SectionCard from './SectionCard.vue'

export interface ContactEmergencyInfo {
  address?: string
  phone?: string
  alt_phone?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relationship?: string
}

const props = defineProps<{ modelValue: ContactEmergencyInfo }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: ContactEmergencyInfo): void; (e: 'save', v: ContactEmergencyInfo): void }>()

const model = reactive<ContactEmergencyInfo>({ ...props.modelValue })

watch(() => props.modelValue, (v) => Object.assign(model, v))

function onSave() {
  emit('update:modelValue', { ...model })
  emit('save', { ...model })
}
function reset() {
  Object.assign(model, props.modelValue)
}
</script>
