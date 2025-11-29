/**
 * =========================================
 * PERFORMANCE MONITOR
 * =========================================
 * Divine world-class performance monitoring for encryption operations
 * Real-time metrics, latency tracking, and throughput analysis
 */

import { Logger } from '../utils/Logger';
import { MonitoringConfig } from '../types';

export interface EncryptionMetrics {
  timestamp: number;
  dataType: string;
  dataSize: number;
  processingTime: number;
  success: boolean;
  error?: string;
  throughput: number; // operations per second
}

export interface DecryptionMetrics {
  timestamp: number;
  dataType: string;
  dataSize: number;
  processingTime: number;
  success: boolean;
  error?: string;
  throughput: number; // operations per second
}

export interface BatchOperationMetrics {
  timestamp: number;
  operation: 'encrypt' | 'decrypt';
  batchSize: number;
  processingTime: number;
  success: boolean;
  error?: string;
  averageDataSize: number;
  throughput: number; // operations per second
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  encryption: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageLatency: number;
    averageThroughput: number;
    dataTypes: Record<string, {
      count: number;
      averageSize: number;
      averageLatency: number;
    }>;
    errorRate: number;
  };
  decryption: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageLatency: number;
    averageThroughput: number;
    dataTypes: Record<string, {
      count: number;
      averageSize: number;
      averageLatency: number;
    }>;
    errorRate: number;
  };
  batch: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageBatchSize: number;
    averageLatency: number;
    averageThroughput: number;
    errorRate: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}

/**
 * Advanced performance monitor for encryption operations
 */
export class PerformanceMonitor {
  private logger: Logger;
  private config: MonitoringConfig;

  // Metrics storage
  private encryptionMetrics: EncryptionMetrics[] = [];
  private decryptionMetrics: DecryptionMetrics[] = [];
  private batchMetrics: BatchOperationMetrics[] = [];

  // Performance tracking
  private metricsTimer?: NodeJS.Timeout;
  private lastCleanup: number = 0;

  constructor(config: MonitoringConfig) {
    this.logger = new Logger('PerformanceMonitor');
    this.config = config;

    if (config.metrics.enabled) {
      this.startMetricsCollection();
    }
  }

  /**
   * Initialize the performance monitor
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Performance Monitor...', {
      collectionInterval: this.config.metrics.collectionInterval,
    });

    this.logger.info('✅ Performance Monitor initialized successfully');
  }

  /**
   * Shutdown the performance monitor
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Performance Monitor...');

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    this.cleanupOldMetrics();
    this.logger.info('✅ Performance Monitor shutdown successfully');
  }

  /**
   * Record encryption operation metrics
   */
  recordEncryption(metrics: Omit<EncryptionMetrics, 'timestamp' | 'throughput'>): void {
    const now = Date.now();
    const throughput = 1000 / metrics.processingTime; // operations per second

    const fullMetrics: EncryptionMetrics = {
      ...metrics,
      timestamp: now,
      throughput,
    };

    this.encryptionMetrics.push(fullMetrics);

    // Check for alerting thresholds
    if (this.config.alerting.enabled) {
      this.checkAlertingThresholds('encryption', fullMetrics);
    }

    this.logger.debug('Encryption metrics recorded', {
      dataType: metrics.dataType,
      processingTime: metrics.processingTime,
      throughput,
      success: metrics.success,
    });
  }

  /**
   * Record decryption operation metrics
   */
  recordDecryption(metrics: Omit<DecryptionMetrics, 'timestamp' | 'throughput'>): void {
    const now = Date.now();
    const throughput = 1000 / metrics.processingTime; // operations per second

    const fullMetrics: DecryptionMetrics = {
      ...metrics,
      timestamp: now,
      throughput,
    };

    this.decryptionMetrics.push(fullMetrics);

    // Check for alerting thresholds
    if (this.config.alerting.enabled) {
      this.checkAlertingThresholds('decryption', fullMetrics);
    }

    this.logger.debug('Decryption metrics recorded', {
      dataType: metrics.dataType,
      processingTime: metrics.processingTime,
      throughput,
      success: metrics.success,
    });
  }

  /**
   * Record batch operation metrics
   */
  recordBatchEncryption(metrics: Omit<BatchOperationMetrics, 'timestamp' | 'throughput'>): void {
    const now = Date.now();
    const throughput = (metrics.batchSize * 1000) / metrics.processingTime; // operations per second

    const fullMetrics: BatchOperationMetrics = {
      ...metrics,
      timestamp: now,
      throughput,
    };

    this.batchMetrics.push(fullMetrics);

    this.logger.debug('Batch encryption metrics recorded', {
      batchSize: metrics.batchSize,
      processingTime: metrics.processingTime,
      throughput,
      success: metrics.success,
    });
  }

