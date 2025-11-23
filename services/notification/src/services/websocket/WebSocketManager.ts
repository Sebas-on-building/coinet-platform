import WebSocket from 'ws';
import { Logger } from '@/utils/Logger';
import zlib from 'zlib';
import { EventEmitter } from 'events';

export type ExchangeType = 'binance' | 'coinbase' | 'kraken' | 'bitfinex' | 'bitstamp';

export interface ExchangeConfig {
  name: ExchangeType;
  wsUrl: string;
  backupUrls?: string[];
  heartbeatInterval: number; // milliseconds
  reconnectDelay: number; // milliseconds
  maxReconnectAttempts: number;
  messageBufferSize: number; // messages to buffer during disconnection
  subscriptions: string[]; // symbols or channels to subscribe to
  rateLimit?: {
    requestsPerSecond: number;
    burstLimit: number;
  };
  connectionStrategy?: 'predictive' | 'round_robin' | 'failover';
  compression?: 'none' | 'zlib' | 'snappy';
  securityProtocols?: string[]; // E.g., ['quantum-safe-tls', 's-2-0-s']
}

export interface WebSocketConnection {
  id: string;
  exchange: ExchangeType;
  ws: WebSocket | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting' | 'degraded';
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  messageBuffer: any[];
  subscriptions: Set<string>;
  latency: number; // milliseconds
  totalMessages: number;
  errorCount: number;
  uptime: number; // milliseconds since first connection
  metadata?: Record<string, any>;
  currentUrl: string; // The URL currently connected to
  reconnectionHistory: { timestamp: Date; success: boolean; delay: number }[];
  bufferUsage: number; // 0-100 percentage
  compressionRatio: number; // Ratio of compressed size to original size
  effectiveSendRate: number; // Messages per second after rate limiting
}

export interface PriceData {
  symbol: string;
  exchange: ExchangeType;
  price: number;
  volume: number;
  timestamp: Date;
  bid?: number;
  ask?: number;
  high24h?: number;
  low24h?: number;
  change24h?: number;
  changePercent24h?: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  averageLatency: number;
  totalMessagesProcessed: number;
  messagesPerSecond: number;
  uptimePercentage: number;
  errorRate: number;
  lastUpdated: Date;
  bufferOverflows: number; // New metric
  compressionSavings: number; // New metric (percentage)
  failoverCount: number; // New metric
  predictiveReconnects: number; // New metric
}

export class WebSocketManager extends EventEmitter {
  private static instance: WebSocketManager;
  private logger: Logger;

  // Active connections
  private connections: Map<string, WebSocketConnection> = new Map();

  // Exchange configurations
  private exchangeConfigs: Map<ExchangeType, ExchangeConfig> = new Map();

