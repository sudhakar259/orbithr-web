<script setup lang="ts">
defineOptions({ name: 'EssProfile' })
import { ref, onMounted } from 'vue'
import { essService, type EssProfile } from '@/services/essService'

const loading = ref(true)
const saving = ref(false)
const editing = ref(false)
const error = ref('')
const success = ref('')
const profile = ref<EssProfile | null>(null)
const form = ref({ name: '', phone: '' })

const load = async () => {
  loading.value = true
  try {
    const res = await essService.getProfile()
    profile.value = res.data?.data ?? null
    if (profile.value) {
      form.value = { name: profile.value.name, phone: profile.value.phone ?? '' }
    }
  } catch {
    error.value = 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const res = await essService.updateProfile(form.value)
    profile.value = res.data?.data ?? profile.value
    editing.value = false
    success.value = 'Profile updated successfully'
    setTimeout(() => (success.value = ''), 3000)
  } catch {
    error.value = 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

onMounted(load)
</script>

<template>
  <div class="max-w-2xl space-y-4">
    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>
    <div v-if="success" class="bg-green-900/30 border border-green-700 rounded-lg p-4">
      <p class="text-sm text-green-400">{{ success }}</p>
    </div>

    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="flex gap-6">
        <div class="w-20 h-20 bg-gray-700 rounded-full shrink-0"></div>
        <div class="flex-1 space-y-3">
          <div class="h-6 bg-gray-700 rounded w-1/2"></div>
          <div class="h-4 bg-gray-700 rounded w-1/3"></div>
          <div class="h-4 bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    </div>

    <div v-else-if="profile" class="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center gap-5">
          <div
            class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
          >
            {{ initials(profile.name) }}
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">{{ profile.name }}</h2>
            <p class="text-gray-400 text-sm">{{ profile.email }}</p>
            <p v-if="profile.employee?.designation" class="text-gray-500 text-xs mt-0.5">
              {{ profile.employee.designation }}
            </p>
          </div>
        </div>
        <button
          v-if="!editing"
          @click="editing = true"
          class="px-3 py-1.5 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >Edit</button>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <div v-if="profile.employee?.employee_code">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Employee Code</p>
          <p class="text-sm text-white font-medium">{{ profile.employee.employee_code }}</p>
        </div>
        <div v-if="profile.employee?.department">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Department</p>
          <p class="text-sm text-white">{{ profile.employee.department }}</p>
        </div>
        <div v-if="profile.employee?.joining_date">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Joining Date</p>
          <p class="text-sm text-white">{{ formatDate(profile.employee.joining_date) }}</p>
        </div>
        <div v-if="profile.employee?.employment_type">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Employment Type</p>
          <p class="text-sm text-white capitalize">
            {{ profile.employee.employment_type.replace('_', ' ') }}
          </p>
        </div>
        <div v-if="profile.phone">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Phone</p>
          <p class="text-sm text-white">{{ profile.phone }}</p>
        </div>
      </div>

      <div v-if="editing" class="border-t border-gray-700 pt-5 space-y-4">
        <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Edit Information
        </h3>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
          <input
            v-model="form.name"
            type="text"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
          <input
            v-model="form.phone"
            type="tel"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div class="flex gap-3">
          <button
            @click="save"
            :disabled="saving"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >{{ saving ? 'Saving...' : 'Save Changes' }}</button>
          <button
            @click="editing = false"
            class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
          >Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>
