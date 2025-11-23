import { WebSocketService, WebSocketMessage } from "./websocket";
import { RedisService } from "./redis";
import { config } from "../config/env";

export interface RealTimePrice {
  symbol: string;
  price: number;
  timestamp: number;
  volume24h: number;
  priceChange24h: number;
  source: string;
  isStale: boolean;
}

export interface OrderBookUpdate {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][];
  timestamp: number;
  source: string;
  sequenceNumber: number;
}

export interface TradeUpdate {
  symbol: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
  timestamp: number;
  source: string;
  tradeId: string;
}

type PriceCallback = (price: RealTimePrice) => void;
type OrderBookCallback = (orderBook: OrderBookUpdate) => void;
type TradeCallback = (trade: TradeUpdate) => void;
type ErrorCallback = (error: Error) => void;

interface SourceStatus {
  isAvailable: boolean;
  lastUpdate: number;
  errorCount: number;
  latency: number[];
}

/**
 * RealTimeMarketService
 *
 * Provides real-time market data from multiple sources with robust error handling,
 * failover capabilities, and graceful degradation.
 */
export class RealTimeMarketService {
  private ws: WebSocketService;
  private redis: RedisService;
  private priceSubscriptions: Map<string, Set<PriceCallback>>;
  private orderBookSubscriptions: Map<string, Set<OrderBookCallback>>;
  private tradeSubscriptions: Map<string, Set<TradeCallback>>;
  private errorHandlers: Set<ErrorCallback>;
  private sourceStatus: Map<string, SourceStatus>;
  private priceCache: Map<string, RealTimePrice>;
  private orderBookCache: Map<string, OrderBookUpdate>;
  private lastTradeCache: Map<string, TradeUpdate>;
  private dataValidationRules: Map<string, ((data: any) => boolean)[]>;
  private readonly STALE_THRESHOLD = 30000; // 30 seconds
  private readonly MAX_ERROR_COUNT = 5;
  private readonly MAX_LATENCY_SAMPLES = 100;
  private healthCheckInterval!: NodeJS.Timeout;
  private readonly CACHE_KEYS = {
    PRICE: "realtime:price",
    ORDER_BOOK: "realtime:orderbook",
    TRADE: "realtime:trade",
    SOURCE_STATUS: "realtime:source:status",
  };

  constructor() {
    this.ws = new WebSocketService();
    this.redis = RedisService.getInstance();
    this.priceSubscriptions = new Map();
    this.orderBookSubscriptions = new Map();
    this.tradeSubscriptions = new Map();
    this.errorHandlers = new Set();
    this.sourceStatus = new Map();
    this.priceCache = new Map();
    this.orderBookCache = new Map();
    this.lastTradeCache = new Map();
    this.dataValidationRules = this.setupDataValidation();
    this.initializeSourceStatus();
    this.startHealthCheck();
    this.setupWebSocketHandlers();
    this.restoreStateFromCache();
  }

  /**
   * Set up WebSocket handlers for different data sources
   */
  private setupWebSocketHandlers(): void {
    // Handle messages from Binance
    this.ws.on("binance:ticker", (message: WebSocketMessage) => {
      this.handlePriceMessage(message.data.s.toLowerCase(), message);
    });

    this.ws.on("binance:orderbook", (message: WebSocketMessage) => {
      const symbol = message.data.s ? message.data.s.toLowerCase() : "";
      this.handleOrderBookMessage(symbol, message);
    });

    this.ws.on("binance:trade", (message: WebSocketMessage) => {
      const symbol = message.data.s ? message.data.s.toLowerCase() : "";
      this.handleTradeMessage(symbol, message);
    });

    // Handle messages from CoinGecko
    this.ws.on("coingecko:price", (message: WebSocketMessage) => {
      if (message.data && message.data.data && message.data.data.id) {
        const symbolMap: Record<string, string> = {
          bitcoin: "btcusdt",
          ethereum: "ethusdt",
          binancecoin: "bnbusdt",
          solana: "solusdt",
          ripple: "xrpusdt",
        };

        const symbol = symbolMap[message.data.data.id];
        if (symbol) {
          this.handlePriceMessage(symbol, message);
        }
      }
    });

    // Handle errors
    this.ws.market.on("error", (error: any) => {
      this.handleError(
        new Error(`Market data error: ${error.message || "Unknown error"}`),
      );
    });
  }

