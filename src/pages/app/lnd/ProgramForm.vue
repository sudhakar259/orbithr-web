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
  <div>
    <RouterLink
      :to="{ name: 'lnd.programs' }"
      class="text-gray-400 hover:text-white text-sm mb-4 inline-flex items-center gap-1"
    >
      &larr; Back to Programs
    </RouterLink>

    <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-2xl">
      <h2 class="text-lg font-bold text-white mb-6">
        {{ isEdit ? 'Edit Program' : 'New Training Program' }}
      </h2>

      <div
        v-if="error"
        class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
      >
        {{ error }}
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div>
          <label class="block text-gray-300 text-sm mb-1">Title *</label>
          <input
            v-model="form.title"
            type="text"
            required
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-gray-300 text-sm mb-1">Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-300 text-sm mb-1">Program Type</label>
            <select
              v-model="form.program_type"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="onboarding">Onboarding</option>
              <option value="role_based">Role Based</option>
              <option value="compliance">Compliance</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-1">Max Enrollments</label>
            <input
              v-model.number="form.max_enrollments"
              type="number"
              min="1"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-gray-300 text-sm mb-1">Start Date</label>
            <input
              v-model="form.start_date"
              type="date"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-gray-300 text-sm mb-1">End Date</label>
            <input
              v-model="form.end_date"
              type="date"
              class="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="mandatory"
            v-model="form.is_mandatory"
            type="checkbox"
            class="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <label for="mandatory" class="text-gray-300 text-sm">Mandatory program</label>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <RouterLink
            :to="{ name: 'lnd.programs' }"
            class="bg-gray-700 border border-gray-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </RouterLink>
          <button
            type="submit"
            :disabled="saving"
            class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {{ saving ? 'Saving...' : isEdit ? 'Update' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
