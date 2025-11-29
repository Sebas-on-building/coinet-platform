/**
 * =========================================
 * METRICS COLLECTOR
 * =========================================
 * Metrics collection and performance monitoring for the signal evaluation engine
 */

import { Logger } from '../utils/Logger';

export interface MetricsData {
  signalsProcessed: number;
  processingTimeMs: number;
  errorCount: number;
  timestamp: Date;
}

export class MetricsCollector {
  private logger: Logger;
  private isInitialized: boolean = false;
  private metrics: MetricsData[] = [];
  private errorCount: number = 0;
  private customMetrics: Map<string, number> = new Map();

  constructor() {
    this.logger = new Logger('MetricsCollector');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Metrics Collector...');
      this.isInitialized = true;
      this.logger.info('✅ Metrics Collector initialized successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Metrics Collector', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ Metrics Collector stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Metrics Collector', error);
      throw error;
    }
  }

  recordSignalProcessed(processingTimeMs: number): void {
    this.metrics.push({
      signalsProcessed: 1,
      processingTimeMs,
      errorCount: this.errorCount,
      timestamp: new Date()
    });
  }

  recordError(): void {
    this.errorCount++;
  }

  async getErrorRate(): Promise<number> {
    const totalSignals = this.metrics.reduce((sum, m) => sum + m.signalsProcessed, 0);
    return totalSignals > 0 ? this.errorCount / totalSignals : 0;
  }

  getRecentMetrics(limit: number = 100): MetricsData[] {
    return this.metrics.slice(-limit);
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }

  /**
   * Record a custom metric value
   */
  recordMetric(name: string, value: number): void {
    this.customMetrics.set(name, (this.customMetrics.get(name) || 0) + value);
  }

  /**
   * Get a custom metric value
   */
  getMetric(name: string): number {
    return this.customMetrics.get(name) || 0;
  }

  /**
   * Get all custom metrics
   */
  getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.customMetrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
}
