import { extractAsset, analyzeSentiment } from "@/services/tokenRegistry";
import { Filter } from "bad-words";
import { franc } from "franc-min";
import type { SocialMetric } from "./twitterStream";

const filter = new Filter();

export async function processDiscordMessage(msg: {
  content: string;
  timestamp: string;
  messageId?: string;
  author?: string;
}): Promise<SocialMetric[] | null> {
  // Profanity filter
  if (filter.isProfane(msg.content)) return null;
  // Language detection (only English for now)
  if (franc(msg.content, { minLength: 3 }) !== "eng") return null;
  // Asset extraction (now async and robust)
  const assets = await extractAllAssets(msg.content);
  if (!assets.length) return null;
  // Sentiment analysis (multi-language)
  const score = analyzeSentiment(msg.content);
  return assets.map((asset) => ({
    asset,
    sentiment: Math.max(-1, Math.min(1, score)),
    volume: 1,
    timestamp: new Date(msg.timestamp).getTime(),
    // Optionally add: messageId: msg.messageId, author: msg.author
  }));
}

export async function extractAllAssets(text: string): Promise<string[]> {
  const words = text.split(/\s+/);
  const assets = new Set<string>();
  for (const word of words) {
    const asset = await extractAsset(word);
    if (asset) assets.add(asset);
  }
  return Array.from(assets);
}
