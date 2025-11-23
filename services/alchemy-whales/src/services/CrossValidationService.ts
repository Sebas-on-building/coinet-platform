/**
 * Cross-Validation Service
 * 
 * Provides intelligent cross-validation between Alchemy and QuickNode
 * to ensure data accuracy and detect anomalies with world-class precision.
 * 
 * Features:
 * - Smart threshold-based validation triggers
 * - Discrepancy detection and reconciliation
 * - Confidence scoring algorithms
 * - Quota-aware validation to minimize costs
 * - Anomaly detection and alerting
 */

import { createLogger } from '../utils/logger';
import { AlchemyClientManager } from '../clients/AlchemyClient';
import { QuickNodeClientManager } from '../clients/QuickNodeClient';
import {
  CrossValidationResult,
  ProviderPriority,
  MultiProviderStrategy,
} from '../types/quicknode';
import { Chain, NormalizedTransfer, TransferCategory } from '../types';
import { AssetTransfersCategory } from 'alchemy-sdk';

/**
 * Configuration for cross-validation
 */
export interface CrossValidationConfig {
  enableAutoValidation: boolean;
  validationThresholdUsd: number;
  maxDiscrepancyPercent: number;
  minConfidenceScore: number;
  cacheValidationResults: boolean;
  validationCacheTtl: number;
}


/**
 * Cross-Validation Service
 */
export class CrossValidationService {
  private logger: any;
  private alchemyClient: AlchemyClientManager;
  private quickNodeClient: QuickNodeClientManager;
  private config: CrossValidationConfig;
  private validationCache: Map<string, CrossValidationResult>;
  
  private metrics: {
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    discrepanciesFound: number;
    avgConfidenceScore: number;
    quotaSaved: number;
  };

  constructor(
    alchemyClient: AlchemyClientManager,
    quickNodeClient: QuickNodeClientManager,
    config: CrossValidationConfig
  ) {
    this.logger = createLogger({ component: 'CrossValidationService' });
    this.alchemyClient = alchemyClient;
    this.quickNodeClient = quickNodeClient;
    this.config = config;
    this.validationCache = new Map();

    this.metrics = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      discrepanciesFound: 0,
      avgConfidenceScore: 0,
      quotaSaved: 0,
    };

