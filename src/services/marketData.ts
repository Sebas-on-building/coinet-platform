import axios, { AxiosInstance, AxiosError } from "axios";
import { config } from "../config/env";
import { api } from "./api";
import { Cache } from "@/utils/cache";
import { RateLimiter } from "@/utils/rateLimiter";
import { ApiKeyManager } from "./apiKeyManager";

interface MarketDataConfig {
  source: "coingecko" | "binance" | "coinmarketcap";
  baseUrl: string;
}

export class MarketDataService {
  private apis: Map<string, AxiosInstance>;
  private rateLimiters: Map<string, RateLimiter>;
  private cache: Cache;
  private apiKeyManager: ApiKeyManager;

  constructor() {
    this.apis = new Map();
    this.rateLimiters = new Map();
    this.cache = new Cache();
    this.apiKeyManager = ApiKeyManager.getInstance();
    this.initializeAPIs();
  }

  private async initializeAPIs() {
    // Initialize API key manager with available keys
    if (config.api.coingecko.apiKeys.length > 0) {
      await this.apiKeyManager.addKeys(
        "coingecko",
        config.api.coingecko.apiKeys,
      );
      this.setupAPI({
        source: "coingecko",
        baseUrl: config.api.coingecko.baseUrl,
      });
    }

    if (config.api.binance.apiKeys.length > 0) {
      await this.apiKeyManager.addKeys("binance", config.api.binance.apiKeys);
      this.setupAPI({
        source: "binance",
        baseUrl: config.api.binance.baseUrl,
      });
    }

    // CoinMarketCap Setup
    const cmcKey = process.env.COINMARKETCAP_API_KEY;
    if (cmcKey) {
      this.setupAPI({
        source: "coinmarketcap",
        baseUrl: "https://pro-api.coinmarketcap.com/v1",
      });
    }
  }

  private setupAPI({ source, baseUrl }: MarketDataConfig) {
    const api = axios.create({
      baseURL: baseUrl,
    });

    // Add request interceptor for API key rotation
    api.interceptors.request.use(
      async (config) => {
        try {
          const apiKey = await this.apiKeyManager.getNextKey(source);
          config.headers["X-API-KEY"] = apiKey;
          return config;
        } catch (error) {
          console.error(`Failed to get API key for ${source}:`, error);
          throw error;
        }
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Add response interceptor for error handling
    api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response) {
          switch (error.response.status) {
            case 429:
              console.error(`Rate limit exceeded for ${source}`);
              // Retry with exponential backoff
              return this.retryRequest(error.config);
            case 401:
              console.error(`Authentication failed for ${source}`);
              break;
            default:
              console.error(`API error for ${source}:`, error.message);
          }
        }
        throw error;
      },
    );

