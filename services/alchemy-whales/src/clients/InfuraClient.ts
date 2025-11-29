/**
 * Infura API Client - Free Tier Provider
 * 
 * Provides EVM chain access via Infura's free tier:
 * - 100k requests/day (Core)
 * - 100k CU/day (free plan)
 * - Supports Ethereum, Polygon, Arbitrum, Optimism
 * 
 * Used as failover in WhaleFusion Engine.
 */

import axios, { AxiosInstance } from 'axios';
import { Chain, AlchemyTransfer, TransferCategory } from '../types';
import { RateLimiterManager } from '../utils/rateLimiter';
import { CircuitBreaker } from '../utils/retry';
import { createLogger } from '../utils/logger';

// Infura network identifiers
const CHAIN_TO_INFURA: Record<Chain, string> = {
  [Chain.ETHEREUM]: 'mainnet',
  [Chain.POLYGON]: 'polygon-mainnet',
  [Chain.ARBITRUM]: 'arbitrum-mainnet',
  [Chain.OPTIMISM]: 'optimism-mainnet',
  [Chain.BASE]: 'base-mainnet',
};

export interface InfuraConfig {
  projectId: string;
  projectSecret?: string;
  chains: Chain[];
}

export interface InfuraProviderStats {
  name: 'infura';
  cuRemaining: number;
  cuMax: number;
  reliability: number;
  requestsToday: number;
  errorsToday: number;
  lastError: Date | null;
  isHealthy: boolean;
}

/**
 * Infura client for transfer tracking
 * Note: Infura doesn't have native transfer APIs like Alchemy,
 * so we use eth_getLogs with transfer event signatures
 */
export class InfuraClient {
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiterManager;
  private circuitBreaker: CircuitBreaker;
  private logger: any;
  private config: InfuraConfig;
  
  // CU tracking (resets daily)
  private cuUsed: number = 0;
  private cuMax: number = 100000; // 100k CU daily limit
  private cuResetTime: Date;
  
  // Reliability tracking
  private reliability: number = 0.9; // Start at 90%
  private requestsToday: number = 0;
  private errorsToday: number = 0;
  private lastError: Date | null = null;

