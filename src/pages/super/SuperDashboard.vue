<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface Stats {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  suspended: number
  totalEmployees: number
  mrr: number
  pendingInvoices: number
}

const stats = ref<Stats>({
  totalTenants: 0, activeTenants: 0, trialTenants: 0,
  suspended: 0, totalEmployees: 0, mrr: 0, pendingInvoices: 0,
})
const recentTenants = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [statsRes, tenantsRes] = await Promise.allSettled([
      api.get('/super/stats'),
      api.get('/super/tenants', { params: { per_page: 5, sort: '-created_at' } }),
    ])
    if (statsRes.status === 'fulfilled') {
      const d = statsRes.value.data?.data ?? statsRes.value.data
      stats.value = { ...stats.value, ...d }
    }
    if (tenantsRes.status === 'fulfilled') {
      const d = tenantsRes.value.data
      recentTenants.value = Array.isArray(d) ? d.slice(0, 5) : (d.data ?? []).slice(0, 5)
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)

const statusColor = (s: string) => ({
  active: '#36D399', trial: '#F9A825', suspended: '#FF6B6B', inactive: '#6B7280',
}[s?.toLowerCase()] ?? '#9CA3AF')

const planColor = (p: string) => ({
  starter: '#36D399', growth: '#4F7EFF', enterprise: '#9B6EFF',
}[p?.toLowerCase()] ?? '#9CA3AF')
</script>

<template>
  <div class="sa-dash">
    <!-- KPI cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val" style="color:#4F7EFF">{{ stats.totalTenants }}</div>
        <div class="kpi-label">Total Tenants</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#36D399">{{ stats.activeTenants }}</div>
        <div class="kpi-label">Active</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#F9A825">{{ stats.trialTenants }}</div>
        <div class="kpi-label">On Trial</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#FF6B6B">{{ stats.suspended }}</div>
        <div class="kpi-label">Suspended</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#E8EAF0">{{ stats.totalEmployees.toLocaleString() }}</div>
        <div class="kpi-label">Total Employees</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#36D399">₹{{ stats.mrr.toLocaleString() }}</div>
        <div class="kpi-label">Monthly Revenue</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color:#FF6B6B">{{ stats.pendingInvoices }}</div>
        <div class="kpi-label">Pending Invoices</div>
      </div>
    </div>

    <!-- Recent Tenants -->
    <div class="sa-card">
      <div class="sa-card-head">
        <div class="sa-card-title">Recent Tenants</div>
        <RouterLink to="/super/tenants" class="sa-link">View all →</RouterLink>
      </div>
      <div v-if="loading" class="sa-empty">Loading…</div>
      <div v-else-if="!recentTenants.length" class="sa-empty">No tenants yet.</div>
      <table v-else class="sa-table">
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Employees</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in recentTenants" :key="t.id">
            <td>
              <div class="t-name-cell">
                <div class="t-av" :style="{ background: t.color ?? '#4F7EFF' }">
                  {{ (t.name ?? '?')[0] }}
                </div>
                <div>
                  <div class="t-name">{{ t.name }}</div>
                  <div class="t-email">{{ t.email }}</div>
                </div>
              </div>
            </td>
            <td>
              <span class="plan-pill" :style="{ color: planColor(t.plan), background: planColor(t.plan) + '22' }">
                {{ t.plan ?? '—' }}
              </span>
            </td>
            <td>
              <span class="status-dot" :style="{ color: statusColor(t.status), background: statusColor(t.status) + '22' }">
                {{ t.status ?? '—' }}
              </span>
            </td>
            <td class="dim">{{ t.employee_count ?? t.employeeCount ?? '—' }}</td>
            <td class="dim sm">{{ t.created_at ? new Date(t.created_at).toLocaleDateString() : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Quick links -->
    <div class="quick-grid">
      <RouterLink to="/super/tenants" class="quick-card">
        <div class="qc-icon">🏢</div>
        <div class="qc-label">Manage Tenants</div>
      </RouterLink>
      <RouterLink to="/super/billing" class="quick-card">
        <div class="qc-icon">💰</div>
        <div class="qc-label">Billing & Revenue</div>
      </RouterLink>
      <RouterLink to="/super/modules" class="quick-card">
        <div class="qc-icon">🧩</div>
        <div class="qc-label">Modules</div>
      </RouterLink>
      <RouterLink to="/super/audit" class="quick-card">
        <div class="qc-icon">📋</div>
        <div class="qc-label">Audit Log</div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.sa-dash { display: flex; flex-direction: column; gap: 20px; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.kpi-card {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 20px; text-align: center;
  animation: fadeUp .4s ease both;
}
.kpi-val { font-size: 26px; font-weight: 700; line-height: 1; margin-bottom: 6px; }
.kpi-label { font-size: 12px; color: #6B7280; }

.sa-card {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; overflow: hidden;
}
.sa-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06);
}
.sa-card-title { font-weight: 600; font-size: 15px; color: #E8EAF0; }
.sa-link { font-size: 12px; color: #4F7EFF; text-decoration: none; }
.sa-link:hover { text-decoration: underline; }
.sa-empty { padding: 24px; text-align: center; color: #6B7280; font-size: 13px; }

.sa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sa-table thead th {
  text-align: left; padding: 9px 14px;
  font-size: 10px; font-weight: 600; letter-spacing: .7px; text-transform: uppercase;
  color: #6B7280; background: rgba(255,255,255,.02); border-bottom: 1px solid rgba(255,255,255,.06);
}
.sa-table tbody tr { border-bottom: 1px solid rgba(255,255,255,.04); transition: background .1s; }
.sa-table tbody tr:last-child { border-bottom: none; }
.sa-table tbody tr:hover { background: rgba(79,126,255,.04); }
.sa-table td { padding: 10px 14px; vertical-align: middle; color: #E8EAF0; }
.dim { color: #9CA3AF; } .sm { font-size: 12px; }

.t-name-cell { display: flex; align-items: center; gap: 10px; }
.t-av { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
.t-name { font-weight: 500; font-size: 13px; }
.t-email { font-size: 11px; color: #6B7280; }

.plan-pill, .status-dot {
  display: inline-block; padding: 2px 8px; border-radius: 20px;
  font-size: 11px; font-weight: 600; text-transform: capitalize;
}

.quick-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.quick-card {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 20px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  text-decoration: none; transition: all .15s;
  animation: fadeUp .4s ease both;
}
.quick-card:hover { border-color: rgba(79,126,255,.3); background: rgba(79,126,255,.06); }
.qc-icon { font-size: 28px; }
.qc-label { font-size: 13px; font-weight: 500; color: #9CA3AF; text-align: center; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
