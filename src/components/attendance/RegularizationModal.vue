<template>
  <div v-if="show" class="overlay" @click.self="$emit('close')">
    <div class="modal">
      <form @submit.prevent="handleSubmit">

        <!-- Header -->
        <div class="modal-head">
          <div class="modal-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </div>
          <div>
            <h3 class="modal-title">Regularize Attendance</h3>
            <p class="modal-sub">{{ formatDate(attendance?.attendance_date) }}</p>
          </div>
          <button type="button" class="modal-close" @click="$emit('close')" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">

          <!-- Current status chip -->
          <div class="status-row">
            <span class="status-chip">
              Status:
              <strong class="status-val">{{ attendance?.status || '—' }}</strong>
            </span>
          </div>

          <!-- Lock warning -->
          <div v-if="attendanceLocked" class="lock-warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
              <path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 8v4M12 16h.01"/>
            </svg>
            <div>
              <strong>Attendance Locked</strong>
              <p>Beyond 3 working days — only HR/Admin can modify. Earned Leave will be auto-deducted on approval.</p>
            </div>
          </div>

          <!-- Fields -->
          <div class="fields">

            <!-- Regularization type -->
            <div class="field">
              <label class="field-label">Regularization Type</label>
              <select v-model="form.regularization_type" required class="field-select">
                <option value="forgot_punch">Forgot to Punch</option>
                <option value="system_error">System Error</option>
                <option value="late_arrival">Late Arrival</option>
                <option value="early_departure">Early Departure</option>
                <option value="work_from_home">Work from Home</option>
                <option value="official_work">Official Work</option>
                <option value="other">Other</option>
              </select>
            </div>

            <!-- Time fields (conditional) -->
            <div
              v-if="['forgot_punch', 'late_arrival', 'system_error'].includes(form.regularization_type)"
              class="field"
            >
              <label class="field-label">Correct Check-In Time</label>
              <input v-model="form.check_in" type="time" class="field-input" />
            </div>

            <div
              v-if="['forgot_punch', 'early_departure', 'system_error'].includes(form.regularization_type)"
              class="field"
            >
              <label class="field-label">Correct Check-Out Time</label>
              <input v-model="form.check_out" type="time" class="field-input" />
            </div>

            <!-- Hours (two-col) -->
            <div class="fields-row">
              <div class="field">
                <label class="field-label">Working Hours <span class="optional">(optional)</span></label>
                <input
                  v-model.number="form.working_hours"
                  type="number" step="0.5" min="0" max="24"
                  placeholder="e.g. 8.5"
                  class="field-input"
                />
                <p class="field-hint">Leave empty for auto-calculation</p>
              </div>
              <div class="field">
                <label class="field-label">Overtime Hours <span class="optional">(optional)</span></label>
                <input
                  v-model.number="form.overtime_hours"
                  type="number" step="0.5" min="0" max="12"
                  placeholder="e.g. 2"
                  class="field-input"
                />
              </div>
            </div>

            <!-- Reason -->
            <div class="field">
              <label class="field-label">Reason *</label>
              <textarea
                v-model="form.reason"
                required
                rows="3"
                placeholder="Please provide a detailed reason (min. 10 characters)…"
                class="field-input"
              ></textarea>
            </div>

            <!-- Documents -->
            <div class="field">
              <label class="field-label">Supporting Documents <span class="optional">(optional)</span></label>
              <label class="file-drop">
                <input
                  ref="fileInput"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  @change="handleFileChange"
                  class="file-input-hidden"
                />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                    d="M12 16v-8m0 0L9 10m3-2l3 2M20 16.7A5 5 0 0018 7h-1.26A8 8 0 103 16.3"/>
                </svg>
                <span>{{ selectedFiles.length ? `${selectedFiles.length} file(s) selected` : 'Click to upload files' }}</span>
              </label>
              <p class="field-hint">PDF, JPG, PNG, DOC — max 5 MB each</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-foot">
          <button type="button" @click="$emit('close')" class="btn btn--ghost">Cancel</button>
          <button type="submit" :disabled="loading" class="btn btn--primary">
            <span v-if="loading">Submitting…</span>
            <span v-else>Submit Request</span>
          </button>
        </div>

      </form>
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

const props = defineProps<{ show: boolean; attendance: Attendance | null }>()

const emit = defineEmits<{
  close: []
  submit: [data: RegularizationData]
}>()

const loading = ref(false)
const fileInput = ref<HTMLInputElement>()
const selectedFiles = ref<File[]>([])
const { user } = useAuth()

const attendanceLocked = computed<boolean>(() => {
  if (!props.attendance?.attendance_date) return false
  const datePart = String(props.attendance.attendance_date).split('T')[0]
  const [y, m, d] = datePart.split('-').map(n => parseInt(n, 10))
  const date = new Date(y, (m || 1) - 1, d || 1)
  date.setHours(0, 0, 0, 0)
  return isAttendanceLocked(date, user.value?.employee_id || 1)
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
  attachments: [],
})

watch(() => props.show, (val) => {
  if (val && props.attendance) {
    form.attendance_id = props.attendance.id
    form.regularization_type = 'forgot_punch'
    form.check_in = props.attendance.check_in || ''
    form.check_out = props.attendance.check_out || ''
    form.reason = ''
    form.notes = ''
    form.working_hours = undefined
    form.overtime_hours = undefined
    selectedFiles.value = []
    if (fileInput.value) fileInput.value.value = ''
  }
})

