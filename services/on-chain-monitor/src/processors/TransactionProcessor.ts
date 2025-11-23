/**
 * =========================================
 * TRANSACTION PROCESSOR
 * =========================================
 * Processes and enriches on-chain transactions with metadata,
 * whale detection, and real-time analytics
 */

import { EventEmitter } from 'events';
import { TransactionData, WhaleCluster } from '../types';
import { Logger } from '../utils/Logger';
import { CacheManager } from '../caching/CacheManager';

export interface ProcessedTransaction {
  transaction: TransactionData;
  whaleInfo?: {
    isWhale: boolean;
    cluster?: WhaleCluster;
    score: number;
  };
  enrichments: {
    contractVerified: boolean;
    tokenMetadata?: any;
    dexInfo?: any;
    bridgeInfo?: any;
  };
  processingLatency: number;
  timestamp: Date;
}

export class TransactionProcessor extends EventEmitter {
  private logger: Logger;
  private cacheManager: CacheManager;
  private isRunning: boolean = false;
  private processedCount: number = 0;
  private enrichmentCache: Map<string, any> = new Map();

  constructor(cacheManager: CacheManager) {
    super();
    this.logger = new Logger('TransactionProcessor');
    this.cacheManager = cacheManager;
  }

  /**
   * Initialize the transaction processor
   */
  async initialize(): Promise<void> {
    await this.start();
    this.logger.info('✅ Transaction Processor initialized');
  }

  /**
   * Start the transaction processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.logger.info('🔄 Starting Transaction Processor...');
  }

  /**
   * Stop the transaction processor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.logger.info('🛑 Stopping Transaction Processor...');
  }

  /**
   * Get processor status
   */
  getStatus(): string {
    return this.isRunning ? 'Running' : 'Stopped';
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<any> {
    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      processedCount: this.processedCount,
      cacheSize: this.enrichmentCache.size,
      uptime: process.uptime()
    };
  }

  /**
   * Process a transaction with enrichment and whale detection
   */
  async process(transaction: TransactionData, whaleInfo?: any): Promise<ProcessedTransaction> {
    const startTime = Date.now();

    try {
      this.logger.debug(`🔄 Processing transaction ${transaction.hash}`);

      // 1. Check if transaction was already processed
      const cached = await this.cacheManager.get(`processed_tx:${transaction.hash}`);
      if (cached) {
        this.logger.debug(`📋 Transaction ${transaction.hash} already processed`);
        return cached;
      }

      // 2. Enrich transaction with additional metadata
      const enrichedTransaction = await this.enrichTransaction(transaction);

      // 3. Combine with whale information
      const processedTransaction: ProcessedTransaction = {
        transaction: enrichedTransaction,
        whaleInfo,
        enrichments: {
          contractVerified: enrichedTransaction.contractVerified || false,
          tokenMetadata: enrichedTransaction.tokenName ? {
            symbol: enrichedTransaction.tokenSymbol,
            name: enrichedTransaction.tokenName,
            decimals: enrichedTransaction.tokenDecimals
          } : undefined,
          dexInfo: enrichedTransaction.dexName ? {
            name: enrichedTransaction.dexName,
            pair: enrichedTransaction.pairAddress
          } : undefined,
          bridgeInfo: enrichedTransaction.bridgeName ? {
            name: enrichedTransaction.bridgeName,
            sourceChain: enrichedTransaction.sourceChain,
            destinationChain: enrichedTransaction.destinationChain
          } : undefined
        },
        processingLatency: Date.now() - startTime,
        timestamp: new Date()
      };

      // 4. Cache the processed transaction
      await this.cacheManager.set(`processed_tx:${transaction.hash}`, processedTransaction, 3600); // 1 hour cache

      // 5. Update metrics
      this.processedCount++;

      // 6. Emit processed transaction
      this.emit('transactionProcessed', processedTransaction);

      return processedTransaction;

    } catch (error) {
      this.logger.error(`Failed to process transaction ${transaction.hash}`, error);
      throw error;
    }
  }

