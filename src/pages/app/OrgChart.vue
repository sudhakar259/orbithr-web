<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import OrgChartComponent from '@/components/employee/OrgChart.vue'
import { getOrgChart, type OrgChartNode } from '@/services/employee'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const tree = ref<OrgChartNode | null>(null)
const search = ref('')

async function fetchChart() {
  loading.value = true
  error.value = ''
  try {
    tree.value = await getOrgChart()
  } catch {
    error.value = 'Failed to load org chart. Please try again.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchChart)
</script>

<template>
  <div class="org-page">
    <div class="org-header">
      <div>
        <button class="back-btn" @click="router.push({ name: 'employees' })">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="back-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <p class="org-subtitle">Visual hierarchy of your team</p>
      </div>
      <div class="org-actions">
        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="Search name or title…"
        />
        <button class="refresh-btn" :disabled="loading" @click="fetchChart">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="refresh-icon" :class="{ 'spin': loading }">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <div v-if="loading" class="state-box">
      <div class="spinner" />
      <p>Loading org chart…</p>
    </div>

    <div v-else-if="error" class="state-box state-box--error">
      <p>{{ error }}</p>
      <button class="refresh-btn" @click="fetchChart">Retry</button>
    </div>

    <div v-else-if="!tree" class="state-box">
      <p>No employees found.</p>
    </div>

    <OrgChartComponent
      v-else
      :nodes="tree"
      :search="search"
      :banner="false"
    />
  </div>
</template>

<style scoped>
.org-page {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.org-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-bottom: 0.25rem;
}
.back-btn:hover { color: var(--text); }
.back-icon { width: 1rem; height: 1rem; }

.org-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}
.org-subtitle {
  font-size: 0.85rem;
  color: var(--muted);
  margin: 0.1rem 0 0;
}

.org-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-input {
  background: var(--surface2);
  border: 1px solid var(--border-hi);
  border-radius: 0.5rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  color: var(--text);
  outline: none;
  width: 14rem;
}
.search-input::placeholder { color: var(--muted); }
.search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border-hi);
  border-radius: 0.5rem;
  background: var(--surface2);
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--dim);
}
.refresh-btn:hover { background: var(--surface3); color: var(--text); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-icon { width: 1rem; height: 1rem; }
.spin { animation: spin 1s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 200px;
  color: var(--muted);
  font-size: 0.9rem;
}
.state-box--error { color: var(--red); }

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--border-hi);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>
