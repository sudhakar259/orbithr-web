<template>
  <div class="space-y-4">
    <!-- Banner -->
    <div
      v-if="banner"
      class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
    >
      Static preview mode using sample data. Changes won’t persist.
    </div>

    <!-- Zoom + Legend -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3 text-xs text-slate-600">
        <span class="inline-flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded bg-emerald-600 ring-1 ring-emerald-400/40"></span> Manager</span>
        <span class="inline-flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded bg-sky-600 ring-1 ring-sky-400/40"></span> Team Lead</span>
        <span class="inline-flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded bg-indigo-500 ring-1 ring-indigo-400/40"></span> Individual</span>
      </div>
      <div class="flex items-center justify-end gap-2">
        <div class="inline-flex overflow-hidden rounded-md border border-slate-200">
          <button
            class="px-2 py-1 text-xs hover:bg-slate-50"
            @click="zoomOut"
            aria-label="Zoom out"
          >-</button>
          <div class="px-2 py-1 text-xs border-x border-slate-200">
            {{ (zoom * 100).toFixed(0) }}%
          </div>
          <button
            class="px-2 py-1 text-xs hover:bg-slate-50"
            @click="zoomIn"
            aria-label="Zoom in"
          >+</button>
        </div>
        <button
          class="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
          @click="reset"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Chart Container -->
    <div
      ref="containerEl"
      class="relative overflow-auto rounded-lg border border-slate-200 bg-white p-4 sm:p-6"
      :style="{ minHeight: '420px' }"
    >
      <div
        ref="contentEl"
        class="origin-top-left inline-block"
        :style="{ transform: `scale(${zoom})`, transformOrigin: '0 0' }"
      >
        <ChartNode :node="filteredTree" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, defineComponent, h } from "vue";

type Node = {
  id: number | string;
  name: string;
  title?: string;
  children?: Node[];
};

const props = withDefaults(
  defineProps<{
    nodes?: Node;
    search?: string;
    banner?: boolean;
    autoFit?: boolean;
  }>(),
  {
    banner: false,
    autoFit: true,
  }
);

const zoom = ref(1);
const userZoomed = ref(false);
const containerEl = ref<HTMLElement | null>(null);
const contentEl = ref<HTMLElement | null>(null);

function zoomIn() {
  userZoomed.value = true;
  zoom.value = Math.min(2, +(zoom.value + 0.1).toFixed(2));
}
function zoomOut() {
  userZoomed.value = true;
  zoom.value = Math.max(0.5, +(zoom.value - 0.1).toFixed(2));
}
function reset() {
  userZoomed.value = false;
  zoom.value = 1;
  fitToWidth();
}

function fitToWidth() {
  if (!props.autoFit || userZoomed.value) return;
  const c = containerEl.value;
  const i = contentEl.value;
  if (!c || !i) return;
  const natural = i.offsetWidth / (zoom.value || 1);
  if (natural > 0) {
    const next = Math.min(1, Math.max(0.5, c.clientWidth / natural));
    zoom.value = +next.toFixed(2);
  }
}

const sample: Node = {
  id: 1000,
  name: "Neeraj Pandey",
  title: "Engineering Manager — Pandey Team",
  children: [
    {
      id: 1100,
      name: "Kavya Iyer",
      title: "Team Lead — Beta",
      children: [
        { id: 1101, name: "Ritika Jain", title: "Engineer" },
        { id: 1102, name: "Aman Gupta", title: "Engineer" },
        { id: 1103, name: "Priyank Arora", title: "Engineer" },
        { id: 1104, name: "Nidhi Kulkarni", title: "Engineer" },
        { id: 1105, name: "Saurabh Yadav", title: "Engineer" },
        { id: 1106, name: "Shreya Nambiar", title: "Engineer" },
        { id: 1107, name: "Harsh Vardhan", title: "Engineer" },
        { id: 1108, name: "Aditya Joshi", title: "Engineer" },
        { id: 1109, name: "Sneha Rao", title: "Engineer" },
        { id: 1110, name: "Varun Khanna", title: "Engineer" },
        { id: 1111, name: "Isha Kapoor", title: "Engineer" },
        { id: 1112, name: "Mohit Sharma", title: "Engineer" },
        { id: 1113, name: "Poonam Sinha", title: "Engineer" },
        { id: 1114, name: "Dev Patel", title: "Engineer" },
        { id: 1115, name: "Ananya Roy", title: "Engineer" }
      ]
    },
    {
      id: 1200,
      name: "Rajesh Kumar",
      title: "Team Lead — Ops",
      children: [
        { id: 1201, name: "Pooja Shah", title: "Support Exec" },
        { id: 1202, name: "Arjun Malhotra", title: "Support Exec" },
        { id: 1203, name: "Neha Kulkarni", title: "Support Exec" },
        { id: 1204, name: "Ravi Deshmukh", title: "Support Exec" },
        { id: 1205, name: "Isha Nair", title: "Support Exec" },
        { id: 1206, name: "Karan Mehta", title: "Support Exec" },
        { id: 1207, name: "Sandeep Rao", title: "Support Exec" },
        { id: 1208, name: "Jyoti Singh", title: "Support Exec" },
        { id: 1209, name: "Manish Verma", title: "Support Exec" },
        { id: 1210, name: "Kavita Bansal", title: "Support Exec" },
        { id: 1211, name: "Rohit Saini", title: "Support Exec" },
        { id: 1212, name: "Alok Tripathi", title: "Support Exec" },
        { id: 1213, name: "Tanya Oberoi", title: "Support Exec" },
        { id: 1214, name: "Deepa Nair", title: "Support Exec" },
        { id: 1215, name: "Vivek Mishra", title: "Support Exec" },
        { id: 1216, name: "Shweta Jain", title: "Support Exec" },
        { id: 1217, name: "Nikhil Kapoor", title: "Support Exec" },
        { id: 1218, name: "Rashi Gupta", title: "Support Exec" },
        { id: 1219, name: "Parth Soni", title: "Support Exec" },
        { id: 1220, name: "Meenal Joshi", title: "Support Exec" }
      ]
    }
  ]
};

