/**
 * ============================================
 * HISTORICAL DATA COLLECTOR
 * ============================================
 * 
 * Collects and manages historical whale transfer data:
 * - Fetches from WhaleFusion Engine
 * - Stores in memory with optional persistence
 * - Generates training datasets
 * - Labels data with actual outcomes
 */

import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { Chain, AlchemyTransfer } from '../types';
import { WhaleFusionEngine, getWhaleFusionEngine } from '../clients/WhaleFusionEngine';
import { TrainingData, PredictionFeatures } from './WhalePredictor';

// =============================================================================
// TYPES
// =============================================================================

export interface CollectorConfig {
  maxTransfersPerWhale: number;
  lookbackDays: number;
  minTransfersForTraining: number;
  autoCollectInterval?: number; // ms, undefined = disabled
}

export interface WhaleHistoricalData {
  address: string;
  chain: Chain;
  transfers: AlchemyTransfer[];
  collectedAt: Date;
  lastUpdated: Date;
}

export interface LabeledTransfer {
  transfer: AlchemyTransfer;
  features: number[];
  label: number[]; // [BUY, SELL, HOLD, TRANSFER] one-hot
  nextAction?: string;
  nextActionTime?: Date;
}

export interface CollectionStats {
  totalWhales: number;
  totalTransfers: number;
  labeledTransfers: number;
  lastCollectionTime: Date | null;
  collectionErrors: number;
}

const DEFAULT_CONFIG: CollectorConfig = {
  maxTransfersPerWhale: 1000,
  lookbackDays: 90,
  minTransfersForTraining: 10,
};

// =============================================================================
// MAIN CLASS
// =============================================================================

export class HistoricalDataCollector extends EventEmitter {
  private logger: any;
  private config: CollectorConfig;
  private fusionEngine: WhaleFusionEngine | null = null;
  
  // Data storage
  private whaleData: Map<string, WhaleHistoricalData> = new Map();
  private labeledData: LabeledTransfer[] = [];
  
  // Collection tracking
  private stats: CollectionStats = {
    totalWhales: 0,
    totalTransfers: 0,
    labeledTransfers: 0,
    lastCollectionTime: null,
    collectionErrors: 0,
  };

  // Auto-collection timer
  private autoCollectTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CollectorConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = createLogger({ component: 'HistoricalDataCollector' });

    // Try to get fusion engine (may not be initialized yet)
    try {
      this.fusionEngine = getWhaleFusionEngine();
    } catch {
      this.logger.warn('WhaleFusionEngine not initialized, will use mock data');
    }

    // Start auto-collection if configured
    if (this.config.autoCollectInterval) {
      this.startAutoCollection(this.config.autoCollectInterval);
    }

