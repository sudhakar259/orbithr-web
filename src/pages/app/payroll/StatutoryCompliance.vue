<script setup lang="ts">
defineOptions({ name: 'StatutoryCompliance' })

import { ref, watch } from 'vue'
import api from '@/services/api'

type TabKey = 'pf' | 'esi' | 'pt' | 'tds'
const activeTab = ref<TabKey>('pf')
const loading = ref(false)
const reportData = ref<any>(null)
const summary = ref<any>(null)

const filters = ref({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
})

const months = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

const tabs = [
  { key: 'pf' as const, label: 'PF Challan', endpoint: '/statutory/pf-challan' },
  { key: 'esi' as const, label: 'ESI Challan', endpoint: '/statutory/esi-challan' },
  { key: 'pt' as const, label: 'PT Report', endpoint: '/statutory/pt-report' },
  { key: 'tds' as const, label: 'TDS Report', endpoint: '/statutory/tds-report' },
]

async function fetchData() {
  loading.value = true
  try {
    const tab = tabs.find(t => t.key === activeTab.value)!
    const [reportRes, summaryRes] = await Promise.all([
      api.get(tab.endpoint, { params: filters.value }),
      api.get('/statutory/summary', { params: filters.value }),
    ])
    reportData.value = reportRes.data.data ?? reportRes.data
    summary.value = summaryRes.data.data ?? summaryRes.data
  } catch { /* silently ignore */ }
  finally { loading.value = false }
}

async function download() {
  const tab = tabs.find(t => t.key === activeTab.value)!
  try {
    const { data } = await api.get(`${tab.endpoint}/download`, { params: filters.value, responseType: 'blob' })
    const url = window.URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tab.key}-challan-${filters.value.year}-${filters.value.month}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch { /* silently ignore */ }
}

