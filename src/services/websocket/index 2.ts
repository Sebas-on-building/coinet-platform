import { ConnectionManager } from "./connection-manager";
import { ConnectionRegistry } from "./connection-registry";

export interface WebSocketMessage {
  type: string;
  data: any;
  source?: string;
  timestamp?: number;
}

export type MessageHandler = (message: WebSocketMessage) => void;

/**
 * WebSocket Service
 *
 * Provides a unified interface for WebSocket communication in the application
 * Uses the ConnectionManager and ConnectionRegistry for robust handling of connections
 */
export class WebSocketService {
  private registry: ConnectionRegistry;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private activeSubscriptions: Map<string, Set<string>> = new Map();
  private mockDataIntervals: NodeJS.Timeout[] = [];
  private mockMode: boolean;
  private connectedSources: Set<string> = new Set();

  // Public API for market data
  public market = {
    connect: () => this.connectToSource("binance"),
    subscribe: (symbol: string) => this.subscribeToMarketData(symbol),
    unsubscribe: (symbol: string) => this.unsubscribeFromMarketData(symbol),
    on: (channel: string, handler: MessageHandler) =>
      this.on(`market:${channel}`, handler),
    off: (channel: string, handler: MessageHandler) =>
      this.off(`market:${channel}`, handler),
  };

  // Public API for blockchain data
  public onChain = {
    connect: () => this.connectToSource("blockchain"),
    on: (channel: string, handler: MessageHandler) =>
      this.on(`blockchain:${channel}`, handler),
    off: (channel: string, handler: MessageHandler) =>
      this.off(`blockchain:${channel}`, handler),
  };

  constructor() {
    this.registry = ConnectionRegistry.getInstance();
    this.mockMode = process.env.NODE_ENV === "development";

    if (this.mockMode) {
      this.initMockMode();
      console.log(
        "[WebSocketService] Initialized in mock mode for development",
      );
    }
  }

  /**
   * Connect to a data source
   */
  public async connectToSource(source: string): Promise<boolean> {
    if (this.connectedSources.has(source)) {
      return true;
    }

    try {
      // Create or get the connection
      const connection =
        this.registry.getConnection(source) ||
        this.registry.createConnection(source, {});

      // Listen for messages from this connection
      connection.on("message", (message) => {
        this.handleMessage(source, message);
      });

      // Listen for errors
      connection.on("error", (error) => {
        console.error(`WebSocket error from ${source}:`, error);
      });

      // Listen for circuit breaker events
      connection.on("circuit_breaker", (data) => {
        console.warn(
          `Circuit breaker triggered for ${source}. Will retry after ${new Date(data.resetTime).toLocaleTimeString()}`,
        );
      });

      // Connect
      const success = await connection.connect();
      if (success) {
        this.connectedSources.add(source);
      }

      return success;
    } catch (error) {
      console.error(`Failed to connect to ${source}:`, error);
      return false;
    }
  }

  /**
   * Disconnect from a data source
   */
  public disconnectFromSource(source: string): boolean {
    const connection = this.registry.getConnection(source);
    if (connection) {
      connection.disconnect();
      this.connectedSources.delete(source);
      return true;
    }
    return false;
  }

  /**
   * Subscribe to market data for a symbol
   */
  private subscribeToMarketData(symbol: string): boolean {
    // Add to active subscriptions
    if (!this.activeSubscriptions.has("market")) {
      this.activeSubscriptions.set("market", new Set());
    }

    const subscriptions = this.activeSubscriptions.get("market")!;
    subscriptions.add(symbol);

    // If not mocked, send subscribe message
    if (!this.mockMode) {
      const connection = this.registry.getConnection("binance");
      if (connection) {
        connection.send({
          method: "SUBSCRIBE",
          params: [`${symbol.toLowerCase()}@ticker`],
          id: Date.now(),
        });
      }
    } else {
      this.startMockDataForSymbol(symbol);
    }

    return true;
  }

  /**
   * Unsubscribe from market data for a symbol
   */
  private unsubscribeFromMarketData(symbol: string): boolean {
    // Remove from active subscriptions
    const subscriptions = this.activeSubscriptions.get("market");
    if (subscriptions) {
      subscriptions.delete(symbol);
    }

    // If not mocked, send unsubscribe message
    if (!this.mockMode) {
      const connection = this.registry.getConnection("binance");
      if (connection) {
        connection.send({
          method: "UNSUBSCRIBE",
          params: [`${symbol.toLowerCase()}@ticker`],
          id: Date.now(),
        });
      }
    }

    return true;
  }

