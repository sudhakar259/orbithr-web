<script setup lang="ts">
import { ref, onMounted } from 'vue'
import lndService from '@/services/lndService'
import type { Certification, EmployeeCertification } from '@/services/lndService'
import { useAuth } from '@/composables/useAuth'

const { hasPermission } = useAuth()
const canManage = hasPermission('manage certifications')

const loading = ref(true)
const certifications = ref<Certification[]>([])
const myCerts = ref<EmployeeCertification[]>([])
const expiring = ref<EmployeeCertification[]>([])
const error = ref('')
const activeView = ref<'catalog' | 'my-certs' | 'expiring'>('catalog')

// New cert form
const showForm = ref(false)
const saving = ref(false)
const form = ref({
  name: '',
  issuing_authority: '',
  description: '',
  validity_months: null as number | null,
})

async function loadData() {
  loading.value = true
  try {
    const [certsRes, myRes, expRes] = await Promise.all([
      lndService.getCertifications(),
      lndService.getMyCertifications(),
      lndService.getExpiringSoon(),
    ])
    certifications.value = certsRes.data.data
    myCerts.value = myRes.data.data
    expiring.value = expRes.data.data
  } catch {
    error.value = 'Failed to load certifications.'
  } finally {
    loading.value = false
  }
}

async function createCertification() {
  saving.value = true
  try {
    await lndService.createCertification(form.value)
    form.value = { name: '', issuing_authority: '', description: '', validity_months: null }
    showForm.value = false
    await loadData()
  } catch {
    error.value = 'Failed to create certification.'
  } finally {
    saving.value = false
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'active':
      return 'pill-green'
    case 'expired':
      return 'pill-red'
    case 'pending_renewal':
      return 'pill-yellow'
    default:
      return 'pill-muted'
  }
}

onMounted(loadData)
</script>

