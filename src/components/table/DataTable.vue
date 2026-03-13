<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div class="relative overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200">
        <thead class="bg-slate-50">
          <tr>
            <th v-if="selectable" class="px-4 py-3">
              <input type="checkbox" :checked="allSelected" @change="toggleAll(($event.target as HTMLInputElement).checked)" />
            </th>
            <th v-for="col in columns" :key="col.key" :class="['px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600', col.headerClass]" :style="col.width ? { width: col.width } : undefined">
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading">
            <td :colspan="columns.length + (selectable ? 1 : 0)" class="px-4 py-6 text-center text-slate-500">Loading…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td :colspan="columns.length + (selectable ? 1 : 0)" class="px-4 py-10 text-center text-slate-500">{{ emptyText }}</td>
          </tr>
          <tr v-else v-for="(row, idx) in rows" :key="rowKeyValue(row)" class="hover:bg-slate-50">
            <td v-if="selectable" class="px-4 py-3">
              <input type="checkbox" :checked="selectedIdsSet.has(rowKeyValue(row))" @change="toggleOne(row, ($event.target as HTMLInputElement).checked)" />
            </td>
            <td v-for="col in columns" :key="col.key" :class="['px-4 py-3', col.cellClass, col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left']">
              <slot :name="`cell-${col.key}`" :row="row" :value="(row as any)[col.key]" :index="idx">
                {{ (row as any)[col.key] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface ColumnDef {
  key: string
  label: string
  width?: string
  headerClass?: string
  cellClass?: string
  align?: 'left' | 'right' | 'center'
}

const props = defineProps<{
  columns: ColumnDef[]
  rows: any[]
  rowKey: string | ((row: any) => string | number)
  selectable?: boolean
  selectedIds?: Set<string | number>
  loading?: boolean
  emptyText?: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedIds', value: Set<string | number>): void
}>()

const selectedIdsSet = computed<Set<string | number>>(() => props.selectedIds ?? new Set<string | number>())

function rowKeyValue(row: any): string | number {
  return typeof props.rowKey === 'function' ? props.rowKey(row) : (row as any)[props.rowKey]
}

const allSelected = computed(() => props.selectable && props.rows.length > 0 && selectedIdsSet.value.size === props.rows.length)

function toggleAll(checked: boolean) {
  const set = new Set<string | number>(checked ? props.rows.map(r => rowKeyValue(r)) : [])
  emit('update:selectedIds', set)
}

function toggleOne(row: any, checked: boolean) {
  const id = rowKeyValue(row)
  const set = new Set<string | number>(selectedIdsSet.value)
  if (checked) set.add(id)
  else set.delete(id)
  emit('update:selectedIds', set)
}
</script>
