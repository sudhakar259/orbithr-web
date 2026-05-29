<script setup lang="ts">
defineOptions({ name: 'GratuityCalculator' })

import { ref, onMounted } from 'vue'
import api from '@/services/api'

type View = 'individual' | 'bulk'
const activeView = ref<View>('individual')

// ── Individual ──
interface Employee { id: number; first_name: string; last_name: string }
interface IndividualResult {
  employee_name?: string
  department?: string | null
  date_of_joining?: string | null
  years_of_service?: number
  basic_salary?: number
  da?: number
  is_eligible?: boolean
  gratuity_amount?: number
}
const employees = ref<Employee[]>([])
const selectedEmployeeId = ref('')
const individualResult = ref<IndividualResult | null>(null)
const individualLoading = ref(false)

async function fetchEmployees() {
  try {
    const { data } = await api.get('/employees', { params: { per_page: 200 } })
    employees.value = data.data ?? data
  } catch { /* silently ignore */ }
}

async function calculateIndividual() {
  if (!selectedEmployeeId.value) return
  individualLoading.value = true
  individualResult.value = null
  try {
    const { data } = await api.get('/gratuity/calculate', { params: { employee_id: selectedEmployeeId.value } })
    individualResult.value = data.data ?? data
  } catch { /* silently ignore */ }
  finally { individualLoading.value = false }
}

// ── Bulk ──
interface GratuityRecord {
  employee_id: number
  employee_name: string
  department: string
  years_of_service: number
  basic_salary: number
  gratuity_amount: number
  is_eligible: boolean
}

const bulkData = ref<GratuityRecord[]>([])
const bulkLoading = ref(false)
const sortField = ref<'employee_name' | 'years_of_service' | 'gratuity_amount'>('gratuity_amount')
const sortDir = ref<'asc' | 'desc'>('desc')

async function fetchBulk() {
  bulkLoading.value = true
  try {
    const { data } = await api.get('/gratuity/bulk')
    bulkData.value = data.data ?? data
  } catch { /* silently ignore */ }
  finally { bulkLoading.value = false }
}

function sortedBulk() {
  return [...bulkData.value].sort((a, b) => {
    const av = a[sortField.value]
    const bv = b[sortField.value]
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir.value === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir.value === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })
}

function toggleSort(field: typeof sortField.value) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
}

function sortIcon(field: string) {
  if (sortField.value !== field) return ''
  return sortDir.value === 'asc' ? ' ↑' : ' ↓'
}

onMounted(() => {
  fetchEmployees()
  fetchBulk()
})
</script>

