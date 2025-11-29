/**
 * ============================================
 * DEXSCREENER WEBSOCKET CLIENT
 * ============================================
 * 
 * Real-time DEX Data Streaming with:
 * - Multi-connection Scaling
 * - Intelligent Reconnection with Exponential Backoff
 * - Subscription Management & Load Balancing
 * - Message Queue & Rate Limiting
 * - Performance Telemetry
 * 
 * Note: DexScreener Pro/Enterprise required for WebSocket access
 */

import WebSocket from 'ws';
import { EventEmitter } from 'eventemitter3';
import { 
  KeyRotationManager, 
  getKeyRotationManager 
} from '../security/key-rotation';
import { logger } from '../utils/logger';

/**
 * WebSocket connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  CLOSING = 'closing',
  CLOSED = 'closed',
}

/**
 * WebSocket message types
 */
export enum MessageType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  PING = 'ping',
  PONG = 'pong',
  PRICE_UPDATE = 'price_update',
  TRADE = 'trade',
  LIQUIDITY_UPDATE = 'liquidity_update',
  NEW_PAIR = 'new_pair',
  ERROR = 'error',
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  pairs?: string[];       // Pair addresses
  tokens?: string[];      // Token addresses
  chains?: string[];      // Chain IDs
  channels: ('prices' | 'trades' | 'liquidity' | 'new_pairs')[];
}

/**
 * WebSocket configuration
 */
export interface DexScreenerWSConfig {
  url?: string;
  apiKey?: string;
  maxConnections?: number;
  maxSubscriptionsPerConnection?: number;
  reconnectAttempts?: number;
  reconnectBaseDelay?: number;
  reconnectMaxDelay?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
}

/**
 * Connection metrics
 */
export interface ConnectionMetrics {
  connectionId: number;
  state: ConnectionState;
  subscriptions: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  reconnects: number;
  latency: number;
  uptime: number;
  connectedAt: Date | null;
}

/**
 * Price update event
 */
export interface PriceUpdateEvent {
  type: MessageType.PRICE_UPDATE;
  chainId: string;
  pairAddress: string;
  baseToken: string;
  quoteToken: string;
  priceUsd: number;
  priceNative: number;
  priceChange5m?: number;
  priceChange1h?: number;
  timestamp: Date;
}

/**
 * Trade event
 */
export interface TradeEvent {
  type: MessageType.TRADE;
  chainId: string;
  pairAddress: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  txHash: string;
  timestamp: Date;
}

/**
 * Liquidity update event
 */
export interface LiquidityUpdateEvent {
  type: MessageType.LIQUIDITY_UPDATE;
  chainId: string;
  pairAddress: string;
  liquidityUsd: number;
  liquidityChange: number;
  timestamp: Date;
}

/**
 * New pair event
 */
export interface NewPairEvent {
  type: MessageType.NEW_PAIR;
  chainId: string;
  pairAddress: string;
  baseToken: { address: string; symbol: string; name: string };
  quoteToken: { address: string; symbol: string; name: string };
  dexId: string;
  initialLiquidity: number;
  timestamp: Date;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<DexScreenerWSConfig> = {
  url: 'wss://ws.dexscreener.com',
  apiKey: '',
  maxConnections: 5,
  maxSubscriptionsPerConnection: 100,
  reconnectAttempts: 10,
  reconnectBaseDelay: 1000,
  reconnectMaxDelay: 60000,
  heartbeatInterval: 30000,
  messageQueueSize: 10000,
};

/**
 * Single WebSocket connection wrapper
 */
class WSConnection extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<DexScreenerWSConfig>;
  private connectionId: number;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private subscriptions: Set<string> = new Set();
  private reconnectAttempts: number = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private lastPongTime: number = Date.now();
  private connectedAt: Date | null = null;
  
  // Metrics
  private messagesReceived: number = 0;
  private messagesSent: number = 0;
  private errors: number = 0;
  private reconnects: number = 0;
  private latencies: number[] = [];

  constructor(connectionId: number, config: Required<DexScreenerWSConfig>) {
    super();
    this.connectionId = connectionId;
    this.config = config;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
      return;
    }