<template>
  <div class="lnd-certs">
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- View toggle -->
    <div class="page-toolbar">
      <div class="seg">
        <button
          v-for="tab in (['catalog', 'my-certs', 'expiring'] as const)"
          :key="tab"
          :class="['seg-btn', { active: activeView === tab }]"
          @click="activeView = tab"
        >
          {{
            tab === 'catalog'
              ? 'Catalog'
              : tab === 'my-certs'
                ? 'My Certifications'
                : `Expiring Soon (${expiring.length})`
          }}
        </button>
      </div>
      <button v-if="canManage" class="btn-primary" @click="showForm = !showForm">
        + New Certification
      </button>
    </div>

    <!-- New Cert Form -->
    <div v-if="showForm" class="form-card">
      <h4 class="form-title">New Certification</h4>
      <form class="form-body" @submit.prevent="createCertification">
        <div class="form-grid">
          <input
            v-model="form.name"
            type="text"
            placeholder="Certification name"
            required
            class="input"
          />
          <input
            v-model="form.issuing_authority"
            type="text"
            placeholder="Issuing authority"
            required
            class="input"
          />
        </div>
        <div class="form-grid">
          <input
            v-model="form.description"
            type="text"
            placeholder="Description"
            class="input"
          />
          <input
            v-model.number="form.validity_months"
            type="number"
            min="1"
            placeholder="Validity (months)"
            class="input"
          />
        </div>
        <div class="form-actions">
          <button type="submit" :disabled="saving" class="btn-primary">Save</button>
        </div>
      </form>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="cert-list">
      <div v-for="n in 4" :key="n" class="cert-card skeleton">
        <div class="skeleton-line w-1-3" />
      </div>
    </div>

    <!-- Catalog View -->
    <template v-else-if="activeView === 'catalog'">
      <div v-if="certifications.length" class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Issuing Authority</th>
              <th>Validity</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cert in certifications" :key="cert.id">
              <td class="td-strong">{{ cert.name }}</td>
              <td>{{ cert.issuing_authority }}</td>
              <td>
                <span class="td-mono">
                  {{ cert.validity_months ? cert.validity_months + ' months' : 'No expiry' }}
                </span>
              </td>
              <td>{{ cert.description || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-card">No certifications defined yet.</div>
    </template>

    <!-- My Certs View -->
    <template v-else-if="activeView === 'my-certs'">
      <div v-if="myCerts.length" class="cert-list">
        <div v-for="cert in myCerts" :key="cert.id" class="cert-card">
          <div class="cert-meta">
            <p class="cert-name">
              {{ cert.certification?.name || cert.name || 'Certification' }}
            </p>
            <p class="cert-sub">
              {{ cert.certification?.issuing_authority || cert.issuing_authority }}
              &middot; Issued {{ cert.issue_date }}
              <span v-if="cert.expiry_date"> &middot; Expires {{ cert.expiry_date }}</span>
            </p>
          </div>
          <span :class="['pill', statusClass(cert.status)]">
            {{ cert.status.replace('_', ' ') }}
          </span>
        </div>
      </div>
      <div v-else class="empty-card">No certifications on your record.</div>
    </template>

    <!-- Expiring View -->
    <template v-else>
      <div v-if="expiring.length" class="cert-list">
        <div v-for="cert in expiring" :key="cert.id" class="cert-card cert-card-warn">
          <div class="cert-meta">
            <p class="cert-name">
              {{ cert.certification?.name || cert.name || 'Certification' }}
            </p>
            <p class="cert-sub">
              {{ cert.employee?.name || 'Employee' }} &middot; Expires {{ cert.expiry_date }}
            </p>
          </div>
          <span class="pill pill-yellow">expiring soon</span>
        </div>
      </div>
      <div v-else class="empty-card">No certifications expiring in the next 30 days.</div>
    </template>
  </div>
</template>

<style scoped>
.lnd-certs {
  color: #eef0f4;
}

.alert {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
}

.alert-error {
  background: rgba(243, 130, 136, 0.12);
  border: 1px solid rgba(243, 130, 136, 0.4);
  color: #f38288;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

/* Segmented tabs */
.seg {
  display: inline-flex;
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.seg-btn {
  background: transparent;
  border: none;
  color: #7a8299;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-btn:hover {
  color: #eef0f4;
}

.seg-btn.active {
  background: #6b5bff;
  color: #fff;
}

.btn-primary {
  background: #6b5bff;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: #5a4be8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Form card */
.form-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.form-title {
  font-family: 'Instrument Serif', serif;
  font-size: 18px;
  letter-spacing: -0.02em;
  color: #eef0f4;
  margin: 0 0 12px;
  font-weight: 400;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.input {
  background: #0d0f17;
  border: 1px solid #232936;
  color: #eef0f4;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease;
  width: 100%;
}

.input:focus {
  border-color: #6b5bff;
}

/* Cert list */
.cert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cert-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cert-card-warn {
  border-color: rgba(245, 166, 35, 0.4);
}

.cert-meta {
  flex: 1;
  min-width: 0;
}

.cert-name {
  color: #eef0f4;
  font-size: 13px;
  font-weight: 500;
  margin: 0 0 2px;
}

.cert-sub {
  color: #7a8299;
  font-size: 11.5px;
  margin: 0;
}

/* Table */
.table-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead tr {
  border-bottom: 1px solid #232936;
}

.data-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7a8299;
  padding: 12px 18px;
  background: rgba(35, 41, 54, 0.4);
}

.data-table td {
  padding: 12px 18px;
  font-size: 13px;
  color: #7a8299;
  border-bottom: 1px solid #232936;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.td-strong {
  color: #eef0f4;
  font-weight: 500;
}

.td-mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

/* Pills */
.pill {
  font-size: 10.5px;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
}

.pill-green {
  background: rgba(77, 211, 154, 0.14);
  color: #4dd39a;
}

.pill-yellow {
  background: rgba(245, 166, 35, 0.14);
  color: #f5a623;
}

.pill-red {
  background: rgba(243, 130, 136, 0.14);
  color: #f38288;
}

.pill-muted {
  background: rgba(122, 130, 153, 0.16);
  color: #7a8299;
}

.empty-card {
  background: #161a23;
  border: 1px solid #232936;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  color: #7a8299;
  font-size: 13px;
}

/* Skeletons */
.skeleton {
  position: relative;
  overflow: hidden;
}

.skeleton-line {
  height: 12px;
  background: #232936;
  border-radius: 6px;
}

.w-1-3 {
  width: 33%;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
