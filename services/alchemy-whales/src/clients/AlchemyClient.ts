/**
 * Alchemy Transfers API Client - 100x faster than alternatives
 * Supports multi-chain transfer tracking with rate limiting
 */

import { Alchemy, Network, AssetTransfersCategory, AssetTransfersResponse } from 'alchemy-sdk';
import {
  Chain,
  AlchemyTransfer,
  TransferCategory,
  AlchemyError,
  RateLimitError,
} from '../types';
import { RateLimiterManager } from '../utils/rateLimiter';
import { createLogger } from '../utils/logger';
import { withRetry, CircuitBreaker, isRetryableError } from '../utils/retry';
import { parseBlockNumber } from '../utils/validation';

/**
 * Map Coinet chain to Alchemy network
 */
const CHAIN_TO_NETWORK: Record<Chain, Network> = {
  [Chain.ETHEREUM]: Network.ETH_MAINNET,
  [Chain.POLYGON]: Network.MATIC_MAINNET,
  [Chain.ARBITRUM]: Network.ARB_MAINNET,
  [Chain.OPTIMISM]: Network.OPT_MAINNET,
  [Chain.BASE]: Network.BASE_MAINNET,
};

/**
 * Map Coinet transfer category to Alchemy category
 */
const CATEGORY_TO_ALCHEMY: Record<TransferCategory, AssetTransfersCategory> = {
  [TransferCategory.EXTERNAL]: AssetTransfersCategory.EXTERNAL,
  [TransferCategory.INTERNAL]: AssetTransfersCategory.INTERNAL,
  [TransferCategory.ERC20]: AssetTransfersCategory.ERC20,
  [TransferCategory.ERC721]: AssetTransfersCategory.ERC721,
  [TransferCategory.ERC1155]: AssetTransfersCategory.ERC1155,
  [TransferCategory.SPECIALNFT]: AssetTransfersCategory.SPECIALNFT,
};

/**
 * Alchemy client for a specific chain
 */
export class ChainAlchemyClient {
  private alchemy: Alchemy;
  private chain: Chain;
  private rateLimiter: RateLimiterManager;
  private circuitBreaker: CircuitBreaker;
  private logger: any;
  private metrics: {
    requests: number;
    errors: number;
    transfersFetched: number;
    averageLatency: number;
  };

  constructor(chain: Chain, apiKey: string, rateLimiter: RateLimiterManager) {
    this.chain = chain;
    this.rateLimiter = rateLimiter;
    this.circuitBreaker = new CircuitBreaker(5, 2, 60000);
    this.logger = createLogger({ chain, component: 'AlchemyClient' });
    this.metrics = {
      requests: 0,
      errors: 0,
      transfersFetched: 0,
      averageLatency: 0,
    };

    // Initialize Alchemy SDK
    this.alchemy = new Alchemy({
      apiKey,
      network: CHAIN_TO_NETWORK[chain],
    });

    this.logger.info('Alchemy client initialized', {
      network: CHAIN_TO_NETWORK[chain],
    });
  }