  private setupDataValidation(): Map<string, ((data: any) => boolean)[]> {
    const rules = new Map();

    // Price validation rules
    rules.set("price", [
      (data: RealTimePrice) => data.price > 0,
      (data: RealTimePrice) => data.timestamp <= Date.now(),
      (data: RealTimePrice) => typeof data.volume24h === "number",
    ]);

    // Order book validation rules
    rules.set("orderBook", [
      (data: OrderBookUpdate) => data.bids.length > 0 && data.asks.length > 0,
      (data: OrderBookUpdate) => data.bids.every(([p, q]) => p > 0 && q > 0),
      (data: OrderBookUpdate) => data.asks.every(([p, q]) => p > 0 && q > 0),
      (data: OrderBookUpdate) => data.bids[0][0] < data.asks[0][0], // Check for crossed book
    ]);

    // Trade validation rules
    rules.set("trade", [
      (data: TradeUpdate) => data.price > 0 && data.quantity > 0,
      (data: TradeUpdate) => ["buy", "sell"].includes(data.side),
      (data: TradeUpdate) => data.timestamp <= Date.now(),
    ]);

    return rules;
  }

  private initializeSourceStatus() {
    ["binance", "coingecko"].forEach((source) => {
      this.sourceStatus.set(source, {
        isAvailable: true,
        lastUpdate: Date.now(),
        errorCount: 0,
        latency: [],
      });
    });
  }

  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();

      // Check data staleness and source health
      this.sourceStatus.forEach((status, source) => {
        const timeSinceUpdate = now - status.lastUpdate;

        if (timeSinceUpdate > this.STALE_THRESHOLD) {
          this.handleSourceIssue(
            source,
            new Error(`Data from ${source} is stale`),
          );
        }

        // Calculate and monitor average latency
        if (status.latency.length > 0) {
          const avgLatency =
            status.latency.reduce((a, b) => a + b) / status.latency.length;
          if (avgLatency > 5000) {
            // 5 seconds threshold
            this.notifyHighLatency(source, avgLatency);
          }
        }
      });

