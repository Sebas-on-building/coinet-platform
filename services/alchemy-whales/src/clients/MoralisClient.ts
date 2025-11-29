/**
 * Moralis API Client - Free Tier Provider
 * 
 * Provides EVM chain access via Moralis free tier:
 * - 40k CU/month (Starter free plan)
 * - Native transfer APIs (better than Infura)
 * - Supports Ethereum, Polygon, BSC, Arbitrum, Optimism, Avalanche
 * 
 * Used as failover in WhaleFusion Engine.
 */

import axios, { AxiosInstance } from 'axios';
import { Chain, TransferCategory } from '../types';
import { RateLimiterManager } from '../utils/rateLimiter';
import { CircuitBreaker } from '../utils/retry';
import { createLogger } from '../utils/logger';

// Moralis chain identifiers
const CHAIN_TO_MORALIS: Record<Chain, string> = {
  [Chain.ETHEREUM]: '0x1',
  [Chain.POLYGON]: '0x89',
  [Chain.ARBITRUM]: '0xa4b1',
  [Chain.OPTIMISM]: '0xa',
  [Chain.BASE]: '0x2105',
};

export interface MoralisConfig {
  apiKey: string;
  chains: Chain[];
}

export interface MoralisProviderStats {
  name: 'moralis';
  cuRemaining: number;
  cuMax: number;
  reliability: number;
  requestsThisMonth: number;
  errorsThisMonth: number;
  lastError: Date | null;
  isHealthy: boolean;
}

export interface MoralisTransfer {
  transaction_hash: string;
  address: string;
  block_timestamp: string;
  block_number: string;
  block_hash: string;
  from_address: string;
  to_address: string;
  value: string;
  value_decimal: string;
  token_id?: string;
  token_address?: string;
  token_symbol?: string;
  token_name?: string;
  token_decimals?: number;
}

/**
 * Moralis client for transfer tracking
 * Has native transfer APIs, better than Infura for this use case
 */
export class MoralisClient {
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiterManager;
  private circuitBreaker: CircuitBreaker;
  private logger: any;
  private config: MoralisConfig;
  
  // CU tracking (resets monthly)
  private cuUsed: number = 0;
  private cuMax: number = 40000; // 40k CU monthly limit (free tier)
  private cuResetTime: Date;
  
  // Reliability tracking
  private reliability: number = 0.88; // Start at 88%
  private requestsThisMonth: number = 0;
  private errorsThisMonth: number = 0;
  private lastError: Date | null = null;

  private readonly BASE_URL = 'https://deep-index.moralis.io/api/v2.2';

  constructor(config: MoralisConfig, rateLimiter: RateLimiterManager) {
    this.config = config;
    this.rateLimiter = rateLimiter;
    this.circuitBreaker = new CircuitBreaker(5, 2, 60000);
    this.logger = createLogger({ component: 'MoralisClient' });
    this.cuResetTime = this.getNextResetTime();

    // Create HTTP client
    this.httpClient = axios.create({
      baseURL: this.BASE_URL,
      timeout: 30000,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
    });

    this.logger.info('Moralis client initialized', {
      chains: config.chains,
      cuMax: this.cuMax,
    });
  }

  /**
   * Check if chain is supported
   */
  supportsChain(chain: Chain): boolean {
    return this.config.chains.includes(chain) && !!CHAIN_TO_MORALIS[chain];
  }

