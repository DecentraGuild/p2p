/**
 * Composable for searching tokens in the Solana Token Registry
 * Supports searching by ticker, name, and token ID (mint address)
 */

import { ref, computed } from 'vue'
import { TokenListProvider } from '@solana/spl-token-registry'
import { useSolanaConnection } from './useSolanaConnection'
import { fetchTokenMetadata } from '../utils/metaplex'
import { metadataRateLimiter } from '../utils/rateLimiter'

// Token registry cache with expiration
let tokenRegistryList = null
let registryLoadTime = null
let registryLoadPromise = null
const REGISTRY_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

// Use shared connection
const connection = useSolanaConnection()

/**
 * Load token registry and return as array for searching
 * @returns {Promise<Array>} Array of token objects
 */
async function loadTokenRegistryList() {
  // Return existing promise if already loading
  if (registryLoadPromise) {
    return registryLoadPromise
  }

  // Return cached registry if still valid (within TTL)
  if (tokenRegistryList && registryLoadTime && 
      Date.now() - registryLoadTime < REGISTRY_CACHE_TTL) {
    return tokenRegistryList
  }
  
  // Clear expired cache
  if (tokenRegistryList && registryLoadTime && 
      Date.now() - registryLoadTime >= REGISTRY_CACHE_TTL) {
    tokenRegistryList = null
    registryLoadTime = null
  }

  // Start loading registry
  registryLoadPromise = (async () => {
    try {
      const provider = new TokenListProvider()
      const tokenList = await provider.resolve()
      const mainnetTokens = tokenList.filterByClusterSlug('mainnet-beta').getList()
      
      // Convert to array format for easier searching
      // Helper function to clean token strings (remove null bytes, non-printable chars, trim)
      const cleanTokenString = (str) => {
        if (!str || typeof str !== 'string') return null
        return str.replace(/\0/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim() || null
      }
      
      tokenRegistryList = mainnetTokens.map(token => ({
        mint: token.address,
        name: cleanTokenString(token.name),
        symbol: cleanTokenString(token.symbol),
        image: token.logoURI || null,
        decimals: token.decimals || null
      }))
      
      // Set cache timestamp
      registryLoadTime = Date.now()
      
      return tokenRegistryList
    } catch (err) {
      console.warn('Failed to load token registry:', err)
      // Return empty array on error
      tokenRegistryList = []
      return tokenRegistryList
    } finally {
      registryLoadPromise = null
    }
  })()

  return registryLoadPromise
}

/**
 * Fetch token decimals from on-chain if not available in registry
 */
async function fetchTokenDecimals(mintAddress) {
  try {
    const { PublicKey } = await import('@solana/web3.js')
    
    const mintPubkey = new PublicKey(mintAddress)
    const accountInfo = await connection.getParsedAccountInfo(mintPubkey)
    
    if (accountInfo && accountInfo.value && accountInfo.value.data && 'parsed' in accountInfo.value.data) {
      return accountInfo.value.data.parsed.info.decimals
    }
    
    return null
  } catch (err) {
    console.debug(`Failed to fetch decimals for ${mintAddress}:`, err.message)
    return null
  }
}

/**
 * Fetch complete token info (metadata + decimals) for a mint address
 */
async function fetchTokenInfo(mintAddress) {
  try {
    // First try to get from registry
    const registry = await loadTokenRegistryList()
    const registryToken = registry.find(t => t.mint === mintAddress)
    
    // Fetch metadata using hybrid approach
    const metadata = await metadataRateLimiter.execute(() =>
      fetchTokenMetadata(connection, mintAddress, true)
    )
    
    // Get decimals - prefer registry, then on-chain, then default to 9
    let decimals = registryToken?.decimals || null
    if (!decimals) {
      decimals = await fetchTokenDecimals(mintAddress)
    }
    if (!decimals) {
      decimals = 9 // Default fallback
    }
    
    // Helper function to clean token strings
    const cleanTokenString = (str) => {
      if (!str || typeof str !== 'string') return null
      return str.replace(/\0/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim() || null
    }
    
    return {
      mint: mintAddress,
      name: cleanTokenString(metadata?.name || registryToken?.name || null),
      symbol: cleanTokenString(metadata?.symbol || registryToken?.symbol || null),
      image: metadata?.image || registryToken?.image || null,
      decimals: decimals
    }
  } catch (err) {
    console.error(`Error fetching token info for ${mintAddress}:`, err)
    // Return minimal info with default decimals
    return {
      mint: mintAddress,
      name: null,
      symbol: null,
      image: null,
      decimals: 9
    }
  }
}

export function useTokenRegistry() {
  const loading = ref(false)
  const error = ref(null)
  const searchQuery = ref('')
  const searchResults = ref([])
  const customTokenInput = ref('')
  const fetchingTokenInfo = ref(false)

  /**
   * Search tokens in registry by ticker, name, or mint address
   */
  const searchTokens = async (query) => {
    if (!query || query.trim() === '') {
      searchResults.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const registry = await loadTokenRegistryList()
      const lowerQuery = query.toLowerCase().trim()
      
      // Helper to calculate match priority (higher = better match)
      const getMatchPriority = (token) => {
        const symbol = token.symbol?.toLowerCase() || ''
        const name = token.name?.toLowerCase() || ''
        const mint = token.mint.toLowerCase()
        
        // Exact symbol match (highest priority)
        if (symbol === lowerQuery) return 1000
        // Exact name match
        if (name === lowerQuery) return 900
        // Symbol starts with query
        if (symbol.startsWith(lowerQuery)) return 800
        // Name starts with query
        if (name.startsWith(lowerQuery)) return 700
        // Symbol contains query
        if (symbol.includes(lowerQuery)) return 600
        // Name contains query
        if (name.includes(lowerQuery)) return 500
        // Mint contains query (lowest priority)
        if (mint.includes(lowerQuery)) return 100
        
        return 0
      }
      
      // Search and score all tokens
      const scoredResults = registry
        .map(token => ({
          token,
          priority: getMatchPriority(token)
        }))
        .filter(({ priority }) => priority > 0) // Only include matches
        .sort((a, b) => b.priority - a.priority) // Sort by priority descending
      
      // Extract tokens, prioritizing exact matches
      const results = scoredResults.map(({ token }) => token)
      
      // Limit results to 100 to ensure we get exact matches even if there are many partial matches
      // The component will further filter and limit to 50
      searchResults.value = results.slice(0, 100)
    } catch (err) {
      console.error('Error searching tokens:', err)
      error.value = err.message || 'Failed to search tokens'
      searchResults.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Handle custom token ID input and fetch token info
   */
  const handleCustomToken = async (mintAddress) => {
    if (!mintAddress || mintAddress.trim() === '') {
      return null
    }

    fetchingTokenInfo.value = true
    error.value = null

    try {
      // Validate address format
      const { PublicKey } = await import('@solana/web3.js')
      new PublicKey(mintAddress.trim())
      
      // Fetch token info
      const tokenInfo = await fetchTokenInfo(mintAddress.trim())
      return tokenInfo
    } catch (err) {
      if (err.message && err.message.includes('Invalid public key')) {
        error.value = 'Invalid token address format'
      } else {
        error.value = err.message || 'Failed to fetch token info'
      }
      return null
    } finally {
      fetchingTokenInfo.value = false
    }
  }

  /**
   * Preload registry for better UX
   */
  const preloadRegistry = async () => {
    try {
      await loadTokenRegistryList()
    } catch (err) {
      console.debug('Failed to preload token registry:', err.message)
    }
  }

  return {
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    searchQuery,
    searchResults: computed(() => searchResults.value),
    customTokenInput,
    fetchingTokenInfo: computed(() => fetchingTokenInfo.value),
    searchTokens,
    handleCustomToken,
    preloadRegistry,
    fetchTokenInfo
  }
}
