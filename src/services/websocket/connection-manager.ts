import { config } from "../../config/env";

// Connection states for state management
export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
  CIRCUIT_OPEN = "circuit_open",
}

// Configuration for a specific WebSocket connection
export interface ConnectionConfig {
  url: string;
  name: string;
  authParams?: Record<string, string>;
  authHeaders?: Record<string, string>;
  initialBackoff?: number;
  maxBackoff?: number;
  backoffFactor?: number;
  maxRetries?: number;
  pingInterval?: number;
  pingMessage?: string | object;
  silentFailure?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerResetTimeout?: number;
}

// Statistics about a connection
export interface ConnectionStats {
  name: string;
  state: ConnectionState;
  connectTime: number | null;
  disconnectTime: number | null;
  lastMessageTime: number | null;
  messageCount: number;
  errorCount: number;
  retryCount: number;
  currentBackoff: number;
  latency: number[];
  circuitBreakerTriggered: boolean;
  circuitBreakerResetTime: number | null;
}

// Default configuration for connections
const DEFAULT_CONFIG: Partial<ConnectionConfig> = {
  initialBackoff: 1000,
  maxBackoff: 30000,
  backoffFactor: 1.5,
  maxRetries: 10,
  pingInterval: 30000,
  silentFailure: false,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeout: 60000,
};

export type ConnectionEventType =
  | "open"
  | "close"
  | "message"
  | "error"
  | "reconnect"
  | "circuit_breaker"
  | "circuit_reset";
export type ConnectionEventHandler = (event: any) => void;

/**
 * WebSocket Connection Manager
 *
 * Handles creating and managing WebSocket connections with features:
 * - Authentication
 * - Exponential backoff reconnection
 * - Circuit breaker pattern
 * - Environment-aware operation (mock in dev, real in prod)
 * - Connection statistics
 * - Graceful degradation
 */
export class ConnectionManager {
  private socket: WebSocket | null = null;
  private config: ConnectionConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private retryCount: number = 0;
  private currentBackoff: number;
  private retryTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageCount: number = 0;
  private errorsSinceLastSuccess: number = 0;
  private eventHandlers: Map<ConnectionEventType, Set<ConnectionEventHandler>> =
    new Map();
  private stats: ConnectionStats;
  private mockMode: boolean;

