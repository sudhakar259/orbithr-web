<script setup lang="ts">
import { computed } from 'vue'

interface Column {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
}

withDefaults(
  defineProps<{
    columns: Column[]
    rows?: Record<string, unknown>[]
    loading?: boolean
    emptyMessage?: string
    rowKey?: string
    striped?: boolean
  }>(),
  {
    rows: () => [],
    loading: false,
    emptyMessage: 'No records found',
    rowKey: 'id',
    striped: false,
  },
)

const skeletonRows = computed(() => Array.from({ length: 5 }))

function alignClass(col: Column) {
  return col.align === 'center'
    ? 'text-center'
    : col.align === 'right'
      ? 'text-right'
      : 'text-left'
}
</script>

<template>
  <div
    class="overflow-hidden rounded-xl border border-slate-200 dark:border-surface-3 bg-white dark:bg-surface-2"
  >
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 dark:divide-surface-3">
        <thead class="bg-slate-50 dark:bg-surface-1">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              :style="col.width ? { width: col.width } : undefined"
              :class="[
                'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400',
                alignClass(col),
              ]"
            >
              <span class="inline-flex items-center gap-1">
                {{ col.label }}
                <svg
                  v-if="col.sortable"
                  class="h-3 w-3 opacity-60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                  />
                </svg>
              </span>
            </th>
          </tr>
        </thead>

        <tbody
          class="divide-y divide-slate-100 dark:divide-surface-3 bg-white dark:bg-surface-2"
        >
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="(_, i) in skeletonRows" :key="`sk-${i}`">
              <td
                v-for="col in columns"
                :key="col.key"
                class="px-4 py-4"
              >
                <div
                  class="h-3 w-full max-w-[140px] animate-pulse rounded bg-slate-200 dark:bg-surface-3"
                />
              </td>
            </tr>
          </template>

          <!-- Empty state -->
          <tr v-else-if="!rows.length">
            <td
              :colspan="columns.length"
              class="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
            >
              {{ emptyMessage }}
            </td>
          </tr>

          <!-- Rows -->
          <template v-else>
            <tr
              v-for="(row, rowIdx) in rows"
              :key="String(row[rowKey] ?? rowIdx)"
              :class="[
                'transition-colors hover:bg-slate-50 dark:hover:bg-surface-3/60',
                striped && rowIdx % 2 === 1
                  ? 'bg-slate-50/40 dark:bg-surface-1/30'
                  : '',
              ]"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                :class="[
                  'px-4 py-3 text-sm text-slate-700 dark:text-slate-200',
                  alignClass(col),
                ]"
              >
                <slot
                  :name="`cell-${col.key}`"
                  :row="row"
                  :value="row[col.key]"
                >
                  {{ row[col.key] }}
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
