<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="$emit('close')"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <form @submit.prevent="handleSubmit">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {{ form.punch_type === 'check_out' ? 'Record Check Out' : 'Record Check In' }}
                </h3>
                <div class="mt-4 space-y-4">
                  <!-- Punch Type -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Punch Type</label>
                    <select
                      v-model="form.punch_type"
                      required
                      :disabled="!!props.punchType"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="check_in">Check In</option>
                      <option value="check_out">Check Out</option>
                    </select>
                  </div>

                  <!-- Date -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      v-model="form.attendance_date"
                      type="date"
                      required
                      :max="new Date().toISOString().split('T')[0]"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <!-- Time -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Time</label>
                    <input
                      v-model="form.timestamp"
                      type="time"
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <!-- Punch Method -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Punch Method</label>
                    <select
                      v-model="form.method"
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="manual">Manual Entry</option>
                      <option value="biometric">Biometric</option>
                      <option value="rfid">RFID Card</option>
                      <option value="facial">Facial Recognition</option>
                      <option value="web">Web Portal</option>
                      <option value="mobile">Mobile App</option>
                    </select>
                  </div>

                  <!-- Location (for mobile/web punches) -->
                  <div v-if="['web', 'mobile'].includes(form.method)">
                    <label class="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      v-model="form.location"
                      type="text"
                      placeholder="Enter location"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <!-- Notes -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <textarea
                      v-model="form.notes"
                      rows="3"
                      placeholder="Any additional notes..."
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal footer -->
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              :disabled="loading"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              <span v-if="loading">Recording...</span>
              <span v-else>Record Punch</span>
            </button>
            <button
              type="button"
              @click="$emit('close')"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

interface Props {
  show: boolean
  punchType?: 'check_in' | 'check_out'
}

interface PunchData {
  punch_type: 'check_in' | 'check_out'
  attendance_date: string
  timestamp: string
  method: 'manual' | 'biometric' | 'rfid' | 'facial' | 'web' | 'mobile'
  location?: string
  notes?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  punch: [data: PunchData]
}>()

const loading = ref(false)

const form = reactive<PunchData>({
  punch_type: 'check_in',
  attendance_date: new Date().toISOString().split('T')[0],
  timestamp: new Date().toTimeString().slice(0, 5),
  method: 'manual',
  location: '',
  notes: ''
})

// Reset form when modal opens
watch(() => props.show, (newValue) => {
  if (newValue) {
    // Reset to current date/time
    form.attendance_date = new Date().toISOString().split('T')[0]
    form.timestamp = new Date().toTimeString().slice(0, 5)
    form.punch_type = props.punchType || 'check_in'
    form.method = 'manual'
    form.location = ''
    form.notes = ''
  }
})

const handleSubmit = async () => {
  loading.value = true

  try {
    // Validate form
    if (!form.attendance_date || !form.timestamp) {
      throw new Error('Please fill in all required fields')
    }

    // Create punch data
    const punchData: PunchData = {
      punch_type: form.punch_type,
      attendance_date: form.attendance_date,
      timestamp: form.timestamp,
      method: form.method,
      location: form.location || undefined,
      notes: form.notes || undefined
    }

    emit('punch', punchData)
  } catch (error) {
    console.error('Punch submission error:', error)
    // You might want to show an error message to the user
  } finally {
    loading.value = false
  }
}
</script>
