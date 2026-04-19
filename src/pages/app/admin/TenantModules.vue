<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { tenantModuleApi } from '@/services/api'

interface TenantModuleItem {
  id: number
  name: string
  slug: string
  is_core: boolean
  enabled: boolean
}

const route = useRoute()
const loading = ref(false)
const items = ref<TenantModuleItem[]>([])
const message = ref('')

async function load() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (route.query.tenant_id) params.tenant_id = String(route.query.tenant_id)
    const { data } = await tenantModuleApi.list(params)
    items.value = (Array.isArray(data) ? data : (data.data || [])).map((m: TenantModuleItem) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      is_core: !!m.is_core,
      enabled: !!m.enabled,
    }))
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    message.value = e?.response?.data?.message || 'Failed to load modules.'
    setTimeout(() => (message.value = ''), 4000)
  } finally {
    loading.value = false
  }
}

async function toggle(item: TenantModuleItem) {
  const original = item.enabled
  item.enabled = !original
  try {
    const params: { enabled: boolean; tenant_id?: string } = { enabled: item.enabled }
    if (route.query.tenant_id) params.tenant_id = String(route.query.tenant_id)
    await tenantModuleApi.update(item.id, params)
    message.value = 'Updated'
  } catch (err: unknown) {
    item.enabled = original
    const e = err as { response?: { data?: { message?: string } } }
    message.value = e?.response?.data?.message || 'Failed to update'
  }
  setTimeout(() => (message.value = ''), 3000)
}

onMounted(load)
</script>

<template>
  <section class="modules-page">
    <p class="modules-hint">Enable or disable modules for this tenant. Core modules cannot be disabled.</p>

    <div v-if="message" class="modules-msg">{{ message }}</div>

    <div class="modules-card">
      <div v-if="loading" class="modules-loading">Loading modules…</div>
      <ul v-else class="modules-list">
        <li v-for="m in items" :key="m.id" class="module-row">
          <div class="module-info">
            <span class="module-name">{{ m.name }}</span>
            <span :class="['module-badge', m.is_core ? 'module-badge--core' : 'module-badge--optional']">
              {{ m.is_core ? 'Core' : 'Optional' }}
            </span>
          </div>
          <label class="toggle-wrap" :class="{ 'toggle-wrap--disabled': m.is_core }">
            <input type="checkbox" :checked="m.enabled" :disabled="m.is_core" @change="() => toggle(m)" class="toggle-input" />
            <span class="toggle-track" :class="{ 'toggle-track--on': m.enabled }">
              <span class="toggle-thumb" />
            </span>
          </label>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.modules-page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modules-hint {
  font-size: 0.85rem;
  color: var(--muted);
}

.modules-msg {
  font-size: 0.85rem;
  background: var(--surface2);
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.modules-card {
  background: var(--surface);
  border: 1px solid var(--border-hi);
  border-radius: var(--r);
  overflow: hidden;
}

.modules-loading {
  padding: 1.5rem;
  color: var(--muted);
  font-size: 0.875rem;
}

.modules-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.module-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.module-row:last-child { border-bottom: none; }

.module-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.module-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text);
}

.module-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}
.module-badge--core     { background: rgba(79,126,255,0.15); color: var(--accent); }
.module-badge--optional { background: rgba(107,114,128,0.15); color: var(--muted); }

/* Toggle switch */
.toggle-wrap { display: flex; align-items: center; cursor: pointer; }
.toggle-wrap--disabled { opacity: 0.45; cursor: not-allowed; }
.toggle-input { position: absolute; opacity: 0; width: 0; height: 0; }

.toggle-track {
  position: relative;
  width: 2.5rem;
  height: 1.35rem;
  background: var(--surface3);
  border: 1px solid var(--border-hi);
  border-radius: 999px;
  transition: background 0.2s, border-color 0.2s;
}
.toggle-track--on {
  background: var(--accent);
  border-color: var(--accent);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1rem;
  height: 1rem;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.toggle-track--on .toggle-thumb { transform: translateX(1.1rem); }
</style>