    this.apis.set(source, api);
    this.rateLimiters.set(
      source,
      new RateLimiter({
        maxRequests: 30,
        windowMs: 60000,
        message: `Rate limit exceeded for ${source}`,
      }),
    );
  }

  private async retryRequest(config: any, retryCount = 0): Promise<any> {
    const maxRetries = 3;
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);

    if (retryCount >= maxRetries) {
      throw new Error("Max retry attempts reached");
    }

    await new Promise((resolve) => setTimeout(resolve, backoffDelay));

    try {
      const source = new URL(config.baseURL).hostname.split(".")[1];
      const apiKey = await this.apiKeyManager.getNextKey(source);
      config.headers["X-API-KEY"] = apiKey;

      return axios(config);
    } catch (error) {
      return this.retryRequest(config, retryCount + 1);
    }
  }

  private getCacheKey(method: string, params: object): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  // Market Data Methods

  async getMarketData(vs_currency = "usd", per_page = 100, page = 1) {
    const cacheKey = this.getCacheKey("getMarketData", {
      vs_currency,
      per_page,
      page,
    });
    const cachedData = await this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    // Try CoinGecko first
    try {
      const response = await this.apis.get("coingecko")!.get("/coins/markets", {
        params: { vs_currency, per_page, page, sparkline: false },
      });

      await this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      console.error("CoinGecko API error, falling back to Binance");

      // Fallback to Binance
      const response = await this.apis.get("binance")!.get("/ticker/24hr");
      const transformedData = this.transformBinanceData(response.data);
      await this.cache.set(cacheKey, transformedData, 300);
      return transformedData;
    }
  }

  async getPriceHistory(coinId: string, days: number = 7) {
    const cacheKey = this.getCacheKey("getPriceHistory", { coinId, days });
    const cachedData = await this.cache.get(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    try {
      const response = await this.apis
        .get("coingecko")!
        .get(`/coins/${coinId}/market_chart`, {
          params: { vs_currency: "usd", days },
        });

      await this.cache.set(cacheKey, response.data, 300);
      return response.data;
    } catch (error) {
      // Fallback to Binance if available
      if (this.isBinanceSymbol(coinId)) {
        return this.getBinanceKlines(coinId, days);
      }
      throw error;
    }
  }

  async getRealTimePrice(symbol: string) {
    try {
      const response = await this.apis.get("binance")!.get("/ticker/price", {
        params: { symbol: symbol.toUpperCase() + "USDT" },
      });
      return response.data;
    } catch (error) {
      // Fallback to CoinGecko
      const response = await this.apis.get("coingecko")!.get(`/simple/price`, {
        params: { ids: symbol, vs_currencies: "usd" },
      });
      return response.data;
    }
  }

  async getMarketDepth(symbol: string) {
    await this.rateLimiters.get("binance")!.checkLimit("depth_" + symbol);
    const response = await this.apis.get("binance")!.get("/depth", {
      params: { symbol: symbol.toUpperCase() + "USDT", limit: 100 },
    });
    return response.data;
  }

  // Helper Methods

  private isBinanceSymbol(coinId: string): boolean {
    // Add logic to check if the coin is traded on Binance
    const binanceSymbols = ["BTC", "ETH", "BNB", "SOL", "ADA", "DOT"];
    return binanceSymbols.includes(coinId.toUpperCase());
  }

  private async getBinanceKlines(symbol: string, days: number) {
    const interval = this.getBinanceInterval(days);
    const limit = 1000; // Maximum allowed by Binance

    await this.rateLimiters.get("binance")!.checkLimit("klines_" + symbol);
    const response = await this.apis.get("binance")!.get("/klines", {
      params: {
        symbol: symbol.toUpperCase() + "USDT",
        interval,
        limit,
      },
    });

    return this.transformBinanceKlines(response.data);
  }

  private getBinanceInterval(days: number): string {
    if (days <= 1) return "1m";
    if (days <= 7) return "15m";
    if (days <= 30) return "1h";
    if (days <= 90) return "4h";
    return "1d";
  }

  private transformBinanceData(data: any[]): any[] {
    return data.map((item) => ({
      id: item.symbol.toLowerCase(),
      symbol: item.symbol,
      name: item.symbol,
      current_price: parseFloat(item.lastPrice),
      market_cap: parseFloat(item.quoteVolume),
      total_volume: parseFloat(item.volume),
      price_change_24h: parseFloat(item.priceChange),
      price_change_percentage_24h: parseFloat(item.priceChangePercent),
      last_updated: new Date(item.closeTime).toISOString(),
    }));
  }

  private transformBinanceKlines(klines: any[]): any {
    return {
      prices: klines.map((k) => [k[0], parseFloat(k[4])]),
      market_caps: klines.map((k) => [
        k[0],
        parseFloat(k[4]) * parseFloat(k[5]),
      ]),
      total_volumes: klines.map((k) => [k[0], parseFloat(k[5])]),
    };
  }

  // Add method to get API usage metrics
  async getApiMetrics() {
    const metrics: Record<string, any> = {};

    for (const source of this.apis.keys()) {
      metrics[source] = await this.apiKeyManager.getKeyMetrics(source);
    }

    return metrics;
  }

  /**
   * Get current market sentiment data
   */
  async getMarketSentiment(): Promise<{
    overall: "bullish" | "bearish" | "neutral";
    fear_index: number;
    sentiment_score: number;
    social_sentiment: {
      twitter: number;
      reddit: number;
      telegram: number;
    };
  }> {
    const cacheKey = this.getCacheKey("getMarketSentiment", {});
    const cachedData = (await this.cache.get(cacheKey)) as {
      overall: "bullish" | "bearish" | "neutral";
      fear_index: number;
      sentiment_score: number;
      social_sentiment: {
        twitter: number;
        reddit: number;
        telegram: number;
      };
    } | null;

    if (cachedData) {
      return cachedData;
    }

    try {
      // Try to get data from Alternative.me Fear & Greed Index
      const response = await axios.get("https://api.alternative.me/fng/");
      const fearGreedValue = parseInt(response.data.data[0].value);

      // Map fear & greed to our sentiment format
      let overall: "bullish" | "bearish" | "neutral" = "neutral";
      if (fearGreedValue >= 60) {
        overall = "bullish";
      } else if (fearGreedValue <= 40) {
        overall = "bearish";
      }

      // Mock data for other sentiment metrics that would come from other sources
      const result = {
        overall,
        fear_index: fearGreedValue,
        sentiment_score: fearGreedValue / 100,
        social_sentiment: {
          twitter: (fearGreedValue + Math.random() * 20 - 10) / 100,
          reddit: (fearGreedValue + Math.random() * 20 - 10) / 100,
          telegram: (fearGreedValue + Math.random() * 20 - 10) / 100,
        },
      };

      await this.cache.set(cacheKey, result, 1800); // Cache for 30 minutes
      return result;
    } catch (error) {
      console.error("Failed to get market sentiment:", error);

      // Return default neutral values if API fails
      return {
        overall: "neutral",
        fear_index: 50,
        sentiment_score: 0.5,
        social_sentiment: {
          twitter: 0.5,
          reddit: 0.5,
          telegram: 0.5,
        },
      };
    }
  }

  /**
   * Get current market volatility metrics
   */
  async getVolatilityMetrics(): Promise<{
    current: number;
    average: number;
    percentile: number;
    volatility_ratio: number;
    trend: "increasing" | "decreasing" | "stable";
  }> {
    const cacheKey = this.getCacheKey("getVolatilityMetrics", {});
    const cachedData = (await this.cache.get(cacheKey)) as {
      current: number;
      average: number;
      percentile: number;
      volatility_ratio: number;
      trend: "increasing" | "decreasing" | "stable";
    } | null;

    if (cachedData) {
      return cachedData;
    }

    try {
      // Calculate volatility from top crypto assets
      const marketData = await this.getMarketData("usd", 20, 1);

      // Get price history for Bitcoin to calculate volatility
      const btcHistory = await this.getPriceHistory("bitcoin", 14);
      const prices = btcHistory.prices.map((p: number[]) => p[1]);

      // Calculate daily returns
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
      }

      // Calculate standard deviation of returns (annualized)
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance =
        returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      const annualizedVol = stdDev * Math.sqrt(365);

      // Compare to historical average (simulated here)
      const historicalAvgVol = 0.7; // This would come from database of historical values

      const result = {
        current: annualizedVol,
        average: historicalAvgVol,
        percentile: this.calculatePercentile(annualizedVol, historicalAvgVol),
        volatility_ratio: annualizedVol / historicalAvgVol,
        trend: this.determineVolatilityTrend(returns),
      };

      await this.cache.set(cacheKey, result, 3600); // Cache for 60 minutes
      return result;
    } catch (error) {
      console.error("Failed to get volatility metrics:", error);

      // Return default values if calculation fails
      return {
        current: 0.8,
        average: 0.7,
        percentile: 0.6,
        volatility_ratio: 1.14,
        trend: "stable",
      };
    }
  }

  /**
   * Calculate percentile of current volatility
   */
  private calculatePercentile(current: number, average: number): number {
    // Simplified percentile calculation - would use historical distribution in production
    if (current > average * 1.5) return 0.9;
    if (current > average * 1.2) return 0.75;
    if (current > average) return 0.6;
    if (current > average * 0.8) return 0.4;
    if (current > average * 0.5) return 0.25;
    return 0.1;
  }

  /**
   * Determine volatility trend based on recent data
   */
  private determineVolatilityTrend(
    returns: number[],
  ): "increasing" | "decreasing" | "stable" {
    if (returns.length < 6) return "stable";

    const recentVol = this.calculateVolatilityFromReturns(returns.slice(-3));
    const previousVol = this.calculateVolatilityFromReturns(
      returns.slice(-6, -3),
    );

    if (recentVol > previousVol * 1.2) return "increasing";
    if (recentVol < previousVol * 0.8) return "decreasing";
    return "stable";
  }

  /**
   * Calculate volatility from array of returns
   */
  private calculateVolatilityFromReturns(returns: number[]): number {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  /**
   * Get current market liquidity metrics
   */
  async getLiquidityMetrics(): Promise<{
    overall: number;
    bid_ask_spread: number;
    market_depth: number;
    order_book_density: number;
    slippage_factor: number;
  }> {
    const cacheKey = this.getCacheKey("getLiquidityMetrics", {});
    const cachedData = (await this.cache.get(cacheKey)) as {
      overall: number;
      bid_ask_spread: number;
      market_depth: number;
      order_book_density: number;
      slippage_factor: number;
    } | null;

    if (cachedData) {
      return cachedData;
    }

    try {
      // This would typically query order book data from exchanges
      // For demonstration purposes, using simulated values

      // Try to get BTC/USDT order book from Binance if API is available
      let bidAskSpread = 0.05; // Default value
      let marketDepth = 0.75; // Default value

      if (this.apis.has("binance")) {
        try {
          const orderBook = await this.apis.get("binance")!.get("/depth", {
            params: { symbol: "BTCUSDT", limit: 100 },
          });

          const bids = orderBook.data.bids;
          const asks = orderBook.data.asks;

          if (bids.length > 0 && asks.length > 0) {
            // Calculate bid-ask spread as percentage
            const highestBid = parseFloat(bids[0][0]);
            const lowestAsk = parseFloat(asks[0][0]);
            bidAskSpread = (lowestAsk - highestBid) / lowestAsk;

            // Calculate market depth (sum of bids and asks within 2% of mid price)
            const midPrice = (highestBid + lowestAsk) / 2;
            const rangeMin = midPrice * 0.98;
            const rangeMax = midPrice * 1.02;

            const bidVolume = bids.reduce((sum: number, item: string[]) => {
              const price = parseFloat(item[0]);
              const amount = parseFloat(item[1]);
              return price >= rangeMin ? sum + amount : sum;
            }, 0);

            const askVolume = asks.reduce((sum: number, item: string[]) => {
              const price = parseFloat(item[0]);
              const amount = parseFloat(item[1]);
              return price <= rangeMax ? sum + amount : sum;
            }, 0);

            // Normalize market depth to 0-1 scale (higher is better)
            marketDepth = Math.min(1, (bidVolume + askVolume) / 1000);
          }
        } catch (error) {
          console.warn(
            "Failed to get Binance order book, using default liquidity values",
          );
        }
      }

      // Calculate overall liquidity score
      const result = {
        overall: 0.7, // Scale 0-1, higher means more liquid
        bid_ask_spread: bidAskSpread,
        market_depth: marketDepth,
        order_book_density: 0.65 + Math.random() * 0.2, // Simulated
        slippage_factor: 0.08 + Math.random() * 0.04, // Simulated
      };

      await this.cache.set(cacheKey, result, 900); // Cache for 15 minutes
      return result;
    } catch (error) {
      console.error("Failed to get liquidity metrics:", error);

      // Return default values if calculation fails
      return {
        overall: 0.7,
        bid_ask_spread: 0.05,
        market_depth: 0.75,
        order_book_density: 0.65,
        slippage_factor: 0.1,
      };
    }
  }

  /**
   * Get sector performance metrics for crypto asset categories
   */
  async getSectorPerformance(): Promise<{ [sector: string]: number }> {
    const cacheKey = this.getCacheKey("getSectorPerformance", {});
    const cachedData = (await this.cache.get(cacheKey)) as {
      [sector: string]: number;
    } | null;

    if (cachedData) {
      return cachedData;
    }

    try {
      // In production, this would query a data provider that tracks sector indices
      // For demonstration, using simulated sector performance data

      // Get market data to calculate performance
      const marketData = await this.getMarketData("usd", 100, 1);

      // Map coins to sectors
      const sectorMap: { [symbol: string]: string } = {
        bitcoin: "currency",
        ethereum: "smartContract",
        ripple: "payments",
        cardano: "smartContract",
        solana: "smartContract",
        polkadot: "interoperability",
        "avalanche-2": "smartContract",
        binancecoin: "exchange",
        uniswap: "defi",
        chainlink: "oracle",
        polygon: "layer2",
        filecoin: "storage",
        aave: "defi",
        "the-sandbox": "metaverse",
        "axie-infinity": "gaming",
        // More mappings would be included here
      };

      // Group coins by sector and calculate average performance
      const sectorPerformance: {
        [sector: string]: { sum: number; count: number };
      } = {};

      for (const coin of marketData) {
        if (coin.id in sectorMap) {
          const sector = sectorMap[coin.id];
          if (!sectorPerformance[sector]) {
            sectorPerformance[sector] = { sum: 0, count: 0 };
          }

          sectorPerformance[sector].sum +=
            coin.price_change_percentage_24h || 0;
          sectorPerformance[sector].count++;
        }
      }

      // Calculate average performance by sector
      const result: { [sector: string]: number } = {};

      for (const [sector, data] of Object.entries(sectorPerformance)) {
        if (data.count > 0) {
          result[sector] = data.sum / data.count;
        }
      }

      // Add any missing sectors with simulation
      const allSectors = [
        "currency",
        "smartContract",
        "payments",
        "exchange",
        "defi",
        "oracle",
        "layer2",
        "interoperability",
        "storage",
        "metaverse",
        "gaming",
        "privacy",
        "lending",
        "infrastructure",
      ];

      for (const sector of allSectors) {
        if (!(sector in result)) {
          // Simulate with random value between -5% and +5%
          result[sector] = Math.random() * 10 - 5;
        }
      }

      await this.cache.set(cacheKey, result, 3600); // Cache for 60 minutes
      return result;
    } catch (error) {
      console.error("Failed to get sector performance:", error);

      // Return default simulated values if calculation fails
      return {
        currency: 1.2,
        smartContract: 2.3,
        payments: -0.8,
        exchange: 0.5,
        defi: -1.5,
        oracle: 1.8,
        layer2: 3.2,
        interoperability: 0.9,
        storage: -0.7,
        metaverse: -2.1,
        gaming: 1.5,
        privacy: -0.3,
        lending: -1.1,
        infrastructure: 2.7,
      };
    }
  }
}