  constructor(config: ConnectionConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentBackoff = this.config.initialBackoff || 1000;

    // Initialize stats
    this.stats = {
      name: this.config.name,
      state: ConnectionState.DISCONNECTED,
      connectTime: null,
      disconnectTime: null,
      lastMessageTime: null,
      messageCount: 0,
      errorCount: 0,
      retryCount: 0,
      currentBackoff: this.currentBackoff,
      latency: [],
      circuitBreakerTriggered: false,
      circuitBreakerResetTime: null,
    };

    // Determine if we should use mock mode
    this.mockMode = process.env.NODE_ENV === "development";

    // Bind methods to preserve this context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  /**
   * Connect to the WebSocket server
   */
  public async connect(): Promise<boolean> {
    // If we're already connecting or connected, don't try again
    if (
      this.state === ConnectionState.CONNECTING ||
      this.state === ConnectionState.CONNECTED
    ) {
      return true;
    }

    // If circuit breaker is open, check if we can reset it
    if (this.state === ConnectionState.CIRCUIT_OPEN) {
      if (
        this.stats.circuitBreakerResetTime &&
        Date.now() >= this.stats.circuitBreakerResetTime
      ) {
        this.resetCircuitBreaker();
      } else {
        // Circuit still open, fail silently if configured
        if (this.config.silentFailure) {
          return false;
        }
        throw new Error(
          `Circuit breaker open for ${this.config.name}. Cannot connect.`,
        );
      }
    }

    // Update state
    this.state = ConnectionState.CONNECTING;
    this.stats.state = ConnectionState.CONNECTING;

    try {
      // In development, use mock mode
      if (this.mockMode) {
        console.log(`[MockWS] Connecting to ${this.config.name} in mock mode`);
        this.simulateConnection();
        return true;
      }

      // Create the WebSocket connection
      this.socket = new WebSocket(this.config.url);

      // Set up event handlers
      this.socket.onopen = this.handleOpen;
      this.socket.onclose = this.handleClose;
      this.socket.onmessage = this.handleMessage;
      this.socket.onerror = this.handleError;

      return true;
    } catch (error) {
      this.handleConnectionError(error as Error);
      return false;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (
      this.socket &&
      (this.state === ConnectionState.CONNECTED ||
        this.state === ConnectionState.CONNECTING)
    ) {
      // Clear intervals and timeouts
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }

      // Close the socket
      this.socket.close();
      this.socket = null;

      // Update state
      this.state = ConnectionState.DISCONNECTED;
      this.stats.state = ConnectionState.DISCONNECTED;
      this.stats.disconnectTime = Date.now();

      // Notify listeners
      this.notifyEventHandlers("close", {
        code: 1000,
        reason: "Disconnected by client",
      });

      console.log(`Disconnected from ${this.config.name}`);
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  public send(data: string | object): boolean {
    if (this.mockMode) {
      console.log(`[MockWS] Sending message to ${this.config.name}:`, data);
      return true;
    }

    if (this.socket && this.state === ConnectionState.CONNECTED) {
      try {
        const message = typeof data === "string" ? data : JSON.stringify(data);
        this.socket.send(message);
        return true;
      } catch (error) {
        console.error(`Error sending message to ${this.config.name}:`, error);
        return false;
      }
    }

    return false;
  }

  /**
   * Add an event handler
   */
  public on(event: ConnectionEventType, handler: ConnectionEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }

  /**
   * Remove an event handler
   */
  public off(
    event: ConnectionEventType,
    handler: ConnectionEventHandler,
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get current connection statistics
   */
  public getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Handle the WebSocket open event
   */
  private handleOpen(event: Event): void {
    this.state = ConnectionState.CONNECTED;
    this.stats.state = ConnectionState.CONNECTED;
    this.stats.connectTime = Date.now();
    this.retryCount = 0;
    this.currentBackoff = this.config.initialBackoff || 1000;
    this.errorsSinceLastSuccess = 0;

    console.log(`Connected to ${this.config.name}`);

    // Start ping interval if configured
    if (this.config.pingInterval && this.config.pingInterval > 0) {
      this.startPingInterval();
    }

    // Authenticate if needed
    if (this.config.authParams || this.config.authHeaders) {
      this.authenticate();
    }

    // Notify listeners
    this.notifyEventHandlers("open", event);
  }

  /**
   * Handle the WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    const wasConnected = this.state === ConnectionState.CONNECTED;

    // Update state
    this.state = ConnectionState.DISCONNECTED;
    this.stats.state = ConnectionState.DISCONNECTED;
    this.stats.disconnectTime = Date.now();

    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    // Notify listeners
    this.notifyEventHandlers("close", event);

    // If we were connected, attempt to reconnect
    if (wasConnected && this.retryCount < (this.config.maxRetries || 10)) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    this.messageCount++;
    this.stats.messageCount++;
    this.stats.lastMessageTime = Date.now();

    // Reset error count as we received a message successfully
    this.errorsSinceLastSuccess = 0;

    // Parse the message if it's JSON
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(event.data);
    } catch (error) {
      parsedMessage = event.data;
    }

    // Notify listeners
    this.notifyEventHandlers("message", parsedMessage);
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(event: Event): void {
    this.stats.errorCount++;
    this.errorsSinceLastSuccess++;

    console.error(`WebSocket error in ${this.config.name}:`, event);

    // Notify listeners
    this.notifyEventHandlers("error", event);

    // Check if we need to trigger the circuit breaker
    if (
      this.errorsSinceLastSuccess >= (this.config.circuitBreakerThreshold || 5)
    ) {
      this.triggerCircuitBreaker();
    }
  }

  /**
   * Handle errors during connection establishment
   */
  private handleConnectionError(error: Error): void {
    this.state = ConnectionState.ERROR;
    this.stats.state = ConnectionState.ERROR;
    this.stats.errorCount++;
    this.errorsSinceLastSuccess++;

    console.error(`Error connecting to ${this.config.name}:`, error);

    // Notify listeners
    this.notifyEventHandlers("error", error);

    // Schedule reconnect
    this.scheduleReconnect();

    // Check if we need to trigger the circuit breaker
    if (
      this.errorsSinceLastSuccess >= (this.config.circuitBreakerThreshold || 5)
    ) {
      this.triggerCircuitBreaker();
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.state = ConnectionState.RECONNECTING;
    this.stats.state = ConnectionState.RECONNECTING;
    this.retryCount++;
    this.stats.retryCount = this.retryCount;

    console.log(
      `Scheduling reconnection to ${this.config.name} in ${this.currentBackoff}ms (attempt ${this.retryCount})`,
    );

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      this.connect();

      // Notify listeners
      this.notifyEventHandlers("reconnect", { attempt: this.retryCount });
    }, this.currentBackoff);

    // Increase backoff for next retry
    this.currentBackoff = Math.min(
      this.currentBackoff * (this.config.backoffFactor || 1.5),
      this.config.maxBackoff || 30000,
    );
    this.stats.currentBackoff = this.currentBackoff;
  }

  /**
   * Start the ping interval to keep the connection alive
   */
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket && this.state === ConnectionState.CONNECTED) {
        const pingMessage = this.config.pingMessage || {
          type: "ping",
          timestamp: Date.now(),
        };
        this.send(pingMessage);
      }
    }, this.config.pingInterval);
  }

  /**
   * Authenticate with the WebSocket server if required
   */
  private authenticate(): void {
    if (this.state !== ConnectionState.CONNECTED || !this.socket) {
      return;
    }

    // For basic WebSocket, we can send an auth message
    if (this.config.authParams) {
      const authMessage = {
        type: "auth",
        ...this.config.authParams,
        timestamp: Date.now(),
      };

      this.send(authMessage);
    }
  }

  /**
   * Trigger the circuit breaker
   */
  private triggerCircuitBreaker(): void {
    if (this.state === ConnectionState.CIRCUIT_OPEN) {
      return; // Already open
    }

    console.warn(
      `Circuit breaker triggered for ${this.config.name} - too many failures`,
    );

    // Update state
    this.state = ConnectionState.CIRCUIT_OPEN;
    this.stats.state = ConnectionState.CIRCUIT_OPEN;
    this.stats.circuitBreakerTriggered = true;
    this.stats.circuitBreakerResetTime =
      Date.now() + (this.config.circuitBreakerResetTimeout || 60000);

    // Disconnect if connected
    if (this.socket) {
      this.disconnect();
    }

    // Clear any retry timeouts
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Notify listeners
    this.notifyEventHandlers("circuit_breaker", {
      errorCount: this.errorsSinceLastSuccess,
      resetTime: this.stats.circuitBreakerResetTime,
    });

    // If we need to send admin notification, do it here
    this.sendAdminNotification(
      `Circuit breaker triggered for ${this.config.name} WebSocket connection.`,
    );
  }

  /**
   * Reset the circuit breaker
   */
  private resetCircuitBreaker(): void {
    console.log(`Resetting circuit breaker for ${this.config.name}`);

    // Reset stats
    this.stats.circuitBreakerTriggered = false;
    this.stats.circuitBreakerResetTime = null;
    this.errorsSinceLastSuccess = 0;
    this.retryCount = 0;
    this.currentBackoff = this.config.initialBackoff || 1000;
    this.stats.currentBackoff = this.currentBackoff;

    // Update state
    this.state = ConnectionState.DISCONNECTED;
    this.stats.state = ConnectionState.DISCONNECTED;

    // Notify listeners
    this.notifyEventHandlers("circuit_reset", {
      timestamp: Date.now(),
    });
  }

  /**
   * Notify all registered event handlers for an event
   */
  private notifyEventHandlers(event: ConnectionEventType, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  /**
   * Send an admin notification - would integrate with your notification system
   */
  private sendAdminNotification(message: string): void {
    console.warn(`ADMIN NOTIFICATION: ${message}`);
    // In a real app, this would send an email, Slack message, etc.
  }

  /**
   * In mock mode, simulate a successful connection
   */
  private simulateConnection(): void {
    // Simulate connecting
    setTimeout(() => {
      // Simulate open event
      this.state = ConnectionState.CONNECTED;
      this.stats.state = ConnectionState.CONNECTED;
      this.stats.connectTime = Date.now();

      console.log(`[MockWS] Connected to ${this.config.name}`);

      // Notify listeners
      this.notifyEventHandlers("open", { mock: true });
    }, 100);
  }
}
