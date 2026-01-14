/**
 * ✅ Coin ID Pre-Validation Service - Divine Perfection
 * 
 * Production-ready validator that ensures CoinGecko coin IDs are valid
 * BEFORE making API calls, preventing misleading empty object responses.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROBLEM SOLVED:
 * CoinGecko returns HTTP 200 with empty object {} for invalid coin IDs.
 * This is MISLEADING - makes it appear the API succeeded but found nothing.
 * This service validates coin IDs upfront to prevent wasted API calls.
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Fetches and caches CoinGecko's complete coin list (~14,000+ coins)
 * - O(1) validation using Set-based lookup
 * - 24-hour cache with automatic refresh
 * - Symbol-to-ID mapping for reverse lookups
 * - Graceful degradation if initialization fails
 * - Thread-safe singleton pattern
 * - Retry logic with exponential backoff
 * - Metrics and statistics tracking
 * 
 * USAGE:
 *   import { getCoinIdValidator, validateCoinIds } from './coin-id-validator';
 * 
 *   // Quick validation
 *   const result = await validateCoinIds(['bitcoin', 'invalid-xyz']);
 *   // { valid: ['bitcoin'], invalid: ['invalid-xyz'], cached: true }
 * 
 *   // Or use the full validator
 *   const validator = getCoinIdValidator();
 *   await validator.initialize();
 *   const isValid = await validator.isValidId('bitcoin'); // true
 * 
 * @module coin-id-validator
 * @version 1.0.0
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * CoinGecko coin list entry (from /coins/list endpoint)
 */
interface CoinGeckoCoinEntry {
  id: string;
  symbol: string;
  name: string;
}

/**
 * Result of coin ID validation
 */
export interface CoinIdValidationResult {
  /** Coin IDs that are valid and exist in CoinGecko */
  valid: string[];
  /** Coin IDs that were not found in CoinGecko */
  invalid: string[];
  /** Whether the result came from cached data */
  cached: boolean;
  /** Validation timestamp */
  timestamp: string;
  /** Time taken to validate (ms) */
  validationTime: number;
}

/**
 * Validator statistics
 */
export interface ValidatorStats {
  isInitialized: boolean;
  totalCoins: number;
  totalSymbols: number;
  lastFetchTime: number;
  cacheAgeMs: number;
  cacheValid: boolean;
  totalValidations: number;
  totalValidIds: number;
  totalInvalidIds: number;
  hitRate: number;
  isFallbackMode: boolean;
  rateLimitedUntil?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // CoinGecko API endpoints
  COINGECKO_BASE_URL: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
  COINGECKO_PRO_URL: 'https://pro-api.coingecko.com/api/v3',
  
  // Cache settings
  CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_REFRESH_BUFFER_MS: 60 * 60 * 1000, // Refresh 1 hour before expiry
  
  // API settings
  TIMEOUT_MS: 30000, // 30 seconds (coin list is large)
  MAX_RETRIES: 2, // Reduced retries to avoid excessive API calls
  RETRY_DELAY_BASE_MS: 2000, // Longer base delay for backoff
  
  // Rate limiting - much more conservative to avoid 429 errors
  MIN_FETCH_INTERVAL_MS: 300000, // 5 minutes between fetch attempts
  RATE_LIMIT_BACKOFF_MS: 600000, // 10 minutes backoff after rate limit
};

// ============================================================================
// COIN ID VALIDATOR CLASS
// ============================================================================

/**
 * Production-ready CoinGecko coin ID validator
 * 
 * Validates coin IDs against CoinGecko's coin list before API calls
 * to prevent misleading empty responses.
 */
export class CoinIdValidator {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Set of valid CoinGecko coin IDs (lowercase) */
  private validCoinIds: Set<string> = new Set();
  
  /** Map of symbol -> coin ID (for reverse lookups) */
  private symbolToId: Map<string, string[]> = new Map();
  
  /** Map of name -> coin ID (for name-based lookups) */
  private nameToId: Map<string, string> = new Map();
  
  /** Last successful fetch timestamp */
  private lastFetchTime: number = 0;
  
  /** Whether the validator has been initialized */
  private isInitialized: boolean = false;
  
  /** Promise for ongoing initialization (prevents duplicate fetches) */
  private initPromise: Promise<void> | null = null;
  
  /** Whether a fetch is currently in progress */
  private fetchInProgress: boolean = false;
  
  /** Last fetch attempt timestamp (for rate limiting) */
  private lastFetchAttempt: number = 0;

  /** Track if we hit rate limit recently */
  private rateLimitedUntil: number = 0;

