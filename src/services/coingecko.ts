// This file is for CoinGecko price and market data only. Token registry and asset extraction are in tokenRegistry.ts.
import axios, { AxiosError } from "axios";
import { z } from "zod";
import type { PriceTick } from "./market/MarketDataService";
import { extractAsset, analyzeSentiment } from "@/services/tokenRegistry";

// Zod schema for CoinGecko global market data
const CoinGeckoGlobalSchema = z.object({
  data: z.object({
    total_market_cap: z.record(z.number()),
    total_volume: z.record(z.number()),
    market_cap_percentage: z.record(z.number()),
    updated_at: z.number().optional(),
  }),
});

// Zod schema for CoinGecko simple price endpoint (price only)
const CoinGeckoSimplePriceSchema = z.record(
  z.string(),
  z.record(z.string(), z.number()),
);
// Zod schema for CoinGecko /coins/markets endpoint (for volume)
const CoinGeckoMarketsSchema = z.array(
  z.object({
    id: z.string(),
    symbol: z.string(),
    current_price: z.number(),
    total_volume: z.number().nullable(),
    high_24h: z.number().nullable(),
    low_24h: z.number().nullable(),
    market_cap: z.number().nullable(),
  }),
);

// Static mapping from common tickers to CoinGecko IDs (for fallback only)
const SYMBOL_TO_ID: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  usdt: "tether",
  bnb: "binancecoin",
  sol: "solana",
  ada: "cardano",
  xrp: "ripple",
  doge: "dogecoin",
  dot: "polkadot",
  matic: "matic-network",
  ltc: "litecoin",
  link: "chainlink",
  avax: "avalanche-2",
  shib: "shiba-inu",
  trx: "tron",
  // Add more as needed
};

export class CoinGeckoClient {
  private readonly baseUrl = "https://api.coingecko.com/api/v3";
  private readonly maxRetries = 3;

