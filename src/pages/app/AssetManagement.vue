<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader    from '@/components/ui/PageHeader.vue'
import SimpleStatCard from '@/components/ui/SimpleStatCard.vue'
import SearchInput   from '@/components/ui/SearchInput.vue'
import EmptyState    from '@/components/ui/EmptyState.vue'
import Modal         from '@/components/ui/Modal.vue'
import { useToast }  from '@/composables/useToast'

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
  { icon: '📦', label: 'Total Assets',   value: assets.value.length,                                                 color: 'blue'   as const },
  { icon: '✓',  label: 'Assigned',       value: assets.value.filter(a => statusOf(a) === 'assigned').length,     color: 'green'  as const },
  { icon: '📋', label: 'Available',      value: assets.value.filter(a => statusOf(a) === 'available').length,    color: 'yellow' as const },
  { icon: '🔧', label: 'In Maintenance', value: assets.value.filter(a => statusOf(a) === 'maintenance').length,  color: 'red'    as const },
])

async function returnAsset(id: number | string) {
  try { await api.patch(`/assets/${id}`, { status: 'available', employee_id: null }) } catch {}
  const a = assets.value.find(x => x.id === id)
  if (a) { a.status = 'available'; a.employee_name = ''; a.assigned_to = ''; a.assigned_on = ''; }
  toast.success('Asset returned to inventory.')
}

async function deleteAsset(id: number | string) {
  if (!confirm('Delete this asset record?')) return
  try { await api.delete(`/assets/${id}`) } catch {}
  assets.value = assets.value.filter(a => a.id !== id)
  toast.success('Asset deleted.')
}

const na = reactive({ name: '', type: 'Laptop', brand: '', serial: '', value: 0, empId: '' as string | number })

async function addAsset() {
  if (!na.name || !na.serial) return
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
  toast.success('✓ Asset added successfully!')
}
</script>

<template>
  <div class="asset-page">
    <PageHeader title="Asset Management" subtitle="Track and manage company assets assigned to employees">
      <template #actions>
        <button class="btn-primary" @click="showAdd = true">+ Assign Asset</button>
      </template>
    </PageHeader>

    <!-- Summary -->
    <div class="sum-grid">
      <SimpleStatCard
        v-for="(s, i) in summary" :key="s.label"
        :icon="s.icon" :label="s.label" :value="s.value" :color="s.color" :delay="i * 0.07"
      />
    </div>

    <!-- Filters -->
    <div class="filters">
      <SearchInput v-model="search" placeholder="Search assets, employees…" />
      <select v-model="typeF" class="sel">
        <option value="">All Types</option>
        <option v-for="t in assetTypes" :key="t">{{ t }}</option>
      </select>
      <select v-model="statusF" class="sel">
        <option value="">All Status</option>
        <option value="assigned">Assigned</option>
        <option value="available">Available</option>
        <option value="maintenance">Maintenance</option>
        <option value="retired">Retired</option>
      </select>
    </div>

    <!-- Table -->
    <div class="card">
      <div v-if="loading" class="loading-row">Loading assets…</div>
      <div v-else class="tbl-wrap">
        <table>
          <thead><tr>
            <th>Asset</th><th>Type</th><th>Serial No.</th>
            <th>Assigned To</th><th>Assigned On</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            <tr v-for="(asset, i) in filtered" :key="asset.id">
              <td>
                <div class="asset-cell">
                  <div class="ac-icon">{{ assetIcon(typeOf(asset)) }}</div>
                  <div>
                    <div class="ac-name">{{ asset.name }}</div>
                    <div class="ac-brand">{{ asset.brand ?? '—' }}</div>
                  </div>
                </div>
              </td>
              <td class="dim">{{ typeOf(asset) }}</td>
              <td class="mono dim">{{ serialOf(asset) }}</td>
              <td>
                <div v-if="empName(asset)" class="emp-cell">
                  <div class="mini-av" :style="{ background: asset.emp_gradient ?? getGradient(i) }">
                    {{ asset.emp_initials ?? getInitials(empName(asset)) }}
                  </div>
                  <span>{{ empName(asset) }}</span>
                </div>
                <span v-else class="dim">—</span>
              </td>
              <td class="dim sm">{{ dateOf(asset) || '—' }}</td>
              <td>
                <span class="asset-status" :class="statusOf(asset)">{{ statusOf(asset) }}</span>
              </td>
              <td>
                <div class="row-acts">
                  <button v-if="statusOf(asset) === 'assigned'" class="ra" @click="returnAsset(asset.id)">↩ Return</button>
                  <button class="ra del" @click="deleteAsset(asset.id)">🗑</button>
                </div>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="7"><EmptyState message="No assets found" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Assign Modal -->
    <Modal v-model="showAdd" title="Assign Asset" subtitle="Register and assign a company asset" max-width="520px">
      <div class="form-grid">
        <div class="field span2"><label>Asset Name *</label><input v-model="na.name" placeholder="e.g. MacBook Pro 14-inch" /></div>
        <div class="field">
          <label>Type *</label>
          <select v-model="na.type">
            <option v-for="t in assetTypes" :key="t">{{ t }}</option>
          </select>
        </div>
        <div class="field"><label>Brand / Model</label><input v-model="na.brand" placeholder="Apple, Dell, HP…" /></div>
        <div class="field"><label>Serial Number *</label><input v-model="na.serial" placeholder="SN-XXXX-XXXX" /></div>
        <div class="field"><label>Asset Value (₹)</label><input v-model.number="na.value" type="number" placeholder="85000" /></div>
        <div class="field span2">
          <label>Assign To Employee</label>
          <select v-model="na.empId">
            <option value="">— Unassigned (store in inventory) —</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showAdd = false">Cancel</button>
        <button class="btn-primary" @click="addAsset">Assign Asset</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.asset-page { display: flex; flex-direction: column; gap: 18px; }
