<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import StatusPill from '@/components/ui/StatusPill.vue'
import { useToast } from '@/composables/useToast'

interface PayslipRow {
  id: string | number
  employee_id?: string
  name?: string
  employee_name?: string
  department?: string
  dept?: string
  gross_salary?: number
  gross?: number
  net_salary?: number
  net?: number
  deductions?: number
  status?: string
  pay_status?: string
  month?: string
  year?: number | string
  period?: string
  avatar?: string
  initials?: string
  gradient?: string
}

const toast      = useToast()
const loading    = ref(false)
const search     = ref('')
const monthF     = ref('')
const deptF      = ref('')
const previewSlip = ref<PayslipRow | null>(null)
const rows       = ref<PayslipRow[]>([])

const months = [
  'January 2026','February 2026','March 2026','April 2026',
  'May 2026','June 2026','July 2026','August 2026',
  'September 2026','October 2026','November 2026','December 2026',
]

async function load() {
  loading.value = true
  try {
    const params: any = {}
    if (monthF.value) params.month = monthF.value
    const { data } = await api.get('/payroll/payslips', { params })
    rows.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

const depts = computed(() => [...new Set(rows.value.map(r => r.department ?? r.dept ?? '').filter(Boolean))].sort())

const filteredRows = computed(() =>
  rows.value.filter(r => {
    const q   = search.value.toLowerCase()
    const name = r.name ?? r.employee_name ?? ''
    const mq  = !q || name.toLowerCase().includes(q) || String(r.employee_id ?? '').toLowerCase().includes(q)
    const md  = !deptF.value || (r.department ?? r.dept) === deptF.value
    return mq && md
  })
)

const gross = (r: PayslipRow) => r.gross_salary ?? r.gross ?? 0
const net   = (r: PayslipRow) => r.net_salary ?? r.net ?? Math.round(gross(r) * 0.83)
const deductions = (r: PayslipRow) => r.deductions ?? Math.round(gross(r) * 0.17)
const statusOf = (r: PayslipRow) => r.status ?? r.pay_status ?? 'paid'
const nameOf   = (r: PayslipRow) => r.name ?? r.employee_name ?? '—'
const deptOf   = (r: PayslipRow) => r.department ?? r.dept ?? '—'
const fmt      = (n: number) => Math.round(n).toLocaleString('en-IN')

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

const gradients = [
  'linear-gradient(135deg,#4F7EFF,#9B6EFF)',
  'linear-gradient(135deg,#36D399,#4F7EFF)',
  'linear-gradient(135deg,#F9A825,#FF6B6B)',
  'linear-gradient(135deg,#FF6B6B,#9B6EFF)',
  'linear-gradient(135deg,#9B6EFF,#36D399)',
]
const rowGradient = (i: number) => gradients[i % gradients.length]

const viewSlip  = (row: PayslipRow) => { previewSlip.value = row }
const downloadSlip = (row: PayslipRow) => {
  toast.info(`⬇ Downloading payslip for ${nameOf(row)}…`)
}
const downloadAll = () => {
  toast.info(`⬇ Downloading all ${filteredRows.value.length} payslips…`)
}
</script>

<template>
  <div class="slips-page">
    <!-- Filters -->
    <div class="filters">
      <div class="s-box">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" style="color:var(--muted);flex-shrink:0">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
        </svg>
        <input v-model="search" placeholder="Search employee…" />
      </div>
      <select v-model="monthF" class="sel" @change="load">
        <option value="">All Months</option>
        <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
      </select>
      <select v-model="deptF" class="sel">
        <option value="">All Departments</option>
        <option v-for="d in depts" :key="d" :value="d">{{ d }}</option>
      </select>
    </div>

    <!-- Table card -->
    <div class="card">
      <div class="card-head">
        <div>
          <div class="ct">Payslips{{ monthF ? ` — ${monthF}` : '' }}</div>
          <div class="cs">{{ filteredRows.length }} payslips</div>
        </div>
        <button class="btn-ghost" @click="downloadAll">⬇ Download All</button>
      </div>
      <div v-if="loading" class="loading-row">Loading payslips…</div>
      <div v-else class="tbl-wrap">
        <table>
          <thead>
            <tr><th>Employee</th><th>Department</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in filteredRows" :key="row.id">
              <td>
                <div class="ec">
                  <div class="av" :style="{ background: row.gradient ?? rowGradient(i) }">
                    {{ row.initials ?? getInitials(nameOf(row)) }}
                  </div>
                  <div>
                    <div class="en">{{ nameOf(row) }}</div>
                    <div class="eid">#{{ row.employee_id ?? row.id }}</div>
                  </div>
                </div>
              </td>
              <td class="dim">{{ deptOf(row) }}</td>
              <td class="mono">₹{{ fmt(gross(row)) }}</td>
              <td class="mono red">-₹{{ fmt(deductions(row)) }}</td>
              <td class="mono bold">₹{{ fmt(net(row)) }}</td>
              <td><StatusPill :status="statusOf(row)" /></td>
              <td>
                <div class="row-acts">
                  <button class="ra-btn" @click="viewSlip(row)">👁 View</button>
                  <button class="ra-btn" @click="downloadSlip(row)">⬇</button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredRows.length">
              <td colspan="7" class="empty-row">No payslips found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Payslip Preview Modal -->
    <transition name="modal">
      <div v-if="previewSlip" class="modal-overlay" @click.self="previewSlip = null">
        <div class="slip-modal">
          <button class="mc" @click="previewSlip = null">✕</button>
          <div class="slip-header">
            <div class="slip-logo">
              <div class="slogo-mark">O</div>
              <div class="slogo-name">Orbit<span>HR</span></div>
            </div>
            <div class="slip-period">
              <div class="sp-title">PAYSLIP</div>
              <div class="sp-period">{{ monthF || previewSlip.period ?? previewSlip.month ?? '—' }}</div>
            </div>
          </div>
          <div class="slip-emp">
            <div class="se-av" :style="{ background: previewSlip.gradient ?? rowGradient(0) }">
              {{ previewSlip.initials ?? getInitials(nameOf(previewSlip)) }}
            </div>
            <div>
              <div class="se-name">{{ nameOf(previewSlip) }}</div>
              <div class="se-meta">#{{ previewSlip.employee_id ?? previewSlip.id }} · {{ deptOf(previewSlip) }}</div>
            </div>
          </div>
          <div class="slip-grid">
            <div class="slip-col">
              <div class="slip-col-title">Earnings</div>
              <div class="slip-row"><span>Basic Salary</span><span>₹{{ fmt(gross(previewSlip) * 0.6) }}</span></div>
              <div class="slip-row"><span>HRA</span><span>₹{{ fmt(gross(previewSlip) * 0.2) }}</span></div>
              <div class="slip-row"><span>Allowances</span><span>₹{{ fmt(gross(previewSlip) * 0.2) }}</span></div>
              <div class="slip-row bold"><span>Gross Total</span><span>₹{{ fmt(gross(previewSlip)) }}</span></div>
            </div>
            <div class="slip-col">
              <div class="slip-col-title">Deductions</div>
              <div class="slip-row"><span>Provident Fund</span><span class="red">-₹{{ fmt(gross(previewSlip) * 0.12) }}</span></div>
              <div class="slip-row"><span>TDS</span><span class="red">-₹{{ fmt(gross(previewSlip) * 0.05) }}</span></div>
              <div class="slip-row"><span>ESI</span><span class="red">-₹{{ fmt(gross(previewSlip) * 0.0175) }}</span></div>
              <div class="slip-row bold"><span>Total Deductions</span><span class="red">-₹{{ fmt(deductions(previewSlip)) }}</span></div>
            </div>
          </div>
          <div class="slip-net">
            <span>Net Take-Home Pay</span>
            <span class="net-val">₹{{ fmt(net(previewSlip)) }}</span>
          </div>
          <div class="slip-footer">
            <div class="sf-note">This is a computer-generated payslip. No signature required.</div>
            <div class="sf-note">Generated by OrbitHR</div>
          </div>
          <div class="slip-actions">
            <button class="btn-ghost" @click="previewSlip = null">Close</button>
            <button class="btn-primary" @click="downloadSlip(previewSlip)">⬇ Download PDF</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.slips-page { display: flex; flex-direction: column; gap: 18px; }
.filters { display: flex; gap: 10px; flex-wrap: wrap; }
.s-box { display: flex; align-items: center; gap: 7px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 8px 12px; flex: 1; min-width: 200px; }
.s-box input { background: none; border: none; outline: none; color: var(--text); font-size: 13px; font-family: inherit; width: 100%; }
.s-box input::placeholder { color: var(--muted); }
.sel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); color: var(--dim); font-size: 12px; font-family: inherit; padding: 8px 12px; cursor: pointer; outline: none; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.card-head { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.ct { font-weight: 600; font-size: 15px; color: var(--text); }
.cs { font-size: 11px; color: var(--muted); margin-top: 2px; }
.loading-row { padding: 32px; text-align: center; color: var(--muted); font-size: 13px; }
.btn-ghost { background: var(--surface2); color: var(--dim); border: 1px solid var(--border); border-radius: var(--rs); padding: 7px 14px; font-size: 12px; cursor: pointer; font-family: inherit; transition: all .14s; }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }
.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--rs); padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s; font-family: inherit; }
.btn-primary:hover { background: #3d6ee8; }
.tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase; color: var(--muted); background: rgba(255,255,255,.02); border-bottom: 1px solid var(--border); }
tbody tr { border-bottom: 1px solid var(--border); transition: background .1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(255,255,255,.02); }
td { padding: 10px 14px; vertical-align: middle; color: var(--text); }
td.dim { color: var(--dim); } .mono { font-family: monospace; font-size: 12px; } .red { color: var(--red); } .bold { font-weight: 700; }
.ec { display: flex; align-items: center; gap: 8px; }
.av { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 600; color: #fff; flex-shrink: 0; }
.en { font-weight: 500; font-size: 13px; } .eid { font-size: 10px; color: var(--muted); }
.empty-row { text-align: center; padding: 28px; color: var(--muted); }
.row-acts { display: flex; gap: 5px; opacity: 0; transition: opacity .15s; }
tr:hover .row-acts { opacity: 1; }
.ra-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid var(--border); background: var(--surface2); border-radius: 5px; font-size: 11px; cursor: pointer; color: var(--dim); transition: all .1s; font-family: inherit; }
.ra-btn:hover { border-color: var(--accent); color: var(--accent); }

