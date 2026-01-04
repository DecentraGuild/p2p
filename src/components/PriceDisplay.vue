<template>
  <div class="space-y-1.5">
    <h3 class="text-sm font-semibold text-text-primary mb-2 text-center">Price</h3>
    <div class="bg-secondary-bg/50 rounded-xl p-3 space-y-2">
      <!-- Price Line 1 -->
      <div class="grid grid-cols-[1fr_auto_1fr] items-center text-sm text-text-secondary">
        <div class="flex justify-end pr-3">
          <TokenAmountDisplay
            v-if="offerToken"
            :token="offerToken"
            :amount="1"
            :decimals="offerToken.decimals"
            icon-size="sm"
            amount-class="text-text-secondary whitespace-nowrap"
            ticker-class="text-text-secondary whitespace-nowrap"
          />
        </div>
        <div class="flex justify-center flex-shrink-0 px-2">
          <Icon icon="mdi:arrow-left-right" class="w-5 h-5 text-text-primary" />
        </div>
        <div class="flex justify-start pl-3">
          <TokenAmountDisplay
            v-if="requestToken"
            :token="requestToken"
            :amount="calculatedPrice"
            :decimals="requestToken.decimals"
            icon-size="sm"
            amount-class="text-text-secondary whitespace-nowrap"
            ticker-class="text-text-secondary whitespace-nowrap"
          />
        </div>
      </div>
      
      <!-- Price Line 2 (Reverse) -->
      <div class="grid grid-cols-[1fr_auto_1fr] items-center text-sm text-text-secondary">
        <div class="flex justify-end pr-3">
          <TokenAmountDisplay
            v-if="requestToken"
            :token="requestToken"
            :amount="1"
            :decimals="requestToken.decimals"
            icon-size="sm"
            amount-class="text-text-secondary whitespace-nowrap"
            ticker-class="text-text-secondary whitespace-nowrap"
          />
        </div>
        <div class="flex justify-center flex-shrink-0 px-2">
          <Icon icon="mdi:arrow-left-right" class="w-5 h-5 text-text-primary" />
        </div>
        <div class="flex justify-start pl-3">
          <TokenAmountDisplay
            v-if="offerToken"
            :token="offerToken"
            :amount="reversePrice"
            :decimals="offerToken.decimals"
            icon-size="sm"
            amount-class="text-text-secondary whitespace-nowrap"
            ticker-class="text-text-secondary whitespace-nowrap"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import TokenAmountDisplay from './TokenAmountDisplay.vue'

const props = defineProps({
  offerToken: {
    type: Object,
    default: null
  },
  requestToken: {
    type: Object,
    default: null
  },
  offerAmount: {
    type: [String, Number],
    default: 0
  },
  requestAmount: {
    type: [String, Number],
    default: 0
  }
})

const calculatedPrice = computed(() => {
  if (!props.offerAmount || !props.requestAmount || parseFloat(props.offerAmount) === 0) {
    return '0.000000000'
  }
  const ratio = parseFloat(props.requestAmount) / parseFloat(props.offerAmount)
  return ratio.toFixed(9)
})

const reversePrice = computed(() => {
  if (!props.offerAmount || !props.requestAmount || parseFloat(props.requestAmount) === 0) {
    return '0.000000000'
  }
  const ratio = parseFloat(props.offerAmount) / parseFloat(props.requestAmount)
  return ratio.toFixed(9)
})
</script>