function matches(n: Node, q: string) {
  const t = `${n.name} ${n.title ?? ""}`.toLowerCase();
  return t.includes(q);
}

function filterTree(root: Node, q: string): Node | null {
  if (!q) return root;
  const children = (root.children || [])
    .map((c) => filterTree(c, q))
    .filter((c) => c !== null) as Node[];
  const self = matches(root, q);
  if (self || children.length) return { ...root, children };
  return null;
}

const filteredTree = computed(() => {
  const tree = props.nodes ?? sample;
  const q = (props.search || "").trim().toLowerCase();
  const f = filterTree(tree, q);
  return f || { id: "empty", name: "No matches", title: "" };
});

let ro: ResizeObserver | null = null;
onMounted(() => {
  fitToWidth();
  ro = new ResizeObserver(() => fitToWidth());
  if (containerEl.value) ro.observe(containerEl.value);
});

onBeforeUnmount(() => {
  if (ro && containerEl.value) ro.unobserve(containerEl.value);
});

watch(() => props.nodes, () => {
  userZoomed.value = false;
  fitToWidth();
});
watch(() => props.search, () => {
  userZoomed.value = false;
  fitToWidth();
});
const Box = (props: { name: string; title?: string; count?: number }) => {
  const role = (props.title || '').toLowerCase();
  const isManager = role.includes('manager');
  const isLead = role.includes('lead');
  const colors = isManager
    ? { bg: 'bg-emerald-600', ring: 'ring-emerald-400/40' }
    : isLead
    ? { bg: 'bg-sky-600', ring: 'ring-sky-400/40' }
    : { bg: 'bg-indigo-500', ring: 'ring-indigo-400/40' };

  return h(
    'div',
    {
      class: `relative w-28 sm:w-36 rounded-lg ${colors.bg} px-2.5 sm:px-3 py-2 text-center text-white shadow-soft ring-1 ${colors.ring}`,
    },
    [
      props.count && props.count > 0
        ? h(
            'span',
            {
              class:
                'absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[10px] font-semibold bg-white text-slate-700 border border-slate-200 shadow',
            },
            String(props.count)
          )
        : null,
      h('div', { class: 'text-[13px] sm:text-sm font-semibold leading-tight' }, props.name),
      props.title ? h('div', { class: 'mt-0.5 text-[10px] sm:text-[11px] opacity-90' }, props.title) : null,
    ]
  );
}

const Connector = () =>
  h("div", { class: "mx-auto h-4 w-[2px] bg-slate-400/70" });

const ChartNode = defineComponent<{ node: any }>({
  name: "ChartNode",
  props: { node: { type: Object, required: true } },
  setup(props) {
    const expanded = ref(false);
    const children = computed(() =>
      Array.isArray(props.node.children) ? props.node.children : []
    );
    const visibleChildren = computed(() =>
      expanded.value ? children.value : children.value.slice(0, 2)
    );
    const hiddenCount = computed(() =>
      Math.max(0, children.value.length - visibleChildren.value.length)
    );

    function toggleExpand() {
      if (children.value.length > 2) expanded.value = !expanded.value;
    }

    return () =>
      h("div", { class: "inline-block text-center" }, [
        h(
          "button",
          {
            class: "focus:outline-none",
            onClick: toggleExpand,
            title: hiddenCount.value
              ? `Show ${hiddenCount.value} more`
              : "",
          },
          [Box({ name: props.node.name, title: props.node.title, count: children.value.length })]
        ),
        children.value.length
          ? h("div", { class: "mt-3" }, [
              Connector(),
              h(
                "div",
                {
                  class:
                    "mt-0 pt-3 relative after:content-[''] after:absolute after:top-0 after:left-0 after:right-0 after:h-[2px] after:bg-slate-400/60 flex flex-wrap items-start justify-center gap-3 sm:gap-6 max-w-full",
                },
                [
                  ...visibleChildren.value.map(
                    (c: any, idx: number) =>
                      h("div", { class: "relative pt-3" }, [
                        h("span", {
                          class:
                            "absolute top-0 left-1/2 -translate-x-1/2 h-3 w-[2px] bg-slate-400/70",
                        }),
                        h("span", {
                          class:
                            "absolute top-3 left-1/2 -translate-x-1/2 h-[2px] bg-slate-400/70",
                          style: {
                            width: idx % 2 === 0 ? "10px" : "26px",
                          },
                        }),
                        h(ChartNode as any, { node: c }),
                      ])
                  ),
                  hiddenCount.value
                    ? h(
                        "button",
                        {
                          class:
                            "relative pt-3 text-xs text-slate-600 underline focus:outline-none before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:h-3 before:w-[2px] before:bg-slate-400/70 before:content-['']",
                          onClick: () => (expanded.value = true),
                        },
                        `+${hiddenCount.value} more`
                      )
                    : null,
                ]
              ),
            ])
          : null,
      ]);
  },
});

</script>
