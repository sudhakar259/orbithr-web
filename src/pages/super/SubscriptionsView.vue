<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface Plan {
  id: string | number
  name: string
  price: number
  description?: string
  max_employees?: number
  tenant_count?: number
  color?: string
}

interface SubItem {
  id: number
  tenant_name?: string
  plan_name?: string
  status?: string
  started_at?: string
  ends_at?: string
  amount?: number
}

const plans  = ref<Plan[]>([])
const subs   = ref<SubItem[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const [plansRes, subsRes] = await Promise.allSettled([
      api.get('/super/plans'),
      api.get('/super/subscriptions', { params: { per_page: 50 } }),
    ])
    if (plansRes.status === 'fulfilled') {
      const d = plansRes.value.data
      plans.value = Array.isArray(d) ? d : (d.data ?? [])
    }
    if (subsRes.status === 'fulfilled') {
      const d = subsRes.value.data
      subs.value = Array.isArray(d) ? d : (d.data ?? [])
    }
  } finally {
    loading.value = false
  }
}

onMounted(load)

const planColor = (name?: string) => ({
  starter: '#36D399', growth: '#4F7EFF', enterprise: '#9B6EFF',
}[(name ?? '').toLowerCase()] ?? '#4F7EFF')

const statusColor = (s?: string) => ({
  active: '#36D399', cancelled: '#FF6B6B', expired: '#F9A825',
}[s?.toLowerCase() ?? ''] ?? '#9CA3AF')
</script>

<template>
  <div class="subs-page">
    <!-- Plan cards -->
    <div v-if="plans.length" class="plan-grid">
      <div v-for="plan in plans" :key="plan.id" class="plan-card">
        <div class="plan-badge" :style="{ color: planColor(plan.name), background: planColor(plan.name) + '22' }">
          {{ plan.name }}
        </div>
        <div class="plan-price">₹{{ Number(plan.price ?? 0).toLocaleString() }}<span>/mo</span></div>
        <div class="plan-desc">{{ plan.description ?? '' }}</div>
        <div class="plan-meta">
          <span>Up to {{ plan.max_employees ?? '∞' }} employees</span>
          <span class="plan-count" :style="{ color: planColor(plan.name) }">{{ plan.tenant_count ?? 0 }} tenants</span>
        </div>
      </div>
    </div>

    <!-- Subscriptions table -->
    <div class="sa-card">
      <div class="sa-card-head">
        <div class="sa-card-title">Active Subscriptions</div>
      </div>
      <div v-if="loading" class="sa-empty">Loading subscriptions…</div>
      <div v-else-if="!subs.length" class="sa-empty">No subscriptions found.</div>
      <table v-else class="sa-table">
        <thead>
          <tr><th>Tenant</th><th>Plan</th><th>Status</th><th>Amount</th><th>Starts</th><th>Ends</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in subs" :key="s.id">
            <td>{{ s.tenant_name ?? '—' }}</td>
            <td>
              <span class="pill" :style="{ color: planColor(s.plan_name), background: planColor(s.plan_name) + '22' }">
                {{ s.plan_name ?? '—' }}
              </span>
            </td>
            <td>
              <span class="pill" :style="{ color: statusColor(s.status), background: statusColor(s.status) + '22' }">
                {{ s.status ?? '—' }}
              </span>
            </td>
            <td class="mono">{{ s.amount ? '₹' + Number(s.amount).toLocaleString() : '—' }}</td>
            <td class="dim sm">{{ s.started_at ? new Date(s.started_at).toLocaleDateString() : '—' }}</td>
            <td class="dim sm">{{ s.ends_at ? new Date(s.ends_at).toLocaleDateString() : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.subs-page { display: flex; flex-direction: column; gap: 18px; }

.plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.plan-card {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.07);
  border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 10px;
}
.plan-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: capitalize; width: fit-content; }
.plan-price { font-size: 28px; font-weight: 700; color: #E8EAF0; }
.plan-price span { font-size: 14px; color: #6B7280; font-weight: 400; }
.plan-desc { font-size: 12px; color: #6B7280; }
.plan-meta { display: flex; justify-content: space-between; font-size: 12px; color: #9CA3AF; }
.plan-count { font-weight: 600; }

.sa-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
.sa-card-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
.sa-card-title { font-weight: 600; font-size: 15px; color: #E8EAF0; }
.sa-empty { padding: 28px; text-align: center; color: #6B7280; font-size: 13px; }

.sa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sa-table thead th {
  text-align: left; padding: 9px 14px; font-size: 10px; font-weight: 600;
  letter-spacing: .7px; text-transform: uppercase; color: #6B7280;
  background: rgba(255,255,255,.02); border-bottom: 1px solid rgba(255,255,255,.06);
}
.sa-table tbody tr { border-bottom: 1px solid rgba(255,255,255,.04); transition: background .1s; }
.sa-table tbody tr:last-child { border-bottom: none; }
.sa-table tbody tr:hover { background: rgba(79,126,255,.04); }
.sa-table td { padding: 10px 14px; vertical-align: middle; color: #E8EAF0; }
.dim { color: #9CA3AF; } .sm { font-size: 12px; } .mono { font-family: monospace; font-size: 12px; }

.pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
</style>
