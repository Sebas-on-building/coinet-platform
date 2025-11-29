import { WebSocket } from "ws";
import { EventEmitter } from "events";
import {
  calculateBollingerBands,
  calculateIchimoku,
  calculateStochastic,
  calculateADX,
  calculateOBV,
  calculateVWAP,
} from "../analysis/technicalIndicatorsService";

// Data provider endpoints with authentication
const DATA_PROVIDERS = {
  BINANCE: {
    ws: "wss://stream.binance.com:9443/ws",
    rest: "https://api.binance.com/api/v3",
    requiresAuth: true,
  },
  COINBASE: {
    ws: "wss://ws-feed.pro.coinbase.com",
    rest: "https://api.pro.coinbase.com",
    requiresAuth: true,
  },
  KRAKEN: {
    ws: "wss://ws.kraken.com",
    rest: "https://api.kraken.com/0",
    requiresAuth: true,
  },
  HUOBI: {
    ws: "wss://api.huobi.pro/ws",
    rest: "https://api.huobi.pro",
    requiresAuth: true,
  },
  FTX: {
    ws: "wss://ftx.com/ws/",
    rest: "https://ftx.com/api",
    requiresAuth: true,
  },
};

interface MarketData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
  indicators?: any;
}

interface OrderBookEntry {
  price: number;
  quantity: number;
  side: "bid" | "ask";
}

interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: "buy" | "sell";
  timestamp: string;
  source: string;
}

interface OrderBookUpdate {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: string;
  source: string;
}

interface TradeHistoryUpdate {
  symbol: string;
  trades: Trade[];
  timestamp: string;
  source: string;
}

interface Subscription {
  symbol: string;
  interval: string;
  callbacks: {
    onMarketData?: (data: MarketData[]) => void;
    onOrderBook?: (data: OrderBookUpdate) => void;
    onTradeHistory?: (data: TradeHistoryUpdate) => void;
  };
}

type Provider = keyof typeof DATA_PROVIDERS;

export class TechnicalIndicatorsWebSocket extends EventEmitter {
  private static instance: TechnicalIndicatorsWebSocket;
  private connections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private marketData: Map<string, Map<string, MarketData[]>> = new Map();
  private orderBooks: Map<string, OrderBookUpdate> = new Map();
  private tradeHistory: Map<string, Trade[]> = new Map();
  private readonly MAX_DATA_POINTS = 1000;
  private readonly RECONNECT_DELAY = 5000;
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly SUPPORTED_INTERVALS = [
    "1m",
    "3m",
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "4h",
    "6h",
    "8h",
    "12h",
    "1d",
    "3d",
    "1w",
    "1M",
  ];

  private constructor() {
    super();
    this.initializeConnections();
  }

  private initializeConnections() {
    (Object.keys(DATA_PROVIDERS) as Provider[]).forEach((provider) => {
      this.connectToProvider(provider, DATA_PROVIDERS[provider].ws);
    });
  }