<template>
  <div class="grat-page">
    <header class="grat-header">
      <div class="grat-eyebrow">Payroll · Statutory</div>
      <h1 class="grat-title">Gratuity</h1>
      <p class="grat-sub">Calculate eligibility and amounts using last drawn salary and tenure.</p>
    </header>

    <!-- View Toggle -->
    <div class="grat-tabs">
      <button
        class="grat-tab"
        :class="{ active: activeView === 'individual' }"
        @click="activeView = 'individual'"
      >Calculate Individual</button>
      <button
        class="grat-tab"
        :class="{ active: activeView === 'bulk' }"
        @click="activeView = 'bulk'"
      >Bulk View</button>
    </div>

    <!-- Individual Calculation -->
    <div v-if="activeView === 'individual'" class="grat-stack">
      <div class="grat-card grat-card-pad">
        <div class="grat-form-row">
          <div class="grat-field">
            <label class="grat-label">Select Employee</label>
            <select v-model="selectedEmployeeId" class="grat-input">
              <option value="">Choose an employee</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.first_name }} {{ e.last_name }}</option>
            </select>
          </div>
          <button
            class="grat-btn grat-btn-primary"
            :disabled="!selectedEmployeeId || individualLoading"
            @click="calculateIndividual"
          >{{ individualLoading ? 'Calculating…' : 'Calculate' }}</button>
        </div>
      </div>

      <div v-if="individualLoading" class="grat-loader">
        <div class="grat-spinner" />
      </div>

      <div v-else-if="individualResult" class="grat-grid-2">
        <div class="grat-card grat-card-pad">
          <div class="grat-section-title">Employee Details</div>
          <div class="grat-rows">
            <div class="grat-row">
              <span class="grat-row-label">Name</span>
              <span class="grat-row-value">{{ individualResult.employee_name }}</span>
            </div>
            <div class="grat-row">
              <span class="grat-row-label">Department</span>
              <span class="grat-row-value">{{ individualResult.department ?? '—' }}</span>
            </div>
            <div class="grat-row">
              <span class="grat-row-label">Date of Joining</span>
              <span class="grat-row-value">{{ individualResult.date_of_joining ?? '—' }}</span>
            </div>
            <div class="grat-row">
              <span class="grat-row-label">Years of Service</span>
              <span class="grat-row-value strong">{{ individualResult.years_of_service }} years</span>
            </div>
          </div>
        </div>

        <div class="grat-card grat-card-pad">
          <div class="grat-section-title">Gratuity Calculation</div>
          <div class="grat-rows">
            <div class="grat-row">
              <span class="grat-row-label">Basic Salary</span>
              <span class="grat-row-value mono">${{ individualResult.basic_salary?.toLocaleString() }}</span>
            </div>
            <div class="grat-row">
              <span class="grat-row-label">DA (if applicable)</span>
              <span class="grat-row-value mono">${{ individualResult.da?.toLocaleString() ?? '0' }}</span>
            </div>
            <div class="grat-row">
              <span class="grat-row-label">Eligible</span>
              <span :class="['grat-row-value', individualResult.is_eligible ? 'pos' : 'neg']">
                {{ individualResult.is_eligible ? 'Yes (5+ years)' : 'No (less than 5 years)' }}
              </span>
            </div>
            <div class="grat-row grat-row-total">
              <span class="grat-row-label strong">Gratuity Amount</span>
              <span class="grat-amount">${{ individualResult.gratuity_amount?.toLocaleString() }}</span>
            </div>
          </div>
          <p class="grat-formula">Formula: (15 × Last drawn salary × Years of service) ÷ 26</p>
        </div>
      </div>
    </div>

    <!-- Bulk View -->
    <div v-if="activeView === 'bulk'">
      <div v-if="bulkLoading" class="grat-loader">
        <div class="grat-spinner" />
      </div>
      <div v-else class="grat-card grat-card-flush">
        <table class="grat-table">
          <thead>
            <tr>
              <th class="sortable" @click="toggleSort('employee_name')">Employee{{ sortIcon('employee_name') }}</th>
              <th>Department</th>
              <th class="sortable" @click="toggleSort('years_of_service')">Years of Service{{ sortIcon('years_of_service') }}</th>
              <th class="num">Basic Salary</th>
              <th class="num sortable" @click="toggleSort('gratuity_amount')">Gratuity{{ sortIcon('gratuity_amount') }}</th>
              <th>Eligible</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedBulk()" :key="row.employee_id">
              <td class="strong">{{ row.employee_name }}</td>
              <td class="muted">{{ row.department ?? '—' }}</td>
              <td class="mono">{{ row.years_of_service }}</td>
              <td class="num mono">${{ row.basic_salary?.toLocaleString() }}</td>
              <td class="num mono pos strong">${{ row.gratuity_amount?.toLocaleString() }}</td>
              <td>
                <span :class="['grat-pill', row.is_eligible ? 'pill-pos' : 'pill-neg']">
                  {{ row.is_eligible ? 'Yes' : 'No' }}
                </span>
              </td>
            </tr>
            <tr v-if="bulkData.length === 0">
              <td colspan="6" class="grat-empty">No gratuity data available</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grat-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #EEF0F4;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.grat-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.grat-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.grat-title {
  margin: 4px 0 0;
  font-family: 'Instrument Serif', serif;
  font-weight: 400;
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #EEF0F4;
}
.grat-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #7A8299;
  max-width: 560px;
}

