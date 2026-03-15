<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import api from '@/services/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import Modal      from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'

interface Holiday {
  id: number | string
  name: string
  date: string
  type?: string
  holiday_type?: string
  applicable?: string
  applicable_to?: string
}

const toast   = useToast()
const year    = ref(new Date().getFullYear())
const showAdd = ref(false)
const holidays = ref<Holiday[]>([])

const months = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const typeOf       = (h: Holiday) => h.type ?? h.holiday_type ?? 'public'
const applicableTo = (h: Holiday) => h.applicable ?? h.applicable_to ?? 'All Employees'

async function load() {
  try {
    const { data } = await api.get('/holidays', { params: { year: year.value } })
    holidays.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    holidays.value = []
  }
}
onMounted(load)

const filteredHolidays = computed(() =>
  holidays.value.filter(h => h.date.startsWith(String(year.value)))
)

const summary = computed(() => [
  { v: filteredHolidays.value.length,                                              l: 'Total Holidays',  c: '#4F7EFF' },
  { v: filteredHolidays.value.filter(h => typeOf(h) === 'public').length,         l: 'Public Holidays', c: '#36D399' },
  { v: filteredHolidays.value.filter(h => typeOf(h) === 'restricted').length,     l: 'Restricted',      c: '#F9A825' },
  { v: filteredHolidays.value.filter(h => new Date(h.date) > new Date()).length,  l: 'Upcoming',        c: '#9B6EFF' },
])

const now = new Date()

