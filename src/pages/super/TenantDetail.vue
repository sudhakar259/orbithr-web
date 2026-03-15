<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route  = useRoute()
const router = useRouter()
const id     = route.params.id as string

const tenant  = ref<any>(null)
const loading = ref(true)
const tab     = ref<'overview' | 'modules' | 'admins' | 'billing'>('overview')

async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/super/tenants/${id}`)
    tenant.value = data.data ?? data
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function toggleModule(mod: any) {
  const newState = !mod.enabled
  try {
    await api.patch(`/super/tenants/${id}/modules/${mod.id}`, { enabled: newState })
    mod.enabled = newState
  } catch {}
}

async function toggleTenantStatus() {
  if (!tenant.value) return
  const newStatus = tenant.value.status === 'active' ? 'suspended' : 'active'
  try {
    await api.patch(`/super/tenants/${id}`, { status: newStatus })
    tenant.value.status = newStatus
  } catch {}
}

const statusColor = (s?: string) => ({
  active: '#36D399', trial: '#F9A825', suspended: '#FF6B6B', inactive: '#6B7280',
}[s?.toLowerCase() ?? ''] ?? '#9CA3AF')

const planColor = (p?: string) => ({
  starter: '#36D399', growth: '#4F7EFF', enterprise: '#9B6EFF',
}[p?.toLowerCase() ?? ''] ?? '#9CA3AF')
</script>

<template>
  <div class="tenant-detail">
    <button class="back-btn" @click="router.back()">← Back to Tenants</button>

    <div v-if="loading" class="sa-empty">Loading tenant…</div>
    <template v-else-if="tenant">
      <!-- Header -->
      <div class="td-header">
        <div class="td-brand">
          <div class="td-av">{{ (tenant.name ?? '?')[0].toUpperCase() }}</div>
          <div>
            <div class="td-name">{{ tenant.name }}</div>
            <div class="td-email">{{ tenant.email }}</div>
          </div>
        </div>
        <div class="td-meta">
          <span class="pill" :style="{ color: planColor(tenant.plan), background: planColor(tenant.plan) + '22' }">
            {{ tenant.plan ?? '—' }}
          </span>
          <span class="pill" :style="{ color: statusColor(tenant.status), background: statusColor(tenant.status) + '22' }">
            {{ tenant.status ?? '—' }}
          </span>
          <button class="act-btn" @click="toggleTenantStatus">
            {{ tenant.status === 'active' ? 'Suspend' : 'Activate' }}
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button v-for="t in ['overview','modules','admins','billing']" :key="t"
          class="tab-btn" :class="{ active: tab === t }" @click="tab = t as any">
          {{ t.charAt(0).toUpperCase() + t.slice(1) }}
        </button>
      </div>

      <!-- Overview -->
      <div v-if="tab === 'overview'" class="info-grid">
        <div class="info-card">
          <div class="info-label">Domain</div>
          <div class="info-value mono">{{ tenant.domain ?? '—' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Industry</div>
          <div class="info-value">{{ tenant.industry ?? '—' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Location</div>
          <div class="info-value">{{ tenant.location ?? tenant.city ?? '—' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Employees</div>
          <div class="info-value" style="color:#4F7EFF">{{ tenant.employee_count ?? '—' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Created</div>
          <div class="info-value">{{ tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '—' }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Renews</div>
          <div class="info-value">{{ tenant.renews_at ? new Date(tenant.renews_at).toLocaleDateString() : '—' }}</div>
        </div>
      </div>

      <!-- Modules -->
      <div v-else-if="tab === 'modules'" class="mod-grid">
        <div v-if="!tenant.modules?.length" class="sa-empty">No module data available.</div>
        <div v-for="mod in tenant.modules" :key="mod.id ?? mod.name" class="mod-card">
          <div class="mc-top">
            <div class="mc-name">{{ mod.label ?? mod.name }}</div>
            <button class="toggle-btn" :class="{ on: mod.enabled ?? mod.is_active }" @click="toggleModule(mod)">
              {{ (mod.enabled ?? mod.is_active) ? 'Enabled' : 'Disabled' }}
            </button>
          </div>
          <div class="mc-desc">{{ mod.description ?? '' }}</div>
        </div>
      </div>

      <!-- Admins -->
      <div v-else-if="tab === 'admins'" class="sa-card">
        <div v-if="!tenant.admins?.length" class="sa-empty">No admin users found.</div>
        <table v-else class="sa-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="a in tenant.admins" :key="a.id">
              <td>{{ a.name }}</td>
              <td class="dim">{{ a.email }}</td>
              <td class="dim">{{ a.role }}</td>
              <td>
                <span class="pill" :style="{ color: statusColor(a.status), background: statusColor(a.status) + '22' }">
                  {{ a.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Billing -->
      <div v-else-if="tab === 'billing'" class="sa-card">
        <div v-if="!tenant.invoices?.length" class="sa-empty">No invoices found.</div>
        <table v-else class="sa-table">
          <thead><tr><th>Invoice</th><th>Period</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="inv in tenant.invoices" :key="inv.id">
              <td class="mono dim">{{ inv.id }}</td>
              <td class="dim">{{ inv.period ?? inv.description }}</td>
              <td class="mono">₹{{ Number(inv.amount ?? 0).toLocaleString() }}</td>
              <td class="dim sm">{{ inv.date ?? (inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—') }}</td>
              <td>
                <span class="pill" :style="{ color: statusColor(inv.status), background: statusColor(inv.status) + '22' }">
                  {{ inv.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-else class="sa-empty">Tenant not found.</div>
  </div>
</template>

<style scoped>
.tenant-detail { display: flex; flex-direction: column; gap: 18px; }

.back-btn {
  background: none; border: none; color: #6B7280; font-size: 13px; cursor: pointer;
  font-family: inherit; padding: 0; align-self: flex-start; transition: color .14s;
}
.back-btn:hover { color: #4F7EFF; }

.td-header {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 14px;
  padding: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.td-brand { display: flex; align-items: center; gap: 14px; }
.td-av {
  width: 48px; height: 48px; border-radius: 12px; background: #4F7EFF;
  display: grid; place-items: center; font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.td-name { font-size: 18px; font-weight: 700; color: #E8EAF0; }
.td-email { font-size: 13px; color: #6B7280; }
.td-meta { display: flex; align-items: center; gap: 8px; }

.tabs { display: flex; gap: 4px; background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 10px; padding: 4px; width: fit-content; }
.tab-btn {
  padding: 7px 16px; border-radius: 7px; font-size: 13px; font-weight: 500;
  background: none; border: none; color: #6B7280; cursor: pointer; font-family: inherit; transition: all .14s;
}
.tab-btn.active { background: rgba(79,126,255,.15); color: #4F7EFF; }
.tab-btn:hover:not(.active) { color: #9CA3AF; }

.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.info-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 16px; }
.info-label { font-size: 10px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
.info-value { font-size: 15px; font-weight: 600; color: #E8EAF0; }
.mono { font-family: monospace; }

.mod-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.mod-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 16px; }
.mc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.mc-name { font-size: 14px; font-weight: 600; color: #E8EAF0; }
.mc-desc { font-size: 12px; color: #6B7280; }
.toggle-btn {
  padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
  background: rgba(255,107,107,.12); color: #FF6B6B;
  border: 1px solid rgba(255,107,107,.2); cursor: pointer; font-family: inherit; transition: all .14s;
}
.toggle-btn.on { background: rgba(54,211,153,.12); color: #36D399; border-color: rgba(54,211,153,.2); }

.sa-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
.sa-empty { padding: 28px; text-align: center; color: #6B7280; font-size: 13px; }

.sa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sa-table thead th {
  text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 600;
  letter-spacing: .7px; text-transform: uppercase; color: #6B7280;
  background: rgba(255,255,255,.02); border-bottom: 1px solid rgba(255,255,255,.06);
}
.sa-table tbody tr { border-bottom: 1px solid rgba(255,255,255,.04); }
.sa-table tbody tr:last-child { border-bottom: none; }
.sa-table td { padding: 10px 14px; vertical-align: middle; color: #E8EAF0; }
.dim { color: #9CA3AF; } .sm { font-size: 12px; }

.pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: capitalize; }

.act-btn {
  padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
  background: rgba(255,107,107,.12); color: #FF6B6B;
  border: 1px solid rgba(255,107,107,.2); cursor: pointer; font-family: inherit; transition: all .14s;
}
.act-btn:hover { background: rgba(255,107,107,.25); }
</style>
