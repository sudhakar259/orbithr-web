<template>
  <SectionCard title="Personal Info">
    <form class="pf-grid" @submit.prevent="onSave">
      <div class="pf-field">
        <label class="pf-label">Date of Birth</label>
        <input v-model="model.date_of_birth" type="date" class="pf-input" />
      </div>
      <div class="pf-field">
        <label class="pf-label">Gender</label>
        <select v-model="model.gender" class="pf-input">
          <option value="">Select</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="pf-field">
        <label class="pf-label">Marital Status</label>
        <select v-model="model.marital_status" class="pf-input">
          <option value="">Select</option>
          <option>Single</option>
          <option>Married</option>
          <option>Divorced</option>
          <option>Widowed</option>
        </select>
      </div>
      <div class="pf-field">
        <label class="pf-label">Blood Group</label>
        <input v-model="model.blood_group" type="text" placeholder="O+, A-, B+" class="pf-input" />
      </div>
      <div class="pf-actions">
        <button type="button" class="pf-btn-ghost" @click="reset">Reset</button>
        <button type="submit" class="pf-btn-primary">Save</button>
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

function onSave() { emit('update:modelValue', { ...model }); emit('save', { ...model }) }
function reset() { Object.assign(model, props.modelValue) }
</script>

<style scoped>
.pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pf-field { display: flex; flex-direction: column; gap: 6px; }
.pf-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.pf-input {
  background: #0D0F17;
  border: 1px solid #232936;
  border-radius: 7px;
  color: #EEF0F4;
  font-size: 13px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}
.pf-input:focus { border-color: #6B5BFF; }
.pf-input option { background: #161A23; }
.pf-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.pf-btn-ghost {
  background: transparent;
  border: 1px solid #232936;
  color: #7A8299;
  border-radius: 7px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.pf-btn-ghost:hover { background: #232936; }
.pf-btn-primary {
  background: #6B5BFF;
  border: none;
  color: #fff;
  border-radius: 7px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}
.pf-btn-primary:hover { opacity: 0.88; }
</style>
