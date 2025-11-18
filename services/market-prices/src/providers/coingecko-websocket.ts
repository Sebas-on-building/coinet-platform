/**
 * CoinGecko WebSocket Client
 * Enterprise-grade real-time price updates with advanced reconnection logic,
 * exponential backoff, connection health monitoring, and automatic recovery
 */

import WebSocket from 'ws';
import EventEmitter from 'eventemitter3';
import {
  WebSocketConfig,
  DataSource,
  CoinGeckoWSMessage,
  PriceUpdateEvent,
  MarketPrice,
  PriceUpdateType,
} from '../types';
import { logger } from '../utils/logger';

export interface SubscriptionOptions {
  coins: string[];
  channels?: string[];
}

interface ConnectionMetadata {
  coins: string[];
  channels: string[];
  reconnectAttempts: number;
  lastMessageTime: number;
  connectionTime: number;
  messageCount: number;
  errorCount: number;
  lastError?: string;
}

export class CoinGeckoWebSocketClient extends EventEmitter {
  private config: WebSocketConfig;
  private connections: Map<number, WebSocket>;
  private subscriptions: Map<number, Set<string>>;
  private connectionMetadata: Map<number, ConnectionMetadata>;
  private connectionIndex: number;
  private reconnectTimers: Map<number, NodeJS.Timeout>;
  private heartbeatTimers: Map<number, NodeJS.Timeout>;
  private healthCheckTimer?: NodeJS.Timeout;
  private isShuttingDown: boolean;
  private apiKey: string;
  
