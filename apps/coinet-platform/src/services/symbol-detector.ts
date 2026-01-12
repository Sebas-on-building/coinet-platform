/**
 * 🔍 Symbol Detection Engine - Divine Perfection
 * 
 * Extracts cryptocurrency symbols, names, and CONTRACT ADDRESSES from natural language,
 * maps them to CoinGecko IDs, and maintains a comprehensive coin cache.
 * 
 * Capabilities:
 * - Regex + pattern matching for symbol extraction
 * - Handles: "$BTC", "Bitcoin", "btc", "BTC/USD", "btcusdt"
 * - CONTRACT ADDRESS DETECTION (Solana, EVM, pump.fun)
 * - Maps 14,000+ coins via CoinGecko
 * - In-memory cache with 24h refresh
 * - Ready for Pro API upgrade
 * 
 * @version 2.0.0 - Added contract address detection for meme coin analysis
 */

import axios from 'axios';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CoinInfo {
  id: string;           // CoinGecko ID: "bitcoin"
  symbol: string;       // Ticker: "btc"
  name: string;         // Full name: "Bitcoin"
  aliases?: string[];   // Alternative names
}

export interface DetectedCoin {
  original: string;     // What user typed: "$BTC"
  symbol: string;       // Normalized: "BTC"
  coinGeckoId: string;  // API ID: "bitcoin"
  confidence: number;   // 0-1 match confidence
}

/**
 * 🆕 Detected Contract Address - For new/meme coins
 */
export type ChainType = 'solana' | 'ethereum' | 'bsc' | 'base' | 'arbitrum' | 'polygon' | 'unknown';
export type AddressSource = 'pump_fun' | 'raydium' | 'moonshot' | 'dex_generic' | 'evm_generic';

export interface DetectedContractAddress {
  address: string;              // The contract address
  chain: ChainType;             // Detected blockchain
  source: AddressSource;        // Where it likely came from
  confidence: number;           // 0-1 detection confidence
  isPumpFun: boolean;           // pump.fun token indicator
  original: string;             // Original matched string
}

/**
 * Combined detection result for messages
 */
export interface MessageDetectionResult {
  coins: DetectedCoin[];                    // Traditional symbol/name detections
  contractAddresses: DetectedContractAddress[];  // New coin contract addresses
  hasNewCoinQuery: boolean;                 // True if likely asking about new/meme coin
  primaryChain: ChainType | null;           // Primary chain if detected
}

export interface SymbolDetectorConfig {
  cacheRefreshMs: number;
  maxCoinsToCache: number;
  coinGeckoBaseUrl: string;
  enableFuzzyMatch: boolean;
}

// ============================================================================
// CONTRACT ADDRESS PATTERNS
// ============================================================================

/**
 * Solana address pattern:
 * - Base58 encoding (no 0, O, I, l)
 * - 32-44 characters
 * - pump.fun tokens end with "pump"
 */
const SOLANA_ADDRESS_PATTERN = /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g;
const PUMP_FUN_ADDRESS_PATTERN = /\b([1-9A-HJ-NP-Za-km-z]{32,44}pump)\b/gi;

/**
 * EVM address pattern:
 * - Starts with 0x
 * - 40 hex characters
 */
const EVM_ADDRESS_PATTERN = /\b(0x[a-fA-F0-9]{40})\b/gi;

/**
 * Common words that look like Solana addresses but aren't
 */
const SOLANA_FALSE_POSITIVES = new Set([
  'bitcoin', 'ethereum', 'solana', 'cardano', 'polygon', 'avalanche',
  'chainlink', 'uniswap', 'aave', 'compound', 'makerdao', 'sushiswap',
]);

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SymbolDetectorConfig = {
  cacheRefreshMs: 24 * 60 * 60 * 1000, // 24 hours
  maxCoinsToCache: 10000,
  coinGeckoBaseUrl: 'https://api.coingecko.com/api/v3',
  enableFuzzyMatch: true,
};

