import { WebSocket } from "ws";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { CoinGeckoClient } from "../coingecko";
import { BinanceClient } from "./binanceClient";
import { CoinApiClient } from "./coinApiClient";

// PriceTick interface for normalized market data
// 'volume' is required: 24h volume in quote currency if available, or null if not provided by the source
export interface PriceTick {
  asset: string;
  price: number;
  timestamp: number;
  volume: number | null;
  source: string;
  high24h: number | null;
  low24h: number | null;
  marketCap: number | null;
}

interface MarketData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: number;
  source: string;
}

interface ExchangeConfig {
  name: string;
  wsEndpoint: string;
  restEndpoint: string;
  apiKey?: string;
  apiSecret?: string;
}

const EXCHANGES: { [key: string]: ExchangeConfig } = {
  binance: {
    name: "Binance",
    wsEndpoint: "wss://stream.binance.com:9443/ws",
    restEndpoint: "https://api.binance.com/api/v3",
  },
  coinbase: {
    name: "Coinbase",
    wsEndpoint: "wss://ws-feed.pro.coinbase.com",
    restEndpoint: "https://api.pro.coinbase.com",
  },
  kraken: {
    name: "Kraken",
    wsEndpoint: "wss://ws.kraken.com",
    restEndpoint: "https://api.kraken.com/0",
  },
};

// MarketDataService: Market data aggregation and normalization
// Uses the PriceTick interface for normalized output (see below)
// Exports healthCheckMarketConnectors for /health/market endpoint
class MarketDataService {
  private connections: Map<string, WebSocket> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private subscribers: Set<(data: MarketData[]) => void> = new Set();
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000;

  constructor() {
    this.initializeConnections();
  }

  private initializeConnections() {
    Object.entries(EXCHANGES).forEach(([exchangeId, config]) => {
      this.connectToExchange(exchangeId, config);
    });
  }

  private connectToExchange(exchangeId: string, config: ExchangeConfig) {
    try {
      const ws = new WebSocket(config.wsEndpoint);

      ws.on("open", () => {
        console.log(`Connected to ${config.name} WebSocket`);
        this.reconnectAttempts.set(exchangeId, 0);
        this.subscribeToMarketData(ws, exchangeId);
      });

      ws.on("message", (data: string) => {
        this.handleMessage(exchangeId, JSON.parse(data));
      });

      ws.on("error", (error) => {
        console.error(`Error in ${config.name} WebSocket:`, error);
      });

      ws.on("close", () => {
        console.log(`Disconnected from ${config.name} WebSocket`);
        this.handleDisconnect(exchangeId, config);
      });

      this.connections.set(exchangeId, ws);
    } catch (error) {
      console.error(`Failed to connect to ${config.name}:`, error);
      this.handleDisconnect(exchangeId, config);
    }
  }

  private subscribeToMarketData(ws: WebSocket, exchangeId: string) {
    switch (exchangeId) {
      case "binance":
        ws.send(
          JSON.stringify({
            method: "SUBSCRIBE",
            params: ["!ticker@arr"],
            id: 1,
          }),
        );
        break;
      case "coinbase":
        ws.send(
          JSON.stringify({
            type: "subscribe",
            product_ids: ["BTC-USD", "ETH-USD"],
            channels: ["ticker"],
          }),
        );
        break;
      case "kraken":
        ws.send(
          JSON.stringify({
            event: "subscribe",
            pair: ["XBT/USD", "ETH/USD"],
            subscription: {
              name: "ticker",
            },
          }),
        );
        break;
    }
  }

  private handleMessage(exchangeId: string, data: any) {
    try {
      const marketData = this.parseMarketData(exchangeId, data);
      if (marketData) {
        this.updateMarketData(marketData);
      }
    } catch (error) {
      console.error(`Error parsing message from ${exchangeId}:`, error);
    }
  }

  private parseMarketData(exchangeId: string, data: any): MarketData | null {
    switch (exchangeId) {
      case "binance":
        return this.parseBinanceData(data);
      case "coinbase":
        return this.parseCoinbaseData(data);
      case "kraken":
        return this.parseKrakenData(data);
      default:
        return null;
    }
  }

  private parseBinanceData(data: any): MarketData | null {
    if (!Array.isArray(data)) return null;

    const ticker = data.find((t: any) => t.s === "BTCUSDT");
    if (!ticker) return null;

    return {
      id: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      price: parseFloat(ticker.c),
      change24h: parseFloat(ticker.P),
      volume24h: parseFloat(ticker.v) * parseFloat(ticker.c),
      marketCap: 0, // Will be calculated separately
      lastUpdated: Date.now(),
      source: "binance",
    };
  }