  // Advanced reconnection parameters
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly BASE_RECONNECT_DELAY = 1000; // 1 second
  private readonly MAX_RECONNECT_DELAY = 60000; // 60 seconds
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds
  private readonly MESSAGE_TIMEOUT = 60000; // 60 seconds - if no message received, consider stale
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(config: WebSocketConfig, apiKey: string) {
    super();
    this.config = config;
    this.apiKey = apiKey;
    this.connections = new Map();
    this.subscriptions = new Map();
    this.connectionMetadata = new Map();
    this.reconnectTimers = new Map();
    this.heartbeatTimers = new Map();
    this.connectionIndex = 0;
    this.isShuttingDown = false;

    // Start global health check
    this.startHealthCheck();

    logger.info('CoinGecko WebSocket client initialized', {
      maxConnections: config.maxConnections,
      maxSubscriptionsPerChannel: config.maxSubscriptionsPerChannel,
      maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS,
      healthCheckInterval: this.HEALTH_CHECK_INTERVAL,
    });
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateReconnectDelay(attempts: number): number {
    const exponentialDelay = Math.min(
      this.BASE_RECONNECT_DELAY * Math.pow(2, attempts),
      this.MAX_RECONNECT_DELAY
    );
    
    // Add jitter (±20%) to prevent thundering herd
    const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Start global health check for all connections
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check on all connections
   */
  private performHealthCheck(): void {
    const now = Date.now();
    
    for (const [connectionId, metadata] of this.connectionMetadata.entries()) {
      const ws = this.connections.get(connectionId);
      
      // Check if connection is stale (no messages received)
      if (now - metadata.lastMessageTime > this.MESSAGE_TIMEOUT) {
        logger.warn(`Connection ${connectionId} is stale (no messages in ${this.MESSAGE_TIMEOUT}ms)`, {
          lastMessageTime: new Date(metadata.lastMessageTime),
          messageCount: metadata.messageCount,
        });
        
        // Force reconnection
        if (ws) {
          ws.terminate();
        }
        continue;
      }
      
      // Check if connection is in a bad state
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        logger.warn(`Connection ${connectionId} is in bad state`, {
          readyState: ws?.readyState,
        });
        
        // Trigger reconnection if not already scheduled
        if (!this.reconnectTimers.has(connectionId)) {
          this.handleClose(connectionId, metadata.coins, metadata.channels);
        }
      }
      
      // Log health metrics
      const uptime = now - metadata.connectionTime;
      const messagesPerSecond = metadata.messageCount / (uptime / 1000);
      
      logger.debug(`Connection ${connectionId} health metrics`, {
        uptime: Math.floor(uptime / 1000),
        messageCount: metadata.messageCount,
        messagesPerSecond: messagesPerSecond.toFixed(2),
        errorCount: metadata.errorCount,
        reconnectAttempts: metadata.reconnectAttempts,
      });
    }
  }

  /**
   * Connect to WebSocket and subscribe to channels
   */
  async subscribe(options: SubscriptionOptions): Promise<void> {
    if (!this.config.enabled) {
      logger.warn('WebSocket is disabled in configuration');
      return;
    }

    const { coins, channels = ['price'] } = options;

    // Calculate how many connections we need based on subscription limits
    const totalSubscriptions = coins.length;
    const connectionsNeeded = Math.ceil(
      totalSubscriptions / this.config.maxSubscriptionsPerChannel
    );

    if (connectionsNeeded > this.config.maxConnections) {
      throw new Error(
        `Cannot subscribe to ${totalSubscriptions} coins. ` +
        `Max allowed: ${this.config.maxConnections * this.config.maxSubscriptionsPerChannel}`
      );
    }

    logger.info('Creating WebSocket subscriptions', {
      coins: coins.length,
      channels,
      connectionsNeeded,
    });

    // Distribute subscriptions across connections
    const coinsPerConnection = Math.ceil(totalSubscriptions / connectionsNeeded);
    
    for (let i = 0; i < connectionsNeeded; i++) {
      const startIdx = i * coinsPerConnection;
      const endIdx = Math.min(startIdx + coinsPerConnection, coins.length);
      const coinsForConnection = coins.slice(startIdx, endIdx);

      await this.createConnection(coinsForConnection, channels);
    }
  }

  /**
   * Create a new WebSocket connection with timeout and metadata tracking
   */
  private async createConnection(
    coins: string[],
    channels: string[],
    reconnectAttempt: number = 0
  ): Promise<void> {
    const connectionId = this.connectionIndex++;
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.url}?api_key=${this.apiKey}`;
        const ws = new WebSocket(wsUrl, {
          handshakeTimeout: this.CONNECTION_TIMEOUT,
        });

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            logger.error(`Connection ${connectionId} timeout after ${this.CONNECTION_TIMEOUT}ms`);
            ws.terminate();
            reject(new Error('Connection timeout'));
          }
        }, this.CONNECTION_TIMEOUT);

        ws.on('open', () => {
          clearTimeout(connectionTimeout);
          
          logger.info(`WebSocket connection ${connectionId} opened`, {
            coins: coins.length,
            reconnectAttempt,
          });

          // Initialize metadata
          this.connectionMetadata.set(connectionId, {
            coins,
            channels,
            reconnectAttempts: reconnectAttempt,
            lastMessageTime: Date.now(),
            connectionTime: Date.now(),
            messageCount: 0,
            errorCount: 0,
          });

          this.connections.set(connectionId, ws);
          this.subscriptions.set(connectionId, new Set(coins));

          // Send subscription message
          const subscribeMsg: CoinGeckoWSMessage = {
            type: 'subscribe',
            event: 'subscribe',
            params: {
              coins,
              channels,
            },
          };

          ws.send(JSON.stringify(subscribeMsg));

          // Start heartbeat
          this.startHeartbeat(connectionId);

          resolve();
        });

        ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(connectionId, data);
        });

        ws.on('error', (error: Error) => {
          logger.error(`WebSocket connection ${connectionId} error`, {
            error: error.message,
          });
          this.emit('error', error);
        });

        ws.on('close', (code: number, reason: string) => {
          logger.warn(`WebSocket connection ${connectionId} closed`, {
            code,
            reason: reason.toString(),
          });

          this.handleClose(connectionId, coins, channels);
        });

        ws.on('ping', () => {
          ws.pong();
        });

      } catch (error) {
        logger.error(`Failed to create WebSocket connection ${connectionId}`, {
          error,
        });
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages with metadata tracking
   */
  private handleMessage(connectionId: number, data: WebSocket.Data): void {
    try {
      // Update metadata
      const metadata = this.connectionMetadata.get(connectionId);
      if (metadata) {
        metadata.lastMessageTime = Date.now();
        metadata.messageCount++;
      }

      const message: CoinGeckoWSMessage = JSON.parse(data.toString());

      logger.debug(`WebSocket message received on connection ${connectionId}`, {
        type: message.type,
        event: message.event,
      });

      switch (message.event) {
        case 'price_update':
          this.handlePriceUpdate(message);
          break;

        case 'subscribe':
          logger.info(`Subscription confirmed on connection ${connectionId}`);
          // Reset reconnect attempts on successful subscription
          if (metadata) {
            metadata.reconnectAttempts = 0;
          }
          break;

        case 'unsubscribe':
          logger.info(`Unsubscription confirmed on connection ${connectionId}`);
          break;

        case 'error':
          logger.error(`WebSocket error on connection ${connectionId}`, {
            error: message.error,
          });
          if (metadata) {
            metadata.errorCount++;
            metadata.lastError = message.error;
          }
          this.emit('error', new Error(message.error));
          break;

        case 'heartbeat':
          logger.debug(`Heartbeat received on connection ${connectionId}`);
          break;

        default:
          logger.debug(`Unknown message type on connection ${connectionId}`, {
            message,
          });
      }
    } catch (error) {
      logger.error(`Failed to parse WebSocket message on connection ${connectionId}`, {
        error,
      });
      
      const metadata = this.connectionMetadata.get(connectionId);
      if (metadata) {
        metadata.errorCount++;
      }
    }
  }

  /**
   * Handle price update message
   */
  private handlePriceUpdate(message: CoinGeckoWSMessage): void {
    if (!message.data) {
      return;
    }

    try {
      // Transform CoinGecko WS data to our MarketPrice format
      const marketPrice: MarketPrice = this.transformPriceData(message.data);

      const event: PriceUpdateEvent = {
        type: 'price',
        data: marketPrice,
        source: DataSource.COINGECKO,
        timestamp: new Date(),
      };

      this.emit('price_update', event);
    } catch (error) {
      logger.error('Failed to handle price update', { error, data: message.data });
    }
  }

  /**
   * Transform CoinGecko WebSocket data to our format
   */
  private transformPriceData(data: any): MarketPrice {
    return {
      symbol: data.symbol?.toLowerCase() || '',
      coinId: data.id || data.coin_id || '',
      price: data.price || data.current_price || 0,
      priceChange24h: data.price_change_24h || 0,
      priceChangePercentage24h: data.price_change_percentage_24h || 0,
      marketCap: data.market_cap || 0,
      volume24h: data.total_volume || data.volume_24h || 0,
      circulatingSupply: data.circulating_supply,
      totalSupply: data.total_supply,
      maxSupply: data.max_supply,
      ath: data.ath,
      athDate: data.ath_date ? new Date(data.ath_date) : undefined,
      atl: data.atl,
      atlDate: data.atl_date ? new Date(data.atl_date) : undefined,
      lastUpdated: new Date(),
      source: DataSource.COINGECKO,
      updateType: PriceUpdateType.WEBSOCKET,
    };
  }

  /**
   * Handle connection close with exponential backoff reconnection
   */
  private handleClose(
    connectionId: number,
    coins: string[],
    channels: string[]
  ): void {
    // Clear timers
    this.stopHeartbeat(connectionId);
    this.clearReconnectTimer(connectionId);

    // Get metadata
    const metadata = this.connectionMetadata.get(connectionId);
    const reconnectAttempts = metadata?.reconnectAttempts || 0;

    // Remove connection
    this.connections.delete(connectionId);
    this.subscriptions.delete(connectionId);

    // Attempt reconnection if not shutting down and within max attempts
    if (!this.isShuttingDown) {
      if (reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
        logger.error(`Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached for connection ${connectionId}`, {
          coins: coins.length,
        });
        
        this.connectionMetadata.delete(connectionId);
        this.emit('max_reconnects_reached', {
          connectionId,
          coins,
          attempts: reconnectAttempts,
        });
        return;
      }

      const delay = this.calculateReconnectDelay(reconnectAttempts);
      
      logger.info(`Scheduling reconnection for connection ${connectionId}`, {
        attempt: reconnectAttempts + 1,
        maxAttempts: this.MAX_RECONNECT_ATTEMPTS,
        delayMs: delay,
      });
      
      const timer = setTimeout(async () => {
        logger.info(`Reconnecting connection ${connectionId}`, {
          attempt: reconnectAttempts + 1,
        });
        
        try {
          await this.createConnection(coins, channels, reconnectAttempts + 1);
          logger.info(`Successfully reconnected connection ${connectionId}`, {
            attempt: reconnectAttempts + 1,
          });
        } catch (error) {
          logger.error(`Failed to reconnect connection ${connectionId}`, {
            attempt: reconnectAttempts + 1,
            error,
          });
          
          // Schedule another reconnection attempt
          this.handleClose(connectionId, coins, channels);
        }
      }, delay);

      this.reconnectTimers.set(connectionId, timer);
    } else {
      // Shutting down - clean up metadata
      this.connectionMetadata.delete(connectionId);
    }
  }

  /**
   * Start heartbeat for a connection
   */
  private startHeartbeat(connectionId: number): void {
    const timer = setInterval(() => {
      const ws = this.connections.get(connectionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        const heartbeatMsg: CoinGeckoWSMessage = {
          type: 'heartbeat',
          event: 'heartbeat',
        };
        ws.send(JSON.stringify(heartbeatMsg));
        logger.debug(`Heartbeat sent on connection ${connectionId}`);
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(connectionId, timer);
  }

  /**
   * Stop heartbeat for a connection
   */
  private stopHeartbeat(connectionId: number): void {
    const timer = this.heartbeatTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionId);
    }
  }

  /**
   * Clear reconnect timer for a connection
   */
  private clearReconnectTimer(connectionId: number): void {
    const timer = this.reconnectTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(connectionId);
    }
  }

  /**
   * Unsubscribe from specific coins
   */
  async unsubscribe(coins: string[]): Promise<void> {
    logger.info('Unsubscribing from coins', { coins });

    for (const [connectionId, ws] of this.connections.entries()) {
      const subscribed = this.subscriptions.get(connectionId);
      if (!subscribed) continue;

      const toUnsubscribe = coins.filter(coin => subscribed.has(coin));
      if (toUnsubscribe.length === 0) continue;

      if (ws.readyState === WebSocket.OPEN) {
        const unsubscribeMsg: CoinGeckoWSMessage = {
          type: 'unsubscribe',
          event: 'unsubscribe',
          params: {
            coins: toUnsubscribe,
          },
        };

        ws.send(JSON.stringify(unsubscribeMsg));

        // Remove from local subscription tracking
        toUnsubscribe.forEach(coin => subscribed.delete(coin));
      }
    }
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): string[] {
    const allSubscriptions: Set<string> = new Set();
    
    for (const subscribed of this.subscriptions.values()) {
      subscribed.forEach(coin => allSubscriptions.add(coin));
    }

    return Array.from(allSubscriptions);
  }

  /**
   * Get connection statistics
   */
  getStats(): any {
    return {
      totalConnections: this.connections.size,
      maxConnections: this.config.maxConnections,
      totalSubscriptions: this.getSubscriptions().length,
      maxSubscriptionsPerChannel: this.config.maxSubscriptionsPerChannel,
      connections: Array.from(this.connections.entries()).map(([id, ws]) => ({
        id,
        readyState: ws.readyState,
        subscriptions: this.subscriptions.get(id)?.size || 0,
      })),
    };
  }

  /**
   * Check if WebSocket is healthy
   */
  isHealthy(): boolean {
    if (this.connections.size === 0) {
      return false;
    }

    // Check if at least one connection is open
    for (const ws of this.connections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        return true;
      }
    }

    return false;
  }

  /**
   * Disconnect all connections and stop health check
   */
  async disconnect(): Promise<void> {
    logger.info('Disconnecting all WebSocket connections');
    this.isShuttingDown = true;

    // Stop global health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    // Clear all timers
    for (const connectionId of this.connections.keys()) {
      this.stopHeartbeat(connectionId);
      this.clearReconnectTimer(connectionId);
    }

    // Close all connections
    for (const [connectionId, ws] of this.connections.entries()) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        logger.info(`Closing WebSocket connection ${connectionId}`);
        ws.close(1000, 'Client disconnect');
      }
    }

    this.connections.clear();
    this.subscriptions.clear();
    this.connectionMetadata.clear();
    this.removeAllListeners();
  }
}

export default CoinGeckoWebSocketClient;

