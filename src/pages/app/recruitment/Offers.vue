<script setup lang="ts">
defineOptions({ name: 'RecruitmentOffers' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { recruitmentService, type Offer } from '@/services/recruitmentService'

const router = useRouter()
const loading = ref(true)
const offers = ref<Offer[]>([])
const error = ref('')
const filterStatus = ref('')
const showForm = ref(false)
const saving = ref(false)
const actionError = ref('')

const form = ref({
  application_id: undefined as number | undefined,
  candidate_name: '',
  position: '',
  salary: undefined as number | undefined,
  joining_date: '',
  expires_at: '',
  notes: '',
  template_id: undefined as number | undefined,
})

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const params: Record<string, string> = {}
    if (filterStatus.value) params.status = filterStatus.value
    const res = await recruitmentService.getOffers(params)
    offers.value = res.data?.data ?? []
  } catch {
    error.value = 'Failed to load offers'
  } finally {
    loading.value = false
  }
}

const submitOffer = async () => {
  saving.value = true
  actionError.value = ''
  try {
    await recruitmentService.createOffer(form.value)
    showForm.value = false
    form.value = { application_id: undefined, candidate_name: '', position: '', salary: undefined, joining_date: '', expires_at: '', notes: '', template_id: undefined }
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } } }
    actionError.value = err.response?.data?.message ?? 'Failed to create offer'
  } finally {
    saving.value = false
  }
}

const sendOffer = async (id: number) => {
  try {
    await recruitmentService.sendOffer(id)
    await load()
  } catch {
    error.value = 'Failed to send offer'
  }
}

const acceptOffer = async (id: number) => {
  try {
    await recruitmentService.acceptOffer(id)
    await load()
  } catch {
    error.value = 'Failed to accept offer'
  }
}

const rejectOffer = async (id: number) => {
  const reason = prompt('Rejection reason:')
  if (reason === null) return
  try {
    await recruitmentService.rejectOffer(id, reason)
    await load()
  } catch {
    error.value = 'Failed to reject offer'
  }
}

const downloadOffer = (id: number) => {
  window.open(`/api/v1/recruitment/offers/${id}/download`, '_blank')
}

const getStatusClasses = (status: string) => {
  const map: Record<string, string> = {
    draft: 'bg-gray-700 text-gray-300',
    sent: 'bg-blue-900/50 text-blue-400',
    accepted: 'bg-green-900/50 text-green-400',
    rejected: 'bg-red-900/50 text-red-400',
    expired: 'bg-yellow-900/50 text-yellow-400',
    withdrawn: 'bg-gray-700 text-gray-400',
  }
  return map[status] ?? 'bg-gray-700 text-gray-300'
}

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <select
          v-model="filterStatus"
          @change="load"
          class="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm px-3 py-2 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      <div class="flex gap-2">
        <button
          @click="router.push({ name: 'recruitment.offer-templates' })"
          class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
        >Templates</button>
        <button
          @click="showForm = !showForm"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
          Create Offer
        </button>
      </div>
    </div>

    <!-- Create Form -->
    <div v-if="showForm" class="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">New Offer Letter</h3>
      <div v-if="actionError" class="bg-red-900/30 border border-red-700 rounded-lg p-3">
        <p class="text-sm text-red-400">{{ actionError }}</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Candidate Name *</label>
          <input v-model="form.candidate_name" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Position *</label>
          <input v-model="form.position" type="text" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Salary</label>
          <input v-model.number="form.salary" type="number" min="0" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Joining Date</label>
          <input v-model="form.joining_date" type="date" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Expires At</label>
          <input v-model="form.expires_at" type="date" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Application ID</label>
          <input v-model.number="form.application_id" type="number" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" placeholder="Optional" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-1">Notes</label>
        <textarea v-model="form.notes" rows="2" class="bg-gray-700 border border-gray-600 text-white rounded-lg text-sm px-3 py-2 w-full focus:border-blue-500 focus:outline-none" />
      </div>
      <div class="flex gap-3">
        <button @click="submitOffer" :disabled="saving" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
          {{ saving ? 'Creating...' : 'Create Offer' }}
        </button>
        <button @click="showForm = false" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors">Cancel</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-gray-800 border border-gray-700 rounded-lg p-8 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-16 bg-gray-700 rounded"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700 rounded-lg p-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="offers.length === 0" class="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
      <p class="text-gray-500">No offers found.</p>
    </div>

    <!-- Offers List -->
    <div v-else class="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700/50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Candidate</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Position</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Salary</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Joining</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Expires</th>
            <th class="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="offer in offers" :key="offer.id" class="hover:bg-gray-700/30 transition-colors">
            <td class="px-6 py-4 text-sm font-medium text-white">{{ offer.candidate_name }}</td>
            <td class="px-6 py-4 text-sm text-gray-300">{{ offer.position }}</td>
            <td class="px-6 py-4 text-sm text-gray-300">{{ offer.salary ? offer.salary.toLocaleString() : '—' }}</td>
            <td class="px-6 py-4 text-sm text-gray-400">{{ formatDate(offer.joining_date) }}</td>
            <td class="px-6 py-4">
              <span :class="['inline-flex px-2 py-0.5 text-xs font-semibold rounded-full', getStatusClasses(offer.status)]">
                {{ offer.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-400">{{ formatDate(offer.expires_at) }}</td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <button v-if="offer.status === 'draft'" @click="sendOffer(offer.id)" class="text-xs text-blue-400 hover:text-blue-300 font-medium">Send</button>
                <button v-if="offer.status === 'sent'" @click="acceptOffer(offer.id)" class="text-xs text-green-400 hover:text-green-300 font-medium">Accept</button>
                <button v-if="offer.status === 'sent'" @click="rejectOffer(offer.id)" class="text-xs text-red-400 hover:text-red-300 font-medium">Reject</button>
                <button @click="downloadOffer(offer.id)" class="text-xs text-gray-400 hover:text-white font-medium">PDF</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
