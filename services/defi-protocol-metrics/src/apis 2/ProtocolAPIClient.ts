/**
 * =========================================
 * PROTOCOL API CLIENT
 * =========================================
 * Protocol-specific API integrations for enhanced data collection
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from '../utils/Logger';
import type { ProtocolInfo, TVLMetrics, YieldMetrics, LendingMetrics, GovernanceMetrics } from '../types';

export interface ProtocolAPIConfig {
  protocolId: string;
  baseUrl?: string;
  apiKey?: string;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export class ProtocolAPIClient {
  private logger: Logger;
  private config: ProtocolAPIConfig;
  private httpClient: AxiosInstance;
  private isInitialized: boolean = false;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitWindow: number = 60000; // 1 minute

  constructor(config: ProtocolAPIConfig) {
    this.logger = new Logger(`ProtocolAPIClient:${config.protocolId}`);
    this.config = {
      rateLimit: {
        requestsPerMinute: 60, // Conservative default
        requestsPerHour: 1000
      },
      ...config
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'CoinetDeFiMetrics/1.0',
        'Accept': 'application/json',
        ...this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }
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
          this.logger.rateLimit(this.config.protocolId, 'rate_limit_exceeded', new Date(Date.now() + 60000));
        } else if (error.response?.status === 401) {
          this.logger.error(`${this.config.protocolId} API authentication failed`);
        }
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info(`Initializing ${this.config.protocolId} API Client...`);

      // Test the connection
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info(`✅ ${this.config.protocolId} API Client initialized successfully`);

    } catch (error: any) {
      this.logger.error(`❌ Failed to initialize ${this.config.protocolId} API Client`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info(`✅ ${this.config.protocolId} API Client stopped successfully`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to stop ${this.config.protocolId} API Client`, error);
      throw error;
    }
  }

  /**
   * Get protocol-specific TVL data
   */
  async getTVL(protocol: ProtocolInfo): Promise<TVLMetrics> {
    try {
      if (!this.isInitialized) {
        throw new Error(`${this.config.protocolId} API Client is not initialized`);
      }

      this.logger.debug(`Fetching TVL data for ${protocol.name} from ${this.config.protocolId} API`);

      let response: AxiosResponse<any>;

      switch (this.config.protocolId) {
        case 'uniswap-v3':
          response = await this.httpClient.get('/pools');
          return this.parseUniswapTVL(protocol, response.data);

        case 'aave-v3':
          response = await this.httpClient.get('/data/pools');
          return this.parseAaveTVL(protocol, response.data);

        case 'compound-v3':
          response = await this.httpClient.get('/api/v2/cToken');
          return this.parseCompoundTVL(protocol, response.data);

        default:
          throw new Error(`Protocol ${this.config.protocolId} not supported`);
      }

    } catch (error: any) {
      this.logger.error(`Failed to get TVL data for ${protocol.name}`, error);
      throw error;
    }
  }

  /**
   * Get protocol-specific yield data
   */
  async getYield(protocol: ProtocolInfo): Promise<YieldMetrics[]> {
    try {
      if (!this.isInitialized) {
        throw new Error(`${this.config.protocolId} API Client is not initialized`);
      }

      this.logger.debug(`Fetching yield data for ${protocol.name} from ${this.config.protocolId} API`);

      let response: AxiosResponse<any>;

      switch (this.config.protocolId) {
        case 'uniswap-v3':
          response = await this.httpClient.get('/pools');
          return this.parseUniswapYields(protocol, response.data);

        case 'aave-v3':
          response = await this.httpClient.get('/data/pools');
          return this.parseAaveYields(protocol, response.data);

        case 'compound-v3':
          response = await this.httpClient.get('/api/v2/cToken');
          return this.parseCompoundYields(protocol, response.data);

        default:
          throw new Error(`Protocol ${this.config.protocolId} not supported`);
      }

    } catch (error: any) {
      this.logger.error(`Failed to get yield data for ${protocol.name}`, error);
      throw error;
    }
  }

  /**
   * Get protocol-specific governance data
   */
  async getGovernance(protocol: ProtocolInfo): Promise<GovernanceMetrics[]> {
    try {
      if (!this.isInitialized) {
        throw new Error(`${this.config.protocolId} API Client is not initialized`);
      }

      this.logger.debug(`Fetching governance data for ${protocol.name} from ${this.config.protocolId} API`);

      let response: AxiosResponse<any>;

      switch (this.config.protocolId) {
        case 'uniswap':
          response = await this.httpClient.get('/api/v1/proposals');
          return this.parseUniswapGovernance(protocol, response.data);

        case 'aave':
          response = await this.httpClient.get('/api/governance/proposals');
          return this.parseAaveGovernance(protocol, response.data);

        case 'compound':
          response = await this.httpClient.get('/api/v1/proposals');
          return this.parseCompoundGovernance(protocol, response.data);

        default:
          throw new Error(`Governance not supported for ${this.config.protocolId}`);
      }

    } catch (error: any) {
      this.logger.error(`Failed to get governance data for ${protocol.name}`, error);
      throw error;
    }
  }

  private parseUniswapTVL(protocol: ProtocolInfo, data: any): TVLMetrics {
    const pools = data.pools || [];
    let totalTVL = 0;
    const tokenDistribution: Record<string, number> = {};

    pools.forEach((pool: any) => {
      const poolTVL = parseFloat(pool.totalValueLockedUSD || '0');
      totalTVL += poolTVL;

      // Track token distribution
      const token0Symbol = pool.token0?.symbol || 'UNKNOWN';
      const token1Symbol = pool.token1?.symbol || 'UNKNOWN';

      tokenDistribution[token0Symbol] = (tokenDistribution[token0Symbol] || 0) + (poolTVL / totalTVL * 100);
      tokenDistribution[token1Symbol] = (tokenDistribution[token1Symbol] || 0) + (poolTVL / totalTVL * 100);
    });

    const dominantToken = Object.entries(tokenDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'UNKNOWN';

    return {
      protocol,
      totalValueLocked: totalTVL,
      totalValueLockedChange24h: 0, // Would need historical data
      totalValueLockedChange7d: 0,  // Would need historical data
      tvlRank: 0,
      dominantToken,
      tokenDistribution,
      timestamp: new Date(),
      source: 'protocol-api'
    };
  }

  private parseAaveTVL(protocol: ProtocolInfo, data: any): TVLMetrics {
    const pools = data.pools || [];
    let totalTVL = 0;
    const tokenDistribution: Record<string, number> = {};

    pools.forEach((pool: any) => {
      const poolTVL = parseFloat(pool.totalValueLockedUSD || '0');
      totalTVL += poolTVL;

      // Track token distribution
      const assetSymbol = pool.asset?.symbol || 'UNKNOWN';
      tokenDistribution[assetSymbol] = (tokenDistribution[assetSymbol] || 0) + (poolTVL / totalTVL * 100);
    });

    const dominantToken = Object.entries(tokenDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'UNKNOWN';

    return {
      protocol,
      totalValueLocked: totalTVL,
      totalValueLockedChange24h: 0,
      totalValueLockedChange7d: 0,
      tvlRank: 0,
      dominantToken,
      tokenDistribution,
      timestamp: new Date(),
      source: 'protocol-api'
    };
  }

  private parseCompoundTVL(protocol: ProtocolInfo, data: any): TVLMetrics {
    const cTokens = data.cToken || [];
    let totalTVL = 0;
    const tokenDistribution: Record<string, number> = {};

    cTokens.forEach((cToken: any) => {
      const underlyingTVL = parseFloat(cToken.totalSupply || '0') * parseFloat(cToken.exchangeRate || '0');
      totalTVL += underlyingTVL;

      // Track underlying token distribution
      const underlyingSymbol = cToken.underlying_symbol || 'UNKNOWN';
      tokenDistribution[underlyingSymbol] = (tokenDistribution[underlyingSymbol] || 0) + (underlyingTVL / totalTVL * 100);
    });

    const dominantToken = Object.entries(tokenDistribution)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'UNKNOWN';

    return {
      protocol,
      totalValueLocked: totalTVL,
      totalValueLockedChange24h: 0,
      totalValueLockedChange7d: 0,
      tvlRank: 0,
      dominantToken,
      tokenDistribution,
      timestamp: new Date(),
      source: 'protocol-api'
    };
  }

  private parseUniswapYields(protocol: ProtocolInfo, data: any): YieldMetrics[] {
    const pools = data.pools || [];

    return pools.map((pool: any) => ({
      protocol,
      poolId: pool.id,
      poolName: `${pool.token0?.symbol}/${pool.token1?.symbol} Pool`,
      apy: parseFloat(pool.fees24h || '0') / parseFloat(pool.totalValueLockedUSD || '1') * 365 * 100,
      apyChange24h: 0,
      baseApy: parseFloat(pool.fees24h || '0') / parseFloat(pool.totalValueLockedUSD || '1') * 365 * 100,
      rewardApy: 0,
      volume24h: parseFloat(pool.volume24h || '0'),
      fees24h: parseFloat(pool.fees24h || '0'),
      timestamp: new Date(),
      source: 'protocol-api'
    }));
  }

  private parseAaveYields(protocol: ProtocolInfo, data: any): YieldMetrics[] {
    const pools = data.pools || [];

    return pools.map((pool: any) => ({
      protocol,
      poolId: pool.poolId,
      poolName: `${pool.asset?.symbol} Pool`,
      apy: parseFloat(pool.supplyApy || '0'),
      apyChange24h: 0,
      baseApy: parseFloat(pool.supplyApy || '0'),
      rewardApy: parseFloat(pool.rewardApy || '0'),
      volume24h: 0, // Not directly available
      fees24h: 0,   // Not directly available
      timestamp: new Date(),
      source: 'protocol-api'
    }));
  }

  private parseCompoundYields(protocol: ProtocolInfo, data: any): YieldMetrics[] {
    const cTokens = data.cToken || [];

    return cTokens.map((cToken: any) => ({
      protocol,
      poolId: cToken.symbol,
      poolName: `${cToken.underlying_symbol} Pool`,
      apy: parseFloat(cToken.supply_rate?.value || '0') * 100,
      apyChange24h: 0,
      baseApy: parseFloat(cToken.supply_rate?.value || '0') * 100,
      rewardApy: 0,
      volume24h: 0, // Not directly available
      fees24h: 0,   // Not directly available
      timestamp: new Date(),
      source: 'protocol-api'
    }));
  }

  private parseUniswapGovernance(protocol: ProtocolInfo, data: any): GovernanceMetrics[] {
    const proposals = data.proposals || [];

    return proposals.map((proposal: any) => ({
      protocol,
      proposalId: proposal.id,
      title: proposal.title,
      description: proposal.description,
      status: this.mapProposalStatus(proposal.status),
      startDate: new Date(proposal.startTime),
      endDate: new Date(proposal.endTime),
      forVotes: parseInt(proposal.forVotes || '0'),
      againstVotes: parseInt(proposal.againstVotes || '0'),
      abstainVotes: parseInt(proposal.abstainVotes || '0'),
      quorum: parseFloat(proposal.quorum || '0'),
      turnout: 0, // Would need total voting power
      tokenHolders: 0,
      votingPower: 0,
      creator: proposal.proposer,
      timestamp: new Date(),
      source: 'protocol-api'
    }));
  }

  private parseAaveGovernance(protocol: ProtocolInfo, data: any): GovernanceMetrics[] {
    const proposals = data.proposals || [];

    return proposals.map((proposal: any) => ({
      protocol,
      proposalId: proposal.id,
      title: proposal.title,
      description: proposal.description,
      status: this.mapProposalStatus(proposal.state),
      startDate: new Date(proposal.startBlock * 12 * 1000), // Rough estimate
      endDate: new Date(proposal.endBlock * 12 * 1000),
      forVotes: parseInt(proposal.forVotes || '0'),
      againstVotes: parseInt(proposal.againstVotes || '0'),
      abstainVotes: 0,
      quorum: parseFloat(proposal.quorum || '0'),
      turnout: 0,
      tokenHolders: 0,
      votingPower: 0,
      creator: proposal.creator,
      timestamp: new Date(),
      source: 'protocol-api'
    }));
  }

  private parseCompoundGovernance(protocol: ProtocolInfo, data: any): GovernanceMetrics[] {
    const proposals = data.proposals || [];

    return proposals.map((proposal: any) => ({
      protocol,
      proposalId: proposal.id,
      title: proposal.title,
      description: proposal.description,
      status: this.mapProposalStatus(proposal.status),
      startDate: new Date(proposal.startTime),
      endDate: new Date(proposal.endTime),
      forVotes: parseInt(proposal.forVotes || '0'),
      againstVotes: parseInt(proposal.againstVotes || '0'),
      abstainVotes: 0,
      quorum: parseFloat(proposal.quorum || '0'),
      turnout: 0,
      tokenHolders: 0,
      votingPower: 0,
      creator: proposal.proposer,
      timestamp: new Date(),
      source: 'protocol-api'
    }));
  }

  private mapProposalStatus(status: string): 'active' | 'passed' | 'failed' | 'executed' | 'cancelled' {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'pending':
        return 'active';
      case 'succeeded':
        return 'passed';
      case 'defeated':
      case 'rejected':
        return 'failed';
      case 'executed':
      case 'queued':
        return 'executed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'active';
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
      // Test endpoint depends on protocol
      let testEndpoint = '/health';

      switch (this.config.protocolId) {
        case 'uniswap-v3':
          testEndpoint = '/pools?limit=1';
          break;
        case 'aave-v3':
          testEndpoint = '/data/pools?limit=1';
          break;
        case 'compound-v3':
          testEndpoint = '/api/v2/cToken?limit=1';
          break;
      }

      const response = await this.httpClient.get(testEndpoint);

      if (!response.data) {
        throw new Error(`Invalid response from ${this.config.protocolId} API`);
      }

      this.logger.debug(`${this.config.protocolId} API connection test successful`);
    } catch (error: any) {
      throw new Error(`${this.config.protocolId} API connection test failed: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