  /**
   * Record batch decryption metrics
   */
  recordBatchDecryption(metrics: Omit<BatchOperationMetrics, 'timestamp' | 'throughput'>): void {
    const now = Date.now();
    const throughput = (metrics.batchSize * 1000) / metrics.processingTime; // operations per second

    const fullMetrics: BatchOperationMetrics = {
      ...metrics,
      timestamp: now,
      throughput,
    };

    this.batchMetrics.push(fullMetrics);

    this.logger.debug('Batch decryption metrics recorded', {
      batchSize: metrics.batchSize,
      processingTime: metrics.processingTime,
      throughput,
      success: metrics.success,
    });
  }

  /**
   * Get current metrics
   */
  async getMetrics(): Promise<{
    encryption: {
      totalOperations: number;
      successfulOperations: number;
      failedOperations: number;
      averageLatency: number;
      averageThroughput: number;
      errorRate: number;
      recentOperations: EncryptionMetrics[];
    };
    decryption: {
      totalOperations: number;
      successfulOperations: number;
      failedOperations: number;
      averageLatency: number;
      averageThroughput: number;
      errorRate: number;
      recentOperations: DecryptionMetrics[];
    };
    batch: {
      totalOperations: number;
      successfulOperations: number;
      failedOperations: number;
      averageLatency: number;
      averageThroughput: number;
      errorRate: number;
      recentOperations: BatchOperationMetrics[];
    };
  }> {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour

    // Filter recent metrics
    const recentEncryption = this.encryptionMetrics.filter(m => m.timestamp > oneHourAgo);
    const recentDecryption = this.decryptionMetrics.filter(m => m.timestamp > oneHourAgo);
    const recentBatch = this.batchMetrics.filter(m => m.timestamp > oneHourAgo);

    return {
      encryption: {
        totalOperations: this.encryptionMetrics.length,
        successfulOperations: this.encryptionMetrics.filter(m => m.success).length,
        failedOperations: this.encryptionMetrics.filter(m => !m.success).length,
        averageLatency: this.calculateAverageLatency(recentEncryption),
        averageThroughput: this.calculateAverageThroughput(recentEncryption),
        errorRate: this.calculateErrorRate(recentEncryption),
        recentOperations: recentEncryption.slice(-100), // Last 100 operations
      },
      decryption: {
        totalOperations: this.decryptionMetrics.length,
        successfulOperations: this.decryptionMetrics.filter(m => m.success).length,
        failedOperations: this.decryptionMetrics.filter(m => !m.success).length,
        averageLatency: this.calculateAverageLatency(recentDecryption),
        averageThroughput: this.calculateAverageThroughput(recentDecryption),
        errorRate: this.calculateErrorRate(recentDecryption),
        recentOperations: recentDecryption.slice(-100), // Last 100 operations
      },
      batch: {
        totalOperations: this.batchMetrics.length,
        successfulOperations: this.batchMetrics.filter(m => m.success).length,
        failedOperations: this.batchMetrics.filter(m => !m.success).length,
        averageLatency: this.calculateAverageLatency(recentBatch),
        averageThroughput: this.calculateAverageBatchThroughput(recentBatch),
        errorRate: this.calculateErrorRate(recentBatch),
        recentOperations: recentBatch.slice(-100), // Last 100 operations
      },
    };
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(periodHours: number = 24): Promise<PerformanceReport> {
    const now = Date.now();
    const startTime = now - (periodHours * 3600000);

    const encryptionMetrics = this.encryptionMetrics.filter(m => m.timestamp > startTime);
    const decryptionMetrics = this.decryptionMetrics.filter(m => m.timestamp > startTime);
    const batchMetrics = this.batchMetrics.filter(m => m.timestamp > startTime);

    return {
      period: {
        start: new Date(startTime),
        end: new Date(now),
      },
      encryption: this.calculateOperationStats(encryptionMetrics),
      decryption: this.calculateOperationStats(decryptionMetrics),
      batch: this.calculateBatchStats(batchMetrics),
      system: {
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user + process.cpuUsage().system,
        activeConnections: 0, // Would need to track from HTTP server
      },
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, this.config.metrics.collectionInterval);
  }

  /**
   * Cleanup old metrics
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const cutoff = now - (24 * 3600000); // Keep 24 hours of metrics

    this.encryptionMetrics = this.encryptionMetrics.filter(m => m.timestamp > cutoff);
    this.decryptionMetrics = this.decryptionMetrics.filter(m => m.timestamp > cutoff);
    this.batchMetrics = this.batchMetrics.filter(m => m.timestamp > cutoff);

    this.lastCleanup = now;
  }

  /**
   * Check alerting thresholds
   */
  private checkAlertingThresholds(operation: 'encryption' | 'decryption', metrics: any): void {
    const thresholds = this.config.alerting.thresholds;

    if (operation === 'encryption' || operation === 'decryption') {
      if (metrics.processingTime > thresholds.averageLatency) {
        this.logger.warn('Performance threshold exceeded', {
          operation,
          metric: 'latency',
          value: metrics.processingTime,
          threshold: thresholds.averageLatency,
        });
      }
    }

    if (!metrics.success) {
      const errorCount = operation === 'encryption' ?
        this.encryptionMetrics.filter(m => !m.success).length :
        this.decryptionMetrics.filter(m => !m.success).length;

      if (errorCount > thresholds.errorRate * (operation === 'encryption' ?
        this.encryptionMetrics.length : this.decryptionMetrics.length)) {
        this.logger.error('Error rate threshold exceeded', {
          operation,
          errorCount,
          totalCount: operation === 'encryption' ?
            this.encryptionMetrics.length : this.decryptionMetrics.length,
          threshold: thresholds.errorRate,
        });
      }
    }
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(metrics: (EncryptionMetrics | DecryptionMetrics | BatchOperationMetrics)[]): number {
    if (metrics.length === 0) return 0;

    const totalLatency = metrics.reduce((sum, m) => sum + m.processingTime, 0);
    return totalLatency / metrics.length;
  }

  /**
   * Calculate average throughput
   */
  private calculateAverageThroughput(metrics: (EncryptionMetrics | DecryptionMetrics)[]): number {
    if (metrics.length === 0) return 0;

    const totalThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0);
    return totalThroughput / metrics.length;
  }

  /**
   * Calculate average batch throughput
   */
  private calculateAverageBatchThroughput(metrics: BatchOperationMetrics[]): number {
    if (metrics.length === 0) return 0;

    const totalThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0);
    return totalThroughput / metrics.length;
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(metrics: (EncryptionMetrics | DecryptionMetrics | BatchOperationMetrics)[]): number {
    if (metrics.length === 0) return 0;

    const errorCount = metrics.filter(m => !m.success).length;
    return errorCount / metrics.length;
  }

  /**
   * Calculate operation statistics
   */
  private calculateOperationStats(metrics: (EncryptionMetrics | DecryptionMetrics)[]): any {
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageLatency: 0,
        averageThroughput: 0,
        errorRate: 0,
        dataTypes: {},
      };
    }

