/**
 * =========================================
 * RESILIENT WEBSOCKET CLIENT
 * =========================================
 * Enterprise-grade WebSocket client with automatic reconnection,
 * heartbeat monitoring, sequence validation, and circuit breaker pattern
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { MetricsCollector } from '../monitoring/MetricsCollector';

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  options?: WebSocket.ClientOptions;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  maxMessageSize: number;
  bufferSize: number;
  enableCompression: boolean;
  enableRateLimiting: boolean;
}

export interface WebSocketMessage {
  type: 'data' | 'heartbeat' | 'subscription' | 'error' | 'close';
  data?: any;
  timestamp: Date;
  sequence?: number;
}

export class ResilientWebSocketClient extends EventEmitter {
  private config: WebSocketConfig;
  private logger: Logger;
  private metrics: MetricsCollector;
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private lastHeartbeat: Date = new Date();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private sequenceNumber: number = 0;
  private lastSequenceNumber: number = 0;
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;

  constructor(config: WebSocketConfig, metrics: MetricsCollector, logger: Logger) {
    super();
    this.config = config;
    this.metrics = metrics;
    this.logger = logger;

    this.setupEventHandlers();
  }

  /**
   * Connect to the WebSocket endpoint
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    if (this.circuitBreakerState === 'open') {
      this.logger.warn('Circuit breaker is open, cannot connect');
      return;
    }

    this.isConnecting = true;
    this.logger.info(`🔌 Connecting to ${this.config.url}...`);

    try {
      await this.createConnection();
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Reset circuit breaker on successful connection
      this.resetCircuitBreaker();

      this.logger.info(`✅ Connected to ${this.config.url}`);
      this.emit('connected');

    } catch (error) {
      this.isConnecting = false;
      this.handleConnectionError(error);
    }
  }

  /**
   * Disconnect from the WebSocket endpoint
   */
  disconnect(): void {
    this.logger.info('🔌 Disconnecting...');

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.emit('disconnected');
  }

  /**
   * Send a message through the WebSocket
   */
  send(data: any): boolean {
    if (!this.isConnected || !this.ws) {
      this.logger.warn('Cannot send message: not connected');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: 'data',
        data,
        timestamp: new Date(),
        sequence: ++this.sequenceNumber
      };

      const jsonMessage = JSON.stringify(message);
      this.ws.send(jsonMessage);

      this.logger.debug(`📤 Sent message: ${jsonMessage.substring(0, 100)}...`);
      return true;

    } catch (error) {
      this.logger.error('Failed to send message', error);
      this.handleError(error);
      return false;
    }
  }

  /**
   * Subscribe to a data stream
   */
  subscribe(streamName: string, symbols: string[]): boolean {
    const subscription = {
      method: 'SUBSCRIBE',
      params: symbols.map(symbol => `${symbol.toLowerCase()}@${streamName}`),
      id: Date.now()
    };

    return this.send(subscription);
  }

  /**
   * Unsubscribe from a data stream
   */
  unsubscribe(streamName: string, symbols: string[]): boolean {
    const unsubscription = {
      method: 'UNSUBSCRIBE',
      params: symbols.map(symbol => `${symbol.toLowerCase()}@${streamName}`),
      id: Date.now()
    };

    return this.send(unsubscription);
  }

  /**
   * Get connection status
   */
  getStatus(): any {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      circuitBreakerState: this.circuitBreakerState,
      lastHeartbeat: this.lastHeartbeat,
      url: this.config.url,
      messageQueueSize: this.messageQueue.length
    };
  }

  /**
   * Create the WebSocket connection
   */
  private async createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: WebSocket.ClientOptions = {
        ...this.config.options,
        perMessageDeflate: this.config.enableCompression,
        maxPayload: this.config.maxMessageSize
      };

      this.ws = new WebSocket(this.config.url, this.config.protocols, options);

    // Set up connection timeout
    const connectionTimeout = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
        reject(new Error('Connection timeout'));
      }
    }, 10000);

    if (this.ws) {
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.onOpen();
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.onMessage(event);
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        this.onClose(event);
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        this.onError(error);
        reject(error);
      };
    } else {
      clearTimeout(connectionTimeout);
      reject(new Error('WebSocket instance not created'));
    }
    });
  }

  /**
   * Handle WebSocket open event
   */
  private onOpen(): void {
    this.logger.info('WebSocket connection opened');
    this.isConnected = true;
    this.lastHeartbeat = new Date();

    // Start heartbeat
    this.startHeartbeat();

    // Process queued messages
    this.processMessageQueue();

    this.emit('opened');
  }

  /**
   * Handle WebSocket message event
   */
  private onMessage(event: WebSocket.MessageEvent): void {
    try {
      const data = event.data.toString();
      const message: WebSocketMessage = {
        type: 'data',
        data: JSON.parse(data),
        timestamp: new Date(),
        sequence: ++this.lastSequenceNumber
      };

      // Validate sequence number if present
      if (message.data.id && this.validateSequence(message)) {
        this.processMessage(message);
      } else {
        this.processMessage(message);
      }

    } catch (error) {
      this.logger.error('Failed to parse WebSocket message', error);
      this.handleError(error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private onClose(event: WebSocket.CloseEvent): void {
    this.logger.info(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.isConnected = false;

    this.emit('closed', event);

    // Attempt reconnection unless it was a clean close
    if (event.code !== 1000) {
      this.scheduleReconnection();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private onError(error: WebSocket.ErrorEvent): void {
    this.logger.error('WebSocket error occurred', error);
    this.handleError(new Error(error.message));
  }

  /**
   * Process incoming message
   */
  private processMessage(message: WebSocketMessage): void {
    this.logger.debug(`📥 Received message: ${JSON.stringify(message.data).substring(0, 100)}...`);

    // Update metrics
    this.metrics.recordMessage();

    // Handle different message types
    switch (message.data.e || message.data.type) {
      case 'heartbeat':
      case 'ping':
        this.handleHeartbeat(message);
        break;
      case 'pong':
        this.handlePong(message);
        break;
      default:
        this.emit('message', message);
        break;
    }
  }

  /**
   * Handle heartbeat message
   */
  private handleHeartbeat(message: WebSocketMessage): void {
    this.lastHeartbeat = new Date();

    // Send pong response
    this.send({
      type: 'pong',
      timestamp: this.lastHeartbeat.getTime()
    });
  }

  /**
   * Handle pong message
   */
  private handlePong(message: WebSocketMessage): void {
    this.lastHeartbeat = new Date();

    // Calculate latency
    const latency = Date.now() - message.data.timestamp;
    this.metrics.recordLatency(latency);

    this.logger.debug(`🏓 Pong received, latency: ${latency}ms`);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        const now = new Date();
        const timeSinceLastHeartbeat = now.getTime() - this.lastHeartbeat.getTime();

        if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
          this.logger.warn(`Heartbeat timeout after ${timeSinceLastHeartbeat}ms`);
          this.handleConnectionError(new Error('Heartbeat timeout'));
        } else {
          this.send({
            type: 'ping',
            timestamp: now.getTime()
          });
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.logger.error(`Max reconnection attempts (${this.config.maxReconnectAttempts}) reached`);
      this.openCircuitBreaker();
      return;
    }

    const delay = this.calculateReconnectDelay();
    this.logger.info(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.scheduleReconnection();
      }
    }, delay);
  }

  /**
   * Calculate reconnection delay with exponential backoff
   */
  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const maxDelay = 30000; // 30 seconds max

    return Math.min(exponentialDelay + Math.random() * 1000, maxDelay);
  }

  /**
   * Validate message sequence number
   */
  private validateSequence(message: WebSocketMessage): boolean {
    if (!message.sequence) return true;

    const expectedSequence = this.lastSequenceNumber + 1;
    if (message.sequence === expectedSequence) {
      this.lastSequenceNumber = message.sequence;
      return true;
    }

    this.logger.warn(`Sequence validation failed: expected ${expectedSequence}, got ${message.sequence}`);
    return false;
  }

  /**
   * Process queued messages after reconnection
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message.data);
      }
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: any): void {
    this.logger.error('Connection error occurred', error);
    this.handleError(error);
    this.scheduleReconnection();
  }

  /**
   * Handle general error
   */
  private handleError(error: any): void {
    this.failureCount++;

    // Update circuit breaker
    if (this.failureCount >= 5) {
      this.openCircuitBreaker();
    }

    this.emit('error', error);
  }

  /**
   * Circuit breaker logic
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerState = 'open';
    this.logger.warn('Circuit breaker opened due to repeated failures');

    // Try to close circuit breaker after timeout
    setTimeout(() => {
      this.circuitBreakerState = 'half-open';
      this.logger.info('Circuit breaker in half-open state, testing connection...');
    }, 60000); // 1 minute
  }

  private resetCircuitBreaker(): void {
    this.circuitBreakerState = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('connected', () => {
      this.successCount++;
      if (this.circuitBreakerState === 'half-open' && this.successCount >= 3) {
        this.circuitBreakerState = 'closed';
        this.logger.info('Circuit breaker closed after successful recovery');
      }
    });
  }
}
