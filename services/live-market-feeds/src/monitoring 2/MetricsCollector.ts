/**
 * =========================================
 * METRICS COLLECTOR
 * =========================================
 * Collects and exposes metrics for the live market data feeds
 */

import { EventEmitter } from 'events';
import { MarketData } from '../types';

export interface MetricsData {
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  connectionCount: number;
  bufferSize: number;
  uptime: number;
  totalMessages: number;
  totalErrors: number;
}

export class MetricsCollector extends EventEmitter {
  private startTime: Date;
  private totalMessages: number = 0;
  private totalErrors: number = 0;
  private totalLatency: number = 0;
  private messageCount: number = 0;
  private isRunning: boolean = false;

  constructor() {
    super();
    this.startTime = new Date();
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
    this.resetCounters();
  }

  /**
   * Stop metrics collection
   */
  async stop(): Promise<void> {
    this.isRunning = false;
  }

  /**
   * Record a data point
   */
  recordDataPoint(data: MarketData): void {
    if (!this.isRunning) return;

    this.totalMessages++;
    this.messageCount++;
  }

  /**
   * Record latency measurement
   */
  recordLatency(latency: number): void {
    if (!this.isRunning) return;

    this.totalLatency += latency;
    this.messageCount++;
  }

  /**
   * Record an error
   */
  incrementError(): void {
    if (!this.isRunning) return;

    this.totalErrors++;
  }

  /**
   * Record a message
   */
  recordMessage(): void {
    if (!this.isRunning) return;

    this.totalMessages++;
    this.messageCount++;
  }

  /**
   * Record a reconnection
   */
  incrementReconnection(): void {
    // Could track reconnections separately if needed
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MetricsData {
    const uptime = Date.now() - this.startTime.getTime();
    const messagesPerSecond = this.messageCount / (uptime / 1000);
    const averageLatency = this.messageCount > 0 ? this.totalLatency / this.messageCount : 0;
    const errorRate = this.totalMessages > 0 ? this.totalErrors / this.totalMessages : 0;

    return {
      messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      averageLatency: Math.round(averageLatency),
      errorRate: Math.round(errorRate * 10000) / 10000, // 4 decimal places
      connectionCount: 0, // Would be tracked separately
      bufferSize: 0, // Would be tracked separately
      uptime,
      totalMessages: this.totalMessages,
      totalErrors: this.totalErrors
    };
  }

  /**
   * Reset counters (for testing or periodic reset)
   */
  resetCounters(): void {
    this.totalMessages = 0;
    this.totalErrors = 0;
    this.totalLatency = 0;
    this.messageCount = 0;
  }

  /**
   * Shutdown metrics collector
   */
  async shutdown(): Promise<void> {
    await this.stop();
  }
}
