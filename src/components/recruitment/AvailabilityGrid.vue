<script setup lang="ts">
defineOptions({ name: 'AvailabilityGrid' })
import { ref, computed, watch, onMounted, type PropType } from 'vue'
import { calendarService, type UserAvailability } from '@/services/recruitmentService'

const props = defineProps({
  interviewerIds: { type: Array as PropType<number[]>, default: () => [] },
  date: { type: String, required: true },
  durationMinutes: { type: Number, default: 60 },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'slot-unavailable': [slot: string]
}>()

const loading = ref(false)
const error = ref('')
const availability = ref<UserAvailability[]>([])

interface SlotInfo {
  time: string
  label: string
  datetime: string
  status: 'free' | 'partial' | 'busy'
  busyCount: number
  totalCount: number
}

const timeSlots = computed<SlotInfo[]>(() => {
  const slots: SlotInfo[] = []
  const interviewerCount = props.interviewerIds.length || 1

  for (let h = 9; h < 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 17 && m === 30) continue // 17:30 is last slot
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const time = `${hh}:${mm}`
      const label = formatTime(h, m)
      const datetime = `${props.date}T${time}:00`

      const slotStart = new Date(`${props.date}T${time}:00`)
      const slotEnd = new Date(slotStart.getTime() + props.durationMinutes * 60000)

      let busyCount = 0
      for (const user of availability.value) {
        const isBusy = user.busy_slots.some((busy) => {
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return slotStart < busyEnd && slotEnd > busyStart
        })
        if (isBusy) busyCount++
      }

      let status: 'free' | 'partial' | 'busy' = 'free'
      if (busyCount > 0 && busyCount < interviewerCount) status = 'partial'
      else if (busyCount >= interviewerCount && interviewerCount > 0) status = 'busy'

      slots.push({ time, label, datetime, status, busyCount, totalCount: interviewerCount })
    }
  }
  // Add 17:30 slot
  const datetime1730 = `${props.date}T17:30:00`
  const slotStart1730 = new Date(datetime1730)
  const slotEnd1730 = new Date(slotStart1730.getTime() + props.durationMinutes * 60000)
  let busyCount1730 = 0
  for (const user of availability.value) {
    const isBusy = user.busy_slots.some((busy) => {
      const busyStart = new Date(busy.start)
      const busyEnd = new Date(busy.end)
      return slotStart1730 < busyEnd && slotEnd1730 > busyStart
    })
    if (isBusy) busyCount1730++
  }
  let status1730: 'free' | 'partial' | 'busy' = 'free'
  const interviewerCount = props.interviewerIds.length || 1
  if (busyCount1730 > 0 && busyCount1730 < interviewerCount) status1730 = 'partial'
  else if (busyCount1730 >= interviewerCount && interviewerCount > 0) status1730 = 'busy'
  slots.push({
    time: '17:30',
    label: formatTime(17, 30),
    datetime: datetime1730,
    status: status1730,
    busyCount: busyCount1730,
    totalCount: interviewerCount,
  })

  return slots
})

function formatTime(h: number, m: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

const fetchAvailability = async () => {
  if (!props.interviewerIds.length || !props.date) return
  loading.value = true
  error.value = ''
  try {
    const res = await calendarService.getTeamAvailability(props.interviewerIds, props.date)
    availability.value = res.data?.data ?? []
  } catch {
    error.value = 'Could not load availability'
    availability.value = []
  } finally {
    loading.value = false
  }
}

const selectSlot = (slot: SlotInfo) => {
  if (slot.status === 'busy') {
    emit('slot-unavailable', slot.datetime)
    return
  }
  emit('update:modelValue', slot.datetime)
}

const isSelected = (slot: SlotInfo) => props.modelValue === slot.datetime

watch(
  () => [props.interviewerIds, props.date],
  () => fetchAvailability(),
  { deep: true },
)

onMounted(fetchAvailability)
</script>

<template>
  <div class="availability-grid">
    <div class="grid-header">
      <h4 class="grid-title">Availability</h4>
      <div class="legend">
        <span class="legend-item"><span class="dot dot-free"></span> Free</span>
        <span class="legend-item"><span class="dot dot-partial"></span> Partial</span>
        <span class="legend-item"><span class="dot dot-busy"></span> Busy</span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="slots-grid">
      <div v-for="i in 18" :key="i" class="slot slot-skeleton"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="grid-error">{{ error }}</div>

    <!-- Slots -->
    <div v-else class="slots-grid">
      <button
        v-for="slot in timeSlots"
        :key="slot.time"
        type="button"
        :class="[
          'slot',
          `slot-${slot.status}`,
          { 'slot-selected': isSelected(slot), 'slot-disabled': slot.status === 'busy' },
        ]"
        :disabled="slot.status === 'busy'"
        :title="
          slot.status === 'busy'
            ? 'All interviewers busy'
            : slot.status === 'partial'
              ? `${slot.busyCount}/${slot.totalCount} interviewer(s) busy`
              : 'All interviewers available'
        "
        @click="selectSlot(slot)"
      >
        <span class="slot-time">{{ slot.label }}</span>
        <span v-if="slot.status === 'partial'" class="slot-info"
          >{{ slot.totalCount - slot.busyCount }}/{{ slot.totalCount }}</span
        >
      </button>
    </div>
  </div>
</template>

<style scoped>
.availability-grid {
  --bg: #0c0e14;
  --surface: #141720;
  --surface2: #1c2030;
  --surface3: #222840;
  --accent: #4f7eff;
  --green: #36d399;
  --yellow: #f9a825;
  --red: #ff6b6b;
  --text: #e8eaf0;
  --muted: #6b7280;
  --border: rgba(255, 255, 255, 0.08);
  --border-hi: rgba(255, 255, 255, 0.14);
  --rs: 10px;

  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--rs);
  padding: 16px;
}

.grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.grid-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.legend {
  display: flex;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--muted);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-free {
  background: var(--green);
}

.dot-partial {
  background: var(--yellow);
}

.dot-busy {
  background: var(--red);
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 6px;
}

.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface2);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.slot:hover:not(.slot-disabled) {
  border-color: var(--border-hi);
}

.slot-time {
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
}

.slot-info {
  font-size: 10px;
  color: var(--muted);
  margin-top: 2px;
}

.slot-free {
  border-left: 3px solid var(--green);
}

.slot-free:hover {
  background: rgba(54, 211, 153, 0.08);
}

.slot-partial {
  border-left: 3px solid var(--yellow);
}

.slot-partial:hover {
  background: rgba(249, 168, 37, 0.08);
}

.slot-busy {
  border-left: 3px solid var(--red);
  opacity: 0.5;
  cursor: not-allowed;
}

.slot-disabled {
  pointer-events: auto;
}

.slot-selected {
  border-color: var(--accent) !important;
  background: rgba(79, 126, 255, 0.12);
  border-left: 3px solid var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.slot-skeleton {
  height: 44px;
  background: var(--surface3);
  animation: pulse 1.5s infinite;
  border: none;
}

.grid-error {
  font-size: 13px;
  color: var(--red);
  padding: 12px 0;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
