<template>
  <div class="relative" @keydown.escape.stop="open = false">
    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-gray-50"
      @click="toggle()"
    >
      Menu
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 15l3.5-3.5 3.5 3.5" /></svg>
    </button>

    <div v-if="open" class="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
      <ul class="py-1.5 text-sm text-slate-700">
        <MenuItem
          v-for="(item, idx) in items"
          :key="idx"
          :item="item"
          @close="open = false"
        />
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineComponent } from 'vue'

export interface MenuItemType {
  label: string
  icon?: string
  action?: () => void
  children?: MenuItemType[]
}

interface Props {
  items: MenuItemType[]
}

const props = defineProps<Props>()
const open = ref(false)
function toggle() {
  open.value = !open.value
}

const MenuItem = defineComponent<{ item: MenuItemType }>({
  name: 'MenuItem',
  props: { item: { type: Object, required: true } },
  emits: ['close'],
  setup(props, { emit }) {
    const open = ref(false)
    function onClick() {
      if (props.item.children && props.item.children.length) {
        open.value = !open.value
      } else if (props.item.action) {
        props.item.action()
        emit('close')
      }
    }
    return { open, onClick }
  },
  template: `
    <li>
      <button class="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50" @click="onClick">
        <span class="flex items-center gap-2">
          <span v-if="item.icon" class="w-4 h-4" v-html="item.icon"></span>
          <span>{{ item.label }}</span>
        </span>
        <svg v-if="item.children?.length" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9l3.5 3.5 3.5-3.5" /></svg>
      </button>
      <ul v-if="item.children?.length && open" class="ml-3 border-l border-gray-100">
        <MenuItem v-for="(child, cIdx) in item.children" :key="cIdx" :item="child" @close="$emit('close')"/>
      </ul>
    </li>
  `,
})
</script>
