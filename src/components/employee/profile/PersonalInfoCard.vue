<template>
  <SectionCard title="Personal Info">
    <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSave">
      <div>
        <label class="block text-sm font-medium text-slate-700">Date of Birth</label>
        <input v-model="model.date_of_birth" type="date" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Gender</label>
        <select v-model="model.gender" class="input mt-1">
          <option value="">Select</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Marital Status</label>
        <select v-model="model.marital_status" class="input mt-1">
          <option value="">Select</option>
          <option>Single</option>
          <option>Married</option>
          <option>Divorced</option>
          <option>Widowed</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Blood Group</label>
        <input v-model="model.blood_group" type="text" placeholder="O+, A-, B+" class="input mt-1" />
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

export interface PersonalInfo {
  date_of_birth?: string
  gender?: string
  marital_status?: string
  blood_group?: string
}

const props = defineProps<{ modelValue: PersonalInfo }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: PersonalInfo): void; (e: 'save', v: PersonalInfo): void }>()

const model = reactive<PersonalInfo>({ ...props.modelValue })

watch(() => props.modelValue, (v) => Object.assign(model, v))

function onSave() {
  emit('update:modelValue', { ...model })
  emit('save', { ...model })
}
function reset() {
  Object.assign(model, props.modelValue)
}
</script>
