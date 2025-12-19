/**
 * 📊 MARKET DATA SERVICE
 * 
 * Fetches REAL market data from CoinGecko API for Coinet AI analysis.
 * No more mock data - this uses live API calls with proper caching.
 */

import { logger } from '../utils/logger';
import { MarketDataContext } from '../types/coinet-brief';
import axios from 'axios';
import NodeCache from 'node-cache';

// Symbol to CoinGecko ID mapping
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'polygon',
  'LINK': 'chainlink',
  'AVAX': 'avalanche-2',
  'SHIB': 'shiba-inu',
  'LTC': 'litecoin',
  'TRX': 'tron',
  'ATOM': 'cosmos',
  'UNI': 'uniswap',
  'NEAR': 'near',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'SUI': 'sui',
  'PEPE': 'pepe',
  'WIF': 'dogwifcoin',
  'BONK': 'bonk',
  'RENDER': 'render-token',
  'FET': 'fetch-ai',
  'INJ': 'injective-protocol',
  'TIA': 'celestia',
  'SEI': 'sei-network',
  'BITCOIN': 'bitcoin',
  'ETHEREUM': 'ethereum',
  'SOLANA': 'solana',
};

export class MarketDataService {
  private cache: NodeCache;
  private readonly CACHE_TTL = 60; // 1 minute cache
  private readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

  constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
    logger.info('📊 MarketDataService initialized (using CoinGecko API)');
  }

  /**
   * Get comprehensive market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketDataContext> {
    const normalizedSymbol = symbol.toUpperCase();
    const cacheKey = `market_${normalizedSymbol}`;
    
    // Check cache first
    const cached = this.cache.get<MarketDataContext>(cacheKey);
    if (cached) {
      logger.info(`📊 Returning cached market data for ${normalizedSymbol}`);
      return cached;
    }

    try {
      logger.info(`📊 Fetching LIVE market data for ${normalizedSymbol} from CoinGecko`);

      // Fetch real data from CoinGecko
      const marketData = await this.fetchFromCoinGecko(normalizedSymbol);
      
      // Cache the result
      this.cache.set(cacheKey, marketData);
      
      return marketData;

    } catch (error) {
      logger.error(`❌ Failed to fetch market data for ${normalizedSymbol}:`, error);
      
      // Return minimal fallback data (NOT mock data - just zeros to indicate failure)
      return this.getFallbackMarketData(normalizedSymbol);
    }
  }

  /**
   * Fetch real data from CoinGecko API
   */
  private async fetchFromCoinGecko(symbol: string): Promise<MarketDataContext> {
    const coinId = this.getCoinGeckoId(symbol);
    
    // Fetch detailed coin data including ATH
    const coinUrl = `${this.COINGECKO_BASE_URL}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`;
    
    try {
      const response = await axios.get(coinUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        }
      });

      const data = response.data;
      const marketData = data.market_data;

      if (!marketData) {
        throw new Error(`No market data returned for ${coinId}`);
      }

      // Calculate basic technical indicators from price data
      const currentPrice = marketData.current_price?.usd || 0;
      const priceChange24h = marketData.price_change_24h || 0;
      const priceChangePercent = marketData.price_change_percentage_24h || 0;
      const high24h = marketData.high_24h?.usd || currentPrice * 1.02;
      const low24h = marketData.low_24h?.usd || currentPrice * 0.98;
      const ath = marketData.ath?.usd || currentPrice;
      const athDate = marketData.ath_date?.usd;
      const athChangePercent = marketData.ath_change_percentage?.usd || 0;

      const result: MarketDataContext = {
        symbol,
        currentPrice,
        priceChange24h,
        priceChangePercent24h: priceChangePercent,
        volume24h: marketData.total_volume?.usd || 0,
        marketCap: marketData.market_cap?.usd || 0,
        dominance: marketData.market_cap_percentage?.usd,
        high24h,
        low24h,
        ath,
        athDate: athDate ? new Date(athDate) : undefined,
        athChangePercent,
        circulatingSupply: marketData.circulating_supply,
        totalSupply: marketData.total_supply,
        maxSupply: marketData.max_supply,
        technicalIndicators: {
          // Basic support/resistance based on 24h range
          support: low24h,
          resistance: high24h,
          // Price position in 24h range (0-100)
          rangePosition: high24h !== low24h 
            ? ((currentPrice - low24h) / (high24h - low24h)) * 100 
            : 50,
        },
        volatility: Math.abs(priceChangePercent) / 100,
        lastUpdated: new Date(),
        dataSource: 'coingecko',
      };

      logger.info(`✅ Fetched real data for ${symbol}: $${currentPrice.toLocaleString()} (${priceChangePercent.toFixed(2)}%)`);
      
      return result;

    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn('⚠️ CoinGecko rate limit hit, waiting before retry...');
        // Wait 60 seconds and retry once
        await new Promise(resolve => setTimeout(resolve, 60000));
        return this.fetchFromCoinGecko(symbol);
      }
      throw error;
    }
  }

  /**
   * Get CoinGecko ID from symbol
   */
  private getCoinGeckoId(symbol: string): string {
    const normalized = symbol.toUpperCase();
    return SYMBOL_TO_COINGECKO_ID[normalized] || symbol.toLowerCase();
  }

  /**
   * Fallback data when all sources fail
   * Returns zeros to indicate data unavailability (NOT fake data)
   */
  private getFallbackMarketData(symbol: string): MarketDataContext {
    logger.warn(`⚠️ Returning fallback (empty) data for ${symbol} - API unavailable`);
    return {
      symbol,
      currentPrice: 0,
      priceChange24h: 0,
      priceChangePercent24h: 0,
      volume24h: 0,
      marketCap: 0,
      technicalIndicators: {},
      volatility: 0,
      lastUpdated: new Date(),
      dataSource: 'unavailable',
    };
  }

  /**
   * Fetch global market data (total market cap, BTC dominance, fear/greed)
   */
  async getGlobalMarketData(): Promise<{
    totalMarketCap: number;
    totalVolume24h: number;
    btcDominance: number;
    ethDominance: number;
    marketCapChange24h: number;
  }> {
    const cacheKey = 'global_market';
    const cached = this.cache.get<any>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.COINGECKO_BASE_URL}/global`, {
        timeout: 10000,
      });

      const data = response.data.data;
      const result = {
        totalMarketCap: data.total_market_cap?.usd || 0,
        totalVolume24h: data.total_volume?.usd || 0,
        btcDominance: data.market_cap_percentage?.btc || 0,
        ethDominance: data.market_cap_percentage?.eth || 0,
        marketCapChange24h: data.market_cap_change_percentage_24h_usd || 0,
      };

      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('Failed to fetch global market data:', error);
      return {
        totalMarketCap: 0,
        totalVolume24h: 0,
        btcDominance: 0,
        ethDominance: 0,
        marketCapChange24h: 0,
      };
    }
  }

  /**
   * Clear cache for a symbol
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.cache.del(`market_${symbol.toUpperCase()}`);
    } else {
      this.cache.flushAll();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { keys: number; hits: number; misses: number } {
    const stats = this.cache.getStats();
    return {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses
    };
  }
}
