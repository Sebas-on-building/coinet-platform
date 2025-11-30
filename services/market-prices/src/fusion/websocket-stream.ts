/**
 * ============================================
 * WEBSOCKET FUSION STREAM
 * ============================================
 * 
 * Real-time WebSocket streaming of fused intelligence.
 * Divine perfection: Sub-100ms latency for unified data.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { FusionEngine, FusionAlert } from './fusion-engine';
import { UnifiedIntelligence, UnifiedView } from './unified-intelligence';
import { ServiceConnector } from './service-connector';

// =============================================================================
// TYPES
// =============================================================================

export interface StreamConfig {
  port: number;
  path: string;
  heartbeatIntervalMs: number;
  maxClientsPerSymbol: number;
  enableCompression: boolean;
}

export interface StreamMessage {
  type: 'price' | 'whale' | 'sentiment' | 'alert' | 'fusion' | 'heartbeat' | 'subscribe' | 'unsubscribe' | 'error';
  symbol?: string;
  data: unknown;
  timestamp: number;
}

export interface ClientSubscription {
  symbols: Set<string>;
  types: Set<StreamMessage['type']>;
  lastHeartbeat: number;
}

// =============================================================================
// WEBSOCKET STREAM SERVER
// =============================================================================

export class WebSocketFusionStream extends EventEmitter {
  private config: StreamConfig;
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientSubscription> = new Map();
  private symbolSubscribers: Map<string, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  private fusionEngine: FusionEngine;
  private unifiedIntelligence: UnifiedIntelligence;
  private serviceConnector: ServiceConnector;

  constructor(
    fusionEngine: FusionEngine,
    unifiedIntelligence: UnifiedIntelligence,
    serviceConnector: ServiceConnector,
    config?: Partial<StreamConfig>
  ) {
    super();
    
    this.fusionEngine = fusionEngine;
    this.unifiedIntelligence = unifiedIntelligence;
    this.serviceConnector = serviceConnector;
    
    this.config = {
      port: parseInt(process.env.WS_PORT || '3001'),
      path: '/ws/fusion',
      heartbeatIntervalMs: 30000,
      maxClientsPerSymbol: 1000,
      enableCompression: true,
      ...config,
    };

    // Subscribe to fusion engine events
    this.setupFusionListeners();
  }

  // ===========================================================================
  // SERVER LIFECYCLE
  // ===========================================================================

  /**
   * Start the WebSocket server
   */
  start(): void {
    if (this.wss) {
      logger.warn('WebSocket server already running');
      return;
    }

    this.wss = new WebSocketServer({
      port: this.config.port,
      path: this.config.path,
      perMessageDeflate: this.config.enableCompression,
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
      this.emit('error', error);
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeats();
    }, this.config.heartbeatIntervalMs);

    logger.info('WebSocket Fusion Stream started', {
      component: 'WebSocketFusionStream',
      port: this.config.port,
      path: this.config.path,
    });
  }

  /**
   * Stop the WebSocket server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.wss) {
        // Close all client connections
        this.clients.forEach((_, ws) => {
          ws.close(1000, 'Server shutting down');
        });
        
        this.wss.close(() => {
          this.wss = null;
          logger.info('WebSocket Fusion Stream stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // ===========================================================================
  // CONNECTION HANDLING
  // ===========================================================================

  private handleConnection(ws: WebSocket, request: any): void {
    const clientId = this.generateClientId();
    
    // Initialize client subscription
    this.clients.set(ws, {
      symbols: new Set(),
      types: new Set(['price', 'whale', 'alert', 'fusion']),
      lastHeartbeat: Date.now(),
    });

    logger.info('WebSocket client connected', {
      component: 'WebSocketFusionStream',
      clientId,
      ip: request.socket.remoteAddress,
    });

    // Handle messages
    ws.on('message', (data) => {
      this.handleMessage(ws, data);
    });

    // Handle close
    ws.on('close', (code, reason) => {
      this.handleClose(ws, code, reason);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket client error', { error: error.message });
    });

    // Send welcome message
    this.send(ws, {
      type: 'heartbeat',
      data: { 
        message: 'Connected to Fusion Stream',
        supportedTypes: ['price', 'whale', 'sentiment', 'alert', 'fusion'],
        commands: ['subscribe', 'unsubscribe'],
      },
      timestamp: Date.now(),
    });
  }

  private handleMessage(ws: WebSocket, data: any): void {
    try {
      const message = JSON.parse(data.toString()) as StreamMessage;

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, message);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, message);
          break;
        default:
          this.send(ws, {
            type: 'error',
            data: { message: `Unknown message type: ${message.type}` },
            timestamp: Date.now(),
          });
      }
    } catch (error: any) {
      this.send(ws, {
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: Date.now(),
      });
    }
  }

  private handleSubscribe(ws: WebSocket, message: StreamMessage): void {
    const subscription = this.clients.get(ws);
    if (!subscription) return;

    const symbols = Array.isArray(message.data) 
      ? message.data as string[]
      : [message.symbol || (message.data as any)?.symbol];

    symbols.forEach(symbol => {
      if (!symbol) return;
      
      const upperSymbol = symbol.toUpperCase();
      
      // Check max clients per symbol
      const subscribers = this.symbolSubscribers.get(upperSymbol) || new Set();
      if (subscribers.size >= this.config.maxClientsPerSymbol) {
        this.send(ws, {
          type: 'error',
          data: { message: `Max subscribers reached for ${upperSymbol}` },
          timestamp: Date.now(),
        });
        return;
      }

      // Add subscription
      subscription.symbols.add(upperSymbol);
      subscribers.add(ws);
      this.symbolSubscribers.set(upperSymbol, subscribers);

      logger.debug('Client subscribed', { 
        symbol: upperSymbol, 
        totalSubscribers: subscribers.size 
      });
    });

    // Send current fusion data for subscribed symbols
    this.sendInitialData(ws, Array.from(subscription.symbols));

    this.send(ws, {
      type: 'subscribe',
      data: { 
        subscribed: Array.from(subscription.symbols),
        message: 'Subscription updated',
      },
      timestamp: Date.now(),
    });
  }

  private handleUnsubscribe(ws: WebSocket, message: StreamMessage): void {
    const subscription = this.clients.get(ws);
    if (!subscription) return;

    const symbols = Array.isArray(message.data) 
      ? message.data as string[]
      : [message.symbol || (message.data as any)?.symbol];

    symbols.forEach(symbol => {
      if (!symbol) return;
      
      const upperSymbol = symbol.toUpperCase();
      subscription.symbols.delete(upperSymbol);
      
      const subscribers = this.symbolSubscribers.get(upperSymbol);
      if (subscribers) {
        subscribers.delete(ws);
        if (subscribers.size === 0) {
          this.symbolSubscribers.delete(upperSymbol);
        }
      }
    });

    this.send(ws, {
      type: 'unsubscribe',
      data: { 
        subscribed: Array.from(subscription.symbols),
        message: 'Subscription updated',
      },
      timestamp: Date.now(),
    });
  }

  private handleClose(ws: WebSocket, code: number, reason: Buffer): void {
    const subscription = this.clients.get(ws);
    if (subscription) {
      // Remove from all symbol subscriptions
      subscription.symbols.forEach(symbol => {
        const subscribers = this.symbolSubscribers.get(symbol);
        if (subscribers) {
          subscribers.delete(ws);
          if (subscribers.size === 0) {
            this.symbolSubscribers.delete(symbol);
          }
        }
      });
    }

    this.clients.delete(ws);
    logger.debug('WebSocket client disconnected', { code, reason: reason.toString() });
  }

  // ===========================================================================
  // FUSION LISTENERS
  // ===========================================================================

  private setupFusionListeners(): void {
    // Price updates
    this.fusionEngine.on('price:update', (data) => {
      this.broadcast(data.symbol, {
        type: 'price',
        symbol: data.symbol,
        data,
        timestamp: Date.now(),
      });
    });

    // Whale activity
    this.fusionEngine.on('whale:activity', (data) => {
      this.broadcast(data.tokenSymbol, {
        type: 'whale',
        symbol: data.tokenSymbol,
        data,
        timestamp: Date.now(),
      });
    });

    // Sentiment updates
    this.fusionEngine.on('sentiment:update', (data) => {
      this.broadcast(data.symbol, {
        type: 'sentiment',
        symbol: data.symbol,
        data,
        timestamp: Date.now(),
      });
    });

    // Alerts
    this.fusionEngine.on('alert', (alert: FusionAlert) => {
      this.broadcast(alert.symbol, {
        type: 'alert',
        symbol: alert.symbol,
        data: alert,
        timestamp: Date.now(),
      });
    });

    // Correlations
    this.fusionEngine.on('correlation:detected', (data) => {
      this.broadcast(data.symbol, {
        type: 'fusion',
        symbol: data.symbol,
        data: {
          type: 'correlation',
          ...data,
        },
        timestamp: Date.now(),
      });
    });
  }

  // ===========================================================================
  // BROADCASTING
  // ===========================================================================

  private broadcast(symbol: string, message: StreamMessage): void {
    const subscribers = this.symbolSubscribers.get(symbol.toUpperCase());
    if (!subscribers || subscribers.size === 0) return;

    const messageStr = JSON.stringify(message);
    let sent = 0;

    subscribers.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sent++;
      }
    });

    this.emit('broadcast', { symbol, type: message.type, clientCount: sent });
  }

  private broadcastAll(message: StreamMessage): void {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((subscription, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  private send(ws: WebSocket, message: StreamMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendHeartbeats(): void {
    const now = Date.now();
    const message: StreamMessage = {
      type: 'heartbeat',
      data: { serverTime: now },
      timestamp: now,
    };

    this.clients.forEach((subscription, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
        subscription.lastHeartbeat = now;
      } else if (ws.readyState === WebSocket.CLOSED) {
        // Clean up dead connections
        this.handleClose(ws, 1006, Buffer.from('Connection dead'));
      }
    });
  }

  private async sendInitialData(ws: WebSocket, symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      try {
        const view = await this.unifiedIntelligence.getUnifiedView(symbol);
        this.send(ws, {
          type: 'fusion',
          symbol,
          data: {
            type: 'initial',
            view,
          },
          timestamp: Date.now(),
        });
      } catch (error: any) {
        logger.warn('Failed to send initial data', { symbol, error: error.message });
      }
    }
  }

  // ===========================================================================
  // MANUAL PUSH
  // ===========================================================================

  /**
   * Push fusion update to all subscribers of a symbol
   */
  async pushFusionUpdate(symbol: string): Promise<void> {
    try {
      const view = await this.unifiedIntelligence.getUnifiedView(symbol);
      this.broadcast(symbol, {
        type: 'fusion',
        symbol,
        data: {
          type: 'update',
          view,
        },
        timestamp: Date.now(),
      });
    } catch (error: any) {
      logger.error('Failed to push fusion update', { symbol, error: error.message });
    }
  }

  /**
   * Push alert to all clients
   */
  pushAlert(alert: FusionAlert): void {
    this.broadcast(alert.symbol, {
      type: 'alert',
      symbol: alert.symbol,
      data: alert,
      timestamp: Date.now(),
    });
  }

  // ===========================================================================
  // STATS
  // ===========================================================================

  getStats(): {
    totalClients: number;
    symbolSubscriptions: Record<string, number>;
    messagesSent: number;
    uptime: number;
  } {
    const symbolSubscriptions: Record<string, number> = {};
    this.symbolSubscribers.forEach((subscribers, symbol) => {
      symbolSubscriptions[symbol] = subscribers.size;
    });

    return {
      totalClients: this.clients.size,
      symbolSubscriptions,
      messagesSent: 0, // Would track in production
      uptime: this.wss ? Date.now() : 0,
    };
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

