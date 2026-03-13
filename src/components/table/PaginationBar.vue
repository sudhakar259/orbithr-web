<template>
  <div class="flex flex-wrap items-center justify-end gap-4 border-t border-slate-200 px-4 py-2">
    <div class="flex items-center" style="inline-size: 171px;">
      <span class="mr-3 whitespace-nowrap text-sm">Rows per page:</span>
      <select
        :value="perPage"
        @change="onPerPage(($event.target as HTMLSelectElement).value)"
        class="rounded border-none px-2 py-1 text-sm text-slate-700 focus:border-brand-500 focus:ring-brand-500 min-w-14"
      >
        <option v-for="n in perPageOptionsComputed" :key="n" :value="n">{{ n }}</option>
      </select>
    </div>
    <div class="flex items-center">
      <h6 class="text-sm font-normal text-slate-700">{{ paginationData }}</h6>
    </div>
    <div class="flex items-center gap-1">
      <button class="rounded border px-2 py-1 text-sm disabled:opacity-50" :disabled="!canPrev" @click="$emit('update:page', page - 1)">Prev</button>
      <template v-for="(p, i) in visiblePages" :key="i">
        <span v-if="typeof p === 'string'" class="px-2 text-slate-500">{{ p }}</span>
        <button
          v-else
          class="rounded px-2 py-1 text-sm"
          :class="p === page ? 'bg-brand-600 text-white' : 'border text-slate-700 hover:bg-slate-50'"
          @click="$emit('update:page', p as number)"
        >
          {{ p }}
        </button>
      </template>
      <button class="rounded border px-2 py-1 text-sm disabled:opacity-50" :disabled="!canNext" @click="$emit('update:page', page + 1)">Next</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  perPage: number
  total: number
  perPageOptions?: number[]
}>()

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'update:perPage', value: number): void
}>()

const lastPage = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const canPrev = computed(() => props.page > 1)
const canNext = computed(() => props.page < lastPage.value)

const paginationData = computed(() => {
  const t = props.total
  if (t === 0) return '0–0 of 0'
  const start = (props.page - 1) * props.perPage + 1
  const end = Math.min(props.page * props.perPage, t)
  return `${start}–${end} of ${t}`
})

const perPageOptionsComputed = computed(() => props.perPageOptions && props.perPageOptions.length ? props.perPageOptions : [10, 25, 50])

const visiblePages = computed<(number | string)[]>(() => {
  const totalPages = lastPage.value
  const current = props.page
  const delta = 1
  const range: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - delta && i <= current + delta)) range.push(i)
  }
  const pages: (number | string)[] = []
  let prev: number | null = null
  for (const p of range) {
    if (prev !== null) {
      if (p - prev === 2) pages.push(prev + 1)
      else if (p - prev > 2) pages.push('…')
    }
    pages.push(p)
    prev = p
  }
  return pages
})

function onPerPage(val: string) {
  const num = Number(val)
  if (!Number.isNaN(num)) emit('update:perPage', num)
}
</script>
