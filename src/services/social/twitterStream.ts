import { extractAsset, analyzeSentiment } from "@/services/tokenRegistry";
import { Filter } from "bad-words";
import { franc } from "franc-min";

export interface SocialMetric {
  asset: string;
  sentiment: number; // -1 to 1
  volume: number; // number of posts/messages
  timestamp: number; // ms since epoch
}

const filter = new Filter();

// In-memory aggregation buckets
const buckets: Record<string, SocialMetric[]> = {};

export async function processTweet(tweet: {
  text: string;
  created_at: string;
}): Promise<SocialMetric | null> {
  // Profanity filter
  if (filter.isProfane(tweet.text)) return null;
  // Language detection (only English for now)
  if (franc(tweet.text, { minLength: 3 }) !== "eng") return null;
  // Asset extraction (now async and robust)
  const asset = await extractAsset(tweet.text);
  if (!asset) return null;
  // Sentiment analysis (multi-language)
  const score = analyzeSentiment(tweet.text);
  return {
    asset,
    sentiment: Math.max(-1, Math.min(1, score)),
    volume: 1,
    timestamp: new Date(tweet.created_at).getTime(),
  };
}

export function aggregateSocialMetric(metric: SocialMetric) {
  const bucket =
    Math.floor(metric.timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000);
  const key = `${metric.asset}:${bucket}`;
  if (!buckets[key]) buckets[key] = [];
  buckets[key].push(metric);
}

export function getAggregatedMetrics(
  asset: string,
  bucket: number,
): SocialMetric {
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
