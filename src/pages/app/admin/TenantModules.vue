<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { tenantModuleApi } from '@/services/api'

interface TenantModuleItem {
  id: number
  name: string
  enabled: boolean
}

const route = useRoute()
const loading = ref(false)
const items = ref<TenantModuleItem[]>([])
const message = ref('')

const coreModules = ['users', 'roles', 'permissions', 'language', 'setting']

async function load() {
  loading.value = true
  try {
    const params: any = {}
    if (route.query.tenant_id) params.tenant_id = String(route.query.tenant_id)
    const { data } = await tenantModuleApi.list(params)
    items.value = (Array.isArray(data) ? data : (data.data || [])).map((m: any) => ({ id: m.id, name: m.name, enabled: !!m.enabled }))
  } catch (err: any) {
    message.value = err?.response?.data?.message || 'Failed to load modules.'
    setTimeout(() => (message.value = ''), 4000)
  } finally {
    loading.value = false
  }
}

async function toggle(item: TenantModuleItem) {
  const original = item.enabled
  item.enabled = !original
  try {
    const params: any = { enabled: item.enabled }
    if (route.query.tenant_id) params.tenant_id = String(route.query.tenant_id)
    await tenantModuleApi.update(item.id, params)
    message.value = 'Updated'
  } catch (err: any) {
    item.enabled = original
    message.value = err?.response?.data?.message || 'Failed to update'
  }
  setTimeout(() => (message.value = ''), 3000)
}

onMounted(load)
</script>

<template>
  <section class="space-y-6 p-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Tenant Modules</h1>
        <p class="mt-1 text-slate-600">Enable or disable modules for your tenant. Core modules cannot be disabled.</p>
      </div>
    </div>

    <div v-if="message" class="text-sm text-indigo-700 bg-indigo-50 rounded px-3 py-2">{{ message }}</div>

    <div class="bg-white border rounded shadow-sm">
      <div v-if="loading" class="p-6 text-slate-500">Loading modules...</div>
      <ul v-else class="divide-y">
        <li v-for="m in items" :key="m.id" class="flex items-center justify-between px-4 py-3">
          <div>
            <div class="font-medium text-slate-900">{{ m.name }}</div>
            <div class="text-sm text-slate-500">{{ coreModules.includes(m.name.toLowerCase()) ? 'Core module' : 'Optional module' }}</div>
          </div>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" :checked="m.enabled" :disabled="coreModules.includes(m.name.toLowerCase())" @change="() => toggle(m)" class="h-5 w-5" />
            </label>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
