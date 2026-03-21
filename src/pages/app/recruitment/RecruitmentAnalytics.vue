<script setup lang="ts">
defineOptions({ name: 'RecruitmentAnalytics' })
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { recruitmentService, type RecruitmentAnalytics } from '@/services/recruitmentService'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const data = ref<RecruitmentAnalytics | null>(null)

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await recruitmentService.getAnalytics()
    data.value = res.data?.data ?? null
  } catch {
    error.value = 'Failed to load analytics'
  } finally {
    loading.value = false
  }
}

const funnelColors = [
  'bg-blue-600',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-red-500',
]

const maxFunnelCount = computed(() =>
  Math.max(...(data.value?.funnel?.map((f) => f.count) ?? [0]), 1),
)

const totalSources = computed(() =>
  Math.max(data.value?.sources?.reduce((s, r) => s + r.count, 0) ?? 0, 1),
)

const maxTrend = computed(() =>
  Math.max(...(data.value?.monthly_trend?.map((t) => t.count) ?? [0]), 1),
)

const funnelWidth = (count: number) => `${Math.round((count / maxFunnelCount.value) * 100)}%`
const sourceWidth = (count: number) => `${Math.round((count / totalSources.value) * 100)}%`
const sourcePct = (count: number) => `${((count / totalSources.value) * 100).toFixed(1)}%`
const trendHeight = (count: number) => `${Math.round((count / maxTrend.value) * 100)}%`

const formatStatus = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

const getJobStatusClass = (status: string) => {
  const map: Record<string, string> = {
    published: 'bg-green-900/50 text-green-400',
    draft: 'bg-gray-700 text-gray-300',
    closed: 'bg-red-900/50 text-red-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button
        @click="router.push({ name: 'recruitment' })"
        class="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Dashboard
      </button>
      <h2 class="text-lg font-semibold text-white">Recruitment Analytics</h2>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="bg-gray-800 border border-gray-700 rounded-lg p-5 animate-pulse"
        >
          <div class="h-4 bg-gray-700 rounded w-1/2 mb-3"></div>
          <div class="h-8 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 animate-pulse">
        <div class="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div class="space-y-3">
          <div
            v-for="i in 8"
            :key="i"
            class="h-8 bg-gray-700 rounded"
            :style="{ width: `${100 - i * 8}%` }"
          ></div>
        </div>
      </div>
    </div>

    <template v-else-if="data">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Applications</p>
          <p class="text-2xl font-bold text-white">{{ data.conversion.total_applications }}</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Time to Hire</p>
          <p class="text-2xl font-bold text-blue-400">
            {{ data.time_to_hire_days }}
            <span class="text-sm font-normal text-gray-400">days</span>
          </p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Hire Rate</p>
          <p class="text-2xl font-bold text-green-400">{{ data.conversion.hire_rate }}%</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Shortlist Rate</p>
          <p class="text-2xl font-bold text-purple-400">{{ data.conversion.shortlist_rate }}%</p>
        </div>
      </div>

      <!-- Recruitment Funnel -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-5">
          Recruitment Funnel
        </h3>
        <div class="space-y-3">
          <div
            v-for="(stage, i) in data.funnel"
            :key="stage.status"
            class="flex items-center gap-4"
          >
            <div class="w-36 text-right text-xs text-gray-400 shrink-0">
              {{ formatStatus(stage.status) }}
            </div>
            <div class="flex-1 bg-gray-700 rounded h-7 overflow-hidden">
              <div
                :class="['h-full rounded transition-all duration-500', funnelColors[i] ?? 'bg-blue-600']"
                :style="{ width: funnelWidth(stage.count) }"
              ></div>
            </div>
            <div class="w-12 text-right text-sm font-semibold text-white shrink-0">
              {{ stage.count }}
            </div>
          </div>
        </div>
      </div>

      <!-- Source Analytics & Monthly Trend -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Source Analytics -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Application Sources
          </h3>
          <div v-if="!data.sources.length" class="text-center py-8 text-gray-500 text-sm">
            No source data
          </div>
          <div v-else class="space-y-4">
            <div v-for="src in data.sources" :key="src.source" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-gray-300 capitalize">{{ src.source }}</span>
                <span class="text-gray-400">{{ src.count }} ({{ sourcePct(src.count) }})</span>
              </div>
              <div class="w-full bg-gray-700 rounded h-2">
                <div
                  class="bg-blue-500 h-2 rounded transition-all duration-500"
                  :style="{ width: sourceWidth(src.count) }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Monthly Trend -->
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            Monthly Applications (Last 6 Months)
          </h3>
          <div
            v-if="!data.monthly_trend.length"
            class="text-center py-8 text-gray-500 text-sm"
          >
            No trend data
          </div>
          <div v-else class="flex items-end gap-2" style="height: 130px">
            <div
              v-for="point in data.monthly_trend"
              :key="point.month"
              class="flex-1 flex flex-col items-center gap-1"
            >
              <span class="text-xs text-gray-400 font-semibold">{{ point.count }}</span>
              <div class="w-full relative bg-gray-700 rounded-t" style="height: 96px">
                <div
                  class="absolute bottom-0 left-0 right-0 bg-blue-600 rounded-t transition-all duration-500"
                  :style="{ height: trendHeight(point.count) }"
                ></div>
              </div>
              <span class="text-xs text-gray-500">{{ point.month.slice(5) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Jobs -->
      <div class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-700">
          <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Top Jobs by Applications
          </h3>
        </div>
        <table class="min-w-full divide-y divide-gray-700">
          <thead class="bg-gray-700/50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
              >
                Job Title
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
              >
                Department
              </th>
              <th
                class="px-6 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider"
              >
                Applications
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr
              v-for="job in data.top_jobs"
              :key="job.id"
              class="hover:bg-gray-700/30 transition-colors"
            >
              <td class="px-6 py-3 text-sm font-medium text-white">{{ job.title }}</td>
              <td class="px-6 py-3 text-sm text-gray-400">{{ job.department || '—' }}</td>
              <td class="px-6 py-3 text-sm text-right text-blue-400 font-semibold">
                {{ job.applications_count }}
              </td>
              <td class="px-6 py-3 text-sm">
                <span
                  :class="[
                    'inline-flex px-2 py-0.5 text-xs font-semibold rounded-full',
                    getJobStatusClass(job.status),
                  ]"
                >{{ job.status }}</span>
              </td>
            </tr>
            <tr v-if="!data.top_jobs.length">
              <td colspan="4" class="px-6 py-6 text-center text-sm text-gray-500">
                No jobs found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
