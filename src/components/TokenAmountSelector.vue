<template>
  <div class="space-y-1.5">
    <div class="section-banner">{{ type.toUpperCase() }}</div>
    <div class="bg-secondary-bg/50 rounded-b-xl p-3">
      <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <!-- Token Selector -->
        <div class="flex-1 min-w-0">
          <label class="block text-xs font-semibold text-text-secondary mb-1.5">{{ label }}</label>
          <div class="relative">
            <button
              @click="showTokenSelector = !showTokenSelector"
              class="input-field w-full flex items-center justify-between min-h-[44px]"
            >
              <span v-if="token" class="flex items-center gap-2">
                <BaseTokenImage :token="token" size="sm" />
                <span>{{ token.symbol || truncateAddress(token.mint) }}</span>
              </span>
              <span v-else class="text-text-muted">Select token</span>
              <div class="flex items-center gap-1.5">
                <Icon
                  v-if="token"
                  icon="mdi:close-circle"
                  class="w-4 h-4 text-text-muted hover:text-text-primary cursor-pointer"
                  @click.stop="clearToken"
                />
                <Icon icon="mdi:chevron-down" class="w-4 h-4" />
              </div>
            </button>
            <!-- Token Selector Dropdown -->
            <TokenSelector
              v-if="type === 'offer'"
              :show="showTokenSelector"
              @select="selectToken"
              @close="showTokenSelector = false"
            />
            <RequestTokenSelector
              v-else
              :show="showTokenSelector"
              @select="selectToken"
              @close="showTokenSelector = false"
            />
          </div>
        </div>

        <!-- Amount Input -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-semibold text-text-secondary">Amount</label>
            <!-- Wallet Balance above input (only for offer type when token is selected) -->
            <div v-if="type === 'offer' && token" class="text-xs text-text-muted hidden sm:block">
              <span v-if="tokenBalance !== undefined && tokenBalance !== null">
                Wallet balance : {{ formatBalance(tokenBalance) }}
              </span>
              <span v-else>Loading balance...</span>
            </div>
          </div>
          <!-- Mobile: Show balance below label -->
          <div v-if="type === 'offer' && token" class="text-xs text-text-muted mb-1.5 sm:hidden">
            <span v-if="tokenBalance !== undefined && tokenBalance !== null">
              Balance: {{ formatBalance(tokenBalance) }}
            </span>
            <span v-else>Loading balance...</span>
          </div>
          <div class="relative">
            <input
              v-model="localAmount"
              type="number"
              :step="token ? getStepForDecimals(token.decimals) : '0.01'"
              min="0"
              :placeholder="token ? getPlaceholderForDecimals(token.decimals) : '0.00'"
              class="input-field w-full min-h-[44px]"
              :class="type === 'offer' && token && tokenBalance > 0 ? 'pr-24 sm:pr-32' : ''"
              @input="updateAmount"
              @blur="handleBlur"
              @keydown.delete="handleDelete"
              @keydown.backspace="handleBackspace"
              @keydown="handleKeydown"
            />
            <!-- Percentage Buttons inside input (only for offer type) -->
            <div v-if="type === 'offer' && token && tokenBalance > 0" class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 sm:gap-1">
              <button
                v-for="percentage in percentageOptions"
                :key="percentage.value"
                @click.stop="setPercentage(percentage.value)"
                class="px-1 sm:px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded bg-secondary-bg/80 text-text-secondary hover:bg-secondary-bg transition-colors min-h-[24px]"
              >
                {{ percentage.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Icon } from '@iconify/vue'
import TokenSelector from './TokenSelector.vue'
import RequestTokenSelector from './RequestTokenSelector.vue'
import BaseTokenImage from './BaseTokenImage.vue'
import { useWalletBalances } from '../composables/useWalletBalances'
import { usePercentageButtons } from '../composables/usePercentageButtons'
import { formatBalance as formatBalanceUtil, truncateAddress, formatDecimals } from '../utils/formatters'
import { DECIMAL_CONSTANTS } from '../utils/constants'

const props = defineProps({
  type: {
    type: String,
    required: true,
    validator: (value) => ['offer', 'request'].includes(value)
  },
  token: {
    type: Object,
    default: null
  },
  amount: {
    type: String,
    default: '0.00'
  },
  showBalance: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:token', 'update:amount'])

const showTokenSelector = ref(false)
const localAmount = ref(props.amount)
const { getTokenBalance } = useWalletBalances()

const label = computed(() => {
  return props.type.charAt(0).toUpperCase() + props.type.slice(1)
})

// Get token balance from wallet
// Prefer balance from token object (when selected from TokenSelector), otherwise fetch from wallet
const tokenBalance = computed(() => {
  if (!props.token || !props.token.mint) return 0
  // If token object has balance property, use it (from TokenSelector)
  if (props.token.balance !== undefined && props.token.balance !== null) {
    return props.token.balance
  }
  // Otherwise, fetch from wallet balances
  return getTokenBalance(props.token.mint)
})

// Percentage options - computed directly for reactivity
const percentageOptions = computed(() => {
  if (!props.token || tokenBalance.value <= 0) return []
  
  const percentages = [25, 50, 75, 100]
  return percentages.map(percent => ({
    label: percent === 100 ? 'MAX' : `${percent}%`,
    value: percent / 100
  }))
})

// Track if user is actively editing to prevent watch from overwriting empty input
const isEditing = ref(false)

watch(() => props.amount, (newVal) => {
  // Only update localAmount if user is not actively editing
  // This prevents restoring old values when user clears the input
  if (!isEditing.value) {
    localAmount.value = newVal
  }
})

const updateAmount = (event) => {
  // Only set isEditing if this is a user input event (not programmatic)
  if (event) {
    isEditing.value = true
  }
  
  // Get the raw value from the input element or use localAmount
  const inputElement = event?.target
  let rawValue = inputElement?.value
  
  // If no event (programmatic call), use localAmount value
  if (rawValue === undefined && !event) {
    rawValue = localAmount.value
  }
  
  // For number inputs, empty string becomes empty string, but we need to check
  // If the input is empty or just whitespace, emit empty string
  if (rawValue === '' || rawValue === null || rawValue === undefined) {
    localAmount.value = ''
    emit('update:amount', '')
    // Reset editing flag after a short delay to allow watch to work again
    if (event) {
      setTimeout(() => {
        isEditing.value = false
      }, 100)
    }
    return
  }
  
  // Convert to string and trim
  let amountValue = String(rawValue).trim()
  
  // Validate: For tokens with 0 decimals, prevent decimal input
  if (props.token && props.token.decimals === 0) {
    // Check if the value contains a decimal point
    if (amountValue.includes('.')) {
      // Remove decimal point and everything after it
      amountValue = amountValue.split('.')[0]
      // Update the input field to reflect the change
      if (event?.target) {
        event.target.value = amountValue
      }
    }
    // Also ensure it's a valid integer (no scientific notation, etc.)
    const numValue = parseFloat(amountValue)
    if (!isNaN(numValue)) {
      amountValue = Math.floor(numValue).toString()
      if (event?.target && event.target.value !== amountValue) {
        event.target.value = amountValue
      }
    }
  }
  
  // If after trimming it's empty, emit empty string
  if (amountValue === '') {
    localAmount.value = ''
    emit('update:amount', '')
  } else {
    // Update localAmount and emit the value
    localAmount.value = amountValue
    emit('update:amount', amountValue)
  }
  
  // Reset editing flag after a short delay (only if it was a user event)
  if (event) {
    setTimeout(() => {
      isEditing.value = false
    }, 100)
  }
}

const handleBlur = () => {
  // When input loses focus, if it's empty, keep it empty (don't restore to '0.00')
  // The validation will handle empty values elsewhere
  isEditing.value = false
  
  // If the input is empty or just whitespace, ensure it stays empty
  if (!localAmount.value || String(localAmount.value).trim() === '' || localAmount.value === '0' || localAmount.value === 0) {
    localAmount.value = ''
    emit('update:amount', '')
  }
}

const handleDelete = (event) => {
  // Allow delete key to work normally, but ensure empty values are handled
  isEditing.value = true
}

const handleBackspace = (event) => {
  // When backspace is pressed, if the current value is "0" or empty, clear it completely
  const input = event.target
  const currentValue = input.value
  
  // If value is "0" or empty, prevent default and clear the field
  if (currentValue === '0' || currentValue === '' || currentValue === null) {
    event.preventDefault()
    localAmount.value = ''
    emit('update:amount', '')
    // Set cursor position to start
    setTimeout(() => {
      input.setSelectionRange(0, 0)
    }, 0)
  } else {
    isEditing.value = true
  }
}

const handleKeydown = (event) => {
  // For tokens with 0 decimals, prevent decimal point and comma from being entered
  if (props.token && props.token.decimals === 0) {
    // Prevent decimal point (period) and comma
    if (event.key === '.' || event.key === ',' || event.key === 'e' || event.key === 'E' || event.key === '+' || event.key === '-') {
      event.preventDefault()
      return false
    }
  }
}

const setPercentage = (percentage) => {
  if (!props.token || tokenBalance.value <= 0) return
  
  const amount = tokenBalance.value * percentage
  
  // For tokens with 0 decimals, ensure we use whole numbers only
  let formattedAmount
  if (props.token.decimals === 0) {
    formattedAmount = Math.floor(amount).toString()
  } else {
    // Format amount using formatDecimals utility
    formattedAmount = formatDecimals(amount)
  }
  
  // Set isEditing to false temporarily to allow the update
  isEditing.value = false
  
  // Update localAmount and emit directly (don't use updateAmount which expects an event)
  localAmount.value = formattedAmount
  emit('update:amount', formattedAmount)
}

const selectToken = (token) => {
  emit('update:token', token)
  showTokenSelector.value = false
}

const clearToken = () => {
  emit('update:token', null)
  localAmount.value = '0.00'
  updateAmount()
}

// Use formatBalance from utils
const formatBalance = (balance) => {
  return formatBalanceUtil(balance, 4, true)
}

const getStepForDecimals = (decimals) => {
  // For tokens with 0 decimals, use step of 1 (whole numbers only)
  if (decimals === 0) {
    return '1'
  }
  if (!decimals || decimals === DECIMAL_CONSTANTS.MIN_DECIMALS) {
    return DECIMAL_CONSTANTS.STEP_VALUES.TWO
  }
  // For tokens with many decimals, use a reasonable step
  // Cap at MAX_STEP_DECIMALS to avoid precision issues
  const displayDecimals = Math.min(decimals, DECIMAL_CONSTANTS.MAX_STEP_DECIMALS)
  // Create step string manually to avoid precision issues
  const { STEP_THRESHOLDS, STEP_VALUES } = DECIMAL_CONSTANTS
  if (displayDecimals <= STEP_THRESHOLDS.TWO) return STEP_VALUES.TWO
  if (displayDecimals <= STEP_THRESHOLDS.FOUR) return STEP_VALUES.FOUR
  if (displayDecimals <= STEP_THRESHOLDS.SIX) return STEP_VALUES.SIX
  if (displayDecimals <= STEP_THRESHOLDS.EIGHT) return STEP_VALUES.EIGHT
  return STEP_VALUES.NINE
}

const getPlaceholderForDecimals = (decimals) => {
  // For tokens with 0 decimals, show whole number placeholder
  if (decimals === 0) {
    return '0'
  }
  if (!decimals || decimals === DECIMAL_CONSTANTS.MIN_DECIMALS) {
    return `${DECIMAL_CONSTANTS.MIN_DECIMALS}.${'0'.repeat(DECIMAL_CONSTANTS.DEFAULT_DECIMALS)}`
  }
  // Show placeholder with appropriate decimal places (max MAX_DISPLAY_DECIMALS for readability)
  const displayDecimals = Math.min(decimals, DECIMAL_CONSTANTS.MAX_DISPLAY_DECIMALS)
  return `0.${'0'.repeat(displayDecimals)}`
}
</script>