  private parseCoinbaseData(data: any): MarketData | null {
    if (data.type !== "ticker") return null;

    const symbol = data.product_id.split("-")[0];
    return {
      id: symbol.toLowerCase(),
      symbol,
      name: symbol === "BTC" ? "Bitcoin" : "Ethereum",
      price: parseFloat(data.price),
      change24h: parseFloat(data.change_24h),
      volume24h: parseFloat(data.volume_24h),
      marketCap: 0, // Will be calculated separately
      lastUpdated: Date.now(),
      source: "coinbase",
    };
  }

  private parseKrakenData(data: any): MarketData | null {
    if (!Array.isArray(data) || data.length < 2) return null;

    const [pair, ticker] = data;
    if (!ticker || !pair) return null;

    const symbol = pair.split("/")[0];
    return {
      id: symbol.toLowerCase(),
      symbol,
      name: symbol === "XBT" ? "Bitcoin" : "Ethereum",
      price: parseFloat(ticker.c[0]),
      change24h:
        ((parseFloat(ticker.c[0]) - parseFloat(ticker.o)) /
          parseFloat(ticker.o)) *
        100,
      volume24h: parseFloat(ticker.v[1]),
      marketCap: 0, // Will be calculated separately
      lastUpdated: Date.now(),
      source: "kraken",
    };
  }

  private updateMarketData(data: MarketData) {
    const existingData = this.marketData.get(data.id);

    // Only update if the new data is more recent
    if (!existingData || data.lastUpdated > existingData.lastUpdated) {
      this.marketData.set(data.id, data);
      this.notifySubscribers();
    }
  }

  private handleDisconnect(exchangeId: string, config: ExchangeConfig) {
    const attempts = this.reconnectAttempts.get(exchangeId) || 0;

    if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts.set(exchangeId, attempts + 1);
      setTimeout(
        () => {
          this.connectToExchange(exchangeId, config);
        },
        this.RECONNECT_DELAY * (attempts + 1),
      );
    } else {
      console.error(
        `Failed to reconnect to ${config.name} after ${this.MAX_RECONNECT_ATTEMPTS} attempts`,
      );
    }
  }

  public subscribe(callback: (data: MarketData[]) => void) {
    this.subscribers.add(callback);
    // Send initial data
    callback(Array.from(this.marketData.values()));
  }

  public unsubscribe(callback: (data: MarketData[]) => void) {
    this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    const data = Array.from(this.marketData.values());
    this.subscribers.forEach((callback) => callback(data));
  }

  public async getMarketCap(symbol: string): Promise<number> {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: symbol.toLowerCase(),
            vs_currencies: "usd",
            include_market_cap: true,
          },
        },
      );
      return response.data[symbol.toLowerCase()].usd_market_cap;
    } catch (error) {
      console.error("Error fetching market cap:", error);
      return 0;
    }
  }

  public async getHistoricalData(
    symbol: string,
    timeframe: string,
  ): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart`,
        {
          params: {
            vs_currency: "usd",
            days: timeframe === "24h" ? "1" : timeframe === "7d" ? "7" : "30",
            interval: timeframe === "24h" ? "hourly" : "daily",
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching historical data:", error);
      return null;
    }
  }
}

export const marketDataService = new MarketDataService();

// Health-check endpoint for market data connectors
export async function healthCheckMarketConnectors() {
  const results: Record<string, { status: "ok" | "error"; error?: string }> =
    {};

  // CoinGecko
  const cg = new CoinGeckoClient();
  try {
    await cg.getGlobalMarketData();
    results.coingecko = { status: "ok" };
  } catch (e: any) {
    results.coingecko = {
      status: "error",
      error: e?.message || "Unknown error",
    };
  }

  // Binance
  const binance = new BinanceClient();
  try {
    await binance.getBTCTicker();
    results.binance = { status: "ok" };
  } catch (e: any) {
    results.binance = { status: "error", error: e?.message || "Unknown error" };
  }

  // CoinApi
  const coinapi = new CoinApiClient();
  try {
    await coinapi.getBTCTicker();
    results.coinapi = { status: "ok" };
  } catch (e: any) {
    results.coinapi = { status: "error", error: e?.message || "Unknown error" };
  }

  return results;
}
