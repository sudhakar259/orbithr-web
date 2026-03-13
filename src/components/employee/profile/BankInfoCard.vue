<template>
  <SectionCard title="Bank Info">
    <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSave">
      <div>
        <label class="block text-sm font-medium text-slate-700">Bank Name</label>
        <input v-model="model.bank_name" type="text" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">Account Number</label>
        <input v-model="model.account_number" type="text" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">IFSC Code</label>
        <input v-model="model.ifsc_code" type="text" class="input mt-1" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700">UAN</label>
        <input v-model="model.uan" type="text" class="input mt-1" />
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

export interface BankInfo { bank_name?: string; account_number?: string; ifsc_code?: string; uan?: string }

const props = defineProps<{ modelValue: BankInfo }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: BankInfo): void; (e: 'save', v: BankInfo): void }>()

const model = reactive<BankInfo>({ ...props.modelValue })

watch(() => props.modelValue, (v) => Object.assign(model, v))

function onSave() {
  emit('update:modelValue', { ...model })
  emit('save', { ...model })
}
function reset() { Object.assign(model, props.modelValue) }
</script>