    this.logger.info('HistoricalDataCollector initialized', {
      maxTransfersPerWhale: this.config.maxTransfersPerWhale,
      lookbackDays: this.config.lookbackDays,
    });
  }

  /**
   * Collect historical data for a whale
   */
  async collectForWhale(address: string, chain: Chain): Promise<WhaleHistoricalData> {
    const key = `${chain}:${address}`;
    const startTime = Date.now();

    this.logger.debug('Collecting data for whale', {
      address: address.slice(0, 10) + '...',
      chain,
    });

    try {
      let transfers: AlchemyTransfer[] = [];

      if (this.fusionEngine) {
        // Use fusion engine for real data
        const result = await this.fusionEngine.getTransfers({
          chain,
          address,
          limit: this.config.maxTransfersPerWhale,
        });
        transfers = result.data;
      } else {
        // Generate mock data for testing
        transfers = this.generateMockTransfers(address, chain, 50);
      }

      const data: WhaleHistoricalData = {
        address,
        chain,
        transfers,
        collectedAt: new Date(),
        lastUpdated: new Date(),
      };

      this.whaleData.set(key, data);
      this.stats.totalWhales = this.whaleData.size;
      this.stats.totalTransfers += transfers.length;
      this.stats.lastCollectionTime = new Date();

      this.logger.info('Data collected for whale', {
        address: address.slice(0, 10) + '...',
        chain,
        transferCount: transfers.length,
        durationMs: Date.now() - startTime,
      });

      this.emit('data_collected', { address, chain, transferCount: transfers.length });
      return data;

    } catch (error: any) {
      this.stats.collectionErrors++;
      this.logger.error('Failed to collect data', {
        address: address.slice(0, 10) + '...',
        chain,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Collect data for multiple whales
   */
  async collectBatch(whales: Array<{ address: string; chain: Chain }>): Promise<void> {
    this.logger.info('Starting batch collection', { whaleCount: whales.length });

    const results = await Promise.allSettled(
      whales.map(w => this.collectForWhale(w.address, w.chain))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    this.logger.info('Batch collection complete', { successful, failed });
  }

  /**
   * Label transfers with actual outcomes
   */
  labelTransfers(): LabeledTransfer[] {
    this.labeledData = [];

    for (const [key, data] of this.whaleData) {
      const transfers = data.transfers;
      
      for (let i = 0; i < transfers.length - 1; i++) {
        const current = transfers[i];
        const next = transfers[i + 1];

        // Determine the label based on next action
        const label = this.determineLabel(current, next, data.address);
        const features = this.extractFeatures(current, transfers.slice(0, i + 1), data);

        this.labeledData.push({
          transfer: current,
          features,
          label,
          nextAction: this.getActionType(next, data.address),
          nextActionTime: new Date(next.metadata?.blockTimestamp || Date.now()),
        });
      }
    }

    this.stats.labeledTransfers = this.labeledData.length;
    this.logger.info('Transfers labeled', { count: this.labeledData.length });

    return this.labeledData;
  }

  /**
   * Generate training dataset
   */
  generateTrainingData(): TrainingData {
    if (this.labeledData.length === 0) {
      this.labelTransfers();
    }

    const features: number[][] = [];
    const labels: number[][] = [];
    const weights: number[] = [];

    for (const item of this.labeledData) {
      features.push(item.features);
      labels.push(item.label);
      
      // Weight recent data more heavily
      const age = Date.now() - new Date(item.transfer.metadata?.blockTimestamp || 0).getTime();
      const ageInDays = age / (24 * 60 * 60 * 1000);
      weights.push(Math.exp(-ageInDays / 30)); // Exponential decay
    }

    this.logger.info('Training data generated', {
      samples: features.length,
      featureDim: features[0]?.length || 0,
    });

    return { features, labels, weights };
  }

  /**
   * Determine label for a transfer
   */
  private determineLabel(
    current: AlchemyTransfer,
    next: AlchemyTransfer,
    whaleAddress: string
  ): number[] {
    const action = this.getActionType(next, whaleAddress);
    
    // One-hot encoding: [BUY, SELL, HOLD, TRANSFER]
    switch (action) {
      case 'BUY':
        return [1, 0, 0, 0];
      case 'SELL':
        return [0, 1, 0, 0];
      case 'HOLD':
        return [0, 0, 1, 0];
      case 'TRANSFER':
        return [0, 0, 0, 1];
      default:
        return [0, 0, 1, 0]; // Default to HOLD
    }
  }

  /**
   * Get action type from transfer
   */
  private getActionType(transfer: AlchemyTransfer, whaleAddress: string): string {
    const isIncoming = transfer.to?.toLowerCase() === whaleAddress.toLowerCase();
    const isOutgoing = transfer.from?.toLowerCase() === whaleAddress.toLowerCase();

    if (isIncoming && !isOutgoing) {
      return 'BUY';
    } else if (isOutgoing && !isIncoming) {
      return 'SELL';
    } else if (isIncoming && isOutgoing) {
      return 'TRANSFER';
    }
    return 'HOLD';
  }

  /**
   * Extract features from transfer
   */
  private extractFeatures(
    transfer: AlchemyTransfer,
    history: AlchemyTransfer[],
    whaleData: WhaleHistoricalData
  ): number[] {
    const now = new Date(transfer.metadata?.blockTimestamp || Date.now());
    
    // Calculate historical metrics
    const last24h = history.filter(t => {
      const ts = new Date(t.metadata?.blockTimestamp || 0);
      return now.getTime() - ts.getTime() < 24 * 60 * 60 * 1000;
    });

    const last7d = history.filter(t => {
      const ts = new Date(t.metadata?.blockTimestamp || 0);
      return now.getTime() - ts.getTime() < 7 * 24 * 60 * 60 * 1000;
    });

    const totalValue = history.reduce((sum, t) => sum + (t.value || 0), 0);
    const avgValue = history.length > 0 ? totalValue / history.length : 0;

    const buyCount = history.filter(t => 
      t.to?.toLowerCase() === whaleData.address.toLowerCase()
    ).length;
    const sellCount = history.filter(t => 
      t.from?.toLowerCase() === whaleData.address.toLowerCase()
    ).length;

    // Build feature vector (40 features)
    return [
      // Transfer features (10)
      Math.min((transfer.value || 0) / 10000000, 1),
      transfer.category === 'erc20' ? 1 : 0,
      transfer.category === 'erc721' ? 1 : 0,
      transfer.category === 'external' ? 1 : 0,
      transfer.to?.toLowerCase() === whaleData.address.toLowerCase() ? 1 : 0,
      transfer.from?.toLowerCase() === whaleData.address.toLowerCase() ? 1 : 0,
      Math.min(parseInt(transfer.blockNum, 16) / 20000000, 1),
      transfer.rawContract?.address ? 1 : 0,
      0, 0, // Padding

      // Historical features (10)
      Math.min(avgValue / 10000000, 1),
      Math.min(history.length / 1000, 1),
      history.length > 0 ? buyCount / history.length : 0.5,
      history.length > 0 ? sellCount / history.length : 0.5,
      Math.min(last24h.length / 20, 1),
      Math.min(last7d.length / 100, 1),
      0, 0, 0, 0, // Padding

      // Temporal features (10)
      now.getUTCHours() / 23,
      now.getUTCDay() / 6,
      (now.getUTCDay() === 0 || now.getUTCDay() === 6) ? 1 : 0,
      now.getUTCDate() / 31,
      now.getUTCMonth() / 11,
      0, 0, 0, 0, 0, // Padding

      // Context features (10) - defaults, would be filled with market data
      0.5, // BTC change
      0.5, // ETH change
      0.5, // Volatility
      0.3, // Gas price normalized
      0.5, // Fear/greed
      0.5, // Network congestion
      0, 0, 0, 0, // Padding
    ];
  }

  /**
   * Generate mock transfers for testing
   */
  private generateMockTransfers(
    address: string,
    chain: Chain,
    count: number
  ): AlchemyTransfer[] {
    const transfers: AlchemyTransfer[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const isBuy = Math.random() > 0.5;
      const timestamp = new Date(now - i * 3600000 * Math.random() * 24); // Random time in last day per transfer

      transfers.push({
        blockNum: `0x${(19000000 - i * 100).toString(16)}`,
        hash: `0x${Math.random().toString(16).slice(2)}`,
        from: isBuy ? `0x${Math.random().toString(16).slice(2, 42)}` : address,
        to: isBuy ? address : `0x${Math.random().toString(16).slice(2, 42)}`,
        value: Math.random() * 1000000,
        erc721TokenId: null,
        erc1155Metadata: null,
        tokenId: null,
        asset: 'ETH',
        category: 'external' as any,
        rawContract: {
          value: null,
          address: null,
          decimal: null,
        },
        metadata: {
          blockTimestamp: timestamp.toISOString(),
        },
      });
    }

    return transfers.sort((a, b) => 
      new Date(a.metadata.blockTimestamp).getTime() - 
      new Date(b.metadata.blockTimestamp).getTime()
    );
  }

  /**
   * Start auto-collection
   */
  startAutoCollection(intervalMs: number): void {
    if (this.autoCollectTimer) {
      clearInterval(this.autoCollectTimer);
    }

    this.autoCollectTimer = setInterval(() => {
      this.emit('auto_collect_tick');
    }, intervalMs);

    this.logger.info('Auto-collection started', { intervalMs });
  }

  /**
   * Stop auto-collection
   */
  stopAutoCollection(): void {
    if (this.autoCollectTimer) {
      clearInterval(this.autoCollectTimer);
      this.autoCollectTimer = null;
      this.logger.info('Auto-collection stopped');
    }
  }

  /**
   * Get whale data
   */
  getWhaleData(address: string, chain: Chain): WhaleHistoricalData | undefined {
    return this.whaleData.get(`${chain}:${address}`);
  }

  /**
   * Get all whale addresses
   */
  getAllWhales(): Array<{ address: string; chain: Chain }> {
    return Array.from(this.whaleData.values()).map(d => ({
      address: d.address,
      chain: d.chain,
    }));
  }

  /**
   * Get collection stats
   */
  getStats(): CollectionStats {
    return { ...this.stats };
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.whaleData.clear();
    this.labeledData = [];
    this.stats = {
      totalWhales: 0,
      totalTransfers: 0,
      labeledTransfers: 0,
      lastCollectionTime: null,
      collectionErrors: 0,
    };
    this.logger.info('All data cleared');
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let collectorInstance: HistoricalDataCollector | null = null;

export function getHistoricalDataCollector(config?: Partial<CollectorConfig>): HistoricalDataCollector {
  if (!collectorInstance) {
    collectorInstance = new HistoricalDataCollector(config);
  }
  return collectorInstance;
}

export function resetHistoricalDataCollector(): void {
  if (collectorInstance) {
    collectorInstance.stopAutoCollection();
  }
  collectorInstance = null;
}

export default HistoricalDataCollector;