  /**
   * Get wallet transfers using Moralis native API
   */
  async getTransfers(
    chain: Chain,
    params: {
      address?: string;
      fromBlock?: number;
      toBlock?: number;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{ transfers: any[]; cuCost: number; cursor?: string }> {
    this.checkCUAvailability(25); // Moralis charges ~25 CU per transfer call
    
    const startTime = Date.now();
    const chainId = CHAIN_TO_MORALIS[chain];
    
    if (!chainId) {
      throw new Error(`Unsupported chain for Moralis: ${chain}`);
    }

    try {
      // Use wallet transfers endpoint if address provided
      const endpoint = params.address
        ? `/${params.address}/erc20/transfers`
        : '/erc20/transfers';

      const queryParams: any = {
        chain: chainId,
        limit: params.limit || 100,
      };

      if (params.fromBlock) queryParams.from_block = params.fromBlock;
      if (params.toBlock) queryParams.to_block = params.toBlock;
      if (params.cursor) queryParams.cursor = params.cursor;

      const response = await this.circuitBreaker.execute(async () => {
        return await this.rateLimiter.schedule(chain, async () => {
          return await this.httpClient.get(endpoint, { params: queryParams });
        });
      });

      const cuCost = 25;
      this.recordSuccess(cuCost);

      const data = response.data;
      const transfers = this.normalizeTransfers(data.result || [], chain);

      this.logger.debug('Moralis transfers fetched', {
        chain,
        count: transfers.length,
        latency: Date.now() - startTime,
        hasMore: !!data.cursor,
      });

      return { 
        transfers, 
        cuCost,
        cursor: data.cursor,
      };

    } catch (error: any) {
      this.recordError(error);
      throw error;
    }
  }

  /**
   * Get NFT transfers
   */
  async getNFTTransfers(
    chain: Chain,
    params: {
      address?: string;
      fromBlock?: number;
      toBlock?: number;
      limit?: number;
      cursor?: string;
    }
  ): Promise<{ transfers: any[]; cuCost: number; cursor?: string }> {
    this.checkCUAvailability(30); // NFT calls cost more CU
    
    const chainId = CHAIN_TO_MORALIS[chain];
    if (!chainId) throw new Error(`Unsupported chain: ${chain}`);

    try {
      const endpoint = params.address
        ? `/${params.address}/nft/transfers`
        : '/nft/transfers';

      const queryParams: any = {
        chain: chainId,
        limit: params.limit || 100,
      };

      if (params.fromBlock) queryParams.from_block = params.fromBlock;
      if (params.toBlock) queryParams.to_block = params.toBlock;
      if (params.cursor) queryParams.cursor = params.cursor;

      const response = await this.circuitBreaker.execute(async () => {
        return await this.httpClient.get(endpoint, { params: queryParams });
      });

      const cuCost = 30;
      this.recordSuccess(cuCost);

      const data = response.data;
      const transfers = this.normalizeNFTTransfers(data.result || [], chain);

      return { transfers, cuCost, cursor: data.cursor };

    } catch (error: any) {
      this.recordError(error);
      throw error;
    }
  }

  /**
   * Get wallet token balances
   */
  async getTokenBalances(
    chain: Chain,
    address: string
  ): Promise<{ balances: any[]; cuCost: number }> {
    this.checkCUAvailability(20);
    
    const chainId = CHAIN_TO_MORALIS[chain];
    if (!chainId) throw new Error(`Unsupported chain: ${chain}`);

    try {
      const response = await this.circuitBreaker.execute(async () => {
        return await this.httpClient.get(`/${address}/erc20`, {
          params: { chain: chainId },
        });
      });

      const cuCost = 20;
      this.recordSuccess(cuCost);

      return { balances: response.data || [], cuCost };

    } catch (error: any) {
      this.recordError(error);
      throw error;
    }
  }

  /**
   * Normalize Moralis transfers to standard format
   */
  private normalizeTransfers(transfers: MoralisTransfer[], chain: Chain): any[] {
    return transfers.map(t => ({
      blockNum: t.block_number,
      hash: t.transaction_hash,
      from: t.from_address,
      to: t.to_address,
      value: parseFloat(t.value_decimal || '0'),
      category: TransferCategory.ERC20,
      asset: t.token_symbol,
      rawContract: {
        address: t.token_address,
        value: t.value,
        decimal: t.token_decimals?.toString() || null,
      },
      metadata: {
        blockTimestamp: t.block_timestamp,
        tokenName: t.token_name,
      },
      _source: 'moralis',
      _chain: chain,
    }));
  }

  /**
   * Normalize NFT transfers
   */
  private normalizeNFTTransfers(transfers: any[], chain: Chain): any[] {
    return transfers.map(t => ({
      blockNum: t.block_number,
      hash: t.transaction_hash,
      from: t.from_address,
      to: t.to_address,
      value: 1, // NFTs are typically 1 unit
      erc721TokenId: t.token_id,
      category: t.contract_type === 'ERC1155' 
        ? TransferCategory.ERC1155 
        : TransferCategory.ERC721,
      asset: t.token_address,
      rawContract: {
        address: t.token_address,
        value: t.amount || '1',
        decimal: null,
      },
      metadata: {
        blockTimestamp: t.block_timestamp,
        tokenName: t.name,
      },
      _source: 'moralis',
      _chain: chain,
    }));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.config.chains.length === 0) return false;
      
      const chain = this.config.chains[0];
      const chainId = CHAIN_TO_MORALIS[chain];
      
      await this.httpClient.get('/info/endpointWeights');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check CU availability
   */
  private checkCUAvailability(required: number): void {
    this.maybeResetCU();
    
    if (this.cuUsed + required > this.cuMax) {
      throw new Error('Moralis CU limit exceeded');
    }
  }

  /**
   * Maybe reset CU counter (monthly reset)
   */
  private maybeResetCU(): void {
    if (new Date() > this.cuResetTime) {
      this.cuUsed = 0;
      this.requestsThisMonth = 0;
      this.errorsThisMonth = 0;
      this.cuResetTime = this.getNextResetTime();
      this.logger.info('Moralis CU counter reset');
    }
  }

  /**
   * Get next reset time (1st of next month)
   */
  private getNextResetTime(): Date {
    const now = new Date();
    const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return reset;
  }

  /**
   * Record successful request
   */
  private recordSuccess(cuCost: number): void {
    this.cuUsed += cuCost;
    this.requestsThisMonth++;
    this.reliability = Math.min(0.99, this.reliability + 0.001);
  }

  /**
   * Record error
   */
  private recordError(error: any): void {
    this.errorsThisMonth++;
    this.lastError = new Date();
    this.reliability = Math.max(0.1, this.reliability - 0.05);
    
    this.logger.error('Moralis error', {
      error: error.message,
      reliability: this.reliability,
    });
  }

  /**
   * Get provider stats for fusion engine
   */
  getProviderStats(): MoralisProviderStats {
    this.maybeResetCU();
    
    return {
      name: 'moralis',
      cuRemaining: this.cuMax - this.cuUsed,
      cuMax: this.cuMax,
      reliability: this.reliability,
      requestsThisMonth: this.requestsThisMonth,
      errorsThisMonth: this.errorsThisMonth,
      lastError: this.lastError,
      isHealthy: this.reliability > 0.5 && (this.cuMax - this.cuUsed) > 500,
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

export default MoralisClient;