    this.logger.info('Cross-validation service initialized', {
      validationThreshold: config.validationThresholdUsd,
      maxDiscrepancy: config.maxDiscrepancyPercent,
    });
  }

  /**
   * Validate transfers between Alchemy and QuickNode
   */
  async validateTransfers(
    address: string,
    chain: Chain,
    fromBlock?: number,
    toBlock?: number
  ): Promise<CrossValidationResult> {
    const cacheKey = `${chain}:${address}:${fromBlock || 'latest'}:${toBlock || 'latest'}`;

    // Check cache first
    if (this.config.cacheValidationResults) {
      const cached = this.validationCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        this.logger.debug('Returning cached validation result');
        this.metrics.quotaSaved++;
        return cached;
      }
    }

    this.metrics.totalValidations++;
    this.logger.info('Starting cross-validation', { address, chain, fromBlock, toBlock });

    try {
      // Fetch transfers from both providers in parallel
      const [alchemyTransfers, quickNodeTransfers] = await Promise.all([
        this.fetchAlchemyTransfers(address, chain, fromBlock, toBlock),
        this.fetchQuickNodeTransfers(address, chain, fromBlock, toBlock),
      ]);

      // Perform validation
      const result = this.compareTransfers(
        address,
        chain,
        alchemyTransfers,
        quickNodeTransfers
      );

      // Update metrics
      if (result.validated) {
        this.metrics.passedValidations++;
      } else {
        this.metrics.failedValidations++;
      }

      if (result.discrepancies.transferCountDiff > 0) {
        this.metrics.discrepanciesFound++;
      }

      this.metrics.avgConfidenceScore =
        (this.metrics.avgConfidenceScore * (this.metrics.totalValidations - 1) +
          result.confidence) /
        this.metrics.totalValidations;

      // Cache result
      if (this.config.cacheValidationResults) {
        this.validationCache.set(cacheKey, result);
        // Implement TTL cleanup
        setTimeout(() => this.validationCache.delete(cacheKey), this.config.validationCacheTtl);
      }

      this.logger.info('Cross-validation completed', {
        address,
        chain,
        validated: result.validated,
        confidence: result.confidence,
        discrepancies: result.discrepancies,
      });

      return result;
    } catch (error: any) {
      this.logger.error('Cross-validation failed', {
        address,
        chain,
        error: error.message,
      });

      // Return failed validation result
      return {
        address,
        chain,
        validated: false,
        discrepancies: {
          transferCountDiff: -1,
          valueDiffPercentage: -1,
          missingInAlchemy: [],
          missingInQuickNode: [],
        },
        confidence: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Fetch transfers from Alchemy
   */
  private async fetchAlchemyTransfers(
    address: string,
    chain: Chain,
    fromBlock?: number,
    toBlock?: number
  ): Promise<NormalizedTransfer[]> {
    try {
      const client = this.alchemyClient.getClient(chain);
      
      const response = await client.getAssetTransfers({
        fromAddress: address,
        fromBlock: fromBlock?.toString(),
        toBlock: toBlock?.toString(),
        category: [
          TransferCategory.EXTERNAL,
          TransferCategory.INTERNAL,
          TransferCategory.ERC20,
          TransferCategory.ERC721,
          TransferCategory.ERC1155,
        ],
        withMetadata: true,
        maxCount: 1000,
      });

      // Convert to normalized format
      return response.transfers.map((t) => {
        // Map Alchemy category to our TransferCategory
        let category: TransferCategory;
        switch (t.category) {
          case AssetTransfersCategory.EXTERNAL:
            category = TransferCategory.EXTERNAL;
            break;
          case AssetTransfersCategory.INTERNAL:
            category = TransferCategory.INTERNAL;
            break;
          case AssetTransfersCategory.ERC20:
            category = TransferCategory.ERC20;
            break;
          case AssetTransfersCategory.ERC721:
            category = TransferCategory.ERC721;
            break;
          case AssetTransfersCategory.ERC1155:
            category = TransferCategory.ERC1155;
            break;
          case AssetTransfersCategory.SPECIALNFT:
            category = TransferCategory.SPECIALNFT;
            break;
          default:
            category = TransferCategory.EXTERNAL;
        }

        // Access metadata safely - Alchemy transfers have metadata when withMetadata=true
        const blockTimestamp = (t as any).metadata?.blockTimestamp || new Date().toISOString();
        
        return {
          id: `alchemy-${t.hash}-${t.blockNum}`,
          chain,
          blockNumber: parseInt(t.blockNum, 16),
          blockTimestamp: new Date(blockTimestamp),
          transactionHash: t.hash,
          from: t.from,
          to: t.to,
          value: t.value?.toString() || '0',
          valueUsd: 0, // Would need price oracle
          category,
          direction: (address === t.from ? 'outgoing' : 'incoming') as any,
          asset: {
            address: t.rawContract.address,
            symbol: t.asset,
            decimals: t.rawContract.decimal ? parseInt(t.rawContract.decimal) : null,
            name: null,
          },
          tokenId: t.tokenId,
          whaleTier: null,
          fromEntity: null,
          toEntity: null,
          metadata: {},
        };
      });
    } catch (error: any) {
      this.logger.error('Failed to fetch Alchemy transfers', {
        address,
        chain,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Fetch transfers from QuickNode
   */
  private async fetchQuickNodeTransfers(
    address: string,
    chain: Chain,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    try {
      const client = this.quickNodeClient.getClientByInternalChain(chain);
      
      const response = await client.getTransfersByAddress({
        address,
        fromBlock: fromBlock || 'latest',
        toBlock: toBlock || 'latest',
        maxCount: 1000,
      });

      return response.transfers || [];
    } catch (error: any) {
      this.logger.error('Failed to fetch QuickNode transfers', {
        address,
        chain,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Compare transfers from both providers
   */
  private compareTransfers(
    address: string,
    chain: Chain,
    alchemyTransfers: NormalizedTransfer[],
    quickNodeTransfers: any[]
  ): CrossValidationResult {
    // Create hash maps for efficient lookup
    const alchemyMap = new Map(
      alchemyTransfers.map((t) => [t.transactionHash, t])
    );
    const quickNodeMap = new Map(
      quickNodeTransfers.map((t) => [t.transactionHash, t])
    );

    // Find missing transfers
    const missingInQuickNode = alchemyTransfers
      .filter((t) => !quickNodeMap.has(t.transactionHash))
      .map((t) => t.transactionHash);

    const missingInAlchemy = quickNodeTransfers
      .filter((t) => !alchemyMap.has(t.transactionHash))
      .map((t) => t.transactionHash);

    // Calculate transfer count difference
    const transferCountDiff = Math.abs(
      alchemyTransfers.length - quickNodeTransfers.length
    );

    // Calculate value difference (if applicable)
    const alchemyTotalValue = alchemyTransfers.reduce(
      (sum, t) => sum + parseFloat(t.value || '0'),
      0
    );
    const quickNodeTotalValue = quickNodeTransfers.reduce(
      (sum, t) => sum + parseFloat(t.value || '0'),
      0
    );

    const valueDiffPercentage =
      alchemyTotalValue > 0
        ? (Math.abs(alchemyTotalValue - quickNodeTotalValue) / alchemyTotalValue) * 100
        : 0;

    // Calculate confidence score
    const confidence = this.calculateConfidenceScore(
      alchemyTransfers.length,
      quickNodeTransfers.length,
      missingInAlchemy.length,
      missingInQuickNode.length,
      valueDiffPercentage
    );

    // Determine if validation passed
    const validated =
      transferCountDiff <= alchemyTransfers.length * 0.05 && // Max 5% difference
      valueDiffPercentage <= this.config.maxDiscrepancyPercent &&
      confidence >= this.config.minConfidenceScore;

    return {
      address,
      chain,
      validated,
      discrepancies: {
        transferCountDiff,
        valueDiffPercentage,
        missingInAlchemy,
        missingInQuickNode,
      },
      confidence,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidenceScore(
    alchemyCount: number,
    quickNodeCount: number,
    missingInAlchemy: number,
    missingInQuickNode: number,
    valueDiffPercent: number
  ): number {
    const totalCount = Math.max(alchemyCount, quickNodeCount);
    if (totalCount === 0) return 100;

    // Factors affecting confidence
    const countMatchScore = ((totalCount - Math.abs(alchemyCount - quickNodeCount)) / totalCount) * 40;
    const missingScore = ((totalCount - missingInAlchemy - missingInQuickNode) / totalCount) * 40;
    const valueMatchScore = Math.max(0, (100 - valueDiffPercent) * 0.2);

    return Math.min(100, countMatchScore + missingScore + valueMatchScore);
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(timestamp: Date): boolean {
    const age = Date.now() - timestamp.getTime();
    return age < this.config.validationCacheTtl;
  }

  /**
   * Should validate based on strategy and value
   */
  shouldValidate(
    valueUsd: number,
    strategy: MultiProviderStrategy
  ): boolean {
    if (!this.config.enableAutoValidation) {
      return false;
    }

    // Always validate if strategy requires it
    if (strategy.priority === ProviderPriority.CROSS_VALIDATE) {
      return true;
    }

    // Validate large transfers
    if (
      strategy.crossValidateThreshold &&
      valueUsd >= strategy.crossValidateThreshold
    ) {
      this.logger.info('Triggering validation due to value threshold', {
        valueUsd,
        threshold: strategy.crossValidateThreshold,
      });
      return true;
    }

    return false;
  }

  /**
   * Reconcile discrepancies and return best data
   */
  async reconcileDiscrepancies(
    validationResult: CrossValidationResult
  ): Promise<'alchemy' | 'quicknode' | 'merged'> {
    if (validationResult.validated) {
      // No significant discrepancies
      return 'alchemy'; // Default to Alchemy
    }

    const {
      missingInAlchemy,
      missingInQuickNode,
    } = validationResult.discrepancies;

    // More comprehensive data wins
    if (missingInAlchemy.length > missingInQuickNode.length * 1.5) {
      this.logger.warn('QuickNode has significantly more data', validationResult);
      return 'quicknode';
    } else if (missingInQuickNode.length > missingInAlchemy.length * 1.5) {
      this.logger.warn('Alchemy has significantly more data', validationResult);
      return 'alchemy';
    }

    // If similar, merge both datasets
    this.logger.warn('Merging data from both providers', validationResult);
    return 'merged';
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.validationCache.size,
      passRate: this.metrics.totalValidations > 0
        ? (this.metrics.passedValidations / this.metrics.totalValidations) * 100
        : 0,
    };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.logger.info('Validation cache cleared');
  }
}

export default CrossValidationService;

