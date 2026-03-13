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
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Regularize Attendance
                </h3>
                <p class="text-sm text-gray-500 mt-1">
                  Request regularization for {{ formatDate(attendance?.attendance_date) }}
                </p>

                <div class="mt-4 space-y-4">
                  <!-- Current Status -->
                  <div class="bg-gray-50 p-3 rounded-md">
                    <h4 class="text-sm font-medium text-gray-900">Current Status</h4>
                    <p class="text-sm text-gray-600 mt-1">
                      Status: <span class="font-medium capitalize">{{ attendance?.status }}</span>
                      <br>
                      Date: {{ formatDate(attendance?.attendance_date) }}
                    </p>

                    <!-- Lock Warning -->
                    <div v-if="attendanceLocked" class="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p class="text-xs font-medium text-red-800">
                          ⚠️ <strong>Attendance Locked</strong>
                        </p>
                        <p class="text-xs text-red-700 mt-1">
                          This attendance is locked for regularization (beyond 3 working days).
                          Only HR/Admin can modify this record, and earned leave will be auto-deducted.
                        </p>
                      </div>
                  </div>

                  <!-- Regularization Type -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Regularization Type</label>
                    <select
                      v-model="form.regularization_type"
                      required
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="forgot_punch">Forgot to Punch</option>
                      <option value="system_error">System Error</option>
                      <option value="late_arrival">Late Arrival</option>
                      <option value="early_departure">Early Departure</option>
                      <option value="work_from_home">Work from Home</option>
                      <option value="official_work">Official Work</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <!-- Check In Time (if applicable) -->
                  <div v-if="['forgot_punch', 'late_arrival', 'system_error'].includes(form.regularization_type)">
                    <label class="block text-sm font-medium text-gray-700">Correct Check In Time</label>
                    <input
                      v-model="form.check_in"
                      type="time"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <!-- Check Out Time (if applicable) -->
                  <div v-if="['forgot_punch', 'early_departure', 'system_error'].includes(form.regularization_type)">
                    <label class="block text-sm font-medium text-gray-700">Correct Check Out Time</label>
                    <input
                      v-model="form.check_out"
                      type="time"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <!-- Working Hours -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Working Hours (Optional)</label>
                    <input
                      v-model.number="form.working_hours"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      placeholder="e.g., 8.5"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <p class="mt-1 text-xs text-gray-500">Leave empty for auto-calculation</p>
                  </div>

                  <!-- Overtime Hours -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Overtime Hours (Optional)</label>
                    <input
                      v-model.number="form.overtime_hours"
                      type="number"
                      step="0.5"
                      min="0"
                      max="12"
                      placeholder="e.g., 2"
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <p class="mt-1 text-xs text-gray-500">Optional overtime hours</p>
                  </div>

                  <!-- Reason -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Reason</label>
                    <textarea
                      v-model="form.reason"
                      required
                      rows="3"
                      placeholder="Please provide detailed reason for regularization..."
                      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    ></textarea>
                  </div>

                  <!-- Supporting Documents -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Supporting Documents (Optional)</label>
                    <input
                      ref="fileInput"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      @change="handleFileChange"
                      class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p class="mt-1 text-xs text-gray-500">
                      Upload relevant documents (max 5MB each)
                    </p>
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
              <span v-if="loading">Submitting...</span>
              <span v-else>Submit Request</span>
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
import { ref, reactive, watch, computed } from 'vue'
import { isAttendanceLocked } from '@/utils/attendanceData'
import { useAuth } from '@/composables/useAuth'

interface Attendance {
  id: number
  attendance_date: string
  status: string
  check_in?: string
  check_out?: string
}

interface Props {
  show: boolean
  attendance: Attendance | null
}

interface RegularizationData {
  attendance_id: number
  regularization_type: string
  check_in?: string
  check_out?: string
  reason: string
  notes?: string
  working_hours?: number
  overtime_hours?: number
  attachments?: File[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  submit: [data: RegularizationData]
}>()

const loading = ref(false)
const fileInput = ref<HTMLInputElement>()
const selectedFiles = ref<File[]>([])

const { user } = useAuth()

const attendanceLocked = computed<boolean>(() => {
  if (!props.attendance?.attendance_date) {
    return false
  }

  // Parse date portion to local midnight to avoid UTC offset issues
  const datePart = String(props.attendance.attendance_date).split('T')[0]
  const [y, m, d] = datePart.split('-').map(n => parseInt(n, 10))
  const attendanceDate = new Date(y, (m || 1) - 1, d || 1)
  attendanceDate.setHours(0, 0, 0, 0)

  const employeeId = user.value?.employee_id || 1
  return isAttendanceLocked(attendanceDate, employeeId)
})

const form = reactive<RegularizationData>({
  attendance_id: 0,
  regularization_type: 'forgot_punch',
  check_in: '',
  check_out: '',
  reason: '',
  notes: '',
  working_hours: undefined,
  overtime_hours: undefined,
  attachments: []
})

// Reset form when modal opens
watch(() => props.show, (newValue) => {
  if (newValue && props.attendance) {
    form.attendance_id = props.attendance.id
    form.regularization_type = 'forgot_punch'
    form.check_in = props.attendance.check_in || ''
    form.check_out = props.attendance.check_out || ''
    form.reason = ''
    form.notes = ''
    form.working_hours = undefined
    form.overtime_hours = undefined
    selectedFiles.value = []
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
})

const formatDate = (dateString?: string): string => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files) {
    selectedFiles.value = Array.from(files)
  }
}

const handleSubmit = async () => {
  loading.value = true

  try {
    // Validate form
    if (!form.reason || form.reason.trim().length < 10) {
      throw new Error('Please provide a reason for regularization (minimum 10 characters)')
    }

    if (!form.attendance_id) {
      throw new Error('Attendance record not found')
    }
    // Create regularization data
    const regularizationData: RegularizationData = {
      attendance_id: form.attendance_id,
      regularization_type: form.regularization_type,
      reason: form.reason,
      notes: form.notes || '',
      attachments: selectedFiles.value
    }

    // Add time fields if applicable
    if (form.check_in) {
      regularizationData.check_in = form.check_in
    }
    if (form.check_out) {
      regularizationData.check_out = form.check_out
    }
    if (form.working_hours !== undefined && form.working_hours !== null) {
      regularizationData.working_hours = form.working_hours
    }
    if (form.overtime_hours !== undefined && form.overtime_hours !== null) {
      regularizationData.overtime_hours = form.overtime_hours
    }

    emit('submit', regularizationData)
  } catch (error) {
    console.error('Regularization submission error:', error)
    // You might want to show an error message to the user
  } finally {
    loading.value = false
  }
}
</script>
