<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import api from '@/services/api'
import StatusPill from '@/components/ui/StatusPill.vue'
import SimpleStatCard from '@/components/ui/SimpleStatCard.vue'
import { useToast } from '@/composables/useToast'

interface Program {
  id: number | string
  name: string
  category?: string
  cat?: string
  mode?: string
  date?: string
  start_date?: string
  duration?: string
  instructor?: string
  trainer?: string
  participants?: number
  enrolled_count?: number
  progress?: number
  status?: string
}

const toast     = useToast()
const loading   = ref(false)
const tab       = ref('All')
const showModal = ref(false)
const programs  = ref<Program[]>([])

const categories = ['Technical','Soft Skills','Leadership','Compliance','Safety','Product']

const catKey = (cat?: string) => ({
  Technical: 'tech', Leadership: 'lead', Compliance: 'comp',
  'Soft Skills': 'soft', Product: 'prod', Safety: 'safe',
}[cat ?? ''] ?? 'tech')

const statusOf  = (p: Program) => p.status ?? 'upcoming'
const nameOf    = (p: Program) => p.instructor ?? p.trainer ?? 'TBD'
const dateOf    = (p: Program) => p.date ?? p.start_date ?? ''
const countOf   = (p: Program) => p.participants ?? p.enrolled_count ?? 0

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/training/programs')
    programs.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    programs.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filteredPrograms = computed(() =>
  tab.value === 'All' ? programs.value : programs.value.filter(p => statusOf(p) === tab.value.toLowerCase())
)

const summary = computed(() => [
  { icon: '📚', label: 'Total Programs',  value: programs.value.length,                                              color: 'blue'   as const },
  { icon: '▶',  label: 'Ongoing',         value: programs.value.filter(p => statusOf(p) === 'ongoing').length,   color: 'green'  as const },
  { icon: '📅', label: 'Upcoming',        value: programs.value.filter(p => statusOf(p) === 'upcoming').length,  color: 'yellow' as const },
  { icon: '✓',  label: 'Completed',       value: programs.value.filter(p => statusOf(p) === 'completed').length, color: 'purple' as const },
])

const np = reactive({ name: '', category: 'Technical', mode: 'online', date: '', duration: '', instructor: '', max: 20 })

async function addProgram() {
  if (!np.name) return
  try {
    const { data } = await api.post('/training/programs', {
      name: np.name, category: np.category, mode: np.mode, date: np.date,
      duration: np.duration, instructor: np.instructor, max_participants: np.max,
    })
    programs.value.unshift(data.data ?? data)
  } catch {
    programs.value.unshift({
      id: Date.now(), name: np.name, category: np.category, cat: catKey(np.category),
      mode: np.mode,
      date: np.date ? new Date(np.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD',
      duration: np.duration || 'TBD', instructor: np.instructor || 'TBD',
      participants: 0, progress: 0, status: 'upcoming',
    })
  }
  Object.assign(np, { name: '', category: 'Technical', mode: 'online', date: '', duration: '', instructor: '', max: 20 })
  showModal.value = false
  toast.success('✓ Training program added!')
}
</script>

<template>
  <div class="train-page">
    <!-- Summary + button -->
    <div class="sum-row">
      <SimpleStatCard
        v-for="(s, i) in summary" :key="s.label"
        :icon="s.icon" :label="s.label" :value="s.value" :color="s.color" :delay="i * 0.07"
        style="flex:1;min-width:140px"
      />
      <button class="btn-primary" @click="showModal = true">+ Add Program</button>
    </div>

    <!-- Tabs -->
    <div class="tabs-bar">
      <button
        v-for="t in ['All','Upcoming','Ongoing','Completed']" :key="t"
        class="tab" :class="{ active: tab === t }"
        @click="tab = t"
      >{{ t }}</button>
    </div>

    <div v-if="loading" class="loading-row">Loading programs…</div>

    <!-- Programs grid -->
    <div v-else class="programs-grid">
      <div v-for="(p, i) in filteredPrograms" :key="p.id" class="prog-card" :style="{ '--i': i }">
        <div class="pc-top">
          <span class="pc-cat" :class="p.cat ?? catKey(p.category)">{{ p.category ?? '—' }}</span>
          <StatusPill :status="statusOf(p)" />
        </div>
        <div class="pc-title">{{ p.name }}</div>
        <div class="pc-meta">
          <span v-if="dateOf(p)">📅 {{ dateOf(p) }}</span>
          <span v-if="p.duration">⏱ {{ p.duration }}</span>
          <span v-if="nameOf(p) !== 'TBD'">👤 {{ nameOf(p) }}</span>
        </div>
        <div class="pc-progress" v-if="statusOf(p) === 'ongoing'">
          <div class="pp-bar"><div class="pp-fill" :style="{ width: (p.progress ?? 0) + '%' }"></div></div>
          <span class="pp-pct">{{ p.progress ?? 0 }}%</span>
        </div>
        <div class="pc-footer">
          <span class="pp-count">👥 {{ countOf(p) }} enrolled</span>
          <span class="pc-mode" :class="p.mode ?? 'online'">{{ p.mode ?? 'online' }}</span>
        </div>
      </div>
      <div v-if="!filteredPrograms.length" class="empty-prog">No {{ tab.toLowerCase() }} programs.</div>
    </div>

    <!-- Add Modal -->
    <transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal">
          <button class="mc" @click="showModal = false">✕</button>
          <div class="modal-title">Add Training Program</div>
          <div class="form-grid">
            <div class="field span2"><label>Program Name *</label><input v-model="np.name" placeholder="e.g. Advanced Vue.js Workshop"/></div>
            <div class="field"><label>Category</label><select v-model="np.category"><option v-for="c in categories" :key="c" :value="c">{{ c }}</option></select></div>
            <div class="field"><label>Mode</label><select v-model="np.mode"><option>online</option><option>offline</option><option>hybrid</option></select></div>
            <div class="field"><label>Date</label><input v-model="np.date" type="date"/></div>
            <div class="field"><label>Duration</label><input v-model="np.duration" placeholder="e.g. 2 days"/></div>
            <div class="field"><label>Instructor</label><input v-model="np.instructor" placeholder="Instructor name"/></div>
            <div class="field"><label>Max Participants</label><input v-model.number="np.max" type="number" placeholder="20"/></div>
          </div>
          <div class="modal-actions">
            <button class="btn-ghost" @click="showModal = false">Cancel</button>
            <button class="btn-primary" @click="addProgram">Add Program</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.train-page { display: flex; flex-direction: column; gap: 18px; }
.sum-row { display: flex; align-items: stretch; gap: 14px; flex-wrap: wrap; }
.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: var(--rs); padding: 9px 18px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s; font-family: inherit; white-space: nowrap; align-self: center; }
.btn-primary:hover { background: #3d6ee8; transform: translateY(-1px); }
.loading-row { padding: 32px; text-align: center; color: var(--muted); font-size: 13px; }

.tabs-bar { display: flex; gap: 3px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--rs); padding: 4px; align-self: flex-start; }
.tab { padding: 7px 18px; border-radius: 6px; background: none; border: none; font-size: 13px; font-weight: 500; color: var(--muted); cursor: pointer; transition: all .14s; font-family: inherit; }
.tab.active { background: var(--accent-glow); color: var(--accent); }
.tab:hover:not(.active) { color: var(--text); }

