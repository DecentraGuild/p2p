# Codebase Optimization Analysis

## Summary
This document outlines optimization opportunities and base component recommendations for the P2P Escrow application.

## Key Findings

### 1. Repeated Patterns

#### Modal Components
- **Current**: `ConfirmModal.vue`, `BaseShareModal.vue`, and `PricingModal.vue` all share similar structure:
  - Backdrop with click-to-close
  - Close button (X icon)
  - Header with title
  - Content area
  - Footer with actions (in some cases)
- **Recommendation**: Create `BaseModal.vue` component

#### Loading States
- **Current**: Loading spinners are repeated across:
  - `TokenSelector.vue` (lines 5-8)
  - `RequestTokenSelector.vue` (lines 49-52)
  - `EscrowDetail.vue` (lines 31-34)
  - `ManageEscrows.vue` (lines 17-20)
- **Pattern**: `<Icon icon="svg-spinners:ring-resize" class="w-8 h-8 ..." />` with text
- **Recommendation**: Create `BaseLoading.vue` component

#### Empty States
- **Current**: Empty state patterns repeated:
  - `TokenSelector.vue` (lines 22-25, 28-31)
  - `RequestTokenSelector.vue` (lines 61-64, 67-71)
  - `ManageEscrows.vue` (lines 21-25)
- **Pattern**: Icon + message + optional description
- **Recommendation**: Create `BaseEmptyState.vue` component

#### Percentage Buttons
- **Current**: Percentage buttons duplicated in:
  - `TokenAmountSelector.vue` (lines 69-78)
  - `EscrowDetail.vue` (lines 177-186)
- **Pattern**: Array of percentages (25, 50, 75, 100) with click handlers
- **Recommendation**: Create `BasePercentageButtons.vue` component

#### Decimal Handling
- **Current**: Decimal step/placeholder logic duplicated:
  - `TokenAmountSelector.vue` (lines 188-211)
  - `EscrowDetail.vue` (lines 582-590)
- **Pattern**: `getStepForDecimals()` and `getPlaceholderForDecimals()` functions
- **Recommendation**: Extract to `useDecimalHandling.js` composable

#### Price Display Logic
- **Current**: Price calculation duplicated:
  - `PriceDisplay.vue` (lines 90-104)
  - `EscrowDetail.vue` (lines 91-96, similar logic)
- **Recommendation**: Extract to `usePriceCalculation.js` composable

### 2. Component Size Issues

#### Large Components
- **EscrowDetail.vue**: 948 lines - too large, should be broken down
- **CreateEscrow.vue**: 382 lines - manageable but could benefit from extraction
- **TokenAmountSelector.vue**: 213 lines - could extract decimal logic

### 3. Styling Consistency

#### Button Classes
- **Current**: Using utility classes `btn-primary`, `btn-secondary` (defined in `style.css`)
- **Status**: Good - classes are centralized
- **Enhancement**: Could create `BaseButton.vue` for additional features (loading states, icons, etc.)

#### Input Classes
- **Current**: Using utility class `input-field` (defined in `style.css`)
- **Status**: Good - classes are centralized
- **Enhancement**: Could create `BaseInput.vue` for validation, error states, etc.

### 4. Performance Optimizations

#### Computed Properties
- Some computed properties could benefit from memoization
- `PriceDisplay.vue`: `calculatedPrice` and `reversePrice` recalculate on every render
- Consider using `computed` with proper dependencies

#### Watchers
- Multiple watchers in `EscrowDetail.vue` could be optimized
- Some watchers trigger expensive operations (e.g., `loadExchangeCosts`)

## Recommended Base Components

### 1. BaseModal.vue
**Purpose**: Consolidate modal patterns
**Props**:
- `show` (Boolean)
- `title` (String)
- `closeOnBackdrop` (Boolean, default: true)
- `maxWidth` (String, default: 'max-w-md')
- `showCloseButton` (Boolean, default: true)

**Slots**:
- `default` - Main content
- `footer` - Optional footer content

**Usage**:
```vue
<BaseModal v-model:show="showModal" title="My Modal">
  <p>Modal content</p>
  <template #footer>
    <button @click="handleAction">Action</button>
  </template>
</BaseModal>
```