.grat-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid #232936;
}
.grat-tab {
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 400;
  color: #7A8299;
  background: transparent;
  border: none;
  border-bottom: 1.5px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 120ms ease;
}
.grat-tab:hover {
  color: #EEF0F4;
}
.grat-tab.active {
  color: #EEF0F4;
  font-weight: 500;
  border-bottom-color: #6B5BFF;
}

.grat-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grat-card {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
}
.grat-card-pad {
  padding: 16px;
}
.grat-card-flush {
  overflow: hidden;
}

.grat-form-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}
.grat-field {
  flex: 1;
}
.grat-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #7A8299;
  margin-bottom: 6px;
}
.grat-input {
  width: 100%;
  background: #0D0F17;
  border: 1px solid #232936;
  color: #EEF0F4;
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 6px;
  outline: none;
  transition: border-color 120ms ease;
}
.grat-input:focus {
  border-color: #6B5BFF;
}

.grat-btn {
  padding: 8px 14px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 120ms ease, background 120ms ease;
}
.grat-btn-primary {
  background: #6B5BFF;
  color: #fff;
  border-color: #6B5BFF;
}
.grat-btn-primary:hover:not(:disabled) {
  background: #7A6CFF;
}
.grat-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.grat-loader {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}
.grat-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid #232936;
  border-top-color: #6B5BFF;
  animation: grat-spin 800ms linear infinite;
}
@keyframes grat-spin {
  to { transform: rotate(360deg); }
}

.grat-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 768px) {
  .grat-grid-2 { grid-template-columns: 1fr; }
}

.grat-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #EEF0F4;
  letter-spacing: -0.005em;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #232936;
}

.grat-rows {
  display: flex;
  flex-direction: column;
}
.grat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.grat-row-label {
  color: #7A8299;
}
.grat-row-label.strong {
  color: #EEF0F4;
  font-weight: 600;
}
.grat-row-value {
  color: #EEF0F4;
}
.grat-row-value.strong {
  font-weight: 600;
}
.grat-row-value.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
}
.grat-row-value.pos { color: #4DD39A; }
.grat-row-value.neg { color: #F38288; }

.grat-row-total {
  border-top: 1px solid #232936;
  margin-top: 8px;
  padding-top: 12px;
}
.grat-amount {
  font-family: 'Instrument Serif', serif;
  font-size: 28px;
  letter-spacing: -0.02em;
  color: #4DD39A;
}
.grat-formula {
  margin: 12px 0 0;
  font-size: 11px;
  color: #7A8299;
  font-style: italic;
}

.grat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.grat-table thead th {
  padding: 10px 14px;
  background: #1B202C;
  color: #7A8299;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
  border-bottom: 1px solid #232936;
}
.grat-table thead th.num {
  text-align: right;
}
.grat-table thead th.sortable {
  cursor: pointer;
  user-select: none;
}
.grat-table thead th.sortable:hover {
  color: #EEF0F4;
}
.grat-table tbody td {
  padding: 11px 14px;
  border-bottom: 1px solid #232936;
  color: #EEF0F4;
  font-variant-numeric: tabular-nums;
}
.grat-table tbody tr:last-child td {
  border-bottom: none;
}
.grat-table tbody tr:hover {
  background: rgba(107, 91, 255, 0.04);
}
.grat-table tbody td.num { text-align: right; }
.grat-table tbody td.muted { color: #7A8299; }
.grat-table tbody td.mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.grat-table tbody td.strong { font-weight: 500; color: #EEF0F4; }
.grat-table tbody td.pos { color: #4DD39A; }

.grat-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
}
.grat-pill.pill-pos {
  background: rgba(77, 211, 154, 0.12);
  color: #4DD39A;
}
.grat-pill.pill-neg {
  background: rgba(243, 130, 136, 0.12);
  color: #F38288;
}

.grat-empty {
  padding: 32px 14px;
  text-align: center;
  color: #7A8299;
  font-size: 12.5px;
}
</style>