/* Payslip modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.slip-modal { background: #fff; color: #1a1a2e; border-radius: var(--r); width: 100%; max-width: 540px; padding: 32px; position: relative; box-shadow: 0 24px 60px rgba(0,0,0,.7); max-height: 90vh; overflow-y: auto; }
.mc { position: absolute; top: 14px; right: 14px; width: 28px; height: 28px; background: #f4f4f8; border: 1px solid #dde; border-radius: 6px; cursor: pointer; color: #666; font-size: 12px; display: grid; place-items: center; }
.mc:hover { background: #eee; }
.slip-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #eef; }
.slip-logo { display: flex; align-items: center; gap: 10px; }
.slogo-mark { width: 36px; height: 36px; background: #4F7EFF; border-radius: 8px; display: grid; place-items: center; font-weight: 800; font-size: 16px; color: #fff; }
.slogo-name { font-weight: 700; font-size: 18px; color: #1a1a2e; }
.slogo-name span { color: #4F7EFF; }
.sp-title { font-weight: 700; font-size: 14px; letter-spacing: 2px; color: #4F7EFF; }
.sp-period { font-size: 12px; color: #666; text-align: right; }
.slip-emp { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; background: #f7f8ff; border-radius: 10px; padding: 14px; }
.se-av { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
.se-name { font-weight: 700; font-size: 15px; color: #1a1a2e; }
.se-meta { font-size: 12px; color: #666; margin-top: 2px; }
.slip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.slip-col { background: #f9f9fc; border-radius: 8px; padding: 14px; }
.slip-col-title { font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: #888; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
.slip-row { display: flex; justify-content: space-between; font-size: 12px; color: #444; padding: 5px 0; border-bottom: 1px solid #f0f0f8; }
.slip-row:last-child { border-bottom: none; }
.slip-row.bold { font-weight: 700; color: #1a1a2e; margin-top: 4px; padding-top: 8px; border-top: 1px solid #dde; border-bottom: none; }
.slip-row .red { color: #e53e3e; }
.slip-net { display: flex; justify-content: space-between; align-items: center; background: #4F7EFF; color: #fff; border-radius: 8px; padding: 16px 18px; margin-bottom: 16px; }
.slip-net span:first-child { font-size: 13px; font-weight: 600; }
.net-val { font-size: 22px; font-weight: 700; }
.slip-footer { text-align: center; margin-bottom: 18px; }
.sf-note { font-size: 10px; color: #aaa; margin-top: 3px; }
.slip-actions { display: flex; gap: 8px; justify-content: flex-end; }
.modal-enter-active, .modal-leave-active { transition: all .22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.96); }
</style>
