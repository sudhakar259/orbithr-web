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
  <div class="ep-page">
    <!-- Filter bar -->
    <div class="ep-filter-bar">
      <div class="ep-filter-field">
        <label class="ep-filter-label">Year</label>
        <select v-model="filterYear" class="ep-select" @change="load">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <div v-if="error" class="ep-error">{{ error }}</div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="ep-card">
      <div v-for="i in 6" :key="i" class="ep-skeleton"></div>
    </div>

    <!-- Table -->
    <div v-else-if="payslips.length" class="ep-card">
      <table class="ep-table">
        <thead>
          <tr>
            <th class="ep-th">Period</th>
            <th class="ep-th ep-th-right">Gross</th>
            <th class="ep-th ep-th-right">Deductions</th>
            <th class="ep-th ep-th-right">Net Pay</th>
            <th class="ep-th"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in payslips" :key="p.id" class="ep-row">
            <td class="ep-td">
              <div class="ep-period">{{ formatPeriod(p.pay_period_start) }}</div>
              <div class="ep-payslip-num">{{ p.payslip_number }}</div>
            </td>
            <td class="ep-td ep-td-right ep-mono">{{ formatCurrency(p.gross_salary) }}</td>
            <td class="ep-td ep-td-right ep-mono ep-neg">{{ formatCurrency(p.total_deductions) }}</td>
            <td class="ep-td ep-td-right ep-mono ep-pos ep-bold">{{ formatCurrency(p.net_salary) }}</td>
            <td class="ep-td ep-td-right">
              <button class="ep-download-btn" @click="download(p.id)">Download PDF</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="ep-empty">
      No payslips found for {{ filterYear }}.
    </div>
  </div>
</template>

<style scoped>
.ep-page { display: flex; flex-direction: column; gap: 16px; }
.ep-filter-bar { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 14px 16px; display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; }
.ep-filter-field { display: flex; flex-direction: column; gap: 4px; }
.ep-filter-label { font-size: 11px; font-weight: 500; color: #7A8299; text-transform: uppercase; letter-spacing: 0.06em; }
.ep-select {
  background: #0D0F17; border: 1px solid #232936; color: #EEF0F4;
  border-radius: 7px; padding: 7px 12px; font-size: 13px; outline: none; cursor: pointer;
}
.ep-select:focus { border-color: #6B5BFF; }
.ep-error { padding: 12px 16px; background: rgba(243,130,136,0.1); border: 1px solid rgba(243,130,136,0.25); border-radius: 8px; font-size: 13px; color: #F38288; }
.ep-card { background: #161A23; border: 1px solid #232936; border-radius: 10px; overflow: hidden; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.ep-skeleton { height: 44px; background: #232936; border-radius: 6px; animation: ep-pulse 1.2s ease-in-out infinite; }
@keyframes ep-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.ep-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ep-card { padding: 0; }
.ep-th { padding: 11px 16px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7A8299; background: #11141C; border-bottom: 1px solid #232936; }
.ep-th-right { text-align: right; }
.ep-row { border-bottom: 1px solid #1C2030; transition: background 0.12s; }
.ep-row:last-child { border-bottom: none; }
.ep-row:hover { background: rgba(255,255,255,0.02); }
.ep-td { padding: 12px 16px; vertical-align: middle; color: #B6BED0; }
.ep-td-right { text-align: right; }
.ep-period { font-size: 13px; font-weight: 500; color: #EEF0F4; }
.ep-payslip-num { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #7A8299; margin-top: 2px; }
.ep-mono { font-family: 'JetBrains Mono', monospace; }
.ep-pos { color: #4DD39A; }
.ep-neg { color: #F38288; }
.ep-bold { font-weight: 600; }
.ep-download-btn { background: none; border: none; color: #6B5BFF; font-size: 12px; font-weight: 500; cursor: pointer; }
.ep-download-btn:hover { text-decoration: underline; }
.ep-empty { background: #161A23; border: 1px solid #232936; border-radius: 10px; padding: 48px; text-align: center; font-size: 14px; color: #7A8299; }
</style>
