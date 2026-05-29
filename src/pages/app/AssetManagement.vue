<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import api from '@/services/api'
import EmptyState    from '@/components/ui/EmptyState.vue'
import Modal         from '@/components/ui/Modal.vue'
import { useToast }  from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const { confirm: dialog } = useConfirm()

interface Asset {
  id: number | string
  name: string
  brand?: string
  type?: string
  asset_type?: string
  serial?: string
  serial_number?: string
  employee_name?: string
  assigned_to?: string
  emp_initials?: string
  emp_gradient?: string
  assigned_on?: string
  assigned_date?: string
  status?: string
  value?: number
}

interface Employee { id: string | number; name: string }

const toast   = useToast()
const loading = ref(false)
const showAdd = ref(false)
const search  = ref('')
const typeF   = ref('')
const statusF = ref('')
const assets  = ref<Asset[]>([])
const employees = ref<Employee[]>([])

const assetTypes = ['Laptop','Desktop','Monitor','Mobile Phone','Tablet','Keyboard & Mouse','Headset','Other']

const assetIcon = (type?: string) => ({
  'Laptop': '💻', 'Desktop': '🖥', 'Monitor': '🖥', 'Mobile Phone': '📱',
  'Tablet': '📱', 'Keyboard & Mouse': '⌨', 'Headset': '🎧', 'Other': '📦',
}[type ?? ''] ?? '📦')

const typeOf   = (a: Asset) => a.type ?? a.asset_type ?? 'Other'
const serialOf = (a: Asset) => a.serial ?? a.serial_number ?? '—'
const empName  = (a: Asset) => a.employee_name ?? a.assigned_to ?? ''
const dateOf   = (a: Asset) => a.assigned_on ?? a.assigned_date ?? ''
const statusOf = (a: Asset) => a.status ?? 'available'

const gradients = [
  'linear-gradient(135deg,#4F7EFF,#9B6EFF)',
  'linear-gradient(135deg,#36D399,#4F7EFF)',
  'linear-gradient(135deg,#F9A825,#FF6B6B)',
  'linear-gradient(135deg,#FF6B6B,#9B6EFF)',
]
const getGradient = (i: number) => gradients[i % gradients.length]
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

