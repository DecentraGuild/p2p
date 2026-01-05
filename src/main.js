import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// Buffer polyfill is handled by vite-plugin-node-polyfills in vite.config.js
// No manual setup needed here

// Validate required environment variables in production
if (import.meta.env.PROD) {
  const requiredEnvVars = ['VITE_HELIUS_API_KEY']
  const missingVars = requiredEnvVars.filter(key => !import.meta.env[key])
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '))
    console.error('Please set these variables before building for production.')
    // In production, we'll still allow the app to run but log the error
    // The network.js file will handle the actual validation
  }
}

// Solana Wallets Vue setup
import SolanaWallets from 'solana-wallets-vue'
import 'solana-wallets-vue/styles.css'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'

// Optimized wallet configuration for mobile support
// solana-wallets-vue automatically includes:
// - Mobile Wallet Adapter (MWA) for Android mobile connections via deep links
// - Wallet Standard support for automatic wallet detection (includes Backpack)
// 
// Mobile Wallet Adapter is automatically enabled on Android devices
// Wallet Standard wallets (like Backpack) are automatically discovered
const walletOptions = {
  wallets: [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network: WalletAdapterNetwork.Mainnet }),
    // Note: Backpack and other Wallet Standard wallets are automatically detected
    // via the Wallet Standard integration in solana-wallets-vue
    // No need to explicitly add BackpackWalletAdapter - it's auto-discovered
  ],
  autoConnect: true,
  // localStorageKey is used to persist wallet selection across sessions
  localStorageKey: 'walletName',
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(SolanaWallets, walletOptions)

app.mount('#app')