    const successfulOps = metrics.filter(m => m.success).length;
    const failedOps = metrics.filter(m => !m.success).length;

    // Group by data type
    const dataTypeGroups: Record<string, (EncryptionMetrics | DecryptionMetrics)[]> = {};
    metrics.forEach(m => {
      if (!dataTypeGroups[m.dataType]) {
        dataTypeGroups[m.dataType] = [];
      }
      dataTypeGroups[m.dataType].push(m);
    });

    const dataTypes: Record<string, any> = {};
    for (const [dataType, typeMetrics] of Object.entries(dataTypeGroups)) {
      dataTypes[dataType] = {
        count: typeMetrics.length,
        averageSize: typeMetrics.reduce((sum, m) => sum + m.dataSize, 0) / typeMetrics.length,
        averageLatency: this.calculateAverageLatency(typeMetrics),
      };
    }

    return {
      totalOperations: metrics.length,
      successfulOperations: successfulOps,
      failedOperations: failedOps,
      averageLatency: this.calculateAverageLatency(metrics),
      averageThroughput: this.calculateAverageThroughput(metrics),
      errorRate: this.calculateErrorRate(metrics),
      dataTypes,
    };
  }

  /**
   * Calculate batch statistics
   */
  private calculateBatchStats(metrics: BatchOperationMetrics[]): any {
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageBatchSize: 0,
        averageLatency: 0,
        averageThroughput: 0,
        errorRate: 0,
      };
    }

    const successfulOps = metrics.filter(m => m.success).length;
    const failedOps = metrics.filter(m => !m.success).length;

    return {
      totalOperations: metrics.length,
      successfulOperations: successfulOps,
      failedOperations: failedOps,
      averageBatchSize: metrics.reduce((sum, m) => sum + m.batchSize, 0) / metrics.length,
      averageLatency: this.calculateAverageLatency(metrics),
      averageThroughput: this.calculateAverageBatchThroughput(metrics),
      errorRate: this.calculateErrorRate(metrics),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
    try {
      const metrics = await this.getMetrics();

      // Check if error rates are within acceptable limits
      const encryptionErrorRate = metrics.encryption.errorRate;
      const decryptionErrorRate = metrics.decryption.errorRate;
      const batchErrorRate = metrics.batch.errorRate;

      const maxErrorRate = 0.05; // 5% error rate threshold

      if (encryptionErrorRate > maxErrorRate || decryptionErrorRate > maxErrorRate || batchErrorRate > maxErrorRate) {
        return {
          status: 'unhealthy',
          details: `Error rates exceeded threshold: encryption=${encryptionErrorRate}, decryption=${decryptionErrorRate}, batch=${batchErrorRate}`,
        };
      }

      // Check if average latency is within acceptable limits
      const avgLatency = (metrics.encryption.averageLatency + metrics.decryption.averageLatency) / 2;
      const maxLatency = 100; // 100ms threshold

      if (avgLatency > maxLatency) {
        return {
          status: 'unhealthy',
          details: `Average latency exceeded threshold: ${avgLatency}ms > ${maxLatency}ms`,
        };
      }

      return { status: 'healthy' };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: error.message,
      };
    }
  }
}