async function load() {
  loading.value = true
  try {
    const [assetsRes, empsRes] = await Promise.allSettled([
      api.get('/assets'),
      api.get('/employees', { params: { per_page: 200 } }),
    ])
    if (assetsRes.status === 'fulfilled') {
      const d = assetsRes.value.data
      assets.value = Array.isArray(d) ? d : (d.data ?? [])
    }
    if (empsRes.status === 'fulfilled') {
      const d = empsRes.value.data
      employees.value = Array.isArray(d) ? d : (d.data ?? [])
    }
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filtered = computed(() =>
  assets.value.filter(a => {
    const q  = search.value.toLowerCase()
    const mq = !q || a.name.toLowerCase().includes(q) || empName(a).toLowerCase().includes(q) || serialOf(a).toLowerCase().includes(q)
    const mt = !typeF.value   || typeOf(a) === typeF.value
    const ms = !statusF.value || statusOf(a) === statusF.value
    return mq && mt && ms
  })
)

const summary = computed(() => [
  { label: 'Total assets',   value: assets.value.length,                                              sub: 'tracked' },
  { label: 'Assigned',       value: assets.value.filter(a => statusOf(a) === 'assigned').length,    sub: 'in use',          color: '#4DD39A' },
  { label: 'Available',      value: assets.value.filter(a => statusOf(a) === 'available').length,   sub: 'in stock' },
  { label: 'Maintenance',    value: assets.value.filter(a => statusOf(a) === 'maintenance').length, sub: 'in repair',       color: '#F5A623' },
  { label: 'Retired',        value: assets.value.filter(a => statusOf(a) === 'retired').length,     sub: 'off-boarded',     color: '#F38288' },
])

const typeChips = computed(() => [
  { label: 'All',         val: '',                  count: assets.value.length },
  { label: 'Laptops',     val: 'Laptop',            count: assets.value.filter(a => typeOf(a) === 'Laptop').length },
  { label: 'Phones',      val: 'Mobile Phone',      count: assets.value.filter(a => typeOf(a) === 'Mobile Phone').length },
  { label: 'Monitors',    val: 'Monitor',           count: assets.value.filter(a => typeOf(a) === 'Monitor').length },
  { label: 'Peripherals', val: 'Keyboard & Mouse',  count: assets.value.filter(a => typeOf(a) === 'Keyboard & Mouse').length },
  { label: 'Headsets',    val: 'Headset',           count: assets.value.filter(a => typeOf(a) === 'Headset').length },
])

async function returnAsset(id: number | string) {
  try { await api.patch(`/assets/${id}`, { status: 'available', employee_id: null }) } catch {}
  const a = assets.value.find(x => x.id === id)
  if (a) { a.status = 'available'; a.employee_name = ''; a.assigned_to = ''; a.assigned_on = ''; }
  toast.success('Asset returned to inventory.')
}

async function deleteAsset(id: number | string) {
  if (!await dialog('Delete', 'Delete this asset record?')) return
  try { await api.delete(`/assets/${id}`) } catch {}
  assets.value = assets.value.filter(a => a.id !== id)
  toast.success('Asset deleted.')
}

const na = reactive({ name: '', type: 'Laptop', brand: '', serial: '', value: 0, empId: '' as string | number })

async function addAsset() {
  if (!na.name || !na.serial) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    name: na.name, type: na.type, brand: na.brand,
    serial_number: na.serial, value: na.value,
  }
  if (na.empId) payload.employee_id = na.empId
  try {
    const { data } = await api.post('/assets', payload)
    assets.value.push(data.data ?? data)
  } catch {
    const emp = employees.value.find(e => String(e.id) === String(na.empId))
    assets.value.push({
      id: Date.now(), name: na.name, brand: na.brand, type: na.type,
      serial: na.serial, value: na.value,
      employee_name: emp?.name ?? '',
      emp_initials: emp ? getInitials(emp.name) : '',
      emp_gradient: emp ? getGradient(assets.value.length) : '',
      assigned_on: na.empId ? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
      status: na.empId ? 'assigned' : 'available',
    })
  }
  Object.assign(na, { name: '', type: 'Laptop', brand: '', serial: '', value: 0, empId: '' })
  showAdd.value = false
  toast.success('Asset added successfully')
}
</script>

<template>
  <div class="assets-page">
    <!-- Page header -->
    <div class="ph">
      <div class="ph-text">
        <div class="ph-eyebrow">{{ assets.length }} assets · inventory ledger</div>
        <h1 class="ph-title">Asset inventory</h1>
        <p class="ph-sub">Track laptops, phones, peripherals and access devices across their full lifecycle.</p>
      </div>
      <div class="ph-actions">
        <button class="btn btn-secondary">Import</button>
        <button class="btn btn-primary" @click="showAdd = true">+ Add asset</button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid">
      <div v-for="k in summary" :key="k.label" class="kpi">
        <div class="kpi-eyebrow">{{ k.label }}</div>
        <div class="kpi-val" :style="{ color: k.color || '#EEF0F4' }">{{ k.value }}</div>
        <div class="kpi-sub">{{ k.sub }}</div>
      </div>
    </div>

    <!-- Filter chips -->
    <div class="chip-bar">
      <button
        v-for="c in typeChips" :key="c.label"
        class="chip" :class="{ active: typeF === c.val }"
        @click="typeF = c.val"
      >
        {{ c.label }} <span class="chip-count">{{ c.count }}</span>
      </button>
      <div class="chip-spacer" />
      <input v-model="search" class="chip-search" placeholder="Search assets, employees…" />
      <select v-model="statusF" class="chip-select">
        <option value="">All status</option>
        <option value="assigned">Assigned</option>
        <option value="available">Available</option>
        <option value="maintenance">Maintenance</option>
        <option value="retired">Retired</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card-tbl">
      <div class="thead-row">
        <div>Tag</div>
        <div>Asset</div>
        <div>Spec</div>
        <div>Cond.</div>
        <div>Assigned to</div>
        <div>Assigned on</div>
        <div class="r">Value</div>
        <div>Status</div>
        <div></div>
      </div>

      <div v-if="loading" class="empty-row">Loading assets…</div>
      <template v-else>
        <div v-for="(asset, i) in filtered" :key="asset.id" class="trow">
          <div class="tag">{{ String(asset.id).padStart(4, '0') }}</div>
          <div>
            <div class="asset-line">
              <div class="ac-icon">{{ assetIcon(typeOf(asset)) }}</div>
              <div>
                <div class="asset-name">{{ asset.name }}</div>
                <div class="asset-brand">{{ asset.brand ?? '—' }}</div>
              </div>
            </div>
          </div>
          <div class="spec">{{ typeOf(asset) }}</div>
          <div>
            <span class="badge" :class="'cond-' + (typeOf(asset) === 'Other' ? 'neutral' : 'good')">
              {{ typeOf(asset) === 'Other' ? 'N/A' : 'Good' }}
            </span>
          </div>
          <div>
            <div v-if="empName(asset)" class="emp-line">
              <div class="mini-av" :style="{ background: asset.emp_gradient ?? getGradient(i) }">
                {{ asset.emp_initials ?? getInitials(empName(asset)) }}
              </div>
              <div>
                <div class="emp-name">{{ empName(asset) }}</div>
                <div class="emp-meta">{{ serialOf(asset) }}</div>
              </div>
            </div>
            <div v-else class="dim italic">—</div>
          </div>
          <div class="warr">{{ dateOf(asset) || '—' }}</div>
          <div class="r value">{{ asset.value ? '₹ ' + asset.value.toLocaleString('en-IN') : '—' }}</div>
          <div>
            <span class="badge" :class="'st-' + statusOf(asset)">
              {{ statusOf(asset) === 'assigned' ? 'Assigned'
                : statusOf(asset) === 'available' ? 'In stock'
                : statusOf(asset) === 'maintenance' ? 'Repair'
                : 'Retired' }}
            </span>
          </div>
          <div class="acts">
            <button v-if="statusOf(asset) === 'assigned'" class="ra" @click="returnAsset(asset.id)">Return</button>
            <button class="ra del" @click="deleteAsset(asset.id)">Delete</button>
          </div>
        </div>
        <div v-if="!filtered.length && !loading" class="empty-row">
          <EmptyState message="No assets found" />
        </div>
      </template>
    </div>

    <!-- Assign Modal -->
    <Modal v-model="showAdd" title="Assign asset" subtitle="Register and assign a company asset" max-width="540px">
      <div class="form-grid">
        <div class="field span2">
          <label>Asset name *</label>
          <input v-model="na.name" placeholder="e.g. MacBook Pro 14-inch" />
        </div>
        <div class="field">
          <label>Type *</label>
          <select v-model="na.type">
            <option v-for="t in assetTypes" :key="t">{{ t }}</option>
          </select>
        </div>
        <div class="field"><label>Brand / Model</label><input v-model="na.brand" placeholder="Apple, Dell, HP…" /></div>
        <div class="field"><label>Serial number *</label><input v-model="na.serial" placeholder="SN-XXXX-XXXX" /></div>
        <div class="field"><label>Asset value (₹)</label><input v-model.number="na.value" type="number" placeholder="85000" /></div>
        <div class="field span2">
          <label>Assign to employee</label>
          <select v-model="na.empId">
            <option value="">— Unassigned (store in inventory) —</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showAdd = false">Cancel</button>
        <button class="btn btn-primary" @click="addAsset">Assign asset</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.assets-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: #EEF0F4;
}

