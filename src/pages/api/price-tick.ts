// API endpoint: /api/price-tick
// Aggregates normalized price data from CoinGecko, Binance, and CoinApi for a given symbol/quote pair.
// Each result includes 'volume' (24h volume in quote currency, or null if not available).
// Uses internal mapping in each client for user-friendly queries (e.g., BTC, ETH, USDT, etc.).
// Uses in-memory caching for 30 seconds per symbol/quote pair to reduce redundant API calls.

import type { NextApiRequest, NextApiResponse } from "next";
import { CoinGeckoClient } from "@/services/coingecko";
import { BinanceClient } from "@/services/market/binanceClient";
import { CoinApiClient } from "@/services/market/coinApiClient";
import type { PriceTick } from "@/services/market/MarketDataService";
import { Cache } from "@/utils/cache";
import { rateLimit } from "@/utils/rateLimit";
import * as Sentry from "@sentry/nextjs";
import { KrakenClient } from "@/services/market/krakenClient";
import { EtherscanProvider } from "@/services/onchain/providers/EtherscanProvider";
import { TheGraphProvider } from "@/services/onchain/providers/TheGraphProvider";
import { AlchemyProvider } from "@/services/onchain/providers/AlchemyProvider";
import Redis from "ioredis";
import type { OnChainMetricData } from "@/services/onchain/getOnChainMetric";
import {
  getOnChainMetric,
  sha256,
  eventBus,
} from "@/services/onchain/getOnChainMetric";
import Sentiment from "sentiment";
import { Filter } from "bad-words";
import { franc } from "franc-min";