// ============================================================================
// COMMON COIN MAPPINGS (Instant lookup, no API needed)
// ============================================================================

const COMMON_COINS: Map<string, CoinInfo> = new Map([
  // Top 50 by market cap + popular ones
  ['btc', { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', aliases: ['bitcoin', 'xbt'] }],
  ['eth', { id: 'ethereum', symbol: 'eth', name: 'Ethereum', aliases: ['ethereum', 'ether'] }],
  ['usdt', { id: 'tether', symbol: 'usdt', name: 'Tether', aliases: ['tether'] }],
  ['bnb', { id: 'binancecoin', symbol: 'bnb', name: 'BNB', aliases: ['binance coin', 'binance'] }],
  ['sol', { id: 'solana', symbol: 'sol', name: 'Solana', aliases: ['solana'] }],
  ['usdc', { id: 'usd-coin', symbol: 'usdc', name: 'USD Coin', aliases: ['usd coin'] }],
  ['xrp', { id: 'ripple', symbol: 'xrp', name: 'XRP', aliases: ['ripple'] }],
  ['doge', { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', aliases: ['dogecoin', 'doge coin'] }],
  ['ada', { id: 'cardano', symbol: 'ada', name: 'Cardano', aliases: ['cardano'] }],
  ['avax', { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche', aliases: ['avalanche'] }],
  ['shib', { id: 'shiba-inu', symbol: 'shib', name: 'Shiba Inu', aliases: ['shiba', 'shiba inu'] }],
  ['dot', { id: 'polkadot', symbol: 'dot', name: 'Polkadot', aliases: ['polkadot'] }],
  ['link', { id: 'chainlink', symbol: 'link', name: 'Chainlink', aliases: ['chainlink'] }],
  ['trx', { id: 'tron', symbol: 'trx', name: 'TRON', aliases: ['tron'] }],
  ['matic', { id: 'matic-network', symbol: 'matic', name: 'Polygon', aliases: ['polygon', 'matic'] }],
  ['pol', { id: 'matic-network', symbol: 'pol', name: 'Polygon', aliases: ['polygon'] }],
  ['ton', { id: 'the-open-network', symbol: 'ton', name: 'Toncoin', aliases: ['toncoin', 'telegram'] }],
  ['ltc', { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', aliases: ['litecoin'] }],
  ['bch', { id: 'bitcoin-cash', symbol: 'bch', name: 'Bitcoin Cash', aliases: ['bitcoin cash'] }],
  ['xlm', { id: 'stellar', symbol: 'xlm', name: 'Stellar', aliases: ['stellar', 'lumens'] }],
  ['atom', { id: 'cosmos', symbol: 'atom', name: 'Cosmos', aliases: ['cosmos'] }],
  ['uni', { id: 'uniswap', symbol: 'uni', name: 'Uniswap', aliases: ['uniswap'] }],
  ['etc', { id: 'ethereum-classic', symbol: 'etc', name: 'Ethereum Classic', aliases: ['ethereum classic'] }],
  ['xmr', { id: 'monero', symbol: 'xmr', name: 'Monero', aliases: ['monero'] }],
  ['fil', { id: 'filecoin', symbol: 'fil', name: 'Filecoin', aliases: ['filecoin'] }],
  ['apt', { id: 'aptos', symbol: 'apt', name: 'Aptos', aliases: ['aptos'] }],
  ['arb', { id: 'arbitrum', symbol: 'arb', name: 'Arbitrum', aliases: ['arbitrum'] }],
  ['op', { id: 'optimism', symbol: 'op', name: 'Optimism', aliases: ['optimism'] }],
  ['near', { id: 'near', symbol: 'near', name: 'NEAR Protocol', aliases: ['near protocol'] }],
  ['ftm', { id: 'fantom', symbol: 'ftm', name: 'Fantom', aliases: ['fantom'] }],
  ['inj', { id: 'injective-protocol', symbol: 'inj', name: 'Injective', aliases: ['injective'] }],
  ['sui', { id: 'sui', symbol: 'sui', name: 'Sui', aliases: ['sui'] }],
  ['sei', { id: 'sei-network', symbol: 'sei', name: 'Sei', aliases: ['sei'] }],
  ['render', { id: 'render-token', symbol: 'render', name: 'Render', aliases: ['rndr', 'render'] }],
  ['rndr', { id: 'render-token', symbol: 'rndr', name: 'Render', aliases: ['render'] }],
  ['aave', { id: 'aave', symbol: 'aave', name: 'Aave', aliases: ['aave'] }],
  ['mkr', { id: 'maker', symbol: 'mkr', name: 'Maker', aliases: ['maker', 'makerdao'] }],
  ['grt', { id: 'the-graph', symbol: 'grt', name: 'The Graph', aliases: ['the graph', 'graph'] }],
  ['fet', { id: 'fetch-ai', symbol: 'fet', name: 'Fetch.ai', aliases: ['fetch', 'fetch ai'] }],
  ['wif', { id: 'dogwifcoin', symbol: 'wif', name: 'dogwifhat', aliases: ['dogwifhat', 'dog wif hat'] }],
  ['pepe', { id: 'pepe', symbol: 'pepe', name: 'Pepe', aliases: ['pepe'] }],
  ['floki', { id: 'floki', symbol: 'floki', name: 'FLOKI', aliases: ['floki inu'] }],
  ['bonk', { id: 'bonk', symbol: 'bonk', name: 'Bonk', aliases: ['bonk'] }],
  ['turbo', { id: 'turbo', symbol: 'turbo', name: 'Turbo', aliases: ['turbo'] }],  // Meme coin (not based-turbo!)
  ['wld', { id: 'worldcoin-wld', symbol: 'wld', name: 'Worldcoin', aliases: ['worldcoin'] }],
  ['jup', { id: 'jupiter-exchange-solana', symbol: 'jup', name: 'Jupiter', aliases: ['jupiter'] }],
  ['pyth', { id: 'pyth-network', symbol: 'pyth', name: 'Pyth Network', aliases: ['pyth'] }],
  ['ondo', { id: 'ondo-finance', symbol: 'ondo', name: 'Ondo', aliases: ['ondo'] }],
  ['supra', { id: 'supra', symbol: 'supra', name: 'Supra', aliases: ['supra'] }],
  ['pendle', { id: 'pendle', symbol: 'pendle', name: 'Pendle', aliases: ['pendle'] }],
  ['ena', { id: 'ethena', symbol: 'ena', name: 'Ethena', aliases: ['ethena'] }],
  ['strk', { id: 'starknet', symbol: 'strk', name: 'Starknet', aliases: ['starknet'] }],
  ['zk', { id: 'zksync', symbol: 'zk', name: 'zkSync', aliases: ['zksync'] }],
  ['blur', { id: 'blur', symbol: 'blur', name: 'Blur', aliases: ['blur'] }],
  ['meme', { id: 'memecoin-2', symbol: 'meme', name: 'Memecoin', aliases: ['memecoin'] }],
  ['ai16z', { id: 'ai16z', symbol: 'ai16z', name: 'ai16z', aliases: ['ai16z'] }],
  ['virtual', { id: 'virtual-protocol', symbol: 'virtual', name: 'Virtuals Protocol', aliases: ['virtuals'] }],
  ['goat', { id: 'goatseus-maximus', symbol: 'goat', name: 'Goatseus Maximus', aliases: ['goatseus'] }],
  ['fartcoin', { id: 'fartcoin', symbol: 'fartcoin', name: 'Fartcoin', aliases: ['fart'] }],
  ['ai', { id: 'sleepless-ai', symbol: 'ai', name: 'Sleepless AI', aliases: ['sleepless'] }],
  ['tao', { id: 'bittensor', symbol: 'tao', name: 'Bittensor', aliases: ['bittensor'] }],
  ['kas', { id: 'kaspa', symbol: 'kas', name: 'Kaspa', aliases: ['kaspa'] }],
]);

// ============================================================================
// SYMBOL DETECTOR CLASS
// ============================================================================

export class SymbolDetector {
  private config: SymbolDetectorConfig;
  private coinCache: Map<string, CoinInfo> = new Map();
  private symbolToId: Map<string, string> = new Map();
  private nameToId: Map<string, string> = new Map();
  private lastCacheUpdate: number = 0;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<SymbolDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeCommonCoins();
  }

  /**
   * Initialize with common coins (instant, no API)
   */
  private initializeCommonCoins(): void {
    for (const [symbol, info] of COMMON_COINS) {
      this.coinCache.set(info.id, info);
      this.symbolToId.set(symbol.toLowerCase(), info.id);
      this.nameToId.set(info.name.toLowerCase(), info.id);
      
      // Index aliases
      if (info.aliases) {
        for (const alias of info.aliases) {
          this.nameToId.set(alias.toLowerCase(), info.id);
        }
      }
    }
    logger.debug('🔍 Symbol detector initialized with common coins', { count: COMMON_COINS.size });
  }

  /**
   * Initialize full coin list from CoinGecko (background)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadCoinList();
    await this.initPromise;
    this.isInitialized = true;
  }

  /**
   * Load coin list from CoinGecko API
   */
  private async loadCoinList(): Promise<void> {
    try {
      logger.info('🔄 Loading coin list from CoinGecko...');
      
      const response = await axios.get(`${this.config.coinGeckoBaseUrl}/coins/list`, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response from CoinGecko');
      }

      let count = 0;
      for (const coin of response.data) {
        if (count >= this.config.maxCoinsToCache) break;
        
        const info: CoinInfo = {
          id: coin.id,
          symbol: coin.symbol?.toLowerCase() || '',
          name: coin.name || '',
        };

        // Don't overwrite common coins (they have better aliases)
        if (!COMMON_COINS.has(info.symbol)) {
          this.coinCache.set(info.id, info);
          this.symbolToId.set(info.symbol, info.id);
          this.nameToId.set(info.name.toLowerCase(), info.id);
        }
        count++;
      }

      this.lastCacheUpdate = Date.now();
      logger.info('✅ Coin list loaded', { 
        totalCoins: count,
        cacheSize: this.coinCache.size 
      });
    } catch (error: any) {
      logger.error('❌ Failed to load coin list from CoinGecko', {
        error: error.message,
        hint: 'Using common coins only'
      });
      // Don't throw - we can work with common coins
    }
  }

  /**
   * Refresh cache if stale
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCacheUpdate > this.config.cacheRefreshMs) {
      // Background refresh, don't await
      this.loadCoinList().catch(err => {
        logger.debug('Background cache refresh failed', { error: err.message });
      });
    }
  }

  /**
   * 🎯 MAIN METHOD: Detect coins in user message
   */
  async detectCoins(message: string): Promise<DetectedCoin[]> {
    // Ensure initialized (non-blocking after first load)
    this.refreshCacheIfNeeded();

    const detected: DetectedCoin[] = [];
    const seen = new Set<string>();

    // Strategy 1: $SYMBOL pattern (highest confidence)
    const dollarMatches = message.match(/\$([A-Za-z][A-Za-z0-9]{1,10})/gi) || [];
    for (const match of dollarMatches) {
      const symbol = match.slice(1).toLowerCase();
      const coin = this.findCoin(symbol);
      if (coin && !seen.has(coin.id)) {
        detected.push({
          original: match,
          symbol: symbol.toUpperCase(),
          coinGeckoId: coin.id,
          confidence: 0.95,
        });
        seen.add(coin.id);
      }
    }

    // Strategy 2: SYMBOL/USD or SYMBOL/USDT pattern
    const pairMatches = message.match(/\b([A-Za-z]{2,10})\s*[\/\-]\s*(USD[T]?|BTC|ETH|USDC)\b/gi) || [];
    for (const match of pairMatches) {
      const symbol = match.split(/[\/\-]/)[0].trim().toLowerCase();
      const coin = this.findCoin(symbol);
      if (coin && !seen.has(coin.id)) {
        detected.push({
          original: match,
          symbol: symbol.toUpperCase(),
          coinGeckoId: coin.id,
          confidence: 0.9,
        });
        seen.add(coin.id);
      }
    }

    // Strategy 3: Standalone uppercase symbols (BTC, ETH, SOL)
    const upperMatches = message.match(/\b([A-Z]{2,6})\b/g) || [];
    for (const match of upperMatches) {
      const symbol = match.toLowerCase();
      const coin = this.findCoin(symbol);
      if (coin && !seen.has(coin.id)) {
        detected.push({
          original: match,
          symbol: match,
          coinGeckoId: coin.id,
          confidence: 0.85,
        });
        seen.add(coin.id);
      }
    }

    // Strategy 3.5: Standalone lowercase symbols (btc, eth, sol) - common in chat
    // Only check against known common coins to avoid false positives
    const lowerMatches = message.match(/\b([a-z]{2,6})\b/g) || [];
    for (const match of lowerMatches) {
      const symbol = match.toLowerCase();
      // Only check if it's in COMMON_COINS to avoid matching random words
      if (COMMON_COINS.has(symbol)) {
        const coin = this.findCoin(symbol);
        if (coin && !seen.has(coin.id)) {
          detected.push({
            original: match,
            symbol: symbol.toUpperCase(),
            coinGeckoId: coin.id,
            confidence: 0.8, // Slightly lower confidence than uppercase
          });
          seen.add(coin.id);
        }
      }
    }

    // Strategy 4: Full names (Bitcoin, Ethereum, Solana)
    const words = message.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      // Try single word
      const word = words[i].replace(/[^a-z0-9]/g, '');
      if (word.length >= 3) {
        const coin = this.findCoinByName(word);
        if (coin && !seen.has(coin.id)) {
          detected.push({
            original: word,
            symbol: coin.symbol.toUpperCase(),
            coinGeckoId: coin.id,
            confidence: 0.8,
          });
          seen.add(coin.id);
        }
      }

      // Try two-word names (e.g., "bitcoin cash", "shiba inu")
      if (i < words.length - 1) {
        const twoWords = `${words[i]} ${words[i + 1]}`.replace(/[^a-z\s]/g, '');
        const coin = this.findCoinByName(twoWords);
        if (coin && !seen.has(coin.id)) {
          detected.push({
            original: twoWords,
            symbol: coin.symbol.toUpperCase(),
            coinGeckoId: coin.id,
            confidence: 0.85,
          });
          seen.add(coin.id);
        }
      }
    }

    // Sort by confidence
    detected.sort((a, b) => b.confidence - a.confidence);

    logger.debug('🔍 Coins detected', { 
      message: message.substring(0, 50) + '...',
      detected: detected.map(d => d.symbol)
    });

    return detected;
  }

  /**
   * Find coin by symbol
   */
  private findCoin(symbol: string): CoinInfo | null {
    const normalized = symbol.toLowerCase().trim();
    const id = this.symbolToId.get(normalized);
    if (id) {
      return this.coinCache.get(id) || null;
    }
    return null;
  }

  /**
   * Find coin by name
   */
  private findCoinByName(name: string): CoinInfo | null {
    const normalized = name.toLowerCase().trim();
    const id = this.nameToId.get(normalized);
    if (id) {
      return this.coinCache.get(id) || null;
    }
    return null;
  }

  /**
   * Get coin info by ID
   */
  getCoinById(id: string): CoinInfo | null {
    return this.coinCache.get(id) || null;
  }

  /**
   * Get coin info by symbol
   */
  getCoinBySymbol(symbol: string): CoinInfo | null {
    return this.findCoin(symbol);
  }

  /**
   * Check if a symbol is valid
   */
  isValidSymbol(symbol: string): boolean {
    return this.findCoin(symbol) !== null;
  }

  /**
   * Get cache stats
   */
  getStats(): { cacheSize: number; lastUpdate: string; isInitialized: boolean } {
    return {
      cacheSize: this.coinCache.size,
      lastUpdate: this.lastCacheUpdate ? new Date(this.lastCacheUpdate).toISOString() : 'never',
      isInitialized: this.isInitialized,
    };
  }

  // ==========================================================================
  // 🆕 CONTRACT ADDRESS DETECTION - For Meme Coins & New Tokens
  // ==========================================================================

  /**
   * 🎯 Detect contract addresses in a message
   * Identifies Solana (including pump.fun), EVM, and other chain addresses
   */
  detectContractAddresses(message: string): DetectedContractAddress[] {
    const detected: DetectedContractAddress[] = [];
    const seen = new Set<string>();

    // Strategy 1: Pump.fun addresses (highest priority - specific pattern)
    const pumpFunMatches = message.match(PUMP_FUN_ADDRESS_PATTERN) || [];
    for (const match of pumpFunMatches) {
      const address = match.toLowerCase();
      if (!seen.has(address)) {
        detected.push({
          address: match, // Keep original case
          chain: 'solana',
          source: 'pump_fun',
          confidence: 0.98,
          isPumpFun: true,
          original: match,
        });
        seen.add(address);
      }
    }

    // Strategy 2: EVM addresses (0x...)
    const evmMatches = message.match(EVM_ADDRESS_PATTERN) || [];
    for (const match of evmMatches) {
      const address = match.toLowerCase();
      if (!seen.has(address)) {
        // Try to determine EVM chain from context
        const chain = this.detectEvmChainFromContext(message);
        detected.push({
          address: match,
          chain,
          source: 'evm_generic',
          confidence: 0.95,
          isPumpFun: false,
          original: match,
        });
        seen.add(address);
      }
    }

    // Strategy 3: Generic Solana addresses (Base58, not pump.fun)
    const solanaMatches = message.match(SOLANA_ADDRESS_PATTERN) || [];
    for (const match of solanaMatches) {
      const addressLower = match.toLowerCase();
      
      // Skip if already detected as pump.fun or is a false positive
      if (seen.has(addressLower)) continue;
      if (SOLANA_FALSE_POSITIVES.has(addressLower)) continue;
      
      // Validate it looks like a real Solana address (not a word)
      if (this.isLikelySolanaAddress(match)) {
        detected.push({
          address: match,
          chain: 'solana',
          source: this.detectSolanaSourceFromContext(message),
          confidence: 0.90,
          isPumpFun: false,
          original: match,
        });
        seen.add(addressLower);
      }
    }

    // Sort by confidence
    detected.sort((a, b) => b.confidence - a.confidence);

    if (detected.length > 0) {
      logger.info('🔍 Contract addresses detected', {
        count: detected.length,
        addresses: detected.map(d => ({
          address: d.address.slice(0, 8) + '...' + d.address.slice(-4),
          chain: d.chain,
          source: d.source,
        })),
      });
    }

    return detected;
  }

  /**
   * Validate if a string is likely a real Solana address (not a word)
   */
  private isLikelySolanaAddress(str: string): boolean {
    // Must be at least 32 chars
    if (str.length < 32) return false;
    
    // Should have mixed case (real addresses do)
    const hasUppercase = /[A-Z]/.test(str);
    const hasLowercase = /[a-z]/.test(str);
    const hasNumbers = /[0-9]/.test(str);
    
    // Real addresses typically have numbers and mixed case
    // Pure lowercase words are likely false positives
    if (!hasNumbers && !hasUppercase) return false;
    
    // Check entropy - real addresses have good distribution
    const uniqueChars = new Set(str).size;
    if (uniqueChars < 10) return false; // Too repetitive
    
    return true;
  }

  /**
   * Try to detect EVM chain from message context
   */
  private detectEvmChainFromContext(message: string): ChainType {
    const lower = message.toLowerCase();
    
    if (lower.includes('ethereum') || lower.includes('eth ') || lower.includes('uniswap')) {
      return 'ethereum';
    }
    if (lower.includes('bsc') || lower.includes('binance') || lower.includes('pancake')) {
      return 'bsc';
    }
    if (lower.includes('base') || lower.includes('coinbase')) {
      return 'base';
    }
    if (lower.includes('arbitrum') || lower.includes('arb ')) {
      return 'arbitrum';
    }
    if (lower.includes('polygon') || lower.includes('matic')) {
      return 'polygon';
    }
    
    // Default to ethereum as most common
    return 'ethereum';
  }

  /**
   * Try to detect Solana DEX source from message context
   */
  private detectSolanaSourceFromContext(message: string): AddressSource {
    const lower = message.toLowerCase();
    
    if (lower.includes('pump') || lower.includes('pump.fun')) {
      return 'pump_fun';
    }
    if (lower.includes('raydium') || lower.includes('ray ')) {
      return 'raydium';
    }
    if (lower.includes('moonshot')) {
      return 'moonshot';
    }
    
    return 'dex_generic';
  }

  /**
   * 🎯 COMPREHENSIVE DETECTION: Coins + Contract Addresses
   * Use this for new coin analysis queries
   */
  async detectAll(message: string): Promise<MessageDetectionResult> {
    // Run both detections
    const [coins, contractAddresses] = await Promise.all([
      this.detectCoins(message),
      Promise.resolve(this.detectContractAddresses(message)),
    ]);

    // Determine if this is likely a new coin query
    const hasNewCoinQuery = this.isNewCoinQuery(message, contractAddresses);

    // Determine primary chain
    let primaryChain: ChainType | null = null;
    if (contractAddresses.length > 0) {
      primaryChain = contractAddresses[0].chain;
    }

    const result: MessageDetectionResult = {
      coins,
      contractAddresses,
      hasNewCoinQuery,
      primaryChain,
    };

    logger.debug('🔍 Full detection result', {
      coinsFound: coins.length,
      addressesFound: contractAddresses.length,
      hasNewCoinQuery,
      primaryChain,
    });

    return result;
  }

  /**
   * Determine if message is asking about a new/meme coin
   */
  private isNewCoinQuery(message: string, addresses: DetectedContractAddress[]): boolean {
    // Has contract addresses = definitely new coin query
    if (addresses.length > 0) return true;

    const lower = message.toLowerCase();
    
    // Keywords that indicate new coin analysis
    const newCoinKeywords = [
      'pump.fun', 'pumpfun', 'pump fun',
      'new coin', 'new token', 'just launched',
      'is this a scam', 'scam check', 'rug check', 'rugcheck',
      'should i ape', 'worth aping',
      'meme coin', 'memecoin', 'shitcoin',
      'degen', 'trenching',
      'check this coin', 'check this token',
      'potential', 'moonshot',
      'honeypot', 'honey pot',
      'safe to buy', 'legit',
    ];

    return newCoinKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Quick check if message contains any contract address
   */
  hasContractAddress(message: string): boolean {
    return PUMP_FUN_ADDRESS_PATTERN.test(message) || 
           EVM_ADDRESS_PATTERN.test(message) ||
           SOLANA_ADDRESS_PATTERN.test(message);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const symbolDetector = new SymbolDetector();

// Initialize in background (non-blocking)
symbolDetector.initialize().catch(err => {
  logger.warn('Symbol detector background init failed', { error: err.message });
});