/* ── Page header ── */
.ph {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 4px;
}
.ph-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
  margin-bottom: 8px;
}
.ph-title {
  font-family: 'Instrument Serif', serif;
  font-size: 38px;
  letter-spacing: -0.02em;
  color: #EEF0F4;
  margin: 0 0 6px;
  line-height: 1.05;
}
.ph-sub {
  font-size: 13px;
  color: #7A8299;
  max-width: 560px;
  margin: 0;
}
.ph-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ── KPI grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.kpi {
  padding: 14px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
}
.kpi-eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.kpi-val {
  font-family: 'Instrument Serif', serif;
  font-size: 28px;
  letter-spacing: -0.02em;
  margin-top: 4px;
  line-height: 1;
}
.kpi-sub {
  font-size: 11px;
  color: #7A8299;
  margin-top: 4px;
}

/* ── Chip bar ── */
.chip-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  padding: 5px 12px;
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 16px;
  font-size: 11.5px;
  color: #EEF0F4;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.chip:hover { border-color: #2E3547; }
.chip.active {
  background: rgba(107, 91, 255, 0.16);
  border-color: #6B5BFF;
  color: #B6ABFF;
}
.chip-count {
  color: #7A8299;
  margin-left: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
}
.chip.active .chip-count { color: #B6ABFF; }
.chip-spacer { flex: 1; }
.chip-search {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  color: #EEF0F4;
  font-family: inherit;
  outline: none;
  min-width: 220px;
}
.chip-search:focus { border-color: #6B5BFF; }
.chip-select {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  color: #EEF0F4;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}

/* ── Buttons ── */
.btn {
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.btn-primary {
  background: #6B5BFF;
  color: #fff;
  border-color: #6B5BFF;
}
.btn-primary:hover { background: #5a4be8; }
.btn-secondary {
  background: #161A23;
  color: #EEF0F4;
  border-color: #232936;
}
.btn-secondary:hover { border-color: #2E3547; }

/* ── Table ── */
.card-tbl {
  background: #161A23;
  border: 1px solid #232936;
  border-radius: 10px;
  overflow: hidden;
}
.thead-row, .trow {
  display: grid;
  grid-template-columns: 90px 1.4fr 110px 80px 1.3fr 110px 110px 110px 130px;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
}
.thead-row {
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid #232936;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7A8299;
}
.thead-row .r, .trow .r { text-align: right; }
.trow {
  border-bottom: 1px solid #1B1F2A;
  font-size: 12.5px;
  transition: background 0.1s;
}
.trow:last-child { border-bottom: none; }
.trow:hover { background: rgba(255, 255, 255, 0.015); }

.tag {
  font-family: 'JetBrains Mono', monospace;
  color: #B6ABFF;
  font-weight: 500;
  font-size: 11.5px;
}
.asset-line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ac-icon {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 16px;
  flex-shrink: 0;
  background: #1C2030;
  border: 1px solid #232936;
}
.asset-name { color: #EEF0F4; font-weight: 500; }
.asset-brand { font-size: 11px; color: #7A8299; }
.spec { color: #B6BCC9; }

.emp-line { display: flex; align-items: center; gap: 8px; }
.mini-av {
  width: 26px; height: 26px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.emp-name { font-size: 12px; color: #EEF0F4; }
.emp-meta { font-size: 10.5px; color: #7A8299; font-family: 'JetBrains Mono', monospace; }

.warr { color: #B6BCC9; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.value { color: #EEF0F4; font-family: 'JetBrains Mono', monospace; }
.dim { color: #7A8299; }
.italic { font-style: italic; }

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 12px;
  letter-spacing: 0.02em;
}
.cond-good { background: rgba(77, 211, 154, 0.14); color: #4DD39A; }
.cond-neutral { background: rgba(122, 130, 153, 0.14); color: #B6BCC9; }
.st-assigned { background: rgba(107, 91, 255, 0.16); color: #B6ABFF; }
.st-available { background: rgba(77, 211, 154, 0.14); color: #4DD39A; }
.st-maintenance { background: rgba(245, 166, 35, 0.16); color: #F5A623; }
.st-retired { background: rgba(243, 130, 136, 0.14); color: #F38288; }

.acts {
  display: flex;
  gap: 5px;
  justify-content: flex-end;
}
.ra {
  padding: 5px 10px;
  border: 1px solid #232936;
  background: #1C2030;
  border-radius: 6px;
  font-size: 11px;
  color: #B6BCC9;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.12s;
}
.ra:hover { border-color: #6B5BFF; color: #B6ABFF; }
.ra.del:hover { border-color: #F38288; color: #F38288; }

.empty-row {
  padding: 32px;
  text-align: center;
  color: #7A8299;
  font-size: 13px;
}

/* ── Modal form ── */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field.span2 { grid-column: span 2; }
.field label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #7A8299;
}
.field input, .field select {
  background: #1C2030;
  border: 1px solid #232936;
  border-radius: 8px;
  padding: 9px 12px;
  color: #EEF0F4;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}
.field input:focus, .field select:focus { border-color: #6B5BFF; }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
  .thead-row, .trow {
    grid-template-columns: 80px 1.4fr 1fr 1.2fr 110px 100px;
  }
  .thead-row > div:nth-child(4),
  .thead-row > div:nth-child(6),
  .thead-row > div:nth-child(7),
  .trow > div:nth-child(4),
  .trow > div:nth-child(6),
  .trow > div:nth-child(7) { display: none; }
}
@media (max-width: 720px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .ph { flex-direction: column; align-items: flex-start; }
}
</style>
