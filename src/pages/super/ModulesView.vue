<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface Module {
  id: number | string
  name: string
  label?: string
  description?: string
  icon?: string
  tenant_count?: number
  adoption?: number
  enabled_tenants?: any[]
}

const loading = ref(false)
const modules = ref<Module[]>([])

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/super/modules')
    modules.value = Array.isArray(data) ? data : (data.data ?? [])
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mod-page">
    <div v-if="loading" class="sa-empty">Loading modules…</div>
    <div v-else-if="!modules.length" class="sa-empty">No modules found.</div>
    <div v-else class="mod-grid">
      <div
        v-for="(mod, i) in modules"
        :key="mod.id"
        class="mod-card"
        :style="{ '--i': i }"
      >
        <div class="mc-icon">{{ mod.icon ?? '🧩' }}</div>
        <div class="mc-name">{{ mod.label ?? mod.name }}</div>
        <div class="mc-desc">{{ mod.description ?? '' }}</div>

        <div class="mc-stats">
          <div class="ms">
            <div class="ms-v">{{ mod.tenant_count ?? 0 }}</div>
            <div class="ms-l">Tenants enabled</div>
          </div>
          <div class="ms">
            <div class="ms-v">{{ mod.adoption ?? 0 }}%</div>
            <div class="ms-l">Adoption</div>
          </div>
        </div>

        <div v-if="mod.enabled_tenants?.length" class="mc-tenants">
          <div class="mt-title">Enabled for:</div>
          <div class="mt-list">
            <div v-for="t in (mod.enabled_tenants ?? []).slice(0, 3)" :key="t.id" class="mt-item">
              {{ t.name }}
            </div>
            <div v-if="(mod.enabled_tenants?.length ?? 0) > 3" class="mt-more">
              +{{ (mod.enabled_tenants?.length ?? 0) - 3 }} more
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mod-page { display: flex; flex-direction: column; gap: 16px; }
.sa-empty { padding: 48px; text-align: center; color: #6B7280; font-size: 13px; }

.mod-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.mod-card {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 20px;
  display: flex; flex-direction: column; gap: 12px;
  animation: fadeUp .4s ease calc(var(--i, 0) * .06s) both;
}
.mc-icon { font-size: 28px; }
.mc-name { font-weight: 600; font-size: 15px; color: #E8EAF0; }
.mc-desc { font-size: 12px; color: #6B7280; }

.mc-stats {
  display: grid; grid-template-columns: 1fr 1fr;
  background: rgba(255,255,255,.03); border-radius: 8px; overflow: hidden;
}
.ms { padding: 10px; text-align: center; border-right: 1px solid rgba(255,255,255,.05); }
.ms:last-child { border-right: none; }
.ms-v { font-size: 18px; font-weight: 700; color: #4F7EFF; line-height: 1; }
.ms-l { font-size: 10px; color: #6B7280; margin-top: 2px; }

.mc-tenants { border-top: 1px solid rgba(255,255,255,.06); padding-top: 10px; }
.mt-title { font-size: 10px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
.mt-list { display: flex; flex-direction: column; gap: 3px; }
.mt-item { font-size: 12px; color: #9CA3AF; }
.mt-more { font-size: 11px; color: #6B7280; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