const formatDate = (d?: string) => d
  ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  : ''

const handleFileChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files) selectedFiles.value = Array.from(files)
}

const handleSubmit = async () => {
  loading.value = true
  try {
    if (!form.reason || form.reason.trim().length < 10) {
      throw new Error('Reason must be at least 10 characters')
    }
    const data: RegularizationData = {
      attendance_id: form.attendance_id,
      regularization_type: form.regularization_type,
      reason: form.reason,
      notes: form.notes || '',
      attachments: selectedFiles.value,
    }
    if (form.check_in)     data.check_in     = form.check_in
    if (form.check_out)    data.check_out    = form.check_out
    if (form.working_hours  != null) data.working_hours  = form.working_hours
    if (form.overtime_hours != null) data.overtime_hours = form.overtime_hours
    emit('submit', data)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── overlay / modal shell ────────────────────────────────────────────── */
.overlay {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0,0,0,.65); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: var(--surface); border: 1px solid var(--surface3);
  border-radius: 14px; width: 100%; max-width: 520px; max-height: 90vh;
  overflow-y: auto; box-shadow: 0 32px 80px rgba(0,0,0,.55);
}

/* ── header ─────────────────────────────────────────────────────────── */
.modal-head {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 24px; border-bottom: 1px solid var(--surface2);
  position: sticky; top: 0; background: var(--surface); z-index: 1;
}
.modal-icon {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: rgba(249,168,37,.12); color: var(--yellow);
  display: grid; place-items: center;
}
.modal-title { font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
.modal-sub   { font-size: 12px; color: var(--muted); margin: 2px 0 0; }
.modal-close {
  margin-left: auto; background: none; border: none; cursor: pointer;
  color: var(--muted); padding: 4px; border-radius: 6px; display: grid; place-items: center;
  transition: color .15s, background .15s;
}
.modal-close:hover { color: var(--text); background: var(--surface2); }

/* ── body ────────────────────────────────────────────────────────────── */
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }

.status-row { display: flex; }
.status-chip {
  display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted);
  background: var(--surface2); padding: 5px 12px; border-radius: 20px; border: 1px solid var(--surface3);
}
.status-val { color: var(--text); font-weight: 600; text-transform: capitalize; }

/* lock warning */
.lock-warning {
  display: flex; gap: 10px; align-items: flex-start;
  background: rgba(255,107,107,.08); border: 1px solid rgba(255,107,107,.25);
  border-radius: 8px; padding: 12px 14px; color: var(--red); font-size: 12px;
}
.lock-warning svg { flex-shrink: 0; margin-top: 1px; }
.lock-warning strong { display: block; font-size: 13px; margin-bottom: 4px; }
.lock-warning p { margin: 0; color: rgba(255,107,107,.85); line-height: 1.5; }

/* ── fields ──────────────────────────────────────────────────────────── */
.fields     { display: flex; flex-direction: column; gap: 14px; }
.fields-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field      { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  font-size: 11px; font-weight: 600; color: var(--muted);
  text-transform: uppercase; letter-spacing: .5px;
}
.optional { text-transform: none; letter-spacing: 0; font-weight: 400; font-size: 10px; }

.field-input,
.field-select {
  background: var(--surface2); border: 1px solid var(--surface3);
  border-radius: 8px; padding: 9px 12px; font-size: 13px; color: var(--text);
  outline: none; transition: border-color .15s; font-family: inherit; width: 100%; box-sizing: border-box;
}
.field-input::placeholder { color: var(--muted); }
.field-input:focus,
.field-select:focus { border-color: var(--accent); }
textarea.field-input { resize: vertical; min-height: 80px; }

/* native select arrow fix for dark bg */
.field-select { appearance: none; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none'%3E%3Cpath stroke='%236B7280' stroke-width='2' stroke-linecap='round' d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
}
.field-select option { background: #1C2030; color: #E8EAF0; }

.field-hint { font-size: 11px; color: var(--muted); margin: 0; }

/* file upload */
.file-drop {
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  background: var(--surface2); border: 1px dashed var(--surface3);
  border-radius: 8px; padding: 12px 14px; font-size: 13px; color: var(--muted);
  transition: border-color .15s, color .15s;
}
.file-drop:hover { border-color: var(--accent); color: var(--text); }
.file-input-hidden { display: none; }

/* ── footer ──────────────────────────────────────────────────────────── */
.modal-foot {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 24px; border-top: 1px solid var(--surface2); background: var(--surface2);
  position: sticky; bottom: 0;
}

.btn {
  padding: 8px 20px; font-size: 13px; font-weight: 600; border: none;
  border-radius: 8px; cursor: pointer; transition: opacity .15s, filter .15s;
}
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn--primary {
  background: var(--accent); color: #fff;
}
.btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn--ghost {
  background: transparent; color: var(--muted); border: 1px solid var(--surface3);
}
.btn--ghost:hover { color: var(--text); border-color: var(--muted); }

@media (max-width: 480px) {
  .fields-row { grid-template-columns: 1fr; }
}
</style>