function calCells(mi: number) {
  const first = new Date(year.value, mi, 1).getDay()
  const days  = new Date(year.value, mi + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < first; i++)
    cells.push({ key: `e${mi}-${i}`, day: null, isToday: false, weekend: false, holiday: false, restricted: false, holidayName: '' })
  for (let d = 1; d <= days; d++) {
    const date = new Date(year.value, mi, d)
    const dow  = date.getDay()
    const iso  = `${year.value}-${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const hol  = holidays.value.find(h => h.date === iso)
    cells.push({
      key: `${mi}-${d}`, day: d,
      isToday: year.value === now.getFullYear() && mi === now.getMonth() && d === now.getDate(),
      weekend: dow === 0 || dow === 6,
      holiday:    !!hol && typeOf(hol) === 'public',
      restricted: !!hol && typeOf(hol) === 'restricted',
      holidayName: hol?.name ?? '',
    })
  }
  return cells
}

const getDayName = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long' })

async function deleteHoliday(id: number | string) {
  if (!confirm('Remove this holiday?')) return
  try { await api.delete(`/holidays/${id}`) } catch {}
  holidays.value = holidays.value.filter(h => h.id !== id)
  toast.success('Holiday removed.')
}

const nh = reactive({ name: '', date: '', type: 'public', applicable: 'All Employees' })

async function addHoliday() {
  if (!nh.name || !nh.date) return
  try {
    const { data } = await api.post('/holidays', {
      name: nh.name, date: nh.date, type: nh.type, applicable: nh.applicable,
    })
    holidays.value.push(data.data ?? data)
  } catch {
    holidays.value.push({ id: Date.now(), name: nh.name, date: nh.date, type: nh.type, applicable: nh.applicable })
  }
  holidays.value.sort((a, b) => a.date.localeCompare(b.date))
  Object.assign(nh, { name: '', date: '', type: 'public', applicable: 'All Employees' })
  showAdd.value = false
  toast.success('✓ Holiday added!')
}
</script>

<template>
  <div class="hol-page">
    <PageHeader title="Holiday Calendar" subtitle="Manage company holidays and restricted leaves">
      <template #actions>
        <select v-model="year" class="year-sel" @change="load">
          <option v-for="y in [2025, 2026, 2027]" :key="y">{{ y }}</option>
        </select>
        <button class="btn-primary" @click="showAdd = true">+ Add Holiday</button>
      </template>
    </PageHeader>

    <!-- Summary -->
    <div class="hol-summary">
      <div class="hs-card" v-for="s in summary" :key="s.l">
        <div class="hsc-val" :style="{ color: s.c }">{{ s.v }}</div>
        <div class="hsc-l">{{ s.l }}</div>
      </div>
    </div>

    <!-- Monthly calendar grid -->
    <div class="months-grid">
      <div v-for="(month, mi) in months" :key="mi" class="month-card">
        <div class="mc-head">{{ month }}</div>
        <div class="mc-days-hdr">
          <span v-for="d in ['S','M','T','W','T','F','S']" :key="d + mi">{{ d }}</span>
        </div>
        <div class="mc-grid">
          <div
            v-for="cell in calCells(mi)" :key="cell.key"
            class="mc-cell"
            :class="{ empty: !cell.day, today: cell.isToday, holiday: cell.holiday, weekend: cell.weekend, restricted: cell.restricted }"
            :title="cell.holidayName"
          >
            <span v-if="cell.day">{{ cell.day }}</span>
            <div v-if="cell.holiday || cell.restricted" class="hol-dot" :class="{ restricted: cell.restricted }"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div class="card-head">
        <div class="ct">All Holidays — {{ year }}</div>
        <div class="count-badge">{{ filteredHolidays.length }} holidays</div>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Holiday Name</th><th>Date</th><th>Day</th><th>Type</th><th>Applicable To</th><th></th></tr></thead>
          <tbody>
            <tr v-for="h in filteredHolidays" :key="h.id">
              <td>{{ h.name }}</td>
              <td class="mono dim">{{ h.date }}</td>
              <td class="dim">{{ getDayName(h.date) }}</td>
              <td><span class="type-pill" :class="typeOf(h)">{{ typeOf(h) }}</span></td>
              <td class="dim">{{ applicableTo(h) }}</td>
              <td>
                <button class="ra" @click="deleteHoliday(h.id)">🗑</button>
              </td>
            </tr>
            <tr v-if="!filteredHolidays.length">
              <td colspan="6" class="empty-row">No holidays for {{ year }}.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend-bar">
      <div class="lb-item"><div class="lb-dot holiday"></div>Public Holiday</div>
      <div class="lb-item"><div class="lb-dot restricted"></div>Restricted Holiday</div>
      <div class="lb-item"><div class="lb-dot weekend"></div>Weekend</div>
      <div class="lb-item"><div class="lb-dot today"></div>Today</div>
    </div>

    <!-- Add Modal -->
    <Modal v-model="showAdd" title="Add Holiday" max-width="440px">
      <div class="form-stack">
        <div class="field"><label>Holiday Name *</label><input v-model="nh.name" placeholder="e.g. Diwali" /></div>
        <div class="field"><label>Date *</label><input v-model="nh.date" type="date" /></div>
        <div class="field">
          <label>Type</label>
          <select v-model="nh.type">
            <option value="public">Public Holiday</option>
            <option value="restricted">Restricted Holiday</option>
            <option value="optional">Optional Holiday</option>
          </select>
        </div>
        <div class="field">
          <label>Applicable To</label>
          <select v-model="nh.applicable">
            <option>All Employees</option>
            <option>Bangalore Office</option>
            <option>Mumbai Office</option>
            <option>Delhi Office</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" @click="showAdd = false">Cancel</button>
        <button class="btn-primary" @click="addHoliday">Add Holiday</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.hol-page { display: flex; flex-direction: column; gap: 18px; }
.year-sel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); color: var(--dim); font-size: 13px; font-family: inherit; padding: 8px 12px; cursor: pointer; outline: none; }
.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--rs); padding: 9px 18px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: all .15s; }
.btn-primary:hover { background: #3d6ee8; transform: translateY(-1px); }
.btn-ghost { background: var(--surface2); color: var(--dim); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }

.hol-summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
.hs-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 18px; }
.hsc-val { font-size: 28px; font-weight: 700; line-height: 1; margin-bottom: 3px; }
.hsc-l { font-size: 12px; color: var(--muted); }

.months-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
.month-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 14px; }
.mc-head { font-weight: 600; font-size: 13px; margin-bottom: 8px; color: var(--text); }
.mc-days-hdr { display: grid; grid-template-columns: repeat(7,1fr); text-align: center; font-size: 9px; color: var(--muted); font-weight: 600; margin-bottom: 4px; }
.mc-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 1px; }
.mc-cell {
  aspect-ratio: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; border-radius: 3px; font-size: 10px; color: var(--dim);
  position: relative; cursor: default;
}
.mc-cell.today    { background: var(--accent); color: #fff; font-weight: 700; border-radius: 50%; }
.mc-cell.holiday  { color: #F9A825; font-weight: 600; }
.mc-cell.restricted { color: #9B6EFF; font-weight: 600; }
.mc-cell.weekend  { color: rgba(255,255,255,.25); }
.hol-dot { position: absolute; bottom: 1px; width: 3px; height: 3px; border-radius: 50%; background: #F9A825; }
.hol-dot.restricted { background: #9B6EFF; }

.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.card-head { padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.ct { font-weight: 600; font-size: 15px; color: var(--text); }
.count-badge { background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; font-size: 11px; color: var(--dim); }
.tbl-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase; color: var(--muted); background: rgba(255,255,255,.02); border-bottom: 1px solid var(--border); }
tbody tr { border-bottom: 1px solid var(--border); transition: background .1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(255,255,255,.02); }
td { padding: 10px 14px; vertical-align: middle; color: var(--text); }
.mono { font-family: monospace; font-size: 12px; } .dim { color: var(--dim); }
.empty-row { text-align: center; padding: 28px; color: var(--muted); }
.type-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: capitalize; }
.type-pill.public     { background: rgba(54,211,153,.1);  color: #36D399; }
.type-pill.restricted { background: rgba(155,110,255,.1); color: #9B6EFF; }
.type-pill.optional   { background: rgba(249,168,37,.1);  color: #F9A825; }
.ra { width: 26px; height: 26px; background: rgba(255,107,107,.08); border: 1px solid rgba(255,107,107,.15); border-radius: 5px; display: grid; place-items: center; font-size: 11px; cursor: pointer; color: var(--red); transition: all .1s; }
.ra:hover { background: rgba(255,107,107,.15); }

.legend-bar { display: flex; gap: 20px; flex-wrap: wrap; }
.lb-item { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--muted); }
.lb-dot { width: 10px; height: 10px; border-radius: 3px; }
.lb-dot.holiday    { background: #F9A825; }
.lb-dot.restricted { background: #9B6EFF; }
.lb-dot.weekend    { background: var(--surface3); border: 1px solid var(--border); }
.lb-dot.today      { background: var(--accent); }

.form-stack { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 11px; color: var(--dim); font-weight: 500; }
.field input, .field select { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; transition: border-color .15s; }
.field input:focus, .field select:focus { border-color: var(--accent); }

@media(max-width:1100px) { .months-grid { grid-template-columns: repeat(3,1fr); } }
@media(max-width:800px) { .months-grid { grid-template-columns: repeat(2,1fr); } .hol-summary { grid-template-columns: repeat(2,1fr); } }
</style>
