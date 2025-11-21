/**
 * =========================================
 * DEFI LLAMA CLIENT
 * =========================================
 * Comprehensive client for DeFi Llama API integrations
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from '../utils/Logger';
import type { ProtocolInfo, TVLMetrics, YieldMetrics, LendingMetrics, LiquidityMetrics } from '../types';

export interface DeFiLlamaProtocol {
  id: string;
  name: string;
  address?: string;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  logo?: string;
  audits?: string[];
  audit_note?: string;
  gecko_id?: string;
  cmcId?: string;
  category: string;
  chains: string[];
  module: string;
  twitter?: string;
  forkedFrom?: string[];
  oracles?: string[];
  listedAt?: number;
  slug?: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  change_30d?: number;
  tokenBreakdowns?: Record<string, number>;
  mcap?: number;
  fdv?: number;
  audits_2?: string[];
  audit_links?: string[];
  github?: string[];
  docs?: string;
  governanceID?: string[];
  treasury?: string;
  stablecoin?: boolean;
  misrepresentedTokens?: boolean;
  hallOfFame?: boolean;
  deadFrom?: number;
  reason?: string;
  performance?: {
    tvl: number;
    change_1h?: number;
    change_1d?: number;
    change_7d?: number;
  };
}

export interface DeFiLlamaPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase?: number;
  apyReward?: number;
  apy: number;
  rewardTokens?: string[];
  underlyingTokens?: string[];
  poolMeta?: string;
  url?: string;
  volumeUsd1d?: number;
  volumeUsd7d?: number;
  apyPct1D?: number;
  apyPct7D?: number;
  apyPct30D?: number;
  stablecoin?: boolean;
  ilRisk?: string;
  exposure?: string;
  predictions?: {
    predictedClass?: string;
    predictedProbability?: number;
    binnedConfidence?: number;
  };
  binnedConfidence?: number;
  outlier?: boolean;
  mu?: number;
  sigma?: number;
}

export interface DeFiLlamaConfig {
  baseUrl?: string;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export class DeFiLlamaClient {
  private logger: Logger;
  private config: DeFiLlamaConfig;
  private httpClient: AxiosInstance;
  private isInitialized: boolean = false;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitWindow: number = 60000; // 1 minute

  constructor(config?: DeFiLlamaConfig) {
    this.logger = new Logger('DeFiLlamaClient');
    this.config = {
      baseUrl: 'https://api.llama.fi',
      rateLimit: {
        requestsPerMinute: 60, // Conservative limit for DeFi Llama API
        requestsPerHour: 1000
      },
      ...config
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'CoinetDeFiMetrics/1.0',
        'Accept': 'application/json'
      }
    });

    // Rate limiting interceptor
    this.httpClient.interceptors.request.use((config) => {
      return this.enforceRateLimit(config);
    });

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          this.logger.rateLimit('defillama', 'rate_limit_exceeded', new Date(Date.now() + 60000));
        }
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing DeFi Llama Client...');

      // Test the connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('✅ DeFi Llama Client initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize DeFi Llama Client', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ DeFi Llama Client stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop DeFi Llama Client', error);
      throw error;
    }
  }

  /**
   * Get all protocols from DeFi Llama
   */
  async getProtocols(): Promise<DeFiLlamaProtocol[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('DeFi Llama Client is not initialized');
      }

      this.logger.debug('Fetching protocols from DeFi Llama');

      const response: AxiosResponse<DeFiLlamaProtocol[]> = await this.httpClient.get('/protocols');

      return response.data;

    } catch (error: any) {
      this.logger.error('Failed to fetch protocols from DeFi Llama', error);
      throw error;
    }
  }

  /**
   * Get specific protocol data
   */
  async getProtocol(protocolId: string): Promise<DeFiLlamaProtocol> {
    try {
      if (!this.isInitialized) {
        throw new Error('DeFi Llama Client is not initialized');
      }

      this.logger.debug(`Fetching protocol ${protocolId} from DeFi Llama`);

      const response: AxiosResponse<DeFiLlamaProtocol> = await this.httpClient.get(`/protocol/${protocolId}`);

      return response.data;

    } catch (error: any) {
      this.logger.error(`Failed to fetch protocol ${protocolId} from DeFi Llama`, error);
      throw error;
    }
  }

  /**
   * Get TVL data for a protocol
   */
  async getTVL(protocolId: string): Promise<TVLMetrics> {
    try {
      if (!this.isInitialized) {
        throw new Error('DeFi Llama Client is not initialized');
      }

      this.logger.debug(`Fetching TVL data for ${protocolId}`);

      const response: AxiosResponse<any> = await this.httpClient.get(`/protocol/${protocolId}`);

      return this.parseTVLMetrics(protocolId, response.data);

    } catch (error: any) {
      this.logger.error(`Failed to fetch TVL data for ${protocolId}`, error);
      throw error;
    }
  }

  /**
   * Get yield pools from DeFi Llama
   */
  async getYieldPools(): Promise<DeFiLlamaPool[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('DeFi Llama Client is not initialized');
      }

      this.logger.debug('Fetching yield pools from DeFi Llama');

      const response: AxiosResponse<DeFiLlamaPool[]> = await this.httpClient.get('/pools');

      return response.data;

    } catch (error: any) {
      this.logger.error('Failed to fetch yield pools from DeFi Llama', error);
      throw error;
    }
  }

  /**
   * Get yield pools for a specific protocol
   */
  async getYieldPoolsForProtocol(protocolId: string): Promise<DeFiLlamaPool[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('DeFi Llama Client is not initialized');
      }

      this.logger.debug(`Fetching yield pools for ${protocolId}`);

      const response: AxiosResponse<DeFiLlamaPool[]> = await this.httpClient.get(`/pools`, {
        params: { project: protocolId }
      });

      return response.data;

    } catch (error: any) {
      this.logger.error(`Failed to fetch yield pools for ${protocolId}`, error);
      throw error;
    }
  }

  /**
   * Get historical TVL data for backfill
   */
  async getHistoricalTVL(protocolId: string, startDate: Date, endDate: Date): Promise<Array<{
    date: number;
    tvl: number;
  }>> {
    try {
      if (!this.isInitialized) {
        throw new Error('DeFi Llama Client is not initialized');
      }

      this.logger.debug(`Fetching historical TVL for ${protocolId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const response: AxiosResponse<any> = await this.httpClient.get(`/protocol/${protocolId}`);

      // Extract historical TVL data
      const historicalData = response.data.tvl || [];

      // Filter by date range
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      return historicalData.filter((point: any) =>
        point.date >= startTimestamp && point.date <= endTimestamp
      );

    } catch (error: any) {
      this.logger.error(`Failed to fetch historical TVL for ${protocolId}`, error);
      throw error;
    }
  }

  /**
   * Get current TVL for all protocols
   */
  async getAllTVL(): Promise<Record<string, number>> {
    try {
      if (!this.isInitialized) {
        throw new Error('DeFi Llama Client is not initialized');
      }

      this.logger.debug('Fetching all TVL data from DeFi Llama');

      const response: AxiosResponse<Record<string, number>> = await this.httpClient.get('/tvl');

      return response.data;

    } catch (error: any) {
      this.logger.error('Failed to fetch all TVL data from DeFi Llama', error);
      throw error;
    }
  }

  private parseTVLMetrics(protocolId: string, data: DeFiLlamaProtocol): TVLMetrics {
    const totalTVL = data.tvl || 0;

    // Calculate token distribution from tokenBreakdowns if available
    const tokenDistribution: Record<string, number> = {};
    if (data.tokenBreakdowns) {
      const totalBreakdown = Object.values(data.tokenBreakdowns).reduce((sum, value) => sum + value, 0);
      for (const [token, value] of Object.entries(data.tokenBreakdowns)) {
        tokenDistribution[token] = (value / totalBreakdown) * 100;
      }
    }

    // Find dominant token
    const dominantToken = Object.entries(tokenDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'UNKNOWN';

    return {
      protocol: {
        id: protocolId,
        name: data.name,
        type: this.mapCategoryToProtocolType(data.category),
        network: this.mapChainToNetwork(data.chains?.[0] || data.chain),
        contractAddress: data.address || '',
        tokenSymbol: data.symbol,
        tokenAddress: data.address || '',
        website: data.url,
        description: data.description,
        launchDate: data.listedAt ? new Date(data.listedAt * 1000) : new Date(),
        isActive: !data.deadFrom
      },
      totalValueLocked: totalTVL,
      totalValueLockedChange24h: data.change_1d || 0,
      totalValueLockedChange7d: data.change_7d || 0,
      tvlRank: 0, // Would need global ranking service
      dominantToken,
      tokenDistribution,
      timestamp: new Date(),
      source: 'defillama'
    };
  }

  private parseYieldMetrics(protocolId: string, pools: DeFiLlamaPool[]): YieldMetrics[] {
    return pools.map((pool) => {
      // Find protocol info for this pool
      const protocol = {
        id: protocolId,
        name: pool.project,
        type: 'yield-farming' as const,
        network: this.mapChainToNetwork(pool.chain),
        contractAddress: '',
        tokenSymbol: pool.symbol,
        tokenAddress: '',
        launchDate: new Date(),
        isActive: true
      };

      return {
        protocol,
        poolId: pool.pool,
        poolName: `${pool.symbol} Pool`,
        apy: pool.apy,
        apyChange24h: pool.apyPct1D || 0,
        baseApy: pool.apyBase || 0,
        rewardApy: pool.apyReward || 0,
        impermanentLoss: pool.ilRisk ? this.mapILRisk(pool.ilRisk) : undefined,
        volume24h: pool.volumeUsd1d || 0,
        fees24h: pool.volumeUsd1d ? pool.volumeUsd1d * 0.003 : 0, // Estimate 0.3% fees
        timestamp: new Date(),
        source: 'defillama'
      };
    });
  }

  private mapCategoryToProtocolType(category: string): 'lending' | 'dex' | 'yield-farming' | 'liquid-staking' | 'synthetic-assets' | 'insurance' | 'options' | 'perpetual' | 'cross-chain' | 'privacy' | 'gaming' | 'nft' {
    switch (category?.toLowerCase()) {
      case 'lending':
        return 'lending';
      case 'dexes':
      case 'dex':
        return 'dex';
      case 'yield':
      case 'yield-farming':
        return 'yield-farming';
      case 'liquid-staking':
        return 'liquid-staking';
      case 'synthetics':
      case 'synthetic-assets':
        return 'synthetic-assets';
      case 'insurance':
        return 'insurance';
      case 'options':
        return 'options';
      case 'perpetual':
        return 'perpetual';
      case 'cross-chain':
        return 'cross-chain';
      case 'privacy':
        return 'privacy';
      case 'gaming':
        return 'gaming';
      case 'nft':
        return 'nft';
      default:
        return 'yield-farming';
    }
  }

  private mapChainToNetwork(chain: string): 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism' | 'avalanche' | 'fantom' | 'solana' | 'base' | 'celo' | 'harmony' | 'moonbeam' {
    switch (chain?.toLowerCase()) {
      case 'ethereum':
        return 'ethereum';
      case 'polygon':
      case 'matic':
        return 'polygon';
      case 'bsc':
      case 'binance':
        return 'bsc';
      case 'arbitrum':
        return 'arbitrum';
      case 'optimism':
        return 'optimism';
      case 'avalanche':
        return 'avalanche';
      case 'fantom':
        return 'fantom';
      case 'solana':
        return 'solana';
      case 'base':
        return 'base';
      case 'celo':
        return 'celo';
      case 'harmony':
        return 'harmony';
      case 'moonbeam':
        return 'moonbeam';
      default:
        return 'ethereum';
    }
  }

  private mapILRisk(risk: string): number {
    switch (risk?.toLowerCase()) {
      case 'low':
        return 0.1;
      case 'medium':
        return 0.3;
      case 'high':
        return 0.7;
      case 'none':
        return 0;
      default:
        return 0.3;
    }
  }

  private async enforceRateLimit(config: any): Promise<any> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset counter if we're in a new window
    if (timeSinceLastRequest >= this.rateLimitWindow) {
      this.requestCount = 0;
    }

    // Check rate limits
    if (this.requestCount >= this.config.rateLimit!.requestsPerMinute) {
      const waitTime = this.rateLimitWindow - timeSinceLastRequest;
      if (waitTime > 0) {
        this.logger.debug(`Rate limiting: waiting ${waitTime}ms`);
        await this.delay(waitTime);
      }
      this.requestCount = 0;
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();

    return config;
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await this.httpClient.get('/protocols', {
        params: { page: 1, limit: 1 }
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response from DeFi Llama');
      }

      this.logger.debug('DeFi Llama connection test successful');
    } catch (error: any) {
      throw new Error(`DeFi Llama connection test failed: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
