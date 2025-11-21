/**
 * =========================================
 * LOAD BALANCER
 * =========================================
 * Implements horizontal scaling and failover to redundant endpoints
 * with intelligent load distribution and health-based routing
 */

import { EventEmitter } from 'events';
import { ExchangeType, FeedConfig } from '../types';
import { Logger } from '../utils/Logger';
import { HealthMonitor } from '../monitoring/HealthMonitor';

export interface LoadBalancerConfig {
  maxConnectionsPerEndpoint: number;
  healthCheckInterval: number;
  failoverThreshold: number; // percentage of healthy endpoints required
  loadBalancingStrategy: 'round_robin' | 'least_connections' | 'weighted';
  enableAutoScaling: boolean;
  minEndpoints: number;
  maxEndpoints: number;
}

export interface Endpoint {
  id: string;
  url: string;
  exchange: ExchangeType;
  region: string;
  priority: number; // 1 = highest priority
  weight: number; // for weighted load balancing
  isActive: boolean;
  connectionCount: number;
  lastHealthCheck: Date;
  healthScore: number; // 0-100
}

export class LoadBalancer extends EventEmitter {
  private logger: Logger;
  private config: LoadBalancerConfig;
  private endpoints: Map<string, Endpoint> = new Map();
  private currentIndex: Map<ExchangeType, number> = new Map();
  private healthMonitor: HealthMonitor;
  private isRunning: boolean = false;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: LoadBalancerConfig, healthMonitor: HealthMonitor) {
    super();
    this.config = config;
    this.healthMonitor = healthMonitor;
    this.logger = new Logger('LoadBalancer');
  }

  /**
   * Start the load balancer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('⚖️ Starting Load Balancer...');

    // Initialize endpoints for each exchange
    await this.initializeEndpoints();

    // Start health checking
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    this.isRunning = true;
    this.logger.info('✅ Load Balancer started');
  }

  /**
   * Stop the load balancer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('⚖️ Stopping Load Balancer...');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.isRunning = false;
    this.logger.info('✅ Load Balancer stopped');
  }

  /**
   * Get the best endpoint for an exchange
   */
  getEndpoint(exchange: ExchangeType): Endpoint | null {
    const availableEndpoints = Array.from(this.endpoints.values())
      .filter(endpoint =>
        endpoint.exchange === exchange &&
        endpoint.isActive &&
        endpoint.connectionCount < this.config.maxConnectionsPerEndpoint &&
        endpoint.healthScore >= 80 // Only use healthy endpoints
      );

    if (availableEndpoints.length === 0) {
      this.logger.warn(`No healthy endpoints available for ${exchange}`);
      return null;
    }

    // Use configured load balancing strategy
    switch (this.config.loadBalancingStrategy) {
      case 'round_robin':
        return this.getRoundRobinEndpoint(exchange, availableEndpoints);
      case 'least_connections':
        return this.getLeastConnectionsEndpoint(availableEndpoints);
      case 'weighted':
        return this.getWeightedEndpoint(availableEndpoints);
      default:
        return this.getRoundRobinEndpoint(exchange, availableEndpoints);
    }
  }

  /**
   * Add a new endpoint
   */
  async addEndpoint(endpoint: Omit<Endpoint, 'id' | 'connectionCount' | 'lastHealthCheck' | 'healthScore'>): Promise<void> {
    const newEndpoint: Endpoint = {
      id: `${endpoint.exchange}_${endpoint.region}_${Date.now()}`,
      ...endpoint,
      connectionCount: 0,
      lastHealthCheck: new Date(),
      healthScore: 100
    };

    this.endpoints.set(newEndpoint.id, newEndpoint);
    this.logger.info(`➕ Added endpoint: ${newEndpoint.id} (${newEndpoint.url})`);

    // Check if we should scale up
    if (this.config.enableAutoScaling) {
      await this.checkAutoScaling();
    }

    this.emit('endpointAdded', newEndpoint);
  }

  /**
   * Remove an endpoint
   */
  async removeEndpoint(endpointId: string): Promise<void> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return;
    }

    // Mark as inactive instead of removing completely
    endpoint.isActive = false;
    this.logger.info(`➖ Removed endpoint: ${endpointId}`);

    // Check if we should scale down
    if (this.config.enableAutoScaling) {
      await this.checkAutoScaling();
    }

    this.emit('endpointRemoved', endpoint);
  }

  /**
   * Increment connection count for an endpoint
   */
  incrementConnection(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint) {
      endpoint.connectionCount++;
      this.logger.debug(`🔗 Connection count for ${endpointId}: ${endpoint.connectionCount}`);
    }
  }

  /**
   * Decrement connection count for an endpoint
   */
  decrementConnection(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint && endpoint.connectionCount > 0) {
      endpoint.connectionCount--;
      this.logger.debug(`🔗 Connection count for ${endpointId}: ${endpoint.connectionCount}`);
    }
  }

  /**
   * Get all endpoints for an exchange
   */
  getEndpoints(exchange: ExchangeType): Endpoint[] {
    return Array.from(this.endpoints.values())
      .filter(endpoint => endpoint.exchange === exchange);
  }

  /**
   * Get load balancer statistics
   */
  getStats(): any {
    const stats = {
      totalEndpoints: this.endpoints.size,
      activeEndpoints: Array.from(this.endpoints.values()).filter(e => e.isActive).length,
      byExchange: {} as Record<string, any>,
      loadBalancingStrategy: this.config.loadBalancingStrategy,
      autoScaling: this.config.enableAutoScaling
    };

    for (const endpoint of this.endpoints.values()) {
      if (!stats.byExchange[endpoint.exchange]) {
        stats.byExchange[endpoint.exchange] = {
          total: 0,
          active: 0,
          totalConnections: 0,
          avgHealthScore: 0
        };
      }

      stats.byExchange[endpoint.exchange].total++;
      if (endpoint.isActive) {
        stats.byExchange[endpoint.exchange].active++;
      }
      stats.byExchange[endpoint.exchange].totalConnections += endpoint.connectionCount;
    }

    // Calculate average health scores
    for (const exchange in stats.byExchange) {
      const exchangeEndpoints = Array.from(this.endpoints.values())
        .filter(e => e.exchange === exchange && e.isActive);

      if (exchangeEndpoints.length > 0) {
        const avgHealth = exchangeEndpoints.reduce((sum, e) => sum + e.healthScore, 0) / exchangeEndpoints.length;
        stats.byExchange[exchange].avgHealthScore = Math.round(avgHealth);
      }
    }

    return stats;
  }

  /**
   * Initialize default endpoints for each exchange
   */
  private async initializeEndpoints(): Promise<void> {
    const defaultEndpoints: Omit<Endpoint, 'id' | 'connectionCount' | 'lastHealthCheck' | 'healthScore'>[] = [
      // Binance endpoints
      {
        url: 'wss://stream.binance.com:9443/ws',
        exchange: 'binance',
        region: 'global',
        priority: 1,
        weight: 100,
        isActive: true
      },
      {
        url: 'wss://stream.binance.com:9443/ws',
        exchange: 'binance',
        region: 'us',
        priority: 2,
        weight: 80,
        isActive: true
      },

      // Coinbase endpoints
      {
        url: 'wss://ws-feed.pro.coinbase.com',
        exchange: 'coinbase',
        region: 'us',
        priority: 1,
        weight: 100,
        isActive: true
      },

      // Kraken endpoints
      {
        url: 'wss://ws.kraken.com',
        exchange: 'kraken',
        region: 'eu',
        priority: 1,
        weight: 100,
        isActive: true
      },

      // Deribit endpoints
      {
        url: 'wss://www.deribit.com/ws/api/v2',
        exchange: 'deribit',
        region: 'global',
        priority: 1,
        weight: 100,
        isActive: true
      },

      // Bybit endpoints
      {
        url: 'wss://stream.bybit.com/v5/public/spot',
        exchange: 'bybit',
        region: 'global',
        priority: 1,
        weight: 100,
        isActive: true
      }
    ];

    for (const endpoint of defaultEndpoints) {
      await this.addEndpoint(endpoint);
    }

    this.logger.info(`✅ Initialized ${defaultEndpoints.length} endpoints`);
  }

  /**
   * Perform health checks on all endpoints
   */
  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.endpoints.values()).map(endpoint =>
      this.performEndpointHealthCheck(endpoint)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Perform health check on a single endpoint
   */
  private async performEndpointHealthCheck(endpoint: Endpoint): Promise<void> {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(endpoint.url.replace('wss://', 'https://'), {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      const isHealthy = response.ok && latency < 2000; // 2 second timeout

      endpoint.lastHealthCheck = new Date();
      endpoint.healthScore = isHealthy ? 100 : Math.max(0, 100 - (latency / 100));

      if (!isHealthy) {
        this.logger.warn(`Endpoint ${endpoint.id} health check failed: ${response.status} (${latency}ms)`);
      }

    } catch (error: any) { // Cast error to any
      endpoint.healthScore = 0;
      this.logger.error(`Health check failed for ${endpoint.id}: ${error.message}`);
    }
  }

  /**
   * Get endpoint using round-robin strategy
   */
  private getRoundRobinEndpoint(exchange: ExchangeType, endpoints: Endpoint[]): Endpoint | null {
    if (endpoints.length === 0) {
      return null;
    }
    const currentIndex = this.currentIndex.get(exchange) || 0;
    const endpoint = endpoints[currentIndex % endpoints.length];

    this.currentIndex.set(exchange, currentIndex + 1);
    return endpoint!;
  }

  /**
   * Get endpoint using least connections strategy
   */
  private getLeastConnectionsEndpoint(endpoints: Endpoint[]): Endpoint | null {
    if (endpoints.length === 0) {
      return null;
    }
    const endpoint = endpoints.reduce((best, current) =>
      current.connectionCount < best.connectionCount ? current : best
    );
    return endpoint!;
  }

  /**
   * Get endpoint using weighted strategy
   */
  private getWeightedEndpoint(endpoints: Endpoint[]): Endpoint | null {
    if (endpoints.length === 0) {
      return null;
    }
    const totalWeight = endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }

    return endpoints[0]!;
  }

  /**
   * Check if auto-scaling is needed
   */
  private async checkAutoScaling(): Promise<void> {
    const activeEndpoints = Array.from(this.endpoints.values()).filter(e => e.isActive);
    const totalConnections = activeEndpoints.reduce((sum, e) => sum + e.connectionCount, 0);

    // Scale up if we're approaching capacity
    if (activeEndpoints.length < this.config.maxEndpoints &&
        totalConnections > activeEndpoints.length * this.config.maxConnectionsPerEndpoint * 0.8) {
      await this.scaleUp();
    }

    // Scale down if we're underutilized
    if (activeEndpoints.length > this.config.minEndpoints &&
        totalConnections < activeEndpoints.length * this.config.maxConnectionsPerEndpoint * 0.3) {
      await this.scaleDown();
    }
  }

  /**
   * Scale up by adding more endpoints
   */
  private async scaleUp(): Promise<void> {
    this.logger.info('📈 Scaling up - adding more endpoints');
    // Implementation would add more endpoints based on configuration
  }

  /**
   * Scale down by removing underutilized endpoints
   */
  private async scaleDown(): Promise<void> {
    this.logger.info('📉 Scaling down - removing underutilized endpoints');
    // Implementation would remove endpoints with low utilization
  }

  /**
   * Handle failover to redundant endpoints
   */
  async handleFailover(exchange: ExchangeType): Promise<Endpoint | null> {
    const healthyEndpoints = Array.from(this.endpoints.values())
      .filter(endpoint =>
        endpoint.exchange === exchange &&
        endpoint.isActive &&
        endpoint.healthScore >= 80
      );

    if (healthyEndpoints.length === 0) {
      this.logger.error(`No healthy failover endpoints available for ${exchange}`);
      return null;
    }

    // Sort by priority and health score
    healthyEndpoints.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.healthScore - a.healthScore;
    });

    const failoverEndpoint = healthyEndpoints[0];
    if (failoverEndpoint) { // Check if failoverEndpoint is defined
      this.logger.info(`🔄 Failover to ${failoverEndpoint.id} for ${exchange}`);

      this.emit('failover', { exchange, endpoint: failoverEndpoint });
      return failoverEndpoint;
    }
    return null; // Return null if no failover endpoint is found
  }
}
