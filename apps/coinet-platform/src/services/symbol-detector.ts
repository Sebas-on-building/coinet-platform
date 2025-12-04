/**
 * 🔍 Symbol Detection Engine - Divine Perfection
 * 
 * Extracts cryptocurrency symbols and names from natural language,
 * maps them to CoinGecko IDs, and maintains a comprehensive coin cache.
 * 
 * Capabilities:
 * - Regex + pattern matching for symbol extraction
 * - Handles: "$BTC", "Bitcoin", "btc", "BTC/USD", "btcusdt"
 * - Maps 14,000+ coins via CoinGecko
 * - In-memory cache with 24h refresh
 * - Ready for Pro API upgrade
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

export interface SymbolDetectorConfig {
  cacheRefreshMs: number;
  maxCoinsToCache: number;
  coinGeckoBaseUrl: string;
  enableFuzzyMatch: boolean;
}

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
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const symbolDetector = new SymbolDetector();

// Initialize in background (non-blocking)
symbolDetector.initialize().catch(err => {
  logger.warn('Symbol detector background init failed', { error: err.message });
});

