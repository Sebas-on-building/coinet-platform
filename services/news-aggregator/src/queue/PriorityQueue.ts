/**
 * =========================================
 * PRIORITY QUEUE
 * =========================================
 * High-performance priority queue for breaking news processing
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type { NewsArticle, NewsClassification, UrgencyLevel } from '../types';

export interface QueueItem {
  id: string;
  article: NewsArticle;
  priority: number;
  timestamp: Date;
  processingAttempts: number;
  maxRetries: number;
  retryDelay: number;
  nextRetryAt?: Date;
}

export interface QueueStats {
  totalItems: number;
  highPriorityItems: number;
  mediumPriorityItems: number;
  lowPriorityItems: number;
  processingItems: number;
  failedItems: number;
  averageProcessingTime: number;
  queueSize: number;
}

export class PriorityQueue extends EventEmitter {
  private logger: Logger;
  private isRunning: boolean = false;
  private queues: Map<UrgencyLevel, QueueItem[]> = new Map();
  private processing: Set<string> = new Set();
  private failed: Map<string, QueueItem> = new Map();
  private processingTimes: number[] = [];
  private maxConcurrent: number;
  private maxRetries: number;
  private baseRetryDelay: number;

  // Priority levels (higher number = higher priority)
  private static readonly PRIORITY_LEVELS = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25
  };

  constructor(options: {
    maxConcurrent?: number;
    maxRetries?: number;
    baseRetryDelay?: number;
  } = {}) {
    super();
    this.logger = new Logger('PriorityQueue');

    this.maxConcurrent = options.maxConcurrent || 10;
    this.maxRetries = options.maxRetries || 3;
    this.baseRetryDelay = options.baseRetryDelay || 5000; // 5 seconds

    // Initialize priority queues
    this.queues.set('critical', []);
    this.queues.set('high', []);
    this.queues.set('medium', []);
    this.queues.set('low', []);
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting Priority Queue...');
      this.isRunning = true;

      // Start processing loop
      this.startProcessingLoop();

      this.logger.info('✅ Priority Queue started successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to start Priority Queue', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Priority Queue...');
      this.isRunning = false;

      // Wait for current processing to complete
      await this.waitForProcessingComplete();

      this.logger.info('✅ Priority Queue stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Priority Queue', error);
      throw error;
    }
  }

  /**
   * Add article to queue with calculated priority
   */
  enqueue(article: NewsArticle): void {
    const priority = this.calculatePriority(article);
    const urgency = this.determineUrgencyLevel(priority);

    const queueItem: QueueItem = {
      id: article.id,
      article,
      priority,
      timestamp: new Date(),
      processingAttempts: 0,
      maxRetries: this.maxRetries,
      retryDelay: this.baseRetryDelay
    };

    // Add to appropriate priority queue
    const queue = this.queues.get(urgency)!;
    queue.push(queueItem);

    // Sort queue by priority (highest first)
    queue.sort((a, b) => b.priority - a.priority);

    this.logger.debug(`Enqueued article ${article.id} with priority ${priority} (${urgency})`);

    // Emit event for immediate processing if it's high priority
    if (urgency === 'critical' || urgency === 'high') {
      this.emit('high-priority-item', queueItem);
    }

    this.emit('item-enqueued', { queueItem, urgency });
  }

  /**
   * Get next item from highest priority queue
   */
  private getNextItem(): QueueItem | null {
    // Process in priority order: critical -> high -> medium -> low
    for (const urgency of ['critical', 'high', 'medium', 'low'] as UrgencyLevel[]) {
      const queue = this.queues.get(urgency)!;
      if (queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }

  /**
   * Main processing loop
   */
  private startProcessingLoop(): void {
    const processNext = async () => {
      if (!this.isRunning || this.processing.size >= this.maxConcurrent) {
        return;
      }

      const item = this.getNextItem();
      if (!item) {
        // No items to process, wait a bit and check again
        setTimeout(processNext, 100);
        return;
      }

      // Skip if already processing
      if (this.processing.has(item.id)) {
        setTimeout(processNext, 100);
        return;
      }

      await this.processItem(item);
      setTimeout(processNext, 10); // Small delay to prevent tight loop
    };

    // Start multiple concurrent processors
    for (let i = 0; i < this.maxConcurrent; i++) {
      processNext();
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueueItem): Promise<void> {
    const startTime = Date.now();

    try {
      this.processing.add(item.id);
      item.processingAttempts++;

      this.logger.debug(`Processing queue item ${item.id} (attempt ${item.processingAttempts})`);

      // Emit event for external processing
      this.emit('item-processing', item);

      // Simulate processing time (in real implementation, this would be the actual processing)
      await this.delay(Math.random() * 100 + 50); // 50-150ms

      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);

      // Keep only last 1000 processing times for average calculation
      if (this.processingTimes.length > 1000) {
        this.processingTimes.shift();
      }

      // Success
      this.processing.delete(item.id);
      this.emit('item-processed', { item, processingTime, success: true });

    } catch (error: any) {
      this.logger.error(`Failed to process queue item ${item.id}`, error);

      // Handle retry logic
      if (item.processingAttempts < item.maxRetries) {
        item.retryDelay = Math.min(item.retryDelay * 2, 60000); // Exponential backoff, max 1 minute
        item.nextRetryAt = new Date(Date.now() + item.retryDelay);

        // Move to failed queue for retry
        this.failed.set(item.id, item);

        this.emit('item-failed', {
          item,
          error: error.message,
          willRetry: true,
          nextRetryAt: item.nextRetryAt
        });

      } else {
        // Max retries reached, permanent failure
        this.processing.delete(item.id);
        this.emit('item-failed', {
          item,
          error: error.message,
          willRetry: false,
          permanent: true
        });
      }
    }
  }

  /**
   * Calculate priority score for an article
   */
  private calculatePriority(article: NewsArticle): number {
    let priority = 0;

    // Base priority from urgency level
    switch (article.urgency) {
      case 'critical':
        priority += PriorityQueue.PRIORITY_LEVELS.critical;
        break;
      case 'high':
        priority += PriorityQueue.PRIORITY_LEVELS.high;
        break;
      case 'medium':
        priority += PriorityQueue.PRIORITY_LEVELS.medium;
        break;
      case 'low':
        priority += PriorityQueue.PRIORITY_LEVELS.low;
        break;
    }

    // Boost for breaking news classifications
    if (article.classification === 'breaking_news') {
      priority += 20;
    } else if (article.classification === 'protocol_exploit') {
      priority += 15;
    } else if (article.classification === 'regulatory') {
      priority += 10;
    }

    // Boost for market impact
    priority += article.marketImpact.volatility * 10;
    priority += article.marketImpact.relevance * 5;

    // Boost for multiple token mentions (indicates broader impact)
    priority += Math.min(article.keyFacts.tokens.length * 2, 10);

    // Freshness boost (newer articles get slight priority)
    const ageHours = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 1) {
      priority += 5; // Very recent
    } else if (ageHours < 6) {
      priority += 2; // Recent
    }

    return Math.min(priority, 100); // Cap at 100
  }

  /**
   * Determine urgency level from priority score
   */
  private determineUrgencyLevel(priority: number): UrgencyLevel {
    if (priority >= 80) return 'critical';
    if (priority >= 60) return 'high';
    if (priority >= 40) return 'medium';
    return 'low';
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const criticalQueue = this.queues.get('critical') || [];
    const highQueue = this.queues.get('high') || [];
    const mediumQueue = this.queues.get('medium') || [];
    const lowQueue = this.queues.get('low') || [];

    const totalItems = criticalQueue.length + highQueue.length + mediumQueue.length + lowQueue.length;
    const averageProcessingTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;

    return {
      totalItems,
      highPriorityItems: criticalQueue.length + highQueue.length,
      mediumPriorityItems: mediumQueue.length,
      lowPriorityItems: lowQueue.length,
      processingItems: this.processing.size,
      failedItems: this.failed.size,
      averageProcessingTime,
      queueSize: totalItems
    };
  }

  /**
   * Get items waiting for retry
   */
  getRetryItems(): QueueItem[] {
    const now = new Date();
    return Array.from(this.failed.values()).filter(item =>
      item.nextRetryAt && item.nextRetryAt <= now
    );
  }

  /**
   * Move retry items back to main queue
   */
  processRetryItems(): void {
    const retryItems = this.getRetryItems();

    for (const item of retryItems) {
      this.failed.delete(item.id);
      this.enqueue(item.article);
    }

    if (retryItems.length > 0) {
      this.logger.info(`Moved ${retryItems.length} items back to processing queue`);
    }
  }

  /**
   * Clear all queues
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
    this.processing.clear();
    this.failed.clear();
    this.processingTimes.length = 0;

    this.logger.info('Priority queue cleared');
  }

  private async waitForProcessingComplete(): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.processing.size > 0 && (Date.now() - startTime) < maxWait) {
      await this.delay(100);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): string {
    return this.isRunning ? 'Running' : 'Stopped';
  }
}