### 2. BaseButton.vue
**Purpose**: Consistent button styling with loading/icon support
**Props**:
- `variant` (String: 'primary' | 'secondary', default: 'primary')
- `loading` (Boolean)
- `disabled` (Boolean)
- `icon` (String) - Iconify icon name
- `iconPosition` (String: 'left' | 'right', default: 'left')
- `size` (String: 'sm' | 'md' | 'lg', default: 'md')

**Usage**:
```vue
<BaseButton 
  variant="primary" 
  :loading="isLoading"
  icon="mdi:check"
>
  Submit
</BaseButton>
```

### 3. BaseLoading.vue
**Purpose**: Consistent loading states
**Props**:
- `size` (String: 'sm' | 'md' | 'lg', default: 'md')
- `message` (String)
- `fullScreen` (Boolean, default: false)

**Usage**:
```vue
<BaseLoading v-if="loading" message="Loading escrows..." />
```

### 4. BaseEmptyState.vue
**Purpose**: Consistent empty states
**Props**:
- `icon` (String, default: 'mdi:inbox-outline')
- `title` (String)
- `description` (String, optional)
- `action` (Object: { label, handler }, optional)

**Usage**:
```vue
<BaseEmptyState
  icon="mdi:wallet-outline"
  title="No tokens found"
  description="Connect wallet to see tokens"
/>
```

### 5. BasePercentageButtons.vue
**Purpose**: Reusable percentage button group
**Props**:
- `percentages` (Array, default: [25, 50, 75, 100])
- `maxValue` (Number) - Maximum value for 100%
- `modelValue` (Number) - Current value
- `decimals` (Number) - Decimal places for formatting

**Emits**:
- `update:modelValue` - Emits calculated amount

**Usage**:
```vue
<BasePercentageButtons
  v-model="amount"
  :max-value="tokenBalance"
  :decimals="token.decimals"
/>
```

### 6. BaseInput.vue
**Purpose**: Enhanced input with validation and error states
**Props**:
- `modelValue` (String | Number)
- `type` (String, default: 'text')
- `label` (String, optional)
- `error` (String, optional)
- `placeholder` (String)
- `disabled` (Boolean)
- `step` (String | Number, for number inputs)
- `min` (Number)
- `max` (Number)

**Usage**:
```vue
<BaseInput
  v-model="amount"
  type="number"
  label="Amount"
  :error="errors.amount"
  :step="getStepForDecimals(token.decimals)"
/>
```

## Recommended Composables

### 1. useDecimalHandling.js
**Purpose**: Centralize decimal step and placeholder logic
**Exports**:
- `getStepForDecimals(decimals)`
- `getPlaceholderForDecimals(decimals)`

**Usage**:
```js
import { useDecimalHandling } from '@/composables/useDecimalHandling'

const { getStepForDecimals, getPlaceholderForDecimals } = useDecimalHandling()
const step = getStepForDecimals(token.decimals)
```

### 2. usePriceCalculation.js
**Purpose**: Centralize price calculation logic
**Exports**:
- `calculatePrice(offerAmount, requestAmount)`
- `calculateReversePrice(offerAmount, requestAmount)`

**Usage**:
```js
import { usePriceCalculation } from '@/composables/usePriceCalculation'

const { calculatePrice, calculateReversePrice } = usePriceCalculation()
const price = calculatePrice(offerAmount, requestAmount)
```

## Implementation Priority

### High Priority
1. ✅ **BaseModal** - Reduces duplication across 3 components
2. ✅ **BaseLoading** - Used in 4+ components
3. ✅ **useDecimalHandling** - Duplicated in 2 components

### Medium Priority
4. ✅ **BaseEmptyState** - Used in 3+ components
5. ✅ **BasePercentageButtons** - Used in 2 components
6. ✅ **usePriceCalculation** - Duplicated logic

### Low Priority
7. ✅ **BaseButton** - Nice to have, but current classes work
8. ✅ **BaseInput** - Nice to have, but current classes work

## Code Quality Improvements

### 1. Break Down Large Components
- **EscrowDetail.vue**: Extract into:
  - `EscrowPriceDisplay.vue`
  - `EscrowFillSection.vue`
  - `EscrowDetailsSection.vue`

### 2. Extract Repeated Logic
- Move confirmation modal logic to composable
- Extract share modal logic to composable

### 3. Performance
- Add `v-memo` for expensive list renders
- Debounce input handlers where appropriate
- Cache computed values that don't change often

## Notes
- Current codebase is well-structured overall
- Good use of composables for business logic
- CSS classes are well-organized in `style.css`
- Component naming follows good conventions
