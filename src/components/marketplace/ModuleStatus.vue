<template>
  <div class="rounded-lg border border-slate-200 bg-white p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-900">{{ tenantModule.module_name }}</h3>
        <p class="mt-1 text-sm text-slate-600">{{ tenantModule.module_slug }}</p>
      </div>
      <div :class="statusBadgeClass">{{ statusLabel }}</div>
    </div>

    <!-- Status Details -->
    <div class="mt-4 space-y-2 text-sm">
      <div v-if="tenantModule.activated_at" class="flex justify-between">
        <span class="text-slate-600">Activated:</span>
        <span class="font-medium text-slate-900">{{ formatDate(tenantModule.activated_at) }}</span>
      </div>

      <div v-if="tenantModule.expires_at" class="flex justify-between">
        <span class="text-slate-600">Expires:</span>
        <span :class="expiryClass">{{ formatDate(tenantModule.expires_at) }}</span>
      </div>

      <div v-if="tenantModule.days_until_expiry !== null" class="flex justify-between">
        <span class="text-slate-600">Days remaining:</span>
        <span :class="daysClass">{{ tenantModule.days_until_expiry }} days</span>
      </div>

      <div v-if="tenantModule.billing_reference" class="flex justify-between">
        <span class="text-slate-600">Billing Ref:</span>
        <span class="font-mono text-xs text-slate-500">{{ truncateRef(tenantModule.billing_reference) }}</span>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="isExpiringSoon" class="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
      <p class="font-medium">Module expiring soon</p>
      <p class="mt-1">Your subscription will expire in {{ tenantModule.days_until_expiry }} days. Renew to continue using this module.</p>
    </div>

    <div v-if="isSuspended" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <p class="font-medium">Module suspended</p>
      <p class="mt-1">Your subscription payment failed. Update your payment method to reactivate this module.</p>
    </div>

    <!-- Actions -->
    <div class="mt-4 flex gap-2">
      <button
        v-if="!tenantModule.is_core && tenantModule.status === 'active'"
        @click="$emit('disable')"
        :disabled="disabling"
        class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {{ disabling ? 'Disabling...' : 'Disable' }}
      </button>

      <button
        v-if="isExpiringSoon"
        @click="$emit('renew')"
        :disabled="renewing"
        class="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {{ renewing ? 'Processing...' : 'Renew' }}
      </button>

      <button
        v-if="isSuspended"
        @click="$emit('retry-payment')"
        :disabled="retrying"
        class="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {{ retrying ? 'Processing...' : 'Update Payment' }}
      </button>

      <button
        @click="$emit('view-settings')"
        class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Settings
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface TenantModule {
  id: number
  module_id: number
  module_name: string
  module_slug: string
  status: string
  activated_at: string | null
  expires_at: string | null
  days_until_expiry: number | null
  billing_reference: string | null
  is_core: boolean
}

interface Props {
  tenantModule: TenantModule
}

interface Emits {
  disable: []
  renew: []
  'retry-payment': []
  'view-settings': []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const disabling = ref(false)
const renewing = ref(false)
const retrying = ref(false)

const statusLabel = computed(() => {
  switch (props.tenantModule.status) {
    case 'active':
      return 'Active'
    case 'suspended':
      return 'Suspended'
    case 'pending':
      return 'Pending'
    case 'inactive':
      return 'Inactive'
    default:
      return props.tenantModule.status
  }
})

const statusBadgeClass = computed(() => {
  const baseClass = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
  switch (props.tenantModule.status) {
    case 'active':
      return `${baseClass} bg-green-100 text-green-800`
    case 'suspended':
      return `${baseClass} bg-red-100 text-red-800`
    case 'pending':
      return `${baseClass} bg-yellow-100 text-yellow-800`
    default:
      return `${baseClass} bg-gray-100 text-gray-800`
  }
})

const isExpiringSoon = computed(() => {
  return props.tenantModule.days_until_expiry !== null && props.tenantModule.days_until_expiry <= 7
})

const isSuspended = computed(() => {
  return props.tenantModule.status === 'suspended'
})

const expiryClass = computed(() => {
  if (isExpiringSoon.value) {
    return 'font-medium text-yellow-700'
  }
  return 'text-slate-900'
})

const daysClass = computed(() => {
  if (isExpiringSoon.value) {
    return 'font-medium text-yellow-700'
  }
  if (isSuspended.value) {
    return 'font-medium text-red-700'
  }
  return 'text-slate-900'
})

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const truncateRef = (ref: string): string => {
  if (ref.length <= 20) return ref
  return ref.substring(0, 10) + '...' + ref.substring(ref.length - 10)
}
</script>
