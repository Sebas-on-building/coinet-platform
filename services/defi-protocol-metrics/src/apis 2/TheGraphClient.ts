/**
 * =========================================
 * THE GRAPH CLIENT
 * =========================================
 * Specialized client for The Graph Protocol subgraph integrations
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from '../utils/Logger';
import type { ProtocolInfo, TVLMetrics, YieldMetrics, GovernanceMetrics } from '../types';

export interface GraphQLQuery {
  query: string;
  variables?: Record<string, any>;
}

export interface SubgraphResponse<T = any> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface SubgraphConfig {
  subgraphUrl: string;
  apiKey?: string;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export class TheGraphClient {
  private logger: Logger;
  private config: SubgraphConfig;
  private httpClient: AxiosInstance;
  private isInitialized: boolean = false;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private rateLimitWindow: number = 60000; // 1 minute

  constructor(config: SubgraphConfig) {
    this.logger = new Logger('TheGraphClient');
    this.config = {
      rateLimit: {
        requestsPerMinute: 100, // The Graph allows 100 requests/minute for free
        requestsPerHour: 1000
      },
      ...config
    };

    this.httpClient = axios.create({
      baseURL: this.config.subgraphUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'CoinetDeFiMetrics/1.0',
        'Content-Type': 'application/json',
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
          this.logger.rateLimit('thegraph', 'rate_limit_exceeded', new Date(Date.now() + 60000));
        } else if (error.response?.status === 401) {
          this.logger.error('The Graph authentication failed - check API key');
        }
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing The Graph Client...');

      // Test the connection with a simple query
      await this.testConnection();

      this.isInitialized = true;
      this.logger.info('✅ The Graph Client initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize The Graph Client', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ The Graph Client stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop The Graph Client', error);
      throw error;
    }
  }

  /**
   * Execute a GraphQL query against the subgraph
   */
  async query<T = any>(graphqlQuery: GraphQLQuery): Promise<SubgraphResponse<T>> {
    try {
      if (!this.isInitialized) {
        throw new Error('The Graph Client is not initialized');
      }

      this.logger.debug(`Executing GraphQL query: ${graphqlQuery.query.substring(0, 100)}...`);

      const response: AxiosResponse<SubgraphResponse<T>> = await this.httpClient.post('/', {
        query: graphqlQuery.query,
        variables: graphqlQuery.variables || {}
      });

      if (response.data.errors && response.data.errors.length > 0) {
        const errorMessages = response.data.errors.map(e => e.message).join(', ');
        throw new Error(`GraphQL query failed: ${errorMessages}`);
      }

      return response.data;

    } catch (error: any) {
      this.logger.error('Failed to execute GraphQL query', error);
      throw error;
    }
  }

  /**
   * Get TVL data for a protocol from subgraph
   */
  async getTVLData(protocol: ProtocolInfo): Promise<TVLMetrics> {
    try {
      const query = this.buildTVLQuery(protocol);
      const response = await this.query(query);

      return this.parseTVLData(protocol, response);

    } catch (error: any) {
      this.logger.error(`Failed to get TVL data for ${protocol.name}`, error);
      throw error;
    }
  }

  /**
   * Get yield/APR data for a protocol from subgraph
   */
  async getYieldData(protocol: ProtocolInfo, poolId?: string): Promise<YieldMetrics[]> {
    try {
      const query = this.buildYieldQuery(protocol, poolId);
      const response = await this.query(query);

      return this.parseYieldData(protocol, response);

    } catch (error: any) {
      this.logger.error(`Failed to get yield data for ${protocol.name}`, error);
      throw error;
    }
  }

  /**
   * Get governance proposals for a protocol from subgraph
   */
  async getGovernanceData(protocol: ProtocolInfo, limit: number = 50): Promise<GovernanceMetrics[]> {
    try {
      const query = this.buildGovernanceQuery(protocol, limit);
      const response = await this.query(query);

      return this.parseGovernanceData(protocol, response);

    } catch (error: any) {
      this.logger.error(`Failed to get governance data for ${protocol.name}`, error);
      throw error;
    }
  }

  /**
   * Get historical TVL data for backfill
   */
  async getHistoricalTVL(protocol: ProtocolInfo, fromDate: Date, toDate: Date): Promise<TVLMetrics[]> {
    try {
      const query = this.buildHistoricalTVLQuery(protocol, fromDate, toDate);
      const response = await this.query(query);

      return this.parseHistoricalTVLData(protocol, response);

    } catch (error: any) {
      this.logger.error(`Failed to get historical TVL data for ${protocol.name}`, error);
      throw error;
    }
  }

  private buildTVLQuery(protocol: ProtocolInfo): GraphQLQuery {
    // Protocol-specific query building based on network and type
    const baseQuery = `
      query GetTVL($protocolId: ID!) {
        protocol(id: $protocolId) {
          id
          name
          totalValueLockedUSD
          totalSupply
          tokenCount
          poolCount
          txCount
        }
        pools(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) {
          id
          token0 {
            symbol
            name
          }
          token1 {
            symbol
            name
          }
          totalValueLockedUSD
          volumeUSD
          feesUSD
        }
      }
    `;

    return {
      query: baseQuery,
      variables: {
        protocolId: protocol.contractAddress.toLowerCase()
      }
    };
  }

  private buildYieldQuery(protocol: ProtocolInfo, poolId?: string): GraphQLQuery {
    const baseQuery = `
      query GetYields($protocolId: ID!, $poolId: ID) {
        pools(
          where: { protocol_: { id: $protocolId } ${poolId ? ', id: $poolId' : ''} }
          first: 50
          orderBy: volumeUSD
          orderDirection: desc
        ) {
          id
          name
          symbol
          rewardTokens {
            symbol
            decimals
          }
          rewardTokenEmissionsAmount
          rewardTokenEmissionsUSD
          baseYield
          rewardYield
          totalValueLockedUSD
          volumeUSD
          feesUSD
        }
      }
    `;

    return {
      query: baseQuery,
      variables: {
        protocolId: protocol.contractAddress.toLowerCase(),
        ...(poolId && { poolId })
      }
    };
  }

  private buildGovernanceQuery(protocol: ProtocolInfo, limit: number): GraphQLQuery {
    const baseQuery = `
      query GetProposals($protocolId: ID!, $limit: Int!) {
        proposals(
          where: { space: $protocolId }
          first: $limit
          orderBy: created
          orderDirection: desc
        ) {
          id
          title
          body
          choices
          start
          end
          snapshot
          state
          author
          scores
          scores_total
          quorum
        }
      }
    `;

    return {
      query: baseQuery,
      variables: {
        protocolId: protocol.contractAddress.toLowerCase(),
        limit
      }
    };
  }

  private buildHistoricalTVLQuery(protocol: ProtocolInfo, fromDate: Date, toDate: Date): GraphQLQuery {
    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    const toTimestamp = Math.floor(toDate.getTime() / 1000);

    const baseQuery = `
      query GetHistoricalTVL($protocolId: ID!, $fromTimestamp: BigInt!, $toTimestamp: BigInt!) {
        protocolDayDatas(
          where: {
            protocol_: { id: $protocolId }
            date_gte: $fromTimestamp
            date_lte: $toTimestamp
          }
          orderBy: date
          orderDirection: asc
        ) {
          id
          date
          totalValueLockedUSD
          volumeUSD
          feesUSD
          txCount
        }
      }
    `;

    return {
      query: baseQuery,
      variables: {
        protocolId: protocol.contractAddress.toLowerCase(),
        fromTimestamp,
        toTimestamp
      }
    };
  }

  private parseTVLData(protocol: ProtocolInfo, response: SubgraphResponse): TVLMetrics {
    const data = response.data;
    const protocolData = data.protocol;
    const pools = data.pools || [];

    // Calculate token distribution
    const totalTVL = parseFloat(protocolData?.totalValueLockedUSD || '0');
    const tokenDistribution: Record<string, number> = {};

    pools.forEach((pool: any) => {
      const poolTVL = parseFloat(pool.totalValueLockedUSD || '0');
      if (poolTVL > 0) {
        const token0Symbol = pool.token0?.symbol || 'UNKNOWN';
        const token1Symbol = pool.token1?.symbol || 'UNKNOWN';

        tokenDistribution[token0Symbol] = (tokenDistribution[token0Symbol] || 0) + (poolTVL / totalTVL * 100);
        tokenDistribution[token1Symbol] = (tokenDistribution[token1Symbol] || 0) + (poolTVL / totalTVL * 100);
      }
    });

    // Find dominant token
    const dominantToken = Object.entries(tokenDistribution).reduce((a, b) =>
      tokenDistribution[a[0]] > tokenDistribution[b[0]] ? a : b
    )?.[0] || 'UNKNOWN';

    return {
      protocol,
      totalValueLocked: totalTVL,
      totalValueLockedChange24h: 0, // Would need historical data for this
      totalValueLockedChange7d: 0,  // Would need historical data for this
      tvlRank: 0, // Would need global ranking data
      dominantToken,
      tokenDistribution,
      timestamp: new Date(),
      source: 'protocol-api'
    };
  }

  private parseYieldData(protocol: ProtocolInfo, response: SubgraphResponse): YieldMetrics[] {
    const pools = response.data.pools || [];

    return pools.map((pool: any) => ({
      protocol,
      poolId: pool.id,
      poolName: pool.name || `${pool.symbol} Pool`,
      apy: parseFloat(pool.baseYield || '0') + parseFloat(pool.rewardYield || '0'),
      apyChange24h: 0, // Would need historical data
      baseApy: parseFloat(pool.baseYield || '0'),
      rewardApy: parseFloat(pool.rewardYield || '0'),
      volume24h: parseFloat(pool.volumeUSD || '0'),
      fees24h: parseFloat(pool.feesUSD || '0'),
      timestamp: new Date(),
      source: 'protocol-api'
    }));
  }

  private parseGovernanceData(protocol: ProtocolInfo, response: SubgraphResponse): GovernanceMetrics[] {
    const proposals = response.data.proposals || [];

    return proposals.map((proposal: any) => ({
      protocol,
      proposalId: proposal.id,
      title: proposal.title,
      description: proposal.body,
      status: this.mapProposalState(proposal.state),
      startDate: new Date(parseInt(proposal.start) * 1000),
      endDate: new Date(parseInt(proposal.end) * 1000),
      forVotes: parseFloat(proposal.scores?.[0] || '0'),
      againstVotes: parseFloat(proposal.scores?.[1] || '0'),
      abstainVotes: 0, // Not always available
      quorum: parseFloat(proposal.quorum || '0'),
      turnout: parseFloat(proposal.scores_total || '0') > 0 ?
        (parseFloat(proposal.scores_total || '0') / parseFloat(proposal.scores_total || '1')) * 100 : 0,
      tokenHolders: 0, // Would need separate query
      votingPower: parseFloat(proposal.scores_total || '0'),
      creator: proposal.author,
      timestamp: new Date(),
      source: 'protocol-api'
    }));
  }

  private parseHistoricalTVLData(protocol: ProtocolInfo, response: SubgraphResponse): TVLMetrics[] {
    const historicalData = response.data.protocolDayDatas || [];

    return historicalData.map((dayData: any) => ({
      protocol,
      totalValueLocked: parseFloat(dayData.totalValueLockedUSD || '0'),
      totalValueLockedChange24h: 0, // Would need consecutive data points
      totalValueLockedChange7d: 0,  // Would need 7-day comparison
      tvlRank: 0,
      dominantToken: 'UNKNOWN', // Would need pool data for each day
      tokenDistribution: {},
      timestamp: new Date(parseInt(dayData.date) * 1000),
      source: 'protocol-api'
    }));
  }

  private mapProposalState(state: string): 'active' | 'passed' | 'failed' | 'executed' | 'cancelled' {
    switch (state?.toLowerCase()) {
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
      // Simple query to test connection
      const testQuery = {
        query: `
          query {
            _meta {
              block {
                number
              }
            }
          }
        `
      };

      const response = await this.query(testQuery);

      if (!response.data?._meta?.block?.number) {
        throw new Error('Invalid response from The Graph');
      }

      this.logger.debug('The Graph connection test successful');
    } catch (error: any) {
      throw new Error(`The Graph connection test failed: ${error.message}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
