<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import lndService from '@/services/lndService'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const programId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const saving = ref(false)
const error = ref('')

const form = ref({
  title: '',
  description: '',
  program_type: 'custom',
  is_mandatory: false,
  start_date: '',
  end_date: '',
  max_enrollments: null as number | null,
})

async function loadProgram() {
  if (!programId.value) return
  try {
    const res = await lndService.getProgram(programId.value)
    const p = res.data.data
    form.value = {
      title: p.title,
      description: p.description || '',
      program_type: p.program_type,
      is_mandatory: p.is_mandatory,
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      max_enrollments: p.max_enrollments || null,
    }
  } catch {
    error.value = 'Failed to load program.'
  }
}

async function handleSubmit() {
  saving.value = true
  error.value = ''
  try {
    if (isEdit.value && programId.value) {
      await lndService.updateProgram(programId.value, form.value)
      router.push({ name: 'lnd.programs.show', params: { id: programId.value } })
    } else {
      const res = await lndService.createProgram(form.value)
      router.push({ name: 'lnd.programs.show', params: { id: res.data.data.id } })
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    error.value = err.response?.data?.message || 'Failed to save program.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (isEdit.value) loadProgram()
})
</script>

<template>
  <div class="pf-page">
    <RouterLink :to="{ name: 'lnd.programs' }" class="pf-back-link">&larr; Back to Programs</RouterLink>

    <div class="pf-form-card">
      <h2 class="pf-form-title">{{ isEdit ? 'Edit Program' : 'New Training Program' }}</h2>

      <div v-if="error" class="pf-error">{{ error }}</div>

      <form class="pf-form" @submit.prevent="handleSubmit">
        <div class="pf-field">
          <label class="pf-label">Title *</label>
          <input v-model="form.title" type="text" required class="pf-input" />
        </div>

        <div class="pf-field">
          <label class="pf-label">Description</label>
          <textarea v-model="form.description" rows="3" class="pf-input pf-textarea" />
        </div>

        <div class="pf-grid-2">
          <div class="pf-field">
            <label class="pf-label">Program Type</label>
            <select v-model="form.program_type" class="pf-input">
              <option value="onboarding">Onboarding</option>
              <option value="role_based">Role Based</option>
              <option value="compliance">Compliance</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="pf-field">
            <label class="pf-label">Max Enrollments</label>
            <input v-model.number="form.max_enrollments" type="number" min="1" class="pf-input" />
          </div>
        </div>

        <div class="pf-grid-2">
          <div class="pf-field">
            <label class="pf-label">Start Date</label>
            <input v-model="form.start_date" type="date" class="pf-input" />
          </div>
          <div class="pf-field">
            <label class="pf-label">End Date</label>
            <input v-model="form.end_date" type="date" class="pf-input" />
          </div>
        </div>

        <label class="pf-checkbox-row">
          <input id="mandatory" v-model="form.is_mandatory" type="checkbox" class="pf-checkbox" />
          <span>Mandatory program</span>
        </label>

        <div class="pf-form-footer">
          <RouterLink :to="{ name: 'lnd.programs' }" class="pf-btn-ghost">Cancel</RouterLink>
          <button type="submit" :disabled="saving" class="pf-btn-primary">{{ saving ? 'Saving…' : isEdit ? 'Update' : 'Create' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.pf-page { display: flex; flex-direction: column; gap: 16px; }
.pf-back-link { font-size: 13px; color: #7A8299; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
.pf-back-link:hover { color: #EEF0F4; }
.pf-form-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 24px; max-width: 640px; }
.pf-form-title { font-size: 16px; font-weight: 700; color: #EEF0F4; margin: 0 0 20px; }
.pf-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; margin-bottom: 16px; }
.pf-form { display: flex; flex-direction: column; gap: 16px; }
.pf-field { display: flex; flex-direction: column; gap: 5px; }
.pf-label { font-size: 12px; font-weight: 500; color: #B6BED0; }
.pf-input { background: #0D0F17; border: 1px solid #232936; color: #EEF0F4; border-radius: 7px; padding: 8px 11px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
.pf-input:focus { border-color: #6B5BFF; }
.pf-textarea { resize: vertical; min-height: 80px; }
.pf-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pf-checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B6BED0; cursor: pointer; }
.pf-checkbox { accent-color: #6B5BFF; }
.pf-form-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 14px; border-top: 1px solid #232936; }
.pf-btn-primary { background: #6B5BFF; border: none; color: #fff; border-radius: 7px; padding: 8px 20px; font-size: 13px; font-weight: 500; cursor: pointer; }
.pf-btn-primary:hover:not(:disabled) { opacity: 0.88; }
.pf-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.pf-btn-ghost { background: #232936; border: 1px solid #2D3448; color: #B6BED0; border-radius: 7px; padding: 8px 16px; font-size: 13px; text-decoration: none; cursor: pointer; }
.pf-btn-ghost:hover { color: #EEF0F4; }
</style>
