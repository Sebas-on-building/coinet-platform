/**
 * WebSocket Manager Service
 * Optimizes WebSocket connection utilization for high-frequency updates
 * Manages multiple concurrent connections and subscriptions efficiently
 */

import EventEmitter from 'eventemitter3';
import { CoinGeckoWebSocketClient, SubscriptionOptions } from '../providers/coingecko-websocket';
import { WebSocketConfig, PriceUpdateEvent, DataSource } from '../types';
import { logger } from '../utils/logger';

export interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  totalSubscriptions: number;
  subscriptionsByConnection: Map<number, number>;
  utilizationPercentage: number;
  lastUpdate: Date | null;
}

export interface SubscriptionPriority {
  symbol: string;
  priority: 'high' | 'medium' | 'low';
  updateFrequency?: number; // Expected updates per minute
}

export class WebSocketManagerService extends EventEmitter {
  private wsClient?: CoinGeckoWebSocketClient;
  private config: WebSocketConfig;
  private apiKey: string;
  private subscribedSymbols: Set<string>;
  private priorityMap: Map<string, SubscriptionPriority>;
  private stats: WebSocketStats;
  private isActive: boolean;

  constructor(config: WebSocketConfig, apiKey: string) {
    super();
    this.config = config;
    this.apiKey = apiKey;
    this.subscribedSymbols = new Set();
    this.priorityMap = new Map();
    this.isActive = false;

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      totalSubscriptions: 0,
      subscriptionsByConnection: new Map(),
      utilizationPercentage: 0,
      lastUpdate: null,
    };

