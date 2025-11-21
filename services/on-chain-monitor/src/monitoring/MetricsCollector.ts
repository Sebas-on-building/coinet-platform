/**
 * =========================================
 * METRICS COLLECTOR
 * =========================================
 * Collects and exposes metrics for the on-chain monitoring system
 */

import { EventEmitter } from 'events';
import { TransactionData, ChainMetrics, ProcessingMetrics } from '../types';
import { Logger } from '../utils/Logger';

export class MetricsCollector extends EventEmitter {
  private logger: Logger;
  private startTime: Date;
  private totalTransactions: number = 0;
  private totalBlocks: number = 0;
  private totalErrors: number = 0;
  private chainMetrics: Map<string, ChainMetrics> = new Map();
  private isRunning: boolean = false;

  constructor() {
    super();
    this.logger = new Logger('MetricsCollector');
    this.startTime = new Date();
  }

  /**
   * Initialize the metrics collector
   */
  async initialize(): Promise<void> {
    await this.start();
    this.logger.info('✅ Metrics Collector initialized');
  }

  /**
   * Start metrics collection
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.logger.info('📊 Starting Metrics Collector...');
  }

  /**
   * Stop metrics collection
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.logger.info('🛑 Stopping Metrics Collector...');
  }

  /**
   * Record a transaction
   */
  recordTransaction(chain: string, transaction: TransactionData): void {
    if (!this.isRunning) return;

    this.totalTransactions++;

    // Update chain-specific metrics
    let chainMetric = this.chainMetrics.get(chain);
    if (!chainMetric) {
      chainMetric = {
        chainId: parseInt(chain),
        totalTransactions: 0,
        totalBlocks: 0,
        averageBlockTime: 0,
        averageGasPrice: '0',
        totalGasUsed: '0',
        activeWhales: 0,
        whaleVolume: '0',
        reorgCount: 0,
        lastBlock: 0,
        lastUpdate: new Date()
      };
      this.chainMetrics.set(chain, chainMetric);
    }

    chainMetric.totalTransactions++;
    chainMetric.lastUpdate = new Date();
  }

  /**
   * Record a block
   */
  recordBlock(chain: string, block: any): void {
    if (!this.isRunning) return;

    this.totalBlocks++;

    // Update chain-specific metrics
    const chainMetric = this.chainMetrics.get(chain);
    if (chainMetric) {
      chainMetric.totalBlocks++;
      chainMetric.lastBlock = block.number;
      chainMetric.lastUpdate = new Date();
    }
  }

  /**
   * Record an error
   */
  incrementError(): void {
    if (!this.isRunning) return;

    this.totalErrors++;
  }

  /**
   * Record whale detection
   */
  recordWhaleDetection(chain: string): void {
    const chainMetric = this.chainMetrics.get(chain);
    if (chainMetric) {
      chainMetric.activeWhales++;
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): ProcessingMetrics {
    const uptime = Date.now() - this.startTime.getTime();
    const transactionsPerSecond = this.totalTransactions / (uptime / 1000);
    const blocksPerSecond = this.totalBlocks / (uptime / 1000);
    const errorRate = this.totalTransactions > 0 ? this.totalErrors / this.totalTransactions : 0;

    return {
      totalTransactions: this.totalTransactions,
      totalBlocks: this.totalBlocks,
      averageLatency: 0, // Would calculate from recent transactions
      errorRate,
      enrichmentRate: 0, // Would track enrichment success rate
      whaleDetectionRate: 0, // Would track whale detection success rate
      cacheHitRate: 0, // Would track cache hit rate
      uptime
    };
  }

  /**
   * Get chain-specific metrics
   */
  getChainMetrics(chain: string): ChainMetrics | null {
    return this.chainMetrics.get(chain) || null;
  }

  /**
   * Get all chain metrics
   */
  getAllChainMetrics(): Map<string, ChainMetrics> {
    return new Map(this.chainMetrics);
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.totalTransactions = 0;
    this.totalBlocks = 0;
    this.totalErrors = 0;
    this.chainMetrics.clear();
    this.startTime = new Date();
  }

  /**
   * Get collector status
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
      totalTransactions: this.totalTransactions,
      totalBlocks: this.totalBlocks,
      totalErrors: this.totalErrors,
      chainCount: this.chainMetrics.size,
      uptime: process.uptime()
    };
  }
}
