<script setup lang="ts">
import { ref, onMounted } from 'vue'
import lndService from '@/services/lndService'
import type { CompletionRate, SkillGapEntry } from '@/services/lndService'

const loading = ref(true)
const completionRates = ref<CompletionRate[]>([])
const skillGap = ref<SkillGapEntry[]>([])
const error = ref('')
const activeTab = ref<'completion' | 'skill-gap'>('completion')
const threshold = ref('intermediate')

async function loadCompletionRates() {
  try {
    const res = await lndService.getCompletionRates()
    completionRates.value = res.data.data
  } catch {
    error.value = 'Failed to load completion rates.'
  }
}

async function loadSkillGap() {
  try {
    const res = await lndService.getSkillGap(threshold.value)
    skillGap.value = res.data.data
  } catch {
    error.value = 'Failed to load skill gap report.'
  }
}

async function loadAll() {
  loading.value = true
  await Promise.all([loadCompletionRates(), loadSkillGap()])
  loading.value = false
}

onMounted(loadAll)
</script>

<template>
  <div>
    <div
      v-if="error"
      class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
    >
      {{ error }}
    </div>

    <!-- Tab toggle -->
    <div class="flex gap-2 mb-6">
      <button
        :class="
          activeTab === 'completion'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        "
        class="px-3 py-1.5 rounded-lg text-sm"
        @click="activeTab = 'completion'"
      >
        Completion Rates
      </button>
      <button
        :class="
          activeTab === 'skill-gap'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        "
        class="px-3 py-1.5 rounded-lg text-sm"
        @click="activeTab = 'skill-gap'"
      >
        Skill Gap Analysis
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div
        v-for="n in 5"
        :key="n"
        class="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
      >
        <div class="h-4 bg-gray-700 rounded w-1/2" />
      </div>
    </div>

    <!-- Completion Rates -->
    <template v-else-if="activeTab === 'completion'">
      <div v-if="completionRates.length" class="bg-gray-800 border border-gray-700 rounded-lg">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-700">
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Course
              </th>
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Enrolled
              </th>
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                In Progress
              </th>
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Completed
              </th>
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Rate
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="rate in completionRates" :key="rate.id">
              <td class="px-5 py-3 text-white text-sm">{{ rate.title }}</td>
              <td class="px-5 py-3 text-gray-400 text-sm">{{ rate.enrolled }}</td>
              <td class="px-5 py-3 text-blue-400 text-sm">{{ rate.in_progress }}</td>
              <td class="px-5 py-3 text-green-400 text-sm">{{ rate.completed }}</td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-20 bg-gray-700 rounded-full h-2">
                    <div
                      class="h-2 rounded-full bg-green-500"
                      :style="{ width: rate.completion_rate + '%' }"
                    />
                  </div>
                  <span class="text-gray-400 text-sm">{{ rate.completion_rate }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-else
        class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center"
      >
        <p class="text-gray-400">No course data available yet.</p>
      </div>
    </template>

    <!-- Skill Gap -->
    <template v-else>
      <div class="mb-4">
        <label class="text-gray-300 text-sm mr-2">Threshold:</label>
        <select
          v-model="threshold"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          @change="loadSkillGap"
        >
          <option value="intermediate">Below Intermediate</option>
          <option value="advanced">Below Advanced</option>
          <option value="expert">Below Expert</option>
        </select>
      </div>

      <div v-if="skillGap.length" class="space-y-3">
        <div
          v-for="entry in skillGap"
          :key="entry.employee_id"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <div>
              <p class="text-white text-sm font-medium">{{ entry.employee_name }}</p>
              <p class="text-gray-400 text-xs">{{ entry.employee_email }}</p>
            </div>
            <span class="text-gray-400 text-xs">
              {{ entry.skills_below_threshold.length }} skill(s) below threshold
            </span>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(s, idx) in entry.skills_below_threshold"
              :key="idx"
              class="bg-yellow-900/30 text-yellow-400 text-xs px-2 py-1 rounded"
            >
              {{ s.skill }} ({{ s.current_level }})
            </span>
          </div>
        </div>
      </div>
      <div
        v-else
        class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center"
      >
        <p class="text-gray-400">No skill gaps found at this threshold.</p>
      </div>
    </template>
  </div>
</template>