    logger.info('WebSocket Manager initialized', {
      maxConnections: config.maxConnections,
      maxSubscriptionsPerChannel: config.maxSubscriptionsPerChannel,
      maxTotalSubscriptions: config.maxConnections * config.maxSubscriptionsPerChannel,
    });
  }

  /**
   * Initialize WebSocket client
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.warn('WebSocket is disabled in configuration');
      return;
    }

    this.wsClient = new CoinGeckoWebSocketClient(this.config, this.apiKey);

    // Forward events
    this.wsClient.on('price_update', (event: PriceUpdateEvent) => {
      this.handlePriceUpdate(event);
    });

    this.wsClient.on('error', (error: Error) => {
      logger.error('WebSocket error', { error: error.message });
      this.emit('error', error);
    });

    this.isActive = true;
    logger.info('WebSocket Manager initialized successfully');
  }

  /**
   * Handle price update from WebSocket
   */
  private handlePriceUpdate(event: PriceUpdateEvent): void {
    this.stats.lastUpdate = new Date();
    this.emit('price_update', event);
  }

  /**
   * Subscribe to symbols with priority handling
   */
  async subscribe(
    symbols: string[],
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    if (!this.wsClient) {
      throw new Error('WebSocket client not initialized');
    }

    // Filter out already subscribed symbols
    const newSymbols = symbols.filter((s) => !this.subscribedSymbols.has(s));
    
    if (newSymbols.length === 0) {
      logger.info('All symbols already subscribed');
      return;
    }

    // Check capacity
    const maxCapacity = this.config.maxConnections * this.config.maxSubscriptionsPerChannel;
    const currentSubscriptions = this.subscribedSymbols.size;
    const availableCapacity = maxCapacity - currentSubscriptions;

    if (newSymbols.length > availableCapacity) {
      logger.warn('Subscription capacity exceeded', {
        requested: newSymbols.length,
        available: availableCapacity,
        current: currentSubscriptions,
        max: maxCapacity,
      });

      // Prioritize based on priority level
      await this.optimizeSubscriptions(newSymbols, priority);
      return;
    }

    // Subscribe to new symbols
    await this.wsClient.subscribe({
      coins: newSymbols,
      channels: ['price'],
    });

    // Track subscriptions
    newSymbols.forEach((symbol) => {
      this.subscribedSymbols.add(symbol);
      this.priorityMap.set(symbol, {
        symbol,
        priority,
      });
    });

    // Update stats
    this.updateStats();

    logger.info('WebSocket subscriptions added', {
      added: newSymbols.length,
      total: this.subscribedSymbols.size,
      utilization: this.stats.utilizationPercentage.toFixed(2) + '%',
    });
  }

  /**
   * Optimize subscriptions when at capacity
   * Remove low-priority subscriptions to make room for high-priority ones
   */
  private async optimizeSubscriptions(
    newSymbols: string[],
    newPriority: 'high' | 'medium' | 'low'
  ): Promise<void> {
    if (!this.wsClient) return;

    // Only optimize if new priority is higher than some existing
    if (newPriority === 'low') {
      logger.warn('Cannot add low-priority symbols when at capacity');
      return;
    }

    // Find low-priority subscriptions to remove
    const priorityOrder = { low: 0, medium: 1, high: 2 };
    const newPriorityValue = priorityOrder[newPriority];

    const symbolsToRemove: string[] = [];
    for (const [symbol, info] of this.priorityMap.entries()) {
      if (priorityOrder[info.priority] < newPriorityValue) {
        symbolsToRemove.push(symbol);
        if (symbolsToRemove.length >= newSymbols.length) {
          break;
        }
      }
    }

    if (symbolsToRemove.length === 0) {
      logger.warn('No lower-priority symbols to remove');
      return;
    }

    // Unsubscribe from low-priority symbols
    await this.unsubscribe(symbolsToRemove);

    // Subscribe to new high-priority symbols
    await this.subscribe(newSymbols, newPriority);

    logger.info('WebSocket subscriptions optimized', {
      removed: symbolsToRemove.length,
      added: newSymbols.length,
    });
  }

  /**
   * Unsubscribe from symbols
   */
  async unsubscribe(symbols: string[]): Promise<void> {
    if (!this.wsClient) {
      throw new Error('WebSocket client not initialized');
    }

    const subscribedSymbols = symbols.filter((s) => this.subscribedSymbols.has(s));

    if (subscribedSymbols.length === 0) {
      return;
    }

    await this.wsClient.unsubscribe(subscribedSymbols);

    subscribedSymbols.forEach((symbol) => {
      this.subscribedSymbols.delete(symbol);
      this.priorityMap.delete(symbol);
    });

    this.updateStats();

    logger.info('WebSocket subscriptions removed', {
      removed: subscribedSymbols.length,
      total: this.subscribedSymbols.size,
    });
  }

  /**
   * Batch subscribe with automatic distribution across connections
   */
  async batchSubscribe(
    symbolsByPriority: {
      high?: string[];
      medium?: string[];
      low?: string[];
    }
  ): Promise<void> {
    // Subscribe in priority order
    if (symbolsByPriority.high && symbolsByPriority.high.length > 0) {
      await this.subscribe(symbolsByPriority.high, 'high');
    }

    if (symbolsByPriority.medium && symbolsByPriority.medium.length > 0) {
      await this.subscribe(symbolsByPriority.medium, 'medium');
    }

    if (symbolsByPriority.low && symbolsByPriority.low.length > 0) {
      await this.subscribe(symbolsByPriority.low, 'low');
    }

    logger.info('Batch subscription completed', {
      high: symbolsByPriority.high?.length || 0,
      medium: symbolsByPriority.medium?.length || 0,
      low: symbolsByPriority.low?.length || 0,
      total: this.subscribedSymbols.size,
    });
  }

  /**
   * Update subscription statistics
   */
  private updateStats(): void {
    if (!this.wsClient) {
      return;
    }

    const wsStats = this.wsClient.getStats();
    const maxCapacity = this.config.maxConnections * this.config.maxSubscriptionsPerChannel;

    this.stats = {
      totalConnections: wsStats.totalConnections,
      activeConnections: wsStats.connections.filter((c: any) => c.readyState === 1).length,
      totalSubscriptions: this.subscribedSymbols.size,
      subscriptionsByConnection: new Map(
        wsStats.connections.map((c: any) => [c.id, c.subscriptions])
      ),
      utilizationPercentage: (this.subscribedSymbols.size / maxCapacity) * 100,
      lastUpdate: this.stats.lastUpdate,
    };
  }

  /**
   * Get current statistics
   */
  getStats(): WebSocketStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  /**
   * Get subscription priorities
   */
  getSubscriptionPriorities(): Map<string, SubscriptionPriority> {
    return new Map(this.priorityMap);
  }

  /**
   * Check if at capacity
   */
  isAtCapacity(): boolean {
    const maxCapacity = this.config.maxConnections * this.config.maxSubscriptionsPerChannel;
    return this.subscribedSymbols.size >= maxCapacity;
  }

  /**
   * Get available capacity
   */
  getAvailableCapacity(): number {
    const maxCapacity = this.config.maxConnections * this.config.maxSubscriptionsPerChannel;
    return Math.max(0, maxCapacity - this.subscribedSymbols.size);
  }

  /**
   * Recommend optimal subscription distribution
   */
  getOptimalDistribution(): {
    recommended: {
      high: number;
      medium: number;
      low: number;
    };
    current: {
      high: number;
      medium: number;
      low: number;
    };
  } {
    const maxCapacity = this.config.maxConnections * this.config.maxSubscriptionsPerChannel;

    // Current distribution
    const current = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const info of this.priorityMap.values()) {
      current[info.priority]++;
    }

    // Recommended distribution (60% high, 30% medium, 10% low)
    const recommended = {
      high: Math.floor(maxCapacity * 0.6),
      medium: Math.floor(maxCapacity * 0.3),
      low: Math.floor(maxCapacity * 0.1),
    };

    return { recommended, current };
  }

  /**
   * Check WebSocket health
   */
  isHealthy(): boolean {
    if (!this.wsClient || !this.isActive) {
      return false;
    }
    return this.wsClient.isHealthy();
  }

  /**
   * Disconnect and clean up
   */
  async disconnect(): Promise<void> {
    if (this.wsClient) {
      await this.wsClient.disconnect();
      this.wsClient = undefined;
    }

    this.subscribedSymbols.clear();
    this.priorityMap.clear();
    this.isActive = false;
    this.removeAllListeners();

    logger.info('WebSocket Manager disconnected');
  }
}

// Singleton instance
let wsManagerInstance: WebSocketManagerService | null = null;

export function getWebSocketManager(
  config?: WebSocketConfig,
  apiKey?: string
): WebSocketManagerService {
  if (!wsManagerInstance && config && apiKey) {
    wsManagerInstance = new WebSocketManagerService(config, apiKey);
  }
  
  if (!wsManagerInstance) {
    throw new Error('WebSocket Manager not initialized. Provide config and apiKey on first call.');
  }
  
  return wsManagerInstance;
}

export function resetWebSocketManager(): void {
  if (wsManagerInstance) {
    wsManagerInstance.disconnect();
    wsManagerInstance = null;
  }
}

export default getWebSocketManager;

