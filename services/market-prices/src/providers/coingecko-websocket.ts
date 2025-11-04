/**
 * CoinGecko WebSocket Client
 * Real-time price updates with automatic reconnection and subscription management
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

export class CoinGeckoWebSocketClient extends EventEmitter {
  private config: WebSocketConfig;
  private connections: Map<number, WebSocket>;
  private subscriptions: Map<number, Set<string>>;
  private connectionIndex: number;
  private reconnectTimers: Map<number, NodeJS.Timeout>;
  private heartbeatTimers: Map<number, NodeJS.Timeout>;
  private isShuttingDown: boolean;
  private apiKey: string;

  constructor(config: WebSocketConfig, apiKey: string) {
    super();
    this.config = config;
    this.apiKey = apiKey;
    this.connections = new Map();
    this.subscriptions = new Map();
    this.reconnectTimers = new Map();
    this.heartbeatTimers = new Map();
    this.connectionIndex = 0;
    this.isShuttingDown = false;

    logger.info('CoinGecko WebSocket client initialized', {
      maxConnections: config.maxConnections,
      maxSubscriptionsPerChannel: config.maxSubscriptionsPerChannel,
    });
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
   * Create a new WebSocket connection
   */
  private async createConnection(
    coins: string[],
    channels: string[]
  ): Promise<void> {
    const connectionId = this.connectionIndex++;
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.url}?api_key=${this.apiKey}`;
        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
          logger.info(`WebSocket connection ${connectionId} opened`, {
            coins: coins.length,
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
   * Handle incoming WebSocket messages
   */
  private handleMessage(connectionId: number, data: WebSocket.Data): void {
    try {
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
          break;

        case 'unsubscribe':
          logger.info(`Unsubscription confirmed on connection ${connectionId}`);
          break;

        case 'error':
          logger.error(`WebSocket error on connection ${connectionId}`, {
            error: message.error,
          });
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
   * Handle connection close
   */
  private handleClose(
    connectionId: number,
    coins: string[],
    channels: string[]
  ): void {
    // Clear timers
    this.stopHeartbeat(connectionId);
    this.clearReconnectTimer(connectionId);

    // Remove connection
    this.connections.delete(connectionId);
    this.subscriptions.delete(connectionId);

    // Attempt reconnection if not shutting down
    if (!this.isShuttingDown) {
      logger.info(`Scheduling reconnection for connection ${connectionId}`);
      
      const timer = setTimeout(() => {
        logger.info(`Reconnecting connection ${connectionId}`);
        this.createConnection(coins, channels).catch((error) => {
          logger.error(`Failed to reconnect connection ${connectionId}`, {
            error,
          });
        });
      }, this.config.reconnectInterval);

      this.reconnectTimers.set(connectionId, timer);
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
   * Disconnect all connections
   */
  async disconnect(): Promise<void> {
    logger.info('Disconnecting all WebSocket connections');
    this.isShuttingDown = true;

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
    this.removeAllListeners();
  }
}

export default CoinGeckoWebSocketClient;

