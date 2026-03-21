<script setup lang="ts">
defineOptions({ name: 'EssPayslips' })
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface Payslip {
  id: number
  payslip_number: string
  pay_period_start: string
  pay_period_end: string
  gross_salary: number
  net_salary: number
  total_deductions: number
  status: string
}

const loading = ref(true)
const error = ref('')
const payslips = ref<Payslip[]>([])
const filterYear = ref(new Date().getFullYear().toString())

const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/payroll/payslips', {
      params: { year: filterYear.value, my_payslips: true },
    })
    payslips.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load payslips'
  } finally {
    loading.value = false
  }
}

const download = (id: number) => window.open(`/api/v1/payroll/payslips/${id}/download`, '_blank')

const formatCurrency = (n: number) =>
  (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatPeriod = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex gap-4 items-end">
      <div>
        <label class="block text-xs text-gray-400 mb-1">Year</label>
        <select
          v-model="filterYear"
          @change="load"
          class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 6" :key="i" class="h-12 bg-gray-700 rounded"></div>
      </div>
    </div>

    <div v-else-if="payslips.length" class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700/50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Period</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Gross</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Deductions</th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Net Pay</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="p in payslips" :key="p.id" class="hover:bg-gray-700/30 transition-colors">
            <td class="px-4 py-3">
              <p class="text-sm font-medium text-white">{{ formatPeriod(p.pay_period_start) }}</p>
              <p class="text-xs text-gray-500">{{ p.payslip_number }}</p>
            </td>
            <td class="px-4 py-3 text-sm text-right text-gray-300">{{ formatCurrency(p.gross_salary) }}</td>
            <td class="px-4 py-3 text-sm text-right text-red-400">{{ formatCurrency(p.total_deductions) }}</td>
            <td class="px-4 py-3 text-sm text-right text-green-400 font-semibold">{{ formatCurrency(p.net_salary) }}</td>
            <td class="px-4 py-3 text-right">
              <button
                @click="download(p.id)"
                class="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >Download PDF</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No payslips found for {{ filterYear }}.</p>
    </div>
  </div>
</template>
