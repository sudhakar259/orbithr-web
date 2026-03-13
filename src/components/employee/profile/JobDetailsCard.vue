<template>
  <SectionCard title="Job Details">
    <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSave">
      <div>
        <label class="block text-sm font-medium text-slate-700">Role</label>
        <input v-model="model.role" type="text" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Department</label>
        <input v-model="model.department" type="text" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Joining Date</label>
        <input v-model="model.joining_date" type="date" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Status</label>
        <select v-model="model.status" class="input mt-1">
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
        </select>
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

export interface JobDetails { role?: string; department?: string; joining_date?: string; status?: string }

const props = defineProps<{ modelValue: JobDetails }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: JobDetails): void; (e: 'save', v: JobDetails): void }>()

const model = reactive<JobDetails>({ ...props.modelValue })

watch(() => props.modelValue, (v) => Object.assign(model, v))

function onSave() { emit('update:modelValue', { ...model }); emit('save', { ...model }) }
function reset() { Object.assign(model, props.modelValue) }
</script>
