/**
 * DexScreener REST Client Integration Tests
 * Tests DEX pair discovery, token profiles, and monitoring endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DexScreenerRestClient } from '../providers/dexscreener-rest';
import { ProviderConfig, DataSource } from '../types';
import axios from 'axios';

// Mock axios and axios-retry
vi.mock('axios');
vi.mock('axios-retry', () => ({
  default: vi.fn(),
  isNetworkOrIdempotentRequestError: vi.fn().mockReturnValue(true),
}));

const mockedAxios = axios as any;

describe('DexScreenerRestClient', () => {
  let client: DexScreenerRestClient;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      apiKey: 'test-api-key',
      apiUrl: 'https://api.dexscreener.com/latest/dex',
      rateLimit: {
        maxRequestsPerMinute: 60,
        reservoir: 60,
        reservoirRefreshAmount: 60,
        reservoirRefreshInterval: 60000,
      },
      retry: {
        retries: 3,
        retryDelay: 1000,
      },
      priority: 3,
    };

    // Mock axios.create to return a mock instance
    const mockAxiosInstance = {
      request: vi.fn(),
      defaults: {
        baseURL: 'https://api.dexscreener.com/latest/dex',
        headers: {},
      },
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    client = new DexScreenerRestClient(mockConfig);
  });

  describe('Configuration', () => {
    it('should initialize with correct config', () => {
      expect(client).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalled();
    });

    it('should work without API key (free tier)', () => {
      const freeConfig: ProviderConfig = {
        ...mockConfig,
        apiKey: 'free-tier',
      };
      const freeClient = new DexScreenerRestClient(freeConfig);
      expect(freeClient).toBeDefined();
    });
  });

  describe('Search Pairs', () => {
    it('should search pairs by token address', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [
            {
              chainId: '1',
              dexId: 'uniswap',
              url: 'https://dexscreener.com/ethereum/0x123',
              pairAddress: '0x123',
              baseToken: {
                address: '0xabc',
                name: 'Ethereum',
                symbol: 'ETH',
              },
              quoteToken: {
                address: '0xdef',
                name: 'USD Coin',
                symbol: 'USDC',
              },
              priceNative: '2000',
              priceUsd: '2000',
              liquidity: {
                usd: 1000000,
              },
            },
          ],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.searchPairs('0xabc');

      expect(result.schemaVersion).toBe('1.0.0');
      expect(result.pairs).toHaveLength(1);
      expect(result.pairs[0].baseToken.symbol).toBe('ETH');
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/search',
          params: { tokens: '0xabc' },
        })
      );
    });

    it('should search pairs with multiple token addresses', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      await client.searchPairs(['0xabc', '0xdef']);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { tokens: '0xabc,0xdef' },
        })
      );
    });

    it('should search pairs with chain filter', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      await client.searchPairs('0xabc', 'ethereum');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { tokens: '0xabc', chainIds: 'ethereum' },
        })
      );
    });
  });

  describe('Token Profile', () => {
    it('should get token profile', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [
            {
              chainId: '1',
              dexId: 'uniswap',
              pairAddress: '0x123',
              baseToken: {
                address: '0xabc',
                name: 'Ethereum',
                symbol: 'ETH',
              },
              quoteToken: {
                address: '0xdef',
                name: 'USD Coin',
                symbol: 'USDC',
              },
            },
          ],
          tokens: [
            {
              address: '0xabc',
              name: 'Ethereum',
              symbol: 'ETH',
            },
          ],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.getTokenProfile('0xabc');

      expect(result.schemaVersion).toBe('1.0.0');
      expect(result.pairs).toHaveLength(1);
      expect(result.tokens).toHaveLength(1);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/tokens/0xabc',
        })
      );
    });
  });

  describe('Get Pairs', () => {
    it('should get pairs by pair addresses', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      await client.getPairs('0x123');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/pairs',
          params: { pairs: '0x123' },
        })
      );
    });
  });

  describe('Boost Endpoints', () => {
    it('should get boosted pairs', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      await client.getBoostedPairs();

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/boost',
        })
      );
    });
  });

  describe('Monitor Endpoints', () => {
    it('should get new tokens', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      await client.getNewTokens();

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/tokens/latest',
        })
      );
    });

    it('should get new tokens with minimum liquidity filter', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      await client.getNewTokens('ethereum', 10000);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { chainIds: 'ethereum', minLiquidityUSD: 10000 },
        })
      );
    });

    it('should get trending pairs', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      await client.getTrendingPairs();

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/pairs/trending',
        })
      );
    });
  });

  describe('Liquidity Spike Detection', () => {
    it('should detect liquidity spikes', async () => {
      const pairs = [
        {
          chainId: '1',
          dexId: 'uniswap',
          url: 'https://dexscreener.com/ethereum/0x123',
          pairAddress: '0x123',
          baseToken: {
            address: '0xabc',
            name: 'Ethereum',
            symbol: 'ETH',
          },
          quoteToken: {
            address: '0xdef',
            name: 'USD Coin',
            symbol: 'USDC',
          },
          priceNative: '2000',
          priceUsd: '2000',
          priceChange: {
            h24: 60, // 60% change
          },
          liquidity: {
            usd: 1000000,
          },
        },
        {
          chainId: '1',
          dexId: 'uniswap',
          url: 'https://dexscreener.com/ethereum/0x456',
          pairAddress: '0x456',
          baseToken: {
            address: '0xghi',
            name: 'Token',
            symbol: 'TOKEN',
          },
          quoteToken: {
            address: '0xdef',
            name: 'USD Coin',
            symbol: 'USDC',
          },
          priceNative: '1',
          priceUsd: '1',
          priceChange: {
            h24: 10, // 10% change - below threshold
          },
          liquidity: {
            usd: 500000,
          },
        },
      ];

      const spikes = await client.detectLiquiditySpikes(pairs as any, 50);

      expect(spikes).toHaveLength(1);
      expect(spikes[0].spikeType).toBe('increase');
      expect(spikes[0].changePercentage).toBe(60);
    });

    it('should filter by minimum liquidity', () => {
      const pairs = [
        {
          chainId: '1',
          dexId: 'uniswap',
          pairAddress: '0x123',
          baseToken: { symbol: 'ETH' },
          quoteToken: { symbol: 'USDC' },
          liquidity: {
            usd: 1000000,
          },
        },
        {
          chainId: '1',
          dexId: 'uniswap',
          pairAddress: '0x456',
          baseToken: { symbol: 'TOKEN' },
          quoteToken: { symbol: 'USDC' },
          liquidity: {
            usd: 5000, // Below minimum
          },
        },
      ];

      const filtered = client.filterByMinLiquidity(pairs as any, 10000);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].liquidity?.usd).toBe(1000000);
    });
  });

  describe('Data Normalization', () => {
    it('should normalize pair identifier', () => {
      const pair = {
        chainId: '1',
        dexId: 'uniswap',
        pairAddress: '0x123',
        baseToken: {
          symbol: 'ETH',
        },
        quoteToken: {
          symbol: 'USDC',
        },
      };

      const normalized = client.normalizePairIdentifier(pair as any);
      expect(normalized).toBe('ETH/USDC');
    });

    it('should get chain name from chain ID', () => {
      expect(client.getChainName('1')).toBe('ethereum');
      expect(client.getChainName('56')).toBe('bsc');
      expect(client.getChainName('137')).toBe('polygon');
      expect(client.getChainName('unknown')).toBe('unknown');
    });
  });

  describe('Price Volume Snapshots', () => {
    it('should get price volume snapshots across chains', async () => {
      const mockResponse = {
        data: {
          schemaVersion: '1.0.0',
          pairs: [
            {
              chainId: '1',
              dexId: 'uniswap',
              pairAddress: '0x123',
              baseToken: { symbol: 'ETH' },
              quoteToken: { symbol: 'USDC' },
            },
            {
              chainId: '56',
              dexId: 'pancakeswap',
              pairAddress: '0x456',
              baseToken: { symbol: 'ETH' },
              quoteToken: { symbol: 'USDC' },
            },
          ],
          tokens: [],
        },
      };

      const mockAxiosInstance = (client as any).axios;
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const snapshots = await client.getPriceVolumeSnapshots('0xabc');

      expect(snapshots.size).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const mockAxiosInstance = (client as any).axios;
      const error = {
        response: {
          status: 500,
          data: { error: 'Internal Server Error' },
        },
        config: {
          url: '/search',
        },
        message: 'Request failed',
      };

      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.searchPairs('0xabc')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const mockAxiosInstance = (client as any).axios;
      const error = {
        request: {},
        message: 'Network error',
      };

      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.searchPairs('0xabc')).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      const mockAxiosInstance = (client as any).axios;
      const error = {
        response: {
          status: 429,
          headers: {
            'retry-after': '60',
            'x-ratelimit-remaining': '0',
          },
          data: { error: 'Rate limit exceeded' },
        },
        config: {
          url: '/search',
        },
        message: 'Rate limit exceeded',
      };

      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(client.searchPairs('0xabc')).rejects.toThrow();
    });
  });
});

