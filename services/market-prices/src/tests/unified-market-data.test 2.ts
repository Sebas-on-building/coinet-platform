/**
 * Unified Market Data Service Integration Tests
 * Tests best-price aggregation and unified data access
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedMarketDataService } from '../services/unified-market-data';
import { CoinGeckoRestClient } from '../providers/coingecko-rest';
import { CoinMarketCapRestClient } from '../providers/coinmarketcap-rest';
import { DexScreenerRestClient } from '../providers/dexscreener-rest';
import { DataSource } from '../types';

// Mock the provider clients
vi.mock('../providers/coingecko-rest');
vi.mock('../providers/coinmarketcap-rest');
vi.mock('../providers/dexscreener-rest');

describe('UnifiedMarketDataService', () => {
  let unifiedService: UnifiedMarketDataService;
  let mockGeckoClient: any;
  let mockCmcClient: any;
  let mockDexScreenerClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock CoinGecko client
    mockGeckoClient = {
      getSimplePrice: vi.fn(),
      getCoinMarkets: vi.fn(),
    };

    // Create mock CoinMarketCap client
    mockCmcClient = {
      getQuotesBySymbol: vi.fn(),
    };

    // Create mock DexScreener client
    mockDexScreenerClient = {
      searchPairsByQuery: vi.fn(),
    };

    // Setup mocks
    (CoinGeckoRestClient as any).mockImplementation(() => mockGeckoClient);
    (CoinMarketCapRestClient as any).mockImplementation(() => mockCmcClient);
    (DexScreenerRestClient as any).mockImplementation(() => mockDexScreenerClient);

    unifiedService = new UnifiedMarketDataService(
      mockGeckoClient,
      mockCmcClient,
      undefined, // DefiLlama (not used in these tests)
      mockDexScreenerClient
    );
  });

  describe('getBestPrice', () => {
    it('should return best price from CoinGecko when available', async () => {
      mockGeckoClient.getSimplePrice.mockResolvedValue({
        btc: {
          usd: 50000,
          usd_market_cap: 1000000000000,
          usd_24h_vol: 20000000000,
          usd_24h_change: 2.5,
          last_updated_at: Math.floor(Date.now() / 1000),
        },
      });

      const result = await unifiedService.getBestPrice('BTC');

      expect(result.price).toBe(50000);
      expect(result.source).toBe(DataSource.COINGECKO);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.allPrices).toHaveLength(1);
      expect(mockGeckoClient.getSimplePrice).toHaveBeenCalledWith(
        'btc',
        'usd',
        true,
        true,
        true,
        true
      );
    });

    it('should aggregate prices from multiple sources', async () => {
      // CoinGecko response
      mockGeckoClient.getSimplePrice.mockResolvedValue({
        btc: {
          usd: 50000,
          last_updated_at: Math.floor(Date.now() / 1000),
        },
      });

      // CoinMarketCap response
      mockCmcClient.getQuotesBySymbol.mockResolvedValue({
        data: {
          BTC: {
            symbol: 'BTC',
            id: 1,
            quote: {
              USD: {
                price: 50050,
                last_updated: new Date().toISOString(),
              },
            },
            last_updated: new Date().toISOString(),
          },
        },
      });

      const result = await unifiedService.getBestPrice('BTC');

      expect(result.price).toBeGreaterThan(0);
      expect(result.allPrices.length).toBeGreaterThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should throw error when no sources available', async () => {
      mockGeckoClient.getSimplePrice.mockRejectedValue(new Error('API error'));
      mockCmcClient.getQuotesBySymbol.mockRejectedValue(new Error('API error'));

      await expect(unifiedService.getBestPrice('BTC')).rejects.toThrow();
    });

    it('should calculate confidence based on variance', async () => {
      mockGeckoClient.getSimplePrice.mockResolvedValue({
        btc: {
          usd: 50000,
          last_updated_at: Math.floor(Date.now() / 1000),
        },
      });

      mockCmcClient.getQuotesBySymbol.mockResolvedValue({
        data: {
          BTC: {
            symbol: 'BTC',
            id: 1,
            quote: {
              USD: {
                price: 50050, // Close price = high confidence
                last_updated: new Date().toISOString(),
              },
            },
            last_updated: new Date().toISOString(),
          },
        },
      });

      const result = await unifiedService.getBestPrice('BTC');
      expect(result.confidence).toBeGreaterThan(50);
    });

    it('should include DexScreener prices when available', async () => {
      mockGeckoClient.getSimplePrice.mockResolvedValue({
        eth: {
          usd: 3000,
          last_updated_at: Math.floor(Date.now() / 1000),
        },
      });

      mockDexScreenerClient.searchPairsByQuery.mockResolvedValue([
        {
          chainId: '1',
          dexId: 'uniswap',
          pairAddress: '0x123',
          baseToken: { symbol: 'ETH', address: '0xabc' },
          quoteToken: { symbol: 'USDC', address: '0xdef' },
          priceUsd: '3005',
          liquidity: { usd: 1000000 },
          pairCreatedAt: Math.floor(Date.now() / 1000),
        },
      ]);

      const result = await unifiedService.getBestPrice('ETH');

      expect(result.allPrices.length).toBeGreaterThanOrEqual(1);
      expect(mockDexScreenerClient.searchPairsByQuery).toHaveBeenCalledWith('ETH');
    });
  });

  describe('getAggregatedMarketData', () => {
    it('should aggregate market data from CoinGecko', async () => {
      mockGeckoClient.getCoinMarkets.mockResolvedValue([
        {
          id: 'bitcoin',
          symbol: 'btc',
          current_price: 50000,
          price_change_24h: 1000,
          price_change_percentage_24h: 2.0,
          market_cap: 1000000000000,
          total_volume: 20000000000,
          last_updated: new Date().toISOString(),
        },
      ]);

      const result = await unifiedService.getAggregatedMarketData('BTC');

      expect(result.symbol).toBe('BTC');
      expect(result.price).toBe(50000);
      expect(result.priceChange24h).toBe(1000);
      expect(result.priceChangePercentage24h).toBe(2.0);
      expect(result.marketCap).toBe(1000000000000);
      expect(result.volume24h).toBe(20000000000);
      expect(result.sources.coingecko).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should aggregate data from multiple sources', async () => {
      // CoinGecko
      mockGeckoClient.getCoinMarkets.mockResolvedValue([
        {
          id: 'bitcoin',
          symbol: 'btc',
          current_price: 50000,
          price_change_24h: 1000,
          price_change_percentage_24h: 2.0,
          market_cap: 1000000000000,
          total_volume: 20000000000,
          last_updated: new Date().toISOString(),
        },
      ]);

      // CoinMarketCap
      mockCmcClient.getQuotesBySymbol.mockResolvedValue({
        data: {
          BTC: {
            symbol: 'BTC',
            id: 1,
            quote: {
              USD: {
                price: 50050,
                price_change_24h: 1050,
                percent_change_24h: 2.1,
                market_cap: 1000500000000,
                volume_24h: 20100000000,
              },
            },
            last_updated: new Date().toISOString(),
          },
        },
      });

      const result = await unifiedService.getAggregatedMarketData('BTC');

      expect(result.sources.coingecko).toBeDefined();
      expect(result.sources.coinmarketcap).toBeDefined();
      expect(result.price).toBeGreaterThan(0);
      expect(result.priceVariance).toBeGreaterThanOrEqual(0);
      expect(result.priceStdDev).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getBestPrices', () => {
    it('should fetch prices for multiple symbols', async () => {
      mockGeckoClient.getSimplePrice.mockResolvedValue({
        btc: {
          usd: 50000,
          last_updated_at: Math.floor(Date.now() / 1000),
        },
        eth: {
          usd: 3000,
          last_updated_at: Math.floor(Date.now() / 1000),
        },
      });

      const results = await unifiedService.getBestPrices(['BTC', 'ETH']);

      expect(results.size).toBe(2);
      expect(results.get('BTC')).toBeDefined();
      expect(results.get('ETH')).toBeDefined();
      expect(results.get('BTC')?.price).toBe(50000);
      expect(results.get('ETH')?.price).toBe(3000);
    });

    it('should handle partial failures gracefully', async () => {
      mockGeckoClient.getSimplePrice
        .mockResolvedValueOnce({
          btc: {
            usd: 50000,
            last_updated_at: Math.floor(Date.now() / 1000),
          },
        })
        .mockRejectedValueOnce(new Error('API error'));

      const results = await unifiedService.getBestPrices(['BTC', 'ETH']);

      expect(results.size).toBe(1);
      expect(results.get('BTC')).toBeDefined();
      expect(results.get('ETH')).toBeUndefined();
    });
  });
});

