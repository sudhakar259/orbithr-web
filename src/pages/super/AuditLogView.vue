<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

interface LogEntry {
  id: number | string
  action?: string
  event?: string
  description?: string
  user?: string
  user_name?: string
  user_email?: string
  target?: string
  ip?: string
  ip_address?: string
  created_at?: string
  severity?: 'info' | 'warning' | 'critical'
}

const loading = ref(false)
const logs    = ref<LogEntry[]>([])
const search  = ref('')
const sevF    = ref('')

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/super/audit-logs', {
      params: { per_page: 100, search: search.value || undefined },
    })
    logs.value = Array.isArray(data) ? data : (data.data ?? [])
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filtered = computed(() => {
  let list = logs.value
  if (sevF.value) list = list.filter(l => (l.severity ?? 'info') === sevF.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(l =>
      [l.action, l.event, l.description, l.user_name, l.user_email, l.target].some(v =>
        String(v ?? '').toLowerCase().includes(q),
      ),
    )
  }
  return list
})

const severityColor = (s?: string) => ({
  info: '#4F7EFF', warning: '#F9A825', critical: '#FF6B6B',
}[s ?? 'info'] ?? '#4F7EFF')

const severityBg = (s?: string) => ({
  info: 'rgba(79,126,255,.15)', warning: 'rgba(249,168,37,.15)', critical: 'rgba(255,107,107,.15)',
}[s ?? 'info'] ?? 'rgba(79,126,255,.15)')
</script>

<template>
  <div class="audit-page">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-box">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="color:#6B7280;flex-shrink:0">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
        </svg>
        <input v-model="search" placeholder="Search logs…" @input="load" />
      </div>
      <select v-model="sevF" class="sel">
        <option value="">All severities</option>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="critical">Critical</option>
      </select>
    </div>

    <!-- Log list -->
    <div class="sa-card">
      <div class="sa-card-head">
        <div class="sa-card-title">Audit Log <span class="ct-count">{{ filtered.length }}</span></div>
      </div>
      <div v-if="loading" class="sa-empty">Loading logs…</div>
      <div v-else-if="!filtered.length" class="sa-empty">No audit log entries found.</div>
      <table v-else class="sa-table">
        <thead>
          <tr><th>Time</th><th>Event</th><th>User</th><th>Target</th><th>IP</th><th>Severity</th></tr>
        </thead>
        <tbody>
          <tr v-for="entry in filtered" :key="entry.id">
            <td class="dim sm mono">
              {{ entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—' }}
            </td>
            <td>
              <div class="ev-text">{{ entry.action ?? entry.event ?? '—' }}</div>
              <div v-if="entry.description" class="ev-desc">{{ entry.description }}</div>
            </td>
            <td class="dim sm">{{ entry.user_name ?? entry.user ?? '—' }}</td>
            <td class="dim sm">{{ entry.target ?? '—' }}</td>
            <td class="dim sm mono">{{ entry.ip ?? entry.ip_address ?? '—' }}</td>
            <td>
              <span
                class="sev-pill"
                :style="{ color: severityColor(entry.severity), background: severityBg(entry.severity) }"
              >
                {{ entry.severity ?? 'info' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.audit-page { display: flex; flex-direction: column; gap: 16px; }

.toolbar { display: flex; align-items: center; gap: 10px; }
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 8px 12px; flex: 1; max-width: 360px; transition: border-color .15s;
}
.search-box:focus-within { border-color: #4F7EFF; }
.search-box input { background: none; border: none; outline: none; color: #E8EAF0; font-size: 13px; font-family: inherit; width: 100%; }
.search-box input::placeholder { color: #6B7280; }

.sel {
  background: #0D0F1A; border: 1px solid rgba(255,255,255,.1); border-radius: 8px;
  color: #9CA3AF; font-size: 12px; font-family: inherit; padding: 8px 12px; cursor: pointer; outline: none;
}

.sa-card { background: #0D0F1A; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; overflow: hidden; }
.sa-card-head { display: flex; align-items: center; gap: 8px; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
.sa-card-title { font-weight: 600; font-size: 15px; color: #E8EAF0; display: flex; align-items: center; gap: 8px; }
.ct-count { background: rgba(79,126,255,.2); color: #4F7EFF; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
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
.dim { color: #9CA3AF; } .sm { font-size: 12px; } .mono { font-family: monospace; }

.ev-text { font-weight: 500; font-size: 13px; }
.ev-desc { font-size: 11px; color: #6B7280; margin-top: 2px; }

.sev-pill { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
</style>