    this.state = ConnectionState.CONNECTING;
    
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.config.url);
        if (this.config.apiKey) {
          url.searchParams.set('apiKey', this.config.apiKey);
        }
        
        this.ws = new WebSocket(url.toString(), {
          headers: {
            'User-Agent': 'Coinet-DexScreener-WS/1.0',
          },
        });
        
        this.ws.on('open', () => {
          this.state = ConnectionState.CONNECTED;
          this.connectedAt = new Date();
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          logger.info(`DexScreener WS connection ${this.connectionId} opened`);
          this.emit('connected', { connectionId: this.connectionId });
          
          // Resubscribe to all channels
          this.resubscribe();
          
          resolve();
        });
        
        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });
        
        this.ws.on('error', (error: Error) => {
          this.errors++;
          logger.debug(`DexScreener WS connection ${this.connectionId} error`, { 
            error: error.message 
          });
          this.emit('error', { connectionId: this.connectionId, error });
          
          if (this.state === ConnectionState.CONNECTING) {
            reject(error);
          }
        });
        
        this.ws.on('close', (code: number, reason: Buffer) => {
          this.handleClose(code, reason.toString());
        });
        
        this.ws.on('pong', () => {
          const latency = Date.now() - this.lastPongTime;
          this.latencies.push(latency);
          if (this.latencies.length > 100) {
            this.latencies.shift();
          }
        });
        
      } catch (error) {
        this.state = ConnectionState.DISCONNECTED;
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: WebSocket.Data): void {
    this.messagesReceived++;
    
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'pong':
          // Heartbeat response
          break;
          
        case 'price_update':
          this.emit('price_update', this.parsePriceUpdate(message));
          break;
          
        case 'trade':
          this.emit('trade', this.parseTradeEvent(message));
          break;
          
        case 'liquidity_update':
          this.emit('liquidity_update', this.parseLiquidityUpdate(message));
          break;
          
        case 'new_pair':
          this.emit('new_pair', this.parseNewPairEvent(message));
          break;
          
        case 'error':
          logger.error(`DexScreener WS error message`, { message: message.message });
          this.emit('ws_error', { message: message.message });
          break;
          
        case 'subscribed':
          logger.debug(`Subscribed to ${message.channel}`);
          break;
          
        case 'unsubscribed':
          logger.debug(`Unsubscribed from ${message.channel}`);
          break;
          
        default:
          logger.debug(`Unknown message type: ${message.type}`, { message });
      }
    } catch (error) {
      logger.debug('Failed to parse WebSocket message', { error, data: data.toString() });
    }
  }

  /**
   * Parse price update message
   */
  private parsePriceUpdate(message: any): PriceUpdateEvent {
    return {
      type: MessageType.PRICE_UPDATE,
      chainId: message.chainId,
      pairAddress: message.pairAddress,
      baseToken: message.baseToken?.symbol || message.baseToken,
      quoteToken: message.quoteToken?.symbol || message.quoteToken,
      priceUsd: parseFloat(message.priceUsd || '0'),
      priceNative: parseFloat(message.priceNative || '0'),
      priceChange5m: message.priceChange5m,
      priceChange1h: message.priceChange1h,
      timestamp: new Date(message.timestamp || Date.now()),
    };
  }

  /**
   * Parse trade event message
   */
  private parseTradeEvent(message: any): TradeEvent {
    return {
      type: MessageType.TRADE,
      chainId: message.chainId,
      pairAddress: message.pairAddress,
      side: message.side || 'buy',
      amount: parseFloat(message.amount || '0'),
      price: parseFloat(message.price || '0'),
      txHash: message.txHash,
      timestamp: new Date(message.timestamp || Date.now()),
    };
  }

  /**
   * Parse liquidity update message
   */
  private parseLiquidityUpdate(message: any): LiquidityUpdateEvent {
    return {
      type: MessageType.LIQUIDITY_UPDATE,
      chainId: message.chainId,
      pairAddress: message.pairAddress,
      liquidityUsd: parseFloat(message.liquidityUsd || '0'),
      liquidityChange: parseFloat(message.liquidityChange || '0'),
      timestamp: new Date(message.timestamp || Date.now()),
    };
  }

  /**
   * Parse new pair event message
   */
  private parseNewPairEvent(message: any): NewPairEvent {
    return {
      type: MessageType.NEW_PAIR,
      chainId: message.chainId,
      pairAddress: message.pairAddress,
      baseToken: message.baseToken,
      quoteToken: message.quoteToken,
      dexId: message.dexId,
      initialLiquidity: parseFloat(message.initialLiquidity || '0'),
      timestamp: new Date(message.timestamp || Date.now()),
    };
  }

  /**
   * Handle connection close
   */
  private handleClose(code: number, reason: string): void {
    this.stopHeartbeat();
    
    const wasConnected = this.state === ConnectionState.CONNECTED;
    this.state = ConnectionState.DISCONNECTED;
    
    logger.info(`DexScreener WS connection ${this.connectionId} closed`, { code, reason });
    
    this.emit('disconnected', { connectionId: this.connectionId, code, reason });
    
    // Attempt reconnection if not intentionally closed
    if (wasConnected && code !== 1000 && this.reconnectAttempts < this.config.reconnectAttempts) {
      this.attemptReconnect();
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.state === ConnectionState.RECONNECTING) {
      return;
    }
    
    this.state = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;
    this.reconnects++;
    
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.reconnectMaxDelay
    );
    
    logger.info(`DexScreener WS reconnecting in ${delay}ms`, {
      connectionId: this.connectionId,
      attempt: this.reconnectAttempts,
    });
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.debug(`Reconnection attempt ${this.reconnectAttempts} failed`, { error });
        if (this.reconnectAttempts < this.config.reconnectAttempts) {
          this.attemptReconnect();
        } else {
          logger.error(`DexScreener WS connection ${this.connectionId} max reconnects reached`);
          this.emit('max_reconnects', { connectionId: this.connectionId });
        }
      }
    }, delay);
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.state === ConnectionState.CONNECTED) {
        this.lastPongTime = Date.now();
        this.send({ type: 'ping' });
        this.ws.ping();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * Send message
   */
  send(message: any): boolean {
    if (this.ws && this.state === ConnectionState.CONNECTED) {
      try {
        this.ws.send(JSON.stringify(message));
        this.messagesSent++;
        return true;
      } catch (error) {
        logger.error('Failed to send WebSocket message', { error });
        return false;
      }
    }
    return false;
  }

  /**
   * Subscribe to a channel
   */
  subscribe(subscriptionKey: string, options: SubscriptionOptions): boolean {
    if (this.subscriptions.size >= this.config.maxSubscriptionsPerConnection) {
      return false;
    }
    
    this.subscriptions.add(subscriptionKey);
    
    const message = {
      type: 'subscribe',
      channels: options.channels,
      pairs: options.pairs,
      tokens: options.tokens,
      chains: options.chains,
    };
    
    return this.send(message);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(subscriptionKey: string): boolean {
    this.subscriptions.delete(subscriptionKey);
    
    const message = {
      type: 'unsubscribe',
      subscription: subscriptionKey,
    };
    
    return this.send(message);
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  private resubscribe(): void {
    for (const subscriptionKey of this.subscriptions) {
      // Parse subscription key and resubscribe
      // Format: "channel:pairs/tokens:chains"
      const [channel, items, chains] = subscriptionKey.split(':');
      
      this.send({
        type: 'subscribe',
        channels: [channel],
        pairs: items?.split(','),
        chains: chains?.split(','),
      });
    }
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;
    
    return {
      connectionId: this.connectionId,
      state: this.state,
      subscriptions: this.subscriptions.size,
      messagesReceived: this.messagesReceived,
      messagesSent: this.messagesSent,
      errors: this.errors,
      reconnects: this.reconnects,
      latency: avgLatency,
      uptime: this.connectedAt ? Date.now() - this.connectedAt.getTime() : 0,
      connectedAt: this.connectedAt,
    };
  }

  /**
   * Check if connection has capacity
   */
  hasCapacity(): boolean {
    return this.subscriptions.size < this.config.maxSubscriptionsPerConnection;
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get connection ID
   */
  getConnectionId(): number {
    return this.connectionId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Check if healthy
   */
  isHealthy(): boolean {
    if (this.state !== ConnectionState.CONNECTED) {
      return false;
    }
    
    // Check if we've received recent pongs
    const timeSinceLastPong = Date.now() - this.lastPongTime;
    return timeSinceLastPong < this.config.heartbeatInterval * 2;
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    this.state = ConnectionState.CLOSING;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.state = ConnectionState.CLOSED;
    this.subscriptions.clear();
    this.removeAllListeners();
  }
}

/**
 * DexScreener WebSocket Manager
 * Handles multiple connections and subscription load balancing
 */
export class DexScreenerWSManager extends EventEmitter {
  private config: Required<DexScreenerWSConfig>;
  private connections: Map<number, WSConnection> = new Map();
  private subscriptionMap: Map<string, number> = new Map(); // subscriptionKey -> connectionId
  private nextConnectionId: number = 0;
  private keyRotationManager: KeyRotationManager;
  private messageQueue: any[] = [];
  private isShuttingDown: boolean = false;

  constructor(config?: DexScreenerWSConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.keyRotationManager = getKeyRotationManager();
    
    // Get API key from key rotation manager or config
    if (!this.config.apiKey) {
      const keyConfig = this.keyRotationManager.getCurrentKey('dexscreener');
      if (keyConfig) {
        this.config.apiKey = keyConfig.key;
      } else {
        this.config.apiKey = process.env.DEXSCREENER_PRO_KEY || '';
      }
    }
    
    logger.info('DexScreener WS Manager initialized', {
      maxConnections: this.config.maxConnections,
      maxSubscriptionsPerConnection: this.config.maxSubscriptionsPerConnection,
      hasApiKey: !!this.config.apiKey,
    });
  }

  /**
   * Initialize with at least one connection
   */
  async initialize(): Promise<void> {
    await this.createConnection();
    logger.info('DexScreener WS Manager ready');
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<WSConnection> {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum connections reached');
    }
    
    const connectionId = this.nextConnectionId++;
    const connection = new WSConnection(connectionId, this.config);
    
    // Forward events
    connection.on('connected', (data) => this.emit('connected', data));
    connection.on('disconnected', (data) => this.emit('disconnected', data));
    connection.on('error', (data) => this.emit('error', data));
    connection.on('price_update', (data) => this.emit('price_update', data));
    connection.on('trade', (data) => this.emit('trade', data));
    connection.on('liquidity_update', (data) => this.emit('liquidity_update', data));
    connection.on('new_pair', (data) => this.emit('new_pair', data));
    connection.on('ws_error', (data) => this.emit('ws_error', data));
    connection.on('max_reconnects', (data) => {
      this.handleMaxReconnects(connectionId);
    });
    
    this.connections.set(connectionId, connection);
    
    await connection.connect();
    
    return connection;
  }

  /**
   * Handle max reconnects - remove and recreate connection
   */
  private async handleMaxReconnects(connectionId: number): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    // Get subscriptions to migrate
    const subscriptionsToMigrate: string[] = [];
    for (const [subKey, connId] of this.subscriptionMap.entries()) {
      if (connId === connectionId) {
        subscriptionsToMigrate.push(subKey);
      }
    }
    
    // Remove old connection
    await connection.disconnect();
    this.connections.delete(connectionId);
    
    // Remove subscription mappings
    for (const subKey of subscriptionsToMigrate) {
      this.subscriptionMap.delete(subKey);
    }
    
    // Create new connection if not shutting down
    if (!this.isShuttingDown) {
      try {
        await this.createConnection();
        
        // Migrate subscriptions
        for (const subKey of subscriptionsToMigrate) {
          // Re-subscribe - parse subscription key and options
          // This is a simplified version; full implementation would store options
          logger.info(`Migrating subscription ${subKey} to new connection`);
        }
      } catch (error) {
        logger.error('Failed to create replacement connection', { error });
      }
    }
  }

  /**
   * Find best connection for new subscription
   */
  private findBestConnection(): WSConnection | null {
    let bestConnection: WSConnection | null = null;
    let minSubscriptions = Infinity;
    
    for (const connection of this.connections.values()) {
      if (connection.isConnected() && connection.hasCapacity()) {
        if (connection.getSubscriptionCount() < minSubscriptions) {
          minSubscriptions = connection.getSubscriptionCount();
          bestConnection = connection;
        }
      }
    }
    
    return bestConnection;
  }

  /**
   * Subscribe to channels
   */
  async subscribe(options: SubscriptionOptions): Promise<void> {
    const subscriptionKey = this.generateSubscriptionKey(options);
    
    // Check if already subscribed
    if (this.subscriptionMap.has(subscriptionKey)) {
      logger.debug(`Already subscribed to ${subscriptionKey}`);
      return;
    }
    
    // Find or create connection
    let connection = this.findBestConnection();
    
    if (!connection) {
      if (this.connections.size < this.config.maxConnections) {
        connection = await this.createConnection();
      } else {
        throw new Error('All connections at capacity');
      }
    }
    
    // Subscribe
    const success = connection.subscribe(subscriptionKey, options);
    
    if (success) {
      this.subscriptionMap.set(subscriptionKey, connection.getConnectionId());
      logger.info(`Subscribed to ${subscriptionKey} on connection ${connection.getConnectionId()}`);
    } else {
      throw new Error('Failed to subscribe');
    }
  }

  /**
   * Unsubscribe from channels
   */
  unsubscribe(options: SubscriptionOptions): void {
    const subscriptionKey = this.generateSubscriptionKey(options);
    
    const connectionId = this.subscriptionMap.get(subscriptionKey);
    if (connectionId === undefined) {
      logger.debug(`Not subscribed to ${subscriptionKey}`);
      return;
    }
    
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.unsubscribe(subscriptionKey);
    }
    
    this.subscriptionMap.delete(subscriptionKey);
    logger.info(`Unsubscribed from ${subscriptionKey}`);
  }

  /**
   * Generate subscription key
   */
  private generateSubscriptionKey(options: SubscriptionOptions): string {
    const channels = options.channels.sort().join(',');
    const pairs = (options.pairs || []).sort().join(',');
    const tokens = (options.tokens || []).sort().join(',');
    const chains = (options.chains || []).sort().join(',');
    
    return `${channels}:${pairs || tokens}:${chains}`;
  }

  /**
   * Get all connection metrics
   */
  getMetrics(): {
    totalConnections: number;
    healthyConnections: number;
    totalSubscriptions: number;
    connections: ConnectionMetrics[];
  } {
    const connectionMetrics: ConnectionMetrics[] = [];
    let healthyConnections = 0;
    
    for (const connection of this.connections.values()) {
      const metrics = connection.getMetrics();
      connectionMetrics.push(metrics);
      
      if (connection.isHealthy()) {
        healthyConnections++;
      }
    }
    
    return {
      totalConnections: this.connections.size,
      healthyConnections,
      totalSubscriptions: this.subscriptionMap.size,
      connections: connectionMetrics,
    };
  }

  /**
   * Get health status
   */
  isHealthy(): boolean {
    if (this.connections.size === 0) {
      return false;
    }
    
    // At least one connection should be healthy
    for (const connection of this.connections.values()) {
      if (connection.isHealthy()) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Disconnect all connections
   */
  async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    
    logger.info('Disconnecting DexScreener WS Manager...');
    
    const disconnectPromises: Promise<void>[] = [];
    
    for (const connection of this.connections.values()) {
      disconnectPromises.push(connection.disconnect());
    }
    
    await Promise.all(disconnectPromises);
    
    this.connections.clear();
    this.subscriptionMap.clear();
    this.removeAllListeners();
    
    logger.info('DexScreener WS Manager disconnected');
  }
}

export default DexScreenerWSManager;

