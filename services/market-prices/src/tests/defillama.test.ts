/**
 * DeFiLlama REST API Client Tests
 * Comprehensive test coverage with mocked responses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DefiLlamaRestClient, DeFiLlamaYieldPool } from '../providers/defillama-rest';
import { DataSource } from '../types';
import axios from 'axios';

// Mock axios and axios-retry
vi.mock('axios');
vi.mock('axios-retry', () => ({
  default: vi.fn(),
  isNetworkOrIdempotentRequestError: vi.fn().mockReturnValue(true),
}));

const mockedAxios = axios as any;

describe('DefiLlamaRestClient', () => {
  let client!: DefiLlamaRestClient;
  let mockAxiosInstance!: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      request: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
      defaults: { headers: {}, baseURL: 'https://api.llama.fi' },
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    client = new DefiLlamaRestClient({
      apiKey: 'test-api-key',
      apiUrl: 'https://api.llama.fi',
      rateLimit: {
        maxRequestsPerMinute: 300,
        reservoir: 300,
        reservoirRefreshAmount: 300,
        reservoirRefreshInterval: 60000,
      },
      retry: {
        retries: 3,
        retryDelay: 1000,
      },
    });
  });

  afterEach(() => {
    if (client) {
      client.clearCache();
    }
  });

  describe('Configuration', () => {
    it('should initialize with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.llama.fi',
          timeout: 30000,
        })
      );
    });

    it('should include API key in headers if provided', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
          }),
        })
      );
    });

    it('should work without API key', () => {
      const noKeyClient = new DefiLlamaRestClient({
        apiKey: '',
        apiUrl: 'https://api.llama.fi',
        rateLimit: {
          maxRequestsPerMinute: 300,
          reservoir: 300,
          reservoirRefreshAmount: 300,
          reservoirRefreshInterval: 60000,
        },
        retry: {
          retries: 3,
          retryDelay: 1000,
        },
      });
      expect(noKeyClient).toBeDefined();
    });
  });

  describe('TVL Endpoints', () => {
    it('should get all protocols', async () => {
      const mockProtocols = [
        {
          id: '1',
          name: 'Aave',
          slug: 'aave',
          symbol: 'AAVE',
          tvl: 10000000000,
          category: 'Lending',
          chains: ['Ethereum', 'Polygon'],
          change_1d: 5.2,
          change_7d: -2.1,
        },
      ];

      mockAxiosInstance.request.mockResolvedValueOnce({ data: mockProtocols, status: 200 });

      const result = await client.getProtocols();

      expect(result).toEqual(mockProtocols);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/protocols',
        params: undefined,
      });
    });

    it('should get specific protocol', async () => {
      const mockProtocol = {
        id: '1',
        name: 'Aave',
        slug: 'aave',
        tvl: 10000000000,
        chainTvls: {
          Ethereum: 8000000000,
          Polygon: 2000000000,
        },
      };

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockProtocol, status: 200 });

      const result = await client.getProtocol('aave');

      expect(result).toEqual(mockProtocol);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/protocol/aave',
        params: undefined,
      });
    });

    it('should get historical TVL', async () => {
      const mockTVL = [
        { date: 1699401600, totalLiquidityUSD: 10000000000 },
        { date: 1699488000, totalLiquidityUSD: 11000000000 },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockTVL, status: 200 });

      const result = await client.getHistoricalTVL();

      expect(result).toEqual(mockTVL);
      expect(result.length).toBe(2);
    });

    it('should get all chains', async () => {
      const mockChains = [
        { name: 'Ethereum', tvl: 50000000000, chainId: 1 },
        { name: 'BSC', tvl: 10000000000, chainId: 56 },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockChains, status: 200 });

      const result = await client.getAllChains();

      expect(result).toEqual(mockChains);
      expect(result.length).toBe(2);
    });
  });

  describe('Yield Endpoints', () => {
    it('should get all pools', async () => {
      const mockPools = [
        {
          chain: 'Ethereum',
          project: 'aave-v3',
          symbol: 'USDC',
          tvlUsd: 1000000,
          apy: 3.5,
          apyBase: 2.0,
          apyReward: 1.5,
          pool: 'pool-id-1',
          stablecoin: true,
          ilRisk: 'no',
          exposure: 'single',
          rewardTokens: ['AAVE'],
          underlyingTokens: ['USDC'],
          mu: 0.05,
          sigma: 0.1,
          count: 30,
          outlier: false,
          predictions: null,
          poolMeta: null,
          il7d: null,
          apyBase7d: null,
          apyMean30d: 3.2,
          volumeUsd1d: 50000,
          volumeUsd7d: 350000,
          apyBaseInception: 2.5,
        },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockPools, status: 200 });

      const result = await client.getPools();

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('USDC');
      expect(result[0].apy).toBe(3.5);
    });

    it('should get specific pool by ID', async () => {
      const mockPools = [
        {
          pool: 'pool-id-1',
          chain: 'Ethereum',
          project: 'aave-v3',
          symbol: 'USDC',
          tvlUsd: 1000000,
          apy: 3.5,
          apyBase: 2.0,
          apyReward: 1.5,
          stablecoin: true,
          ilRisk: 'no',
          exposure: 'single',
          rewardTokens: ['AAVE'],
          underlyingTokens: ['USDC'],
          mu: 0.05,
          sigma: 0.1,
          count: 30,
          outlier: false,
          predictions: null,
          poolMeta: null,
          il7d: null,
          apyBase7d: null,
          apyMean30d: 3.2,
          volumeUsd1d: 50000,
          volumeUsd7d: 350000,
          apyBaseInception: 2.5,
        },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockPools, status: 200 });

      const result = await client.getPool('pool-id-1');

      expect(result).toBeDefined();
      expect(result?.pool).toBe('pool-id-1');
    });

    it('should return null for non-existent pool', async () => {
      const mockPools: DeFiLlamaYieldPool[] = [];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockPools, status: 200 });

      const result = await client.getPool('non-existent-pool');

      expect(result).toBeNull();
    });
  });

  describe('Stablecoin Endpoints', () => {
    it('should get all stablecoins', async () => {
      const mockStablecoins = {
        peggedAssets: [
          {
            id: '1',
            name: 'Tether',
            symbol: 'USDT',
            circulating: { peggedUSD: 80000000000 },
            circulatingPrevDay: { peggedUSD: 79000000000 },
            circulatingPrevWeek: { peggedUSD: 78000000000 },
            circulatingPrevMonth: { peggedUSD: 75000000000 },
            chains: ['Ethereum', 'Tron', 'BSC'],
            chainCirculating: {},
            gecko_id: 'tether',
            pegType: 'fiat',
            pegMechanism: 'centralized',
            price: 1.0,
          },
        ],
      };

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockStablecoins, status: 200 });

      const result = await client.getStablecoins();

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('USDT');
      expect(result[0].circulating.peggedUSD).toBe(80000000000);
    });

    it('should get specific stablecoin', async () => {
      const mockStablecoins = {
        peggedAssets: [
          {
            id: 'usdc',
            name: 'USD Coin',
            symbol: 'USDC',
            circulating: { peggedUSD: 25000000000 },
            circulatingPrevDay: { peggedUSD: 25000000000 },
            circulatingPrevWeek: { peggedUSD: 24800000000 },
            circulatingPrevMonth: { peggedUSD: 24500000000 },
            chains: ['Ethereum'],
            chainCirculating: {},
            gecko_id: 'usd-coin',
            pegType: 'fiat',
            pegMechanism: 'centralized',
            price: 1.0,
          },
        ],
      };

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockStablecoins, status: 200 });

      const result = await client.getStablecoin('usdc');

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('USDC');
    });
  });

  describe('Token Unlock Endpoints', () => {
    it('should get token unlocks', async () => {
      const mockUnlocks = [
        {
          name: 'Aptos',
          symbol: 'APT',
          nextEvent: {
            date: 1699488000,
            amount: 1000000,
            amountUSD: 5000000,
          },
          totalLocked: 500000000,
          totalLockedUSD: 2500000000,
          circulatingSupply: 200000000,
          maxSupply: 1000000000,
        },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockUnlocks, status: 200 });

      const result = await client.getUnlocks();

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('APT');
      expect(result[0].nextEvent.amountUSD).toBe(5000000);
    });
  });

  describe('Bridge Endpoints', () => {
    it('should get all bridges', async () => {
      const mockBridges = [
        {
          id: 'bridge-1',
          name: 'Polygon Bridge',
          displayName: 'Polygon Bridge',
          icon: 'https://example.com/icon.png',
          chains: ['Ethereum', 'Polygon'],
          tvl: 5000000000,
          volume24h: 100000000,
          volume7d: 700000000,
          volume30d: 3000000000,
          uniqueUsers24h: 5000,
          uniqueUsers7d: 35000,
          uniqueUsers30d: 150000,
          change24h: 5.2,
          change7d: -2.1,
          change30d: 10.5,
        },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockBridges, status: 200 });

      const result = await client.getBridges();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('bridge-1');
      expect(result[0].name).toBe('Polygon Bridge');
      expect(result[0].tvl).toBe(5000000000);
      expect(result[0].volume24h).toBe(100000000);
    });

    it('should get specific bridge by ID', async () => {
      const mockBridges = [
        {
          id: 'bridge-1',
          name: 'Polygon Bridge',
          displayName: 'Polygon Bridge',
          chains: ['Ethereum', 'Polygon'],
          tvl: 5000000000,
        },
        {
          id: 'bridge-2',
          name: 'Arbitrum Bridge',
          displayName: 'Arbitrum Bridge',
          chains: ['Ethereum', 'Arbitrum'],
          tvl: 3000000000,
        },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockBridges, status: 200 });

      const result = await client.getBridge('bridge-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('bridge-1');
      expect(result?.name).toBe('Polygon Bridge');
    });

    it('should return null for non-existent bridge', async () => {
      const mockBridges: any[] = [];
      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockBridges, status: 200 });

      const result = await client.getBridge('non-existent-bridge');

      expect(result).toBeNull();
    });
  });

  describe('Protocol Revenue Endpoints', () => {
    it('should get protocol revenue data', async () => {
      const mockRevenue = [
        {
          date: 1699401600,
          dailyRevenueUSD: 100000,
          dailyFeesUSD: 150000,
          dailySupplySideRevenueUSD: 50000,
          dailyProtocolRevenueUSD: 100000,
          totalRevenueUSD: 10000000,
          totalFeesUSD: 15000000,
        },
        {
          date: 1699488000,
          dailyRevenueUSD: 110000,
          dailyFeesUSD: 160000,
          dailySupplySideRevenueUSD: 50000,
          dailyProtocolRevenueUSD: 110000,
          totalRevenueUSD: 10110000,
          totalFeesUSD: 15160000,
        },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockRevenue, status: 200 });

      const result = await client.getProtocolRevenue('aave', 30);

      expect(result).toHaveLength(2);
      expect(result[0].dailyRevenueUSD).toBe(100000);
      expect(result[0].dailyFeesUSD).toBe(150000);
      expect(mockInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/protocol/aave/revenue',
        params: { days: 30 },
      });
    });

    it('should handle empty revenue data', async () => {
      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: [], status: 200 });

      const result = await client.getProtocolRevenue('unknown-protocol', 30);

      expect(result).toEqual([]);
    });

    it('should handle revenue API errors gracefully', async () => {
      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockRejectedValueOnce(new Error('Protocol not found'));

      const result = await client.getProtocolRevenue('invalid-protocol', 30);

      expect(result).toEqual([]);
    });
  });

  describe('Fees Endpoints', () => {
    it('should get all protocol fees', async () => {
      const mockFees = [
        {
          date: 1699401600,
          dailyFeesUSD: 150000,
          dailyRevenueUSD: 100000,
          protocolId: 'aave',
          protocolName: 'Aave',
        },
        {
          date: 1699401600,
          dailyFeesUSD: 200000,
          dailyRevenueUSD: 150000,
          protocolId: 'uniswap',
          protocolName: 'Uniswap',
        },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockFees, status: 200 });

      const result = await client.getFees();

      expect(result).toHaveLength(2);
      expect(result[0].dailyFeesUSD).toBe(150000);
      expect(result[1].protocolName).toBe('Uniswap');
      expect(mockInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/fees',
        params: undefined,
      });
    });

    it('should get protocol-specific fees', async () => {
      const mockFees = [
        {
          date: 1699401600,
          dailyFeesUSD: 150000,
          dailyRevenueUSD: 100000,
          protocolId: 'aave',
          protocolName: 'Aave',
        },
      ];

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: mockFees, status: 200 });

      const result = await client.getProtocolFees('aave');

      expect(result).toHaveLength(1);
      expect(result[0].protocolId).toBe('aave');
      expect(mockInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/protocol/aave/fees',
        params: undefined,
      });
    });

    it('should handle fees API errors gracefully', async () => {
      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockRejectedValueOnce(new Error('API error'));

      const result = await client.getFees();

      expect(result).toEqual([]);
    });
  });

  describe('Historical Yield Endpoints', () => {
    it('should return empty array when pool not found', async () => {
      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: [], status: 200 });

      const result = await client.getHistoricalYields('non-existent-pool', 30);

      expect(result).toEqual([]);
    });

    it('should handle historical yields gracefully', async () => {
      // First mock getPoolById to return a pool
      const mockPool = {
        pool: 'pool-id-1',
        chain: 'Ethereum',
        project: 'aave-v3',
        symbol: 'USDC',
        tvlUsd: 1000000,
        apy: 3.5,
      };

      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: [mockPool], status: 200 });

      const result = await client.getHistoricalYields('pool-id-1', 30);

      // Currently returns empty array as endpoint is not yet available
      expect(result).toEqual([]);
    });
  });

  describe('Data Normalization', () => {
    it('should normalize protocol data to Coinet format', () => {
      const mockProtocol = {
        id: '1',
        name: 'Uniswap',
        address: null,
        symbol: 'UNI',
        url: 'https://uniswap.org',
        description: 'Decentralized exchange',
        chain: 'Ethereum',
        logo: 'https://logo.url',
        audits: 'https://audits.url',
        audit_note: null,
        gecko_id: 'uniswap',
        cmcId: '7083',
        category: 'Dexes',
        chains: ['Ethereum', 'Polygon', 'Arbitrum'],
        module: 'uniswap-v3',
        twitter: 'Uniswap',
        forkedFrom: [],
        oracles: [],
        listedAt: 1599696000,
        slug: 'uniswap',
        tvl: 5000000000,
        chainTvls: {
          Ethereum: 4000000000,
          Polygon: 500000000,
          Arbitrum: 500000000,
        },
        change_1h: 0.5,
        change_1d: 2.1,
        change_7d: -1.5,
        staking: null,
        fdv: 10000000000,
        mcap: 8000000000,
      };

      const normalized = client.normalizeProtocolData(mockProtocol);

      expect(normalized.id).toBe('uniswap');
      expect(normalized.name).toBe('Uniswap');
      expect(normalized.tvl).toBe(5000000000);
      expect(normalized.tvlChange24h).toBe(2.1);
      expect(normalized.tvlChange7d).toBe(-1.5);
      expect(normalized.mcap).toBe(8000000000);
      expect(normalized.fdv).toBe(10000000000);
      expect(normalized.source).toBe(DataSource.DEFILLAMA);
      expect(normalized.chains).toEqual(['Ethereum', 'Polygon', 'Arbitrum']);
    });

    it('should normalize yield pool data to Coinet format', () => {
      const mockPool = {
        chain: 'Ethereum',
        project: 'aave-v3',
        symbol: 'USDC',
        tvlUsd: 1000000,
        apy: 3.5,
        apyBase: 2.0,
        apyReward: 1.5,
        pool: 'pool-id-1',
        stablecoin: true,
        ilRisk: 'no',
        exposure: 'single',
        rewardTokens: ['AAVE'],
        underlyingTokens: ['USDC'],
        mu: 0.05,
        sigma: 0.1,
        count: 30,
        outlier: false,
        predictions: null,
        poolMeta: null,
        il7d: null,
        apyBase7d: null,
        apyMean30d: 3.2,
        volumeUsd1d: 50000,
        volumeUsd7d: 350000,
        apyBaseInception: 2.5,
      };

      const normalized = client.normalizeYieldData(mockPool);

      expect(normalized.poolId).toBe('pool-id-1');
      expect(normalized.protocol).toBe('aave-v3');
      expect(normalized.chain).toBe('Ethereum');
      expect(normalized.tvl).toBe(1000000);
      expect(normalized.apy).toBe(3.5);
      expect(normalized.isStablecoin).toBe(true);
      expect(normalized.riskLevel).toBe('low'); // Stablecoin = low risk
      expect(normalized.source).toBe(DataSource.DEFILLAMA);
    });

    it('should determine high risk for IL-exposed pools', () => {
      const mockPool = {
        chain: 'Ethereum',
        project: 'uniswap-v3',
        symbol: 'ETH-BTC',
        tvlUsd: 5000000,
        apy: 25.0,
        apyBase: 5.0,
        apyReward: 20.0,
        pool: 'pool-id-2',
        stablecoin: false,
        ilRisk: 'yes',
        exposure: 'multi',
        rewardTokens: ['UNI'],
        underlyingTokens: ['ETH', 'BTC'],
        mu: 0.15,
        sigma: 0.3,
        count: 30,
        outlier: false,
        predictions: null,
        poolMeta: null,
        il7d: -5.2,
        apyBase7d: 4.8,
        apyMean30d: 23.5,
        volumeUsd1d: 200000,
        volumeUsd7d: 1400000,
        apyBaseInception: 18.0,
      };

      const normalized = client.normalizeYieldData(mockPool);

      expect(normalized.riskLevel).toBe('high'); // IL risk = high
    });
  });

  describe('Caching', () => {
    it('should cache responses', async () => {
      const mockProtocols = [{ name: 'Aave', tvl: 10000000000 }];

      mockAxiosInstance.request.mockResolvedValueOnce({ data: mockProtocols, status: 200 });

      // First call - should hit API
      await client.getProtocols();
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);

      // Second call - should hit cache
      await client.getProtocols();
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should clear cache', async () => {
      const mockProtocols = [{ name: 'Aave', tvl: 10000000000 }];

      mockAxiosInstance.request.mockResolvedValue({ data: mockProtocols, status: 200 });

      await client.getProtocols();
      client.clearCache();
      await client.getProtocols();

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2); // Cache cleared, so 2 calls
    });

    it('should provide cache statistics', async () => {
      const stats = client.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should return true when API is healthy', async () => {
      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockResolvedValueOnce({ data: [], status: 200 });

      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      const mockInstance = mockAxiosInstance;
      mockInstance.request.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      mockAxiosInstance.request.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Internal Server Error' },
        },
      });

      await expect(client.getProtocols()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockAxiosInstance.request.mockRejectedValueOnce({
        request: {},
        message: 'Network error',
      });

      await expect(client.getProtocols()).rejects.toThrow();
    });
  });

  describe('Time Series Data Creation', () => {
    it('should create time-series data point', () => {
      const data = client.createTimeSeriesData(
        'aave',
        'Ethereum',
        'tvl',
        10000000000,
        5.2,
        -1.5
      );

      expect(data.protocol).toBe('aave');
      expect(data.chain).toBe('Ethereum');
      expect(data.metric).toBe('tvl');
      expect(data.value).toBe(10000000000);
      expect(data.change24h).toBe(5.2);
      expect(data.change7d).toBe(-1.5);
      expect(data.timestamp).toBeInstanceOf(Date);
    });
  });
});