  /**
   * Get asset transfers with rate limiting and retry logic
   */
  async getAssetTransfers(params: {
    fromBlock?: string | number;
    toBlock?: string | number;
    fromAddress?: string;
    toAddress?: string;
    category?: TransferCategory[];
    contractAddresses?: string[];
    maxCount?: number;
    pageKey?: string;
    withMetadata?: boolean;
  }): Promise<AssetTransfersResponse> {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      // Convert categories
      const categories = params.category?.map(cat => CATEGORY_TO_ALCHEMY[cat]) || [
        AssetTransfersCategory.EXTERNAL,
        AssetTransfersCategory.INTERNAL,
        AssetTransfersCategory.ERC20,
        AssetTransfersCategory.ERC721,
        AssetTransfersCategory.ERC1155,
      ];

      // Prepare request params
      const requestParams: any = {
        category: categories,
        maxCount: params.maxCount || 1000,
        withMetadata: params.withMetadata !== false,
      };

      if (params.fromBlock) {
        requestParams.fromBlock = this.formatBlockNumber(params.fromBlock);
      }
      if (params.toBlock) {
        requestParams.toBlock = this.formatBlockNumber(params.toBlock);
      }
      if (params.fromAddress) {
        requestParams.fromAddress = params.fromAddress;
      }
      if (params.toAddress) {
        requestParams.toAddress = params.toAddress;
      }
      if (params.contractAddresses && params.contractAddresses.length > 0) {
        requestParams.contractAddresses = params.contractAddresses;
      }
      if (params.pageKey) {
        requestParams.pageKey = params.pageKey;
      }

      this.logger.debug('Fetching asset transfers', requestParams);

      // Execute with rate limiting, retry, and circuit breaker
      const result = await this.rateLimiter.schedule(
        this.chain,
        async () => {
          return await this.circuitBreaker.execute(async () => {
            return await withRetry(
              async () => {
                return await this.alchemy.core.getAssetTransfers(requestParams);
              },
              {
                maxAttempts: 3,
                initialDelayMs: 1000,
                maxDelayMs: 30000,
                backoffMultiplier: 2,
                shouldRetry: isRetryableError,
              }
            );
          });
        }
      );

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(result.transfers.length, latency);

      this.logger.info('Asset transfers fetched successfully', {
        count: result.transfers.length,
        latency: `${latency}ms`,
        hasPageKey: !!result.pageKey,
      });

      return result;
    } catch (error: any) {
      this.metrics.errors++;
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Get paginated transfers with automatic pagination
   */
  async getAllTransfers(params: {
    fromBlock?: string | number;
    toBlock?: string | number;
    fromAddress?: string;
    toAddress?: string;
    category?: TransferCategory[];
    contractAddresses?: string[];
    maxPages?: number;
  }): Promise<AlchemyTransfer[]> {
    const allTransfers: any[] = [];
    let pageKey: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = params.maxPages || 10;

    this.logger.info('Starting paginated transfer fetch', {
      maxPages,
      ...params,
    });

    while (pageCount < maxPages) {
      const result = await this.getAssetTransfers({
        ...params,
        pageKey,
      });

      allTransfers.push(...result.transfers);
      pageCount++;

      this.logger.debug('Fetched page', {
        page: pageCount,
        transfersInPage: result.transfers.length,
        totalTransfers: allTransfers.length,
      });

      if (!result.pageKey) {
        this.logger.info('No more pages available');
        break;
      }

      pageKey = result.pageKey;
    }

    this.logger.info('Paginated fetch completed', {
      totalPages: pageCount,
      totalTransfers: allTransfers.length,
    });

    return allTransfers as any[];
  }

  /**
   * Get transfers for multiple addresses in batch
   */
  async getBatchTransfers(
    addresses: string[],
    params: {
      fromBlock?: string | number;
      toBlock?: string | number;
      category?: TransferCategory[];
      maxCount?: number;
    }
  ): Promise<Map<string, AlchemyTransfer[]>> {
    const results = new Map<string, AlchemyTransfer[]>();

    this.logger.info('Starting batch transfer fetch', {
      addressCount: addresses.length,
    });

    // Fetch transfers for each address
    const operations = addresses.map(address => async () => {
      const transfers = await this.getAssetTransfers({
        ...params,
        fromAddress: address,
      });
      return { address, transfers: transfers.transfers as any[] };
    });

    // Execute with rate limiting batching
    const batchResults = await this.rateLimiter.scheduleBatch(
      this.chain,
      operations,
      10 // Process 10 addresses concurrently
    );

    // Organize results
    batchResults.forEach(({ address, transfers }) => {
      results.set(address, transfers);
    });

    this.logger.info('Batch transfer fetch completed', {
      addressCount: addresses.length,
      totalTransfers: Array.from(results.values()).reduce((sum, t) => sum + t.length, 0),
    });

    return results;
  }

  /**
   * Get latest block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.rateLimiter.schedule(this.chain, async () => {
      return await this.alchemy.core.getBlockNumber();
    });
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string): Promise<any> {
    return await this.rateLimiter.schedule(this.chain, async () => {
      return await this.alchemy.core.getTransactionReceipt(hash);
    });
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(contractAddress: string): Promise<any> {
    return await this.rateLimiter.schedule(this.chain, async () => {
      return await this.alchemy.core.getTokenMetadata(contractAddress);
    });
  }

  /**
   * Format block number for Alchemy
   */
  private formatBlockNumber(block: string | number): string {
    if (typeof block === 'string' && block.startsWith('0x')) {
      return block;
    }
    const parsed = parseBlockNumber(block);
    if (parsed === 'latest') return 'latest';
    return `0x${parsed.toString(16)}`;
  }

  /**
   * Update metrics
   */
  private updateMetrics(transferCount: number, latency: number): void {
    this.metrics.transfersFetched += transferCount;
    
    // Calculate running average latency
    const totalRequests = this.metrics.requests;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (totalRequests - 1) + latency) / totalRequests;
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): void {
    const errorMsg = error.message || 'Unknown error';
    const statusCode = error.response?.status || error.statusCode;

    this.logger.error('Alchemy API error', {
      error: errorMsg,
      statusCode,
      circuitState: this.circuitBreaker.getState(),
    });

    // Check for rate limit
    if (statusCode === 429) {
      const retryAfter = error.response?.headers['retry-after'];
      throw new RateLimitError(
        `Rate limit exceeded for ${this.chain}`,
        retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined
      );
    }

    throw new AlchemyError(
      errorMsg,
      error.code || 'ALCHEMY_ERROR',
      statusCode,
      error
    );
  }

  /**
   * Get client metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      rateLimiter: this.rateLimiter.getMetrics(this.chain),
      circuitBreakerState: this.circuitBreaker.getState(),
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    this.logger.info('Circuit breaker reset');
  }
}

/**
 * Multi-chain Alchemy client manager
 */
export class AlchemyClientManager {
  private clients: Map<Chain, ChainAlchemyClient>;
  private logger: any;

  constructor(apiKeys: Record<Chain, string>, rateLimiter: RateLimiterManager) {
    this.logger = createLogger({ component: 'AlchemyClientManager' });
    this.clients = new Map();

    // Initialize client for each chain
    Object.entries(apiKeys).forEach(([chain, apiKey]) => {
      if (apiKey && apiKey !== `your_${chain}_api_key_here`) {
        const client = new ChainAlchemyClient(
          chain as Chain,
          apiKey,
          rateLimiter
        );
        this.clients.set(chain as Chain, client);
        this.logger.info(`Client initialized for ${chain}`);
      }
    });

    this.logger.info('Alchemy client manager initialized', {
      chains: Array.from(this.clients.keys()),
    });
  }

  /**
   * Get client for specific chain
   */
  getClient(chain: Chain): ChainAlchemyClient {
    const client = this.clients.get(chain);
    if (!client) {
      throw new Error(`No Alchemy client available for chain: ${chain}`);
    }
    return client;
  }

  /**
   * Get all active chains
   */
  getActiveChains(): Chain[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get metrics for all chains
   */
  getAllMetrics() {
    const metrics: Record<string, any> = {};
    this.clients.forEach((client, chain) => {
      metrics[chain] = client.getMetrics();
    });
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.clients.forEach((client, chain) => {
      client.resetCircuitBreaker();
      this.logger.info(`Circuit breaker reset for ${chain}`);
    });
  }
}

export default AlchemyClientManager;

