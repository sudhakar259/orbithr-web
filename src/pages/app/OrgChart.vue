<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getOrgChart, type OrgChartNode } from '@/services/employee'
import { useBreadcrumbs } from '@/composables/useBreadcrumbs'
import EmpAvatar from '@/components/employee/EmpAvatar.vue'

defineOptions({ name: 'OrgChartPage' })

const { setBreadcrumbs } = useBreadcrumbs()

// ── Node dimensions (matching reference exactly) ──────────────────────────────
const NW = 184, NH = 76, V_GAP = 34, H_GAP = 18

// ── Dept colour palette (T.dept from reference tokens) ───────────────────────
const DEPT: Record<string, string> = {
  // reference T.dept
  engineering: '#6B5BFF',
  design:      '#E8A63C',
  hr:          '#2FB872',
  people:      '#2FB872',
  finance:     '#4CC2FF',
  sales:       '#F07A7A',
  operations:  '#B28DFF',
  ops:         '#B28DFF',
  gtm:         '#FF8A65',
  marketing:   '#FF8A65',
  management:  '#8B7DFF',
  exec:        '#8B7DFF',
  // sub-team keywords
  platform:    '#6B5BFF',
  checkout:    '#8B7DFF',
  data:        '#4CC2FF',
  mobile:      '#2FB872',
}

function deptColor(title = ''): string {
  const key = title.toLowerCase().split(/[\s·–\-]/)[0].trim()
  return DEPT[key] ?? '#6B7280'
}

// ── Tree layout types ─────────────────────────────────────────────────────────
interface LayoutNode {
  node: OrgChartNode
  x: number
  y: number
  level: number
  parent: LayoutNode | null
  children: LayoutNode[]
}

// ── Recursive subtree-width + position assignment ─────────────────────────────
function subtreeWidth(node: OrgChartNode): number {
  if (!node.children?.length) return NW
  return node.children.reduce((s, c) => s + subtreeWidth(c), 0) + H_GAP * (node.children.length - 1)
}

function buildLayout(
  node: OrgChartNode,
  level: number,
  leftX: number,
  parent: LayoutNode | null,
): LayoutNode {
  const sw    = subtreeWidth(node)
  const selfX = leftX + sw / 2 - NW / 2
  const ln: LayoutNode = { node, x: selfX, y: level * (NH + V_GAP), level, parent, children: [] }
  let cx = leftX
  for (const child of node.children ?? []) {
    ln.children.push(buildLayout(child, level + 1, cx, ln))
    cx += subtreeWidth(child) + H_GAP
  }
  return ln
}

function flattenLayout(root: LayoutNode): LayoutNode[] {
  return [root, ...root.children.flatMap(flattenLayout)]
}

// ── State ─────────────────────────────────────────────────────────────────────
const loading  = ref(true)
const fetchErr = ref('')
const tree     = ref<OrgChartNode | null>(null)
const selected = ref<LayoutNode | null>(null)
const zoom     = ref(0.85)
const ZOOM_STEP = 0.15

// ── Derived layout ────────────────────────────────────────────────────────────
const layout = computed<LayoutNode | null>(() =>
  tree.value ? buildLayout(tree.value, 0, 20, null) : null
)
const flatNodes = computed<LayoutNode[]>(() =>
  layout.value ? flattenLayout(layout.value) : []
)
const edges = computed(() =>
  flatNodes.value
    .filter(n => n.parent)
    .map(n => ({
      x1: n.parent!.x + NW / 2,
      y1: n.parent!.y + NH,
      x2: n.x + NW / 2,
      y2: n.y,
    }))
)
const canvasW = computed(() =>
  flatNodes.value.length ? Math.max(...flatNodes.value.map(n => n.x + NW)) + 40 : 1200
)
const canvasH = computed(() =>
  flatNodes.value.length ? Math.max(...flatNodes.value.map(n => n.y + NH)) + 60 : 530
)

// ── Elbow edge path ───────────────────────────────────────────────────────────
function edgePath(e: { x1: number; y1: number; x2: number; y2: number }) {
  const midY = (e.y1 + e.y2) / 2
  return `M ${e.x1} ${e.y1} L ${e.x1} ${midY} L ${e.x2} ${midY} L ${e.x2} ${e.y2}`
}