  async getGlobalMarketData(): Promise<PriceTick[]> {
    const url = `${this.baseUrl}/global`;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const { data } = await axios.get(url);
        const parsed = CoinGeckoGlobalSchema.safeParse(data);
        if (!parsed.success) throw new Error("Invalid response from CoinGecko");
        const d = parsed.data.data;
        const timestamp = d.updated_at ? d.updated_at * 1000 : Date.now();
        return [
          {
            asset: "TOTAL",
            price: d.total_market_cap.usd,
            timestamp,
            volume: d.total_volume.usd,
            source: "coingecko",
            high24h: null,
            low24h: null,
            marketCap: null,
          },
          {
            asset: "BTC.D",
            price: d.market_cap_percentage.btc,
            timestamp,
            volume: null,
            source: "coingecko",
            high24h: null,
            low24h: null,
            marketCap: null,
          },
        ];
      } catch (err: any) {
        lastError = err;
        if (
          axios.isAxiosError(err) &&
          (err.response?.status === 429 ||
            (err.response?.status && err.response.status >= 500))
        ) {
          // Exponential backoff
          await new Promise((res) =>
            setTimeout(res, Math.pow(2, attempt) * 500),
          );
          attempt++;
        } else {
          break;
        }
      }
    }
    throw lastError;
  }

  /**
   * Fetches price and 24h volume for a symbol/quote pair. If volume is not available, sets volume to null.
   */
  async getTicker(symbol: string, vsCurrency: string): Promise<PriceTick> {
    // Map symbol to CoinGecko ID if possible
    const id = SYMBOL_TO_ID[symbol.toLowerCase()] || symbol;
    // Try to get both price and volume from /coins/markets
    const url = `${this.baseUrl}/coins/markets?vs_currency=${vsCurrency}&ids=${id}`;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const { data } = await axios.get(url);
        const parsed = CoinGeckoMarketsSchema.safeParse(data);
        if (parsed.success && parsed.data.length > 0) {
          const coin = parsed.data[0];
          return {
            asset: symbol,
            price: coin.current_price,
            timestamp: Date.now(),
            volume:
              coin.total_volume !== undefined && coin.total_volume !== null
                ? coin.total_volume
                : null,
            source: "coingecko",
            high24h:
              coin.high_24h !== undefined && coin.high_24h !== null
                ? coin.high_24h
                : null,
            low24h:
              coin.low_24h !== undefined && coin.low_24h !== null
                ? coin.low_24h
                : null,
            marketCap:
              coin.market_cap !== undefined && coin.market_cap !== null
                ? coin.market_cap
                : null,
          };
        }
        // Fallback to price-only endpoint
        const priceUrl = `${this.baseUrl}/simple/price?ids=${id}&vs_currencies=${vsCurrency}`;
        const { data: priceData } = await axios.get(priceUrl);
        const priceParsed = CoinGeckoSimplePriceSchema.safeParse(priceData);
        const price = priceParsed.success
          ? priceParsed.data[id]?.[vsCurrency]
          : undefined;
        if (typeof price !== "number")
          throw new Error("Price not found in CoinGecko response");
        return {
          asset: symbol,
          price,
          timestamp: Date.now(),
          volume: null,
          source: "coingecko",
          high24h: null,
          low24h: null,
          marketCap: null,
        };
      } catch (err: any) {
        lastError = err;
        if (
          axios.isAxiosError(err) &&
          (err.response?.status === 429 ||
            (err.response?.status && err.response.status >= 500))
        ) {
          // Exponential backoff
          await new Promise((res) =>
            setTimeout(res, Math.pow(2, attempt) * 500),
          );
          attempt++;
        } else {
          break;
        }
      }
    }
    throw lastError;
  }

  /**
   * Fetches historical price/volume/marketCap time series for a symbol/quote pair.
   * interval: 'hourly' | 'daily', limit: number of points (max 90 for daily, 24 for hourly)
   */
  async getHistoricalPriceSeries(
    symbol: string,
    vsCurrency: string,
    interval: "hourly" | "daily",
    limit: number,
  ): Promise<PriceTick[]> {
    const id = SYMBOL_TO_ID[symbol.toLowerCase()] || symbol;
    // CoinGecko API: /coins/{id}/market_chart?vs_currency=usd&days=30&interval=daily
    // days: number of days (max 90 for daily, 1 for hourly)
    // interval: 'hourly' or 'daily'
    let days = 1;
    if (interval === "daily") days = Math.min(limit, 90);
    if (interval === "hourly") days = 1; // CoinGecko only supports 1 day for hourly
    const url = `${this.baseUrl}/coins/${id}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=${interval}`;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < this.maxRetries) {
      try {
        const { data } = await axios.get(url);
        // data.prices: [ [timestamp, price], ... ]
        // data.total_volumes: [ [timestamp, volume], ... ]
        // data.market_caps: [ [timestamp, marketCap], ... ]
        // data.high_24h, data.low_24h not available per point
        const prices: [number, number][] = data.prices || [];
        const volumes: [number, number][] = data.total_volumes || [];
        const marketCaps: [number, number][] = data.market_caps || [];
        const result: PriceTick[] = prices.map((p, i) => ({
          asset: symbol,
          price: p[1],
          timestamp: p[0],
          volume: volumes[i]?.[1] ?? null,
          source: "coingecko",
          high24h: null,
          low24h: null,
          marketCap: marketCaps[i]?.[1] ?? null,
        }));
        // Limit to requested number of points
        return result.slice(-limit);
      } catch (err: any) {
        lastError = err;
        if (
          axios.isAxiosError(err) &&
          (err.response?.status === 429 ||
            (err.response?.status && err.response.status >= 500))
        ) {
          await new Promise((res) =>
            setTimeout(res, Math.pow(2, attempt) * 500),
          );
          attempt++;
        } else {
          break;
        }
      }
    }
    throw lastError;
  }
}

export async function getGlobalMarketData() {
  const client = new CoinGeckoClient();
  const data = await client.getGlobalMarketData();
  // data[0] is TOTAL, data[1] is BTC.D
  return {
    total_market_cap: data[0]?.price ?? 0,
    total_volume: data[0]?.volume ?? 0,
    btc_dominance: data[1]?.price ?? 0,
  };
}