const cache = new Cache();
const redis = new Redis();
const sentiment = new Sentiment();
const filter = new Filter();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  let allowed = false;
  rateLimit(req, res, () => {
    allowed = true;
  });
  if (!allowed) {
    console.warn(
      `[RATE LIMIT] ${req.method} ${req.url} from IP ${req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"}`,
    );
    return;
  }

  console.log(
    `[REQUEST] ${req.method} ${req.url} from IP ${req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"}`,
  );

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Multi-asset/quote support: parse as arrays (comma-separated or repeated params)
  const getArrayParam = (key: string): string[] => {
    const val = req.query[key];
    if (!val) return [];
    if (Array.isArray(val))
      return val
        .flatMap((v) => v.split(","))
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    return val
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  };
  const symbols = getArrayParam("symbol");
  const quotes = getArrayParam("quote");

  if (!symbols.length || !quotes.length) {
    res.status(400).json({ error: "Missing symbol or quote parameter" });
    return;
  }

  // Optional: interval/limit for time series (not yet implemented)
  const interval =
    typeof req.query.interval === "string" ? req.query.interval : undefined;
  const limit = req.query.limit
    ? parseInt(req.query.limit as string, 10)
    : undefined;

  // Helper to fetch and aggregate for a single pair
  const fetchAndAggregate = async (symbol: string, quote: string) => {
    // If time series requested and supported, use CoinGeckoClient
    if (interval && limit && (interval === "hourly" || interval === "daily")) {
      try {
        const coingecko = new CoinGeckoClient();
        const series = await coingecko.getHistoricalPriceSeries(
          symbol,
          quote,
          interval as "hourly" | "daily",
          limit,
        );
        return { timeSeries: series };
      } catch (err: any) {
        console.error(`[HISTORICAL ERROR] ${symbol}/${quote}:`, err);
        Sentry.captureException(err);
        return {
          error: "Historical data fetch failed",
          details: err?.message || String(err),
        };
      }
    }
    const cacheKey = `price-tick:${symbol}:${quote}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      return cached;
    }
    const results: PriceTick[] = [];
    const errors: Record<string, string> = {};
    const coingecko = new CoinGeckoClient();
    const binance = new BinanceClient();
    const coinapi = new CoinApiClient();
    const kraken = new KrakenClient();
    const alchemy = new AlchemyProvider();
    const etherscan = new EtherscanProvider();
    const thegraph = new TheGraphProvider();
    const tickers = await Promise.allSettled([
      coingecko.getTicker(symbol, quote),
      binance.getTicker(symbol, quote),
      coinapi.getTicker(symbol, quote),
      kraken.getTicker(symbol, quote),
      alchemy.getMetric(symbol, quote, "1h"),
      etherscan.getMetric(symbol, quote, "1h"),
      thegraph.getMetric(symbol, quote, "1h"),
    ]);
    const sources = [
      "coingecko",
      "binance",
      "coinapi",
      "kraken",
      "alchemy",
      "etherscan",
      "thegraph",
    ];
    tickers.forEach((result, i) => {
      if (result.status === "fulfilled") {
        let tick = result.value;
        if (
          "value" in tick &&
          (!("price" in tick) || typeof tick.price !== "number")
        ) {
          tick = {
            asset: symbol.toUpperCase(),
            price: typeof tick.value === "number" ? tick.value : 0,
            timestamp:
              typeof tick.timestamp === "string"
                ? Date.parse(tick.timestamp)
                : typeof tick.timestamp === "number"
                  ? tick.timestamp
                  : Date.now(),
            volume: null,
            source: sources[i],
            high24h: null,
            low24h: null,
            marketCap: null,
          } as any;
        }
        if (
          typeof (tick as any).asset === "string" &&
          typeof (tick as any).price === "number" &&
          typeof (tick as any).timestamp === "number" &&
          "volume" in tick &&
          "high24h" in tick &&
          "low24h" in tick &&
          "marketCap" in tick &&
          typeof (tick as any).source === "string"
        ) {
          results.push({ ...(tick as any), source: sources[i] });
        }
      } else {
        errors[sources[i]] = result.reason?.message || "Error";
        console.error(`[UPSTREAM ERROR] ${sources[i]}:`, result.reason);
        Sentry.captureException(result.reason);
      }
    });
    if (results.length === 0) {
      console.error(`[ALL SOURCES FAILED] symbol=${symbol} quote=${quote}`);
      Sentry.captureException(
        new Error(`All sources failed for ${symbol}/${quote}`),
      );
      return { error: "All sources failed", details: errors };
    }
    const validPrices = results
      .map((r) => r.price)
      .filter((p) => typeof p === "number");
    const validVolumes = results
      .map((r) => r.volume)
      .filter((v) => typeof v === "number");
    const validHighs = results
      .map((r) => r.high24h)
      .filter((h) => typeof h === "number");
    const validLows = results
      .map((r) => r.low24h)
      .filter((l) => typeof l === "number");
    const validMarketCaps = results
      .map((r) => r.marketCap)
      .filter((m) => typeof m === "number");
    const aggregate = {
      asset: results[0].asset,
      price: validPrices.length
        ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
        : null,
      timestamp: Date.now(),
      volume: validVolumes.length
        ? validVolumes.reduce((a, b) => a + b, 0)
        : null,
      source: "aggregate",
      high24h: validHighs.length ? Math.max(...validHighs) : null,
      low24h: validLows.length ? Math.min(...validLows) : null,
      marketCap: validMarketCaps.length ? Math.max(...validMarketCaps) : null,
    };
    const response = { results, aggregate, errors };
    await cache.set(cacheKey, response, 30);
    return response;
  };

  // Cartesian product of symbols x quotes
  const pairs: [string, string][] = [];
  for (const symbol of symbols) {
    for (const quote of quotes) {
      pairs.push([symbol, quote]);
    }
  }

  // If only one pair, keep old response format for backward compatibility
  if (pairs.length === 1) {
    const [symbol, quote] = pairs[0];
    const result = await fetchAndAggregate(symbol, quote);
    // Type guard for error check
    if (typeof result === "object" && result !== null && "error" in result) {
      res.status(502).json(result);
      return;
    }
    res.status(200).json(result);
    return;
  }

  // Multiple pairs: return a map of pairKey -> result
  const out: Record<string, any> = {};
  await Promise.all(
    pairs.map(async ([symbol, quote]) => {
      const key = `${symbol.toUpperCase()}/${quote.toUpperCase()}`;
      out[key] = await fetchAndAggregate(symbol, quote);
    }),
  );
  res.status(200).json(out);
}

export async function batchFetchOnChainMetricsAdvanced(
  blockchains: string[],
  metrics: string[],
  hours: number,
): Promise<void> {
  const results: {
    blockchain: string;
    metric: string;
    data: OnChainMetricData[];
  }[] = [];
  for (const blockchain of blockchains) {
    for (const metric of metrics) {
      const metricResults: OnChainMetricData[] = [];
      for (let i = 0; i < hours; i++) {
        const data = await getOnChainMetric(blockchain, metric, "1h");
        const date = new Date();
        date.setHours(date.getHours() - i);
        data.timestamp = date.toISOString();
        metricResults.push(data);
      }
      results.push({ blockchain, metric, data: metricResults });
    }
  }
  const checksum = sha256(JSON.stringify(results));
  eventBus.publish("onchain-metrics-batch-advanced", { results, checksum });
}

export function publishToBus(channel: string, data: any) {
  redis.publish(channel, JSON.stringify(data));
}

export function subscribeToBus(channel: string, handler: (data: any) => void) {
  redis.subscribe(channel);
  redis.on("message", (chan, message) => {
    if (chan === channel) handler(JSON.parse(message));
  });
}

interface SocialMetric {
  asset: string;
  sentiment: number; // -1 to 1
  volume: number; // number of posts/messages
  timestamp: number; // ms since epoch
}

export async function processTweet(tweet: {
  text: string;
  created_at: string;
}) {
  // Profanity filter
  if (filter.isProfane(tweet.text)) return null;
  // Language detection (only English for now)
  if (franc(tweet.text, { minLength: 3 }) !== "eng") return null;
  // Sentiment analysis
  const score = sentiment.analyze(tweet.text).comparative;
  // Asset extraction (simple regex for demo)
  const asset = extractAsset(tweet.text);
  return {
    asset,
    sentiment: Math.max(-1, Math.min(1, score)),
    volume: 1,
    timestamp: new Date(tweet.created_at).getTime(),
  } as SocialMetric;
}

function extractAsset(text: string): string {
  // Simple: look for $BTC, $ETH, etc.
  const match = text.match(/\$([A-Z]{2,6})/);
  return match ? match[1] : "UNKNOWN";
}

// Aggregate per asset per time bucket (e.g., 5min)
const buckets: Record<string, SocialMetric[]> = {};

function aggregate(metric: SocialMetric) {
  const bucket =
    Math.floor(metric.timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000);
  const key = `${metric.asset}:${bucket}`;
  if (!buckets[key]) buckets[key] = [];
  buckets[key].push(metric);
}

function getAggregatedMetrics(asset: string, bucket: number): SocialMetric {
  const metrics = buckets[`${asset}:${bucket}`] || [];
  const sentiment = metrics.length
    ? metrics.reduce((a, m) => a + m.sentiment, 0) / metrics.length
    : 0;
  return {
    asset,
    sentiment,
    volume: metrics.length,
    timestamp: bucket,
  };
}