.sum-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
.filters { display: flex; gap: 10px; flex-wrap: wrap; }
.sel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); color: var(--dim); font-size: 12px; font-family: inherit; padding: 8px 12px; cursor: pointer; outline: none; }
.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--rs); padding: 9px 18px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
.btn-primary:hover { background: #3d6ee8; transform: translateY(-1px); }
.btn-ghost { background: var(--surface2); color: var(--dim); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.loading-row { padding: 32px; text-align: center; color: var(--muted); font-size: 13px; }
.tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 700; letter-spacing: .7px; text-transform: uppercase; color: var(--muted); background: rgba(255,255,255,.02); border-bottom: 1px solid var(--border); }
tbody tr { border-bottom: 1px solid var(--border); transition: background .1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(255,255,255,.025); }
td { padding: 11px 14px; vertical-align: middle; color: var(--text); }
td.dim { color: var(--dim); } td.sm { font-size: 12px; } td.mono { font-family: monospace; font-size: 12px; }
.asset-cell { display: flex; align-items: center; gap: 10px; }
.ac-icon { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; font-size: 16px; flex-shrink: 0; background: var(--surface2); }
.ac-name { font-weight: 500; font-size: 13px; } .ac-brand { font-size: 11px; color: var(--muted); }
.emp-cell { display: flex; align-items: center; gap: 7px; }
.mini-av { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 9px; font-weight: 700; color: #fff; flex-shrink: 0; }
.asset-status { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 10px; text-transform: capitalize; display: inline-flex; align-items: center; gap: 4px; }
.asset-status::before { content: ''; width: 5px; height: 5px; border-radius: 50%; }
.asset-status.assigned    { background: rgba(54,211,153,.1);  color: #36D399; } .asset-status.assigned::before    { background: #36D399; }
.asset-status.available   { background: rgba(79,126,255,.1);  color: #4F7EFF; } .asset-status.available::before   { background: #4F7EFF; }
.asset-status.maintenance { background: rgba(249,168,37,.1);  color: #F9A825; } .asset-status.maintenance::before { background: #F9A825; }
.asset-status.retired     { background: rgba(255,107,107,.1); color: #FF6B6B; } .asset-status.retired::before     { background: #FF6B6B; }
.row-acts { display: flex; gap: 5px; opacity: 0; transition: opacity .15s; }
tr:hover .row-acts { opacity: 1; }
.ra { padding: 4px 10px; border: 1px solid var(--border); background: var(--surface2); border-radius: 5px; font-size: 11px; cursor: pointer; color: var(--dim); font-family: inherit; transition: all .1s; }
.ra:hover { border-color: var(--accent); color: var(--accent); }
.ra.del:hover { border-color: var(--red); color: var(--red); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field.span2 { grid-column: span 2; }
.field label { font-size: 11px; color: var(--dim); font-weight: 500; }
.field input, .field select { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; transition: border-color .15s; }
.field input:focus, .field select:focus { border-color: var(--accent); }

@media(max-width:900px) { .sum-grid { grid-template-columns: repeat(2,1fr); } }
</style>
