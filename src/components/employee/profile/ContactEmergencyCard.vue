<template>
  <SectionCard title="Contact & Emergency Info">
    <form class="pf-grid" @submit.prevent="onSave">
      <div class="pf-field pf-full">
        <label class="pf-label">Address</label>
        <textarea v-model="model.address" rows="3" class="pf-input" />
      </div>
      <div class="pf-field">
        <label class="pf-label">Phone</label>
        <input v-model="model.phone" type="tel" class="pf-input" />
      </div>
      <div class="pf-field">
        <label class="pf-label">Alternate Phone</label>
        <input v-model="model.alt_phone" type="tel" class="pf-input" />
      </div>
      <div class="pf-field">
        <label class="pf-label">Emergency Contact Name</label>
        <input v-model="model.emergency_contact_name" type="text" class="pf-input" />
      </div>
      <div class="pf-field">
        <label class="pf-label">Emergency Contact Phone</label>
        <input v-model="model.emergency_contact_phone" type="tel" class="pf-input" />
      </div>
      <div class="pf-field pf-full">
        <label class="pf-label">Relationship</label>
        <input v-model="model.emergency_contact_relationship" type="text" class="pf-input" />
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

export interface ContactEmergencyInfo {
  address?: string; phone?: string; alt_phone?: string
  emergency_contact_name?: string; emergency_contact_phone?: string; emergency_contact_relationship?: string
}

const props = defineProps<{ modelValue: ContactEmergencyInfo }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: ContactEmergencyInfo): void; (e: 'save', v: ContactEmergencyInfo): void }>()

const model = reactive<ContactEmergencyInfo>({ ...props.modelValue })
watch(() => props.modelValue, (v) => Object.assign(model, v))

function onSave() { emit('update:modelValue', { ...model }); emit('save', { ...model }) }
function reset() { Object.assign(model, props.modelValue) }
</script>

<style scoped>
.pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pf-full { grid-column: 1 / -1; }
.pf-field { display: flex; flex-direction: column; gap: 6px; }
.pf-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.pf-input {
  background: #0D0F17; border: 1px solid #232936; border-radius: 7px;
  color: #EEF0F4; font-size: 13px; padding: 8px 12px; outline: none;
  transition: border-color 0.15s; width: 100%; box-sizing: border-box; resize: vertical;
}
.pf-input:focus { border-color: #6B5BFF; }
.pf-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.pf-btn-ghost {
  background: transparent; border: 1px solid #232936; color: #7A8299;
  border-radius: 7px; padding: 8px 16px; font-size: 13px; cursor: pointer; transition: background 0.15s;
}
.pf-btn-ghost:hover { background: #232936; }
.pf-btn-primary {
  background: #6B5BFF; border: none; color: #fff; border-radius: 7px;
  padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
}
.pf-btn-primary:hover { opacity: 0.88; }
</style>