  /**
   * Enrich transaction with additional metadata
   */
  private async enrichTransaction(transaction: TransactionData): Promise<TransactionData> {
    // Create a copy to avoid mutating the original
    const enriched = { ...transaction };

    try {
      // 1. Contract verification status
      if (enriched.contractAddress) {
        enriched.contractVerified = await this.checkContractVerification(enriched.contractAddress);
      }

      // 2. Token metadata enrichment
      if (enriched.tokenAddress) {
        const tokenMetadata = await this.getTokenMetadata(enriched.tokenAddress);
        enriched.tokenSymbol = tokenMetadata.symbol;
        enriched.tokenName = tokenMetadata.name;
        enriched.tokenDecimals = tokenMetadata.decimals;
      }

      // 3. DEX trade enrichment
      if (enriched.dexName && enriched.pairAddress) {
        const dexInfo = await this.getDexInfo(enriched.pairAddress);
        enriched.contractName = dexInfo.contractName;
      }

      // 4. Bridge transaction enrichment
      if (enriched.bridgeName && enriched.contractAddress) {
        const bridgeInfo = await this.getBridgeInfo(enriched.contractAddress);
        enriched.contractName = bridgeInfo.contractName;
      }

      // 5. USD value calculation
      if (enriched.amount && enriched.tokenSymbol) {
        enriched.usdValue = await this.calculateUSDValue(enriched.amount, enriched.tokenSymbol);
      }

      enriched.enrichmentLevel = 'enhanced';

    } catch (error) {
      this.logger.error(`Failed to enrich transaction ${transaction.hash}`, error);
      enriched.enrichmentLevel = 'basic';
    }

    return enriched;
  }

  /**
   * Check if contract is verified
   */
  private async checkContractVerification(contractAddress?: string): Promise<boolean> {
    if (!contractAddress) return false;

    const cacheKey = `contract_verified:${contractAddress}`;
    const cached = this.enrichmentCache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    try {
      // This would check against Etherscan, Sourcify, etc.
      // For now, return false as a placeholder
      const isVerified = false;

      this.enrichmentCache.set(cacheKey, isVerified);
      return isVerified;

    } catch (error) {
      this.logger.error(`Failed to check contract verification for ${contractAddress}`, error);
      return false;
    }
  }

  /**
   * Get token metadata
   */
  private async getTokenMetadata(tokenAddress: string): Promise<any> {
    const cacheKey = `token_metadata:${tokenAddress}`;
    const cached = this.enrichmentCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // This would query token metadata from various sources
      // For now, return placeholder data
      const metadata = {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 18
      };

      this.enrichmentCache.set(cacheKey, metadata);
      return metadata;

    } catch (error) {
      this.logger.error(`Failed to get token metadata for ${tokenAddress}`, error);
      return { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 18 };
    }
  }

  /**
   * Get DEX information
   */
  private async getDexInfo(pairAddress?: string): Promise<any> {
    if (!pairAddress) return {};

    const cacheKey = `dex_info:${pairAddress}`;
    const cached = this.enrichmentCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // This would query DEX-specific information
      // For now, return placeholder data
      const dexInfo = {
        contractName: 'Uniswap V3 Pair'
      };

      this.enrichmentCache.set(cacheKey, dexInfo);
      return dexInfo;

    } catch (error) {
      this.logger.error(`Failed to get DEX info for ${pairAddress}`, error);
      return {};
    }
  }

  /**
   * Get bridge information
   */
  private async getBridgeInfo(contractAddress?: string): Promise<any> {
    if (!contractAddress) return {};

    const cacheKey = `bridge_info:${contractAddress}`;
    const cached = this.enrichmentCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // This would query bridge-specific information
      // For now, return placeholder data
      const bridgeInfo = {
        contractName: 'Polygon Bridge'
      };

      this.enrichmentCache.set(cacheKey, bridgeInfo);
      return bridgeInfo;

    } catch (error) {
      this.logger.error(`Failed to get bridge info for ${contractAddress}`, error);
      return {};
    }
  }

  /**
   * Calculate USD value of transaction
   */
  private async calculateUSDValue(amount: string, tokenSymbol: string): Promise<number> {
    try {
      // This would query current token prices from price oracles
      // For now, return a placeholder value
      return parseFloat(amount) * 0.001; // Placeholder calculation

    } catch (error) {
      this.logger.error(`Failed to calculate USD value for ${amount} ${tokenSymbol}`, error);
      return 0;
    }
  }

  /**
   * Get processing statistics
   */
  getStats(): any {
    return {
      processedCount: this.processedCount,
      isRunning: this.isRunning,
      enrichmentCacheSize: this.enrichmentCache.size,
      averageLatency: 0 // Would calculate from recent transactions
    };
  }
}