.programs-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap: 14px; }
.prog-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; display: flex; flex-direction: column; gap: 10px; transition: all .2s; animation: fadeUp .4s ease calc(var(--i, 0) * .06s) both; }
.prog-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.25); }
.pc-top { display: flex; align-items: center; justify-content: space-between; }
.pc-cat { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 20px; letter-spacing: .5px; text-transform: uppercase; }
.pc-cat.tech { background: rgba(79,126,255,.12); color: #4F7EFF; }
.pc-cat.lead { background: rgba(155,110,255,.12); color: #9B6EFF; }
.pc-cat.comp { background: rgba(249,168,37,.12);  color: #F9A825; }
.pc-cat.soft { background: rgba(54,211,153,.12);  color: #36D399; }
.pc-cat.prod { background: rgba(255,107,107,.12); color: #FF6B6B; }
.pc-cat.safe { background: rgba(249,168,37,.12);  color: #F9A825; }
.pc-title { font-weight: 600; font-size: 14px; line-height: 1.4; color: var(--text); }
.pc-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: var(--muted); }
.pc-progress { display: flex; align-items: center; gap: 8px; }
.pp-bar { flex: 1; height: 5px; background: var(--surface2); border-radius: 3px; overflow: hidden; }
.pp-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width .6s ease; }
.pp-pct { font-size: 11px; color: var(--accent); font-weight: 600; flex-shrink: 0; }
.pc-footer { display: flex; align-items: center; justify-content: space-between; }
.pp-count { font-size: 12px; color: var(--muted); }
.pc-mode { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 20px; text-transform: capitalize; }
.pc-mode.online  { background: rgba(54,211,153,.1);  color: #36D399; }
.pc-mode.offline { background: rgba(79,126,255,.1);  color: #4F7EFF; }
.pc-mode.hybrid  { background: rgba(155,110,255,.1); color: #9B6EFF; }
.empty-prog { grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--muted); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal { background: var(--surface); border: 1px solid var(--border-hi); border-radius: var(--r); width: 100%; max-width: 500px; padding: 28px; position: relative; box-shadow: 0 24px 60px rgba(0,0,0,.6); }
.mc { position: absolute; top: 14px; right: 14px; width: 28px; height: 28px; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; color: var(--muted); font-size: 12px; display: grid; place-items: center; }
.mc:hover { color: var(--text); }
.modal-title { font-size: 18px; font-weight: 700; margin-bottom: 18px; color: var(--text); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
.field { display: flex; flex-direction: column; gap: 5px; }
.field.span2 { grid-column: span 2; }
.field label { font-size: 11px; color: var(--dim); font-weight: 500; }
.field input, .field select { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--rs); padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit; outline: none; transition: border-color .15s; }
.field input:focus, .field select:focus { border-color: var(--accent); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.btn-ghost { background: var(--surface2); color: var(--dim); border: 1px solid var(--border); border-radius: var(--rs); padding: 8px 16px; font-size: 13px; cursor: pointer; font-family: inherit; }
.btn-ghost:hover { border-color: var(--border-hi); color: var(--text); }
.modal-enter-active, .modal-leave-active { transition: all .22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.96); }

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
