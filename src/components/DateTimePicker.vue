<template>
  <div class="space-y-3">
    <!-- Current UTC Time Display -->
    <div v-if="showCurrentTime" class="bg-secondary-bg/30 rounded-lg p-2 border border-border-color/50">
      <div class="flex items-center justify-between text-xs">
        <span class="text-text-muted">Current UTC Time:</span>
        <span class="text-text-primary font-mono font-medium">{{ currentUTCTime }}</span>
      </div>
    </div>

    <!-- Quick Time Presets -->
    <div v-if="showCurrentTime" class="flex flex-wrap gap-1.5">
      <button
        v-for="preset in timePresets"
        :key="preset.label"
        @click="applyPreset(preset.minutes)"
        class="px-2 py-1 text-xs font-medium rounded bg-secondary-bg/50 text-text-secondary hover:bg-secondary-bg transition-colors"
        type="button"
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- Combined Date and Time Picker -->
    <div>
      <label class="block text-xs font-semibold text-text-secondary mb-1.5">Date & Time (UTC)</label>
      <VueDatePicker
        v-model="localDateTime"
        :min-date="minDate"
        :enable-time-picker="true"
        :utc="true"
        :dark="true"
        auto-apply
        :close-on-auto-apply="true"
        placeholder="Select date and time"
        class="datetime-picker"
        @update:model-value="updateDateTime"
      />
    </div>

    <!-- Validation Error -->
    <div v-if="validationError" class="text-xs text-red-400 mt-1">
      <Icon icon="mdi:alert-circle" class="w-3 h-3 inline mr-1" />
      {{ validationError }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const props = defineProps({
  modelValue: {
    type: String,
    default: null
  },
  showCurrentTime: {
    type: Boolean,
    default: true
  },
  minMinutesFromNow: {
    type: Number,
    default: 5
  }
})

const emit = defineEmits(['update:modelValue', 'validation-change'])

const localDateTime = ref(null)
const validationError = ref(null)
const currentUTCTime = ref('')
let timeUpdateInterval = null

// Calculate minimum date (now + minMinutesFromNow in UTC)
const minDate = computed(() => {
  const now = new Date()
  const minTime = new Date(now.getTime() + props.minMinutesFromNow * 60 * 1000)
  return new Date(Date.UTC(
    minTime.getUTCFullYear(),
    minTime.getUTCMonth(),
    minTime.getUTCDate(),
    minTime.getUTCHours(),
    minTime.getUTCMinutes()
  ))
})

// Time presets for quick selection
const timePresets = [
  { label: '+1 hour', minutes: 60 },
  { label: '+6 hours', minutes: 360 },
  { label: '+12 hours', minutes: 720 },
  { label: '+24 hours', minutes: 1440 },
  { label: '+7 days', minutes: 10080 }
]

// Update current UTC time display
function updateCurrentUTCTime() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hours = String(now.getUTCHours()).padStart(2, '0')
  const minutes = String(now.getUTCMinutes()).padStart(2, '0')
  const seconds = String(now.getUTCSeconds()).padStart(2, '0')
  currentUTCTime.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`
}

// Parse datetime-local format to Date object
function parseDateTime(value) {
  if (!value) {
    return null
  }
  
  // Handle datetime-local format: YYYY-MM-DDTHH:mm
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (!match) {
    return null
  }
  
  const [year, month, day] = match[1].split('-').map(Number)
  const [hours, minutes] = match[2].split(':').map(Number)
  
  // Create Date object in UTC
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
}

// Convert Date object to datetime-local format
function formatDateTime(date) {
  if (!date) {
    return null
  }
  
  // Extract UTC components from Date object
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Validate the selected date/time
function validateDateTime(dateTime) {
  if (!dateTime) {
    validationError.value = null
    emit('validation-change', { valid: true, error: null })
    return true
  }
  
  const selectedDate = dateTime instanceof Date ? dateTime : new Date(dateTime)
  const now = new Date()
  const minDate = new Date(now.getTime() + props.minMinutesFromNow * 60 * 1000)
  
  if (isNaN(selectedDate.getTime())) {
    validationError.value = 'Invalid date or time'
    emit('validation-change', { valid: false, error: 'Invalid date or time' })
    return false
  }
  
  if (selectedDate <= now) {
    validationError.value = 'Expiration time must be in the future'
    emit('validation-change', { valid: false, error: 'Expiration time must be in the future' })
    return false
  }
  
  if (selectedDate < minDate) {
    const minTime = new Date(minDate)
    const minHours = String(minTime.getUTCHours()).padStart(2, '0')
    const minMinutes = String(minTime.getUTCMinutes()).padStart(2, '0')
    validationError.value = `Expiration must be at least ${props.minMinutesFromNow} minutes from now (${minHours}:${minMinutes} UTC)`
    emit('validation-change', { valid: false, error: validationError.value })
    return false
  }
  
  validationError.value = null
  emit('validation-change', { valid: true, error: null })
  return true
}

// Update the combined datetime value
function updateDateTime() {
  if (localDateTime.value) {
    const formatted = formatDateTime(localDateTime.value)
    validateDateTime(localDateTime.value)
    emit('update:modelValue', formatted)
  } else {
    emit('update:modelValue', null)
    validationError.value = null
  }
}

// Apply time preset
function applyPreset(minutes) {
  const now = new Date()
  const futureDate = new Date(now.getTime() + minutes * 60 * 1000)
  
  // Create UTC date object
  localDateTime.value = new Date(Date.UTC(
    futureDate.getUTCFullYear(),
    futureDate.getUTCMonth(),
    futureDate.getUTCDate(),
    futureDate.getUTCHours(),
    futureDate.getUTCMinutes(),
    0
  ))
  
  updateDateTime()
}

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    const parsed = parseDateTime(newValue)
    localDateTime.value = parsed
    if (parsed) {
      validateDateTime(parsed)
    }
  } else {
    localDateTime.value = null
    validationError.value = null
  }
}, { immediate: true })

// Initialize current UTC time and update it every second
onMounted(() => {
  updateCurrentUTCTime()
  if (props.showCurrentTime) {
    timeUpdateInterval = setInterval(updateCurrentUTCTime, 1000)
  }
})

onUnmounted(() => {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval)
  }
})
</script>
