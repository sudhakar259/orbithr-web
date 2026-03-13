<template>
  <div class="inline-block text-center relative">
    <!-- Node -->
    <div class="flex flex-col items-center">
      <button
        class="focus:outline-none"
        @click="toggleExpand"
        :title="hiddenCount ? `Show ${hiddenCount} more` : ''"
      >
        <div
          class="w-28 sm:w-36 rounded-lg bg-indigo-500 px-3 py-2 text-center text-white shadow ring-1 ring-indigo-400/40"
        >
          <div class="text-[13px] sm:text-sm font-semibold leading-tight">
            {{ node.name }}
          </div>
          <div
            v-if="node.title"
            class="text-[10px] sm:text-[11px] opacity-90"
          >
            {{ node.title }}
          </div>
        </div>
      </button>
    </div>

    <!-- Connector down -->
    <div v-if="hasChildren" class="mx-auto h-4 w-px bg-slate-300"></div>

    <!-- Children -->
    <div
      v-if="hasChildren"
      class="flex flex-wrap items-start justify-center gap-6 relative"
    >
      <!-- Horizontal line connecting children -->
      <div
        class="absolute top-0 left-0 right-0 h-px bg-slate-300"
        style="top: 0.75rem"
      ></div>

      <!-- Each child -->
      <div
        v-for="(child, idx) in visibleChildren"
        :key="child.id"
        class="relative pt-3"
      >
        <!-- Vertical connector from parent -->
        <span
          class="absolute top-0 left-1/2 -translate-x-1/2 h-3 w-px bg-slate-300"
        ></span>

        <!-- Recursive -->
        <ChartNode :node="child" />
      </div>

      <!-- Hidden children indicator -->
      <button
        v-if="hiddenCount"
        @click="expanded = true"
        class="relative pt-3 text-xs text-slate-600 underline focus:outline-none"
      >
        +{{ hiddenCount }} more
        <span
          class="absolute top-0 left-1/2 -translate-x-1/2 h-3 w-px bg-slate-300"
        ></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

type Node = {
  id: number | string;
  name: string;
  title?: string;
  children?: Node[];
};

const props = defineProps<{ node: Node }>();

const expanded = ref(false);
const children = computed(() =>
  Array.isArray(props.node.children) ? props.node.children : []
);
const visibleChildren = computed(() =>
  expanded.value ? children.value : children.value.slice(0, 2)
);
const hiddenCount = computed(
  () => Math.max(0, children.value.length - visibleChildren.value.length)
);

const hasChildren = computed(() => children.value.length > 0);

function toggleExpand() {
  if (children.value.length > 2) {
    expanded.value = !expanded.value;
  }
}
</script>