  private connectToProvider(provider: Provider, url: string) {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`Connected to ${provider} WebSocket`);
        this.resubscribeToProvider(provider);
      };

      ws.onmessage = (event) => {
        this.handleProviderMessage(provider, event.data);
      };

      ws.onerror = (error) => {
        console.error(`${provider} WebSocket error:`, error);
        this.handleProviderError(provider);
      };

      ws.onclose = () => {
        console.log(`${provider} WebSocket closed`);
        this.handleProviderDisconnect(provider);
      };

      this.connections.set(provider, ws);
    } catch (error) {
      console.error(`Failed to connect to ${provider}:`, error);
      this.handleProviderError(provider);
    }
  }

  private handleProviderMessage(provider: Provider, data: any) {
    try {
      const message = JSON.parse(data.toString());

      // Validate message format
      if (!this.isValidMessageFormat(provider, message)) {
        console.error(`Invalid message format from ${provider}:`, message);
        return;
      }

      if (provider === "BINANCE") {
        this.handleBinanceMessage(message);
      } else if (provider === "COINBASE") {
        this.handleCoinbaseMessage(message);
      } else if (provider === "KRAKEN") {
        this.handleKrakenMessage(message);
      } else if (provider === "HUOBI") {
        this.handleHuobiMessage(message);
      } else if (provider === "FTX") {
        this.handleFTXMessage(message);
      }
    } catch (error) {
      console.error(`Error handling ${provider} message:`, error);
    }
  }

  private handleProviderError(provider: Provider) {
    const timer = setTimeout(() => {
      this.reconnectToProvider(provider);
    }, this.RECONNECT_DELAY);

    this.reconnectTimers.set(provider, timer);
  }

  private handleProviderDisconnect(provider: Provider) {
    this.handleProviderError(provider);
  }

  private reconnectToProvider(provider: Provider) {
    const url = DATA_PROVIDERS[provider].ws;
    if (url) {
      this.connectToProvider(provider, url);
    }
  }

  private resubscribeToProvider(provider: Provider) {
    this.subscriptions.forEach((sub, key) => {
      const [symbol, interval] = key.split("-");
      this.subscribeToProvider(provider, symbol, interval);
    });
  }

  private subscribeToProvider(
    provider: Provider,
    symbol: string,
    interval: string,
  ) {
    const ws = this.connections.get(provider);
    if (!ws) return;

    let subscribeMessage;
    switch (provider) {
      case "BINANCE":
        subscribeMessage = {
          method: "SUBSCRIBE",
          params: [
            `${symbol.toLowerCase()}@kline_${interval}`,
            `${symbol.toLowerCase()}@depth`,
            `${symbol.toLowerCase()}@trade`,
          ],
          id: Date.now(),
        };
        break;
      case "COINBASE":
        subscribeMessage = {
          type: "subscribe",
          product_ids: [symbol],
          channels: ["ticker", "level2", "matches"],
        };
        break;
      // Add other providers' subscription formats
    }

    if (subscribeMessage) {
      ws.send(JSON.stringify(subscribeMessage));
    }
  }

  // Provider-specific message handlers
  private handleBinanceMessage(message: any) {
    if (message.e === "kline") {
      this.handleKlineData("BINANCE", message);
    } else if (message.e === "depthUpdate") {
      this.handleOrderBookUpdate("BINANCE", message);
    } else if (message.e === "trade") {
      this.handleTradeUpdate("BINANCE", message);
    }
  }

  private handleCoinbaseMessage(message: any) {
    if (message.type === "ticker") {
      this.handleTickerData("COINBASE", message);
    } else if (message.type === "snapshot" || message.type === "l2update") {
      this.handleOrderBookUpdate("COINBASE", message);
    } else if (message.type === "match") {
      this.handleTradeUpdate("COINBASE", message);
    }
  }

  private handleKrakenMessage(message: any) {
    if (message[1]?.type === "ohlc") {
      this.handleKlineData("KRAKEN", message[1]);
    } else if (message[1]?.type === "book") {
      this.handleOrderBookUpdate("KRAKEN", message[1]);
    } else if (message[1]?.type === "trade") {
      this.handleTradeUpdate("KRAKEN", message[1]);
    }
  }

  private handleHuobiMessage(message: any) {
    if (message.ch?.includes("kline")) {
      this.handleKlineData("HUOBI", message.tick);
    } else if (message.ch?.includes("depth")) {
      this.handleOrderBookUpdate("HUOBI", message.tick);
    } else if (message.ch?.includes("trade")) {
      this.handleTradeUpdate("HUOBI", message.tick);
    }
  }

  private handleFTXMessage(message: any) {
    if (message.type === "update" && message.channel === "trades") {
      this.handleTradeUpdate("FTX", message);
    } else if (message.type === "update" && message.channel === "orderbook") {
      this.handleOrderBookUpdate("FTX", message);
    }
  }

  private handleTickerData(provider: string, data: any) {
    const symbol = data.product_id?.toUpperCase() || data.s?.toUpperCase();
    if (!symbol) return;

    const marketData: MarketData = {
      timestamp: new Date(data.time || data.T).toISOString(),
      open: parseFloat(data.open_24h || data.o),
      high: parseFloat(data.high_24h || data.h),
      low: parseFloat(data.low_24h || data.l),
      close: parseFloat(data.price || data.c),
      volume: parseFloat(data.volume_24h || data.v),
      source: provider,
    };

    this.updateMarketData(symbol, "1m", marketData);
  }

  private handleOrderBookUpdate(provider: string, data: any) {
    const symbol = data.s?.toUpperCase() || data.product_id?.toUpperCase();
    if (!symbol) return;

    const orderBook = this.orderBooks.get(symbol) || {
      symbol,
      bids: [] as OrderBookEntry[],
      asks: [] as OrderBookEntry[],
      timestamp: new Date().toISOString(),
      source: provider,
    };

    // Update based on provider format
    if (provider === "BINANCE") {
      this.updateBinanceOrderBook(orderBook, data);
    } else if (provider === "COINBASE") {
      this.updateCoinbaseOrderBook(orderBook, data);
    }

    this.orderBooks.set(symbol, orderBook);
    this.notifyOrderBookSubscribers(symbol, orderBook);
  }

  private handleTradeUpdate(provider: string, data: any) {
    const symbol = data.s?.toUpperCase() || data.product_id?.toUpperCase();
    if (!symbol) return;

    const trade: Trade = {
      id: data.t?.toString() || data.trade_id?.toString(),
      price: parseFloat(data.p || data.price),
      quantity: parseFloat(data.q || data.size),
      side: this.determineTradeSide(data, provider),
      timestamp: new Date(data.T || data.time).toISOString(),
      source: provider,
    };

    const trades = this.tradeHistory.get(symbol) || [];
    trades.push(trade);

    if (trades.length > this.MAX_DATA_POINTS) {
      trades.shift();
    }

    this.tradeHistory.set(symbol, trades);
    this.notifyTradeSubscribers(symbol, trades);
  }

  private determineTradeSide(data: any, provider: string): "buy" | "sell" {
    switch (provider) {
      case "BINANCE":
        return data.m ? "sell" : "buy";
      case "COINBASE":
        return data.side;
      default:
        return "buy";
    }
  }

  private updateMarketData(symbol: string, interval: string, data: MarketData) {
    if (!this.marketData.has(symbol)) {
      this.marketData.set(symbol, new Map());
    }

    const symbolData = this.marketData.get(symbol)!;
    if (!symbolData.has(interval)) {
      symbolData.set(interval, []);
    }

    const klineData = symbolData.get(interval)!;
    const existingIndex = klineData.findIndex(
      (d) => d.timestamp === data.timestamp,
    );

    if (existingIndex >= 0) {
      klineData[existingIndex] = data;
    } else {
      klineData.push(data);
    }

    if (klineData.length > this.MAX_DATA_POINTS) {
      klineData.shift();
    }

    this.calculateAndEmitIndicators(symbol, interval, klineData);
  }

  private notifyOrderBookSubscribers(
    symbol: string,
    orderBook: OrderBookUpdate,
  ) {
    this.subscriptions.forEach((sub, key) => {
      const [subSymbol] = key.split("-");
      if (subSymbol === symbol && sub.callbacks.onOrderBook) {
        sub.callbacks.onOrderBook(orderBook);
      }
    });
  }

  private notifyTradeSubscribers(symbol: string, trades: Trade[]) {
    this.subscriptions.forEach((sub, key) => {
      const [subSymbol] = key.split("-");
      if (subSymbol === symbol && sub.callbacks.onTradeHistory) {
        sub.callbacks.onTradeHistory({
          symbol,
          trades: trades.slice(-100),
          timestamp: new Date().toISOString(),
          source: trades[0]?.source || "unknown",
        });
      }
    });
  }

  private updateBinanceOrderBook(orderBook: OrderBookUpdate, data: any) {
    data.b.forEach((bid: [string, string]) => {
      const price = parseFloat(bid[0]);
      const quantity = parseFloat(bid[1]);
      this.updateOrderBookEntry(orderBook.bids, price, quantity);
    });

    data.a.forEach((ask: [string, string]) => {
      const price = parseFloat(ask[0]);
      const quantity = parseFloat(ask[1]);
      this.updateOrderBookEntry(orderBook.asks, price, quantity);
    });
  }

  private updateCoinbaseOrderBook(orderBook: OrderBookUpdate, data: any) {
    if (data.type === "snapshot") {
      orderBook.bids = data.bids.map(([price, size]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(size),
        side: "bid",
      }));
      orderBook.asks = data.asks.map(([price, size]: [string, string]) => ({
        price: parseFloat(price),
        quantity: parseFloat(size),
        side: "ask",
      }));
    } else {
      data.changes.forEach(([side, price, size]: [string, string, string]) => {
        const quantity = parseFloat(size);
        if (quantity > 0) {
          this.updateOrderBookEntry(
            side === "buy" ? orderBook.bids : orderBook.asks,
            parseFloat(price),
            quantity,
          );
        }
      });
    }
  }

  private updateOrderBookEntry(
    entries: OrderBookEntry[],
    price: number,
    quantity: number,
  ) {
    const index = entries.findIndex((e) => e.price === price);
    if (quantity > 0) {
      if (index >= 0) {
        entries[index].quantity = quantity;
      } else {
        entries.push({
          price,
          quantity,
          side:
            entries ===
            this.orderBooks.get(Object.keys(this.orderBooks)[0])?.bids
              ? "bid"
              : "ask",
        });
      }
    } else {
      if (index >= 0) {
        entries.splice(index, 1);
      }
    }
  }

  private async handleKlineData(provider: string, data: any) {
    try {
      const symbol = data.s?.toUpperCase() || data.product_id?.toUpperCase();
      if (!symbol) return;

      const price = await this.validateAndNormalizePrice(provider, data);
      if (!price) return;

      const marketData: MarketData = {
        timestamp: new Date(data.k?.t || data.time || data.T).toISOString(),
        open: parseFloat(data.k?.o || data.open_24h || data.o),
        high: parseFloat(data.k?.h || data.high_24h || data.h),
        low: parseFloat(data.k?.l || data.low_24h || data.l),
        close: price,
        volume: parseFloat(data.k?.v || data.volume_24h || data.v),
        source: provider,
      };

      // Validate all required fields
      if (!this.isValidMarketData(marketData)) {
        console.error(`Invalid market data from ${provider}:`, marketData);
        return;
      }

      this.updateMarketData(symbol, "1m", marketData);
    } catch (error) {
      console.error(`Error handling kline data from ${provider}:`, error);
    }
  }

  private isValidMarketData(data: MarketData): boolean {
    return (
      data.timestamp &&
      !isNaN(data.open) &&
      data.open > 0 &&
      !isNaN(data.high) &&
      data.high > 0 &&
      !isNaN(data.low) &&
      data.low > 0 &&
      !isNaN(data.close) &&
      data.close > 0 &&
      !isNaN(data.volume) &&
      data.volume >= 0
    );
  }

  private async validateAndNormalizePrice(
    provider: Provider,
    data: any,
  ): Promise<number | null> {
    try {
      let price: number | null = null;

      switch (provider) {
        case "BINANCE":
          price = parseFloat(data.c || data.price);
          break;
        case "COINBASE":
          price = parseFloat(data.price);
          break;
        case "KRAKEN":
          price = parseFloat(data.c?.[0] || data.price);
          break;
        case "HUOBI":
          price = parseFloat(data.tick?.close || data.close);
          break;
        case "FTX":
          price = parseFloat(data.price);
          break;
      }

      // Validate price is reasonable
      if (!price || isNaN(price) || price <= 0) {
        console.error(`Invalid price from ${provider}:`, data);
        return null;
      }

      // Cross-validate with other providers if available
      const otherPrices = await this.getPricesFromOtherProviders(provider);
      if (otherPrices.length > 0) {
        const avgPrice =
          otherPrices.reduce((a, b) => a + b, 0) / otherPrices.length;
        const deviation = Math.abs(price - avgPrice) / avgPrice;

        // If price deviates more than 5% from average, mark as suspicious
        if (deviation > 0.05) {
          console.warn(
            `Suspicious price from ${provider}: ${price} (avg: ${avgPrice})`,
          );
          return null;
        }
      }

      return price;
    } catch (error) {
      console.error(`Error validating price from ${provider}:`, error);
      return null;
    }
  }

  private async getPricesFromOtherProviders(
    excludeProvider: Provider,
  ): Promise<number[]> {
    const prices: number[] = [];
    const providers = (Object.keys(DATA_PROVIDERS) as Provider[]).filter(
      (p) => p !== excludeProvider,
    );

    for (const provider of providers) {
      try {
        const response = await fetch(
          `${DATA_PROVIDERS[provider].rest}/ticker/price`,
        );
        const data = await response.json();
        const price = parseFloat(data.price);
        if (price && !isNaN(price) && price > 0) {
          prices.push(price);
        }
      } catch (error) {
        console.error(`Error fetching price from ${provider}:`, error);
      }
    }

    return prices;
  }

  private isValidMessageFormat(provider: Provider, message: any): boolean {
    switch (provider) {
      case "BINANCE":
        return Boolean(message.e && message.s && message.k);
      case "COINBASE":
        return Boolean(message.type && message.product_id);
      case "KRAKEN":
        return Array.isArray(message) && message.length >= 2;
      case "HUOBI":
        return Boolean(message.ch && message.tick);
      case "FTX":
        return Boolean(message.type && message.channel);
      default:
        return false;
    }
  }

  private calculateAndEmitIndicators(
    symbol: string,
    interval: string,
    data: MarketData[],
  ): void {
    const key = `${symbol}-${interval}`;
    const subscription = this.subscriptions.get(key);

    if (subscription?.callbacks.onMarketData) {
      const prices = data.map((d) => d.close);
      const volumes = data.map((d) => d.volume);
      const highs = data.map((d) => d.high);
      const lows = data.map((d) => d.low);

      const indicators = {
        bollingerBands: calculateBollingerBands(prices),
        ichimoku: calculateIchimoku(prices, highs, lows),
        stochastic: calculateStochastic(prices, highs, lows),
        adx: calculateADX(prices, highs, lows),
        obv: calculateOBV(prices, volumes),
        vwap: calculateVWAP(prices, volumes),
      };

      subscription.callbacks.onMarketData(
        data.map((d, i) => ({
          ...d,
          indicators,
        })),
      );
    }
  }

  public static getInstance(): TechnicalIndicatorsWebSocket {
    if (!TechnicalIndicatorsWebSocket.instance) {
      TechnicalIndicatorsWebSocket.instance =
        new TechnicalIndicatorsWebSocket();
    }
    return TechnicalIndicatorsWebSocket.instance;
  }

  public subscribe(
    symbol: string,
    interval: string,
    callbacks: {
      onMarketData?: (data: MarketData[]) => void;
      onOrderBook?: (data: OrderBookUpdate) => void;
      onTradeHistory?: (data: TradeHistoryUpdate) => void;
    },
  ): void {
    const key = `${symbol}-${interval}`;
    this.subscriptions.set(key, { symbol, interval, callbacks });

    // Subscribe to all providers
    Object.keys(DATA_PROVIDERS).forEach((provider) => {
      this.subscribeToProvider(provider, symbol, interval);
    });
  }

  public unsubscribe(symbol: string, interval: string): void {
    const key = `${symbol}-${interval}`;
    this.subscriptions.delete(key);

    // Unsubscribe from all providers
    Object.keys(DATA_PROVIDERS).forEach((provider) => {
      const ws = this.connections.get(provider);
      if (ws) {
        const unsubscribeMessage = {
          method: "UNSUBSCRIBE",
          params: [
            `${symbol.toLowerCase()}@kline_${interval}`,
            `${symbol.toLowerCase()}@depth`,
            `${symbol.toLowerCase()}@trade`,
          ],
          id: Date.now(),
        };
        ws.send(JSON.stringify(unsubscribeMessage));
      }
    });
  }

  public close(): void {
    // Close all WebSocket connections
    this.connections.forEach((ws, provider) => {
      ws.close();
    });
    this.connections.clear();

    // Clear all reconnect timers
    this.reconnectTimers.forEach((timer) => clearTimeout(timer));
    this.reconnectTimers.clear();

    // Clear all data
    this.marketData.clear();
    this.orderBooks.clear();
    this.tradeHistory.clear();
    this.subscriptions.clear();
  }
}

export const technicalIndicatorsWebSocket =
  TechnicalIndicatorsWebSocket.getInstance();
