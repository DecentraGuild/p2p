/**
 * Wallet Detection Utility
 * Ensures Wallet Standard wallets (like Backpack) are properly detected on mobile
 */

/**
 * Check if we're on a mobile device
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

/**
 * Check if we're in an in-app browser (like Backpack's in-wallet browser)
 */
export function isInAppBrowser() {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('backpack') || 
         ua.includes('phantom') || 
         ua.includes('solflare') ||
         (ua.includes('wv') && !ua.includes('chrome'))
}

/**
 * Wait for Wallet Standard API to be available
 * On mobile, especially in in-app browsers, Wallet Standard might not be immediately available
 */
export function waitForWalletStandard(maxWait = 5000) {
  return new Promise((resolve) => {
    // Check if Wallet Standard is already available
    if (typeof window !== 'undefined' && window.navigator?.wallets) {
      resolve(true)
      return
    }

    // Also check for solana property (legacy Wallet Standard detection)
    if (typeof window !== 'undefined' && window.solana) {
      resolve(true)
      return
    }

    // Wait for Wallet Standard to be injected
    let attempts = 0
    const maxAttempts = maxWait / 100 // Check every 100ms
    const interval = setInterval(() => {
      attempts++
      
      if (typeof window !== 'undefined' && 
          (window.navigator?.wallets || window.solana)) {
        clearInterval(interval)
        resolve(true)
        return
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval)
        resolve(false)
      }
    }, 100)
  })
}

/**
 * Check if Backpack wallet is available
 */
export function isBackpackAvailable() {
  if (typeof window === 'undefined') return false
  
  // Check for Wallet Standard Backpack
  if (window.navigator?.wallets) {
    const wallets = window.navigator.wallets
    if (Array.isArray(wallets)) {
      return wallets.some(wallet => 
        wallet.name?.toLowerCase().includes('backpack') ||
        wallet.id?.toLowerCase().includes('backpack')
      )
    }
  }

  // Check for legacy solana property
  if (window.solana && window.solana.isBackpack) {
    return true
  }

  // Check for window.backpack (some implementations)
  if (window.backpack) {
    return true
  }

  return false
}

/**
 * Wait for Backpack wallet to be available
 */
export async function waitForBackpack(maxWait = 5000) {
  const startTime = Date.now()
  
  while (Date.now() - startTime < maxWait) {
    if (isBackpackAvailable()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return false
}

/**
 * Initialize wallet detection for mobile devices
 * This should be called early in the app lifecycle
 */
export async function initializeWalletDetection() {
  if (!isMobileDevice()) {
    return // Desktop doesn't need special handling
  }

  console.log('[Wallet Detection] Initializing mobile wallet detection...')
  console.log('[Wallet Detection] User Agent:', navigator.userAgent)
  console.log('[Wallet Detection] Is In-App Browser:', isInAppBrowser())

  // On mobile, wait for Wallet Standard to be available
  const walletStandardAvailable = await waitForWalletStandard(5000)
  
  if (walletStandardAvailable) {
    console.log('[Wallet Detection] Wallet Standard detected on mobile')
    
    // Log available wallets for debugging
    if (typeof window !== 'undefined' && window.navigator?.wallets) {
      const wallets = window.navigator.wallets
      console.log('[Wallet Detection] Available Wallet Standard wallets:', 
        Array.isArray(wallets) ? wallets.map(w => w.name || w.id) : 'Not an array')
    }
  } else {
    console.warn('[Wallet Detection] Wallet Standard not detected on mobile - wallets may not be available')
    console.warn('[Wallet Detection] window.navigator.wallets:', typeof window !== 'undefined' ? window.navigator?.wallets : 'N/A')
    console.warn('[Wallet Detection] window.solana:', typeof window !== 'undefined' ? !!window.solana : 'N/A')
  }

  // Specifically check for Backpack
  if (isInAppBrowser()) {
    console.log('[Wallet Detection] Detected in-app browser, checking for Backpack...')
    const backpackAvailable = await waitForBackpack(3000)
    if (backpackAvailable) {
      console.log('[Wallet Detection] Backpack detected in in-app browser')
    } else {
      console.warn('[Wallet Detection] Backpack not detected in in-app browser')
      console.warn('[Wallet Detection] This may indicate a Wallet Standard detection issue')
    }
  }

  // Additional check: Try to trigger Wallet Standard detection by accessing the API
  // Some wallets need this to properly register
  if (typeof window !== 'undefined') {
    try {
      // Access Wallet Standard API to ensure it's initialized
      if (window.navigator?.wallets) {
        const wallets = window.navigator.wallets
        if (Array.isArray(wallets)) {
          console.log('[Wallet Detection] Found', wallets.length, 'Wallet Standard wallet(s)')
        }
      }
    } catch (err) {
      console.warn('[Wallet Detection] Error accessing Wallet Standard API:', err)
    }
  }
}