  // ERC-20 Transfer event signature
  private readonly TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  constructor(config: InfuraConfig, rateLimiter: RateLimiterManager) {
    this.config = config;
    this.rateLimiter = rateLimiter;
    this.circuitBreaker = new CircuitBreaker(5, 2, 60000);
    this.logger = createLogger({ component: 'InfuraClient' });
    this.cuResetTime = this.getNextResetTime();

    // Create HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.info('Infura client initialized', {
      chains: config.chains,
      cuMax: this.cuMax,
    });
  }

  /**
   * Get endpoint URL for chain
   */
  private getEndpoint(chain: Chain): string {
    const network = CHAIN_TO_INFURA[chain];
    if (!network) throw new Error(`Unsupported chain: ${chain}`);
    
    return `https://${network}.infura.io/v3/${this.config.projectId}`;
  }

  /**
   * Check if chain is supported
   */
  supportsChain(chain: Chain): boolean {
    return this.config.chains.includes(chain);
  }

  /**
   * Get transfers using eth_getLogs (limited compared to Alchemy)
   * Note: This is a simplified version - Infura lacks native transfer APIs
   */
  async getTransfers(
    chain: Chain,
    params: {
      fromBlock?: string | number;
      toBlock?: string | number;
      address?: string;
      contractAddresses?: string[];
    }
  ): Promise<{ transfers: any[]; cuCost: number }> {
    this.checkCUAvailability(20); // Estimate 20 CU per call
    
    const startTime = Date.now();
    
    try {
      const endpoint = this.getEndpoint(chain);
      
      // Build log filter
      const filter: any = {
        topics: [this.TRANSFER_TOPIC],
      };
      
      if (params.fromBlock) {
        filter.fromBlock = typeof params.fromBlock === 'number' 
          ? `0x${params.fromBlock.toString(16)}` 
          : params.fromBlock;
      }
      if (params.toBlock) {
        filter.toBlock = typeof params.toBlock === 'number'
          ? `0x${params.toBlock.toString(16)}`
          : params.toBlock;
      }
      if (params.contractAddresses?.length) {
        filter.address = params.contractAddresses;
      }

      const response = await this.circuitBreaker.execute(async () => {
        return await this.rateLimiter.schedule(chain, async () => {
          return await this.httpClient.post(endpoint, {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'eth_getLogs',
            params: [filter],
          });
        });
      });

      const cuCost = 20;
      this.recordSuccess(cuCost);

      // Parse logs to transfers
      const logs = response.data.result || [];
      const transfers = this.parseLogsToTransfers(logs, chain);

      this.logger.debug('Infura transfers fetched', {
        chain,
        count: transfers.length,
        latency: Date.now() - startTime,
      });

      return { transfers, cuCost };

    } catch (error: any) {
      this.recordError(error);
      throw error;
    }
  }

  /**
   * Parse eth_getLogs to transfer format
   */
  private parseLogsToTransfers(logs: any[], chain: Chain): any[] {
    return logs.map((log: any) => ({
      blockNum: log.blockNumber,
      hash: log.transactionHash,
      from: '0x' + log.topics[1]?.slice(26),
      to: '0x' + log.topics[2]?.slice(26),
      value: parseInt(log.data, 16),
      category: TransferCategory.ERC20,
      rawContract: {
        address: log.address,
        value: log.data,
        decimal: null,
      },
      metadata: {
        blockTimestamp: new Date().toISOString(),
      },
      _source: 'infura',
      _chain: chain,
    }));
  }

  /**
   * Get block number
   */
  async getBlockNumber(chain: Chain): Promise<number> {
    this.checkCUAvailability(5);
    
    try {
      const endpoint = this.getEndpoint(chain);
      const response = await this.httpClient.post(endpoint, {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_blockNumber',
        params: [],
      });

      this.recordSuccess(5);
      return parseInt(response.data.result, 16);
    } catch (error: any) {
      this.recordError(error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (this.config.chains.length === 0) return false;
      await this.getBlockNumber(this.config.chains[0]);
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
      throw new Error('Infura CU limit exceeded');
    }
  }

  /**
   * Maybe reset CU counter (daily reset)
   */
  private maybeResetCU(): void {
    if (new Date() > this.cuResetTime) {
      this.cuUsed = 0;
      this.requestsToday = 0;
      this.errorsToday = 0;
      this.cuResetTime = this.getNextResetTime();
      this.logger.info('Infura CU counter reset');
    }
  }

  /**
   * Get next reset time (midnight UTC)
   */
  private getNextResetTime(): Date {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(24, 0, 0, 0);
    return reset;
  }

  /**
   * Record successful request
   */
  private recordSuccess(cuCost: number): void {
    this.cuUsed += cuCost;
    this.requestsToday++;
    // Improve reliability on success
    this.reliability = Math.min(0.99, this.reliability + 0.001);
  }

  /**
   * Record error
   */
  private recordError(error: any): void {
    this.errorsToday++;
    this.lastError = new Date();
    // Decrease reliability on error
    this.reliability = Math.max(0.1, this.reliability - 0.05);
    
    this.logger.error('Infura error', {
      error: error.message,
      reliability: this.reliability,
    });
  }

  /**
   * Get provider stats for fusion engine
   */
  getProviderStats(): InfuraProviderStats {
    this.maybeResetCU();
    
    return {
      name: 'infura',
      cuRemaining: this.cuMax - this.cuUsed,
      cuMax: this.cuMax,
      reliability: this.reliability,
      requestsToday: this.requestsToday,
      errorsToday: this.errorsToday,
      lastError: this.lastError,
      isHealthy: this.reliability > 0.5 && (this.cuMax - this.cuUsed) > 1000,
    };
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

export default InfuraClient;

