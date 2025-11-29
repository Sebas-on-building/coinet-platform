import Parser from "rss-parser";
import crypto from "crypto";
import { extractAsset } from "@/services/tokenRegistry";
import { NewsArticle } from "@/types/news/NewsArticle";

const parser = new Parser();
const FEEDS = [
  {
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    source: "CoinDesk",
  },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
  // Add more feeds as needed
];

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory deduplication set
const seenIds = new Set<string>();

// In-memory store (could be replaced with DB)
export const newsArticles: NewsArticle[] = [];

function hashId(title: string, url: string): string {
  return crypto
    .createHash("sha256")
    .update(title + url)
    .digest("hex");
}

async function extractAssetsFromText(text: string): Promise<string[]> {
  // Use extractAsset for each word/phrase, or improve with NER for production
  const assets = new Set<string>();
  const words = text.split(/\s+/);
  for (const word of words) {
    const asset = await extractAsset(word);
    if (asset) assets.add(asset);
  }
  return Array.from(assets);
}

export async function pollFeeds() {
  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items) {
        const id = hashId(item.title || "", item.link || "");
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        // Extract assets mentioned from title + summary/content
        const text = `${item.title || ""} ${item.contentSnippet || item.content || ""}`;
        const assetsMentioned = await extractAssetsFromText(text);

        const article: NewsArticle = {
          id,
          title: item.title || "",
          url: item.link || "",
          summary: item.contentSnippet || item.content || "",
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          source: feed.source,
          assetsMentioned,
        };
        newsArticles.push(article);
      }
    } catch (err) {
      console.error(`[RSS] Error polling ${feed.url}:`, err);
    }
  }
}

// Start polling loop
export function startNewsPolling() {
  pollFeeds();
  setInterval(pollFeeds, POLL_INTERVAL_MS);
}
