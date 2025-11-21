/**
 * =========================================
 * METRICS COLLECTOR
 * =========================================
 * Metrics collection and performance monitoring for the DeFi protocol metrics service
 */

import { Logger } from '../utils/Logger';

export interface MetricsData {
  metricsProcessed: number;
  processingTimeMs: number;
  errorCount: number;
  timestamp: Date;
}

export class MetricsCollector {
  private logger: Logger;
  private isInitialized: boolean = false;
  private metrics: MetricsData[] = [];
  private errorCount: number = 0;

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

  recordMetricsProcessed(processingTimeMs: number): void {
    this.metrics.push({
      metricsProcessed: 1,
      processingTimeMs,
      errorCount: this.errorCount,
      timestamp: new Date()
    });
  }

  recordError(): void {
    this.errorCount++;
  }

  async getErrorRate(): Promise<number> {
    const totalMetrics = this.metrics.reduce((sum, m) => sum + m.metricsProcessed, 0);
    return totalMetrics > 0 ? this.errorCount / totalMetrics : 0;
  }

  getRecentMetrics(limit: number = 100): MetricsData[] {
    return this.metrics.slice(-limit);
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