  // Message handlers
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  // Connection metrics
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    failedConnections: 0,
    averageLatency: 0,
    totalMessagesProcessed: 0,
    messagesPerSecond: 0,
    uptimePercentage: 0,
    errorRate: 0,
    lastUpdated: new Date(),
    bufferOverflows: 0,
    compressionSavings: 0,
    failoverCount: 0,
    predictiveReconnects: 0,
  };

  // Buffer for messages during disconnection
  private messageBuffer: Map<string, any[]> = new Map();

  // Rate limiting
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  // Enhanced features for divine world-class perfection
  private predictiveReconnectModel: Map<string, { alpha: number; lastErrorDelay: number }> = new Map();
  private compressionAlgorithm: 'none' | 'zlib' | 'snappy' = 'none';
  private securityProtocols: string[] = [];
  private adaptiveBufferSizes: Map<string, { currentSize: number; targetSize: number; lastAdjustment: Date }> = new Map();
  private compressionCache: Map<string, { originalSize: number; compressedSize: number; ratio: number }> = new Map();

  private constructor() {
    super();
    this.logger = Logger.getInstance();
    this.initializeExchangeConfigs();
    this.startMetricsTimer();
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Initialize exchange configurations
   */
  private initializeExchangeConfigs(): void {
    const configs: ExchangeConfig[] = [
      {
        name: 'binance',
        wsUrl: 'wss://stream.binance.com:9443/ws/!ticker@arr',
        backupUrls: [
          'wss://stream.binance.com:443/ws/!ticker@arr',
          'wss://stream.binance.us:9443/ws/!ticker@arr'
        ],
        heartbeatInterval: 30000, // 30 seconds
        reconnectDelay: 5000, // 5 seconds
        maxReconnectAttempts: 10,
        messageBufferSize: 1000,
        subscriptions: ['!ticker@arr'],
        rateLimit: {
          requestsPerSecond: 5,
          burstLimit: 10
        }
      },
      {
        name: 'coinbase',
        wsUrl: 'wss://ws-feed.pro.coinbase.com',
        backupUrls: [
          'wss://ws-feed-public.sandbox.pro.coinbase.com'
        ],
        heartbeatInterval: 60000, // 60 seconds
        reconnectDelay: 10000, // 10 seconds
        maxReconnectAttempts: 5,
        messageBufferSize: 500,
        subscriptions: ['matches', 'ticker'],
        rateLimit: {
          requestsPerSecond: 3,
          burstLimit: 5
        }
      },
      {
        name: 'kraken',
        wsUrl: 'wss://ws.kraken.com',
        backupUrls: [
          'wss://ws-auth.kraken.com'
        ],
        heartbeatInterval: 45000, // 45 seconds
        reconnectDelay: 8000, // 8 seconds
        maxReconnectAttempts: 7,
        messageBufferSize: 800,
        subscriptions: ['ticker', 'spread', 'book'],
        rateLimit: {
          requestsPerSecond: 4,
          burstLimit: 8
        }
      },
      {
        name: 'bitfinex',
        wsUrl: 'wss://api.bitfinex.com/ws/2',
        backupUrls: [
          'wss://api-pub.bitfinex.com/ws/2'
        ],
        heartbeatInterval: 30000, // 30 seconds
        reconnectDelay: 6000, // 6 seconds
        maxReconnectAttempts: 8,
        messageBufferSize: 600,
        subscriptions: ['ticker'],
        rateLimit: {
          requestsPerSecond: 6,
          burstLimit: 12
        }
      },
      {
        name: 'bitstamp',
        wsUrl: 'wss://ws.bitstamp.net',
        backupUrls: [
          'wss://ws.pusher.bitstamp.net'
        ],
        heartbeatInterval: 40000, // 40 seconds
        reconnectDelay: 7000, // 7 seconds
        maxReconnectAttempts: 6,
        messageBufferSize: 700,
        subscriptions: ['live_trades', 'diff_order_book'],
        rateLimit: {
          requestsPerSecond: 4,
          burstLimit: 8
        }
      }
    ];

    for (const config of configs) {
      this.exchangeConfigs.set(config.name, config);
    }

    this.logger.info('WebSocket exchange configurations initialized');
  }

  /**
   * Connect to exchange WebSocket
   */
  async connectExchange(exchange: ExchangeType): Promise<string> {
    const config = this.exchangeConfigs.get(exchange);
    if (!config) {
      throw new Error(`No configuration found for exchange: ${exchange}`);
    }

    const connectionId = `${exchange}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const connection: WebSocketConnection = {
      id: connectionId,
      exchange,
      ws: null,
      status: 'connecting',
      lastHeartbeat: null,
      reconnectAttempts: 0,
      messageBuffer: [],
      subscriptions: new Set(config.subscriptions),
      latency: 0,
      totalMessages: 0,
      errorCount: 0,
      uptime: 0,
      currentUrl: config.wsUrl,
      reconnectionHistory: [],
      bufferUsage: 0,
      compressionRatio: 1.0, // No compression initially
      effectiveSendRate: 0
    };

    this.connections.set(connectionId, connection);
    this.metrics.totalConnections++;

    try {
      await this.establishConnection(connection, config);
      return connectionId;
    } catch (error) {
      this.logger.error('Failed to establish WebSocket connection', { error, exchange, connectionId });
      connection.status = 'error';
      this.metrics.failedConnections++;
      throw error;
    }
  }

  /**
   * Establish WebSocket connection
   */
  private async establishConnection(connection: WebSocketConnection, config: ExchangeConfig): Promise<void> {
    const wsUrl = this.selectBestEndpoint(config);

    this.logger.info('Establishing WebSocket connection', {
      connectionId: connection.id,
      exchange: connection.exchange,
      wsUrl
    });

    const ws = new WebSocket(wsUrl);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.status = 'error';
        this.metrics.failedConnections++;
        reject(new Error(`Connection timeout for ${connection.exchange}`));
      }, 10000); // 10 second timeout

      ws.on('open', () => {
        clearTimeout(timeout);
        connection.status = 'connected';
        connection.ws = ws;
        connection.lastHeartbeat = new Date();
        connection.uptime = Date.now();

        this.logger.info('WebSocket connection established', {
          connectionId: connection.id,
          exchange: connection.exchange
        });

        // Send subscriptions
        this.sendSubscriptions(connection, config);

        // Start heartbeat
        this.startHeartbeat(connection, config);

        this.metrics.activeConnections++;
        resolve();
      });

      ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(connection, data, config);
      });

      ws.on('error', (error: Error) => {
        clearTimeout(timeout);
        connection.status = 'error';
        connection.errorCount++;
        this.logger.error('WebSocket error', { error, connectionId: connection.id, exchange: connection.exchange });
      });

      ws.on('close', (code: number, reason: Buffer) => {
        clearTimeout(timeout);
        connection.status = 'disconnected';
        this.metrics.activeConnections--;

        this.logger.warn('WebSocket connection closed', {
          connectionId: connection.id,
          exchange: connection.exchange,
          code,
          reason: reason.toString()
        });

        // Attempt reconnection if not manually closed
        if (code !== 1000) { // 1000 = normal closure
          this.handleReconnection(connection, config);
        }
      });

      ws.on('pong', (data: Buffer) => {
        connection.latency = Date.now() - (connection.lastHeartbeat?.getTime() || 0);
        connection.lastHeartbeat = new Date();

        this.logger.debug('Heartbeat received', {
          connectionId: connection.id,
          exchange: connection.exchange,
          latency: connection.latency
        });
      });
    });
  }

  /**
   * Select best endpoint with ultra-high-performance multi-layer failover
   */
  private selectBestEndpoint(config: ExchangeConfig, connection?: WebSocketConnection): string {
    const strategy = config.connectionStrategy || 'failover';

    switch (strategy) {
      case 'predictive':
        return this.selectPredictiveEndpoint(config, connection);
      case 'round_robin':
        return this.selectRoundRobinEndpoint(config, connection);
      case 'failover':
      default:
        return this.selectFailoverEndpoint(config, connection);
    }
  }

  private selectPredictiveEndpoint(config: ExchangeConfig, connection?: WebSocketConnection): string {
    // Use predictive model to select best endpoint based on historical performance
    if (connection?.reconnectionHistory.length) {
      const recentHistory = connection.reconnectionHistory.slice(-10);
      const successRate = recentHistory.filter(h => h.success).length / recentHistory.length;

      const backupUrls = config.backupUrls;
      if (backupUrls && backupUrls.length > 0) {
        if (successRate > 0.8) {
          // Primary is reliable, but check if backup might be better
          return Math.random() > 0.7 ? config.wsUrl : backupUrls[0]!;
        } else {
          // Primary is unreliable, prefer backup
          return backupUrls[0]!;
        }
      }
    }

    return config.wsUrl;
  }

  private selectRoundRobinEndpoint(config: ExchangeConfig, connection?: WebSocketConnection): string {
    // Simple round-robin between primary and backups
    const urls = [config.wsUrl, ...(config.backupUrls || [])];
    const lastUsedIndex = connection?.currentUrl === config.wsUrl ? 0 :
                         (config.backupUrls ? config.backupUrls.indexOf(connection?.currentUrl || '') : -1);
    const nextIndex = (lastUsedIndex >= 0 ? lastUsedIndex + 1 : 0) % urls.length;
    return urls[nextIndex]!;
  }

  private selectFailoverEndpoint(config: ExchangeConfig, connection?: WebSocketConnection): string {
    // Standard failover: try primary, then backups in order
    if (!connection || connection.currentUrl === config.wsUrl) {
      return config.wsUrl;
    }

    const backupUrls = config.backupUrls;
    if (backupUrls) {
      const backupIndex = backupUrls.indexOf(connection.currentUrl);
      if (backupIndex >= 0 && backupIndex < backupUrls.length - 1) {
        return backupUrls[backupIndex + 1]!;
      }
    }

    // Fallback to primary
    return config.wsUrl;
  }

  /**
   * Send subscription messages
   */
  private sendSubscriptions(connection: WebSocketConnection, config: ExchangeConfig): void {
    if (!connection.ws) return;

    try {
      for (const subscription of config.subscriptions) {
        const subscribeMessage = this.formatSubscriptionMessage(connection.exchange, subscription);

        if (subscribeMessage) {
          connection.ws.send(JSON.stringify(subscribeMessage));

          this.logger.debug('Subscription sent', {
            connectionId: connection.id,
            exchange: connection.exchange,
            subscription
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to send subscriptions', {
        error,
        connectionId: connection.id,
        exchange: connection.exchange
      });
    }
  }

  /**
   * Format subscription message for exchange
   */
  private formatSubscriptionMessage(exchange: ExchangeType, subscription: string): any {
    switch (exchange) {
      case 'binance':
        return {
          method: 'SUBSCRIBE',
          params: [subscription],
          id: Math.floor(Math.random() * 10000)
        };

      case 'coinbase':
        return {
          type: 'subscribe',
          product_ids: ['BTC-USD', 'ETH-USD'], // Default products
          channels: [subscription]
        };

      case 'kraken':
        return {
          event: 'subscribe',
          subscription: {
            name: subscription
          }
        };

      case 'bitfinex':
        return {
          event: 'subscribe',
          channel: subscription
        };

      case 'bitstamp':
        return {
          event: 'bts:subscribe',
          data: {
            channel: subscription
          }
        };

      default:
        return null;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(connection: WebSocketConnection, data: WebSocket.Data, config: ExchangeConfig): void {
    try {
      const message = JSON.parse(data.toString());
      connection.totalMessages++;

      // Check rate limiting
      if (!this.checkRateLimit(connection.id, config)) {
        this.logger.warn('Rate limit exceeded', { connectionId: connection.id, exchange: connection.exchange });
        return;
      }

      // Decode message based on exchange format
      const decodedData = this.decodeMessage(connection.exchange, message);

      if (decodedData) {
        // Buffer message if connection is unstable
        if (connection.status !== 'connected' || connection.latency > 1000) {
          this.bufferMessage(connection.id, decodedData);
        } else {
          // Process message immediately
          this.processMessage(connection.id, decodedData);
        }
      }

      // Update metrics
      this.updateMetricsSummary();

    } catch (error) {
      this.logger.error('Failed to handle WebSocket message', {
        error,
        connectionId: connection.id,
        exchange: connection.exchange,
        data: data.toString()
      });
    }
  }

  /**
   * Decode message based on exchange format
   */
  private decodeMessage(exchange: ExchangeType, message: any): PriceData | null {
    try {
      switch (exchange) {
        case 'binance':
          return this.decodeBinanceMessage(message);

        case 'coinbase':
          return this.decodeCoinbaseMessage(message);

        case 'kraken':
          return this.decodeKrakenMessage(message);

        case 'bitfinex':
          return this.decodeBitfinexMessage(message);

        case 'bitstamp':
          return this.decodeBitstampMessage(message);

        default:
          this.logger.warn('Unknown exchange for message decoding', { exchange, message });
          return null;
      }
    } catch (error) {
      this.logger.error('Failed to decode message', { error, exchange, message });
      return null;
    }
  }

  /**
   * Decode Binance message format
   */
  private decodeBinanceMessage(message: any): PriceData | null {
    if (!message?.s || !message?.c) return null;

    return {
      symbol: message.s,
      exchange: 'binance',
      price: parseFloat(message.c),
      volume: parseFloat(message.v || '0'),
      timestamp: new Date(message.E || Date.now()),
      bid: parseFloat(message.b || '0'),
      ask: parseFloat(message.a || '0'),
      high24h: parseFloat(message.h || '0'),
      low24h: parseFloat(message.l || '0'),
      change24h: parseFloat(message.P || '0'),
      changePercent24h: parseFloat(message.P || '0')
    };
  }

  /**
   * Decode Coinbase message format
   */
  private decodeCoinbaseMessage(message: any): PriceData | null {
    if (message.type !== 'ticker' || !message.product_id) return null;

    return {
      symbol: message.product_id.replace('-USD', ''),
      exchange: 'coinbase',
      price: parseFloat(message.price || '0'),
      volume: parseFloat(message.volume_24h || '0'),
      timestamp: new Date(message.time || Date.now()),
      bid: parseFloat(message.best_bid || '0'),
      ask: parseFloat(message.best_ask || '0')
    };
  }

  /**
   * Decode Kraken message format
   */
  private decodeKrakenMessage(message: any): PriceData | null {
    if (!Array.isArray(message) || message.length < 4) return null;

    const [channelId, data, channelName, pair] = message;

    if (channelName !== 'ticker') return null;

    const tickerData = data[0];
    if (!tickerData || tickerData.length < 10) return null;

    const [ask, bid, close, volume, vwap, low, high] = tickerData;

    return {
      symbol: pair,
      exchange: 'kraken',
      price: parseFloat(close),
      volume: parseFloat(volume),
      timestamp: new Date(),
      bid: parseFloat(bid),
      ask: parseFloat(ask),
      low24h: parseFloat(low),
      high24h: parseFloat(high)
    };
  }

  /**
   * Decode Bitfinex message format
   */
  private decodeBitfinexMessage(message: any): PriceData | null {
    if (!Array.isArray(message) || message.length < 11) return null;

    const [channelId, data] = message;
    if (!Array.isArray(data) || data.length < 10) return null;

    const [bid, bidSize, ask, askSize, dailyChange, dailyChangePerc, lastPrice, volume, high, low] = data;

    return {
      symbol: 'BTC', // Bitfinex uses generic symbols, map based on channel
      exchange: 'bitfinex',
      price: parseFloat(lastPrice),
      volume: parseFloat(volume),
      timestamp: new Date(),
      bid: parseFloat(bid),
      ask: parseFloat(ask),
      high24h: parseFloat(high),
      low24h: parseFloat(low),
      change24h: parseFloat(dailyChange),
      changePercent24h: parseFloat(dailyChangePerc)
    };
  }

  /**
   * Decode Bitstamp message format
   */
  private decodeBitstampMessage(message: any): PriceData | null {
    if (message.event !== 'trade' || !message.data) return null;

    const tradeData = message.data;

    return {
      symbol: tradeData.symbol || 'BTC',
      exchange: 'bitstamp',
      price: parseFloat(tradeData.price || '0'),
      volume: parseFloat(tradeData.amount || '0'),
      timestamp: new Date(tradeData.timestamp * 1000 || Date.now())
    };
  }

  /**
   * Process decoded message
   */
  private processMessage(connectionId: string, priceData: PriceData): void {
    // Trigger message handlers
    for (const [handlerId, handler] of this.messageHandlers.entries()) {
      try {
        handler(priceData);
      } catch (error) {
        this.logger.error('Message handler failed', { error, handlerId, connectionId });
      }
    }

    this.metrics.totalMessagesProcessed++;
  }

  /**
   * Buffer message for later processing with ultra-high-performance adaptive buffering
   */
  private bufferMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    let buffer = this.messageBuffer.get(connectionId) || [];
    const config = this.exchangeConfigs.get(connection.exchange);

    // Adaptive buffer sizing based on network conditions
    const adaptiveBufferSize = this.getAdaptiveBufferSize(connection, config);

    // Compress message if enabled
    const compressedMessage = this.compressMessage(message, connection);

    buffer.push({
      message: compressedMessage,
      timestamp: Date.now(),
      originalSize: JSON.stringify(message).length,
      compressedSize: JSON.stringify(compressedMessage).length
    });

    // Adaptive buffer management
    if (buffer.length > adaptiveBufferSize) {
      // Remove oldest messages, but keep high-priority ones
      const sortedBuffer = buffer.sort((a, b) => {
        // Prioritize messages with larger price movements or volume spikes
        const aPriority = this.calculateMessagePriority(a.message);
        const bPriority = this.calculateMessagePriority(b.message);
        return bPriority - aPriority;
      });

      buffer = sortedBuffer.slice(0, adaptiveBufferSize);
      this.metrics.bufferOverflows++;
    }

    // Update buffer usage
    connection.bufferUsage = (buffer.length / adaptiveBufferSize) * 100;
    this.messageBuffer.set(connectionId, buffer);

    this.logger.debug('Message buffered with adaptive sizing', {
      connectionId,
      bufferSize: buffer.length,
      adaptiveSize: adaptiveBufferSize,
      usagePercent: connection.bufferUsage.toFixed(1)
    });
  }

  /**
   * Get adaptive buffer size based on network conditions
   */
  private getAdaptiveBufferSize(connection: WebSocketConnection, config?: ExchangeConfig): number {
    const baseSize = config?.messageBufferSize || 1000;

    // Adjust based on connection quality
    if (connection.latency > 1000) {
      // High latency - increase buffer size
      return Math.floor(baseSize * 1.5);
    } else if (connection.latency < 100) {
      // Low latency - decrease buffer size
      return Math.floor(baseSize * 0.8);
    }

    // Check buffer usage trend
    const bufferSizeData = this.adaptiveBufferSizes.get(connection.id);
    if (bufferSizeData) {
      const timeSinceAdjustment = Date.now() - bufferSizeData.lastAdjustment.getTime();
      if (timeSinceAdjustment > 60000) { // Adjust every minute
        if (connection.bufferUsage > 90) {
          // Buffer almost full - increase size
          bufferSizeData.targetSize = Math.floor(bufferSizeData.targetSize * 1.2);
        } else if (connection.bufferUsage < 30) {
          // Buffer underutilized - decrease size
          bufferSizeData.targetSize = Math.floor(bufferSizeData.targetSize * 0.8);
        }
        bufferSizeData.lastAdjustment = new Date();
      }

      return bufferSizeData.targetSize;
    }

    // Initialize adaptive buffer size tracking
    this.adaptiveBufferSizes.set(connection.id, {
      currentSize: baseSize,
      targetSize: baseSize,
      lastAdjustment: new Date()
    });

    return baseSize;
  }

  /**
   * Compress message using configured algorithm
   */
  private compressMessage(message: any, connection: WebSocketConnection): any {
    if (this.compressionAlgorithm === 'none') {
      return message;
    }

    try {
      const messageStr = JSON.stringify(message);
      const originalSize = Buffer.byteLength(messageStr, 'utf8');

      if (this.compressionAlgorithm === 'zlib') {
        const compressed = zlib.gzipSync(messageStr);
        const compressedSize = compressed.length;
        connection.compressionRatio = compressedSize / originalSize;

        this.compressionCache.set(connection.id, {
          originalSize,
          compressedSize,
          ratio: connection.compressionRatio
        });

        return {
          compressed: true,
          algorithm: 'zlib',
          data: compressed.toString('base64'),
          originalSize,
          compressedSize
        };
      }
      // Add snappy support when available

      // Update compression savings metric
      this.updateCompressionSavings();

    } catch (error) {
      this.logger.warn('Compression failed, using original message', { error, connectionId: connection.id });
    }

    return message;
  }

  /**
   * Calculate message priority for buffer management
   */
  private calculateMessagePriority(message: any): number {
    // Higher priority for messages with significant price movements or high volume
    if (message.price && message.changePercent24h) {
      return Math.abs(message.changePercent24h) + (message.volume || 0) / 1000000;
    }
    return 0;
  }

  /**
   * Update compression savings metrics
   */
  private updateCompressionSavings(): void {
    const totalOriginal = Array.from(this.compressionCache.values())
      .reduce((sum, cache) => sum + cache.originalSize, 0);
    const totalCompressed = Array.from(this.compressionCache.values())
      .reduce((sum, cache) => sum + cache.compressedSize, 0);

    if (totalOriginal > 0) {
      this.metrics.compressionSavings = ((totalOriginal - totalCompressed) / totalOriginal) * 100;
    }
  }

  /**
   * Start heartbeat for connection
   */
  private startHeartbeat(connection: WebSocketConnection, config: ExchangeConfig): void {
    const heartbeat = () => {
      if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
        const pingTime = Date.now();
        connection.ws.ping();

        // Set timeout for pong response
        setTimeout(() => {
          if (connection.latency === 0 || (Date.now() - pingTime) > 10000) { // No response for 10 seconds
            this.logger.warn('Heartbeat timeout', { connectionId: connection.id, exchange: connection.exchange });
            this.handleReconnection(connection, config);
          }
        }, 5000); // 5 second timeout for pong
      }
    };

    // Send initial heartbeat
    heartbeat();

    // Schedule regular heartbeats
    const interval = setInterval(heartbeat, config.heartbeatInterval);

    // Store interval for cleanup
    (connection as any).heartbeatInterval = interval;
  }

  /**
   * Handle reconnection logic with ultra-high-performance predictive capabilities
   */
  private async handleReconnection(connection: WebSocketConnection, config: ExchangeConfig): Promise<void> {
    if (connection.reconnectAttempts >= config.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached', {
        connectionId: connection.id,
        exchange: connection.exchange,
        attempts: connection.reconnectAttempts
      });

      connection.status = 'error';
      return;
    }

    connection.status = 'reconnecting';
    connection.reconnectAttempts++;

    // Calculate predictive delay using EWMA model
    const predictiveDelay = this.calculatePredictiveDelay(connection, config);

    this.logger.info('Scheduling reconnection with predictive delay', {
      connectionId: connection.id,
      exchange: connection.exchange,
      attempt: connection.reconnectAttempts,
      delay: predictiveDelay
    });

    setTimeout(async () => {
      try {
        // Update reconnection history
        connection.reconnectionHistory.push({
          timestamp: new Date(),
          success: false,
          delay: predictiveDelay
        });

        // Close existing connection
        if (connection.ws) {
          connection.ws.close();
          connection.ws = null;
        }

        // Select best endpoint based on strategy
        const newUrl = this.selectBestEndpoint(config, connection);
        connection.currentUrl = newUrl;

        // Attempt to reconnect
        await this.establishConnection(connection, config);

        // Update history with success
        if (connection.reconnectionHistory.length > 0) {
          connection.reconnectionHistory[connection.reconnectionHistory.length - 1]!.success = true;
        }

        // Replay buffered messages with enhanced processing
        await this.replayBufferedMessagesEnhanced(connection.id);

        this.metrics.predictiveReconnects++;

      } catch (error) {
        this.logger.error('Reconnection failed', { error, connectionId: connection.id, exchange: connection.exchange });
        // Schedule next reconnection attempt with updated model
        this.handleReconnection(connection, config);
      }
    }, predictiveDelay);
  }

  /**
   * Calculate predictive delay using EWMA model
   */
  private calculatePredictiveDelay(connection: WebSocketConnection, config: ExchangeConfig): number {
    const model = this.predictiveReconnectModel.get(connection.id);
    const baseDelay = config.reconnectDelay;

    if (!model) {
      // Initialize model
      this.predictiveReconnectModel.set(connection.id, {
        alpha: 0.3, // Smoothing factor
        lastErrorDelay: baseDelay
      });
      return baseDelay;
    }

    // Calculate exponential backoff with predictive adjustment
    const exponentialDelay = baseDelay * Math.pow(2, connection.reconnectAttempts - 1);

    // Apply EWMA smoothing
    const smoothedDelay = model.alpha * exponentialDelay + (1 - model.alpha) * model.lastErrorDelay;

    // Update model
    model.lastErrorDelay = smoothedDelay;

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * smoothedDelay;
    return Math.floor(smoothedDelay + jitter);
  }

  /**
   * Replay buffered messages after reconnection with enhanced processing
   */
  private async replayBufferedMessagesEnhanced(connectionId: string): Promise<void> {
    const buffer = this.messageBuffer.get(connectionId) || [];

    if (buffer.length === 0) return;

    this.logger.info('Replaying buffered messages with enhanced processing', {
      connectionId,
      messageCount: buffer.length
    });

    // Sort messages by priority and timestamp for optimal processing order
    const sortedBuffer = buffer.sort((a, b) => {
      const aPriority = this.calculateMessagePriority(a.message);
      const bPriority = this.calculateMessagePriority(b.message);
      const priorityDiff = bPriority - aPriority;

      if (priorityDiff !== 0) return priorityDiff;

      // If same priority, process older messages first
      return a.timestamp - b.timestamp;
    });

    // Process in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < sortedBuffer.length; i += batchSize) {
      const batch = sortedBuffer.slice(i, i + batchSize);

      for (const { message } of batch) {
        const decompressedMessage = this.decompressMessage(message);
        this.processMessage(connectionId, decompressedMessage);
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < sortedBuffer.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Clear buffer after replay
    this.messageBuffer.delete(connectionId);

    this.logger.info('Enhanced message replay completed', { connectionId });
  }

  /**
   * Decompress message if needed
   */
  private decompressMessage(message: any): any {
    if (message.compressed) {
      try {
        if (message.algorithm === 'zlib') {
          const compressedBuffer = Buffer.from(message.data, 'base64');
          const decompressed = zlib.gunzipSync(compressedBuffer);
          return JSON.parse(decompressed.toString('utf8'));
        }
        // Add snappy decompression when available
      } catch (error) {
        this.logger.warn('Decompression failed, using original message', { error });
      }
    }

    return message;
  }

  /**
   * Replay buffered messages after reconnection (legacy method)
   */
  private async replayBufferedMessages(connectionId: string): Promise<void> {
    await this.replayBufferedMessagesEnhanced(connectionId);
  }

  /**
   * Check rate limiting for connection
   */
  private checkRateLimit(connectionId: string, config: ExchangeConfig): boolean {
    if (!config.rateLimit) return true;

    const now = Date.now();
    const limiter = this.rateLimiters.get(connectionId) || { count: 0, resetTime: now + 1000 };

    // Reset counter if time window expired
    if (now >= limiter.resetTime) {
      limiter.count = 0;
      limiter.resetTime = now + 1000; // 1 second window
    }

    // Check if under rate limit
    if (limiter.count >= config.rateLimit.burstLimit) {
      return false;
    }

    limiter.count++;
    this.rateLimiters.set(connectionId, limiter);

    return true;
  }

  /**
   * Register message handler
   */
  registerMessageHandler(handlerId: string, handler: (data: PriceData) => void): void {
    this.messageHandlers.set(handlerId, handler);

    this.logger.info('Message handler registered', { handlerId });
  }

  /**
   * Unregister message handler
   */
  unregisterMessageHandler(handlerId: string): void {
    this.messageHandlers.delete(handlerId);

    this.logger.info('Message handler unregistered', { handlerId });
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections by exchange
   */
  getConnectionsByExchange(exchange: ExchangeType): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.exchange === exchange);
  }

  /**
   * Disconnect specific connection
   */
  disconnect(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    try {
      if (connection.ws) {
        connection.ws.close(1000, 'Manual disconnect'); // Normal closure
      }

      // Clear heartbeat interval
      if ((connection as any).heartbeatInterval) {
        clearInterval((connection as any).heartbeatInterval);
      }

      connection.status = 'disconnected';
      this.connections.delete(connectionId);

      this.logger.info('Connection disconnected', { connectionId, exchange: connection.exchange });
      return true;

    } catch (error) {
      this.logger.error('Failed to disconnect connection', { error, connectionId });
      return false;
    }
  }

  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    for (const connectionId of this.connections.keys()) {
      this.disconnect(connectionId);
    }

    this.logger.info('All WebSocket connections disconnected');
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): ConnectionMetrics {
    this.updateMetricsSummary();
    return { ...this.metrics };
  }

  /**
   * Update metrics summary with enhanced calculations
   */
  private updateMetricsSummary(): void {
    const connections = Array.from(this.connections.values());
    const activeConnections = connections.filter(conn => conn.status === 'connected');

    this.metrics.activeConnections = activeConnections.length;
    this.metrics.failedConnections = connections.filter(conn => conn.status === 'error').length;

    if (activeConnections.length > 0) {
      this.metrics.averageLatency = activeConnections.reduce((sum, conn) => sum + conn.latency, 0) / activeConnections.length;
      this.metrics.uptimePercentage = (activeConnections.reduce((sum, conn) => sum + conn.uptime, 0) / activeConnections.length) / (Date.now() - this.metrics.lastUpdated.getTime()) * 100;

      // Calculate average buffer usage and compression ratio
      const avgBufferUsage = activeConnections.reduce((sum, conn) => sum + conn.bufferUsage, 0) / activeConnections.length;
      const avgCompressionRatio = activeConnections.reduce((sum, conn) => sum + conn.compressionRatio, 0) / activeConnections.length;

      // Update metrics with new calculations
      this.metrics.compressionSavings = Math.max(0, (1 - avgCompressionRatio) * 100);
    }

    if (this.metrics.totalMessagesProcessed > 0) {
      const timeDiff = (Date.now() - this.metrics.lastUpdated.getTime()) / 1000;
      this.metrics.messagesPerSecond = this.metrics.totalMessagesProcessed / timeDiff;
    }

    if (connections.length > 0) {
      this.metrics.errorRate = connections.reduce((sum, conn) => sum + conn.errorCount, 0) / connections.length;

      // Calculate buffer overflow rate
      const totalBufferSize = connections.reduce((sum, conn) => {
        const buffer = this.messageBuffer.get(conn.id) || [];
        return sum + buffer.length;
      }, 0);

      const totalCapacity = connections.reduce((sum, conn) => {
        const config = this.exchangeConfigs.get(conn.exchange);
        return sum + (config?.messageBufferSize || 1000);
      }, 0);

      if (totalCapacity > 0) {
        this.metrics.bufferOverflows = (totalBufferSize / totalCapacity) * 100;
      }
    }

    // Count failover events from reconnection history
    this.metrics.failoverCount = connections.reduce((sum, conn) => {
      return sum + conn.reconnectionHistory.filter(h => !h.success).length;
    }, 0);

    this.metrics.lastUpdated = new Date();
  }

  /**
   * Start metrics timer
   */
  private startMetricsTimer(): void {
    setInterval(() => {
      this.updateMetricsSummary();
    }, 10000); // Update every 10 seconds
  }

  /**
   * Get exchange configuration
   */
  getExchangeConfig(exchange: ExchangeType): ExchangeConfig | undefined {
    return this.exchangeConfigs.get(exchange);
  }

  /**
   * Update exchange configuration
   */
  updateExchangeConfig(exchange: ExchangeType, config: Partial<ExchangeConfig>): void {
    const current = this.exchangeConfigs.get(exchange);
    if (current) {
      Object.assign(current, config);
      this.logger.info('Exchange configuration updated', { exchange, config });
    }
  }

  /**
   * Add custom exchange configuration
   */
  addExchangeConfig(config: ExchangeConfig): void {
    this.exchangeConfigs.set(config.name, config);
    this.logger.info('Custom exchange configuration added', { exchange: config.name });
  }

  /**
   * Get supported exchanges
   */
  getSupportedExchanges(): ExchangeType[] {
    return Array.from(this.exchangeConfigs.keys());
  }

  /**
   * Set compression algorithm for all connections
   */
  setCompressionAlgorithm(algorithm: 'none' | 'zlib' | 'snappy'): void {
    this.compressionAlgorithm = algorithm;
    this.logger.info(`Compression algorithm set to: ${algorithm}`);
  }

  /**
   * Enable/disable security protocols
   */
  setSecurityProtocols(protocols: string[]): void {
    this.securityProtocols = protocols;
    this.logger.info(`Security protocols updated: ${protocols.join(', ')}`);
  }

  /**
   * Get connection statistics with enhanced metrics
   */
  getConnectionStats(): Record<string, any> {
    const connections = Array.from(this.connections.values());

    return {
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.status === 'connected').length,
      reconnectingConnections: connections.filter(c => c.status === 'reconnecting').length,
      failedConnections: connections.filter(c => c.status === 'error').length,
      averageLatency: connections.filter(c => c.latency > 0).reduce((sum, c) => sum + c.latency, 0) / connections.filter(c => c.latency > 0).length || 0,
      totalMessages: connections.reduce((sum, c) => sum + c.totalMessages, 0),
      totalErrors: connections.reduce((sum, c) => sum + c.errorCount, 0),
      bufferSizes: Array.from(this.messageBuffer.entries()).reduce((acc, [id, buffer]) => {
        acc[id] = buffer.length;
        return acc;
      }, {} as Record<string, number>),
      averageBufferUsage: connections.reduce((sum, c) => sum + c.bufferUsage, 0) / connections.length || 0,
      averageCompressionRatio: connections.reduce((sum, c) => sum + c.compressionRatio, 0) / connections.length || 1,
      reconnectionHistory: connections.reduce((acc, c) => {
        acc[c.id] = c.reconnectionHistory.slice(-10); // Last 10 attempts
        return acc;
      }, {} as Record<string, any[]>),
      lastUpdated: new Date()
    };
  }

  /**
   * Force failover to backup endpoint
   */
  async forceFailover(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    try {
      this.logger.info(`Forcing failover for connection ${connectionId}`);

      // Close current connection
      if (connection.ws) {
        connection.ws.close(1000, 'Manual failover');
      }

      // Reset connection state
      connection.status = 'connecting';
      connection.ws = null;
      connection.reconnectAttempts = 0;

      // Trigger reconnection with failover strategy
      const config = this.exchangeConfigs.get(connection.exchange);
      if (config) {
        await this.establishConnection(connection, config);
        this.metrics.failoverCount++;
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failover failed', { error, connectionId });
      return false;
    }
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(): Record<string, any> {
    return {
      algorithm: this.compressionAlgorithm,
      totalCompressed: this.compressionCache.size,
      averageSavings: this.metrics.compressionSavings,
      cacheSize: this.compressionCache.size,
      lastUpdated: new Date()
    };
  }

  /**
   * Clear compression cache
   */
  clearCompressionCache(): void {
    this.compressionCache.clear();
    this.logger.info('Compression cache cleared');
  }

  /**
   * Test connection health
   */
  async testConnectionHealth(): Promise<Record<string, { status: string; latency: number; lastHeartbeat: Date | null }>> {
    const health: Record<string, { status: string; latency: number; lastHeartbeat: Date | null }> = {};

    for (const [connectionId, connection] of this.connections.entries()) {
      health[connectionId] = {
        status: connection.status,
        latency: connection.latency,
        lastHeartbeat: connection.lastHeartbeat
      };
    }

    return health;
  }

  /**
   * Get buffered messages for connection
   */
  getBufferedMessages(connectionId: string): any[] {
    return this.messageBuffer.get(connectionId) || [];
  }

  /**
   * Clear buffered messages for connection
   */
  clearBufferedMessages(connectionId: string): void {
    this.messageBuffer.delete(connectionId);
    this.logger.info('Buffered messages cleared', { connectionId });
  }


  /**
   * Cleanup old connections and buffers
   */
  cleanupOldConnections(maxAge: number = 3600000): number { // 1 hour default
    const cutoffTime = Date.now() - maxAge;
    let cleanedCount = 0;

    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.uptime < cutoffTime && connection.status !== 'connected') {
        this.connections.delete(connectionId);
        this.messageBuffer.delete(connectionId);
        this.rateLimiters.delete(connectionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info(`Cleaned up ${cleanedCount} old WebSocket connections`);
    }

    return cleanedCount;
  }
}
