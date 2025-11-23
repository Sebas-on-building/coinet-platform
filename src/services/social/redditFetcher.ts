import { extractAsset, analyzeSentiment } from "@/services/tokenRegistry";
import { Filter } from "bad-words";
import { franc } from "franc-min";
import type { SocialMetric } from "./twitterStream";
import { aggregateSocialMetric } from "./twitterStream";

const filter = new Filter();

export async function processRedditPost(post: {
  body: string;
  created_utc: number;
}): Promise<SocialMetric | null> {
  // Profanity filter
  if (filter.isProfane(post.body)) return null;
  // Language detection (only English for now)
  if (franc(post.body, { minLength: 3 }) !== "eng") return null;
  // Asset extraction (now async and robust)
  const asset = await extractAsset(post.body);
  if (!asset) return null;
  // Sentiment analysis (multi-language)
  const score = analyzeSentiment(post.body);
  return {
    asset,
    sentiment: Math.max(-1, Math.min(1, score)),
    volume: 1,
    timestamp: post.created_utc * 1000,
  };
}