watch([activeTab, filters], fetchData, { deep: true, immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="mt-1 text-sm text-gray-400">PF, ESI, Professional Tax, and TDS reports</p>
      </div>
      <button class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium rounded-lg inline-flex items-center gap-2" @click="download">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        Download
      </button>
    </div>

    <!-- Month/Year Filter -->
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div class="flex items-center gap-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Month</label>
          <select v-model.number="filters.month" class="bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Year</label>
          <select v-model.number="filters.year" class="bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg px-3 py-2">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Summary Cards -->
    <div v-if="summary" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p class="text-xs text-gray-400">PF Contribution</p>
        <p class="text-2xl font-bold text-white mt-1">${{ summary.total_pf?.toLocaleString() ?? '--' }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p class="text-xs text-gray-400">ESI Contribution</p>
        <p class="text-2xl font-bold text-blue-400 mt-1">${{ summary.total_esi?.toLocaleString() ?? '--' }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p class="text-xs text-gray-400">Professional Tax</p>
        <p class="text-2xl font-bold text-yellow-400 mt-1">${{ summary.total_pt?.toLocaleString() ?? '--' }}</p>
      </div>
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p class="text-xs text-gray-400">TDS Deducted</p>
        <p class="text-2xl font-bold text-purple-400 mt-1">${{ summary.total_tds?.toLocaleString() ?? '--' }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-700">
      <nav class="flex gap-4">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="px-3 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === tab.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </nav>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>

    <!-- PF Challan -->
    <div v-else-if="activeTab === 'pf'" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
          <tr>
            <th class="px-4 py-3">Employee</th>
            <th class="px-4 py-3">UAN</th>
            <th class="px-4 py-3">Basic Wages</th>
            <th class="px-4 py-3">Employee PF</th>
            <th class="px-4 py-3">Employer PF</th>
            <th class="px-4 py-3">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="row in (reportData?.records ?? reportData ?? [])" :key="row.employee_id" class="text-gray-300">
            <td class="px-4 py-3 text-white font-medium">{{ row.employee_name }}</td>
            <td class="px-4 py-3 text-gray-400">{{ row.uan ?? '-' }}</td>
            <td class="px-4 py-3">${{ row.basic_wages?.toLocaleString() }}</td>
            <td class="px-4 py-3">${{ row.employee_pf?.toLocaleString() }}</td>
            <td class="px-4 py-3">${{ row.employer_pf?.toLocaleString() }}</td>
            <td class="px-4 py-3 text-white font-medium">${{ row.total_pf?.toLocaleString() }}</td>
          </tr>
        </tbody>
        <tfoot class="bg-gray-700/30">
          <tr class="text-white font-semibold">
            <td class="px-4 py-3" colspan="2">Total</td>
            <td class="px-4 py-3">${{ reportData?.totals?.basic_wages?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.employee_pf?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.employer_pf?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.total_pf?.toLocaleString() ?? '--' }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ESI Challan -->
    <div v-else-if="activeTab === 'esi'" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
          <tr>
            <th class="px-4 py-3">Employee</th>
            <th class="px-4 py-3">ESIC No</th>
            <th class="px-4 py-3">Gross Wages</th>
            <th class="px-4 py-3">Employee ESI</th>
            <th class="px-4 py-3">Employer ESI</th>
            <th class="px-4 py-3">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="row in (reportData?.records ?? reportData ?? [])" :key="row.employee_id" class="text-gray-300">
            <td class="px-4 py-3 text-white font-medium">{{ row.employee_name }}</td>
            <td class="px-4 py-3 text-gray-400">{{ row.esic_no ?? '-' }}</td>
            <td class="px-4 py-3">${{ row.gross_wages?.toLocaleString() }}</td>
            <td class="px-4 py-3">${{ row.employee_esi?.toLocaleString() }}</td>
            <td class="px-4 py-3">${{ row.employer_esi?.toLocaleString() }}</td>
            <td class="px-4 py-3 text-white font-medium">${{ row.total_esi?.toLocaleString() }}</td>
          </tr>
        </tbody>
        <tfoot class="bg-gray-700/30">
          <tr class="text-white font-semibold">
            <td class="px-4 py-3" colspan="2">Total</td>
            <td class="px-4 py-3">${{ reportData?.totals?.gross_wages?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.employee_esi?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.employer_esi?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.total_esi?.toLocaleString() ?? '--' }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- PT Report -->
    <div v-else-if="activeTab === 'pt'" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
          <tr>
            <th class="px-4 py-3">Employee</th>
            <th class="px-4 py-3">State</th>
            <th class="px-4 py-3">Gross Salary</th>
            <th class="px-4 py-3">PT Amount</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="row in (reportData?.records ?? reportData ?? [])" :key="row.employee_id" class="text-gray-300">
            <td class="px-4 py-3 text-white font-medium">{{ row.employee_name }}</td>
            <td class="px-4 py-3">{{ row.state ?? '-' }}</td>
            <td class="px-4 py-3">${{ row.gross_salary?.toLocaleString() }}</td>
            <td class="px-4 py-3 text-yellow-400">${{ row.pt_amount?.toLocaleString() }}</td>
          </tr>
        </tbody>
        <tfoot class="bg-gray-700/30">
          <tr class="text-white font-semibold">
            <td class="px-4 py-3" colspan="2">Total</td>
            <td class="px-4 py-3">${{ reportData?.totals?.gross_salary?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.pt_amount?.toLocaleString() ?? '--' }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- TDS Report -->
    <div v-else-if="activeTab === 'tds'" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="w-full text-sm text-left">
        <thead class="bg-gray-700/50 text-gray-400 text-xs uppercase">
          <tr>
            <th class="px-4 py-3">Employee</th>
            <th class="px-4 py-3">PAN</th>
            <th class="px-4 py-3">Taxable Income</th>
            <th class="px-4 py-3">TDS Deducted</th>
            <th class="px-4 py-3">Surcharge</th>
            <th class="px-4 py-3">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="row in (reportData?.records ?? reportData ?? [])" :key="row.employee_id" class="text-gray-300">
            <td class="px-4 py-3 text-white font-medium">{{ row.employee_name }}</td>
            <td class="px-4 py-3 text-gray-400">{{ row.pan ?? '-' }}</td>
            <td class="px-4 py-3">${{ row.taxable_income?.toLocaleString() }}</td>
            <td class="px-4 py-3">${{ row.tds_deducted?.toLocaleString() }}</td>
            <td class="px-4 py-3">${{ row.surcharge?.toLocaleString() }}</td>
            <td class="px-4 py-3 text-white font-medium">${{ row.total_tax?.toLocaleString() }}</td>
          </tr>
        </tbody>
        <tfoot class="bg-gray-700/30">
          <tr class="text-white font-semibold">
            <td class="px-4 py-3" colspan="2">Total</td>
            <td class="px-4 py-3">${{ reportData?.totals?.taxable_income?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.tds_deducted?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.surcharge?.toLocaleString() ?? '--' }}</td>
            <td class="px-4 py-3">${{ reportData?.totals?.total_tax?.toLocaleString() ?? '--' }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-if="!loading && !reportData" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-400">No statutory data available for the selected period.</p>
    </div>
  </div>
</template>
