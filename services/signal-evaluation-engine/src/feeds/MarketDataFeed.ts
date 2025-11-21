/**
 * =========================================
 * MARKET DATA FEEDS ENGINE
 * =========================================
 * High-performance WebSocket connections to exchanges
 * with sub-second latency and resilient failover
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { Logger } from '../utils/Logger';
import type {
  ExchangeConfig,
  OrderBookUpdate,
  TradeUpdate,
  QuoteUpdate,
  TickerUpdate,
  KlineUpdate,
  FeedHealth,
  LatencyRequirements,
  MarketDataFeedInterface
} from './types';

export class MarketDataFeedClass extends EventEmitter {
  private logger: Logger;
  public config: ExchangeConfig; // Changed to public to allow access from FeedManager
  private isInitialized: boolean = false;
  private isConnected: boolean = false;

  // Connection management
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastPong: Date = new Date();

  // Sequence tracking for validation
  private expectedSequence: number = 0;
  private receivedSequence: number = 0;

  // Performance monitoring
  private messageCount: number = 0;
  private errorCount: number = 0;
  private startTime: Date = new Date();
  private lastMessageTime: Date = new Date();

  // Buffering for network partitions
  private messageBuffer: MarketDataFeedInterface[] = [];
  private bufferSize: number = 1000;
  private replayInProgress: boolean = false;

  // Subscriptions
  private subscriptions: Set<string> = new Set();

  constructor(config: ExchangeConfig) {
    super();
    this.logger = new Logger(`MarketDataFeed:${config.name}`);
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing market data feed...');

      // Reset state
      this.messageCount = 0;
      this.errorCount = 0;
      this.startTime = new Date();
      this.lastMessageTime = new Date();
      this.expectedSequence = 0;
      this.receivedSequence = 0;

      this.isInitialized = true;
      this.logger.info('✅ Market data feed initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize market data feed', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Market data feed is not initialized');
    }

    try {
      this.logger.info('Starting market data feed connection...');
      await this.connect();
      this.logger.info('✅ Market data feed started successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to start market data feed', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping market data feed...');

      // Clear timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      // Close WebSocket connection
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.isConnected = false;
      this.isInitialized = false;

      this.logger.info('✅ Market data feed stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop market data feed', error);
      throw error;
    }
  }

  /**
   * Subscribe to market data streams
   */
  subscribe(streams: string[]): void {
    if (!this.isConnected) {
      throw new Error('Cannot subscribe: not connected to exchange');
    }

    // Add to subscription set
    streams.forEach(stream => this.subscriptions.add(stream));

    // Send subscription message
    const subscriptionMessage = this.createSubscriptionMessage(streams);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(subscriptionMessage));
      this.logger.debug('Subscription sent', { streams });
    }
  }

  /**
   * Unsubscribe from market data streams
   */
  unsubscribe(streams: string[]): void {
    // Remove from subscription set
    streams.forEach(stream => this.subscriptions.delete(stream));

    // Send unsubscription message
    const unsubscriptionMessage = this.createUnsubscriptionMessage(streams);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(unsubscriptionMessage));
      this.logger.debug('Unsubscription sent', { streams });
    }
  }

  /**
   * Get current health status
   */
  getHealth(): FeedHealth {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();
    const uptimeHours = uptime / (1000 * 60 * 60);

    return {
      feedType: 'market',
      provider: this.config.name,
      status: this.calculateHealthStatus(),
      latency: this.calculateAverageLatency(),
      lastUpdate: this.lastMessageTime,
      errorRate: uptimeHours > 0 ? (this.errorCount / uptimeHours) : 0,
      throughput: uptimeHours > 0 ? (this.messageCount / uptimeHours) : 0,
      uptime: 100, // Simplified - would calculate actual uptime
      reconnectCount: 0, // Would track actual reconnects
      bufferSize: this.messageBuffer.length
    };
  }

  /**
   * Create subscription message for exchange
   */
  private createSubscriptionMessage(streams: string[]): any {
    // Exchange-specific subscription format
    switch (this.config.name.toLowerCase()) {
      case 'binance':
        return {
          method: 'SUBSCRIBE',
          params: streams,
          id: Date.now()
        };

      case 'coinbase':
        return {
          type: 'subscribe',
          channels: streams.map(stream => ({ name: stream.split(':')[0], product_ids: [stream.split(':')[1]] }))
        };

      case 'kraken':
        return {
          event: 'subscribe',
          pair: streams.map(stream => stream.split(':')[1]),
          subscription: { name: streams[0].split(':')[0] }
        };

      default:
        return { action: 'subscribe', streams };
    }
  }

  /**
   * Create unsubscription message for exchange
   */
  private createUnsubscriptionMessage(streams: string[]): any {
    switch (this.config.name.toLowerCase()) {
      case 'binance':
        return {
          method: 'UNSUBSCRIBE',
          params: streams,
          id: Date.now()
        };

      case 'coinbase':
        return {
          type: 'unsubscribe',
          channels: streams.map(stream => ({ name: stream.split(':')[0], product_ids: [stream.split(':')[1]] }))
        };

      case 'kraken':
        return {
          event: 'unsubscribe',
          pair: streams.map(stream => stream.split(':')[1]),
          subscription: { name: streams[0].split(':')[0] }
        };

      default:
        return { action: 'unsubscribe', streams };
    }
  }

  /**
   * Connect to exchange WebSocket
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.logger.debug('Connecting to exchange WebSocket', { url: this.config.wsUrl });

        this.ws = new WebSocket(this.config.wsUrl);

        this.ws.on('open', () => {
          this.onConnected();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.onMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          this.onError(error);
        });

        this.ws.on('close', (code: number, reason: string) => {
          this.onDisconnected(code, reason);
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * Handle successful connection
   */
  private onConnected(): void {
    this.logger.info('Connected to exchange WebSocket');
    this.isConnected = true;
    this.lastPong = new Date();

    // Start heartbeat
    this.startHeartbeat();

    // Replay buffered messages if any
    this.replayBufferedMessages();

    this.emit('connected');
  }

  /**
   * Handle incoming messages
   */
  private onMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      this.processMessage(message);
    } catch (error: any) {
      this.logger.error('Failed to parse message', { error: error.message, data: data.toString() });
      this.errorCount++;
    }
  }

  /**
   * Process incoming message
   */
  private async processMessage(message: any): Promise<void> {
    this.messageCount++;
    this.lastMessageTime = new Date();

    // Update sequence tracking
    if (message.sequence !== undefined) {
      this.validateSequence(message.sequence);
    }

    // Process different message types
    const feedData = this.parseMessage(message);

    if (feedData) {
      // Add to buffer for potential replay
      this.addToBuffer(feedData);

      // Emit the feed data
      this.emit('feed', feedData);

      // Emit specific event types
      this.emit(feedData.type, feedData);
    }

    // Handle heartbeat responses
    if (message.type === 'pong' || message.event === 'heartbeat') {
      this.lastPong = new Date();
    }
  }

  /**
   * Parse exchange-specific message format
   */
  private parseMessage(message: any): MarketDataFeedInterface | null {
    const timestamp = new Date();

    switch (this.config.name.toLowerCase()) {
      case 'binance':
        return this.parseBinanceMessage(message, timestamp);

      case 'coinbase':
        return this.parseCoinbaseMessage(message, timestamp);

      case 'kraken':
        return this.parseKrakenMessage(message, timestamp);

      default:
        return this.parseGenericMessage(message, timestamp);
    }
  }

  /**
   * Parse Binance-specific message
   */
  private parseBinanceMessage(message: any, timestamp: Date): MarketDataFeedInterface | null {
    if (message.e === 'aggTrade') {
      return {
        exchange: 'binance',
        symbol: message.s,
        type: 'trade',
        data: {
          tradeId: message.a,
          price: parseFloat(message.p),
          quantity: parseFloat(message.q),
          side: message.m ? 'sell' : 'buy',
          timestamp: new Date(message.T)
        },
        timestamp,
        sequenceNumber: message.a
      };
    }

    if (message.e === 'depthUpdate') {
      return {
        exchange: 'binance',
        symbol: message.s,
        type: 'orderbook',
        data: {
          bids: message.b.map((bid: string[]) => ({
            price: parseFloat(bid[0]),
            quantity: parseFloat(bid[1])
          })),
          asks: message.a.map((ask: string[]) => ({
            price: parseFloat(ask[0]),
            quantity: parseFloat(ask[1])
          })),
          sequenceNumber: message.u
        },
        timestamp,
        sequenceNumber: message.u
      };
    }

    return null;
  }

  /**
   * Parse Coinbase-specific message
   */
  private parseCoinbaseMessage(message: any, timestamp: Date): MarketDataFeedInterface | null {
    if (message.type === 'match') {
      return {
        exchange: 'coinbase',
        symbol: message.product_id,
        type: 'trade',
        data: {
          tradeId: message.trade_id,
          price: parseFloat(message.price),
          quantity: parseFloat(message.size),
          side: message.side,
          timestamp: new Date(message.time)
        },
        timestamp
      };
    }

    if (message.type === 'l2update') {
      return {
        exchange: 'coinbase',
        symbol: message.product_id,
        type: 'orderbook',
        data: {
          bids: message.changes.filter((change: string[]) => change[0] === 'buy')
            .map((change: string[]) => ({
              price: parseFloat(change[1]),
              quantity: parseFloat(change[2])
            })),
          asks: message.changes.filter((change: string[]) => change[0] === 'sell')
            .map((change: string[]) => ({
              price: parseFloat(change[1]),
              quantity: parseFloat(change[2])
            }))
        },
        timestamp
      };
    }

    return null;
  }

  /**
   * Parse Kraken-specific message
   */
  private parseKrakenMessage(message: any, timestamp: Date): MarketDataFeedInterface | null {
    if (message[1] === 'trade') {
      const tradeData = message[2];
      return {
        exchange: 'kraken',
        symbol: tradeData[0],
        type: 'trade',
        data: {
          price: parseFloat(tradeData[1]),
          quantity: parseFloat(tradeData[2]),
          timestamp: new Date(tradeData[3] * 1000)
        },
        timestamp
      };
    }

    return null;
  }

  /**
   * Parse generic message format
   */
  private parseGenericMessage(message: any, timestamp: Date): MarketDataFeedInterface | null {
    // Generic parsing fallback
    return {
      exchange: this.config.name,
      symbol: message.symbol || 'unknown',
      type: message.type || 'unknown',
      data: message,
      timestamp
    };
  }

  /**
   * Validate message sequence numbers
   */
  private validateSequence(receivedSequence: number): void {
    if (this.expectedSequence === 0) {
      this.expectedSequence = receivedSequence;
      this.receivedSequence = receivedSequence;
    } else {
      this.receivedSequence = receivedSequence;
      if (receivedSequence !== this.expectedSequence) {
        this.logger.warn('Sequence gap detected', {
          expected: this.expectedSequence,
          received: receivedSequence
        });
        // Handle sequence gap - could trigger replay
      }
      this.expectedSequence = receivedSequence + 1;
    }
  }

  /**
   * Handle connection errors
   */
  private onError(error: Error): void {
    this.logger.error('WebSocket error', error);
    this.errorCount++;
    this.isConnected = false;

    // Schedule reconnection
    this.scheduleReconnect();
  }

  /**
   * Handle disconnection
   */
  private onDisconnected(code: number, reason: string): void {
    this.logger.warn('Disconnected from exchange', { code, reason });
    this.isConnected = false;

    // Schedule reconnection unless it's a clean close
    if (code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff calculation
    const baseDelay = this.config.retryConfig.baseDelay;
    const maxDelay = this.config.retryConfig.maxDelay;
    const backoffMultiplier = this.config.retryConfig.backoffMultiplier;
    const attempt = Math.min(this.errorCount, 10); // Cap at 10 attempts

    const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

    this.logger.debug('Scheduling reconnection', { delay, attempt });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        this.logger.error('Reconnection failed', error);
      });
    }, delay);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping
        this.ws.send(JSON.stringify({ type: 'ping' }));

        // Check if pong was received recently
        const timeSinceLastPong = Date.now() - this.lastPong.getTime();
        if (timeSinceLastPong > this.config.heartbeatInterval * 2) {
          this.logger.warn('Heartbeat timeout - connection may be stale');
          this.ws.close();
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Add message to buffer for potential replay
   */
  private addToBuffer(feedData: MarketDataFeedInterface): void {
    this.messageBuffer.push(feedData);

    // Maintain buffer size
    if (this.messageBuffer.length > this.bufferSize) {
      this.messageBuffer.shift();
    }
  }

  /**
   * Replay buffered messages after reconnection
   */
  private replayBufferedMessages(): void {
    if (this.replayInProgress || this.messageBuffer.length === 0) {
      return;
    }

    this.replayInProgress = true;
    this.logger.info('Starting message replay', { bufferSize: this.messageBuffer.length });

    // Replay messages in order
    this.messageBuffer.forEach(feedData => {
      this.emit('feed', feedData);
      this.emit(feedData.type, feedData);
    });

    // Clear buffer after replay
    this.messageBuffer = [];
    this.replayInProgress = false;

    this.logger.info('Message replay completed');
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(): number {
    // Simplified latency calculation
    // In production, would track actual message round-trip times
    return 50; // Placeholder
  }

  /**
   * Calculate health status based on metrics
   */
  private calculateHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' | 'offline' {
    if (!this.isConnected) {
      return 'offline';
    }

    const timeSinceLastMessage = Date.now() - this.lastMessageTime.getTime();
    const errorRate = this.errorCount / Math.max(1, this.messageCount);

    if (timeSinceLastMessage > 30000) { // 30 seconds
      return 'unhealthy';
    }

    if (errorRate > 0.1 || timeSinceLastMessage > 10000) { // 10 seconds
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Check if feed meets latency requirements
   */
  meetsLatencyRequirements(requirements: LatencyRequirements): boolean {
    const currentLatency = this.calculateAverageLatency();
    const requiredLatency = requirements.marketData;

    return currentLatency <= requiredLatency;
  }

  /**
   * Get current status
   */
  getStatus(): string {
    return this.isConnected ? 'Connected' : 'Disconnected';
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    connected: boolean;
    messageCount: number;
    errorCount: number;
    subscriptions: number;
    bufferSize: number;
    uptime: number;
  } {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      connected: this.isConnected,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      subscriptions: this.subscriptions.size,
      bufferSize: this.messageBuffer.length,
      uptime
    };
  }
}