  /** Flag to use fallback coin list if API persistently fails */
  private useFallbackMode: boolean = false;

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private metrics = {
    totalValidations: 0,
    totalValidIds: 0,
    totalInvalidIds: 0,
    fetchAttempts: 0,
    fetchSuccesses: 0,
    fetchFailures: 0,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize the validator by fetching the coin list
   * Safe to call multiple times - uses singleton initialization pattern
   */
  async initialize(): Promise<void> {
    // If already initialized and cache is valid, return immediately
    if (this.isInitialized && this.isCacheValid()) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start new initialization
    this.initPromise = this._initializeInternal();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Internal initialization logic
   */
  private async _initializeInternal(): Promise<void> {
    // Prevent concurrent fetches
    if (this.fetchInProgress) {
      while (this.fetchInProgress) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    const now = Date.now();
    
    // Check if we're still in rate limit backoff
    if (now < this.rateLimitedUntil) {
      logger.debug('Coin ID validator: skipping fetch (rate limit backoff)', {
        waitMs: this.rateLimitedUntil - now,
      });
      // Use fallback mode if we haven't initialized yet
      if (!this.isInitialized) {
        this.initializeWithFallback();
      }
      return;
    }

    // Rate limit fetch attempts
    if (now - this.lastFetchAttempt < CONFIG.MIN_FETCH_INTERVAL_MS && this.isInitialized) {
      logger.debug('Coin ID validator: skipping fetch (rate limited)');
      return;
    }

    this.fetchInProgress = true;
    this.lastFetchAttempt = now;

    try {
      await this.fetchCoinList();
      this.isInitialized = true;
      this.useFallbackMode = false;
      
      logger.info('✅ Coin ID validator initialized', {
        coinCount: this.validCoinIds.size,
        symbolCount: this.symbolToId.size,
        nameCount: this.nameToId.size,
      });
    } catch (error: any) {
      this.metrics.fetchFailures++;
      
      // Check if it's a rate limit error
      const isRateLimit = (error as AxiosError)?.response?.status === 429 ||
                          error.message?.includes('429') ||
                          error.message?.includes('rate');
      
      if (isRateLimit) {
        this.rateLimitedUntil = now + CONFIG.RATE_LIMIT_BACKOFF_MS;
        logger.warn('⚠️ Coin ID validator rate limited, backing off', {
          backoffMs: CONFIG.RATE_LIMIT_BACKOFF_MS,
          retryAt: new Date(this.rateLimitedUntil).toISOString(),
        });
      }
      
      // Initialize with fallback if API fails
      if (!this.isInitialized) {
        this.initializeWithFallback();
        logger.warn('⚠️ Coin ID validator using fallback coin list', {
          error: error.message,
          fallbackCoins: this.validCoinIds.size,
        });
      }
    } finally {
      this.fetchInProgress = false;
    }
  }

  /**
   * Initialize with a fallback list of common coins when API fails
   */
  private initializeWithFallback(): void {
    // Common cryptocurrency coins that should always be valid
    const FALLBACK_COINS: CoinGeckoCoinEntry[] = [
      // Top 50 by market cap + common tokens
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
      { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
      { id: 'tether', symbol: 'usdt', name: 'Tether' },
      { id: 'binancecoin', symbol: 'bnb', name: 'BNB' },
      { id: 'solana', symbol: 'sol', name: 'Solana' },
      { id: 'ripple', symbol: 'xrp', name: 'XRP' },
      { id: 'usd-coin', symbol: 'usdc', name: 'USD Coin' },
      { id: 'staked-ether', symbol: 'steth', name: 'Lido Staked Ether' },
      { id: 'cardano', symbol: 'ada', name: 'Cardano' },
      { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
      { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche' },
      { id: 'tron', symbol: 'trx', name: 'TRON' },
      { id: 'the-open-network', symbol: 'ton', name: 'Toncoin' },
      { id: 'chainlink', symbol: 'link', name: 'Chainlink' },
      { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
      { id: 'matic-network', symbol: 'matic', name: 'Polygon' },
      { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu' },
      { id: 'wrapped-bitcoin', symbol: 'wbtc', name: 'Wrapped Bitcoin' },
      { id: 'dai', symbol: 'dai', name: 'Dai' },
      { id: 'litecoin', symbol: 'ltc', name: 'Litecoin' },
      { id: 'bitcoin-cash', symbol: 'bch', name: 'Bitcoin Cash' },
      { id: 'uniswap', symbol: 'uni', name: 'Uniswap' },
      { id: 'cosmos', symbol: 'atom', name: 'Cosmos Hub' },
      { id: 'stellar', symbol: 'xlm', name: 'Stellar' },
      { id: 'ethereum-classic', symbol: 'etc', name: 'Ethereum Classic' },
      { id: 'internet-computer', symbol: 'icp', name: 'Internet Computer' },
      { id: 'filecoin', symbol: 'fil', name: 'Filecoin' },
      { id: 'hedera-hashgraph', symbol: 'hbar', name: 'Hedera' },
      { id: 'aptos', symbol: 'apt', name: 'Aptos' },
      { id: 'arbitrum', symbol: 'arb', name: 'Arbitrum' },
      { id: 'optimism', symbol: 'op', name: 'Optimism' },
      { id: 'sui', symbol: 'sui', name: 'Sui' },
      { id: 'near', symbol: 'near', name: 'NEAR Protocol' },
      { id: 'vechain', symbol: 'vet', name: 'VeChain' },
      { id: 'maker', symbol: 'mkr', name: 'Maker' },
      { id: 'aave', symbol: 'aave', name: 'Aave' },
      { id: 'the-graph', symbol: 'grt', name: 'The Graph' },
      { id: 'render-token', symbol: 'rndr', name: 'Render Token' },
      { id: 'algorand', symbol: 'algo', name: 'Algorand' },
      { id: 'fantom', symbol: 'ftm', name: 'Fantom' },
      { id: 'pepe', symbol: 'pepe', name: 'Pepe' },
      { id: 'injective-protocol', symbol: 'inj', name: 'Injective' },
      { id: 'kaspa', symbol: 'kas', name: 'Kaspa' },
      { id: 'immutable-x', symbol: 'imx', name: 'Immutable' },
      { id: 'sei-network', symbol: 'sei', name: 'Sei' },
      { id: 'celestia', symbol: 'tia', name: 'Celestia' },
      { id: 'bittensor', symbol: 'tao', name: 'Bittensor' },
      { id: 'bonk', symbol: 'bonk', name: 'Bonk' },
      { id: 'floki', symbol: 'floki', name: 'FLOKI' },
      { id: 'jupiter', symbol: 'jup', name: 'Jupiter' },
      { id: 'just', symbol: 'jst', name: 'JUST' },
      { id: '2026-token', symbol: '2026', name: '2026' }, // Support tokens mentioned in logs
    ];

    this.buildValidationStructures(FALLBACK_COINS);
    this.isInitialized = true;
    this.useFallbackMode = true;
    this.lastFetchTime = Date.now();
    
    logger.info('✅ Coin ID validator initialized with fallback list', {
      coinCount: this.validCoinIds.size,
      mode: 'fallback',
    });
  }

  /**
   * Fetch coin list from CoinGecko with retry logic
   */
  private async fetchCoinList(): Promise<void> {
    const isPro = !!process.env.COINGECKO_API_KEY;
    const baseUrl = isPro ? CONFIG.COINGECKO_PRO_URL : CONFIG.COINGECKO_BASE_URL;
    const headers: Record<string, string> = { 
      'Accept': 'application/json',
      'User-Agent': 'Coinet-Platform/1.0',
    };
    
    if (isPro) {
      headers['x-cg-pro-api-key'] = process.env.COINGECKO_API_KEY!;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
      this.metrics.fetchAttempts++;

      try {
        logger.debug('Fetching CoinGecko coin list', { attempt: attempt + 1, isPro });

        const response = await axios.get<CoinGeckoCoinEntry[]>(`${baseUrl}/coins/list`, {
          headers,
          timeout: CONFIG.TIMEOUT_MS,
        });

        // Validate response
        if (!Array.isArray(response.data)) {
          throw new Error('Invalid response: expected array');
        }

        if (response.data.length === 0) {
          throw new Error('Invalid response: empty array');
        }

        // Build validation data structures
        this.buildValidationStructures(response.data);
        this.lastFetchTime = Date.now();
        this.metrics.fetchSuccesses++;
        this.rateLimitedUntil = 0; // Clear rate limit flag on success

        logger.info('📋 CoinGecko coin list fetched', {
          coinCount: this.validCoinIds.size,
          symbolCount: this.symbolToId.size,
          isPro,
          attempt: attempt + 1,
        });

        return;
      } catch (error: any) {
        lastError = error;
        
        // Log the error
        const axiosError = error as AxiosError;
        const isRateLimit = axiosError.response?.status === 429;
        const isBadRequest = axiosError.response?.status === 400;
        const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
        
        logger.warn('Coin list fetch failed', {
          attempt: attempt + 1,
          maxRetries: CONFIG.MAX_RETRIES,
          error: error.message,
          isRateLimit,
          isBadRequest,
          isTimeout,
        });

        // If rate limited, set backoff and don't retry
        if (isRateLimit) {
          this.rateLimitedUntil = Date.now() + CONFIG.RATE_LIMIT_BACKOFF_MS;
          throw new Error('Rate limited by CoinGecko API');
        }

        // If bad request, don't retry - API might be down or endpoint changed
        if (isBadRequest) {
          throw new Error('Bad request to CoinGecko API - using fallback');
        }

        // Calculate delay with exponential backoff
        if (attempt < CONFIG.MAX_RETRIES - 1) {
          const delay = CONFIG.RETRY_DELAY_BASE_MS * Math.pow(2, attempt);
          const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
          
          logger.debug(`Retrying in ${Math.round(delay + jitter)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay + jitter));
        }
      }
    }

    throw lastError || new Error('Failed to fetch coin list after all retries');
  }

  /**
   * Build validation data structures from coin list
   */
  private buildValidationStructures(coins: CoinGeckoCoinEntry[]): void {
    // Clear existing data
    this.validCoinIds.clear();
    this.symbolToId.clear();
    this.nameToId.clear();

    for (const coin of coins) {
      if (!coin.id || !coin.symbol) continue;

      const id = coin.id.toLowerCase();
      const symbol = coin.symbol.toLowerCase();
      const name = coin.name?.toLowerCase();

      // Add to valid IDs set
      this.validCoinIds.add(id);

      // Map symbol to IDs (many coins can share a symbol)
      const existingIds = this.symbolToId.get(symbol) || [];
      existingIds.push(id);
      this.symbolToId.set(symbol, existingIds);

      // Map name to ID (first one wins for duplicates)
      if (name && !this.nameToId.has(name)) {
        this.nameToId.set(name, id);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if the cache is still valid
   */
  private isCacheValid(): boolean {
    if (this.lastFetchTime === 0) return false;
    const age = Date.now() - this.lastFetchTime;
    return age < CONFIG.CACHE_TTL_MS;
  }

  /**
   * Check if cache should be refreshed (within buffer window)
   */
  private shouldRefreshCache(): boolean {
    if (this.lastFetchTime === 0) return true;
    const age = Date.now() - this.lastFetchTime;
    return age > (CONFIG.CACHE_TTL_MS - CONFIG.CACHE_REFRESH_BUFFER_MS);
  }

  /**
   * Trigger a background cache refresh if needed
   * 
   * ✅ FIXED: Race condition prevented by setting fetchInProgress
   * BEFORE the async operation starts.
   */
  private triggerBackgroundRefreshIfNeeded(): void {
    // Early exit if refresh not needed or already in progress
    if (!this.shouldRefreshCache() || this.fetchInProgress) {
      return;
    }

    // Check rate limit to prevent excessive API calls
    const now = Date.now();
    if (now - this.lastFetchAttempt < CONFIG.MIN_FETCH_INTERVAL_MS) {
      return;
    }

    // ✅ Set flags BEFORE async operation to prevent race condition
    this.fetchInProgress = true;
    this.lastFetchAttempt = now;

    // Fire and forget with proper cleanup
    this.fetchCoinList()
      .then(() => {
        this.fetchInProgress = false;
        logger.debug('Background cache refresh completed successfully');
      })
      .catch(err => {
        this.fetchInProgress = false;
        logger.debug('Background cache refresh failed', { error: err.message });
      });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate multiple coin IDs
   * 
   * @param coinIds Array of CoinGecko coin IDs to validate
   * @returns Validation result with valid and invalid arrays
   */
  async validateIds(coinIds: string[]): Promise<CoinIdValidationResult> {
    const startTime = Date.now();
    
    // Ensure initialized
    await this.initialize();

    // Trigger background refresh if needed (non-blocking)
    this.triggerBackgroundRefreshIfNeeded();

    // Track metrics
    this.metrics.totalValidations++;

    // If not initialized or no data, return all as valid (graceful degradation)
    if (!this.isInitialized || this.validCoinIds.size === 0) {
      logger.debug('Coin ID validator not available, allowing all IDs');
      return {
        valid: coinIds,
        invalid: [],
        cached: false,
        timestamp: new Date().toISOString(),
        validationTime: Date.now() - startTime,
      };
    }

    const valid: string[] = [];
    const invalid: string[] = [];

    for (const coinId of coinIds) {
      const normalizedId = coinId.toLowerCase().trim();
      
      if (this.validCoinIds.has(normalizedId)) {
        valid.push(coinId);
        this.metrics.totalValidIds++;
      } else {
        invalid.push(coinId);
        this.metrics.totalInvalidIds++;
        logger.debug('Invalid coin ID detected', { coinId, normalizedId });
      }
    }

    return {
      valid,
      invalid,
      cached: true,
      timestamp: new Date().toISOString(),
      validationTime: Date.now() - startTime,
    };
  }

  /**
   * Check if a single coin ID is valid
   * 
   * @param coinId CoinGecko coin ID to check
   * @returns true if valid, false otherwise
   */
  async isValidId(coinId: string): Promise<boolean> {
    await this.initialize();
    
    if (!this.isInitialized || this.validCoinIds.size === 0) {
      return true; // Graceful degradation
    }

    return this.validCoinIds.has(coinId.toLowerCase().trim());
  }

  /**
   * Get coin ID from symbol (handles multiple coins with same symbol)
   * 
   * @param symbol Coin symbol (e.g., "BTC")
   * @returns Array of matching coin IDs, or empty array if not found
   */
  async getCoinIdsBySymbol(symbol: string): Promise<string[]> {
    await this.initialize();
    
    if (!this.isInitialized || this.symbolToId.size === 0) {
      return [];
    }

    return this.symbolToId.get(symbol.toLowerCase().trim()) || [];
  }

  /**
   * Get coin ID from name
   * 
   * @param name Coin name (e.g., "Bitcoin")
   * @returns Coin ID or null if not found
   */
  async getCoinIdByName(name: string): Promise<string | null> {
    await this.initialize();
    
    if (!this.isInitialized || this.nameToId.size === 0) {
      return null;
    }

    return this.nameToId.get(name.toLowerCase().trim()) || null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS & DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get validator statistics
   */
  getStats(): ValidatorStats {
    const cacheAgeMs = this.lastFetchTime > 0 ? Date.now() - this.lastFetchTime : 0;
    const totalIds = this.metrics.totalValidIds + this.metrics.totalInvalidIds;
    
    return {
      isInitialized: this.isInitialized,
      totalCoins: this.validCoinIds.size,
      totalSymbols: this.symbolToId.size,
      lastFetchTime: this.lastFetchTime,
      cacheAgeMs,
      cacheValid: this.isCacheValid(),
      totalValidations: this.metrics.totalValidations,
      totalValidIds: this.metrics.totalValidIds,
      totalInvalidIds: this.metrics.totalInvalidIds,
      hitRate: totalIds > 0 ? this.metrics.totalValidIds / totalIds : 0,
      isFallbackMode: this.useFallbackMode,
      rateLimitedUntil: this.rateLimitedUntil > Date.now() ? this.rateLimitedUntil : undefined,
    };
  }

  /**
   * Force refresh the coin list (for testing or manual refresh)
   */
  async forceRefresh(): Promise<void> {
    this.lastFetchAttempt = 0; // Reset rate limit
    await this.fetchCoinList();
    logger.info('Coin ID validator force refreshed', {
      coinCount: this.validCoinIds.size,
    });
  }

  /**
   * Clear all cached data (for testing)
   */
  clear(): void {
    this.validCoinIds.clear();
    this.symbolToId.clear();
    this.nameToId.clear();
    this.lastFetchTime = 0;
    this.isInitialized = false;
    logger.debug('Coin ID validator cache cleared');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let validatorInstance: CoinIdValidator | null = null;

/**
 * Get the singleton validator instance
 */
export function getCoinIdValidator(): CoinIdValidator {
  if (!validatorInstance) {
    validatorInstance = new CoinIdValidator();
  }
  return validatorInstance;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick validation of coin IDs
 * 
 * @param coinIds Array of CoinGecko coin IDs to validate
 * @returns Validation result
 */
export async function validateCoinIds(coinIds: string[]): Promise<CoinIdValidationResult> {
  return getCoinIdValidator().validateIds(coinIds);
}

/**
 * Check if a single coin ID is valid
 * 
 * @param coinId CoinGecko coin ID to check
 * @returns true if valid, false otherwise
 */
export async function isValidCoinId(coinId: string): Promise<boolean> {
  return getCoinIdValidator().isValidId(coinId);
}

/**
 * Get validator statistics
 */
export function getValidatorStats(): ValidatorStats {
  return getCoinIdValidator().getStats();
}

/**
 * Initialize the validator (call at app startup for faster first request)
 */
export async function initializeCoinIdValidator(): Promise<void> {
  return getCoinIdValidator().initialize();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getCoinIdValidator,
  validateCoinIds,
  isValidCoinId,
  getValidatorStats,
  initializeCoinIdValidator,
};
