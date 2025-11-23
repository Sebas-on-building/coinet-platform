/**
 * =========================================
 * METRICS COLLECTOR
 * =========================================
 * Metrics collection and performance monitoring for the social media sentiment service
 */

import { Logger } from '../utils/Logger';

export interface MetricsData {
  postsProcessed: number;
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
    } catch (error: unknown) {
      this.logger.error('❌ Failed to initialize Metrics Collector', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('✅ Metrics Collector stopped successfully');
    } catch (error: unknown) {
      this.logger.error('❌ Failed to stop Metrics Collector', error);
      throw error;
    }
  }

  recordPostProcessed(processingTimeMs: number): void {
    this.metrics.push({
      postsProcessed: 1,
      processingTimeMs,
      errorCount: this.errorCount,
      timestamp: new Date()
    });
  }

  recordError(): void {
    this.errorCount++;
  }

  async getErrorRate(): Promise<number> {
    const totalPosts = this.metrics.reduce((sum, m) => sum + m.postsProcessed, 0);
    return totalPosts > 0 ? this.errorCount / totalPosts : 0;
  }

  getRecentMetrics(limit: number = 100): MetricsData[] {
    return this.metrics.slice(-limit);
  }

  getStatus(): string {
    return this.isInitialized ? 'Active' : 'Not Initialized';
  }
}
