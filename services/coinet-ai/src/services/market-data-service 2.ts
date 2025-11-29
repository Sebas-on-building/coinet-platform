/**
 * 📊 MARKET DATA SERVICE
 * 
 * Fetches and normalizes market data from multiple sources for Coinet AI analysis.
 * Integrates with existing market data infrastructure while providing a clean interface.
 */

import { logger } from '../utils/logger';
import { MarketDataContext } from '../types/coinet-brief';
import axios from 'axios';
import NodeCache from 'node-cache';

export class MarketDataService {
  private cache: NodeCache;
  private readonly CACHE_TTL = 60; // 1 minute cache

  constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
    logger.info('📊 MarketDataService initialized');
  }

  /**
   * Get comprehensive market data for a symbol
   */
  async getMarketData(symbol: string): Promise<MarketDataContext> {
    const cacheKey = `market_${symbol}`;
    
    // Check cache first
    const cached = this.cache.get<MarketDataContext>(cacheKey);
    if (cached) {
      logger.info(`📊 Returning cached market data for ${symbol}`);
      return cached;
    }

    try {
      logger.info(`📊 Fetching fresh market data for ${symbol}`);

      // For now, integrate with our existing market data service
      // TODO: Replace with actual integration to services/market-data-service
      const marketData = await this.fetchMarketDataFromService(symbol);
      
      // Cache the result
      this.cache.set(cacheKey, marketData);
      
      return marketData;

    } catch (error) {
      logger.error(`❌ Failed to fetch market data for ${symbol}:`, error);
      
      // Return minimal fallback data
      return this.getFallbackMarketData(symbol);
    }
  }

  /**
   * Fetch from our existing market data service
   */
  private async fetchMarketDataFromService(symbol: string): Promise<MarketDataContext> {
    try {
      // Try to connect to our existing market data service
      const response = await axios.get(`http://market-data-service:8080/api/v1/quote/${symbol}`, {
        timeout: 5000
      });

      const data = response.data;
      
      return {
        symbol: symbol,
        currentPrice: data.price || 0,
        priceChange24h: data.priceChange24h || 0,
        priceChangePercent24h: data.priceChangePercent24h || 0,
        volume24h: data.volume24h || 0,
        marketCap: data.marketCap || 0,
        dominance: data.dominance,
        technicalIndicators: {
          rsi: data.technicalIndicators?.rsi,
          macd: data.technicalIndicators?.macd,
          movingAverages: data.technicalIndicators?.movingAverages,
          support: data.technicalIndicators?.support,
          resistance: data.technicalIndicators?.resistance
        },
        volatility: data.volatility || 0,
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.warn(`⚠️ Market data service unavailable, using fallback for ${symbol}`);
      return this.getMockMarketData(symbol);
    }
  }

  /**
   * Mock market data for development/testing
   */
  private getMockMarketData(symbol: string): MarketDataContext {
    const mockData: Record<string, Partial<MarketDataContext>> = {
      'BTC': {
        currentPrice: 43250.75,
        priceChange24h: 1125.30,
        priceChangePercent24h: 2.67,
        volume24h: 18500000000,
        marketCap: 850000000000,
        dominance: 52.3,
        volatility: 0.045
      },
      'ETH': {
        currentPrice: 2450.80,
        priceChange24h: -45.20,
        priceChangePercent24h: -1.81,
        volume24h: 12000000000,
        marketCap: 295000000000,
        dominance: 18.7,
        volatility: 0.055
      },
      'SOL': {
        currentPrice: 98.45,
        priceChange24h: 5.67,
        priceChangePercent24h: 6.11,
        volume24h: 2100000000,
        marketCap: 42000000000,
        dominance: 1.8,
        volatility: 0.085
      }
    };

    const base = mockData[symbol] || mockData['BTC'];
    
    return {
      symbol,
      currentPrice: base.currentPrice || 0,
      priceChange24h: base.priceChange24h || 0,
      priceChangePercent24h: base.priceChangePercent24h || 0,
      volume24h: base.volume24h || 0,
      marketCap: base.marketCap || 0,
      dominance: base.dominance,
      technicalIndicators: {
        rsi: 58.5,
        macd: { value: 125.3, signal: 118.7, histogram: 6.6 },
        movingAverages: { ma20: 42100, ma50: 41500, ma200: 39800 },
        support: base.currentPrice ? base.currentPrice * 0.95 : 41000,
        resistance: base.currentPrice ? base.currentPrice * 1.05 : 45000
      },
      volatility: base.volatility || 0.05,
      lastUpdated: new Date()
    };
  }

  /**
   * Fallback data when all sources fail
   */
  private getFallbackMarketData(symbol: string): MarketDataContext {
    return {
      symbol,
      currentPrice: 0,
      priceChange24h: 0,
      priceChangePercent24h: 0,
      volume24h: 0,
      marketCap: 0,
      technicalIndicators: {},
      volatility: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Clear cache for a symbol
   */
  clearCache(symbol?: string): void {
    if (symbol) {
      this.cache.del(`market_${symbol}`);
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