      // Mark stale prices
      this.priceCache.forEach((price, symbol) => {
        if (now - price.timestamp > this.STALE_THRESHOLD) {
          price.isStale = true;
          this.notifyPriceSubscribers(symbol, price);
        }
      });
    }, 5000); // Run every 5 seconds
  }

  private handleSourceIssue(source: string, error: Error) {
    const status = this.sourceStatus.get(source);
    if (!status) return;

    status.errorCount++;
    console.warn(`Issue detected with source ${source}:`, error.message);

    if (status.errorCount >= this.MAX_ERROR_COUNT) {
      status.isAvailable = false;
      this.notifySourceUnavailable(source);
      this.fallbackToAlternativeSource(source);
    }

    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (e) {
        console.error("Error in error handler:", e);
      }
    });
  }

  private fallbackToAlternativeSource(failedSource: string) {
    const availableSources = Array.from(this.sourceStatus.entries()).filter(
      ([source, status]) => source !== failedSource && status.isAvailable,
    );

    if (availableSources.length === 0) {
      this.notifyNoAvailableSources();
      return;
    }

    // Sort by latency and error count
    const bestAlternative = availableSources.sort(([, a], [, b]) => {
      const aScore = this.calculateSourceScore(a);
      const bScore = this.calculateSourceScore(b);
      return bScore - aScore;
    })[0][0];

    console.log(`Failing over to ${bestAlternative} from ${failedSource}`);
    this.switchToSource(bestAlternative);
  }

  private calculateSourceScore(status: SourceStatus): number {
    const avgLatency =
      status.latency.reduce((a, b) => a + b, 0) / status.latency.length;
    return (
      (status.isAvailable ? 1000 : 0) -
      status.errorCount * 100 -
      avgLatency / 100
    );
  }

  private switchToSource(newSource: string) {
    // Connect to the new source if not already connected
    this.ws.connectToSource(newSource);

    // Resubscribe all active subscriptions to the new source
    this.priceSubscriptions.forEach((_, symbol) => {
      this.resubscribeSymbol(symbol, newSource);
    });
  }

  private resubscribeSymbol(symbol: string, source: string) {
    if (source === "binance") {
      this.ws.market.subscribe(symbol);
    } else if (source === "coingecko") {
      // CoinGecko doesn't require per-symbol subscription
    }
  }

  private validateData(type: string, data: any): boolean {
    const rules = this.dataValidationRules.get(type);
    if (!rules) return true;

    return rules.every((rule) => {
      try {
        return rule(data);
      } catch (error) {
        console.error(`Validation error for ${type}:`, error);
        return false;
      }
    });
  }

  private updateSourceStatus(source: string, messageTimestamp: number) {
    const status = this.sourceStatus.get(source);
    if (!status) return;

    const latency = Date.now() - messageTimestamp;
    status.latency.push(latency);
    if (status.latency.length > this.MAX_LATENCY_SAMPLES) {
      status.latency.shift();
    }

    status.lastUpdate = Date.now();
    status.errorCount = 0; // Reset error count on successful update

    if (!status.isAvailable) {
      status.isAvailable = true;
      this.notifySourceRecovered(source);
    }

    this.updateSourceStatusCache(source, status);
  }

  private async restoreStateFromCache(): Promise<void> {
    try {
      // For each symbol in the supported coins list, try to restore from cache
      for (const coin of config.supportedCoins) {
        const symbol = `${coin.symbol.toLowerCase()}usdt`;

        // Restore price
        const cachedPrice = await this.getLatestPriceFromCache(symbol);
        if (cachedPrice) {
          this.priceCache.set(symbol, cachedPrice);
        }

        // Restore order book
        const cachedOrderBook = await this.getLatestOrderBookFromCache(symbol);
        if (cachedOrderBook) {
          this.orderBookCache.set(symbol, cachedOrderBook);
        }
      }
    } catch (error) {
      console.error("Error restoring state from cache:", error);
    }
  }

  private async updateCache<T>(
    type: keyof typeof this.CACHE_KEYS,
    symbol: string,
    data: T,
  ): Promise<void> {
    try {
      const key = `${this.CACHE_KEYS[type]}:${symbol}`;
      await this.redis.set(key, data, 3600); // Cache for 1 hour
    } catch (error) {
      console.error(`Error updating cache for ${type} ${symbol}:`, error);
    }
  }

  private async updateSourceStatusCache(
    source: string,
    status: SourceStatus,
  ): Promise<void> {
    try {
      const key = `${this.CACHE_KEYS.SOURCE_STATUS}:${source}`;
      await this.redis.set(key, status, 3600);
    } catch (error) {
      console.error(`Error updating source status cache for ${source}:`, error);
    }
  }

  private async getLatestPriceFromCache(symbol: string): Promise<any> {
    try {
      const key = `${this.CACHE_KEYS.PRICE}:${symbol}`;
      return await this.redis.get(key);
    } catch (error) {
      console.error(
        `Error getting latest price from cache for ${symbol}:`,
        error,
      );
      return null;
    }
  }

  private async getLatestOrderBookFromCache(symbol: string): Promise<any> {
    try {
      const key = `${this.CACHE_KEYS.ORDER_BOOK}:${symbol}`;
      return await this.redis.get(key);
    } catch (error) {
      console.error(
        `Error getting latest order book from cache for ${symbol}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Subscribe to real-time price updates for a symbol
   */
  async subscribeToPriceUpdates(
    symbol: string,
    callback: PriceCallback,
  ): Promise<void> {
    // Add to subscription list
    if (!this.priceSubscriptions.has(symbol)) {
      this.priceSubscriptions.set(symbol, new Set());
    }

    const callbacks = this.priceSubscriptions.get(symbol);
    if (callbacks) {
      callbacks.add(callback);
    }

    // Subscribe to the best available source
    const bestSource = this.selectBestSource();
    this.subscribeToSource(symbol, bestSource);

    // If we have cached data, send it immediately
    const cachedPrice = this.priceCache.get(symbol);
    if (cachedPrice) {
      callback(cachedPrice);
    } else {
      // Try to get from Redis cache
      const redisCache = await this.getLatestPriceFromCache(symbol);
      if (redisCache) {
        callback(redisCache);
      }
    }
  }

  /**
   * Unsubscribe from price updates for a symbol
   */
  unsubscribeFromPriceUpdates(symbol: string, callback: PriceCallback) {
    const callbacks = this.priceSubscriptions.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);

      // If no more subscribers, unsubscribe from the source
      if (callbacks.size === 0) {
        this.priceSubscriptions.delete(symbol);

        // Unsubscribe from all sources
        ["binance", "coingecko"].forEach((source) => {
          if (source === "binance") {
            this.ws.market.unsubscribe(symbol);
          }
          // CoinGecko doesn't require per-symbol unsubscription
        });
      }
    }
  }

  private selectBestSource(): string {
    // Find the source with the best score
    const sources = Array.from(this.sourceStatus.entries());

    const availableSources = sources.filter(([, status]) => status.isAvailable);

    if (availableSources.length === 0) {
      // All sources are unavailable, use any
      return "binance"; // Default to binance
    }

    // Sort by score
    return availableSources.sort(([, a], [, b]) => {
      const aScore = this.calculateSourceScore(a);
      const bScore = this.calculateSourceScore(b);
      return bScore - aScore;
    })[0][0];
  }

  /**
   * Register an error handler
   */
  onError(callback: ErrorCallback) {
    this.errorHandlers.add(callback);
  }

  private notifySourceUnavailable(source: string) {
    console.warn(`Source ${source} is unavailable`);
  }

  private notifySourceRecovered(source: string) {
    console.log(`Source ${source} has recovered`);
  }

  private notifyHighLatency(source: string, latency: number) {
    console.warn(
      `High latency (${latency.toFixed(0)}ms) detected for ${source}`,
    );
  }

  private notifyNoAvailableSources() {
    console.error("No available market data sources");
    this.handleError(new Error("All market data sources are unavailable"));
  }

  /**
   * Subscribe to order book updates for a symbol
   */
  async subscribeToOrderBookUpdates(
    symbol: string,
    callback: OrderBookCallback,
  ): Promise<void> {
    // Add to subscription list
    if (!this.orderBookSubscriptions.has(symbol)) {
      this.orderBookSubscriptions.set(symbol, new Set());
    }

    const callbacks = this.orderBookSubscriptions.get(symbol);
    if (callbacks) {
      callbacks.add(callback);
    }

    // Subscribe to WebSocket for order book data
    this.ws.subscribe(
      "binance",
      `${symbol.toLowerCase()}@depth20@100ms`,
      (message: WebSocketMessage) =>
        this.handleOrderBookMessage(symbol, message),
    );

    // If we have cached data, send it immediately
    const cachedOrderBook = this.orderBookCache.get(symbol);
    if (cachedOrderBook) {
      callback(cachedOrderBook);
    }
  }

  /**
   * Unsubscribe from order book updates for a symbol
   */
  unsubscribeFromOrderBookUpdates(symbol: string, callback: OrderBookCallback) {
    const callbacks = this.orderBookSubscriptions.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.orderBookSubscriptions.delete(symbol);

        // Unsubscribe from WebSocket
        const handler = (message: WebSocketMessage) =>
          this.handleOrderBookMessage(symbol, message);
        this.ws.unsubscribe(
          "binance",
          `${symbol.toLowerCase()}@depth20@100ms`,
          handler,
        );
      }
    }
  }

  /**
   * Subscribe to trade updates for a symbol
   */
  subscribeToTradeUpdates(symbol: string, callback: TradeCallback) {
    // Add to subscription list
    if (!this.tradeSubscriptions.has(symbol)) {
      this.tradeSubscriptions.set(symbol, new Set());
    }

    const callbacks = this.tradeSubscriptions.get(symbol);
    if (callbacks) {
      callbacks.add(callback);
    }

    // Subscribe to WebSocket for trade data
    const handler = (message: WebSocketMessage) =>
      this.handleTradeMessage(symbol, message);
    this.ws.subscribe("binance", `${symbol.toLowerCase()}@trade`, handler);

    // If we have cached data, send it immediately
    const cachedTrade = this.lastTradeCache.get(symbol);
    if (cachedTrade) {
      callback(cachedTrade);
    }
  }

  /**
   * Unsubscribe from trade updates for a symbol
   */
  unsubscribeFromTradeUpdates(symbol: string, callback: TradeCallback) {
    const callbacks = this.tradeSubscriptions.get(symbol);
    if (callbacks) {
      callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.tradeSubscriptions.delete(symbol);

        // Unsubscribe from WebSocket
        const handler = (message: WebSocketMessage) =>
          this.handleTradeMessage(symbol, message);
        this.ws.unsubscribe(
          "binance",
          `${symbol.toLowerCase()}@trade`,
          handler,
        );
      }
    }
  }

  /**
   * Handle price messages from WebSocket
   */
  private async handlePriceMessage(
    symbol: string,
    message: WebSocketMessage,
  ): Promise<void> {
    try {
      const source = message.source || "unknown";
      let price: RealTimePrice;

      if (source === "binance") {
        // Parse Binance ticker format
        const data = message.data;
        price = {
          symbol: symbol,
          price: parseFloat(data.c), // Last price
          timestamp: data.E || Date.now(),
          volume24h: parseFloat(data.v),
          priceChange24h: parseFloat(data.p),
          source: "binance",
          isStale: false,
        };
      } else if (source === "coingecko") {
        // Parse CoinGecko format
        const data = message.data.data;
        price = {
          symbol: symbol,
          price: data.current_price,
          timestamp: new Date(data.last_updated).getTime(),
          volume24h: data.total_volume,
          priceChange24h: data.price_change_percentage_24h,
          source: "coingecko",
          isStale: false,
        };
      } else {
        console.warn(`Unknown price message source: ${source}`);
        return;
      }

      // Validate the data
      if (!this.validateData("price", price)) {
        console.warn(`Invalid price data for ${symbol} from ${source}`);
        return;
      }

      // Update cache
      this.priceCache.set(symbol, price);
      this.updateCache("PRICE", symbol, price);

      // Update source status
      this.updateSourceStatus(source, price.timestamp);

      // Notify subscribers
      this.notifyPriceSubscribers(symbol, price);
    } catch (error) {
      console.error(`Error handling price message for ${symbol}:`, error);
      this.handleError(error as Error);
    }
  }

  /**
   * Handle order book messages from WebSocket
   */
  private async handleOrderBookMessage(
    symbol: string,
    message: WebSocketMessage,
  ): Promise<void> {
    try {
      const source = message.source || "unknown";
      const data = message.data;

      // Create order book update
      const orderBook: OrderBookUpdate = {
        symbol: symbol,
        bids: data.bids.map((bid: any) => [
          parseFloat(bid[0]),
          parseFloat(bid[1]),
        ]),
        asks: data.asks.map((ask: any) => [
          parseFloat(ask[0]),
          parseFloat(ask[1]),
        ]),
        timestamp: data.E || Date.now(),
        source: source,
        sequenceNumber: data.lastUpdateId || 0,
      };

      // Validate the data
      if (!this.validateData("orderBook", orderBook)) {
        console.warn(`Invalid order book data for ${symbol} from ${source}`);
        return;
      }

      // Update cache
      this.orderBookCache.set(symbol, orderBook);
      this.updateCache("ORDER_BOOK", symbol, orderBook);

      // Update source status
      this.updateSourceStatus(source, orderBook.timestamp);

      // Notify subscribers
      this.notifyOrderBookSubscribers(symbol, orderBook);
    } catch (error) {
      console.error(`Error handling order book message for ${symbol}:`, error);
      this.handleError(error as Error);
    }
  }

  /**
   * Handle trade messages from WebSocket
   */
  private handleTradeMessage(symbol: string, message: WebSocketMessage) {
    try {
      const source = message.source || "unknown";
      const data = message.data;

      // Create trade update
      const trade: TradeUpdate = {
        symbol: symbol,
        price: parseFloat(data.p),
        quantity: parseFloat(data.q),
        side: data.m ? "sell" : "buy", // m is true for sell, false for buy
        timestamp: data.E || Date.now(),
        source: source,
        tradeId: data.t.toString(),
      };

      // Validate the data
      if (!this.validateData("trade", trade)) {
        console.warn(`Invalid trade data for ${symbol} from ${source}`);
        return;
      }

      // Update cache
      this.lastTradeCache.set(symbol, trade);

      // Update source status
      this.updateSourceStatus(source, trade.timestamp);

      // Notify subscribers
      this.notifyTradeSubscribers(symbol, trade);
    } catch (error) {
      console.error(`Error handling trade message for ${symbol}:`, error);
      this.handleError(error as Error);
    }
  }

  /**
   * Close all connections and clean up
   */
  async close(): Promise<void> {
    // Clear the health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close WebSocket connections
    this.ws.close();

    // Clear subscriptions
    this.priceSubscriptions.clear();
    this.orderBookSubscriptions.clear();
    this.tradeSubscriptions.clear();
    this.errorHandlers.clear();

    console.log("RealTimeMarketService closed");
  }

  /**
   * Notify price subscribers of an update
   */
  private notifyPriceSubscribers(symbol: string, price: RealTimePrice) {
    const subscribers = this.priceSubscriptions.get(symbol);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(price);
        } catch (error) {
          console.error(`Error in price subscriber for ${symbol}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to a data source for a symbol
   */
  private subscribeToSource(symbol: string, source: string) {
    if (source === "binance") {
      this.ws.market.subscribe(symbol);
    } else if (source === "coingecko") {
      // For CoinGecko we don't need to specifically subscribe to a symbol
      this.ws.connectToSource("coingecko");
    }
  }

  /**
   * Handle errors in the service
   */
  private handleError(error: Error) {
    console.error("RealTimeMarketService error:", error);

    // Notify error handlers
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (e) {
        console.error("Error in error handler:", e);
      }
    });
  }

  /**
   * Notify order book subscribers of an update
   */
  private notifyOrderBookSubscribers(
    symbol: string,
    orderBook: OrderBookUpdate,
  ): void {
    const subscribers = this.orderBookSubscriptions.get(symbol);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(orderBook);
        } catch (error) {
          console.error(`Error in order book subscriber for ${symbol}:`, error);
        }
      });
    }
  }

  /**
   * Notify trade subscribers of an update
   */
  private notifyTradeSubscribers(symbol: string, trade: TradeUpdate): void {
    const subscribers = this.tradeSubscriptions.get(symbol);
    if (subscribers) {
      subscribers.forEach((callback) => {
        try {
          callback(trade);
        } catch (error) {
          console.error(`Error in trade subscriber for ${symbol}:`, error);
        }
      });
    }
  }
}
