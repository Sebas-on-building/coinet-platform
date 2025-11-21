/**
 * =========================================
 * PRICE FEED MANAGER
 * =========================================
 * Advanced WebSocket manager for real-time cryptocurrency price feeds
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
  exchange: string;
  volume24h?: number;
  change24h?: number;
  bid?: number;
  ask?: number;
  high24h?: number;
  low24h?: number;
  source: 'websocket' | 'rest' | 'cached';
}

export interface WebSocketEndpoint {
  id: string;
  name: string;
  url: string;
  type: 'price' | 'orderbook' | 'trades';
  symbols: string[];
  reconnectDelay: number;
  heartbeatInterval: number;
  maxReconnectAttempts: number;
  rateLimit?: {
    messagesPerSecond: number;
    burstLimit: number;
  };
}

export interface ConnectionHealth {
  endpointId: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastHeartbeat: Date;
  messagesReceived: number;
  messagesPerSecond: number;
  latency: number;
  uptime: number;
  errors: number;
  reconnects: number;
}

export interface PriceFeedConfig {
  endpoints: WebSocketEndpoint[];
  bufferSize: number;
  maxLatency: number;
  failoverThreshold: number;
  healthCheckInterval: number;
}

export class PriceFeedManager extends EventEmitter {
  private logger: Logger;
  private config: PriceFeedConfig;
  private connections: Map<string, WebSocket> = new Map();
  private connectionHealth: Map<string, ConnectionHealth> = new Map();
  private messageBuffer: PriceData[] = [];
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: Date }> = new Map();
  private isRunning: boolean = false;

  // Performance tracking
  private totalMessages: number = 0;
  private startTime: number = Date.now();
  private latencyMeasurements: number[] = [];

  constructor(config: PriceFeedConfig) {
    super();
    this.logger = new Logger('PriceFeedManager');

    this.config = {
      bufferSize: 10000,
      maxLatency: 1000, // 1 second max latency
      failoverThreshold: 3, // 3 consecutive failures trigger failover
      healthCheckInterval: 30000, // 30 seconds
      ...config
    };
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting Price Feed Manager...');
      this.isRunning = true;

      // Initialize all endpoints
      for (const endpoint of this.config.endpoints) {
        await this.connectToEndpoint(endpoint);
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.logger.info(`✅ Price Feed Manager started with ${this.config.endpoints.length} endpoints`);

    } catch (error: any) {
      this.logger.error('❌ Failed to start Price Feed Manager', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Price Feed Manager...');
      this.isRunning = false;

      // Clear all timers
      for (const timer of this.reconnectTimers.values()) {
        clearTimeout(timer);
      }
      for (const timer of this.heartbeatTimers.values()) {
        clearTimeout(timer);
      }
      this.reconnectTimers.clear();
      this.heartbeatTimers.clear();

      // Close all connections
      for (const [endpointId, ws] of this.connections.entries()) {
        try {
          ws.close();
          this.updateConnectionHealth(endpointId, 'disconnected');
        } catch (error) {
          this.logger.error(`Failed to close connection to ${endpointId}`, error);
        }
      }
      this.connections.clear();

      this.logger.info('✅ Price Feed Manager stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop Price Feed Manager', error);
      throw error;
    }
  }

  /**
   * Subscribe to price updates for specific symbols
   */
  subscribe(symbols: string[]): void {
    this.logger.info(`Subscribing to symbols: ${symbols.join(', ')}`);

    for (const endpoint of this.config.endpoints) {
      const endpointSymbols = symbols.filter(symbol => endpoint.symbols.includes(symbol));

      if (endpointSymbols.length > 0 && this.connections.has(endpoint.id)) {
        const ws = this.connections.get(endpoint.id)!;

        try {
          // Send subscription message (format depends on exchange)
          const subscriptionMessage = this.buildSubscriptionMessage(endpoint, endpointSymbols);
          ws.send(JSON.stringify(subscriptionMessage));

          this.logger.debug(`Subscribed to ${endpointSymbols.length} symbols on ${endpoint.name}`);

        } catch (error: any) {
          this.logger.error(`Failed to subscribe to symbols on ${endpoint.name}`, error);
        }
      }
    }
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribe(symbols: string[]): void {
    this.logger.info(`Unsubscribing from symbols: ${symbols.join(', ')}`);

    for (const endpoint of this.config.endpoints) {
      const endpointSymbols = symbols.filter(symbol => endpoint.symbols.includes(symbol));

      if (endpointSymbols.length > 0 && this.connections.has(endpoint.id)) {
        const ws = this.connections.get(endpoint.id)!;

        try {
          const unsubscriptionMessage = this.buildUnsubscriptionMessage(endpoint, endpointSymbols);
          ws.send(JSON.stringify(unsubscriptionMessage));

          this.logger.debug(`Unsubscribed from ${endpointSymbols.length} symbols on ${endpoint.name}`);

        } catch (error: any) {
          this.logger.error(`Failed to unsubscribe from symbols on ${endpoint.name}`, error);
        }
      }
    }
  }

  /**
   * Get current price for a symbol (best effort from any source)
   */
  getCurrentPrice(symbol: string): PriceData | null {
    // Look for the most recent price data in buffer
    for (let i = this.messageBuffer.length - 1; i >= 0; i--) {
      const priceData = this.messageBuffer[i];
      if (priceData.symbol === symbol) {
        return priceData;
      }
    }
    return null;
  }

  /**
   * Get price history for a symbol
   */
  getPriceHistory(symbol: string, limit: number = 100): PriceData[] {
    return this.messageBuffer
      .filter(data => data.symbol === symbol)
      .slice(-limit);
  }

  /**
   * Get connection health for all endpoints
   */
  getConnectionHealth(): Record<string, ConnectionHealth> {
    const health: Record<string, ConnectionHealth> = {};

    for (const [endpointId, connectionHealth] of this.connectionHealth.entries()) {
      health[endpointId] = { ...connectionHealth };
    }

    return health;
  }

  /**
   * Get overall service health
   */
  getHealthStatus(): {
    isRunning: boolean;
    activeConnections: number;
    totalConnections: number;
    bufferSize: number;
    averageLatency: number;
    messagesPerSecond: number;
    uptime: number;
  } {
    const activeConnections = Array.from(this.connectionHealth.values())
      .filter(h => h.status === 'connected').length;

    const averageLatency = this.latencyMeasurements.length > 0
      ? this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length
      : 0;

    const uptime = Date.now() - this.startTime;
    const messagesPerSecond = this.totalMessages / Math.max(1, uptime / 1000);

    return {
      isRunning: this.isRunning,
      activeConnections,
      totalConnections: this.config.endpoints.length,
      bufferSize: this.messageBuffer.length,
      averageLatency,
      messagesPerSecond,
      uptime
    };
  }

  private async connectToEndpoint(endpoint: WebSocketEndpoint): Promise<void> {
    try {
      this.logger.info(`Connecting to ${endpoint.name} (${endpoint.url})`);

      // Initialize connection health
      this.connectionHealth.set(endpoint.id, {
        endpointId: endpoint.id,
        status: 'connecting',
        lastHeartbeat: new Date(),
        messagesReceived: 0,
        messagesPerSecond: 0,
        latency: 0,
        uptime: 0,
        errors: 0,
        reconnects: 0
      });

      const ws = new WebSocket(endpoint.url, {
        perMessageDeflate: false,
        handshakeTimeout: 10000,
        maxPayload: 1024 * 1024 // 1MB max payload
      });

      // Set up event handlers
      ws.on('open', () => this.onConnectionOpen(endpoint, ws));
      ws.on('message', (data) => this.onMessage(endpoint, data));
      ws.on('error', (error) => this.onConnectionError(endpoint, error));
      ws.on('close', (code, reason) => this.onConnectionClose(endpoint, code, reason));

      // Set up ping/pong for heartbeat
      ws.on('ping', (data) => {
        this.logger.debug(`Received ping from ${endpoint.name}`);
        ws.pong(data);
      });

      ws.on('pong', (data) => {
        this.updateConnectionHealth(endpoint.id, 'connected');
        this.measureLatency(endpoint.id);
      });

      this.connections.set(endpoint.id, ws);

    } catch (error: any) {
      this.logger.error(`Failed to connect to ${endpoint.name}`, error);
      this.updateConnectionHealth(endpoint.id, 'error');
      this.scheduleReconnect(endpoint);
    }
  }

  private onConnectionOpen(endpoint: WebSocketEndpoint, ws: WebSocket): void {
    this.logger.info(`✅ Connected to ${endpoint.name}`);

    this.updateConnectionHealth(endpoint.id, 'connected');

    // Start heartbeat
    const heartbeatTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, endpoint.heartbeatInterval);

    this.heartbeatTimers.set(endpoint.id, heartbeatTimer);

    // Send initial subscription
    this.subscribe(endpoint.symbols);

    this.emit('connection-established', { endpoint, timestamp: new Date() });
  }

  private onMessage(endpoint: WebSocketEndpoint, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      this.processMessage(endpoint, message);

    } catch (error: any) {
      this.logger.error(`Failed to parse message from ${endpoint.name}`, error);
    }
  }

  private onConnectionError(endpoint: WebSocketEndpoint, error: Error): void {
    this.logger.error(`Connection error for ${endpoint.name}`, error);

    const health = this.connectionHealth.get(endpoint.id);
    if (health) {
      health.errors++;
      health.status = 'error';
    }

    this.emit('connection-error', { endpoint, error, timestamp: new Date() });
  }

  private onConnectionClose(endpoint: WebSocketEndpoint, code: number, reason: Buffer): void {
    this.logger.warn(`Connection closed for ${endpoint.name}: ${code} - ${reason.toString()}`);

    this.updateConnectionHealth(endpoint.id, 'disconnected');

    // Clear timers
    const heartbeatTimer = this.heartbeatTimers.get(endpoint.id);
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      this.heartbeatTimers.delete(endpoint.id);
    }

    // Schedule reconnection if still running
    if (this.isRunning) {
      this.scheduleReconnect(endpoint);
    }

    this.emit('connection-closed', { endpoint, code, reason: reason.toString(), timestamp: new Date() });
  }

  private processMessage(endpoint: WebSocketEndpoint, message: any): void {
    try {
      const priceData = this.parseMessage(endpoint, message);

      if (priceData) {
        // Update connection health
        const health = this.connectionHealth.get(endpoint.id);
        if (health) {
          health.messagesReceived++;
          health.lastHeartbeat = new Date();
        }

        // Add to buffer
        this.messageBuffer.push(priceData);

        // Maintain buffer size
        if (this.messageBuffer.length > this.config.bufferSize) {
          this.messageBuffer.shift();
        }

        // Update performance metrics
        this.totalMessages++;

        // Emit price update
        this.emit('price-update', { data: priceData, endpoint, timestamp: new Date() });

        // Check for latency issues
        const latency = Date.now() - priceData.timestamp.getTime();
        if (latency > this.config.maxLatency) {
          this.logger.warn(`High latency detected for ${priceData.symbol}: ${latency}ms`);
          this.emit('latency-warning', { symbol: priceData.symbol, latency, endpoint });
        }
      }

    } catch (error: any) {
      this.logger.error(`Failed to process message from ${endpoint.name}`, error);
    }
  }

  private parseMessage(endpoint: WebSocketEndpoint, message: any): PriceData | null {
    // Parse different message formats based on endpoint type
    switch (endpoint.type) {
      case 'price':
        return this.parsePriceMessage(message);
      case 'orderbook':
        return this.parseOrderbookMessage(message);
      case 'trades':
        return this.parseTradeMessage(message);
      default:
        return null;
    }
  }

  private parsePriceMessage(message: any): PriceData | null {
    // Handle different price feed formats
    if (message.symbol && message.price) {
      return {
        symbol: message.symbol,
        price: parseFloat(message.price),
        timestamp: new Date(message.timestamp || Date.now()),
        exchange: message.exchange || 'unknown',
        volume24h: message.volume24h ? parseFloat(message.volume24h) : undefined,
        change24h: message.change24h ? parseFloat(message.change24h) : undefined,
        bid: message.bid ? parseFloat(message.bid) : undefined,
        ask: message.ask ? parseFloat(message.ask) : undefined,
        high24h: message.high24h ? parseFloat(message.high24h) : undefined,
        low24h: message.low24h ? parseFloat(message.low24h) : undefined,
        source: 'websocket'
      };
    }

    // Handle Binance format
    if (message.e && message.e === '24hrTicker') {
      return {
        symbol: message.s,
        price: parseFloat(message.c),
        timestamp: new Date(message.E),
        exchange: 'binance',
        volume24h: parseFloat(message.v),
        change24h: parseFloat(message.P),
        bid: parseFloat(message.b),
        ask: parseFloat(message.a),
        high24h: parseFloat(message.h),
        low24h: parseFloat(message.l),
        source: 'websocket'
      };
    }

    return null;
  }

  private parseOrderbookMessage(message: any): PriceData | null {
    // Orderbook messages typically don't contain price data directly
    // Extract best bid/ask if available
    if (message.bids && message.asks && message.symbol) {
      const bestBid = parseFloat(message.bids[0]?.[0] || '0');
      const bestAsk = parseFloat(message.asks[0]?.[0] || '0');

      return {
        symbol: message.symbol,
        price: (bestBid + bestAsk) / 2, // Mid price
        timestamp: new Date(message.timestamp || Date.now()),
        exchange: message.exchange || 'unknown',
        bid: bestBid,
        ask: bestAsk,
        source: 'websocket'
      };
    }

    return null;
  }

  private parseTradeMessage(message: any): PriceData | null {
    // Trade messages contain individual trade data
    if (message.symbol && message.price && message.quantity) {
      return {
        symbol: message.symbol,
        price: parseFloat(message.price),
        timestamp: new Date(message.timestamp || Date.now()),
        exchange: message.exchange || 'unknown',
        volume24h: parseFloat(message.quantity),
        source: 'websocket'
      };
    }

    return null;
  }

  private buildSubscriptionMessage(endpoint: WebSocketEndpoint, symbols: string[]): any {
    // Build subscription message based on exchange format
    switch (endpoint.id) {
      case 'binance':
        return {
          method: 'SUBSCRIBE',
          params: symbols.map(symbol => `${symbol.toLowerCase()}@ticker`),
          id: Date.now()
        };
      case 'coinbase':
        return {
          type: 'subscribe',
          channels: [{ name: 'ticker', product_ids: symbols }]
        };
      case 'kraken':
        return {
          event: 'subscribe',
          pair: symbols,
          subscription: { name: 'ticker' }
        };
      default:
        return { action: 'subscribe', symbols };
    }
  }

  private buildUnsubscriptionMessage(endpoint: WebSocketEndpoint, symbols: string[]): any {
    // Build unsubscription message based on exchange format
    switch (endpoint.id) {
      case 'binance':
        return {
          method: 'UNSUBSCRIBE',
          params: symbols.map(symbol => `${symbol.toLowerCase()}@ticker`),
          id: Date.now()
        };
      case 'coinbase':
        return {
          type: 'unsubscribe',
          channels: [{ name: 'ticker', product_ids: symbols }]
        };
      case 'kraken':
        return {
          event: 'unsubscribe',
          pair: symbols,
          subscription: { name: 'ticker' }
        };
      default:
        return { action: 'unsubscribe', symbols };
    }
  }

  private scheduleReconnect(endpoint: WebSocketEndpoint): void {
    const health = this.connectionHealth.get(endpoint.id);
    if (!health) return;

    health.reconnects++;

    // Exponential backoff with jitter
    const baseDelay = endpoint.reconnectDelay;
    const maxDelay = baseDelay * Math.pow(2, Math.min(health.reconnects, 6)); // Max 64x delay
    const jitter = Math.random() * 0.1 * maxDelay;
    const delay = Math.min(maxDelay + jitter, 300000); // Max 5 minutes

    this.logger.info(`Scheduling reconnect to ${endpoint.name} in ${Math.round(delay / 1000)}s (attempt ${health.reconnects})`);

    const timer = setTimeout(() => {
      if (this.isRunning) {
        this.connectToEndpoint(endpoint);
      }
    }, delay);

    this.reconnectTimers.set(endpoint.id, timer);
  }

  private updateConnectionHealth(endpointId: string, status: ConnectionHealth['status']): void {
    const health = this.connectionHealth.get(endpointId);
    if (!health) return;

    health.status = status;
    health.lastHeartbeat = new Date();

    if (status === 'connected') {
      health.uptime = Date.now() - this.startTime;
    }
  }

  private measureLatency(endpointId: string): void {
    const startTime = Date.now();

    // Send a ping and measure response time
    const ws = this.connections.get(endpointId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.ping();

      // The pong handler will calculate the actual latency
      setTimeout(() => {
        const latency = Date.now() - startTime;
        this.latencyMeasurements.push(latency);

        // Keep only last 100 measurements
        if (this.latencyMeasurements.length > 100) {
          this.latencyMeasurements.shift();
        }

        const health = this.connectionHealth.get(endpointId);
        if (health) {
          health.latency = latency;
        }
      }, 100);
    }
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private performHealthChecks(): void {
    try {
      for (const [endpointId, health] of this.connectionHealth.entries()) {
        const ws = this.connections.get(endpointId);
        const now = Date.now();

        // Check connection status
        if (ws?.readyState !== WebSocket.OPEN) {
          if (health.status === 'connected') {
            this.logger.warn(`Connection to ${endpointId} appears stale`);
            health.status = 'disconnected';
          }
          continue;
        }

        // Check heartbeat
        const timeSinceHeartbeat = now - health.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > 60000) { // 1 minute without heartbeat
          this.logger.warn(`No heartbeat from ${endpointId} for ${Math.round(timeSinceHeartbeat / 1000)}s`);
          health.status = 'error';
          continue;
        }

        // Calculate messages per second
        const uptimeSeconds = (now - this.startTime) / 1000;
        health.messagesPerSecond = health.messagesReceived / Math.max(1, uptimeSeconds);

        // Check for high error rates
        if (health.errors > 10) {
          this.logger.warn(`High error rate for ${endpointId}: ${health.errors} errors`);
        }
      }

      // Check for failover conditions
      this.checkFailoverConditions();

    } catch (error: any) {
      this.logger.error('Failed to perform health checks', error);
    }
  }

  private checkFailoverConditions(): void {
    for (const [endpointId, health] of this.connectionHealth.entries()) {
      if (health.status === 'error' && health.errors >= this.config.failoverThreshold) {
        this.logger.warn(`Failover threshold reached for ${endpointId}, attempting recovery`);

        // Try to reconnect
        const endpoint = this.config.endpoints.find(e => e.id === endpointId);
        if (endpoint) {
          this.scheduleReconnect(endpoint);
        }
      }
    }
  }

  getStatus(): string {
    const activeCount = Array.from(this.connectionHealth.values())
      .filter(h => h.status === 'connected').length;

    return this.isRunning ? `Running (${activeCount}/${this.config.endpoints.length} active)` : 'Stopped';
  }
}