  /**
   * Add a message handler
   */
  public on(channel: string, handler: MessageHandler): this {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, new Set());
    }

    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      handlers.add(handler);
    }

    return this;
  }

  /**
   * Remove a message handler
   */
  public off(channel: string, handler: MessageHandler): this {
    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      handlers.delete(handler);
    }

    return this;
  }

  /**
   * Subscribe to a specific data channel
   */
  public subscribe(
    source: string,
    channel: string,
    handler: MessageHandler,
  ): this {
    // Make sure we're connected to the source
    this.connectToSource(source);

    // Add the handler
    this.on(`${source}:${channel}`, handler);

    return this;
  }

  /**
   * Unsubscribe from a specific data channel
   */
  public unsubscribe(
    source: string,
    channel: string,
    handler: MessageHandler,
  ): this {
    this.off(`${source}:${channel}`, handler);
    return this;
  }

  /**
   * Handle a message from a connection
   */
  private handleMessage(source: string, message: any): void {
    try {
      // Create a standardized message format
      const standardMessage: WebSocketMessage = {
        type: this.determineMessageType(message),
        data: message,
        source,
        timestamp: Date.now(),
      };

      // Notify specific channel handlers
      this.notifyHandlers(`${source}:${standardMessage.type}`, standardMessage);

      // Notify all handlers for the source
      this.notifyHandlers(source, standardMessage);
    } catch (error) {
      console.error(`Error handling message from ${source}:`, error);
    }
  }

  /**
   * Determine the type of message based on its content
   */
  private determineMessageType(message: any): string {
    if (typeof message === "object" && message !== null) {
      if (message.e === "ticker") return "ticker";
      if (message.e === "kline") return "kline";
      if (message.e === "trade") return "trade";
      if (message.e === "depth") return "orderbook";
      if (message.type) return message.type;
    }

    return "unknown";
  }

  /**
   * Notify all handlers for a channel
   */
  private notifyHandlers(channel: string, message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(channel);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in handler for ${channel}:`, error);
        }
      });
    }
  }

  /**
   * Initialize mock mode for development
   */
  private initMockMode(): void {
    // Start basic mock data intervals
    this.startMockDataInterval("btcusdt", "bitcoin");
    this.startMockDataInterval("ethusdt", "ethereum");
  }

  /**
   * Start mock data for a symbol
   */
  private startMockDataForSymbol(symbol: string): void {
    // Only start if not already running
    const symbolLower = symbol.toLowerCase();
    if (symbolLower === "btcusdt" || symbolLower === "ethusdt") {
      return; // Already covered by default intervals
    }

    // Determine a reasonable mock price
    let basePrice = 100;
    if (symbolLower.includes("btc")) basePrice = 45000;
    else if (symbolLower.includes("eth")) basePrice = 3000;
    else if (symbolLower.includes("bnb")) basePrice = 400;
    else if (symbolLower.includes("sol")) basePrice = 150;

    this.startMockDataInterval(symbolLower, symbol, basePrice);
  }

  /**
   * Start a mock data interval for a symbol
   */
  private startMockDataInterval(
    symbol: string,
    name: string,
    basePrice: number = 100,
  ): void {
    const interval = setInterval(
      () => {
        // Random price movements
        const priceChange = (Math.random() - 0.5) * 0.01 * basePrice;
        const price = basePrice + priceChange;
        const volume = 1000 + Math.random() * 500;

        // Emit mock ticker update
        this.emitMockMessage("binance", {
          e: "ticker",
          E: Date.now(),
          s: symbol.toUpperCase(),
          p: priceChange.toFixed(2),
          P: ((priceChange / basePrice) * 100).toFixed(2),
          w: price.toFixed(2), // weighted average
          c: price.toFixed(2), // close
          Q: (10 + Math.random() * 5).toFixed(2),
          o: (price - 1).toFixed(2),
          h: (price + 2).toFixed(2),
          l: (price - 2).toFixed(2),
          v: volume.toFixed(2),
          q: (volume * price).toFixed(2),
          O: Date.now() - 86400000,
          C: Date.now(),
          n: 100000,
        });

        // Emit mock kline update
        this.emitMockMessage("binance", {
          e: "kline",
          E: Date.now(),
          s: symbol.toUpperCase(),
          k: {
            t: Date.now() - 60000,
            T: Date.now(),
            s: symbol.toUpperCase(),
            i: "1m",
            f: 100,
            L: 200,
            o: (price - 1).toFixed(2),
            c: price.toFixed(2),
            h: (price + 0.5).toFixed(2),
            l: (price - 0.5).toFixed(2),
            v: (volume / 60).toFixed(2),
            n: 60,
            x: false,
            q: ((volume / 60) * price).toFixed(2),
            V: (volume / 120).toFixed(2),
            Q: ((volume / 120) * price).toFixed(2),
          },
        });

        // Also emit mock coingecko data
        this.emitMockMessage("coingecko", {
          type: "price",
          data: {
            id: name,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            symbol: symbol.slice(0, 3).toUpperCase(),
            current_price: price,
            market_cap: price * 1000000,
            total_volume: volume * price,
            price_change_percentage_24h: (priceChange / basePrice) * 100,
            last_updated: new Date().toISOString(),
          },
        });
      },
      5000 + Math.random() * 3000,
    ); // Random interval between 5-8 seconds

    this.mockDataIntervals.push(interval);
  }

  /**
   * Emit a mock message
   */
  private emitMockMessage(source: string, message: any): void {
    this.handleMessage(source, message);
  }

  /**
   * Close all connections
   */
  public close(): void {
    // Clear all mock intervals
    this.mockDataIntervals.forEach((interval) => clearInterval(interval));
    this.mockDataIntervals = [];

    // Close registry
    this.registry.closeAllConnections();

    // Clear handlers and subscriptions
    this.messageHandlers.clear();
    this.activeSubscriptions.clear();
    this.connectedSources.clear();

    console.log("[WebSocketService] Closed all connections");
  }
}
