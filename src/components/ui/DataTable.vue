<template>
  <div class="dt-wrap">
    <!-- Toolbar -->
    <div v-if="showToolbar" class="dt-toolbar">
      <SearchInput v-if="searchable" v-model="searchQ" :placeholder="searchPlaceholder" />
      <slot name="toolbar" />
      <div v-if="$slots.actions" class="dt-actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- Table -->
    <div class="dt-scroll">
      <table>
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :style="col.width ? { width: col.width } : {}"
              :class="{ sortable: col.sortable }"
              @click="col.sortable && toggleSort(col.key)"
            >
              {{ col.label }}
              <span v-if="col.sortable" class="sort-icon">
                {{ sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕' }}
              </span>
            </th>
            <th v-if="$slots.rowActions" class="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in pagedRows"
            :key="rowKey ? (row as any)[rowKey] : i"
            :class="{ clickable: !!onRowClick }"
            @click="onRowClick?.(row as any)"
          >
            <td v-for="col in columns" :key="col.key">
              <slot :name="`cell-${col.key}`" :row="row" :value="(row as any)[col.key]">
                {{ col.format ? col.format((row as any)[col.key], row as any) : (row as any)[col.key] }}
              </slot>
            </td>
            <td v-if="$slots.rowActions" class="actions-cell" @click.stop>
              <div class="row-actions-wrap">
                <slot name="rowActions" :row="row" />
              </div>
            </td>
          </tr>
          <tr v-if="!pagedRows.length">
            <td :colspan="columns.length + ($slots.rowActions ? 1 : 0)" class="empty-row">
              <slot name="empty">
                <EmptyState :message="emptyMessage" />
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="paginate && totalPages > 1" class="dt-pagination">
      <div class="pg-info">
        Showing {{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, filteredRows.length) }}
        of {{ filteredRows.length }}
      </div>
      <div class="pg-controls">
        <button class="pg-btn" :disabled="currentPage === 1" @click="currentPage--">← Prev</button>
        <div class="pg-pages">
          <button
            v-for="p in visiblePages"
            :key="p"
            class="pg-num"
            :class="{ active: p === currentPage, ellipsis: p === '…' }"
            @click="typeof p === 'number' && (currentPage = p)"
          >{{ p }}</button>
        </div>
        <button class="pg-btn" :disabled="currentPage === totalPages" @click="currentPage++">Next →</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SearchInput from './SearchInput.vue'
import EmptyState  from './EmptyState.vue'

interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  format?: (val: unknown, row: Record<string, unknown>) => string
}

const props = withDefaults(defineProps<{
  rows: Record<string, unknown>[]
  columns: Column[]
  rowKey?: string
  searchable?: boolean
  searchPlaceholder?: string
  searchFields?: string[]
  paginate?: boolean
  perPage?: number
  emptyMessage?: string
  onRowClick?: (row: Record<string, unknown>) => void
  showToolbar?: boolean
}>(), {
  searchable: true,
  searchPlaceholder: 'Search…',
  paginate: true,
  perPage: 10,
  emptyMessage: 'No records found',
  showToolbar: true,
})

const searchQ     = ref('')
const sortKey     = ref('')
const sortDir     = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)

watch(searchQ, () => { currentPage.value = 1 })

const filteredRows = computed(() => {
  let list = [...props.rows]
  const q = searchQ.value.toLowerCase().trim()
  if (q && props.searchFields?.length) {
    list = list.filter(row => props.searchFields!.some(f => String(row[f] ?? '').toLowerCase().includes(q)))
  } else if (q) {
    list = list.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q)))
  }
  if (sortKey.value) {
    list.sort((a, b) => {
      const av = String(a[sortKey.value] ?? '')
      const bv = String(b[sortKey.value] ?? '')
      return sortDir.value === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }
  return list
})

const totalPages = computed(() =>
  props.paginate ? Math.max(1, Math.ceil(filteredRows.value.length / props.perPage)) : 1
)
const pagedRows = computed(() => {
  if (!props.paginate) return filteredRows.value
  const start = (currentPage.value - 1) * props.perPage
  return filteredRows.value.slice(start, start + props.perPage)
})
const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | string)[] = [1]
  if (cur > 3) pages.push('…')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
  if (cur < total - 2) pages.push('…')
  pages.push(total)
  return pages
})

const toggleSort = (key: string) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDir.value = 'asc' }
}
</script>

<style scoped>
.dt-wrap { display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.dt-toolbar { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.dt-actions { display: flex; gap: 8px; margin-left: auto; }
.dt-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th {
  text-align: left; padding: 10px 14px; font-size: 10px; font-weight: 700;
  letter-spacing: .7px; text-transform: uppercase; color: var(--muted);
  background: rgba(255,255,255,.02); border-bottom: 1px solid var(--border);
  user-select: none; white-space: nowrap;
}
thead th.sortable { cursor: pointer; }
thead th.sortable:hover { color: var(--text); }
thead th.actions-col { width: 60px; }
.sort-icon { margin-left: 4px; font-size: 10px; color: var(--muted); }
tbody tr { border-bottom: 1px solid var(--border); transition: background .1s; }
tbody tr:last-child { border-bottom: none; }
tbody tr.clickable { cursor: pointer; }
tbody tr:hover { background: rgba(255,255,255,.025); }
td { padding: 11px 14px; vertical-align: middle; color: var(--text); }
td.actions-cell { padding: 6px 10px; }
.row-actions-wrap { display: flex; gap: 4px; opacity: 0; transition: opacity .15s; }
tr:hover .row-actions-wrap { opacity: 1; }
.empty-row { padding: 0 !important; }
.dt-pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 10px;
}
.pg-info { font-size: 12px; color: var(--muted); }
.pg-controls { display: flex; align-items: center; gap: 4px; }
.pg-btn {
  padding: 5px 12px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: var(--rs); color: var(--dim); font-size: 12px; cursor: pointer;
  font-family: inherit; transition: all .14s;
}
.pg-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.pg-btn:disabled { opacity: .4; cursor: not-allowed; }
.pg-pages { display: flex; gap: 3px; }
.pg-num {
  min-width: 30px; height: 28px; padding: 0 6px; background: none; border: 1px solid transparent;
  border-radius: var(--rs); color: var(--dim); font-size: 12px; cursor: pointer;
  font-family: inherit; transition: all .14s; display: grid; place-items: center;
}
.pg-num:hover:not(.ellipsis) { background: var(--surface2); color: var(--text); }
.pg-num.active { background: var(--accent-glow); color: var(--accent); border-color: var(--accent); font-weight: 600; }
.pg-num.ellipsis { cursor: default; color: var(--muted); }
</style>