// ── Legend: first 7 unique dept labels from visible nodes ────────────────────
const legend = computed(() => {
  const seen = new Map<string, string>()
  for (const ln of flatNodes.value) {
    const label = (ln.node.title ?? '').split(/[·–]/)[0].trim()
    if (label && !seen.has(label)) seen.set(label, deptColor(label))
    if (seen.size >= 7) break
  }
  return [...seen.entries()]
})

// ── Inspector (selected node) ─────────────────────────────────────────────────
const inspected = computed(() => {
  const nd = selected.value
  if (!nd) return null
  return {
    name:     nd.node.name,
    title:    nd.node.title ?? '',
    reports:  nd.children.length,
    level:    nd.level,
    members:  nd.children.map(c => c.node),
  }
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchTree() {
  loading.value = true; fetchErr.value = ''
  try {
    tree.value = await getOrgChart()
    if (layout.value) selected.value = layout.value
  } catch {
    fetchErr.value = 'Failed to load org chart.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  setBreadcrumbs([
    { label: 'People' },
    { label: 'Employees', to: '/app/employees' },
    { label: 'Org chart' },
  ])
  fetchTree()
})
</script>

<template>
  <div class="org-shell">

    <div v-if="loading"   class="st">Loading org chart…</div>
    <div v-else-if="fetchErr" class="st st--err">{{ fetchErr }}</div>

    <div v-else class="org-body">

      <!-- ── Canvas ────────────────────────────────────────────────────────── -->
      <div class="canvas">
        <!-- dot-grid background -->
        <div class="dot-bg" aria-hidden="true"/>

        <!-- sticky toolbar -->
        <div class="ctool">
          <div class="ctool-l">
            <div class="eyebrow">Active tree</div>
            <div class="ctool-title">
              {{ tree?.name ?? 'Organisation' }}
              <span class="ctool-count">· {{ flatNodes.length }} people</span>
            </div>
          </div>
          <div class="ctool-r">
            <button class="c-btn">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/></svg>
              Group · Department
            </button>
            <button class="c-btn">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/></svg>
              Filter · All
            </button>
            <div class="zoom">
              <button class="zoom-btn" @click="zoom = Math.max(0.3, +(zoom - ZOOM_STEP).toFixed(2))">−</button>
              <span class="zoom-val">{{ Math.round(zoom * 100) }}%</span>
              <button class="zoom-btn" @click="zoom = Math.min(2, +(zoom + ZOOM_STEP).toFixed(2))">+</button>
            </div>
            <button class="c-btn c-btn--sec">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              Export SVG
            </button>
            <button class="c-btn c-btn--accent">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
              Edit structure
            </button>
          </div>
        </div>

        <!-- scrollable tree area -->
        <div class="canvas-scroll">
          <div
            class="tree-stage"
            :style="{
              position:        'relative',
              width:           `${canvasW}px`,
              height:          `${canvasH}px`,
              margin:          '-10px 20px 40px',
              transform:       `scale(${zoom})`,
              transformOrigin: 'top left',
            }"
          >
            <!-- SVG connectors -->
            <svg
              :viewBox="`0 0 ${canvasW} ${canvasH}`"
              :style="{ position:'absolute', inset:0, width:`${canvasW}px`, height:`${canvasH}px`, pointerEvents:'none' }"
            >
              <path
                v-for="(e, i) in edges"
                :key="i"
                :d="edgePath(e)"
                stroke="rgba(46,53,68,0.9)"
                stroke-width="1.2"
                fill="none"
              />
            </svg>

            <!-- Org nodes -->
            <div
              v-for="ln in flatNodes"
              :key="ln.node.id"
              class="node"
              :class="{ 'node--active': selected?.node.id === ln.node.id }"
              :style="{ left:`${ln.x}px`, top:`${ln.y}px`, width:`${NW}px`, height:`${NH}px` }"
              @click="selected = ln"
            >
              <EmpAvatar :name="ln.node.name" :size="36" />
              <div class="node-body">
                <div class="node-name">{{ ln.node.name }}</div>
                <div class="node-role">{{ ln.node.title ?? '' }}</div>
                <div class="node-foot">
                  <span
                    class="dept-chip"
                    :style="{ background: deptColor(ln.node.title) }"
                  >{{ (ln.node.title ?? '').split(/[·–]/)[0].trim() || 'Team' }}</span>
                  <span v-if="ln.children.length" class="reports-cnt">· {{ ln.children.length }} reports</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- dept legend -->
        <div v-if="legend.length" class="legend">
          <div v-for="([label, color]) in legend" :key="label" class="leg-row">
            <div class="leg-dot" :style="{ background: color }"/>
            {{ label }}
          </div>
        </div>
      </div>

      <!-- ── Team inspector ───────────────────────────────────────────────── -->
      <div class="insp">
        <template v-if="inspected">

          <!-- Header -->
          <div class="eyebrow">Selected team</div>
          <div class="insp-title">{{ inspected.title || inspected.name }}</div>
          <div class="insp-sub">
            Led by {{ inspected.name }} · {{ inspected.reports }} direct report{{ inspected.reports !== 1 ? 's' : '' }} · — open roles
          </div>

          <!-- Stats 2×2 -->
          <div class="stat-grid">
            <div class="stat-cell">
              <div class="eyebrow">Headcount</div>
              <div class="stat-val">{{ inspected.reports }}</div>
            </div>
            <div class="stat-cell">
              <div class="eyebrow">Avg tenure</div>
              <div class="stat-val">—</div>
            </div>
            <div class="stat-cell">
              <div class="eyebrow">On leave</div>
              <div class="stat-val">—</div>
            </div>
            <div class="stat-cell">
              <div class="eyebrow">Open roles</div>
              <div class="stat-val">—</div>
            </div>
          </div>

          <!-- Members -->
          <div v-if="inspected.members.length" class="insp-sec">
            <div class="eyebrow">Members</div>
            <div class="member-list">
              <div v-for="m in inspected.members" :key="m.id" class="member-row">
                <EmpAvatar :name="m.name" :size="28" />
                <div class="member-info">
                  <div class="member-name">{{ m.name }}</div>
                  <div class="member-role">{{ m.title ?? '' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Open roles (placeholder) -->
          <div class="insp-sec">
            <div class="eyebrow">Open roles</div>
            <div class="open-role-empty">
              <div class="or-icon">
                <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
              </div>
              <div>
                <div class="or-label">Post a role</div>
                <div class="or-sub">No open roles for this team</div>
              </div>
            </div>
          </div>

        </template>
        <div v-else class="insp-hint">Click a node to inspect the team</div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Page shell ────────────────────────────────────── */
.org-shell { height: calc(100vh - 56px); display: flex; flex-direction: column; overflow: hidden; }
.org-body  { display: grid; grid-template-columns: 1fr 320px; flex: 1; min-height: 0; }

/* ── Canvas ─────────────────────────────────────────── */
.canvas {
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  border-right: 1px solid var(--border);
  background: #0B0D12;
}

/* dot-grid overlay matching reference */
.dot-bg {
  position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(#232936 1px, transparent 1px);
  background-size: 24px 24px; opacity: .6;
}

/* ── Canvas toolbar ─────────────────────────────────── */
.ctool {
  position: sticky; top: 0; z-index: 10; flex-shrink: 0;
  padding: 16px 24px;
  background: linear-gradient(180deg, #0B0D12 0%, transparent 100%);
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
}
.ctool-l { display: flex; flex-direction: column; gap: 2px; }
.ctool-r { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.eyebrow {
  font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase;
  color: #7A8299;
}
.ctool-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 26px; color: #FAFBFC; letter-spacing: -0.02em; line-height: 1.1; margin-top: 2px;
}
.ctool-count { color: #7A8299; }

.c-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 30px; padding: 0 10px; border-radius: 6px;
  font-size: 11.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
  background: #161A23; border: 1px solid #232936; color: #A8AEC0;
  transition: all .13s;
}
.c-btn:hover        { border-color: #3A4254; color: #EEF0F4; }
.c-btn--sec         { background: #161A23; color: #A8AEC0; }
.c-btn--accent      { background: rgba(107,91,255,.15); border-color: rgba(107,91,255,.35); color: #8979FF; }
.c-btn--accent:hover{ background: rgba(107,91,255,.25); }

.zoom {
  display: flex; align-items: center;
  background: #161A23; border: 1px solid #232936; border-radius: 6px; overflow: hidden;
}
.zoom-btn {
  width: 28px; height: 30px; background: none; border: none;
  color: #A8AEC0; font-size: 16px; line-height: 1; cursor: pointer;
  transition: background .12s;
}
.zoom-btn:hover { background: #1C212C; color: #EEF0F4; }
.zoom-val {
  font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #A8AEC0;
  padding: 0 8px; min-width: 40px; text-align: center;
  border-left: 1px solid #232936; border-right: 1px solid #232936;
  height: 30px; display: grid; place-items: center;
}

/* ── Scrollable tree canvas ─────────────────────────── */
.canvas-scroll { flex: 1; overflow: auto; position: relative; }

/* ── Org nodes ──────────────────────────────────────── */
.node {
  position: absolute;
  background: #161A23; border: 1px solid #232936; border-radius: 8px;
  padding: 10px 12px; display: flex; align-items: center; gap: 10px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,.3);
  transition: border-color .14s, box-shadow .14s, background .14s;
}
.node:hover { border-color: #3A4254; }
.node--active {
  background: rgba(107,91,255,.12) !important;
  border-color: #6B5BFF !important;
  box-shadow: 0 0 0 3px rgba(107,91,255,.15) !important;
}

.node-body { flex: 1; min-width: 0; }
.node-name { font-size: 12px; font-weight: 500; color: #FAFBFC; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-role { font-size: 11px; color: #7A8299; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.node-foot { display: flex; align-items: center; gap: 5px; margin-top: 3px; }

.dept-chip {
  font-size: 9.5px; font-weight: 600; letter-spacing: .04em;
  padding: 1px 5px; border-radius: 3px; color: #fff;
}
.reports-cnt { font-size: 10px; color: #7A8299; }

/* ── Legend ─────────────────────────────────────────── */
.legend {
  position: absolute; left: 24px; bottom: 20px;
  display: flex; flex-wrap: wrap; gap: 14px;
  padding: 10px 14px;
  background: #11141B; border: 1px solid #232936; border-radius: 6px;
}
.leg-row { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: #A8AEC0; }
.leg-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

/* ── Inspector ──────────────────────────────────────── */
.insp {
  padding: 18px 20px; overflow-y: auto;
  display: flex; flex-direction: column; gap: 18px;
  background: var(--bg);
}

.insp-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 24px; color: var(--text); letter-spacing: -0.02em; line-height: 1.2;
  margin-top: 4px;
}
.insp-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* Stats 2×2 */
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat-cell { padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; }
.stat-val  { font-family: 'Instrument Serif', Georgia, serif; font-size: 22px; color: var(--text); margin-top: 2px; }

/* Inspector sections */
.insp-sec { display: flex; flex-direction: column; gap: 8px; }

/* Members list */
.member-list { display: flex; flex-direction: column; gap: 6px; }
.member-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
  transition: border-color .13s;
}
.member-row:hover { border-color: var(--border-hi); }
.member-info { flex: 1; min-width: 0; }
.member-name { font-size: 12px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.member-role { font-size: 10.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Open roles placeholder */
.open-role-empty {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: var(--surface); border: 1px dashed rgba(107,91,255,.4); border-radius: 6px;
}
.or-icon {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(107,91,255,.22); flex-shrink: 0;
  display: grid; place-items: center; color: #8979FF;
}
.or-label { font-size: 12px; font-weight: 500; color: var(--text); }
.or-sub   { font-size: 10.5px; color: var(--muted); margin-top: 1px; }

.insp-hint { font-size: 12.5px; color: var(--muted); padding: 8px 0; }

/* ── State ──────────────────────────────────────────── */
.st      { flex: 1; display: grid; place-items: center; font-size: 13px; color: var(--muted); }
.st--err { color: var(--red); }
</style>
