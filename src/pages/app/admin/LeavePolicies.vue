<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-white">Leave Policies</h1>
        <p class="mt-1 text-sm text-gray-400">Manage leave allocation and accrual policies for your organisation.</p>
      </div>
      <button class="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
        @click="router.push({ name: 'leave-policies.create' })">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        New Policy
      </button>
    </div>

    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-800"></div>
    </div>

    <div v-else-if="!policies.length" class="rounded-lg border border-dashed border-gray-600 py-16 text-center">
      <p class="text-gray-400">No policies yet.</p>
      <button class="mt-3 text-sm text-brand-400 hover:underline" @click="router.push({ name: 'leave-policies.create' })">Create your first policy →</button>
    </div>

    <div v-else class="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700/50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Name</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Description</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Auto Accrual</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Frequency</th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
            <th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-700">
          <tr v-for="p in policies" :key="p.id" class="hover:bg-gray-700/30 transition-colors">
            <td class="px-4 py-3 font-medium text-white">{{ p.name }}</td>
            <td class="px-4 py-3 text-gray-400">{{ p.description || '—' }}</td>
            <td class="px-4 py-3 text-gray-400">{{ p.auto_accrual ? 'Yes' : 'No' }}</td>
            <td class="px-4 py-3 text-gray-400 capitalize">{{ p.accrual_frequency }}</td>
            <td class="px-4 py-3">
              <span :class="p.is_active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'"
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium">
                {{ p.is_active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2">
                <button class="rounded border border-gray-600 px-3 py-1 text-sm text-gray-300 hover:border-gray-400 hover:text-white transition-colors"
                  @click="router.push({ name: 'leave-policies.edit', params: { id: p.id } })">Edit</button>
                <button class="rounded border border-red-800/50 bg-red-900/20 px-3 py-1 text-sm text-red-400 hover:bg-red-900/40 transition-colors"
                  @click="remove(p)">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'LeavePolicies' })
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { leaveService, type LeavePolicy } from '@/services/leave'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { confirm: dialog } = useConfirm()
const toast = useToast()

const policies = ref<LeavePolicy[]>([])
const loading  = ref(false)

onMounted(loadPolicies)

async function loadPolicies() {
  loading.value = true
  try {
    policies.value = await leaveService.getLeavePolicies()
  } catch {
    toast.error('Failed to load policies')
  } finally {
    loading.value = false
  }
}

async function remove(p: LeavePolicy) {
  if (!await dialog('Delete', 'Delete this policy?')) return
  try {
    await leaveService.deleteLeavePolicy(p.id)
    await loadPolicies()
  } catch (e) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.error(msg || 'Failed to delete policy')
  }
}
</script>
