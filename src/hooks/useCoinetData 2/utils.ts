import { UseCoinetDataParams } from "./types";
import { fetchWebSocketData } from "./adapters/websocket";
import { fetchRestData } from "./adapters/rest";
import { fetchAIData } from "./adapters/ai";
import { fetchSentimentData } from "./adapters/sentiment";
import { fetchCacheData } from "./adapters/cache";

/**
 * Deep equality check for params (for useEffect deps)
 */
export function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Data normalization utility (placeholder)
 */
export function normalizeData(data: any, type: string): any {
  // TODO: Implement normalization per data type
  return data;
}

/**
 * Adapter selection logic based on params
 */
export function selectAdapter(params: UseCoinetDataParams) {
  if (params.realtime) return fetchWebSocketData;
  if (params.ai) return fetchAIData;
  if (params.sentiment) return fetchSentimentData;
  if (params.type === "price" || params.type === "ohlc" || params.type === "volume") return fetchRestData;
  // Fallback to cache
  return fetchCacheData;
} 