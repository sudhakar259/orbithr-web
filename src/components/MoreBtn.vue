<template>
  <div class="relative inline-block text-left" ref="root">
    <button
      type="button"
      class="inline-flex items-center rounded-full justify-center border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-200 focus:outline-none"
      @click="toggle"
      aria-haspopup="true"
      :aria-expanded="open ? 'true' : 'false'"
      ref="trigger"
    >
      <span class="sr-only">Open actions</span>
      <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="w-6 h-6" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 10a2 2 0 1 0 0 4a2 2 0 0 0 0-4Zm0-6a2 2 0 1 0 0 4a2 2 0 0 0 0-4Zm0 12a2 2 0 1 0 0 4a2 2 0 0 0 0-4Z" />
      </svg>
    </button>

    <teleport to="body">
      <div
        v-if="open"
        ref="dropdown"
        class="fixed z-50 w-44 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none"
        role="menu"
        :style="dropdownStyle"
      >
        <div class="py-1">
          <template v-for="(item, idx) in getMenuList()" :key="idx">
            <RouterLink
              v-if="item.to"
              :to="item.to"
              class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              role="menuitem"
              @click="handleSelect(item)"
            >
              <span class="mr-2">{{ item.icon }}</span>
              {{ getTitle(item) }}
            </RouterLink>
            <button
              v-else
              type="button"
              class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              role="menuitem"
              @click="handleSelect(item)"
            >
              <span class="mr-2">{{ item.icon }}</span>
              {{ getTitle(item) }}
            </button>
          </template>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { RouterLink } from 'vue-router'

export interface MenuItem {
  title: string
  value: string
  prependIcon?: string
  to?: any
}

const props = defineProps<{
  menuList?: MenuItem[]
  items?: MenuItem[]
  itemProps?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', payload: string | { value: string; item: MenuItem }): void
  (e: 'select-item', payload: { value: string; item: MenuItem }): void
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const dropdown = ref<HTMLElement | null>(null)
const dropdownStyle = reactive({ top: '0px', left: '0px' })

function getMenuList(): MenuItem[] {
  return (props.menuList || props.items || []) as MenuItem[]
}

function getTitle(item: MenuItem) {
  return (item as any).title || (item as any).label || ''
}

function handleSelect(item: MenuItem) {
  emit('select', item.value)
  emit('select-item', { value: item.value, item })
  open.value = false
}

function toggle() {
  open.value = !open.value
  if (open.value) positionDropdown()
}

function positionDropdown() {
  nextTick(() => {
    const btn = trigger.value
    if (!btn) return

    const rect = btn.getBoundingClientRect()
    dropdownStyle.top = `${rect.bottom + window.scrollY + 4}px`
    dropdownStyle.left = `${rect.right - 176}px` // 176 = dropdown width (w-44)
  })
}

function onDocumentClick(e: MouseEvent) {
  if (!root.value) return
  if (!root.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>
