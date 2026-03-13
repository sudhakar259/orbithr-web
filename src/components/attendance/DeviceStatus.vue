<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Device Status</h3>
      <button
        @click="refreshDevices"
        :disabled="loading"
        class="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <svg class="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span v-if="loading">Refreshing...</span>
        <span v-else>Refresh</span>
      </button>
    </div>

    <div v-if="devices.length === 0" class="text-center py-8">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No devices configured</h3>
      <p class="mt-1 text-sm text-gray-500">Configure attendance devices to enable automatic sync.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="device in devices"
        :key="device.id"
        class="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
      >
        <div class="flex items-center space-x-3">
          <!-- Device Status Indicator -->
          <div :class="getStatusClasses(device)">
            <svg v-if="device.is_online" class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="device.status === 'maintenance'" class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>

          <!-- Device Info -->
          <div>
            <div class="text-sm font-medium text-gray-900">{{ device.device_name }}</div>
            <div class="text-xs text-gray-500">
              {{ device.device_type.toUpperCase() }} • {{ device.location || 'No location' }}
            </div>
          </div>
        </div>

        <!-- Device Actions -->
        <div class="flex items-center space-x-2">
          <div class="text-right">
            <div class="text-xs text-gray-500">
              {{ device.is_online ? 'Online' : 'Offline' }}
            </div>
            <div v-if="device.last_sync_at" class="text-xs text-gray-400">
              Last sync: {{ formatLastSync(device.last_sync_at) }}
            </div>
          </div>

          <button
            v-if="canManageDevices"
            @click="syncDevice(device)"
            :disabled="!device.is_online || syncingDevice === device.id"
            class="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg v-if="syncingDevice === device.id" class="animate-spin -ml-1 mr-1 h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span v-else class="text-xs">Sync</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div v-if="devices.length > 0" class="mt-6 pt-4 border-t border-gray-200">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-lg font-semibold text-green-600">{{ onlineDevices }}</div>
          <div class="text-xs text-gray-500">Online</div>
        </div>
        <div>
          <div class="text-lg font-semibold text-yellow-600">{{ maintenanceDevices }}</div>
          <div class="text-xs text-gray-500">Maintenance</div>
        </div>
        <div>
          <div class="text-lg font-semibold text-red-600">{{ offlineDevices }}</div>
          <div class="text-xs text-gray-500">Offline</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface Device {
  id: number
  device_name: string
  device_type: string
  location?: string
  status: string
  is_online: boolean
  last_sync_at?: string
}

interface Props {
  devices: Device[]
}

const props = defineProps<Props>()

const auth = useAuthStore()
const loading = ref(false)
const syncingDevice = ref<number | null>(null)

const canManageDevices = computed(() => {
  return auth.user?.permissions?.includes('manage attendance devices') ||
         auth.user?.roles?.some(role => ['admin', 'hr_manager'].includes(role.name))
})

const onlineDevices = computed(() => {
  return props.devices.filter(device => device.is_online).length
})

const maintenanceDevices = computed(() => {
  return props.devices.filter(device => device.status === 'maintenance').length
})

const offlineDevices = computed(() => {
  return props.devices.filter(device => !device.is_online && device.status !== 'maintenance').length
})

const getStatusClasses = (device: Device): string => {
  if (device.is_online) {
    return 'flex items-center justify-center w-8 h-8 bg-green-100 rounded-full'
  } else if (device.status === 'maintenance') {
    return 'flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full'
  } else {
    return 'flex items-center justify-center w-8 h-8 bg-red-100 rounded-full'
  }
}

const formatLastSync = (lastSync: string): string => {
  const date = new Date(lastSync)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

const refreshDevices = async () => {
  loading.value = true
  try {
    // Emit event to parent to refresh devices
    // This would be handled by the parent component
    console.log('Refreshing devices...')
  } catch (error) {
    console.error('Refresh devices error:', error)
  } finally {
    loading.value = false
  }
}

const syncDevice = async (device: Device) => {
  syncingDevice.value = device.id
  try {
    // Emit event to parent to sync specific device
    console.log('Syncing device:', device.device_name)
  } catch (error) {
    console.error('Sync device error:', error)
  } finally {
    syncingDevice.value = null
  }
}
</script>
