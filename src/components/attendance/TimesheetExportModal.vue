<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div class="flex min-h-screen items-center justify-center p-4">
      <div
        class="relative bg-white rounded-lg shadow-xl max-w-md w-full"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 class="text-xl font-bold text-slate-900">Timesheet Export & Share</h2>
          <button
            @click="closeModal"
            class="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <form @submit.prevent="handleSubmit" class="px-6 py-4 space-y-4">
          <!-- Month/Year Selection -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <select
                v-model.number="form.month"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option v-for="(monthName, idx) in monthNames" :key="idx" :value="idx + 1">
                  {{ monthName }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <select
                v-model.number="form.year"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option v-for="year in availableYears" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>
          </div>

          <!-- Export Options -->
          <div class="space-y-3 pt-4">
            <h3 class="text-sm font-semibold text-slate-900">Download Options</h3>
            
            <!-- PDF Download -->
            <button
              type="button"
              @click="handleExport('pdf')"
              :disabled="exporting"
              class="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div class="flex items-center gap-3">
                <svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" />
                </svg>
                <div class="text-left">
                  <div class="text-sm font-medium text-slate-900">Download PDF</div>
                  <div class="text-xs text-slate-500">Portable Document Format</div>
                </div>
              </div>
              <svg v-if="!exporting" class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <svg v-else class="h-5 w-5 text-slate-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- Excel Download -->
            <button
              type="button"
              @click="handleExport('excel')"
              :disabled="exporting"
              class="w-full flex items-center justify-between px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div class="flex items-center gap-3">
                <svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" />
                </svg>
                <div class="text-left">
                  <div class="text-sm font-medium text-slate-900">Download Excel</div>
                  <div class="text-xs text-slate-500">Microsoft Excel Spreadsheet</div>
                </div>
              </div>
              <svg v-if="!exporting" class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              <svg v-else class="h-5 w-5 text-slate-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <!-- Share via Email Section -->
          <div class="space-y-3 pt-4 border-t border-slate-200">
            <h3 class="text-sm font-semibold text-slate-900">Share via Email</h3>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Recipient Email</label>
              <input
                v-model="form.recipientEmail"
                type="email"
                placeholder="accounts@company.com"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Format</label>
              <div class="flex gap-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="form.shareFormat"
                    type="radio"
                    value="pdf"
                    class="w-4 h-4"
                  />
                  <span class="text-sm text-slate-700">PDF</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="form.shareFormat"
                    type="radio"
                    value="excel"
                    class="w-4 h-4"
                  />
                  <span class="text-sm text-slate-700">Excel</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              @click="handleShare"
              :disabled="!form.recipientEmail || sharing"
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <span v-if="sharing">Sending...</span>
              <span v-else>Send to Email</span>
            </button>
          </div>
        </form>

        <!-- Footer -->
        <div class="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            @click="closeModal"
            class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="px-6 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          {{ errorMessage }}
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="px-6 py-2 bg-green-50 border-t border-green-200 text-green-700 text-sm">
          {{ successMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { timesheetService } from '@/services/timesheet'

interface Props {
  show: boolean
  currentMonth?: number
  currentYear?: number
}

const props = withDefaults(defineProps<Props>(), {
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
})

const emit = defineEmits<{
  close: []
}>()

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const form = ref({
  month: props.currentMonth,
  year: props.currentYear,
  recipientEmail: '',
  shareFormat: 'pdf' as 'pdf' | 'excel',
})

const exporting = ref(false)
const sharing = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let i = currentYear - 2; i <= currentYear; i++) {
    years.push(i)
  }
  return years
})

const closeModal = () => {
  form.value.recipientEmail = ''
  errorMessage.value = ''
  successMessage.value = ''
  emit('close')
}

const handleExport = async (format: 'pdf' | 'excel') => {
  exporting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const blob = await timesheetService.exportTimesheet({
      year: form.value.year,
      month: form.value.month,
      format,
    })

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    const monthName = monthNames[form.value.month - 1]
    const filename = `Timesheet_${monthName}_${form.value.year}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
    link.setAttribute('download', filename)
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    successMessage.value = `Timesheet exported successfully as ${format.toUpperCase()}`
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    console.error('Export error:', error)
    errorMessage.value = error.response?.data?.message || `Failed to export timesheet as ${format.toUpperCase()}`
  } finally {
    exporting.value = false
  }
}

const handleShare = async () => {
  if (!form.value.recipientEmail) {
    errorMessage.value = 'Please enter an email address'
    return
  }

  sharing.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await timesheetService.shareTimesheetEmail({
      year: form.value.year,
      month: form.value.month,
      email: form.value.recipientEmail,
      format: form.value.shareFormat,
    })

    successMessage.value = `Timesheet sent to ${form.value.recipientEmail} successfully`
    form.value.recipientEmail = ''
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    console.error('Share error:', error)
    errorMessage.value = error.response?.data?.message || 'Failed to send timesheet via email'
  } finally {
    sharing.value = false
  }
}
</script>
