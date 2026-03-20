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

function statusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-900/50 text-green-400'
    case 'expired':
      return 'bg-red-900/50 text-red-400'
    case 'pending_renewal':
      return 'bg-yellow-900/50 text-yellow-400'
    default:
      return 'bg-gray-700 text-gray-400'
  }
}

onMounted(loadData)
</script>

<template>
  <div>
    <div
      v-if="error"
      class="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4"
    >
      {{ error }}
    </div>

    <!-- View toggle -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex gap-2">
        <button
          v-for="tab in (['catalog', 'my-certs', 'expiring'] as const)"
          :key="tab"
          :class="
            activeView === tab
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          "
          class="px-3 py-1.5 rounded-lg text-sm"
          @click="activeView = tab"
        >
          {{
            tab === 'catalog'
              ? 'Certification Catalog'
              : tab === 'my-certs'
                ? 'My Certifications'
                : `Expiring Soon (${expiring.length})`
          }}
        </button>
      </div>
      <button
        v-if="canManage"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
        @click="showForm = !showForm"
      >
        + New Certification
      </button>
    </div>

    <!-- New Cert Form -->
    <div v-if="showForm" class="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-4">
      <h4 class="text-white text-sm font-semibold mb-3">New Certification</h4>
      <form class="space-y-3" @submit.prevent="createCertification">
        <div class="grid grid-cols-2 gap-3">
          <input
            v-model="form.name"
            type="text"
            placeholder="Certification name"
            required
            class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            v-model="form.issuing_authority"
            type="text"
            placeholder="Issuing authority"
            required
            class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <input
            v-model="form.description"
            type="text"
            placeholder="Description"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            v-model.number="form.validity_months"
            type="number"
            min="1"
            placeholder="Validity (months)"
            class="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="saving"
            class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div
        v-for="n in 4"
        :key="n"
        class="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
      >
        <div class="h-4 bg-gray-700 rounded w-1/3" />
      </div>
    </div>

    <!-- Catalog View -->
    <template v-else-if="activeView === 'catalog'">
      <div v-if="certifications.length" class="bg-gray-800 border border-gray-700 rounded-lg">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-700">
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Name
              </th>
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Issuing Authority
              </th>
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Validity
              </th>
              <th
                class="px-5 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider bg-gray-700/50"
              >
                Description
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="cert in certifications" :key="cert.id">
              <td class="px-5 py-3 text-white text-sm">{{ cert.name }}</td>
              <td class="px-5 py-3 text-gray-400 text-sm">{{ cert.issuing_authority }}</td>
              <td class="px-5 py-3 text-gray-400 text-sm">
                {{ cert.validity_months ? cert.validity_months + ' months' : 'No expiry' }}
              </td>
              <td class="px-5 py-3 text-gray-400 text-sm">{{ cert.description || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-else
        class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center"
      >
        <p class="text-gray-400">No certifications defined yet.</p>
      </div>
    </template>

    <!-- My Certs View -->
    <template v-else-if="activeView === 'my-certs'">
      <div v-if="myCerts.length" class="space-y-3">
        <div
          v-for="cert in myCerts"
          :key="cert.id"
          class="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
        >
          <div>
            <p class="text-white text-sm font-medium">
              {{ cert.certification?.name || cert.name || 'Certification' }}
            </p>
            <p class="text-gray-400 text-xs">
              {{ cert.certification?.issuing_authority || cert.issuing_authority }}
              &middot; Issued: {{ cert.issue_date }}
              <span v-if="cert.expiry_date"> &middot; Expires: {{ cert.expiry_date }}</span>
            </p>
          </div>
          <span :class="statusColor(cert.status)" class="text-xs px-2 py-0.5 rounded-full">
            {{ cert.status.replace('_', ' ') }}
          </span>
        </div>
      </div>
      <div
        v-else
        class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center"
      >
        <p class="text-gray-400">No certifications on your record.</p>
      </div>
    </template>

    <!-- Expiring View -->
    <template v-else>
      <div v-if="expiring.length" class="space-y-3">
        <div
          v-for="cert in expiring"
          :key="cert.id"
          class="bg-gray-800 border border-yellow-700/50 rounded-lg p-4 flex items-center justify-between"
        >
          <div>
            <p class="text-white text-sm font-medium">
              {{ cert.certification?.name || cert.name || 'Certification' }}
            </p>
            <p class="text-gray-400 text-xs">
              {{ cert.employee?.name || 'Employee' }} &middot; Expires: {{ cert.expiry_date }}
            </p>
          </div>
          <span class="bg-yellow-900/50 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
            expiring soon
          </span>
        </div>
      </div>
      <div
        v-else
        class="bg-gray-800 border border-gray-700 rounded-lg px-6 py-12 text-center"
      >
        <p class="text-gray-400">No certifications expiring in the next 30 days.</p>
      </div>
    </template>
  </div>
</template>
